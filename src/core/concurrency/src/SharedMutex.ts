import * as typesafety from '@core/typesafety';

/**
 * The `SharedMutex` is a synchronization primitive that can be used to protect
 * shared data from being simultaneously accessed by multiple async contexts. In
 * contrast to other mutex types which facilitate exclusive access, a
 * `SharedMutex` has two levels of access:
 *
 * 1. shared ~ several locks can be concurrently held.
 * 2. exclusive ~ only a single lock can be held.
 *
 * If one has acquired the exclusive lock, no other locks (including shared) can
 * be acquired.
 *
 * If one has acquired a shared lock, no other thread can acquire the exclusive
 * lock, but can acquire another shared lock.
 *
 * The `SharedMutex` is especially useful when shared data can be safely read by
 * any number of contexts simultaneously, but writes must occur exclusively when
 * no other context is reading or writing.
 *
 * @see https://en.wikipedia.org/wiki/Readers%E2%80%93writer_lock
 * @see https://en.cppreference.com/w/cpp/thread/shared_mutex
 */
export type SharedMutex = {
  /**
   * Runs the given function with a shared lock, allowing other shared locks to
   * be acquired concurrently but preventing exclusive locks until the function
   * completes.
   *
   * @param runner - The function to be run with a shared lock.
   *
   * @returns A promise that resolves to the result of the `runner` function
   *   once it completes execution.
   */
  runShared: <R>(runner: () => R) => Promise<Awaited<R>>;

  /**
   * Runs the given function exclusively, ensuring no other locks may be
   * acquired until the function completes.
   *
   * @param runner - The function to be run exclusively.
   *
   * @returns A promise that resolves to the result of the `runner` function
   *   once it completes execution.
   */
  runExclusive: <R>(runner: () => R) => Promise<Awaited<R>>;

  /**
   * Acquires a shared lock asynchronously or synchronously. If the lock cannot
   * be acquired immediately, it will wait until it becomes available.
   *
   * **NOTE:** Almost always prefer to use `runShared` which is carefully
   * designed to always release the lock during error scenarios. Manual lock
   * management runs the risk of accidentally never releasing a lock which is a
   * common cause of deadlocks.
   *
   * @returns A promise or value representing the acquired shared lock.
   */
  acquireSharedLock: () => typesafety.AsyncOrSync<SharedLock>;

  /**
   * Acquires an exclusive lock asynchronously or synchronously. If the lock
   * cannot be acquired immediately, it will wait until it becomes available.
   *
   * **NOTE:** Almost always prefer to use `runExclusive` which is carefully
   * designed to always release the lock during error scenarios. Manual lock
   * management runs the risk of accidentally never releasing a lock which is a
   * common cause of deadlocks.
   *
   * @returns A promise or value representing the acquired exclusive lock.
   */
  acquireExclusiveLock: () => typesafety.AsyncOrSync<SharedLock>;

  /**
   * Attempts to acquire a shared lock immediately without waiting. If the lock
   * is not available, this method returns `null`.
   *
   * @returns The acquired shared lock if available, otherwise `null`.
   */
  acquireSharedLockImmediate: () => SharedLock | null;

  /**
   * Attempts to acquire an exclusive lock immediately without waiting. If the
   * lock is not available, this method returns `null`.
   *
   * @returns The acquired exclusive lock if available, otherwise `null`.
   */
  acquireExclusiveLockImmediate: () => SharedLock | null;
};

/**
 * Represents a lock acquired from a `SharedMutex`, which can be manually
 * released.
 */
export type SharedLock = {
  readonly shared: boolean;

  /**
   * Releases the lock
   *
   * @returns `true` if the lock was successfully released; otherwise, `false`
   *   if this lock was not the active lock and therefore had no impact on the
   *   `Mutex`.
   */
  release: () => boolean;
};

/**
 * Creates and returns a new `SharedMutex` instance, which can be used to
 * control access to a shared resource.
 *
 * @returns A new `SharedMutex` instance.
 */
