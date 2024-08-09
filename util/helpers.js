import { getTestKeys } from '../util/known-keys.js';
import { sendTransaction, skipBlocks } from './comm.js';
import { waitForStakeIncrease } from '../util/waiters.js';

export async function daveIsNeuron(api, netuid) {
  const tk = getTestKeys();
  const neuronCount = (await api.query.subtensorModule.subnetworkN(netuid)).toNumber();
  let daveUid = neuronCount-1;
  const daveIsRegistered = (await api.query.subtensorModule.isNetworkMember(tk.daveHot.address, netuid)).toHuman();
  if (!daveIsRegistered) {
    const txRegisterNeuron = api.tx.subtensorModule.burnedRegister(netuid, tk.daveHot.address);
    await sendTransaction(api, txRegisterNeuron, tk.dave);
    daveUid = neuronCount;
  }
  return daveUid;
}

export async function daveIsBobsChild(api, netuid, initialTempo) {
  const tk = getTestKeys();
  
  // Check if dave is not already Bob's child
  const bobsChildren = (await api.query.subtensorModule.childKeys(tk.bobHot.address, netuid)).toHuman();
  if ((bobsChildren.length != 1) || (bobsChildren[0][1] != tk.daveHot.address)) {
    // Wait enough so that first time succeeds
    await skipBlocks(api, 2 * initialTempo);

    // Bob makes Dave his only child
    const txSetChildren = api.tx.subtensorModule.setChildren(tk.bobHot.address, netuid, [[0xFFFFFFFFFFFFFFFFn, tk.daveHot.address]]);
    await sendTransaction(api, txSetChildren, tk.bob);
  }
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