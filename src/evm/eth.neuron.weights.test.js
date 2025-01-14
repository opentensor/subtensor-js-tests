import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { ethers } from "ethers";
import { getTestKeys, getRandomKeypair } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();
let coldkey = getRandomKeypair();
const INEURON_ADDRESS = "0x0000000000000000000000000000000000000805";
const INeuronABI = [
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16[]",
        name: "dests",
        type: "uint16[]",
      },
      {
        internalType: "uint16[]",
        name: "weights",
        type: "uint16[]",
      },
      {
        internalType: "uint64",
        name: "versionKey",
        type: "uint64",
      },
    ],
    name: "setWeights",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

describe("EVM neuron weights test", () => {
  before(async () => {
    await usingApi(async (api) => {
      const netuid = 1;
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

      let netuid_1_exist = (
        await api.query.subtensorModule.networksAdded(netuid)
      ).toHuman();

      // add the first subnet if not created yet
      if (!netuid_1_exist) {
        const registerNetwork = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, registerNetwork, tk.alice);
      }

      // register to network
      const registerValidator = api.tx.subtensorModule.burnedRegister(
        netuid,
        ss58mirror
      );

      await sendTransaction(api, registerValidator, coldkey);
    });
  });

  it("EVM neuron set weights via call precompile", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;

      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);
      const dests = [1];
      const weights = [2];
      const version_key = 3;

      const tx = await contract.setWeights(netuid, dests, weights, version_key);
      await tx.wait();
    });
  });
});