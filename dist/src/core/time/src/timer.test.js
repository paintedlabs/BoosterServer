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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const time = __importStar(require("./index"));
beforeEach(() => {
    jest.useFakeTimers();
});
describe('Timer', () => {
    it('starts by default.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        expect(timer.running).toBe(true);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(true);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
    }));
    it('supports disabled autostart on creation.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({
            duration: { seconds: 5 },
            autoStart: false,
        });
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
    }));
    it('can start a paused timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        expect(timer.pause()).toBe(true);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);
        expect(timer.start()).toBe(true);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(3000);
    }));
    it('does not start if already running.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(timer.start()).toBe(false);
        jest.advanceTimersByTime(4000);
        yield drainEventLoop();
        expect(timer.start()).toBe(false);
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(true);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
    }));
    it('does not pause if already paused.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        expect(timer.pause()).toBe(true);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(4000);
        expect(timer.pause()).toBe(false);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(timer.pause()).toBe(false);
    }));
    it('resets the timer to the original duration.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
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
        yield drainEventLoop();
        expect(timer.running).toBe(true);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(1000);
    }));
    it('can reset a paused timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(timer.pause()).toBe(true);
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
        expect(timer.reset()).toBe(true);
        expect(timer.running).toBe(true);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(true);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
    }));
    it('can reset without auto-start.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        jest.advanceTimersByTime(1000);
        yield drainEventLoop();
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
        yield drainEventLoop();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
    }));
    it('can complete a running timer immediately.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        expect(timer.running).toBe(true);
        expect(timer.complete()).toBe(true);
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(true);
        expect(timer.cancelled).toBe(false);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(0);
    }));
    it('can complete a paused timer immediately.', () => __awaiter(void 0, void 0, void 0, function* () {
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
    }));
    it('prevents duplicate completion.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({
            duration: { seconds: 5 },
            autoStart: false,
        });
        expect(timer.complete()).toBe(true);
        expect(timer.complete()).toBe(false);
    }));
    it('can cancel a running timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        expect(timer.running).toBe(true);
        timer.cancel();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
        expect(time.duration.toMilliseconds(timer.remaining)).toBe(5000);
    }));
    it('can cancel a paused timer.', () => __awaiter(void 0, void 0, void 0, function* () {
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
    }));
    it('prevents starting a cancelled timer.', () => __awaiter(void 0, void 0, void 0, function* () {
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
    }));
    it('prevents pausing a cancelled timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        timer.cancel();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
        expect(timer.pause()).toBe(false);
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
    }));
    it('prevents resetting a cancelled timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        timer.cancel();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
        expect(timer.reset()).toBe(false);
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
    }));
    it('prevents completing a cancelled timer.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        timer.cancel();
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
        expect(timer.complete()).toBe(false);
        expect(timer.running).toBe(false);
        expect(timer.completed).toBe(false);
        expect(timer.cancelled).toBe(true);
    }));
    it('emits the complete event when the timer naturally completes.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        const onComplete = jest.fn();
        timer.on('complete', onComplete);
        jest.advanceTimersByTime(5000);
        yield drainEventLoop();
        expect(onComplete).toHaveBeenCalledTimes(1);
    }));
    it('emits the complete event when the timer manually completes.', () => __awaiter(void 0, void 0, void 0, function* () {
        const timer = time.createTimer({ duration: { seconds: 5 } });
        const onComplete = jest.fn();
        timer.on('complete', onComplete);
        timer.complete();
        expect(onComplete).toHaveBeenCalledTimes(1);
    }));
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
const drainEventLoop = () => __awaiter(void 0, void 0, void 0, function* () {
    for (let i = 0; i < 1000; ++i)
        yield Promise.resolve();
});
