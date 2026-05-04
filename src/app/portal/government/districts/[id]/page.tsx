import { notFound } from "next/navigation";
import { CalendarPlus, MapPin, GraduationCap, Activity } from "lucide-react";
import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";
import {
  getDistrictAssignmentByDistrict,
  listSchoolsInDistrict,
  listInterventionsForDistrict,
  listFidelityScoresForDistrict,
} from "@/lib/server/postgres/repositories/government-portal";
import { DistrictInterventionScheduler } from "@/components/external/DistrictInterventionScheduler";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const NUMBER = new Intl.NumberFormat("en-US");

export default async function DistrictOfficerDistrictPage({ params }: PageProps) {
  const user = await requireExternalUser("district_officer");
  const { id } = await params;
  const district = decodeURIComponent(id);

  const assignment = await getDistrictAssignmentByDistrict(user.id, district);
  if (!assignment) notFound();

  const [schools, interventions, fidelity] = await Promise.all([
    listSchoolsInDistrict(district),
    listInterventionsForDistrict(district, 100),
    listFidelityScoresForDistrict(district, 200),
  ]);

  const totalEnrolment = schools.reduce((acc, s) => acc + (s.enrollmentTotal ?? 0), 0);
  const activeSchools = schools.filter((s) => s.active).length;
  const avgFidelity = fidelity.length === 0 ? null
    : Math.round(fidelity.reduce((a, b) => a + (b.fidelityScore ?? 0), 0) / fidelity.length);

  const canSchedule = assignment.scope === "schedule" || assignment.scope === "admin";

  return (
    <ExternalShell
      user={user}
      roleLabel="District Officer"
      title={`${district} District`}
      description={`${assignment.region ?? "Region unset"} · scope: ${assignment.scope}`}
      navItems={[
        { href: "/portal/government/dashboard", label: "Dashboards" },
        { href: `/portal/government/districts/${encodeURIComponent(district)}`, label: "This district" },
      ]}
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Tile label="Schools" primary={NUMBER.format(schools.length)} secondary={`${activeSchools} active`} icon={GraduationCap} />
        <Tile label="Total enrolment" primary={NUMBER.format(totalEnrolment)} icon={MapPin} />
        <Tile label="Interventions" primary={NUMBER.format(interventions.length)} secondary={`${interventions.filter((i) => i.status === "planned").length} planned`} icon={CalendarPlus} />
        <Tile label="Avg fidelity score" primary={avgFidelity !== null ? `${avgFidelity}%` : "—"} secondary={`${fidelity.length} school-period rows`} icon={Activity} />
      </section>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden mb-6">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">School roster</h3>
          <p className="text-xs text-gray-500 mt-1">{schools.length} schools in {district}.</p>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">School</th>
              <th className="px-4 py-2.5 text-left">Code</th>
              <th className="px-4 py-2.5 text-left">Sub-county</th>
              <th className="px-4 py-2.5 text-right">Enrolment</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schools.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">No schools registered in this district yet.</td></tr>
            ) : (
              schools.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{s.schoolCode}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{s.subCounty ?? "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{NUMBER.format(s.enrollmentTotal ?? 0)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${s.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{s.active ? "active" : "paused"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {canSchedule ? (
        <section className="rounded-2xl bg-white border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Schedule an intervention</h3>
          <DistrictInterventionScheduler district={district} schools={schools.map((s) => ({ id: s.id, name: s.name }))} />
        </section>
      ) : null}

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden mb-6">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Recent interventions</h3>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">Scheduled</th>
              <th className="px-4 py-2.5 text-left">School</th>
              <th className="px-4 py-2.5 text-left">Type</th>
              <th className="px-4 py-2.5 text-left">Notes</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {interventions.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-500">No interventions scheduled yet.</td></tr>
            ) : (
              interventions.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-700 whitespace-nowrap">{i.scheduledFor}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-800">{i.schoolName ?? "District-wide"}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{i.interventionType}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-md truncate" title={i.notes ?? ""}>{i.notes ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      i.status === "completed" ? "bg-emerald-50 text-emerald-700"
                        : i.status === "planned" ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}>{i.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">School fidelity scores</h3>
          <p className="text-xs text-gray-500 mt-1">Composite score: visits delivered, GPS-verified, photographed, training attendance.</p>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">School</th>
              <th className="px-4 py-2.5 text-left">Period</th>
              <th className="px-4 py-2.5 text-right">Visits</th>
              <th className="px-4 py-2.5 text-right">GPS-verified</th>
              <th className="px-4 py-2.5 text-right">Photo-verified</th>
              <th className="px-4 py-2.5 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fidelity.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">No fidelity-score snapshots computed yet for this district.</td></tr>
            ) : (
              fidelity.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">{f.schoolName ?? `School #${f.schoolId}`}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.periodStart} → {f.periodEnd}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{f.visitsDelivered}/{f.visitsPlanned}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{f.visitsWithGps}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700 text-right">{f.visitsWithPhoto}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-[#066a67] text-right">{Math.round(f.fidelityScore)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </ExternalShell>
  );
}

function Tile({ label, primary, secondary, icon: Icon }: {
  label: string;
  primary: string;
  secondary?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{primary}</p>
          {secondary ? <p className="text-[10px] text-gray-500 mt-0.5">{secondary}</p> : null}
        </div>
        <Icon className="w-5 h-5 text-[#066a67] mt-1" />
      </div>
    </div>
  );
}
