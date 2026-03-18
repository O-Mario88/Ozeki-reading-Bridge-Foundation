import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_FILE = '/tmp/schema.sql';
const PROJECT_SRC = path.join(__dirname, '../src');

function getTablesAndColumns(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf8');
  const tables = {};
  
  let currentTable = null;
  
  const lines = content.split('\\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('CREATE TABLE public.')) {
      currentTable = line.replace('CREATE TABLE public.', '').replace(' (', '');
      tables[currentTable] = [];
    } else if (currentTable && line === ');') {
      currentTable = null;
    } else if (currentTable) {
      if (line === '' || line.startsWith('CONSTRAINT')) continue;
      // Extract column name
      const colMatch = line.match(/^([a-zA-Z0-9_]+)\\s+/);
      if (colMatch) {
         const colName = colMatch[1];
         if (colName !== 'id' && colName !== 'created_at' && colName !== 'updated_at') {
             tables[currentTable].push(colName);
         }
      }
    }
  }
  return tables;
}

function searchCodebaseForColumn(column) {
  try {
    const output = execSync(`grep -r "\\b${column}\\b" ${PROJECT_SRC} | grep -v "/tests/" | grep -v "/schema.sql" | wc -l`).toString();
    const count = parseInt(output.trim(), 10);
    return count;
  } catch (e) {
    return 0;
  }
}

async function run() {
  console.log('Parsing Schema...');
  const tables = getTablesAndColumns(SCHEMA_FILE);
  
  const report = {};
  
  for (const table of Object.keys(tables)) {
    const columns = tables[table];
    const orphans = [];
    
    for (const col of columns) {
      const occurrences = searchCodebaseForColumn(col);
      // Wait, camelCase is often used in TS!
      // Convert snake_case to camelCase
      const camelCol = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const camelOccurrences = col !== camelCol ? searchCodebaseForColumn(camelCol) : 0;
      
      const total = occurrences + camelOccurrences;
      
      if (total === 0) {
        orphans.push(col);
      }
    }
    
    if (orphans.length > 0) {
      report[table] = orphans;
    }
  }
  
  fs.writeFileSync(path.join(__dirname, 'orphans-report.json'), JSON.stringify(report, null, 2));
  console.log('Report generated at scripts/orphans-report.json');
}

run();
