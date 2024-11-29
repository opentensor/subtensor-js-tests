import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;

describe("EVM chain id test", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);
    });
  });

  it("EVM chain id is the same, update chain id failed not sudo call", async () => {
    await usingEthApi(async (provider) => {
      // getNetwork returns {}
      //   const chainId = await provider.getNetwork();

      await usingApi(async (api) => {
        const oldChainId = (await api.query.evmChainId.chainId()).toNumber();

        try {
          const newChainId = 1234;
          const txSudoSetChaindId =
            api.tx.adminUtils.sudoSetEvmChainId(newChainId);
          await sendTransaction(api, txSudoSetChaindId, tk.bob);
        } catch (error) {
          expect(error.toString()).to.includes("BadOrigin");
        }

        const currentChainId = (
          await api.query.evmChainId.chainId()
        ).toNumber();
        expect(oldChainId).to.eq(currentChainId);
      });
    });
  });

  it("EVM chain id successful updated", async () => {
    await usingEthApi(async (provider) => {
      await usingApi(async (api) => {
        const oldChainId = (await api.query.evmChainId.chainId()).toNumber();
        const newChainId = oldChainId + 1;
        // update the chain id
        const txSudoSetChaindId = api.tx.sudo.sudo(
          api.tx.adminUtils.sudoSetEvmChainId(newChainId)
        );
        await sendTransaction(api, txSudoSetChaindId, tk.alice);
        const newChainIdStr = (await api.query.evmChainId.chainId()).toNumber();
        expect(newChainIdStr).to.not.eq(oldChainId);
      });
    });
  });
});
