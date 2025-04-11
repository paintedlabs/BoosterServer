"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatenateFloat64Array = exports.concatenateFloat32Array = exports.concatenateBigInt64Array = exports.concatenateInt32Array = exports.concatenateInt16Array = exports.concatenateInt8Array = exports.concatenateBigUint64Array = exports.concatenateUint32Array = exports.concatenateUint16Array = exports.concatenateUint8ClampedArray = exports.concatenateUint8Array = void 0;
/**
 * All methods in this file merge typed arrays into a single buffer.
 *
 * Unfortunately, it's challenging to create an overloaded `concat` method which
 * accepts a TypedArray of type T and returns a merged array of type T because
 * in the case of an empty array, there's no runtime information which can
 * indicate what type to return. For this reason, we have a type-specific concat
 * function for each subclass of TypedArray.
 */
const concatenateUint8Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateUint8Array = concatenateUint8Array;
const concatenateUint8ClampedArray = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Uint8ClampedArray(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateUint8ClampedArray = concatenateUint8ClampedArray;
const concatenateUint16Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Uint16Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateUint16Array = concatenateUint16Array;
const concatenateUint32Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Uint32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateUint32Array = concatenateUint32Array;
const concatenateBigUint64Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new BigUint64Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateBigUint64Array = concatenateBigUint64Array;
const concatenateInt8Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Int8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateInt8Array = concatenateInt8Array;
const concatenateInt16Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Int16Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateInt16Array = concatenateInt16Array;
const concatenateInt32Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Int32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateInt32Array = concatenateInt32Array;
const concatenateBigInt64Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new BigInt64Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateBigInt64Array = concatenateBigInt64Array;
const concatenateFloat32Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateFloat32Array = concatenateFloat32Array;
const concatenateFloat64Array = (buffers) => {
    let totalLength = 0;
    for (const buffer of buffers) {
        totalLength += buffer.length;
    }
    const concatenatedBuffer = new Float64Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
        concatenatedBuffer.set(buffer, offset);
        offset += buffer.length;
    }
    return concatenatedBuffer;
};
exports.concatenateFloat64Array = concatenateFloat64Array;
