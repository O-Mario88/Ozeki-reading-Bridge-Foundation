/**
 * Dev-only screenshot fallback gate.
 *
 * Portal dashboards have rich `FALLBACK` constants holding screenshot-faithful
 * sample data (KPI numbers, sample school names, mock chart series). These let
 * the design demo-render in development before live Postgres data exists.
 *
 * In production we don't want sample data leaking through — pages should render
 * empty-state from real (possibly-empty) database queries.
 *
 * Wrap a dashboard's FALLBACK definition with `devFallback({ ... })`. In
 * development the rich object is returned unchanged; in production a
 * structurally-identical mirror is returned with every number zeroed, every
 * array emptied, every string cleared, and every boolean falsified. The page's
 * existing `liveX ?? FALLBACK.x` patterns then behave correctly:
 *
 *   - dev: live data, falling back to rich sample
 *   - prod: live data, falling back to a zero/empty shape that renders as
 *     the empty state the live UI is already prepared to handle
 *
 * No call-site changes are needed in dashboard code — only the FALLBACK
 * definition gets wrapped.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function devFallback<T>(value: T): T {
  if (!IS_PRODUCTION) return value;
  return emptyMirror(value);
}

function emptyMirror<T>(value: T): T {
  if (Array.isArray(value)) return [] as unknown as T;
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return 0 as unknown as T;
  if (typeof value === "string") return "" as unknown as T;
  if (typeof value === "boolean") return false as unknown as T;
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      result[key] = emptyMirror((value as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return value;
}
