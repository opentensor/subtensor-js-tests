import { ethers } from "ethers";
import { decodeAddress } from '@polkadot/util-crypto';
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

/**
 * Converts an SS58 formatted Substrate address to an Ethereum-compatible address.
 * 
 * This function first decodes an SS58 address to its corresponding public key,
 * and then derives the Ethereum address by taking the first 20 bytes of this hash,
 * converting them into an H160 Ethereum address format.
 *
 * @param {string} ss58Address The SS58 formatted Substrate address to be converted.
 * @returns {string} The derived Ethereum H160 address as a hexadecimal string.
 */
export function ss58ToH160(ss58Address) {
  // Decode the SS58 address to a Uint8Array public key
  const publicKey = decodeAddress(ss58Address);

  // Take the first 20 bytes of the hashed public key for the Ethereum address
  const ethereumAddressBytes = publicKey.slice(0, 20);

  // Convert the 20 bytes into an Ethereum H160 address format (Hex string)
  const ethereumAddress = '0x' + Buffer.from(ethereumAddressBytes).toString('hex');

  return ethereumAddress;
}