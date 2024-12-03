import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";
import { ethers } from "ethers";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;

const IMETAGRAPH_ADDRESS = "0x0000000000000000000000000000000000000802";
const IMetagraphABI = [
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getAxon",
    outputs: [
      {
        components: [
          {
            internalType: "uint64",
            name: "block",
            type: "uint64",
          },
          {
            internalType: "uint32",
            name: "version",
            type: "uint32",
          },
          {
            internalType: "uint128",
            name: "ip",
            type: "uint128",
          },
          {
            internalType: "uint16",
            name: "port",
            type: "uint16",
          },
          {
            internalType: "uint8",
            name: "ip_type",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "protocol",
            type: "uint8",
          },
        ],
        internalType: "struct AxonInfo",
        name: "",
        type: "tuple",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getColdkey",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getConsensus",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getDividends",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getEmission",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getHotkey",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getIncentive",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getIsActive",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getLastUpdate",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getRank",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
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
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getTrust",
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
    name: "getUidCount",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getValidatorStatus",
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
        internalType: "uint16",
        name: "uid",
        type: "uint16",
      },
    ],
    name: "getVtrust",
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
];

describe("EVM chain id test", () => {
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

      const netuid = 1;
      const registerNetwork = api.tx.subtensorModule.registerNetwork();
      await sendTransaction(api, registerNetwork, tk.alice);

      // register to network
      const registerValidator = api.tx.subtensorModule.burnedRegister(
        netuid,
        tk.bob.address
      );
      await sendTransaction(api, registerValidator, tk.alice);
    });
  });

  it("Metagraph data ", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;
      const uid = 0;

      const metagraphContract = new ethers.Contract(
        IMETAGRAPH_ADDRESS,
        IMetagraphABI,
        provider
      );

      const uid_count = (
        await metagraphContract.getUidCount(netuid)
      ).toString();
      expect(uid_count).to.be.eq("1");

      const stake = await metagraphContract.getStake(netuid, uid);
      expect(stake).to.not.be.undefined;

      const rank = await metagraphContract.getRank(netuid, uid);
      expect(rank).to.not.be.undefined;

      const trust = await metagraphContract.getTrust(netuid, uid);
      expect(trust).to.not.be.undefined;

      const consunsus = await metagraphContract.getConsensus(netuid, uid);
      expect(consunsus).to.not.be.undefined;

      const incentive = await metagraphContract.getIncentive(netuid, uid);
      expect(incentive).to.not.be.undefined;

      const diviends = await metagraphContract.getDividends(netuid, uid);
      expect(diviends).to.not.be.undefined;

      const emission = await metagraphContract.getEmission(netuid, uid);
      expect(emission).to.not.be.undefined;

      const vtrust = await metagraphContract.getVtrust(netuid, uid);
      expect(vtrust).to.not.be.undefined;

      const validatorStatus = await metagraphContract.getValidatorStatus(
        netuid,
        uid
      );
      expect(validatorStatus).to.not.be.undefined;

      const lastUpdate = await metagraphContract.getLastUpdate(netuid, uid);
      expect(lastUpdate).to.not.be.undefined;

      const isActive = await metagraphContract.getIsActive(netuid, uid);
      expect(isActive).to.not.be.undefined;

      const axon = await metagraphContract.getAxon(netuid, uid);
      expect(axon.block).to.not.be.undefined;
      expect(axon.version).to.not.be.undefined;
      expect(axon.ip).to.not.be.undefined;
      expect(axon.port).to.not.be.undefined;
      expect(axon.ip_type).to.not.be.undefined;
      expect(axon.protocol).to.not.be.undefined;

      const hotkey = await metagraphContract.getHotkey(netuid, uid);
      expect(hotkey).to.not.be.undefined;

      const coldkey = await metagraphContract.getColdkey(netuid, uid);
      expect(coldkey).to.not.be.undefined;
    });
  });
});
