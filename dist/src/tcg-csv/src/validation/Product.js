"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProductsEndpointResponse = exports.validateProductsEndpointResponse = exports.validateProduct = void 0;
const typia_1 = __importDefault(require("typia"));
exports.validateProduct = (typia_1.default.assert);
exports.validateProductsEndpointResponse = (typia_1.default.assert);
exports.parseProductsEndpointResponse = (typia_1.default.json
    .assertParse);
