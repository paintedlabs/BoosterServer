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
   * @desc Get all products for a specific set
   * @access Public
   */
  router.get("/:setCode/products", (req: Request, res: Response) => {
    const setCode = req.params["setCode"];
    if (!setCode) {
      return res.status(400).json({ error: "Set code is required" });
    }

    logger.info(`Received GET /sets/${setCode}/products request`);

    try {
      const products = dataService.getProducts(setCode);
      return res.json(products);
    } catch (error) {
      logger.error(`Error fetching products for set ${setCode}:`, error);
      return res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  return router;
}
