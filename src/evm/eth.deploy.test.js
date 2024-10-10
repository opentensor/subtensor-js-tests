import { usingApi, usingEthApi, sendTransaction } from '../util/comm.js';
import { getTestKeys } from '../util/known-keys.js';
import { convertEtherToWei, convertWeiToEther, convertTaoToRao, convertRaoToTao } from '../util/balance-math.js';
import { convertH160ToSS58, generateRandomAddress } from '../util/address.js';
import { getEthereumBalance, estimateTransactionCost, sendEthTransaction, ss58ToH160 } from '../util/eth-helpers.js';
import { getExistentialDeposit, getTaoBalance } from '../util/helpers.js';
import { decodeAddress } from '@polkadot/util-crypto';
import { assert, ethers } from "ethers";
import BigNumber from 'bignumber.js';
import { expect } from 'chai';

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

describe('Smart contract deployment', () => {
  before(async () => {
    await usingApi(async api => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(tk.alice.address, amount1TAO.multipliedBy(1e6).toString())
      );

      await sendTransaction(api, txSudoSetBalance, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const transfer = api.tx.balances.transferKeepAlive(ss58mirror, amount1TAO.multipliedBy(1000).toString());
      await sendTransaction(api, transfer, tk.alice);
    });
  });

  it('Can deploy a smart contract', async () => {
    await usingEthApi(async provider => {
      const byteCode = "0x608060405234801561000f575f80fd5b5060043610610034575f3560e01c8063893d20e814610038578063a6f9dae114610056575b5f80fd5b610040610072565b60405161004d9190610249565b60405180910390f35b610070600480360381019061006b9190610290565b610099565b005b5f805f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b5f8054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610126576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161011d90610315565b60405180910390fd5b8073ffffffffffffffffffffffffffffffffffffffff165f8054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff167f342827c97908e5e2f71151c08502a66d44b6f758e3ac2f1de95f02eb95f0a73560405160405180910390a3805f806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b5f6a636f6e736f6c652e6c6f6790505f80835160208501845afa505050565b610208610333565b565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6102338261020a565b9050919050565b61024381610229565b82525050565b5f60208201905061025c5f83018461023a565b92915050565b5f80fd5b61026f81610229565b8114610279575f80fd5b50565b5f8135905061028a81610266565b92915050565b5f602082840312156102a5576102a4610262565b5b5f6102b28482850161027c565b91505092915050565b5f82825260208201905092915050565b7f43616c6c6572206973206e6f74206f776e6572000000000000000000000000005f82015250565b5f6102ff6013836102bb565b915061030a826102cb565b602082019050919050565b5f6020820190508181035f83015261032c816102f3565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52605160045260245ffdfea26469706673582212202a04f1819fac5de03b64295d95523ed222af80f4e27fd5143a1469cc4fe52d9364736f6c634300081a0033";
      const abi = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "oldOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnerSet",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "changeOwner",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getOwner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ];


      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contractFactory = new ethers.ContractFactory(abi, byteCode, signer);

    // Deploy the contract
    const contract = await contractFactory.deploy();
    await contract.deployed();

    // Assert that the contract is deployed
    expect(contract.address).to.not.be.undefined;

      assert(false, "TODO");
    });
  });
});
