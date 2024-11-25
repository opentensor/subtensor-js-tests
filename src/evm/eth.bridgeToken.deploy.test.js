import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import fs from "fs";
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

const data = fs.readFileSync("bridgeToken.json", "utf8");
const jsonData = JSON.parse(data);
const abi = jsonData["abi"];
const byteCode = jsonData["bytecode"];

describe("bridge token contract deployment", () => {
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
      const transfer = api.tx.balances.transferKeepAlive(
        ss58mirror,
        amount1TAO.multipliedBy(1000).toString()
      );
      await sendTransaction(api, transfer, tk.alice);
    });
  });

  it("Can deploy bridge token smart contract", async () => {
    await usingEthApi(async (provider) => {
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      await usingApi(async (api) => {
        // Alice gives permission to signer to create a contract
        const txSudoSetWhitelist = api.tx.sudo.sudo(
          api.tx.evm.setWhitelist([signer.address])
        );

        await sendTransaction(api, txSudoSetWhitelist, tk.alice);
      });

      const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

      const contract = await contractFactory.deploy(
        "name",
        "symbol",
        fundedEthWallet.address
      );
      await contract.waitForDeployment();

      // Assert that the contract is deployed
      expect(contract.target).to.not.be.undefined;

      // Assert that contract bytecode exists (it will be different from what we set)
      const deployedByteCode = await provider.getCode(contract.target);
      expect(deployedByteCode).to.not.be.undefined;
      expect(deployedByteCode.length).to.be.greaterThan(100);
      expect(deployedByteCode).to.contain("0x60806040523480156");
    });
  });

  it("Can deploy bridge token contract with gas limit", async () => {
    await usingEthApi(async (provider) => {
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      await usingApi(async (api) => {
        // Alice gives permission to signer to create a contract
        const txSudoSetWhitelist = api.tx.sudo.sudo(
          api.tx.evm.setWhitelist([signer.address])
        );

        await sendTransaction(api, txSudoSetWhitelist, tk.alice);
      });

      const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

      const successful_gas_limit = "12345678";
      const contract = await contractFactory.deploy(
        "name",
        "symbol",
        fundedEthWallet.address,
        {
          gasLimit: successful_gas_limit,
        }
      );

      await contract.waitForDeployment();

      // Assert that the contract is deployed
      expect(contract.target).to.not.be.undefined;

      // Assert that contract bytecode exists (it will be different from what we set)
      const deployedByteCode = await provider.getCode(contract.target);
      expect(deployedByteCode).to.not.be.undefined;
      expect(deployedByteCode.length).to.be.greaterThan(100);
      expect(deployedByteCode).to.contain("0x60806040523480156");
    });
  });
});
