interface Props {
  score: number;       // 0-10
  size?: number;
}

/**
 * Big circular gauge for the School Performance Scorecard. Server-renderable.
 * Score arc is the share of 10; colour follows the same band logic as the page.
 */
export function ScorecardGauge({ score, size = 160 }: Props) {
  const clamped = Math.max(0, Math.min(10, score));
  const fraction = clamped / 10;

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const dashOffset = c * (1 - fraction);

  const color =
    clamped >= 8 ? "#10b981" :
    clamped >= 6 ? "#34d399" :
    clamped >= 3 ? "#f59e0b" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Overall score ${clamped} of 10`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 - 2}
        textAnchor="middle"
        fontSize="36"
        fontWeight="800"
        fill="#0f172a"
        fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
      >
        {clamped.toFixed(1)}
      </text>
      <text
        x={size / 2} y={size / 2 + 22}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#64748b"
        letterSpacing="2"
        fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
      >
        OVERALL SCORE
      </text>
    </svg>
  );
}

interface DomainCircleProps {
  score: number;
  size?: number;
  color?: string;
}

/** Smaller per-domain circle gauge. */
export function DomainScoreCircle({ score, size = 56, color }: DomainCircleProps) {
  const clamped = Math.max(0, Math.min(10, score));
  const fraction = clamped / 10;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const dashOffset = c * (1 - fraction);
  const arcColor = color ??
    (clamped >= 8 ? "#10b981" :
     clamped >= 6 ? "#34d399" :
     clamped >= 3 ? "#f59e0b" : "#ef4444");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={arcColor} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fill="#0f172a"
        fontFamily="var(--font-portal-open-sans), system-ui, sans-serif"
      >
        {clamped.toFixed(1)}
      </text>
    </svg>
  );
}
