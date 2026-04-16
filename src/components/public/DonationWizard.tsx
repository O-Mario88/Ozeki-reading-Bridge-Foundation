"use client";
import { useState } from "react";
import { Heart, CreditCard, ShieldCheck, ArrowRight, User } from "lucide-react";

const QUICk_TIERS = [20000, 50000, 100000, 250000, 500000];
const PURPOSES = [
  "General support",
  "Teacher training",
  "Reading materials",
  "Learner assessment",
  "Support a school",
  "Support refugee/community literacy work",
  "Prison literacy support",
  "Other"
];

export function DonationWizard() {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<number | null>(100000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  
  // Specific Intent targets
  const [schoolName, setSchoolName] = useState("");
  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [donorMessage, setDonorMessage] = useState("");

  // Donor Profile
  const [donorType, setDonorType] = useState("Individual");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCustomAmountChange = (e: any) => {
     setAmount(null);
     setCustomAmount(e.target.value.replace(/[^0-9]/g, ''));
  };

  const getFinalAmount = () => amount !== null ? amount : Number(customAmount);

  const handleInitiate = async () => {
    if (getFinalAmount() < 1000) {
      setError("Minimum donation is UGX 1,000.");
      return;
    }
    if (!name && !anonymous) {
      setError("Please provide a name or select Anonymous.");
      return;
    }

    try {
       setLoading(true);
       setError("");
       
       const res = await fetch("/api/payments/pesapal/donation/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             amount: getFinalAmount(),
             purpose,
             schoolName: purpose === 'Support a school' ? schoolName : null,
             schoolDistrict: purpose === 'Support a school' ? schoolDistrict : null,
             message: donorMessage,
             donorType,
             name: anonymous ? 'Anonymous Donor' : name,
             email,
             phone,
             anonymous
          })
       });

       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Gateway initialization failed.");

       // Redirect physically to the Pesapal Banking iframe string mapping
       window.location.href = data.redirectUrl;

    } catch (e: any) {
       setError(e.message);
       setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow-xl shadow-[#006b61]/5 border border-[#006b61]/10 overflow-hidden flex flex-col">
       {/* Wizard Progress Header */}
       <div className="bg-gray-50 border-b p-6 flex items-center justify-between">
          <div className="flex gap-2 items-center">
             <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                \${step >= 1 ? 'bg-[#006b61] text-white' : 'bg-gray-200 text-gray-400'}\`}>1</div>
             <div className={\`w-12 h-1 rounded-full \${step >= 2 ? 'bg-[#006b61]' : 'bg-gray-200'}\`} />
             <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                \${step >= 2 ? 'bg-[#006b61] text-white' : 'bg-gray-200 text-gray-400'}\`}>2</div>
             <div className={\`w-12 h-1 rounded-full \${step >= 3 ? 'bg-[#006b61]' : 'bg-gray-200'}\`} />
             <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                \${step >= 3 ? 'bg-[#006b61] text-white' : 'bg-gray-200 text-gray-400'}\`}>3</div>
          </div>
          <div className="text-[#FA7D15] font-black text-sm uppercase tracking-widest flex items-center gap-1">
             <Heart className="w-4 h-4" /> Donate
          </div>
       </div>

       <div className="p-8 flex-1">
         
         {/* STEP 1: AMOUNT & PURPOSE */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <h2 className="text-2xl font-black text-gray-900 mb-6">Choose an amount</h2>
               
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                 {QUICk_TIERS.map(tier => (
                    <button 
                      key={tier}
                      onClick={() => { setAmount(tier); setCustomAmount(""); }}
                      className={\`py-4 rounded-2xl font-bold text-sm border-2 transition-all
                        \${amount === tier 
                            ? 'border-[#006b61] bg-[#006b61]/5 text-[#006b61]' 
                            : 'border-gray-100 hover:border-gray-200 text-gray-600'}\`}
                    >
                      UGX {(tier/1000)}k
                    </button>
                 ))}
               </div>

               <div className="mb-8">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Or Custom Amount (UGX)</label>
                 <div className="relative">
                   <div className="absolute left-4 top-4 font-bold text-gray-400">UGX</div>
                   <input 
                      type="text" 
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="Enter custom volume..."
                      className={\`w-full pl-14 pr-4 py-4 rounded-xl border-2 font-bold text-lg outline-none
                         \${amount === null ? 'border-[#006b61] bg-white' : 'border-gray-100 bg-gray-50'}\`}
                   />
                 </div>
               </div>

               <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">I want to support</h2>
               <select 
                 value={purpose}
                 onChange={(e) => setPurpose(e.target.value)}
                 className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-700 bg-white mb-6 outline-none hover:border-gray-200 focus:border-[#006b61]"
               >
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
               </select>

               {purpose === "Support a school" && (
                  <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                     <input type="text" placeholder="School Name" value={schoolName} onChange={e=>setSchoolName(e.target.value)} className="w-full p-3 rounded-xl border" />
                     <input type="text" placeholder="District" value={schoolDistrict} onChange={e=>setSchoolDistrict(e.target.value)} className="w-full p-3 rounded-xl border" />
                  </div>
               )}

               <button 
                  onClick={() => setStep(2)}
                  disabled={getFinalAmount() < 1000}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-[#006b61] transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
               >
                  Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
         )}


         {/* STEP 2: DONOR DETAILS */}
         {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <User className="w-6 h-6 text-[#006b61]" /> Donor Profile
               </h2>

               <div className="flex gap-2 mb-6">
                  {['Individual', 'School', 'Partner/Organization'].map(t => (
                     <button
                        key={t}
                        onClick={() => setDonorType(t)}
                        className={\`flex-1 py-2 text-xs font-bold rounded-lg border \${donorType === t ? 'bg-[#006b61]/10 border-[#006b61] text-[#006b61]' : 'border-gray-200 text-gray-500'}\`}
                     >
                        {t}
                     </button>
                  ))}
               </div>

               <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border">
                     <input type="checkbox" id="anon" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} className="w-5 h-5 accent-[#006b61]" />
                     <label htmlFor="anon" className="font-bold text-gray-700 text-sm cursor-pointer">Make my donation Anonymous</label>
                  </div>

                  {!anonymous && (
                     <input 
                        type="text" 
                        placeholder={donorType === 'Individual' ? "Full Name" : "Organization Name"} 
                        value={name} 
                        onChange={e=>setName(e.target.value)} 
                        className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 focus:border-[#006b61] outline-none" 
                     />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                     <input type="email" placeholder="Email Address (For Receipt)" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none" />
                     <input type="tel" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none" />
                  </div>

                  <textarea 
                     placeholder="Optional Message or Dedication..." 
                     value={donorMessage}
                     onChange={e=>setDonorMessage(e.target.value)}
                     className="w-full p-4 rounded-xl border-2 border-gray-100 min-h-[100px] outline-none"
                  />
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-[#006b61] transition-colors">
                     Review Transaction
                  </button>
               </div>
            </div>
         )}


         {/* STEP 3: CHECKOUT REVIEW */}
         {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mb-8 text-center">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Intent Volume</div>
                  <div className="text-4xl font-black text-gray-900 mb-2 font-mono">
                     UGX {getFinalAmount().toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-[#FA7D15]">
                     To: {purpose}
                  </div>
               </div>

               <div className="p-4 bg-blue-50/50 rounded-xl mb-8 flex gap-4 border border-blue-100">
                  <ShieldCheck className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                     <span className="font-bold block mb-1">Secure Architecture</span>
                     Your card details and Mobile Money PIN are processed via End-to-End Encryption physically inside the Pesapal Banking secure iframe. OzekiRead <b>never</b> touches or stores your PIN.
                  </div>
               </div>

               {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-bold mb-6 border border-red-200">
                     {error}
                  </div>
               )}

               <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="px-6 py-4 rounded-2xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200" disabled={loading}>Back</button>
                  <button 
                     onClick={handleInitiate} 
                     disabled={loading}
                     className="flex-1 py-4 bg-[#006b61] text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 group shadow-xl shadow-[#006b61]/20 disabled:opacity-50"
                  >
                     {loading ? 'Securing Gateway...' : 'Initialize Secure Gateway'} 
                     {!loading && <CreditCard className="w-5 h-5 ml-1" />}
                  </button>
               </div>
            </div>
         )}
       </div>
    </div>
  )
}
