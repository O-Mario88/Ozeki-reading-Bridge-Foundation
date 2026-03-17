import { redirect } from "next/navigation";

export default async function ImpactReportLegacyViewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/impact-reports/${code}`);
}
