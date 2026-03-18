const fs = require('fs');
const file = 'src/components/dashboard/map/PublicImpactMapExplorer.tsx';
let content = fs.readFileSync(file, 'utf8');

const articleRegex = /<article className="card impact-attract-card impact-attract-card--progress">[\s\S]*?<\/article>/;
const match = content.match(articleRegex);

if (match) {
  const articleCode = match[0];
  content = content.replace(articleRegex, '');
  
  const layoutTarget = `<div className="impact-explorer-layout">
        <LocationNavigator
          period={period}
          onPeriodChange={setPeriod}
          selection={selection}
          navigatorSchools={navigatorSchools}
          onSelectionChange={onSelectionChange}
          onReset={onReset}
          onBack={onBack}
        />

        <div className="impact-map-column">
          <UgandaImpactMapPro`;

  const layoutReplacement = `<div className="impact-explorer-layout">
        <div className="impact-explorer-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.52rem' }}>
          <LocationNavigator
            period={period}
            onPeriodChange={setPeriod}
            selection={selection}
            navigatorSchools={navigatorSchools}
            onSelectionChange={onSelectionChange}
            onReset={onReset}
            onBack={onBack}
          />

          <HeadlineStatsPanel
            data={payload}
            loading={loading}
            detailHref={detailHref}
            compact={compact}
          />
        </div>

        <div className="impact-map-column" style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
          {!compact ? (
            ${articleCode}
          ) : null}
          <UgandaImpactMapPro`;

  content = content.replace(layoutTarget, layoutReplacement);
  
  const statsTarget = `
        <HeadlineStatsPanel
          data={payload}
          loading={loading}
          detailHref={detailHref}
          compact={compact}
        />`;
  
  content = content.replace(statsTarget, '');

  fs.writeFileSync(file, content);
  console.log('Successfully rearranged layout');
} else {
  console.log('Could not find progress article');
}
