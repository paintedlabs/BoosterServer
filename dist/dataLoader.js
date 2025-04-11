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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAllData = loadAllData;
/**
 * dataLoader.ts
 *
 * Handles fetching, validating, loading, and processing
 * the necessary data files (AllPrintings, Extended Sealed Data, Scryfall)
 * for the Booster Server.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const unzipper = __importStar(require("unzipper"));
const promises_1 = require("stream/promises");
const stream_chain_1 = require("stream-chain");
const stream_json_1 = require("stream-json");
const StreamArray_1 = require("stream-json/streamers/StreamArray");
const logger_1 = __importDefault(require("./logger")); // Import the logger
const TcgCsvService = __importStar(require("./tcgCsvService"));
const src_1 = require("./src/core/status/src"); // Import StatusOr helpers
// -------------- CONFIG CONSTANTS --------------
// Read configuration from environment variables with defaults
const DATA_DIR = process.env.DATA_DIR || 'data';
// URLs to fetch if local files are missing
const ALL_PRINTINGS_ZIP_URL = process.env.ALL_PRINTINGS_ZIP_URL ||
    'https://mtgjson.com/api/v5/AllPrintings.json.zip';
const EXTENDED_DATA_URL = process.env.EXTENDED_DATA_URL ||
    'https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json';
const SCRYFALL_METADATA_URL = 'https://api.scryfall.com/bulk-data'; // Fixed metadata endpoint
// Local file paths
const ALL_PRINTINGS_PATH = path.join(DATA_DIR, 'AllPrintings.json');
const EXTENDED_DATA_PATH = path.join(DATA_DIR, 'sealed_extended_data.json');
const SCRYFALL_DATA_PATH = path.join(DATA_DIR, 'scryfall_all_cards.json');
// -------------- HELPER FUNCTIONS: FILE ENSURE & LOAD --------------
function ensureDirectoryExists(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            logger_1.default.info(`Creating data directory: ${dir}`);
            // Use synchronous mkdir here as it's part of setup and simpler
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}
function ensureAllPrintingsUnzipped(localJsonPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fs.existsSync(localJsonPath)) {
            logger_1.default.info(`Found local AllPrintings JSON: ${localJsonPath}.`);
            return;
        }
        yield ensureDirectoryExists(localJsonPath);
        logger_1.default.info(`AllPrintings JSON not found locally: ${localJsonPath}`);
        logger_1.default.info(`Attempting to fetch and unzip from: ${ALL_PRINTINGS_ZIP_URL} ...`);
        try {
            const response = yield (0, node_fetch_1.default)(ALL_PRINTINGS_ZIP_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch '${ALL_PRINTINGS_ZIP_URL}': ${response.status} ${response.statusText}`);
            }
            logger_1.default.info('AllPrintings zip download complete, unzipping...');
            const zipStream = response.body;
            if (!zipStream) {
                logger_1.default.error('Response body is null, cannot unzip AllPrintings.');
                throw new Error('Response body is null, cannot unzip.');
            }
            yield (0, promises_1.pipeline)(zipStream, // Cast needed for node-fetch body
            unzipper.ParseOne(/AllPrintings\.json$/i), // Find the correct entry case-insensitively
            fs.createWriteStream(localJsonPath));
            logger_1.default.info(`Successfully saved unzipped AllPrintings to: ${localJsonPath}`);
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Error during AllPrintings download/unzip');
            // Optionally try fetching the non-zipped version as a fallback?
            // await ensureFileExists(localJsonPath, ALL_PRINTINGS_URL);
            throw error; // Re-throw after logging
        }
    });
}
function ensureFileExistsHelper(localPath_1, remoteUrl_1) {
    return __awaiter(this, arguments, void 0, function* (localPath, remoteUrl, isFileOptional = false) {
        if (fs.existsSync(localPath)) {
            logger_1.default.info(`Found local file: ${localPath}.`);
            return true;
        }
        yield ensureDirectoryExists(localPath);
        logger_1.default.info(`File not found locally: ${localPath}`);
        logger_1.default.info(`Fetching from: ${remoteUrl} ...`);
        try {
            const resp = yield (0, node_fetch_1.default)(remoteUrl);
            if (!resp.ok) {
                throw new Error(`Failed to fetch '${remoteUrl}': ${resp.status} ${resp.statusText}`);
            }
            const textData = yield resp.text();
            fs.writeFileSync(localPath, textData, 'utf-8');
            logger_1.default.info(`Successfully saved file to: ${localPath}`);
            return true;
        }
        catch (error) {
            logger_1.default.error({ err: error, url: remoteUrl }, `Failed to download file`);
            if (isFileOptional) {
                logger_1.default.warn(`Could not fetch optional file: ${localPath}`);
                return false;
            }
            else {
                throw error; // Re-throw if the file is mandatory
            }
        }
    });
}
// Stream the Scryfall all-cards download to avoid large memory usage
function ensureScryfallAllCards(localPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (fs.existsSync(localPath)) {
            logger_1.default.info(`Scryfall all-cards file found locally: ${localPath}`);
            return;
        }
        yield ensureDirectoryExists(localPath);
        logger_1.default.info(`Scryfall all-cards not found locally: ${localPath}`);
        // --- Fetch Scryfall Bulk Data Metadata ---
        let downloadUri = '';
        try {
            logger_1.default.info(`Fetching Scryfall bulk data list from: ${SCRYFALL_METADATA_URL}...`);
            const metaResponse = yield (0, node_fetch_1.default)(SCRYFALL_METADATA_URL);
            if (!metaResponse.ok) {
                throw new Error(`Scryfall metadata fetch failed: ${metaResponse.status} ${metaResponse.statusText}`);
            }
            const metaData = yield metaResponse.json(); // Use 'any' for now, or define a proper type
            // Find the entry for "all_cards"
            const allCardsEntry = (_a = metaData === null || metaData === void 0 ? void 0 : metaData.data) === null || _a === void 0 ? void 0 : _a.find((item) => item.type === 'all_cards');
            if (!allCardsEntry || !allCardsEntry.download_uri) {
                logger_1.default.error({ metaData }, "Could not find 'all_cards' download URI in Scryfall metadata.");
                throw new Error("Could not find 'all_cards' download URI in Scryfall metadata.");
            }
            downloadUri = allCardsEntry.download_uri;
            logger_1.default.info(`Found Scryfall 'all_cards' download URI: ${downloadUri}`);
        }
        catch (error) {
            logger_1.default.error({ err: error }, 'Failed to fetch or parse Scryfall bulk data metadata.');
            throw error; // Re-throw
        }
        // --- Download the actual bulk data file using the obtained URI ---
        logger_1.default.info(`Downloading Scryfall bulk data from: ${downloadUri} (this may take a while)...`);
        const response = yield (0, node_fetch_1.default)(downloadUri);
        if (!response.ok) {
            throw new Error(`Scryfall bulk data download failed: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error('Scryfall bulk data response body is null.');
        }
        logger_1.default.info('Scryfall bulk download complete. Writing to file...');
        try {
            const fileStream = fs.createWriteStream(localPath);
            // Cast needed as node-fetch body type might not perfectly match Node stream types
            yield (0, promises_1.pipeline)(response.body, fileStream);
            logger_1.default.info(`Successfully wrote Scryfall data to ${localPath}`);
        }
        catch (error) {
            logger_1.default.error({ err: error, path: localPath }, `Error writing Scryfall data`);
            // Attempt cleanup of potentially partial file
            if (fs.existsSync(localPath)) {
                try {
                    fs.unlinkSync(localPath);
                    logger_1.default.warn(`Deleted potentially partial Scryfall file: ${localPath}`);
                }
                catch (e) {
                    logger_1.default.error(`Failed to delete partial Scryfall file: ${localPath}`, {
                        err: e,
                    });
                }
            }
            throw error; // Re-throw after cleanup attempt
        }
    });
}
// -------------- HELPER FUNCTIONS: LOAD INTO MEMORY --------------
function loadAllPrintings(filePath) {
    logger_1.default.info(`Loading AllPrintings from ${filePath}...`);
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        logger_1.default.info(`Successfully loaded AllPrintings version ${parsed.meta.version} (${parsed.meta.date}). Found ${Object.keys(parsed.data).length} sets.`);
        return parsed;
    }
    catch (err) {
        logger_1.default.error({ err, path: filePath }, `FATAL: Failed to load or parse AllPrintings`);
        return null;
    }
}
/**
 * Loads the extended sealed data and processes the sheets
 * from the { uuid: weight } format to the [{ uuid, weight }, ...] format.
 * Returns an array of the processed data structure.
 */
