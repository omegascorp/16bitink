import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { JET_FROM } from './claw';
import { TEMPO, WORDS } from './words';

/**
 * "This shrimp's snap is almost as hot as the sun": the pistol shrimp
 * slams its big claw shut so fast it shoots out a jet of water that tears
 * open a bubble; the bubble collapses at about 4,700 °C with a flash and a
 * bang that stuns small prey, and in WWII submarines hid in the crackle of
 * snapping-shrimp beds. Told by a narrator (words.ts), every beat timed to
 * the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     "This shrimp's snap is almost as hot as the SUN!": close on the
 *         shrimp, its claw just slammed shut, a bubble bursting into a
 *         white-hot flash in front of it; it cocks the claw, snaps again on
 *         "hot as the", and an ink sun pops up beside the flash on "SUN!"
 *   3.0   "The pistol shrimp snaps its claw so fast,": back to a mid shot, the
 *         claw cocked open, "pistol shrimp"; a small fish swims in; the claw
 *         ringed on "claw", an arrow showing how it snaps
 *   5.8   "it fires a bubble…": SNAP, the jet shoots a bubble at the fish
 *         (slowed right down), "bubble"
 *   7.1   "that bursts at nearly FIVE thousand degrees,": the bubble
 *         collapses to a white-hot point; a thermometer climbs to 4,700 °C
 *   9.9   "with a flash and a BANG that stuns its prey!": a white flash, an
 *         inked "BANG!", the fish knocked spinning with dizzy stars; the
 *         shrimp tugs it in
 *  12.4   "In World War Two, submarines hid in its noise.": pull back to a bed
 *         of shrimp all snapping ("snap!"), "WWII", a submarine sneaking along
 *         behind the noise, "shh…"
 *  15.4   "So believe it:": back to the close-up, the claw cocking, and it
 *         snaps into the opening frame.
 */
export const LOOP_S = 16.5;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time since `at`, folded to -LOOP_S/2 .. LOOP_S/2 so events near the loop point work both sides of it. */
const since = (t: number, at: number): number => {
  const d = wrap(t - at);
  return d > LOOP_S / 2 ? d - LOOP_S : d;
};

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const SNAP_AT = said('snap');
export const HOT_AT = said('hot');
export const SUN_AT = said('SUN!');
export const PISTOL_AT = said('pistol');
export const SNAPS_AT = said('snaps');
export const CLAW_AT = said('claw');
export const FAST_AT = said('fast,');
export const FIRES_AT = said('fires');
export const BUBBLE_AT = said('bubble…');
export const BURSTS_AT = said('bursts');
export const FIVE_AT = said('FIVE');
export const DEGREES_AT = said('degrees,');
export const FLASH_AT = said('flash');
export const BANG_AT = said('BANG');
export const STUNS_AT = said('stuns');
export const PREY_AT = said('prey!');
export const IN_AT = said('In');
export const WORLD_AT = said('World');
export const SUBMARINES_AT = said('submarines');
export const HID_AT = said('hid');
export const NOISE_AT = said('noise.');
export const SO_AT = said('So');
export const BELIEVE_AT = said('believe');
export const IT_AT = said('it:');

/** The claw slams shut: just before the loop point (so the loop opens on the flash), on "hot as the" (flash on "SUN!"), and on "fires". */
export const SNAP_SEAM = LOOP_S - 0.21;
export const SNAP_HOT = SUN_AT - 0.3;
export const SNAP_FIRE = FIRES_AT + 0.04;
/** How long the claw takes to slam shut: about one video frame. */
const SHUT_S = 0.04;
/** A quick snap: the bubble swells and collapses this long after the claw shuts, then flashes. */
const QUICK_S = 0.17;
export const QUICK_SNAPS: readonly number[] = [SNAP_HOT, SNAP_SEAM];
/** The quick flashes peak here (the seam one just after the loop point). */
export const QUICK_PEAKS: readonly number[] = QUICK_SNAPS.map((s) => wrap(s + QUICK_S));

