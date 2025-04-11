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
const algorithm = __importStar(require("./index"));
describe('Histogram', () => {
    describe('getCount', () => {
        test('Returns zero for an unknown key.', () => {
            const histogram = algorithm.createHistogram();
            expect(histogram.getCount('foo')).toBe(0);
            expect(histogram.getCount('bar')).toBe(0);
        });
    });
    describe('increment', () => {
        test('Increments by 1 when amount is undefined.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo');
            histogram.increment('bar');
            histogram.increment('bar');
            expect(histogram.getCount('foo')).toBe(1);
            expect(histogram.getCount('bar')).toBe(2);
        });
        test('Can increment by a positive amount.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo', 3);
            expect(histogram.getCount('foo')).toBe(3);
        });
        test('Can increment by a negative amount.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo', -3);
            expect(histogram.getCount('foo')).toBe(0);
        });
    });
    describe('decrement', () => {
        test('Decrements by 1 when amount is undefined.', () => {
            const histogram = algorithm.createHistogram();
            histogram.incrementMany(['foo', 'bar'], 3);
            histogram.decrement('foo');
            histogram.decrement('bar');
            histogram.decrement('bar');
            expect(histogram.getCount('foo')).toBe(2);
            expect(histogram.getCount('bar')).toBe(1);
        });
        test('Can decrement by a positive amount.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo', 5);
            histogram.decrement('foo', 3);
            expect(histogram.getCount('foo')).toBe(2);
            histogram.decrement('foo', 2);
            expect(histogram.getCount('foo')).toBe(0);
        });
        test('Can decrement by a negative amount.', () => {
            const histogram = algorithm.createHistogram();
            histogram.decrement('foo', -3);
            expect(histogram.getCount('foo')).toBe(3);
        });
    });
    describe('entries', () => {
        test('Lists all known buckets.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo', 1);
            histogram.increment('bar', 2);
            histogram.increment('baz', 3);
            expect(Array.from(histogram.entries())).toStrictEqual([
                ['foo', 1],
                ['bar', 2],
                ['baz', 3],
            ]);
        });
        test('Values with zero counts are not included.', () => {
            const histogram = algorithm.createHistogram();
            histogram.increment('foo', 1);
            histogram.increment('bar', 2);
            histogram.increment('baz', 3);
            expect(Array.from(histogram.entries())).toStrictEqual([
                ['foo', 1],
                ['bar', 2],
                ['baz', 3],
            ]);
            histogram.decrement('bar', 100);
            expect(Array.from(histogram.entries())).toStrictEqual([
                ['foo', 1],
                ['baz', 3],
            ]);
        });
    });
});
