"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEqual = isEqual;
/**
 * Evaluates if two typed arrays are equal bit-wise.
 *
 * @param a - The first typed array.
 * @param b - The second typed array.
 *
 * @returns A boolean indicating equality.
 */
// We generally prefer lambda syntax for functions, but overloading is only
// supported by the "function" syntax. So we make an exception here.
//
function isEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
