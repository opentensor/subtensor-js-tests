import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys, getRandomKeypair } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { expect } from "chai";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;

let coldkey = getRandomKeypair();
let hotkey = getRandomKeypair();
let hotkey2 = getRandomKeypair();
describe("Serve Axon Prometheus test", () => {
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

      // Alice funds coldkey with 1K TAO
      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      // Alice funds fundedEthWallet
      //   const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      const txSudoSetBalance4 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey2.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance4, tk.alice);

      const netuid = 1;

      let netuid_1_exist = (
        await api.query.subtensorModule.networksAdded(netuid)
      ).toHuman();

      // add the first subnet if not created yet
      if (!netuid_1_exist) {
        const registerNetwork = api.tx.subtensorModule.registerNetwork(tk.bob);
        await sendTransaction(api, registerNetwork, tk.alice);
      }

      // register coldkey / hotkey
      const register = api.tx.subtensorModule.burnedRegister(
        netuid,
        hotkey.address
      );
      await sendTransaction(api, register, coldkey);

      const register2 = api.tx.subtensorModule.burnedRegister(
        netuid,
        hotkey2.address
      );
      await sendTransaction(api, register2, coldkey);
    });
  });

  it("Serve Axon", async () => {
    await usingApi(async (api) => {
      const netuid = 1;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;
      const protocol = 0;
      const placeholder1 = 8;
      const placeholder2 = 0;

      const txServeAxon = api.tx.subtensorModule.serveAxon(
        netuid,
        version,
        ip,
        port,
        ipType,
        protocol,
        placeholder1,
        placeholder2
      );
      await sendTransaction(api, txServeAxon, hotkey);
    });
  });

  it("Serve Axon TLS", async () => {
    await usingApi(async (api) => {
      const netuid = 1;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;
      const protocol = 0;
      const placeholder1 = 8;
      const placeholder2 = 0;
      const certificate = new Uint8Array(65);

      const txServeAxon = api.tx.subtensorModule.serveAxonTls(
        netuid,
        version,
        ip,
        port,
        ipType,
        protocol,
        placeholder1,
        placeholder2,
        certificate
      );
      await sendTransaction(api, txServeAxon, hotkey2);
    });
  });

  it("Serve Prometheus", async () => {
    await usingApi(async (api) => {
      const netuid = 1234;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;

      const txServeAxon = api.tx.subtensorModule.servePrometheus(
        netuid,
        version,
        ip,
        port,
        ipType
      );
      await sendTransaction(api, txServeAxon, hotkey);
    });
  });
});
