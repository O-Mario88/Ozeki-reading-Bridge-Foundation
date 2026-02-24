import type { Metadata } from "next";
import Link from "next/link";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Explore live aggregated literacy impact by Uganda, sub-region, district, and school.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function ImpactHubPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact overview</p>
          <h1>Live Literacy Impact Dashboard</h1>
          <p>
            Public dashboard data is aggregated from verified staff submissions and published
            with privacy controls.
          </p>
          <div className="action-row">
            <Link className="button button-ghost" href="/impact/reports">
              Download Latest Impact Report
            </Link>
            <Link className="inline-download-link" href="/impact/methodology">
              Methodology
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <PublicImpactMapExplorer
            syncUrl
            initialPeriod={firstValue(params.period) || "FY"}
            initialSelection={{
              region: firstValue(params.region),
              subRegion: firstValue(params.subRegion),
              district: firstValue(params.district),
              school: firstValue(params.school),
            }}
          />
        </div>
      </section>
    </>
  );
}
