/** Small helpers for the admin reports' figures. */

/** The value `p` (0–1) of the way up `values` (nearest rank); null for none. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[rank]!;
}

export const median = (values: readonly number[]): number | null => percentile(values, 0.5);

/** Milliseconds as seconds to one decimal; null stays null. */
export const toSeconds = (ms: number | null): number | null => (ms === null ? null : Math.round(ms / 100) / 10);

/** Rounds to one decimal; null stays null. */
export const round1 = (n: number | null): number | null => (n === null ? null : Math.round(n * 10) / 10);

/** Whole-number share of `part` in `whole`, null when there is no whole. */
export const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

export interface Count {
  readonly value: string;
  readonly count: number;
}

/** The commonest values, most first (ties by name), at most `limit`. */
export function topCounts(values: readonly string[], limit: number): Count[] {
  const counts = values.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>());
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}
