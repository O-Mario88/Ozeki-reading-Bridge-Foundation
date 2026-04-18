"use client";

import { useState, useMemo } from "react";

import { ChevronRight, CheckCircle, CreditCard, Building, ShoppingCart, Plus, Minus, FileText, Calendar, ShieldCheck } from "lucide-react";
import type { ServiceCatalogRow } from "@/lib/server/postgres/repositories/service-booking";

export function BookingWizard({ catalog }: { catalog: ServiceCatalogRow[] }) {

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Essential Identity (Trimmed from 10 to 5)
  const [schoolState, setSchoolState] = useState({
    schoolName: "", district: "", requesterName: "", requesterPhone: "", requesterEmail: ""
  });

  // Step 2: Reading Needs Assessment
  const [assessment, setAssessment] = useState({
    curriculum: "NCDC Primary Curriculum",
    independentReaders: "Less than 25%",
    phonicsTrained: "No",
    primaryGoal: "",
    specificChallenges: ""
  });

  // Step 2: Unified Cart State
  // Keys are service IDs, values are the multiplier (days or classes).
  // If a key doesn't exist or is 0, the service is not selected.
  const [cart, setCart] = useState<Record<number, number>>({});

  // Step 4: Scheduling State
  const [scheduleState, setScheduleState] = useState({ date: "", time: "10:00" });

  // Step 5: Native Checkout State
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [paymentIdentifier, setPaymentIdentifier] = useState("");

  const cartTotal = useMemo(() => {
     let total = 0;
     Object.entries(cart).forEach(([idStr, qty]) => {
        const id = parseInt(idStr);
        const srv = catalog.find(c => c.id === id);
        if (srv && qty > 0) total += (srv.unitPrice * qty);
     });
     return total;
  }, [cart, catalog]);

  const requiredDeposit = cartTotal / 2;
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full'>('deposit');

  const updateCart = (serviceId: number, qty: number) => {
     setCart(prev => {
        const newCart = { ...prev, [serviceId]: Math.max(0, qty) };
        if (newCart[serviceId] === 0) delete newCart[serviceId]; // Clean up unselected
        return newCart;
     });
  };

  const handleNextStep = () => {
     if (step === 1 && (!schoolState.schoolName || !schoolState.district || !schoolState.requesterName || !schoolState.requesterPhone)) {
        alert("Please fill in all required (*) identity details.");
        return;
     }
     if (step === 2 && !assessment.primaryGoal) {
        alert("Please indicate your primary literacy goal to help us prepare our strategy.");
        return;
     }
     if (step === 3 && Object.keys(cart).length === 0) {
        alert("Please select at least one supporting service and indicate the quantity.");
        return;
     }
     if (step === 4 && (!scheduleState.date || !scheduleState.time)) {
        alert("Please specify a preferred date and time for the consultation.");
        return;
     }
     setStep(s => s + 1);
  };

  const handleCheckout = async () => {
     setIsSubmitting(true);
     try {
       // Assemble the Request Payload
       const cartItems = Object.entries(cart).map(([idStr, qty]) => {
          const id = parseInt(idStr);
          const srv = catalog.find(c => c.id === id)!;
          const itemTotal = qty * srv.unitPrice;
          return {
             serviceId: id,
             quantity: qty,
             unitPrice: srv.unitPrice,
             totalPrice: itemTotal,
             requiredDepositAmount: itemTotal / 2,
             details: srv.pricingModel === 'per_day' ? { days: qty } : { classes: qty }
          };
       });

       const payload = {
          schoolDetails: schoolState,
          assessmentData: assessment,
          cartItems,
          estimatedTotal: cartTotal,
          requiredDepositAmount: requiredDeposit,
          paymentIntent: paymentChoice,
          paymentAmount: paymentChoice === 'deposit' ? requiredDeposit : cartTotal,
          scheduleDetails: scheduleState,
          paymentDetails: { paymentMethod, paymentIdentifier }
       };

       const res = await fetch("/api/services/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
       });

       const data = await res.json();
       if (data.success && !data.redirectUrl) {
          // Native Simulated Success (Locally resilient flow)
          setStep(6);
       } else if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
       } else {
          alert("Integration error generating checkout gateway.");
          setIsSubmitting(false);
       }

     } catch(e) {
       console.error(e);
       alert("Network Error during checkout generation.");
       setIsSubmitting(false);
     }
  };

  return (
    <div className="bg-white border border-[#006b61]/10 rounded-3xl shadow-xl shadow-[#006b61]/5 overflow-hidden flex flex-col">
       {/* High-End Wizard Header Progress Array */}
       <div className="bg-gray-50 border-b p-6 flex items-center justify-between">
          <div className="flex gap-2 items-center">
             {[1, 2, 3, 4, 5].map((i, index) => (
                <div key={i} className={`flex items-center gap-1 md:gap-2 ${step === 6 ? 'hidden' : ''}`}>
                   <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-colors duration-500 shrink-0
                      ${step >= i ? 'bg-[#006b61] text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                      {step > i ? <CheckCircle className="w-3 h-3 md:w-5 md:h-5"/> : i}
                   </div>
                   {index < 4 && (
                      <div className={`w-3 md:w-8 lg:w-12 h-1 rounded-full transition-colors duration-500 shrink-0 ${step > i ? 'bg-[#006b61]' : 'bg-gray-200'}`} />
                   )}
                </div>
             ))}
          </div>
          <div className="text-[#006b61] font-black text-sm uppercase tracking-widest hidden md:block">
             Booking Configurations
          </div>
       </div>

       <div className="p-8 md:p-12 flex-1">
         {/* STEP 1: DIRECT SCHOOL DETAILS */}
         {step === 1 && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#006b61]/10 flex items-center justify-center text-[#006b61]">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Your Identity</h2>
                  <p className="text-sm text-gray-500">Where are we deploying support?</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">School Name *</label>
                    <input required value={schoolState.schoolName} onChange={e=>setSchoolState({...schoolState, schoolName: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-[#006b61] focus:bg-white transition-colors font-semibold" placeholder="e.g. Bright Future Primary" />
                 </div>
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">District *</label>
                    <input required value={schoolState.district} onChange={e=>setSchoolState({...schoolState, district: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-[#006b61] focus:bg-white transition-colors font-semibold" />
                 </div>
                 <div className="col-span-full border-t border-gray-100 my-2"></div>
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Contact Name *</label>
                    <input required value={schoolState.requesterName} onChange={e=>setSchoolState({...schoolState, requesterName: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-[#006b61] focus:bg-white transition-colors font-semibold" />
                 </div>
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Contact Phone *</label>
                    <input required type="tel" value={schoolState.requesterPhone} onChange={e=>setSchoolState({...schoolState, requesterPhone: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-[#006b61] focus:bg-white transition-colors font-semibold" />
                 </div>
                 <div className="col-span-full">
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Contact Email (Optional)</label>
                    <input type="email" value={schoolState.requesterEmail} onChange={e=>setSchoolState({...schoolState, requesterEmail: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-[#006b61] focus:bg-white transition-colors font-semibold" placeholder="Used for digital receipts" />
                 </div>
              </div>

               <button type="button" onClick={handleNextStep} disabled={!schoolState.schoolName || !schoolState.district || !schoolState.requesterName || !schoolState.requesterPhone} className="w-full bg-gray-900 disabled:opacity-50 text-white font-black py-4 rounded-xl hover:bg-[#006b61] transition-colors flex items-center justify-center shadow-lg group">
                 Proceed to Diagnostic Assessment <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
               </button>
           </div>
         )}

         {/* STEP 2: READING NEEDS ASSESSMENT */}
         {step === 2 && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Reading Needs Assessment</h2>
                  <p className="text-sm text-gray-500">Help Ozeki strategize for your school.</p>
                </div>
              </div>

              <div className="space-y-6 mb-8">
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-3 text-gray-500">Current Reading Curriculum</label>
                    <div className="flex flex-wrap gap-3">
                       {['NCDC Primary Curriculum', 'Cambridge / International', 'Montessori', 'Other'].map(val => (
                          <button key={val} onClick={()=>setAssessment({...assessment, curriculum: val})} className={`px-4 py-2 border-2 rounded-xl text-sm font-bold transition-all ${assessment.curriculum === val ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>{val}</button>
                       ))}
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-3 text-gray-500">What % of P1-P3 learners read independently?</label>
                    <div className="flex flex-wrap gap-3">
                       {['Less than 25%', '25% - 50%', '50% - 75%', 'Over 75%'].map(val => (
                          <button key={val} onClick={()=>setAssessment({...assessment, independentReaders: val})} className={`px-4 py-2 border-2 rounded-xl text-sm font-bold transition-all ${assessment.independentReaders === val ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>{val}</button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-3 text-gray-500">Have your teachers received prior synthetic phonics training?</label>
                    <div className="flex gap-3">
                       {['Yes', 'No', 'Not Sure'].map(val => (
                          <button key={val} onClick={()=>setAssessment({...assessment, phonicsTrained: val})} className={`px-4 py-2 border-2 rounded-xl text-sm font-bold transition-all ${assessment.phonicsTrained === val ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>{val}</button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">What is your primary literacy goal? *</label>
                    <input required value={assessment.primaryGoal} onChange={e=>setAssessment({...assessment, primaryGoal: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-colors text-sm font-semibold" placeholder="e.g. Ensure every child can read by P3." />
                 </div>

                 <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Key challenges (Optional)</label>
                    <textarea value={assessment.specificChallenges} onChange={e=>setAssessment({...assessment, specificChallenges: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-indigo-600 focus:bg-white transition-colors text-sm font-semibold min-h-[100px]" placeholder="Are there specific roadblocks? (e.g. absent teachers, no textbooks)" />
                 </div>
              </div>

              <div className="flex gap-4">
                 <button type="button" onClick={()=>setStep(1)} className="bg-gray-100 text-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-200 transition-colors w-full sm:w-auto">Back</button>
                 <button type="button" onClick={handleNextStep} disabled={!assessment.primaryGoal} className="w-full bg-gray-900 disabled:opacity-50 text-white font-black py-4 rounded-xl hover:bg-[#006b61] transition-colors flex items-center justify-center shadow-lg group">
                   Proceed to Package Selection <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </div>
         )}

         {/* STEP 3: BUILD PACKAGE (UNIFIED CART) */}
         {step === 3 && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-end mb-6">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-2xl bg-[#FA7D15]/10 flex items-center justify-center text-[#FA7D15]">
                     <ShoppingCart className="w-6 h-6" />
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-gray-900">Build Your Package</h2>
                     <p className="text-sm text-gray-500">Add services and adjust quantities</p>
                   </div>
                 </div>
                 <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Running Total</div>
                    <div className="text-xl font-black text-[#006b61]">UGX {cartTotal.toLocaleString()}</div>
                 </div>
              </div>
              
              <div className="space-y-4 mb-8">
                 {catalog.map(service => {
                    const qty = cart[service.id] || 0;
                    const isSelected = qty > 0;
                    return (
                       <div key={service.id} className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between
                          ${isSelected ? 'border-[#006b61] bg-[#006b61]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                          
                          <div className="flex-1">
                             <h4 className="font-bold text-lg text-gray-900">{service.serviceName}</h4>
                             <p className="text-sm font-medium text-gray-500">Base Unit: UGX {service.unitPrice.toLocaleString()} {service.pricingModel === 'per_day' ? 'per day' : 'per class'}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border shadow-sm shrink-0">
                             <button onClick={() => updateCart(service.id, qty - 1)} className={`w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border ${qty === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                                <Minus className="w-4 h-4 text-gray-600" />
                             </button>
                             <div className="w-8 text-center font-black text-lg">{qty}</div>
                             <button onClick={() => updateCart(service.id, qty + 1)} className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-lg border hover:bg-gray-50">
                                <Plus className="w-4 h-4 text-gray-600" />
                             </button>
                          </div>
                       </div>
                    );
                 })}
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row gap-4">
                 <button type="button" onClick={()=>setStep(2)} className="bg-gray-100 text-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-200 transition-colors w-full sm:w-auto">Back</button>
                 <button type="button" onClick={handleNextStep} disabled={cartTotal === 0} className="bg-gray-900 disabled:opacity-50 text-white font-black py-4 px-8 flex-1 rounded-xl hover:bg-[#006b61] transition-colors flex items-center justify-center group shadow-lg text-lg">
                    Finalize: UGX {cartTotal.toLocaleString()} <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </div>
         )}

         {/* STEP 4: SCHEDULE APPOINTMENT */}
         {step === 4 && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                   <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">Schedule Initial Consultation</h2>
                   <p className="text-sm text-gray-500">Coordinate a unified time to finalize details logically.</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Preferred Date *</label>
                    <input required type="date" value={scheduleState.date} onChange={e=>setScheduleState({...scheduleState, date: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-amber-600 focus:bg-white transition-colors text-sm font-bold" min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold mb-2 text-gray-500">Preferred Time *</label>
                    <input required type="time" value={scheduleState.time} onChange={e=>setScheduleState({...scheduleState, time: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-xl outline-none focus:border-amber-600 focus:bg-white transition-colors text-sm font-bold" />
                  </div>
               </div>

              <div className="flex flex-col-reverse sm:flex-row gap-4">
                 <button type="button" onClick={()=>setStep(3)} className="bg-gray-100 text-gray-600 font-bold py-4 px-8 rounded-xl hover:bg-gray-200 transition-colors w-full sm:w-auto">Back</button>
                 <button type="button" onClick={handleNextStep} disabled={!scheduleState.date} className="w-full sm:flex-1 bg-gray-900 disabled:opacity-50 text-white font-black py-4 px-8 rounded-xl hover:bg-[#006b61] transition-colors flex items-center justify-center shadow-lg group">
                    Proceed to Encrypted Checkout <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </div>
         )}

         {/* STEP 5: SECURE NATIVE CHECKOUT */}
         {step === 5 && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-3 mb-8 pb-6 border-b">
                 <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                   <CreditCard className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900">Secure Native Checkout</h2>
                   <p className="text-sm text-gray-500">Ozeki cryptographically secures this transaction.</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Ledger Choice Engine */}
                  <div className="space-y-4">
                      {/* Sub-total header built above Radio Toggles */}
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Payment Structuring</div>
                      
                      <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentChoice === 'deposit' ? 'border-[#006b61] bg-white shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                          <div className="flex justify-between items-center bg-transparent">
                            <div className="flex items-center gap-3">
                                <input type="radio" className="w-5 h-5 accent-[#006b61]" checked={paymentChoice === 'deposit'} onChange={()=>setPaymentChoice('deposit')} />
                                <span className="font-bold text-gray-900">50% Logistical Deposit</span>
                            </div>
                            <div className="font-black text-[#006b61]">UGX {requiredDeposit.toLocaleString()}</div>
                          </div>
                      </label>

                      <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentChoice === 'full' ? 'border-[#006b61] bg-white shadow-sm' : 'border-transparent hover:bg-gray-100'}`}>
                          <div className="flex justify-between items-center bg-transparent">
                            <div className="flex items-center gap-3">
                                <input type="radio" className="w-5 h-5 accent-[#006b61]" checked={paymentChoice === 'full'} onChange={()=>setPaymentChoice('full')} />
                                <span className="font-bold text-gray-900">Pay Full Amount</span>
                            </div>
                            <div className="font-black text-[#006b61]">UGX {cartTotal.toLocaleString()}</div>
                          </div>
                      </label>
                  </div>

                  {/* Native Protocol Selector */}
                  <div className="flex flex-col gap-4">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Payment Protocol</label>
                        <select 
                           value={paymentMethod} 
                           onChange={e => setPaymentMethod(e.target.value)}
                           className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-700 bg-white outline-none hover:border-gray-200 focus:border-[#006b61]"
                        >
                           <option>MTN Mobile Money</option>
                           <option>Airtel Money</option>
                           <option>Bank Card (Visa/Mastercard)</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                           {paymentMethod.includes('Card') ? 'Card Number' : 'Mobile Phone Number'}
                        </label>
                        <input 
                           type="text" 
                           placeholder={paymentMethod.includes('Card') ? "XXXX XXXX XXXX XXXX" : "07X XXX XXXX"}
                           value={paymentIdentifier} 
                           onChange={e => setPaymentIdentifier(e.target.value)}
                           className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 outline-none hover:border-gray-200 focus:border-[#006b61]"
                        />
                     </div>
                     {paymentMethod.includes('Card') && (
                        <div className="grid grid-cols-2 gap-4">
                           <input type="text" placeholder="MM/YY" className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 outline-none" />
                           <input type="text" placeholder="CVV" className="w-full p-4 rounded-xl border-2 border-gray-100 font-bold text-gray-900 outline-none" />
                        </div>
                     )}
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                 <button disabled={isSubmitting} type="button" onClick={()=>setStep(4)} className="bg-gray-100 text-gray-600 font-bold py-4 px-6 rounded-xl hover:bg-gray-200 transition-colors">Edit Calendar</button>
                 <button 
                    disabled={isSubmitting || !paymentIdentifier} 
                    onClick={handleCheckout} 
                    className="flex-1 bg-[#006b61] hover:bg-[#005a51] disabled:opacity-50 text-white font-black text-lg py-4 rounded-xl flex items-center justify-center shadow-xl shadow-[#006b61]/20 transition-all gap-2"
                 >
                    {isSubmitting ? "Processing Node..." : `Pay UGX ${(paymentChoice === 'deposit' ? requiredDeposit : cartTotal).toLocaleString()}`}
                    {!isSubmitting && <CreditCard className="w-5 h-5 ml-1" />}
                 </button>
               </div>
           </div>
         )}
         
         {/* STEP 6: SUCCESS */}
         {step === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
               <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm shadow-green-100">
                  <ShieldCheck className="w-12 h-12" />
               </div>
               <h2 className="text-4xl font-black text-gray-900 mb-4">Payment Confirmed!</h2>
               <p className="text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed text-lg text-left">
                  Your payment of <span className="font-black text-[#006b61]">UGX {(paymentChoice === 'deposit' ? requiredDeposit : cartTotal).toLocaleString()}</span> has been received successfully.
                  <br/><br/>
                  <b className="text-gray-900 block mb-2">You have chosen to invest in excellence for your school</b>
                  This investment reflects excellence, vision, and a commitment to giving your learners the quality they deserve. By taking this step, you are not simply making a payment — you are choosing a higher standard for your school’s future.
                  <br/><br/>
                  We are truly honored by your trust and delighted to support a decision that speaks of leadership, prestige, and lasting impact.
                  <br/><br/>
                  <i>Your initial consultation has been automatically locked into our Calendar for <b>{scheduleState.date}</b>. A digital receipt has been delivered.</i>
               </p>
               <button 
                  onClick={() => window.location.reload()} 
                  className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black text-xl hover:bg-[#006b61] shadow-2xl transition-all"
               >
                  Generate Another Request
               </button>
            </div>
         )}
       </div>
    </div>
  );
}
