import * as typesafety from '@core/typesafety';

import * as duration from './duration';
import * as sleep from './sleep';

/**
 * The `Timer` interface provides countdown clock, typically used to rate-limit
 * actions or enforce a minimum delay between events. It differs from simpler
 * timing functions like `sleep` (or other delay methods in the time package) in
 * that it offers interactive control over the countdown process.
 */
export type Timer = typesafety.EventSubscriber<TimerEvents> & {
  /**
   * Indicates whether the timer is currently counting down.
   */
  readonly running: boolean;

  /**
   * The remaining duration until the timer naturally completes.
   */
  readonly remaining: duration.Duration;

  /**
   * Indicates whether the timer has completed.
   *
   * When `true`, the timer is not running and the remaining duration is zero.
   * This flag helps differentiate between a paused timer and one that has
   * finished.
   */
  readonly completed: boolean;

  /**
   * Indices whether the timer has been cancelled.
   */
  readonly cancelled: boolean;

  /**
   * Starts or resumes the timer.
   *
   * @returns `true` if the timer was successfully started or resumed;
   *   otherwise, `false`.
   */
  start: () => boolean;

  /**
   * Pauses the timer.
   *
   * @returns `true` if the timer was successfully paused; otherwise, `false`.
   */
  pause: () => boolean;

  /**
   * Resets the timer to its original duration.
   *
   * @param autoStart - Whether to immediately start the timer after resetting.
   *   Defaults to `true`.
   *
   * @returns `true` if the timer was successfully reset; otherwise `false`.
   */
  reset: (autoStart?: boolean) => boolean;

  /**
   * Immediately completes the timer.
   *
   * This method bypasses any remaining duration, triggers the completion
   * behavior, and sets the timer state to complete. After this call, the timer
   * remains inactive until it is reset or started again.
   *
   * @returns `true` if the timer was successfully completed; otherwise,
   *   `false`.
   */
  complete: () => boolean;

  /**
   * Cancels the timer.
   *
   * This method stops the current countdown and prevents the timer from being
   * resumed.
   */
  cancel: () => void;
};

export type TimerEvents = {
  // Emitted when the timer completes naturally or via a forced completion.
  complete: () => void;

  // Emitted when the timer is reset back to its original duration.
  reset: () => void;

  // Emitted when the timer is cancelled.
  cancel: () => void;
};

export type TimerOptions = {
  // The initial duration for the timer.
  duration: duration.Duration;

  // If `true`, the timer will start automatically upon creation.
  //
  // Defaults to `true` if not provided.
  autoStart?: boolean;
};

export const createTimer = (options: TimerOptions): Timer => {
  const optionsWithDefaults: Required<TimerOptions> = {
    autoStart: true,
    ...options,
  };

  const eventBus = typesafety.createEventBus<TimerEvents>();

  let cancelled = false;
  let state: TimerState = {
    running: false,
    remaining: optionsWithDefaults.duration,
  };

  const start: Timer['start'] = () => {
    if (cancelled || state.running || isCompleted()) {
      return false;
    }

    const sleepAbortController = new AbortController();

    sleep
      .sleep(state.remaining, { abortSignal: sleepAbortController.signal })
      .then((sleepResult) => {
        if (cancelled || sleepResult.cancelled) {
          return;
        }

        state = {
          running: false,
          remaining: { milliseconds: 0 },
        };

        eventBus.emitter.emit('complete');
      });

    state = {
      running: true,
      endTime: new Date(Date.now() + duration.toMilliseconds(state.remaining)),
      sleepAbortController,
    };

    return true;
  };

  const pause: Timer['pause'] = () => {
    if (cancelled || !state.running) {
      return false;
    }

    state.sleepAbortController.abort();
    state = {
      running: false,
      remaining: getRemaining(),
    };

    return true;
  };

  const reset: Timer['reset'] = (autoStart) => {
    if (cancelled) {
      return false;
    }

    pause();

    state = {
      running: false,
      remaining: optionsWithDefaults.duration,
    };

    if (autoStart ?? true) {
      start();
    }

    eventBus.emitter.emit('reset');

    return true;
  };

  const complete: Timer['complete'] = () => {
    if (cancelled || isCompleted()) {
      return false;
    }

    pause();

    state = {
      running: false,
      remaining: { milliseconds: 0 },
    };

    eventBus.emitter.emit('complete');

    return true;
  };

  const cancel: Timer['cancel'] = () => {
    if (cancelled) {
      return;
    }

    pause();
    cancelled = true;
    eventBus.emitter.emit('cancel');
  };

  const getRemaining = (): Timer['remaining'] => {
    if (!state.running) {
      return state.remaining;
    }

    return { milliseconds: state.endTime.getTime() - Date.now() };
  };

  const isCompleted = (): Timer['completed'] =>
    !state.running && duration.toMilliseconds(state.remaining) <= 0;

  if (optionsWithDefaults.autoStart) {
    start();
  }

  return Object.assign(
    {
      get running() {
        return state.running;
      },
      get remaining() {
        return getRemaining();
      },
      get completed() {
        return isCompleted();
      },
      get cancelled() {
        return cancelled;
      },
      start,
      pause,
      reset,
      complete,
      cancel,
    },
    eventBus.subscriber,
  );
};

type TimerState = PausedTimerState | RunningTimerState;

type PausedTimerState = {
  running: false;
  remaining: duration.Duration;
};

type RunningTimerState = {
  running: true;
  endTime: Date;
  sleepAbortController: AbortController;
};
