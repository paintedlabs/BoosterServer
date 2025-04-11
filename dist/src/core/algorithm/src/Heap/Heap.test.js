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
const algorithm = __importStar(require("../index"));
describe('Heap', () => {
    it('passes a fuzz test ascending.', () => {
        const heap = algorithm.createHeap([]);
        const expected = [];
        for (let i = 0; i < 10000; ++i) {
            const value = Math.random();
            heap.insert(value);
            expected.push(value);
        }
        expected.sort((a, b) => a - b);
        const result = [];
        for (let value; (value = heap.popMin());) {
            result.push(value);
        }
        expect(result).toStrictEqual(expected);
    });
    it('passes a fuzz test descending.', () => {
        const heap = algorithm.createHeap([]);
        const expected = [];
        for (let i = 0; i < 10000; ++i) {
            const value = Math.random();
            heap.insert(value);
            expected.push(value);
        }
        expected.sort((a, b) => b - a);
        const result = [];
        for (let value; (value = heap.popMax());) {
            result.push(value);
        }
        expect(result).toStrictEqual(expected);
    });
    it('passes a removal fuzz test ascending.', () => {
        const heap = algorithm.createHeap([]);
        const expected = [];
        for (let i = 0; i < 10000; ++i) {
            const value = Math.random();
            const entry = heap.insert(value);
            if (i % 5 === 0) {
                expect(entry.remove()).toBe(true);
                continue;
            }
            expected.push(value);
        }
        expected.sort((a, b) => a - b);
        const result = [];
        for (let value; (value = heap.popMin());) {
            result.push(value);
        }
        expect(result).toStrictEqual(expected);
    });
    it('passes a removal fuzz test descending.', () => {
        const heap = algorithm.createHeap([]);
        const expected = [];
        for (let i = 0; i < 10000; ++i) {
            const value = Math.random();
            const entry = heap.insert(value);
            if (i % 5 === 0) {
                expect(entry.remove()).toBe(true);
                continue;
            }
            expected.push(value);
        }
        expected.sort((a, b) => b - a);
        const result = [];
        for (let value; (value = heap.popMax());) {
            result.push(value);
        }
        expect(result).toStrictEqual(expected);
    });
});
