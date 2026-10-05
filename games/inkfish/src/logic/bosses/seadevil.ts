/**
 * The giant black seadevil, chapter 9's giant: an anglerfish the size of a
 * boat, black on black, with a glowing lure on a rod over its mouth.
 *
 * While it's bigger than you, all you see in the dark is the lure. Small fish
 * gather round it, and it draws you in too, gently. Swim too close to the
 * mouth under it and the lure jerks back to show the teeth (the warning),
 * then it gulps, sucking in everything in front of it. Swim away and it
 * douses the lure and slips through the dark to wait ahead of you, so it
 * can't just be left behind. Once you're bigger it keeps the lure dark and
 * creeps off, though it can't help flashing it now and then, and each flash
 * leaves a glowing decoy drifting the other way. Corner it and it bolts.
 */

export type SeadevilMode = 'lure' | 'gape' | 'gulp' | 'rest' | 'creep' | 'dark' | 'flash' | 'bolt';

export interface SeadevilState {
  readonly mode: SeadevilMode;
  readonly until: number;
  /** The next gulp may start from this time, ms. */
  readonly gulpAt: number;
  /** It may douse and move to cut you off from this time, ms. */
  readonly creepAt: number;
  /** Hiding, it next flashes its lure at this time, ms. */
  readonly flashAt: number;
}

export interface SeadevilSense {
  readonly now: number;
  readonly rel: 'hunt' | 'hide' | 'even';
  /** From you to its mouth, px. */
  readonly dist: number;
  readonly seen: boolean;
}

export const SEADEVIL = {
  /** It gulps at you this close to its mouth... */
  strikeRange: 250,
  /** ...after showing its teeth this long. */
  gapeMs: 650,
  gulpMs: 420,
  gulpSpeed: 480,
  /** How hard the gulp sucks you towards the mouth, px/s, out to suckRange. */
  pull: 260,
  suckRange: 380,
  restMs: 1700,
  gulpCooldownMs: 2600,
  /** The lure draws small fish (and you) from this far... */
  lureRange: 560,
  /** ...you at up to this, px/s, strongest right at the lure. */
  lurePull: 55,
  /** Small fish it can lure: at most this share of its size, and this many at once. */
  lureShare: 0.55,
  lureMax: 5,
  /** Left this far behind, it douses the lure and moves to wait ahead of you. */
  creepRange: 850,
  creepMs: 3000,
  /** Unseen in the dark, it can afford to hurry. */
  creepSpeed: 700,
  creepCooldownMs: 4500,
  /** How far ahead of you it lies in wait. */
  ambushLead: 460,
  driftSpeed: 30,
  /** Hiding: it creeps off at this speed, flashing every flashEveryMs for flashMs. */
  darkSpeed: 150,
  flashEveryMs: 3200,
  flashMs: 650,
  /** A decoy glows this long, drifting at decoySpeed. */
  decoyMs: 4200,
  decoySpeed: 70,
  /** Hiding, it bolts when you come this close. */
  boltRange: 230,
  boltMs: 1100,
  boltSpeed: 430,
} as const;

export const SEADEVIL_START: SeadevilState = { mode: 'lure', until: 0, gulpAt: 0, creepAt: 0, flashAt: 0 };

/** One step of the seadevil's mind. Pure: the scene moves the fish and works the lure. */
export function stepSeadevil(s: SeadevilState, i: SeadevilSense): SeadevilState {
  return i.rel === 'hide' ? hide(s, i) : hunt(s, i);
}

function hunt(s: SeadevilState, i: SeadevilSense): SeadevilState {
  if (s.mode === 'gape') return i.now >= s.until ? { ...s, mode: 'gulp', until: i.now + SEADEVIL.gulpMs } : s;
  if (s.mode === 'gulp') return i.now >= s.until ? { ...s, mode: 'rest', until: i.now + SEADEVIL.restMs } : s;
  if (s.mode === 'rest') return i.now >= s.until ? { ...s, mode: 'lure', gulpAt: i.now + SEADEVIL.gulpCooldownMs } : s;
  if (s.mode === 'creep') {
    if (i.now < s.until) return s;
    return { ...s, mode: 'lure', creepAt: i.now + SEADEVIL.creepCooldownMs };
  }
  if (s.mode !== 'lure') return { ...s, mode: 'lure' };
  if (i.rel === 'hunt' && i.seen && i.dist < SEADEVIL.strikeRange && i.now >= s.gulpAt) return { ...s, mode: 'gape', until: i.now + SEADEVIL.gapeMs };
  if (i.dist > SEADEVIL.creepRange && i.now >= s.creepAt) return { ...s, mode: 'creep', until: i.now + SEADEVIL.creepMs };
  return s;
}

function hide(s: SeadevilState, i: SeadevilSense): SeadevilState {
  if (s.mode === 'bolt') return i.now >= s.until ? { ...s, mode: 'dark', flashAt: i.now + SEADEVIL.flashEveryMs } : s;
  if (i.seen && i.dist < SEADEVIL.boltRange) return { ...s, mode: 'bolt', until: i.now + SEADEVIL.boltMs };
  if (s.mode === 'flash') return i.now >= s.until ? { ...s, mode: 'dark', flashAt: i.now + SEADEVIL.flashEveryMs } : s;
  if (s.mode !== 'dark') return { ...s, mode: 'dark', flashAt: i.now + SEADEVIL.flashEveryMs };
  return i.now >= s.flashAt ? { ...s, mode: 'flash', until: i.now + SEADEVIL.flashMs } : s;
}

/** How bright the lure is (0 dark .. 1 lit) in each mode. */
export function lureBrightness(mode: SeadevilMode): number {
  switch (mode) {
    case 'lure':
    case 'gape':
    case 'flash':
      return 1;
    case 'gulp':
      return 0.6;
    case 'rest':
      return 0.3;
    default:
      return 0;
  }
}

/** How hard the lure tugs at you `d` px from it, px/s: strongest at the lure, nothing past its range. */
export function lureTug(d: number): number {
  return SEADEVIL.lurePull * Math.max(0, 1 - d / SEADEVIL.lureRange);
}

/**
 * Where it waits for you: `lead` px ahead of (x, y) the way you're swimming
 * at (vx, vy); straight ahead along `facing` if you're keeping still.
 */
export function ambushSpot(x: number, y: number, vx: number, vy: number, facing: 1 | -1, lead: number = SEADEVIL.ambushLead): { readonly x: number; readonly y: number } {
  const speed = Math.hypot(vx, vy);
  if (speed < 20) return { x: x + facing * lead, y };
  return { x: x + (vx / speed) * lead, y: y + (vy / speed) * lead };
}
