"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePricesEndpointResponse = exports.validatePricesEndpointResponse = exports.validatePrice = void 0;
const typia_1 = __importDefault(require("typia"));
exports.validatePrice = (typia_1.default.assert);
exports.validatePricesEndpointResponse = (typia_1.default.assert);
exports.parsePricesEndpointResponse = (typia_1.default.json
    .assertParse);
