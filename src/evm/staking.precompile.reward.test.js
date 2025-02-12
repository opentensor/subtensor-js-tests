import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getRandomKeypair, getTestKeys } from "../util/known-keys.js";
import {
  convertEtherToWei,
  convertWeiToEther,
  convertTaoToRao,
  convertRaoToTao,
} from "../util/balance-math.js";
import { generateRandomAddress } from "../util/address.js";
import { getExistentialDeposit, u256toBigNumber } from "../util/helpers.js";
import { decodeAddress } from "@polkadot/util-crypto";
import { assert, ethers } from "ethers";
import BigNumber from "bignumber.js";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

// coldkey
const coldkey = getRandomKeypair();
const subnet_hotkey = getRandomKeypair();
const hotkey = getRandomKeypair();
// validator
const validator = getRandomKeypair();
// miner
const miner = getRandomKeypair();
// nominator
const nominator = getRandomKeypair();
const sudo = getTestKeys().alice;
let netuid = 0;

// env test for reward
describe("Staking precompile", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, sudo);

      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          validator.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, sudo);

      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          miner.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, sudo);

      const txSudoSetBalance4 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          nominator.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance4, sudo);

      const registerNetwork = api.tx.subtensorModule.registerNetwork(
        subnet_hotkey.address
      );
      await sendTransaction(api, registerNetwork, coldkey);

      const totalNetworks = (
        await api.query.subtensorModule.totalNetworks()
      ).toNumber();

      // root network should be inited already
      expect(totalNetworks).to.be.greaterThan(1);

      netuid = totalNetworks - 1;
      console.log(`Will use the new registered subnet ${netuid} for testing`);

      const root_id = 0;
      const root_tempo = 1; // neet root epoch to happen before subnet tempo
      const subnet_tempo = 1;
      // const hotkey_tempo = 20;

      // set_tx_rate_limit
      const txSudoSetTxRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTxRateLimit(0)
      );
      await sendTransaction(api, txSudoSetTxRateLimit, sudo);

      // set tempo for both subnet 0 and root net
      const txSudoSetTemp = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(root_id, root_tempo)
      );
      await sendTransaction(api, txSudoSetTemp, sudo);

      const txSudoSetTemp2 = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTempo(netuid, subnet_tempo)
      );
      await sendTransaction(api, txSudoSetTemp2, sudo);

      // register to network for validator
      const registerValidator = api.tx.subtensorModule.burnedRegister(
        netuid,
        validator.address
      );
      await sendTransaction(api, registerValidator, coldkey);

      // register to network for miner
      const registerMiner = api.tx.subtensorModule.burnedRegister(
        netuid,
        miner.address
      );
      await sendTransaction(api, registerMiner, coldkey);

      // register to network for nominator
      const registerNominator = api.tx.subtensorModule.burnedRegister(
        netuid,
        nominator.address
      );
      await sendTransaction(api, registerNominator, coldkey);

      // set subnet 1, limit 0
      const txSudoSetWeightSetRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      );
      await sendTransaction(api, txSudoSetWeightSetRateLimit, sudo);

      // set subnet 1, limit 2
      const txSudoSetMaxAllowedValidators = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, 2)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators, sudo);

      const lastHeader = await api.rpc.chain.getHeader();
      // const blockNumber = await api.rpc.chain.blockNumber();
      const lastBlockNumber = lastHeader.toHuman().number;

      // step_block(subnet_tempo);
      // waiting for subnet tempo passed
      let index = 0;
      while (index < 60) {
        const current = await api.rpc.chain.getHeader();
        const currentBlockNumber = current.toHuman().number;
        if (currentBlockNumber - lastBlockNumber > subnet_tempo) break;
        console.log("wait for subnet temp");

        // sleep 0.1 sec, each block in 0.25 sec
        await new Promise((resolve) => setTimeout(resolve, 1000));
        index += 1;
      }

      // pallet_subtensor::SubnetOwnerCut::<Test>::set(0);
      const txSudoSetSubnetOwnerCut = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetSubnetOwnerCut(0)
      );
      await sendTransaction(api, txSudoSetSubnetOwnerCut, sudo);

      // pallet_subtensor::ActivityCutoff::<Test>::set(netuid, u16::MAX);
      const txSudoSetActivityCutoff = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetActivityCutoff(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetActivityCutoff, sudo);

      // pallet_subtensor::MaxAllowedUids::<Test>::set(netuid, 2);
      const txSudoSetMaxAllowedUids = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedUids(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetMaxAllowedUids, sudo);

      // pallet_subtensor::MaxAllowedValidators::<Test>::set(netuid, 1);
      const txSudoSetMaxAllowedValidators2 = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMaxAllowedValidators(netuid, 65535)
      );
      await sendTransaction(api, txSudoSetMaxAllowedValidators2, sudo);

      // SubtensorModule::set_min_delegate_take(0);
      const txSudoSetMinDelegateTake = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetMinDelegateTake(0)
      );
      await sendTransaction(api, txSudoSetMinDelegateTake, sudo);

      // Set zero hotkey take for validator. can't do it via extrinsic, so set its as default value
      const txBecomeDelegate = api.tx.subtensorModule.becomeDelegate(
        validator.address
      );
      await sendTransaction(api, txBecomeDelegate, coldkey);

      // Set zero hotkey take for miner
      const txBecomeDelegate2 = api.tx.subtensorModule.becomeDelegate(
        miner.address
      );
      await sendTransaction(api, txBecomeDelegate2, coldkey);

      const txSudoSetWeightsSetRateLimit =
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0);
      await sendTransaction(api, txSudoSetWeightsSetRateLimit, coldkey);
    });
  });

  it("Staker receives rewards", async () => {
    await usingApi(async (api) => {
      const stake = 100000000000;
      const miner_stake = 1000000000;

      // Setup stakes:
      //   Stake from validator
      //   Stake from miner
      //   Stake from nominator to miner
      //   Give 100% of parent stake to childkey
      const txValidatorStake = api.tx.subtensorModule.addStake(
        validator.address,
        netuid,
        stake
      );
      await sendTransaction(api, txValidatorStake, coldkey);

      const txMinerStake = api.tx.subtensorModule.addStake(
        miner.address,
        netuid,
        miner_stake
      );
      await sendTransaction(api, txMinerStake, coldkey);

      const txNonimatorStake = api.tx.subtensorModule.addStake(
        nominator.address,
        netuid,
        stake
      );
      await sendTransaction(api, txNonimatorStake, coldkey);

      const miner_alpha_before_emission = u256toBigNumber(
        await api.query.subtensorModule.alpha(
          miner.address,
          coldkey.address,
          netuid
        )
      );

      console.log(
        "miner_alpha_before_emission is ",
        miner_alpha_before_emission
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
      await sendTransaction(api, txSetWeights, validator);

      const txRootRegister = api.tx.subtensorModule.rootRegister(
        validator.address
      );
      await sendTransaction(api, txRootRegister, coldkey);

      let index = 0;
      while (index < 60) {
        const pending = await api.query.subtensorModule.pendingEmission(netuid);
        if (pending > 0) {
          console.log("pending amount is ", pending.toHuman());
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("wait for the pendingEmission update");
        index += 1;
      }

      index = 0;
      while (index < 60) {
        let miner_current_alpha = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            miner.address,
            coldkey.address,
            netuid
          )
        );

        if (miner_current_alpha > miner_alpha_before_emission) {
          console.log("miner got reward");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(" waiting for emission");
        index += 1;
      }
    });
  });
});
