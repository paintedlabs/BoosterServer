# TCGCSV Server Integration

This document describes the TCGCSV integration for the BoosterServer, which provides pricing data for Magic: The Gathering sealed products.

## Overview

The TCGCSV integration allows the server to:
- Fetch real-time pricing data from TCGCSV API
- Cache pricing data to reduce API calls
- Map MTGJSON set codes to TCGCSV group IDs
- Provide pricing information when opening booster packs
- Manage set mappings through REST API endpoints

## Architecture

### Components

1. **TCGCSVService** - Core service for API calls and data management
2. **TCGCSV Routes** - REST API endpoints for TCGCSV functionality
3. **Enhanced DataService** - Updated to include pricing data in pack responses
4. **Set Mappings** - JSON file storing MTGJSON to TCGCSV mappings

### Data Flow

1. **Set Mappings** - Loaded from `data/setMappings.json`
2. **API Calls** - Fetch categories, groups, products, and prices from TCGCSV
3. **Caching** - In-memory caching of API responses
4. **Pricing Integration** - Added to pack opening responses

## Configuration

### Environment Variables

```bash
# TCGCSV Configuration
TCGCSV_CACHE_TIMEOUT=3600000  # Cache timeout in milliseconds (1 hour default)
TCGCSV_MAX_RETRIES=3          # Maximum retry attempts for API calls
```

### Configuration File

The integration uses the existing `config/index.ts` with added TCGCSV settings:

```typescript
tcgcsv: {
  baseUrl: "https://tcgcsv.com/tcgplayer",
  cacheTimeout: 3600000, // 1 hour
  maxRetries: 3,
}
```

## API Endpoints

### TCGCSV Data Endpoints

#### Categories
- `GET /tcgcsv/categories` - Get all card game categories
- `GET /tcgcsv/categories/magic/id` - Get Magic category ID
- `GET /tcgcsv/categories/pokemon/id` - Get Pokemon category ID

#### Groups
- `GET /tcgcsv/categories/:categoryId/groups` - Get groups for a category

#### Products
- `GET /tcgcsv/groups/:groupId/products` - Get products for a group
- `GET /tcgcsv/sets/:setCode/products` - Get sealed products with prices for a set

#### Prices
- `GET /tcgcsv/groups/:groupId/prices` - Get prices for a group

#### Set Mappings
- `GET /tcgcsv/mappings` - Get all set mappings
- `POST /tcgcsv/mappings` - Create a new set mapping
- `DELETE /tcgcsv/mappings/:setCode` - Remove a set mapping
- `POST /tcgcsv/mappings/find` - Find and map a set by name

### Enhanced Pack Opening

#### With Pricing
- `POST /products/:productCode/open-with-pricing` - Open pack with pricing data

**Response Format:**
```json
{
  "pack": [
    {
      "sheet": "common",
      "allPrintingsData": { ... },
      "scryfallData": { ... }
    }
  ],
  "pricing": {
    "productId": 12345,
    "priceStats": {
      "lowPrice": 3.50,
      "midPrice": 4.25,
      "highPrice": 5.00,
      "marketPrice": 4.15,
      "directLowPrice": 3.75
    },
    "lastUpdated": "2025-01-25T12:00:00.000Z"
  }
}
```

## Usage Examples

### 1. Get All Categories

```bash
curl http://localhost:8080/tcgcsv/categories
```

### 2. Get Magic Groups

```bash
# First get Magic category ID
curl http://localhost:8080/tcgcsv/categories/magic/id

# Then get groups (replace 1 with actual Magic category ID)
curl http://localhost:8080/tcgcsv/categories/1/groups
```

### 3. Get Products with Prices for a Set

```bash
curl http://localhost:8080/tcgcsv/sets/BLO/products
```

### 4. Open Pack with Pricing

```bash
curl -X POST http://localhost:8080/products/blo-collector/open-with-pricing
```

