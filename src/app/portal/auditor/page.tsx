import { ShieldCheck, Camera, MapPin, FileSearch, Users, CalendarClock } from "lucide-react";
import { getIntegrityBadgeForAuditor } from "@/lib/server/postgres/repositories/auditor-views";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrity Badge · Audit Portal",
};

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default async function AuditorLandingPage() {
  const badge = await getIntegrityBadgeForAuditor();

  const stats: { label: string; primary: string; secondary?: string; icon: typeof ShieldCheck; tone: "ok" | "info" | "warn" }[] = [
    {
      label: "Coaching visits",
      primary: badge.totalCoachingVisits.toLocaleString(),
      secondary: `${pct(badge.visitsWithGpsPhotos, badge.totalCoachingVisits)} have photo evidence`,
      icon: MapPin,
      tone: badge.visitsWithGpsPhotos > 0 ? "ok" : "info",
    },
    {
      label: "Training records",
      primary: badge.totalTrainingRecords.toLocaleString(),
      secondary: `${pct(badge.trainingsWithPhotos, badge.totalTrainingRecords)} have photo evidence`,
      icon: Camera,
      tone: badge.trainingsWithPhotos > 0 ? "ok" : "info",
    },
    {
      label: "Photo evidence on file",
      primary: badge.totalEvidencePhotos.toLocaleString(),
      secondary: `${pct(badge.evidencePhotosWithGps, badge.totalEvidencePhotos)} GPS-tagged · ${badge.uniquePhotoHashes.toLocaleString()} unique hashes`,
      icon: ShieldCheck,
      tone: "ok",
    },
    {
      label: "Audit log entries",
      primary: badge.totalAuditLogEntries.toLocaleString(),
      secondary: `${badge.auditLogLast7d.toLocaleString()} in last 7 days`,
      icon: FileSearch,
      tone: "info",
    },
    {
      label: "Active users",
      primary: badge.totalActiveUsers.toLocaleString(),
      secondary: `${badge.totalAuditors} active external auditor${badge.totalAuditors === 1 ? "" : "s"}`,
      icon: Users,
      tone: "info",
    },
    {
      label: "Audit log window",
      primary: formatDateTime(badge.oldestAuditEntry).split(",")[0] ?? "—",
      secondary: `→ ${formatDateTime(badge.latestAuditEntry).split(",")[0] ?? "—"}`,
      icon: CalendarClock,
      tone: "info",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-[#066a67] to-[#054d4a] text-white p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/10 p-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Integrity Badge</p>
            <h2 className="text-2xl font-bold mt-1">What this audit portal lets you verify, independently.</h2>
            <p className="text-sm text-white/85 mt-3 max-w-2xl">
              Every metric below is read directly from the production database. You can cross-check
              the audit trail entry-by-entry, inspect every finance posting, and see exactly which
              users hold which permissions — all read-only. No edits, no deletes, no exfiltration.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Live snapshot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const toneClass =
              stat.tone === "ok"
                ? "bg-[#066a67]/10 text-[#066a67]"
                : stat.tone === "warn"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-600";
            return (
              <div key={stat.label} className="rounded-2xl bg-white border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.primary}</p>
                    {stat.secondary ? (
                      <p className="text-xs text-gray-500 mt-1">{stat.secondary}</p>
                    ) : null}
                  </div>
                  <div className={`rounded-xl p-2 ${toneClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">How this is enforced</h3>
        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li>Auditor accounts are tied to a one-time invite issued by a Super Admin and expire automatically.</li>
          <li>Auditor sessions cannot create, update, or delete any record — the role grants no write permissions anywhere in the portal.</li>
          <li>Photo evidence carries a stored sha256 hash and (when present) GPS coordinates from EXIF metadata, so every photo you see can be re-verified outside this system.</li>
          <li>Every privileged action across the portal is recorded in <code>audit_logs</code>, including who did it, from which IP, and when.</li>
        </ul>
      </section>
    </div>
  );
}
