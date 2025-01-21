export const ISTAKING_ADDRESS = "0x0000000000000000000000000000000000000801";
export const IMETAGRAPH_ADDRESS = "0x0000000000000000000000000000000000000802";
export const ISUBNETS_ADDRESS = "0x0000000000000000000000000000000000000804";
export const INEURON_ADDRESS = "0x0000000000000000000000000000000000000805";

export const IStakingABI = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "delegate",
        type: "bytes32",
      },
    ],
    name: "addProxy",
    outputs: [],
    stateMutability: "nonpayable",
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
        name: "netuid",
        type: "uint256",
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
        name: "delegate",
        type: "bytes32",
      },
    ],
    name: "removeProxy",
    outputs: [],
    stateMutability: "nonpayable",
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
      {
        internalType: "uint256",
        name: "netuid",
        type: "uint256",
      },
    ],
    name: "getStake",
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
        internalType: "uint256",
        name: "netuid",
        type: "uint256",
      },
    ],
    name: "removeStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const IMetagraphABI = [
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

export const ISubnetsABI = [
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
    ],
    name: "burnedRegister",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

export const INeuronABI = [
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
      },
      {
        internalType: "uint256",
        name: "commitHash",
        type: "uint256",
      },
    ],
    name: "commitWeights",
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
        internalType: "uint16[]",
        name: "uids",
        type: "uint16[]",
      },
      {
        internalType: "uint16[]",
        name: "values",
        type: "uint16[]",
      },
      {
        internalType: "uint16[]",
        name: "salt",
        type: "uint16[]",
      },
      {
        internalType: "uint64",
        name: "versionKey",
        type: "uint64",
      },
    ],
    name: "revealWeights",
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
