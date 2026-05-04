import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper, Image as ImageIcon, Download, Quote } from "lucide-react";
import { listFactCheckAttestations, listMediaKitAssets } from "@/lib/server/postgres/repositories/press-desk";
import { listActiveResearchDatasets } from "@/lib/server/postgres/repositories/research-datasets";
import { FactCheckTooltip } from "@/components/public/FactCheckTooltip";
import { ChartDownloadButton } from "@/components/public/ChartDownloadButton";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Press desk · Ozeki Reading Bridge Foundation",
  description:
    "Media kit, downloadable chart PNGs, fact-check tooltips on every public stat, and citation-ready dataset DOIs for journalists and researchers.",
};

export default async function PressDeskPage() {
  const [facts, assets, datasets] = await Promise.all([
    listFactCheckAttestations(),
    listMediaKitAssets(),
    listActiveResearchDatasets(),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider flex items-center gap-1.5">
            <Newspaper className="w-3.5 h-3.5" /> Press desk
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mt-2">
            Everything you need to write the story
          </h1>
          <p className="text-base text-gray-700 mt-3 max-w-3xl">
            Hover any number to see its source, methodology, and sample size. Download our chart
            PNGs and use them with attribution. Cite our datasets by DOI. Email{" "}
            <a href="mailto:press@ozekiread.org" className="text-[#066a67] font-semibold hover:underline">press@ozekiread.org</a>{" "}
            for interviews and on-the-record quotes.
          </p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Fact-check tooltips</h2>
        <p className="text-sm text-gray-600 mb-5">Hover or tap any stat to see its source.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facts.map((fact) => (
            <article key={fact.id} className="rounded-2xl bg-white border border-gray-100 p-5">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{fact.displayLabel}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 inline-flex items-center gap-2">
                {fact.currentValue ?? "—"}
                <FactCheckTooltip
                  source={fact.sourceDescription}
                  methodology={fact.methodology}
                  sampleSize={fact.sampleSize ?? undefined}
                />
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Downloadable charts</h2>
        <p className="text-sm text-gray-600 mb-5">SVG previews; click to save as PNG. Free to publish with attribution.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["reach-footprint", "cost-per-beneficiary"] as const).map((slug) => (
            <ChartDownloadButton key={slug} slug={slug} />
          ))}
        </div>
      </section>

      {assets.length > 0 ? (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Media kit</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assets.map((a) => (
              <li key={a.id} className="rounded-xl bg-white border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{a.assetType}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{a.title}</p>
                    {a.description ? <p className="text-xs text-gray-500 mt-1">{a.description}</p> : null}
                  </div>
                  <a href={a.downloadUrl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#066a67] text-white text-xs font-bold">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Cite our data</h2>
        <ul className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {datasets.map((d) => (
            <li key={d.id} className="px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{d.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {d.version}{d.fyRange ? ` · ${d.fyRange}` : ""}{d.doi ? ` · DOI: ${d.doi}` : " · DOI pending"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/research/datasets/${d.slug}/citation?format=bibtex`} className="text-xs font-semibold text-[#066a67] hover:underline inline-flex items-center gap-1">
                  <Quote className="w-3.5 h-3.5" /> BibTeX
                </a>
                <Link href={`/research/datasets/${d.slug}`} className="text-xs font-semibold text-[#066a67] hover:underline inline-flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Dataset
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
