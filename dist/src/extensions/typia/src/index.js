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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.JsonParseError = void 0;
exports.assert = assert;
exports.is = is;
exports.validate = validate;
exports.createAssert = createAssert;
exports.createIs = createIs;
exports.createValidate = createValidate;
exports.wrapValidate = wrapValidate;
exports.wrapValidateParse = wrapValidateParse;
const typia = __importStar(require("typia"));
__exportStar(require("typia"), exports);
class JsonParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'JsonParseError';
    }
}
exports.JsonParseError = JsonParseError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function assert(input) {
    return typia.assert(input);
}
function is(input) {
    return typia.is(input);
}
function validate(input) {
    return typia.validate(input);
}
function createAssert() {
    return typia.createAssert();
}
function createIs() {
    return typia.createIs();
}
function createValidate() {
    return typia.createValidate();
}
function wrapValidate(validator) {
    return (input) => {
        const result = validator(input);
        if (!result.success) {
            throw new ValidationError(result.errors.map((e) => e.toString()).join('\n'));
        }
        return result.data;
    };
}
function wrapValidateParse(validator) {
    return (input) => {
        let parsed;
        try {
            parsed = JSON.parse(input);
        }
        catch (e) {
            throw new JsonParseError(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
        return wrapValidate((input) => validator(JSON.stringify(input)))(parsed);
    };
}
