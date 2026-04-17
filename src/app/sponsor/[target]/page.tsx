import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SponsorshipWizard } from "@/components/public/SponsorshipWizard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Initiate Geospatial Sponsorship | OzekiRead"
};

export default async function SponsorshipDetailPage({ params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  const level = target; // "school", "district", "sub-region", "region"

  if (!["school", "district", "sub-region", "region"].includes(level)) {
      return (
         <div className="min-h-screen flex items-center justify-center p-12 text-center text-gray-400">
            Invalid constraint. Return to <Link href="/sponsor" className="text-[#006b61] ml-1 font-bold">/sponsor</Link>
         </div>
      );
  }

  const getContent = () => {
     if (level === 'school') return {
        title: "Sponsor a specific Primary School.",
        desc: "Drive phenomenal foundational reading infrastructure directly into the community of a single school matrix. Support phonics training, supply libraries, and fund intensive Ozeki assessments.",
     };
     if (level === 'district') return {
        title: "Scale across an entire District.",
        desc: "Multiply your impact. Empower the Local Government by funding widespread systemic change. Saturate multiple schools with structured pedagogy and generate sweeping analytical district reports.",
     };
     if (level === 'sub-region') return {
        title: "Deploy a Sub-Regional Framework.",
        desc: "Architect immense change. Cross district boundaries to create massive centers of reading excellence. Eradicate literacy deserts and build powerful community-driven educational structures.",
     };
     return {
        title: "Fund a multi-district Regional Overhaul.",
        desc: "Transform generations. Execute massive institutional deployments establishing robust long-term reading data frameworks across millions of lives.",
     };
  }

  const content = getContent();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <SiteHeader />

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
         
         <div className="flex flex-col justify-center">
            <Link href="/sponsor" className="text-gray-400 hover:text-gray-900 font-bold text-sm flex items-center gap-2 mb-8 transition-colors w-max">
               <ArrowLeft className="w-4 h-4" /> Back to Parameters
            </Link>

            <div className="inline-block px-4 py-1.5 rounded-full bg-[#006b61]/10 text-[#006b61] font-bold text-xs uppercase tracking-widest mb-6 w-max">
               {level.replace("-", " ")} Level Sponsorship
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
               {content.title}
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
               {content.desc}
            </p>

            <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hidden lg:block">
               <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">Secured Physical Infrastructures</p>
               <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                     <span className="text-green-500">✓</span> High-Fidelity Analytics Generation
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                     <span className="text-green-500">✓</span> Ozeki Cryptographic IPN Protection
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                     <span className="text-green-500">✓</span> Dedicated Geospatial Transparency Ledgers
                  </div>
               </div>
            </div>
         </div>

         <div className="flex items-center">
            <SponsorshipWizard level={level} />
         </div>
      </div>

      <SiteFooter />
    </div>
  );
}
