"use client";
import { useState } from "react";
import { CreditCard, ShieldCheck, ArrowRight, User, MapPin } from "lucide-react";

export function SponsorshipWizard({ level }: { level: string }) {
  const isSchool = level === "school";
  const isDistrict = level === "district";
  const isSubRegion = level === "sub-region";


  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<string>(isSchool ? "500000" : isDistrict ? "5000000" : isSubRegion ? "15000000" : "50000000");

  const [focus, setFocus] = useState("Full school literacy support package");

  // Geographic specific parameters
  const [targetName, setTargetName] = useState("");
  const [schoolCount, setSchoolCount] = useState<number | string>("");

  // Donor Profile
  const [donorType, setDonorType] = useState("Organization");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Uganda");
  const [donorMessage, setDonorMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInitiate = async () => {
    if (Number(amount) < 50000) {
      setError("Minimum geographic sponsorship is UGX 50,000.");
      return;
    }
    if (!name && !anonymous) {
      setError("Please provide an Organization/Name or select Anonymous.");
      return;
    }
    if (!targetName) {
      setError(`Please define the target ${level} name.`);
      return;
    }

    try {
       setLoading(true);
       setError("");
       
       const res = await fetch("/api/payments/pesapal/sponsor/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             sponsorshipType: level,
             sponsorshipTargetName: targetName,
             amount: Number(amount),
             sponsorshipFocus: focus,
             donorType,
             name: anonymous ? 'Anonymous Sponsor' : name,
             email,
             phone,
             country,
             message: donorMessage,
             anonymous
          })
       });

       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Gateway initialization failed.");

       window.location.href = data.redirectUrl;

    } catch (e: unknown) {
       setError(e instanceof Error ? e.message : "Gateway initialization failed.");
       setLoading(false);
    }
  };

  const getFormatTitle = () => {
     if(isSchool) return "Sponsor a specific School";
     if(isDistrict) return "Sponsor an entire District";
     if(isSubRegion) return "Sponsor a Sub-Region";
     return "Sponsor a Macro Region";
  }

  const FOCUS_OPTIONS = [
     "Full school literacy support package",
     "General literacy support",
     "Teacher training",
     "Reading materials & Flashcards",
     "Learner assessment",
     "Refugee/community literacy support"
  ];

  return (
    <div className="w-full bg-white rounded-3xl shadow-md border overflow-hidden flex flex-col">
       <div className="bg-gray-50 border-b p-6 flex flex-col items-center justify-center text-center">
          <div className="text-[#ff7235] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-1 mb-2">
             <MapPin className="w-4 h-4" /> GEOSPATIAL GATEWAY
          </div>
          <h2 className="text-2xl font-black text-gray-900">{getFormatTitle()}</h2>
       </div>

       <div className="p-8 flex-1">
         {/* STEP 1: CONSTRAINTS */}
         {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               
               <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Target {level} Demographics</h2>
               <div className="space-y-4 mb-6">
                  <input 
                     type="text" 
                     placeholder={`Enter Name of ${level}...`} 
                     value={targetName} onChange={e=>setTargetName(e.target.value)} 
                     className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold outline-none focus:border-[#006b61]" 
                  />
                  {!isSchool && (
                     <input 
                        type="number" 
                        placeholder="Estimated quantity of schools to impact" 
                        value={schoolCount} onChange={e=>setSchoolCount(e.target.value)} 
                        className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold outline-none focus:border-[#006b61]" 
                     />
                  )}
               </div>

               <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Sponsorship Focus Area</h2>
               <select 
                 value={focus} onChange={(e) => setFocus(e.target.value)}
                 className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-700 bg-white mb-6 outline-none hover:border-gray-200 focus:border-[#006b61]"
               >
                  {FOCUS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
               </select>

               <div className="mb-8">
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Calculated Provision Volume (UGX)</label>
                 <div className="relative">
                   <div className="absolute left-4 top-4 font-bold text-gray-400">UGX</div>
                   <input 
                      type="text" 
                      value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-14 pr-4 py-4 rounded-xl border-2 border-[#006b61] font-black text-xl outline-none"
                   />
                 </div>
               </div>

               <button 
                  onClick={() => setStep(2)} disabled={!targetName}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-[#006b61] transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
               >
                  Configure Identity <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
         )}


         {/* STEP 2: DONOR DETAILS */}
         {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <User className="w-6 h-6 text-[#006b61]" /> Organization Identity
               </h2>

               <div className="flex gap-2 mb-6">
                  {['Organization', 'Partner/Donor', 'Individual'].map(t => (
                     <button
                        key={t} onClick={() => setDonorType(t)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border ${donorType === t ? 'bg-[#006b61]/10 border-[#006b61] text-[#006b61]' : 'border-gray-200 text-gray-500'}`}
                     >
                        {t}
                     </button>
                  ))}
               </div>

               <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border">
                     <input type="checkbox" id="anon_spn" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} className="w-5 h-5 accent-[#006b61]" />
                     <label htmlFor="anon_spn" className="font-bold text-gray-700 text-sm cursor-pointer">Sponsor Anonymously (Hide public identity)</label>
                  </div>

                  {!anonymous && (
                     <input type="text" placeholder={donorType === 'Individual' ? "Full Name" : "Official Organization Name"} value={name} onChange={e=>setName(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 focus:border-[#006b61] outline-none" />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                     <input type="email" placeholder="Finance Email (Receipts)" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none focus:border-[#006b61]" />
                     <input type="tel" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 outline-none focus:border-[#006b61]" />
                  </div>
                  
                  <input type="text" placeholder="Country of Registration" value={country} onChange={e=>setCountry(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 focus:border-[#006b61] outline-none" />

                  <textarea placeholder="Directives or Dedication message..." value={donorMessage} onChange={e=>setDonorMessage(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 min-h-[100px] outline-none" />
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="px-6 py-4 rounded-2xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200">Back</button>
                  <button onClick={() => setStep(3)} className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-[#006b61] transition-colors">
                     Review Sponsorship
                  </button>
               </div>
            </div>
         )}


         {/* STEP 3: CHECKOUT REVIEW */}
         {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mb-8 text-center">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Total Intervention Package</div>
                  <div className="text-4xl font-black text-gray-900 mb-2 font-mono">
                     UGX {Number(amount).toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-[#ff7235]">
                     Target: {targetName} ({level.toUpperCase()})
                  </div>
               </div>

               <div className="p-4 bg-blue-50/50 rounded-xl mb-8 flex gap-4 border border-blue-100">
                  <ShieldCheck className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                     <span className="font-bold block mb-1">Pesapal Security Protocol</span>
                     Your institutional cards and Mobile Money PIN are routed by encrypted V3 tunnels physically inside the Pesapal Banking iframe. OzekiRead <b>never</b> observes your credentials.
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
                     onClick={handleInitiate} disabled={loading}
                     className="flex-1 py-4 bg-[#006b61] text-white rounded-2xl font-black text-lg hover:bg-[#066a67] transition-colors flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                  >
                     {loading ? 'Bridging Banking Networks...' : 'Execute Philanthropic Gateway'} 
                     {!loading && <CreditCard className="w-5 h-5 ml-1" />}
                  </button>
               </div>
            </div>
         )}
       </div>
    </div>
  )
}
