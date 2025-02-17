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
let coldkey = getRandomKeypair();
let hotkey = getRandomKeypair();
// weights data
const uids = [1];
const values = [5];
const salt = [9];
const version_key = 0;
let netuid = 0;

function getCommitHash(netuid) {
  const registry = new TypeRegistry();

  let publicKey = convertH160ToPublicKey(fundedEthWallet.address);
  console.log(publicKey);

  const tupleData = new Tuple(
    registry,
    [
      VecFixed.with(u8, 32),
      u16,
      Vec.with(u16),
      Vec.with(u16),
      Vec.with(u16),
      u64,
    ],
    [publicKey, netuid, uids, values, salt, version_key]
  );

  console.log("Encoded Array:", tupleData.toU8a());

  const hash = blake2AsU8a(tupleData.toU8a());
  console.log(hash);
  return hash;
}

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

      // sometimes we need update it because of the reveal commit must be in the correct epoch
      // we can also update Tempo long enough, then we can reveal at the same epoch.
      const txSudoSetCommitRevealWeightsInterval = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetCommitRevealWeightsInterval(netuid, 1)
      );
      await sendTransaction(
        api,
        txSudoSetCommitRevealWeightsInterval,
        tk.alice
      );

      const sudoSetWeightsSetRateLimit = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetWeightsSetRateLimit(netuid, 0)
      );

      await sendTransaction(api, sudoSetWeightsSetRateLimit, tk.alice);
    });
  });

  it("EVM neuron commit weights via call precompile", async () => {
    await usingApi(async (api) => {
      const sudoSetCommitRevealWeightsEnabled = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetCommitRevealWeightsEnabled(netuid, true)
      );

      await sendTransaction(api, sudoSetCommitRevealWeightsEnabled, tk.alice);
    });

    await usingEthApi(async (provider) => {
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);
      const commitHash = getCommitHash(netuid);
      const tx = await contract.commitWeights(netuid, commitHash);
      await tx.wait();
    });

    await usingApi(async (api) => {
      const weightCommit = (
        await api.query.subtensorModule.weightCommits(
          netuid,
          convertH160ToPublicKey(fundedEthWallet.address)
        )
      ).toHuman();

      // check the commit includes data
      expect(weightCommit).to.be.not.undefined;
    });
  });

  it("EVM neuron reveal weights via call precompile", async () => {
    await usingEthApi(async (provider) => {
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);

      const tx = await contract.revealWeights(
        netuid,
        uids,
        values,
        salt,
        version_key
      );
      await tx.wait();
    });

    await usingApi(async (api) => {
      const weightCommit = (
        await api.query.subtensorModule.weightCommits(
          netuid,
          convertH160ToPublicKey(fundedEthWallet.address)
        )
      ).toHuman();

      // check the weight commit is removed after reveal successfully
      expect(weightCommit).to.be.null;

      const neuron_uid = (
        await api.query.subtensorModule.uids(
          netuid,
          convertH160ToPublicKey(fundedEthWallet.address)
        )
      ).toHuman();

      const weights = (
        await api.query.subtensorModule.weights(netuid, neuron_uid)
      ).toHuman();

      // check the weight is set after reveal with correct uid
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
