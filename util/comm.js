import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
use(chaiAsPromised);

async function decodeError(api, error) {
  // Parse the error if it's in string form
  let errorData;
  if (typeof error === 'string') {
      errorData = JSON.parse(error);
  } else {
      errorData = error;
  }

  // Fetch the metadata from the error module and error index
  try {
      let moduleIndex = errorData.module.index;
      let errorIndex = parseInt(errorData.module.error, 16);
      // revert bytes in error index
      errorIndex = ((errorIndex & 0xff000000) >>> 24) || ((errorIndex & 0xff0000) >>> 8) || ((errorIndex & 0xff00) << 8) || ((errorIndex && 0xff) << 24);

      const metadata = (await api.rpc.state.getMetadata());
      const metadataV14 = metadata.asV14;
      const module = metadataV14.pallets.find((module) => module.index.toNumber() === moduleIndex);
      const errorsType = module?.errors.toHuman().type;
      const errors = metadataV14.toHuman().lookup.types.find((ty) => parseInt(ty.id) === parseInt(errorsType));

      // Find the specific error message
      const errorDef = errors.type.def.Variant.variants.find((variant) => variant.index == errorIndex);
      return `${errorDef.name}: ${errorDef.docs}`
  } catch (err) {
      return error;
  }
}

export async function usingApi(action) {
  let api = global.api;
  try {
    await action(api);
  } catch (e) {
    const humanReadableErr = await decodeError(api, e);
    console.log(humanReadableErr);
    throw Error(humanReadableErr);
  }
}

export function expectToFailWith(api, call, err) {
  const wrapped = async () => {
    try {
      await call();
    } catch (e) {
      const humanReadableErr = await decodeError(api, e);
      throw Error(humanReadableErr);
    }
  };

  return expect(wrapped()).to.be.rejectedWith(Error, err);
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