// ---------------------------------------------------------------- the claw

/** Claw opening, 0 shut .. 1 cocked: keys held, eased between; the snaps take SHUT_S. */
const OPEN_KEYS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.3, 0],
  [0.85, 1],
  [SNAP_HOT, 1],
  [SNAP_HOT + SHUT_S, 0],
  [SUN_AT + 0.45, 0],
  [PISTOL_AT, 1],
  [SNAP_FIRE, 1],
  [SNAP_FIRE + SHUT_S, 0],
  [BELIEVE_AT - 0.3, 0],
  [IT_AT, 1],
  [SNAP_SEAM, 1],
  [SNAP_SEAM + SHUT_S, 0],
  [LOOP_S, 0],
];

export function clawOpenAt(t: number): number {
  const u = wrap(t);
  let i = 0;
  while (i < OPEN_KEYS.length - 2 && u >= OPEN_KEYS[i + 1]![0]) i++;
  const [t0, v0] = OPEN_KEYS[i]!;
  const [t1, v1] = OPEN_KEYS[i + 1]!;
  const s = (u - t0) / (t1 - t0);
  // Shutting is a slam (accelerating); opening eases.
  const e = v1 < v0 ? Math.min(1, Math.max(0, s)) ** 2 : smooth(s);
  const base = lerp(v0, v1, e);
  // Cocked and waiting to fire, it trembles a little.
  const tremble = 0.025 * Math.sin(2 * Math.PI * 7 * u) * window01(u, PISTOL_AT + 0.1, SNAP_FIRE - 0.05, 0.2);
  return Math.max(0, Math.min(1, base + tremble));
}

// ---------------------------------------------------------------- the shrimp

/** World px per shrimp texture px. At the close-up, world px are about screen px. */
export const SHRIMP_K = 3;
export const SHRIMP_HOME = { x: 420, y: 1000 } as const;
/** Nose up a little, radians. */
export const SHRIMP_TILT = 0.6;
const BOBS = 3;

export interface Shrimp {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
}

/** It kicks back a little each time it snaps. */
function recoilAt(u: number): number {
  return [...QUICK_SNAPS, SNAP_FIRE].reduce((s, at) => {
    const d = since(u, at);
    return d < 0 || d > 0.45 ? s : s + 14 * Math.sin(Math.PI * Math.min(1, d / 0.12)) * (1 - d / 0.45) * (d < 0.12 ? 1 : 0.6);
  }, 0);
}

export function shrimpAt(t: number): Shrimp {
  const u = wrap(t);
  const r = recoilAt(u);
  return {
    x: SHRIMP_HOME.x - r * Math.cos(SHRIMP_TILT),
    y: SHRIMP_HOME.y + 4 * Math.sin((2 * Math.PI * BOBS * u) / LOOP_S) + r * Math.sin(SHRIMP_TILT),
    tilt: SHRIMP_TILT + 0.012 * Math.sin((2 * Math.PI * u) / LOOP_S),
  };
}

/** A point on the shrimp, given in its drawing's texture px (origin at its centre), in world px. */
export function onShrimp(s: Shrimp, p: Pt): Pt {
  const lx = p.x * SHRIMP_K;
  const ly = p.y * SHRIMP_K;
  const c = Math.cos(s.tilt);
  const n = Math.sin(s.tilt);
  return { x: s.x + lx * c + ly * n, y: s.y - lx * n + ly * c };
}

/** Straight out of the claw, as a unit vector. */
export const aheadOf = (s: Shrimp): Pt => ({ x: Math.cos(s.tilt), y: -Math.sin(s.tilt) });
export const jetFromAt = (t: number): Pt => onShrimp(shrimpAt(t), JET_FROM);
const along = (s: Shrimp, d: number): Pt => {
  const from = onShrimp(s, JET_FROM);
  const a = aheadOf(s);
  return { x: from.x + a.x * d, y: from.y + a.y * d };
};

