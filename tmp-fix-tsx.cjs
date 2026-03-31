const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modifiedFiles = 0;

walkDir('src/components', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern to catch: style={{ display: "flex", ... }}
    // We selectively add flexWrap: "wrap", minWidth: 0 to ensure elements stack and text truncates gracefully
    const flexPattern = /style=\{\{\s*(?:display:\s*["']flex["'])\s*,?([^}]*)\}\}/g;
    
    content = content.replace(flexPattern, (match, innerProps) => {
        // Skip if already wrapping or if it's a structural column where wrapping breaks layout completely
        if (
            innerProps.includes('flexWrap') ||
            innerProps.includes('flexDirection') ||
            innerProps.includes('wrap')
        ) {
            return match;
        }
        
        // Return with injected wraps
        return `style={{ display: "flex", flexWrap: "wrap", ${innerProps.trim()} }}`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        modifiedFiles++;
    }
});

walkDir('src/app', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    const flexPattern = /style=\{\{\s*(?:display:\s*["']flex["'])\s*,?([^}]*)\}\}/g;
    
    content = content.replace(flexPattern, (match, innerProps) => {
        if (
            innerProps.includes('flexWrap') ||
            innerProps.includes('flexDirection') ||
            innerProps.includes('wrap')
        ) {
            return match;
        }
        return `style={{ display: "flex", flexWrap: "wrap", ${innerProps.trim()} }}`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        modifiedFiles++;
    }
});

console.log(`Successfully injected flex-wrap into ${modifiedFiles} files.`);
