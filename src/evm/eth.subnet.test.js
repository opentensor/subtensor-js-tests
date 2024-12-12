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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getAdjustmentAlpha",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getAlphaValues",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getBondsMovingAverage",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getCommitRevealWeightsEnabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getDifficulty",
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
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    name: "getImmunityPeriod",
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
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    name: "getKappa",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMaxBurn",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMaxDifficulty",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMaxWeightLimit",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMinAllowedWeights",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMinBurn",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getMinDifficulty",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getNetworkRegistrationAllowed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    name: "getRho",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getServingRateLimit",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getWeightsSetRateLimit",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getWeightsVersionKey",
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
        name: "subnetContact",
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
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "activityCutoff",
        type: "uint16",
      },
    ],
    name: "setActivityCutoff",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getActivityCutoff",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "adjustmentAlpha",
        type: "uint64",
      },
    ],
    name: "setAdjustmentAlpha",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "alphaLow",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "alphaHigh",
        type: "uint16",
      },
    ],
    name: "setAlphaValues",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "bondsMovingAverage",
        type: "uint64",
      },
    ],
    name: "setBondsMovingAverage",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "commitRevealWeightsEnabled",
        type: "bool",
      },
    ],
    name: "setCommitRevealWeightsEnabled",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getCommitRevealWeightsInterval",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "commitRevealWeightsInterval",
        type: "uint64",
      },
    ],
    name: "setCommitRevealWeightsInterval",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "difficulty",
        type: "uint64",
      },
    ],
    name: "setDifficulty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "immunityPeriod",
        type: "uint64",
      },
    ],
    name: "setImmunityPeriod",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "kappa",
        type: "uint16",
      },
    ],
    name: "setKappa",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getLiquidAlphaEnabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "liquidAlphaEnabled",
        type: "bool",
      },
    ],
    name: "setLiquidAlphaEnabled",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "maxBurn",
        type: "uint64",
      },
    ],
    name: "setMaxBurn",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "maxDifficulty",
        type: "uint64",
      },
    ],
    name: "setMaxDifficulty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "maxWeightLimit",
        type: "uint64",
      },
    ],
    name: "setMaxWeightLimit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "minAllowedWeights",
        type: "uint16",
      },
    ],
    name: "setMinAllowedWeights",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "minBurn",
        type: "uint64",
      },
    ],
    name: "setMinBurn",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "minDifficulty",
        type: "uint64",
      },
    ],
    name: "setMinDifficulty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
    ],
    name: "getNetworkPowRegistrationAllowed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "networkPowRegistrationAllowed",
        type: "bool",
      },
    ],
    name: "setNetworkPowRegistrationAllowed",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bool",
        name: "networkRegistrationAllowed",
        type: "bool",
      },
    ],
    name: "setNetworkRegistrationAllowed",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "rho",
        type: "uint16",
      },
    ],
    name: "setRho",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "servingRateLimit",
        type: "uint64",
      },
    ],
    name: "setServingRateLimit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "weightsSetRateLimit",
        type: "uint64",
      },
    ],
    name: "setWeightsSetRateLimit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint64",
        name: "weightsVersionKey",
        type: "uint64",
      },
    ],
    name: "setWeightsVersionKey",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

