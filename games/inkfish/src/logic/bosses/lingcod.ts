/**
 * The lingcod, chapter 3's giant: a bottom-dwelling ambusher with a cavern of
 * a mouth.
 *
 * While it's bigger than you it lies on the sand, creeping along under you,
 * unmarked: you only see where it is when it strikes.
 * Swim into the cone in front of its mouth and it opens up (swirls show the
 * water rushing in), then sucks: everything in the cone is dragged towards
 * its jaws. Slip out of the cone sideways. Hang about above it and it coils
 * in a puff of sand and launches straight up at you, so staying high isn't
 * safe either. Once you're bigger it lies still
 * on the sand, coloured like it, and you only find it by the little puffs of
 * sand it breathes up; come close and it bolts along the bottom.
 */

export type LingcodMode = 'stalk' | 'open' | 'suck' | 'coil' | 'launch' | 'rest' | 'camo' | 'bolt';

export interface LingcodState {
  readonly mode: LingcodMode;
  readonly until: number;
  /** The next gulp may start from this time, ms. */
  readonly gulpAt: number;
  /** Where it's bolting to, world x. */
  readonly boltX: number;
  /** Since when you've been hanging above it (0: you aren't), ms. */
  readonly overheadSince: number;
}

export interface LingcodSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  readonly dist: number;
  /** You're in the cone in front of its mouth, in reach of the suction. */
  readonly inCone: boolean;
  /** You're above it, within reach of a launch off the bottom. */
  readonly overhead: boolean;
  readonly seen: boolean;
  /** Its own x, and which way you are from it: 1 right, -1 left. */
  readonly x: number;
  readonly side: 1 | -1;
}

export const LINGCOD = {
  /** The suction reaches this far in front of its mouth, px... */
  reach: 380,
  /** ...within this half-angle of where it faces, radians... */
  cone: 0.6,
  /** ...tipped up this much: it lies on the sand and gulps up into the water, radians. */
  lift: 0.38,
  openMs: 700,
  suckMs: 1100,
  /** How hard the suction drags at the mouth (falls off with distance), px/s. */
  pull: 300,
  restMs: 1500,
  gulpCooldownMs: 3200,
  stalkSpeed: 150,
  /** Above it this long (and within launchReach across, launchHeight up), it launches up at you. */
  hoverMs: 1400,
  launchReach: 320,
  launchHeight: 720,
  coilMs: 500,
  launchMs: 750,
  launchSpeed: 640,
  /** Disturbed this close, a camouflaged lingcod bolts... */
  boltRange: 240,
  /** ...this far along the bottom, away from you... */
  boltDistance: 760,
  boltMs: 1300,
  boltSpeed: 420,
} as const;

export const LINGCOD_START: LingcodState = { mode: 'stalk', until: 0, gulpAt: 0, boltX: 0, overheadSince: 0 };

/** Lying in wait on the sand, off the goal marker: it only shows itself as it strikes. */
export function lingcodLurking(mode: LingcodMode): boolean {
  return mode === 'stalk' || mode === 'rest';
}

/** One step of the lingcod's mind. Pure: the scene moves the fish to match. */
export function stepLingcod(s: LingcodState, i: LingcodSense): LingcodState {
  return i.rel === 'hide' ? hide(s, i) : hunt(s, i);
}

function hunt(s: LingcodState, i: LingcodSense): LingcodState {
  if (s.mode === 'open') return i.now >= s.until ? { ...s, mode: 'suck', until: i.now + LINGCOD.suckMs } : s;
  if (s.mode === 'coil') return i.now >= s.until ? { ...s, mode: 'launch', until: i.now + LINGCOD.launchMs } : s;
  if (s.mode === 'suck' || s.mode === 'launch') {
    return i.now >= s.until ? { ...s, mode: 'rest', until: i.now + LINGCOD.restMs, gulpAt: i.now + LINGCOD.restMs + LINGCOD.gulpCooldownMs, overheadSince: 0 } : s;
  }
  if (s.mode === 'rest') return i.now >= s.until ? { ...s, mode: 'stalk' } : s;
  if (s.mode !== 'stalk') return { ...s, mode: 'stalk', overheadSince: 0 };
  const hunting = i.rel === 'hunt' && i.seen;
  if (hunting && i.inCone && i.now >= s.gulpAt) return { ...s, mode: 'open', until: i.now + LINGCOD.openMs };
  if (!hunting || !i.overhead) return s.overheadSince ? { ...s, overheadSince: 0 } : s;
  const since = s.overheadSince || i.now;
  if (i.now - since >= LINGCOD.hoverMs && i.now >= s.gulpAt) return { ...s, mode: 'coil', until: i.now + LINGCOD.coilMs, overheadSince: 0 };
  return since === s.overheadSince ? s : { ...s, overheadSince: since };
}

/** Whether you at (dx, dy) from it are above it, in reach of a launch off the bottom. */
export function overheadOf(dx: number, dy: number): boolean {
  return Math.abs(dx) < LINGCOD.launchReach && dy < 0 && -dy < LINGCOD.launchHeight;
}

function hide(s: LingcodState, i: LingcodSense): LingcodState {
  if (s.mode === 'bolt') return i.now >= s.until ? { ...s, mode: 'camo' } : s;
  if (s.mode !== 'camo') return { ...s, mode: 'camo' };
  if (i.dist < LINGCOD.boltRange) return { ...s, mode: 'bolt', until: i.now + LINGCOD.boltMs, boltX: i.x - i.side * LINGCOD.boltDistance };
  return s;
}

/** How strongly the suction drags something `d` px from the mouth (0 beyond reach). */
export function suctionAt(d: number): number {
  if (d >= LINGCOD.reach) return 0;
  return LINGCOD.pull * (1 - d / LINGCOD.reach) ** 0.6;
}

/** Whether (dx, dy) from the mouth lies in the cone it faces (`facing` 1 right, -1 left, tipped up by `lift`), in reach. */
export function inSuctionCone(dx: number, dy: number, facing: 1 | -1): boolean {
  const d = Math.hypot(dx, dy);
  if (d > LINGCOD.reach || d < 1) return d < 1;
  const ahead = dx * facing;
  return ahead > 0 && Math.abs(Math.atan2(dy, ahead) + LINGCOD.lift) < LINGCOD.cone;
}
