"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromMtgjson = fromMtgjson;
exports.fromExtendedData = fromExtendedData;
exports.fromTcgCsv = fromTcgCsv;
exports.combineSealedProduct = combineSealedProduct;
/**
 * Helper function to create a SealedProduct from MTGJSON data
 */
function fromMtgjson(product) {
    return {
        uuid: product.uuid,
        name: product.name,
        category: product.category,
        cardCount: product.cardCount,
        productSize: product.productSize,
        releaseDate: product.releaseDate,
        subtype: product.subtype,
        contents: product.contents,
        identifiers: product.identifiers,
        purchaseUrls: product.purchaseUrls,
    };
}
/**
 * Helper function to create a SealedProduct from Extended Sealed Data
 */
function fromExtendedData(product) {
    return {
        name: product.name,
        code: product.code,
        setCode: product.set_code,
        setName: product.set_name,
        sourceSetCodes: product.source_set_codes,
        boosters: product.boosters[0],
        tcgplayerProductId: product.tcgplayerProductId,
        tcgMarketPrice: product.tcgMarketPrice,
    };
}
/**
 * Helper function to create a SealedProduct from TCGPlayer CSV data
 */
function fromTcgCsv(product) {
    return {
        tcgplayerProductId: product.productId,
        name: product.name,
        identifiers: {
            tcgplayerProductId: product.productId.toString(),
        },
    };
}
/**
 * Combines data from multiple sources into a single SealedProduct
 */
function combineSealedProduct(mtgjson, extended, tcgCsv) {
    return {
        // Basic identification (prefer extended data for these fields)
        uuid: mtgjson.uuid || '',
        name: extended.name || mtgjson.name || tcgCsv.name || '',
        code: extended.code || '',
        setCode: extended.setCode || '',
        setName: extended.setName || '',
        // Product details (prefer MTGJSON data)
        category: mtgjson.category,
        subtype: mtgjson.subtype,
        cardCount: mtgjson.cardCount,
        productSize: mtgjson.productSize,
        releaseDate: mtgjson.releaseDate,
        // Source data (from extended data)
        sourceSetCodes: extended.sourceSetCodes || [],
        contents: mtgjson.contents,
        // Booster configuration (from extended data)
        boosters: extended.boosters,
        // Identifiers and purchase URLs (merge from all sources)
        identifiers: Object.assign(Object.assign({}, mtgjson.identifiers), tcgCsv.identifiers),
        purchaseUrls: Object.assign(Object.assign({}, mtgjson.purchaseUrls), tcgCsv.purchaseUrls),
        // TCGPlayer data (from TCG CSV)
        tcgplayerProductId: tcgCsv.tcgplayerProductId,
        tcgMarketPrice: tcgCsv.tcgMarketPrice,
        // Additional metadata (from MTGJSON)
        isFoilOnly: mtgjson.isFoilOnly,
        isNonFoilOnly: mtgjson.isNonFoilOnly,
        isOnlineOnly: mtgjson.isOnlineOnly,
        isPaperOnly: mtgjson.isPaperOnly,
        isPartialPreview: mtgjson.isPartialPreview,
    };
}
