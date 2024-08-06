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

export async function usingApi(action) {
  let api = undefined;
  try {
    const wsProvider = new WsProvider(WS_ENDPOINT);
    api = new ApiPromise({ provider: wsProvider });
    try {
      await withTimeout(api.isReady, CONN_TIMEOUT);
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

    await action(api);

    cleanup();
  } finally {
    api && api.disconnect();
  }
}

export function sendTransaction(api, call, signer) {
  return new Promise((resolve, reject) => {
    call.signAndSend(signer, ({ status, events, dispatchError }) => {
      // Check for transaction errors
      if (dispatchError) {
        if (dispatchError.isModule) {
          // for module errors, we have the section indexed, lookup
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
        }
        reject(dispatchError.toString());
      }
      // Log and resolve when the transaction is included in a block
      if (status.isInBlock) {
        resolve(status.asInBlock);
      }
    }).catch((error) => {
      reject(error);
    });
  });
}

export async function skipBlocks(api, blockCount) {
  return new Promise((resolve, reject) => {
    try {
      let startBlock = undefined;

      // Subscribe to new block headers
      const unsubscribe = api.rpc.chain.subscribeNewHeads((header) => {
        const block =  header.number.toNumber();

        if (!startBlock) {
          startBlock = block;
        } else if (block >= startBlock + blockCount) {
          resolve(header);
          // Unsubscribe from further block updates
          unsubscribe.then(() => {})
                    .catch(error => console.error('Failed to unsubscribe:', error));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}