"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Import this early to patch async route handlers
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const os = __importStar(require("os"));
const cors_1 = __importDefault(require("cors"));
const imageCacheService_1 = require("./imageCacheService"); // Import image cache setup
const logger_1 = __importDefault(require("./logger")); // Import the configured logger
const server_1 = require("@apollo/server"); // Import ApolloServer
const express4_1 = require("@apollo/server/express4"); // Import Express middleware adapter
const http_1 = __importDefault(require("http")); // Needed for graceful shutdown with Apollo
const schema_1 = require("./graphql/schema"); // Import GraphQL type definitions
const resolvers_1 = require("./graphql/resolvers"); // Import GraphQL resolvers
const dataLoader_1 = require("./dataLoader"); // Correct import
const boosterService = __importStar(require("./boosterService")); // Correct import
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
// -------------- CONFIG CONSTANTS --------------
// Use environment variable for Port, provide a default
const PORT = process.env.PORT || 8080;
// -------------- EXPRESS APP --------------
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
// -------------- CORS CONFIGURATION --------------
app.use((0, cors_1.default)({
    origin: '*', // TODO: Restrict in production
    methods: ['GET', 'POST'],
}));
// -------------- MIDDLEWARE --------------
app.use(body_parser_1.default.json());
// ADD: Log request body immediately after parsing, before any routes
app.use((req, res, next) => {
    if (req.path === '/graphql' && req.method === 'POST') {
        // Only log for GraphQL POSTs
        logger_1.default.info({ body: req.body }, 'GraphQL request body after parsing:');
    }
    next();
});
// -------------- INTERFACES (Keep interfaces used by routes if not already in dataLoader/boosterService) --------------
// Interfaces like AllPrintings, MTGSet, CardSet, Extended*, CombinedCard moved to dataLoader.ts
// Keep interfaces specific to API responses if necessary.
// Interface SetResponse moved to types.ts
// -------------- GLOBALS (Populated by loadAllData) --------------
let loadedData = null;
// -------------- MAIN STARTUP --------------
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('Starting server initialization...');
        try {
            // 1. Load all necessary data using the new dataLoader module
            logger_1.default.info('Loading data...');
            loadedData = yield (0, dataLoader_1.loadAllData)();
            logger_1.default.info('Data loading complete.');
            if (!loadedData ||
                !loadedData.allPrintings ||
                !loadedData.extendedDataArray ||
                !loadedData.combinedCards) {
                logger_1.default.fatal('Essential data structures failed to load.');
                throw new Error('Essential data structures failed to load.');
            }
            // 2. Initialize Image Cache Service (registers image routes)
            // Image routes remain RESTful for now, could be moved to GraphQL later if desired
            const contextData = { loadedData, boosterService };
            (0, imageCacheService_1.initializeImageCacheService)(app, contextData.loadedData);
            // 3. Mount API Routers
            // REST API routes removed, setting up GraphQL endpoint
            // Set up Apollo Server with the defined context type
            // Now httpServer is guaranteed to be assigned
            const server = new server_1.ApolloServer({
                typeDefs: schema_1.typeDefs,
                resolvers: resolvers_1.resolvers,
                introspection: process.env.NODE_ENV !== 'production',
                plugins: [(0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer })],
            });
            // GraphQL endpoint setup
            yield server.start();
            // Apply Apollo middleware to Express app at /graphql endpoint
            // Pass loadedData into the context for resolvers
            app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
                context: () => __awaiter(this, void 0, void 0, function* () {
                    return ({
                        loadedData: contextData.loadedData,
                        boosterService: contextData.boosterService,
                    });
                }),
            }));
            logger_1.default.info(`GraphQL endpoint ready at /graphql`);
            // ADD: Generic Express Error Handler - MUST be last middleware
            const genericErrorHandler = (err, req, res, next) => {
                logger_1.default.error({ err, path: req.path, method: req.method }, 'Unhandled Express error caught by generic handler');
                // Avoid sending stack trace in production
                const errorMessage = process.env.NODE_ENV === 'production'
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
                logger_1.default.info(`Server ready.`);
                const networkInterfaces = os.networkInterfaces();
                const addresses = [];
                // Handle graceful shutdown
                process.on('SIGINT', () => {
                    logger_1.default.info('Received SIGINT. Shutting down gracefully...');
                    // Gracefully shutdown Apollo Server first, then HTTP server
                    server
                        .stop()
                        .then(() => {
                        logger_1.default.info('Apollo Server stopped.');
                        httpServer === null || httpServer === void 0 ? void 0 : httpServer.close((err) => {
                            if (err) {
                                logger_1.default.error({ err }, 'Error during HTTP server shutdown');
                                process.exit(1);
                            }
                            else {
                                logger_1.default.info('HTTP server closed.');
                                process.exit(0);
                            }
                        });
                    })
                        .catch((err) => {
                        logger_1.default.error({ err }, 'Error stopping Apollo Server');
                        // Still try to close HTTP server
                        httpServer === null || httpServer === void 0 ? void 0 : httpServer.close(() => process.exit(1));
                    });
                });
            });
        }
        catch (err) {
            logger_1.default.fatal({ err }, 'Fatal startup error'); // Log error object
            process.exit(1); // Exit if essential startup steps fail
        }
    });
}
// Execute main function
main().catch((err) => {
    // This catch is for unhandled promise rejections from main() itself
    console.error('Unhandled error during main execution:', err);
    process.exit(1);
});
