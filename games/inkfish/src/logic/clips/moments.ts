/**
 * The moments of a level worth putting in its clip. The game notes each one
 * as it happens; at the end the best few become the clip's highlights.
 */
export type MomentKind = 'giant' | 'birdCombo' | 'bird' | 'escape' | 'wriggle' | 'bounty' | 'frenzy' | 'grow';

export interface Moment {
  readonly kind: MomentKind;
  /** When it happened, seconds on the recording's clock. */
  readonly at: number;
  /** How big it was: birds in the combo, the frenzy multiplier. */
  readonly weight?: number;
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

/** How exciting each kind of moment is to watch. */
const BASE: Readonly<Record<MomentKind, number>> = {
  giant: 100, birdCombo: 70, escape: 50, bird: 45, wriggle: 40, bounty: 40, frenzy: 30, grow: 25,
};

/** A highlight shows this much before its moment and after it, seconds. */
export const HIGHLIGHT = { pre: 1.6, post: 1 } as const;

export function momentScore(m: Moment): number {
  return BASE[m.kind] * (1 + 0.25 * ((m.weight ?? 1) - 1));
}

/** The stretch of footage a highlight around this moment shows. */
export function windowOf(m: Moment): Span {
  return { from: m.at - HIGHLIGHT.pre, to: m.at + HIGHLIGHT.post };
}

const overlaps = (a: Span, b: Span): boolean => a.from < b.to && b.from < a.to;
const covered = (w: Span, footage: readonly Span[]): boolean => footage.some((s) => s.from <= w.from && s.to >= w.to);

export interface PickOptions {
  /** Highlights must end before this, seconds (where the clip's lead-in starts). */
  readonly before: number;
  readonly max: number;
  /** The footage still kept; when given, highlights must lie within it. */
  readonly footage?: readonly Span[];
}

/**
 * The best non-overlapping windows, in the order they happened. A window
 * scores every moment inside it, so a bird caught just before a combo makes
 * that combo's window richer.
 */
export function pickHighlights(moments: readonly Moment[], opts: PickOptions): Moment[] {
  const candidates = moments
    .filter((m) => windowOf(m).to <= opts.before && (!opts.footage || covered(windowOf(m), opts.footage)))
    .map((m) => {
      const w = windowOf(m);
      const score = moments.filter((o) => o.at >= w.from && o.at <= w.to).reduce((sum, o) => sum + momentScore(o), 0);
      return { m, w, score };
    })
    .sort((a, b) => b.score - a.score || momentScore(b.m) - momentScore(a.m));
  const picked: { m: Moment; w: Span }[] = [];
  for (const c of candidates) {
    if (picked.length >= opts.max) break;
    if (!picked.some((p) => overlaps(p.w, c.w))) picked.push(c);
  }
  return picked.map((p) => p.m).sort((a, b) => a.at - b.at);
}
