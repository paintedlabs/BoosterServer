"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryIndexOf = exports.binarySearch = void 0;
/**
 * Executes a binary search over a domain of integers.
 *
 * @param options - Binary search options.
 *
 * @return The found number, or null if none was found.
 */
const binarySearch = (options) => {
    const { visit, start, end } = options;
    if (start > end) {
        return null;
    }
    const middle = Math.floor((end - start) / 2) + start;
    const comparisonResult = visit(middle);
    if (comparisonResult === 0) {
        return middle;
    }
    else if (comparisonResult > 0) {
        return (0, exports.binarySearch)({ visit, start: middle + 1, end });
    }
    else {
        return (0, exports.binarySearch)({ visit, start, end: middle - 1 });
    }
};
exports.binarySearch = binarySearch;
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
const binaryIndexOf = (options) => {
    const { haystack, needle, compare } = {
        compare: defaultIndexOfComparitor,
        ...options,
    };
    return ((0, exports.binarySearch)({
        visit: (index) => compare(needle, haystack[index]),
        start: 0,
        end: haystack.length - 1,
    }) ?? -1);
};
exports.binaryIndexOf = binaryIndexOf;
const defaultIndexOfComparitor = (a, b) => {
    if (a > b)
        return 1;
    if (a < b)
        return -1;
    return 0;
};
