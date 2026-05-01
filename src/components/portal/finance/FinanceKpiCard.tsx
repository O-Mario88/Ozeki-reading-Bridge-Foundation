import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "./Sparkline";

interface Props {
  label: string;
  value: string;
  subline: string;
  deltaPct: number | null;
  deltaPositive?: boolean; // true = up is good (default true)
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  spark?: number[];
  sparkColor?: string;
  /** Optional ring visual for percentage-style KPIs (e.g. programme delivery %). */
  ringPct?: number;
  ringColor?: string;
}

export function FinanceKpiCard({
  label,
  value,
  subline,
  deltaPct,
  deltaPositive = true,
  icon: Icon,
  iconBg = "#ecfdf5",
  iconColor = "#006b61",
  spark,
  sparkColor,
  ringPct,
  ringColor = "#006b61",
}: Props) {
  // Direction of the arrow follows the sign of deltaPct, but the colour follows
  // whether that direction is good for this metric. e.g. expenses going up is bad.
  const isUp = (deltaPct ?? 0) >= 0;
  const goodDirection = deltaPositive ? isUp : !isUp;
  const trendColor = goodDirection ? "text-emerald-700" : "text-red-600";
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex flex-col gap-3 min-h-[160px]">
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {ringPct != null ? (
          <RingBadge pct={ringPct} color={ringColor} />
        ) : spark && spark.length > 0 ? (
          <Sparkline data={spark} color={sparkColor ?? iconColor} />
        ) : null}
      </div>

      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-extrabold text-gray-900 mt-1 leading-none tracking-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{subline}</p>
      </div>

      {deltaPct !== null && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
          <span className="text-gray-400">vs last 30 days</span>
        </div>
      )}
    </div>
  );
}

function RingBadge({ pct, color }: { pct: number; color: string }) {
  const size = 48;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#0f172a"
        fontFamily="var(--font-finance-open-sans), system-ui, sans-serif"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
