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
        zari: keyring.addFromUri('//Zari')
    };
}
