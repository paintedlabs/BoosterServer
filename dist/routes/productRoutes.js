"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductRouter = createProductRouter;
/**
 * productRoutes.ts
 *
 * Defines the Express routes related to opening MTG products (boosters).
 */
const express_1 = require("express");
const boosterService_1 = require("../boosterService"); // Import booster generation logic
const zod_1 = require("zod"); // Import zod
const logger_1 = __importDefault(require("../logger")); // Import the logger
/**
 * Creates and configures the Express Router for product-related endpoints.
 *
 * @param loadedData The loaded application data (AllPrintings, ExtendedData, etc.).
 * @returns Configured Express Router.
 */
function createProductRouter(loadedData) {
    const router = (0, express_1.Router)();
    if (!loadedData || !loadedData.extendedDataArray) {
        logger_1.default.error('Product routes cannot be created: loaded extended data is missing.');
        router.use((req, res) => {
            res
                .status(503)
                .json({ error: 'Server data not ready for product routes.' });
        });
        return router;
    }
    // --- Zod Schemas for Validation ---
    const productCodeSchema = zod_1.z.object({
        productCode: zod_1.z.string().min(1).toLowerCase(), // Ensure product code is present and lowercased
    });
    const openMultipleParamsSchema = productCodeSchema.extend({
        number: zod_1.z.coerce.number().int().min(1).max(100), // Coerce string to number, validate range
    });
    // --- Route Handlers ---
    // POST /:productCode/open
    router.post('/:productCode/open', (req, res) => {
        try {
            // Validate request params
            const { productCode } = productCodeSchema.parse(req.params);
            logger_1.default.info({ productCode }, `Handling POST /products/:productCode/open request`);
            const product = loadedData.extendedDataArray.find((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.code) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === productCode; });
            if (!product) {
                logger_1.default.warn({ productCode }, 'Product not found for open request.');
                return res
                    .status(404)
                    .json({ error: `Product with code '${productCode}' not found` });
            }
            const result = (0, boosterService_1.generatePack)(product, loadedData);
            logger_1.default.info({ productCode: product.code, packSize: result.pack.length }, `Returning generated pack`);
            return res.json(result);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.default.warn({ errors: error.errors }, 'Invalid productCode parameter');
                return res.status(400).json({
                    error: 'Invalid request parameters',
                    details: error.errors,
                });
            }
            else {
                logger_1.default.error({ err: error }, 'Unexpected error in /products/:productCode/open');
                throw error; // Re-throw for centralized handler
            }
        }
    });
    // POST /:productCode/open/:number
    router.post('/:productCode/open/:number', (req, res) => {
        try {
            // Validate request params
            const { productCode, number: numPacks } = openMultipleParamsSchema.parse(req.params);
            logger_1.default.info({ productCode, count: numPacks }, `Handling POST /products/:productCode/open/:number request`);
            const product = loadedData.extendedDataArray.find((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.code) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === productCode; });
            if (!product) {
                logger_1.default.warn({ productCode }, 'Product not found for open multiple request.');
                return res
                    .status(404)
                    .json({ error: `Product with code '${productCode}' not found` });
            }
            const results = { packs: [] };
            for (let i = 0; i < numPacks; i++) {
                const packResult = (0, boosterService_1.generatePack)(product, loadedData); // Use imported function
                results.packs.push(packResult);
            }
            logger_1.default.info({ productCode: product.code, packCount: results.packs.length }, `Returning multiple generated packs`);
            return res.json(results);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                logger_1.default.warn({ errors: error.errors }, 'Invalid parameters for opening multiple packs');
                return res.status(400).json({
                    error: 'Invalid request parameters',
                    details: error.errors,
                });
            }
            else {
                logger_1.default.error({ err: error }, 'Unexpected error in /products/:productCode/open/:number');
                throw error; // Re-throw for centralized handler
            }
        }
    });
    return router;
}
