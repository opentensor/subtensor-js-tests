import { Keyring } from '@polkadot/api';

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
        zari: keyring.addFromUri('//Zari')
    };
}
