const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

const ROOT = path.join(__dirname, '..');
const CSS_PATH = path.join(ROOT, 'src/app/globals.css');
const SRC_DIR = path.join(ROOT, 'src');

// Recursively collect all .tsx, .ts, .jsx file contents into one big string
function collectSourceContent(dir) {
  let content = '';
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      content += collectSourceContent(full);
    } else if (/\.(tsx|ts|jsx)$/.test(entry.name) && entry.name !== 'globals.css') {
      content += fs.readFileSync(full, 'utf8') + '\n';
    }
  }
  return content;
}

async function run() {
  console.log('Collecting all source file contents...');
  const allSource = collectSourceContent(SRC_DIR);
  console.log(`Collected ${(allSource.length / 1024).toFixed(0)}K of source code`);

  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const allClasses = new Set();
  const classUsageCache = new Map();

  const ast = postcss.parse(css);

  ast.walkRules(rule => {
    selectorParser(selectors => {
      selectors.walkClasses(node => {
        allClasses.add(node.value);
      });
    }).processSync(rule.selector);
  });

  console.log(`Found ${allClasses.size} unique CSS classes in globals.css`);

  // Check each class against the concatenated source
  for (const cls of allClasses) {
    // Simple substring check — if the class name appears anywhere in any source file, keep it
    classUsageCache.set(cls, allSource.includes(cls));
  }

  const deadClasses = [...allClasses].filter(c => classUsageCache.get(c) === false);
  const usedClasses = [...allClasses].filter(c => classUsageCache.get(c) === true);
  console.log(`\nUsed: ${usedClasses.length}, Dead: ${deadClasses.length}`);
  console.log('\nDead classes:\n' + deadClasses.sort().join('\n'));

  // Remove rules where ANY class selector is dead
  let removedRules = 0;
  ast.walkRules(rule => {
    const newSelectors = [];
    for (const selStr of rule.selectors) {
      let isDead = false;
      selectorParser(parsedSel => {
        parsedSel.walkClasses(node => {
          if (classUsageCache.get(node.value) === false) isDead = true;
        });
      }).processSync(selStr);
      if (!isDead) newSelectors.push(selStr);
    }
    if (newSelectors.length === 0) { rule.remove(); removedRules++; }
    else rule.selectors = newSelectors;
  });

  // Remove empty @media / @layer / @supports
  ast.walkAtRules(rule => {
    if (['media', 'layer', 'supports'].includes(rule.name) && rule.nodes && rule.nodes.length === 0) {
      rule.remove();
    }
  });
  // Second pass for nested empties
  ast.walkAtRules(rule => {
    if (['media', 'layer', 'supports'].includes(rule.name) && rule.nodes && rule.nodes.length === 0) {
      rule.remove();
    }
  });

  console.log(`\nRemoved ${removedRules} CSS rules/blocks.`);

  const newCss = ast.toString();
  const outPath = '/tmp/globals_lean_v3.css';
  fs.writeFileSync(outPath, newCss);

  const origLines = css.split('\n').length;
  const newLines = newCss.split('\n').length;
  console.log(`Original: ${origLines} lines (${(css.length/1024).toFixed(0)}K)`);
  console.log(`Result:   ${newLines} lines (${(newCss.length/1024).toFixed(0)}K)`);
  console.log(`Reduction: ${((1 - newLines/origLines)*100).toFixed(1)}%`);
  console.log(`\nWritten to ${outPath}`);
}

run().catch(console.error);
