"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, MapPin, Globe, CreditCard, Building } from "lucide-react";

export function PortalUnifiedEventsForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Master Switch
  const [deliveryType, setDeliveryType] = useState<'online' | 'in_person'>('online');
  
  // Shared
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [targetAudience, _setTargetAudience] = useState("");
  const [level, _setLevel] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, _setContactEmail] = useState("");

  // In-Person Specific
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [maxSchools, _setMaxSchools] = useState<number>(0);
  const [_maxTeachersPerSchool, _setMaxTeachersPerSchool] = useState<number>(0);
  
  const [fundingType, setFundingType] = useState<'Sponsored Training' | 'Paid Training' | 'Free Ozeki Event' | ''>('');
  const [trainingFeeAmount, setTrainingFeeAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("UGX");
  const [sponsoringPartnerName, setSponsoringPartnerName] = useState("");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        deliveryType,
        title,
        description,
        date,
        startTime,
        endTime,
        targetAudience,
        level,
        contactName,
        contactPhone,
        contactEmail,
        ...(deliveryType === 'in_person' && {
          venueName,
          venueAddress,
          district,
          maxSchools: maxSchools > 0 ? maxSchools : undefined,
          fundingType,
          trainingFeeAmount: fundingType === 'Paid Training' ? trainingFeeAmount : 0,
          currency,
          sponsoringPartnerName: fundingType === 'Sponsored Training' ? sponsoringPartnerName : null
        })
      };

      const res = await fetch("/api/events/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        router.push(deliveryType === 'online' ? '/portal/events' : '/portal/events/physical');
        router.refresh();
      } else {
        alert(data.message || "Failed to schedule event.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200">
       <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold mb-4">Select Master Delivery Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all ${deliveryType === 'online' ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="sr-only" checked={deliveryType === 'online'} onChange={() => setDeliveryType('online')} />
                <div className={`p-3 rounded-full ${deliveryType === 'online' ? 'bg-[var(--accent-color)] text-white' : 'bg-gray-100 text-gray-500'}`}>
                   <Globe className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900">Virtual / Online Webinar</h3>
                   <p className="text-sm text-gray-500">Auto-generates Google Meet links, sets recording tracking, and embeds Vimeo telemetry.</p>
                </div>
             </label>

             <label className={`cursor-pointer border-2 rounded-xl p-4 flex items-start gap-4 transition-all ${deliveryType === 'in_person' ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" className="sr-only" checked={deliveryType === 'in_person'} onChange={() => setDeliveryType('in_person')} />
                <div className={`p-3 rounded-full ${deliveryType === 'in_person' ? 'bg-[var(--primary-color)] text-white' : 'bg-gray-100 text-gray-500'}`}>
                   <Building className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900">In-Person Workshop</h3>
                   <p className="text-sm text-gray-500">Requires Venue, manages offline capacity, physical ticketing, and funding logistics.</p>
                </div>
             </label>
          </div>
       </div>

       <div className="p-8 space-y-8">
          {/* SHARED FIELDS */}
          <section>
             <h3 className="text-lg font-bold mb-4 border-b pb-2">Core Logistics</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-full">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Title *</label>
                  <input required value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full border rounded-lg p-2" placeholder="e.g. Masterclass on Synthetic Phonics" />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
                  <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full border rounded-lg p-2 h-24" placeholder="Event curriculum or agenda summary..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date *</label>
                  <input required value={date} onChange={e=>setDate(e.target.value)} type="date" className="w-full border rounded-lg p-2" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Start Time *</label>
                    <input required value={startTime} onChange={e=>setStartTime(e.target.value)} type="time" className="w-full border rounded-lg p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">End Time *</label>
                    <input required value={endTime} onChange={e=>setEndTime(e.target.value)} type="time" className="w-full border rounded-lg p-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Primary Trainer / Contact *</label>
                  <input required value={contactName} onChange={e=>setContactName(e.target.value)} type="text" className="w-full border rounded-lg p-2" placeholder="Trainer Name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input value={contactPhone} onChange={e=>setContactPhone(e.target.value)} type="tel" className="w-full border rounded-lg p-2" />
                </div>
             </div>
          </section>

          {/* DYNAMIC IN-PERSON FIELDS */}
          {deliveryType === 'in_person' && (
            <>
              <section>
                 <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2"><MapPin className="text-orange-500 w-5 h-5"/> Venue & Geography</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Venue Name *</label>
                      <input required value={venueName} onChange={e=>setVenueName(e.target.value)} type="text" className="w-full border rounded-lg p-2" placeholder="e.g. St. Jude Townhall" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">District *</label>
                      <input required value={district} onChange={e=>setDistrict(e.target.value)} type="text" className="w-full border rounded-lg p-2" placeholder="e.g. Kampala" />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Full Venue Address *</label>
                      <input required value={venueAddress} onChange={e=>setVenueAddress(e.target.value)} type="text" className="w-full border rounded-lg p-2" placeholder="Street layout..." />
                    </div>
                 </div>
              </section>

              <section>
                 <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2"><CreditCard className="text-green-600 w-5 h-5"/> Funding & Sponsorship</h3>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Funding Type *</label>
                      <select required value={fundingType} onChange={e=>setFundingType(e.target.value as typeof fundingType)} className="w-full border rounded-lg p-2">
                         <option value="">-- Select Type --</option>
                         <option value="Free Ozeki Event">Free Ozeki Event</option>
                         <option value="Sponsored Training">Sponsored Training</option>
                         <option value="Paid Training">Paid Training</option>
                      </select>
                    </div>

                    {fundingType === 'Sponsored Training' && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <label className="block text-sm font-bold text-yellow-900 mb-1">Sponsoring Partner Name *</label>
                        <input required value={sponsoringPartnerName} onChange={e=>setSponsoringPartnerName(e.target.value)} type="text" className="w-full border rounded-lg p-2 bg-white" placeholder="e.g. Literacy Foundation UK" />
                      </div>
                    )}

                    {fundingType === 'Paid Training' && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-green-900 mb-1">Training Fee Amount *</label>
                          <input required type="number" min="0" value={trainingFeeAmount} onChange={e=>setTrainingFeeAmount(Number(e.target.value))} className="w-full border rounded-lg p-2 bg-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-green-900 mb-1">Currency</label>
                          <input required type="text" value={currency} onChange={e=>setCurrency(e.target.value)} className="w-full border rounded-lg p-2 bg-white uppercase" />
                        </div>
                      </div>
                    )}
                 </div>
              </section>
            </>
          )}

          {/* DYNAMIC ONLINE FIELDS */}
          {deliveryType === 'online' && (
            <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 relative overflow-hidden">
               <Video className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500 opacity-10" />
               <h3 className="text-xl font-bold text-blue-900 mb-2 relative z-10">Google Meet & Vimeo Automation Active</h3>
               <p className="text-sm text-blue-800 relative z-10 max-w-xl">
                 Checking this payload will automatically command Google Calendar to generate a secure Meet Link, establish recording consent matrices, and lock the Drive watcher for automatic Vimeo synchronization post-event.
               </p>
            </section>
          )}

       </div>
       
       <div className="p-8 border-t bg-gray-50 flex justify-end">
         <button disabled={isSubmitting} type="submit" className="bg-[#FA7D15] hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-all flex items-center gap-2">
            {isSubmitting ? "Orchestrating Architecture..." : `Schedule ${deliveryType === 'online' ? 'Webinar' : 'Workshop'}`}
         </button>
       </div>
    </form>
  );
}
