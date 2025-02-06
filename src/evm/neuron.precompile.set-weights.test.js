import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { ethers } from "ethers";
import { getTestKeys, getRandomKeypair } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import {
  convertH160ToPublicKey,
  convertH160ToSS58,
  generateRandomAddress,
} from "../util/address.js";
import { INEURON_ADDRESS, INeuronABI } from "../util/precompile.js";
import { TypeRegistry } from "@polkadot/types";
import { Vec, Tuple, VecFixed, u16, u8, u64 } from "@polkadot/types-codec";
import { blake2AsU8a } from "@polkadot/util-crypto";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();
const hotkey = getRandomKeypair();
const coldkey = getRandomKeypair();

// weights data
const uids = [1];
const values = [5];
const salt = [9];
const version_key = 0;
let netuid = 0;

describe("EVM neuron weights test", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);

      let ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      // Alice funds account
      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          ss58mirror,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );

      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );

      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      const txSudoSetWeightsSetRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      );
      await sendTransaction(api, txSudoSetWeightsSetRateLimit, tk.alice);

      const registerNetwork = api.tx.subtensorModule.registerNetwork(
        hotkey.address
      );
      await sendTransaction(api, registerNetwork, tk.alice);

      const totalNetworks = (
        await api.query.subtensorModule.totalNetworks()
      ).toNumber();

      // root network should be inited already
      expect(totalNetworks).to.be.greaterThan(1);

      netuid = totalNetworks - 1;
      console.log(`Will use the new registered subnet ${netuid} for testing`);

      // register to network
      const registerValidator = api.tx.subtensorModule.burnedRegister(
        netuid,
        ss58mirror
      );

      await sendTransaction(api, registerValidator, coldkey);

      const txSudoSetCommitRevealWeightsInterval = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetCommitRevealWeightsInterval(netuid, 0)
      );
      await sendTransaction(
        api,
        txSudoSetCommitRevealWeightsInterval,
        tk.alice
      );
    });
  });

  it("EVM neuron set weights via call precompile", async () => {
    await usingEthApi(async (provider) => {
      await usingApi(async (api) => {
        const sudoSetCommitRevealWeightsEnabled = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetCommitRevealWeightsEnabled(netuid, false)
        );

        await sendTransaction(api, sudoSetCommitRevealWeightsEnabled, tk.alice);

        const sudoSetWeightsSetRateLimit = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
        );

        await sendTransaction(api, sudoSetWeightsSetRateLimit, tk.alice);
      });

      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);
      const dests = [1];
      const weights = [2];

      const tx = await contract.setWeights(netuid, dests, weights, version_key);

      await tx.wait();

      await usingApi(async (api) => {
        const neuron_uid = (
          await api.query.subtensorModule.uids(
            netuid,
            convertH160ToPublicKey(fundedEthWallet.address)
          )
        ).toHuman();

        expect(neuron_uid).to.not.be.undefined;

        // check weigh is set successfully
        const weights = (
          await api.query.subtensorModule.weights(netuid, neuron_uid)
        ).toHuman();

        let uidIncluded = false;
        let uid = undefined;
        let value = undefined;

        weights.forEach((weight, index) => {
          uid = weight[0];
          value = weight[1];
          if (uid == neuron_uid) {
            uidIncluded = true;
          }
        });

        expect(uidIncluded).to.be.eq(true);
        expect(value).to.be.not.undefined;
      });
    });
  });
});
