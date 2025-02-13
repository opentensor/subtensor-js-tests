import { WsProvider, ApiPromise } from "@polkadot/api";
import { WS_ENDPOINT, CONN_TIMEOUT } from "../config.js";
import { getTestKeys } from "./util/known-keys.js";
import { sendTransaction } from "./util/comm.js"

function withTimeout(promise, timeoutMs) {
  // Create a promise that rejects in <timeoutMs> milliseconds
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Promise timed out")),
      timeoutMs
    );
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeoutPromise])
    .then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    })
    .catch((error) => {
      clearTimeout(timeoutHandle);
      throw error;
    });
}

export async function createApi() {
  const wsProvider = new WsProvider(WS_ENDPOINT);
  global.api = new ApiPromise({ provider: wsProvider });
  try {
    await withTimeout(api.isReady, CONN_TIMEOUT);
  } catch (error) {
    global.api.disconnect();
    throw Error("Connection timeout");
  }

  const cleanup = () => {
    global.api.off("disconnected");
    global.api.off("error");
  };

  global.api.on("disconnected", cleanup);
  global.api.on("error", cleanup);

  return global.api;
}

before(async () => {
  let api = await createApi();
  let rateLimit = Number(await api.query.subtensorModule.networkRateLimit());
  if (rateLimit > 0) {
    const tk = getTestKeys();
    const txSudoSetNetworkRateLimit = api.tx.sudo.sudo(
      api.tx.adminUtils.sudoSetNetworkRateLimit(0)
    );
    await sendTransaction(api, txSudoSetNetworkRateLimit, tk.alice);
  }
});

after(() => {
  global.api && global.api.disconnect();
});
