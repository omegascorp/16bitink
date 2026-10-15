import { createRng } from '../../../src/logic/rng';
import { clamp01, ramp } from '../short';
import { BURSTS, DAD, dadAt, pouchAt, wrap } from './story';
import { pouchExit, type Pt } from './fish';

/**
 * The babies: each burst out of the pouch sends a few (the cloud, dozens)
 * shooting out in a fan, then wandering off and finally darting away off
 * screen, all within LIFE seconds, so every one is a function of its age and
 * the brood comes round the loop point unbroken. Some snap up plankton on the
 * way (the game's own move: eat smaller things, grow).
 */

/** Seconds from birth to well off screen (or out of sight under the captions). */
export const LIFE = 4.5;
/** The captions' band: babies fade out above it and stay out of sight below it. */
export const CAPTION_TOP = 1105;
const FADE_FROM = 1040;
const BURST_S = 0.32;

export interface Baby {
  readonly born: number;
  readonly from: Pt;
  /** Heading, radians (screen: 0 right, π/2 down). */
  readonly dir: number;
  readonly curve: number;
  readonly kick: number;
  readonly cruise: number;
  readonly len: number;
  readonly phase: number;
}

/**
 * Headings in two fans, left and right and a little down from the pouch:
 * away from his body (never up across it), never straight down, so a baby
 * never has to turn round.
 */
export const BABIES: readonly Baby[] = BURSTS.flatMap((b, bi) => {
  const rng = createRng(500 + bi * 31);
  const from = pouchExit(dadAt(b.at), pouchAt(b.at));
  return Array.from({ length: b.n }, (_, i): Baby => {
    const side = i % 2 === 0 ? 0 : Math.PI;
    // The cloud fans wide; the little bursts slip out nearer the level.
    const down = b.n > 10 ? 0.05 + rng() * 0.85 : 0.1 + rng() * 0.55;
    // Curving gently back towards the level as they go.
    const level = rng() * 0.08;
    return {
      born: b.at + (b.n > 10 ? rng() * 0.18 : rng() * 0.08),
      from,
      dir: side === 0 ? down : Math.PI - down,
      curve: side === 0 ? -level : level,
      kick: b.n > 10 ? 520 + rng() * 650 : 330 + rng() * 300,
      cruise: 60 + rng() * 50,
      len: 62 + rng() * 20,
      phase: rng() * Math.PI * 2,
    };
  });
});

/** Seconds since it was born, round the loop (null if it isn't out yet or is long gone). */
export function ageOf(baby: Baby, t: number): number | null {
  const a = wrap(t - baby.born);
  return a < LIFE ? a : null;
}

