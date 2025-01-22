import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getRandomKeypair, getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";
import { assert, ethers } from "ethers";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import { decodeAddress } from "@polkadot/util-crypto";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;
const hotkey = getRandomKeypair();

// as coldkey
let fundedEthWallet = generateRandomAddress();

const ISUBNETS_ADDRESS = "0x0000000000000000000000000000000000000804";
const ISubnetsABI = [
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
    ],
    name: "burnedRegister",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

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

      const netuid = 1;

      let netuid_1_exist = (
        await api.query.subtensorModule.networksAdded(netuid)
      ).toHuman();

      // add the first subnet if not created yet
      if (!netuid_1_exist) {
        const registerNetwork = api.tx.subtensorModule.registerNetwork(tk.bob);
        await sendTransaction(api, registerNetwork, tk.alice);
      }
    });
  });

  it("Burned register ", async () => {
    await usingEthApi(async (provider) => {
      console.log(convertH160ToSS58(ISUBNETS_ADDRESS));
      const netuid = 1;
      let uid = 0;
      await usingApi(async (api) => {
        uid = Number(await api.query.subtensorModule.subnetworkN(netuid));

        const key = (
          await api.query.subtensorModule.keys(netuid, uid)
        ).toHuman();

        console.log("uid and key before burned: ", uid, key);
      });

      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(
        ISUBNETS_ADDRESS,
        ISubnetsABI,
        signer
      );
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
            await api.query.subtensorModule.pendingdHotkeyEmission(
              decodeAddress(hotkey.address)
            )
          );
          console.log("emission is ", emission);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          i += 1;
        }
      });
    });
  });
});
