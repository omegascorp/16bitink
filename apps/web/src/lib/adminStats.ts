import type { FunnelStep } from './db/eventRepo';

/** Report periods the analytics page offers, in days. */
export const PERIODS = [7, 30, 90, 365] as const;
export type Period = (typeof PERIODS)[number];
const DAY_MS = 24 * 60 * 60 * 1000;

/** The period named by `?days=`, 30 by default. */
export function parsePeriod(raw: string | null): Period {
  return PERIODS.find((p) => String(p) === raw) ?? 30;
}

/** The last `days` days, up to now. */
export function rangeFor(days: number, now: Date): { from: Date; to: Date } {
  return { from: new Date(now.getTime() - days * DAY_MS), to: now };
}

/** "45s", "3m 20s", "2h 5m". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`;
  const m = Math.floor((s % 3600) / 60);
  return `${Math.floor(s / 3600)}h${m ? ` ${m}m` : ''}`;
}

/** 0–100, rounded; 0 when there is nothing to divide by. */
export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export interface FunnelRow extends FunnelStep {
  /** Share of the players who started the first level that got this far. */
  readonly ofStart: number;
  /** Share of this level's players who beat it. */
  readonly winRate: number;
  /** Share of the players who reached the level before that also reached this one. */
  readonly fromPrevious: number | null;
}

/**
 * Adds funnel shares to the steps (already in level order). The base is the
 * first level's players, or the biggest step when level 1 is missing (e.g.
 * a level renumbered since).
 */
export function funnelRows(steps: readonly FunnelStep[]): FunnelRow[] {
  const base = steps.find((s) => s.n === 1)?.reached ?? Math.max(0, ...steps.map((s) => s.reached));
  return steps.map((step, i) => {
    const prev = steps[i - 1];
    return {
      ...step,
      ofStart: percent(step.reached, base),
      winRate: percent(step.finished, step.reached),
      fromPrevious: prev && prev.n === step.n - 1 ? percent(step.reached, prev.reached) : null,
    };
  });
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

/** "Germany" for "DE"; "Unknown" when there's no code. */
export function countryName(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return 'Unknown';
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}
