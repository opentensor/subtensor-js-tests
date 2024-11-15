import BigNumber from 'bignumber.js';

export const WS_ENDPOINT = "wss://test.finney.opentensor.ai";
export const RPC_ENDPOINT = "https://test.finney.opentensor.ai";

// export const WS_ENDPOINT = "ws://localhost:9946";
// export const RPC_ENDPOINT = "http://localhost:9946";

export const CONN_TIMEOUT = 10000;

export const netuid = 1;
export const stake = new BigNumber(1e9);
export const subnetTempo = 360;
export const hotkeyTempo = 7200;
export const maxChildTake = parseInt(0xFFFF / 2);
