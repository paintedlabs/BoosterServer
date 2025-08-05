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

  /**
   * @route GET /sets/:setCode/info
   * @desc Get comprehensive information about a set including MTGJson data and TCGCSV mappings
   * @access Public
   */
  router.get("/:setCode/info", async (req: Request, res: Response) => {
    const setCode = req.params["setCode"];
    if (!setCode) {
      return res.status(400).json({ error: "Set code is required" });
    }

    logger.info(`Received GET /sets/${setCode}/info request`);

    try {
      const setCodeUpper = setCode.toUpperCase();

      // Get pre-processed set info (O(1) lookup)
      const setInfo = dataService.getSetInfo(setCodeUpper);

      // Get enhanced products for this set
      const enhancedProducts = dataService.getEnhancedProducts(setCodeUpper);

      // Get combined sealed products (new AllPrintings-prioritized data)
      const combinedProducts =
        dataService.getCombinedSealedProducts(setCodeUpper);

      // Get traditional ExtendedData products
      const extendedProducts = dataService.getProducts(setCodeUpper);

      return res.json({
        setCode: setCodeUpper,
        setInfo,
        comparison: {
          extendedData: {
            totalProducts: extendedProducts.length,
            products: extendedProducts.map((p) => ({
              name: p.name,
              code: p.code,
              set_code: p.set_code,
              set_name: p.set_name,
            })),
          },
          allPrintings: {
            totalProducts: combinedProducts.length,
            products: combinedProducts.map((p) => ({
              uuid: p.uuid,
              name: p.name,
              category: p.category,
              cardCount: p.cardCount,
              setCode: p.setCode,
              hasExtendedData: !!p.extendedData,
              hasTCGCSVData: !!p.tcgcsvData,
            })),
          },
        },
        enhancedProducts,
      });
    } catch (error) {
      logger.error(`Error fetching set info for ${setCode}:`, error);
      return res.status(500).json({ error: "Failed to fetch set info" });
    }
  });

  /**
   * @route GET /sets/:setCode/products/enhanced
   * @desc Get enhanced products for a set with MTGJson identifiers and TCGCSV mappings
   * @access Public
   */
  router.get(
    "/:setCode/products/enhanced",
    async (req: Request, res: Response) => {
      const setCode = req.params["setCode"];
      if (!setCode) {
        return res.status(400).json({ error: "Set code is required" });
      }

      logger.info(`Received GET /sets/${setCode}/products/enhanced request`);

      try {
        const setCodeUpper = setCode.toUpperCase();

        // Get pre-processed enhanced products (O(1) lookup)
        const enhancedProducts = dataService.getEnhancedProducts(setCodeUpper);

        if (enhancedProducts.length === 0) {
          return res
            .status(404)
            .json({ error: `No products found for set ${setCodeUpper}` });
        }

        // Get set info for the response
        const setInfo = dataService.getSetInfo(setCodeUpper);

        const response = {
          setCode: setCodeUpper,
          setInfo: {
            mtgJsonName: setInfo?.mtgJson?.name || null,
            mtgJsonReleaseDate: setInfo?.mtgJson?.releaseDate || null,
            tcgcsvMapping: setInfo?.tcgcsv?.mapping || null,
          },
          products: enhancedProducts,
          summary: {
            totalProducts: enhancedProducts.length,
            productsWithMtgJsonIdentifiers: enhancedProducts.filter(
              (p) => p.mtgJsonIdentifiers.length > 0
            ).length,
            productsWithTcgcsvData: enhancedProducts.filter((p) => p.tcgcsvData)
              .length,
            productsWithTcgcsvMapping: enhancedProducts.filter(
              (p) => p.mappings.hasTcgcsvMapping
            ).length,
          },
        };

        logger.info(
          `Returning ${enhancedProducts.length} pre-processed enhanced products for set ${setCodeUpper}`
        );
        return res.json(response);
      } catch (error) {
        logger.error(
          `Error fetching enhanced products for set ${setCode}:`,
          error
        );
        return res
          .status(500)
          .json({ error: "Failed to fetch enhanced products" });
      }
    }
  );

  /**
   * @route GET /sets/mapping-stats
   * @desc Get statistics about pre-processed set mappings
   * @access Public
   */
  router.get("/mapping-stats", (_req: Request, res: Response) => {
    logger.info("Received GET /sets/mapping-stats request");

    try {
      const stats = dataService.getSetMappingStats();
      return res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error fetching set mapping stats:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch set mapping stats" });
    }
  });

  /**
   * @route GET /sets/preprocessed
   * @desc Get all pre-processed set codes
   * @access Public
   */
  router.get("/preprocessed", (_req: Request, res: Response) => {
    logger.info("Received GET /sets/preprocessed request");

    try {
      const setCodes = dataService.getPreprocessedSetCodes();
      return res.json({
        success: true,
        totalSets: setCodes.length,
        setCodes: setCodes.sort(),
      });
    } catch (error) {
      logger.error("Error fetching preprocessed set codes:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch preprocessed set codes" });
    }
  });

  return router;
}
