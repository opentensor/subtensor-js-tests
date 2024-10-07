import { ethers } from "ethers";
import BigNumber from 'bignumber.js';

/**
 * Asynchronously retrieves the balance of a specified Ethereum address.
 * 
 * @async
 * @function getEthereumBalance
 * @param {string} address - The Ethereum address whose balance will be retrieved.
 * @returns {Promise<BigNumber>} A promise that resolves with the balance of the address as a BigNumber, representing the amount in Wei.
 * @throws {Error} Throws an error if the address is invalid or the network connection fails.
 * @example
 * getEthereumBalance("0x0000000000000000000000000000000000000000")
 *   .then(balance => console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`))
 *   .catch(err => console.error("Error fetching balance:", err));
 */
export async function getEthereumBalance(provider, address) {
  const balance = await provider.getBalance(address); // Fetch the balance
  return new BigNumber(balance);
}

export async function sendEthTransaction(provider, sender, tx) {
  // Initialize signer
  const wallet = new ethers.Wallet(sender.privateKey, provider);

  // Send the transaction
  const txResponse = await wallet.sendTransaction(tx);

  // Wait for the transaction to be mined
  await txResponse.wait();
}

export async function estimateTransactionCost(provider, tx) {
  const feeData = await provider.getFeeData();
  const estimatedGas = new BigNumber(await provider.estimateGas(tx));
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
  return estimatedGas.multipliedBy(gasPrice);
}