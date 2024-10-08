import { usingApi, usingEthApi, sendTransaction } from '../util/comm.js';
import { getTestKeys } from '../util/known-keys.js';
import { convertEtherToWei, convertWeiToEther, convertTaoToRao, convertRaoToTao } from '../util/balance-math.js';
import { convertH160ToSS58, generateRandomAddress } from '../util/address.js';
import { getEthereumBalance, estimateTransactionCost, sendEthTransaction, ss58ToH160 } from '../util/eth-helpers.js';
import { getExistentialDeposit, getTaoBalance } from '../util/helpers.js';
import { decodeAddress } from '@polkadot/util-crypto';
import { assert, ethers } from "ethers";
import BigNumber from 'bignumber.js';
import { expect } from 'chai';

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);
let fundedEthWallet = generateRandomAddress();
let ed;

describe('Staking precompile', () => {
  before(async () => {
    await usingApi(async api => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(tk.alice.address, amount1TAO.multipliedBy(1e6).toString())
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const transfer = api.tx.balances.transferKeepAlive(ss58mirror, amount1TAO.multipliedBy(1000).toString());
      await sendTransaction(api, transfer, tk.alice);
    });
  });

  it('Can add stake', async () => {
    await usingEthApi(async provider => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
      assert(false, "TODO");
    });
  });

  it('Staker receives rewards', async () => {
    await usingEthApi(async provider => {
      // Wait until hotkey epoch ends and check if stake balance has increased
      // Check can only be done on Substrate side for now
      assert(false, "TODO");
    });
  });

  it('Can remove stake', async () => {
    await usingEthApi(async provider => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
      assert(false, "TODO");
    });
  });
});