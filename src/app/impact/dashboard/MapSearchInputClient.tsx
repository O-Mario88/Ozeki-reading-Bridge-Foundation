"use client";

import { useState, type CSSProperties } from "react";
import { Search } from "lucide-react";

const TEXT_SUBTLE = "#94a3b8";

/**
 * District search field for the map panel. Dispatches an
 * orbf-map-search CustomEvent on submit so the map (or any future
 * listener) can react. Press Enter to fire.
 */
export function MapSearchInputClient({ placeholder, style }: { placeholder: string; style: CSSProperties }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const term = value.trim();
    if (!term) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbf-map-search", { detail: { term } }));
    }
  };
  return (
    <div className="relative flex-1 max-w-[260px]">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: TEXT_SUBTLE }} />
      <input
        type="search"
        aria-label="Search district"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        className="w-full pl-8 pr-3 py-1.5 text-[12px]"
        style={style}
      />
    </div>
  );
}
