/**
 * imageCacheService.ts
 *
 * Handles caching and serving card and set images.
 * Fetches images from Scryfall if they are not found locally.
 */

import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import type * as stream from 'stream'; // For stream types
import { LoadedData } from './dataLoader';
import logger from './logger'; // Import the logger
import { z, ZodError } from 'zod'; // Import zod

// -------------- CONFIG CONSTANTS --------------
// Read cache directory from environment variable with a default
const CACHE_DIR = path.resolve(process.env.CACHE_DIR || 'cache'); // Use path.resolve for robustness
const IMAGE_CACHE_DIR = path.join(CACHE_DIR, 'images');
const SET_CACHE_DIR = path.join(CACHE_DIR, 'sets');

// -------------- SERVICE STATE --------------
let serviceLoadedData: LoadedData | null = null;

// --- Zod Schemas for Validation ---
const cardImageParamsSchema = z.object({
  allPrintingsId: z.string().uuid(), // Expect a UUID
  cardFace: z.enum(['front', 'back']).optional(), // Allow only front or back, optional
});

const setCodeParamSchema = z.object({
  setCode: z.string().min(1).max(10).toLowerCase(), // Expect non-empty string, max 10 chars, lowercase
});

// -------------- HELPER FUNCTIONS --------------

// Ensure cache directories exist
function ensureCacheDirsExist() {
  if (!fs.existsSync(IMAGE_CACHE_DIR)) {
    logger.info(`Creating image cache directory: ${IMAGE_CACHE_DIR}`);
    fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true }); // Log before action
  }
  if (!fs.existsSync(SET_CACHE_DIR)) {
    logger.info(`Creating set image cache directory: ${SET_CACHE_DIR}`);
    fs.mkdirSync(SET_CACHE_DIR, { recursive: true }); // Log before action
  }
}

// Fetch and cache set SVG icons as PNGs
async function ensureSetSvgsCached() {
  if (!serviceLoadedData?.allPrintings) {
    logger.warn(
      'Cannot cache set SVGs: AllPrintings data not available in service state.'
    );
    return;
  }

  logger.info('Checking set image cache...');
  ensureCacheDirsExist(); // Make sure base set dir exists

  const allPrintings = serviceLoadedData.allPrintings;
  const codes = Object.keys(allPrintings.data);
  let checkedCount = 0;
  let fetchedCount = 0;

  const promises: Promise<void>[] = [];
  const concurrencyLimit = 5;
  let activeFetches = 0;

  for (const code of codes) {
    const localPngPath = path.join(SET_CACHE_DIR, `${code.toLowerCase()}.png`);
    checkedCount++;

    if (fs.existsSync(localPngPath)) {
      continue; // Already cached
    }

    const fetchPromise = async () => {
      activeFetches++;
      const url = `https://svgs.scryfall.io/sets/${code.toLowerCase()}.svg`;
      // logger.debug({ setCode: code, url }, `Fetching set SVG`);
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          if (resp.status !== 404) {
            logger.warn(
              {
                setCode: code,
                status: resp.status,
                statusText: resp.statusText,
              },
              `Failed to fetch SVG`
            );
          }
          return;
        }
        const svgBuffer = await resp.buffer();
        if (svgBuffer.length < 50) {
          logger.warn(
            { setCode: code, size: svgBuffer.length },
            `Received very small SVG, skipping conversion.`
          );
          return;
        }
        const pngBuffer = await sharp(svgBuffer).png().toBuffer();
        fs.writeFileSync(localPngPath, pngBuffer);
        logger.info({ setCode: code, path: localPngPath }, `Cached set image`);
        fetchedCount++;
      } catch (err) {
        logger.error(
          { err, setCode: code },
          `Error fetching/converting set SVG`
        );
      } finally {
        activeFetches--;
      }
    };

    while (activeFetches >= concurrencyLimit) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Wait briefly
    }
    promises.push(fetchPromise());
  }

  await Promise.all(promises);
  logger.info(
    `Set image cache check complete. Checked: ${checkedCount}, Newly Fetched/Cached: ${fetchedCount}.`
  );
}

// -------------- ROUTE HANDLERS --------------

