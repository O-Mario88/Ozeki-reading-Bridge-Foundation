const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');
const lines = content.split('\n');

function getLines(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

// 1. HeadlineStatsPanel Overlay
// Before:
// 865:       <div className="impact-explorer-layout">
// 866:         <div className="mb-2">
// 867:           <HeadlineStatsPanel
// ...
// 872:           />
// 873:         </div>
// 874: 
// 875:         <div className="impact-top-canvas">

const mapTop = getLines(865, 899).replace(
    `<div className="mb-2">
          <HeadlineStatsPanel
            data={payload}
            loading={loading}
            detailHref={detailHref}
            compact={compact}
          />
        </div>

        <div className="impact-top-canvas">`,
    `<div className="impact-top-canvas">
          <div className="impact-map-floating-stats">
            <HeadlineStatsPanel
              data={payload}
              loading={loading}
              detailHref={detailHref}
              compact={compact}
            />
          </div>`
);


// 2. The Asymmetric Grid
const nav = getLines(921, 929);
const trust = getLines(1056, 1144);
const momentum = getLines(935, 952);
const progress = getLines(956, 1048);
const funnel = getLines(1147, 1193);
const tabs = getLines(1195, 1232);

const newGrid = `          <div className="impact-asymmetric-base">
            
            {/* Macro Left Column */}
            <div className="impact-asymmetric-left">
${nav}
              {!compact ? (
${trust}
              ) : null}
            </div>

            {/* Macro Right Column */}
            <div className="impact-asymmetric-right">
              
              {!compact ? (
              <div className="impact-asymmetric-top-row">
${momentum}
${funnel}
              </div>
              ) : null}

              {!compact ? (
                <div className="impact-tracker-banner">
${progress}
                </div>
              ) : null}

            </div>
          </div>
          
${tabs}`;

const newLines = [
    ...lines.slice(0, 864),
    mapTop,
    ...lines.slice(900, 917),
    newGrid,
    ...lines.slice(1234)
];

fs.writeFileSync(FILE_PATH, newLines.join('\n'));
console.log("AST splicing completed perfectly for V11 Asymmetric Layout + Floating Stats.");
