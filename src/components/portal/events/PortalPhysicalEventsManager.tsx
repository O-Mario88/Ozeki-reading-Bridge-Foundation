"use client";

import Link from "next/link";
import { PlusCircle, MapPin, Users, Calendar } from "lucide-react";
import type { TrainingEventRow } from "@/lib/server/postgres/repositories/training-events";

export function PortalPhysicalEventsManager({ events }: { events: TrainingEventRow[] }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
           <h2 className="text-xl font-bold text-gray-900">In-Person Training Hub</h2>
           <p className="text-gray-500">Manage physical events, monitor school pre-registrations, and track Day-Of attendance.</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2">
           <PlusCircle className="w-4 h-4" /> Schedule New Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {events.map((event) => (
            <Link key={event.id} href={\`/portal/events/physical/\${event.id}\`} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-[var(--accent-color)] hover:shadow-md transition-all group block">
               <div className="flex justify-between items-start mb-4">
                  <span className={\`px-2 py-1 text-xs font-bold rounded-full \${event.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}\`}>
                     {event.status}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">#{event.eventCode || event.id}</span>
               </div>
               
               <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-[var(--accent-color)] transition-colors line-clamp-1">{event.title}</h3>
               
               <div className="space-y-2 mt-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {event.startDatetime ? new Date(event.startDatetime).toLocaleDateString() : "No date"}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="line-clamp-1">{event.venueName}, {event.district}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.maxParticipants ? \`Capacity: \${event.maxParticipants}\` : "Open Capacity"}</span>
                  </div>
               </div>
            </Link>
         ))}
         
         {events.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed">
               No physical events scheduled. Click "Schedule New Event" to begin.
            </div>
         )}
      </div>
    </div>
  );
}