async function handleCardImageRequest(req: Request, res: Response) {
  if (!serviceLoadedData) {
    logger.error('handleCardImageRequest called before service data loaded.');
    return res.status(503).json({ error: 'Server data not ready' });
  }
  logger.debug({ params: req.params }, `Received GET card image request`);

  try {
    // Validate request params
    const validatedParams = cardImageParamsSchema.parse(req.params);
    const { allPrintingsId } = validatedParams;
    const cardFace = validatedParams.cardFace; // Optional, can be undefined

    const cardData = serviceLoadedData.combinedCards[allPrintingsId];
    if (!cardData?.scryfallData) {
      logger.warn({ allPrintingsId }, `Card data or Scryfall data not found`);
      throw new Error('Card data not found');
    }

    const normalizedFace = cardFace?.toLowerCase() || 'front';
    const hasMultipleFaces =
      cardData.scryfallData.card_faces &&
      cardData.scryfallData.card_faces.length > 1;
    const effectiveFace =
      normalizedFace === 'back' && hasMultipleFaces ? 'back' : 'front';

    const faceCacheDir = path.join(IMAGE_CACHE_DIR, effectiveFace);
    const localPath = path.join(faceCacheDir, `${allPrintingsId}.jpg`);

    if (!fs.existsSync(faceCacheDir)) {
      logger.info(`Creating cache directory: ${faceCacheDir}`);
      fs.mkdirSync(faceCacheDir, { recursive: true });
    }

    if (fs.existsSync(localPath)) {
      logger.debug(
        { allPrintingsId, face: effectiveFace, path: localPath },
        `Serving cached card image`
      );
      return res.sendFile(localPath);
    }

    // --- Fetch from Scryfall if not cached ---
    const scryfallId = cardData.scryfallData.id;
    if (!scryfallId) {
      logger.error({ allPrintingsId }, `Missing Scryfall ID for card`);
      return res.status(404).json({ error: 'Scryfall ID missing for card' });
    }
    const [firstChar, secondChar] = scryfallId.slice(0, 2);
    // Ensure chars are valid for URL path segments
    if (!firstChar || !secondChar) {
      logger.error(
        { scryfallId },
        `Invalid Scryfall ID format for image URL generation`
      );
      return res
        .status(500)
        .json({ error: 'Internal error generating image URL' });
    }
    const imageUrl = `https://cards.scryfall.io/large/${effectiveFace}/${firstChar}/${secondChar}/${scryfallId}.jpg`;

    logger.info(
      { allPrintingsId, face: effectiveFace, url: imageUrl },
      `Fetching and caching card image`
    );

    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      logger.error(
        {
          url: imageUrl,
          status: imgResp.status,
          statusText: imgResp.statusText,
        },
        `Scryfall image fetch failed`
      );
      if (imgResp.status === 404) {
        return res.status(404).json({
          error: `Image not found on Scryfall for ${effectiveFace} face.`,
        });
      } else {
        return res
          .status(imgResp.status)
          .json({ error: 'Failed to fetch image from Scryfall' });
      }
    }
    if (!imgResp.body) {
      logger.error({ url: imageUrl }, `Scryfall image response body is null`);
      return res
        .status(500)
        .json({ error: 'Received empty image response from Scryfall' });
    }

    try {
      const fileStream = fs.createWriteStream(localPath);
      await pipeline(imgResp.body as unknown as stream.Readable, fileStream);
      logger.info(
        { allPrintingsId, face: effectiveFace, path: localPath },
        `Successfully cached card image`
      );
      return res.sendFile(localPath);
    } catch (streamError) {
      logger.error(
        { err: streamError, path: localPath },
        `Error writing image file`
      );
      try {
        if (fs.existsSync(localPath)) {
          logger.warn(
            { path: localPath },
            `Attempting to delete failed image file`
          );
          fs.unlinkSync(localPath);
        }
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, path: localPath },
          `Error cleaning up failed image file`
        );
      }
      return res.status(500).json({ error: 'Failed to save image to cache' });
    }
  } catch (err) {
    logger.error(
      { err, params: req.params },
      `Unexpected error in card image handler`
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function handleSetImageRequest(req: Request, res: Response) {
  try {
    // Validate request params
    const { setCode } = setCodeParamSchema.parse(req.params);

    const filePath = path.join(SET_CACHE_DIR, `${setCode}.png`);
    if (!fs.existsSync(filePath)) {
      logger.debug({ setCode, path: filePath }, `Set image not found in cache`);
      return res.status(404).json({ error: 'Set image not found' });
    }
    return res.sendFile(filePath);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, 'Invalid setCode parameter');
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: error.errors,
      });
    } else {
      logger.error({ err: error }, 'Unexpected error in /setimages/:setCode');
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
export function initializeImageCacheService(
  app: express.Express,
  loadedData: LoadedData
) {
  logger.info('Initializing Image Cache Service...');

  if (!loadedData) {
    logger.error(
      'Image Cache Service cannot be initialized without loadedData.'
    );
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
  logger.info('Image routes registered.');

  // 3. Start background caching of set images (don't await)
  logger.info('Initiating set image caching (async)...');
  ensureSetSvgsCached().catch((err) => {
    logger.error({ err }, 'Error during background set image caching');
  });

  logger.info('Image Cache Service Initialized.');
}
