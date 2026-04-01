const fs = require('fs');

const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// The Progress Tracker block
const ptStartMarker = '          {!compact ? (\n          <article className="card impact-attract-card impact-attract-card--progress">';
const ptStartIdx = content.indexOf(ptStartMarker);
const ptEndMarker = '          </article>\n          ) : null}\n';
const ptEndIdx = content.indexOf(ptEndMarker, ptStartIdx) + ptEndMarker.length;

if (ptStartIdx === -1 || ptEndIdx === -1) {
    console.error("Could not find Progress Tracker Block.");
    process.exit(1);
}
const progressTrackerBlock = content.slice(ptStartIdx, ptEndIdx);

// Remove the Progress Tracker from its current position
content = content.slice(0, ptStartIdx) + content.slice(ptEndIdx);

// Change impact-dashboard-core to impact-dashboard-core-v2
content = content.replace('className="impact-dashboard-core"', 'className="impact-dashboard-core-v2"');

// The Attract Grid Block (Momentum, Funnel, Trust)
const agStartMarker = '      {!compact ? (\n        <div className="impact-attract-grid">';
const agStartIdx = content.indexOf(agStartMarker);
const agEndMarker = '        </div>\n      ) : null}\n\n';
const agEndIdx = content.indexOf(agEndMarker, agStartIdx) + agEndMarker.length;

if (agStartIdx === -1 || agEndIdx === -1) {
    console.error("Could not find Attract Grid Block.");
    process.exit(1);
}

let attractGridBlock = content.slice(agStartIdx, agEndIdx);

// Change impact-attract-grid class to include impact-insight-rail
attractGridBlock = attractGridBlock.replace(
  'className="impact-attract-grid"', 
  'className="impact-insight-rail impact-attract-grid"'
);

// Remove Attract Grid Block from its current position
content = content.slice(0, agStartIdx) + content.slice(agEndIdx);

// Now, insert the attractGridBlock inside impact-dashboard-core-v2
// Find the end of impact-main-panel which is before `        </div>\n      </div>\n\n\n\n      <div className="impact-tabs">`
const coreEndMarker = '        </div>\n      </div>\n\n\n\n      <div className="impact-tabs">';
const coreEndIdx = content.indexOf(coreEndMarker);

if (coreEndIdx === -1) {
    console.error("Could not find Core Dashboard End.");
    process.exit(1);
}

// Prepare the new structure. 
// We want attractGridBlock just before `        </div>\n      </div>\n`
// And we want progressTrackerBlock wrapping in `impact-tracker-banner` to go AFTER the core.

const newProgressBlock = `      {!compact ? (
        <div className="impact-tracker-banner">
          <article className="card impact-attract-card impact-attract-card--progress">` + 
 progressTrackerBlock.slice(ptStartMarker.length, progressTrackerBlock.length - ptEndMarker.length) + 
 `          </article>
        </div>
      ) : null}\n\n`;

content = content.slice(0, coreEndIdx) 
  + attractGridBlock 
  + '        </div>\n      </div>\n\n'
  + newProgressBlock
  + '      <div className="impact-tabs">';

fs.writeFileSync(FILE_PATH, content);
console.log("Successfully rebuilt v2 grid architecture!");
