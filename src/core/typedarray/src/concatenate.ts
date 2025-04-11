/**
 * All methods in this file merge typed arrays into a single buffer.
 *
 * Unfortunately, it's challenging to create an overloaded `concat` method which
 * accepts a TypedArray of type T and returns a merged array of type T because
 * in the case of an empty array, there's no runtime information which can
 * indicate what type to return. For this reason, we have a type-specific concat
 * function for each subclass of TypedArray.
 */

export const concatenateUint8Array = (
  buffers: Iterable<Uint8Array>,
): Uint8Array => {
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

export const concatenateUint8ClampedArray = (
  buffers: Iterable<Uint8ClampedArray>,
): Uint8ClampedArray => {
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

export const concatenateUint16Array = (
  buffers: Iterable<Uint16Array>,
): Uint16Array => {
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

export const concatenateUint32Array = (
  buffers: Iterable<Uint32Array>,
): Uint32Array => {
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

export const concatenateBigUint64Array = (
  buffers: Iterable<BigUint64Array>,
): BigUint64Array => {
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

export const concatenateInt8Array = (
  buffers: Iterable<Int8Array>,
): Int8Array => {
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

export const concatenateInt16Array = (
  buffers: Iterable<Int16Array>,
): Int16Array => {
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

export const concatenateInt32Array = (
  buffers: Iterable<Int32Array>,
): Int32Array => {
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

export const concatenateBigInt64Array = (
  buffers: Iterable<BigInt64Array>,
): BigInt64Array => {
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

export const concatenateFloat32Array = (
  buffers: Iterable<Float32Array>,
): Float32Array => {
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

export const concatenateFloat64Array = (
  buffers: Iterable<Float64Array>,
): Float64Array => {
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
