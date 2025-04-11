import * as dataManager from './DataManager';

/**
 * A min-max heap data structure that allows for efficient retrieval and removal
 * of both minimum and maximum values.
 *
 * @see https://people.scs.carleton.ca/~santoro/Reports/MinMaxHeap.pdf
 */
export type Heap<T> = {
  /**
   * Retrieves the minimum value in the heap without removing it.
   *
   * @returns The minimum value, or `undefined` if the heap is empty.
   */
  peekMin: () => T | undefined;

  /**
   * Removes and returns the minimum value in the heap.
   *
   * @returns The minimum value, or `undefined` if the heap is empty.
   */
  popMin: () => T | undefined;

  /**
   * Retrieves the maximum value in the heap without removing it.
   *
   * @returns The maximum value, or `undefined` if the heap is empty.
   */
  peekMax: () => T | undefined;

  /**
   * Removes and returns the maximum value in the heap.
   *
   * @returns The maximum value, or `undefined` if the heap is empty.
   */
  popMax: () => T | undefined;

  /**
   * Inserts a new value into the heap and returns a `HeapEntry` representing
   * the inserted value.
   *
   * @param value - The value to insert.
   *
   * @returns A `HeapEntry` representing the inserted value.
   */
  insert: (value: T) => HeapEntry<T>;

  /**
   * The number of values currently in the heap.
   */
  readonly size: number;
};

/**
 * Represents an value stored in the heap. Each `HeapEntry` provides access to
 * the value, methods to remove it from the heap, and a flag indicating whether
 * it has been removed.
 */
export type HeapEntry<T> = {
  readonly value: T;

  remove: () => boolean;

  readonly removed: boolean;
};

export type HeapOptions<T> = {
  /**
   * A comparison function used to determine the order of values in the heap.
   *
   * The function should return:
   * - A positive number if `a` is greater than `b`.
   * - A negative number if `a` is less than `b`.
   * - Zero if `a` is equal to `b`.
   *
   * Defaults to a comparison function that uses the built-in inequality
   * operators.
   */
  compare?: HeapComparitor<T>;
};

/**
 * A comparison function used to determine the order of values in the heap.
 */
export type HeapComparitor<T> = (a: T, b: T) => number;

/**
 * Creates a new min-max heap.
 *
 * @param values - An iterable of initial values to insert into the heap.
 * @param options - Configuration options for the heap.
 *
 * @returns A new `Heap` instance.
 */
export const createHeap = <T>(
  values: Iterable<T>,
  options?: HeapOptions<T>,
): Heap<T> => {
  const optionsWithDefaults: Required<HeapOptions<T>> = {
    compare: defaultComparitor,
    ...options,
  };

  const { compare } = optionsWithDefaults;

  const data = dataManager.createDataManager<T>();

  const peekMin: Heap<T>['peekMin'] = () => data.get(0)?.value;

  const popMin: Heap<T>['popMin'] = () => {
    const min = data.remove(0);
    if (min == null) {
      return undefined;
    }

    fixDown({
      data,
      index: 0,
      compare,
    });

    return min.value;
  };

  const peekMax: Heap<T>['peekMax'] = () => {
    const a = data.get(1);
    const b = data.get(2);

    if (a == null) {
      return data.get(0)?.value;
    } else if (b == null) {
      return a.value;
    }

    return compare(a.value, b.value) > 0 ? a.value : b.value;
  };

  const popMax: Heap<T>['popMax'] = () => {
    const a = data.get(1);
    const b = data.get(2);
    if (a == null) {
      return data.remove(0)?.value;
    } else if (b == null) {
      return data.remove(1)?.value;
    }

    const max = compare(a.value, b.value) > 0 ? a : b;
    const maxIndex = max.index;

    max.remove();

    fixDown({
      data,
      index: maxIndex,
      compare,
    });

    return max.value;
  };

  const insert: Heap<T>['insert'] = (value) => {
    const privateEntry = data.push(value);

    const entry: HeapEntry<T> = {
      get value() {
        return privateEntry.value;
      },

      remove() {
        const index = privateEntry.index;
        if (!privateEntry.remove()) {
          return false;
        }

        fixDown({
          data,
          index,
          compare,
        });

        return true;
      },

      get removed() {
        return privateEntry.removed;
      },
    };

    fixUp({
      data,
      index: privateEntry.index,
      compare,
    });

    return entry;
  };

  for (const value of values) {
    insert(value);
  }

  return {
    peekMin,
    popMin,
    peekMax,
    popMax,
    insert,
    get size() {
      return data.size;
    },
  };
};