/** The jet of water out of the claw just after it slams: 0 .. 1 over its life, or null. */
export function jetAt(t: number): { readonly u: number; readonly reach: number } | null {
  for (const at of QUICK_SNAPS) {
    const d = since(t, at + SHUT_S * 0.5);
    if (d >= 0 && d < 0.32) return { u: d / 0.32, reach: 260 };
  }
  const d = since(t, SNAP_FIRE + SHUT_S * 0.5);
  if (d >= 0 && d < 0.6) return { u: d / 0.6, reach: 560 };
  return null;
}

// ---------------------------------------------------------------- the bubble and the heat

export interface Bubble extends Pt {
  readonly r: number;
  /** Squashing as it collapses, 0 .. 1. */
  readonly collapse: number;
}

/** The fired bubble's stop, this far out of the claw (in front of the fish). */
export const BUBBLE_STOP = 285;
const BUBBLE_R = 68;
const COLLAPSE_S = 0.3;

/** The cavitation bubble: a quick one in each quick snap, and the slowed-down one fired at the fish. */
export function bubbleAt(t: number): Bubble | null {
  const s = shrimpAt(t);
  for (const at of QUICK_SNAPS) {
    const d = since(t, at + SHUT_S * 0.5);
    if (d < 0 || d > QUICK_S - SHUT_S * 0.5) continue;
    const u = d / (QUICK_S - SHUT_S * 0.5);
    const p = along(s, 20 + 55 * smooth(u));
    return { ...p, r: 34 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 1, collapse: ramp(u, 0.55, 1) };
  }
  const u = wrap(t);
  if (u < SNAP_FIRE + SHUT_S * 0.5 || u > BURSTS_AT + COLLAPSE_S) return null;
  const fly = smooth(Math.min(1, (u - SNAP_FIRE) / 1.05)) ** 0.8;
  const p = along(s, 30 + (BUBBLE_STOP - 30) * fly);
  const grow = ramp(u, SNAP_FIRE, SNAP_FIRE + 0.3);
  const c = ramp(u, BURSTS_AT, BURSTS_AT + COLLAPSE_S);
  return { ...p, r: Math.max(1, BUBBLE_R * grow * (1 - c ** 1.6)), collapse: c };
}

/** Where the fired bubble burst: the hot point and the flash. */
export const burstPointAt = (t: number): Pt => along(shrimpAt(t), BUBBLE_STOP);

/** The white-hot point left as the fired bubble collapses, 0 .. 1, until the flash. */
export const heatAt = (t: number): number => window01(wrap(t), BURSTS_AT + COLLAPSE_S * 0.6, FLASH_AT + 0.08, 0.25);

/** The thermometer, shown from "at nearly" until the flash. */
export const thermoAt = (t: number): number => window01(wrap(t), BURSTS_AT + 0.3, FLASH_AT + 0.08, 0.25);
/** What it reads, °C: climbing on "FIVE thousand degrees" to 4,700. */
export const HOT_C = 4700;
export const degreesAt = (t: number): number => lerp(20, HOT_C, ramp(wrap(t), FIVE_AT - 0.15, DEGREES_AT + 0.25));

export interface Flash extends Pt {
  /** 0 .. 1 over its life. */
  readonly u: number;
  /** The fired bubble's flash (a big one, with the BANG) rather than a quick snap's. */
  readonly big: boolean;
}

const QUICK_FLASH_S = 0.85;
const BIG_FLASH_S = 1.3;
export const BIG_PEAK = FLASH_AT + 0.03;

