"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = { slug: "reach-footprint" | "cost-per-beneficiary" };

const TITLES: Record<Props["slug"], string> = {
  "reach-footprint": "Reach footprint",
  "cost-per-beneficiary": "Cost per beneficiary",
};

export function ChartDownloadButton({ slug }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/press/charts/${slug}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setSvg(text);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chart.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const downloadAsPng = async () => {
    if (!svg) return;
    setDownloading(true);
    try {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      const scale = 2; // 2x for retina
      canvas.width = (img.width || 800) * scale;
      canvas.height = (img.height || 480) * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const pngBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) throw new Error("Could not encode PNG");
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `ozeki-${slug}.png`;
      a.click();
      URL.revokeObjectURL(pngUrl);
    } catch {
      // ignore — fall back to SVG download
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ozeki-${slug}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="rounded-2xl bg-white border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-900">{TITLES[slug]}</p>
        <button type="button" onClick={downloadAsPng} disabled={!svg || downloading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#066a67] text-white text-xs font-bold disabled:bg-gray-300">
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PNG
        </button>
      </div>
      <div className="rounded-xl bg-slate-50 border border-gray-100 overflow-hidden aspect-[5/3] flex items-center justify-center">
        {loading ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          : error ? <p className="text-xs text-red-600 px-3">{error}</p>
            : <div ref={containerRef} className="w-full h-full" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />}
      </div>
    </article>
  );
}
