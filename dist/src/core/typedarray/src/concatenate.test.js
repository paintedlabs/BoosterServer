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
describe('concatUint8Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateUint8Array([])).toStrictEqual(new Uint8Array(0));
    });
    it('Can concatenate Uint8Array.', () => {
        expect(typedarray.concatenateUint8Array([
            Uint8Array.of(50, 100),
            Uint8Array.of(150),
            Uint8Array.of(200, 250),
        ])).toStrictEqual(Uint8Array.of(50, 100, 150, 200, 250));
    });
    it('Correct handles views.', () => {
        const buffer = Uint8Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateUint8Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Uint8Array.of(1, 2, 4, 5));
    });
});
describe('concatUint8ClampedArray', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateUint8ClampedArray([])).toStrictEqual(new Uint8ClampedArray(0));
    });
    it('Can concatenate Uint8ClampedArray.', () => {
        expect(typedarray.concatenateUint8ClampedArray([
            Uint8ClampedArray.of(50, 100),
            Uint8ClampedArray.of(150),
            Uint8ClampedArray.of(200, 250),
        ])).toStrictEqual(Uint8ClampedArray.of(50, 100, 150, 200, 250));
    });
    it('Correct handles views.', () => {
        const buffer = Uint8ClampedArray.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateUint8ClampedArray([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Uint8ClampedArray.of(1, 2, 4, 5));
    });
});
describe('concatUint16Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateUint16Array([])).toStrictEqual(new Uint16Array(0));
    });
    it('Can concatenate Uint16Array.', () => {
        expect(typedarray.concatenateUint16Array([
            Uint16Array.of(50, 100),
            Uint16Array.of(Math.pow(2, 14)),
            Uint16Array.of(200, 250),
        ])).toStrictEqual(Uint16Array.of(50, 100, Math.pow(2, 14), 200, 250));
    });
    it('Correct handles views.', () => {
        const buffer = Uint16Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateUint16Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Uint16Array.of(1, 2, 4, 5));
    });
});
describe('concatUint32Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateUint32Array([])).toStrictEqual(new Uint32Array(0));
    });
    it('Can concatenate Uint32Array.', () => {
        expect(typedarray.concatenateUint32Array([
            Uint32Array.of(50, 100),
            Uint32Array.of(Math.pow(2, 30)),
            Uint32Array.of(200, 250),
        ])).toStrictEqual(Uint32Array.of(50, 100, Math.pow(2, 30), 200, 250));
    });
    it('Correct handles views.', () => {
        const buffer = Uint32Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateUint32Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Uint32Array.of(1, 2, 4, 5));
    });
});
describe('concatInt8Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateInt8Array([])).toStrictEqual(new Int8Array(0));
    });
    it('Can concatenate Int8Array.', () => {
        expect(typedarray.concatenateInt8Array([
            Int8Array.of(-100, -50),
            Int8Array.of(0),
            Int8Array.of(50, 100),
        ])).toStrictEqual(Int8Array.of(-100, -50, 0, 50, 100));
    });
    it('Correct handles views.', () => {
        const buffer = Int8Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateInt8Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Int8Array.of(1, 2, 4, 5));
    });
});
describe('concatInt16Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateInt16Array([])).toStrictEqual(new Int16Array(0));
    });
    it('Can concatenate Int16Array.', () => {
        expect(typedarray.concatenateInt16Array([
            Int16Array.of(-100, -50),
            Int16Array.of(Math.pow(2, 14)),
            Int16Array.of(50, 100),
        ])).toStrictEqual(Int16Array.of(-100, -50, Math.pow(2, 14), 50, 100));
    });
    it('Correct handles views.', () => {
        const buffer = Int16Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateInt16Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Int16Array.of(1, 2, 4, 5));
    });
});
describe('concatInt32Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateInt32Array([])).toStrictEqual(new Int32Array(0));
    });
    it('Can concatenate Int32Array.', () => {
        expect(typedarray.concatenateInt32Array([
            Int32Array.of(-100, -50),
            Int32Array.of(Math.pow(2, 30)),
            Int32Array.of(50, 100),
        ])).toStrictEqual(Int32Array.of(-100, -50, Math.pow(2, 30), 50, 100));
    });
    it('Correct handles views.', () => {
        const buffer = Int32Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateInt32Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Int32Array.of(1, 2, 4, 5));
    });
});
describe('concatFloat32Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateFloat32Array([])).toStrictEqual(new Float32Array(0));
    });
    it('Can concatenate Float32Array.', () => {
        expect(typedarray.concatenateFloat32Array([
            Float32Array.of(-100.5, -50.5),
            Float32Array.of(Math.pow(2, 32)),
            Float32Array.of(50.5, 100.5),
        ])).toStrictEqual(Float32Array.of(-100.5, -50.5, Math.pow(2, 32), 50.5, 100.5));
    });
    it('Correct handles views.', () => {
        const buffer = Float32Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateFloat32Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Float32Array.of(1, 2, 4, 5));
    });
});
describe('concatFloat64Array', () => {
    it('Returns an empty buffer when no buffers are provided.', () => {
        expect(typedarray.concatenateFloat64Array([])).toStrictEqual(new Float64Array(0));
    });
    it('Can concatenate Float64Array.', () => {
        expect(typedarray.concatenateFloat64Array([
            Float64Array.of(-100.5, -50.5),
            Float64Array.of(Math.pow(2, 62)),
            Float64Array.of(50.5, 100.5),
        ])).toStrictEqual(Float64Array.of(-100.5, -50.5, Math.pow(2, 62), 50.5, 100.5));
    });
    it('Correct handles views.', () => {
        const buffer = Float64Array.of(1, 2, 3, 4, 5, 6);
        expect(typedarray.concatenateFloat64Array([
            buffer.subarray(0, 2),
            buffer.subarray(3, 5),
        ])).toStrictEqual(Float64Array.of(1, 2, 4, 5));
    });
});
