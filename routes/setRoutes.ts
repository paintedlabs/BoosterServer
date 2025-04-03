/**
 * setRoutes.ts
 *
 * Defines the Express routes related to MTG sets and their products.
 */

import { Router, Request, Response } from 'express';
import { LoadedData } from '../dataLoader'; // Adjust path as needed
import { SetResponse } from '../types'; // Import shared type
import { z, ZodError } from 'zod'; // Import zod
import logger from '../logger'; // Import the logger

/**
 * Creates and configures the Express Router for set-related endpoints.
 *
 * @param loadedData The loaded application data (AllPrintings, ExtendedData, etc.).
 * @returns Configured Express Router.
 */
export function createSetRouter(loadedData: LoadedData): Router {
  const router = Router();

  if (
    !loadedData ||
    !loadedData.allPrintings ||
    !loadedData.extendedDataArray
  ) {
    logger.error('Set routes cannot be created: loaded data is incomplete.');
    // Return an empty router or throw an error, depending on desired handling
    // For now, returning a router that yields 503 for all its routes
    router.use((req, res) => {
      res.status(503).json({ error: 'Server data not ready for set routes.' });
    });
    return router;
  }

  // Schema for validating setCode param
  const setParamsSchema = z.object({
    setCode: z.string().min(1).max(10), // Basic validation: non-empty string, max 10 chars
  });

  // --- Route Handlers ---

  // GET / (relative to the mount point, e.g., /sets)
  router.get('/', (req: Request, res: Response) => {
    logger.info('Handling GET /sets request');

    const seenCodes = new Set<string>();
    const setsArray: SetResponse[] = [];

    // Use extendedDataArray from loadedData to find sets that have products
    for (const product of loadedData.extendedDataArray) {
      const setCode = product.set_code.toUpperCase();
      const mtgSet = loadedData.allPrintings?.data[setCode]; // Use loaded data

      // Check if set exists in AllPrintings data and hasn't been added yet
      if (!seenCodes.has(setCode) && mtgSet) {
        seenCodes.add(setCode);
        setsArray.push({
          code: setCode,
          name: mtgSet.name, // Get name from AllPrintings data
        });
      }
    }

    // Sort sets alphabetically by name for consistency
    setsArray.sort((a, b) => a.name.localeCompare(b.name));

    return res.json(setsArray);
  });

  // GET /:setCode/products (relative to the mount point, e.g., /sets/mkm/products)
  router.get('/:setCode/products', (req: Request, res: Response) => {
    try {
      // Validate request params
      const validatedParams = setParamsSchema.parse(req.params);
      const setCodeParam = validatedParams.setCode.toUpperCase();
      logger.info({ setCode: setCodeParam }, `Handling GET /sets/:setCode/products request`);

      // Filter extendedDataArray from loadedData
      const matchingProducts = loadedData.extendedDataArray.filter(
        (p) => p?.set_code?.toUpperCase() === setCodeParam
      );

      // Optionally sort products by name or other criteria
      matchingProducts.sort((a, b) => a.name.localeCompare(b.name));

      return res.json(matchingProducts);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, "Invalid setCode parameter");
        // Send 400 Bad Request with validation errors
        return res.status(400).json({
          error: "Invalid request parameters",
          details: error.errors
        });
      } else {
        // Forward other errors to the centralized handler
        // Ensure express-async-errors handles this if the handler itself isn't async
        // If handler is sync, need try/catch and next(error)
        logger.error({ err: error }, "Unexpected error in /sets/:setCode/products");
        return res.status(500).json({ error: "Internal Server Error" }); // Or call next(error)
      }
    }
  });

  return router;
}
