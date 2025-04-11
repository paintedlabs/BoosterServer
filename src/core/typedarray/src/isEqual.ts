export function isEqual(a: Uint8Array, b: Uint8Array): boolean;
export function isEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean;
export function isEqual(a: Uint16Array, b: Uint16Array): boolean;
export function isEqual(a: Uint32Array, b: Uint32Array): boolean;
export function isEqual(a: BigUint64Array, b: BigUint64Array): boolean;
export function isEqual(a: Int8Array, b: Int8Array): boolean;
export function isEqual(a: Int16Array, b: Int16Array): boolean;
export function isEqual(a: Int32Array, b: Int32Array): boolean;
export function isEqual(a: BigInt64Array, b: BigInt64Array): boolean;
export function isEqual(a: Float32Array, b: Float32Array): boolean;
export function isEqual(a: Float64Array, b: Float64Array): boolean;

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

export function isEqual(
  a:
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | BigUint64Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigInt64Array
    | Float32Array
    | Float64Array,
  b:
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | BigUint64Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigInt64Array
    | Float32Array
    | Float64Array,
): boolean {
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
