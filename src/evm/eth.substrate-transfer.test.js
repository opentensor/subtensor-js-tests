import { usingApi, usingEthApi, sendTransaction } from '../util/comm.js';
import { getTestKeys } from '../util/known-keys.js';
import { convertEtherToWei, convertWeiToEther, convertTaoToRao, convertRaoToTao } from '../util/balance-math.js';
import { convertH160ToSS58, generateRandomAddress } from '../util/address.js';
import { getEthereumBalance, estimateTransactionCost, sendEthTransaction, ss58ToH160 } from '../util/eth-helpers.js';
import { getExistentialDeposit, getTaoBalance } from '../util/helpers.js';
import { decodeAddress } from '@polkadot/util-crypto';
import { ethers } from "ethers";
import BigNumber from 'bignumber.js';
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
    // Precompile smart contract address:
    const contractAddress = '0x0000000000000000000000000000000000000800';

    // This is the SubtensorBalanceTransfer smart contract ABI, located in subtensor repository at: 
    // runtime/src/precompiles/balanceTransfer.abi
    const abi = [
      {
          "inputs": [
              {
                  "internalType": "bytes32",
                  "name": "data",
                  "type": "bytes32"
              }
          ],
          "name": "transfer",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
      }
    ];

    // Recipient address on substrate side
    const alicess58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
    const alicePubKey = decodeAddress(alicess58);

    // Check Alice's balance before transaction
    let aliceBalanceBefore;
    await usingApi(async api => {
      aliceBalanceBefore = await getTaoBalance(api, alicess58);
    });

    // Send 0.5 TAO along with the transaction
    const amountEth = 0.5;
    const amountStr = convertEtherToWei(amountEth).toString();
    await usingEthApi(async provider => {
      // Create a contract instance
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Execute transaction
      const tx = await contract.transfer(alicePubKey, { value: amountStr });
      await tx.wait();
    });

    // Check Alice's balance
    let aliceBalanceAfter;
    await usingApi(async api => {
      aliceBalanceAfter = new BigNumber(await getTaoBalance(api, alicess58));
    });

    const amountSub = convertTaoToRao(amountEth);
    expect(aliceBalanceAfter
      .minus(aliceBalanceBefore)
      .toString()
    ).to.be.equal(amountSub.toString());
  });

  it('Transfer from EVM to substrate using evm::withdraw', async () => {
    const amount = 0.5;
    const amountStr = convertEtherToWei(amount).toString();

    // Recipient address on substrate side
    const alice = tk.alice;
    const aliceEthereumAddress = ss58ToH160(alice.address);

    // Transfer to Alice's ethereum mirror to prepare for evm::withdraw
    await usingEthApi(async provider => {
      const tx = {
        to: aliceEthereumAddress,
        value: amountStr
      };
      await sendEthTransaction(provider, fundedEthWallet, tx);
    });

    await usingApi(async api => {
      // Check Alice's balance before withdraw transaction
      let aliceBalanceBefore = await getTaoBalance(api, alice.address);

      // Execute evm::withdraw to withdraw from Alice mirror account to Alice
      let amountSub = convertTaoToRao(amount).toString();
      const withdraw = api.tx.evm.withdraw(aliceEthereumAddress, amountSub);

      // Estimate the transaction fee
      const paymentInfo = await withdraw.paymentInfo(tk.alice.address);

      await sendTransaction(api, withdraw, tk.alice);

      // Check Alice's balance after withdraw transaction
      let aliceBalanceAfter = new BigNumber(await getTaoBalance(api, alice.address));

      // Balance difference should be equal to transferred amount considering tx fee
      expect(aliceBalanceAfter
        .minus(aliceBalanceBefore)
        .plus(paymentInfo.partialFee)
        .toString()
      ).to.be.equal(amountSub.toString());
    });
  });

  it('Transfer value using evm::call', async () => {
    const amount = 1.0;
    const amountStr = convertEtherToWei(amount).toString();
    const amount05 = 0.5;
    const amount05Str = convertEtherToWei(amount05).toString();

    // Generate a random H160 address
    const recipient = generateRandomAddress().address;

    // Transaction caller on substrate side
    const alice = tk.alice;
    const aliceEthereumAddress = ss58ToH160(alice.address);

    // Transfer to Alice's ethereum mirror to prepare for evm::call
    let ethBalanceBefore;
    await usingEthApi(async provider => {
      const tx = {
        to: aliceEthereumAddress,
        value: amountStr
      };
      await sendEthTransaction(provider, fundedEthWallet, tx);

      // Check balances
      ethBalanceBefore = await getEthereumBalance(provider, recipient);
    });

    // Execute evm::call to transfer from Alice's mirror to recipient
    await usingApi(async api => {
      const withdraw = api.tx.evm.call(
        aliceEthereumAddress,
        recipient,
        "",          // tx data
        amount05Str,   // amount
        21000,       // gas limit
        10e9,        // max fee per gas
        null,
        null,
        null
      );
      await sendTransaction(api, withdraw, tk.alice);
    });

    // Check balances
    let ethBalanceAfter;
    const ed_eth = convertEtherToWei(convertRaoToTao(ed))
    await usingEthApi(async provider => {
      ethBalanceAfter = await getEthereumBalance(provider, recipient);
    });

    expect(ethBalanceAfter
      .minus(ethBalanceBefore)
      .plus(ed_eth)
      .toString()
    ).to.be.equal(amount05Str);
  });

  it('Forward value in smart contract', async () => {
    // Deploy a smart contract (bytecode can be pre-built) that has a payable 
    // method that sends all received value to an address
    // Verify that received value is accurate on the final destination address.

    assert(false, "TODO");
  });

  it('Transfer full balance', async () => {
    // See the test "Transfer between two EVM accounts" for how to estaimate tx fee
    // Ensure that resulting sender balance is 0

    assert(false, "TODO");
  });

  it('Transfer more than owned balance should fail', async () => {
    await usingEthApi(async provider => {
      // Generate a random H160 address
      const recipient = generateRandomAddress();
      const amount = convertEtherToWei(1.0);

      // Send TAO
      const tx = {
        to: recipient.address,
        value: amount.toString()
      };

      // Send the transaction
      await sendEthTransaction(provider, fundedEthWallet, tx);

      // Generate another random H160 address
      const recipient2 = generateRandomAddress().address;

      // Send TAO over balance limit
      const tx2 = {
        to: recipient2,
        value: amount.plus(1).toString()
      };

      // Send the transaction
      await expect(sendEthTransaction(provider, recipient, tx2)).to.be.rejectedWith("insufficient funds for intrinsic transaction cost");

      // Check balances
      const ethBalanceAfter1 = await getEthereumBalance(provider, recipient.address);
      const ethBalanceAfter2 = await getEthereumBalance(provider, recipient2);
      const ed_eth = convertEtherToWei(convertRaoToTao(ed))

      expect(ethBalanceAfter1
        .plus(ed_eth)
        .toString()
      ).to.be.equal(amount.toString());

      expect(ethBalanceAfter2
        .toString()
      ).to.be.equal("0");
    });
  });

  it('Transfer more than u64::max in substrate equivalent should receive error response', async () => {
    // This is to verify that all transfer methods: 
    //   - plain Ethereum h160 > h160 transfer
    //   - transfer precompile 
    //   - evm::withdraw
    //   - evm::call
    // do not panic on U256 to balance conversion
    //
    // Use existing tests above to execute transfers

    assert(false, "TODO");
  });

  it('Gas price should be 10 GWei', async () => {
    await usingEthApi(async provider => {
      const feeData = await provider.getFeeData();
      expect(feeData.gasPrice.toString()).to.be.equal("10000000000");
    });
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

    assert(false, "TODO");
  });
});
