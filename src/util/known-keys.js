import { Keyring } from '@polkadot/api';
import { randomBytes } from 'crypto';
import { ethers } from "ethers";

export function getTestKeys() {
    const keyring = new Keyring({ type: 'sr25519' });
    return {
        alice: keyring.addFromUri('//Alice'),
        aliceHot: keyring.addFromUri('//AliceHot'),
        bob: keyring.addFromUri('//Bob'),
        bobHot: keyring.addFromUri('//BobHot'),
        charlie: keyring.addFromUri('//Charlie'),
        charlieHot: keyring.addFromUri('//CharlieHot'),
        dave: keyring.addFromUri('//Dave'),
        daveHot: keyring.addFromUri('//DaveHot'),
        eve: keyring.addFromUri('//Eve'),
        zari: keyring.addFromUri('//Zari'),
        test: keyring.addFromUri('diary drift squeeze nerve forward swift flip exact other crane guard work'),
        testEth: ethers.Wallet.fromPhrase('diary drift squeeze nerve forward swift flip exact other crane guard work'),
    };
}

export function getRandomKeypair() {
    const keyring = new Keyring({ type: 'sr25519' });
    const seed = randomBytes(32);
    return keyring.addFromSeed(seed)
}
