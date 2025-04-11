import * as status from '@core/status';

import * as time from './index';

beforeEach(() => {
  jest.useFakeTimers();
});

describe('doWithRetry', () => {
  it('infinite maxRetries only returns after a success.', async () => {
    const mockCallback = jest.fn(
      (): status.StatusOr<string> => status.fromError('Expected error.'),
    );

    const observer = createPromiseObserver(
      time.doWithRetry(mockCallback, {
        maxRetries: Infinity,
      }),
    );

    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(1);

    jest.advanceTimersByTime(1000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(2);

    jest.advanceTimersByTime(2000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(3);

    jest.advanceTimersByTime(4000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(4);

    // Change the mocked function to return a successful status and wait 500ms.
    // Then validate that doWithRetry has returned the successful status.

    mockCallback.mockImplementation(() => status.fromValue('Success!'));

    jest.advanceTimersByTime(8000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(5);
    expect(observer.state).toStrictEqual({
      resolved: status.fromValue('Success!'),
    });
  });

  it('will early return an error if max retries is hit.', async () => {
    const mockCallback = jest.fn(
      (): status.StatusOr<string> => status.fromError('Expected error.'),
    );

    const observer = createPromiseObserver(
      time.doWithRetry(mockCallback, {
        maxRetries: 2,
      }),
    );

    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(1);

    jest.advanceTimersByTime(1000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(2);

    jest.advanceTimersByTime(2000);
    await drainEventLoop();
    expect(mockCallback.mock.calls.length).toBe(3);

    expect(observer.state).toMatchObject({
      resolved: {
        error: 'Expected error.',
      },
    });
  });
});

type PromiseObserver<T> = {
  readonly state: { resolved: T } | { rejected: Error } | null;
};

const createPromiseObserver = <T>(promise: Promise<T>): PromiseObserver<T> => {
  let state: PromiseObserver<T>['state'] = null;

  promise.then((value) => {
    state = { resolved: value };
  });

  promise.catch((error) => {
    state = { rejected: error };
  });

  return {
    get state() {
      return state;
    },
  };
};

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
