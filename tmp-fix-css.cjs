const fs = require('fs');
let file = 'src/app/globals.css';
let content = fs.readFileSync(file, 'utf8');

// Replace explicit N-column grids with auto-fit logic
content = content.replace(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr))');

// Catch explicit fr declarations without minmax
content = content.replace(/grid-template-columns:\s*repeat\(2,\s*1fr\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(3,\s*1fr\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(4,\s*1fr\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(5,\s*1fr\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr))');
content = content.replace(/grid-template-columns:\s*repeat\(6,\s*1fr\)/g, 'grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr))');

// Add global mobile-first overrides
const globalOverrides = `
/* MOBILE FIRST RESPONSIVE OVERRIDES INJECTED */
@media (max-width: 768px) {
  /* Force sidebars and multi-column layouts to stack on mobile */
  [style*="grid-template-columns: 320px 1fr"],
  [style*="grid-template-columns: 250px 1fr"],
  [style*="grid-template-columns: 300px 1fr"],
  [style*="grid-template-columns: 1fr 300px"],
  [style*="grid-template-columns: minmax(280px, 320px) 1fr"],
  .dashboard-grid, .portal-grid, .layout-grid {
    grid-template-columns: 1fr !important;
  }
}

/* Ensure flexbox rows wrap by default if they have gap, avoiding button overlap */
[style*="display: flex"][style*="gap:"],
[style*="display:flex"][style*="gap:"] {
  flex-wrap: wrap;
}

/* Prevent text overflow in standard UI components */
.ds-card, .card, 
.finance-btn, .button,
td, th,
p, h1, h2, h3, h4, h5, h6, span {
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* Ensure images and inputs shrink cleanly */
input, select, textarea, button, img {
  max-width: 100%;
}

/* Flexible Dashboard Cards Base Fix */
.ds-card, .card {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Force Flex wrappers to not collapse horizontally pushing elements out */
[style*="display: flex"] > * {
  min-width: 0;
}
`;

if (!content.includes('MOBILE FIRST RESPONSIVE OVERRIDES INJECTED')) {
    content += globalOverrides;
}

fs.writeFileSync(file, content);
console.log('Modified globals.css successfully.');
