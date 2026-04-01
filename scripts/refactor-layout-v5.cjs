const fs = require('fs');

const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Locate the entire Attract Grid container
const agStartMarker = '      {!compact ? (\n        <div className="impact-insight-rail impact-attract-grid">';
const agStartIdx = content.indexOf(agStartMarker);
const agEndMarker = '        </div>\n      ) : null}\n\n';
const agEndIdx = content.indexOf(agEndMarker, agStartIdx) + agEndMarker.length;

if (agStartIdx === -1 || agEndIdx === -1) {
    console.error("Could not find Attract Grid.");
    process.exit(1);
}

let attractGridBlock = content.slice(agStartIdx + agStartMarker.length, agEndIdx - agEndMarker.length);

// Extract Momentum
const moStartMarker = '          <article className="card impact-attract-card impact-attract-card--momentum">';
const moStartIdx = attractGridBlock.indexOf(moStartMarker);
const moEndMarker = '          </article>\n\n'; // wait, what if it's just </article>\n ? Let's slice based on next article.
const fuStartMarker = '          <article className="card impact-attract-card impact-attract-card--funnel">';
const trStartMarker = '          <article className="card impact-attract-card impact-attract-card--trust">';

const fuStartIdx = attractGridBlock.indexOf(fuStartMarker);
const trStartIdx = attractGridBlock.indexOf(trStartMarker);

const momentumStr = attractGridBlock.slice(moStartIdx, fuStartIdx);
const funnelStr = attractGridBlock.slice(fuStartIdx, trStartIdx);
const trustStr = attractGridBlock.slice(trStartIdx);

// Remove the entire Attract Grid Block from content
content = content.slice(0, agStartIdx) + content.slice(agEndIdx);

// 2. Identify injection point for Trust Card (end of impact-sidebar)
// It is right before `<div className="impact-main-panel">`
const mainPanelMarker = '          <div className="impact-main-panel">';
const mainPanelIdx = content.indexOf(mainPanelMarker);

if (mainPanelIdx === -1) {
    console.error("Could not find main panel marker.");
    process.exit(1);
}

const trustInjection = `
            {!compact ? (
${trustStr.trimEnd()}
            ) : null}
`;

// Inject trust into end of sidebar
// Current structure:
//             ) : null}
//           </div>
// 
//           <div className="impact-main-panel">
// We can just inject trustInjection before `          </div>\n\n          <div className="impact-main-panel">`
const sidebarEndMarker = '          </div>\n\n          <div className="impact-main-panel">';
const sidebarEndIdx = content.indexOf(sidebarEndMarker);
if (sidebarEndIdx !== -1) {
   content = content.slice(0, sidebarEndIdx) + trustInjection + content.slice(sidebarEndIdx);
} else {
   console.error("Could not find sidebarEndMarker.");
   process.exit(1);
}

// 3. Identify injection point for Horizontal Metrics Tray
// Right before `      {!compact ? (\n        <div className="impact-tracker-banner">`
const trackerMarker = '      {!compact ? (\n        <div className="impact-tracker-banner">';
const trackerIdx = content.indexOf(trackerMarker);

if (trackerIdx === -1) {
    console.error("Could not find tracker marker.");
    process.exit(1);
}

const trayInjection = `      {!compact ? (
        <div className="impact-horizontal-metrics-tray">
${momentumStr}${funnelStr}        </div>
      ) : null}\n\n`;

content = content.slice(0, trackerIdx) + trayInjection + content.slice(trackerIdx);

fs.writeFileSync(FILE_PATH, content);
console.log("Successfully shifted to 2-Column Expansion layout!");
