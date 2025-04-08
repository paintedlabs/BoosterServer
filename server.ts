/**
 * server.ts
 *
 * A Node.js + Express server that:
 *   1) Ensures AllPrintings.json (zipped) is available locally, unzips if needed
 *   2) Ensures sealed_extended_data.json is available locally
 *   3) Ensures the Scryfall "all_cards" file is downloaded
 *   4) Uses stream-json to parse only the needed Scryfall cards
 *   5) Merges AllPrintings + Scryfall
 *   6) Exposes:
 *       GET /sets
 *       GET /sets/:setCode/products
 *       POST /products/:productCode/open
 *
 *   The /open endpoint returns merged data for each card.
 */

// Load environment variables first!
import * as dotenv from 'dotenv';
dotenv.config();

// Import this early to patch async route handlers
import 'express-async-errors';

import express from 'express';
import bodyParser from 'body-parser';
import * as os from 'os';
import cors from 'cors';
import { initializeImageCacheService } from './imageCacheService'; // Import image cache setup
import logger from './logger'; // Import the configured logger
import { ErrorRequestHandler } from 'express'; // Import ErrorRequestHandler type
import { ApolloServer } from '@apollo/server'; // Import ApolloServer
import { expressMiddleware } from '@apollo/server/express4'; // Import Express middleware adapter
import http from 'http'; // Needed for graceful shutdown with Apollo
import { typeDefs } from './graphql/schema'; // Import GraphQL type definitions
import { resolvers } from './graphql/resolvers'; // Import GraphQL resolvers
import { loadAllData, LoadedData } from './dataLoader'; // Correct import
import * as boosterService from './boosterService'; // Correct import
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

// Define the context type for Apollo Server
interface AppContext {
  loadedData: LoadedData;
  boosterService: typeof boosterService;
}

// -------------- CONFIG CONSTANTS --------------
// Use environment variable for Port, provide a default
const PORT = process.env.PORT || 8080;

// Local file paths are now primarily managed in dataLoader.ts
// We might still need paths for caching, etc.
// Cache paths moved to imageCacheService.ts

// -------------- EXPRESS APP --------------
const app = express();
const httpServer = http.createServer(app);

// -------------- CORS CONFIGURATION --------------
app.use(
  cors({
    origin: '*', // TODO: Restrict in production
    methods: ['GET', 'POST'],
  })
);

// -------------- MIDDLEWARE --------------
app.use(bodyParser.json());

// ADD: Log request body immediately after parsing, before any routes
app.use((req, res, next) => {
  if (req.path === '/graphql' && req.method === 'POST') {
    // Only log for GraphQL POSTs
    logger.info({ body: req.body }, 'GraphQL request body after parsing:');
  }
  next();
});

// -------------- INTERFACES (Keep interfaces used by routes if not already in dataLoader/boosterService) --------------
// Interfaces like AllPrintings, MTGSet, CardSet, Extended*, CombinedCard moved to dataLoader.ts
// Keep interfaces specific to API responses if necessary.
// Interface SetResponse moved to types.ts

// -------------- GLOBALS (Populated by loadAllData) --------------
let loadedData: LoadedData | null = null;

// -------------- DATA LOADING (Moved to dataLoader.ts) --------------
// The ensure*, load*, buildCombinedCards functions are removed.

// -------------- BOOSTER SIMULATION LOGIC --------------
// (Keep this logic here as it relates to the /open endpoint)

// -------------- ENDPOINTS --------------
// REST endpoints removed in favor of GraphQL

// Image caching logic and routes moved to imageCacheService.ts

// -------------- MAIN STARTUP --------------
async function main() {
  logger.info('Starting server initialization...');
  try {
    // 1. Load all necessary data using the new dataLoader module
    logger.info('Loading data...');
    loadedData = await loadAllData();
    logger.info('Data loading complete.');
    if (
      !loadedData ||
      !loadedData.allPrintings ||
      !loadedData.extendedDataArray ||
      !loadedData.combinedCards
    ) {
      logger.fatal('Essential data structures failed to load.');
      throw new Error('Essential data structures failed to load.');
    }

    // 2. Initialize Image Cache Service (registers image routes)
    // Image routes remain RESTful for now, could be moved to GraphQL later if desired
    const contextData = { loadedData, boosterService };
    initializeImageCacheService(app, contextData.loadedData);

    // 3. Mount API Routers
    // REST API routes removed, setting up GraphQL endpoint

    // Set up Apollo Server with the defined context type
    // Now httpServer is guaranteed to be assigned
    const server = new ApolloServer<AppContext>({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    // GraphQL endpoint setup
    await server.start();

    // Apply Apollo middleware to Express app at /graphql endpoint
    // Pass loadedData into the context for resolvers
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async () => ({
          loadedData: contextData.loadedData,
          boosterService: contextData.boosterService,
        }),
      })
    );

    logger.info(`GraphQL endpoint ready at /graphql`);

    // ADD: Generic Express Error Handler - MUST be last middleware
    const genericErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
      logger.error(
        { err, path: req.path, method: req.method },
        'Unhandled Express error caught by generic handler'
      );
      // Avoid sending stack trace in production
      const errorMessage =
        process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : err.stack;
      res
        .status(500)
        .send({ error: 'Something failed!', details: errorMessage });
    };
    app.use(genericErrorHandler);

    // 4. Start the Express server
    // Use http.createServer for graceful shutdown compatibility with Apollo
    httpServer.listen(PORT, () => {
      logger.info(`Server ready.`);
      const networkInterfaces = os.networkInterfaces();
      const addresses: string[] = [];
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT. Shutting down gracefully...');
        // Gracefully shutdown Apollo Server first, then HTTP server
        server
          .stop()
          .then(() => {
            logger.info('Apollo Server stopped.');
            httpServer?.close((err?: Error) => {
              if (err) {
                logger.error({ err }, 'Error during HTTP server shutdown');
                process.exit(1);
              } else {
                logger.info('HTTP server closed.');
                process.exit(0);
              }
            });
          })
          .catch((err) => {
            logger.error({ err }, 'Error stopping Apollo Server');
            // Still try to close HTTP server
            httpServer?.close(() => process.exit(1));
          });
      });
    });
  } catch (err) {
    logger.fatal({ err }, 'Fatal startup error'); // Log error object
    process.exit(1); // Exit if essential startup steps fail
  }
}

// Execute main function
main().catch((err) => {
  // This catch is for unhandled promise rejections from main() itself
  console.error('Unhandled error during main execution:', err);
  process.exit(1);
});
