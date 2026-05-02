import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
}

export function GlassQuickAction({ icon: Icon, title, subtitle, href }: Props) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/60 px-4 py-3.5 backdrop-blur-xl shadow-[0_14px_36px_rgba(10,10,10,0.07)] hover:bg-white/80 transition"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/70 bg-white/80 text-[#111111] shadow-[0_8px_18px_rgba(10,10,10,0.06)] shrink-0">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-[#111111] leading-tight truncate">{title}</p>
        <p className="text-[12px] text-[#6B6E76] leading-tight mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 text-[#9aa0a6] group-hover:text-[#202124] transition shrink-0"
        strokeWidth={2}
      />
    </Link>
  );
}
