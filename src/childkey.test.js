import { expectToFailWith, usingApi, sendTransaction, skipBlocks } from '../util/comm.js';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { getTestKeys } from '../util/known-keys.js';
import { waitForStakeIncrease } from '../util/waiters.js';
import BigNumber from 'bignumber.js';

use(chaiAsPromised);

const netuid = 1;
const stake = new BigNumber(10e9);
const subnetTempo = 10;
const hotkeyTempo = 20;
let tk;
let initialTempo; 

describe('Childkeys', () => {
  before(async () => {
    await usingApi(async api => {
      tk = getTestKeys();
      const rootId = 0;

      // Create subnet 1 and add neurons to it if it doesn't exist
      const subnetExists = (await api.query.subtensorModule.networksAdded(netuid)).toHuman();
      if (!subnetExists) {
        const txRegisterSubnet = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, txRegisterSubnet, tk.alice);

        const txRegisterNeuron1 = api.tx.subtensorModule.burnedRegister(netuid, tk.aliceHot.address);
        await sendTransaction(api, txRegisterNeuron1, tk.alice);

        const txRegisterNeuron2 = api.tx.subtensorModule.burnedRegister(netuid, tk.bobHot.address);
        await sendTransaction(api, txRegisterNeuron2, tk.bob);
      } else {
        throw Error("Restart the network");
      }

      // Add stake for alice and bob if it is not added yet
      const aliceStake = (await api.query.subtensorModule.stake(tk.aliceHot.address, tk.alice.address)).toNumber();
      if (aliceStake == 0) {
        console.log(`Adding stake for Alice`);
        const txAddStake = api.tx.subtensorModule.addStake(tk.aliceHot.address, stake.toString());
        await sendTransaction(api, txAddStake, tk.alice);
      } else {
        console.log(`Alice already has stake: ${aliceStake}`);
      }

      const bobStake = (await api.query.subtensorModule.stake(tk.bobHot.address, tk.bob.address)).toNumber();
      if (bobStake == 0) {
        console.log(`Adding stake for Bob`);
        const txAddStake = api.tx.subtensorModule.addStake(tk.bobHot.address, stake.toString());
        await sendTransaction(api, txAddStake, tk.bob);
      } else {
        console.log(`Bob already has stake: ${bobStake}`);
      }

      // Allow setting weights frequently
      console.log(`Allow setting weights frequently`);
      const txSudoSetWeightsRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      );
      await sendTransaction(api, txSudoSetWeightsRateLimit, tk.alice);
      const txSudoSetWeightsRateLimitRoot = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(rootId, 0)
      );
      await sendTransaction(api, txSudoSetWeightsRateLimitRoot, tk.alice);

      // Allow to stake/unstake frequently
      console.log(`Allow to stake frequently`);
      const txSudoSetStakingRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTargetStakesPerInterval(1000)
      );
      await sendTransaction(api, txSudoSetStakingRateLimit, tk.alice);

      // Allow to register neurons frequently
      console.log(`Allow to register neurons frequently`);
      const txSudoSetRegistrationRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTargetRegistrationsPerInterval(netuid, 1000)
      );
      await sendTransaction(api, txSudoSetRegistrationRateLimit, tk.alice);

      // Reduce subnet tempo
      console.log(`Reduce subnet tempo`);
      const txSudoSetTempo = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
      );
      await sendTransaction(api, txSudoSetTempo, tk.alice);

      // Reduce root tempo
      console.log(`Reduce subnet tempo`);
      const txSudoSetTempoRoot = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(rootId, subnetTempo)
      );
      await sendTransaction(api, txSudoSetTempoRoot, tk.alice);

      // Reduce hotkey drain tempo
      console.log(`Reduce hotkey tempo`);
      const txSudoHotkeyEmissionTempo = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetHotkeyEmissionTempo(hotkeyTempo)
      );
      await sendTransaction(api, txSudoHotkeyEmissionTempo, tk.alice);

      // Wait for the end of subnet tempo so that Alice and Bob get validator permits
      // Only do it if Alice doesn't have validator permit
      const permits = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      if (!permits[0]) {
        console.log(`Waiting for permits...`);
        await skipBlocks(api, subnetTempo);
      }

      // Bob sets weights
      console.log(`Bob sets weights`);
      const txSetWeights = api.tx.subtensorModule.setWeights(netuid, [0, 1], [65535, 65535], 0);
      await sendTransaction(api, txSetWeights, tk.bobHot);

      // Register Bob in root subnet
      console.log(`Register Bob in root`);
      const txRootRegister = api.tx.subtensorModule.rootRegister(tk.bobHot.address);
      await sendTransaction(api, txRootRegister, tk.bob);

      // Bob also sets root weights
      console.log(`Bob sets root weights`);
      const txSetRootWeights = api.tx.subtensorModule.setRootWeights(rootId, tk.bobHot.address, [0, 1], [65535, 65535], 0);
      await sendTransaction(api, txSetRootWeights, tk.bob);

      // Wait until root epoch ends
      console.log(`Waiting for root epoch...`);
      const rootTempo = (await api.query.subtensorModule.tempo(0)).toNumber();
      let endRootEpoch = false;
      while (!endRootEpoch) {
        const block = (await api.query.system.number()).toNumber();
        endRootEpoch = (block % rootTempo) == 0;
      }

      // Read default tempo, it is used in rate limiting
      initialTempo = api.consts.subtensorModule.initialTempo.toNumber();

      console.log(`Setup done`);
    });
  });

  it('Validator permits update', async () => {
    await usingApi(async api => {
      // Add 3rd neuron
      const txRegisterNeuron1 = api.tx.subtensorModule.burnedRegister(netuid, tk.charlieHot.address);
      await sendTransaction(api, txRegisterNeuron1, tk.charlie);

      // Get initialValidatorPermits
      const validatorPermitsBefore = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();

      // Add Charlie's stake
      const txAddStake = api.tx.subtensorModule.addStake(tk.charlieHot.address, stake.toString());
      await sendTransaction(api, txAddStake, tk.charlie);

      // Wait for epoch
      await skipBlocks(api, subnetTempo);

      // Read permits
      const validatorPermitsAfter = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();

      expect(validatorPermitsBefore[2]).to.be.false;
      expect(validatorPermitsAfter[2]).to.be.true;
    });
  });

  it.skip('Blocks since last step progress', async () => {
    await usingApi(async api => {
      // Check that blocksSinceLastStep increases as blocks progress
      const blocksSinceLastStepBefore = (await api.query.subtensorModule.blocksSinceLastStep(netuid)).toHuman();
      await skipBlocks(api, 1);
      const blocksSinceLastStepAfter = (await api.query.subtensorModule.blocksSinceLastStep(netuid)).toHuman();

      expect(blocksSinceLastStepAfter).to.be.greaterThan(blocksSinceLastStepBefore);
    });
  });

  it('Pending emissions are accumulated', async () => {
    await usingApi(async api => {
      // To avoid waiting for pending emission to drain, we'll read it three times: e(1), e(2), e(3). In most cases 
      // it will be: e(1) < e(2), but in rare cases when emission is drained after first reading, e(2) == 0, so 
      // it will be e(2) < e(3) 
      const pendingEmission1 = (await api.query.subtensorModule.pendingEmission(netuid)).toNumber();
      await skipBlocks(api, 1);
      const pendingEmission2 = (await api.query.subtensorModule.pendingEmission(netuid)).toNumber();
      await skipBlocks(api, 1);
      const pendingEmission3 = (await api.query.subtensorModule.pendingEmission(netuid)).toNumber();

      // Check that pending emission increases
      expect(
        (pendingEmission1 < pendingEmission2) ||
        (pendingEmission2 < pendingEmission3)
      ).to.be.true;
    });
  });

  it('Pending hotkey emissions are accumulated', async () => {
    await usingApi(async api => {
      const pendingHotkeyEmission1 = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address)).toNumber();
      await skipBlocks(api, subnetTempo);
      const pendingHotkeyEmission2 = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address)).toNumber();
      await skipBlocks(api, subnetTempo);
      const pendingHotkeyEmission3 = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address)).toNumber();

      // Check that pending emission increases
      expect(
        (pendingHotkeyEmission1 < pendingHotkeyEmission2) ||
        (pendingHotkeyEmission2 < pendingHotkeyEmission3)
      ).to.be.true;
    });
  });

  it('Delegate stake rewards', async () => {
    await usingApi(async api => {
      // Bob is already a delegate because he registered in root
      // Eve delegates stake to Bob
      const txAddStake = api.tx.subtensorModule.addStake(tk.bobHot.address, stake.toString());
      await sendTransaction(api, txAddStake, tk.eve);

      // Wait until the hotkey drain - Eve's stake will be increased
      await waitForStakeIncrease(api, hotkeyTempo, tk.bobHot.address, tk.eve.address);
    });
  });

  it('Child stake rewards', async () => {
    await usingApi(async api => {
      // Get neuron count
      const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toHuman();

      // Dave registers as a neuron, but doesn't stake
      const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(netuid, tk.daveHot.address);
      await sendTransaction(api, txRegisterNeuron, tk.dave);

      // Get initialValidatorPermits
      const validatorPermitsBefore = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      expect(validatorPermitsBefore[neuronCount]).to.be.false;

      // Bob makes Dave his only child
      const txSetChildren = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren, tk.bob);

      // Wait for 2 epochs
      await skipBlocks(api, subnetTempo * 2);

      // Dave should get his validator permit by now
      const validatorPermitsAfter2 = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      expect(validatorPermitsAfter2[neuronCount]).to.be.true;

      // Wait until the hotkey drain - Bob's (parent) stake will be increased
      await waitForStakeIncrease(api, hotkeyTempo, tk.bobHot.address, tk.bob.address);
    });
  });

  it('Child replaces parent validaor', async () => {
    await usingApi(async api => {
      // Get neuron count
      const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toHuman();
      let daveUid = neuronCount-1;
      let bobUid = 1;

      // Ensure Dave is registered as a neuron
      const daveIsRegistered = (await api.query.subtensorModule.isNetworkMember(tk.daveHot.address, netuid)).toHuman();
      if (!daveIsRegistered) {
        const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(netuid, tk.daveHot.address);
        await sendTransaction(api, txRegisterNeuron, tk.dave);
        daveUid = neuronCount;
      }

      // Get initialValidatorPermits
      const validatorPermitsBefore = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      expect(validatorPermitsBefore[bobUid]).to.be.true;

      // Reduce maximum validators by 1
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, neuronCount-1)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, tk.alice);

      // Bob makes Dave his only child
      const txSetChildren = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren, tk.bob);

      // Wait for 2 epochs
      await skipBlocks(api, subnetTempo * 2);

      // Bob should lose his permit
      const validatorPermitsAfter = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      expect(validatorPermitsAfter[bobUid]).to.be.false;
    });
  });

  it('One parent cannot set children with more than 100% total proportion', async () => {
    await usingApi(async api => {
      const txSetChildren = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, 
        [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address], [0xFFFFFFFFFFFFFFFFn, tk.eve.address]]
      );
      return expectToFailWith(api, () => sendTransaction(api, txSetChildren, tk.bob), "ProportionOverflow");
    });
  });

  it('Can set children with less than 100% total proportion', async () => {
    await usingApi(async api => {
      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[1, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);
    });
  });

  it('Set children rate limits: Setting too fast fails', async () => {
    await usingApi(async api => {
      // Wait enough so that first time succeeds
      await skipBlocks(api, 2 * initialTempo);

      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      const txSetChildren2 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      return expectToFailWith(api, () => sendTransaction(api, txSetChildren2, tk.bob), "TxRateLimitExceeded");
    });
  });

  it('Set children rate limits: Waiting 2 tempos - 2 blocks fails', async () => {
    await usingApi(async api => {
      // Wait enough so that first time succeeds
      await skipBlocks(api, 2 * initialTempo);

      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      await skipBlocks(api, 2 * initialTempo - 2);

      const txSetChildren2 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      return expectToFailWith(api, () => sendTransaction(api, txSetChildren2, tk.bob), "TxRateLimitExceeded");
    });
  });

  it('Set children rate limits: Waiting 2 tempos succeeds', async () => {
    await usingApi(async api => {
      // Wait enough so that first time succeeds
      await skipBlocks(api, 2 * initialTempo);

      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      await skipBlocks(api, 2 * initialTempo + 1);

      const txSetChildren2 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren2, tk.bob);
    });
  });

  // TODO: More tests:
  // + - Test with validator limit. Child should replace parent.
  // + - Setting children rate limit tests
  // +   - Twice within 2 tempo interval fails
  // +   - Waiting 2 tempos - 1 block fails
  // +   - Waiting 2 tempos fails
  // +   - Waiting 2 tempos + 1 block succeeds
  // - Childkey take tests
  //   - Can set 0 take
  //   - Can set max take
  //   - Can't set max+1 take
  //   - 0 take results in 0 child reward 
  //   - max take results in non-zero child reward and reduces parent reward
  //   - For 0 take: emission fully goes to parent's PendingHotkeyEmission (end of epoch)
  //   - For max take: emission goes to child's and to parent's PendingHotkeyEmission (end of epoch)
  //   - One parent, two children with unequal proportions, with equal take => PendingHotkeyEmission checks for all three keys
  //   - Two parents, one common child with unequal proportions => PendingHotkeyEmission checks
  // - Nominator rewards (end of hotkey drain tempo)
  //   - Child nominators are rewarded, the sum of rewards is equal to PendingHotkeyEmission
  //   - Parent nominators are rewarded, the sum of rewards is equal to PendingHotkeyEmission
  // - Stress tests
  //   - 10k parent keys, 50k child keys, epoch, hotkey drain, and timing
});
