import { usingApi, usingEthApi, sendTransaction } from '../util/comm.js';
import { getTestKeys } from '../util/known-keys.js';
import { convertEtherToWei, convertWeiToEther, convertTaoToRao, convertRaoToTao } from '../util/balance-math.js';
import { convertH160ToSS58, generateRandomAddress } from '../util/address.js';
import { getEthereumBalance } from '../util/eth-helpers.js';
import { getExistentialDeposit, getTaoBalance } from '../util/helpers.js';
import { expect } from 'chai';

let tk;
const amount1TAO = convertTaoToRao(1.0);
const amount1ETH = convertEtherToWei(1.0);

describe('Cross-transfers between substrate and EVM', () => {
  before(async () => {
    await usingApi(async api => {
      tk = getTestKeys();

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(tk.alice.address, amount1TAO.multipliedBy(1e6).toString())
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);
      console.log('Alice balace force-set');
    });
  });

  it('Transfer from substrate to EVM', async () => {
    // Generate a random H160 address
    const h160address = generateRandomAddress().address;

    // Send 1 TAO (10^9) + Existencial Deposit to this address' mirror
    await usingApi(async api => {
      const ed = await getExistentialDeposit(api);

      // Calculate ss58 mirror of H160 address
      const ss58mirror = convertH160ToSS58(h160address);

      // Create a transfer transaction
      const transfer = api.tx.balances.transferKeepAlive(ss58mirror, amount1TAO.plus(ed).toString());

      // Sign and send the transaction
      await sendTransaction(api, transfer, tk.alice);

      const balanceAfter = await getTaoBalance(api, ss58mirror);
      expect(balanceAfter.toString()).to.be.equal(amount1TAO.plus(ed).toString());
    });

    // Verify that Eth balance is 10^18
    await usingEthApi(async provider => {
      const ethBalanceAfter = await getEthereumBalance(provider, h160address);
      expect(ethBalanceAfter.toString()).to.be.equal(amount1ETH.toString());
    });
  });
});

