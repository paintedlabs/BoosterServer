/**
 * productRoutes.ts
 *
 * Defines the Express routes related to opening MTG products (boosters).
 */

import { Router, Request, Response } from 'express';
import { LoadedData } from '../dataLoader'; // Adjust path as needed
import { generatePack } from '../boosterService'; // Import booster generation logic
import { MultiplePacksResponse, OpenedPackResponse } from '../types'; // Import shared types
import { z, ZodError } from 'zod'; // Import zod
import logger from '../logger'; // Import the logger

/**
 * Creates and configures the Express Router for product-related endpoints.
 *
 * @param loadedData The loaded application data (AllPrintings, ExtendedData, etc.).
 * @returns Configured Express Router.
 */
export function createProductRouter(loadedData: LoadedData): Router {
  const router = Router();

  if (!loadedData || !loadedData.extendedDataArray) {
    logger.error(
      'Product routes cannot be created: loaded extended data is missing.'
    );
    router.use((req, res) => {
      res
        .status(503)
        .json({ error: 'Server data not ready for product routes.' });
    });
    return router;
  }

  // --- Zod Schemas for Validation ---
  const productCodeSchema = z.object({
    productCode: z.string().min(1).toLowerCase(), // Ensure product code is present and lowercased
  });

  const openMultipleParamsSchema = productCodeSchema.extend({
    number: z.coerce.number().int().min(1).max(100), // Coerce string to number, validate range
  });

  // --- Route Handlers ---

  // POST /:productCode/open
  router.post('/:productCode/open', (req: Request, res: Response) => {
    try {
      // Validate request params
      const { productCode } = productCodeSchema.parse(req.params);
      logger.info({ productCode }, `Handling POST /products/:productCode/open request`);

      const product = loadedData.extendedDataArray.find(
        (p) => p?.code?.toLowerCase() === productCode
      );

      if (!product) {
        logger.warn({ productCode }, 'Product not found for open request.');
        return res
          .status(404)
          .json({ error: `Product with code '${productCode}' not found` });
      }

      const result: OpenedPackResponse = generatePack(product, loadedData);
      logger.info(
        { productCode: product.code, packSize: result.pack.length },
        `Returning generated pack`
      );
      return res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, 'Invalid productCode parameter');
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors,
        });
      } else {
        logger.error({ err: error }, 'Unexpected error in /products/:productCode/open');
        throw error; // Re-throw for centralized handler
      }
    }
  });

  // POST /:productCode/open/:number
  router.post('/:productCode/open/:number', (req: Request, res: Response) => {
    try {
      // Validate request params
      const { productCode, number: numPacks } = openMultipleParamsSchema.parse(req.params);
      logger.info(
        { productCode, count: numPacks },
        `Handling POST /products/:productCode/open/:number request`
      );

      const product = loadedData.extendedDataArray.find(
        (p) => p?.code?.toLowerCase() === productCode
      );
      if (!product) {
        logger.warn(
          { productCode },
          'Product not found for open multiple request.'
        );
        return res
          .status(404)
          .json({ error: `Product with code '${productCode}' not found` });
      }

      const results: MultiplePacksResponse = { packs: [] };
      for (let i = 0; i < numPacks; i++) {
        const packResult = generatePack(product, loadedData); // Use imported function
        results.packs.push(packResult);
      }
      logger.info(
        { productCode: product.code, packCount: results.packs.length },
        `Returning multiple generated packs`
      );
      return res.json(results);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, 'Invalid parameters for opening multiple packs');
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors,
        });
      } else {
        logger.error({ err: error }, 'Unexpected error in /products/:productCode/open/:number');
        throw error; // Re-throw for centralized handler
      }
    }
  });

  return router;
}
