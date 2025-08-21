import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import logger from "../utils/logger";

export function createAdminRouter(): Router {
  const router = Router();
  const overrideDir = path.join(process.cwd(), "data", "ServerDataOverride");

  // Ensure the override directory exists
  if (!fs.existsSync(overrideDir)) {
    fs.mkdirSync(overrideDir, { recursive: true });
  }

  /**
   * Create a safe filename from a product name
   */
  function createSafeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Remove special characters except spaces, hyphens, and underscores
      .replace(/\s+/g, " ") // Normalize multiple spaces to single space
      .trim()
      .replace(/\s/g, "_"); // Replace spaces with underscores
  }

  /**
   * Determine if a product is available (customize this logic as needed)
   */
  function isProductAvailable(_product: any): boolean {
    // Default logic: consider all products available
    // You can customize this based on your business logic
    // For example, check if the product has purchase URLs, is in stock, etc.
    return true;
  }

  /**
   * @route GET /admin/overrides
   * @desc Get all server data overrides
   * @access Public (for now - you might want to add authentication)
   */
  router.get("/overrides", (_req: Request, res: Response) => {
    try {
      const setFolders = fs
        .readdirSync(overrideDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name): name is string => name !== undefined);

      const overrides = [];

      for (const setFolder of setFolders) {
        const setCode = setFolder.toUpperCase();
        const setDir = path.join(overrideDir, setFolder);

        try {
          const products = [];
          let latestModified = new Date(0);

          // Check for available and unavailable subfolders
          const availableDir = path.join(setDir, "available");
          const unavailableDir = path.join(setDir, "unavailable");

          // Load products from available folder
          if (fs.existsSync(availableDir)) {
            const availableFiles = fs
              .readdirSync(availableDir)
              .filter((file) => file.endsWith(".json"));

            for (const productFile of availableFiles) {
              const productPath = path.join(availableDir, productFile);

              try {
                const fileContent = fs.readFileSync(productPath, "utf8");
                const product = JSON.parse(fileContent);

                if (product && typeof product === "object" && product.uuid) {
                  product.availability = "available";
                  products.push(product);

                  // Track the latest modification time
                  const stats = fs.statSync(productPath);
                  if (stats.mtime > latestModified) {
                    latestModified = stats.mtime;
                  }
                }
              } catch (error) {
                logger.error(
                  `Error reading product file ${setCode}/available/${productFile}:`,
                  error
                );
              }
            }
          }

          // Load products from unavailable folder
          if (fs.existsSync(unavailableDir)) {
            const unavailableFiles = fs
              .readdirSync(unavailableDir)
              .filter((file) => file.endsWith(".json"));

            for (const productFile of unavailableFiles) {
              const productPath = path.join(unavailableDir, productFile);

              try {
                const fileContent = fs.readFileSync(productPath, "utf8");
                const product = JSON.parse(fileContent);

                if (product && typeof product === "object" && product.uuid) {
                  product.availability = "unavailable";
                  products.push(product);

                  // Track the latest modification time
                  const stats = fs.statSync(productPath);
                  if (stats.mtime > latestModified) {
                    latestModified = stats.mtime;
                  }
                }
              } catch (error) {
                logger.error(
                  `Error reading product file ${setCode}/unavailable/${productFile}:`,
                  error
                );
              }
            }
          }

          if (products.length > 0) {
            // Extract release date from the first product that has one
            let releaseDate = null;
            for (const product of products) {
              if (product.releaseDate) {
                releaseDate = product.releaseDate;
                break;
              }
            }

            overrides.push({
              setCode: setCode,
              setName: products[0]?.setName || "Unknown Set",
              products: products,
              lastModified: latestModified.toISOString(),
              productCount: products.length,
              releaseDate: releaseDate,
            });
          }
        } catch (error) {
          logger.error(`Error processing set folder ${setCode}:`, error);
        }
      }

      // Sort by set code
      overrides.sort((a, b) => a.setCode.localeCompare(b.setCode));

      res.json({
        success: true,
        overrides: overrides,
        total: overrides.length,
      });
    } catch (error) {
      logger.error("Error loading overrides:", error);
      res.status(500).json({
        success: false,
        error: "Failed to load overrides",
      });
    }
  });

  /**
   * @route GET /admin/overrides/:setCode
   * @desc Get a specific override by set code
   * @access Public
   */
  router.get("/overrides/:setCode", (req: Request, res: Response) => {
    const setCode = req.params["setCode"]?.toUpperCase();
    if (!setCode) {
      return res.status(400).json({
        success: false,
        error: "Set code is required",
      });
    }
    const setDir = path.join(overrideDir, setCode.toLowerCase());

    try {
      if (!fs.existsSync(setDir)) {
        return res.status(404).json({
          success: false,
          error: `Override for set ${setCode} not found`,
        });
      }

      const products = [];
      let latestModified = new Date(0);

      // Check for available and unavailable subfolders
      const availableDir = path.join(setDir, "available");
      const unavailableDir = path.join(setDir, "unavailable");

      // Load products from available folder
      if (fs.existsSync(availableDir)) {
        const availableFiles = fs
          .readdirSync(availableDir)
          .filter((file) => file.endsWith(".json"));

        for (const productFile of availableFiles) {
          const productPath = path.join(availableDir, productFile);

          try {
            const fileContent = fs.readFileSync(productPath, "utf8");
            const product = JSON.parse(fileContent);

            if (product && typeof product === "object" && product.uuid) {
              products.push(product);

              // Track the latest modification time
              const stats = fs.statSync(productPath);
              if (stats.mtime > latestModified) {
                latestModified = stats.mtime;
              }
            }
          } catch (error) {
            logger.error(
              `Error reading product file ${setCode}/available/${productFile}:`,
              error
            );
          }
        }
      }

      // Load products from unavailable folder
      if (fs.existsSync(unavailableDir)) {
        const unavailableFiles = fs
          .readdirSync(unavailableDir)
          .filter((file) => file.endsWith(".json"));

        for (const productFile of unavailableFiles) {
          const productPath = path.join(unavailableDir, productFile);

          try {
            const fileContent = fs.readFileSync(productPath, "utf8");
            const product = JSON.parse(fileContent);

            if (product && typeof product === "object" && product.uuid) {
              products.push(product);

              // Track the latest modification time
              const stats = fs.statSync(productPath);
              if (stats.mtime > latestModified) {
                latestModified = stats.mtime;
              }
            }
          } catch (error) {
            logger.error(
              `Error reading product file ${setCode}/unavailable/${productFile}:`,
              error
            );
          }
        }
      }

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No valid products found for set ${setCode}`,
        });
      }

      // Extract release date from the first product that has one
      let releaseDate = null;
      for (const product of products) {
        if (product.releaseDate) {
          releaseDate = product.releaseDate;
          break;
        }
      }

      res.json({
        success: true,
        override: {
          setCode: setCode,
          setName: products[0]?.setName || "Unknown Set",
          products: products,
          lastModified: latestModified.toISOString(),
          productCount: products.length,
          releaseDate: releaseDate,
        },
      });
      return;
    } catch (error) {
      logger.error(`Error reading override for ${setCode}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to read override",
      });
      return;
    }
  });

  /**
   * @route POST /admin/overrides
   * @desc Create a new override
   * @access Public
   */
  router.post("/overrides", (req: Request, res: Response) => {
    try {
      const { setCode, setName, products } = req.body;

      if (!setCode || !setName || !products) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: setCode, setName, products",
        });
      }

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Products must be a non-empty array",
        });
      }

      // Validate each product has required fields
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (
          !product.uuid ||
          !product.name ||
          !product.category ||
          !product.setCode
        ) {
          return res.status(400).json({
            success: false,
            error: `Product ${i + 1} missing required fields: uuid, name, category, setCode`,
          });
        }
      }

      const setDir = path.join(overrideDir, setCode.toLowerCase());

      // Check if override already exists
      if (fs.existsSync(setDir)) {
        return res.status(409).json({
          success: false,
          error: `Override for set ${setCode} already exists. Use PUT to update.`,
        });
      }

      // Create the set directory and subdirectories
      fs.mkdirSync(setDir, { recursive: true });
      const availableDir = path.join(setDir, "available");
      const unavailableDir = path.join(setDir, "unavailable");
      fs.mkdirSync(availableDir, { recursive: true });
      fs.mkdirSync(unavailableDir, { recursive: true });

      // Write individual product files
      for (const product of products) {
        // Create a safe filename from the product name
        const safeName = createSafeFilename(product.name);
        const fileName = `${safeName}.json`;

        // Determine if product is available (default to available)
        const isAvailable = isProductAvailable(product);
        const targetDir = isAvailable ? availableDir : unavailableDir;
        const filePath = path.join(targetDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(product, null, 2));
      }

      logger.info(
        `Created override for set ${setCode}: ${products.length} products in ${setDir}`
      );

      res.status(201).json({
        success: true,
        message: `Override for set ${setCode} created successfully`,
        setCode: setCode,
        productCount: products.length,
      });
      return;
    } catch (error) {
      logger.error("Error creating override:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create override",
      });
      return;
    }
  });

  /**
   * @route PUT /admin/overrides/:setCode
   * @desc Update an existing override
   * @access Public
   */
  router.put("/overrides/:setCode", (req: Request, res: Response) => {
    try {
      const setCode = req.params["setCode"]?.toUpperCase();
      if (!setCode) {
        res.status(400).json({
          success: false,
          error: "Set code is required",
        });
        return;
      }
      const { setName, products } = req.body;

      if (!setName || !products) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: setName, products",
        });
      }

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Products must be a non-empty array",
        });
      }

      // Validate each product has required fields
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (
          !product.uuid ||
          !product.name ||
          !product.category ||
          !product.setCode
        ) {
          return res.status(400).json({
            success: false,
            error: `Product ${i + 1} missing required fields: uuid, name, category, setCode`,
          });
        }
      }

      const setDir = path.join(overrideDir, setCode.toLowerCase());

      // Check if override exists
      if (!fs.existsSync(setDir)) {
        return res.status(404).json({
          success: false,
          error: `Override for set ${setCode} not found`,
        });
      }

      // Clear existing product files from both subdirectories
      const availableDir = path.join(setDir, "available");
      const unavailableDir = path.join(setDir, "unavailable");

      // Clear available directory
      if (fs.existsSync(availableDir)) {
        const availableFiles = fs
          .readdirSync(availableDir)
          .filter((file) => file.endsWith(".json"));

        for (const file of availableFiles) {
          fs.unlinkSync(path.join(availableDir, file));
        }
      }

      // Clear unavailable directory
      if (fs.existsSync(unavailableDir)) {
        const unavailableFiles = fs
          .readdirSync(unavailableDir)
          .filter((file) => file.endsWith(".json"));

        for (const file of unavailableFiles) {
          fs.unlinkSync(path.join(unavailableDir, file));
        }
      }

      // Ensure subdirectories exist
      if (!fs.existsSync(availableDir)) {
        fs.mkdirSync(availableDir, { recursive: true });
      }
      if (!fs.existsSync(unavailableDir)) {
        fs.mkdirSync(unavailableDir, { recursive: true });
      }

      // Write new individual product files
      for (const product of products) {
        // Create a safe filename from the product name
        const safeName = createSafeFilename(product.name);
        const fileName = `${safeName}.json`;

        // Determine if product is available
        const isAvailable = isProductAvailable(product);
        const targetDir = isAvailable ? availableDir : unavailableDir;
        const filePath = path.join(targetDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(product, null, 2));
      }

      logger.info(
        `Updated override for set ${setCode}: ${products.length} products in ${setDir}`
      );

      res.json({
        success: true,
        message: `Override for set ${setCode} updated successfully`,
        setCode: setCode,
        productCount: products.length,
      });
      return;
    } catch (error) {
      logger.error("Error updating override:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update override",
      });
      return;
    }
  });

  /**
   * @route DELETE /admin/overrides/:setCode
   * @desc Delete an override
   * @access Public
   */
  router.delete("/overrides/:setCode", (req: Request, res: Response) => {
    try {
      const setCode = req.params["setCode"]?.toUpperCase();
      if (!setCode) {
        res.status(400).json({
          success: false,
          error: "Set code is required",
        });
        return;
      }
      const setDir = path.join(overrideDir, setCode.toLowerCase());

      if (!fs.existsSync(setDir)) {
        return res.status(404).json({
          success: false,
          error: `Override for set ${setCode} not found`,
        });
      }

      // Delete all product files in both subdirectories
      const availableDir = path.join(setDir, "available");
      const unavailableDir = path.join(setDir, "unavailable");

      // Delete available directory contents
      if (fs.existsSync(availableDir)) {
        const availableFiles = fs
          .readdirSync(availableDir)
          .filter((file) => file.endsWith(".json"));

        for (const file of availableFiles) {
          fs.unlinkSync(path.join(availableDir, file));
        }
        fs.rmdirSync(availableDir);
      }

      // Delete unavailable directory contents
      if (fs.existsSync(unavailableDir)) {
        const unavailableFiles = fs
          .readdirSync(unavailableDir)
          .filter((file) => file.endsWith(".json"));

        for (const file of unavailableFiles) {
          fs.unlinkSync(path.join(unavailableDir, file));
        }
        fs.rmdirSync(unavailableDir);
      }

      // Remove the empty set directory
      fs.rmdirSync(setDir);

      logger.info(`Deleted override for set ${setCode}`);

      res.json({
        success: true,
        message: `Override for set ${setCode} deleted successfully`,
      });
      return;
    } catch (error) {
      logger.error("Error deleting override:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete override",
      });
      return;
    }
  });

  return router;
}
