"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGroupsEndpointResponse = exports.validateGroupsEndpointResponse = exports.validateGroup = void 0;
const typia_1 = __importDefault(require("typia"));
exports.validateGroup = (typia_1.default.assert);
exports.validateGroupsEndpointResponse = (typia_1.default.assert);
exports.parseGroupsEndpointResponse = (typia_1.default.json
    .assertParse);
