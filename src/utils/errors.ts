import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types";
import logger from "./logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super(message, 400);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, false);
  }
}

export function createApiError(error: AppError): ApiError {
  return {
    error: error.constructor.name,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: new Date().toISOString(),
  };
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error("Error occurred:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (error instanceof AppError) {
    const apiError = createApiError(error);
    res.status(error.statusCode).json(apiError);
    return;
  }

  // Handle unknown errors
  const internalError = new InternalServerError();
  const apiError = createApiError(internalError);
  res.status(500).json(apiError);
}

export function notFoundHandler(req: Request, res: Response): void {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  const apiError = createApiError(error);
  res.status(404).json(apiError);
}
