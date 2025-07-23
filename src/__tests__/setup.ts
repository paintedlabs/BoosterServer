// Test setup file
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment
process.env["NODE_ENV"] = "test";

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: (global as any).jest?.fn() || (() => {}),
  debug: (global as any).jest?.fn() || (() => {}),
  info: (global as any).jest?.fn() || (() => {}),
  warn: (global as any).jest?.fn() || (() => {}),
  error: (global as any).jest?.fn() || (() => {}),
};
