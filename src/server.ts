import os from "os";
import { config } from "./config";
import logger from "./utils/logger";
import { MTGDataService } from "./services/dataService";
import { MTGImageService } from "./services/imageService";
import { createApp } from "./app";

async function main(): Promise<void> {
  try {
    logger.info("Starting Booster Server...");

    // Initialize data service
    const dataService = new MTGDataService();
    await dataService.initialize();

    // Initialize image service
    const imageService = new MTGImageService(dataService.getCombinedCards());
    await imageService.ensureSetImagesCached();

    // Create and configure Express app
    const app = createApp(dataService, imageService);

    // Start server
    const server = app.listen(config.server.port, config.server.host, () => {
      const networkInterfaces = os.networkInterfaces();
      const addresses: string[] = [];

      for (const iface of Object.values(networkInterfaces)) {
        if (iface) {
          iface.forEach((details) => {
            if (details.family === "IPv4" && !details.internal) {
              addresses.push(details.address);
            }
          });
        }
      }

      logger.info("Server started successfully");
      if (addresses.length > 0) {
        logger.info("Server running on:");
        addresses.forEach((addr) =>
          logger.info(`  http://${addr}:${config.server.port}`)
        );
      } else {
        logger.info(`Server running on localhost:${config.server.port}`);
      }
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully");
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Startup error:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
