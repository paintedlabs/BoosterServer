/**
 * graphql/resolvers.ts
 *
 * Defines the resolver functions for the GraphQL schema.
 */

import { LoadedData } from '../dataLoader';
import { generatePack } from '../boosterService';
import { OpenedPackResponse, OpenedPacksResponse, OpenedCard } from '../types';
import logger from '../logger';
import { GraphQLError } from 'graphql';
import { AppContext } from './context';
import type { GraphQLSchema } from 'graphql';
import {
  UnifiedCard,
  UnifiedSet,
  UnifiedSealedProduct,
  UnifiedData,
} from '../src/types/unified/unifiedTypes';
import {
  ExtendedSealedData,
  ExtendedBooster,
  ExtendedSheet,
  ExtendedSheetCard,
} from '../src/types/extendedsealed/extendedSealedTypes';
import { MTGSet } from '../src/types/mtgjson/mtgjsonTypes';
import { CombinedCard } from '../src/types/combined/combinedTypes';

// Helper to get product or throw GraphQLError
function findProductOrThrow(
  productCode: string,
  loadedData: LoadedData
): ExtendedSealedData {
  const product = loadedData.extendedDataArray?.find(
    (p) => p?.code?.toLowerCase() === productCode.toLowerCase()
  );
  if (!product) {
    logger.warn({ productCode }, 'GraphQL resolver: Product not found');
    throw new GraphQLError('Product not found', {
      extensions: {
        code: 'NOT_FOUND',
        argumentName: 'productCode',
      },
    });
  }
  return product;
}

