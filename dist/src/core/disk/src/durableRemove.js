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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.durableRemove = void 0;
const nodeFs = __importStar(require("node:fs/promises"));
const nodePath = __importStar(require("node:path"));
const status = __importStar(require("@core/status"));
const executeNativeSystemCall_1 = require("./executeNativeSystemCall");
/**
 * Removes a file durably, ensuring data integrity even in the event of power
 * loss or system crashes.
 *
 * @param options - Configuration options.
 *
 * @return A status object indicating success or failure.
 */
const durableRemove = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { path, parentDirectory } = options;
    const removeResult = yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => nodeFs.rm(path));
    if (!status.isOk(removeResult)) {
        return removeResult;
    }
    if (parentDirectory != null) {
        return status.stripValue(yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => parentDirectory.sync()));
    }
    const maybeParentDirectoryFileHandle = yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => nodeFs.open(nodePath.dirname(path), nodeFs.constants.O_DIRECTORY));
    if (!status.isOk(maybeParentDirectoryFileHandle)) {
        return maybeParentDirectoryFileHandle;
    }
    const parentDirectoryFileHandle = maybeParentDirectoryFileHandle.value;
    try {
        return status.stripValue(yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => parentDirectoryFileHandle.sync()));
    }
    finally {
        const closeResult = yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => parentDirectoryFileHandle.close());
        if (!status.isOk(closeResult)) {
            console.warn(`Failed to close file handle for ${nodePath.dirname(path)}`);
        }
    }
});
exports.durableRemove = durableRemove;
