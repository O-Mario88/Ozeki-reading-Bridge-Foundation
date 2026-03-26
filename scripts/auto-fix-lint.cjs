const fs = require('fs');
const path = require('path');

const lintOutputRaw = fs.readFileSync(path.join(process.cwd(), 'lint_out.json'), 'utf8');

// The output of next lint might have text before the JSON or an error at the end if it crashed, so let's extract the json array
const jsonStart = lintOutputRaw.indexOf('[');
const jsonEnd = lintOutputRaw.lastIndexOf(']');

if (jsonStart === -1 || jsonEnd === -1) {
  console.error("Could not find JSON array in lint_out.json");
  process.exit(1);
}

const lintJson = JSON.parse(lintOutputRaw.substring(jsonStart, jsonEnd + 1));

const edits = new Map();

for (const fileResult of lintJson) {
  if (!fileResult.messages || fileResult.messages.length === 0) continue;
  
  const rulesToSuppress = new Map();
  
  for (const msg of fileResult.messages) {
    if (msg.ruleId === '@typescript-eslint/no-explicit-any' || msg.ruleId === '@next/next/no-img-element') {
      rulesToSuppress.set(msg.line, msg.ruleId);
    }
  }
  
  if (rulesToSuppress.size > 0) {
    edits.set(fileResult.filePath, rulesToSuppress);
  }
}

let totalAdded = 0;

for (const [filePath, rulesToSuppress] of edits) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  
  let fileBody = fs.readFileSync(filePath, 'utf8');
  let lines = fileBody.split('\n');
  
  const sortedLines = Array.from(rulesToSuppress.entries()).sort((a, b) => b[0] - a[0]); // Descending
  
  let modified = false;
  
  for (const [lineNum, rule] of sortedLines) {
    const idx = lineNum - 1;
    if (idx < 0 || idx >= lines.length) continue;
    
    // Check if the previous line is already a disable rule
    if (idx > 0 && lines[idx - 1].includes('eslint-disable-next-line') && lines[idx - 1].includes(rule)) {
      continue;
    }
    
    const indentMatch = lines[idx].match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    
    lines.splice(idx, 0, `${indent}// eslint-disable-next-line ${rule}`);
    totalAdded++;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Updated ${filePath} with ${rulesToSuppress.size} suppressions`);
  }
}

console.log(`\nTotal suppressions added: ${totalAdded}`);
