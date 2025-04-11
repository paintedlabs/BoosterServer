/**
 * graphql/resolvers.ts
 *
 * Defines the resolver functions for the GraphQL schema.
 */

import {
  LoadedData,
  ExtendedSealedData,
  ExtendedBooster,
  ExtendedSheet,
  MTGSet,
  ExtendedSheetCard,
  CombinedCard,
} from '../dataLoader';
import { generatePack } from '../boosterService'; // Only import generatePack for now
import {
  OpenedPackResponse,
  OpenedPacksResponse,
  OpenedCard,
  SetResponse,
} from '../types';
import logger from '../logger';
import { GraphQLError } from 'graphql'; // Import for throwing GraphQL-specific errors
import { AppContext } from './context'; // Corrected path relative to file
import * as ScryfallTypes from '../index'; // Corrected path relative to file

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
    // Resolver for the 'sets' query
    sets: (
      _parent: any,
      _args: any,
      contextValue: { loadedData: LoadedData }
    ): SetResponse[] => {
      const { loadedData } = contextValue;
      if (!loadedData?.allPrintings || !loadedData?.extendedDataArray) {
        logger.error('GraphQL sets query called before data loaded.');
        throw new GraphQLError('Server data not ready', {
          extensions: { code: 'DATA_NOT_READY' },
        });
      }

      logger.info('Resolving GraphQL query: sets');
      const seenCodes = new Set<string>();
      const setsArray: SetResponse[] = [];

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
      const sortedSets = [...setsArray].sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );
      return sortedSets;
    },

    // Resolver for the 'products' query
    products: (
      _parent: any,
      { setCode }: { setCode: string },
      { loadedData }: AppContext
    ): ExtendedSealedData[] => {
      const upperSetCode = setCode.toUpperCase();
      logger.info({ setCode: upperSetCode }, `Resolving products for set`);
      if (!loadedData?.extendedDataArray) {
        logger.warn(
          'Extended data array not loaded, returning empty product list.'
        );
        return [];
      }
      const matchingProducts = loadedData.extendedDataArray.filter(
        (p) => p?.set_code?.toUpperCase() === upperSetCode
      );

      // Sort products alphabetically by name
      matchingProducts.sort((a, b) => a.name.localeCompare(b.name));

      // Return the data without transforming sheets here
      return matchingProducts;
    },

    // Resolver for the 'product' query
    product: (
      _parent: any,
      args: { productCode: string },
      contextValue: { loadedData: LoadedData }
    ): ExtendedSealedData | null => {
      const { loadedData } = contextValue;
      const { productCode } = args;
      if (!productCode) {
        throw new GraphQLError('Missing required argument: productCode', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      logger.info({ productCode }, 'Resolving GraphQL query: product');
      try {
        const product = findProductOrThrow(productCode, loadedData);
        return product;
      } catch (error) {
        return null;
      }
    },

    // NEW: Resolver for the 'card' query
    card: (
      _parent: any,
      { uuid }: { uuid: string },
      { loadedData }: AppContext
    ): CombinedCard | null => {
      logger.info({ uuid }, 'Resolving card query');
      if (!loadedData?.combinedCards) {
        throw new GraphQLError('Card data not loaded', {
          extensions: { code: 'DATA_NOT_READY' },
        });
      }
      const cardData = loadedData.combinedCards[uuid];
      if (!cardData) {
        logger.warn({ uuid }, 'Card not found for UUID');
        return null;
      }
      return cardData;
    },
  },

  Mutation: {
    // Resolver for the 'openPack' mutation
    openPack: (
      _parent: any,
      args: { productCode: string },
      contextValue: { loadedData: LoadedData }
    ): OpenedPackResponse => {
      const { loadedData } = contextValue;
      const { productCode } = args;
      if (!productCode) {
        throw new GraphQLError('Missing required argument: productCode', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      logger.info({ productCode }, 'Resolving GraphQL mutation: openPack');
      const product = findProductOrThrow(productCode, loadedData);
      const result = generatePack(product, loadedData);
      return {
        warning: result.warning,
        pack: result.pack.map((opened) => ({
          sheet: opened.sheet,
          card: opened.card,
        })),
      };
    },

    // Resolver for the 'openPacks' mutation
    openPacks: (
      _parent: any,
      args: { productCode: string; number: number },
      contextValue: { loadedData: LoadedData }
    ): OpenedPacksResponse => {
      const { loadedData } = contextValue;
      const { productCode, number } = args;

      if (!productCode) {
        throw new GraphQLError('Missing required argument: productCode', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (!number || number <= 0 || number > 100) {
        // Basic validation for number
        throw new GraphQLError('Invalid number argument (must be 1-100)', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      logger.info(
        { productCode, count: number },
        'Resolving GraphQL mutation: openPacks'
      );
      const product = findProductOrThrow(productCode, loadedData);
      let allOpenedCardsInternal: Array<{ sheet: string; card: CombinedCard }> =
        [];
      const allWarnings: Set<string> = new Set();

      for (let i = 0; i < number; i++) {
        const result = generatePack(product, loadedData);
        if (result.pack) {
          allOpenedCardsInternal = allOpenedCardsInternal.concat(result.pack);
        }
        if (result.warning) {
          allWarnings.add(result.warning);
        }
      }
      const combinedWarning =
        allWarnings.size > 0 ? Array.from(allWarnings).join(' ') : null;
      logger.info(
        {
          productCode,
          number,
          openedCount: allOpenedCardsInternal.length,
          warnings: combinedWarning,
        },
        'Finished openPacks mutation'
      );
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
    sheets: (parent: ExtendedSealedData) => {
      return Object.entries(parent.sheets || {}).map(
        ([sheetName, sheetData]: [string, ExtendedSheet]) => ({
          name: sheetName,
          balanceColors: sheetData.balance_colors,
          cards: sheetData.cards.map((card: ExtendedSheetCard) => ({
            // Map card data
            uuid: card.uuid,
            weight: card.weight,
          })),
          foil: sheetData.foil,
          totalWeight: sheetData.total_weight,
        })
      );
    },
    // Resolver for the 'boosters' field (might need transformation if schema differs)
    boosters: (parent: ExtendedSealedData) => {
      // Assuming ExtendedBooster matches BoosterV2 schema enough for direct return
      // Add transformations here if necessary (e.g., mapping contents)
      return parent.boosters || [];
    },
    // Other fields like code, name, set_code, set_name usually resolve directly
    tcgMarketPrice: (parent: ExtendedSealedData): number | null => {
      return parent.tcgMarketPrice ?? null;
    },
  },

  ScryfallCard: {
    // Optional: Resolver to stringify complex fields if needed by client
    prices: (parent: ScryfallTypes.IScryfallCard) =>
      parent.prices ? JSON.stringify(parent.prices) : null,
    // Direct mapping usually works if schema matches TypeScript type
    image_uris: (parent: ScryfallTypes.IScryfallCard) => parent.image_uris,
    card_faces: (parent: ScryfallTypes.IScryfallCard) => parent.card_faces,
    all_parts: (parent: ScryfallTypes.IScryfallCard) => parent.all_parts,
    // Add resolvers for other complex fields like legalities, related_uris etc. if needed
  },

  // Resolver for BoosterV2 type (maps to ExtendedBooster)
  BoosterV2: {
    contents: (booster: ExtendedBooster) => {
      return Object.entries(booster.sheets || {}).map(([sheetName, count]) => ({
        sheetName,
        count,
      }));
    },
    totalWeight: (booster: ExtendedBooster) => booster.weight,
  },

  // Other type resolvers (SheetV2, SheetCardEntry, BoosterContentEntry) are likely not needed
  // as the parent resolver (Product) handles the data transformation.

  // NEW: Resolver for CombinedCard type (trivial resolvers)
  CombinedCard: {
    allPrintingsData: (parent: CombinedCard) => parent.allPrintingsData,
    scryfallData: (parent: CombinedCard) => parent.scryfallData,
    tcgNormalMarketPrice: (parent: CombinedCard) => parent.tcgNormalMarketPrice,
    tcgFoilMarketPrice: (parent: CombinedCard) => parent.tcgFoilMarketPrice,
  },

  AllPrintingsCard: {
    identifiers: (parent: any) => parent.identifiers,
  },
};
