export type BinarySearchOptions = {
  // The visit function guides the binary search by indicating whether a
  // specific value is (a) equal to, (b) less than, or (b) greater than the
  // value we're searching for.
  visit: BinarySearchVisitor;

  // Lower bound for the search, inclusively.
  start: number;

  // Upper bound for the search, inclusively.
  end: number;
};

/**
 * Guides a binary search by indicating whether a specific value is (a) equal
 * to, (b) less than, or (b) greater than the value we're searching for.
 *
 * @param value - The value currently being visited.
 *
 * @return A number which describes how to navigate the search's solution space:
 *   -1: The value we're searching for is less than the current value.
 *    0: This value is the value we're searching for.
 *   +1: The value we're searching for is greater than the current value.
 */
export type BinarySearchVisitor = (value: number) => number;

/**
 * Executes a binary search over a domain of integers.
 *
 * @param options - Binary search options.
 *
 * @return The found number, or null if none was found.
 */
export const binarySearch = (options: BinarySearchOptions): number | null => {
  const { visit, start, end } = options;

  if (start > end) {
    return null;
  }

  const middle = Math.floor((end - start) / 2) + start;
  const comparisonResult = visit(middle);
  if (comparisonResult === 0) {
    return middle;
  } else if (comparisonResult > 0) {
    return binarySearch({ visit, start: middle + 1, end });
  } else {
    return binarySearch({ visit, start, end: middle - 1 });
  }
};

export type BinaryIndexOfOptions<T> = {
  // The haystack in which to locate the needle.
  //
  // Must be sorted by whatever dimension the comparison function uses.
  haystack: Array<T>;

  // The needle to locate in the haystack.
  needle: T;

  // A comparison function following the same semantics as Javascript's builtins
  // such as `sort`.
  //
  // Returns values using the following logic:
  // - If a > b then returns greater than 0
  // - If a < b then returns less than 0
  // - If a === b then returns 0
  //
  // A common example for numeric comparison is `(a, b) => a - b`.
  //
  // Defaults to using the builtin inequality operators.
  compare?: (a: T, b: T) => number;
};

/**
 * Locates the index of a value within a sorted array.
 *
 * Note that if a value is present in the array more than once, any valid index
 * may be returned.
 *
 * @param options - Search options.
 *
 * @return The index of the located value, or -1 if the value was not found.
 */
export const binaryIndexOf = <T>(options: BinaryIndexOfOptions<T>): number => {
  const { haystack, needle, compare } = {
    compare: defaultIndexOfComparitor,
    ...options,
  };

  return (
    binarySearch({
      visit: (index) => compare(needle, haystack[index]),
      start: 0,
      end: haystack.length - 1,
    }) ?? -1
  );
};

const defaultIndexOfComparitor = <T>(a: T, b: T): number => {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
