import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { findResearchDatasetBySlug } from "@/lib/server/postgres/repositories/research-datasets";
import { DatasetDownloadForm } from "./DatasetDownloadForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ResearchDatasetDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const dataset = await findResearchDatasetBySlug(slug);
  if (!dataset || !dataset.isActive) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/research/datasets" className="text-xs font-semibold text-[#066a67] hover:underline inline-flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> All datasets
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{dataset.title}</h1>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mt-2">
            {dataset.datasetType.replace(/_/g, " ")} · {dataset.version}{dataset.fyRange ? ` · ${dataset.fyRange}` : ""}
          </p>
          <p className="text-sm text-gray-700 mt-3">{dataset.description}</p>
          {dataset.doi ? (
            <p className="text-xs text-gray-500 mt-3">DOI: <code className="font-mono">{dataset.doi}</code></p>
          ) : null}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#066a67]" /> License & terms
          </h2>
          <div className="text-sm text-gray-700 space-y-2 leading-relaxed [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: dataset.licenseHtml }} />
        </div>

        <DatasetDownloadForm datasetSlug={dataset.slug} datasetTitle={dataset.title} />
      </section>
    </main>
  );
}
