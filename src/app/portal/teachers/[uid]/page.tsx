import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";
import { getTeacherImpactProfilePostgres } from "@/lib/server/postgres/repositories/training-events";
import { PortalShell } from "@/components/portal/PortalShell";
import { Award, BookOpen, Clock, Download, PlayCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const profile = await getTeacherImpactProfilePostgres(resolvedParams.uid);
  return {
    title: profile ? `${profile.fullName} | Impact Profile` : "Teacher Profile",
  };
}

export default async function StaffTeacherProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const user = await requirePortalStaffUser();
  const resolvedParams = await params;
  const profile = await getTeacherImpactProfilePostgres(resolvedParams.uid);

  if (!profile) {
    return notFound();
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools" // Or a generic active state since we might launch from various places
      title="Teacher Impact Profile"
      description="Internal telemetry dashboard for analyzing individual teacher journey and event engagement."
    >
      <div className="mb-6">
        <Link href="/portal/events/physical" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 w-fit">
           <ArrowLeft className="w-4 h-4" /> Back to Event Management
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
         <div className="bg-[#006b61] text-white p-8 relative">
            <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-10" />
            <div className="relative z-10 flex items-center gap-6">
               <div className="w-20 h-20 bg-[#ff7235] rounded-full flex items-center justify-center shadow-lg border-4 border-white/20 shrink-0">
                  <ShieldCheck className="w-10 h-10 text-white" />
               </div>
               <div>
                  <h1 className="text-3xl font-extrabold">{profile.fullName}</h1>
                  <p className="text-green-100 font-medium tracking-wide uppercase mt-1">{profile.role}</p>
                  <p className="text-sm text-green-200 font-mono mt-1">UID: {resolvedParams.uid}</p>
               </div>
               <div className="ml-auto">
                 <button className="flex items-center gap-2 bg-white text-[#006b61] font-bold px-4 py-2 rounded-lg hover:bg-green-50 shadow-sm transition-colors">
                   <Download className="w-4 h-4" /> Export Teacher Report
                 </button>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* WORKSHOP HISTORY */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900">
              <Clock className="w-5 h-5 text-[var(--accent-color)]" /> Physical Workshops Attended
            </h2>
            {profile.workshopHistory.length > 0 ? (
              <ul className="space-y-4">
                {profile.workshopHistory.map((w, i) => (
                  <li key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{w.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{new Date(w.date).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No physical workshops recorded.</p>
            )}
         </div>

         <div className="space-y-8">
           {/* CERTIFICATES SECTION */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                 <Award className="w-5 h-5 text-[#ff7235]" /> Digital Certificates
              </h2>
              {profile.certificates.length > 0 ? (
                 <div className="space-y-3">
                    {profile.certificates.map(cert => (
                       <div key={cert.hash} className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
                          <div>
                             <p className="font-bold text-gray-900 leading-tight">{cert.eventTitle}</p>
                             <p className="text-xs text-gray-500 mt-1">Issued: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                          </div>
                          <span className="text-xs font-mono bg-white px-2 py-1 rounded text-gray-400 border">{cert.hash}</span>
                       </div>
                    ))}
                 </div>
              ) : (
                <p className="text-gray-500 text-sm">No verified certificates issued yet.</p>
              )}
           </div>

           {/* RECOMMENDED DIGITAL JOURNEY */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-gray-900">
                <BookOpen className="w-5 h-5 text-purple-600" /> Digital Journey Recommendations
              </h2>
              {profile.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {profile.recommendations.map((rec) => (
                    <div key={rec.id} className="flex gap-4 p-3 bg-gray-50 rounded-xl border items-center">
                       <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0 flex items-center justify-center bg-cover bg-center overflow-hidden" style={rec.thumbnailUrl ? { backgroundImage: `url(${rec.thumbnailUrl})` } : {}}>
                          {!rec.thumbnailUrl && <PlayCircle className="w-5 h-5 text-gray-400" />}
                       </div>
                       <div className="flex-1 py-1">
                          <p className="font-bold text-sm text-gray-900 line-clamp-1">{rec.title}</p>
                          <p className="text-xs text-purple-600 font-medium uppercase tracking-wide mt-0.5">{rec.status}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No new digital recommendations assigned at this time.</p>
              )}
           </div>
         </div>
      </div>
    </PortalShell>
  );
}
