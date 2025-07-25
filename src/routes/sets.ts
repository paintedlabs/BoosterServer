import { Router, Request, Response } from "express";
import { DataService } from "../types";
import logger from "../utils/logger";

export function createSetsRouter(dataService: DataService): Router {
  const router = Router();

  /**
   * @route GET /sets
   * @desc Get all available MTG sets
   * @access Public
   */
  router.get("/", (_req: Request, res: Response) => {
    logger.info("Received GET /sets request");

    try {
      const sets = dataService.getSets();
      return res.json(sets);
    } catch (error) {
      logger.error("Error fetching sets:", error);
      return res.status(500).json({ error: "Failed to fetch sets" });
    }
  });

  /**
   * @route GET /sets/:setCode/products
   * @desc Get all products for a specific set with all available data including TCGCSV pricing
   * @access Public
   */
  router.get("/:setCode/products", async (req: Request, res: Response) => {
    const setCode = req.params["setCode"];
    if (!setCode) {
      return res.status(400).json({ error: "Set code is required" });
    }

    logger.info(`Received GET /sets/${setCode}/products request`);

    try {
      const products = await dataService.getProductsWithAllData(setCode);
      logger.info(
        `Returning ${products.length} products for set ${setCode} with enhanced data`
      );
      return res.json(products);
    } catch (error) {
      logger.error(`Error fetching products for set ${setCode}:`, error);
      return res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  /**
   * @route GET /sets/:setCode/products/complete
   * @desc Get all products for a specific set with complete data including TCGCSV pricing and AllPrintings sealed product data
   * @access Public
   */
  router.get(
    "/:setCode/products/complete",
    async (req: Request, res: Response) => {
      const setCode = req.params["setCode"];
      if (!setCode) {
        return res.status(400).json({ error: "Set code is required" });
      }

      logger.info(`Received GET /sets/${setCode}/products/complete request`);

      try {
        const products = await dataService.getProductsWithCompleteData(setCode);
        logger.info(
          `Returning ${products.length} products for set ${setCode} with complete data`
        );
        return res.json(products);
      } catch (error) {
        logger.error(
          `Error fetching complete products for set ${setCode}:`,
          error
        );
        return res
          .status(500)
          .json({ error: "Failed to fetch complete products" });
      }
    }
  );

  return router;
}
