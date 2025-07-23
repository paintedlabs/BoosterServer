# Build Organization

This document explains how build artifacts are organized and managed in the Booster Server project.

## Build Output Directories

### Production Build (`dist/`)
- **Location**: `./dist/`
- **Purpose**: Optimized production build
- **Contents**: 
  - Compiled JavaScript files (`.js`)
  - TypeScript declaration files (`.d.ts`)
  - **No source maps** (for smaller bundle size)
- **Usage**: Production deployment
- **Git Status**: Excluded from version control

### Development Build (`dist-dev/`)
- **Location**: `./dist-dev/`
- **Purpose**: Development build with debugging support
- **Contents**:
  - Compiled JavaScript files (`.js`)
  - TypeScript declaration files (`.d.ts`)
  - Source maps (`.js.map`, `.d.ts.map`) for debugging
- **Usage**: Development debugging, IDE integration
- **Git Status**: Excluded from version control

## Build Scripts

### Production Build
```bash
npm run build
```
- Cleans `dist/` directory
- Compiles TypeScript without source maps
- Optimized for production deployment

### Development Build
```bash
npm run build:dev
```
- Cleans `dist-dev/` directory
- Compiles TypeScript with source maps
- Enables debugging and IDE integration

### Development Server
```bash
npm run dev
```
- Uses `ts-node` for direct TypeScript execution
- No build step required
- Hot reloading support

## File Organization

### Source Files (`src/`)
```
src/
├── config/          # Configuration
├── types/           # TypeScript interfaces
│   └── scryfall/    # Scryfall API types
├── services/        # Business logic
├── routes/          # API endpoints
├── middleware/      # Express middleware
├── utils/           # Utilities
├── app.ts           # App configuration
└── server.ts        # Entry point
```

### Build Output Structure
Both `dist/` and `dist-dev/` maintain the same structure as `src/`:
```
dist/
├── config/
├── types/
│   └── scryfall/
├── services/
├── routes/
├── middleware/
├── utils/
├── app.js
├── app.d.ts
├── server.js
└── server.d.ts
```

## Version Control

### Excluded Files
The following build artifacts are excluded from Git:

```gitignore
# Build outputs
dist/
dist-dev/
build/
*.js
*.js.map
*.d.ts
*.d.ts.map
```

### Why Exclude Build Artifacts?

1. **Generated Content**: Build files are automatically generated from source
2. **Repository Size**: Prevents large files from bloating the repository
3. **Platform Independence**: Builds can vary between environments
4. **Clean History**: Keeps commit history focused on source changes
5. **CI/CD Integration**: Builds are generated fresh in deployment pipelines

## Development Workflow

### For Development
1. Use `npm run dev` for immediate development
2. Use `npm run build:dev` when you need source maps for debugging
3. IDE will use source maps for better debugging experience

### For Production
1. Use `npm run build` for optimized production build
2. Deploy the `dist/` directory
3. Start with `npm start`

### For Testing
1. Use `npm test` to run tests
2. Tests can run against source files directly
3. No build step required for testing

## Benefits of This Organization

### 1. **Clean Separation**
- Source code and build artifacts are clearly separated
- No confusion about what should be committed

### 2. **Optimized Builds**
- Production builds are optimized (no source maps)
- Development builds include debugging information

### 3. **Flexible Development**
- Multiple build configurations for different needs
- Easy switching between development and production modes

### 4. **CI/CD Ready**
- Build artifacts are generated fresh in deployment
- No dependency on committed build files

### 5. **IDE Integration**
- Source maps enable proper debugging
- TypeScript declarations provide IntelliSense

## Troubleshooting

### Build Issues
- Run `npm run clean` to clear build artifacts
- Run `npm run clean:all` for complete reset
- Check TypeScript configuration in `tsconfig.json`

### Source Map Issues
- Ensure you're using `npm run build:dev` for development
- Check that `tsconfig.dev.json` is being used
- Verify source maps are enabled in your IDE

### Performance Issues
- Use `dist/` for production (no source maps)
- Use `dist-dev/` only when debugging is needed
- Consider using `npm run dev` for development (no build step) 