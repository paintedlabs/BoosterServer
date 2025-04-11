import * as algorithm from '../index';

describe('Heap', () => {
  it('passes a fuzz test ascending.', () => {
    const heap = algorithm.createHeap<number>([]);

    const expected: Array<number> = [];
    for (let i = 0; i < 10000; ++i) {
      const value = Math.random();
      heap.insert(value);
      expected.push(value);
    }
    expected.sort((a, b) => a - b);

    const result: Array<number> = [];
    for (let value; (value = heap.popMin()); ) {
      result.push(value);
    }

    expect(result).toStrictEqual(expected);
  });

  it('passes a fuzz test descending.', () => {
    const heap = algorithm.createHeap<number>([]);

    const expected: Array<number> = [];
    for (let i = 0; i < 10000; ++i) {
      const value = Math.random();
      heap.insert(value);
      expected.push(value);
    }
    expected.sort((a, b) => b - a);

    const result: Array<number> = [];
    for (let value; (value = heap.popMax()); ) {
      result.push(value);
    }

    expect(result).toStrictEqual(expected);
  });

  it('passes a removal fuzz test ascending.', () => {
    const heap = algorithm.createHeap<number>([]);

    const expected: Array<number> = [];
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

    const result: Array<number> = [];
    for (let value; (value = heap.popMin()); ) {
      result.push(value);
    }

    expect(result).toStrictEqual(expected);
  });

  it('passes a removal fuzz test descending.', () => {
    const heap = algorithm.createHeap<number>([]);

    const expected: Array<number> = [];
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

    const result: Array<number> = [];
    for (let value; (value = heap.popMax()); ) {
      result.push(value);
    }

    expect(result).toStrictEqual(expected);
  });
});