export const createSharedMutex = (): SharedMutex => {
  // The mode governs when the `SharedMutex` is permitted to create different
  // kinds of locks. See `SharedMutexMode` for more details.
  let mode: SharedMutexMode = SharedMutexMode.FREE;

  // A FIFO queue of async contexts waiting for a lock.
  const waitingContexts: Array<WaitingContext> = [];

  // Locks which are currently leased out, waiting for release.
  const activeLocks = new Set<SharedLock>();

  const createLock = (args: { shared: boolean }): SharedLock => {
    const { shared } = args;

    const lock = {
      get shared() {
        return shared;
      },

      release: () => {
        if (!activeLocks.delete(lock)) {
          return false;
        }

        if (activeLocks.size === 0) {
          mode = SharedMutexMode.FREE;
          activeNextContext();
        }

        return true;
      },
    };

    activeLocks.add(lock);
    return lock;
  };

  const activeNextContext = (): void => {
    if (mode !== SharedMutexMode.FREE || waitingContexts.length === 0) {
      return;
    }

    // If the first waiting context is exclusive, we simply activate it.
    if (!waitingContexts[0].shared) {
      mode = SharedMutexMode.EXCLUSIVE;
      waitingContexts[0].activate();
      waitingContexts.shift();
      return;
    }

    // If the first waiting context is shared, then we must activate all shared
    // contexts until we encounter an exclusive context.
    while (waitingContexts.length > 0 && waitingContexts[0].shared) {
      waitingContexts[0].activate();
      waitingContexts.shift();
    }

    // Once we've finished activating shared contexts, we should be in one of
    // two scenarios:
    //
    // 1. We've activated every waiting context.
    // 2. We stopped activating shared contexts because we're waiting on an
    //    exclusive context.
    //
    // If (2) has occured, we need to switch the mutex into `EXCLUSIVE` mode to
    // prevent additional calls to `acquireShared` from starving the waiting
    // exclusive context.
    mode =
      waitingContexts.length > 0
        ? SharedMutexMode.EXCLUSIVE
        : SharedMutexMode.SHARED;
  };

  const runShared: SharedMutex['runShared'] = async <R>(
    runner: () => R,
  ): Promise<Awaited<R>> => {
    const lock = await acquireSharedLock();
    try {
      return await runner();
    } finally {
      lock.release();
    }
  };

  const runExclusive: SharedMutex['runExclusive'] = async <R>(
    runner: () => R,
  ): Promise<Awaited<R>> => {
    const lock = await acquireExclusiveLock();
    try {
      return await runner();
    } finally {
      lock.release();
    }
  };

  const acquireSharedLock: SharedMutex['acquireSharedLock'] = () => {
    const lock = acquireSharedLockImmediate();
    if (lock != null) {
      return lock;
    }

    return new Promise<SharedLock>((resolve) => {
      waitingContexts.push({
        shared: true,
        activate: () => {
          resolve(createLock({ shared: true }));
        },
      });
    });
  };

  const acquireExclusiveLock: SharedMutex['acquireExclusiveLock'] = () => {
    const lock = acquireExclusiveLockImmediate();
    if (lock != null) {
      return lock;
    }

    // It's important that we transition to exclusive mode so that additional
    // shared locks must be created *after* the exclusive lock resolves,
    // preventing shared locks from starving exclusive locks.
    mode = SharedMutexMode.EXCLUSIVE;

    return new Promise<SharedLock>((resolve) => {
      waitingContexts.push({
        shared: false,
        activate: () => {
          resolve(createLock({ shared: false }));
        },
      });
    });
  };

  const acquireSharedLockImmediate: SharedMutex['acquireSharedLockImmediate'] =
    () => {
      switch (mode) {
        case SharedMutexMode.FREE:
        case SharedMutexMode.SHARED: {
          mode = SharedMutexMode.SHARED;
          return createLock({ shared: true });
        }

        case SharedMutexMode.EXCLUSIVE:
          return null;
      }
    };

  const acquireExclusiveLockImmediate: SharedMutex['acquireExclusiveLockImmediate'] =
    () => {
      switch (mode) {
        case SharedMutexMode.FREE: {
          mode = SharedMutexMode.EXCLUSIVE;
          return createLock({ shared: false });
        }

        case SharedMutexMode.SHARED:
        case SharedMutexMode.EXCLUSIVE:
          return null;
      }
    };

  return {
    runShared,
    runExclusive,
    acquireSharedLock,
    acquireExclusiveLock,
    acquireSharedLockImmediate,
    acquireExclusiveLockImmediate,
  };
};

type WaitingContext = {
  shared: boolean;
  activate: () => void;
};

enum SharedMutexMode {
  // Indicates that no locks are currently held, allowing the `SharedMutex` to
  // mint any kind of lock.
  FREE = 'FREE',

  // Indicates that a shared lock is currently held *AND* that no exclusive
  // locks are waiting. Meaning that the `SharedMutex` may mint additional
  // shared locks.
  SHARED = 'SHARED',

  // Indicates that either an exclusive lock is currently held *OR* an exclusive
  // lock is waiting. In either case, no other locks may be immediately
  // acquired. All current locks must be drained and additional contexts forced
  // to wait until the exclusive lock is released.
  EXCLUSIVE = 'EXCLUSIVE',
}
