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

// Stake to OTF hotkey: 5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3
const otfHotkey = '5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3';
// const otfHotkey = '5HDmsjdFG53WG7WHjnS1HW6Eymz1BR6zgAhxXHMERFczeaAt';
const hex = '84d83d08ca89f8e60424ffa286f165c16dd8752e4faa4d8977221e6720678d28';
// const hex = 'e417e72d11e6efb6a322677c6838ebb0c192f3140978648e6d4e2ea09348f20f';
const otfHotkeyPublicKey = Uint8Array.from(Buffer.from(hex, 'hex'));
console.log(`otfHotkeyPublicKey = ${otfHotkeyPublicKey.toString()}`);

// проверить на тестнете через сутки (2024-11-15 18:28):

// Stake 
// 5HDmsjdFG53WG7WHjnS1HW6Eymz1BR6zgAhxXHMERFczeaAt
// 5E51W8MzFsftU8NMjhqXNASidygC8jFPX2HyFiqYkkvAw54x
// > 1,000,000,000

// проверить на локальном фини клоне через сутки (2024-11-15 18:50)
// Stake 
// 5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3
// 5E51W8MzFsftU8NMjhqXNASidygC8jFPX2HyFiqYkkvAw54x
// > 1,000,000,000

let abi = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
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
        internalType: "bytes32",
        name: "coldkey",
        type: "bytes32",
      },
    ],
    name: "getStake",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
      },
    ],
    stateMutability: "view",
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
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "removeStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

let address = "0x0000000000000000000000000000000000000801";

describe("Staking precompile", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);
      fundedEthWallet = tk.testEth;
      console.log(`fundedEthWallet: ${fundedEthWallet.address}`);

      // // Alice funds herself with 1M TAO
      // const txSudoSetBalance = api.tx.sudo.sudo(
      //   api.tx.balances.forceSetBalance(
      //     tk.alice.address,
      //     amount1TAO.multipliedBy(1e6).toString()
      //   )
      // );
      // await sendTransaction(api, txSudoSetBalance, tk.alice);

      // // Alice funds fundedEthWallet
      // const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      // console.log("fundedEthWallet ss58 address is: ", ss58mirror);

      // const transfer = api.tx.balances.transferKeepAlive(
      //   ss58mirror,
      //   amount1TAO.multipliedBy(100).toString()
      // );
      // await sendTransaction(api, transfer, tk.alice);

      // const txSudoSetTargetStakesPerInterval = api.tx.sudo.sudo(
      //   api.tx.adminUtils.sudoSetTargetStakesPerInterval(10)
      // );
      // await sendTransaction(api, txSudoSetTargetStakesPerInterval, tk.alice);
    });
  });

  it("Can add stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md

      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const netuid = 0;

      let balanceBefore;
      await usingApi(async (api) => {
        balanceBefore = await getTaoBalance(api, ss58mirror);
      });
      console.log(`balanceBefore = ${balanceBefore}`);

      const amountEth = 1;
      const amountStr = convertEtherToWei(amountEth).toString();

      // Instead, do the burned registration manually, also make sure account has > 1 TAO
      console.log(`fundedEthWallet.address: ${fundedEthWallet.address}`);
      console.log(`ss58 mirror of fundedEthWallet.address: ${ss58mirror}`);
      // // register alice and bob as coldkey / hotkey
      // const register = api.tx.subtensorModule.rootRegister(tk.bob.address);
      // await sendTransaction(api, register, tk.alice);

      // let old_owner = (
      //   await api.query.subtensorModule.owner(tk.bob.address)
      // ).toString();

      // const swapCold = api.tx.sudo.sudo(
      //   api.tx.subtensorModule.swapColdkey(tk.alice.address, ss58mirror)
      // );
      // await sendTransaction(api, swapCold, tk.alice);

      let before_stake = await api.query.subtensorModule.stake(
        otfHotkey,
        ss58mirror
      );
      console.log(`stake before: ${before_stake}`);

      // // wait for coldkey swap done
      // while (true) {
      //   let current_owner = (
      //     await api.query.subtensorModule.owner(tk.bob.address)
      //   ).toString();

      //   if (current_owner !== old_owner) {
      //     break;
      //   }
      //   await new Promise((resolve) => setTimeout(resolve, 1000));

      //   console.log(
      //     "waiting for coldkey swap, please check coldkey swap duration in runtime if take a long time"
      //   );
      // }

      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);

        const contract = new ethers.Contract(address, abi, signer);

        // Execute transaction
        const tx = await contract.addStake(otfHotkeyPublicKey, netuid, {
          value: amountStr,
        });
        await tx.wait();
      });

      let stake = await api.query.subtensorModule.stake(
        otfHotkey,
        ss58mirror
      );

      expect(stake > before_stake);
    });
  });

  it("Can remove stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const netuid = 1;

      const amountEth = 1;
      const amountStr = convertEtherToWei(amountEth).toString();

      const contract = new ethers.Contract(address, abi, signer);

      let before_stake = await api.query.subtensorModule.stake(
        otfHotkey,
        ss58mirror
      );

      const tx = await contract.removeStake(
        otfHotkeyPublicKey,
        "10000000000000",
        netuid,
        { value: amountStr }
      );
      await tx.wait();

      let stake = await api.query.subtensorModule.stake(
        otfHotkey,
        ss58mirror
      );
      expect(stake < before_stake);
    });
  });
});
