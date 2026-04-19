import { queryPostgres } from "@/lib/server/postgres/client";
import { School, Building2, Globe, CheckCircle, Clock } from "lucide-react";

type MilestoneSummary = {
  schoolCount: number;
  districtCount: number;
  regionCount: number;
  recentSponsored: Array<{
    reference: string;
    type: string;
    targetName: string | null;
    donorName: string | null;
    anonymous: boolean;
    amount: number;
    currency: string;
    paidAt: string | null;
  }>;
};

async function getSponsorshipMilestones(): Promise<MilestoneSummary> {
  try {
    const [counts, recent] = await Promise.all([
      queryPostgres(`
        SELECT
          COUNT(*) FILTER (WHERE sponsorship_type = 'school')::int   AS school_count,
          COUNT(*) FILTER (WHERE sponsorship_type = 'district')::int AS district_count,
          COUNT(*) FILTER (WHERE sponsorship_type IN ('region','sub-region','sub_region','subregion'))::int AS region_count
        FROM sponsorships
        WHERE payment_status IN ('Completed', 'Paid')
      `),
      queryPostgres(`
        SELECT
          sponsorship_reference, sponsorship_type, sponsorship_target_name,
          donor_name, organization_name, anonymous, amount::numeric, currency,
          paid_at::text AS paid_at
        FROM sponsorships
        WHERE payment_status IN ('Completed', 'Paid')
        ORDER BY paid_at DESC NULLS LAST, created_at DESC
        LIMIT 6
      `),
    ]);

    const c = counts.rows[0];
    return {
      schoolCount: Number(c?.school_count ?? 0),
      districtCount: Number(c?.district_count ?? 0),
      regionCount: Number(c?.region_count ?? 0),
      recentSponsored: recent.rows.map((r) => ({
        reference: String(r.sponsorship_reference),
        type: String(r.sponsorship_type),
        targetName: r.sponsorship_target_name ? String(r.sponsorship_target_name) : null,
        donorName: String(r.organization_name ?? r.donor_name ?? "Anonymous"),
        anonymous: Boolean(r.anonymous),
        amount: Number(r.amount),
        currency: String(r.currency),
        paidAt: r.paid_at ? String(r.paid_at) : null,
      })),
    };
  } catch {
    return { schoolCount: 0, districtCount: 0, regionCount: 0, recentSponsored: [] };
  }
}

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function typeIcon(type: string) {
  if (type === "school") return <School className="w-4 h-4 text-[#006b61]" />;
  if (type === "district") return <Building2 className="w-4 h-4 text-[#FA7D15]" />;
  return <Globe className="w-4 h-4 text-blue-500" />;
}

function typeLabel(type: string) {
  if (type === "school") return "School";
  if (type === "district") return "District";
  return "Region";
}

export async function SponsorshipMilestonesWidget() {
  const data = await getSponsorshipMilestones();
  const totalFunded = data.schoolCount + data.districtCount + data.regionCount;

  if (totalFunded === 0 && data.recentSponsored.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#006b61]/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-[#006b61]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">Funded So Far</h3>
          <p className="text-sm text-gray-500">Active sponsorships already making an impact</p>
        </div>
      </div>

      {/* Milestone counters */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-[#006b61]/5 border border-[#006b61]/10 p-4 text-center">
          <School className="w-5 h-5 text-[#006b61] mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-[#006b61]">{data.schoolCount}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Schools</p>
        </div>
        <div className="rounded-xl bg-[#FA7D15]/5 border border-[#FA7D15]/10 p-4 text-center">
          <Building2 className="w-5 h-5 text-[#FA7D15] mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-[#FA7D15]">{data.districtCount}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Districts</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
          <Globe className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-blue-600">{data.regionCount}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Regions</p>
        </div>
      </div>

      {/* Recent sponsorships */}
      {data.recentSponsored.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Recently Funded</p>
          <div className="space-y-2">
            {data.recentSponsored.map((s) => (
              <div
                key={s.reference}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
                    {typeIcon(s.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {s.targetName ?? typeLabel(s.type)}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {s.anonymous ? "Anonymous" : s.donorName} · {typeLabel(s.type)} sponsorship
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs font-semibold text-gray-700">
                    {fmt(s.amount, s.currency)}
                  </span>
                  {s.paidAt ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-50">
        Each sponsorship is matched to a specific school, district, or region in our program database.
      </p>
    </div>
  );
}
