const fs = require('fs');
const FILE_PATH = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
const content = fs.readFileSync(FILE_PATH, 'utf8');
const lines = content.split('\n');

const trustCardStart = 1054; // Line 1055:               {!compact ? (
const trustCardEnd = 1145;   // Line 1146:               {!compact ? ( ...funnel...

const trustCardLines = lines.slice(trustCardStart, trustCardEnd);
const remainingLines = [
  ...lines.slice(0, trustCardStart),
  ...lines.slice(trustCardEnd)
];

// Now find where to insert it in remainingLines:
// Right after LocationNavigator which closes at:
//                 onBack={onBack}
//               />
//             </div>
//
// Let's actually find the line that says:
//             </div>
//
//             {/* Column 2: Momentum & Progress */}
let insertIdx = -1;
for (let i = 0; i < remainingLines.length; i++) {
  if (remainingLines[i].includes('{/* Column 2: Momentum & Progress */}')) {
    insertIdx = i - 1; // Wait, actually I just insert it BEFORE the closing </div> of Col 1!
                       // Or I can insert it right before the blank line before Column 2.
    break;
  }
}

// In remainingLines, we have:
//               />
//             </div>
//
//             {/* Column 2: Momentum & Progress */}
//
// So insertIdx = index of `            </div>`
// I want to insert the trustCard inside Col 1, so BEFORE `            </div>`.

let closingDivIdx = -1;
for (let i = insertIdx; i >= 0; i--) {
  if (remainingLines[i].includes('            </div>')) {
    closingDivIdx = i;
    break;
  }
}

const finalLines = [
  ...remainingLines.slice(0, closingDivIdx),
  ...trustCardLines,
  ...remainingLines.slice(closingDivIdx)
];

fs.writeFileSync(FILE_PATH, finalLines.join('\n'));
console.log("Trust Card successfully moved into Column 1.");
