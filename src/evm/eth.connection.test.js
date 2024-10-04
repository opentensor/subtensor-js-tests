import { usingEthApi } from '../util/comm.js';
import { expect } from 'chai';

describe('Connection to Ethereum RPC', () => {
  it('Block number can be read', async () => {
    await usingEthApi(async provider => {
      const blockNumber = await provider.getBlockNumber();
      expect(blockNumber).to.be.a('number');
      expect(blockNumber > 0);
    });
  });
});
