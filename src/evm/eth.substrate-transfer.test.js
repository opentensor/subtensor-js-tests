import { usingApi, usingEthApi, sendTransaction } from '../util/comm.js';
import { getTestKeys } from '../util/known-keys.js';
import { convertEtherToWei, convertWeiToEther, convertTaoToRao, convertRaoToTao } from '../util/balance-math.js';
import { convertH160ToSS58, generateRandomAddress } from '../util/address.js';
import { getEthereumBalance, estimateTransactionCost, sendEthTransaction } from '../util/eth-helpers.js';
import { getExistentialDeposit, getTaoBalance } from '../util/helpers.js';
import { expect } from 'chai';

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

describe('Balance transfers between substrate and EVM', () => {
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

  it('Transfer from substrate to EVM', async () => {
    // Generate a random H160 address
    const h160address = generateRandomAddress().address;

    // Send 1 TAO (10^9) + Existencial Deposit to this address' mirror
    await usingApi(async api => {
      // Calculate ss58 mirror of H160 address
      const ss58mirror = convertH160ToSS58(h160address);

      // Create a transfer transaction
      const transfer = api.tx.balances.transferKeepAlive(ss58mirror, amount1TAO.plus(ed).toString());

      // Sign and send the transaction
      await sendTransaction(api, transfer, tk.alice);

      const balanceAfter = await getTaoBalance(api, ss58mirror);
      expect(balanceAfter.toString()).to.be.equal(amount1TAO.plus(ed).toString());
    });

    // Verify that Eth balance is 10^18
    await usingEthApi(async provider => {
      const ethBalanceAfter = await getEthereumBalance(provider, h160address);
      expect(ethBalanceAfter.toString()).to.be.equal(amount1ETH.toString());
    });
  });

  it('Transfer between two EVM accounts', async () => {
    await usingEthApi(async provider => {
      // Generate a random H160 address
      const recipient = generateRandomAddress().address;
      const amount = convertEtherToWei(1.0);

      // Check balances
      const ethBalanceBefore1 = await getEthereumBalance(provider, fundedEthWallet.address);
      const ethBalanceBefore2 = await getEthereumBalance(provider, recipient);

      // Send TAO
      const tx = {
        to: recipient,
        value: amount.toString()
      };

      // Get gas price and transfer cost
      const txPrice = await estimateTransactionCost(provider, tx);
      console.log(`txPrice = ${txPrice.toString()}`);

      // Send the transaction
      await sendEthTransaction(provider, fundedEthWallet, tx);

      // Check balances
      const ethBalanceAfter1 = await getEthereumBalance(provider, fundedEthWallet.address);
      const ethBalanceAfter2 = await getEthereumBalance(provider, recipient);
      const ed_eth = convertEtherToWei(convertRaoToTao(ed))

      expect(ethBalanceBefore1
        .minus(ethBalanceAfter1)
        .minus(txPrice)
        .toString()
      ).to.be.equal(amount.toString());

      expect(ethBalanceAfter2
        .minus(ethBalanceBefore2)
        .plus(ed_eth)
        .toString()
      ).to.be.equal(amount.toString());
    });
  });
  
  it('Transfer from EVM to substrate using precompile', async () => {
  });

  it('Transfer from EVM to substrate using evm::withdraw', async () => {
  });

  it('Transfer value using evm::call', async () => {
  });

  it('Forward value in smart contract', async () => {
    // Deploy a smart contract (bytecode can be pre-built) that has a payable 
    // method that sends all received value to an address
    // Verify that received value is accurate on the final destination address.
  });

  it('Transfer more than owned balance should fail', async () => {
  });

  it('Transfer more than u64::max in substrate equivalent should receive error response', async () => {
    // This is to verify that all transfer methods: 
    //   - plain Ethereum h160 > h160 transfer
    //   - transfer precompile 
    //   - evm::withdraw
    //   - evm::call
    // do not panic on U256 to balance conversion
  });

  it('Gas price should be 10 GWei', async () => {
  });

  it('max_fee_per_gas and max_priority_fee_per_gas do not affect transaction fee', async () => {
    // Split into as many tests as needed. Here's how to twickle maxPriorityFeePerGas and maxFeePerGas:

    // const { ethers } = require("ethers");

    // // Assuming you have a provider and signer set up
    // const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    // const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // async function sendTransaction() {
    //     const tx = {
    //         to: "0xRecipientAddressHere",
    //         value: ethers.utils.parseEther("0.1"),
    //         // EIP-1559 transaction parameters
    //         maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
    //         maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
    //         gasLimit: 21000,  // For a simple ETH transfer
    //     };
    
    //     const response = await signer.sendTransaction(tx);
    //     console.log(response);
    // }
    
    // sendTransaction();
  });
});
