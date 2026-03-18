export {
  getPublicImpactAggregatePostgres as getPublicImpactAggregate,
  getPortalDashboardDataPostgres as getPortalDashboardData,
  getImpactSummaryPostgres as getImpactSummary,
  listPortalImpactReportsAsyncPostgres as listPublicImpactReportsAsync,
} from "@/lib/server/postgres/repositories/metrics";

export {
  getPublicImpactMetrics as getLearningGainsData, // Approximate mapping
} from "@/lib/server/postgres/repositories/public-metrics";

// TODO: Implement missing specialized dashboard views in PostgreSQL repos
// For now, we'll export placeholders or existing partials from metrics
export {
  getImpactSummaryPostgres as getGovernmentViewData,
  getImpactSummaryPostgres as getImpactDrilldownData,
  getImpactSummaryPostgres as getRegionStats,
  getImpactSummaryPostgres as getDistrictStats,
} from "@/lib/server/postgres/repositories/metrics";