function loadAndProcessExtendedData(filePath) {
    logger_1.default.info(`Loading Extended Sealed Data from ${filePath}...`);
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        // Parse initially assuming the raw structure might be slightly different
        // if the source JSON structure is strictly typed, use that type here.
        const dataArray = JSON.parse(raw);
        const processedDataArray = [];
        // Process sheets for easier weighted random selection
        for (const product of dataArray) {
            // Create a new object conforming to ExtendedSealedData
            const processedProduct = Object.assign(Object.assign({}, product), { sheets: {} });
            const processedSheets = {}; // Use the final type
            // Ensure product.sheets exists and is an object
            if (product.sheets && typeof product.sheets === 'object') {
                for (const sheetName in product.sheets) {
                    // Use 'any' temporarily for the raw sheet to handle variability before validation
                    const originalSheetData = product.sheets[sheetName];
                    // Basic validation of the original sheet structure
                    if (!originalSheetData ||
                        !Array.isArray(originalSheetData.cards) ||
                        typeof originalSheetData.total_weight !== 'number') {
                        logger_1.default.warn({ productCode: product.code, sheetName }, `Skipping invalid raw sheet data structure`);
                        continue;
                    }
                    // Cast to RawExtendedSheet now that basic structure seems okay
                    const originalSheet = originalSheetData;
                    const processedCards = []; // Use the final type
                    let calculatedTotalWeight = 0;
                    // Iterate through the array of card objects
                    for (const cardObject of originalSheet.cards) {
                        // Validate the structure of the card object within the array
                        if (typeof cardObject !== 'object' ||
                            cardObject === null ||
                            typeof cardObject.uuid !== 'string' ||
                            typeof cardObject.weight !== 'number') {
                            logger_1.default.warn({ productCode: product.code, sheetName, cardObject }, `Skipping card object with invalid structure within sheet array`);
                            continue;
                        }
                        const uuid = cardObject.uuid;
                        const weight = cardObject.weight;
                        // Ensure extracted weight is positive
                        if (weight > 0) {
                            processedCards.push({ uuid, weight });
                            calculatedTotalWeight += weight;
                        }
                    }
                    // Validate calculated weight matches the provided total_weight
                    if (calculatedTotalWeight !== originalSheet.total_weight) {
                        // Log mismatch only if calculated > 0; if 0, previous warnings cover it.
                        if (calculatedTotalWeight > 0) {
                            logger_1.default.warn({
                                productCode: product.code,
                                sheetName,
                                expected: originalSheet.total_weight,
                                calculated: calculatedTotalWeight,
                            }, `Mismatch in sheet total_weight. Using calculated weight.`);
                        }
                    }
                    // Only add sheet if it has cards and positive weight
                    if (processedCards.length > 0 && calculatedTotalWeight > 0) {
                        processedSheets[sheetName] = {
                            total_weight: calculatedTotalWeight, // Use calculated weight for safety
                            balance_colors: false,
                            foil: false,
                            cards: processedCards,
                        };
                    }
                    else {
                        logger_1.default.warn({
                            productCode: product.code,
                            sheetName,
                            cardCount: processedCards.length,
                            weight: calculatedTotalWeight,
                        }, `Sheet resulted in no cards or zero total weight after processing. Skipping sheet.`);
                    }
                }
            }
            // Assign the processed sheets to the new product object
            processedProduct.sheets = processedSheets;
            processedDataArray.push(processedProduct);
        }
        logger_1.default.info(`Successfully loaded and processed ${processedDataArray.length} sealed product definitions.`);
        return processedDataArray;
    }
    catch (err) {
        logger_1.default.error({ err, path: filePath }, `FATAL: Failed to load or parse extended data`);
        return []; // Return empty array on fatal error
    }
}
/**
 * Parses the giant Scryfall file in a streaming way to build a map
 * of only the cards we actually need (based on scryfallIds from AllPrintings).
 */
