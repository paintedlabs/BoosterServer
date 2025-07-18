"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pino_1 = __importDefault(require("pino"));
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const transportTargets = [];
// Console transport (pretty for dev, json for prod)
if (isDevelopment) {
    transportTargets.push({
        target: 'pino-pretty',
        options: {
            colorize: true,
            levelFirst: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
        level: logLevel, // Apply the determined log level
    });
}
else {
    // For production, log JSON to stdout
    transportTargets.push({
        target: 'pino/file', // Use pino/file for basic stdout JSON
        options: { destination: 1 }, // 1 = stdout
        level: logLevel,
    });
}
// File transport (always active, logs JSON)
transportTargets.push({
    target: 'pino/file',
    options: { destination: './booster-server.log', mkdir: true }, // Log to booster-server.log, create dir if needed
    level: logLevel, // Apply the determined log level to file transport as well
});
const transport = pino_1.default.transport({
    targets: transportTargets,
});
const logger = (0, pino_1.default)({
    level: logLevel, // Set the overall minimum level
}, transport);
exports.default = logger;
