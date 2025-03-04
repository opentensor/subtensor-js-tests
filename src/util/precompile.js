export const ISTAKING_ADDRESS = "0x0000000000000000000000000000000000000801";
export const ISTAKING_V2_ADDRESS = "0x0000000000000000000000000000000000000805";
export const IMETAGRAPH_ADDRESS = "0x0000000000000000000000000000000000000802";
export const ISUBNET_ADDRESS = "0x0000000000000000000000000000000000000803";
export const INEURON_ADDRESS = "0x0000000000000000000000000000000000000804";

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

export const IStakingV2ABI = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "delegate",
        "type": "bytes32"
      }
    ],
    "name": "addProxy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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
    "name": "addStake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hotkey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "coldkey",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "netuid",
        "type": "uint256"
      }
    ],
    "name": "getStake",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "coldkey",
        "type": "bytes32"
      }
    ],
    "name": "getTotalColdkeyStake",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hotkey",
        "type": "bytes32"
      }
    ],
    "name": "getTotalHotkeyStake",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "delegate",
        "type": "bytes32"
      }
    ],
    "name": "removeProxy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
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

export const ISubnetABI = [
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
        internalType: "uint16",
        name: "immunityPeriod",
        type: "uint16",
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
        internalType: "uint16",
        name: "maxWeightLimit",
        type: "uint16",
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
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32",
      },
    ],
    name: "registerNetwork",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "hotkey",
        type: "bytes32"
      },
      {
        internalType: "string",
        name: "subnetName",
        type: "string"
      },
      {
        internalType: "string",
        name: "githubRepo",
        type: "string"
      },
      {
        internalType: "string",
        name: "subnetContact",
        type: "string"
      },
      {
        internalType: "string",
        name: "subnetUrl",
        type: "string"
      },
      {
        internalType: "string",
        name: "discord",
        type: "string"
      },
      {
        internalType: "string",
        name: "description",
        type: "string"
      },
      {
        internalType: "string",
        name: "additional",
        type: "string"
      }
    ],
    name: "registerNetwork",
    outputs: [],
    stateMutability: "payable",
    type: "function"
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
        internalType: "bytes32",
        name: "commitHash",
        type: "bytes32",
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
  {
    inputs: [
      {
        internalType: "uint16",
        name: "netuid",
        type: "uint16",
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
        name: "ipType",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "protocol",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "placeholder1",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "placeholder2",
        type: "uint8",
      },
    ],
    name: "serveAxon",
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
        name: "ipType",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "protocol",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "placeholder1",
        type: "uint8",
      },
      {
        internalType: "uint8",
        name: "placeholder2",
        type: "uint8",
      },
      {
        internalType: "bytes",
        name: "certificate",
        type: "bytes",
      },
    ],
    name: "serveAxonTls",
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
        name: "ipType",
        type: "uint8",
      },
    ],
    name: "servePrometheus",
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