function loadScryfallAllCardsStreamed(filePath, neededScryfallIds) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        if (neededScryfallIds.size === 0) {
            logger_1.default.warn('No Scryfall IDs were identified as needed. Skipping Scryfall load.');
            return {};
        }
        logger_1.default.info(`Streaming parse of Scryfall data from ${filePath}. Looking for ${neededScryfallIds.size} specific card IDs.`);
        const scryfallMap = {};
        let processedCount = 0;
        const startTime = Date.now();
        const pipelineStream = (0, stream_chain_1.chain)([
            fs.createReadStream(filePath),
            (0, stream_json_1.parser)({ jsonStreaming: true }),
            (0, StreamArray_1.streamArray)(),
        ]);
        try {
            logger_1.default.debug('Starting Scryfall stream processing loop...'); // Log before loop
            try {
                for (var _d = true, pipelineStream_1 = __asyncValues(pipelineStream), pipelineStream_1_1; pipelineStream_1_1 = yield pipelineStream_1.next(), _a = pipelineStream_1_1.done, !_a; _d = true) {
                    _c = pipelineStream_1_1.value;
                    _d = false;
                    const chunk = _c;
                    processedCount++;
                    const card = chunk.value;
                    // Basic validation of card object
                    if (card && typeof card === 'object' && card.id) {
                        if (neededScryfallIds.has(card.id)) {
                            scryfallMap[card.id] = card;
                            // Optional: remove ID from set to stop early if all found?
                            // neededScryfallIds.delete(card.id);
                            // if (neededScryfallIds.size === 0) break; // Optimization
                        }
                    }
                    else if (processedCount === 1 &&
                        !(card && typeof card === 'object' && card.id)) {
                        // Check the first object only more robustly
                        logger_1.default.warn({ firstObject: card }, "First object in Scryfall stream doesn't look like a valid card");
                    }
                    // Progress logging
                    if (processedCount % 50000 === 0) {
                        // Log less frequently
                        const elapsed = (Date.now() - startTime) / 1000;
                        logger_1.default.debug(`  ... processed ${processedCount} Scryfall objects, found ${Object.keys(scryfallMap).length}/${neededScryfallIds.size} needed cards (${elapsed.toFixed(1)}s)`);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = pipelineStream_1.return)) yield _b.call(pipelineStream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            logger_1.default.debug('Finished Scryfall stream processing loop.'); // Log after loop
        }
        catch (streamError) {
            logger_1.default.error({ err: streamError }, 'Error during Scryfall stream processing');
            throw streamError; // Propagate error
        }
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        logger_1.default.info(`Scryfall stream finished in ${duration.toFixed(1)}s. Processed ${processedCount} objects.`);
        logger_1.default.info(`Found ${Object.keys(scryfallMap).length} matching Scryfall cards out of ${neededScryfallIds.size} needed.`);
        // Log if any needed cards were not found
        if (Object.keys(scryfallMap).length < neededScryfallIds.size) {
            logger_1.default.warn(`Could not find Scryfall data for ${neededScryfallIds.size - Object.keys(scryfallMap).length} IDs.`);
            // Optionally log the missing IDs (can be very verbose)
            // const foundIds = new Set(Object.keys(scryfallMap));
            // const missingIds = [...neededScryfallIds].filter(id => !foundIds.has(id));
            // logger.warn({ missingIds: missingIds.slice(0, 10) }, "Sample missing Scryfall IDs"); // Log first few
        }
        logger_1.default.info('loadScryfallAllCardsStreamed function finishing.'); // Log before return
        return scryfallMap;
    });
}
// -------------- HELPER FUNCTION: MERGING --------------
/**
 * Builds the combinedCards map by:
 * 1. Identifying all unique Scryfall IDs needed from AllPrintings.
 * 2. Loading the required Scryfall card data using the streaming parser.
 * 3. Merging the AllPrintings card data with the corresponding Scryfall data.
 */
