import * as algorithm from './index';

describe('binarySearch', () => {
  it('Returns null when range is empty.', () => {
    expect(
      algorithm.binarySearch({
        visit: () => 0,
        start: 1,
        end: 0,
      }),
    ).toBeNull();
  });

  it('Returns null when a value is not found (going left).', () => {
    expect(
      algorithm.binarySearch({
        visit: () => -1,
        start: 0,
        end: 10,
      }),
    ).toBeNull();
  });

  it('Returns null when a value is not found (going right).', () => {
    expect(
      algorithm.binarySearch({
        visit: () => 1,
        start: 0,
        end: 10,
      }),
    ).toBeNull();
  });

  it('Can find the start of the range.', () => {
    expect(
      algorithm.binarySearch({
        visit: (b) => -10 - b,
        start: -10,
        end: 10,
      }),
    ).toBe(-10);
  });

  it('Can find the end of the range.', () => {
    expect(
      algorithm.binarySearch({
        visit: (b) => 10 - b,
        start: -10,
        end: 10,
      }),
    ).toBe(10);
  });

  it('Can find a value in the middle of the range.', () => {
    expect(
      algorithm.binarySearch({
        visit: (b) => 7192 - b,
        start: 0,
        end: 1000000,
      }),
    ).toBe(7192);
  });
});

describe('binaryIndexOf', () => {
  it('Returns -1 when the haystack is empty.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [],
        needle: 10,
      }),
    ).toBe(-1);
  });

  it('Returns -1 when the needle is not found.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [1, 2, 3, 4, 5],
        needle: 2.5,
      }),
    ).toBe(-1);
  });

  it('Returns the index when the needle is found.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [1, 2, 3, 4, 5],
        needle: 3,
      }),
    ).toBe(2);
  });

  it('Can find the first value in the haystack.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [1, 2, 3, 4, 5],
        needle: 1,
      }),
    ).toBe(0);
  });

  it('Can find the last value in the haystack.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [1, 2, 3, 4, 5],
        needle: 5,
      }),
    ).toBe(4);
  });

  it('Default comparitor uses builtin inequalities.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: Array.from('abcdefghijklmnopqrstuvwxyz'),
        needle: 'm',
      }),
    ).toBe(12);
  });

  it('Supports custom comparitors.', () => {
    expect(
      algorithm.binaryIndexOf({
        haystack: [
          { value: 5 },
          { value: 4 },
          { value: 3 },
          { value: 2 },
          { value: 1 },
        ],
        needle: { value: 2 },
        compare: (a, b) => b.value - a.value,
      }),
    ).toBe(3);
  });
});
