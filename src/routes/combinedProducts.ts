import { Router, Request, Response } from "express";
import { DataService } from "../types";
import logger from "../utils/logger";

export function createCombinedProductsRouter(dataService: DataService): Router {
  const router = Router();

  /**
   * @route GET /combined-products/sets/:setCode
   * @desc Get all combined sealed products for a specific set that prioritize AllPrintings data
   * @access Public
   */
  router.get("/sets/:setCode", (req: Request, res: Response) => {
    const setCode = req.params["setCode"];
    if (!setCode) {
      return res.status(400).json({ error: "Set code is required" });
    }

    logger.info(`Received GET /combined-products/sets/${setCode} request`);

    try {
      const products = dataService.getCombinedSealedProducts(setCode);
      logger.info(
        `Returning ${products.length} combined sealed products for set ${setCode}`
      );
      return res.json({
        setCode: setCode.toUpperCase(),
        totalProducts: products.length,
        products,
      });
    } catch (error) {
      logger.error(
        `Error fetching combined products for set ${setCode}:`,
        error
      );
      return res
        .status(500)
        .json({ error: "Failed to fetch combined products" });
    }
  });

  /**
   * @route GET /combined-products/:uuid
   * @desc Get a specific combined sealed product by UUID
   * @access Public
   */
  router.get("/:uuid", (req: Request, res: Response) => {
    const uuid = req.params["uuid"];
    if (!uuid) {
      return res.status(400).json({ error: "Product UUID is required" });
    }

    logger.info(`Received GET /combined-products/${uuid} request`);

    try {
      const product = dataService.getCombinedSealedProductByUuid(uuid);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      return res.json(product);
    } catch (error) {
      logger.error(`Error fetching combined product ${uuid}:`, error);
      return res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  /**
   * @route POST /combined-products/:uuid/open
   * @desc Open a combined sealed product using AllPrintings data with fallback to ExtendedData
   * @access Public
   */
  router.post("/:uuid/open", (req: Request, res: Response) => {
    const uuid = req.params["uuid"];
    if (!uuid) {
      return res.status(400).json({ error: "Product UUID is required" });
    }

    logger.info(`Received POST /combined-products/${uuid}/open request`);

    try {
      const result = dataService.openCombinedSealedProduct(uuid);
      logger.info(
        `Returning pack with ${result.pack.length} cards for product: ${uuid}`
      );
      return res.json(result);
    } catch (error) {
      logger.error(`Error opening combined product ${uuid}:`, error);
      return res.status(500).json({ error: "Failed to open product" });
    }
  });

  /**
   * @route POST /combined-products/:uuid/open-with-pricing
   * @desc Open a combined sealed product with pricing data
   * @access Public
   */
  router.post(
    "/:uuid/open-with-pricing",
    async (req: Request, res: Response) => {
      const uuid = req.params["uuid"];
      if (!uuid) {
        return res.status(400).json({ error: "Product UUID is required" });
      }

      logger.info(
        `Received POST /combined-products/${uuid}/open-with-pricing request`
      );

      try {
        const result =
          await dataService.openCombinedSealedProductWithPricing(uuid);
        logger.info(
          `Returning pack with ${result.pack.length} cards and pricing for product: ${uuid}`
        );
        return res.json(result);
      } catch (error) {
        logger.error(
          `Error opening combined product with pricing ${uuid}:`,
          error
        );
        return res
          .status(500)
          .json({ error: "Failed to open product with pricing" });
      }
    }
  );

  return router;
}
