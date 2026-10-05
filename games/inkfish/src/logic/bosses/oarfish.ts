/**
 * The oarfish, chapter 7's giant: the sea serpent of the twilight zone.
 *
 * It isn't a hunter. It hangs upright in the water, as real oarfish do, a
 * long silver wall. Come close and it quivers (the warning), then whips its
 * body down through the water: anything the lash catches is knocked
 * senseless. Once you're bigger it can't fight you, but it can give you the
 * slip the way real oarfish can, by shedding the end of its tail: your first
 * bites only take a piece and it bolts, shorter each time. The third bite
 * gets it.
 */

export type OarfishMode = 'hang' | 'quiver' | 'lash' | 'swim' | 'drift' | 'shed';

export interface OarfishState {
  readonly mode: OarfishMode;
  readonly until: number;
  /** The next lash may start from this time, ms. */
  readonly lashAt: number;
  /** Pieces of tail shed so far. */
  readonly sheds: number;
}

export interface OarfishSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  readonly seen: boolean;
}

export const OARFISH = {
  /** It lashes at you from this close... */
  lashRange: 330,
  quiverMs: 650,
  /** ...sweeping from upright to level in this long. */
  lashMs: 450,
  /** Anything the sweep catches is stunned this long. */
  stunMs: 1300,
  /** After a lash it swims level a while before hanging upright again. */
  swimMs: 1800,
  lashCooldownMs: 3000,
  hangSpeed: 40,
  /** Bites it can shed a piece of tail for before the next one gets it. */
  maxSheds: 2,
  /** What's left after each shed, as a share of its size. */
  shedShare: 0.8,
  shedMs: 1600,
  shedSpeed: 420,
  driftSpeed: 230,
} as const;

export const OARFISH_START: OarfishState = { mode: 'hang', until: 0, lashAt: 0, sheds: 0 };

/** Bolting after shedding its tail: out of reach until it's away. */
export function oarfishSlipping(mode: OarfishMode): boolean {
  return mode === 'shed';
}

/** One step of the oarfish's mind. Pure: the scene moves the fish to match. */
export function stepOarfish(s: OarfishState, i: OarfishSense): OarfishState {
  if (s.mode === 'shed') return i.now >= s.until ? { ...s, mode: 'drift' } : s;
  if (i.rel === 'hide') return s.mode === 'drift' ? s : { ...s, mode: 'drift' };
  if (s.mode === 'quiver') return i.now >= s.until ? { ...s, mode: 'lash', until: i.now + OARFISH.lashMs } : s;
  if (s.mode === 'lash') return i.now >= s.until ? { ...s, mode: 'swim', until: i.now + OARFISH.swimMs } : s;
  if (s.mode === 'swim') return i.now >= s.until ? { ...s, mode: 'hang', lashAt: i.now + OARFISH.lashCooldownMs } : s;
  if (s.mode !== 'hang') return { ...s, mode: 'hang' };
  if (i.rel === 'hunt' && i.seen && i.dist < OARFISH.lashRange && i.now >= s.lashAt) return { ...s, mode: 'quiver', until: i.now + OARFISH.quiverMs };
  return s;
}

/**
 * You bit it. With tail to spare it sheds a piece and bolts (resisted: true);
 * otherwise this bite gets it.
 */
export function biteOarfish(s: OarfishState, now: number): { readonly state: OarfishState; readonly resisted: boolean } {
  if (s.mode === 'shed') return { state: s, resisted: true };
  if (s.sheds >= OARFISH.maxSheds) return { state: s, resisted: false };
  return { state: { ...s, mode: 'shed', until: now + OARFISH.shedMs, sheds: s.sheds + 1 }, resisted: true };
}
