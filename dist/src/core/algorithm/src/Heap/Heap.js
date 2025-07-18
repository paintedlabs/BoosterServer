"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHeap = void 0;
const dataManager = __importStar(require("./DataManager"));
/**
 * Creates a new min-max heap.
 *
 * @param values - An iterable of initial values to insert into the heap.
 * @param options - Configuration options for the heap.
 *
 * @returns A new `Heap` instance.
 */
const createHeap = (values, options) => {
    const optionsWithDefaults = {
        compare: defaultComparitor,
        ...options,
    };
    const { compare } = optionsWithDefaults;
    const data = dataManager.createDataManager();
    const peekMin = () => data.get(0)?.value;
    const popMin = () => {
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
    const peekMax = () => {
        const a = data.get(1);
        const b = data.get(2);
        if (a == null) {
            return data.get(0)?.value;
        }
        else if (b == null) {
            return a.value;
        }
        return compare(a.value, b.value) > 0 ? a.value : b.value;
    };
    const popMax = () => {
        const a = data.get(1);
        const b = data.get(2);
        if (a == null) {
            return data.remove(0)?.value;
        }
        else if (b == null) {
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
    const insert = (value) => {
        const privateEntry = data.push(value);
        const entry = {
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
exports.createHeap = createHeap;
const fixUp = (args) => {
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
        }
        else {
            fixUpMax({ data, index, compare: invertComparitor(compare) });
        }
    }
    else {
        // The index is part of a max layer.
        if (compare(entry.value, parent.value) < 0) {
            data.swap(index, parentIndex);
            fixUpMax({
                data,
                index: parentIndex,
                compare: invertComparitor(compare),
            });
        }
        else {
            fixUpMax({ data, index, compare });
        }
    }
};
const fixUpMax = (args) => {
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
const fixDown = (args) => {
    const { data, index, compare } = args;
    if (index >= data.size) {
        return;
    }
    if (getLevel(index) % 2 === 0) {
        // The index is part of a min layer.
        fixDownMax({ data, index, compare: invertComparitor(compare) });
    }
    else {
        // The index is part of a max layer.
        fixDownMax({ data, index, compare });
    }
};
const fixDownMax = (args) => {
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
const getParentIndex = (i) => {
    if (i === 0) {
        return 0;
    }
    return Math.floor((i - 1) / 2);
};
const getLevel = (i) => Math.floor(Math.log2(i + 1));
const invertComparitor = (comparitor) => (a, b) => -comparitor(a, b);
const defaultComparitor = (a, b) => {
    if (a > b)
        return 1;
    if (a < b)
        return -1;
    return 0;
};
