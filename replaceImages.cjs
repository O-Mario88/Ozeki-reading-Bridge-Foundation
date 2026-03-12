/* eslint-disable */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    const photoDir = path.join(__dirname, 'assets', 'photos');
    const photos = fs.readdirSync(photoDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));

    // Shuffle or just use sequentially
    let photoIndex = 0;

    const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);

    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        // Regex to find image imports from assets/photos
        const importRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+["']([^"']*assets\/photos\/[^"']+)["']/g;

        let match;
        while ((match = importRegex.exec(original)) !== null) {
            const fullMatch = match[0];
            const importVar = match[1];
            const oldPath = match[2];

            if (photoIndex >= photos.length) photoIndex = 0; // wrap around if we run out

            const newPhoto = photos[photoIndex++];
            // keep the relative directory part, just change the filename
            const pathDir = path.dirname(oldPath);
            const newPath = `${pathDir}/${newPhoto}`;

            content = content.replace(oldPath, newPath);
        }

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`Updated images in ${file}`);
        }
    });

} catch (e) {
    console.error(e);
}
