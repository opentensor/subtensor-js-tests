import { WsProvider, ApiPromise } from "@polkadot/api";
import { WS_ENDPOINT, CONN_TIMEOUT } from '../config.js';

function withTimeout(promise, timeoutMs) {
  // Create a promise that rejects in <timeoutMs> milliseconds
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Promise timed out')), timeoutMs);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeoutPromise]).then(result => {
      clearTimeout(timeoutHandle);
      return result;
  }).catch(error => {
      clearTimeout(timeoutHandle);
      throw error;
  });
}

async function createApi() {
  const wsProvider = new WsProvider(WS_ENDPOINT);
  global.api = new ApiPromise({ provider: wsProvider });
  try {
    await withTimeout(api.isReady, CONN_TIMEOUT);
    console.log("=============== API created");
  } catch (error) {
    api.disconnect();
    throw Error('Connection timeout')
  }

  const cleanup = () => {
    api.off('disconnected');
    api.off('error');
  };

  api.on('disconnected', cleanup);
  api.on('error', cleanup);
}

before(async () => {
  await createApi();
});

after(() => {
  global.api && global.api.disconnect()
});