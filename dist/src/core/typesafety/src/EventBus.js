"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBus = void 0;
/**
 * This module enhances the standard `EventEmitter` interface, commonly used in
 * browsers and Node.js for creating observable JavaScript interfaces. It
 * introduces a type-safe variant called `EventBus`, which wraps around the
 * traditional, less type-safe `EventEmitter`. This approach ensures better type
 * safety and code reliability when working with event-driven programming.
 */
const events = __importStar(require("events"));
/**
 * Create an event bus.
 *
 * @returns EventBus
 */
const createEventBus = () => {
    // This cast is necessary because by default `EventEmitter` is not typesafe
    // and we achieve typesafety using `typed-emitter` which requires a cast by
    // design.
    const eventBus = new events.EventEmitter();
    const emitter = {
        emit(event, ...args) {
            return eventBus.emit(event, ...args);
        },
    };
    const subscriber = {
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
exports.createEventBus = createEventBus;
