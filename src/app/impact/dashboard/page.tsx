import type { Metadata } from "next";
import { PublicImpactMapExplorer } from "@/components/dashboard/map/PublicImpactMapExplorer";

export const metadata: Metadata = {
  title: "Live Impact Dashboard",
  description:
    "Public live literacy map explorer for Uganda with aggregated impact metrics by sub-region, district, and school.",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function ImpactDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact explorer</p>
          <h1>Live Literacy Impact Dashboard</h1>
          <p>
            Explore aggregated, privacy-protected literacy implementation data from Uganda
            down to each supported district and school.
          </p>
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

