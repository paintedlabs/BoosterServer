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
exports.createTimer = void 0;
const typesafety = __importStar(require("@core/typesafety"));
const duration = __importStar(require("./duration"));
const sleep = __importStar(require("./sleep"));
const createTimer = (options) => {
    const optionsWithDefaults = Object.assign({ autoStart: true }, options);
    const eventBus = typesafety.createEventBus();
    let cancelled = false;
    let state = {
        running: false,
        remaining: optionsWithDefaults.duration,
    };
    const start = () => {
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
    const pause = () => {
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
    const reset = (autoStart) => {
        if (cancelled) {
            return false;
        }
        pause();
        state = {
            running: false,
            remaining: optionsWithDefaults.duration,
        };
        if (autoStart !== null && autoStart !== void 0 ? autoStart : true) {
            start();
        }
        eventBus.emitter.emit('reset');
        return true;
    };
    const complete = () => {
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
    const cancel = () => {
        if (cancelled) {
            return;
        }
        pause();
        cancelled = true;
        eventBus.emitter.emit('cancel');
    };
    const getRemaining = () => {
        if (!state.running) {
            return state.remaining;
        }
        return { milliseconds: state.endTime.getTime() - Date.now() };
    };
    const isCompleted = () => !state.running && duration.toMilliseconds(state.remaining) <= 0;
    if (optionsWithDefaults.autoStart) {
        start();
    }
    return Object.assign({
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
    }, eventBus.subscriber);
};
exports.createTimer = createTimer;
