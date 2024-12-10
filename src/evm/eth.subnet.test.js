import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { ethers } from "ethers";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

let abi = [
  {
    inputs: [
      {
        internalType: "bytes",
        name: "subnetName",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "githubRepo",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "subnetContract",
        type: "bytes",
      },
    ],
    name: "registerNetwork",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "registerNetwork",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

let address = "0x0000000000000000000000000000000000000803";
let totalNetwork = 0;

describe("Subnet precompile test", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);
      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const transfer = api.tx.balances.transferKeepAlive(
        ss58mirror,
        amount1TAO.multipliedBy(100000).toString()
      );
      await sendTransaction(api, transfer, tk.alice);
    });
  });

  it("Can register network without identity info", async () => {
    await usingEthApi(async (provider) => {
      usingApi(async (api) => {
        totalNetwork = api.query.subtensorModule.totalNetwork().toHuman;
      });

      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(address, abi, signer);

      const tx = await contract.registerNetwork();
      await tx.wait();

      usingApi(async (api) => {
        expect(await api.query.subtensorModule.totalNetwork().toHuman).to.eq(
          totalNetwork + 1
        );
      });
    });
  });

  it("Can register network with identity info", async () => {
    await usingEthApi(async (provider) => {
      usingApi(async (api) => {
        totalNetwork = api.query.subtensorModule.totalNetwork().toHuman;
      });

      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(address, abi, signer);

      // Execute transaction
      const name = ethers.toUtf8Bytes("name");
      const repo = ethers.toUtf8Bytes("repo");
      const contact = ethers.toUtf8Bytes("contact");
      const tx = await contract.registerNetwork(name, repo, contact);
      await tx.wait();

      usingApi(async (api) => {
        expect(await api.query.subtensorModule.totalNetwork().toHuman).to.eq(
          totalNetwork + 1
        );
      });
    });
  });
});
