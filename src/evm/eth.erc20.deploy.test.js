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
  "0x608060405234801561000f575f80fd5b506040518060400160405280600781526020017f4d79546f6b656e000000000000000000000000000000000000000000000000008152506040518060400160405280600381526020017f4d544b0000000000000000000000000000000000000000000000000000000000815250816003908161008b919061058e565b50806004908161009b919061058e565b5050506100b133620186a06100b660201b60201c565b610772565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610126575f6040517fec442f0500000000000000000000000000000000000000000000000000000000815260040161011d919061069c565b60405180910390fd5b6101375f838361013b60201b60201c565b5050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361018b578060025f82825461017f91906106e2565b92505081905550610259565b5f805f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905081811015610214578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161020b93929190610724565b60405180910390fd5b8181035f808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036102a0578060025f82825403925050819055506102ea565b805f808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516103479190610759565b60405180910390a3505050565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806103cf57607f821691505b6020821081036103e2576103e161038b565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026104447fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610409565b61044e8683610409565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f61049261048d61048884610466565b61046f565b610466565b9050919050565b5f819050919050565b6104ab83610478565b6104bf6104b782610499565b848454610415565b825550505050565b5f90565b6104d36104c7565b6104de8184846104a2565b505050565b5b81811015610501576104f65f826104cb565b6001810190506104e4565b5050565b601f82111561054657610517816103e8565b610520846103fa565b8101602085101561052f578190505b61054361053b856103fa565b8301826104e3565b50505b505050565b5f82821c905092915050565b5f6105665f198460080261054b565b1980831691505092915050565b5f61057e8383610557565b9150826002028217905092915050565b61059782610354565b67ffffffffffffffff8111156105b0576105af61035e565b5b6105ba82546103b8565b6105c5828285610505565b5f60209050601f8311600181146105f6575f84156105e4578287015190505b6105ee8582610573565b865550610655565b601f198416610604866103e8565b5f5b8281101561062b57848901518255600182019150602085019450602081019050610606565b868310156106485784890151610644601f891682610557565b8355505b6001600288020188555050505b505050505050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6106868261065d565b9050919050565b6106968161067c565b82525050565b5f6020820190506106af5f83018461068d565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6106ec82610466565b91506106f783610466565b925082820190508082111561070f5761070e6106b5565b5b92915050565b61071e81610466565b82525050565b5f6060820190506107375f83018661068d565b6107446020830185610715565b6107516040830184610715565b949350505050565b5f60208201905061076c5f830184610715565b92915050565b610f738061077f5f395ff3fe608060405234801561000f575f80fd5b50600436106100a7575f3560e01c806340c10f191161006f57806340c10f191461016557806342966c681461018157806370a082311461019d57806395d89b41146101cd578063a9059cbb146101eb578063dd62ed3e1461021b576100a7565b806306fdde03146100ab578063095ea7b3146100c957806318160ddd146100f957806323b872dd14610117578063313ce56714610147575b5f80fd5b6100b361024b565b6040516100c09190610bc1565b60405180910390f35b6100e360048036038101906100de9190610c72565b6102db565b6040516100f09190610cca565b60405180910390f35b6101016102fd565b60405161010e9190610cf2565b60405180910390f35b610131600480360381019061012c9190610d0b565b610306565b60405161013e9190610cca565b60405180910390f35b61014f610334565b60405161015c9190610d76565b60405180910390f35b61017f600480360381019061017a9190610c72565b61033c565b005b61019b60048036038101906101969190610d8f565b61034a565b005b6101b760048036038101906101b29190610dba565b610357565b6040516101c49190610cf2565b60405180910390f35b6101d561039c565b6040516101e29190610bc1565b60405180910390f35b61020560048036038101906102009190610c72565b61042c565b6040516102129190610cca565b60405180910390f35b61023560048036038101906102309190610de5565b61044e565b6040516102429190610cf2565b60405180910390f35b60606003805461025a90610e50565b80601f016020809104026020016040519081016040528092919081815260200182805461028690610e50565b80156102d15780601f106102a8576101008083540402835291602001916102d1565b820191905f5260205f20905b8154815290600101906020018083116102b457829003601f168201915b5050505050905090565b5f806102e56104d0565b90506102f28185856104d7565b600191505092915050565b5f600254905090565b5f806103106104d0565b905061031d8582856104e9565b61032885858561057b565b60019150509392505050565b5f6012905090565b610346828261066b565b5050565b61035433826106ea565b50565b5f805f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b6060600480546103ab90610e50565b80601f01602080910402602001604051908101604052809291908181526020018280546103d790610e50565b80156104225780601f106103f957610100808354040283529160200191610422565b820191905f5260205f20905b81548152906001019060200180831161040557829003601f168201915b5050505050905090565b5f806104366104d0565b905061044381858561057b565b600191505092915050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b5f33905090565b6104e48383836001610769565b505050565b5f6104f4848461044e565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81146105755781811015610566578281836040517ffb8f41b200000000000000000000000000000000000000000000000000000000815260040161055d93929190610e8f565b60405180910390fd5b61057484848484035f610769565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16036105eb575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016105e29190610ec4565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361065b575f6040517fec442f050000000000000000000000000000000000000000000000000000000081526004016106529190610ec4565b60405180910390fd5b610666838383610938565b505050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16036106db575f6040517fec442f050000000000000000000000000000000000000000000000000000000081526004016106d29190610ec4565b60405180910390fd5b6106e65f8383610938565b5050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff160361075a575f6040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081526004016107519190610ec4565b60405180910390fd5b610765825f83610938565b5050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16036107d9575f6040517fe602df050000000000000000000000000000000000000000000000000000000081526004016107d09190610ec4565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610849575f6040517f94280d620000000000000000000000000000000000000000000000000000000081526004016108409190610ec4565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055508015610932578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516109299190610cf2565b60405180910390a35b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610988578060025f82825461097c9190610f0a565b92505081905550610a56565b5f805f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905081811015610a11578381836040517fe450d38c000000000000000000000000000000000000000000000000000000008152600401610a0893929190610e8f565b60405180910390fd5b8181035f808673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610a9d578060025f8282540392505081905550610ae7565b805f808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef83604051610b449190610cf2565b60405180910390a3505050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f610b9382610b51565b610b9d8185610b5b565b9350610bad818560208601610b6b565b610bb681610b79565b840191505092915050565b5f6020820190508181035f830152610bd98184610b89565b905092915050565b5f80fd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610c0e82610be5565b9050919050565b610c1e81610c04565b8114610c28575f80fd5b50565b5f81359050610c3981610c15565b92915050565b5f819050919050565b610c5181610c3f565b8114610c5b575f80fd5b50565b5f81359050610c6c81610c48565b92915050565b5f8060408385031215610c8857610c87610be1565b5b5f610c9585828601610c2b565b9250506020610ca685828601610c5e565b9150509250929050565b5f8115159050919050565b610cc481610cb0565b82525050565b5f602082019050610cdd5f830184610cbb565b92915050565b610cec81610c3f565b82525050565b5f602082019050610d055f830184610ce3565b92915050565b5f805f60608486031215610d2257610d21610be1565b5b5f610d2f86828701610c2b565b9350506020610d4086828701610c2b565b9250506040610d5186828701610c5e565b9150509250925092565b5f60ff82169050919050565b610d7081610d5b565b82525050565b5f602082019050610d895f830184610d67565b92915050565b5f60208284031215610da457610da3610be1565b5b5f610db184828501610c5e565b91505092915050565b5f60208284031215610dcf57610dce610be1565b5b5f610ddc84828501610c2b565b91505092915050565b5f8060408385031215610dfb57610dfa610be1565b5b5f610e0885828601610c2b565b9250506020610e1985828601610c2b565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610e6757607f821691505b602082108103610e7a57610e79610e23565b5b50919050565b610e8981610c04565b82525050565b5f606082019050610ea25f830186610e80565b610eaf6020830185610ce3565b610ebc6040830184610ce3565b949350505050565b5f602082019050610ed75f830184610e80565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610f1482610c3f565b9150610f1f83610c3f565b9250828201905080821115610f3757610f36610edd565b5b9291505056fea2646970667358221220e6c70f926352a2bc356fba08323361b7faf93a19447b05786b0f7ef578c951b464736f6c634300081a0033";
const abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "allowance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientAllowance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "needed",
        type: "uint256",
      },
    ],
    name: "ERC20InsufficientBalance",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "approver",
        type: "address",
      },
    ],
    name: "ERC20InvalidApprover",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "receiver",
        type: "address",
      },
    ],
    name: "ERC20InvalidReceiver",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSender",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "ERC20InvalidSpender",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
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
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
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
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
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
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
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

      const successful_gas_limit = "12345678";
      const contract = await contractFactory.deploy({
        gasLimit: successful_gas_limit,
      });

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
