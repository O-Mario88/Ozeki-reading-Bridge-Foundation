import type { CoverageBucket } from "@/lib/server/postgres/repositories/portal-dashboard";

interface Props {
  buckets: CoverageBucket[];
  centerPct: number;
  size?: number;
}

/**
 * Donut chart for Program Implementation Coverage. Center renders the
 * "Implementing %" prominently with an "Implementing" label below.
 */
export function ImplementationCoverageDonut({ buckets, centerPct, size = 200 }: Props) {
  const radius = size / 2;
  const innerR = radius * 0.66;
  const cx = radius;
  const cy = radius;

  const total = buckets.reduce((a, b) => a + b.count, 0);
  if (total === 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={radius - 1} fill="none" stroke="#e5e7eb" strokeWidth={radius - innerR} />
        <text
          x={cx} y={cy}
          textAnchor="middle"
          fontSize="13"
          fill="#94a3b8"
          fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
        >
          No data
        </text>
      </svg>
    );
  }

  let cumulative = 0;
  const arcs = buckets.map((b) => {
    const fraction = b.count / total;
    const startAngle = cumulative * 2 * Math.PI;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI;
    return { ...b, startAngle, endAngle };
  });

  const polar = (angle: number, r: number) => {
    const a = angle - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const pathFor = (startAngle: number, endAngle: number) => {
    const outerR = radius - 4;
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

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Program implementation coverage">
      {arcs.map((a, i) => (
        <path key={`arc-${i}`} d={pathFor(a.startAngle, a.endAngle)} fill={a.color} />
      ))}
      <text
        x={cx} y={cy - 4}
        textAnchor="middle"
        fontSize="32"
        fontWeight="800"
        fill="#0f172a"
        fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
      >
        {Math.round(centerPct)}%
      </text>
      <text
        x={cx} y={cy + 18}
        textAnchor="middle"
        fontSize="10"
        fill="#64748b"
        fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
      >
        Implementing
      </text>
    </svg>
  );
}