/** The flash of a collapsing bubble, from its peak, or null. */
export function flashAt(t: number): Flash | null {
  const s = shrimpAt(t);
  for (const at of QUICK_SNAPS) {
    const d = since(t, at + QUICK_S);
    if (d >= 0 && d < QUICK_FLASH_S) return { ...along(s, 75), u: d / QUICK_FLASH_S, big: false };
  }
  const d = since(t, BIG_PEAK);
  if (d >= 0 && d < BIG_FLASH_S) return { ...along(s, BUBBLE_STOP), u: d / BIG_FLASH_S, big: true };
  return null;
}

/** A white wash over the whole picture as the big flash goes off (the quick ones only tint it). */
export function whiteAt(t: number): number {
  const f = flashAt(t);
  if (!f) return 0;
  return f.big ? 0.85 * (1 - Math.min(1, f.u / 0.22)) ** 2 : 0;
}

/** The inked "BANG!": pops on "BANG", overshooting, gone after "prey!". */
export function bangAt(t: number): number {
  const u = wrap(t);
  if (u < BANG_AT || u > PREY_AT + 0.35) return 0;
  const pop = (u - BANG_AT) / 0.2;
  const size = pop < 1 ? 1.2 * smooth(pop) : 1.2 - 0.2 * smooth((pop - 1) / 0.8);
  return size * (1 - ramp(u, PREY_AT + 0.05, PREY_AT + 0.35));
}

/** The shock rings round the burst on "BANG", 0 .. 1 over their life, or null. */
export function shockAt(t: number): number | null {
  const d = wrap(t) - BANG_AT;
  return d >= 0 && d < 0.9 ? d / 0.9 : null;
}

/** A jolt of the picture: hard on "BANG", a twitch on each quick flash, px. */
export function shakeAt(t: number): Pt {
  let x = 0;
  let y = 0;
  const kick = (d: number, life: number, size: number): void => {
    if (d < 0 || d > life) return;
    const fade = (1 - d / life) ** 2;
    x += size * fade * Math.sin(d * 95);
    y += size * 0.7 * fade * Math.cos(d * 77);
  };
  kick(wrap(t) - BANG_AT, 0.55, 26);
  for (const at of QUICK_PEAKS) kick(since(t, at), 0.25, 7);
  return { x, y };
}

/** The ink sun beside the flash on "SUN!": its pop-in scale (overshooting), gone before "The pistol shrimp". */
export function sunAt(t: number): number {
  const u = wrap(t);
  if (u < SUN_AT - 0.04 || u > PISTOL_AT - 0.1) return 0;
  const pop = (u - SUN_AT + 0.04) / 0.22;
  const size = pop < 1 ? 1.12 * smooth(pop) : 1.12 - 0.12 * smooth((pop - 1) / 0.6);
  return size * (1 - ramp(u, PISTOL_AT - 0.45, PISTOL_AT - 0.1));
}

// ---------------------------------------------------------------- the fish

/** The little reef fish's length, world px. */
export const FISH_LEN = 230;
/** How far out of the claw it hovers. */
const FISH_OUT = 450;

export interface Fish extends Pt {
  /** Rotation, radians (0 level, facing left). */
  readonly spin: number;
  readonly alpha: number;
  readonly beat: number;
  readonly effort: number;
}

const FISH_IN = [PISTOL_AT - 0.1, CLAW_AT + 0.35] as const;
const TUG = [PREY_AT - 0.05, PREY_AT + 0.75] as const;
const FISH_GONE = [WORLD_AT + 0.2, SUBMARINES_AT + 0.3] as const;

