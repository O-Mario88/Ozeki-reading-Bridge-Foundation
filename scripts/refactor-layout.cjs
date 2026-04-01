const fs = require('fs');

const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const chunk1Start = '      {!compact ? (\\n        <div className="impact-attract-grid">';
const chunk1End = '        </div>\\n      ) : null}\\n\\n';
const chunk2Start = '      <div className="impact-explorer-layout">\\n';
const chunk2End = '        </div>\\n      </div>\\n\\n\\n\\n';

const c1StartIndex = content.indexOf('      {!compact ? (\n        <div className="impact-attract-grid">');
const c1EndStr = '        </div>\n      ) : null}\n\n';
const c1EndIndex = content.indexOf(c1EndStr, c1StartIndex) + c1EndStr.length;

const c2StartIndex = content.indexOf('      <div className="impact-explorer-layout">\n', c1EndIndex);
const c2EndStr = '        </div>\n      </div>\n\n\n\n';
const c2EndIndex = content.indexOf(c2EndStr, c2StartIndex) + c2EndStr.length;

if (c1StartIndex === -1 || c1EndIndex === -1 || c2StartIndex === -1 || c2EndIndex === -1) {
    console.error("Could not find chunks!");
    process.exit(1);
}

const chunk1 = content.slice(c1StartIndex, c1EndIndex);
const chunk2 = content.slice(c2StartIndex, c2EndIndex);

const beforeChunk1 = content.slice(0, c1StartIndex);
// After chunk1 but before chunk2 is empty basically, or just whitespace. 
// Let's just assemble: beforeChunk1 + chunk2 + chunk1 + afterChunk2
const afterChunk2 = content.slice(c2EndIndex);

const newContent = beforeChunk1 + chunk2 + chunk1 + afterChunk2;

fs.writeFileSync(FILE_PATH, newContent);
console.log("Successfully swapped layout chunks!");
