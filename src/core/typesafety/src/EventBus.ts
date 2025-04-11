/**
 * This module enhances the standard `EventEmitter` interface, commonly used in
 * browsers and Node.js for creating observable JavaScript interfaces. It
 * introduces a type-safe variant called `EventBus`, which wraps around the
 * traditional, less type-safe `EventEmitter`. This approach ensures better type
 * safety and code reliability when working with event-driven programming.
 */

import * as events from 'events';

import type * as typedEmitter from 'typed-emitter';

/**
 * Defines a mapping of event names to their corresponding listener functions.
 * This mapping is used to parameterize an `EventBus`, ensuring type-safe event
 * handling. For example:
 *
 * ```ts
 * type MyEventBus = EventBus<{
 *   change: (event: ChangeEvent) => void;
 *   submit: (event: SubmitEvent) => void;
 * }>;
 * ```
 */
export type EventMap = {
  // Typically we disallow explict `any` in the codebase, but here it's required
  // as `EventMap` is intended to be a base type from which generics are
  // inferred, resulting in `any` being coerced to concrete types.
  //
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: Array<any>) => void;
};

/**
 * Represents a type-safe event bus, an abstraction over the native
 * `EventEmitter` that enforces type safety. It divides the functionality into
 * two roles: `emitter` for emitting events and `subscriber` for subscribing to
 * events. This division helps in controlling access rights within the system,
 * allowing for better encapsulation and separation of concerns.
 *
 * @see https://nodejs.org/api/events.html for more information on the native
 *   `EventEmitter`.
 */
export type EventBus<Events extends EventMap> = {
  emitter: EventEmitter<Events>;
  subscriber: EventSubscriber<Events>;
};

/**
 * Defines the capabilities of an event emitter focused on emitting events. It
 * includes methods for emitting events, ensuring that the event names and
 * parameters match the defined `EventMap` for type safety.
 *
 * @see https://nodejs.org/api/events.html for more information on the native
 *   `EventEmitter`.
 */
export type EventEmitter<Events extends EventMap> = {
  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): boolean;
};

/**
 * Defines the capabilities of an event emitter focused on receiving or
 * subscribing to events. It includes methods for adding and removing listeners,
 * querying listener information, and managing listener counts and maximum
 * listeners, all while ensuring type safety with respect to the defined
 * `EventMap`.
 *
 * @see https://nodejs.org/api/events.html for more information on the native
 *   `EventEmitter`.
 */
export type EventSubscriber<Events extends EventMap> = {
  addListener<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;
  on<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;
  once<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;
  prependListener<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;
  prependOnceListener<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;

  off<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;
  removeAllListeners<E extends keyof Events>(
    event?: E,
  ): EventSubscriber<Events>;
  removeListener<E extends keyof Events>(
    event: E,
    listener: Events[E],
  ): EventSubscriber<Events>;

  rawListeners<E extends keyof Events>(event: E): Array<Events[E]>;
  listeners<E extends keyof Events>(event: E): Array<Events[E]>;
  listenerCount<E extends keyof Events>(event: E): number;

  getMaxListeners(): number;
  setMaxListeners(maxListeners: number): EventSubscriber<Events>;
};

/**
 * Create an event bus.
 *
 * @returns EventBus
 */
export const createEventBus = <
  Events extends EventMap,
>(): EventBus<Events> => {
  // This cast is necessary because by default `EventEmitter` is not typesafe
  // and we achieve typesafety using `typed-emitter` which requires a cast by
  // design.
  const eventBus = new events.EventEmitter() as typedEmitter.default<Events>;

  const emitter: EventEmitter<Events> = {
    emit(event, ...args) {
      return eventBus.emit(event, ...args);
    },
  };

  const subscriber: EventSubscriber<Events> = {
    addListener(event, listener) {
      eventBus.addListener(event, listener);
      return subscriber;
    },

    on(event, listener) {
      eventBus.on(event, listener);
      return subscriber;
    },

    once(event, listener) {
      eventBus.once(event, listener);
      return subscriber;
    },

    prependListener(event, listener) {
      eventBus.prependListener(event, listener);
      return subscriber;
    },

    prependOnceListener(event, listener) {
      eventBus.prependOnceListener(event, listener);
      return subscriber;
    },

    off(event, listener) {
      eventBus.off(event, listener);
      return subscriber;
    },

    removeAllListeners(event) {
      eventBus.removeAllListeners(event);
      return subscriber;
    },

    removeListener(event, listener) {
      eventBus.removeListener(event, listener);
      return subscriber;
    },

    rawListeners(event) {
      return eventBus.rawListeners(event);
    },

    listeners(event) {
      return eventBus.listeners(event);
    },

    listenerCount(event) {
      return eventBus.listenerCount(event);
    },

    getMaxListeners() {
      return eventBus.getMaxListeners();
    },

    setMaxListeners(maxListeners) {
      eventBus.setMaxListeners(maxListeners);
      return subscriber;
    },
  };

  return {
    emitter,
    subscriber,
  };
};
