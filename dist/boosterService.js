"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBooster = pickBooster;
exports.pickCardFromSheet = pickCardFromSheet;
exports.generatePack = generatePack;
const logger_1 = __importDefault(require("./logger"));
// OpenedPackResponse moved to types.ts
// -------------- BOOSTER SIMULATION LOGIC --------------
/**
 * Selects a booster configuration based on weighted randomness.
 */
function pickBooster(product) {
    logger_1.default.debug({
        productUuid: product.uuid,
        productCode: product.code,
        productName: product.name,
        hasBooster: !!product.booster,
        boosterDetails: product.booster
            ? {
                boostersCount: product.booster.boosters?.length,
                boostersTotalWeight: product.booster.boostersTotalWeight,
                sheetsCount: Object.keys(product.booster.sheets || {}).length,
                sheetNames: Object.keys(product.booster.sheets || {}),
            }
            : null,
    }, 'Attempting to pick booster configuration');
    if (!product.booster) {
        logger_1.default.warn({
            productUuid: product.uuid,
            productCode: product.code,
            productName: product.name,
        }, 'Product has no booster configuration');
        throw new Error('Product is not configured as a booster pack');
    }
    if (!product.booster.boosters || product.booster.boosters.length === 0) {
        logger_1.default.warn({
            productUuid: product.uuid,
            productCode: product.code,
            productName: product.name,
            boosterConfig: product.booster,
        }, 'Product has empty boosters array');
        throw new Error('Product has no booster configurations');
    }
    // Calculate total weight of all boosters
    const totalWeight = product.booster.boosters.reduce((sum, booster) => sum + booster.weight, 0);
    logger_1.default.debug({
        productUuid: product.uuid,
        productCode: product.code,
        totalWeight,
        boostersCount: product.booster.boosters.length,
        boosterWeights: product.booster.boosters.map((b) => b.weight),
    }, 'Calculated booster weights');
    if (totalWeight <= 0) {
        logger_1.default.warn({
            productUuid: product.uuid,
            productCode: product.code,
            totalWeight,
            boosters: product.booster.boosters,
        }, 'Total booster weight is zero or negative');
        throw new Error('Invalid booster configuration: total weight must be positive');
    }
    // Pick a random booster configuration based on weights
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (const booster of product.booster.boosters) {
        currentWeight += booster.weight;
        if (random <= currentWeight) {
            logger_1.default.debug({
                productUuid: product.uuid,
                productCode: product.code,
                selectedBooster: {
                    weight: booster.weight,
                    contentsCount: booster.contents?.length || 0,
                    contents: booster.contents?.map((c) => ({
                        sheet: c.sheet,
                        count: c.count,
                    })),
                },
            }, 'Selected booster configuration');
            return booster;
        }
    }
    logger_1.default.warn({
        productUuid: product.uuid,
        productCode: product.code,
        random,
        totalWeight,
        currentWeight,
    }, 'Failed to select a booster configuration');
    throw new Error('Failed to select a booster configuration');
}
/**
 * Picks a card from a sheet based on weighted randomness.
 */
function pickCardFromSheet(sheet, cards) {
    logger_1.default.debug({
        totalWeight: sheet.totalWeight,
        cardCount: sheet.cards.length,
        isFoil: sheet.foil,
        isFixed: sheet.fixed,
    }, 'Attempting to pick card from sheet');
    if (!sheet.cards || sheet.cards.length === 0) {
        logger_1.default.warn({
            sheet,
        }, 'Sheet has no cards');
        throw new Error('Sheet has no cards');
    }
    // Calculate total weight
    const totalWeight = sheet.cards.reduce((sum, card) => sum + card.weight, 0);
    logger_1.default.debug({
        totalWeight,
        cardCount: sheet.cards.length,
        cardWeights: sheet.cards.map((c) => c.weight),
    }, 'Calculated sheet weights');
    if (totalWeight <= 0) {
        logger_1.default.warn({
            totalWeight,
            cards: sheet.cards,
        }, 'Total sheet weight is zero or negative');
        throw new Error('Invalid sheet configuration: total weight must be positive');
    }
    // Pick a random card based on weights
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (const card of sheet.cards) {
        currentWeight += card.weight;
        if (random <= currentWeight) {
            const selectedCard = cards[card.uuid];
            if (!selectedCard) {
                logger_1.default.warn({
                    cardUuid: card.uuid,
                    weight: card.weight,
                }, 'Selected card not found in cards map');
                throw new Error(`Card ${card.uuid} not found in cards map`);
            }
            logger_1.default.debug({
                selectedCard: {
                    uuid: selectedCard.uuid,
                    name: selectedCard.name,
                    weight: card.weight,
                },
            }, 'Selected card from sheet');
            return selectedCard;
        }
    }
    logger_1.default.warn({
        random,
        totalWeight,
        currentWeight,
    }, 'Failed to select a card from sheet');
    throw new Error('Failed to select a card from sheet');
}
/**
 * Generates the contents of a single booster pack for a given product.
 */
