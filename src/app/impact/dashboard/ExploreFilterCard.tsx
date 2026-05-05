"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Globe, ChevronDown, Loader2 } from "lucide-react";

const TEAL = "#066a67";
const TEAL_SOFT = "#e6f3f2";
const ORANGE = "#ff7235";
const SURFACE = "#ffffff";
const BORDER = "#e7ecf3";
const TEXT = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_SUBTLE = "#94a3b8";
const RADIUS = "14px";
const RADIUS_SM = "8px";
const SHADOW_LOW = "0 1px 2px rgba(15, 23, 42, 0.04)";

const FILTERS: { key: string; label: string; defaultValue: string; options: string[] }[] = [
  { key: "period", label: "Period", defaultValue: "FY 2024/2025", options: ["FY 2024/2025", "FY 2023/2024", "FY 2022/2023", "All time"] },
  { key: "region", label: "Region", defaultValue: "All regions", options: ["All regions", "Central", "Northern", "Eastern", "Western", "West Nile", "Karamoja"] },
  { key: "subRegion", label: "Sub-region", defaultValue: "All sub-regions", options: ["All sub-regions", "Acholi", "Lango", "Teso", "Bukedi", "Bunyoro", "Tooro", "Ankole", "Kigezi", "Buganda"] },
  { key: "district", label: "District", defaultValue: "All districts", options: ["All districts"] },
  { key: "school", label: "School", defaultValue: "All schools", options: ["All schools"] },
];

export function ExploreFilterCard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const initial = Object.fromEntries(
    FILTERS.map((f) => [f.key, searchParams.get(f.key) ?? f.defaultValue]),
  ) as Record<string, string>;
  const [values, setValues] = useState<Record<string, string>>(initial);

  const apply = () => {
    setSubmitting(true);
    const params = new URLSearchParams(searchParams.toString());
    for (const f of FILTERS) {
      const v = values[f.key];
      if (!v || v === f.defaultValue) {
        params.delete(f.key);
      } else {
        params.set(f.key, v);
      }
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setTimeout(() => setSubmitting(false), 300);
  };

  return (
    <article style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: 16, boxShadow: SHADOW_LOW, display: "flex", flexDirection: "column" }}>
      <div className="flex items-start gap-2 mb-3">
        <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, background: TEAL_SOFT, color: TEAL, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Globe className="h-3.5 w-3.5" />
        </span>
        <div>
          <h3 className="text-[14px] font-bold leading-tight" style={{ color: TEXT }}>Explore By Geography</h3>
          <p className="text-[11.5px] mt-0.5" style={{ color: TEXT_MUTED }}>Dive deeper to see impact where it matters.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {FILTERS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEXT_SUBTLE }}>{f.label}</span>
            <div className="relative mt-1">
              <select
                value={values[f.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                aria-label={f.label}
                className="w-full appearance-none px-3 py-2 pr-8 text-[12.5px] cursor-pointer transition hover:border-gray-300"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
              >
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_SUBTLE }} />
            </div>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={apply}
        disabled={submitting}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-bold transition hover:opacity-95 disabled:opacity-60"
        style={{ background: ORANGE, color: "#fff", borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
      >
        {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {submitting ? "Applying…" : "Apply"}
      </button>
    </article>
  );
}
