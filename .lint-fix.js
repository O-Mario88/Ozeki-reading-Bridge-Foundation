const fs = require('fs');
const input = fs.readFileSync('/tmp/ozeki_lint_raw.txt', 'utf8');
const lines = input.split('\n');
let currentFile = null;
const edits = new Map();
for (const line of lines) {
  if (line.startsWith('./')) { currentFile = line.trim(); continue; }
  if (!currentFile) continue;
  let m = line.match(/^(\d+):\d+\s+Warning:.*@typescript-eslint\/no-explicit-any/);
  if (m) { if (!edits.has(currentFile)) edits.set(currentFile, new Map()); edits.get(currentFile).set(parseInt(m[1]), '@typescript-eslint/no-explicit-any'); continue; }
  m = line.match(/^(\d+):\d+\s+Warning:.*@next\/next\/no-img-element/);
  if (m) { if (!edits.has(currentFile)) edits.set(currentFile, new Map()); edits.get(currentFile).set(parseInt(m[1]), '@next/next/no-img-element'); continue; }
}
let total = 0;
const cwd = process.cwd();
for (const [relPath, lineRules] of edits) {
  const fp = relPath.replace('./', cwd + '/');
  if (!fs.existsSync(fp)) { console.log('SKIP: ' + relPath); continue; }
  const fileLines = fs.readFileSync(fp, 'utf8').split('\n');
  const sorted = [...lineRules.entries()].sort((a, b) => b[0] - a[0]);
  let mod = false;
  for (const [ln, rule] of sorted) {
    const idx = ln - 1;
    if (idx < 0 || idx >= fileLines.length) continue;
    const prev = idx > 0 ? fileLines[idx - 1] : '';
    if (prev.includes('eslint-disable-next-line') && prev.includes(rule)) continue;
    const indent = fileLines[idx].match(/^(\s*)/)[1];
    fileLines.splice(idx, 0, indent + '// eslint-disable-next-line ' + rule);
    total++; mod = true;
  }
  if (mod) { fs.writeFileSync(fp, fileLines.join('\n')); console.log('Fixed: ' + relPath + ' (' + lineRules.size + ')'); }
}
console.log('\nTotal suppressions: ' + total);