function buildCombinedCards(allPrintings, scryfallFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        logger_1.default.info('Starting combined card data build...');
        const combinedCardsMap = {};
        // 1. Collect needed Scryfall IDs from AllPrintings
        const neededScryfallIds = new Set();
        let allPrintingsCardCount = 0;
        for (const setCode of Object.keys(allPrintings.data)) {
            const setObj = allPrintings.data[setCode];
            if (setObj === null || setObj === void 0 ? void 0 : setObj.cards) {
                for (const card of setObj.cards) {
                    allPrintingsCardCount++;
                    const scryId = (_a = card.identifiers) === null || _a === void 0 ? void 0 : _a.scryfallId;
                    if (scryId) {
                        neededScryfallIds.add(scryId);
                    }
                }
            }
        }
        logger_1.default.info(`Collected ${neededScryfallIds.size} unique Scryfall IDs from ${allPrintingsCardCount} card printings in AllPrintings.`);
        // 2. Load Scryfall data for needed IDs
        logger_1.default.info('Calling loadScryfallAllCardsStreamed...'); // Log before await
        const scryfallMap = yield loadScryfallAllCardsStreamed(scryfallFilePath, neededScryfallIds);
        logger_1.default.info('Returned from loadScryfallAllCardsStreamed.'); // Log after await
        // 3. Merge AllPrintings and Scryfall data
        let mergedCount = 0;
        let missingScryfallCount = 0;
        for (const setCode of Object.keys(allPrintings.data)) {
            const setObj = allPrintings.data[setCode];
            if (setObj === null || setObj === void 0 ? void 0 : setObj.cards) {
                for (const card of setObj.cards) {
                    const scryId = (_b = card.identifiers) === null || _b === void 0 ? void 0 : _b.scryfallId;
                    const scryData = scryId ? scryfallMap[scryId] : undefined;
                    if (scryId && !scryData) {
                        missingScryfallCount++;
                        // Log only once per missing ID if needed
                        // logger.warn({ scryfallId: scryId, cardName: card.name, setCode }, `Scryfall data missing for printing`);
                    }
                    // Store combined data using the MTGJSON UUID as the key
                    combinedCardsMap[card.uuid] = {
                        allPrintingsData: card,
                        scryfallData: scryData, // Will be undefined if scryId was missing or not found
                        // Initialize price fields to null - they will be populated later
                        tcgNormalMarketPrice: null,
                        tcgFoilMarketPrice: null,
                    };
                    mergedCount++;
                }
            }
        }
        logger_1.default.info(`Built combined data for ${mergedCount} card printings.`);
        if (missingScryfallCount > 0) {
            logger_1.default.warn(`Note: Scryfall data was not found for ${missingScryfallCount} printings (affecting ${neededScryfallIds.size - Object.keys(scryfallMap).length} unique card IDs).`);
        }
        return combinedCardsMap;
    });
}
// -------------- HELPER FUNCTION: TCG CSV PRICE FETCHING --------------
/**
 * Fetches TCGPlayer group, product, and price data and applies market prices
 * to the provided combinedCardsMap and extendedDataArray.
 */