// Resolver Map
export const resolvers = {
  Query: {
    // Get all sets
    sets: async (_: any, __: any, { dataSources }: any) => {
      const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
      logger.debug('Resolving sets query');

      if (!loadedData?.sets) {
        logger.error('Loaded data or sets array is undefined');
        return [];
      }

      // Filter sets to only include those with sealed products
      const setsWithSealedProducts = loadedData.sets.filter(
        (set: UnifiedSet) => set.sealedProduct && set.sealedProduct.length > 0
      );

      // Sort by release date in descending order (newest first)
      const sortedSets = setsWithSealedProducts.sort(
        (a: UnifiedSet, b: UnifiedSet) => {
          const dateA = new Date(a.releaseDate || '1900-01-01');
          const dateB = new Date(b.releaseDate || '1900-01-01');
          return dateB.getTime() - dateA.getTime(); // Descending order
        }
      );

      logger.debug(
        {
          totalSets: loadedData.sets.length,
          setsWithSealedProducts: setsWithSealedProducts.length,
          sortedSetsCount: sortedSets.length,
        },
        'Returning sets with sealed products sorted by release date'
      );

      return sortedSets;
    },

    // Get a specific set by code
    set: async (_: any, { code }: { code: string }, { dataSources }: any) => {
      const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
      if (!loadedData || !loadedData.sets) {
        logger.error('Loaded data or sets array is undefined');
        return null;
      }
      // Find the set in the sets array
      const set = loadedData.sets.find((s: UnifiedSet) => s.code === code);
      if (!set) {
        logger.debug({ code }, 'Set not found');
        return null;
      }

      // Get the full card data for this set
      const cardsData = set.cards
        .map((card: UnifiedCard) => loadedData.combinedCards[card.uuid])
        .filter((c: UnifiedCard | undefined): c is UnifiedCard => !!c);

      // Get the full sealed product data for this set
      const sealedProductsData = set.sealedProduct
        .map((sp: UnifiedSealedProduct) => loadedData.sealedProducts[sp.uuid])
        .filter(
          (p: UnifiedSealedProduct | undefined): p is UnifiedSealedProduct =>
            !!p
        );

      return {
        ...set,
        cards: cardsData,
        sealedProduct: sealedProductsData,
      };
    },

    // Get all sealed products for a specific set
    sealedProductsForSet: async (
      _: any,
      { code }: { code: string },
      { dataSources }: any
    ): Promise<UnifiedSealedProduct[]> => {
      const loadedData: LoadedData =
        await dataSources.mtgjsonAPI.getLoadedData();

      // Find the set first by its code within the sets array
      const set = loadedData.sets.find((s) => s.code === code);

      if (set && set.sealedProduct) {
        // Map the sealedProduct array from the set to the actual product objects using UUIDs
        const products = set.sealedProduct // Iterate over the sealed products in the set
          .map((sp: UnifiedSealedProduct) => loadedData.sealedProducts[sp.uuid]) // Look up by UUID in the map
          .filter((product): product is UnifiedSealedProduct => !!product); // Filter out any undefined results (if UUID is bad)
        logger.debug(
          { setCode: code, productCount: products.length },
          'Returning products for set'
        );
        return products;
      } else if (set) {
        // Set found but has no sealedProduct array
        logger.debug({ setCode: code }, 'Set found but has no sealed products');
        return [];
      } else {
        // Should not happen if hasOwnProperty is true
        logger.warn(
          { setCode: code },
          `Set with code ${code} found by key but was unexpectedly undefined.`
        );
        return [];
      }
    },

    // Get all sealed products
    sealedProducts: async (_: any, __: any, { dataSources }: any) => {
      const loadedData: LoadedData =
        await dataSources.mtgjsonAPI.getLoadedData();
      logger.debug('Resolving sealedProducts query');

      if (!loadedData || !loadedData.sealedProducts) {
        logger.error('Loaded data or sealedProducts map is undefined');
        return [];
      }

      // Return all sealed products from the map, filtering out those with null/undefined UUIDs
      const products = Object.values(loadedData.sealedProducts).filter(
        (product): product is UnifiedSealedProduct =>
          product &&
          typeof product.uuid === 'string' &&
          product.uuid.trim().length > 0
      );
      logger.debug(
        { productCount: products.length },
        'Returning all sealed products (filtered for valid UUIDs)'
      );
      return products;
    },

    // Get a specific sealed product by code (or UUID? Resolver uses UUID)
    sealedProduct: async (
      _: any,
      { code }: { code: string },
      { dataSources }: any
    ) => {
      const loadedData: LoadedData =
        await dataSources.mtgjsonAPI.getLoadedData();

      // Try to find by UUID first
      let product = Object.values(loadedData.sealedProducts).find(
        (product: UnifiedSealedProduct) => product.uuid === code
      );

      // If not found by UUID, try to find by code
      if (!product) {
        product = Object.values(loadedData.sealedProducts).find(
          (product: UnifiedSealedProduct) =>
            product.code.toLowerCase() === code.toLowerCase()
        );
      }

      if (!product) {
        logger.warn({ code }, 'Product not found by UUID or code');
        throw new GraphQLError('Product not found', {
          extensions: {
            code: 'NOT_FOUND',
            argumentName: 'code',
          },
        });
      }

      return product;
    },

    // Get a specific card by UUID
    card: async (_: any, { uuid }: { uuid: string }, { dataSources }: any) => {
      const loadedData = await dataSources.mtgjsonAPI.getLoadedData();
      return loadedData.cards.find((card: UnifiedCard) => card.uuid === uuid);
    },
  },

  Mutation: {
    // Open a single pack
    openPack: async (
      _: any,
      { productCode }: { productCode: string },
      { dataSources }: any
    ) => {
      logger.info({ productCode }, 'OpenPack mutation called');
      const loadedData = await dataSources.mtgjsonAPI.getLoadedData();

      // Try to find by UUID first
      let product = loadedData.sealedProducts[productCode];

      // If not found by UUID, try to find by code
      if (!product) {
        const products = Object.values(
          loadedData.sealedProducts
        ) as UnifiedSealedProduct[];
        product = products.find(
          (p) => p.code.toLowerCase() === productCode.toLowerCase()
        );
      }

      if (!product) {
        logger.warn({ productCode }, 'Product not found by UUID or code');
        throw new GraphQLError('Product not found', {
          extensions: {
            code: 'NOT_FOUND',
            argumentName: 'productCode',
          },
        });
      }

      if (!product.booster) {
        logger.warn(
          { productCode, productName: product.name },
          'Product has no booster configuration'
        );
        throw new GraphQLError('Product does not have booster configuration', {
          extensions: {
            code: 'INVALID_PRODUCT',
            argumentName: 'productCode',
          },
        });
      }

      return generatePack(product, loadedData);
    },

    // Open multiple packs
    openPacks: async (
      _: any,
      { productCode, number }: { productCode: string; number: number },
      { dataSources }: any
    ) => {
      logger.info({ productCode, number }, 'OpenPacks mutation called');
      const loadedData = await dataSources.mtgjsonAPI.getLoadedData();

      // Find the product by UUID in the sealedProducts map
      const product = loadedData.sealedProducts[productCode];

      logger.debug(
        {
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
        },
        'Product lookup results'
      );

      if (!product) {
        throw new Error(`Product with code ${productCode} not found`);
      }

      if (
        !product.booster ||
        !product.booster.boosters ||
        product.booster.boosters.length === 0
      ) {
        logger.warn(
          {
            productCode,
            productName: product.name,
            boosterConfig: JSON.stringify(product.booster, null, 2),
          },
          'Product is not configured as a booster pack'
        );
        return {
          warning: `Product ${product.name} (${productCode}) is not configured as a booster pack. This might be a bundle, deck, or other sealed product.`,
          packs: [],
        };
      }

      const packs = [];
      for (let i = 0; i < number; i++) {
        logger.debug(
          { productCode, packNumber: i + 1, totalPacks: number },
          'Generating pack'
        );
        const pack = await generatePack(product, loadedData);
        if (pack.pack) {
          packs.push(...pack.pack);
        }
        if (pack.warning) {
          logger.warn(
            { productCode, packNumber: i + 1, warning: pack.warning },
            'Pack generation warning'
          );
        }
      }

      logger.debug(
        {
          productCode,
          totalPacks: number,
          generatedPacks: packs.length,
          packDetails: packs.map((p) => ({
            sheet: p.sheet,
            cardName: p.card.name,
            cardUUID: p.card.uuid,
          })),
        },
        'Pack generation complete'
      );

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
    booster: (parent: ExtendedSealedData) => {
      if (!parent.boosters || parent.boosters.length === 0) return null;
      return {
        name: parent.name || '',
        boosters: parent.boosters.map((booster) => ({
          weight: booster.weight,
          contents: Object.entries(booster.sheets).map(([sheet, count]) => ({
            sheet,
            count,
          })),
        })),
        boostersTotalWeight: parent.boosters.reduce(
          (sum, booster) => sum + booster.weight,
          0
        ),
        sheets: Object.entries(parent.sheets || {}).map(
          ([sheetName, sheetData]) => ({
            name: sheetName,
            balanceColors: sheetData.balanceColors,
            cards: sheetData.cards,
            foil: sheetData.foil,
            totalWeight: sheetData.totalWeight,
          })
        ),
      };
    },
    // Other fields like code, name, set_code, set_name usually resolve directly
    tcgMarketPrice: (parent: ExtendedSealedData): number | null => {
      return parent.tcgMarketPrice ?? null;
    },
    tcgplayerProductId: (parent: ExtendedSealedData): number | null => {
      return parent.tcgplayerProductId ?? null;
    },
  },

  // Resolver for BoosterConfig type
  BoosterConfig: {
    boosters: (parent: any) => parent.boosters || [],
    boostersTotalWeight: (parent: any) => parent.boostersTotalWeight || 0,
    name: (parent: any) => parent.name || '',
    sheets: (parent: any) => Object.values(parent.sheets || {}),
  },

  // Resolver for BoosterSheet type
  BoosterSheet: {
    totalWeight: (parent: any) => parent.totalWeight || 0,
    balanceColors: (parent: any) => parent.balanceColors || false,
    foil: (parent: any) => parent.foil || false,
    fixed: (parent: any) => parent.fixed || false,
    cards: (parent: any) => parent.cards || [],
  },

  // Resolver for BoosterSheetCard type
  BoosterSheetCard: {
    uuid: (parent: any) => parent.uuid || '',
    weight: (parent: any) => parent.weight || 0,
  },

  // Resolver for BoosterEntry type
  BoosterEntry: {
    weight: (parent: any) => parent.weight || 0,
    contents: (parent: any) => parent.contents || [],
  },

  // Resolver for BoosterContent type
  BoosterContent: {
    sheet: (parent: any) => parent.sheet || '',
    count: (parent: any) => parent.count || 0,
  },

  // Resolver for SealedProductContents type
  SealedProductContents: {
    card: (parent: any) => parent.card || [],
    deck: (parent: any) => parent.deck || [],
    other: (parent: any) => parent.other || [],
    pack: (parent: any) => parent.pack || [],
    sealed: (parent: any) => parent.sealed || [],
    variable: (parent: any) => parent.variable || [],
  },

  // Resolver for SealedProductCard type
  SealedProductCard: {
    foil: (parent: any) => parent.foil || false,
    name: (parent: any) => parent.name || '',
    number: (parent: any) => parent.number || '',
    set: (parent: any) => parent.set || '',
    uuid: (parent: any) => parent.uuid || '',
  },

  // Resolver for SealedProductDeck type
  SealedProductDeck: {
    name: (parent: any) => parent.name || '',
    set: (parent: any) => parent.set || '',
  },

  // Resolver for SealedProductOther type
  SealedProductOther: {
    name: (parent: any) => parent.name || '',
  },

  // Resolver for SealedProductPack type
  SealedProductPack: {
    code: (parent: any) => parent.code || '',
    set: (parent: any) => parent.set || '',
  },

  // Resolver for SealedProductSealed type
  SealedProductSealed: {
    count: (parent: any) => parent.count || 0,
    name: (parent: any) => parent.name || '',
    set: (parent: any) => parent.set || '',
    uuid: (parent: any) => parent.uuid || '',
  },

  // Resolver for SealedProductVariable type
  SealedProductVariable: {
    configs: (parent: any) => parent.configs || [],
  },

  // Resolver for Card type
  Card: {
    // All fields resolve directly from the CombinedCard type
    uuid: (parent: CombinedCard) => parent.uuid,
    name: (parent: CombinedCard) => parent.name,
    asciiName: (parent: CombinedCard) => parent.asciiName,
    setCode: (parent: CombinedCard) => parent.setCode,
    number: (parent: CombinedCard) => parent.number,
    layout: (parent: CombinedCard) => parent.layout,
    type: (parent: CombinedCard) => parent.type,
    types: (parent: CombinedCard) => parent.types,
    subtypes: (parent: CombinedCard) => parent.subtypes,
    supertypes: (parent: CombinedCard) => parent.supertypes,
    text: (parent: CombinedCard) => parent.text,
    flavorText: (parent: CombinedCard) => parent.flavorText,
    artist: (parent: CombinedCard) => parent.artist,
    artistIds: (parent: CombinedCard) => parent.artistIds,
    borderColor: (parent: CombinedCard) => parent.borderColor,
    frameVersion: (parent: CombinedCard) => parent.frameVersion,
    frameEffects: (parent: CombinedCard) => parent.frameEffects,
    language: (parent: CombinedCard) => parent.language,
    rarity: (parent: CombinedCard) => parent.rarity,
    cardParts: (parent: CombinedCard) => parent.cardParts,
    finishes: (parent: CombinedCard) => parent.finishes,
    identifiers: (parent: CombinedCard) => parent.identifiers,
    purchaseUrls: (parent: CombinedCard) => parent.purchaseUrls,
    legalities: (parent: CombinedCard) => parent.legalities,
    leadershipSkills: (parent: CombinedCard) => parent.leadershipSkills,
    colors: (parent: CombinedCard) => parent.colors,
    colorIdentity: (parent: CombinedCard) => parent.colorIdentity,
    colorIndicator: (parent: CombinedCard) => parent.colorIndicator,
    manaCost: (parent: CombinedCard) => parent.manaCost,
    convertedManaCost: (parent: CombinedCard) => parent.convertedManaCost,
    manaValue: (parent: CombinedCard) => parent.manaValue,
    power: (parent: CombinedCard) => parent.power,
    toughness: (parent: CombinedCard) => parent.toughness,
    defense: (parent: CombinedCard) => parent.defense,
    loyalty: (parent: CombinedCard) => parent.loyalty,
    life: (parent: CombinedCard) => parent.life,
    hand: (parent: CombinedCard) => parent.hand,
    hasFoil: (parent: CombinedCard) => parent.hasFoil,
    hasNonFoil: (parent: CombinedCard) => parent.hasNonFoil,
    isAlternative: (parent: CombinedCard) => parent.isAlternative,
    isFullArt: (parent: CombinedCard) => parent.isFullArt,
    isFunny: (parent: CombinedCard) => parent.isFunny,
    isOnlineOnly: (parent: CombinedCard) => parent.isOnlineOnly,
    isOversized: (parent: CombinedCard) => parent.isOversized,
    isPromo: (parent: CombinedCard) => parent.isPromo,
    isRebalanced: (parent: CombinedCard) => parent.isRebalanced,
    isReprint: (parent: CombinedCard) => parent.isReprint,
    isReserved: (parent: CombinedCard) => parent.isReserved,
    isStarter: (parent: CombinedCard) => parent.isStarter,
    isStorySpotlight: (parent: CombinedCard) => parent.isStorySpotlight,
    isTextless: (parent: CombinedCard) => parent.isTextless,
    isTimeshifted: (parent: CombinedCard) => parent.isTimeshifted,
    hasAlternativeDeckLimit: (parent: CombinedCard) =>
      parent.hasAlternativeDeckLimit,
    hasContentWarning: (parent: CombinedCard) => parent.hasContentWarning,
    image_uris: (parent: CombinedCard) => parent.image_uris,
    foil: (parent: CombinedCard) => parent.finishes?.includes('foil') || false,
    keywords: (parent: CombinedCard) => parent.keywords,
    oracle_text: (parent: CombinedCard) => parent.oracle_text,
    type_line: (parent: CombinedCard) => parent.type_line,
    released_at: (parent: CombinedCard) => parent.released_at,
    highres_image: (parent: CombinedCard) => parent.highres_image,
    image_status: (parent: CombinedCard) => parent.image_status,
    tcgplayer_product_id: (parent: CombinedCard) =>
      parent.identifiers?.tcgplayerProductId
        ? parseInt(parent.identifiers.tcgplayerProductId)
        : null,
    tcgplayer_prices: (parent: CombinedCard) => parent.tcgplayer.prices,
    tcgplayer_image_url: (parent: CombinedCard) => parent.tcgplayer.image_url,
    tcgplayer_clean_name: (parent: CombinedCard) => parent.tcgplayer.clean_name,
    tcgplayer_extended_data: (parent: CombinedCard) =>
      parent.tcgplayer.extended_data,
    foil_types: (parent: CombinedCard) => parent.foil_types,
  },
};
