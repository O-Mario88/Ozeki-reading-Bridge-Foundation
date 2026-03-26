const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/app/impact/gallery/page.tsx",
  "src/app/page.tsx",
  "src/app/training/page.tsx",
  "src/components/MediaTestimonialGrid.tsx",
  "src/components/StoryLibraryClient.tsx",
  "src/components/StoryReader.tsx",
  "src/components/blog/ArticleHeaderStandard.tsx",
  "src/components/blog/EditorialArticleBody.tsx",
  "src/components/gallery/PublicGalleryShowcase.tsx",
  "src/components/portal/PortalTestimonialsManager.tsx",
  "src/app/portal/crm/accounts/[id]/page.tsx",
  "src/app/about/leadership-team/page.tsx" // this one also has img inside JSX, so checking just in case
];

let totalFixed = 0;

for (const relPath of filesToFix) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace // eslint-disable... with {/* eslint-disable... */} if it's placed right before a JSX element or `{`
  // A simple regex: <spaces>// eslint-disable... (newline and spaces) <img or {
  
  const imgRegex = /^(\s*)\/\/\s*(eslint-disable-next-line @next\/next\/no-img-element)\s*$/gm;
  content = content.replace(imgRegex, `$1{/* $2 */}`);
  
  // Also check for any
  const anyRegex = /^(\s*)\/\/\s*(eslint-disable-next-line @typescript-eslint\/no-explicit-any)\s*$/gm;
  // We only want to wrap in {/* */} if it's in a JSX block. The most obvious indicator is if the next line starts with `{` or `<` block inside jsx, but the regex above globally replacing `// eslint` to `{/* */}` is safer for these specific 11 files because they were injected strictly inside JSX where they broke next lint.
  // Wait, the `// eslint...` might be outside JSX (e.g. function arguments) where `{/* */}` is invalid!
  
  const lines = content.split('\n');
  let modified = false;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (line.includes('// eslint-disable-next-line @next/next/no-img-element') || 
        (line.includes('// eslint-disable-next-line @typescript-eslint/no-explicit-any') && relPath.includes('[id]/page.tsx'))) {
      
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const rule = line.includes('no-img-element') ? '@next/next/no-img-element' : '@typescript-eslint/no-explicit-any';
      
      // Look at next line
      const nextLine = lines[i+1].trim();
      if (nextLine.startsWith('<img') || nextLine.startsWith('{')) {
         lines[i] = `${indent}{/* eslint-disable-next-line ${rule} */}`;
         modified = true;
         totalFixed++;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, lines.join('\n'));
    console.log(`Fixed JSX render comments in ${relPath}`);
  }
}

console.log('Total fixed: ' + totalFixed);
