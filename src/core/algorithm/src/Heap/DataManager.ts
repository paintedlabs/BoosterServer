/**
 * Manages a collection of values in contiguous memory, allowing for efficient
 * random access, removal, and swapping of values. This is particularly useful
 * in our Heap, where values need to be dynamically reordered while maintaining
 * fast access to their positions.
 */
export type DataManager<T> = {
  /**
   * Adds a new value to the end of the collection.
   *
   * @param value - The value to append.
   *
   * @returns A `DataEntry` representing the added value.
   */
  push: (value: T) => DataEntry<T>;

  /**
   * Retrieves the value at the specified index, if it exists.
   *
   * @param index - The index to query.
   *
   * @returns The `DataEntry` at the specified index, or `null` if the index is
   *   out of bounds.
   */
  get: (index: number) => DataEntry<T> | null;

  /**
   * Removes the value at the specified index and returns it. To maintain
   * contiguous memory, the last entry in the collection is moved to the removed
   * index.
   *
   * @param index - The index to remove.
   *
   * @returns The removed `DataEntry`, or `null` if the index is out of bounds.
   */
  remove: (index: number) => DataEntry<T> | null;

  /**
   * Swaps the value at index `a` with the value at index `b`.
   *
   * @param a - The first index to swap.
   * @param b - The second index to swap.
   *
   * @returns `true` if the swap succeeded, or `false` if either index is out of
   *   bounds.
   *
   */
  swap: (a: number, b: number) => void;

  /**
   * The number of values currently managed by the `DataManager`.
   */
  readonly size: number;
};

/**
 * Represents a value stored in the `DataManager`. Each `DataEntry` provides
 * access to the value, its current index, and methods to remove the value from
 * the manager.
 */
export type DataEntry<T> = {
  readonly value: T;

  readonly index: number;

  /**
   * Removes the value from its manager.
   *
   * @returns True if and only if the remove took effect.
   */
  remove: () => boolean;

  readonly removed: boolean;
};

export const createDataManager = <T>(): DataManager<T> => {
  const data: Array<DataEntry<T>> = [];

  // Tracks the index for each value stored in `data`.
  //
  // This is critical to support efficient removal of values from `data`. During
  // normal operation, entries in `data` may be moved around via `swap`. As a
  // result, for removal we need an efficient way to query the current index for
  // any given entry.
  const locations = new WeakMap<DataEntry<T>, number>();

  const push: DataManager<T>['push'] = (value) => {
    const entry: DataEntry<T> = {
      get value() {
        return value;
      },

      get index() {
        return getIndex();
      },

      remove: () => {
        return remove(getIndex()) != null;
      },

      get removed() {
        return getIndex() === -1;
      },
    };

    const getIndex = (): number => {
      const location = locations.get(entry);
      if (location == null || data[location] !== entry) {
        return -1;
      }

      return location;
    };

    data.push(entry);
    locations.set(entry, data.length - 1);
    return entry;
  };

  const get: DataManager<T>['get'] = (index: number) => {
    if (index < 0 || index >= data.length) {
      return null;
    }

    return data[index];
  };

  const remove: DataManager<T>['remove'] = (index: number) => {
    if (index < 0 || index >= data.length) {
      return null;
    }

    if (index === data.length - 1) {
      const entry = data[index];
      locations.delete(entry);
      --data.length;
      return entry;
    }

    swap(index, data.length - 1);
    return remove(data.length - 1);
  };

  const swap: DataManager<T>['swap'] = (a: number, b: number) => {
    if (a < 0 || a >= data.length || b < 0 || b >= data.length) {
      return false;
    } else if (a === b) {
      return true;
    }

    const temp = data[a];
    data[a] = data[b];
    data[b] = temp;

    locations.set(data[a], a);
    locations.set(data[b], b);

    return true;
  };

  return {
    push,
    get,
    remove,
    swap,
    get size() {
      return data.length;
    },
  };
};