/** The little fish: swims in, hovers, is knocked spinning by the BANG, tugged in by the shrimp, and gone (into its burrow) as we pull back. */
export function fishAt(t: number): Fish | null {
  const u = wrap(t);
  if (u < FISH_IN[0] || u > FISH_GONE[1]) return null;
  const s = shrimpAt(u);
  const hover = along(s, FISH_OUT);
  const swimIn = 1 - smooth((u - FISH_IN[0]) / (FISH_IN[1] - FISH_IN[0]));
  const bob = 10 * Math.sin(1.6 * u) * (1 - ramp(u, BANG_AT, BANG_AT + 0.3));
  // Knocked back and up by the bang, spinning, belly up.
  const knock = ramp(u, BANG_AT, BANG_AT + 0.35);
  const spinU = Math.max(0, Math.min(1, (u - BANG_AT) / 1.1));
  const spin = Math.PI * 3 * (1 - (1 - spinU) ** 2.5);
  const reeled = smooth((u - TUG[0]) / (TUG[1] - TUG[0]));
  const grip = along(s, 40);
  const held = { x: grip.x + 70 * Math.sin(s.tilt), y: grip.y + 70 * Math.cos(s.tilt) };
  const out = { x: hover.x + 700 * swimIn ** 1.4, y: hover.y - 90 * knock + bob - 80 * swimIn };
  const wobble = 0.12 * Math.sin(9 * u) * window01(u, BANG_AT + 1, TUG[1] + 0.6, 0.3);
  return {
    x: lerp(out.x, held.x, reeled),
    y: lerp(out.y, held.y, reeled),
    spin: spin + wobble + 0.06 * Math.sin(1.3 * u) * (1 - knock),
    alpha: ramp(u, FISH_IN[0], FISH_IN[0] + 0.4) * (1 - ramp(u, FISH_GONE[0], FISH_GONE[1])),
    beat: 2 * Math.PI * 2.2 * u * (1 - 0.8 * knock),
    effort: 0.5 * (1 - knock) + 0.25 * swimIn,
  };
}

/** The dizzy stars round its head, from "stuns" until it has gone. */
export const starsAt = (t: number): number => window01(wrap(t), STUNS_AT - 0.35, FISH_GONE[0] + 0.3, 0.3);

// ---------------------------------------------------------------- notes

export const pistolLabel = (t: number): number => window01(wrap(t), PISTOL_AT - 0.05, SNAP_FIRE + 0.15, 0.2);
/** The ring round the claw on "claw": how much is drawn, and how strongly. */
export const clawRing = (t: number): { readonly drawn: number; readonly alpha: number } => {
  const u = wrap(t);
  return { drawn: ramp(u, CLAW_AT - 0.05, CLAW_AT + 0.4), alpha: 1 - ramp(u, SNAP_FIRE - 0.15, SNAP_FIRE + 0.15) };
};
/** The arrow showing how the claw snaps shut, on "snaps its claw so fast". */
export const snapArrow = (t: number): number => window01(wrap(t), SNAPS_AT - 0.05, SNAP_FIRE + 0.1, 0.2);
export const bubbleLabel = (t: number): number => window01(wrap(t), BUBBLE_AT - 0.05, BURSTS_AT + 0.2, 0.15);
export const wwiiLabel = (t: number): number => window01(wrap(t), WORLD_AT - 0.05, SO_AT + 0.05, 0.25);
export const shhAt = (t: number): number => window01(wrap(t), HID_AT - 0.05, SO_AT - 0.05, 0.2);

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. */
export const CENTRE = { x: 540, y: 800 } as const;

interface Shot {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}
const CLOSE: Shot = { zoom: 1.12, x: 640, y: 860 };
const MID: Shot = { zoom: 0.8, x: 830, y: 800 };
const HEAT: Shot = { zoom: 0.95, x: 960, y: 630 };
const WIDE: Shot = { zoom: 0.5, x: 720, y: 700 };

const SHOTS: readonly (readonly [number, Shot])[] = [
  [0, CLOSE],
  [SUN_AT + 0.45, CLOSE],
  [PISTOL_AT + 0.45, MID],
  [BURSTS_AT, MID],
  [DEGREES_AT + 0.3, HEAT],
  [FLASH_AT, HEAT],
  [BANG_AT + 0.5, MID],
  [PREY_AT + 0.3, MID],
  [WORLD_AT + 0.75, WIDE],
  [SO_AT - 0.1, WIDE],
  [IT_AT + 0.1, CLOSE],
  [LOOP_S, CLOSE],
];
const keysOf = (f: (s: Shot) => number): Key[] => SHOTS.map(([t, s]) => ({ t, at: f(s), rate: 0 }));
// Zoom eases in log space, so a pull back feels even.
const ZOOM_KEYS = keysOf((s) => Math.log(s.zoom));
const X_KEYS = keysOf((s) => s.x);
const Y_KEYS = keysOf((s) => s.y);

