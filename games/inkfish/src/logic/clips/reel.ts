import { HIGHLIGHT, pickHighlights, type Moment, type Span } from './moments';

/**
 * The shape of every clip: the ending first (slowed down), a held frame with
 * the card on it, a rewind, the best moments in order, and then the seconds
 * leading up to the ending, which run straight into the first frame again,
 * so the clip loops.
 */
export type ShotKind = 'climax' | 'hold' | 'rewind' | 'highlight' | 'leadIn';

export interface Shot {
  readonly kind: ShotKind;
  /** Footage played, seconds on the recording's clock; a still when from === to. */
  readonly from: number;
  readonly to: number;
  /** Playback speed: 1 is real time, below 1 slow motion, 0 a still. */
  readonly speed: number;
  /** How long the shot lasts in the clip. */
  readonly seconds: number;
}

export const REEL = {
  /** Seconds before the ending that the climax starts, so the bite or the last gulp is seen coming. */
  before: 0.15,
  /** Seconds of footage after the ending: the death or the win playing out. */
  after: 1.6,
  slow: 0.55,
  hold: 1.4,
  rewind: 0.6,
  leadIn: 2.4,
  maxHighlights: 3,
} as const;

const footageShot = (kind: ShotKind, from: number, to: number, speed: number): Shot => ({ kind, from, to, speed, seconds: (to - from) / speed });
const still = (kind: ShotKind, at: number, seconds: number): Shot => ({ kind, from: at, to: at, speed: 0, seconds });

/** The clip for a level that ended at `end`; empty when the ending wasn't recorded. */
export function planReel(end: number, moments: readonly Moment[], footage: readonly Span[]): Shot[] {
  const start = end - REEL.before;
  const span = footage.find((s) => s.from <= start && s.to >= end);
  if (!span) return [];
  const climax = footageShot('climax', start, Math.min(end + REEL.after, span.to), REEL.slow);
  const leadFrom = Math.max(span.from, start - REEL.leadIn);
  const highlights = pickHighlights(moments, { before: leadFrom, max: REEL.maxHighlights, footage })
    .map((m) => footageShot('highlight', m.at - HIGHLIGHT.pre, m.at + HIGHLIGHT.post, 1));
  return [
    climax,
    still('hold', climax.to, REEL.hold),
    still('rewind', climax.to, REEL.rewind),
    ...highlights,
    footageShot('leadIn', leadFrom, start, 1),
  ];
}

export function reelSeconds(shots: readonly Shot[]): number {
  return shots.reduce((sum, s) => sum + s.seconds, 0);
}
