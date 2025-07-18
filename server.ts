/**
 * server.ts
 *
 * A Node.js + Express server that:
 *   1) Ensures AllPrintings.json (zipped) is available locally, unzips if needed
 *   2) Ensures sealed_extended_data.json is available locally
 *   3) Ensures the Scryfall "all_cards" file is downloaded
 *   4) Uses stream-json to parse only the needed Scryfall cards
 *   5) Merges AllPrintings + Scryfall
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
import { UnifiedData } from './src/types/unified/unifiedTypes'; // Import UnifiedData

/// Hypothetical Data Source class/type (adjust if actual implementation differs)
// Needs to be imported or defined
class MtgJsonApiDataSource {
  private loadedData: LoadedData;
  constructor(data: LoadedData) {
    // Ensure data is not null before assigning
    if (!data || !data.allPrintings) {
      throw new Error(
        'Cannot initialize MtgJsonApiDataSource with null loadedData or allPrintings'
      );
    }
    this.loadedData = data;
  }
  async getLoadedData(): Promise<LoadedData> {
    return this.loadedData;
  }
  // Add other methods if your data source class has them
}

// Define the context type for Apollo Server including dataSources
interface AppContext {
  loadedData: LoadedData; // Keep direct access if needed elsewhere
  boosterService: typeof boosterService;
  dataSources: {
    mtgjsonAPI: MtgJsonApiDataSource;
  };
}

// -------------- CONFIG CONSTANTS --------------
// Use environment variable for Port, provide a default
const PORT = process.env.PORT || 8080;

// -------------- EXPRESS APP --------------
const app = express();
const httpServer = http.createServer(app);

// -------------- CORS CONFIGURATION --------------
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
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
      !loadedData.allPrintings // Critical check before creating data source
      // !loadedData.extendedDataArray || // Keep other checks if needed
      // !loadedData.combinedCards
    ) {
      logger.fatal(
        'Essential data structures (esp. allPrintings) failed to load.'
      );
      throw new Error(
        'Essential data structures (esp. allPrintings) failed to load.'
      );
    }

    // At this point, loadedData and loadedData.allPrintings are guaranteed non-null
    const nonNullLoadedData = loadedData as LoadedData & {
      allPrintings: UnifiedData;
    };

    // Instantiate data sources AFTER data is loaded and verified
    const mtgjsonAPI = new MtgJsonApiDataSource(nonNullLoadedData);

    // Create context data object containing everything needed, use nonNull version for consistency?
    const contextData = {
      loadedData: nonNullLoadedData,
      boosterService,
      dataSources: { mtgjsonAPI },
    };

    // 2. Initialize Image Cache Service (registers image routes)
    // Image routes remain RESTful for now, could be moved to GraphQL later if desired
    initializeImageCacheService(app, nonNullLoadedData);

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

    // Apply Apollo middleware, passing the full contextData
    app.use(
      '/graphql',
      expressMiddleware(server, {
        // Pass the contextData object which now holds nonNullLoadedData
        context: async () => contextData,
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
