import { ethers } from "ethers";

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
    return balance; // The balance is already returned as a BigNumber by ethers.js
}
