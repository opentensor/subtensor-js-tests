import { getTestKeys } from '../util/known-keys.js';
import { sendTransaction, skipBlocks } from './comm.js';
import { waitForStakeIncrease } from '../util/waiters.js';
import { netuid, stake, subnetTempo, hotkeyTempo, maxChildTake } from '../config.js';

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