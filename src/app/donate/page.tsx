import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DonationWizard } from "@/components/public/DonationWizard";

export const metadata = {
  title: "Support Ozeki | Donate to Literacy",
  description: "Support children, teachers, and schools with literacy, phonics training, reading resources, and learner assessment."
};

export default function DonatePage() {
  return (
     <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
       <SiteHeader />

       <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
         {/* Left Side: Campaign Context */}
         <div className="flex flex-col justify-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#006b61]/10 text-[#006b61] font-bold text-xs uppercase tracking-widest mb-6 w-max">
               Ozeki Philanthropy
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#006b61] leading-tight mb-6">
               Shape the future of literacy across Uganda.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
               Your donation helps Ozeki Reading Bridge Foundation support children, teachers, and schools with phonics training, reading resources, teacher coaching, and critical learner assessment.
            </p>

            <div className="space-y-6">
               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#ff7235] font-bold text-xl">📘</span>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Send Reading Resources</h3>
                    <p className="text-gray-500 text-sm">Equip underfunded classrooms with vital phonics readers.</p>
                 </div>
               </div>

               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-500 font-bold text-xl">🎓</span>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Train Rural Educators</h3>
                    <p className="text-gray-500 text-sm">Deploy expert Ozeki Trainers directly to deep-rural districts.</p>
                 </div>
               </div>

               <div className="flex items-start gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-500 font-bold text-xl">🌿</span>
                 </div>
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg">Community Interventions</h3>
                    <p className="text-gray-500 text-sm">Fund localized reading camps and prison literacy outreach.</p>
                 </div>
               </div>
            </div>

            <div className="mt-12 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
               <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">Secure Gateway Providers</p>
               <div className="flex items-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all">
                  <div className="font-black text-lg text-yellow-500 tracking-tighter">MTN Mobile Money</div>
                  <div className="font-black text-lg text-red-600 tracking-tighter">Airtel Money</div>
                  <div className="font-black text-lg text-blue-900 italic">VISA</div>
               </div>
            </div>
         </div>

         {/* Right Side: The Gateway Wizard */}
         <div className="flex items-center">
            <DonationWizard />
         </div>
       </div>

       <SiteFooter />
     </div>
  );
}
