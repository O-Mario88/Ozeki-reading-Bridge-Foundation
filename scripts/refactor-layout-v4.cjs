const fs = require('fs');

const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Remove Attract Grid
const agStartMarker = '      {!compact ? (\n        <div className="impact-attract-grid">';
const agStartIdx = content.indexOf(agStartMarker);
const agEndMarker = '        </div>\n      ) : null}\n\n';
const agEndIdx = content.indexOf(agEndMarker, agStartIdx) + agEndMarker.length;

if (agStartIdx === -1 || agEndIdx === -1) {
    console.error("Could not find Attract Grid.");
    process.exit(1);
}

let attractGridBlock = content.slice(agStartIdx, agEndIdx);
attractGridBlock = attractGridBlock.replace(
  'className="impact-attract-grid"', 
  'className="impact-insight-rail impact-attract-grid"'
);
content = content.slice(0, agStartIdx) + content.slice(agEndIdx);

// 2. Remove Progress Tracker
const ptStartMarker = '          {!compact ? (\n          <article className="card impact-attract-card impact-attract-card--progress">';
const ptStartIdx = content.indexOf(ptStartMarker);
const ptEndMarker = '          </article>\n          ) : null}\n';
const ptEndIdx = content.indexOf(ptEndMarker, ptStartIdx) + ptEndMarker.length;

if (ptStartIdx === -1 || ptEndIdx === -1) {
    console.error("Could not find Progress Tracker.");
    process.exit(1);
}

const progressTrackerBlock = content.slice(ptStartIdx, ptEndIdx);
content = content.slice(0, ptStartIdx) + content.slice(ptEndIdx);

// 3. Rename core
content = content.replace('className="impact-dashboard-core"', 'className="impact-dashboard-core-v2"');

// 4. Inject
const coreEndMarker = '        </div>\n      </div>\n\n\n\n      <div className="impact-tabs">';
const coreEndIdx = content.indexOf(coreEndMarker);

if (coreEndIdx === -1) {
    console.error("Could not find Core Dashboard End.");
    process.exit(1);
}

const prefixContent = content.slice(0, coreEndIdx);
const suffixContent = content.slice(coreEndIdx + coreEndMarker.length);

const newProgressBlock = `      {!compact ? (
        <div className="impact-tracker-banner">
          <article className="card impact-attract-card impact-attract-card--progress">` + 
 progressTrackerBlock.slice(ptStartMarker.length, progressTrackerBlock.length - ptEndMarker.length) + 
 `          </article>
        </div>
      ) : null}\n\n`;

content = prefixContent 
  + attractGridBlock 
  + '        </div>\n      </div>\n\n'
  + newProgressBlock
  + '      <div className="impact-tabs">'
  + suffixContent;

fs.writeFileSync(FILE_PATH, content);
console.log("Successfully rebuilt v2 grid architecture and preserved tail!");
