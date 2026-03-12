"use client";

import dynamic from "next/dynamic";

const PublicImpactMapExplorer = dynamic(
  () =>
    import("@/components/dashboard/map/PublicImpactMapExplorer").then(
      (module) => module.PublicImpactMapExplorer,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="card" aria-busy="true">
        <h2>Live Literacy Impact Dashboard</h2>
        <p>Loading live dashboard...</p>
      </section>
    ),
  },
);

export default function LiveImpactDashboard() {
  return <PublicImpactMapExplorer compact />;
}

