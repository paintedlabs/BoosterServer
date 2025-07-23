import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface Config {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string | string[];
      methods: string[];
    };
  };
  data: {
    allPrintingsUrl: string;
    allPrintingsUrlZipped: string;
    extendedDataUrl: string;
    scryfallAllCardsUrl: string;
    localPaths: {
      allPrintings: string;
      extendedData: string;
      scryfallData: string;
    };
  };
  cache: {
    images: string;
    sets: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env["PORT"] || "8080", 10),
    host: process.env["HOST"] || "0.0.0.0",
    cors: {
      origin: process.env["CORS_ORIGIN"]
        ? process.env["CORS_ORIGIN"].split(",")
        : "*",
      methods: ["GET", "POST"],
    },
  },
  data: {
    allPrintingsUrl: "https://mtgjson.com/api/v5/AllPrintings.json",
    allPrintingsUrlZipped: "https://mtgjson.com/api/v5/AllPrintings.json.zip",
    extendedDataUrl:
      "https://raw.githubusercontent.com/taw/magic-sealed-data/refs/heads/master/sealed_extended_data.json",
    scryfallAllCardsUrl:
      "https://data.scryfall.io/all-cards/all-cards-20250124102227.json",
    localPaths: {
      allPrintings: "data/AllPrintings.json",
      extendedData: "data/sealed_extended_data.json",
      scryfallData: "data/scryfall_all_cards.json",
    },
  },
  cache: {
    images: "cache/images",
    sets: "cache/sets",
  },
  logging: {
    level: process.env["LOG_LEVEL"] || "info",
    format: process.env["LOG_FORMAT"] || "json",
  },
};
