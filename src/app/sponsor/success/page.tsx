import Link from "next/link";
import { SectionWrapper } from "@/components/public/SectionWrapper";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SponsorSuccessPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const amount = resolvedParams.amount || "250,000";
  const currency = resolvedParams.currency || "UGX";
  const donorName = resolvedParams.name || "valued partner";

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-20">
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 ring-1 ring-emerald-50">
            
            {/* Success Header */}
            <div className="bg-emerald-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                  <span className="text-4xl">✓</span>
                </div>
                <h1 className="text-3xl font-display font-bold">Payment Confirmed</h1>
                <p className="mt-2 text-emerald-100 font-medium">Reference: {resolvedParams.ref || 'OZ-CONF-882'}</p>
              </div>
            </div>

            <div className="p-8 md:p-12">
              
              <div className="space-y-8">
                
                {/* Formal Message from PRD */}
                <div className="prose prose-lg text-slate-700 max-w-none">
                  <p className="font-bold text-2xl text-emerald-900 border-b pb-4">
                    Your payment of {currency} {amount} has been received successfully.
                  </p>
                  
                  <div className="mt-8 space-y-6 text-[1.1rem]">
                    <p className="font-bold text-slate-900 text-xl">
                      You have chosen to invest in excellence for your school.
                    </p>
                    
                    <p className="bg-slate-50 p-6 rounded-2xl border-l-4 border-amber-500 text-slate-600 italic leading-relaxed">
                      "This investment reflects excellence, vision, and a commitment to giving your learners the quality they deserve. By taking this step, you are not simply making a payment — you are choosing a higher standard for your school’s future.
                      <br/><br/>
                      We are truly honored by your trust and delighted to support a decision that speaks of leadership, prestige, and lasting impact."
                    </p>

                    <p className="text-slate-500 text-sm">
                      A formal receipt has been dispatched to your email address. 
                      Dear {donorName}, thank you for choosing OzekiRead.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
                  <Link href="/portal/analytics" className="ozeki-btn ozeki-btn-primary flex-1 text-center py-4">
                    View Impact Dashboard
                  </Link>
                  <Link href="/" className="ozeki-btn ozeki-btn-secondary flex-1 text-center py-4">
                    Return Home
                  </Link>
                </div>

              </div>

            </div>

          </div>

          <p className="text-center text-slate-400 mt-8 text-sm">
            Need assistance? Contact our finance desk at <span className="font-bold">support@ozekiread.org</span>
          </p>

        </div>
      </SectionWrapper>
    </div>
  );
}
