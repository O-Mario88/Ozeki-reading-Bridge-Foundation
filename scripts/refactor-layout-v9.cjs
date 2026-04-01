const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const masterStart = '      <div className="impact-explorer-layout">';
const masterEnd = '      <div className="impact-tab-content">';

const masterStartIdx = content.indexOf(masterStart);
const masterEndIdx = content.indexOf(masterEnd);

if (masterStartIdx === -1 || masterEndIdx === -1) {
    console.error("FATAL: Boundaries not found");
    process.exit(1);
}

const targetArea = content.substring(masterStartIdx, masterEndIdx);

function extract(startStr, endStr) {
    const s = targetArea.indexOf(startStr);
    const e = targetArea.indexOf(endStr, s);
    if (s === -1 || e === -1) {
        console.error("EXTRACT FAILED:", startStr.substring(0, 30));
        return "";
    }
    return targetArea.substring(s, e + endStr.length);
}

const nav = extract('            <LocationNavigator', '            />');
const err1 = extract('            {error ? (', '            ) : null}');
const err2 = extract('            {payload && payload.kpis.schoolsSupported === 0 ? (', '            ) : null}');

const map = extract('          <UgandaImpactMapPro', '          />');

const momentum = extract(
  '          <article className="card impact-attract-card impact-attract-card--momentum">',
  '            </div>\n          </article>'
);

const trust = extract(
  '          <article className="card impact-attract-card impact-attract-card--trust">',
  '            </div>\n          </article>'
);

const funnel = extract(
  '          <article className="card impact-attract-card impact-attract-card--funnel">',
  '            </div>\n          </article>'
);

const tabs = extract('      <div className="impact-tabs">', '      </div>');

const progress = extract(
  '          <article className="card impact-attract-card impact-attract-card--progress">',
  '            )}\n          </article>'
);

const newGrid = `      <div className="impact-explorer-layout">
        <div className="mb-2">
          <HeadlineStatsPanel
            data={payload}
            loading={loading}
            detailHref={detailHref}
            compact={compact}
          />
        </div>

        <div className="impact-top-canvas">
${err1}
${err2}
${map}
        </div>

        {!compact ? (
          <div className="impact-metrics-trio">
            
            {/* Column 1: Location Navigator */}
            <div className="impact-trio-col">
${nav}
            </div>

            {/* Column 2: Momentum & Progress */}
            <div className="impact-trio-col">
${momentum}
${progress}
            </div>

            {/* Column 3: Trust, Funnel, Tabs */}
            <div className="impact-trio-col">
${trust}
${funnel}
${tabs}
            </div>

          </div>
        ) : (
          <div className="impact-metrics-trio compact-mode">
            <div className="impact-trio-col">${nav}</div>
            <div className="impact-trio-col">${tabs}</div>
          </div>
        )}
      </div>

`;

const finalFile = content.substring(0, masterStartIdx) + newGrid + content.substring(masterEndIdx);
fs.writeFileSync(FILE_PATH, finalFile);
console.log("AST splicing completed perfectly for V9 3-Column Command Station.");
