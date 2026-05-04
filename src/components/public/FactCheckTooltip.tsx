"use client";

import { useState } from "react";
import { Info } from "lucide-react";

type Props = {
  source: string;
  methodology: string;
  sampleSize?: string;
};

export function FactCheckTooltip({ source, methodology, sampleSize }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        aria-label="Source and methodology"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-[#066a67]/10 text-gray-500 hover:text-[#066a67] focus:outline-none focus:ring-2 focus:ring-[#066a67]/40"
      >
        <Info className="w-3 h-3" />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-xl bg-gray-900 text-white p-3 shadow-lg text-[11px] leading-relaxed text-left"
        >
          <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Source</span>
          <span className="block">{source}</span>
          <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mt-2 mb-1">Methodology</span>
          <span className="block">{methodology}</span>
          {sampleSize ? (
            <>
              <span className="block text-[9px] font-bold text-emerald-300 uppercase tracking-wider mt-2 mb-1">Sample</span>
              <span className="block">{sampleSize}</span>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
