const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const ROOT = path.join(__dirname, '..');
const CSS_PATH = path.join(ROOT, 'src/app/globals.css');

async function run() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const ast = postcss.parse(css);

  // Phase 1: Merge duplicate selectors
  // For each selector, keep track of ALL declarations seen.
  // When we encounter a duplicate selector, merge its declarations into the LAST occurrence
  // and remove earlier empty ones.
  
  // Collect all rules by normalized selector
  const selectorRules = new Map(); // selector → [rule1, rule2, ...]
  
  ast.walkRules(rule => {
    // Skip rules inside @keyframes
    if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') return;
    
    const sel = rule.selectors.sort().join(', ');
    if (!selectorRules.has(sel)) selectorRules.set(sel, []);
    selectorRules.get(sel).push(rule);
  });

  let mergedCount = 0;
  
  for (const [sel, rules] of selectorRules) {
    if (rules.length <= 1) continue;
    
    // Check if they're all at the same nesting level (same parent @media or root)
    // Only merge rules that share the same parent context
    const byParent = new Map();
    for (const rule of rules) {
      const parentKey = rule.parent?.type === 'atrule' 
        ? `${rule.parent.name}:${rule.parent.params}` 
        : 'root';
      if (!byParent.has(parentKey)) byParent.set(parentKey, []);
      byParent.get(parentKey).push(rule);
    }
    
    for (const [, groupRules] of byParent) {
      if (groupRules.length <= 1) continue;
      
      // Keep the LAST rule, merge earlier ones' unique properties into it
      const last = groupRules[groupRules.length - 1];
      
      // Collect all declarations from earlier rules
      const existingInLast = new Set();
      last.walkDecls(decl => existingInLast.add(decl.prop));
      
      for (let i = 0; i < groupRules.length - 1; i++) {
        const earlier = groupRules[i];
        
        // Move unique declarations from earlier to the start of last
        earlier.walkDecls(decl => {
          if (!existingInLast.has(decl.prop)) {
            last.prepend(decl.clone());
            existingInLast.add(decl.prop);
          }
        });
        
        earlier.remove();
        mergedCount++;
      }
    }
  }
  
  console.log(`Merged ${mergedCount} duplicate rule blocks`);

  // Phase 2: Remove orphaned comments (comments whose associated CSS was removed)
  // A comment is "orphaned" if the next sibling is also a comment or doesn't exist
  let removedComments = 0;
  ast.walkComments(comment => {
    const next = comment.next();
    if (!next) {
      comment.remove();
      removedComments++;
    }
  });
  console.log(`Removed ${removedComments} orphaned comments`);

  // Phase 3: Remove empty @media / @supports
  let removedMedia = 0;
  for (let pass = 0; pass < 3; pass++) {
    ast.walkAtRules(rule => {
      if (['media', 'supports', 'layer'].includes(rule.name)) {
        let hasContent = false;
        rule.walk(node => {
          if (node.type === 'rule' || node.type === 'decl') hasContent = true;
        });
        if (!hasContent) {
          rule.remove();
          removedMedia++;
        }
      }
    });
  }
  console.log(`Removed ${removedMedia} empty @media/@supports blocks`);

  // Phase 4: Remove consecutive blank lines (more than 1)
  let result = ast.toString();
  result = result.replace(/\n{3,}/g, '\n\n');
  
  const outPath = '/tmp/globals_deduped.css';
  fs.writeFileSync(outPath, result);
  
  const origLines = css.split('\n').length;
  const newLines = result.split('\n').length;
  console.log(`\nOriginal: ${origLines} lines (${(css.length/1024).toFixed(0)}K)`);
  console.log(`Result:   ${newLines} lines (${(result.length/1024).toFixed(0)}K)`);
  console.log(`Reduction: ${origLines - newLines} lines (${((1 - newLines/origLines)*100).toFixed(1)}%)`);
  console.log(`\nWritten to ${outPath}`);
}

run().catch(console.error);
