import * as concurrency from './index';

describe('Deferred', () => {
  it('Can resolve a deferred promise.', async () => {
    const deferred = concurrency.createDeferred<number>();
    deferred.resolve(100);
    expect(await deferred.promise).toBe(100);
  });

  it('Can reject a deferred promise.', async () => {
    const deferred = concurrency.createDeferred<number>();
    deferred.reject(new Error('Expected Failure'));
    await expect(deferred.promise).rejects.toThrow('Expected Failure');
  });
});
