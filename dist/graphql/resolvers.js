"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const boosterService_1 = require("../boosterService"); // Only import generatePack for now
const logger_1 = __importDefault(require("../logger"));
const graphql_1 = require("graphql"); // Import for throwing GraphQL-specific errors
// Helper to get product or throw GraphQLError
function findProductOrThrow(productCode, loadedData) {
    var _a;
    const product = (_a = loadedData.extendedDataArray) === null || _a === void 0 ? void 0 : _a.find((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.code) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === productCode.toLowerCase(); });
    if (!product) {
        logger_1.default.warn({ productCode }, 'GraphQL resolver: Product not found');
        throw new graphql_1.GraphQLError('Product not found', {
            extensions: {
                code: 'NOT_FOUND',
                argumentName: 'productCode',
            },
        });
    }
    return product;
}
// Resolver Map
exports.resolvers = {
    Query: {
        // Resolver for the 'sets' query
        sets: (_parent, _args, contextValue) => {
            const { loadedData } = contextValue;
            if (!(loadedData === null || loadedData === void 0 ? void 0 : loadedData.allPrintings) || !(loadedData === null || loadedData === void 0 ? void 0 : loadedData.extendedDataArray)) {
                logger_1.default.error('GraphQL sets query called before data loaded.');
                throw new graphql_1.GraphQLError('Server data not ready', {
                    extensions: { code: 'DATA_NOT_READY' },
                });
            }
            logger_1.default.info('Resolving GraphQL query: sets');
            const seenCodes = new Set();
            const setsArray = [];
            for (const product of loadedData.extendedDataArray) {
                const setCode = product.set_code.toUpperCase();
                const mtgSet = loadedData.allPrintings.data[setCode];
                if (!seenCodes.has(setCode) && mtgSet) {
                    seenCodes.add(setCode);
                    setsArray.push({
                        code: setCode,
                        name: mtgSet.name,
                        releaseDate: mtgSet.releaseDate,
                    });
                }
            }
            // Create a new array and sort it
            const sortedSets = [...setsArray].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            return sortedSets;
        },
        // Resolver for the 'products' query
        products: (_parent, { setCode }, { loadedData }) => {
            const upperSetCode = setCode.toUpperCase();
            logger_1.default.info({ setCode: upperSetCode }, `Resolving products for set`);
            if (!(loadedData === null || loadedData === void 0 ? void 0 : loadedData.extendedDataArray)) {
                logger_1.default.warn('Extended data array not loaded, returning empty product list.');
                return [];
            }
            const matchingProducts = loadedData.extendedDataArray.filter((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.set_code) === null || _a === void 0 ? void 0 : _a.toUpperCase()) === upperSetCode; });
            // Sort products alphabetically by name
            matchingProducts.sort((a, b) => a.name.localeCompare(b.name));
            // Return the data without transforming sheets here
            return matchingProducts;
        },
        // Resolver for the 'product' query
        product: (_parent, args, contextValue) => {
            const { loadedData } = contextValue;
            const { productCode } = args;
            if (!productCode) {
                throw new graphql_1.GraphQLError('Missing required argument: productCode', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }
            logger_1.default.info({ productCode }, 'Resolving GraphQL query: product');
            try {
                const product = findProductOrThrow(productCode, loadedData);
                return product;
            }
            catch (error) {
                return null;
            }
        },
        // NEW: Resolver for the 'card' query
        card: (_parent, { uuid }, { loadedData }) => {
            logger_1.default.info({ uuid }, 'Resolving card query');
            if (!(loadedData === null || loadedData === void 0 ? void 0 : loadedData.combinedCards)) {
                throw new graphql_1.GraphQLError('Card data not loaded', {
                    extensions: { code: 'DATA_NOT_READY' },
                });
            }
            const cardData = loadedData.combinedCards[uuid];
            if (!cardData) {
                logger_1.default.warn({ uuid }, 'Card not found for UUID');
                return null;
            }
            return cardData;
        },
    },
    Mutation: {
        // Resolver for the 'openPack' mutation
        openPack: (_parent, args, contextValue) => {
            const { loadedData } = contextValue;
            const { productCode } = args;
            if (!productCode) {
                throw new graphql_1.GraphQLError('Missing required argument: productCode', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }
            logger_1.default.info({ productCode }, 'Resolving GraphQL mutation: openPack');
            const product = findProductOrThrow(productCode, loadedData);
            const result = (0, boosterService_1.generatePack)(product, loadedData);
            return {
                warning: result.warning,
                pack: result.pack.map((opened) => ({
                    sheet: opened.sheet,
                    card: opened.card,
                })),
            };
        },
        // Resolver for the 'openPacks' mutation
        openPacks: (_parent, args, contextValue) => {
            const { loadedData } = contextValue;
            const { productCode, number } = args;
            if (!productCode) {
                throw new graphql_1.GraphQLError('Missing required argument: productCode', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }
            if (!number || number <= 0 || number > 100) {
                // Basic validation for number
                throw new graphql_1.GraphQLError('Invalid number argument (must be 1-100)', {
                    extensions: { code: 'BAD_USER_INPUT' },
                });
            }
            logger_1.default.info({ productCode, count: number }, 'Resolving GraphQL mutation: openPacks');
            const product = findProductOrThrow(productCode, loadedData);
            let allOpenedCardsInternal = [];
            const allWarnings = new Set();
            for (let i = 0; i < number; i++) {
                const result = (0, boosterService_1.generatePack)(product, loadedData);
                if (result.pack) {
                    allOpenedCardsInternal = allOpenedCardsInternal.concat(result.pack);
                }
                if (result.warning) {
                    allWarnings.add(result.warning);
                }
            }
            const combinedWarning = allWarnings.size > 0 ? Array.from(allWarnings).join(' ') : null;
            logger_1.default.info({
                productCode,
                number,
                openedCount: allOpenedCardsInternal.length,
                warnings: combinedWarning,
            }, 'Finished openPacks mutation');
            const gqlOpenedCards = allOpenedCardsInternal.map((opened) => ({
                sheet: opened.sheet,
                card: opened.card,
            }));
            return {
                warning: combinedWarning,
                packs: gqlOpenedCards,
            };
        },
    },
    // --- Resolvers for Nested/Object Types ---
    // Add resolver for Product Type to handle transformations
    Product: {
        // Resolver for the 'sheets' field: transforms Record to Array
        sheets: (parent) => {
            return Object.entries(parent.sheets || {}).map(([sheetName, sheetData]) => ({
                name: sheetName,
                balanceColors: sheetData.balance_colors,
                cards: sheetData.cards.map((card) => ({
                    // Map card data
                    uuid: card.uuid,
                    weight: card.weight,
                })),
                foil: sheetData.foil,
                totalWeight: sheetData.total_weight,
            }));
        },
        // Resolver for the 'boosters' field (might need transformation if schema differs)
        boosters: (parent) => {
            // Assuming ExtendedBooster matches BoosterV2 schema enough for direct return
            // Add transformations here if necessary (e.g., mapping contents)
            return parent.boosters || [];
        },
        // Other fields like code, name, set_code, set_name usually resolve directly
        tcgMarketPrice: (parent) => {
            var _a;
            return (_a = parent.tcgMarketPrice) !== null && _a !== void 0 ? _a : null;
        },
    },
    ScryfallCard: {
        // Optional: Resolver to stringify complex fields if needed by client
        prices: (parent) => parent.prices ? JSON.stringify(parent.prices) : null,
        // Direct mapping usually works if schema matches TypeScript type
        image_uris: (parent) => parent.image_uris,
        card_faces: (parent) => parent.card_faces,
        all_parts: (parent) => parent.all_parts,
        // Add resolvers for other complex fields like legalities, related_uris etc. if needed
    },
    // Resolver for BoosterV2 type (maps to ExtendedBooster)
    BoosterV2: {
        contents: (booster) => {
            return Object.entries(booster.sheets || {}).map(([sheetName, count]) => ({
                sheetName,
                count,
            }));
        },
        totalWeight: (booster) => booster.weight,
    },
    // Other type resolvers (SheetV2, SheetCardEntry, BoosterContentEntry) are likely not needed
    // as the parent resolver (Product) handles the data transformation.
    // NEW: Resolver for CombinedCard type (trivial resolvers)
    CombinedCard: {
        allPrintingsData: (parent) => parent.allPrintingsData,
        scryfallData: (parent) => parent.scryfallData,
        tcgNormalMarketPrice: (parent) => parent.tcgNormalMarketPrice,
        tcgFoilMarketPrice: (parent) => parent.tcgFoilMarketPrice,
    },
    AllPrintingsCard: {
        identifiers: (parent) => parent.identifiers,
    },
};
