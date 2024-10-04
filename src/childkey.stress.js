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

const subnetCount = 500;      // Number of subnets to create
const neuronCount = 100;    // Number of neurons on each subnet
const nominatorCount = 10; // Number of nominators to stake on each neuron
const fundTxPerBlock = 4096;
const stakeTxPerBlock = 5;
const initialBalance = 1e19; // Total balance needed for testing
const coldBalance = 1000e9;   // Balance of each coldkey
const fees = 1e9;            // Reserve on each coldkey for fees
const skipSubnets = [0, 3];

let tk;

async function executeJobs(jobs, transactionsPerBlock) {
  let batchCount = jobs.length / transactionsPerBlock;
  if (jobs.length % transactionsPerBlock) batchCount++;

  for (let b=0; b<batchCount; b++) {
    let promises = [];
    for (let j=0; j<transactionsPerBlock; j++) {
      promises.push(jobs[b*transactionsPerBlock + j]());
    }
    await Promise.all(promises);
    console.log(`Executed ${(b+1) * transactionsPerBlock} of ${jobs.length} jobs`);
  }
}

async function getNetuids(api) {
  const totalSubnetCount = (await api.query.subtensorModule.totalNetworks()).toNumber();
  let netuids = [];
  let netuid = 0;
  while (netuid < totalSubnetCount) {
    if (!skipSubnets.includes(netuid)) {
      netuids.push(netuid);
    }
    netuid++;
  }

  return netuids;
}

