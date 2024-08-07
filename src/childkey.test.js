import { usingApi, sendTransaction, skipBlocks } from '../util/comm.js';
import { expect } from 'chai';
import { getTestKeys } from '../util/known-keys.js';
import BigNumber from 'bignumber.js';

const netuid = 1;
const stake = new BigNumber(10e9);
const subnetTempo = 10;
const hotkeyTempo = 100;
let tk;

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

      // Reduce subnet tempo
      console.log(`Reduce subnet tempo`);
      const txSudoSetTempo = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
      );
      await sendTransaction(api, txSudoSetTempo, tk.alice);

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

});
