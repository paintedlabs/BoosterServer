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
const nodeFs = __importStar(require("node:fs/promises"));
const nodeOs = __importStar(require("node:os"));
const nodePath = __importStar(require("node:path"));
const status = __importStar(require("@core/status"));
const jestMockModule = __importStar(require("jest-mock-module"));
const uuid = __importStar(require("uuid"));
const disk = __importStar(require("./index"));
jestMockModule.extend(jest);
jest.spy('node:fs/promises');
let testFile;
beforeEach(() => {
    testFile = nodePath.join(nodeOs.tmpdir(), uuid.v4());
});
afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
    yield nodeFs.rm(testFile);
}));
describe('durableReplace', () => {
    it('correctly uses fsync and atomic replace.', () => __awaiter(void 0, void 0, void 0, function* () {
        let parentDirectoryFileHandleSyncSpy;
        jest.spyOn(nodeFs, 'open').mockImplementationOnce((...args) => __awaiter(void 0, void 0, void 0, function* () {
            const handle = yield nodeFs.open(...args);
            parentDirectoryFileHandleSyncSpy = jest.spyOn(handle, 'sync');
            return handle;
        }));
        status.throwIfError(yield disk.durableReplace({
            path: testFile,
            contents: 'foo',
        }));
        // Validate that the path was replaced with the contents 'foo'.
        expect(yield nodeFs.readFile(testFile, { encoding: 'utf8' })).toBe('foo');
        // Validate that only a single write occured to a temporary file with the
        // `fsync` flag enabled.
        expect(nodeFs.writeFile).toHaveBeenCalledTimes(1);
        expect(nodeFs.writeFile).toHaveBeenCalledWith(expect.not.stringMatching(testFile), 'foo', {
            flag: nodeFs.constants.O_SYNC |
                nodeFs.constants.O_CREAT |
                nodeFs.constants.O_WRONLY,
        });
        // Validate that the parent directory was opened and fsync'd.
        expect(nodeFs.open).toHaveBeenCalledWith(nodePath.dirname(testFile), nodeFs.constants.O_DIRECTORY);
        expect(parentDirectoryFileHandleSyncSpy).toHaveBeenCalledTimes(1);
    }));
});