async function fundKeys(api, coldkeys) {
  // Alice funds herself
  const txSudoSetBalance = api.tx.sudo.sudo(
    api.tx.balances.forceSetBalance(tk.alice.address, (initialBalance + 1000 * fees).toString())
  );
  await sendTransaction(api, txSudoSetBalance, tk.alice);

  // Alice funds everyone
  let index = 0;
  let batchTotal = parseInt(coldkeys.length / fundTxPerBlock);
  if (coldkeys.length % fundTxPerBlock) {
    batchTotal++;
  }
  let batchCount = 0;
  while (index < coldkeys.length) {
    const batch = [];
    for (let i=0; i<fundTxPerBlock; i++) {
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
}

describe('Childkeys', () => {
  before(async () => {
    await usingCreatedApi(async api => {
      tk = getTestKeys();


      // Set minimal lock reduction interval and lock cost
      console.log(`Set minimal lock reduction interval and lock cost`);
      const txSudoSetLockCost = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetNetworkMinLockCost(0)
      );
      await sendTransaction(api, txSudoSetLockCost, tk.alice);
      const txSudoSetReductionInterval = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetLockReductionInterval(1)
      );
      await sendTransaction(api, txSudoSetReductionInterval, tk.alice);

      // Allow number of subnets needed
      console.log(`Allow number of subnets needed`);
      const txSudoSetSubnetLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetSubnetLimit(65535)
      );
      await sendTransaction(api, txSudoSetSubnetLimit, tk.alice);

      // Allow to register neurons frequently
      console.log(`Allow to register neurons frequently`);
      const txSudoSetRegistrationRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTargetRegistrationsPerInterval(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetRegistrationRateLimit, tk.alice);

      // Set shorter hotkey tempo (if extrinsic is available)
      try {
        console.log(`Set shorter hotkey emission tempo`);
        const txSudoSetHotkeyTempo = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetHotkeyEmissionTempo(hotkeyTempo)
        );
        await sendTransaction(api, txSudoSetHotkeyTempo, tk.alice);
      } catch (e) {
        console.log(`Failed. Extrinsic is unavailable.`, e);
      }

      console.log(`Setup done`);
    });
  });

  it('Add subnets', async () => {
    // Generate subnet owners
    let subnetOwnerColdkeys = [];
    console.log(`Generating coldkeys`);
    for (let i=0; i<=subnetCount; i++) {
      subnetOwnerColdkeys.push(getRandomKeypair());
    }

    await usingCreatedApi(async api => {
      // Read current number of subnets and generate netuids
      let netuids = [];
      let netuid = 0;
      let handledSubnets = 0;
      while (handledSubnets < subnetCount) {
        if (!skipSubnets.includes(netuid)) {
          netuids.push(netuid);
          handledSubnets++;
        }
        netuid++;
      }

      // Fund coldkeys
      await fundKeys(api, subnetOwnerColdkeys);

      // Create all subnets
      for (let n=0; n<subnetCount; n++) {
        let netuid = netuids[n];

        const txRegisterSubnet = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, txRegisterSubnet, subnetOwnerColdkeys[n]);

        let batch = [];

        // Allow registrations per block
        const txSudoSetMaxRegistrations1 = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetMaxRegistrationsPerBlock(netuid, neuronCount+1)
        );
        batch.push(txSudoSetMaxRegistrations1);

        // Allow registrations per interval
        const txSudoSetMaxRegistrations2 = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetTargetRegistrationsPerInterval(netuid, neuronCount+1)
        );
        batch.push(txSudoSetMaxRegistrations2);

        // Set shorter subnet tempo
        const txSudoSetTempo = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
        );
        batch.push(txSudoSetTempo);

        const txBatchAll = api.tx.utility.batchAll(batch);
        await sendTransaction(api, txBatchAll, tk.alice);

        console.log(`Created ${n+1} of ${subnetCount} subnets`);
      }
    });
  });

  it('Add neurons', async () => {
    let netuids;
    let startIdx = 0;
    await usingCreatedApi(async api => {
      // Get the list of subnets
      netuids = await getNetuids(api);

      // Search for the first subnet without neurons
      startIdx = netuids.length;
      for (let i=0; i<netuids.length; i++) {
        const n = (await api.query.subtensorModule.subnetworkN(netuids[i])).toNumber();
        if (n < 100) {
          startIdx = i;
          break;
        }
      }
    });

    // How many time to use the api for setting up before it is recreated
    const apiRecreateIterations = 5;
    let i=startIdx;

    while (i<netuids.length) {
      await usingCreatedApi(async api => {
        for (let j=0; j<apiRecreateIterations; j++) {
          if (i+j < netuids.length) {
            let netuid = netuids[i+j];

            // Generate neuron owner keys
            let neuronOwnerColdkeys = [];
            let neuronOwnerHotkeys = [];
            for (let k=0; k<neuronCount; k++) {
              neuronOwnerColdkeys.push(getRandomKeypair());
              neuronOwnerHotkeys.push(getRandomKeypair());
            }
    
            // Fund neuron owners
            await fundKeys(api, neuronOwnerColdkeys);
    
            // Run registration jobs
            let addNeuronJobs = [];
            for (let uid=0; uid<neuronCount; uid++) {
              const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(netuid, neuronOwnerHotkeys[uid].address);
              addNeuronJobs.push(sendTransaction(api, txRegisterNeuron, neuronOwnerColdkeys[uid]));
            }
            await Promise.all(addNeuronJobs);
    
            // Hotkeys become delegates
            let becomeDelegateJobs = [];
            for (let uid=0; uid<neuronCount; uid++) {
              const txBecomeDelegate = api.tx.subtensorModule.becomeDelegate(neuronOwnerHotkeys[uid].address);
              becomeDelegateJobs.push(sendTransaction(api, txBecomeDelegate, neuronOwnerColdkeys[uid]));
            }
            await Promise.all(becomeDelegateJobs);
    
            console.log(`Setup ${i+j+1} of ${netuids.length} subnets`);
          }
        }
        i += apiRecreateIterations;
      });
    }
  });

  it('Setup tempos', async () => {
    let netuids;
    const subnetTempo = 360;
    await usingCreatedApi(async api => {
      // Get the list of subnets
      netuids = await getNetuids(api);

      let batch = [];
      for (let n=0; n<netuids.length; n++) {
        let netuid = netuids[n];
        // Set subnet tempo
        const txSudoSetTempo = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetTempo(netuid, subnetTempo)
        );
        batch.push(txSudoSetTempo);
      }

      const txBatchAll = api.tx.utility.batchAll(batch);
      await sendTransaction(api, txBatchAll, tk.alice);
    });
  });

  it.only('Nominate to everyone', async () => {
    await usingCreatedApi(async api => {
      // Get the list of subnets
      let netuids = await getNetuids(api);

      // Read the full list of hotkeys for all subnets
      const neuronHotkeys = [];
      for (let n=0; n<netuids.length; n++) {
        const netuid = netuids[n];

        // Get the list of hotkeys - owners of neurons
        const hotkeys = (await api.query.subtensorModule.keys.entries(netuid));
        for (let i=0; i<hotkeys.length; i++) {
          const hotkey = hotkeys[i][1].toString();

          const currentStake = (await api.query.subtensorModule.totalHotkeyStake(hotkey)).toNumber();
          if (currentStake < stake * nominatorCount) {
            neuronHotkeys.push(hotkey);
          }
        }
      }
      console.log(`Discovered ${neuronHotkeys.length} hotkeys to stake to`);

      // Generate and fund nominator coldkeys
      let nominatorColdkeys = [];
      for (let i=0; i<nominatorCount; i++) {
        nominatorColdkeys.push(getRandomKeypair());
      }
      await fundKeys(api, nominatorColdkeys);
      console.log(`Funded all nominators`);

      // Populate stake jobs
      let stakeJobs = [];
      for (let i=0; i<nominatorCount; i++) {
        let batch = [];
        for (let j=0; j<neuronHotkeys.length; j++) {
          batch.push(
            api.tx.subtensorModule.addStake(neuronHotkeys[j], stake.toString())
          );
        }
        const stakeBatch = api.tx.utility.batchAll(batch);
        const sj = async () => {
          await sendTransaction(api, stakeBatch, nominatorColdkeys[i]);
        };
        stakeJobs.push(sj);
      }

      // Execute stake jobs in batches
      console.log(`Executing stake jobs`);
      await executeJobs(stakeJobs, stakeTxPerBlock);
    });
  });

});
