import fs from 'fs';

const files = [
  'src/styles/card-tokens.css',
  'src/styles/card-tokens 2.css'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove .impact-map-floating-card from comma-separated selector lists
  content = content.replace(/,\s*\.impact-map-floating-card(?=\s*[,{])/g, '');
  content = content.replace(/\.impact-map-floating-card\s*,\s*/g, '');
  
  // Remove standalone blocks like .impact-map-floating-card { ... }
  // Note: this regex matches from the selector up to the closing brace.
  content = content.replace(/\.impact-map-floating-card[^{]*\{[^}]*\}/g, '');
  
  // Remove nested references
  content = content.replace(/\.impact-map-floating-card[a-zA-Z0-9-]*[^{]*\{[^}]*\}/g, '');
  
  // Remove descendant references like .impact-map-floating-card .card-ref-title-line { ... }
  content = content.replace(/\.impact-map-floating-card\s+[a-zA-Z0-9-.: >]+[^{]*\{[^}]*\}/g, '');
  
  // There are blocks with multiple selectors, we need to remove the .impact-map-floating-card* parts
  content = content.split('\n').map(line => {
    if (line.includes('.impact-map-floating-card')) {
      if (line.includes(',') && !line.includes('{')) {
        // Just part of a generic selector list, remove line
        return '';
      }
    }
    return line;
  }).filter(l => l !== '').join('\n');
  
  fs.writeFileSync(file, content);
  console.log('Cleaned ' + file);
}
