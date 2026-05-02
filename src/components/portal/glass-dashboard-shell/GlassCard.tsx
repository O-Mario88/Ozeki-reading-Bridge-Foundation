import { ReactNode } from "react";

type Tone = "default" | "soft" | "strong";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  as?: "section" | "div" | "article";
}

const toneClasses: Record<Tone, string> = {
  default:
    "border-white/70 bg-white/55 shadow-[0_22px_60px_rgba(10,10,10,0.10)]",
  soft:
    "border-white/60 bg-white/40 shadow-[0_18px_48px_rgba(10,10,10,0.08)]",
  strong:
    "border-white/75 bg-white/72 shadow-[0_28px_80px_rgba(10,10,10,0.14)]",
};

export function GlassCard({
  children,
  className = "",
  tone = "default",
  as = "section",
}: GlassCardProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        "rounded-[34px] border backdrop-blur-2xl",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

/** Larger, more prominent panel — used for the expanded menu and top-level frame. */
export function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <section
      className={[
        "rounded-[40px] border border-white/70 bg-white/55",
        "shadow-[0_30px_90px_rgba(10,10,10,0.14)]",
        "backdrop-blur-2xl",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
