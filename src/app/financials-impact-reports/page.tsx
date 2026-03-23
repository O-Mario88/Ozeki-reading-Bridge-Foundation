import Link from "next/link";
import { Anchor, ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/public/SectionWrapper";

export const metadata = {
  title: "Financials & Impact Reports",
  description: "Access our published financial transparency documents and annual/program reports.",
};

export default function FinancialsImpactReportsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-gray-100 via-white to-white pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-500 font-semibold text-sm mb-6 shadow-sm border border-gray-100">
            Transparency
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
            Financials &amp; Impact Reports
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We believe in deep accountability. You can access our published financial transparency documents and annual/program report pages directly below.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <SectionWrapper theme="light" id="financial-annual-report">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-sm aspect-square bg-gray-50 rounded-full flex items-center justify-center border-8 border-white shadow-xl relative">
              <div className="absolute inset-0 border border-gray-100 rounded-full m-8 border-dashed animate-spin-slow opacity-50" />
              <Anchor className="w-32 h-32 text-gray-300" />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Choose a report type</h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Review our live ledger summaries, independently audited financial statements, or explore our operational impact on reading outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/transparency/financials" className="px-6 py-4 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md">
                Financial Reports <ArrowRight size={18} />
              </Link>
              <Link href="/impact#reports" className="px-6 py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm">
                Annual &amp; Program Reports
              </Link>
            </div>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
