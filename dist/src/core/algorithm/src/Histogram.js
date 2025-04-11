"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHistogram = void 0;
const createHistogram = () => {
    const counts = new Map();
    const getCount = (value) => { var _a; return (_a = counts.get(value)) !== null && _a !== void 0 ? _a : 0; };
    const increment = (value, amount) => {
        const newCount = getCount(value) + (amount == null ? 1 : Math.round(amount));
        if (newCount <= 0) {
            counts.delete(value);
            return 0;
        }
        else {
            counts.set(value, newCount);
            return newCount;
        }
    };
    const incrementMany = (values, amount) => {
        for (const value of values) {
            increment(value, amount);
        }
    };
    const decrement = (value, amount) => increment(value, amount == null ? -1 : -amount);
    const decrementMany = (values, amount) => {
        for (const value of values) {
            decrement(value, amount);
        }
    };
    const entries = () => {
        return counts.entries();
    };
    const clear = () => {
        counts.clear();
    };
    return {
        getCount,
        increment,
        incrementMany,
        decrement,
        decrementMany,
        entries,
        clear,
    };
};
exports.createHistogram = createHistogram;
