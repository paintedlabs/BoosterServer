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
            // Find the UUID using the code map
            const productUuid = loadedData.codeToUuidMap[productCode];
            if (!productUuid) {
                logger_1.default.warn({ productCode }, 'Product code not found in codeToUuidMap for open request.');
                return res.status(404).json({
                    error: `Product with code '${productCode}' not found or mapped.`,
                });
            }
            // Now find the corresponding UnifiedSealedProduct using the UUID
            const unifiedProduct = loadedData.sealedProducts[productUuid];
            if (!unifiedProduct) {
                // This case should be rare if map is built correctly, but handle it.
                logger_1.default.error({ productCode, uuid: productUuid }, 'Unified product not found for UUID from map! Data inconsistency?');
                return res.status(404).json({
                    error: `Product data inconsistency for code '${productCode}'.`,
                });
            }
            // Check if allPrintings data is available (addressing the other type error)
            if (!loadedData.allPrintings) {
                logger_1.default.error({ productCode, uuid: productUuid }, 'AllPrintings data is null, cannot generate pack.');
                return res
                    .status(503) // Service Unavailable
                    .json({
                    error: 'Server data loading incomplete, cannot generate pack.',
                });
            }
            // Pass the CORRECT product type and loadedData to generatePack
            const result = (0, boosterService_1.generatePack)(unifiedProduct, 
            // Provide the required shape, ensuring allPrintings is not null here
            {
                ...loadedData,
                allPrintings: loadedData.allPrintings,
            });
            logger_1.default.info({ productCode: unifiedProduct.code, packSize: result.pack.length }, // Log with product code
            `Returning generated pack`);
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
            // Find the UUID using the code map
            const productUuid = loadedData.codeToUuidMap[productCode];
            if (!productUuid) {
                logger_1.default.warn({ productCode }, 'Product code not found in codeToUuidMap for open multiple request.');
                return res.status(404).json({
                    error: `Product with code '${productCode}' not found or mapped.`,
                });
            }
            // Now find the corresponding UnifiedSealedProduct using the UUID
            const unifiedProduct = loadedData.sealedProducts[productUuid];
            if (!unifiedProduct) {
                logger_1.default.error({ productCode, uuid: productUuid }, 'Unified product not found for UUID from map! Data inconsistency?');
                return res.status(404).json({
                    error: `Product data inconsistency for code '${productCode}'.`,
                });
            }
            // Check if allPrintings data is available
            if (!loadedData.allPrintings) {
                logger_1.default.error({ productCode, uuid: productUuid }, 'AllPrintings data is null, cannot generate packs.');
                return res
                    .status(503) // Service Unavailable
                    .json({
                    error: 'Server data loading incomplete, cannot generate packs.',
                });
            }
            const results = { packs: [] };
            for (let i = 0; i < numPacks; i++) {
                // Pass the CORRECT product type and loadedData to generatePack
                const packResult = (0, boosterService_1.generatePack)(unifiedProduct, 
                // Provide the required shape, ensuring allPrintings is not null here
                {
                    ...loadedData,
                    allPrintings: loadedData.allPrintings,
                });
                results.packs.push(packResult);
            }
            logger_1.default.info({ productCode: unifiedProduct.code, packCount: results.packs.length }, // Log with product code
            `Returning multiple generated packs`);
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
