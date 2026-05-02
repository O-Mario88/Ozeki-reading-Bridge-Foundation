import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "@/components/portal/finance/Sparkline";

interface Props {
  label: string;
  value: string;
  subline: string;
  deltaPct: number | null;
  deltaPositive?: boolean;
  icon: LucideIcon;
  /** Optional sparkline series. */
  spark?: number[];
  /** Optional ring percentage (0–100) — used for programme delivery KPI. */
  ringPct?: number;
}

/**
 * Glassprism-themed KPI card for the finance dashboard. Same data API as the
 * legacy FinanceKpiCard but rendered with frosted glass + monochrome icons.
 * Sparkline / ring colours follow the metric's direction (success green for
 * good moves, red for bad), keeping data meaning intact.
 */
export function GlassFinanceKpiCard({
  label,
  value,
  subline,
  deltaPct,
  deltaPositive = true,
  icon: Icon,
  spark,
  ringPct,
}: Props) {
  const isUp = (deltaPct ?? 0) >= 0;
  const goodDirection = deltaPositive ? isUp : !isUp;
  const trendColor = goodDirection ? "text-[#0F8F6B]" : "text-[#DC2626]";
  const accentColor = goodDirection ? "#0F8F6B" : "#DC2626";
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="rounded-[28px] border border-white/65 bg-white/60 backdrop-blur-xl shadow-[0_18px_48px_rgba(10,10,10,0.08)] p-5 flex flex-col gap-3 min-h-[170px]">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/70 bg-white/80 text-[#111111] shadow-[0_6px_16px_rgba(10,10,10,0.06)]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        {ringPct != null ? (
          <RingBadge pct={ringPct} />
        ) : spark && spark.length > 0 ? (
          <Sparkline data={spark} color={accentColor} />
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#5A5D63] uppercase tracking-[0.08em] truncate">
          {label}
        </p>
        <p className="text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold text-[#111111] mt-1 leading-none tracking-tight truncate">
          {value}
        </p>
        <p className="text-[12px] text-[#6B6E76] mt-1 truncate">{subline}</p>
      </div>

      {deltaPct !== null && (
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
            <TrendIcon className="h-3 w-3" strokeWidth={2} />
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
          <span className="text-[#6B6E76]">vs last 30 days</span>
        </div>
      )}
    </article>
  );
}

function RingBadge({ pct }: { pct: number }) {
  const size = 48;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#14141414" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#111111" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#111111"
        fontFamily="var(--font-glass-dashboard), system-ui, sans-serif"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
