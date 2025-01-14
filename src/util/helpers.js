import BigNumber from "bignumber.js";
import { getTestKeys } from './known-keys.js';
import { sendTransaction, skipBlocks } from './comm.js';
import { waitForStakeIncrease } from './waiters.js';
import { netuid, stake, subnetTempo, hotkeyTempo, maxChildTake } from '../../config.js';
import { ApiPromise } from '@polkadot/api';

export async function setStake(api, hotkey, signer, desiredAmount) {
  const currentStake = (await api.query.subtensorModule.stake(hotkey, signer.address)).toNumber();
  if (currentStake < desiredAmount) {
    // Add stake for hotkey if it is not added yet
    console.log(`Adding stake for ${hotkey}`);
    const txAddStake = api.tx.subtensorModule.addStake(hotkey, (desiredAmount - currentStake).toString());
    await sendTransaction(api, txAddStake, signer);
  } else if (currentStake > desiredAmount) {
    // Remove stake from hotkey if it has extra stake
    const txRemoveStake = api.tx.subtensorModule.removeStake(hotkey, (currentStake - desiredAmount).toString());
    await sendTransaction(api, txRemoveStake, signer);
  }
}

export async function setupStartingStake(api) {
  const tk = getTestKeys();
  await setStake(api, tk.aliceHot.address, tk.alice, stake);
  await setStake(api, tk.bobHot.address, tk.bob, stake);
  await setStake(api, tk.charlieHot.address, tk.charlie, 0);
  await setStake(api, tk.daveHot.address, tk.dave, 0);
  await setStake(api, tk.bobHot.address, tk.eve, 0);
}

async function hotkeyIsNeuron(api, netuid, hotkey, signer) {
  const hotkeyIsRegistered = (await api.query.subtensorModule.isNetworkMember(hotkey, netuid)).toHuman();
  if (!hotkeyIsRegistered) {
    const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(netuid, hotkey);
    await sendTransaction(api, txRegisterNeuron, signer);
  }
  return (await api.query.subtensorModule.uids(netuid, hotkey)).toHuman();
}

export async function charlieIsNeuron(api, netuid) {
  const tk = getTestKeys();
  return await hotkeyIsNeuron(api, netuid, tk.charlieHot.address, tk.charlie);
}

export async function daveIsNeuron(api, netuid) {
  const tk = getTestKeys();
  return await hotkeyIsNeuron(api, netuid, tk.daveHot.address, tk.dave);
}

function childrenArraysEqual(arr1, arr2) {
  if (arr1.length != arr2.length) {
    return false;
  }
  if ((arr1.length == 0) && (arr2.length == 0)) {
    return true;
  }
  for (let i=0; i<arr1.length; i++) {
    if ((arr1[i][0] != arr2[i][0]) || (arr1[i][1] != arr2[i][1])) {
      return false;
    } 
  }
  return true;
}

export async function setChildren(api, netuid, hotkey, signer, childArray, initialTempo) {
  const currentChildren = (await api.query.subtensorModule.childKeys(hotkey, netuid)).toHuman();
  if (!childrenArraysEqual(currentChildren, childArray)) {
    // Wait enough so that this call succeeds
    await skipBlocks(api, 2 * initialTempo);

    // Bob makes Dave his only child
    const txSetChildren = api.tx.subtensorModule.setChildren(hotkey, netuid, childArray);
    await sendTransaction(api, txSetChildren, signer);
  }
}

export async function daveIsBobsChild(api, netuid, initialTempo) {
  const tk = getTestKeys();
  await setChildren(api, netuid, tk.bobHot.address, tk.bob, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]], initialTempo);
}

export async function reliableUnstake(api, hotkey, signer, hotkeyTempo) {
  while (true) {
    const currentStake = (await api.query.subtensorModule.stake(hotkey, signer.address)).toNumber();
    if (currentStake > 0) {
      const txRemoveStake = api.tx.subtensorModule.removeStake(hotkey, currentStake.toString());
      await sendTransaction(api, txRemoveStake, signer);
    }

    try {
      await waitForStakeIncrease(api, hotkeyTempo, hotkey, signer.address);
    } catch (e) {
      break;
    }
  }
}

