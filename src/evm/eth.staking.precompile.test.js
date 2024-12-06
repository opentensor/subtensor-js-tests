import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertEtherToWei, convertTaoToRao } from "../util/balance-math.js";
import {
  convertH160ToSS58,
  generateRandomAddress,
  convertH160ToPublicKey,
} from "../util/address.js";
import { getExistentialDeposit, getTaoBalance } from "../util/helpers.js";
import { assert, ethers } from "ethers";
import BigNumber from "bignumber.js";
import { expect } from "chai";
import exp from "constants";
import { getRandomKeypair } from "../util/known-keys.js";

let tk;
const amount1TAO = convertTaoToRao(1.0);
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
const amountEth = 0.5;
const amountStr = convertEtherToWei(amountEth).toString();
let coldkey = getRandomKeypair();
let hotkey = getRandomKeypair();

describe("Staking precompile", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      const netuid = 1;

      let netuid_1_exist = (
        await api.query.subtensorModule.networksAdded(netuid)
      ).toHuman();

      // add the first subnet if not created yet
      if (!netuid_1_exist) {
        const registerNetwork = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, registerNetwork, tk.alice);
      }

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);

      // Alice funds coldkey with 1M TAO
      const txSudoSetColdkeyBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetColdkeyBalance, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const transfer = api.tx.balances.transferKeepAlive(
        ss58mirror,
        amount1TAO.multipliedBy(100).toString()
      );
      await sendTransaction(api, transfer, tk.alice);

      const txSudoSetTargetStakesPerInterval = api.tx.sudo.sudo(
        api.tx.adminUtils.sudoSetTargetStakesPerInterval(10)
      );
      await sendTransaction(api, txSudoSetTargetStakesPerInterval, tk.alice);
    });
  });

  it("Can add stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md

      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const netuid = 1;

      let balanceBefore;
      await usingApi(async (api) => {
        balanceBefore = await getTaoBalance(api, ss58mirror);
      });

      // register coldkey / hotkey
      const register = api.tx.subtensorModule.rootRegister(hotkey.address);
      await sendTransaction(api, register, coldkey);

      let old_owner = (
        await api.query.subtensorModule.owner(hotkey.address)
      ).toString();

      const swapCold = api.tx.sudo.sudo(
        api.tx.subtensorModule.swapColdkey(coldkey.address, ss58mirror)
      );
      await sendTransaction(api, swapCold, tk.alice);

      let before_stake = await api.query.subtensorModule.stake(
        hotkey.address,
        ss58mirror
      );

      // wait for coldkey swap done
      while (true) {
        let current_owner = (
          await api.query.subtensorModule.owner(hotkey.address)
        ).toString();

        if (current_owner !== old_owner) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          "waiting for coldkey swap, please check coldkey swap duration in runtime if take a long time"
        );
      }

      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const publicKey = convertH160ToPublicKey(fundedEthWallet.address);
        const contract = new ethers.Contract(address, abi, signer);

        // Execute transaction
        const tx = await contract.addStake(hotkey.publicKey, netuid, {
          value: amountStr,
        });
        await tx.wait();
      });

      let stake = await api.query.subtensorModule.stake(
        hotkey.address,
        ss58mirror
      );

      expect(stake > before_stake);
    });
  });

  it("Can get stake via contract read method", async () => {
    await usingEthApi(async (provider) => {
      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const publicKey = convertH160ToPublicKey(fundedEthWallet.address);

      const contract = new ethers.Contract(address, abi, signer);

      // get stake via contract method
      const stake_from_contract = await contract.getStake(
        coldkey.publicKey,
        publicKey
      );

      expect(amountStr == stake_from_contract.toString());
    });
  });

  it("Can remove stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const netuid = 1;

      const contract = new ethers.Contract(address, abi, signer);

      let before_stake = await api.query.subtensorModule.stake(
        hotkey.address,
        ss58mirror
      );

      const tx = await contract.removeStake(
        hotkey.publicKey,
        amountStr,
        netuid,
        { value: amountStr }
      );
      await tx.wait();

      let stake = await api.query.subtensorModule.stake(
        hotkey.address,
        ss58mirror
      );
      expect(stake < before_stake);
    });
  });
});
