import { ReactNode } from "react";
import { GlassPanel } from "./GlassCard";

interface Props {
  greeting: string;
  subtitle?: string;
  /** Right-aligned controls — typically search, sync indicator, create menu, avatar. */
  controls?: ReactNode;
}

export function GlassTopBar({ greeting, subtitle, controls }: Props) {
  return (
    <GlassPanel className="px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold text-[#111111] tracking-tight leading-tight">
            {greeting}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-[#6B6E76] leading-tight">{subtitle}</p>
          )}
        </div>
        {controls && <div className="md:flex-1 md:max-w-2xl">{controls}</div>}
      </div>
    </GlassPanel>
  );
}
