/**
 * Pagination helpers for API routes.
 *
 * `clampLimit` accepts the raw query string value, falls back to the supplied
 * default if the input is missing/invalid, and clamps the result to [1, max].
 * Callers should always pass a sensible `max` to avoid OOM on `?limit=999999`.
 */

const DEFAULT_MAX = 500;

export function clampLimit(
  raw: string | number | null | undefined,
  fallback: number,
  max: number = DEFAULT_MAX,
): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.min(fallback, max);
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

export function clampOffset(
  raw: string | number | null | undefined,
  fallback: number = 0,
  max: number = 1_000_000,
): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return Math.min(fallback, max);
  return Math.max(0, Math.min(max, Math.floor(parsed)));
}
