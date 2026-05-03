
import { getPublicImpactAggregate } from "@/services/dataService";
import { PageHero } from "@/components/public/PageHero";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { Info, ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Methodology",
  description:
    "Indicator definitions, reading-level rules, data quality, and privacy safeguards for Ozeki public impact reporting.",
};

export const revalidate = 300;

function formatDate(value: string | null | undefined) {
  if (!value) return "Data not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data not available";
  return parsed.toLocaleString();
}

export default async function MethodologyPage() {
  const aggregate = await getPublicImpactAggregate("country", "Uganda", "FY");
  const toolVersion = aggregate.readingLevels?.definition_version || "RLv1.0";

  return (
    <div className="pt-[72px] md:pt-20">
      <PageHero
        tagline="How We Measure"
        title="Impact Methodology"
        subtitle="Simple definitions, transparent limits, and privacy-protected public reporting."
        imageSrc="/photos/PXL_20260217_124415441.MP.jpg"
      />

      <SectionWrapper theme="charius-beige">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6">
              <Info size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Indicators</h2>
            <ul className="space-y-3 text-gray-500">
              <li className="flex gap-2"><strong>Letter sounds:</strong> ability to identify and produce target phonemes.</li>
              <li className="flex gap-2"><strong>Decoding:</strong> ability to blend sounds to read real and made-up words.</li>
              <li className="flex gap-2"><strong>Fluency:</strong> story reading pace and accuracy in connected text.</li>
              <li className="flex gap-2"><strong>Comprehension:</strong> ability to answer meaning questions from read text.</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 rounded-xl bg-[#ff7235]/10 text-[#ff7235] flex items-center justify-center mb-6">
              <RefreshCw size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Reading Levels</h2>
            <ul className="space-y-3 text-gray-500">
              <li>Classification uses versioned rules: <strong className="text-[#111]">{toolVersion}</strong>.</li>
              <li>Levels are computed from observed reading-domain performance bands.</li>
              <li>Movement compares matched learners across baseline and endline/latest cycles.</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6">
              <Info size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Sample Size (n)</h2>
            <ul className="space-y-3 text-gray-500">
              <li>Unique learners included in the selected aggregate scope.</li>
              <li>Current FY country sample: <strong className="text-[#111]">{aggregate.meta.sampleSize.toLocaleString()}</strong>.</li>
              <li>Larger n improves confidence and reduces volatility of reported percentages.</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 rounded-xl bg-[#006b61]/10 text-[#006b61] flex items-center justify-center mb-6">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Privacy & Safety</h2>
            <ul className="space-y-3 text-gray-500">
              <li>Public views are aggregated and read-only.</li>
              <li>No learner identities or personal child data are published.</li>
              <li>Role-based controls protect internal detail views and staff workflows.</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col" withHover>
            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6">
              <RefreshCw size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Update Handling</h2>
            <ul className="space-y-3 text-gray-500">
              <li>Current tool/rule version: <strong className="text-[#111]">{toolVersion}</strong>.</li>
              <li>Version changes are disclosed in data trust widgets and reports.</li>
              <li>Last aggregate refresh: <strong className="text-[#111]">{formatDate(aggregate.meta.lastUpdated)}</strong>.</li>
            </ul>
          </PremiumCard>

          <PremiumCard variant="charius" className="p-8 flex flex-col border-red-100 bg-red-50" withHover>
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-500 flex items-center justify-center mb-6">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-2xl font-bold text-[#111] mb-4">Limitations</h2>
            <ul className="space-y-3 text-gray-500">
              <li>Incomplete baseline/endline coverage reduces trend confidence.</li>
              <li>Some scope-period combinations may show "Data not available".</li>
              <li>Comparisons are constrained to verified submissions in the selected period.</li>
            </ul>
          </PremiumCard>
        </div>
      </SectionWrapper>

      <CTAStrip 
        heading="Explore Live Impact Data"
        subheading="See our methodology applied in real-time across districts and schools in Uganda."
        primaryButtonText="Open Live Impact Dashboard"
        primaryButtonHref="/impact/dashboard"
        secondaryButtonText="View Reports"
        secondaryButtonHref="/impact#reports"
        theme="charius"
      />
    </div>
  );
}
