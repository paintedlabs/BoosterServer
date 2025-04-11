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
exports.initializeImageCacheService = initializeImageCacheService;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const sharp_1 = __importDefault(require("sharp"));
const promises_1 = require("stream/promises");
const logger_1 = __importDefault(require("./logger")); // Import the logger
const zod_1 = require("zod"); // Import zod
// -------------- CONFIG CONSTANTS --------------
// Read cache directory from environment variable with a default
const CACHE_DIR = path.resolve(process.env.CACHE_DIR || 'cache'); // Use path.resolve for robustness
const IMAGE_CACHE_DIR = path.join(CACHE_DIR, 'images');
const SET_CACHE_DIR = path.join(CACHE_DIR, 'sets');
// -------------- SERVICE STATE --------------
let serviceLoadedData = null;
// --- Zod Schemas for Validation ---
const cardImageParamsSchema = zod_1.z.object({
    allPrintingsId: zod_1.z.string().uuid(), // Expect a UUID
    cardFace: zod_1.z.enum(['front', 'back']).optional(), // Allow only front or back, optional
});
const setCodeParamSchema = zod_1.z.object({
    setCode: zod_1.z.string().min(1).max(10).toLowerCase(), // Expect non-empty string, max 10 chars, lowercase
});
// -------------- HELPER FUNCTIONS --------------
// Ensure cache directories exist
function ensureCacheDirsExist() {
    if (!fs.existsSync(IMAGE_CACHE_DIR)) {
        logger_1.default.info(`Creating image cache directory: ${IMAGE_CACHE_DIR}`);
        fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true }); // Log before action
    }
    if (!fs.existsSync(SET_CACHE_DIR)) {
        logger_1.default.info(`Creating set image cache directory: ${SET_CACHE_DIR}`);
        fs.mkdirSync(SET_CACHE_DIR, { recursive: true }); // Log before action
    }
}
// Fetch and cache set SVG icons as PNGs
function ensureSetSvgsCached() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(serviceLoadedData === null || serviceLoadedData === void 0 ? void 0 : serviceLoadedData.allPrintings)) {
            logger_1.default.warn('Cannot cache set SVGs: AllPrintings data not available in service state.');
            return;
        }
        logger_1.default.info('Checking set image cache...');
        ensureCacheDirsExist(); // Make sure base set dir exists
        const allPrintings = serviceLoadedData.allPrintings;
        const codes = Object.keys(allPrintings.data);
        let checkedCount = 0;
        let fetchedCount = 0;
        const promises = [];
        const concurrencyLimit = 5;
        let activeFetches = 0;
        for (const code of codes) {
            const localPngPath = path.join(SET_CACHE_DIR, `${code.toLowerCase()}.png`);
            checkedCount++;
            if (fs.existsSync(localPngPath)) {
                continue; // Already cached
            }
            const fetchPromise = () => __awaiter(this, void 0, void 0, function* () {
                activeFetches++;
                const url = `https://svgs.scryfall.io/sets/${code.toLowerCase()}.svg`;
                // logger.debug({ setCode: code, url }, `Fetching set SVG`);
                try {
                    const resp = yield (0, node_fetch_1.default)(url);
                    if (!resp.ok) {
                        if (resp.status !== 404) {
                            logger_1.default.warn({
                                setCode: code,
                                status: resp.status,
                                statusText: resp.statusText,
                            }, `Failed to fetch SVG`);
                        }
                        return;
                    }
                    const svgBuffer = yield resp.buffer();
                    if (svgBuffer.length < 50) {
                        logger_1.default.warn({ setCode: code, size: svgBuffer.length }, `Received very small SVG, skipping conversion.`);
                        return;
                    }
                    const pngBuffer = yield (0, sharp_1.default)(svgBuffer).png().toBuffer();
                    fs.writeFileSync(localPngPath, pngBuffer);
                    logger_1.default.info({ setCode: code, path: localPngPath }, `Cached set image`);
                    fetchedCount++;
                }
                catch (err) {
                    logger_1.default.error({ err, setCode: code }, `Error fetching/converting set SVG`);
                }
                finally {
                    activeFetches--;
                }
            });
            while (activeFetches >= concurrencyLimit) {
                yield new Promise((resolve) => setTimeout(resolve, 50)); // Wait briefly
            }
            promises.push(fetchPromise());
        }
        yield Promise.all(promises);
        logger_1.default.info(`Set image cache check complete. Checked: ${checkedCount}, Newly Fetched/Cached: ${fetchedCount}.`);
    });
}
// -------------- ROUTE HANDLERS --------------
function handleCardImageRequest(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!serviceLoadedData) {
            logger_1.default.error('handleCardImageRequest called before service data loaded.');
            return res.status(503).json({ error: 'Server data not ready' });
        }
        logger_1.default.debug({ params: req.params }, `Received GET card image request`);
        try {
            // Validate request params
            const validatedParams = cardImageParamsSchema.parse(req.params);
            const { allPrintingsId } = validatedParams;
            const cardFace = validatedParams.cardFace; // Optional, can be undefined
            const cardData = serviceLoadedData.combinedCards[allPrintingsId];
            if (!(cardData === null || cardData === void 0 ? void 0 : cardData.scryfallData)) {
                logger_1.default.warn({ allPrintingsId }, `Card data or Scryfall data not found`);
                throw new Error('Card data not found');
            }
            const normalizedFace = (cardFace === null || cardFace === void 0 ? void 0 : cardFace.toLowerCase()) || 'front';
            const hasMultipleFaces = cardData.scryfallData.card_faces &&
                cardData.scryfallData.card_faces.length > 1;
            const effectiveFace = normalizedFace === 'back' && hasMultipleFaces ? 'back' : 'front';
            const faceCacheDir = path.join(IMAGE_CACHE_DIR, effectiveFace);
            const localPath = path.join(faceCacheDir, `${allPrintingsId}.jpg`);
            if (!fs.existsSync(faceCacheDir)) {
                logger_1.default.info(`Creating cache directory: ${faceCacheDir}`);
                fs.mkdirSync(faceCacheDir, { recursive: true });
            }
            if (fs.existsSync(localPath)) {
                logger_1.default.debug({ allPrintingsId, face: effectiveFace, path: localPath }, `Serving cached card image`);
                return res.sendFile(localPath);
            }
            // --- Fetch from Scryfall if not cached ---
            const scryfallId = cardData.scryfallData.id;
            if (!scryfallId) {
                logger_1.default.error({ allPrintingsId }, `Missing Scryfall ID for card`);
                return res.status(404).json({ error: 'Scryfall ID missing for card' });
            }
            const [firstChar, secondChar] = scryfallId.slice(0, 2);
            // Ensure chars are valid for URL path segments
            if (!firstChar || !secondChar) {
                logger_1.default.error({ scryfallId }, `Invalid Scryfall ID format for image URL generation`);
                return res
                    .status(500)
                    .json({ error: 'Internal error generating image URL' });
            }
            const imageUrl = `https://cards.scryfall.io/large/${effectiveFace}/${firstChar}/${secondChar}/${scryfallId}.jpg`;
            logger_1.default.info({ allPrintingsId, face: effectiveFace, url: imageUrl }, `Fetching and caching card image`);
            const imgResp = yield (0, node_fetch_1.default)(imageUrl);
            if (!imgResp.ok) {
                logger_1.default.error({
                    url: imageUrl,
                    status: imgResp.status,
                    statusText: imgResp.statusText,
                }, `Scryfall image fetch failed`);
                if (imgResp.status === 404) {
                    return res.status(404).json({
                        error: `Image not found on Scryfall for ${effectiveFace} face.`,
                    });
                }
                else {
                    return res
                        .status(imgResp.status)
                        .json({ error: 'Failed to fetch image from Scryfall' });
                }
            }
            if (!imgResp.body) {
                logger_1.default.error({ url: imageUrl }, `Scryfall image response body is null`);
                return res
                    .status(500)
                    .json({ error: 'Received empty image response from Scryfall' });
            }
            try {
                const fileStream = fs.createWriteStream(localPath);
                yield (0, promises_1.pipeline)(imgResp.body, fileStream);
                logger_1.default.info({ allPrintingsId, face: effectiveFace, path: localPath }, `Successfully cached card image`);
                return res.sendFile(localPath);
            }
            catch (streamError) {
                logger_1.default.error({ err: streamError, path: localPath }, `Error writing image file`);
                try {
                    if (fs.existsSync(localPath)) {
                        logger_1.default.warn({ path: localPath }, `Attempting to delete failed image file`);
                        fs.unlinkSync(localPath);
                    }
                }
                catch (cleanupError) {
                    logger_1.default.error({ err: cleanupError, path: localPath }, `Error cleaning up failed image file`);
                }
                return res.status(500).json({ error: 'Failed to save image to cache' });
            }
        }
        catch (err) {
            logger_1.default.error({ err, params: req.params }, `Unexpected error in card image handler`);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
}
function handleSetImageRequest(req, res) {
    try {
        // Validate request params
        const { setCode } = setCodeParamSchema.parse(req.params);
        const filePath = path.join(SET_CACHE_DIR, `${setCode}.png`);
        if (!fs.existsSync(filePath)) {
            logger_1.default.debug({ setCode, path: filePath }, `Set image not found in cache`);
            return res.status(404).json({ error: 'Set image not found' });
        }
        return res.sendFile(filePath);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            logger_1.default.warn({ errors: error.errors }, 'Invalid setCode parameter');
            return res.status(400).json({
                error: 'Invalid request parameters',
                details: error.errors,
            });
        }
        else {
            logger_1.default.error({ err: error }, 'Unexpected error in /setimages/:setCode');
            // Let centralized handler manage response (if async)
            // For sync handlers like this, re-throwing won't work unless using express-async-errors properly
            // Safest here is to return 500, or explicitly call next(error)
            return res.status(500).json({ error: 'Internal Server Error' });
            // next(error); // Alternative if express-async-errors isn't guaranteed for sync
        }
    }
}
// -------------- INITIALIZATION FUNCTION --------------
/**
 * Initializes the image caching service.
 * - Sets up necessary directories.
 * - Registers image serving routes on the provided Express app.
 * - Starts the background process for caching set images.
 *
 * @param app The Express application instance.
 * @param loadedData The loaded data required for image lookups.
 */
function initializeImageCacheService(app, loadedData) {
    logger_1.default.info('Initializing Image Cache Service...');
    if (!loadedData) {
        logger_1.default.error('Image Cache Service cannot be initialized without loadedData.');
        // Depending on requirements, might throw an error or just log.
        return;
    }
    serviceLoadedData = loadedData; // Store data for route handlers
    // 1. Ensure base cache directories exist synchronously during init
    ensureCacheDirsExist();
    // 2. Register routes
    app.get('/cards/:allPrintingsId/:cardFace/image', handleCardImageRequest);
    app.get('/cards/:allPrintingsId/image', handleCardImageRequest); // Handle missing face param
    app.get('/setimages/:setCode', handleSetImageRequest);
    logger_1.default.info('Image routes registered.');
    // 3. Start background caching of set images (don't await)
    logger_1.default.info('Initiating set image caching (async)...');
    ensureSetSvgsCached().catch((err) => {
        logger_1.default.error({ err }, 'Error during background set image caching');
    });
    logger_1.default.info('Image Cache Service Initialized.');
}
