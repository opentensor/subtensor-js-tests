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

      // Create subnet 1 and add neurons to it if it doesn't exist
      const subnetExists = (await api.query.subtensorModule.networksAdded(netuid)).toHuman();
      if (!subnetExists) {
        const txRegisterSubnet = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, txRegisterSubnet, tk.alice);

        const txRegisterNeuron1 = api.tx.subtensorModule.burnedRegister(netuid, tk.aliceHot.address);
        await sendTransaction(api, txRegisterNeuron1, tk.alice);

        const txRegisterNeuron2 = api.tx.subtensorModule.burnedRegister(netuid, tk.bobHot.address);
        await sendTransaction(api, txRegisterNeuron2, tk.bob);
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

      // Allow to stake/unstake frequently
      console.log(`Allow setting weights frequently`);
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
    });
  });

  it('Validator permits update', async () => {
    await usingApi(async api => {
      // Get initialValidatorPermits
      const validatorPermitsBefore = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();

      // Remove Alice's stake
      const aliceStake = (await api.query.subtensorModule.stake(tk.aliceHot.address, tk.alice.address)).toNumber();
      const txRemoveStake = api.tx.subtensorModule.removeStake(tk.aliceHot.address, aliceStake.toString());
      await sendTransaction(api, txRemoveStake, tk.alice);

      // // Wait for epoch
      // await skipBlocks(api, subnetTempo);

      // // Read permits
      // const validatorPermitsAfter = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();

      // // Re-add Alice's stake back
      // const txAddStake = api.tx.subtensorModule.addStake(tk.aliceHot.address, aliceStake.toString());
      // await sendTransaction(api, txAddStake, tk.alice);

      // // Wait for epoch
      // await skipBlocks(api, subnetTempo);

      // expect(validatorPermitsBefore[0]).to.be.true;
      // expect(validatorPermitsAfter[0]).to.be.false;
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
});
