import type { TrendPoint } from "@/lib/server/postgres/repositories/finance-dashboard";

interface Props {
  points: TrendPoint[];
  width?: number;
  height?: number;
}

/**
 * Pure-SVG line chart showing income vs expenses over time. Server-renderable.
 * Stretches to fill the parent (use viewBox + preserveAspectRatio="none").
 */
export function SpendingTrendChart({ points, width = 720, height = 260 }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-gray-400">No spending data yet</p>
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((p) => [p.income, p.expenses]),
  );

  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xStep = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const scaleY = (v: number) => padding.top + innerH - (v / maxValue) * innerH;

  const buildPath = (key: "income" | "expenses") => {
    return points
      .map((p, i) => {
        const x = padding.left + i * xStep;
        const y = scaleY(p[key]);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const buildArea = (key: "income" | "expenses") => {
    const baseY = padding.top + innerH;
    const path = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = scaleY(p[key]);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return `${path} L ${(padding.left + innerW).toFixed(1)} ${baseY} L ${padding.left.toFixed(1)} ${baseY} Z`;
  };

  // Y-axis tick values (4 ticks)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t));
  const fmtAbbrev = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  // X-axis labels: show first, ~25%, ~50%, ~75%, last
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const idx = Math.min(points.length - 1, Math.round((points.length - 1) * t));
    return { idx, point: points[idx] };
  });
  const formatLabel = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // End-of-line totals for income + expense
  const lastIncome = points[points.length - 1].income;
  const lastExpense = points[points.length - 1].expenses;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily income vs expenses trend"
    >
      <defs>
        <linearGradient id="trend-income-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#006b61" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#006b61" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trend-expense-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff7235" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ff7235" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {ticks.map((t, i) => {
        const y = scaleY(t);
        return (
          <g key={`y-${i}`}>
            <line
              x1={padding.left} y1={y}
              x2={padding.left + innerW} y2={y}
              stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === 0 ? "" : "2 4"}
            />
            <text
              x={padding.left - 8} y={y + 4}
              textAnchor="end"
              fontSize="10"
              fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
              fill="#94a3b8"
            >
              {fmtAbbrev(t)}
            </text>
          </g>
        );
      })}

      {/* Filled areas under the lines */}
      <path d={buildArea("income")} fill="url(#trend-income-fill)" />
      <path d={buildArea("expenses")} fill="url(#trend-expense-fill)" />

      {/* Lines */}
      <path d={buildPath("income")} fill="none" stroke="#006b61" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={buildPath("expenses")} fill="none" stroke="#ff7235" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* End-of-line dot + value labels */}
      {[
        { value: lastIncome, color: "#006b61", label: fmtAbbrev(lastIncome) },
        { value: lastExpense, color: "#ff7235", label: fmtAbbrev(lastExpense) },
      ].map((d, i) => {
        const x = padding.left + innerW;
        const y = scaleY(d.value);
        return (
          <g key={`end-${i}`}>
            <circle cx={x} cy={y} r={4} fill="#fff" stroke={d.color} strokeWidth={2} />
            <text
              x={x + 8} y={y + 4}
              fontSize="11"
              fontWeight="700"
              fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
              fill={d.color}
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xLabels.map((l) => {
        const x = padding.left + l.idx * xStep;
        return (
          <text
            key={`x-${l.idx}`}
            x={x} y={padding.top + innerH + 18}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
            fill="#94a3b8"
          >
            {formatLabel(l.point.date)}
          </text>
        );
      })}
    </svg>
  );
}
