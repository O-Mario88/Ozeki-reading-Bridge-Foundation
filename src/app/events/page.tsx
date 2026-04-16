import type { Metadata } from "next";
import { getCurrentPortalUser } from "@/lib/auth";
import { PageHero } from "@/components/public/PageHero";
import { listTrainingEventsPostgres } from "@/lib/server/postgres/repositories/training-events";
import { Video, MapPin, Calendar, Clock, CreditCard } from "lucide-react";
import Link from "next/link";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Online Training Sessions",
  description: "Join expert-led literacy, assessment, and phonics training sessions. Free capability building for educators.",
};

export default async function EventsPage() {
  // Master unification fetch
  const allEvents = await listTrainingEventsPostgres('Published');

  // We could separate them entirely, but the unified grid is powerful
  const scheduledEvents = allEvents.filter(e => new Date(e.startDatetime!) > new Date());
  const pastEvents = allEvents.filter(e => new Date(e.startDatetime!) <= new Date());

  return (
    <>
      <PageHero 
         imageUrl="/photos/PXL_20260218_131920803.MP.jpg"
         kicker="Ozeki Literacy Events"
         title="Capacity Building Core"
         description="Join our ecosystem of continuous capability development through virtual mastery sessions and localized physical deployment workshops."
      />

      <section className="py-20 px-4 bg-gray-50">
         <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center mb-12 text-[#006b61]">Join Our Upcoming Events</h2>
            
            {scheduledEvents.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {scheduledEvents.map(event => (
                     <div key={event.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 overflow-hidden group flex flex-col h-full">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${event.deliveryType === 'online' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                           <span className={`text-xs font-black tracking-widest uppercase ${event.deliveryType === 'online' ? 'text-blue-700' : 'text-[#FA7D15]'}`}>
                              {event.deliveryType === 'online' ? "ONLINE LIVE SESSION" : "IN-PERSON TRAINING"}
                           </span>
                           {event.deliveryType === 'online' ? <Video className="w-5 h-5 text-blue-400" /> : <MapPin className="w-5 h-5 text-[#FA7D15]/60" />}
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col">
                           <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#006b61] transition-colors leading-tight mb-4">{event.title}</h3>
                           
                           <div className="space-y-3 mb-6 text-sm text-gray-600 flex-1">
                              <div className="flex items-center gap-3">
                                 <Calendar className="w-4 h-4 text-gray-400" />
                                 <span className="font-medium text-gray-900">{new Date(event.startDatetime!).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Clock className="w-4 h-4 text-gray-400" />
                                 <span>{new Date(event.startDatetime!).toLocaleTimeString()}</span>
                              </div>
                              
                              {/* DYNAMIC MIDDLE LAYER */}
                              {event.deliveryType === 'online' ? (
                                <>
                                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed">
                                     <Video className="w-4 h-4 text-blue-400" />
                                     <span className="font-medium text-blue-900">Platform: Google Meet</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <span className="w-4 h-4 rounded-full bg-green-100 border border-green-300 flex items-center justify-center text-[10px] text-green-700 font-bold">✓</span>
                                     <span>Access Level: Open Public Link</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dashed">
                                     <MapPin className="w-4 h-4 text-[#FA7D15]" />
                                     <span className="font-medium text-gray-900 line-clamp-1">{event.venueName}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <span className="w-4 h-4" /> {/* Spacer */}
                                     <span className="text-gray-500 uppercase tracking-wide text-xs">{event.district}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-4">
                                     <CreditCard className={`w-4 h-4 ${event.fundingType === 'Free Ozeki Event' || event.fundingType === 'Sponsored Training' ? 'text-green-500' : 'text-orange-500'}`} />
                                     <span className={`font-bold ${event.fundingType === 'Paid Training' ? 'text-orange-700' : 'text-green-700'}`}>
                                        {event.fundingType === 'Paid Training' ? `Fee: ${event.currency} ${event.trainingFeeAmount?.toLocaleString()} per teacher` : 'Fee: Free'}
                                     </span>
                                  </div>
                                  {event.fundingType === 'Sponsored Training' && (
                                     <div className="flex items-center gap-3">
                                       <span className="w-4 h-4" />
                                       <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200">Sponsored by: {event.sponsoringPartnerName}</span>
                                     </div>
                                  )}
                                </>
                              )}
                           </div>
                           
                           {event.deliveryType === 'online' ? (
                             <a href={event.googleMeetLink || "#"} className="w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm">
                                Join Google Meet Now
                             </a>
                           ) : (
                             <Link href={`/events/physical/${event.slug}`} className="w-full text-center py-3 bg-[#006b61] hover:opacity-90 text-white font-bold rounded-xl transition-all shadow-sm">
                                Register School Now
                             </Link>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Events</h3>
                  <p className="text-gray-500">Check back later for new dates and capacity-building workshops.</p>
               </div>
            )}
         </div>
      </section>

      {/* 4. Support Footer Strip */}
      <CTAStrip 
        heading="Need help choosing a session?"
        subheading="If you represent a school and wish to schedule an exclusive alignment training with our experts, reach out directly."
        primaryButtonText="Contact School Support"
        primaryButtonHref="/request-support"
        theme="charius"
      />
    </div>
  );
}
