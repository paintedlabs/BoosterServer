"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const boosterService_1 = require("../boosterService");
const logger_1 = __importDefault(require("../logger"));
const graphql_1 = require("graphql");
// Helper to get product or throw GraphQLError
function findProductOrThrow(productCode, loadedData) {
    const product = loadedData.extendedDataArray?.find((p) => p?.code?.toLowerCase() === productCode.toLowerCase());
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
        // Get all sets
        sets: async (_, __, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            logger_1.default.debug('Resolving sets query');
            return loadedData?.sets ?? [];
        },
        // Get a specific set by code
        set: async (_, { code }, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            if (!loadedData || !loadedData.sets) {
                logger_1.default.error('Loaded data or sets array is undefined');
                return null;
            }
            // Find the set in the sets array
            const set = loadedData.sets.find((s) => s.code === code);
            if (!set) {
                logger_1.default.debug({ code }, 'Set not found');
                return null;
            }
            // Get the full card data for this set
            const cardsData = set.cards
                .map((card) => loadedData.combinedCards[card.uuid])
                .filter((c) => !!c);
            // Get the full sealed product data for this set
            const sealedProductsData = set.sealedProduct
                .map((sp) => loadedData.sealedProducts[sp.uuid])
                .filter((p) => !!p);
            return {
                ...set,
                cards: cardsData,
                sealedProduct: sealedProductsData,
            };
        },
        // Get all sealed products for a specific set
        sealedProductsForSet: async (_, { code }, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            // Find the set first by its code within the sets array
            const set = loadedData.sets.find((s) => s.code === code);
            if (set && set.sealedProduct) {
                // Map the sealedProduct array from the set to the actual product objects using UUIDs
                const products = set.sealedProduct // Iterate over the sealed products in the set
                    .map((sp) => loadedData.sealedProducts[sp.uuid]) // Look up by UUID in the map
                    .filter((product) => !!product); // Filter out any undefined results (if UUID is bad)
                logger_1.default.debug({ setCode: code, productCount: products.length }, 'Returning products for set');
                return products;
            }
            else if (set) {
                // Set found but has no sealedProduct array
                logger_1.default.debug({ setCode: code }, 'Set found but has no sealed products');
                return [];
            }
            else {
                // Should not happen if hasOwnProperty is true
                logger_1.default.warn({ setCode: code }, `Set with code ${code} found by key but was unexpectedly undefined.`);
                return [];
            }
        },
        // Get all sealed products
        sealedProducts: async (_, __, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            logger_1.default.debug('Resolving sealedProducts query');
            if (!loadedData || !loadedData.sealedProducts) {
                logger_1.default.error('Loaded data or sealedProducts map is undefined');
                return [];
            }
            // Return all sealed products from the map, filtering out those with null/undefined UUIDs
            const products = Object.values(loadedData.sealedProducts).filter((product) => product &&
                typeof product.uuid === 'string' &&
                product.uuid.trim().length > 0);
            logger_1.default.debug({ productCount: products.length }, 'Returning all sealed products (filtered for valid UUIDs)');
            return products;
        },
        // Get a specific sealed product by code (or UUID? Resolver uses UUID)
        sealedProduct: async (_, { code }, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            // Try to find by UUID first
            let product = Object.values(loadedData.sealedProducts).find((product) => product.uuid === code);
            // If not found by UUID, try to find by code
            if (!product) {
                product = Object.values(loadedData.sealedProducts).find((product) => product.code.toLowerCase() === code.toLowerCase());
            }
            if (!product) {
                logger_1.default.warn({ code }, 'Product not found by UUID or code');
                throw new graphql_1.GraphQLError('Product not found', {
                    extensions: {
                        code: 'NOT_FOUND',
                        argumentName: 'code',
                    },
                });
            }
            return product;
        },
        // Get a specific card by UUID
        card: async (_, { uuid }, { dataSources }) => {
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            return loadedData.cards.find((card) => card.uuid === uuid);
        },
    },
    Mutation: {
        // Open a single pack
        openPack: async (_, { productCode }, { dataSources }) => {
            logger_1.default.info({ productCode }, 'OpenPack mutation called');
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            // Try to find by UUID first
            let product = loadedData.sealedProducts[productCode];
            // If not found by UUID, try to find by code
            if (!product) {
                const products = Object.values(loadedData.sealedProducts);
                product = products.find((p) => p.code.toLowerCase() === productCode.toLowerCase());
            }
            if (!product) {
                logger_1.default.warn({ productCode }, 'Product not found by UUID or code');
                throw new graphql_1.GraphQLError('Product not found', {
                    extensions: {
                        code: 'NOT_FOUND',
                        argumentName: 'productCode',
                    },
                });
            }
            if (!product.booster) {
                logger_1.default.warn({ productCode, productName: product.name }, 'Product has no booster configuration');
                throw new graphql_1.GraphQLError('Product does not have booster configuration', {
                    extensions: {
                        code: 'INVALID_PRODUCT',
                        argumentName: 'productCode',
                    },
                });
            }
            return (0, boosterService_1.generatePack)(product, loadedData);
        },
        // Open multiple packs
        openPacks: async (_, { productCode, number }, { dataSources }) => {
            logger_1.default.info({ productCode, number }, 'OpenPacks mutation called');
            const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
            // Find the product by UUID in the sealedProducts map
            const product = loadedData.sealedProducts[productCode];
            logger_1.default.debug({
                productCode,
                found: !!product,
                productName: product?.name,
                hasBooster: !!product?.booster,
                boosterName: product?.booster?.name,
                boosterCount: product?.booster?.boosters?.length,
                sheetCount: Object.keys(product?.booster?.sheets || {}).length,
                loadedDataStats: {
                    sealedProductsCount: Object.keys(loadedData.sealedProducts).length,
                    combinedCardsCount: Object.keys(loadedData.combinedCards).length,
                    hasAllPrintings: !!loadedData.allPrintings,
                },
            }, 'Product lookup results');
            if (!product) {
                throw new Error(`Product with code ${productCode} not found`);
            }
            if (!product.booster ||
                !product.booster.boosters ||
                product.booster.boosters.length === 0) {
                logger_1.default.warn({
                    productCode,
                    productName: product.name,
                    boosterConfig: JSON.stringify(product.booster, null, 2),
                }, 'Product is not configured as a booster pack');
                return {
                    warning: `Product ${product.name} (${productCode}) is not configured as a booster pack. This might be a bundle, deck, or other sealed product.`,
                    packs: [],
                };
            }
            const packs = [];
            for (let i = 0; i < number; i++) {
                logger_1.default.debug({ productCode, packNumber: i + 1, totalPacks: number }, 'Generating pack');
                const pack = await (0, boosterService_1.generatePack)(product, loadedData);
                if (pack.pack) {
                    packs.push(...pack.pack);
                }
                if (pack.warning) {
                    logger_1.default.warn({ productCode, packNumber: i + 1, warning: pack.warning }, 'Pack generation warning');
                }
            }
            logger_1.default.debug({
                productCode,
                totalPacks: number,
                generatedPacks: packs.length,
                packDetails: packs.map((p) => ({
                    sheet: p.sheet,
                    cardName: p.card.name,
                    cardUUID: p.card.uuid,
                })),
            }, 'Pack generation complete');
            return {
                warning: null,
                packs,
            };
        },
    },
    // --- Resolvers for Nested/Object Types ---
    // Resolver for SealedProduct type
    SealedProduct: {
        // Resolver for the 'booster' field
        booster: (parent) => {
            if (!parent.boosters || parent.boosters.length === 0)
                return null;
            return {
                name: parent.name || '',
                boosters: parent.boosters.map((booster) => ({
                    weight: booster.weight,
                    contents: Object.entries(booster.sheets).map(([sheet, count]) => ({
                        sheet,
                        count,
                    })),
                })),
                boostersTotalWeight: parent.boosters.reduce((sum, booster) => sum + booster.weight, 0),
                sheets: Object.entries(parent.sheets || {}).map(([sheetName, sheetData]) => ({
                    name: sheetName,
                    balanceColors: sheetData.balanceColors,
                    cards: sheetData.cards,
                    foil: sheetData.foil,
                    totalWeight: sheetData.totalWeight,
                })),
            };
        },
        // Other fields like code, name, set_code, set_name usually resolve directly
        tcgMarketPrice: (parent) => {
            return parent.tcgMarketPrice ?? null;
        },
        tcgplayerProductId: (parent) => {
            return parent.tcgplayerProductId ?? null;
        },
    },
    // Resolver for BoosterConfig type
    BoosterConfig: {
        boosters: (parent) => parent.boosters || [],
        boostersTotalWeight: (parent) => parent.boostersTotalWeight || 0,
        name: (parent) => parent.name || '',
        sheets: (parent) => Object.values(parent.sheets || {}),
    },
    // Resolver for BoosterSheet type
    BoosterSheet: {
        totalWeight: (parent) => parent.totalWeight || 0,
        balanceColors: (parent) => parent.balanceColors || false,
        foil: (parent) => parent.foil || false,
        fixed: (parent) => parent.fixed || false,
        cards: (parent) => parent.cards || [],
    },
    // Resolver for BoosterSheetCard type
    BoosterSheetCard: {
        uuid: (parent) => parent.uuid || '',
        weight: (parent) => parent.weight || 0,
    },
    // Resolver for BoosterEntry type
    BoosterEntry: {
        weight: (parent) => parent.weight || 0,
        contents: (parent) => parent.contents || [],
    },
    // Resolver for BoosterContent type
    BoosterContent: {
        sheet: (parent) => parent.sheet || '',
        count: (parent) => parent.count || 0,
    },
    // Resolver for SealedProductContents type
    SealedProductContents: {
        card: (parent) => parent.card || [],
        deck: (parent) => parent.deck || [],
        other: (parent) => parent.other || [],
        pack: (parent) => parent.pack || [],
        sealed: (parent) => parent.sealed || [],
        variable: (parent) => parent.variable || [],
    },
    // Resolver for SealedProductCard type
    SealedProductCard: {
        foil: (parent) => parent.foil || false,
        name: (parent) => parent.name || '',
        number: (parent) => parent.number || '',
        set: (parent) => parent.set || '',
        uuid: (parent) => parent.uuid || '',
    },
    // Resolver for SealedProductDeck type
    SealedProductDeck: {
        name: (parent) => parent.name || '',
        set: (parent) => parent.set || '',
    },
    // Resolver for SealedProductOther type
    SealedProductOther: {
        name: (parent) => parent.name || '',
    },
    // Resolver for SealedProductPack type
    SealedProductPack: {
        code: (parent) => parent.code || '',
        set: (parent) => parent.set || '',
    },
    // Resolver for SealedProductSealed type
    SealedProductSealed: {
        count: (parent) => parent.count || 0,
        name: (parent) => parent.name || '',
        set: (parent) => parent.set || '',
        uuid: (parent) => parent.uuid || '',
    },
    // Resolver for SealedProductVariable type
    SealedProductVariable: {
        configs: (parent) => parent.configs || [],
    },
    // Resolver for Card type
    Card: {
        // All fields resolve directly from the CombinedCard type
        uuid: (parent) => parent.uuid,
        name: (parent) => parent.name,
        asciiName: (parent) => parent.asciiName,
        setCode: (parent) => parent.setCode,
        number: (parent) => parent.number,
        layout: (parent) => parent.layout,
        type: (parent) => parent.type,
        types: (parent) => parent.types,
        subtypes: (parent) => parent.subtypes,
        supertypes: (parent) => parent.supertypes,
        text: (parent) => parent.text,
        flavorText: (parent) => parent.flavorText,
        artist: (parent) => parent.artist,
        artistIds: (parent) => parent.artistIds,
        borderColor: (parent) => parent.borderColor,
        frameVersion: (parent) => parent.frameVersion,
        frameEffects: (parent) => parent.frameEffects,
        language: (parent) => parent.language,
        rarity: (parent) => parent.rarity,
        cardParts: (parent) => parent.cardParts,
        finishes: (parent) => parent.finishes,
        identifiers: (parent) => parent.identifiers,
        purchaseUrls: (parent) => parent.purchaseUrls,
        legalities: (parent) => parent.legalities,
        leadershipSkills: (parent) => parent.leadershipSkills,
        colors: (parent) => parent.colors,
        colorIdentity: (parent) => parent.colorIdentity,
        colorIndicator: (parent) => parent.colorIndicator,
        manaCost: (parent) => parent.manaCost,
        convertedManaCost: (parent) => parent.convertedManaCost,
        manaValue: (parent) => parent.manaValue,
        power: (parent) => parent.power,
        toughness: (parent) => parent.toughness,
        defense: (parent) => parent.defense,
        loyalty: (parent) => parent.loyalty,
        life: (parent) => parent.life,
        hand: (parent) => parent.hand,
        hasFoil: (parent) => parent.hasFoil,
        hasNonFoil: (parent) => parent.hasNonFoil,
        isAlternative: (parent) => parent.isAlternative,
        isFullArt: (parent) => parent.isFullArt,
        isFunny: (parent) => parent.isFunny,
        isOnlineOnly: (parent) => parent.isOnlineOnly,
        isOversized: (parent) => parent.isOversized,
        isPromo: (parent) => parent.isPromo,
        isRebalanced: (parent) => parent.isRebalanced,
        isReprint: (parent) => parent.isReprint,
        isReserved: (parent) => parent.isReserved,
        isStarter: (parent) => parent.isStarter,
        isStorySpotlight: (parent) => parent.isStorySpotlight,
        isTextless: (parent) => parent.isTextless,
        isTimeshifted: (parent) => parent.isTimeshifted,
        hasAlternativeDeckLimit: (parent) => parent.hasAlternativeDeckLimit,
        hasContentWarning: (parent) => parent.hasContentWarning,
        image_uris: (parent) => parent.image_uris,
        foil: (parent) => parent.finishes?.includes('foil') || false,
        keywords: (parent) => parent.keywords,
        oracle_text: (parent) => parent.oracle_text,
        type_line: (parent) => parent.type_line,
        released_at: (parent) => parent.released_at,
        highres_image: (parent) => parent.highres_image,
        image_status: (parent) => parent.image_status,
        tcgplayer_product_id: (parent) => parent.identifiers?.tcgplayerProductId
            ? parseInt(parent.identifiers.tcgplayerProductId)
            : null,
        tcgplayer_prices: (parent) => parent.tcgplayer.prices,
        tcgplayer_image_url: (parent) => parent.tcgplayer.image_url,
        tcgplayer_clean_name: (parent) => parent.tcgplayer.clean_name,
        tcgplayer_extended_data: (parent) => parent.tcgplayer.extended_data,
        foil_types: (parent) => parent.foil_types,
    },
};
