# Booster Server

A professional MTG Booster Pack Simulator Server built with Node.js, Express, and TypeScript.

## Features

- **Booster Pack Simulation**: Open virtual MTG booster packs with realistic card distribution
- **Multiple Sets Support**: Support for all MTG sets with accurate card pools
- **Image Caching**: Automatic caching of card and set images for fast loading
- **RESTful API**: Clean, documented API endpoints
- **Professional Architecture**: Modular, maintainable codebase with proper separation of concerns
- **Comprehensive Logging**: Structured logging with Winston
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Type Safety**: Full TypeScript support with strict type checking

## Architecture

```
src/
├── config/          # Configuration management
├── types/           # TypeScript interfaces and types
│   └── scryfall/    # Scryfall API type definitions
├── services/        # Business logic services
│   ├── dataService.ts    # MTG data loading and processing
│   └── imageService.ts   # Image caching and serving
├── routes/          # Express route handlers
│   ├── sets.ts      # Set-related endpoints
│   ├── products.ts  # Product/booster endpoints
│   └── images.ts    # Image serving endpoints
├── middleware/      # Express middleware
├── utils/           # Utility functions
│   ├── logger.ts    # Winston logging setup
│   └── errors.ts    # Error handling utilities
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## API Endpoints

### Sets
- `GET /sets` - Get all available MTG sets
- `GET /sets/:setCode/products` - Get all products for a specific set

### Products
- `POST /products/:productCode/open` - Open a single booster pack
- `POST /products/:productCode/open/:number` - Open multiple booster packs

### Images
- `GET /cards/:allPrintingsId/:cardFace/image` - Get card image (front/back)
- `GET /setimages/:setCode` - Get set symbol image

### Health
- `GET /health` - Health check endpoint

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp env.example .env
```

4. Build the project:
```bash
npm run build
```

## Development

Start the development server:
```bash
npm run dev
```

For development builds with source maps:
```bash
npm run build:dev
```

## Production

Build and start the production server:
```bash
npm run build
npm start
```

## Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 8080)
- `HOST` - Server host (default: 0.0.0.0)
- `CORS_ORIGIN` - CORS origin (default: *)
- `LOG_LEVEL` - Logging level (default: info)
- `LOG_FORMAT` - Log format (default: json)
- `NODE_ENV` - Node environment (default: development)

## Data Sources

The server uses the following data sources:
- **MTGJson AllPrintings**: Complete MTG card database
- **Scryfall Bulk Data**: Card images and additional metadata
- **Magic Sealed Data**: Booster pack configuration data

## Scripts

### Build Scripts
- `npm run build` - Build for production (clean, optimized)
- `npm run build:dev` - Build for development (with source maps)
- `npm run dev` - Start development server with ts-node

### Maintenance Scripts
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Cleanup Scripts
- `npm run clean` - Clean production build artifacts
- `npm run clean:dev` - Clean development build artifacts
- `npm run clean:all` - Clean everything (including node_modules)

## Build Output

The build process creates two output directories:

- **`dist/`** - Production build (optimized, no source maps)
- **`dist-dev/`** - Development build (with source maps for debugging)

Both directories are automatically excluded from version control via `.gitignore`.

## Error Handling

The server implements comprehensive error handling:
- Custom error classes for different error types
- Centralized error handling middleware
- Proper HTTP status codes
- Structured error responses
- Request logging with error tracking

## Logging

Uses Winston for structured logging:
- File-based logging (error.log, combined.log)
- Console logging in development
- Request/response logging
- Performance monitoring

## License

MIT License
