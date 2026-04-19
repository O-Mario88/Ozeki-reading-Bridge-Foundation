import { queryPostgres } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* In-memory TTL cache — settings change infrequently; avoid per-request SQL   */
/* ────────────────────────────────────────────────────────────────────────── */

type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}
function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
export function invalidateSettingsCache(prefix?: string): void {
  if (!prefix) return cache.clear();
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* system_settings: typed key/value store                                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type SettingDataType = "string" | "int" | "float" | "json" | "bool";

function coerce<T>(raw: string, type: SettingDataType, fallback: T): T {
  try {
    if (type === "int") return Number.parseInt(raw, 10) as unknown as T;
    if (type === "float") return Number.parseFloat(raw) as unknown as T;
    if (type === "bool") return (raw === "true" || raw === "1") as unknown as T;
    if (type === "json") return JSON.parse(raw) as T;
    return raw as unknown as T;
  } catch {
    return fallback;
  }
}

export async function getSettingPostgres<T = string>(
  key: string,
  fallback: T,
): Promise<T> {
  const cacheKey = `setting:${key}`;
  const cached = cacheGet<T>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await queryPostgres(
      `SELECT setting_value, data_type FROM system_settings WHERE setting_key = $1 LIMIT 1`,
      [key],
    );
    const row = res.rows[0];
    if (!row) {
      cacheSet(cacheKey, fallback);
      return fallback;
    }
    const value = coerce<T>(String(row.setting_value), row.data_type as SettingDataType, fallback);
    cacheSet(cacheKey, value);
    return value;
  } catch {
    return fallback;
  }
}

export async function setSettingPostgres(
  key: string,
  value: string,
  dataType: SettingDataType,
  updatedByUserId: number,
  description?: string,
): Promise<void> {
  await queryPostgres(
    `INSERT INTO system_settings (setting_key, setting_value, data_type, description, updated_by_user_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = EXCLUDED.setting_value,
       data_type     = EXCLUDED.data_type,
       description   = COALESCE(EXCLUDED.description, system_settings.description),
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at    = NOW()`,
    [key, value, dataType, description ?? null, updatedByUserId],
  );
  invalidateSettingsCache(`setting:${key}`);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* currency_rates                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const UGX_PER_USD_FALLBACK = 3750;

/** Returns how many UGX equal 1 USD. Used throughout finance + public impact. */
export async function getUgxPerUsdPostgres(): Promise<number> {
  const cacheKey = `rate:UGX_per_USD`;
  const cached = cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    // Look up the reverse rate (UGX → USD); invert to get UGX-per-USD
    const res = await queryPostgres(
      `SELECT rate FROM currency_rates
       WHERE is_active IS TRUE AND from_currency = 'UGX' AND to_currency = 'USD'
       LIMIT 1`,
    );
    const row = res.rows[0];
    if (!row) {
      // Try the forward pair
      const res2 = await queryPostgres(
        `SELECT rate FROM currency_rates
         WHERE is_active IS TRUE AND from_currency = 'USD' AND to_currency = 'UGX'
         LIMIT 1`,
      );
      const rate = res2.rows[0] ? Number(res2.rows[0].rate) : UGX_PER_USD_FALLBACK;
      cacheSet(cacheKey, rate);
      return rate;
    }
    const ugxPerUsd = Number(row.rate) > 0 ? 1 / Number(row.rate) : UGX_PER_USD_FALLBACK;
    cacheSet(cacheKey, ugxPerUsd);
    return ugxPerUsd;
  } catch {
    return UGX_PER_USD_FALLBACK;
  }
}

/** Convert UGX → USD using the live rate. */
export async function convertUgxToUsdPostgres(ugx: number): Promise<number> {
  const rate = await getUgxPerUsdPostgres();
  return rate > 0 ? Math.round(ugx / rate) : 0;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* sponsorship_tiers                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type SponsorshipTier = {
  id: number;
  tierKey: string;
  title: string;
  subtitle: string | null;
  amountUsd: number;
  amountUgx: number | null;
  description: string | null;
  features: string[];
  highlight: boolean;
  sortOrder: number;
  isActive: boolean;
};

export async function listActiveSponsorshipTiersPostgres(): Promise<SponsorshipTier[]> {
  const cacheKey = "sponsorship_tiers:active";
  const cached = cacheGet<SponsorshipTier[]>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await queryPostgres(
      `SELECT * FROM sponsorship_tiers WHERE is_active IS TRUE ORDER BY sort_order ASC, amount_usd ASC`,
    );
    const tiers: SponsorshipTier[] = res.rows.map((r) => {
      let features: string[] = [];
      try {
        const parsed = JSON.parse(String(r.features_json ?? "[]"));
        features = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        features = [];
      }
      return {
        id: Number(r.id),
        tierKey: String(r.tier_key),
        title: String(r.title),
        subtitle: r.subtitle ? String(r.subtitle) : null,
        amountUsd: Number(r.amount_usd),
        amountUgx: r.amount_ugx != null ? Number(r.amount_ugx) : null,
        description: r.description ? String(r.description) : null,
        features,
        highlight: Boolean(r.highlight),
        sortOrder: Number(r.sort_order ?? 0),
        isActive: Boolean(r.is_active),
      };
    });
    cacheSet(cacheKey, tiers);
    return tiers;
  } catch {
    return [];
  }
}
