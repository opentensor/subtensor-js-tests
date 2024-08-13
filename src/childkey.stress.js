import { expectToFailWith, usingCreatedApi, sendTransaction, skipBlocks, measureBlockTime } from '../util/comm.js';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { 
  charlieIsNeuron, daveIsNeuron, daveIsBobsChild, reliableUnstake, setChildren, 
  setStake, setupStartingStake, resetSut
} from '../util/helpers.js';
import { getTestKeys, getRandomKeypair } from '../util/known-keys.js';
import { waitForStakeIncrease, waitForNonZero, ensureAlwaysZero } from '../util/waiters.js';
import { netuid, stake, subnetTempo, hotkeyTempo, maxChildTake } from '../config.js';

use(chaiAsPromised);

const subnetCount = 100;
const neuronCount = 10;
const txPerBlock = 512;
const initialBalance = 1e18; // Total balance needed for testing
const coldBalance = 1000e9;   // Balance of each coldkey
const fees = 1e9;            // Reserve on each coldkey for fees
const skipSubnets = [3];

let tk;
let initialTempo; 
let txChildkeyTakeRateLimit;
let idleMean;
let idleStdev;
let subnetOwnerColdkeys = [];
let subnetOwnerHotkeys = [];
let neuronOwnerColdkeys = [];
let neuronOwnerHotkeys = [];

