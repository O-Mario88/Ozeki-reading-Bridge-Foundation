import type { AllocationSlice } from "@/lib/server/postgres/repositories/finance-dashboard";

interface Props {
  totalSpent: number;
  slices: AllocationSlice[];
  size?: number;
}

/**
 * SVG donut chart with center label. Server-renderable.
 */
export function FundAllocationDonut({ totalSpent, slices, size = 220 }: Props) {
  const radius = size / 2;
  const innerR = radius * 0.62;
  const cx = radius;
  const cy = radius;

  // Fall back to a neutral grey ring when there's no data
  if (slices.length === 0 || totalSpent <= 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: size, width: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle cx={cx} cy={cy} r={radius - 1} fill="none" stroke="#e5e7eb" strokeWidth={radius - innerR} />
          <text
            x={cx} y={cy}
            textAnchor="middle"
            fontSize="13"
            fill="#94a3b8"
            fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
          >
            No data
          </text>
        </svg>
      </div>
    );
  }

  // Build arc paths. Each slice gets startAngle → endAngle.
  let cumulative = 0;
  const arcs = slices.map((s) => {
    const fraction = s.amount / totalSpent;
    const startAngle = cumulative * 2 * Math.PI;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI;
    return { ...s, startAngle, endAngle, fraction };
  });

  const polar = (angle: number, r: number) => {
    // SVG: 0 = right, we want 0 at top → rotate -90deg.
    const a = angle - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const pathFor = (startAngle: number, endAngle: number) => {
    const outerR = radius - 2;
    const startOuter = polar(startAngle, outerR);
    const endOuter = polar(endAngle, outerR);
    const startInner = polar(endAngle, innerR);
    const endInner = polar(startAngle, innerR);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
      `L ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  };

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Fund allocation breakdown">
      {arcs.map((a, i) => (
        <path key={`arc-${i}`} d={pathFor(a.startAngle, a.endAngle)} fill={a.color} />
      ))}
      <text
        x={cx} y={cy - 6}
        textAnchor="middle"
        fontSize="20"
        fontWeight="800"
        fill="#0f172a"
        fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
      >
        {fmt(totalSpent)}
      </text>
      <text
        x={cx} y={cy + 14}
        textAnchor="middle"
        fontSize="11"
        fill="#64748b"
        fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
      >
        Total Spent
      </text>
    </svg>
  );
}
