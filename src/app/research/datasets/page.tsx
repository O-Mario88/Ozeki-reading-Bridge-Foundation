import Link from "next/link";
import type { Metadata } from "next";
import { Database, FileText, ScrollText } from "lucide-react";
import { listActiveResearchDatasets } from "@/lib/server/postgres/repositories/research-datasets";

export const dynamic = "force-dynamic";
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Research datasets · Ozeki Reading Bridge",
  description: "Anonymised microdata releases for researchers, journalists, and peer NGOs.",
};

export default async function ResearchDatasetsCatalogPage() {
  const datasets = await listActiveResearchDatasets();
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Open data
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mt-2">Research datasets</h1>
          <p className="text-base text-gray-700 mt-3 max-w-3xl">
            Anonymised microdata extracted directly from the live database. Names removed, school
            IDs hashed, dates truncated to school term. CC-BY-NC unless otherwise stated.
          </p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-5">
        {datasets.length === 0 ? (
          <p className="text-sm text-gray-500">No datasets are published yet.</p>
        ) : (
          datasets.map((d) => (
            <article key={d.id} className="rounded-2xl bg-white border border-gray-100 p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{d.title}</h2>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">
                    {d.datasetType.replace(/_/g, " ")} · {d.version}{d.fyRange ? ` · ${d.fyRange}` : ""}
                  </p>
                </div>
                <FileText className="w-5 h-5 text-[#066a67]" />
              </div>
              <p className="text-sm text-gray-700">{d.description}</p>
              {d.doi ? (
                <p className="text-[11px] text-gray-500 mt-3">DOI: <code>{d.doi}</code></p>
              ) : null}
              <Link href={`/research/datasets/${d.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#066a67] hover:underline">
                <ScrollText className="w-4 h-4" /> Review license & download
              </Link>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
