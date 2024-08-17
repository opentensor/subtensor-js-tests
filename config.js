import BigNumber from 'bignumber.js';

export const WS_ENDPOINT = "ws://localhost:9946";
export const CONN_TIMEOUT = 10000;

export const netuid = 1;
export const stake = new BigNumber(1e9);
export const subnetTempo = 10;
export const hotkeyTempo = 30;
export const maxChildTake = parseInt(0xFFFF / 2);
