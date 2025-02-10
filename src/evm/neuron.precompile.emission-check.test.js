import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getRandomKeypair, getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";
import { assert, ethers } from "ethers";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import { decodeAddress } from "@polkadot/util-crypto";
import { INEURON_ADDRESS, INeuronABI } from "../util/precompile.js";
let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;
const registerHotkey = getRandomKeypair();
const hotkey = getRandomKeypair();

// as coldkey
let fundedEthWallet = generateRandomAddress();
let netuid = 0;

describe("Neuron burned register", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance1 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance1, tk.alice);

      // Alice funds hotkey with 1M TAO
      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      // Alice funds coldkey with 1M TAO
      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          convertH160ToSS58(fundedEthWallet.address),
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      const registerNetwork = api.tx.subtensorModule.registerNetwork(
        registerHotkey.address
      );
      await sendTransaction(api, registerNetwork, tk.alice);

      const totalNetworks = (
        await api.query.subtensorModule.totalNetworks()
      ).toNumber();

      // root network should be inited already
      expect(totalNetworks).to.be.greaterThan(1);

      netuid = totalNetworks - 1;
      console.log(`Will use the new registered subnet ${netuid} for testing`);
    });
  });

  it("Burned register ", async () => {
    await usingEthApi(async (provider) => {
      console.log(convertH160ToSS58(INEURON_ADDRESS));
      let uid = 0;
      await usingApi(async (api) => {
        uid = Number(await api.query.subtensorModule.subnetworkN(netuid));

        const key = (
          await api.query.subtensorModule.keys(netuid, uid)
        ).toHuman();

        console.log("uid and key before burned: ", uid, key);
      });

      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);
      const tx = await contract.burnedRegister(
        netuid,
        decodeAddress(hotkey.address)
      );
      await tx.wait();

      await usingApi(async (api) => {
        const newUid = Number(
          await api.query.subtensorModule.subnetworkN(netuid)
        );
        expect(uid + 1).to.eq(newUid);

        const key = (
          await api.query.subtensorModule.keys(netuid, uid)
        ).toString();

        // check the neuron is registered.
        expect(key).to.eq(hotkey.address);

        let i = 0;
        while (i < 10) {
          let emission = Number(
            await api.query.subtensorModule.pendingEmission(netuid)
          );
          console.log("emission is ", emission);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          i += 1;
        }
      });
    });
  });
});