function generatePack(product, loadedData) {
    if (!loadedData || !loadedData.allPrintings || !loadedData.combinedCards) {
        logger_1.default.error('generatePack called with incomplete loadedData.');
        return { pack: [], warning: 'Server data is not fully loaded.' };
    }
    logger_1.default.debug({
        productUuid: product.uuid,
        productName: product.name,
        hasBooster: !!product.booster,
        boosterName: product.booster?.name,
        boosterCount: product.booster?.boosters?.length,
        sheetCount: Object.keys(product.booster?.sheets || {}).length,
    }, 'Starting pack generation');
    // Build a map of UUIDs allowed in this product's source sets for validation
    const sourceSetUUIDs = new Set();
    if (product.contents?.card) {
        for (const card of product.contents.card) {
            if (card?.uuid)
                sourceSetUUIDs.add(card.uuid);
        }
        logger_1.default.debug({
            productUuid: product.uuid,
            sourceSetCardCount: sourceSetUUIDs.size,
        }, 'Built source set UUID map');
    }
    else {
        logger_1.default.warn({ productCode: product.uuid }, `Product is missing card contents. Cannot validate card origins.`);
    }
    if (!product.booster?.boosters || product.booster.boosters.length === 0) {
        logger_1.default.warn({
            productCode: product.uuid,
            boosterConfig: JSON.stringify(product.booster, null, 2),
        }, `Product has no booster configurations.`);
        return { pack: [], warning: 'Product has no booster configurations.' };
    }
    const chosenBooster = pickBooster(product);
    if (!chosenBooster) {
        logger_1.default.warn({
            productCode: product.uuid,
            boosterConfig: JSON.stringify(product.booster, null, 2),
        }, `No valid booster definition found or selected.`);
        return {
            pack: [],
            warning: 'No valid booster definition found or zero total weight.',
        };
    }
    logger_1.default.debug({
        productUuid: product.uuid,
        boosterName: product.booster?.name,
        boosterWeight: chosenBooster.weight,
        contentsCount: chosenBooster.contents.length,
        contents: JSON.stringify(chosenBooster.contents, null, 2),
    }, 'Selected booster configuration');
    const packContents = [];
    const warnings = [];
    const sheets = product.booster?.sheets || {};
    logger_1.default.debug({
        productUuid: product.uuid,
        sheetNames: Object.keys(sheets),
        sheetDetails: Object.entries(sheets).map(([name, sheet]) => ({
            name,
            cardCount: sheet.cards.length,
            totalWeight: sheet.totalWeight,
        })),
    }, 'Available sheets');
    for (const content of chosenBooster.contents) {
        const sheetName = content.sheet;
        const count = content.count;
        const sheet = sheets[sheetName];
        if (!sheet) {
            logger_1.default.warn({
                productCode: product.uuid,
                sheetName,
                availableSheets: Object.keys(sheets),
            }, `Processed sheet data missing for sheet '${sheetName}'.`);
            continue;
        }
        logger_1.default.debug({
            productUuid: product.uuid,
            sheetName,
            cardCount: sheet.cards.length,
            totalWeight: sheet.totalWeight,
            sheetCards: sheet.cards.map((c) => ({
                uuid: c.uuid,
                weight: c.weight,
            })),
        }, 'Processing sheet');
        for (let i = 0; i < count; i++) {
            const pickedCard = pickCardFromSheet(sheet, loadedData.combinedCards);
            if (!pickedCard) {
                logger_1.default.warn({
                    productCode: product.uuid,
                    sheetName,
                    sheetCardCount: sheet.cards.length,
                    sheetTotalWeight: sheet.totalWeight,
                }, `Failed to pick card from processed sheet`);
                continue;
            }
            logger_1.default.debug({
                cardUUID: pickedCard.uuid,
                sheetName,
                productCode: product.uuid,
                attempt: i + 1,
                totalAttempts: count,
            }, 'Attempting to lookup chosen card UUID');
            // Validate card belongs to the product's source sets
            if (sourceSetUUIDs.size > 0 && !sourceSetUUIDs.has(pickedCard.uuid)) {
                logger_1.default.warn({
                    productCode: product.uuid,
                    cardUUID: pickedCard.uuid,
                    cardName: pickedCard.name,
                    sheetName,
                    inSourceSet: false,
                }, `Picked card is NOT listed in product contents. Including anyway.`);
            }
            packContents.push({
                sheet: sheetName,
                card: pickedCard,
            });
        }
    }
    logger_1.default.debug({
        productUuid: product.uuid,
        packSize: packContents.length,
        warnings: warnings.length,
        packContents: packContents.map((c) => ({
            sheet: c.sheet,
            cardName: c.card.name,
            cardUUID: c.card.uuid,
        })),
    }, 'Generated pack contents');
    return {
        pack: packContents,
        warning: warnings.length > 0 ? warnings.join(' ') : null,
    };
}
