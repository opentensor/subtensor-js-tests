import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getTestKeys, getRandomKeypair } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import { expect } from "chai";
import { ethers } from "ethers";
import { INEURON_ADDRESS, INeuronABI } from "../util/precompile.js";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;

let coldkey = getRandomKeypair();
let fundedEthWallet1 = generateRandomAddress();
let fundedEthWallet2 = generateRandomAddress();
let fundedEthWallet3 = generateRandomAddress();

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

      // Alice funds fundedEthWallet1
      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          convertH160ToSS58(fundedEthWallet1.address),
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      // Alice funds fundedEthWallet2
      const txSudoSetBalance4 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          convertH160ToSS58(fundedEthWallet2.address),
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance4, tk.alice);

      // Alice funds fundedEthWallet3
      const txSudoSetBalance5 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          convertH160ToSS58(fundedEthWallet3.address),
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance5, tk.alice);

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
        convertH160ToSS58(fundedEthWallet1.address)
      );
      await sendTransaction(api, register, coldkey);

      const register2 = api.tx.subtensorModule.burnedRegister(
        netuid,
        convertH160ToSS58(fundedEthWallet2.address)
      );
      await sendTransaction(api, register2, coldkey);

      const register3 = api.tx.subtensorModule.burnedRegister(
        netuid,
        convertH160ToSS58(fundedEthWallet3.address)
      );
      await sendTransaction(api, register3, coldkey);
    });
  });

  it("Serve Axon", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;
      const protocol = 0;
      const placeholder1 = 8;
      const placeholder2 = 9;

      const signer = new ethers.Wallet(fundedEthWallet1.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);

      const tx = await contract.serveAxon(
        netuid,
        version,
        ip,
        port,
        ipType,
        protocol,
        placeholder1,
        placeholder2
      );
      await tx.wait();

      await usingApi(async (api) => {
        const axon = (
          await api.query.subtensorModule.axons(
            netuid,
            convertH160ToSS58(fundedEthWallet1.address)
          )
        ).toHuman();

        expect(axon["block"]).to.not.be.undefined;
        expect(version).to.eq(Number(axon["version"]));
        expect(ip).to.eq(Number(axon["ip"]));
        expect(port).to.eq(Number(axon["port"]));
        expect(ipType).to.eq(Number(axon["ipType"]));
        expect(protocol).to.eq(Number(axon["protocol"]));
        expect(placeholder1).to.eq(Number(axon["placeholder1"]));
        expect(placeholder2).to.eq(Number(axon["placeholder2"]));
      });
    });
  });

  it("Serve Axon TLS", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;
      const protocol = 0;
      const placeholder1 = 8;
      const placeholder2 = 9;
      // certificate length is 65
      const certificate = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64, 65,
      ]);

      const signer = new ethers.Wallet(fundedEthWallet2.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);

      const tx = await contract.serveAxonTls(
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
      await tx.wait();

      await usingApi(async (api) => {
        const axon = (
          await api.query.subtensorModule.axons(
            netuid,
            convertH160ToSS58(fundedEthWallet2.address)
          )
        ).toHuman();

        expect(axon["block"]).to.not.be.undefined;
        expect(version).to.eq(Number(axon["version"]));
        expect(ip).to.eq(Number(axon["ip"]));
        expect(port).to.eq(Number(axon["port"]));
        expect(ipType).to.eq(Number(axon["ipType"]));
        expect(protocol).to.eq(Number(axon["protocol"]));
        expect(placeholder1).to.eq(Number(axon["placeholder1"]));
        expect(placeholder2).to.eq(Number(axon["placeholder2"]));
      });
    });
  });

  it("Serve Prometheus", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;

      const signer = new ethers.Wallet(fundedEthWallet3.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);

      const tx = await contract.servePrometheus(
        netuid,
        version,
        ip,
        port,
        ipType
      );
      await tx.wait();

      await usingApi(async (api) => {
        const prometheus = (
          await api.query.subtensorModule.prometheus(
            netuid,
            convertH160ToSS58(fundedEthWallet3.address)
          )
        ).toHuman();

        expect(prometheus["block"]).to.not.be.undefined;
        expect(version).to.eq(Number(prometheus["version"]));
        expect(ip).to.eq(Number(prometheus["ip"]));
        expect(port).to.eq(Number(prometheus["port"]));
        expect(ipType).to.eq(Number(prometheus["ipType"]));
      });
    });
  });
});
