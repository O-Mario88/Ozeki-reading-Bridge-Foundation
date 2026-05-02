import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/portal/finance/Sparkline";

interface Props {
  label: string;
  value: string;
  subline: string;
  deltaPct: number | null;
  /** When true, an upward delta is good; when false, downward is good. */
  deltaPositive?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  cardBg?: string;
  borderColor?: string;
  spark?: number[];
  sparkColor?: string;
  className?: string;
}

export function PortalKpiCard({
  label, value, subline, deltaPct, deltaPositive = true,
  icon: Icon, iconBg, iconColor, cardBg = "#ffffff", borderColor = "#f1f5f9",
  spark, sparkColor, className = "",
}: Props) {
  const isUp = (deltaPct ?? 0) > 0;
  const isFlat = (deltaPct ?? 0) === 0;
  const goodDirection = isFlat ? true : (deltaPositive ? isUp : !isUp);
  const trendColor = goodDirection ? "text-emerald-700" : "text-red-600";
  const TrendIcon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 min-h-[150px] shadow-sm ${className}`}
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {spark && spark.length > 0 && (
          <Sparkline data={spark} color={sparkColor ?? iconColor} width={70} height={26} />
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-1 leading-none tracking-tight">{value}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{subline}</p>
      </div>

      <div className="flex items-center gap-1 text-[11px] mt-auto">
        <span className={`inline-flex items-center gap-0.5 font-bold ${trendColor}`}>
          <TrendIcon className="w-2.5 h-2.5" />
          {deltaPct != null ? `${Math.abs(deltaPct).toFixed(1)}%` : "0%"}
        </span>
      </div>
    </div>
  );
}
