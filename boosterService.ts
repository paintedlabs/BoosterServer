/**
 * boosterService.ts
 *
 * Handles the logic for simulating the opening of a booster pack
 * based on loaded product definitions and card data.
 */

import {
  ExtendedSealedData,
  ExtendedBooster,
  ExtendedSheet,
  LoadedData,
} from './dataLoader';
import { OpenedPackResponse } from './types'; // Import shared response type
import logger from './logger'; // Import the logger

// -------------- INTERFACES (Specific to this service/response) --------------

// OpenedPackResponse moved to types.ts

// -------------- BOOSTER SIMULATION LOGIC --------------

/**
 * Selects a booster configuration based on weighted randomness.
 */
function pickBooster(boosters: ExtendedBooster[]): ExtendedBooster | null {
  if (!boosters || boosters.length === 0) return null;

  const totalWeight = boosters.reduce((acc, b) => acc + b.weight, 0);
  if (totalWeight <= 0) {
    logger.warn('Total weight of boosters is zero or negative.');
    return null; // Avoid division by zero or infinite loops
  }

  const rand = Math.random() * totalWeight; // Use Math.random() for float
  let cumulativeWeight = 0;
  for (const booster of boosters) {
    cumulativeWeight += booster.weight;
    if (rand < cumulativeWeight) {
      return booster;
    }
  }

  // Fallback in case of floating point inaccuracies, return the last booster
  logger.warn(
    'pickBooster fallback: returning last booster due to potential float issue.'
  );
  return boosters[boosters.length - 1];
}

/**
 * Selects a card UUID from a sheet based on weighted randomness.
 * Uses the processed ExtendedSheet structure from dataLoader.
 */
function pickCardFromSheet(sheet: ExtendedSheet): string | null {
  const totalWeight = sheet.total_weight;
  if (totalWeight <= 0 || sheet.cards.length === 0) {
    logger.warn({ sheet }, "Cannot pick card from sheet with zero total weight or no cards");
    return null; // Cannot pick from an empty or invalid sheet
  }

  let randomWeight = Math.random() * totalWeight;
  for (const card of sheet.cards) {
    randomWeight -= card.weight;
    if (randomWeight <= 0) {
      const chosenUUID = card.uuid;
      logger.debug({ chosenUUID, totalWeight, sheetName: "[SheetName Placeholder]" }, "Card chosen from sheet"); // Add sheet name if available
      return chosenUUID;
    }
  }

  // Fallback in case of floating point issues or unexpected structure
  logger.warn({ totalWeight, sheet }, "Failed to pick card using weighted random logic, falling back to last card");
  return sheet.cards[sheet.cards.length - 1]?.uuid ?? null;
}

/**
 * Generates the contents of a single booster pack for a given product.
 *
 * @param product The ExtendedSealedData definition for the product.
 * @param loadedData The container for all loaded AllPrintings, ExtendedData, and CombinedCard data.
 * @returns An OpenedPackResponse object containing the pack contents or a warning.
 */
export function generatePack(
  product: ExtendedSealedData,
  loadedData: LoadedData
): OpenedPackResponse {
  if (!loadedData || !loadedData.allPrintings || !loadedData.combinedCards) {
    logger.error('generatePack called with incomplete loadedData.');
    // In a real service, might throw a specific internal error
    return { pack: [], warning: 'Server data is not fully loaded.' };
  }

  // Build a map of UUIDs allowed in this product's source sets for validation
  // This can be potentially cached or precomputed if performance is critical
  const sourceSetUUIDs = new Set<string>();
  if (product.source_set_codes) {
    for (let code of product.source_set_codes) {
      code = code.toUpperCase();
      const setObj = loadedData.allPrintings.data[code];
      if (setObj?.cards) {
        for (const c of setObj.cards) {
          if (c?.uuid) sourceSetUUIDs.add(c.uuid);
        }
      } else {
        logger.warn(
          { productCode: product.code, setCode: code },
          `Source set code not found or has no cards in AllPrintings data.`
        );
      }
    }
  } else {
    logger.warn(
      { productCode: product.code },
      `Product is missing 'source_set_codes'. Cannot validate card origins.`
    );
  }

  const chosenBooster = pickBooster(product.boosters);
  if (!chosenBooster) {
    logger.warn(
      { productCode: product.code },
      `No valid booster definition found or selected.`
    );
    return {
      pack: [],
      warning: 'No valid booster definition found or zero total weight.',
    };
  }

  const packContents: OpenedPackResponse['pack'] = [];
  const warnings: string[] = [];

  // product.sheets now directly matches Record<string, ExtendedSheet> due to dataLoader processing
  const sheets = product.sheets;

  for (const [sheetName, count] of Object.entries(chosenBooster.sheets)) {
    const sheet = sheets[sheetName]; // Now correctly typed as ExtendedSheet
    if (!sheet) {
      logger.warn(
        { productCode: product.code, sheetName },
        `[${product.code}] Processed sheet data missing for sheet '${sheetName}'.`
      );
      continue; // Skip this sheet if definition is missing
    }

    for (let i = 0; i < count; i++) {
      const pickedUUID = pickCardFromSheet(sheet); // Use the updated picker
      if (!pickedUUID) {
        logger.warn(
          { productCode: product.code, sheetName },
          `Failed to pick card from processed sheet`
        );
        continue; // Skip if card picking fails
      }

      // Log the UUID chosen by pickCardFromSheet *before* attempting lookup
      logger.debug({ cardUUID: pickedUUID, sheetName, productCode: product.code }, "Attempting to lookup chosen card UUID");

      const combined = loadedData.combinedCards[pickedUUID];
      if (!combined || !combined.allPrintingsData) {
        // Ensure allPrintingsData exists
        logger.warn(
          { productCode: product.code, cardUUID: pickedUUID, sheetName },
          `No combined data or AllPrintings data found for card`
        );
        continue; // Skip if data is missing for the picked UUID
      }

      // Optional validation: Check if the picked card belongs to the product's source sets
      if (sourceSetUUIDs.size > 0 && !sourceSetUUIDs.has(pickedUUID)) {
        // This might indicate an error in the sealed_extended_data.json
        logger.warn(
          {
            productCode: product.code,
            cardUUID: pickedUUID,
            cardName: combined.allPrintingsData.name,
            sheetName,
          },
          `Picked card is NOT listed in source_set_codes. Including anyway.`
        );
        // Decide whether to include it or skip it. Logging and including for now.
        // continue;
      }

      packContents.push({
        sheet: sheetName,
        allPrintingsData: combined.allPrintingsData, // This is CardSet
        scryfallData: combined.scryfallData, // This is IScryfallCard | undefined
      });
    }
  }

  // logger.debug({ productCode: product.code, packSize: packContents.length }, "Generated pack");
  return {
    pack: packContents,
    warning: warnings.length > 0 ? warnings.join(' ') : null, // Include warnings in the return
  };
}
