import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sponsor a School or District | OzekiRead",
  description: "Invest in literacy excellence. Sponsor schools or entire districts in Uganda through OzekiRead's transparent funding ecosystem.",
};

export default function SponsorshipHub() {
  const sponsorshipTiers = [
    {
      id: "school",
      title: "Sponsor a School",
      price: "$250",
      description: "Equip a single school with complete structured phonics mastery packs, teacher coaching, and baseline assessments.",
      features: [
        "100+ decodable readers",
        "Expert teacher training (2 days)",
        "Direct school impact report"
      ],
      href: "/sponsor/payment?type=school",
      highlight: false
    },
    {
      id: "district",
      title: "Sponsor a District",
      price: "$15,000",
      description: "Scale literacy interventions across a focused district. Support an entire cluster of schools synchronously.",
      features: [
        "Reach up to 60 Schools",
        "Mass Teacher capacity building",
        "Quarterly District-level KPIs",
        "VIP Partner Dashboard access"
      ],
      href: "/sponsor/payment?type=district",
      highlight: true
    },
    {
      id: "region",
      title: "Sub-Region Partner",
      price: "$75,000",
      description: "Macro-level implementation driving systemic change across entire Uganda regional demographics.",
      features: [
        "Policy & Ministry Alignment",
        "Comprehensive Telemetry Data",
        "Dedicated Ozeki Program Manager"
      ],
      href: "/sponsor/payment?type=region",
      highlight: false
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="bg-ozeki-dark text-white pt-24 pb-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 to-ozeki-dark z-0" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <span className="ozeki-badge bg-emerald-900 text-emerald-100 ring-1 ring-emerald-700/50 mb-6">Partners in Literacy</span>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight mb-6 text-white">
            Invest in Educational Excellence
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto font-medium">
            Your sponsorship translates directly to books in hands and expert coaches in classrooms. Transparent, measurable, and highly scalable.
          </p>
        </div>
      </section>

      {/* Interactive Pricing Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 -mt-12 relative z-20">
        <div className="grid grid-cols-1 mb-16 md:grid-cols-3 gap-8 items-stretch">
          {sponsorshipTiers.map((tier) => (
            <div key={tier.id} className={`ozeki-card flex flex-col relative ${tier.highlight ? 'border-amber-400 ring-1 ring-amber-400 shadow-xl scale-105' : ''}`}>
              {tier.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Highest Impact
                </div>
              )}
              <h3 className="text-2xl font-display font-bold text-slate-900">{tier.title}</h3>
              <div className="my-4">
                <span className="text-4xl font-extrabold text-ozeki-primary">{tier.price}</span>
                <span className="text-slate-500 font-medium ml-1">/ project</span>
              </div>
              <p className="text-slate-600 mb-6 flex-grow">{tier.description}</p>
              
              <ul className="space-y-3 mb-8 border-t border-slate-100 pt-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 font-medium">
                    <span className="text-emerald-600">✓</span> {feature}
                  </li>
                ))}
              </ul>
              
              <Link 
                href={tier.href} 
                className={`ozeki-btn w-full justify-center ${tier.highlight ? 'ozeki-btn-primary' : 'ozeki-btn-secondary border-2 border-slate-200'}`}
              >
                Fund this Level
              </Link>
            </div>
          ))}
        </div>
        
        {/* Custom Or General Donation */}
        <div className="ozeki-card max-w-3xl mx-auto text-center border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <span className="text-4xl mb-4 block">🌱</span>
          <h2 className="text-2xl font-bold font-display text-slate-900 mb-3">Custom Sponsorship</h2>
          <p className="text-slate-600 mb-6 px-4">
            Want to sponsor particular schools in your home village? Or make a general donation towards our operational trust? Enter a custom amount.
          </p>
          <Link href="/sponsor/payment?type=custom" className="ozeki-btn ozeki-btn-primary px-8">
            Make a Custom Donation
          </Link>
        </div>
      </section>

    </div>
  );
}
