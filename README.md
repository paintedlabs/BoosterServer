# Boostie Backend

A Node.js server that provides a GraphQL API for opening Magic: The Gathering booster packs.

## Setup

1. Create a `.env` file in the root directory with the following content:
```
PORT=8080
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Development

The backend is built with:
- Node.js + Express
- Apollo Server for GraphQL
- TypeScript
- MTGJSON data
- Scryfall data

## API

The server exposes a GraphQL API at `/graphql`. The schema includes:

- Queries:
  - `sets`: Get all available sets
  - `products`: Get products for a specific set
- Mutations:
  - `openPacks`: Open a specified number of booster packs

## Data Sources

The server uses:
- MTGJSON's AllPrintings data
- Scryfall's card data
- Extended sealed product data

## Environment Variables

- `PORT`: Server port (default: 8080)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV`: Environment (development/production)
- `DATA_DIR`: Directory for data files (default: data/)
