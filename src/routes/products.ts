import { Router, Request, Response } from "express";
import { DataService } from "../types";
import { ValidationError } from "../utils/errors";
import logger from "../utils/logger";

export function createProductsRouter(dataService: DataService): Router {
  const router = Router();

  /**
   * @route POST /products/:productCode/open
   * @desc Open a single booster pack
   * @access Public
   */
  router.post("/:productCode/open", (req: Request, res: Response) => {
    const productCode = req.params["productCode"];
    if (!productCode) {
      return res.status(400).json({ error: "Product code is required" });
    }

    logger.info(`Received POST /products/${productCode}/open request`);

    try {
      const result = dataService.openProduct(productCode);
      logger.info(
        `Returning pack with ${result.pack.length} cards for product: ${productCode}`
      );
      return res.json(result);
    } catch (error) {
      logger.error(`Error opening product ${productCode}:`, error);
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Failed to open product" });
      }
    }
  });

  /**
   * @route POST /products/:productCode/open-with-pricing
   * @desc Open a single booster pack with pricing data
   * @access Public
   */
  router.post(
    "/:productCode/open-with-pricing",
    async (req: Request, res: Response) => {
      const productCode = req.params["productCode"];
      if (!productCode) {
        return res.status(400).json({ error: "Product code is required" });
      }

      logger.info(
        `Received POST /products/${productCode}/open-with-pricing request`
      );

      try {
        const result = await dataService.openProductWithPricing(productCode);
        logger.info(
          `Returning pack with ${result.pack.length} cards and pricing for product: ${productCode}`
        );
        return res.json(result);
      } catch (error) {
        logger.error(
          `Error opening product with pricing ${productCode}:`,
          error
        );
        if (error instanceof ValidationError) {
          return res.status(400).json({ error: error.message });
        } else {
          return res
            .status(500)
            .json({ error: "Failed to open product with pricing" });
        }
      }
    }
  );

  /**
   * @route POST /products/:productCode/open/:number
   * @desc Open multiple booster packs
   * @access Public
   */
  router.post("/:productCode/open/:number", (req: Request, res: Response) => {
    const productCode = req.params["productCode"];
    const numberParam = req.params["number"];

    if (!productCode) {
      return res.status(400).json({ error: "Product code is required" });
    }
    if (!numberParam) {
      return res.status(400).json({ error: "Number of packs is required" });
    }

    logger.info(
      `Received POST /products/${productCode}/open/${numberParam} request`
    );

    try {
      const numPacks = parseInt(numberParam, 10);
      if (isNaN(numPacks) || numPacks <= 0) {
        throw new ValidationError("Invalid number of packs");
      }

      const result = dataService.openMultipleProducts(productCode, numPacks);
      logger.info(
        `Returning ${result.packs.length} packs for product: ${productCode}`
      );
      return res.json(result);
    } catch (error) {
      logger.error(`Error opening multiple products ${productCode}:`, error);
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Failed to open products" });
      }
    }
  });

  return router;
}