function fetchAndApplyTcgPrices(allPrintings, combinedCardsMap, extendedDataArray) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        logger_1.default.info('--- Starting TCGPlayer Price Fetching and Application ---');
        // 1. Fetch all MTG groups (sets) from TCG CSV
        const groupsResult = yield TcgCsvService.fetchGroups();
        if (!(0, src_1.isOk)(groupsResult)) {
            logger_1.default.error({
                errorType: groupsResult.error.type,
                details: groupsResult.error,
            }, 'Failed to fetch TCGPlayer groups. Skipping price fetching.');
            return;
        }
        const tcgGroups = groupsResult.value;
        const tcgGroupMap = new Map(tcgGroups.map((g) => [g.groupId, g]));
        logger_1.default.info(`Fetched ${tcgGroupMap.size} TCGPlayer groups.`);
        // Create a consolidated price map across all groups for sealed lookup
        const consolidatedPriceMap = new Map();
        // 2. Iterate through AllPrintings sets to find corresponding TCG groups
        let setsProcessedForPrices = 0;
        for (const setCode of Object.keys(allPrintings.data)) {
            const mtgSet = allPrintings.data[setCode];
            const tcgGroupId = mtgSet.tcgplayerGroupId;
            if (!tcgGroupId) {
                continue;
            }
            if (!tcgGroupMap.has(tcgGroupId)) {
                logger_1.default.warn({ setCode, tcgplayerGroupId: tcgGroupId }, `TCGPlayer group data not found for groupId provided by MTGSet. Skipping.`);
                continue;
            }
            logger_1.default.info(`Processing TCG prices for Set: ${setCode} (Group ID: ${tcgGroupId})`);
            // 3. Fetch Products and Prices for the group
            const [productsResult, pricesResult] = yield Promise.all([
                TcgCsvService.fetchProducts(tcgGroupId),
                TcgCsvService.fetchPrices(tcgGroupId),
            ]);
            if (!(0, src_1.isOk)(productsResult)) {
                logger_1.default.error({
                    errorType: productsResult.error.type,
                    details: productsResult.error,
                    setCode,
                    tcgGroupId,
                }, `Failed to fetch TCGPlayer products for group. Skipping prices for this set.`);
                continue;
            }
            const tcgProducts = productsResult.value;
            const tcgProductMap = new Map(tcgProducts.map((p) => [p.productId, p]));
            if (!(0, src_1.isOk)(pricesResult)) {
                logger_1.default.error({
                    errorType: pricesResult.error.type,
                    details: pricesResult.error,
                    setCode,
                    tcgGroupId,
                }, `Failed to fetch TCGPlayer prices for group. Skipping prices for this set.`);
                continue;
            }
            const tcgPrices = pricesResult.value;
            // 4. Build a temporary price map for *this group* and merge into consolidated map
            const groupPriceMap = new Map();
            for (const price of tcgPrices) {
                if (!groupPriceMap.has(price.productId)) {
                    groupPriceMap.set(price.productId, {});
                }
                const entry = groupPriceMap.get(price.productId);
                const marketPrice = price.marketPrice;
                if (price.subTypeName === 'Normal') {
                    entry.normal = marketPrice;
                }
                else if (price.subTypeName === 'Foil') {
                    entry.foil = marketPrice;
                }
                // Also add to consolidated map
                if (!consolidatedPriceMap.has(price.productId)) {
                    consolidatedPriceMap.set(price.productId, {});
                }
                const consolidatedEntry = consolidatedPriceMap.get(price.productId);
                if (price.subTypeName === 'Normal') {
                    consolidatedEntry.normal = marketPrice;
                }
                else if (price.subTypeName === 'Foil') {
                    consolidatedEntry.foil = marketPrice;
                }
            }
            // 5. Apply prices to CombinedCard map using the group-specific price map
            let cardsUpdated = 0;
            for (const card of mtgSet.cards) {
                const combinedCard = combinedCardsMap[card.uuid];
                if (!combinedCard)
                    continue;
                const tcgProductId = (_a = combinedCard.allPrintingsData.identifiers) === null || _a === void 0 ? void 0 : _a.tcgplayerProductId;
                if (!tcgProductId)
                    continue;
                const prices = groupPriceMap.get(Number(tcgProductId));
                if (prices) {
                    combinedCard.tcgNormalMarketPrice = (_b = prices.normal) !== null && _b !== void 0 ? _b : null;
                    combinedCard.tcgFoilMarketPrice = (_c = prices.foil) !== null && _c !== void 0 ? _c : null;
                    cardsUpdated++;
                }
            }
            if (cardsUpdated > 0) {
                logger_1.default.debug(`  Updated prices for ${cardsUpdated} cards in ${setCode}.`);
            }
            setsProcessedForPrices++;
        } // End of set loop
        // 6. Apply prices to ExtendedSealedData using the consolidated price map
        let sealedProductsUpdated = 0;
        for (const sealedProduct of extendedDataArray) {
            const tcgProductId = sealedProduct.tcgplayerProductId;
            if (!tcgProductId)
                continue;
            const prices = consolidatedPriceMap.get(Number(tcgProductId)); // Use consolidated map here
            if (prices) {
                sealedProduct.tcgMarketPrice = (_e = (_d = prices.normal) !== null && _d !== void 0 ? _d : prices.foil) !== null && _e !== void 0 ? _e : null;
                if (sealedProduct.tcgMarketPrice !== null) {
                    sealedProductsUpdated++;
                }
            }
        }
        if (sealedProductsUpdated > 0) {
            logger_1.default.info(`Updated prices for ${sealedProductsUpdated} sealed products.`);
        }
        logger_1.default.info(`--- Finished TCGPlayer Price Fetching. Processed ${setsProcessedForPrices} sets. ---`);
    });
}
// -------------- MAIN EXPORTED FUNCTION --------------
/**
 * Ensures all necessary data files are present (downloading if needed),
 * loads them into memory, processes them, fetches prices, and returns the final data structures.
 */