describe('Childkeys', () => {
  before(async () => {
    await usingCreatedApi(async api => {
      console.log(`Measuring idle block time`);
      tk = getTestKeys();
      const { mean, stdev } = await measureBlockTime(api, 10);
      idleMean = mean;
      idleStdev = stdev;
      console.log(`Idle block time = ${idleMean} +/- ${idleStdev} ms`);

      // Generate subnet owners
      console.log(`Generating coldkeys`);
      for (let i=0; i<subnetCount; i++) {
        subnetOwnerColdkeys.push(getRandomKeypair());
        subnetOwnerHotkeys.push(getRandomKeypair());
      }

      // Generate nominator keys
      for (let i=0; i<neuronCount * subnetCount; i++) {
        neuronOwnerColdkeys.push(getRandomKeypair());
        neuronOwnerHotkeys.push(getRandomKeypair());
      }

      // Fund coldkeys
      console.log(`Funding coldkeys`);
      const coldkeys = subnetOwnerColdkeys.concat(neuronOwnerColdkeys/*, array3*/);

      // Alice funds herself
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(tk.alice.address, (initialBalance + 1000 * fees).toString())
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);

      // Alice funds everyone
      let index = 0;
      let batchTotal = parseInt(coldkeys.length / txPerBlock);
      if (coldkeys.length % txPerBlock) {
        batchTotal++;
      }
      let batchCount = 0;
      while (index < coldkeys.length) {
        const batch = [];
        for (let i=0; i<txPerBlock; i++) {
          if (index < coldkeys.length) {
            batch.push(
              api.tx.balances.transferKeepAlive(coldkeys[index].address, coldBalance.toString())
            );
          } else {
            break;
          }
          index++;
        }
        batchCount++;

        const transferBatch = api.tx.utility.batchAll(batch);
        await sendTransaction(api, transferBatch, tk.alice);
        console.log(`Funded ${batchCount} of ${batchTotal} batches`);
      }

      console.log(`Setup done`);
    });
  });

  it('Stressed block time', async () => {
    await usingCreatedApi(async api => {
      const rootId = 0;

      // Set minimal lock reduction interval and lock cost
      const txSudoSetLockCost = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetNetworkMinLockCost(0)
      );
      await sendTransaction(api, txSudoSetLockCost, tk.alice);
      const txSudoSetReductionInterval = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetLockReductionInterval(1)
      );
      await sendTransaction(api, txSudoSetReductionInterval, tk.alice);

      // Allow number of subnets needed
      const txSudoSetSubnetLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetSubnetLimit(subnetCount + 1) // need + 1 because we start with pre-existing subnet 3
      );
      await sendTransaction(api, txSudoSetSubnetLimit, tk.alice);

      // Allow to register neurons frequently
      console.log(`Allow to register neurons frequently`);
      const txSudoSetRegistrationRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTargetRegistrationsPerInterval(netuid, neuronCount * subnetCount)
      );
      await sendTransaction(api, txSudoSetRegistrationRateLimit, tk.alice);

      // Allow number of neurons needed


      // Create subnets and add neurons
      const subnetExists = (await api.query.subtensorModule.networksAdded(netuid)).toHuman();
      if (subnetExists) {
        throw Error("Restart the network");
      }
    });

    for (let n=1; n<=subnetCount; n++) {
      await usingCreatedApi(async api => {
        const subnetExists = (await api.query.subtensorModule.networksAdded(n)).toHuman();
        if (!subnetExists) {
          const txRegisterSubnet = api.tx.subtensorModule.registerNetwork();
          await sendTransaction(api, txRegisterSubnet, subnetOwnerColdkeys[n]);

          // Allow registrations per block
          const txSudoSetMaxRegistrations1 = api.tx.sudo.sudo(
            api.tx.adminUtils.sudoSetMaxRegistrationsPerBlock(n, neuronCount+1)
          );
          await sendTransaction(api, txSudoSetMaxRegistrations1, tk.alice);

          // Allow registrations per interval
          const txSudoSetMaxRegistrations2 = api.tx.sudo.sudo(
            api.tx.adminUtils.sudoSetTargetRegistrationsPerInterval(n, neuronCount+1)
          );
          await sendTransaction(api, txSudoSetMaxRegistrations2, tk.alice);

          let addNeuronJobs = [];
          for (let uid=0; uid<neuronCount; uid++) {
            const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(n, neuronOwnerHotkeys[uid].address);
            addNeuronJobs.push(sendTransaction(api, txRegisterNeuron, neuronOwnerColdkeys[uid]));
          }
          await Promise.all(addNeuronJobs);

          if ((n+1) % 10 == 0) {
            console.log(`Setup ${n+1} of ${subnetCount} subnets`);
          }
        }
      });
    }




      // // Add stake for alice and bob if it is not added yet
      // await setupStartingStake(api);

      // // Allow setting weights frequently
      // console.log(`Allow setting weights frequently`);
      // const txSudoSetWeightsRateLimit = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      // );
      // await sendTransaction(api, txSudoSetWeightsRateLimit, tk.alice);
      // const txSudoSetWeightsRateLimitRoot = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetWeightsSetRateLimit(rootId, 0)
      // );
      // await sendTransaction(api, txSudoSetWeightsRateLimitRoot, tk.alice);

      // // Allow to stake/unstake frequently
      // console.log(`Allow to stake frequently`);
      // const txSudoSetStakingRateLimit = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetTargetStakesPerInterval(1000)
      // );
      // await sendTransaction(api, txSudoSetStakingRateLimit, tk.alice);


      // // Allow to stake/unstake frequently
      // console.log(`Disable tx rate limit`);
      // const txSudoSetTxRateLimit = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetTxRateLimit(0)
      // );
      // await sendTransaction(api, txSudoSetTxRateLimit, tk.alice);

      // // Reduce subnet tempo
      // console.log(`Reduce subnet tempo`);
      // const txSudoSetTempo = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
      // );
      // await sendTransaction(api, txSudoSetTempo, tk.alice);

      // // Reduce root tempo
      // console.log(`Reduce root tempo`);
      // const txSudoSetTempoRoot = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetTempo(rootId, subnetTempo)
      // );
      // await sendTransaction(api, txSudoSetTempoRoot, tk.alice);

      // // Reduce hotkey drain tempo
      // console.log(`Reduce hotkey tempo`);
      // const txSudoHotkeyEmissionTempo = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetHotkeyEmissionTempo(hotkeyTempo)
      // );
      // await sendTransaction(api, txSudoHotkeyEmissionTempo, tk.alice);

      // // Wait for the end of subnet tempo so that Alice and Bob get validator permits
      // // Only do it if Alice doesn't have validator permit
      // const permits = (await api.query.subtensorModule.validatorPermit(netuid)).toHuman();
      // if (!permits[0]) {
      //   console.log(`Waiting for permits...`);
      //   await skipBlocks(api, subnetTempo);
      // }

      // // Bob sets weights
      // console.log(`Bob sets weights`);
      // const txSetWeights = api.tx.subtensorModule.setWeights(netuid, [0, 1], [65535, 65535], 0);
      // await sendTransaction(api, txSetWeights, tk.bobHot);

      // // Register Bob in root subnet
      // console.log(`Register Bob in root`);
      // const txRootRegister = api.tx.subtensorModule.rootRegister(tk.bobHot.address);
      // await sendTransaction(api, txRootRegister, tk.bob);

      // // Bob also sets root weights
      // console.log(`Bob sets root weights`);
      // const txSetRootWeights = api.tx.subtensorModule.setRootWeights(rootId, tk.bobHot.address, [0, 1], [65535, 65535], 0);
      // await sendTransaction(api, txSetRootWeights, tk.bob);

      // // Wait until root epoch ends
      // console.log(`Waiting for root epoch...`);
      // const rootTempo = (await api.query.subtensorModule.tempo(0)).toNumber();
      // let endRootEpoch = false;
      // while (!endRootEpoch) {
      //   const block = (await api.query.system.number()).toNumber();
      //   endRootEpoch = (block % rootTempo) == 0;
      // }

      // // Read default tempo and child take rate limit
      // initialTempo = api.consts.subtensorModule.initialTempo.toNumber();
      // txChildkeyTakeRateLimit = (await api.query.subtensorModule.txChildkeyTakeRateLimit()).toNumber();

      // // Tests expect that childkey take rate limit and initial tempo are short
      // if ((initialTempo >= 20) || (txChildkeyTakeRateLimit > initialTempo)) {
      //   console.log("Tests expect local node running with fast-blocks feature");
      // }
      // expect(initialTempo < 20).to.be.true;
      // expect(txChildkeyTakeRateLimit <= initialTempo).to.be.true;

      // // Set max childkey take
      // console.log(`Set max childkey take`);
      // const txSudoSetMaxChildkeyTake = api.tx.sudo.sudo(
      //   api.tx.subtensorModule.sudoSetMaxChildkeyTake(maxChildTake)
      // );
      // await sendTransaction(api, txSudoSetMaxChildkeyTake, tk.alice);

    await usingCreatedApi(async api => {
      console.log(`Measure block time`);
      const { mean, stdev } = await measureBlockTime(api, 100);

      console.log(`Idle block time = ${idleMean} +/- ${idleStdev} ms`);
      console.log(`Block time      = ${mean} +/- ${stdev} ms`);
    });
  });


});
