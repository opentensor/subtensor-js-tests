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

export async function waitForNonZero(call, timeout) {
  let blockCount = 0;
  while (true) {
    const value = (await call()).toNumber();
    if (value > 0) {
      break;
    }

    await skipBlocks(api, 1);
    blockCount++;
    if (blockCount > timeout) {
      throw Error("Timeout waiting for a non-zero value");
    }
  }
}

export async function ensureAlwaysZero(call, timeout) {
  let blockCount = 0;
  while (true) {
    const value = (await call()).toNumber();
    if (value > 0) {
      throw Error("Received a non-zero value while expecting it to always be zero");
    }

    await skipBlocks(api, 1);
    blockCount++;
    if (blockCount > timeout) {
      break;
    }
  }
}
