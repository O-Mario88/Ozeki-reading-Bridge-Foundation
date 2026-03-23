"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface PublicReportDownloaderProps {
  type: "summary" | "audit";
  options: { label: string; value: string }[];
  buttonColor?: string;
  buttonHoverColor?: string;
}

export function PublicReportDownloader({
  type,
  options,
  buttonColor = "bg-[#006b61]",
  buttonHoverColor = "hover:bg-[#006b61]/90"
}: PublicReportDownloaderProps) {
  const [selected, setSelected] = useState(options[0]?.value || "");
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    if (!selected) return;
    setLoading(true);
    
    // Simulate slight delay for UI feedback, then trigger native browser download
    setTimeout(() => {
      window.location.href = `/api/transparency/reports/download?type=${type}&year=${selected}`;
      setLoading(false);
    }, 800);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col w-full">
      <select 
        className="w-full p-3 mb-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#00155F]/20"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button 
        onClick={handleDownload}
        disabled={loading}
        className={`w-full px-6 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-colors ${buttonColor} ${buttonHoverColor} disabled:opacity-70`}
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
        ) : (
          <><Download className="w-5 h-5" /> Download Report</>
        )}
      </button>
    </div>
  );
}
