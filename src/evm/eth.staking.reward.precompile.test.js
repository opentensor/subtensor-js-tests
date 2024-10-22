import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import {
  convertEtherToWei,
  convertWeiToEther,
  convertTaoToRao,
  convertRaoToTao,
} from "../util/balance-math.js";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import {
  getEthereumBalance,
  estimateTransactionCost,
  sendEthTransaction,
  ss58ToH160,
} from "../util/eth-helpers.js";
import { getExistentialDeposit, getTaoBalance } from "../util/helpers.js";
import { decodeAddress } from "@polkadot/util-crypto";
import { assert, ethers } from "ethers";
import BigNumber from "bignumber.js";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

let abi = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
    ],
    name: "addStake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "removeStake",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];
let address = "0x0000000000000000000000000000000000000801";

// env test for reward
describe("Staking precompile", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);

      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.bob.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.charlie.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      console.log("fundedEthWallet ss58 address is: ", ss58mirror);

      const transfer = api.tx.balances.transferKeepAlive(
        ss58mirror,
        amount1TAO.multipliedBy(100).toString()
      );
      await sendTransaction(api, transfer, tk.alice);

      // -------- test_mining_emission_drain
      // coldkey alice
      // validator bob
      // miner charlie
      // nominator dave
      const netuid = 1;
      const root_id = 0;
      const root_tempo = 9; // neet root epoch to happen before subnet tempo
      const subnet_tempo = 10;
      const hotkey_tempo = 20;

      // set_tx_rate_limit
      const txSudoSetTxRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTxRateLimit(0)
      );
      await sendTransaction(api, txSudoSetTxRateLimit, tk.alice);

      // add_network(root_id, root_tempo, 0);
      // root network already in genesis

      // register network 1  via alice account
      // add_network(netuid, subnet_tempo, 0);
      const registerNetwork = api.tx.subtensorModule.registerNetwork();
      await sendTransaction(api, registerNetwork, tk.alice);

      // set tempo for both subnet 0 and root net
      const txSudoSetTemp = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(root_id, root_tempo)
      );
      await sendTransaction(api, txSudoSetTemp, tk.alice);

      const txSudoSetTemp2 = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(netuid, subnet_tempo)
      );
      await sendTransaction(api, txSudoSetTemp2, tk.alice);

      // register to network bob as validator
      const registerValidator = api.tx.subtensorModule.burnedRegister(
        netuid,
        tk.bob.address
      );
      await sendTransaction(api, registerValidator, tk.alice);

      // register to network charlie as miner
      const registerMiner = api.tx.subtensorModule.burnedRegister(
        netuid,
        tk.charlie.address
      );
      await sendTransaction(api, registerMiner, tk.alice);

      // sudo_set_hotkey_emission_tempo

      // sudo_set_hotkey_emission_tempo
      const txSudoSetEmissionTemp = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetHotkeyEmissionTempo(hotkey_tempo)
      );
      await sendTransaction(api, txSudoSetEmissionTemp, tk.alice);

      // set subnet 1, limit 0
      const txSudoSetWeightSetRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      );
      await sendTransaction(api, txSudoSetWeightSetRateLimit, tk.alice);

      // set subnet 1, limit 2
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, 2)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, tk.alice);

      const lastHeader = await api.rpc.chain.getHeader();
      // const blockNumber = await api.rpc.chain.blockNumber();
      const lastBlockNumber = lastHeader.toHuman().number;

      // step_block(subnet_tempo);
      // waiting for subnet tempo passed
      while (true) {
        const current = await api.rpc.chain.getHeader();
        const currentBlockNumber = current.toHuman().number;
        if (currentBlockNumber - lastBlockNumber > subnet_tempo) break;

        // sleep 0.1 sec, each block in 0.25 sec
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // pallet_subtensor::SubnetOwnerCut::<Test>::set(0);
      const txSudoSetSubnetOwnerCut = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetSubnetOwnerCut(0)
      );
      await sendTransaction(api, txSudoSetSubnetOwnerCut, tk.alice);

      // pallet_subtensor::ActivityCutoff::<Test>::set(netuid, u16::MAX);
      const txSudoSetActivityCutoff = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetActivityCutoff(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetActivityCutoff, tk.alice);

      // pallet_subtensor::MaxAllowedUids::<Test>::set(netuid, 2);
      const txSudoSetMaxAllowedUids = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedUids(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetMaxAllowedUids, tk.alice);

      // pallet_subtensor::MaxAllowedValidators::<Test>::set(netuid, 1);
      const txSudoSetMaxAllowedValidators2 = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators2, tk.alice);

      // SubtensorModule::set_min_delegate_take(0);
      const txSudoSetMinDelegateTake = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMinDelegateTake(0)
      );
      await sendTransaction(api, txSudoSetMinDelegateTake, tk.alice);

      // Set zero hotkey take for validator. can't do it via extrinsic, so set its as default value
      const txBecomeDelegate = api.tx.subtensorModule.becomeDelegate(
        tk.bob.address
      );
      await sendTransaction(api, txBecomeDelegate, tk.alice);

      // Set zero hotkey take for miner
      const txBecomeDelegate2 = api.tx.subtensorModule.becomeDelegate(
        tk.charlie.address
      );
      await sendTransaction(api, txBecomeDelegate2, tk.alice);

      const txSudoSetWeightsSetRateLimit =
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0);
      await sendTransaction(api, txSudoSetWeightsSetRateLimit, tk.alice);

      const txSudoSetRootWeightsSetRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(root_id, 0)
      );
      await sendTransaction(api, txSudoSetRootWeightsSetRateLimit, tk.alice);
    });
  });

  it("Staker receives rewards", async () => {
    await usingApi(async (api) => {
      const netuid = 1;
      const root_id = 0;
      const stake = 100000000000;
      const miner_stake = 1000000000;

      // Setup stakes:
      //   Stake from validator
      //   Stake from miner
      //   Stake from nominator to miner
      //   Give 100% of parent stake to childkey
      const txValidatorStake = api.tx.subtensorModule.addStake(
        tk.bob.address,
        stake
      );
      await sendTransaction(api, txValidatorStake, tk.alice);

      const txMinerStake = api.tx.subtensorModule.addStake(
        tk.charlie.address,
        miner_stake
      );
      await sendTransaction(api, txMinerStake, tk.alice);

      const txMonimatorrStake = api.tx.subtensorModule.addStake(
        tk.charlie.address,
        stake
      );
      await sendTransaction(api, txMonimatorrStake, tk.dave);

      const miner_stake_before_emission = await api.query.subtensorModule.stake(
        tk.charlie.address,
        tk.alice.address
      );

      // Setup YUMA so that it creates emissions:
      //   Validator sets weights
      //   Validator registers on root and
      //   Sets root weights
      //   Last weight update is after block at registration

      const txSetWeights = api.tx.subtensorModule.setWeights(
        netuid,
        [0, 1],
        [0xffff, 0xffff],
        0
      );
      await sendTransaction(api, txSetWeights, tk.bob);

      const txRootRegister = api.tx.subtensorModule.rootRegister(
        tk.bob.address
      );
      await sendTransaction(api, txRootRegister, tk.alice);

      const txSetRootWeights = api.tx.subtensorModule.setRootWeights(
        root_id,
        tk.bob.address,
        [0, 1],
        [0xffff, 0xffff],
        0
      );
      await sendTransaction(api, txSetRootWeights, tk.alice);

      while (true) {
        const pending = await api.query.subtensorModule.pendingEmission(netuid);
        if (pending > 0) {
          console.log("pending amount is ", pending);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      while (true) {
        let miner_current_stake = await api.query.subtensorModule.stake(
          tk.charlie.address,
          tk.alice.address
        );
        // console.log("compare two: ", current, miner_stake_before_emission);

        if (miner_current_stake > miner_stake_before_emission) {
          console.log("miner got reward");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(" waiting for emission");
      }
    });
  });
});
