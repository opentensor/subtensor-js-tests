import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys } from "../util/known-keys.js";
import { convertEtherToWei, convertTaoToRao } from "../util/balance-math.js";
import {
  convertH160ToSS58,
  generateRandomAddress,
  convertH160ToPublicKey,
} from "../util/address.js";
import { u256toBigNumber } from "../util/helpers.js";
import { ISTAKING_ADDRESS, IStakingABI } from "../util/precompile.js";
import { ethers } from "ethers";
import { expect, use as chaiUse } from "chai";
import { getRandomKeypair } from "../util/known-keys.js";
import chaiBigNumber from "chai-bignumber";
import BigNumber from "bignumber.js";

chaiUse(chaiBigNumber());

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();

const amountEth = 0.5;
const amountStr = convertEtherToWei(amountEth).toString();
let coldkey = getRandomKeypair();
let subnet_hotkey = getRandomKeypair();
let hotkey = getRandomKeypair();
let netuid = 0;

describe("Staking precompile", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();

      // Alice funds herself with 1M TAO
      const txSudoSetBalance = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance, tk.alice);
      // Alice funds coldkey with 1K TAO
      const fundColdkeyTx = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, fundColdkeyTx, tk.alice);

      const fundHotkeyTx = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, fundHotkeyTx, tk.alice);

      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const transfer = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          ss58mirror,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, transfer, tk.alice);

      const registerNetwork = api.tx.subtensorModule.registerNetwork(
        subnet_hotkey.address
      );
      await sendTransaction(api, registerNetwork, tk.alice);

      const totalNetworks = (
        await api.query.subtensorModule.totalNetworks()
      ).toNumber();

      // root network should be inited already
      expect(totalNetworks).to.be.greaterThan(1);

      netuid = totalNetworks - 1;
      console.log(`Will use the new registered subnet ${netuid} for testing`);

      // register coldkey / hotkey
      const register = api.tx.subtensorModule.burnedRegister(
        netuid,
        hotkey.address
      );
      await sendTransaction(api, register, coldkey);
    });
  });

  it("Can add stake", async () => {
    await usingEthApi(async (provider) => {
      // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md

      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      let stakeBefore;
      await usingApi(async (api) => {
        stakeBefore = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );
      });

      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(
        ISTAKING_ADDRESS,
        IStakingABI,
        signer
      );

      // Execute transaction
      const tx = await contract.addStake(hotkey.publicKey, netuid, {
        value: amountStr,
      });
      await tx.wait();
      // });

      const coldPublicKey = convertH160ToPublicKey(fundedEthWallet.address);
      const stake_from_contract = new BigNumber(
        await contract.getStake(hotkey.publicKey, coldPublicKey, netuid)
      );

      expect(stake_from_contract).to.be.bignumber.gt(stakeBefore);

      await usingApi(async (api) => {
        let stake = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );

        expect(stake).to.be.bignumber.gt(stakeBefore);
      });
    });
  });

  it("Can not add stake if subnet doesn't exist", async () => {
    await usingEthApi(async (provider) => {
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
      const badNetuid = 12345;

      let stakeBefore;
      await usingApi(async (api) => {
        stakeBefore = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );
      });

      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const contract = new ethers.Contract(
          ISTAKING_ADDRESS,
          IStakingABI,
          signer
        );

        // Execute transaction
        await expect(
          contract.addStake(hotkey.publicKey, badNetuid, {
            value: amountStr,
          })
        ).to.be.rejected;
      });
    });
  });

  it("Can get stake via contract read method", async () => {
    await usingApi(async (api) => {
      await usingEthApi(async (provider) => {
        // Create a contract instances
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
        const coldPublicKey = convertH160ToPublicKey(fundedEthWallet.address);
        const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

        const contract = new ethers.Contract(
          ISTAKING_ADDRESS,
          IStakingABI,
          signer
        );

        // Add stake
        const txAdd = await contract.addStake(hotkey.publicKey, netuid, {
          value: amountStr,
        });
        await txAdd.wait();

        // Get Alpha via polkadot API
        let alpha = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );

        // Adjust decimals
        alpha = alpha.multipliedBy(1e9);

        // get stake via contract method
        const stake_from_contract = new BigNumber(
          await contract.getStake(hotkey.publicKey, coldPublicKey, netuid)
        );

        expect(stake_from_contract).to.not.undefined;

        // alpha value is not equal to the staked TAO
        // Alpha shares should be numerically equal to stake since this is a simple case with no
        // unstaking, etc.
        // expect(alpha).to.be.bignumber.eq(stake_from_contract);
      });
    });
  });

  it("Can remove stake", async () => {
    await usingApi(async (api) => {
      await usingEthApi(async (provider) => {
        // Use this example: https://github.com/gztensor/evm-demo/blob/main/docs/staking-precompile.md
        const ss58mirror = convertH160ToSS58(fundedEthWallet.address);
        const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);

        const contract = new ethers.Contract(
          ISTAKING_ADDRESS,
          IStakingABI,
          signer
        );

        // Add stake
        const txAdd = await contract.addStake(hotkey.publicKey, netuid, {
          value: amountStr,
        });
        await txAdd.wait();

        let stakeBefore = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );

        // Remove all stake. stakeBefore is returned as Alpha using 10^9 decimals, so convert it first
        const removeAmountStr = new BigNumber(stakeBefore.toFixed())
          .multipliedBy(1e9)
          .toFixed();
        const tx = await contract.removeStake(
          hotkey.publicKey,
          removeAmountStr,
          netuid
        );
        await tx.wait();

        let stake = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );

        expect(stake).to.be.bignumber.lt(stakeBefore);
      });
    });
  });

  it("Can add/remove proxy", async () => {
    await usingEthApi(async (provider) => {
      // add/remove are done in a single test case, because we can't use the same private/public key
      // between substrate and EVM, but to test the remove part, we must predefine the proxy first.
      // it makes `remove` being dependent on `add`, because we should use `addProxy` from contract
      // to prepare the proxy for `removeProxy` testing - the proxy is specified for the
      // caller/origin.

      // first, check we don't have proxies
      const publicKey = convertH160ToPublicKey(fundedEthWallet.address);
      let proxies = await api.query.proxy.proxies(publicKey);
      expect(proxies[0].length).to.be.eq(0);

      // intialize the contract
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(
        ISTAKING_ADDRESS,
        IStakingABI,
        signer
      );

      // test "add"
      let tx = await contract.addProxy(tk.bob.publicKey);
      await tx.wait();

      const [[{ delegate }]] = await api.query.proxy.proxies(publicKey);

      expect(delegate.toHuman()).to.be.eq(tk.bob.address);

      // check the delegate can stake
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      let stakeBefore;
      await usingApi(async (api) => {
        stakeBefore = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );
      });

      const proxyCall = api.tx.proxy.proxy(
        ss58mirror,
        null,
        api.tx.subtensorModule.addStake(
          hotkey.address,
          netuid,
          amount1TAO.toString()
        )
      );
      await sendTransaction(api, proxyCall, tk.bob);

      await usingApi(async (api) => {
        let stake = u256toBigNumber(
          await api.query.subtensorModule.alpha(
            hotkey.address,
            ss58mirror,
            netuid
          )
        );
        expect(stake).to.be.bignumber.gt(stakeBefore);
      });

      // test "remove"
      tx = await contract.removeProxy(tk.bob.publicKey);
      await tx.wait();

      proxies = await api.query.proxy.proxies(publicKey);
      expect(proxies[0].length).to.be.eq(0);
    });
  });
});
