const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const assetsDir = path.join(__dirname, '../assets/photos');
const publicDir = path.join(__dirname, '../public/photos');

// Ensure public/photos exists and sync files over just in case
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Get valid photos from assets/photos
const assetPhotos = fs.readdirSync(assetsDir).filter(f => {
  if (['logo.png', 'logo-pdf.png', 'Signature.png'].includes(f)) return false;
  return f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp');
});

// Sync them to public/photos
assetPhotos.forEach(f => {
  fs.copyFileSync(path.join(assetsDir, f), path.join(publicDir, f));
});

// We prefer ones without spaces just to guarantee CSS url() doesn't break
let safePhotos = assetPhotos.filter(f => !f.includes(' '));
if (safePhotos.length === 0) safePhotos = assetPhotos; // fallback

// Build replacement logic for .tsx files
const files = execSync('find src -name "*.tsx"').toString().split('\n').filter(Boolean);

let pIdx = 0;
let replacedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // We want to replace any string /photos/something.jpg
  // Note: we want to SKIP /photos/logo.png or /photos/Signature.png
  content = content.replace(/\/photos\/([a-zA-Z0-9_\-\.\%20]+(?:jpg|jpeg|png|webp|MP\.jpg))/gi, (match, filename) => {
    // If it's the logo, leave it alone.
    const decoded = decodeURIComponent(filename);
    if (decoded === 'logo.png' || decoded === 'logo-pdf.png' || decoded === 'Signature.png') {
      return match;
    }
    
    // Pick next asset photo
    if (pIdx >= safePhotos.length) pIdx = 0;
    // We URI encode it just in case, though safePhotos has no spaces
    const replacement = '/photos/' + encodeURI(safePhotos[pIdx++]);
    return replacement;
  });
  
  // also handle standard space chars in case regex didn't catch them
  content = content.replace(/\/photos\/([^"'\)&]+(?:jpg|jpeg|png|webp|MP\.jpg))/gi, (match, filename) => {
    const decoded = decodeURIComponent(filename);
    if (decoded === 'logo.png' || decoded === 'logo-pdf.png' || decoded === 'Signature.png') {
      return match;
    }
    if (pIdx >= safePhotos.length) pIdx = 0;
    return '/photos/' + encodeURI(safePhotos[pIdx++]);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated images in ${file}`);
    replacedCount++;
  }
});

console.log(`Done! Replaced images in ${replacedCount} files.`);
