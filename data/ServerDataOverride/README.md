# Server Data Overrides

This directory contains server data overrides for MTG sealed products. The data structure has been reorganized to use individual JSON files for each product, organized by set folders with availability subfolders.

## Structure

```
ServerDataOverride/
├── 10e/                    # Set folder (lowercase set code)
│   ├── available/          # Available products subfolder
│   │   ├── Product_Name_1.json
│   │   └── Product_Name_2.json
│   └── unavailable/        # Unavailable products subfolder
│       └── Unavailable_Product.json
├── dft/                    # Another set folder
│   ├── available/
│   │   └── ...
│   └── unavailable/
│       └── ...
└── ...
```

## File Naming Convention

- **Set folders**: Use lowercase set codes (e.g., `10e`, `dft`, `znr`)
- **Available/Unavailable subfolders**: Separate products by availability status
- **Product files**: Use the product's name as the filename (e.g., `Tenth_Edition_Booster_Box.json`)

## Product File Format

Each product file contains a single JSON object with the following structure:

```json
{
  "uuid": "d1c206a4-0452-551a-bc1a-d40859631ade",
  "name": "Tenth Edition Booster Box",
  "category": "booster_box",
  "subtype": "draft",
  "identifiers": {
    "abuId": "1107726",
    "cardKingdomId": "122703",
    "tcgplayerProductId": "27257"
  },
  "purchaseUrls": {
    "cardKingdom": "https://mtgjson.com/links/04901a1af112457d",
    "tcgplayer": "https://mtgjson.com/links/fe89955eaa5a3c7a"
  },
  "contents": {
    "sealed": [
      {
        "count": 36,
        "name": "Tenth Edition Booster Pack",
        "set": "10e",
        "uuid": "c690e178-661d-5e17-9b29-a5bf6319a844"
      }
    ]
  },
  "setCode": "10E",
  "setName": "Tenth Edition",
  "extendedData": {
    "code": "10e-draft",
    "boosters": [...]
  }
}
```

## Benefits of New Structure

1. **Individual Product Management**: Each product can be edited independently
2. **Better Version Control**: Changes to individual products are tracked separately
3. **Easier Collaboration**: Multiple people can work on different products without conflicts
4. **Reduced File Sizes**: Smaller files are easier to load and process
5. **Better Organization**: Clear separation by set makes it easier to find specific products
6. **Availability Management**: Products are organized by availability status for easier management
7. **Human-Readable Filenames**: Product names are used instead of UUIDs for easier identification

## Migration

The existing single-file structure has been automatically migrated to this new folder structure. Two migration scripts were used:

1. `scripts/migrate-overrides.js` - Converted from single files to individual product files
2. `scripts/migrate-to-new-structure.js` - Converted from UUID-based filenames to name-based filenames with availability subfolders

## API Endpoints

The server provides the following endpoints for managing overrides:

- `GET /admin/overrides` - List all overrides
- `GET /admin/overrides/:setCode` - Get products for a specific set
- `POST /admin/overrides` - Create a new override set
- `PUT /admin/overrides/:setCode` - Update an existing override set
- `DELETE /admin/overrides/:setCode` - Delete an override set

## Adding New Products

To add a new product:

1. Create a new JSON file in the appropriate set folder and availability subfolder
2. Use the product's name as the filename (with underscores instead of spaces)
3. Include all required fields (uuid, name, category, setCode)
4. The server will automatically load the new product on restart

## Editing Existing Products

To edit an existing product:

1. Locate the product file in the appropriate set folder and availability subfolder
2. Edit the JSON content as needed
3. Save the file
4. The server will automatically reload the updated product on restart

## Availability Logic

The system determines product availability using the `isProductAvailable()` function. By default, all products are considered available. You can customize this logic by modifying the function in:

- `src/services/dataService.ts` - For the main data service
- `src/routes/admin.ts` - For the admin API

Common criteria for availability might include:
- Presence of purchase URLs
- Stock status
- Release date
- Product category 