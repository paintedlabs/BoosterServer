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
exports.toDays = exports.toHours = exports.toMinutes = exports.toSeconds = exports.toMilliseconds = void 0;
const durationModule = __importStar(require("./Duration"));
const toMilliseconds = (duration) => {
    if (durationModule.isMilliseconds(duration)) {
        return duration.milliseconds;
    }
    else if (durationModule.isSeconds(duration)) {
        return duration.seconds * 1000;
    }
    else if (durationModule.isMinutes(duration)) {
        return duration.minutes * 1000 * 60;
    }
    else if (durationModule.isHours(duration)) {
        return duration.hours * 1000 * 60 * 60;
    }
    return duration.days * 1000 * 60 * 60 * 24;
};
exports.toMilliseconds = toMilliseconds;
const toSeconds = (duration) => {
    if (durationModule.isMilliseconds(duration)) {
        return duration.milliseconds / 1000;
    }
    else if (durationModule.isSeconds(duration)) {
        return duration.seconds;
    }
    else if (durationModule.isMinutes(duration)) {
        return duration.minutes * 60;
    }
    else if (durationModule.isHours(duration)) {
        return duration.hours * 60 * 60;
    }
    return duration.days * 60 * 60 * 24;
};
exports.toSeconds = toSeconds;
const toMinutes = (duration) => {
    if (durationModule.isMilliseconds(duration)) {
        return duration.milliseconds / 60 / 1000;
    }
    else if (durationModule.isSeconds(duration)) {
        return duration.seconds / 60;
    }
    else if (durationModule.isMinutes(duration)) {
        return duration.minutes;
    }
    else if (durationModule.isHours(duration)) {
        return duration.hours * 60;
    }
    return duration.days * 60 * 24;
};
exports.toMinutes = toMinutes;
const toHours = (duration) => {
    if (durationModule.isMilliseconds(duration)) {
        return duration.milliseconds / 60 / 60 / 1000;
    }
    else if (durationModule.isSeconds(duration)) {
        return duration.seconds / 60 / 60;
    }
    else if (durationModule.isMinutes(duration)) {
        return duration.minutes / 60;
    }
    else if (durationModule.isHours(duration)) {
        return duration.hours;
    }
    return duration.days * 24;
};
exports.toHours = toHours;
const toDays = (duration) => {
    if (durationModule.isMilliseconds(duration)) {
        return duration.milliseconds / 24 / 60 / 60 / 1000;
    }
    else if (durationModule.isSeconds(duration)) {
        return duration.seconds / 24 / 60 / 60;
    }
    else if (durationModule.isMinutes(duration)) {
        return duration.minutes / 24 / 60;
    }
    else if (durationModule.isHours(duration)) {
        return duration.hours / 24;
    }
    return duration.days;
};
exports.toDays = toDays;
