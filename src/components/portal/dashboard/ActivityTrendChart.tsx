interface Props {
  series: Array<{ date: string; total: number }>;
  width?: number;
  height?: number;
}

/**
 * Single-line area chart for the dashboard's Activity Trend panel.
 * Server-renderable.
 */
export function ActivityTrendChart({ series, width = 720, height = 200 }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400">No activity recorded yet</p>
      </div>
    );
  }

  const maxValue = Math.max(1, ...series.map((p) => p.total));
  const padding = { top: 12, right: 12, bottom: 28, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const xStep = series.length > 1 ? innerW / (series.length - 1) : innerW;
  const scaleY = (v: number) => padding.top + innerH - (v / maxValue) * innerH;

  const lineD = series
    .map((p, i) => {
      const x = padding.left + i * xStep;
      const y = scaleY(p.total);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const baseY = padding.top + innerH;
  const areaD = `${lineD} L ${(padding.left + innerW).toFixed(1)} ${baseY} L ${padding.left.toFixed(1)} ${baseY} Z`;

  // Show ~5 x-axis labels evenly spaced
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const idx = Math.min(series.length - 1, Math.round((series.length - 1) * t));
    return { idx, point: series[idx] };
  });
  const fmtDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Y-axis ticks: 4 evenly-spaced
  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t));

  // Highlighted dots at every ~5th point so the line doesn't feel naked
  const dotIdx = series.map((_, i) => i).filter((i) => i % Math.max(3, Math.floor(series.length / 8)) === 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily activity trend"
    >
      <defs>
        <linearGradient id="activity-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid */}
      {ticksY.map((t, i) => {
        const y = scaleY(t);
        return (
          <g key={`y-${i}`}>
            <line
              x1={padding.left} y1={y}
              x2={padding.left + innerW} y2={y}
              stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === 0 ? "" : "2 4"}
            />
            <text
              x={padding.left - 6} y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
              fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Area + line */}
      <path d={areaD} fill="url(#activity-area-fill)" />
      <path d={lineD} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {dotIdx.map((i) => {
        const x = padding.left + i * xStep;
        const y = scaleY(series[i].total);
        return <circle key={`dot-${i}`} cx={x} cy={y} r={2.5} fill="#10b981" stroke="#fff" strokeWidth={1.5} />;
      })}

      {/* X-axis labels */}
      {ticksX.map((t) => (
        <text
          key={`x-${t.idx}`}
          x={padding.left + t.idx * xStep}
          y={baseY + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
          fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
        >
          {fmtDate(t.point.date)}
        </text>
      ))}
    </svg>
  );
}
