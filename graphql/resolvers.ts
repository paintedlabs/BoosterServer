/**
 * graphql/resolvers.ts
 *
 * Defines the resolver functions for the GraphQL schema.
 */

import { LoadedData, ExtendedSealedData } from '../dataLoader';
import { generatePack } from '../boosterService';
import {
  OpenedPackResponse,
  OpenedPacksResponse,
  OpenedCard,
  SetResponse,
} from '../types';
import logger from '../logger';
import { GraphQLError } from 'graphql'; // Import for throwing GraphQL-specific errors

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
            releaseDate: mtgSet.releaseDate || '1970-01-01',
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
      args: { setCode: string },
      contextValue: { loadedData: LoadedData }
    ) => {
      const { loadedData } = contextValue;
      const { setCode } = args;

      if (!loadedData?.extendedDataArray) {
        logger.error('GraphQL products query called before data loaded.');
        throw new GraphQLError('Server data not ready', {
          extensions: { code: 'DATA_NOT_READY' },
        });
      }
      if (!setCode) {
        throw new GraphQLError('Missing required argument: setCode', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      logger.info({ setCode }, 'Resolving GraphQL query: products');
      const setCodeParam = setCode.toUpperCase();
      const matchingProducts = loadedData.extendedDataArray.filter(
        (p) => p?.set_code?.toUpperCase() === setCodeParam
      );
      matchingProducts.sort((a, b) => a.name.localeCompare(b.name));
      // Map to GraphQL Product type (currently just subset of fields)
      return matchingProducts.map((p) => ({
        code: p.code,
        name: p.name,
        set_code: p.set_code,
        set_name: p.set_name,
      }));
    },

    // Resolver for the 'product' query
    product: (
      _parent: any,
      args: { productCode: string },
      contextValue: { loadedData: LoadedData }
    ) => {
      const { loadedData } = contextValue;
      const { productCode } = args;
      if (!productCode) {
        throw new GraphQLError('Missing required argument: productCode', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      logger.info({ productCode }, 'Resolving GraphQL query: product');
      const product = findProductOrThrow(productCode, loadedData);
      // Map to GraphQL Product type
      return {
        code: product.code,
        name: product.name,
        set_code: product.set_code,
        set_name: product.set_name,
      };
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

      // generatePack returns OpenedPackResponse which matches our GraphQL type closely enough for now
      const result = generatePack(product, loadedData);
      return result;
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

      let allOpenedCards: OpenedCard[] = []; // Flat array for all cards
      const allWarnings: Set<string> = new Set(); // Use Set to store unique warnings

      for (let i = 0; i < number; i++) {
        const result = generatePack(product, loadedData);
        if (result.pack) {
          allOpenedCards = allOpenedCards.concat(result.pack); // Add cards to the flat array
        }
        if (result.warning) {
          allWarnings.add(result.warning); // Add unique warnings
        }
      }

      const combinedWarning =
        allWarnings.size > 0 ? Array.from(allWarnings).join(' ') : null;

      logger.info(
        {
          productCode,
          number,
          openedCount: allOpenedCards.length,
          warnings: combinedWarning,
        },
        'Finished openPacks mutation'
      );

      return {
        warning: combinedWarning,
        packs: allOpenedCards, // Correct: returns the flat array
      };
    },
  },

  // Add resolvers for nested types if needed, e.g., for ImageUris within ScryfallCard
  // ScryfallCard: {
  //   prices: (parent) => JSON.stringify(parent.prices), // Example: Stringify complex fields
  //   image_uris: (parent) => parent.image_uris, // Direct mapping if types match
  // },
  // OpenedCard: {
  //   imageUrl: (parent, _args, contextValue) => { ... logic to construct image URL ... }
  // }
};
