import { skipBlocks } from './comm.js';

export async function waitForStakeIncrease(api, hotkeyTempo, hotkey, coldkey) {
  const originalStake = (await api.query.subtensorModule.stake(hotkey, coldkey)).toNumber();

  let stakeIncreased = false
  let blockCount = 0;
  while (!stakeIncreased) {
    await skipBlocks(api, 1);
    blockCount++;
    const stake = (await api.query.subtensorModule.stake(hotkey, coldkey)).toNumber();
    if (stake > originalStake) {
      stakeIncreased = true;
    } else {
      // We need to wait for two hotkey tempos because we stake in the middle of the first one
      // and there will be no effect at the end of it
      if (blockCount > hotkeyTempo * 2) {
        throw Error("Hotkey tempo passed, but still no staking rewards");
      }
    }
  }
}
