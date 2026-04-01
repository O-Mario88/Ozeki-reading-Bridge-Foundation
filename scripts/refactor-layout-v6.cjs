const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const coreStart = '        <div className="impact-dashboard-core-v2">';
const tabsContentStart = '      <div className="impact-tab-content">';

const fullBlockStart = content.indexOf(coreStart);
const tabsContentIdx = content.indexOf(tabsContentStart);

if (fullBlockStart === -1 || tabsContentIdx === -1) {
    console.error("Boundaries not found");
    process.exit(1);
}

const existingLayout = content.substring(fullBlockStart, tabsContentIdx);

function getBlock(startStr, endStr) {
    const s = existingLayout.indexOf(startStr);
    if (s === -1) {
        console.error("FAILED TO EXTRACT START: " + startStr);
        return "";
    }
    const e = existingLayout.indexOf(endStr, s);
    if (e === -1) {
        console.error("FAILED TO EXTRACT END: " + endStr);
        return "";
    }
    return existingLayout.substring(s, e + endStr.length);
}

const locationNav = getBlock('            <LocationNavigator', '            />');
const errorAlert1 = getBlock('            {error ? (', '            ) : null}');
const errorAlert2 = getBlock('            {payload && payload.kpis.schoolsSupported === 0 ? (', '            ) : null}');
const trustCard = getBlock('          <article className="card impact-attract-card impact-attract-card--trust">', '          </article>');
const mapComp = getBlock('          <UgandaImpactMapPro', '          />');
const momentumCard = getBlock('          <article className="card impact-attract-card impact-attract-card--momentum">', '          </article>');
const funnelCard = getBlock('          <article className="card impact-attract-card impact-attract-card--funnel">', '          </article>');
const progressCard = getBlock('          <article className="card impact-attract-card impact-attract-card--progress">', '          </article>');
const tabs = getBlock('      <div className="impact-tabs">', '      </div>');

const newLayout = `        <div className="impact-dashboard-core-v2">
          <div className="impact-main-panel">
${locationNav}
${errorAlert1}
${errorAlert2}

${mapComp}

            {!compact ? (
${momentumCard}
            ) : null}
          </div>

          <div className="impact-sidebar-panel">
            {!compact ? (
${trustCard}
            ) : null}

            {!compact ? (
${funnelCard}
            ) : null}

${tabs}
          </div>
        </div>

        {!compact ? (
          <div className="impact-tracker-banner">
${progressCard}
          </div>
        ) : null}

`;

const replacedContent = content.substring(0, fullBlockStart) + newLayout + content.substring(tabsContentIdx);
fs.writeFileSync(FILE_PATH, replacedContent);
console.log("Successfully reshaped to v6 Dense 2-Column layout");