const fixUp = <T>(args: {
  data: dataManager.DataManager<T>;
  index: number;
  compare: HeapComparitor<T>;
}): void => {
  const { data, index, compare } = args;

  if (index === 0) {
    return;
  }

  const entry = data.get(index);
  const parentIndex = getParentIndex(index);
  const parent = data.get(parentIndex);

  if (entry == null || parent == null) {
    return;
  }

  if (getLevel(index) % 2 === 0) {
    // The index is part of a min layer.
    if (compare(entry.value, parent.value) > 0) {
      data.swap(index, parentIndex);
      fixUpMax({ data, index: parentIndex, compare });
    } else {
      fixUpMax({ data, index, compare: invertComparitor(compare) });
    }
  } else {
    // The index is part of a max layer.
    if (compare(entry.value, parent.value) < 0) {
      data.swap(index, parentIndex);
      fixUpMax({
        data,
        index: parentIndex,
        compare: invertComparitor(compare),
      });
    } else {
      fixUpMax({ data, index, compare });
    }
  }
};

const fixUpMax = <T>(args: {
  data: dataManager.DataManager<T>;
  index: number;
  compare: HeapComparitor<T>;
}): void => {
  const { data, index, compare } = args;

  if (index <= 2) {
    return;
  }

  const entry = data.get(index);
  const parentIndex = getParentIndex(index);
  const grandparentIndex = getParentIndex(parentIndex);
  const grandparent = data.get(grandparentIndex);

  if (entry == null || grandparent == null) {
    return;
  }

  if (compare(entry.value, grandparent.value) > 0) {
    data.swap(index, grandparentIndex);
    fixUpMax({ data, index: grandparentIndex, compare });
  }
};

const fixDown = <T>(args: {
  data: dataManager.DataManager<T>;
  index: number;
  compare: HeapComparitor<T>;
}): void => {
  const { data, index, compare } = args;

  if (index >= data.size) {
    return;
  }

  if (getLevel(index) % 2 === 0) {
    // The index is part of a min layer.
    fixDownMax({ data, index, compare: invertComparitor(compare) });
  } else {
    // The index is part of a max layer.
    fixDownMax({ data, index, compare });
  }
};

const fixDownMax = <T>(args: {
  data: dataManager.DataManager<T>;
  index: number;
  compare: HeapComparitor<T>;
}): void => {
  const { data, index, compare } = args;

  const entry = data.get(index);
  if (entry == null) {
    return;
  }

  const descendents = [
    // Children
    index * 2 + 1,
    index * 2 + 2,
    // Grandchildren
    index * 4 + 3,
    index * 4 + 4,
    index * 4 + 5,
    index * 4 + 6,
  ];

  const largest = descendents.reduce((acc, descendentIndex) => {
    const descendent = data.get(descendentIndex);
    if (descendent == null) {
      return acc;
    }

    return compare(descendent.value, acc.value) > 0 ? descendent : acc;
  }, entry);
  if (entry === largest) {
    return;
  }
  const largestIndex = largest.index;

  const parentIndex = getParentIndex(largestIndex);
  const parent = data.get(parentIndex);
  if (parent == null) {
    return;
  }

  data.swap(index, largestIndex);

  const isChild = largestIndex <= index * 2 + 2;
  if (isChild) {
    return;
  }

  if (compare(largest.value, parent.value) < 0) {
    data.swap(parentIndex, largestIndex);
  }

  fixDownMax({ data, index: largestIndex, compare });
};

const getParentIndex = (i: number): number => {
  if (i === 0) {
    return 0;
  }

  return Math.floor((i - 1) / 2);
};

const getLevel = (i: number): number => Math.floor(Math.log2(i + 1));

const invertComparitor =
  <T>(comparitor: HeapComparitor<T>): HeapComparitor<T> =>
  (a, b) =>
    -comparitor(a, b);

const defaultComparitor = <T>(a: T, b: T): number => {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
