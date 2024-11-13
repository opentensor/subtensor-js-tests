import { blake2AsU8a } from "@polkadot/util-crypto";
import { hexToU8a } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { ethers } from "ethers";

/**
 * Converts an Ethereum H160 address to a Substrate SS58 address.
 * @param {string} ethAddress - The H160 Ethereum address as a hex string.
 * @return {string} The bytes array containing the Substrate SS58 address.
 */
export function convertH160ToSS58(ethAddress) {
  // get the public key
  const hash = convertH160ToPublicKey(ethAddress);

  // Convert the hash to SS58 format
  const ss58Address = encodeAddress(hash, 42); // Assuming network ID 42
  return ss58Address;
}

/**
 * Converts an Ethereum H160 address to a Substrate public key.
 * @param {string} ethAddress - The H160 Ethereum address as a hex string.
 * @return {string} The bytes array containing the Substrate public key.
 */
export function convertH160ToPublicKey(ethAddress) {
  const prefix = "evm:";
  const prefixBytes = new TextEncoder().encode(prefix);
  const addressBytes = hexToU8a(
    ethAddress.startsWith("0x") ? ethAddress : `0x${ethAddress}`
  );
  const combined = new Uint8Array(prefixBytes.length + addressBytes.length);

  // Concatenate prefix and Ethereum address
  combined.set(prefixBytes);
  combined.set(addressBytes, prefixBytes.length);

  // Hash the combined data (the public key)
  const hash = blake2AsU8a(combined);
  return hash;
}

/**
 * Generates a random Ethereum wallet
 * @returns wallet keyring
 */
export function generateRandomAddress() {
  const wallet = ethers.Wallet.createRandom();
  return wallet;
}
