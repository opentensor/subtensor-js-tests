import { expectToFailWith, usingApi, sendTransaction, skipBlocks } from '../util/comm.js';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { 
  charlieIsNeuron, daveIsNeuron, daveIsBobsChild, reliableUnstake, setChildren, 
  setStake, setupStartingStake, resetSut 
} from '../util/helpers.js';
import { getTestKeys } from '../util/known-keys.js';
import { waitForStakeIncrease, waitForNonZero, ensureAlwaysZero } from '../util/waiters.js';
import { netuid, stake, subnetTempo, hotkeyTempo, maxChildTake } from '../config.js';

use(chaiAsPromised);

let tk;
let initialTempo; 
let txChildkeyTakeRateLimit;

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
      await setupStartingStake(api);

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

      // Allow to stake/unstake frequently
      console.log(`Disable tx rate limit`);
      const txSudoSetTxRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTxRateLimit(0)
      );
      await sendTransaction(api, txSudoSetTxRateLimit, tk.alice);

      // Reduce subnet tempo
      console.log(`Reduce subnet tempo`);
      const txSudoSetTempo = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
      );
      await sendTransaction(api, txSudoSetTempo, tk.alice);

      // Reduce root tempo
      console.log(`Reduce root tempo`);
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

      // Read default tempo and child take rate limit
      initialTempo = api.consts.subtensorModule.initialTempo.toNumber();
      txChildkeyTakeRateLimit = (await api.query.subtensorModule.txChildkeyTakeRateLimit()).toNumber();

      // Tests expect that childkey take rate limit and initial tempo are short
      if ((initialTempo >= 20) || (txChildkeyTakeRateLimit > initialTempo)) {
        console.log("Tests expect local node running with fast-blocks feature");
      }
      expect(initialTempo < 20).to.be.true;
      expect(txChildkeyTakeRateLimit <= initialTempo).to.be.true;

      // Set max childkey take
      console.log(`Set max childkey take`);
      const txSudoSetMaxChildkeyTake = api.tx.sudo.sudo(
        api.tx.subtensorModule.sudoSetMaxChildkeyTake(maxChildTake)
      );
      await sendTransaction(api, txSudoSetMaxChildkeyTake, tk.alice);

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
      let bobUid = 1;

      // Ensure Dave is registered as a neuron
      await daveIsNeuron(api, netuid);

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

  it('Can set 0 child take', async () => {
    await usingApi(async api => {
      // Dave's hotkey should be associated with his coldkey - register a neuron if it doesn't exist for Dave
      await daveIsNeuron(api, netuid);

      // Ensure child exists
      await skipBlocks(api, 2 * initialTempo);
      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      // Set 0 child take
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, 0);
      await sendTransaction(api, txSetChildTake, tk.dave);
    });
  });

  it('Can set max child take', async () => {
    await usingApi(async api => {
      // Dave's hotkey should be associated with his coldkey - register a neuron if it doesn't exist for Dave
      await daveIsNeuron(api, netuid);

      // Ensure child exists
      await skipBlocks(api, 2 * initialTempo);
      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      // Read what's max child take
      const maxChildTake = (await api.query.subtensorModule.maxChildkeyTake()).toNumber();

      // Set max child take
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, maxChildTake);
      await sendTransaction(api, txSetChildTake, tk.dave);
    });
  });

  it('Cannot set child take over the limit', async () => {
    await usingApi(async api => {
      // Dave's hotkey should be associated with his coldkey - register a neuron if it doesn't exist for Dave
      await daveIsNeuron(api, netuid);

      // Ensure child exists
      await skipBlocks(api, 2 * initialTempo);
      const txSetChildren1 = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
      await sendTransaction(api, txSetChildren1, tk.bob);

      // Read what's max child take
      const maxChildTake = (await api.query.subtensorModule.maxChildkeyTake()).toNumber();

      // Set max+1 child take
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, maxChildTake + 1);
      return expectToFailWith(api, () => sendTransaction(api, txSetChildTake, tk.dave), "InvalidChildkeyTake");
    });
  });

  it('Zero child take results in zero child rewards', async () => {
    await usingApi(async api => {
      // Ensure Dave is registered as a neuron
      const daveUid = await daveIsNeuron(api, netuid);

      // Allow all neurons to be validaotrs
      const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toNumber();
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, neuronCount)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, tk.alice);

      // Wait for subnet tempo
      await skipBlocks(api, subnetTempo);

      // Alice and Bob set weights to down-vote Dave so that he doesn't get any miner rewards
      let uids = [];
      let weights = [];
      for (let i=0; i<neuronCount; i++) {
        uids.push(i);
        if (i == daveUid) {
          weights.push(0);
        } else {
          weights.push(0xFFFF);
        }
      }
      const txSetWeightsAlice = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsAlice, tk.aliceHot);
      const txSetWeightsBob = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsBob, tk.bobHot);

      // Wait for two subnet tempos
      await skipBlocks(api, subnetTempo * 2);

      // Bob makes Dave his only child (if not already)
      await daveIsBobsChild(api, netuid, initialTempo);

      // Dave sets zero take
      await skipBlocks(api, initialTempo * 2);
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, 0);
      await sendTransaction(api, txSetChildTake, tk.dave);

      // Unstake Dave
      await reliableUnstake(api, tk.daveHot.address, tk.dave, hotkeyTempo);
      
      // Check that Dave's stake is not increased
      const daveStakeCall = async () => { return await api.query.subtensorModule.stake(tk.daveHot.address, tk.dave.address); };
      await ensureAlwaysZero(daveStakeCall, subnetTempo);
    });
  });

  // it('Childkey delegate take does not add to zero child rewards', async () => {
  //   await usingApi(async api => {
  //     // Ensure Dave is registered as a neuron
  //     await daveIsNeuron(api, netuid);

  //     // Bob makes Dave his only child (if not already)
  //     await daveIsBobsChild(api, netuid, initialTempo);

  //     // Dave sets zero childkey take
  //     await skipBlocks(api, initialTempo * 2);
  //     const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, 0);
  //     await sendTransaction(api, txSetChildTake, tk.dave);

  //     // Dave sets non-zero hotkey take
  //     const txBecomeDelegate = api.tx.subtensorModule.becomeDelegate(tk.daveHot.address);
  //     await sendTransaction(api, txBecomeDelegate, tk.dave);

  //     // Wait for two hotkey drain tempos
  //     await skipBlocks(api, hotkeyTempo * 2);

  //     // Check that Dave's stake is not increased
  //     const davesStake = (await api.query.subtensorModule.stake(tk.daveHot.address, tk.dave.address)).toNumber();
  //     expect(davesStake).to.be.equal(0);
  //   });
  // });

  // it('Max child take results in non-zero child reward', async () => {
  //   await usingApi(async api => {
  //     // Ensure Dave is registered as a neuron
  //     await daveIsNeuron(api, netuid);

  //     // Bob makes Dave his only child (if not already)
  //     await daveIsBobsChild(api, netuid, initialTempo);

  //     // Dave sets zero childkey take
  //     await skipBlocks(api, initialTempo * 2);
  //     const txSetChildTake0 = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, 0);
  //     await sendTransaction(api, txSetChildTake0, tk.dave);

  //     // Wait for two hotkey drain tempos
  //     await skipBlocks(api, hotkeyTempo * 2);

  //     // Dave sets max childkey take
  //     const txSetChildTakeMax = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, maxChildTake);
  //     await sendTransaction(api, txSetChildTakeMax, tk.dave);

  //     // Wait for two hotkey drain tempos
  //     await skipBlocks(api, hotkeyTempo * 2);

  //     // Check that Dave's stake is increased
  //     const davesStake = (await api.query.subtensorModule.stake(tk.daveHot.address, tk.dave.address)).toNumber();
  //     expect(davesStake).to.be.greaterThan(0);
  //   });
  // });

  it('Zero child take, only parents PendingHotkeyEmission increased', async () => {
    await usingApi(async api => {
      // Ensure Dave is registered as a neuron
      const daveUid = await daveIsNeuron(api, netuid);

      // Allow all neurons to be validaotrs
      const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toNumber();
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, neuronCount)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, tk.alice);

      // Wait for subnet tempo
      await skipBlocks(api, subnetTempo);

      // Alice and Bob set weights to down-vote Dave so that he doesn't get any miner rewards
      let uids = [];
      let weights = [];
      for (let i=0; i<neuronCount; i++) {
        uids.push(i);
        if (i == daveUid) {
          weights.push(0);
        } else {
          weights.push(0xFFFF);
        }
      }
      const txSetWeightsAlice = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsAlice, tk.aliceHot);
      const txSetWeightsBob = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsBob, tk.bobHot);

      // Bob makes Dave his only child (if not already)
      await daveIsBobsChild(api, netuid, initialTempo);

      // Dave sets zero take
      await skipBlocks(api, initialTempo * 2);
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, 0);
      await sendTransaction(api, txSetChildTake, tk.dave);

      // Unstake Dave
      await reliableUnstake(api, tk.daveHot.address, tk.dave, hotkeyTempo);

      // Check that Dave's PendingEmission is not increased, and Bob'd increased
      const davePeCall = async () => { return await api.query.subtensorModule.pendingdHotkeyEmission(tk.daveHot.address); };
      const bobPeCall = async () => { return await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address); };

      await ensureAlwaysZero(davePeCall, subnetTempo);
      await waitForNonZero(bobPeCall, subnetTempo);
    });
  });

  it('Non-zero child take, both child and parent PendingHotkeyEmission increased', async () => {
    await usingApi(async api => {
      // Ensure Dave is registered as a neuron
      await daveIsNeuron(api, netuid);

      // Bob makes Dave his only child (if not already)
      await daveIsBobsChild(api, netuid, initialTempo);

      // Dave sets max take
      await skipBlocks(api, initialTempo * 2);
      const txSetChildTake = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, maxChildTake);
      await sendTransaction(api, txSetChildTake, tk.dave);

      // Unstake Dave
      await setStake(api, tk.daveHot.address, tk.dave, 0);

      // Wait for two subnet tempos
      await skipBlocks(api, subnetTempo * 4);

      // Check that both Dave's and Bob's PendingEmission are increased
      const davePeCall = async () => { return await api.query.subtensorModule.pendingdHotkeyEmission(tk.daveHot.address); };
      const bobPeCall = async () => { return await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address); };

      await waitForNonZero(davePeCall, subnetTempo);
      await waitForNonZero(bobPeCall, subnetTempo);
    });
  });

  it('One parent, two children with unequal proportions', async () => {
    await usingApi(async api => {
      // await resetSut(api);

      // Ensure Charlie and Dave are registered as neurons
      const charlieUid = await charlieIsNeuron(api, netuid);
      const daveUid = await daveIsNeuron(api, netuid);
      const bobUid = 1;
      const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toHuman();

      // Everyone is a validator
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, neuronCount)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, tk.alice);

      // Wait for two subnet tempos
      await skipBlocks(api, subnetTempo * 2);

      // Everyone sets weights to down-vote Bob, Charlie, and Dave so that they dont get any miner rewards
      let uids = [];
      let weights = [];
      for (let i=0; i<neuronCount; i++) {
        uids.push(i);
        if ((i == daveUid) || (i == charlieUid) || (i == bobUid)) {
          weights.push(0);
        } else {
          weights.push(0xFFFF);
        }
      }
      const txSetWeightsAlice = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsAlice, tk.aliceHot);
      const txSetWeightsBob = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsBob, tk.bobHot);
      const txSetWeightsCharlie = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsCharlie, tk.charlieHot);
      const txSetWeightsDave = api.tx.subtensorModule.setWeights(netuid, uids, weights, 0);
      await sendTransaction(api, txSetWeightsDave, tk.daveHot);

      // Wait for two subnet tempos
      await skipBlocks(api, subnetTempo * 2);

      // Bob makes Dave and Charlie his only children with 1/4 and 3/4 proportions
      // await setChildren(
      //   api, netuid, tk.aliceHot.address, tk.alice, 
      //   [[0x4000000000000000n, tk.charlieHot.address], [0x3FFFFFFFFFFFFFFFn, tk.daveHot.address]], 
      //   initialTempo
      // );
      await setChildren(
        api, netuid, tk.aliceHot.address, tk.alice, 
        [[0x3FFFFFFFFFFFFFFFn, tk.charlieHot.address], [0x4000000000000000n, tk.daveHot.address]], 
        initialTempo
      );

      // Both Charlie and Dave set max take
      await skipBlocks(api, initialTempo * 2);
      const txSetChildTake1 = api.tx.subtensorModule.setChildkeyTake(tk.charlieHot.address, netuid, maxChildTake);
      await sendTransaction(api, txSetChildTake1, tk.charlie);
      await skipBlocks(api, initialTempo * 2);
      const txSetChildTake2 = api.tx.subtensorModule.setChildkeyTake(tk.daveHot.address, netuid, maxChildTake);
      await sendTransaction(api, txSetChildTake2, tk.dave);

      // Never drain hotkeys
      const txSudoHotkeyEmissionTempoNever = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetHotkeyEmissionTempo(1000000)
      );
      await sendTransaction(api, txSudoHotkeyEmissionTempoNever, tk.alice);

      // Check that Charlie's, Dave's and Bob's Pending Emissions are increased proportionally
      // Bob doesn't have his own emission, he gets everything from his childkeys, so we update Bobs emission
      // every time when Dave and Charlie get theirs.
      // let firstBobsEmission = 0;
      // let firstCharliesEmission = 0;
      // let firstDavesEmission = 0;
      // while (true) {
      //   const bobPendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address)).toNumber();
      //   const charliePendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.charlieHot.address)).toNumber();
      //   const davePendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.daveHot.address)).toNumber();

      //   if ((charliePendingHotkeyEmission != 0) && (firstCharliesEmission == 0)) {
      //     firstCharliesEmission = charliePendingHotkeyEmission;
      //     firstBobsEmission = bobPendingHotkeyEmission;
      //   }
      //   if ((davePendingHotkeyEmission != 0) && (firstDavesEmission == 0)) {
      //     firstDavesEmission = davePendingHotkeyEmission;
      //     firstBobsEmission = bobPendingHotkeyEmission;
      //   }

      //   if (
      //     (firstBobsEmission > 0) && 
      //     (firstCharliesEmission > 0) &&
      //     (firstDavesEmission > 0)
      //   ) {
      //     break;
      //   }

      //   await skipBlocks(api, 1);
      // }

      // console.log(`bobPendingHotkeyEmission     = ${firstBobsEmission}`);
      // console.log(`charliePendingHotkeyEmission = ${firstCharliesEmission}`);
      // console.log(`davePendingHotkeyEmission    = ${firstDavesEmission}`);

      await skipBlocks(api, subnetTempo * 100);

      const bobPendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.bobHot.address)).toNumber();
      const charliePendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.charlieHot.address)).toNumber();
      const davePendingHotkeyEmission = (await api.query.subtensorModule.pendingdHotkeyEmission(tk.daveHot.address)).toNumber();

      console.log(`bobPendingHotkeyEmission     = ${bobPendingHotkeyEmission}`);
      console.log(`charliePendingHotkeyEmission = ${charliePendingHotkeyEmission}`);
      console.log(`davePendingHotkeyEmission    = ${davePendingHotkeyEmission}`);


      // Restore setup - reduce hotkey drain tempo
      const txSudoHotkeyEmissionTempo = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetHotkeyEmissionTempo(hotkeyTempo)
      );
      await sendTransaction(api, txSudoHotkeyEmissionTempo, tk.alice);

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
  // +  - Can set 0 take
  // +  - Can set max take
  // +  - Can't set max+1 take
  // +  - 0 take results in 0 child reward 
  // +  - max take results in non-zero child reward (and reduces parent reward)
  // +  - For 0 take: emission fully goes to parent's PendingHotkeyEmission (end of epoch)
  // +  - For max take: emission goes to child's and to parent's PendingHotkeyEmission (end of epoch)
  //   - One parent, two children with unequal proportions, with equal take => PendingHotkeyEmission checks for all three keys
  //   - Two parents, one common child with unequal proportions => PendingHotkeyEmission checks
  // - Nominator rewards (end of hotkey drain tempo)
  //   - Child nominators are rewarded, the sum of rewards is equal to PendingHotkeyEmission
  //   - Parent nominators are rewarded, the sum of rewards is equal to PendingHotkeyEmission
  // - Stress tests
  //   - 10k parent keys, 50k child keys, epoch, hotkey drain, and timing

  // And even more tests:
  // - Childkey take rate limiting
  //   - 
  // - Set childkey take for a non-child
  // 

});
