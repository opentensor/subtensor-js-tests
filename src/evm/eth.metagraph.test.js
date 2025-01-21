import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getRandomKeypair, getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { IMETAGRAPH_ADDRESS, IMetagraphABI } from "../util/precompile.js";
import { expect } from "chai";
import { ethers } from "ethers";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let ed;
const hotkey = getRandomKeypair();
const coldkey = getRandomKeypair();

describe("Neuron metagraph data test", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);

      // Alice funds herself with 1M TAO
      const txSudoSetBalance1 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          tk.alice.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance1, tk.alice);

      // Alice funds hotkey with 1M TAO
      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      // Alice funds coldkey with 1M TAO
      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          coldkey.address,
          amount1TAO.multipliedBy(1e6).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);

      const netuid = 1;

      let netuid_1_exist = (
        await api.query.subtensorModule.networksAdded(netuid)
      ).toHuman();

      // add the first subnet if not created yet
      if (!netuid_1_exist) {
        const registerNetwork = api.tx.subtensorModule.registerNetwork();
        await sendTransaction(api, registerNetwork, tk.alice);
      }

      // register to network if no any neuron registered before
      let uid_count = (
        await api.query.subtensorModule.subnetworkN(netuid)
      ).toNumber();

      if (uid_count == 0) {
        const registerValidator = api.tx.subtensorModule.burnedRegister(
          netuid,
          hotkey.address
        );
        await sendTransaction(api, registerValidator, coldkey);
      }
    });
  });

  it("Metagraph data ", async () => {
    await usingEthApi(async (provider) => {
      const netuid = 1;
      // check the data availability by check the first neuron.
      const uid = 0;

      const metagraphContract = new ethers.Contract(
        IMETAGRAPH_ADDRESS,
        IMetagraphABI,
        provider
      );

      const uid_count = await metagraphContract.getUidCount(netuid);
      expect(uid_count).to.not.be.undefined;

      const stake = await metagraphContract.getStake(netuid, uid);
      expect(stake).to.not.be.undefined;

      const rank = await metagraphContract.getRank(netuid, uid);
      expect(rank).to.not.be.undefined;

      const trust = await metagraphContract.getTrust(netuid, uid);
      expect(trust).to.not.be.undefined;

      const consunsus = await metagraphContract.getConsensus(netuid, uid);
      expect(consunsus).to.not.be.undefined;

      const incentive = await metagraphContract.getIncentive(netuid, uid);
      expect(incentive).to.not.be.undefined;

      const diviends = await metagraphContract.getDividends(netuid, uid);
      expect(diviends).to.not.be.undefined;

      const emission = await metagraphContract.getEmission(netuid, uid);
      expect(emission).to.not.be.undefined;

      const vtrust = await metagraphContract.getVtrust(netuid, uid);
      expect(vtrust).to.not.be.undefined;

      const validatorStatus = await metagraphContract.getValidatorStatus(
        netuid,
        uid
      );
      expect(validatorStatus).to.not.be.undefined;

      const lastUpdate = await metagraphContract.getLastUpdate(netuid, uid);
      expect(lastUpdate).to.not.be.undefined;

      const isActive = await metagraphContract.getIsActive(netuid, uid);
      expect(isActive).to.not.be.undefined;

      const axon = await metagraphContract.getAxon(netuid, uid);
      expect(axon.block).to.not.be.undefined;
      expect(axon.version).to.not.be.undefined;
      expect(axon.ip).to.not.be.undefined;
      expect(axon.port).to.not.be.undefined;
      expect(axon.ip_type).to.not.be.undefined;
      expect(axon.protocol).to.not.be.undefined;

      const hotkey = await metagraphContract.getHotkey(netuid, uid);
      expect(hotkey).to.not.be.undefined;

      const coldkey = await metagraphContract.getColdkey(netuid, uid);
      expect(coldkey).to.not.be.undefined;
    });
  });
});
