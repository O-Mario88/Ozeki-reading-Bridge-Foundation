"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventAttendeeRow } from "@/lib/server/postgres/repositories/training-events";
import { CheckCircle2, XCircle, Clock, BookOpen } from "lucide-react";

export function PortalPhysicalEventDetails({ 
  eventId,
  eventStatus,
  attendees, 
  eventTitle,
  recordedLessons 
}: { 
  eventId: number,
  eventStatus: string,
  attendees: EventAttendeeRow[], 
  eventTitle: string,
  recordedLessons: { id: number, title: string }[] 
}) {
  const router = useRouter();
  const [localAttendees, setLocalAttendees] = useState<EventAttendeeRow[]>(attendees);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  
  // Finalization State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Group by School
  const groupedBySchool = localAttendees.reduce((acc, curr) => {
    if (!acc[curr.schoolName]) acc[curr.schoolName] = [];
    acc[curr.schoolName].push(curr);
    return acc;
  }, {} as Record<string, EventAttendeeRow[]>);

  const updateAttendance = async (registrationTeacherId: number, status: string) => {
    setIsUpdating(registrationTeacherId);
    try {
      const res = await fetch("/api/events/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationTeacherId, status })
      });
      if (res.ok) {
        setLocalAttendees(prev => prev.map(a => 
          a.registrationTeacherId === registrationTeacherId ? { ...a, attendanceStatus: status } : a
        ));
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleFinalizeSubmit = async () => {
    setIsFinalizing(true);
    try {
      const res = await fetch("/api/events/admin/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, recommendedLessonIds: selectedLessons })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowFinalizeModal(false);
        router.refresh();
      } else {
        alert(data.message || "Failed to finalize event");
      }
    } catch(e) {
      alert("Network error processing finalization");
    } finally {
      setIsFinalizing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Present": return "bg-green-100 text-green-800 border-green-200";
      case "Absent": return "bg-red-100 text-red-800 border-red-200";
      case "Walk-in": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-[var(--border-color)]">
         <h2 className="text-xl font-bold mb-1">Day-Of Attendance: {eventTitle}</h2>
         <p className="text-sm text-gray-500">Track pre-registered expected teachers and mark arrivals.</p>
         
         <div className="flex gap-4 mt-6">
           <div className="px-4 py-2 bg-gray-50 rounded-lg border">
             <div className="text-sm text-gray-500 font-bold uppercase tracking-wide">Total Registered</div>
             <div className="text-2xl font-bold">{localAttendees.length}</div>
           </div>
           <div className="px-4 py-2 bg-green-50 rounded-lg border border-green-100">
             <div className="text-sm text-green-700 font-bold uppercase tracking-wide">Present</div>
             <div className="text-2xl font-bold text-green-800">{localAttendees.filter(a => a.attendanceStatus === 'Present').length}</div>
           </div>
           
           {eventStatus !== 'Completed' ? (
             <button onClick={() => setShowFinalizeModal(true)} className="ml-auto flex items-center gap-2 px-6 py-2 bg-[var(--primary-color)] text-white hover:opacity-90 font-bold rounded-lg shadow-sm">
                <BookOpen className="w-4 h-4" /> Finalize & Issue Certificates
             </button>
           ) : (
             <div className="ml-auto px-6 py-2 bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200">
                Event Officially Completed & Issued
             </div>
           )}
         </div>
      </div>

      <div className="space-y-8">
         {Object.entries(groupedBySchool).map(([schoolName, teachers]) => (
            <div key={schoolName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="bg-gray-50 px-6 py-4 border-b">
                 <h3 className="font-bold text-lg text-gray-900">{schoolName}</h3>
                 <p className="text-sm text-gray-500">Registered by: {teachers[0].registeredByName || 'Unknown'} • {teachers.length} expected</p>
               </div>
               
               <div className="divide-y">
                 {teachers.map(teacher => (
                   <div key={teacher.registrationTeacherId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                     <div>
                       <div className="font-medium text-gray-900 flex items-center gap-2">
                         <Link href={`/portal/teachers/${teacher.teacherUid}`} className="hover:text-[var(--primary-color)] transition-colors hover:underline">
                           {teacher.fullName}
                         </Link>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${getStatusColor(teacher.attendanceStatus)}`}>
                           {teacher.attendanceStatus}
                         </span>
                       </div>
                       <div className="text-sm text-gray-500 mt-1">
                         {teacher.roleTitle || "Teacher"} {teacher.phone ? `• ${teacher.phone}` : ""}
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2">
                       <button 
                         onClick={() => updateAttendance(teacher.registrationTeacherId, 'Present')}
                         disabled={isUpdating === teacher.registrationTeacherId || teacher.attendanceStatus === 'Present'}
                         className={`p-2 rounded flex items-center gap-1 text-sm font-medium border ${teacher.attendanceStatus === 'Present' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                       >
                         <CheckCircle2 className="w-4 h-4" /> 
                         <span className="hidden sm:inline">Present</span>
                       </button>
                       <button 
                         onClick={() => updateAttendance(teacher.registrationTeacherId, 'Absent')}
                         disabled={isUpdating === teacher.registrationTeacherId || teacher.attendanceStatus === 'Absent'}
                         className={`p-2 rounded flex items-center gap-1 text-sm font-medium border ${teacher.attendanceStatus === 'Absent' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                       >
                         <XCircle className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => updateAttendance(teacher.registrationTeacherId, 'Pending')}
                         disabled={isUpdating === teacher.registrationTeacherId || teacher.attendanceStatus === 'Pending'}
                         className={`p-2 rounded flex items-center gap-1 text-sm font-medium border ${teacher.attendanceStatus === 'Pending' ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                         title="Reset to Pending"
                       >
                         <Clock className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
         ))}
         
         {Object.keys(groupedBySchool).length === 0 && (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed text-gray-500">
               No schools have registered for this event yet.
            </div>
         )}
      </div>

      {/* FINALIZATION MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
              <div className="p-6 bg-gray-50 border-b">
                 <h3 className="text-xl font-bold flex items-center gap-2">Close Event Loop</h3>
                 <p className="text-sm text-gray-500 mt-1">
                   This action will immediately generate unique certificates for the <strong>{localAttendees.filter(a => a.attendanceStatus === 'Present').length} teachers</strong> marked "Present" and push them to their public Teacher Profiles.
                 </p>
              </div>
              <div className="p-6 space-y-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Push Recommended Vimeo Lessons (Optional)</label>
                   <p className="text-xs text-gray-500 mb-4">Select up to 3 recorded lessons that directly supplement the material covered at this physical workshop.</p>
                   <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                     {recordedLessons.map(lesson => (
                       <label key={lesson.id} className="flex items-start gap-3 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors">
                         <input 
                           type="checkbox" 
                           className="mt-1"
                           checked={selectedLessons.includes(lesson.id)}
                           onChange={(e) => {
                             if(e.target.checked) setSelectedLessons([...selectedLessons, lesson.id]);
                             else setSelectedLessons(selectedLessons.filter(id => id !== lesson.id));
                           }}
                         />
                         <span className="text-sm font-medium leading-tight">{lesson.title}</span>
                       </label>
                     ))}
                   </div>
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                 <button disabled={isFinalizing} onClick={() => setShowFinalizeModal(false)} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-200 border bg-white shadow-sm">Cancel</button>
                 <button disabled={isFinalizing} onClick={handleFinalizeSubmit} className="px-5 py-2 rounded-lg font-bold text-white bg-[var(--primary-color)] hover:opacity-90 shadow-sm flex items-center gap-2">
                    {isFinalizing ? "Finalizing Engine..." : "Confirm & Trigger Link"}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