let address = "0x0000000000000000000000000000000000000803";
let totalNetwork = 0;
let newSubnetId = 0;

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
      newSubnetId = totalNetwork + 1;
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

  it("Can set subnet parameter", async () => {
    await usingEthApi(async (provider) => {
      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(address, abi, signer);

      // servingRateLimit hyperparameter
      let newValue = 100;
      let tx = await contract.setServingRateLimit(newSubnetId, newValue);
      await tx.wait();

      let onchainValue = 0;
      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.servingRateLimit(newSubnetId)
        );
      });

      let valueFromContract = Number(
        await contract.getServingRateLimit(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minDifficulty hyperparameter
      newValue = 101;
      tx = await contract.setMinDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.minDifficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMinDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // maxDifficulty hyperparameter
      newValue = 102;

      tx = await contract.setMaxDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxDifficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // weightsVersionKey hyperparameter
      newValue = 103;

      tx = await contract.setWeightsVersionKey(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.weightsVersionKey(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getWeightsVersionKey(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // weightsSetRateLimit hyperparameter
      newValue = 104;

      tx = await contract.setWeightsSetRateLimit(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.weightsSetRateLimit(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getWeightsSetRateLimit(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // adjustmentAlpha hyperparameter
      newValue = 105;

      tx = await contract.setAdjustmentAlpha(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.adjustmentAlpha(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getAdjustmentAlpha(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // maxWeightLimit hyperparameter
      newValue = 106;
      tx = await contract.setMaxWeightLimit(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxWeightsLimit(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxWeightLimit(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // immunityPeriod hyperparameter
      newValue = 107;

      tx = await contract.setImmunityPeriod(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.immunityPeriod(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getImmunityPeriod(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minAllowedWeights hyperparameter
      newValue = 108;

      tx = await contract.setMinAllowedWeights(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.minAllowedWeights(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getMinAllowedWeights(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // kappa hyperparameter
      newValue = 109;

      tx = await contract.setKappa(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.kappa(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getKappa(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // rho hyperparameter
      newValue = 110;

      tx = await contract.setRho(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(await api.query.subtensorModule.rho(newSubnetId));
      });

      valueFromContract = Number(await contract.getRho(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // activityCutoff hyperparameter
      newValue = 111;

      tx = await contract.setActivityCutoff(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.activityCutoff(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getActivityCutoff(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // networkRegistrationAllowed hyperparameter
      newValue = true;

      tx = await contract.setNetworkRegistrationAllowed(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.networkRegistrationAllowed(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getNetworkRegistrationAllowed(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // networkPowRegistrationAllowed hyperparameter
      newValue = true;

      tx = await contract.setNetworkPowRegistrationAllowed(
        newSubnetId,
        newValue
      );
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.networkPowRegistrationAllowed(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getNetworkPowRegistrationAllowed(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minBurn hyperparameter
      newValue = 112;

      tx = await contract.setMinBurn(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.minBurn(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMinBurn(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // maxBurn hyperparameter
      newValue = 113;

      tx = await contract.setMaxBurn(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxBurn(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxBurn(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // difficulty hyperparameter
      newValue = 114;

      tx = await contract.setDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.difficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // bondsMovingAverage hyperparameter
      newValue = 115;

      tx = await contract.setBondsMovingAverage(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.bondsMovingAverage(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getBondsMovingAverage(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // commitRevealWeightsEnabled hyperparameter
      newValue = true;

      tx = await contract.setCommitRevealWeightsEnabled(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.commitRevealWeightsEnabled(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getCommitRevealWeightsEnabled(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // liquidAlphaEnabled hyperparameter
      newValue = true;

      tx = await contract.setLiquidAlphaEnabled(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.liquidAlphaOn(newSubnetId)
        );
      });

      valueFromContract = Boolean(
        await contract.getLiquidAlphaEnabled(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // alphaValues hyperparameter
      newValue = 118;
      // alphaHigh must bigger than 52428
      const alphaHigh = 52429;
      tx = await contract.setAlphaValues(newSubnetId, newValue, 52429);
      await tx.wait();

      const valueFromContractPair = await contract.getAlphaValues(newSubnetId);

      valueFromContract = Number(valueFromContractPair[0]);
      expect(Number(valueFromContractPair[1])).to.eq(alphaHigh);

      await usingApi(async (api) => {
        const onchainValuePair = await api.query.subtensorModule.alphaValues(
          newSubnetId
        );
        onchainValue = Number(onchainValuePair[0]);
        expect(Number(onchainValuePair[1])).to.eq(alphaHigh);
      });

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // commitRevealWeightsInterval hyperparameter
      newValue = 119;

      tx = await contract.setCommitRevealWeightsInterval(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.revealPeriodEpochs(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getCommitRevealWeightsInterval(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);
    });
  });
});