export async function resetSut(api) {
  const tk = getTestKeys();

  // Stake amounts
  await reliableUnstake(api, tk.charlieHot.address, tk.charlie, hotkeyTempo);
  await reliableUnstake(api, tk.daveHot.address, tk.dave, hotkeyTempo);
  await reliableUnstake(api, tk.bobHot.address, tk.eve, hotkeyTempo);
  await setupStartingStake(api);

  // Remove all children
  let initialTempo = api.consts.subtensorModule.initialTempo.toNumber();
  await setChildren(api, netuid, tk.aliceHot.address, tk.alice, [], initialTempo);
  await setChildren(api, netuid, tk.bobHot.address, tk.bob, [], initialTempo);
}

/**
 * Asynchronously retrieves the free balance of a specified account address on a Substrate-based blockchain.
 *
 * @async
 * @function getSubstrateFreeBalance
 * @param {ApiPromise} api - The instance of Substrate api.
 * @param {string} address - The Substrate account address whose free balance will be retrieved.
 * @returns {Promise<BigNumber>} A promise that resolves with the free balance of the account as a BigNumber.
 * @throws {Error} Throws an error if the connection fails or the account address is invalid.
 * @example
 * getSubstrateFreeBalance('5FHneW46xGXgs5mUiveU4sbTyGBrh6pFJC9vvPe7b4iZM4yW')
 *   .then(balance => console.log(`Free Balance: ${balance} units`))
 *   .catch(err => console.error('Error fetching balance:', err));
 */
export async function getTaoBalance(api, address) {
  const { data: { free } } = await api.query.system.account(address);
  return free;
}

/**
 * Asynchronously retrieves the existential deposit required to keep an account alive on a Substrate-based blockchain.
 *
 * @async
 * @function getExistentialDeposit
 * @param {ApiPromise} api - The instance of Substrate api.
 * @returns {Promise<BigInt>} A promise that resolves with the existential deposit as a BigInt.
 * @throws {Error} Throws an error if unable to connect to the node or fetch the existential deposit.
 * @example
 * getExistentialDeposit()
 *   .then(deposit => console.log(`Existential Deposit: ${deposit} units`))
 *   .catch(err => console.error('Error fetching existential deposit:', err));
 */
export async function getExistentialDeposit(api) {
  // Fetch the existential deposit from the chain's constants
  const ed = api.consts.balances.existentialDeposit;

  // Return the deposit as BigInt (Polkadot.js uses its own BN.js library which is similar to BigInt)
  return ed.toBigInt();
}

export function u256toBigNumber(u256) {
  const hexString = u256.bits.toHex();
  const cleanHexString = hexString.startsWith("0x") ? hexString.slice(2) : hexString;

  // Convert the hex string to an array of bytes
  const byteArray = [];

  for (let i = 0; i < cleanHexString.length; i += 2) {
    // Parse each pair of hex characters into a byte
    byteArray.push(parseInt(cleanHexString.substr(i, 2), 16));
  }

  // Take chunks of 8 bytes each
  let bigNumChunks = []; 
  for (let i = 0; i < byteArray.length; i += 8) {
    // Take a slice of up to 8 bytes at a time
    const chunk = byteArray.slice(i, i + 8);
    bigNumChunks.push(
      new BigNumber("0x" + chunk.map(byte => byte.toString(16).padStart(2, '0')).join(''))
    );
  }

  // Combine reversed chunks
  bigNumChunks = bigNumChunks.reverse();
  let combined = new BigNumber(0);
  let base = new BigNumber("10000000000000000", 16); // 2^64
  for (let i=0; i < bigNumChunks.length; i++) {
    combined = combined.multipliedBy(base).plus(bigNumChunks[i]);
  }
  return combined;
}