"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDays = exports.isHours = exports.isMinutes = exports.isSeconds = exports.isMilliseconds = exports.isDuration = void 0;
const isDuration = (maybeDuration) => (0, exports.isMilliseconds)(maybeDuration) ||
    (0, exports.isSeconds)(maybeDuration) ||
    (0, exports.isMinutes)(maybeDuration) ||
    (0, exports.isHours)(maybeDuration) ||
    (0, exports.isDays)(maybeDuration);
exports.isDuration = isDuration;
const isMilliseconds = (maybeDuration) => 'milliseconds' in maybeDuration;
exports.isMilliseconds = isMilliseconds;
const isSeconds = (maybeDuration) => 'seconds' in maybeDuration;
exports.isSeconds = isSeconds;
const isMinutes = (maybeDuration) => 'minutes' in maybeDuration;
exports.isMinutes = isMinutes;
const isHours = (maybeDuration) => 'hours' in maybeDuration;
exports.isHours = isHours;
const isDays = (maybeDuration) => 'days' in maybeDuration;
exports.isDays = isDays;
