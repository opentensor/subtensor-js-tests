import { createApi } from '../setup.js';
import { RPC_ENDPOINT } from '../../config.js';
import { ethers } from 'ethers';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

export async function usingApi(action) {
  let api = global.api;
  try {
    await action(api);
  } catch (e) {
    if (typeof e == String) {
      throw Error(e);
    } else {
      throw e;
    }
  }
}

export async function usingCreatedApi(action) {
  let api = undefined;
  try {
    let api = await createApi();
    await action(api);
  } catch (e) {
    throw Error(e);
  } finally {
    api && api.disconnect()
  }
}

export function expectToFailWith(api, call, err) {
  return expect(call()).to.be.rejectedWith(Error, err);
}

export function sendTransaction(api, call, signer) {
  return new Promise((resolve, reject) => {
    let unsubscribed = false;

    const unsubscribe = call.signAndSend(signer, ({ status, events, dispatchError }) => {
      const safelyUnsubscribe = () => {
        if (!unsubscribed) {
          unsubscribed = true;
          unsubscribe.then(() => {})
            .catch(error => console.error('Failed to unsubscribe:', error));
        }
      };
      
      // Check for transaction errors
      if (dispatchError) {
        let errout = dispatchError.toString();
        if (dispatchError.isModule) {
          // for module errors, we have the section indexed, lookup
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          errout = `${name}: ${docs}`;
        }
        safelyUnsubscribe();
        reject(Error(errout));
      }
      // Log and resolve when the transaction is included in a block
      if (status.isInBlock) {
        safelyUnsubscribe();
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
          // Unsubscribe from further block updates
          unsubscribe.then(() => {})
            .catch(error => console.error('Failed to unsubscribe:', error));
          resolve(header);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getStdev(values) {
  const n = values.length;
  const mean = values.reduce((acc, val) => acc + val, 0) / n;
  const variance = values.reduce((acc, val) => acc + ((val - mean) ** 2), 0) / n;
  return Math.sqrt(variance);
}

export async function measureBlockTime(api, blockCount) {
  return new Promise((resolve, reject) => {
    try {
      let startBlock = undefined;
      let blockTimes = [];
      let startTime;
      let endTime;
      let updateSeen = false;

      // Subscribe to new block headers
      const unsubscribe = api.rpc.chain.subscribeNewHeads((header) => {
        const block =  header.number.toNumber();

        if (!startBlock) {
          startBlock = block;
        } else {
          if (updateSeen) {
            endTime = new Date();
            const elapsed = endTime - startTime;
            blockTimes.push(elapsed);
            startTime = new Date();
          } else {
            updateSeen = true;
            startTime = new Date();
          }
        }

        if (blockTimes.length >= blockCount) {
          // Unsubscribe from further block updates
          unsubscribe.then(() => {})
                    .catch(error => console.error('Failed to unsubscribe:', error));

          resolve({
            mean: blockTimes.reduce((acc, val) => acc + val, 0) / blockTimes.length,
            stdev: getStdev(blockTimes)
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function usingEthApi(action) {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINT);
    await action(provider);
  } catch (e) {
    if (typeof e == String) {
      throw Error(e);
    } else {
      throw e;
    }
  }
}