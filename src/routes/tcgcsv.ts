import { Router } from "express";
import { TCGCSVService } from "../services/tcgcsvService";
import logger from "../utils/logger";

const router = Router();
const tcgcsvService = new TCGCSVService();

// GET /tcgcsv/categories - Get all categories
router.get("/categories", async (_req, res) => {
  try {
    const categories = await tcgcsvService.fetchCategories();
    return res.json({
      totalItems: categories.length,
      success: true,
      errors: [],
      results: categories,
    });
  } catch (error) {
    logger.error("Error fetching categories:", error);
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch categories"],
      results: [],
    });
  }
});

// GET /tcgcsv/categories/:categoryId/groups - Get groups for a category
router.get("/categories/:categoryId/groups", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({
        totalItems: 0,
        success: false,
        errors: ["Invalid category ID"],
        results: [],
      });
    }

    const groups = await tcgcsvService.fetchGroups(categoryId);
    return res.json({
      totalItems: groups.length,
      success: true,
      errors: [],
      results: groups,
    });
  } catch (error) {
    logger.error(
      `Error fetching groups for category ${req.params.categoryId}:`,
      error
    );
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch groups"],
      results: [],
    });
  }
});

// GET /tcgcsv/groups/:groupId/products - Get products for a group
router.get("/groups/:groupId/products", async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId)) {
      return res.status(400).json({
        totalItems: 0,
        success: false,
        errors: ["Invalid group ID"],
        results: [],
      });
    }

    const products = await tcgcsvService.fetchProducts(groupId);
    return res.json({
      totalItems: products.length,
      success: true,
      errors: [],
      results: products,
    });
  } catch (error) {
    logger.error(
      `Error fetching products for group ${req.params.groupId}:`,
      error
    );
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch products"],
      results: [],
    });
  }
});

// GET /tcgcsv/groups/:groupId/prices - Get prices for a group
router.get("/groups/:groupId/prices", async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId)) {
      return res.status(400).json({
        totalItems: 0,
        success: false,
        errors: ["Invalid group ID"],
        results: [],
      });
    }

    const prices = await tcgcsvService.fetchPrices(groupId);
    return res.json({
      totalItems: prices.length,
      success: true,
      errors: [],
      results: prices,
    });
  } catch (error) {
    logger.error(
      `Error fetching prices for group ${req.params.groupId}:`,
      error
    );
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch prices"],
      results: [],
    });
  }
});

// GET /tcgcsv/sets/:setCode/products - Get sealed products with prices for a set
router.get("/sets/:setCode/products", async (req, res) => {
  try {
    const setCode = req.params.setCode.toUpperCase();
    const productsWithPrices =
      await tcgcsvService.getSealedProductsWithPrices(setCode);

    return res.json({
      totalItems: productsWithPrices.length,
      success: true,
      errors: [],
      results: productsWithPrices,
    });
  } catch (error) {
    logger.error(
      `Error fetching products with prices for set ${req.params.setCode}:`,
      error
    );
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch products with prices"],
      results: [],
    });
  }
});

// GET /tcgcsv/mappings - Get all set mappings
router.get("/mappings", (_req, res) => {
  try {
    const mappings = tcgcsvService.getAllMappings();
    return res.json({
      totalItems: mappings.length,
      success: true,
      errors: [],
      results: mappings,
    });
  } catch (error) {
    logger.error("Error fetching mappings:", error);
    return res.status(500).json({
      totalItems: 0,
      success: false,
      errors: ["Failed to fetch mappings"],
      results: [],
    });
  }
});

// POST /tcgcsv/mappings - Create a new set mapping
router.post("/mappings", (req, res) => {
  try {
    const { setCode, setName, groupId, categoryId, categoryName } = req.body;

    if (!setCode || !setName || !groupId || !categoryId || !categoryName) {
      return res.status(400).json({
        success: false,
        errors: [
          "Missing required fields: setCode, setName, groupId, categoryId, categoryName",
        ],
      });
    }

    tcgcsvService.setMapping(
      setCode,
      setName,
      groupId,
      categoryId,
      categoryName
    );

    return res.json({
      success: true,
      errors: [],
      message: `Successfully mapped ${setCode} to group ${groupId}`,
    });
  } catch (error) {
    logger.error("Error creating mapping:", error);
    return res.status(500).json({
      success: false,
      errors: ["Failed to create mapping"],
    });
  }
});

// DELETE /tcgcsv/mappings/:setCode - Remove a set mapping
router.delete("/mappings/:setCode", (req, res) => {
  try {
    const setCode = req.params.setCode.toUpperCase();
    tcgcsvService.removeMapping(setCode);

    return res.json({
      success: true,
      errors: [],
      message: `Successfully removed mapping for ${setCode}`,
    });
  } catch (error) {
    logger.error(`Error removing mapping for ${req.params.setCode}:`, error);
    return res.status(500).json({
      success: false,
      errors: ["Failed to remove mapping"],
    });
  }
});

// POST /tcgcsv/mappings/find - Find and map a set by name
router.post("/mappings/find", async (req, res) => {
  try {
    const { name, setCode } = req.body;

    if (!name || !setCode) {
      return res.status(400).json({
        success: false,
        errors: ["Missing required fields: name, setCode"],
      });
    }

    const success = await tcgcsvService.findAndMapSet(name, setCode);

    if (success) {
      return res.json({
        success: true,
        errors: [],
        message: `Successfully mapped set '${name}' (code: ${setCode})`,
      });
    } else {
      return res.status(404).json({
        success: false,
        errors: [`Could not find group for set: ${name}`],
      });
    }
  } catch (error) {
    logger.error("Error finding and mapping set:", error);
    return res.status(500).json({
      success: false,
      errors: ["Failed to find and map set"],
    });
  }
});

// GET /tcgcsv/categories/magic/id - Get Magic category ID
router.get("/categories/magic/id", async (_req, res) => {
  try {
    const magicId = await tcgcsvService.getMagicCategoryId();

    if (magicId) {
      return res.json({
        success: true,
        errors: [],
        categoryId: magicId,
      });
    } else {
      return res.status(404).json({
        success: false,
        errors: ["Magic category not found"],
      });
    }
  } catch (error) {
    logger.error("Error getting Magic category ID:", error);
    return res.status(500).json({
      success: false,
      errors: ["Failed to get Magic category ID"],
    });
  }
});

export default router;
