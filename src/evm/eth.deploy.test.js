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

const byteCode =
  "0x6080604052348015600e575f80fd5b506101438061001c5f395ff3fe608060405234801561000f575f80fd5b5060043610610034575f3560e01c80632e64cec1146100385780636057361d14610056575b5f80fd5b610040610072565b60405161004d919061009b565b60405180910390f35b610070600480360381019061006b91906100e2565b61007a565b005b5f8054905090565b805f8190555050565b5f819050919050565b61009581610083565b82525050565b5f6020820190506100ae5f83018461008c565b92915050565b5f80fd5b6100c181610083565b81146100cb575f80fd5b50565b5f813590506100dc816100b8565b92915050565b5f602082840312156100f7576100f66100b4565b5b5f610104848285016100ce565b9150509291505056fea26469706673582212209a0dd35336aff1eb3eeb11db76aa60a1427a12c1b92f945ea8c8d1dfa337cf2264736f6c634300081a0033";
const abi = [
  {
    inputs: [],
    name: "retrieve",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "num",
        type: "uint256",
      },
    ],
    name: "store",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

describe("Smart contract deployment", () => {
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

  it("Can't deploy a smart contract since the account not in white list", async () => {
    await usingEthApi(async (provider) => {
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

      try {
        const contract = await contractFactory.deploy();
        await contract.waitForDeployment();
      } catch (error) {
        expect(error.toString().includes("Error"));
      }
    });
  });

  it("Can deploy a smart contract", async () => {
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
      const contract = await contractFactory.deploy();

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
