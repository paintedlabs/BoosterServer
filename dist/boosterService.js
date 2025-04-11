"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePack = generatePack;
const logger_1 = __importDefault(require("./logger")); // Import the logger
// -------------- INTERFACES (Specific to this service/response) --------------
// OpenedPackResponse moved to types.ts
// -------------- BOOSTER SIMULATION LOGIC --------------
/**
 * Selects a booster configuration based on weighted randomness.
 */
function pickBooster(boosters) {
    if (!boosters || boosters.length === 0)
        return null;
    const totalWeight = boosters.reduce((acc, b) => acc + b.weight, 0);
    if (totalWeight <= 0) {
        logger_1.default.warn('Total weight of boosters is zero or negative.');
        return null; // Avoid division by zero or infinite loops
    }
    const rand = Math.random() * totalWeight; // Use Math.random() for float
    let cumulativeWeight = 0;
    for (const booster of boosters) {
        cumulativeWeight += booster.weight;
        if (rand < cumulativeWeight) {
            return booster;
        }
    }
    // Fallback in case of floating point inaccuracies, return the last booster
    logger_1.default.warn('pickBooster fallback: returning last booster due to potential float issue.');
    return boosters[boosters.length - 1];
}
/**
 * Selects a card UUID from a sheet based on weighted randomness.
 * Uses the processed ExtendedSheet structure from dataLoader.
 */
function pickCardFromSheet(sheet) {
    var _a, _b;
    const totalWeight = sheet.total_weight;
    if (totalWeight <= 0 || sheet.cards.length === 0) {
        logger_1.default.warn({ sheet }, 'Cannot pick card from sheet with zero total weight or no cards');
        return null; // Cannot pick from an empty or invalid sheet
    }
    let randomWeight = Math.random() * totalWeight;
    for (const card of sheet.cards) {
        randomWeight -= card.weight;
        if (randomWeight <= 0) {
            const chosenUUID = card.uuid;
            logger_1.default.debug({ chosenUUID, totalWeight, sheetName: '[SheetName Placeholder]' }, 'Card chosen from sheet'); // Add sheet name if available
            return chosenUUID;
        }
    }
    // Fallback in case of floating point issues or unexpected structure
    logger_1.default.warn({ totalWeight, sheet }, 'Failed to pick card using weighted random logic, falling back to last card');
    return (_b = (_a = sheet.cards[sheet.cards.length - 1]) === null || _a === void 0 ? void 0 : _a.uuid) !== null && _b !== void 0 ? _b : null;
}
/**
 * Generates the contents of a single booster pack for a given product.
 *
 * @param product The ExtendedSealedData definition for the product.
 * @param loadedData The container for all loaded AllPrintings, ExtendedData, and CombinedCard data.
 * @returns An OpenedPackResponse object containing the pack contents or a warning.
 */
function generatePack(product, loadedData) {
    if (!loadedData || !loadedData.allPrintings || !loadedData.combinedCards) {
        logger_1.default.error('generatePack called with incomplete loadedData.');
        // In a real service, might throw a specific internal error
        return { pack: [], warning: 'Server data is not fully loaded.' };
    }
    // Build a map of UUIDs allowed in this product's source sets for validation
    // This can be potentially cached or precomputed if performance is critical
    const sourceSetUUIDs = new Set();
    if (product.source_set_codes) {
        for (let code of product.source_set_codes) {
            code = code.toUpperCase();
            const setObj = loadedData.allPrintings.data[code];
            if (setObj === null || setObj === void 0 ? void 0 : setObj.cards) {
                for (const c of setObj.cards) {
                    if (c === null || c === void 0 ? void 0 : c.uuid)
                        sourceSetUUIDs.add(c.uuid);
                }
            }
            else {
                logger_1.default.warn({ productCode: product.code, setCode: code }, `Source set code not found or has no cards in AllPrintings data.`);
            }
        }
    }
    else {
        logger_1.default.warn({ productCode: product.code }, `Product is missing 'source_set_codes'. Cannot validate card origins.`);
    }
    const chosenBooster = pickBooster(product.boosters);
    if (!chosenBooster) {
        logger_1.default.warn({ productCode: product.code }, `No valid booster definition found or selected.`);
        return {
            pack: [],
            warning: 'No valid booster definition found or zero total weight.',
        };
    }
    const packContents = [];
    const warnings = [];
    const sheets = product.sheets;
    for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
        const sheet = sheets[sheetName];
        if (!sheet) {
            logger_1.default.warn({ productCode: product.code, sheetName }, `[${product.code}] Processed sheet data missing for sheet '${sheetName}'.`);
            continue; // Skip this sheet if definition is missing
        }
        for (let i = 0; i < count; i++) {
            const pickedUUID = pickCardFromSheet(sheet);
            if (!pickedUUID) {
                logger_1.default.warn({ productCode: product.code, sheetName }, `Failed to pick card from processed sheet`);
                continue; // Skip if card picking fails
            }
            logger_1.default.debug({ cardUUID: pickedUUID, sheetName, productCode: product.code }, 'Attempting to lookup chosen card UUID');
            const combined = loadedData.combinedCards[pickedUUID];
            if (!combined) {
                logger_1.default.warn({ productCode: product.code, cardUUID: pickedUUID, sheetName }, `No combined data found for card UUID`);
                continue;
            }
            // Optional validation: Check if the picked card belongs to the product's source sets
            if (sourceSetUUIDs.size > 0 && !sourceSetUUIDs.has(pickedUUID)) {
                // This might indicate an error in the sealed_extended_data.json
                logger_1.default.warn({
                    productCode: product.code,
                    cardUUID: pickedUUID,
                    cardName: combined.allPrintingsData.name,
                    sheetName,
                }, `Picked card is NOT listed in source_set_codes. Including anyway.`);
                // Decide whether to include it or skip it. Logging and including for now.
                // continue;
            }
            packContents.push({
                sheet: sheetName,
                card: combined,
            });
        }
    }
    // logger.debug({ productCode: product.code, packSize: packContents.length }, "Generated pack");
    return {
        pack: packContents,
        warning: warnings.length > 0 ? warnings.join(' ') : null, // Include warnings in the return
    };
}
