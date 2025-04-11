import * as time from '@core/time';

import * as concurrency from './index';

describe('Mutex', () => {
  it('Single lock acquisition and release succeeds.', async () => {
    const mutex = concurrency.createMutex();
    const lock = await mutex.acquireLock();
    expect(lock.release()).toBe(true);
  });

  it('Sequential lock acquisition and release succeeds.', async () => {
    const mutex = concurrency.createMutex();

    const firstLock = await mutex.acquireLock();
    expect(firstLock.release()).toBe(true);

    const secondLock = await mutex.acquireLock();
    expect(secondLock.release()).toBe(true);
  });

  it('Non-active locks may not release the mutex.', async () => {
    const mutex = concurrency.createMutex();

    const firstLock = await mutex.acquireLock();
    expect(firstLock.release()).toBe(true);

    const secondLock = await mutex.acquireLock();
    expect(firstLock.release()).toBe(false);
    expect(firstLock.release()).toBe(false);
    expect(mutex.acquireLockImmediate()).toBe(null);
    expect(secondLock.release()).toBe(true);
  });

  it('denies additional locks until release.', async () => {
    const mutex = concurrency.createMutex();

    const lock = await mutex.acquireLockImmediate();
    expect(lock).not.toBe(null);

    expect(mutex.acquireLockImmediate()).toBe(null);
    expect(mutex.acquireLockImmediate()).toBe(null);
    expect(mutex.acquireLockImmediate()).toBe(null);

    expect(lock?.release()).toBe(true);
    expect(mutex.acquireLockImmediate()).not.toBe(null);
  });

  it('Different mutexes are not exclusive.', async () => {
    const mutexFoo = concurrency.createMutex();
    const mutexBar = concurrency.createMutex();
    const lockFoo = await mutexFoo.acquireLock();
    const lockBar = await mutexBar.acquireLock();
    expect(lockFoo.release()).toBe(true);
    expect(lockBar.release()).toBe(true);
  });

  it('Contexts are woken up in FIFO order.', async () => {
    const mutex = concurrency.createMutex();
    const startLatch = await mutex.acquireLock();

    const results: Array<number> = [];
    const runners = [
      mutex.runExclusive(() => {
        results.push(1);
      }),
      mutex.runExclusive(() => {
        expect(results).toStrictEqual([1]);
        results.push(2);
      }),
      mutex.runExclusive(() => {
        expect(results).toStrictEqual([1, 2]);
        results.push(3);
      }),
    ];

    expect(results).toStrictEqual([]);
    startLatch.release();
    await Promise.all(runners);
    expect(results).toStrictEqual([1, 2, 3]);
  });

  it('runExclusive executes tasks exclusively.', async () => {
    const mutex = concurrency.createMutex();
    let activeTask = 0;

    const simulateAsyncTask = <R>(returnValue: R) =>
      mutex.runExclusive(async () => {
        // Ensure no other task is running.
        expect(activeTask).toBe(0);
        ++activeTask;

        // Wait a random number of milliseconds to simulate real workloads.
        await time.sleep({ milliseconds: Math.random() * 100 });

        // Ensure the task is still the only one active.
        expect(activeTask).toBe(1);
        --activeTask;

        return returnValue;
      });

    // Initiate multiple concurrent tasks.
    const tasks = Promise.all(
      [1, 2, 3, 4, 5].map((id) => simulateAsyncTask(id)),
    );

    // Wait for all tasks to complete.
    await expect(tasks).resolves.toStrictEqual([1, 2, 3, 4, 5]);
  });

  it('Handles high contention without race conditions.', async () => {
    /// It's hard to test for race conditions deterministically. So instead we
    /// attempt to overwhelm the mutex with a common scenario: many concurrent
    /// lock acquisition requests which all read state, wait, and then write to
    /// state. Without a mutex, this is ensured to create malformed state. With
    /// a mutex is should never create malformed state.

    const mutex = concurrency.createMutex();
    let sharedState = 0;

    const updateSharedState = async () => {
      const lock = await mutex.acquireLock();
      const currentState = sharedState;
      await time.sleep({ milliseconds: Math.random() * 10 });
      sharedState = currentState + 1;
      lock.release();
    };

    const tasks = [];
    for (let i = 0; i < 1000; i++) {
      tasks.push(updateSharedState());
    }
    await Promise.all(tasks);

    // The shared state should reflect atomic increments if the mutex is working
    // correctly. If the mutex has misbehaved, it will be less than 1000 as a
    // result of state being overwitten due to overlapping lock acquisitions.
    expect(sharedState).toBe(1000);
  }, 15000);

  it('runExclusive releases when unexpected errors occur.', async () => {
    const mutex = concurrency.createMutex();

    await expect(
      mutex.runExclusive(() => {
        throw new Error('Expected Error');
      }),
    ).rejects.toThrow(Error);

    // Desite the previous `runExclusive` call being interrupted by an error,
    // the mutex is released as indicated by our ability to re-acquire a lock.
    expect(await mutex.runExclusive(() => 100)).toBe(100);
  });
});
