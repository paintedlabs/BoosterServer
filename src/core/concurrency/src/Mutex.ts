import * as sharedMutexModule from './SharedMutex';

/**
 * Represents a mutual exclusion (Mutex) mechanism which allows asynchronous
 * logic to control exclusive access to shared resources.
 *
 * @see https://en.wikipedia.org/wiki/Lock_(computer_science)
 */
export type Mutex = {
  /**
   * Runs a given function exclusively, ensuring no other tasks which rely on
   * this mutex (via `runExclusive` or `acquireLock`) are running until this
   * function completes.
   *
   * @param runner - The function to be run exclusively.
   *
   * @returns A promise that resolves to the result of the `runner` function
   *   once it completes execution.
   */
  runExclusive: <R>(runner: () => R) => Promise<Awaited<R>>;

  /**
   * Acquires a "lock", aka when this Promise resolves, the receiving context
   * will be guaranteed that no other contexts can acquire a lock from this
   * mutex until the acquired lock is released.
   *
   * **NOTE:** Almost always prefer to use `runExclusive` which is carefully
   * designed to always release the lock during error scenarios. Manual lock
   * management runs the risk of accidentally never releasing a lock which is a
   * common cause of deadlocks.
   *
   * @returns A promise that resolves to a `Lock` object, which can be used to
   *   release the acquired lock.
   */
  acquireLock: () => Promise<Lock>;

  /**
   * Variant of `acquireLock` that immediately acquires a lock if available and
   * returns null otherwise.
   *
   * Note that this method is extremely situationally useful and generally
   * clients should prefer `acquireLock` which automatically waits for lock
   * availability unlike this method which never waits.
   *
   * @returns A `Lock` object which can be used to release the acquired lock, or
   *   null if the lock is unavailable.
   */
  acquireLockImmediate: () => Lock | null;
};

/**
 * Represents a lock acquired from a `Mutex`, which can be manually released.
 */
export type Lock = {
  /**
   * Releases the lock, allowing other contexts to acquire a lock from the
   * original mutex.
   *
   * @returns `true` if the lock was successfully released; otherwise, `false`
   *   if this lock was not the active lock and therefore had no impact on the
   *   `Mutex`.
   */
  release: () => boolean;
};

/**
 * Creates and returns a new Mutex instance, which can be used to control access
 * to a shared resource.
 *
 * @returns A new `Mutex` instance.
 */
export const createMutex = (): Mutex => {
  const sharedMutex = sharedMutexModule.createSharedMutex();

  const acquireLock: Mutex['acquireLock'] = async () =>
    wrapLock(await sharedMutex.acquireExclusiveLock());

  const acquireLockImmediate: Mutex['acquireLockImmediate'] = () => {
    const lock = sharedMutex.acquireExclusiveLockImmediate();
    if (lock == null) {
      return null;
    }

    return wrapLock(lock);
  };

  const runExclusive: Mutex['runExclusive'] = (runner) =>
    sharedMutex.runExclusive(runner);

  return {
    runExclusive,
    acquireLock,
    acquireLockImmediate,
  };
};

const wrapLock = (lock: sharedMutexModule.SharedLock): Lock => ({
  release: () => lock.release(),
});
