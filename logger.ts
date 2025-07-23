/**
 * logger.ts
 *
 * Configures and exports the Pino logger instance for the application.
 */

import pino from 'pino';

// Determine if running in development based on NODE_ENV or a similar flag
// Default to development if not set
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log level priority: LOG_LEVEL env var > NODE_ENV default > fallback
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  if (isDevelopment) {
    return process.env.DEV_LOG_LEVEL || 'info'; // Less verbose default for dev
  }
  return 'info';
};

const loggerOptions: pino.LoggerOptions = {
  level: getLogLevel(),
};

// Use pino-pretty only in development for human-readable logs
if (isDevelopment) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true, // Colorize output
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Human-readable time format
      ignore: 'pid,hostname', // Ignore pid and hostname for cleaner logs
    },
  };
}

const logger = pino(loggerOptions);

export default logger;
