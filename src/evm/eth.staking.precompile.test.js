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

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      console.log("fundedEthWallet ss58 address is: ", ss58mirror);

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

      let balanceBefore;
      await usingApi(async (api) => {
        balanceBefore = await getTaoBalance(api, ss58mirror);
      });

      const amountEth = 0.5;
      const amountStr = convertEtherToWei(amountEth).toString();

      // register alice and bob as coldkey / hotkey
      const register = api.tx.subtensorModule.rootRegister(tk.bob.address);
      await sendTransaction(api, register, tk.alice);

      let old_owner = (
        await api.query.subtensorModule.owner(tk.bob.address)
      ).toString();

      const swapCold = api.tx.sudo.sudo(
        api.tx.subtensorModule.swapColdkey(tk.alice.address, ss58mirror)
      );
      await sendTransaction(api, swapCold, tk.alice);

      let before_stake = await api.query.subtensorModule.stake(
        tk.bob.address,
        ss58mirror
      );

      // wait for coldkey swap done
      while (true) {
        let current_owner = (
          await api.query.subtensorModule.owner(tk.bob.address)
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

        const contract = new ethers.Contract(address, abi, signer);

        // Execute transaction
        const tx = await contract.addStake(tk.bob.publicKey, {
          value: amountStr,
        });
        await tx.wait();
      });

      let stake = await api.query.subtensorModule.stake(
        tk.bob.address,
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

      const amountEth = 0.5;
      const amountStr = convertEtherToWei(amountEth).toString();

      const contract = new ethers.Contract(address, abi, signer);

      let before_stake = await api.query.subtensorModule.stake(
        tk.bob.address,
        ss58mirror
      );

      const tx = await contract.removeStake(
        tk.bob.publicKey,
        "1000000000000000",
        { value: amountStr }
      );
      await tx.wait();

      let stake = await api.query.subtensorModule.stake(
        tk.bob.address,
        ss58mirror
      );
      expect(stake < before_stake);
    });
  });
});
