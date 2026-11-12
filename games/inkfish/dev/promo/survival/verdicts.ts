import type { Evidence, FishId } from './species';
import { T } from './timeline';

/**
 * Every verdict in the tournament, worded as script.md words its evidence
 * tags: an OUT (red stamp, buzzer, the counter ticks down, the crowd goes
 * "ooh", the fish swims off) or a pass (green tick, chime). Timed on the word.
 */

export interface Verdict {
  readonly fish: FishId;
  readonly at: number;
  readonly kind: 'out' | 'pass';
  /** The evidence tag: what was measured, then its stamp. */
  readonly tag: string;
  readonly stamp: Evidence;
  /** A small second line under the tag. */
  readonly aside?: string;
  /** A quiet OUT: no buzzer (one sad piano note), a gentle stamp. */
  readonly soft?: boolean;
  /** The biggest stamp of the video. */
  readonly big?: boolean;
  /** When the fish starts swimming off (default: just after the stamp). */
  readonly leave?: number;
  /** How long the tag stays on screen (default 5 s; the round's end for passes said in a row). */
  readonly tagS?: number;
}

const out = (fish: FishId, at: number, tag: string, stamp: Evidence, more: Partial<Verdict> = {}): Verdict => ({ fish, at, kind: 'out', tag, stamp, ...more });
const pass = (fish: FishId, at: number, tag: string, stamp: Evidence, more: Partial<Verdict> = {}): Verdict => ({ fish, at, kind: 'pass', tag, stamp, ...more });

/** The school of 90 skipjack: OUT stamps rattle across them like hail over this window, the counter spinning 100 → 10. */
export const TUNA_HAIL = { from: T.ninetyOut, to: T.ninetyOut + 1.3, count: 90 } as const;

export const VERDICTS: readonly Verdict[] = [
  // Round 1: stop swimming.
  out('white', T.gwOut, 'classed as must-keep-swimming', 'ESTIMATED', { big: true, leave: T.scientists + 1.2, tagS: 7 }),
  out('mako', T.makoOut, 'same problem, say the books', 'ESTIMATED', { leave: T.makoOut + 0.9 }),
  // Round 2: hot water.
  out('cod', T.codOut, 'loses balance ~72 °F (22 °C)', 'MEASURED', { leave: T.hotTub + 0.2 }),
  out('icefish', T.iceOut, '~57 °F (14 °C)', 'MEASURED', { soft: true, leave: T.f79 - 1.6, tagS: 6 }),
  out('salmon', T.salmonOut, '~79 °F (26 °C)', 'ESTIMATED', { leave: T.salmonOut + 0.7 }),
  pass('eel', T.scrapes, 'upper lethal limit 100.4 °F (38 °C), not loss of balance', 'MEASURED', { aside: 'a coin flip', tagS: 4.5 }),
  pass('goldfish', T.upright, 'warm-kept: loses balance ~110 °F (43.6 °C)', 'MEASURED', { tagS: 4.3 }),
  pass('pupfish', T.pet, '~109 °F (42.7 °C)', 'MEASURED', { tagS: 3.2 }),
  pass('rivulus', T.pet + 0.5, '~105 °F (40.5 °C)', 'MEASURED', { aside: 'derived from the paper', tagS: 2.7 }),
  pass('mudskipper', T.pet + 1, 'P. argentilineatus climbs out at ~106 °F (41.3 °C)', 'MEASURED', { tagS: 2.6 }),
  // Round 3: sea water.
  pass('mudskipper', T.mudFine, 'P. minutus · no deaths', 'MEASURED', { tagS: 9 }),
  pass('rivulus', T.rivFine, 'wild 0–70 ppt', 'REPORTED', { tagS: 7.6 }),
  pass('pupfish', T.pupSea, 'up to ~70 ppt · twice the sea', 'REPORTED', { tagS: 4.5 }),
  pass('eel', T.allowed, 'moves between river and sea', 'REPORTED', { tagS: 3.5 }),
  out('goldfish', T.gfOut, 'moved straight from fresh water: none made it 8 h at 20 ppt', 'MEASURED', { soft: true, leave: T.gfOut + 0.6 }),
  // Round 4: out of water.
  out('eel', T.eelOut, 'no 24 h study', 'REPORTED', { leave: T.eelOut + 0.8 }),
  out('pupfish', T.pupOut, 'no study shows it can', 'NO STUDY', { leave: T.pupOut + 0.7 }),
  pass('giantMudskipper', T.mudFine4, 'giant mudskipper · 24 h out of water, lab', 'MEASURED', { aside: 'no one has found its limit', tagS: 3.8 }),
  pass('rivulus', T.days66 + 0.9, 'lab · damp mud · nearly starved', 'MEASURED', { tagS: 4.5 }),
  // The final: brine, then fresh water.
  pass('mudskipper', T.mudBrineFine, 'P. minutus · no deaths at 2x the sea (70 ppt)', 'MEASURED', { tagS: 6.5 }),
  pass('rivulus', T.threeTimes - 2.2, 'wild up to 2x the sea (70 ppt)', 'REPORTED', { aside: 'lab-adapted to 114 ppt, 3x+', tagS: 5 }),
  pass('rivulus', T.noProblem, 'found in fresh water too', 'REPORTED', { tagS: 3.5 }),
  out('mudskipper', T.mudOut, 'P. minutus · half died in 4 days in fresh water', 'MEASURED', { aside: 'other mudskippers differ', leave: T.mudOut + 1.1 }),
];

/** A fish's last OUT (undefined for one that never goes out). */
export const outOf = (fish: FishId): Verdict | undefined => VERDICTS.find((v) => v.fish === fish && v.kind === 'out');

/** When a fish swims off. */
export const leaveOf = (v: Verdict): number => v.leave ?? v.at + 0.9;

/** FISH LEFT at t: 100, the tuna hail, then one per OUT. The squid never counted. */
export function fishLeft(t: number): number {
  const hail = Math.round(TUNA_HAIL.count * Math.max(0, Math.min(1, (t - TUNA_HAIL.from) / (TUNA_HAIL.to - TUNA_HAIL.from))));
  return 100 - hail - VERDICTS.filter((v) => v.kind === 'out' && t >= v.at).length;
}

/** The moments the counter changes (for its shake and its tick). */
export const COUNTER_DROPS: readonly number[] = VERDICTS.filter((v) => v.kind === 'out').map((v) => v.at);
