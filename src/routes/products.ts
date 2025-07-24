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
   * @route POST /products/:productCode/open-with-card-pricing
   * @desc Open a single booster pack with TCGCSV pricing data for individual cards
   * @access Public
   */
  router.post(
    "/:productCode/open-with-card-pricing",
    async (req: Request, res: Response) => {
      const productCode = req.params["productCode"];
      if (!productCode) {
        return res.status(400).json({ error: "Product code is required" });
      }

      logger.info(
        `Received POST /products/${productCode}/open-with-card-pricing request`
      );

      try {
        const result =
          await dataService.openProductWithCardPricing(productCode);
        logger.info(
          `Returning pack with ${result.pack.length} cards and TCGCSV pricing for product: ${productCode}`
        );
        return res.json(result);
      } catch (error) {
        logger.error(
          `Error opening product with card pricing ${productCode}:`,
          error
        );
        if (error instanceof ValidationError) {
          return res.status(400).json({ error: error.message });
        } else {
          return res
            .status(500)
            .json({ error: "Failed to open product with card pricing" });
        }
      }
    }
  );

  /**
   * @route GET /products/cards/:cardUuid/with-pricing
   * @desc Get individual card data with TCGCSV pricing
   * @access Public
   */
  router.get(
    "/cards/:cardUuid/with-pricing",
    async (req: Request, res: Response) => {
      const cardUuid = req.params["cardUuid"];
      if (!cardUuid) {
        return res.status(400).json({ error: "Card UUID is required" });
      }

      logger.info(
        `Received GET /products/cards/${cardUuid}/with-pricing request`
      );

      try {
        const result = await dataService.getCardWithTCGCSV(cardUuid);
        if (!result) {
          return res.status(404).json({ error: "Card not found" });
        }

        logger.info(
          `Returning card data with TCGCSV pricing for card: ${cardUuid}`
        );
        return res.json(result);
      } catch (error) {
        logger.error(`Error getting card with pricing ${cardUuid}:`, error);
        return res
          .status(500)
          .json({ error: "Failed to get card with pricing" });
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

      const results = [];
      for (let i = 0; i < numPacks; i++) {
        const result = dataService.openProduct(productCode);
        results.push(result);
      }

      logger.info(`Returning ${numPacks} packs for product: ${productCode}`);
      return res.json({ packs: results });
    } catch (error) {
      logger.error(
        `Error opening ${numberParam} packs for product ${productCode}:`,
        error
      );
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Failed to open packs" });
      }
    }
  });

  /**
   * @route POST /products/:productCode/open/:number/with-pricing
   * @desc Open multiple booster packs with pricing data
   * @access Public
   */
  router.post(
    "/:productCode/open/:number/with-pricing",
    async (req: Request, res: Response) => {
      const productCode = req.params["productCode"];
      const numberParam = req.params["number"];

      if (!productCode) {
        return res.status(400).json({ error: "Product code is required" });
      }
      if (!numberParam) {
        return res.status(400).json({ error: "Number of packs is required" });
      }

      logger.info(
        `Received POST /products/${productCode}/open/${numberParam}/with-pricing request`
      );

      try {
        const numPacks = parseInt(numberParam, 10);
        if (isNaN(numPacks) || numPacks <= 0) {
          throw new ValidationError("Invalid number of packs");
        }

        // Get pricing data for the product
        const pricingResult =
          await dataService.openProductWithPricing(productCode);
        const pricing = pricingResult.pricing;

        // Open multiple packs (without pricing for each individual pack)
        const results = [];
        for (let i = 0; i < numPacks; i++) {
          const result = dataService.openProduct(productCode);
          results.push(result);
        }

        logger.info(
          `Returning ${numPacks} packs with pricing for product: ${productCode}`
        );
        return res.json({
          packs: results,
          pricing: pricing,
          totalPacks: numPacks,
        });
      } catch (error) {
        logger.error(
          `Error opening ${numberParam} packs with pricing for product ${productCode}:`,
          error
        );
        if (error instanceof ValidationError) {
          return res.status(400).json({ error: error.message });
        } else {
          return res
            .status(500)
            .json({ error: "Failed to open packs with pricing" });
        }
      }
    }
  );

  /**
   * @route POST /products/:productCode/open/:number/with-card-pricing
   * @desc Open multiple booster packs with TCGCSV pricing data for individual cards
   * @access Public
   */
  router.post(
    "/:productCode/open/:number/with-card-pricing",
    async (req: Request, res: Response) => {
      const productCode = req.params["productCode"];
      const numberParam = req.params["number"];

      if (!productCode) {
        return res.status(400).json({ error: "Product code is required" });
      }
      if (!numberParam) {
        return res.status(400).json({ error: "Number of packs is required" });
      }

      logger.info(
        `Received POST /products/${productCode}/open/${numberParam}/with-card-pricing request`
      );

      try {
        const numPacks = parseInt(numberParam, 10);
        if (isNaN(numPacks) || numPacks <= 0) {
          throw new ValidationError("Invalid number of packs");
        }

        const result = await dataService.openMultipleProductsWithCardPricing(
          productCode,
          numPacks
        );

        logger.info(
          `Returning ${numPacks} packs with TCGCSV card pricing for product: ${productCode}`
        );
        return res.json(result);
      } catch (error) {
        logger.error(
          `Error opening ${numberParam} packs with card pricing for product ${productCode}:`,
          error
        );
        if (error instanceof ValidationError) {
          return res.status(400).json({ error: error.message });
        } else {
          return res
            .status(500)
            .json({ error: "Failed to open packs with card pricing" });
        }
      }
    }
  );

  /**
   * @route GET /products/tcgcsv-stats
   * @desc Get TCGCSV pre-processing statistics
   * @access Public
   */
  router.get("/tcgcsv-stats", async (_req: Request, res: Response) => {
    logger.info("Received GET /products/tcgcsv-stats request");

    try {
      const stats = dataService.getTCGCSVStats();
      logger.info(`Returning TCGCSV stats: ${JSON.stringify(stats)}`);
      return res.json(stats);
    } catch (error) {
      logger.error("Error getting TCGCSV stats:", error);
      return res.status(500).json({ error: "Failed to get TCGCSV stats" });
    }
  });

  return router;
}
