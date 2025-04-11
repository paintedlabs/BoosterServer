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
exports.doInTempDirectory = exports.makeTempDirectory = void 0;
const nodeFs = __importStar(require("node:fs/promises"));
const nodeOs = __importStar(require("node:os"));
const nodePath = __importStar(require("node:path"));
const status = __importStar(require("@core/status"));
const uuid = __importStar(require("uuid"));
const executeNativeSystemCall_1 = require("./executeNativeSystemCall");
/**
 * Creates a unique directory. By default it will be located within the OS's tmp
 * directory, however, this behavior can be modified with the options.
 *
 * Almost always prefer `doInTempDirectory` which ensures cleanup of temporary
 * directories unlike this method.
 *
 * @param options Additional optional parameters. See properties for details.
 *
 * @returns The string of the created temp directory.
 */
const makeTempDirectory = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const optionsWithDefaults = Object.assign({ parentDirectory: nodeOs.tmpdir() }, options);
    const absolutePath = nodePath.join(optionsWithDefaults.parentDirectory, uuid.v4());
    const maybeResult = yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => nodeFs.mkdir(absolutePath, { recursive: true }));
    if (!status.isOk(maybeResult)) {
        return maybeResult;
    }
    return status.fromValue(absolutePath);
});
exports.makeTempDirectory = makeTempDirectory;
/**
 * Creates a tmp directory and automatically cleans up that tmp directory when
 * the logic using it resolves. It achieves this by accepting a lambda which is
 * supplied the directory and when the lambda returns, the directory will be
 * deleted.
 *
 * @param handler The logic to execute.
 * @param options Additional optional parameters. See properties for details.
 *
 * @returns A status which contains the handler's response or an error if a
 *   temporary directory couldn't be created.
 */
const doInTempDirectory = (handler, options) => __awaiter(void 0, void 0, void 0, function* () {
    const maybeTempDirectory = yield (0, exports.makeTempDirectory)(options);
    if (!status.isOk(maybeTempDirectory)) {
        return maybeTempDirectory;
    }
    const tempDirectory = maybeTempDirectory.value;
    const response = yield handler(tempDirectory);
    const maybeRemoved = yield (0, executeNativeSystemCall_1.executeNativeSystemCall)(() => nodeFs.rm(tempDirectory, {
        recursive: true,
        force: true,
    }));
    if (!status.isOk(maybeRemoved)) {
        console.warn({
            directoryPath: tempDirectory,
            error: maybeRemoved,
        }, 'Failed to clean up temp directory.');
    }
    return status.fromValue(response);
});
exports.doInTempDirectory = doInTempDirectory;
