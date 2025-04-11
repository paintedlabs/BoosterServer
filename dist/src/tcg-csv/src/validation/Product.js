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
exports.parseProductsEndpointResponse = exports.validateProductsEndpointResponse = exports.validateProduct = void 0;
const __typia_transform__validateReport = __importStar(require("typia/lib/internal/_validateReport.js"));
const typiaExtensions = __importStar(require("@extensions/typia"));
const typia = __importStar(require("typia"));
exports.validateProduct = typiaExtensions.wrapValidate((() => { const _io0 = input => "string" === typeof input.cleanName && "string" === typeof input.name && "number" === typeof input.productId && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.imageUrl && "string" === typeof input.url && "string" === typeof input.modifiedOn; const _vo0 = (input, _path, _exceptionable = true) => ["string" === typeof input.cleanName || _report(_exceptionable, {
        path: _path + ".cleanName",
        expected: "string",
        value: input.cleanName
    }), "string" === typeof input.name || _report(_exceptionable, {
        path: _path + ".name",
        expected: "string",
        value: input.name
    }), "number" === typeof input.productId || _report(_exceptionable, {
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }), "number" === typeof input.groupId || _report(_exceptionable, {
        path: _path + ".groupId",
        expected: "number",
        value: input.groupId
    }), "number" === typeof input.categoryId || _report(_exceptionable, {
        path: _path + ".categoryId",
        expected: "number",
        value: input.categoryId
    }), "string" === typeof input.imageUrl || _report(_exceptionable, {
        path: _path + ".imageUrl",
        expected: "string",
        value: input.imageUrl
    }), "string" === typeof input.url || _report(_exceptionable, {
        path: _path + ".url",
        expected: "string",
        value: input.url
    }), "string" === typeof input.modifiedOn || _report(_exceptionable, {
        path: _path + ".modifiedOn",
        expected: "string",
        value: input.modifiedOn
    })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
    if (false === __is(input)) {
        errors = [];
        _report = __typia_transform__validateReport._validateReport(errors);
        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
            path: _path + "",
            expected: "Product",
            value: input
        })) && _vo0(input, _path + "", true) || _report(true, {
            path: _path + "",
            expected: "Product",
            value: input
        }))(input, "$input", true);
        const success = 0 === errors.length;
        return success ? {
            success,
            data: input
        } : {
            success,
            errors,
            data: input
        };
    }
    return {
        success: true,
        data: input
    };
}; })());
exports.validateProductsEndpointResponse = typiaExtensions.wrapValidate((() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "string" === typeof input.cleanName && "string" === typeof input.name && "number" === typeof input.productId && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.imageUrl && "string" === typeof input.url && "string" === typeof input.modifiedOn; const _vo0 = (input, _path, _exceptionable = true) => ["boolean" === typeof input.success || _report(_exceptionable, {
        path: _path + ".success",
        expected: "boolean",
        value: input.success
    }), Array.isArray(input.errors) || _report(_exceptionable, {
        path: _path + ".errors",
        expected: "Array<unknown>",
        value: input.errors
    }), (Array.isArray(input.results) || _report(_exceptionable, {
        path: _path + ".results",
        expected: "Array<Product>",
        value: input.results
    })) && input.results.map((elem, _index2) => ("object" === typeof elem && null !== elem || _report(_exceptionable, {
        path: _path + ".results[" + _index2 + "]",
        expected: "Product",
        value: elem
    })) && _vo1(elem, _path + ".results[" + _index2 + "]", true && _exceptionable) || _report(_exceptionable, {
        path: _path + ".results[" + _index2 + "]",
        expected: "Product",
        value: elem
    })).every(flag => flag) || _report(_exceptionable, {
        path: _path + ".results",
        expected: "Array<Product>",
        value: input.results
    })].every(flag => flag); const _vo1 = (input, _path, _exceptionable = true) => ["string" === typeof input.cleanName || _report(_exceptionable, {
        path: _path + ".cleanName",
        expected: "string",
        value: input.cleanName
    }), "string" === typeof input.name || _report(_exceptionable, {
        path: _path + ".name",
        expected: "string",
        value: input.name
    }), "number" === typeof input.productId || _report(_exceptionable, {
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }), "number" === typeof input.groupId || _report(_exceptionable, {
        path: _path + ".groupId",
        expected: "number",
        value: input.groupId
    }), "number" === typeof input.categoryId || _report(_exceptionable, {
        path: _path + ".categoryId",
        expected: "number",
        value: input.categoryId
    }), "string" === typeof input.imageUrl || _report(_exceptionable, {
        path: _path + ".imageUrl",
        expected: "string",
        value: input.imageUrl
    }), "string" === typeof input.url || _report(_exceptionable, {
        path: _path + ".url",
        expected: "string",
        value: input.url
    }), "string" === typeof input.modifiedOn || _report(_exceptionable, {
        path: _path + ".modifiedOn",
        expected: "string",
        value: input.modifiedOn
    })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; return input => {
    if (false === __is(input)) {
        errors = [];
        _report = __typia_transform__validateReport._validateReport(errors);
        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
            path: _path + "",
            expected: "ProductsEndpointResponse",
            value: input
        })) && _vo0(input, _path + "", true) || _report(true, {
            path: _path + "",
            expected: "ProductsEndpointResponse",
            value: input
        }))(input, "$input", true);
        const success = 0 === errors.length;
        return success ? {
            success,
            data: input
        } : {
            success,
            errors,
            data: input
        };
    }
    return {
        success: true,
        data: input
    };
}; })());
exports.parseProductsEndpointResponse = typiaExtensions.wrapValidateParse((() => { const _io0 = input => "boolean" === typeof input.success && Array.isArray(input.errors) && (Array.isArray(input.results) && input.results.every(elem => "object" === typeof elem && null !== elem && _io1(elem))); const _io1 = input => "string" === typeof input.cleanName && "string" === typeof input.name && "number" === typeof input.productId && "number" === typeof input.groupId && "number" === typeof input.categoryId && "string" === typeof input.imageUrl && "string" === typeof input.url && "string" === typeof input.modifiedOn; const _vo0 = (input, _path, _exceptionable = true) => ["boolean" === typeof input.success || _report(_exceptionable, {
        path: _path + ".success",
        expected: "boolean",
        value: input.success
    }), Array.isArray(input.errors) || _report(_exceptionable, {
        path: _path + ".errors",
        expected: "Array<unknown>",
        value: input.errors
    }), (Array.isArray(input.results) || _report(_exceptionable, {
        path: _path + ".results",
        expected: "Array<Product>",
        value: input.results
    })) && input.results.map((elem, _index2) => ("object" === typeof elem && null !== elem || _report(_exceptionable, {
        path: _path + ".results[" + _index2 + "]",
        expected: "Product",
        value: elem
    })) && _vo1(elem, _path + ".results[" + _index2 + "]", true && _exceptionable) || _report(_exceptionable, {
        path: _path + ".results[" + _index2 + "]",
        expected: "Product",
        value: elem
    })).every(flag => flag) || _report(_exceptionable, {
        path: _path + ".results",
        expected: "Array<Product>",
        value: input.results
    })].every(flag => flag); const _vo1 = (input, _path, _exceptionable = true) => ["string" === typeof input.cleanName || _report(_exceptionable, {
        path: _path + ".cleanName",
        expected: "string",
        value: input.cleanName
    }), "string" === typeof input.name || _report(_exceptionable, {
        path: _path + ".name",
        expected: "string",
        value: input.name
    }), "number" === typeof input.productId || _report(_exceptionable, {
        path: _path + ".productId",
        expected: "number",
        value: input.productId
    }), "number" === typeof input.groupId || _report(_exceptionable, {
        path: _path + ".groupId",
        expected: "number",
        value: input.groupId
    }), "number" === typeof input.categoryId || _report(_exceptionable, {
        path: _path + ".categoryId",
        expected: "number",
        value: input.categoryId
    }), "string" === typeof input.imageUrl || _report(_exceptionable, {
        path: _path + ".imageUrl",
        expected: "string",
        value: input.imageUrl
    }), "string" === typeof input.url || _report(_exceptionable, {
        path: _path + ".url",
        expected: "string",
        value: input.url
    }), "string" === typeof input.modifiedOn || _report(_exceptionable, {
        path: _path + ".modifiedOn",
        expected: "string",
        value: input.modifiedOn
    })].every(flag => flag); const __is = input => "object" === typeof input && null !== input && _io0(input); let errors; let _report; const __validate = input => {
    if (false === __is(input)) {
        errors = [];
        _report = __typia_transform__validateReport._validateReport(errors);
        ((input, _path, _exceptionable = true) => ("object" === typeof input && null !== input || _report(true, {
            path: _path + "",
            expected: "ProductsEndpointResponse",
            value: input
        })) && _vo0(input, _path + "", true) || _report(true, {
            path: _path + "",
            expected: "ProductsEndpointResponse",
            value: input
        }))(input, "$input", true);
        const success = 0 === errors.length;
        return success ? {
            success,
            data: input
        } : {
            success,
            errors,
            data: input
        };
    }
    return {
        success: true,
        data: input
    };
}; return input => __validate(JSON.parse(input)); })());
