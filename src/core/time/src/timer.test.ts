import * as time from './index';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('Timer', () => {
  it('starts by default.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(true);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
  });

  it('supports disabled autostart on creation.', async () => {
    const timer = time.createTimer({
      duration: { seconds: 5 },
      autoStart: false,
    });

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
  });

  it('can start a paused timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    expect(timer.pause()).toBe(true);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);

    expect(timer.start()).toBe(true);
    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(time.duration.toMilliseconds(timer.remaining)).toBe(3000);
  });

  it('does not start if already running.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.start()).toBe(false);

    jest.advanceTimersByTime(4000);
    await drainEventLoop();

    expect(timer.start()).toBe(false);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(true);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
  });

  it('does not pause if already paused.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    expect(timer.pause()).toBe(true);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);

    expect(timer.pause()).toBe(false);

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.pause()).toBe(false);
  });

  it('resets the timer to the original duration.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);

    expect(timer.reset()).toBe(true);

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);

    jest.advanceTimersByTime(4000);
    await drainEventLoop();

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(1000);
  });

  it('can reset a paused timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.pause()).toBe(true);

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.reset()).toBe(true);

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(true);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
  });

  it('can reset without auto-start.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    jest.advanceTimersByTime(1000);
    await drainEventLoop();

    expect(timer.running).toBe(true);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);

    expect(timer.reset(false)).toBe(true);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
  });

  it('can complete a running timer immediately.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    expect(timer.running).toBe(true);

    expect(timer.complete()).toBe(true);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(true);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
  });

  it('can complete a paused timer immediately.', async () => {
    const timer = time.createTimer({
      duration: { seconds: 5 },
      autoStart: false,
    });

    expect(timer.running).toBe(false);

    expect(timer.complete()).toBe(true);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(true);
    expect(timer.cancelled).toBe(false);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
  });

  it('prevents duplicate completion.', async () => {
    const timer = time.createTimer({
      duration: { seconds: 5 },
      autoStart: false,
    });

    expect(timer.complete()).toBe(true);
    expect(timer.complete()).toBe(false);
  });

  it('can cancel a running timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    expect(timer.running).toBe(true);

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
  });

  it('can cancel a paused timer.', async () => {
    const timer = time.createTimer({
      duration: { seconds: 5 },
      autoStart: false,
    });

    expect(timer.running).toBe(false);

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
    expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
  });

  it('prevents starting a cancelled timer.', async () => {
    const timer = time.createTimer({
      duration: { seconds: 5 },
      autoStart: false,
    });

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);

    expect(timer.start()).toBe(false);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
  });

  it('prevents pausing a cancelled timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);

    expect(timer.pause()).toBe(false);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
  });

  it('prevents resetting a cancelled timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);

    expect(timer.reset()).toBe(false);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
  });

  it('prevents completing a cancelled timer.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    timer.cancel();

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);

    expect(timer.complete()).toBe(false);

    expect(timer.running).toBe(false);
    expect(timer.completed).toBe(false);
    expect(timer.cancelled).toBe(true);
  });

  it('emits the complete event when the timer naturally completes.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    const onComplete = jest.fn();
    timer.on('complete', onComplete);

    jest.advanceTimersByTime(5000);
    await drainEventLoop();

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('emits the complete event when the timer manually completes.', async () => {
    const timer = time.createTimer({ duration: { seconds: 5 } });

    const onComplete = jest.fn();
    timer.on('complete', onComplete);

    timer.complete();

    expect(onComplete).toHaveBeenCalledTimes(1);
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
