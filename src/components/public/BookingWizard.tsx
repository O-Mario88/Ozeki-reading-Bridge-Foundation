"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CheckCircle, Calculator, CreditCard, Building } from "lucide-react";
import type { ServiceCatalogRow } from "@/lib/server/postgres/repositories/service-booking";

export function BookingWizard({ catalog }: { catalog: ServiceCatalogRow[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: School Contact State
  const [schoolState, setSchoolState] = useState({
    schoolName: "", schoolType: "Primary", ownership: "Private", emisNumber: "",
    district: "", subCounty: "", parish: "", village: "",
    schoolPhone: "", schoolEmail: "",
    headTeacherName: "", headTeacherPhone: "",
    requesterName: "", requesterRole: "Head teacher", requesterPhone: "", requesterEmail: "", consent: true
  });

  // Step 2 & 3: Services Selected & Configuration State
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [serviceConfigs, setServiceConfigs] = useState<Record<number, Record<string, any>>>({});

  // Math State
  const [quotation, setQuotation] = useState({ total: 0, requiredDeposit: 0 });
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full'>('deposit');

  const handleNextStep = () => {
     if (step === 1 && (!schoolState.schoolName || !schoolState.district || !schoolState.requesterName)) {
        alert("Please fill in all required (*) school details.");
        return;
     }
     if (step === 2 && selectedServiceIds.length === 0) {
        alert("Please select at least one core service.");
        return;
     }
     if (step === 3) {
        // Calculate the Final Quote upon exiting Step 3
        let totalCost = 0;
        selectedServiceIds.forEach(id => {
           const srv = catalog.find(c => c.id === id);
           const conf = serviceConfigs[id];
           if (srv && conf) {
              const multiplier = srv.pricingModel === 'per_day' ? (conf.days || 1) : (conf.classes || 1);
              totalCost += (multiplier * srv.unitPrice);
           }
        });
        setQuotation({
           total: totalCost,
           requiredDeposit: totalCost / 2 // Exact 50% Rule
        });
     }
     setStep(s => s + 1);
  };

  const handleCheckout = async () => {
     setIsSubmitting(true);
     try {
       // Assemble the Request Payload
       const cartItems = selectedServiceIds.map(id => {
          const srv = catalog.find(c => c.id === id)!;
          const conf = serviceConfigs[id];
          const multiplier = srv.pricingModel === 'per_day' ? (conf.days || 1) : (conf.classes || 1);
          const itemTotal = multiplier * srv.unitPrice;
          return {
             serviceId: id,
             quantity: multiplier,
             unitPrice: srv.unitPrice,
             totalPrice: itemTotal,
             requiredDepositAmount: itemTotal / 2,
             details: conf
          };
       });

       const payload = {
          schoolDetails: schoolState,
          cartItems,
          estimatedTotal: quotation.total,
          requiredDepositAmount: quotation.requiredDeposit,
          paymentIntent: paymentChoice,
          // Amount actually passing to Pesapal
          paymentAmount: paymentChoice === 'deposit' ? quotation.requiredDeposit : quotation.total
       };

       const res = await fetch("/api/services/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
       });

       const data = await res.json();
       if (data.redirectUrl) {
          router.push(data.redirectUrl);
       } else {
          alert("Integration error generating quote payload.");
          setIsSubmitting(false);
       }

     } catch(e) {
       console.error(e);
       alert("Network Error during checkout generation.");
       setIsSubmitting(false);
     }
  };

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
       {/* Wizard Header Progress Array */}
       <div className="bg-gray-50 border-b flex p-4 overflow-x-auto gap-4 scrollbar-hide">
          {[1,2,3,4,5].map(i => (
             <div key={i} className={`flex items-center gap-2 whitespace-nowrap ${step >= i ? 'text-[#006b61]' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= i ? 'bg-[#006b61] text-white' : 'bg-gray-200'}`}>
                   {step > i ? <CheckCircle className="w-5 h-5"/> : i}
                </div>
                <span className="font-bold text-sm hidden md:inline">
                   {i===1?'School':i===2?'Services':i===3?'Parameters':i===4?'Quotation':'Payment'}
                </span>
                {i !== 5 && <ChevronRight className="w-4 h-4 ml-2 opacity-50" />}
             </div>
          ))}
       </div>

       <div className="p-8">
         {/* STEP 1: SCHOOL DETAILS */}
         {step === 1 && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center gap-3 border-b pb-4 mb-6">
                <Building className="text-[#006b61] w-6 h-6" />
                <h2 className="text-2xl font-bold">School Identity & Contacts</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold mb-1">School Name *</label>
                    <input required value={schoolState.schoolName} onChange={e=>setSchoolState({...schoolState, schoolName: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2" placeholder="e.g. Bright Future Primary" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-1">District *</label>
                    <input required value={schoolState.district} onChange={e=>setSchoolState({...schoolState, district: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-1">School Type</label>
                    <select value={schoolState.schoolType} onChange={e=>setSchoolState({...schoolState, schoolType: e.target.value})} className="w-full border p-3 rounded-xl">
                       <option>Nursery</option><option>Primary</option><option>Secondary</option><option>Other</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-1">EMIS Number</label>
                    <input value={schoolState.emisNumber} onChange={e=>setSchoolState({...schoolState, emisNumber: e.target.value})} className="w-full border p-3 rounded-xl" />
                 </div>
                 <div className="col-span-full border-t pt-6"></div>
                 <div>
                    <label className="block text-sm font-bold mb-1">Requester Name *</label>
                    <input required value={schoolState.requesterName} onChange={e=>setSchoolState({...schoolState, requesterName: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-1">Requester Phone *</label>
                    <input required value={schoolState.requesterPhone} onChange={e=>setSchoolState({...schoolState, requesterPhone: e.target.value})} className="w-full border p-3 rounded-xl focus:ring-2" />
                 </div>
              </div>
              <button type="button" onClick={handleNextStep} className="mt-8 bg-gray-900 text-white font-bold py-3 px-8 rounded-xl hover:opacity-90 transition-all flex items-center ml-auto">
                 Continue to Services <ChevronRight className="w-5 h-5 ml-2" />
              </button>
           </div>
         )}

         {/* STEP 2: SELECT SERVICES */}
         {step === 2 && (
           <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold">Select Desired Support Services</h2>
              <p className="text-gray-500 mb-6">You can bundle multiple services together. You will configure the scale (e.g. number of days) on the next specific step.</p>
              
              <div className="space-y-4">
                 {catalog.map(service => (
                    <label key={service.id} className={`p-4 border-2 rounded-2xl cursor-pointer flex items-center gap-4 transition-all ${selectedServiceIds.includes(service.id) ? 'border-[#FA7D15] bg-[#FA7D15]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 accent-[#FA7D15]"
                         checked={selectedServiceIds.includes(service.id)} 
                         onChange={(e) => {
                            if(e.target.checked) setSelectedServiceIds([...selectedServiceIds, service.id]);
                            else setSelectedServiceIds(selectedServiceIds.filter(id => id !== service.id));
                         }}
                       />
                       <div>
                          <div className="font-bold text-lg text-gray-900">{service.serviceName}</div>
                          <div className="text-sm font-bold text-gray-500">Base Unit: UGX {service.unitPrice.toLocaleString()} {service.pricingModel === 'per_day'?'per day':'per class'}</div>
                       </div>
                    </label>
                 ))}
              </div>
              
              <div className="flex justify-between mt-8">
                 <button type="button" onClick={()=>setStep(1)} className="text-gray-500 font-bold px-4 hover:underline">Back</button>
                 <button type="button" onClick={handleNextStep} className="bg-gray-900 text-white font-bold py-3 px-8 rounded-xl hover:opacity-90">Configure Scope <ChevronRight className="w-5 h-5 ml-2 inline" /></button>
              </div>
           </div>
         )}

         {/* STEP 3: SCOPE VARIABLES */}
         {step === 3 && (
           <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold">Define Logistics & Scope</h2>
              <p className="text-gray-500 mb-6">Set the specific volume constraints for your chosen support modules.</p>

              <div className="space-y-8">
                 {selectedServiceIds.map(id => {
                    const svc = catalog.find(c => c.id === id)!;
                    return (
                       <div key={id} className="bg-gray-50 p-6 rounded-2xl border">
                          <h3 className="font-bold text-[#006b61] text-lg mb-4">{svc.serviceName}</h3>
                          
                          {svc.pricingModel === 'per_day' ? (
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <label className="block text-sm font-bold mb-1">Number of Days Requiring Support *</label>
                                   <input 
                                     type="number" min="1" 
                                     value={serviceConfigs[id]?.days || ""} 
                                     onChange={(e) => setServiceConfigs({...serviceConfigs, [id]: {...serviceConfigs[id], days: parseInt(e.target.value)}})}
                                     placeholder="e.g. 2" className="w-full border p-2 rounded focus:ring-2" 
                                   />
                                </div>
                                <div>
                                   <label className="block text-sm font-bold mb-1">Preferred Start Date</label>
                                   <input 
                                     type="date" 
                                     onChange={(e) => setServiceConfigs({...serviceConfigs, [id]: {...serviceConfigs[id], preferredDate: e.target.value}})}
                                     className="w-full border p-2 rounded" 
                                   />
                                </div>
                             </div>
                          ) : (
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <label className="block text-sm font-bold mb-1">Number of Classes to Validate *</label>
                                   <input 
                                     type="number" min="1" 
                                     value={serviceConfigs[id]?.classes || ""} 
                                     onChange={(e) => setServiceConfigs({...serviceConfigs, [id]: {...serviceConfigs[id], classes: parseInt(e.target.value)}})}
                                     placeholder="e.g. 4" className="w-full border p-2 rounded focus:ring-2" 
                                   />
                                </div>
                                <div>
                                   <label className="block text-sm font-bold mb-1">Classes Involved</label>
                                   <input 
                                     type="text" 
                                     onChange={(e) => setServiceConfigs({...serviceConfigs, [id]: {...serviceConfigs[id], classesInvolved: e.target.value}})}
                                     placeholder="e.g. K3, P1, P2" className="w-full border p-2 rounded" 
                                   />
                                </div>
                             </div>
                          )}
                          <div className="mt-4">
                             <label className="block text-sm font-bold mb-1">Special Focus / Notes</label>
                             <textarea 
                               onChange={(e) => setServiceConfigs({...serviceConfigs, [id]: {...serviceConfigs[id], notes: e.target.value}})}
                               className="w-full border p-2 rounded" rows={2}
                             />
                          </div>
                       </div>
                    )
                 })}
              </div>

              <div className="flex justify-between mt-8">
                 <button type="button" onClick={()=>setStep(2)} className="text-gray-500 font-bold px-4 hover:underline">Back</button>
                 <button type="button" onClick={handleNextStep} className="bg-[#006b61] text-white font-bold py-3 px-8 rounded-xl hover:opacity-90 flex items-center">
                    Generate Quotation <Calculator className="w-5 h-5 ml-2" />
                 </button>
              </div>
           </div>
         )}

         {/* STEP 4: QUOTATION */}
         {step === 4 && (
           <div className="space-y-6 animate-in fade-in">
              <h2 className="text-3xl font-black text-center mb-2">Estimated Quotation</h2>
              <p className="text-center text-gray-500 mb-8 max-w-lg mx-auto">This is an estimated automated quotation. Final confirmations will be routed from Ozeki HQ based on physical logistics.</p>

              <div className="max-w-2xl mx-auto border-2 rounded-2xl overflow-hidden bg-white shadow-xl">
                 <div className="p-6 bg-gray-50 border-b">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">School Entity</div>
                    <div className="font-bold text-lg">{schoolState.schoolName}</div>
                    <div className="text-sm text-gray-600">{schoolState.district} District</div>
                 </div>

                 <div className="p-6 space-y-4">
                    {selectedServiceIds.map(id => {
                       const srv = catalog.find(c => c.id === id)!;
                       const multiplier = srv.pricingModel === 'per_day' ? (serviceConfigs[id]?.days || 1) : (serviceConfigs[id]?.classes || 1);
                       const lineTotal = multiplier * srv.unitPrice;
                       return (
                          <div key={id} className="flex justify-between items-center border-b pb-4 border-dashed">
                             <div>
                                <div className="font-bold text-gray-900">{srv.serviceName}</div>
                                <div className="text-sm text-gray-500">{multiplier} {srv.pricingModel === 'per_day' ? 'days' : 'classes'} × {srv.unitPrice.toLocaleString()}</div>
                             </div>
                             <div className="font-black text-lg">UGX {lineTotal.toLocaleString()}</div>
                          </div>
                       )
                    })}
                 </div>

                 <div className="p-6 bg-[#006b61] text-white flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                       <span className="font-bold opacity-80">Total Estimated Cost:</span>
                       <span className="text-xl font-bold">UGX {quotation.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg border border-white/20">
                       <span className="font-black text-yellow-300">Required 50% Deposit:</span>
                       <span className="text-2xl font-black text-yellow-300">UGX {quotation.requiredDeposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm opacity-70 px-1 pt-2">
                       <span>Remaining Logistical Balance:</span>
                       <span>UGX {(quotation.total - quotation.requiredDeposit).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="flex justify-center mt-8 gap-4">
                 <button type="button" onClick={()=>setStep(3)} className="text-gray-500 font-bold px-4 py-3 hover:underline">Reconfigure Package</button>
                 <button type="button" onClick={()=>setStep(5)} className="bg-[#FA7D15] text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center">
                    Proceed to Payment <ChevronRight className="w-5 h-5 ml-2" />
                 </button>
              </div>
           </div>
         )}

         {/* STEP 5: CHECKOUT INTENT */}
         {step === 5 && (
           <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                 </div>
                 <h2 className="text-2xl font-bold">Secure Pesapal Checkout</h2>
                 <p className="text-gray-500 mt-2">Select your payment schedule structure to finalize your school booking integration.</p>
              </div>

              <div className="space-y-4">
                 <label className={`block p-6 rounded-2xl border-2 cursor-pointer transition-all ${paymentChoice === 'deposit' ? 'border-[#006b61] bg-[#006b61]/5 shadow-md' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-3">
                          <input type="radio" className="w-5 h-5 accent-[#006b61]" checked={paymentChoice === 'deposit'} onChange={()=>setPaymentChoice('deposit')} />
                          <span className="font-bold text-lg">Pay 50% Required Deposit</span>
                       </div>
                       <div className="font-black text-[#006b61]">UGX {quotation.requiredDeposit.toLocaleString()}</div>
                    </div>
                    <p className="text-sm text-gray-500 pl-8">Secures your booking date immediately. The remaining UGX {(quotation.total - quotation.requiredDeposit).toLocaleString()} balance carries over to service deployment date.</p>
                 </label>

                 <label className={`block p-6 rounded-2xl border-2 cursor-pointer transition-all ${paymentChoice === 'full' ? 'border-[#006b61] bg-[#006b61]/5 shadow-md' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-3">
                          <input type="radio" className="w-5 h-5 accent-[#006b61]" checked={paymentChoice === 'full'} onChange={()=>setPaymentChoice('full')} />
                          <span className="font-bold text-lg">Execute Full Payment</span>
                       </div>
                       <div className="font-black text-[#006b61]">UGX {quotation.total.toLocaleString()}</div>
                    </div>
                    <p className="text-sm text-gray-500 pl-8">Resolve the entire financial ledger right now for maximum convenience. Zero balance outstanding upon delivery.</p>
                 </label>
              </div>

              <button 
                 disabled={isSubmitting} 
                 onClick={handleCheckout} 
                 className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center shadow-lg transition-all"
              >
                 {isSubmitting ? "Generating Encrypted Pesapal Intent..." : "Launch Secure FinTech Gateway"}
              </button>
              
              <p className="text-center text-xs text-gray-400 mt-4 flex justify-center items-center gap-1">
                 🔒 Payment securely orchestrated via Pesapal IPN integrations.
              </p>
           </div>
         )}
       </div>
    </div>
  );
}
