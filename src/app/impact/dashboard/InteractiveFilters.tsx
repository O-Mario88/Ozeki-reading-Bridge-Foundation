"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileText, Download, Share2, Check } from "lucide-react";

const TEAL    = "#066a67";
const SURFACE = "#ffffff";
const BORDER  = "#e7ecf3";
const TEXT       = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_SUBTLE = "#94a3b8";
const TEAL_SOFT = "#e6f3f2";
const RADIUS_SM = "8px";
const SHADOW_LOW = "0 1px 2px rgba(15, 23, 42, 0.04)";
const SHADOW_HIGH = "0 12px 40px rgba(15, 23, 42, 0.12)";

type FilterKey = "year" | "view" | "program" | "geography";

interface FilterDef {
  key: FilterKey;
  label: string;
  default: string;
  options: string[];
}

const FILTERS: FilterDef[] = [
  { key: "year",      label: "Year",      default: "FY 2024/2025", options: ["FY 2024/2025", "FY 2023/2024", "FY 2022/2023", "FY 2021/2022", "All time"] },
  { key: "view",      label: "View",      default: "All Metrics",  options: ["All Metrics", "Outcomes only", "Implementation only", "Quality only"] },
  { key: "program",   label: "Program",   default: "All Programs", options: ["All Programs", "Phonics Training", "Teacher Development", "In-School Coaching", "Reading Assessments", "Reading Materials"] },
  { key: "geography", label: "Geography", default: "Uganda",       options: ["Uganda", "Central", "Northern", "Eastern", "Western", "West Nile", "Karamoja"] },
];

/* ──────────────────────────────────────────────────────────────────── */

export function InteractiveFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const [shareOk, setShareOk] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Read current values from URL with sensible defaults.
  const values = Object.fromEntries(
    FILTERS.map((f) => [f.key, searchParams.get(f.key) ?? f.default])
  ) as Record<FilterKey, string>;

  // Click outside closes any open dropdown.
  useEffect(() => {
    if (!openKey) return;
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openKey]);

  // Close on Escape.
  useEffect(() => {
    if (!openKey) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenKey(null);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openKey]);

  function applyFilter(key: FilterKey, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const def = FILTERS.find((f) => f.key === key)!.default;
    if (value === def) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpenKey(null);
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ozeki Reading Bridge — Public Live Impact Dashboard", url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareOk(true);
      setTimeout(() => setShareOk(false), 1800);
    } catch {
      // user cancelled or unsupported — silently no-op
    }
  }

  function handleDownload() {
    // Same browser print → "Save as PDF" workflow used elsewhere in
    // the portal until the dedicated PDF export endpoint is wired.
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div ref={wrapperRef} className="flex flex-wrap items-center gap-2 lg:justify-end -mx-1 px-1 overflow-x-auto lg:overflow-visible relative">
      {FILTERS.map((f) => (
        <FilterDropdown
          key={f.key}
          def={f}
          value={values[f.key]}
          isOpen={openKey === f.key}
          onToggle={() => setOpenKey((cur) => (cur === f.key ? null : f.key))}
          onSelect={(v) => applyFilter(f.key, v)}
        />
      ))}

      <span className="mx-1 hidden lg:inline-block w-px h-7 bg-gray-200" />

      <a
        href="/transparency"
        className="inline-flex items-center gap-2 h-9 px-4 text-[12px] font-semibold transition hover:bg-gray-50"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: TEXT }}
      >
        <FileText className="h-3.5 w-3.5" strokeWidth={2.25} /> Open Report
      </a>
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-2 h-9 px-4 text-[12px] font-semibold text-white transition hover:opacity-90"
        style={{ background: TEAL, borderRadius: RADIUS_SM, boxShadow: SHADOW_LOW }}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2.25} /> Download PDF
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 h-9 px-4 text-[12px] font-semibold transition hover:bg-gray-50 min-w-[88px] justify-center"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, color: shareOk ? TEAL : TEXT }}
      >
        {shareOk ? (
          <>
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Copied
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" strokeWidth={2.25} /> Share
          </>
        )}
      </button>
    </div>
  );
}

interface FilterDropdownProps {
  def: FilterDef;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (v: string) => void;
}

function FilterDropdown({ def, value, isOpen, onToggle, onSelect }: FilterDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 h-9 px-3.5 text-[12px] font-semibold transition"
        style={{
          background: SURFACE,
          border: `1px solid ${isOpen ? TEAL : BORDER}`,
          borderRadius: RADIUS_SM,
          color: TEXT,
          boxShadow: isOpen ? `0 0 0 3px ${TEAL_SOFT}` : "none",
        }}
      >
        <span style={{ color: TEXT_SUBTLE }}>{def.label}:</span>
        {value}
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform"
          style={{ color: TEXT_SUBTLE, transform: isOpen ? "rotate(180deg)" : "none" }}
          strokeWidth={2.25}
        />
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 min-w-[200px] py-1.5 right-0"
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS_SM, boxShadow: SHADOW_HIGH }}
        >
          {def.options.map((opt) => {
            const selected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(opt)}
                className="flex items-center justify-between w-full text-left px-3 h-8 text-[12.5px] transition hover:bg-gray-50"
                style={{ color: selected ? TEAL : TEXT, fontWeight: selected ? 600 : 500 }}
              >
                {opt}
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: TEAL }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

/** Hook used by panels that want to react to current filter values.
 *  Returns the same defaults that InteractiveFilters writes to the URL. */
export function useDashboardFilters(): Record<FilterKey, string> {
  const searchParams = useSearchParams();
  return Object.fromEntries(
    FILTERS.map((f) => [f.key, searchParams.get(f.key) ?? f.default])
  ) as Record<FilterKey, string>;
}

export { TEXT_MUTED };
