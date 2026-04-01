const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

const lines = content.split('\n');

function getLines(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

const nav = getLines(877, 885);
const err1 = getLines(886, 891);
const err2 = getLines(892, 901);
const map = getLines(903, 926);
const momentum = getLines(928, 947);
const trust = getLines(951, 1036);
const funnel = getLines(1038, 1084);
const tabs = getLines(1086, 1123);
const progress = getLines(1127, 1222);

const newGrid = `        <div className="impact-top-canvas">
${map}
        </div>

        <div className="impact-metrics-trio-wrapper">
${err1}
${err2}
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
        </div>`;

// Replace lines 875 to 1222 (leaving 1223 which is the closing impact-explorer-layout)
const newLines = [
    ...lines.slice(0, 874),
    newGrid,
    ...lines.slice(1222)
];

fs.writeFileSync(FILE_PATH, newLines.join('\n'));
console.log("Line splicing correctly leaving the wrapping </div> for impact-explorer-layout intact!");