### 5. Create Set Mapping

```bash
curl -X POST http://localhost:8080/tcgcsv/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "setCode": "FND",
    "setName": "Foundations",
    "groupId": 23875,
    "categoryId": 1,
    "categoryName": "Magic"
  }'
```

### 6. Find and Map Set

```bash
curl -X POST http://localhost:8080/tcgcsv/mappings/find \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Foundations",
    "setCode": "FND"
  }'
```

## Set Mappings

### Default Mappings

The server comes with pre-configured mappings for recent Magic sets:

```json
{
  "mappings": [
    {
      "setCode": "BLO",
      "setName": "Bloomburrow",
      "groupId": 23874,
      "categoryId": 1,
      "categoryName": "Magic"
    },
    {
      "setCode": "MKM",
      "setName": "Murders at Karlov Manor",
      "groupId": 23873,
      "categoryId": 1,
      "categoryName": "Magic"
    }
  ]
}
```

### Adding New Mappings

#### Method 1: API Endpoint

```bash
curl -X POST http://localhost:8080/tcgcsv/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "setCode": "NEW",
    "setName": "New Set",
    "groupId": 12345,
    "categoryId": 1,
    "categoryName": "Magic"
  }'
```

#### Method 2: Direct File Edit

Edit `data/setMappings.json` and restart the server.

#### Method 3: Auto-Discovery

```bash
curl -X POST http://localhost:8080/tcgcsv/mappings/find \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Set Name",
    "setCode": "SET"
  }'
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "errors": ["Invalid category ID"]
}
```

#### 404 Not Found
```json
{
  "success": false,
  "errors": ["Magic category not found"]
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "errors": ["Failed to fetch categories"]
}
```

### Error Logging

All TCGCSV operations are logged with appropriate levels:
- `info` - Successful operations
- `warn` - Non-critical issues (e.g., missing pricing data)
- `error` - Critical failures

## Caching Strategy

### In-Memory Caching

The TCGCSV service implements in-memory caching for:
- Categories
- Groups (per category)
- Products (per group)
- Prices (per group)

### Cache Invalidation

- Cache is maintained for the duration specified in `TCGCSV_CACHE_TIMEOUT`
- Manual cache clearing through service restart
- Automatic retry on cache miss

## Performance Considerations

### API Rate Limits

TCGCSV has rate limits that may affect performance:
- Implement request throttling if needed
- Use caching to reduce API calls
- Consider implementing retry logic with exponential backoff

### Memory Usage

- Cached data is stored in memory
- Monitor memory usage with large datasets
- Consider implementing LRU cache for production

## Monitoring

### Health Check

The existing health check endpoint includes TCGCSV status:

```bash
curl http://localhost:8080/health
```

### Logging

Monitor TCGCSV operations through logs:
- API call success/failure
- Cache hits/misses
- Set mapping operations
- Pricing data updates

## Troubleshooting

### Common Issues

1. **"No group ID mapping found"**
   - Add missing set mapping using API or file
   - Verify set code matches MTGJSON format

2. **"Failed to fetch categories"**
   - Check network connectivity
   - Verify TCGCSV API is accessible
   - Check rate limits

3. **"Price not available"**
   - Verify set has sealed products in TCGCSV
   - Check group ID mapping
   - Ensure product name matching works

### Debug Information

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Future Enhancements

### Planned Features

1. **Persistent Caching** - Store cache data on disk
2. **Background Refresh** - Update pricing data in background
3. **Price History** - Track price changes over time
4. **Multiple Sources** - Integrate with other pricing APIs
5. **WebSocket Updates** - Real-time price updates

### Configuration Options

- Cache persistence settings
- Background refresh intervals
- Price update notifications
- Custom mapping validation rules

## Support

For issues with the TCGCSV integration:

1. Check server logs for error messages
2. Verify API connectivity
3. Test individual endpoints
4. Review set mappings
5. Check configuration settings 