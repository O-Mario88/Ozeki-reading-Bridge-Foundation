import fs from 'fs';
import path from 'path';

const SRC_APP_DIR = path.join(process.cwd(), 'src', 'app');

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Exclude specific dynamic directories entirely
      if (['portal', 'api', 'events'].includes(file)) {
        continue;
      }
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

let modifiedCount = 0;

walkDir(SRC_APP_DIR, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Safely grab both single and double quotes of 'force-dynamic'
  const dynamicRegex = /export\s+const\s+dynamic\s*=\s*(['"])force-dynamic\1\s*;/g;
  
  if (dynamicRegex.test(content)) {
    // We found it! Replace it with a robust 5-minute ISR cache policy
    const newContent = content.replace(
      dynamicRegex, 
      'export const revalidate = 300;'
    );
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    modifiedCount++;
    console.log(`✅ Converted to ISR: ${path.relative(process.cwd(), filePath)}`);
  }
});

console.log(`\n🎉 Success! Applied 5-minute ISR caching to ${modifiedCount} public routes.`);
