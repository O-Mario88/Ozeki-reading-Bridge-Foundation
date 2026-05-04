import { queryPostgres } from "@/lib/server/postgres/client";

export type FactCheckRow = {
  id: number;
  statKey: string;
  displayLabel: string;
  currentValue: string | null;
  sourceDescription: string;
  methodology: string;
  sampleSize: string | null;
  lastRecomputedAt: string | null;
  notes: string | null;
};

export type MediaKitAssetRow = {
  id: number;
  slug: string;
  title: string;
  assetType: string;
  downloadUrl: string;
  thumbnailUrl: string | null;
  description: string | null;
  bytes: number | null;
  displayOrder: number;
};

export async function listFactCheckAttestations(): Promise<FactCheckRow[]> {
  const result = await queryPostgres(
    `SELECT id, stat_key AS "statKey", display_label AS "displayLabel",
            current_value AS "currentValue",
            source_description AS "sourceDescription", methodology,
            sample_size AS "sampleSize", last_recomputed_at AS "lastRecomputedAt", notes
     FROM fact_check_attestations
     WHERE is_active IS TRUE
     ORDER BY stat_key`,
  );
  return result.rows as FactCheckRow[];
}

export async function listMediaKitAssets(): Promise<MediaKitAssetRow[]> {
  const result = await queryPostgres(
    `SELECT id, slug, title, asset_type AS "assetType", download_url AS "downloadUrl",
            thumbnail_url AS "thumbnailUrl", description, bytes,
            display_order AS "displayOrder"
     FROM media_kit_assets
     WHERE is_active IS TRUE
     ORDER BY display_order, lower(title)`,
  );
  return result.rows as MediaKitAssetRow[];
}
