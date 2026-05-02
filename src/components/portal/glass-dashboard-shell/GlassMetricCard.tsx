import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  label: string;
  value: string;
  subline?: string;
  icon?: LucideIcon;
  /** Positive % up = good. For inverse metrics (e.g. "Not Implementing"), pass deltaPositive=false. */
  deltaPct?: number | null;
  deltaPositive?: boolean;
  /** Tiny status dot color (used sparingly) */
  accentDot?: string;
  className?: string;
}

export function GlassMetricCard({
  label,
  value,
  subline,
  icon: Icon,
  deltaPct,
  deltaPositive = true,
  accentDot,
  className = "",
}: Props) {
  const hasDelta = deltaPct != null && Number.isFinite(deltaPct);
  const goodDir = (deltaPct ?? 0) >= 0 ? deltaPositive : !deltaPositive;
  const deltaColor = goodDir ? "text-[#0F8F6B]" : "text-[#DC2626]";

  return (
    <article
      className={[
        "group rounded-[28px] border border-white/65 bg-white/60",
        "shadow-[0_18px_48px_rgba(10,10,10,0.08)] backdrop-blur-xl",
        "px-5 py-4 flex flex-col gap-3 min-w-0",
        className,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/70 bg-white/70 text-[#202124] shadow-[0_6px_16px_rgba(10,10,10,0.06)] shrink-0">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          )}
          <p
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5A5D63] leading-tight truncate min-w-0"
            title={label}
          >
            {label}
          </p>
        </div>
        {accentDot && (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: accentDot }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex items-baseline gap-2 min-w-0">
        <p className="text-[28px] sm:text-[34px] font-extrabold leading-none text-[#111111] truncate">
          {value}
        </p>
        {hasDelta && (
          <span className={`inline-flex items-center text-[11px] font-bold ${deltaColor}`}>
            {(deltaPct ?? 0) >= 0 ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2} />
            )}
            {Math.abs(deltaPct ?? 0).toFixed(0)}%
          </span>
        )}
      </div>

      {subline && (
        <p className="text-[12px] text-[#6B6E76] leading-tight">{subline}</p>
      )}
    </article>
  );
}
