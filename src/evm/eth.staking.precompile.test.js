import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertEtherToWei, convertTaoToRao } from "../util/balance-math.js";
import {
  convertH160ToSS58,
  generateRandomAddress,
  convertH160ToPublicKey,
} from "../util/address.js";
import { u256toBigNumber } from "../util/helpers.js";
import { ethers } from "ethers";
import { expect, use as chaiUse } from "chai";
import { getRandomKeypair } from "../util/known-keys.js";
import chaiBigNumber from "chai-bignumber";
import BigNumber from 'bignumber.js';

chaiUse(chaiBigNumber());

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();

let abi = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hotkey",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "netuid",
        "type": "uint256"
      }
    ],
    "name": "addStake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hotkey",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netuid",
        "type": "uint256"
      }
    ],
    "name": "removeStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
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

      // Alice funds coldkey with 1K TAO
      const fundColdkeyTx = api.tx.balances.transferKeepAlive(
        coldkey.address,
        amount1TAO.multipliedBy(1000).toString()
      );
      await sendTransaction(api, fundColdkeyTx, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const transfer = api.tx.balances.transferKeepAlive(
        ss58mirror,
        amount1TAO.multipliedBy(100).toString()
      );
      await sendTransaction(api, transfer, tk.alice);

      // register coldkey / hotkey
      const register = api.tx.subtensorModule.burnedRegister(netuid, hotkey.address);
      await sendTransaction(api, register, coldkey);
    });
  });

  it("Can add stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md

      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const netuid = 1;

      let stakeBefore;
      await usingApi(async (api) => {
        stakeBefore = u256toBigNumber(await api.query.subtensorModule.alpha(
          hotkey.address,
          ss58mirror,
          netuid,
        ));
      });

      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const contract = new ethers.Contract(address, abi, signer);

        // Execute transaction
        const tx = await contract.addStake(hotkey.publicKey, netuid, {
          value: amountStr,
        });
        await tx.wait();
      });

      await usingApi(async (api) => {
        let stake = u256toBigNumber(await api.query.subtensorModule.alpha(
          hotkey.address,
          ss58mirror,
          netuid,
        ));
        expect(stake).to.be.bignumber.gt(stakeBefore);
      });
    });
  });

  it("Can not add stake if subnet doesn't exist", async () => {
    await usingEthApi(async (provider) => {
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const netuid = 1;
      const badNetuid = 12345;

      let stakeBefore;
      await usingApi(async (api) => {
        stakeBefore = u256toBigNumber(await api.query.subtensorModule.alpha(
          hotkey.address,
          ss58mirror,
          netuid,
        ));
      });

      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const contract = new ethers.Contract(address, abi, signer);

        // Execute transaction
        await expect(
          contract.addStake(hotkey.publicKey, badNetuid, {
            value: amountStr,
          })
        ).to.be.rejected;
      });
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
    await usingApi(async (api) => {
      await usingEthApi(async (provider) => {
        // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
        const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const netuid = 1;

        const contract = new ethers.Contract(address, abi, signer);

        // Add stake
        const txAdd = await contract.addStake(hotkey.publicKey, netuid, {
          value: amountStr,
        });
        await txAdd.wait();

        let stakeBefore = u256toBigNumber(await api.query.subtensorModule.alpha(
          hotkey.address,
          ss58mirror,
          netuid,
        ));

        // Remove all stake. stakeBefore is returned as Alpha using 10^9 decimals, so convert it first
        const removeAmountStr = (new BigNumber(stakeBefore.toFixed())).multipliedBy(1e9).toFixed();
        const tx = await contract.removeStake(
          hotkey.publicKey,
          removeAmountStr,
          netuid,
        );
        await tx.wait();

        let stake = u256toBigNumber(await api.query.subtensorModule.alpha(
          hotkey.address,
          ss58mirror,
          netuid,
        ));
        expect(stake).to.be.bignumber.lt(stakeBefore);
      });
    });
  });
});
