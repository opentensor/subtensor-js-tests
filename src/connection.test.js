import { usingApi } from './util/comm.js';
import { expect } from 'chai';

describe('Connection', () => {
  it('Connection can be established', async () => {
    await usingApi(async api => {
      const health = await api.rpc.system.health();
      expect(health).to.be.not.empty;
    });
  });
});
