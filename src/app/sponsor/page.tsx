import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";
import { School, Map, MapPin, Globe } from "lucide-react";

export const metadata = { title: "Sponsor Literacy | OzekiRead" };

const SPONSORSHIP_TIERS = [
  {
    title: "Sponsor a School",
    href: "/sponsor/school",
    icon: School,
    color: "bg-blue-100 text-blue-600",
    description: "Support a single primary school with intensive teacher training, structured phonics resources, and rigorous assessment.",
    impact: "Impacts approx. 400 learners and 12 teachers."
  },
  {
    title: "Sponsor a District",
    href: "/sponsor/district",
    icon: MapPin,
    color: "bg-orange-100 text-[#FA7D15]",
    description: "Scale literacy infrastructure across multiple schools within a designated district. Equip local governments with data.",
    impact: "Impacts up to 15,000 learners across local schools."
  },
  {
    title: "Sponsor a Sub-Region",
    href: "/sponsor/sub-region",
    icon: Map,
    color: "bg-[#006b61]/20 text-[#006b61]",
    description: "Drive systemic literacy shifts mapping multiple districts. Create localized centers of excellence and community reading camps.",
    impact: "Transforms thousands of educators and entire populations."
  },
  {
    title: "Sponsor a Region",
    href: "/sponsor/region",
    icon: Globe,
    color: "bg-purple-100 text-purple-600",
    description: "Fund monumental structural interventions deploying state-of-the-art literacy pipelines throughout major geographic territories.",
    impact: "Generational shift in literacy paradigms."
  }
];

export default function SponsorLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <SiteHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16">
         <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#006b61]/10 text-[#006b61] font-bold text-xs uppercase tracking-widest mb-6">
               Geospatial Philanthropy
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
               Sponsor physical domains of impact.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
               Select your tier to scale structured literacy scaffolding across Uganda. Your sponsorship funds exact deployments of Ozeki frameworks, converting geographical zones into centers of reading excellence.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SPONSORSHIP_TIERS.map((tier) => (
               <Link href={tier.href} key={tier.title} className="group">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${tier.color}`}>
                        <tier.icon className="w-7 h-7" />
                     </div>
                     <h3 className="text-xl font-black text-gray-900 mb-3">{tier.title}</h3>
                     <p className="text-sm text-gray-500 mb-6 flex-1">{tier.description}</p>
                     
                     <div className="p-4 bg-gray-50 rounded-xl mb-6">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Projected Impact</div>
                        <div className="text-xs font-bold text-gray-700">{tier.impact}</div>
                     </div>

                     <div className="text-sm font-bold text-[#006b61] flex items-center gap-2 group-hover:gap-3 transition-all">
                        Configure Sponsorship <span className="text-lg">→</span>
                     </div>
                  </div>
               </Link>
            ))}
         </div>
      </main>

      <SiteFooter />
    </div>
  );
}