function loadAllData() {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.default.info('--- Starting Data Loading Process ---');
        // Ensure data directory exists
        yield ensureDirectoryExists(ALL_PRINTINGS_PATH);
        // 1. Ensure and Load AllPrintings
        yield ensureAllPrintingsUnzipped(ALL_PRINTINGS_PATH);
        const allPrintingsData = loadAllPrintings(ALL_PRINTINGS_PATH);
        if (!allPrintingsData) {
            throw new Error('Failed to load AllPrintings.json. Server cannot start.');
        }
        // 2. Ensure and Load Extended Sealed Data
        const extendedDataExists = yield ensureFileExistsHelper(EXTENDED_DATA_PATH, EXTENDED_DATA_URL, false);
        if (!extendedDataExists) {
            throw new Error('Failed to load sealed_extended_data.json. Server cannot start.');
        }
        const extendedDataArray = loadAndProcessExtendedData(EXTENDED_DATA_PATH);
        if (!extendedDataArray || extendedDataArray.length === 0) {
            logger_1.default.warn('Extended sealed data is empty or failed to load properly.');
        }
        // 3. Ensure Scryfall Bulk Data
        yield ensureScryfallAllCards(SCRYFALL_DATA_PATH);
        // 4. Build Combined Card Map (requires AllPrintings and Scryfall path)
        const combinedCardsMap = yield buildCombinedCards(allPrintingsData, SCRYFALL_DATA_PATH);
        // 5. Fetch and Apply TCGPlayer Prices
        yield fetchAndApplyTcgPrices(allPrintingsData, combinedCardsMap, extendedDataArray // Pass the array to be potentially modified
        );
        logger_1.default.info('--- Data Loading Process Finished Successfully ---');
        return {
            allPrintings: allPrintingsData,
            extendedDataArray: extendedDataArray,
            combinedCards: combinedCardsMap,
        };
    });
}