export interface BabyPose {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** Where a baby is `a` seconds after its birth: shot out, then cruising, then darting away. */
export function babyAt(baby: Baby, a: number): BabyPose {
  const out = baby.kick * BURST_S * (1 - Math.exp(-a / BURST_S));
  const dart = Math.max(0, a - 1.6);
  const swim = baby.cruise * a + 100 * dart * dart;
  const heading = baby.dir + baby.curve * a;
  const wiggle = 7 * Math.sin(a * 9 + baby.phase);
  const x = baby.from.x + Math.cos(baby.dir) * out + Math.cos(heading) * swim - Math.sin(heading) * wiggle;
  const y = baby.from.y + Math.sin(baby.dir) * out + Math.sin(heading) * swim + Math.cos(heading) * wiggle;
  const facing = Math.cos(heading) >= 0 ? 1 : -1;
  const tilt = Math.max(-1.1, Math.min(1.1, Math.atan2(-Math.sin(heading), Math.abs(Math.cos(heading)))));
  return {
    x,
    y,
    // Popping out of the pouch, they unfold to full length.
    len: baby.len * (0.55 + 0.45 * clamp01(a / 0.18)),
    facing,
    tilt,
    beat: a * 34 + baby.phase,
    effort: 0.5 + 0.5 * Math.exp(-a / 0.6) + 0.3 * clamp01(dart),
  };
}

/** How much of a baby shows, 0 .. 1: fading out as it nears the captions' band, hidden in and under it. */
export const babyAlpha = (p: BabyPose): number => 1 - ramp(p.y, FADE_FROM, CAPTION_TOP);

/** Out of the picture: off an edge, or hidden by the captions' band. */
export const babyGone = (p: BabyPose): boolean => p.x < -80 || p.x > 1160 || p.y < -80 || babyAlpha(p) <= 0;

/** Its mouth: the tip of the long snout. */
export function snoutOf(p: BabyPose): Pt {
  const reach = 0.54 * p.len;
  return { x: p.x + p.facing * Math.cos(p.tilt) * reach, y: p.y - Math.sin(p.tilt) * reach };
}

// ---------------------------------------------------------------- snacks

/** A copepod waiting where a baby will pass, eaten (sucked up the snout) at age `at`. */
export interface Snack {
  readonly baby: number;
  readonly at: number;
}

/** Where a snack shows up well: in the open, clear of the dad, the card and the captions. */
const inTheOpen = (p: Pt): boolean => p.x > 140 && p.x < 940 && p.y > DAD.y + 150 && p.y < FADE_FROM - 30;

/** The first baby of a burst (not yet taken) that is in the open at about age `near`. */
function pick(burst: number, near: number, taken: readonly number[]): Snack {
  const first = BURSTS.slice(0, burst).reduce((s, b) => s + b.n, 0);
  for (const at of [0, -0.2, 0.2, -0.4, 0.4, 0.6].map((d) => near + d)) {
    for (let i = first; i < first + BURSTS[burst]!.n; i++) {
      if (!taken.includes(i) && inTheOpen(snoutOf(babyAt(BABIES[i]!, at)))) return { baby: i, at };
    }
  }
  throw new Error(`no baby of burst ${burst} is in the open near ${near}`);
}

/** Snacks for three of the cloud, and one each from two later bursts (round the loop point). */
export const SNACKS: readonly Snack[] = ([[1, 1.0], [1, 1.45], [1, 1.9], [4, 1.2], [6, 1.3]] as const).reduce<Snack[]>(
  (out, [burst, at]) => [...out, pick(burst, at, out.map((s) => s.baby))],
  [],
);

/** When a snack is eaten, in loop time. */
export const snackTime = (s: Snack): number => wrap(BABIES[s.baby]!.born + s.at);

const SEEN_S = 2.4;
const GULP_S = 0.16;

/** Where the copepod is and how big (1 whole .. 0 gone), or null when it isn't there. */
export function copepodAt(s: Snack, t: number): (Pt & { readonly size: number; readonly kick: number }) | null {
  const baby = BABIES[s.baby]!;
  const target = snoutOf(babyAt(baby, s.at));
  const before = wrap(snackTime(s) - t);
  if (before > 0 && before <= SEEN_S) {
    // Drifting into place, jerking along as copepods do.
    const d = before + 0.25 * Math.sin(before * 7);
    return { x: target.x + 9 * d, y: target.y - 6 * d, size: 1, kick: Math.sin(before * 7) };
  }
  const after = wrap(t - snackTime(s));
  if (after < GULP_S) {
    const into = snoutOf(babyAt(baby, s.at + after));
    const u = after / GULP_S;
    return { x: target.x + (into.x - target.x) * u, y: target.y + (into.y - target.y) * u, size: 1 - u, kick: 0 };
  }
  return null;
}

/** The snack a baby has on its way, if any. */
export const snackOf = (index: number): Snack | undefined => SNACKS.find((x) => x.baby === index);

/** A baby's snout sucking for its snack, 0 .. 1. */
export function snoutOpen(index: number, a: number): number {
  const s = snackOf(index);
  if (!s) return 0;
  return a < s.at ? ramp(a, s.at - 0.2, s.at - 0.03) : 1 - ramp(a, s.at, s.at + 0.07);
}
