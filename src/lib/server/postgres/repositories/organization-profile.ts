import { officialContact } from "@/lib/contact";
import { queryPostgres } from "@/lib/server/postgres/client";

export type OrganizationProfileRecord = {
  id: string | null;
  name: string;
  address: string;
  poBox: string;
  telephone: string;
  email: string;
  tin: string;
  registrationNumber: string;
  logoStorageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpsertOrganizationProfileInput = {
  name: string;
  address: string;
  poBox: string;
  telephone: string;
  email: string;
  tin: string;
  registrationNumber: string;
  logoStorageUrl?: string | null;
};

type OrganizationProfileRow = {
  id: string;
  name: string;
  address: string;
  poBox: string;
  telephone: string;
  email: string;
  tin: string;
  registrationNumber: string;
  logoStorageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const CACHE_TTL_MS = 60_000;

let cachedProfile: { value: OrganizationProfileRecord; expiresAt: number } | null = null;

function fallbackProfile(): OrganizationProfileRecord {
  const now = new Date().toISOString();
  return {
    id: null,
    name: "Ozeki Reading Bridge Foundation",
    address: officialContact.address,
    poBox: officialContact.postalAddress,
    telephone: officialContact.phoneDisplay,
    email: officialContact.email,
    tin: officialContact.tin,
    registrationNumber: officialContact.regNo,
    logoStorageUrl: "/photos/logo.png",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function mapProfileRow(row: Record<string, unknown>): OrganizationProfileRecord {
  return {
    id: row.id ? String(row.id) : null,
    name: String(row.name ?? "").trim() || fallbackProfile().name,
    address: String(row.address ?? "").trim() || fallbackProfile().address,
    poBox: String(row.poBox ?? "").trim() || fallbackProfile().poBox,
    telephone: String(row.telephone ?? "").trim() || fallbackProfile().telephone,
    email: String(row.email ?? "").trim() || fallbackProfile().email,
    tin: String(row.tin ?? "").trim() || fallbackProfile().tin,
    registrationNumber:
      String(row.registrationNumber ?? "").trim() || fallbackProfile().registrationNumber,
    logoStorageUrl: row.logoStorageUrl ? String(row.logoStorageUrl) : null,
    isActive: Boolean(row.isActive),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

export function invalidateOrganizationProfileCache() {
  cachedProfile = null;
}

export async function getActiveOrganizationProfile(
  options?: { fresh?: boolean },
): Promise<OrganizationProfileRecord> {
  const now = Date.now();
  if (!options?.fresh && cachedProfile && cachedProfile.expiresAt > now) {
    return cachedProfile.value;
  }

  try {
    const result = await queryPostgres(
      `
      SELECT
        id::text AS id,
        name,
        address,
        po_box AS "poBox",
        telephone,
        email,
        tin,
        registration_number AS "registrationNumber",
        logo_storage_url AS "logoStorageUrl",
        is_active AS "isActive",
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
      FROM organization_profile
      WHERE is_active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
      `,
    );

    const mapped = result.rows[0]
      ? mapProfileRow(result.rows[0] as Record<string, unknown>)
      : fallbackProfile();
    cachedProfile = {
      value: mapped,
      expiresAt: now + CACHE_TTL_MS,
    };
    return mapped;
  } catch {
    const fallback = fallbackProfile();
    cachedProfile = {
      value: fallback,
      expiresAt: now + CACHE_TTL_MS,
    };
    return fallback;
  }
}

export async function upsertOrganizationProfile(
  input: UpsertOrganizationProfileInput,
): Promise<OrganizationProfileRecord> {
  const existing = await queryPostgres<{ id: string }>(
    `
    SELECT id::text AS id
    FROM organization_profile
    WHERE is_active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1
    `,
  );

  const values = [
    input.name.trim(),
    input.address.trim(),
    input.poBox.trim(),
    input.telephone.trim(),
    input.email.trim().toLowerCase(),
    input.tin.trim(),
    input.registrationNumber.trim(),
    input.logoStorageUrl?.trim() || null,
  ];

  let row: OrganizationProfileRow | undefined;

  if (existing.rows[0]?.id) {
    const updated = await queryPostgres<OrganizationProfileRow>(
      `
      UPDATE organization_profile
      SET
        name = $2,
        address = $3,
        po_box = $4,
        telephone = $5,
        email = $6,
        tin = $7,
        registration_number = $8,
        logo_storage_url = $9,
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        name,
        address,
        po_box AS "poBox",
        telephone,
        email,
        tin,
        registration_number AS "registrationNumber",
        logo_storage_url AS "logoStorageUrl",
        is_active AS "isActive",
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
      `,
      [existing.rows[0].id, ...values],
    );
    row = updated.rows[0];
  } else {
    const inserted = await queryPostgres<OrganizationProfileRow>(
      `
      INSERT INTO organization_profile (
        name,
        address,
        po_box,
        telephone,
        email,
        tin,
        registration_number,
        logo_storage_url,
        is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, TRUE
      )
      RETURNING
        id::text AS id,
        name,
        address,
        po_box AS "poBox",
        telephone,
        email,
        tin,
        registration_number AS "registrationNumber",
        logo_storage_url AS "logoStorageUrl",
        is_active AS "isActive",
        created_at::text AS "createdAt",
        updated_at::text AS "updatedAt"
      `,
      values,
    );
    row = inserted.rows[0];
  }

  if (!row?.id) {
    throw new Error("Could not persist organization profile.");
  }

  await queryPostgres(
    `
    UPDATE organization_profile
    SET is_active = FALSE, updated_at = NOW()
    WHERE id <> $1::uuid
      AND is_active = TRUE
    `,
    [row.id],
  );

  const mapped = mapProfileRow(row as unknown as Record<string, unknown>);
  cachedProfile = { value: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
  return mapped;
}
