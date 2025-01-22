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
      const placeholder2 = 0;

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
      const placeholder2 = 0;
      const certificate = new Uint8Array(65);

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
    });
  });

  it("Serve Prometheus", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1234;
      const version = 0;
      const ip = 1;
      const port = 2;
      const ipType = 4;

      const signer = new ethers.Wallet(fundedEthWallet2.privateKey, provider);
      const contract = new ethers.Contract(INEURON_ADDRESS, INeuronABI, signer);

      const tx = await contract.servePrometheus(
        netuid,
        version,
        ip,
        port,
        ipType
      );
      await tx.wait();
    });
  });
});
