import { queryPostgres } from "@/lib/server/postgres/client";

export type ResearchDatasetRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  datasetType: string;
  version: string;
  fyRange: string | null;
  sampleSize: number | null;
  doi: string | null;
  zenodoRecordId: string | null;
  licenseHtml: string;
  lastBuiltAt: string | null;
  isActive: boolean;
  createdAt: string;
};

const COLS = `
  id, slug, title, description, dataset_type AS "datasetType", version,
  fy_range AS "fyRange", sample_size AS "sampleSize", doi,
  zenodo_record_id AS "zenodoRecordId", license_html AS "licenseHtml",
  last_built_at AS "lastBuiltAt", is_active AS "isActive", created_at AS "createdAt"
`;

export async function listActiveResearchDatasets(): Promise<ResearchDatasetRow[]> {
  const result = await queryPostgres(
    `SELECT ${COLS} FROM research_datasets WHERE is_active IS TRUE ORDER BY title`,
  );
  return result.rows as ResearchDatasetRow[];
}

export async function findResearchDatasetBySlug(slug: string): Promise<ResearchDatasetRow | null> {
  const result = await queryPostgres(
    `SELECT ${COLS} FROM research_datasets WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return (result.rows[0] as ResearchDatasetRow | undefined) ?? null;
}

export async function recordLicenseAcceptance(input: {
  email: string;
  fullName: string;
  organization?: string | null;
  intendedUse: string;
  signedText: string;
  ipAddress?: string | null;
}): Promise<number> {
  const result = await queryPostgres<{ id: number }>(
    `INSERT INTO research_license_acceptances (
      email, full_name, organization, intended_use, signed_text, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.email.trim().toLowerCase(),
      input.fullName.trim(),
      input.organization?.trim() ?? null,
      input.intendedUse.trim(),
      input.signedText,
      input.ipAddress ?? null,
    ],
  );
  return Number(result.rows[0]?.id ?? 0);
}

export async function recordResearchDownload(input: {
  datasetId: number;
  licenseAcceptanceId: number | null;
  email: string | null;
  organization: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  bytesServed: number;
}): Promise<void> {
  await queryPostgres(
    `INSERT INTO research_dataset_downloads (
      dataset_id, license_acceptance_id, email, organization, ip_address, user_agent, bytes_served
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.datasetId,
      input.licenseAcceptanceId,
      input.email,
      input.organization,
      input.ipAddress,
      input.userAgent,
      input.bytesServed,
    ],
  );
}
