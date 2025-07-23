import { Express } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { config } from "../config";
import logger from "../utils/logger";
import { errorHandler, notFoundHandler } from "../utils/errors";

export function setupMiddleware(app: Express): void {
  // CORS middleware
  app.use(
    cors({
      origin: config.server.cors.origin,
      methods: config.server.cors.methods,
    })
  );

  // Body parsing middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    next();
  });

  // Response time middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
      );
    });
    next();
  });
}

export function setupErrorHandling(app: Express): void {
  // 404 handler (must be last before error handler)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);
}
