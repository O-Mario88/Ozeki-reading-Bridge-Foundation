import fs from 'fs';
import path from 'path';

const pages = [
  "src/app/programs/page.tsx",
  "src/app/phonics-training/page.tsx",
  "src/app/learner-reading-assessments-progress-tracking/page.tsx",
  "src/app/school-systems-routines/page.tsx",
  "src/app/in-school-coaching-mentorship/page.tsx",
  "src/app/reading-materials-development/page.tsx",
  "src/app/teacher-professional-development/page.tsx",
  "src/app/remedial-catch-up-reading-interventions/page.tsx",
  "src/app/instructional-leadership-support/page.tsx",
  "src/app/literacy-content-creation-advocacy/page.tsx",
  "src/app/teaching-aids-instructional-resources-teachers/page.tsx",
  "src/app/story-project/page.tsx",
  "src/app/monitoring-evaluation-reporting/page.tsx"
];

for (const p of pages) {
  let content = fs.readFileSync(p, 'utf8');
  
  // 1. Find and replace the hardcoded section
  // The section always starts with <SectionWrapper theme="light" id="voices">
  // and ends right before <CTAStrip
  const startIdx = content.indexOf('<SectionWrapper theme="light" id="voices">');
  const endIdx = content.indexOf('<CTAStrip', startIdx);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const beforeBytes = content.substring(0, startIdx);
    const afterBytes = content.substring(endIdx);
    
    // Inject the new component 
    // also we need to add the import if it's not there
    let newContent = beforeBytes + '<VoicesFromTheClassroom />\n\n      ' + afterBytes;
    
    if (!newContent.includes('VoicesFromTheClassroom')) {
      // safe fallback if something weird happens
    } else {
      // Add import near the top
      if (!newContent.includes('import { VoicesFromTheClassroom }')) {
        const importStatement = `import { VoicesFromTheClassroom } from "@/components/public/VoicesFromTheClassroom";\n`;
        // insert after last import
        const lastImportIdx = newContent.lastIndexOf('import ');
        const newlineAfterImport = newContent.indexOf('\n', lastImportIdx);
        if (newlineAfterImport !== -1) {
            newContent = newContent.slice(0, newlineAfterImport + 1) + importStatement + newContent.slice(newlineAfterImport + 1);
        } else {
            // just put at top
            newContent = importStatement + newContent;
        }
      }
    }
    
    fs.writeFileSync(p, newContent, 'utf8');
    console.log("Updated", p);
  } else {
    console.log("Could not find section in", p);
  }
}
