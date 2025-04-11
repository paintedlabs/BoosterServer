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
const typedarray = __importStar(require("./index"));
describe('isEqual', () => {
    describe('Uint8Array', () => {
        it('is true for two empty arrays.', () => {
            expect(typedarray.isEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
        });
        it('is false for arrays with different sizes.', () => {
            expect(typedarray.isEqual(new Uint8Array(4), new Uint8Array(8))).toBe(false);
        });
        it('is true for arrays with the same bit-wise contents.', () => {
            expect(typedarray.isEqual(Uint8Array.of(1, 2, 3, 4), Uint8Array.of(1, 2, 3, 4))).toBe(true);
        });
        it('is false for arrays with the same contents in different orders.', () => {
            expect(typedarray.isEqual(Uint8Array.of(1, 2, 3, 4), Uint8Array.of(1, 2, 4, 3))).toBe(false);
        });
    });
    describe('Float32Array', () => {
        it('is true for two empty arrays.', () => {
            expect(typedarray.isEqual(new Float32Array(0), new Float32Array(0))).toBe(true);
        });
        it('is false for arrays with different sizes.', () => {
            expect(typedarray.isEqual(new Float32Array(4), new Float32Array(8))).toBe(false);
        });
        it('is true for arrays with the same bit-wise contents.', () => {
            expect(typedarray.isEqual(Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5), Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5))).toBe(true);
        });
        it('is false for arrays with the same contents in different orders.', () => {
            expect(typedarray.isEqual(Float32Array.of(-100.5, -50.5, 0, 50.5, 100.5), Float32Array.of(-100.5, -50.5, 0, 100.5, 50.5))).toBe(false);
        });
    });
});
