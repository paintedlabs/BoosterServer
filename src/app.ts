import express from "express";
import { setupMiddleware, setupErrorHandling } from "./middleware";
import { createSetsRouter } from "./routes/sets";
import { createProductsRouter } from "./routes/products";
import { createImagesRouter } from "./routes/images";
import { createTCGCSVRouter } from "./routes/tcgcsv";
import { DataService, ImageService } from "./types";
import logger from "./utils/logger";

export function createApp(
  dataService: DataService,
  imageService: ImageService
): express.Application {
  const app = express();

  // Setup middleware
  setupMiddleware(app);

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "booster-server",
    });
  });

  // API routes
  app.use("/sets", createSetsRouter(dataService));
  app.use("/products", createProductsRouter(dataService));
  app.use("/tcgcsv", createTCGCSVRouter((dataService as any).tcgcsvService));
  app.use("/", createImagesRouter(imageService));

  // Setup error handling (must be last)
  setupErrorHandling(app);

  logger.info("Express application configured successfully");

  return app;
}
