const fs = require('fs');
const path = require('path');

// Read the AllPrintings.json file
const allPrintings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/AllPrintings.json'), 'utf8'));

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '../data/boosters');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Process each set
Object.entries(allPrintings.data).forEach(([setCode, setData]) => {
    if (setData.booster && setData.sealedProduct) {
        // Create a new booster configuration structure keyed by UUID
        const newBoosterConfig = {
            setCode,
            name: setData.name,
            booster: {}
        };

        // For each sealed product in the set, map its UUID to the appropriate booster configuration
        setData.sealedProduct.forEach(product => {
            const productUuid = product.uuid;
            const productName = product.name.toLowerCase();
            
            // Determine which booster type this product should use
            let boosterType = null;
            
            if (productName.includes('collector')) {
                boosterType = 'collector';
            } else if (productName.includes('set')) {
                boosterType = 'set';
            } else if (productName.includes('draft')) {
                boosterType = 'draft';
            } else if (productName.includes('play')) {
                boosterType = 'play';
            } else if (productName.includes('theme')) {
                boosterType = 'theme';
            } else if (productName.includes('booster pack')) {
                // Default to draft for generic booster packs
                boosterType = 'draft';
            }
            
            // If we found a matching booster type and it exists in the configuration
            if (boosterType && setData.booster[boosterType]) {
                newBoosterConfig.booster[productUuid] = setData.booster[boosterType];
                console.log(`Mapped ${product.name} (${productUuid}) to ${boosterType} booster for ${setCode}`);
            } else if (boosterType) {
                console.log(`Warning: Booster type '${boosterType}' not found for ${product.name} in ${setCode}`);
            } else {
                console.log(`Warning: Could not determine booster type for ${product.name} in ${setCode}`);
            }
        });

        // Only write the file if we have booster configurations
        if (Object.keys(newBoosterConfig.booster).length > 0) {
            const outputPath = path.join(outputDir, `${setCode}.json`);
            fs.writeFileSync(outputPath, JSON.stringify(newBoosterConfig, null, 2));
            console.log(`Created UUID-based booster configuration for ${setCode} with ${Object.keys(newBoosterConfig.booster).length} products`);
        } else {
            console.log(`No booster configurations created for ${setCode}`);
        }
    } else if (setData.booster) {
        console.log(`Warning: ${setCode} has booster data but no sealed products`);
    }
});

console.log('UUID-based booster extraction complete!'); 