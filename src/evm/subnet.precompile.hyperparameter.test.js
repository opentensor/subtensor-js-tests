import { usingApi, usingEthApi, sendTransaction } from "../util/comm.js";
import { getRandomKeypair, getTestKeys } from "../util/known-keys.js";
import { convertTaoToRao } from "../util/balance-math.js";
import { convertH160ToSS58, generateRandomAddress } from "../util/address.js";
import { getExistentialDeposit } from "../util/helpers.js";
import { ethers } from "ethers";
import { expect } from "chai";
import { ISUBNET_ADDRESS, ISubnetABI } from "../util/precompile.js";

let tk;
const amount1TAO = convertTaoToRao(1.0);
let fundedEthWallet = generateRandomAddress();
let hotkey1 = getRandomKeypair();
let hotkey2 = getRandomKeypair();
let ed;

let totalNetworks = 0;

describe("Subnet precompile test", () => {
  before(async () => {
    await usingApi(async (api) => {
      tk = getTestKeys();
      ed = await getExistentialDeposit(api);
      // Alice funds fundedEthWallet
      const ss58mirror = convertH160ToSS58(fundedEthWallet.address);

      const txSudoSetBalance1 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          ss58mirror,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance1, tk.alice);

      const txSudoSetBalance2 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey1.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance2, tk.alice);

      const txSudoSetBalance3 = api.tx.sudo.sudo(
        api.tx.balances.forceSetBalance(
          hotkey2.address,
          amount1TAO.multipliedBy(1e8).toString()
        )
      );
      await sendTransaction(api, txSudoSetBalance3, tk.alice);
    });
  });

  it("Can register network without identity info", async () => {
    await usingEthApi(async (provider) => {
      await usingApi(async (api) => {
        totalNetworks = (
          await api.query.subtensorModule.totalNetworks()
        ).toNumber();
      });

      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, signer);
      const tx = await contract.registerNetwork(hotkey1.publicKey);
      await tx.wait();

      usingApi(async (api) => {
        expect(await api.query.subtensorModule.totalNetworks().toHuman).to.eq(
          totalNetworks + 1
        );
        expect(
          await api.query.subtensorModule
            .subnetOwner(totalNetworks + 1)
            .to.eq(convertH160ToSS58(fundedEthWallet.address))
        );
      });
    });
  });

  it("Can register network with identity info", async () => {
    await usingEthApi(async (provider) => {
      await usingApi(async (api) => {
        totalNetworks = (
          await api.query.subtensorModule.totalNetworks()
        ).toNumber();
      });

      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, signer);

      // Execute transaction
      const tx = await contract.registerNetwork(
        hotkey2.publicKey,
        "name",
        "repo",
        "contact",
        "subnetUrl",
        "discord",
        "description",
        "additional"
      );
      await tx.wait();

      usingApi(async (api) => {
        expect(await api.query.subtensorModule.totalNetworks().toHuman).to.eq(
          totalNetworks + 1
        );
        expect(
          await api.query.subtensorModule
            .subnetOwner(totalNetworks + 1)
            .to.eq(convertH160ToSS58(fundedEthWallet.address))
        );
      });
    });
  });

  it("Can set subnet parameter", async () => {
    await usingEthApi(async (provider) => {
      // Create a contract instances
      const signer = new ethers.Wallet(fundedEthWallet.privateKey, provider);
      const contract = new ethers.Contract(ISUBNET_ADDRESS, ISubnetABI, signer);

      await usingApi(async (api) => {
        totalNetworks = (
          await api.query.subtensorModule.totalNetworks()
        ).toNumber();
      });

      const newSubnetId = totalNetworks - 1;

      // servingRateLimit hyperparameter
      let newValue = 100;
      let tx = await contract.setServingRateLimit(newSubnetId, newValue);
      await tx.wait();

      let onchainValue = 0;
      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.servingRateLimit(newSubnetId)
        );
      });

      let valueFromContract = Number(
        await contract.getServingRateLimit(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minDifficulty hyperparameter
      newValue = 101;
      tx = await contract.setMinDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.minDifficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMinDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // maxDifficulty hyperparameter
      newValue = 102;

      tx = await contract.setMaxDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxDifficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // weightsVersionKey hyperparameter
      newValue = 103;

      tx = await contract.setWeightsVersionKey(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.weightsVersionKey(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getWeightsVersionKey(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // weightsSetRateLimit hyperparameter
      newValue = 104;

      tx = await contract.setWeightsSetRateLimit(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.weightsSetRateLimit(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getWeightsSetRateLimit(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // adjustmentAlpha hyperparameter
      newValue = 105;

      tx = await contract.setAdjustmentAlpha(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.adjustmentAlpha(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getAdjustmentAlpha(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // maxWeightLimit hyperparameter
      newValue = 106;
      tx = await contract.setMaxWeightLimit(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxWeightsLimit(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxWeightLimit(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // immunityPeriod hyperparameter
      newValue = 107;

      tx = await contract.setImmunityPeriod(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.immunityPeriod(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getImmunityPeriod(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minAllowedWeights hyperparameter
      newValue = 108;

      tx = await contract.setMinAllowedWeights(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.minAllowedWeights(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getMinAllowedWeights(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // kappa hyperparameter
      newValue = 109;

      tx = await contract.setKappa(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.kappa(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getKappa(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // rho hyperparameter
      newValue = 110;

      tx = await contract.setRho(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(await api.query.subtensorModule.rho(newSubnetId));
      });

      valueFromContract = Number(await contract.getRho(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // activityCutoff hyperparameter
      newValue = 111;

      tx = await contract.setActivityCutoff(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.activityCutoff(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getActivityCutoff(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // networkRegistrationAllowed hyperparameter
      newValue = true;

      tx = await contract.setNetworkRegistrationAllowed(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.networkRegistrationAllowed(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getNetworkRegistrationAllowed(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // networkPowRegistrationAllowed hyperparameter
      newValue = true;

      tx = await contract.setNetworkPowRegistrationAllowed(
        newSubnetId,
        newValue
      );
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.networkPowRegistrationAllowed(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getNetworkPowRegistrationAllowed(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // minBurn hyperparameter. only sudo can set it now
      // newValue = 112;

      // tx = await contract.setMinBurn(newSubnetId, newValue);
      // await tx.wait();

      // await usingApi(async (api) => {
      //   onchainValue = Number(
      //     await api.query.subtensorModule.minBurn(newSubnetId)
      //   );
      // });

      // valueFromContract = Number(await contract.getMinBurn(newSubnetId));

      // expect(valueFromContract).to.eq(newValue);
      // expect(valueFromContract).to.eq(onchainValue);

      // maxBurn hyperparameter
      newValue = 113;

      tx = await contract.setMaxBurn(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.maxBurn(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getMaxBurn(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // difficulty hyperparameter
      newValue = 114;

      tx = await contract.setDifficulty(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.difficulty(newSubnetId)
        );
      });

      valueFromContract = Number(await contract.getDifficulty(newSubnetId));

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // bondsMovingAverage hyperparameter
      newValue = 115;

      tx = await contract.setBondsMovingAverage(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.bondsMovingAverage(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getBondsMovingAverage(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // commitRevealWeightsEnabled hyperparameter
      newValue = true;

      tx = await contract.setCommitRevealWeightsEnabled(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.commitRevealWeightsEnabled(
            newSubnetId
          )
        );
      });

      valueFromContract = Boolean(
        await contract.getCommitRevealWeightsEnabled(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // liquidAlphaEnabled hyperparameter
      newValue = true;

      tx = await contract.setLiquidAlphaEnabled(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Boolean(
          await api.query.subtensorModule.liquidAlphaOn(newSubnetId)
        );
      });

      valueFromContract = Boolean(
        await contract.getLiquidAlphaEnabled(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // alphaValues hyperparameter
      newValue = 118;
      // alphaHigh must bigger than 52428
      const alphaHigh = 52429;
      tx = await contract.setAlphaValues(newSubnetId, newValue, 52429);
      await tx.wait();

      const valueFromContractPair = await contract.getAlphaValues(newSubnetId);

      valueFromContract = Number(valueFromContractPair[0]);
      expect(Number(valueFromContractPair[1])).to.eq(alphaHigh);

      await usingApi(async (api) => {
        const onchainValuePair = await api.query.subtensorModule.alphaValues(
          newSubnetId
        );
        onchainValue = Number(onchainValuePair[0]);
        expect(Number(onchainValuePair[1])).to.eq(alphaHigh);
      });

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);

      // commitRevealWeightsInterval hyperparameter
      newValue = 119;

      tx = await contract.setCommitRevealWeightsInterval(newSubnetId, newValue);
      await tx.wait();

      await usingApi(async (api) => {
        onchainValue = Number(
          await api.query.subtensorModule.revealPeriodEpochs(newSubnetId)
        );
      });

      valueFromContract = Number(
        await contract.getCommitRevealWeightsInterval(newSubnetId)
      );

      expect(valueFromContract).to.eq(newValue);
      expect(valueFromContract).to.eq(onchainValue);
    });
  });
});