export interface Camera extends Shot {}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { zoom: Math.exp(curveAt(ZOOM_KEYS, u).at), x: curveAt(X_KEYS, u).at, y: curveAt(Y_KEYS, u).at };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });

// ---------------------------------------------------------------- the shrimp bed and the submarine

export interface BedShrimp extends Pt {
  readonly facing: 1 | -1;
  readonly scale: number;
  /** 0 the far row .. 2 the near one. */
  readonly row: 0 | 1 | 2;
  /** Its snaps: start time and gap, seconds. */
  readonly first: number;
  readonly gap: number;
}

/** The noisy stretch: from "In World War Two" until the camera is back in close. */
const NOISE = [IN_AT - 0.1, SO_AT + 0.2] as const;

export const BED: readonly BedShrimp[] = (() => {
  const rng = createRng(4711);
  const rows = [
    { xs: [-330, 1100, 1450, 1760], y: 1150, scale: 1, row: 2 as const },
    { xs: [-120, 560, 1280, 1620], y: 1040, scale: 0.75, row: 1 as const },
    { xs: [-260, 240, 900, 1500], y: 960, scale: 0.55, row: 0 as const },
  ];
  return rows.flatMap((row) =>
    row.xs.map((x) => ({
      x: x + (rng() - 0.5) * 80,
      y: row.y + (rng() - 0.5) * 40,
      facing: rng() < 0.55 ? (1 as const) : (-1 as const),
      scale: row.scale * (0.92 + rng() * 0.16),
      row: row.row,
      first: NOISE[0] + rng() * 0.5,
      gap: 0.3 + rng() * 0.4,
    })),
  );
})();

/** The bed comes out of its burrows as we pull back, and goes back in before the close-up: 0 .. 1. */
export const bedShowAt = (t: number): number => window01(wrap(t), IN_AT - 0.3, IT_AT, 0.5);

/** A bed shrimp's snap mark: 0 .. 1 over its life (SNAP_MARK_S), or null. */
export const SNAP_MARK_S = 0.32;
export function bedSnapAt(i: number, t: number): number | null {
  const b = BED[i]!;
  const u = wrap(t);
  if (u < b.first || u > NOISE[1]) return null;
  const d = (u - b.first) % b.gap;
  return d < SNAP_MARK_S ? d / SNAP_MARK_S : null;
}

/** All the bed's snaps in the loop, for the soundtrack. */
export function bedSnapTimes(): { readonly t: number; readonly i: number }[] {
  return BED.flatMap((b, i) => {
    const out: { t: number; i: number }[] = [];
    for (let t = b.first; t < NOISE[1] - SNAP_MARK_S; t += b.gap) out.push({ t, i });
    return out;
  });
}

/** The submarine's centre, world px: sneaking along behind the bed from "submarines". */
export const SUB_LEN = 1500;
export function subAt(t: number): (Pt & { readonly alpha: number }) | null {
  const u = wrap(t);
  if (u < SUBMARINES_AT - 0.4 || u > LOOP_S - 0.05) return null;
  const go = (u - (SUBMARINES_AT - 0.4)) / (LOOP_S - SUBMARINES_AT);
  return {
    x: lerp(-1500, 1500, go),
    y: 520 + 18 * Math.sin(2 * u),
    alpha: ramp(u, SUBMARINES_AT - 0.4, SUBMARINES_AT + 0.1) * (1 - ramp(u, SO_AT + 0.1, IT_AT)),
  };
}
