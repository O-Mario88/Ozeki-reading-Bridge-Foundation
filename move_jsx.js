const fs = require('fs');
const file = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(file, 'utf8');

const articleRegex = /<article className="card impact-attract-card impact-attract-card--progress">[\s\S]*?<\/article>/;
const match = content.match(articleRegex);

if (match) {
  const articleCode = match[0];
  content = content.replace(articleRegex, '');
  
  // Now we need to insert it inside impact-map-column
  content = content.replace(
    '<div className="impact-map-column">',
    `<div className="impact-map-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>\n          {!compact ? (\n${articleCode}\n          ) : null}`
  );
  
  // Also we need to wrap LocationNavigator and HeadlineStatsPanel in a left column
  const leftColRegex = /<LocationNavigator[\s\S]*?\/>/;
  const statsRegex = /<HeadlineStatsPanel[\s\S]*?\/>/;
  
  const navMatch = content.match(leftColRegex);
  const statsMatch = content.match(statsRegex);
  
  if (navMatch && statsMatch) {
    content = content.replace(navMatch[0], '');
    content = content.replace(statsMatch[0], '');
    
    content = content.replace(
      '<div className="impact-explorer-layout">',
      `<div className="impact-explorer-layout">\n        <div className="impact-explorer-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>\n          ${navMatch[0]}\n          ${statsMatch[0]}\n        </div>`
    );
  }
  
  fs.writeFileSync(file, content);
  console.log('Successfully rearranged layout layout');
} else {
  console.log('Could not find progress article');
}
