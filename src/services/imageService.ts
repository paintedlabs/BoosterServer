import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import sharp from "sharp";
import { config } from "../config";
import logger from "../utils/logger";
import { ImageService, CombinedCard } from "../types";
import { NotFoundError } from "../utils/errors";

export class MTGImageService implements ImageService {
  private combinedCards: Record<string, CombinedCard> = {};

  constructor(combinedCards: Record<string, CombinedCard>) {
    this.combinedCards = combinedCards;
  }

  async getCardImage(
    allPrintingsId: string,
    cardFace: string
  ): Promise<string> {
    const cardData = this.combinedCards[allPrintingsId];
    if (!cardData?.scryfallData) {
      throw new NotFoundError("Card not found");
    }

    const normalizedFace = cardFace.toLowerCase();
    const hasMultipleFaces =
      (cardData.scryfallData.card_faces?.length ?? 0) > 1;
    const effectiveFace =
      normalizedFace === "back" && hasMultipleFaces ? "back" : "front";

    const localPath = path.join(
      __dirname,
      "..",
      "..",
      config.cache.images,
      effectiveFace,
      `${allPrintingsId}.jpg`
    );

    const cacheDir = path.dirname(localPath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    if (fs.existsSync(localPath)) {
      logger.debug(
        `Serving cached ${effectiveFace} image for ${allPrintingsId}`
      );
      return localPath;
    }

    const scryfallId = cardData.scryfallData.id;
    const [firstChar, secondChar] = scryfallId.slice(0, 2);
    const imageUrl = `https://cards.scryfall.io/large/${effectiveFace}/${firstChar}/${secondChar}/${scryfallId}.jpg`;

    logger.info(
      `Fetching and caching ${effectiveFace} image from: ${imageUrl}`
    );

    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      logger.error(`Scryfall image fetch failed: ${imgResp.status}`);
      throw new NotFoundError("Image not found");
    }

    const fileStream = fs.createWriteStream(localPath);
    await pipeline(imgResp.body as any, fileStream);

    return localPath;
  }

  getSetImage(setCode: string): string {
    const setCodeLower = setCode.toLowerCase();
    const filePath = path.join(
      __dirname,
      "..",
      "..",
      config.cache.sets,
      `${setCodeLower}.png`
    );

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError("Set image not found");
    }

    return filePath;
  }

  async ensureSetImagesCached(): Promise<void> {
    const setsDir = path.join(__dirname, "..", "..", config.cache.sets);
    fs.mkdirSync(setsDir, { recursive: true });

    // Get all set codes from the data service
    const setCodes = Object.keys(this.combinedCards)
      .map((uuid) => {
        const card = this.combinedCards[uuid];
        if (!card) return null;

        return card.allPrintingsData.identifiers?.scryfallId
          ? card.scryfallData?.set
          : null;
      })
      .filter(Boolean) as string[];

    const uniqueSetCodes = [...new Set(setCodes)];
    
    logger.info(`Starting background caching of ${uniqueSetCodes.length} set images...`);
    
    const BATCH_SIZE = 5;
    let processed = 0;

    for (let i = 0; i < uniqueSetCodes.length; i += BATCH_SIZE) {
      const batch = uniqueSetCodes.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (code) => {
        if (!code) return;

        const localPng = path.join(setsDir, `${code.toLowerCase()}.png`);
        if (fs.existsSync(localPng)) {
          return;
        }

        const url = `https://svgs.scryfall.io/sets/${code.toLowerCase()}.svg`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            logger.warn(`Failed to fetch SVG for set ${code}: ${resp.status}`);
            return;
          }

          const svgBuffer = await resp.buffer();
          const pngBuffer = await sharp(svgBuffer).png().toBuffer();
          fs.writeFileSync(localPng, pngBuffer);
        } catch (err) {
          logger.warn(`Error caching set image for ${code}:`, err);
        }
      }));
      
      processed += batch.length;
      if (processed % 20 === 0) {
        logger.info(`Cached ${processed}/${uniqueSetCodes.length} set images...`);
      }
    }
    
    logger.info(`Completed caching ${uniqueSetCodes.length} set images`);
  }
}
