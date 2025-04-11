import * as time from './index';

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(global, 'setTimeout');
  jest.spyOn(global, 'clearTimeout');
});

describe('sleep', () => {
  it('resolves after the designated duration.', async () => {
    let sleepResult: time.SleepResult | null = null;
    time.sleep({ seconds: 5 }).then((resolvedSleepResult) => {
      sleepResult = resolvedSleepResult;
    });

    jest.advanceTimersByTime(4999);
    await drainEventLoop();
    expect(sleepResult).toBe(null);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();
    expect(sleepResult).toStrictEqual({ cancelled: false });
  });

  it('can be cancelled before the desired duration.', async () => {
    const abortController = new AbortController();

    let sleepResult: time.SleepResult | null = null;
    time
      .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
      .then((resolvedSleepResult) => {
        sleepResult = resolvedSleepResult;
      });

    jest.advanceTimersByTime(2000);
    await drainEventLoop();
    expect(sleepResult).toBe(null);

    abortController.abort();
    await drainEventLoop();
    expect(sleepResult).toStrictEqual({ cancelled: true });
  });

  it('clears all timers when cancelled.', async () => {
    expect(jest.getTimerCount()).toBe(0);

    const abortController = new AbortController();
    time.sleep({ seconds: 5 }, { abortSignal: abortController.signal });

    expect(jest.getTimerCount()).toBe(1);

    abortController.abort();
    await drainEventLoop();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancellation after the desired duration does nothing.', async () => {
    const abortController = new AbortController();

    let sleepResult: time.SleepResult | null = null;
    time
      .sleep({ seconds: 5 }, { abortSignal: abortController.signal })
      .then((resolvedSleepResult) => {
        sleepResult = resolvedSleepResult;
      });

    jest.advanceTimersByTime(5000);
    await drainEventLoop();
    expect(sleepResult).toStrictEqual({ cancelled: false });

    abortController.abort();
    await drainEventLoop();
    expect(sleepResult).toStrictEqual({ cancelled: false });
  });

  it('does not clear any timers when cancelled after completion.', async () => {
    expect(jest.getTimerCount()).toBe(0);

    const abortController = new AbortController();
    time.sleep({ seconds: 5 }, { abortSignal: abortController.signal });

    expect(jest.getTimerCount()).toBe(1);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(jest.getTimerCount()).toBe(0);

    abortController.abort();
    await drainEventLoop();

    expect(jest.getTimerCount()).toBe(0);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(clearTimeout).toHaveBeenCalledTimes(0);
  });

  it('resolves immediately when the delay is zero.', async () => {
    expect(await time.sleep({ seconds: 0 })).toStrictEqual({
      cancelled: false,
    });
  });

  it('resolves immediately when the delay is negative.', async () => {
    expect(await time.sleep({ seconds: -1 })).toStrictEqual({
      cancelled: false,
    });
  });

  it('resolves immediately when the abort signal is already aborted.', async () => {
    const abortController = new AbortController();
    abortController.abort();

    expect(
      await time.sleep(
        { seconds: 5 },
        { abortSignal: abortController.signal },
      ),
    ).toStrictEqual({ cancelled: true });

    expect(
      await time.sleep(
        { seconds: -1 },
        { abortSignal: abortController.signal },
      ),
    ).toStrictEqual({ cancelled: true });
  });
});

/**
 * It's often necessary when writing tests which mock time, to advance time
 * *and* allow the event loop to resolve any outstanding promises.
 *
 * For example
 *
 * ```ts
 * await sleep({ seconds: 1 });
 * console.log(100);
 * ```
 *
 * Just stepping forward one second wont emit a log statement, the resolved
 * sleep command will be in the event queue and we need to yield control to it
 * in order to log.
 *
 * To achieve this, we have this helper which enforces a 1000 event loop cycles
 * to complete, offering plenty of time for promises to resolve.
 */
const drainEventLoop = async () => {
  for (let i = 0; i < 1000; ++i) await Promise.resolve();
};
