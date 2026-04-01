const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const masterStart = '      {!compact ? (\n        <div className="impact-attract-grid">';
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

const momentum = extract('          <article className="card impact-attract-card impact-attract-card--momentum">', '          </article>\n\n          <article className="card impact-attract-card impact-attract-card--funnel">').replace('\n\n          <article className="card impact-attract-card impact-attract-card--funnel">', '');
const funnel = extract('          <article className="card impact-attract-card impact-attract-card--funnel">', '          </article>\n\n          <article className="card impact-attract-card impact-attract-card--trust">').replace('\n\n          <article className="card impact-attract-card impact-attract-card--trust">', '');
const trust = extract('          <article className="card impact-attract-card impact-attract-card--trust">', '          </article>\n\n\n        </div>\n      ) : null}');

const nav = extract('            <LocationNavigator', '            />');
const err1 = extract('            {error ? (', '            ) : null}');
const err2 = extract('            {payload && payload.kpis.schoolsSupported === 0 ? (', '            ) : null}\n          </div>');

const progress = extract('          <article className="card impact-attract-card impact-attract-card--progress">', '          </article>\n          ) : null}');
const map = extract('          <UgandaImpactMapPro', '          />');
const tabs = extract('      <div className="impact-tabs">', '      </div>\n');

const newGrid = `      <div className="impact-explorer-layout">
        <div className="mb-2">
          <HeadlineStatsPanel
            data={payload}
            loading={loading}
            detailHref={detailHref}
            compact={compact}
          />
        </div>

        <div className="impact-dashboard-core-v2">
          <div className="impact-main-panel">
${nav}
${err1}
${err2.replace('\\n          </div>', '')}

${map}

            {!compact ? (
${momentum}
            ) : null}
          </div>

          <div className="impact-sidebar-panel">
            {!compact ? (
${trust}
            ) : null}

            {!compact ? (
${funnel}
            ) : null}

${tabs}
          </div>
        </div>

        {!compact ? (
          <div className="impact-tracker-banner">
${progress.replace('\\n          ) : null}', '')}
          </div>
        ) : null}
      </div>

`;

const finalFile = content.substring(0, masterStartIdx) + newGrid + content.substring(masterEndIdx);
fs.writeFileSync(FILE_PATH, finalFile);
console.log("AST splicing completed perfectly for V7 Dense 2-Column Split.");
