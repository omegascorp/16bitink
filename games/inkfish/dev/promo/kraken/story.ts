import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { apply, compose, type Frame, squidInJaws, SCARS, type Scar } from './rig';
import { MIDDLE, type Pt } from './whale';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "The Kraken is real… and this whale eats it!": sperm whales dive a
 * kilometre down to hunt giant squid; the squid fight back and leave sucker
 * scars all over their faces; it probably happens every day, and nobody has
 * ever filmed it. Told by a narrator (words.ts), every beat timed to the
 * words, a function of time in seconds over a loop of LOOP_S, one mood a beat.
 *
 *   0     "The Kraken is REAL… and THIS whale eats it!" (epic): in near-black
 *         water, a faint light from above on them, the whale's narrow jaw
 *         clamped on a giant squid, its arms wrapped round the whale's huge
 *         square head, its giant eye wide; they thrash, a jolt on "REAL", the
 *         jaw bites down on "eats"
 *   3.05  a whip pan up the dark water to the surface
 *   3.63  "Sperm whales dive a KILOMETER down to hunt giant squid." (curious):
 *         a sperm whale at the surface blows, its flukes rise and it dives
 *         down a long shaft of water, the light above shrinking, "1,000 m"
 *         ticking up; on "giant squid" the squid in the dark below, eye
 *         glinting; the jaw snaps shut on it
 *   7.1   "The squid fights back." (tense): its arms whip round and wrap the
 *         whale's head; the picture shakes, a red-black tint
 *   8.64  "Its suckers leave scars all over the whale's face!": close on the
 *         face, the arms slipping, round sucker scars popping up along their
 *         tracks, more and more
 *   11.46 "It probably happens EVERY day…" (surprised): we pull back; up top
 *         the sun and moon race over the sea, day after day, while the fight
 *         goes on in the dark below
 *   13.65 "and nobody has ever filmed it." (sarcastic): a little submarine's
 *         searchlight sweeps the dark and stops just short of the fight; its
 *         camera's REC dot blinks over empty water; it turns away
 *   15.68 "So right now, somewhere down there," (mischievous): back into the
 *         dark towards the fight, which is frame 1.
 *
 * World px: the sea's surface is y = 0, deeper is down. The whale that dives
 * is the one in frame 1, earlier: it is swapped for the diver while the
 * camera whips up the empty water between them.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const KRAKEN_AT = said('Kraken');
export const REAL_AT = said('REAL…');
export const THIS_AT = said('THIS');
export const EATS_AT = said('eats');
export const IT_AT = said('it!');
export const SPERM_AT = said('Sperm');
export const DIVE_AT = said('dive');
export const KILOMETER_AT = said('KILOMETER');
export const DOWN_AT = said('down');
export const HUNT_AT = said('hunt');
export const GIANT_AT = said('giant');
export const SQUID_AT = said('squid.');
export const THE2_AT = said('The', 2);
export const FIGHTS_AT = said('fights');
export const BACK_AT = said('back.');
export const ITS_AT = said('Its');
export const SUCKERS_AT = said('suckers');
export const SCARS_AT = said('scars');
export const ALL_AT = said('all');
export const FACE_AT = said('face!');
export const PROBABLY_AT = said('probably');
export const EVERY_AT = said('EVERY');
export const DAY_AT = said('day…');
export const AND2_AT = said('and', 2);
export const NOBODY_AT = said('nobody');
export const EVER_AT = said('ever');
export const FILMED_AT = said('filmed');
export const IT2_AT = said('it.');
export const SO_AT = said('So');
export const NOW_AT = said('now,');
export const SOMEWHERE_AT = said('somewhere');
export const THERE_AT = said('there,');

// ---------------------------------------------------------------- the beats

/** The whip pan up to the surface, and the moment the diver takes the fighter's place (both off screen). */
export const WHIP = { from: 3.05, to: 3.6 } as const;
export const SWAP = (WHIP.from + WHIP.to) / 2;
/** The jaws shut on the squid at the end of the dive. */
export const BITE = SQUID_AT + 0.42;
/** The arms whip round the whale's head on "fights back". */
export const WRAP = { from: FIGHTS_AT - 0.1, to: BACK_AT + 0.3 } as const;
/** Pulled back for the day and night: the sky slides in from the top. */
export const DAYS = { from: FACE_AT + 0.45, to: AND2_AT + 0.05 } as const;
/** The submarine's visit. */
export const SUB = { from: AND2_AT - 0.25, to: SOMEWHERE_AT + 0.2 } as const;

/** The mood of the moment, weights 0 .. 1 (epic where they're all 0). */
export interface Mood {
  readonly curious: number;
  readonly tense: number;
  readonly surprised: number;
  readonly sarcastic: number;
  readonly mischievous: number;
}

export function moodAt(t: number): Mood {
  const u = wrap(t);
  return {
    curious: window01(u, WHIP.from + 0.2, BITE + 0.1, 0.35),
    tense: window01(u, BITE - 0.05, DAYS.from + 0.2, 0.4),
    surprised: window01(u, DAYS.from, SUB.from + 0.3, 0.35),
    sarcastic: window01(u, SUB.from + 0.1, SO_AT + 0.2, 0.35),
    mischievous: window01(u, SO_AT, LOOP_S - 0.05, 0.6),
  };
}

// ---------------------------------------------------------------- the world

/** Where the fight is: the whale's snout, world px (a kilometre down, squeezed), and how its nose is raised. */
export const DEPTH = 9000;
export const FIGHT: { readonly x: number; readonly y: number; readonly tilt: number } = { x: 0, y: DEPTH, tilt: 0.24 };

/** A whale pose: its snout (local 0, 0) in the world, and its nose up, radians. */
export interface WhalePose {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** The tail's beat: its phase, and how far the flukes swing (local px). */
  readonly beat: number;
  readonly wag: number;
}

/** Local px to world px for a pose. */
export const whaleFrame = (p: WhalePose): Frame => ({ x: p.x, y: p.y, angle: -p.tilt, scale: 1 });
export const onWhale = (p: WhalePose, local: Pt): Pt => apply(whaleFrame(p), local);

/** How hard they thrash in the fight, 0 .. 1: easing in after the bite. */
const thrashAt = (u: number): number => (u < SWAP ? 1 : ramp(u, BITE, BITE + 0.6));

/** A toss of the head: on "REAL…", on "eats", and on "fights back". */
function tossAt(u: number): number {
  let a = 0;
  for (const j of [{ at: REAL_AT, amp: 0.05 }, { at: EATS_AT, amp: -0.04 }, { at: FIGHTS_AT, amp: 0.05 }, { at: BACK_AT, amp: -0.04 }]) {
    const s = u - j.at;
    if (s > 0 && s < 0.7) a += j.amp * Math.sin((Math.PI * s) / 0.7) * Math.exp(-2 * s);
  }
  return a;
}

/** The whale in the fight: shaking the squid, its tail beating slowly. */
function fightPose(t: number): WhalePose {
  const u = wrap(t);
  const k = thrashAt(u);
  return {
    x: FIGHT.x + k * (10 * Math.sin(cycles(4, t)) + 6 * Math.sin(cycles(7, t) + 1)),
    y: FIGHT.y + k * (12 * Math.sin(cycles(5, t) + 0.5)),
    tilt: FIGHT.tilt + k * (0.03 * Math.sin(cycles(6, t)) + 0.015 * Math.sin(cycles(11, t) + 1)) + tossAt(u),
    beat: cycles(9, t),
    wag: 40,
  };
}

/** The body's middle and tilt from the surface to the fight, keyed through the dive. */
interface DiveKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
}

const middleOf = (snout: Pt, tilt: number): Pt => apply({ x: snout.x, y: snout.y, angle: -tilt, scale: 1 }, MIDDLE);
const FIGHT_MIDDLE = middleOf(FIGHT, FIGHT.tilt);

/** Lying at the surface, its back out of the water. */
export const SURFACE: { readonly x: number; readonly y: number } = { x: -650, y: 215 };

const DIVE: readonly DiveKey[] = [
  { t: SWAP, x: SURFACE.x - 60, y: SURFACE.y, tilt: 0 },
  { t: DIVE_AT - 0.05, x: SURFACE.x + 90, y: SURFACE.y, tilt: 0.02 },
  { t: KILOMETER_AT + 0.1, x: SURFACE.x + 260, y: SURFACE.y + 300, tilt: -0.85 },
  { t: DOWN_AT - 0.15, x: SURFACE.x + 380, y: 1900, tilt: -1.48 },
  { t: HUNT_AT, x: FIGHT_MIDDLE.x - 300, y: DEPTH - 2300, tilt: -1.5 },
  { t: GIANT_AT + 0.3, x: FIGHT_MIDDLE.x - 260, y: FIGHT_MIDDLE.y - 900, tilt: -0.7 },
  { t: BITE, x: FIGHT_MIDDLE.x, y: FIGHT_MIDDLE.y, tilt: FIGHT.tilt },
];
const DIVE_RATES: Readonly<Record<string, readonly (number | undefined)[]>> = {
  x: [0, 60, undefined, undefined, undefined, undefined, 300],
  y: [0, 0, undefined, undefined, undefined, undefined, 200],
  tilt: [0, 0, undefined, undefined, undefined, undefined, 0.6],
};
const diveTrack = (field: 'x' | 'y' | 'tilt'): readonly Key[] => DIVE.map((k, i) => ({ t: k.t, at: k[field], rate: DIVE_RATES[field]![i] }));
const DIVE_X = diveTrack('x');
const DIVE_Y = diveTrack('y');
const DIVE_TILT = diveTrack('tilt');

/** True while the diver is on screen instead of the fighter. */
export const diving = (t: number): boolean => wrap(t) >= SWAP && wrap(t) < BITE;

export function whaleAt(t: number): WhalePose {
  const u = wrap(t);
  if (!diving(u)) return fightPose(u);
  const tilt = curveAt(DIVE_TILT, u).at;
  const mid = { x: curveAt(DIVE_X, u).at, y: curveAt(DIVE_Y, u).at };
  // The snout, from the middle: the body pivots about its middle as it dives.
  const snout = apply({ x: mid.x, y: mid.y, angle: -tilt, scale: 1 }, { x: -MIDDLE.x, y: -MIDDLE.y });
  // Beating hard on the way down.
  const effort = window01(u, DIVE_AT, BITE, 0.4);
  return { x: snout.x, y: snout.y, tilt, beat: cycles(9, t) + cycles(14, t) * effort, wag: 40 + 50 * effort };
}

/** How far the jaw is open, radians: gripping in the fight (biting down on "eats"), shut on the dive, wide as it reaches the squid, snapping shut on it. */
export function jawAt(t: number): number {
  const u = wrap(t);
  const grip = 0.075 + 0.015 * Math.sin(cycles(8, t));
  if (diving(u)) {
    const wide = 0.3 * ramp(u, GIANT_AT, SQUID_AT + 0.2);
    return u > BITE - 0.12 ? lerp(wide, grip, ramp(u, BITE - 0.12, BITE)) : wide;
  }
  // "eats": it opens a little, then bites down harder.
  const s = u - (EATS_AT - 0.22);
  const chew = s > 0 && s < 0.22 ? 0.08 * Math.sin((Math.PI * s) / 0.22) : s >= 0.22 && s < 0.6 ? -0.03 * Math.sin((Math.PI * (s - 0.22)) / 0.38) : 0;
  return Math.max(0.01, grip + chew);
}

/** The bite's snap, 0 .. 1 over its life (out of range outside it): at the end of the dive, and on "eats". */
export const chompAt = (t: number): readonly number[] => [BITE, EATS_AT + 0.02].map((at) => (wrap(t) - at) / 0.22);

// ---------------------------------------------------------------- the squid

/** How far its arms are wrapped round the whale's head: 0 loose (in the water), 1 wrapped. */
export function wrapAt(t: number): number {
  const u = wrap(t);
  if (u < SWAP) return 1;
  if (u < WRAP.from) return 0;
  return ramp(u, WRAP.from, WRAP.to);
}

/** The squid's body: in the jaws in the fight (swinging about its mantle's tip), hovering in the dark before the bite. */
export function squidFrame(t: number): Frame {
  const u = wrap(t);
  const swing = 0.08 * Math.sin(cycles(6, t) + 1) + 0.03 * Math.sin(cycles(13, t));
  const inJaws = (w: WhalePose, s: number): Frame => compose(whaleFrame(w), squidInJaws(s));
  if (!diving(u)) return inJaws(whaleAt(u), swing * thrashAt(u));
  // Hovering where it will be bitten, drifting a little.
  const at = inJaws(fightPose(BITE), 0);
  const drift = 1 - ramp(u, BITE - 0.25, BITE);
  return { ...at, x: at.x + drift * 14 * Math.sin(cycles(3, t)), y: at.y + drift * (20 * Math.sin(cycles(4, t) + 1) - 30), angle: at.angle + drift * 0.05 * Math.sin(cycles(5, t)) };
}

/** Where the squid's eye looks, as a unit-ish offset: at us, at the submarine while it's there, round at the whale as it bites. */
export function gazeAt(t: number): Pt {
  const u = wrap(t);
  const sub = window01(u, NOBODY_AT, IT2_AT + 0.35, 0.25);
  const whale = window01(u, BITE - 0.3, FIGHTS_AT + 0.2, 0.2);
  return { x: -0.8 * sub - 0.6 * whale + 0.1 * Math.sin(cycles(7, t)), y: -0.6 * sub - 0.3 * whale + 0.1 * Math.cos(cycles(5, t)) };
}

/** The glint in its eye: on "giant squid", and on "somewhere down there". */
export const glintAt = (t: number): number => Math.max(window01(wrap(t), GIANT_AT - 0.05, SQUID_AT + 0.4, 0.15), window01(wrap(t), SOMEWHERE_AT, THERE_AT + 0.25, 0.2));

// ---------------------------------------------------------------- scars

/** A sucker scar's look at time t: 0 not there, 1 settled; above 1 while it pops in. Every scar is there in frame 1. */
export function scarAt(scar: Scar, t: number): number {
  const u = wrap(t);
  if (u < SWAP) return 1;
  const at = lerp(SCARS_AT - 0.08, FACE_AT + 0.15, scar.order);
  const s = u - at;
  if (s < 0) return 0;
  return s < 0.1 ? 1.4 * (s / 0.1) : 1 + 0.4 * Math.max(0, 1 - (s - 0.1) / 0.25);
}
export { SCARS };

// ---------------------------------------------------------------- the camera

/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** How fast it is moving up or down, world px a second (streaks the snow). */
  readonly vy: number;
}

export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

/** A point of the fight (whale local px) in the world, where the fight's resting pose has it. */
const fightPoint = (local: Pt): Pt => apply(whaleFrame({ ...FIGHT, beat: 0, wag: 0 }), local);

interface Shot {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** Optional rates, per second (zoom's on its log). */
  readonly vx?: number;
  readonly vy?: number;
  readonly vz?: number;
}

/** Frame 1: the jaws, the squid and the head filling the screen; drifting slowly in all the while. */
const OPENING_AT = fightPoint({ x: -170, y: 60 });
const OPENING_ZOOM = 0.74;
const OPENING: Shot = { t: 0, x: OPENING_AT.x, y: OPENING_AT.y, zoom: OPENING_ZOOM, vx: 6, vz: 0.012 };
const OPENING_END: Shot = { ...OPENING, t: LOOP_S };
const SURFACE_SHOT = { x: SURFACE.x + 80, y: -60, zoom: 0.34 } as const;

const SHOTS: readonly Shot[] = [
  OPENING,
  { t: THIS_AT - 0.1, x: OPENING_AT.x + 10, y: OPENING_AT.y, zoom: OPENING_ZOOM * 1.02, vx: 6, vz: 0.012 },
  { t: EATS_AT + 0.1, x: OPENING_AT.x - 20, y: OPENING_AT.y + 20, zoom: OPENING_ZOOM * 1.1 },
  { t: WHIP.from, x: OPENING_AT.x - 20, y: OPENING_AT.y + 10, zoom: OPENING_ZOOM * 1.08 },
  { t: (WHIP.from + WHIP.to) / 2, x: (OPENING_AT.x + SURFACE_SHOT.x) / 2, y: DEPTH / 2, zoom: 0.38, vy: -19000 },
  { t: WHIP.to, ...SURFACE_SHOT },
  { t: DIVE_AT, ...SURFACE_SHOT, x: SURFACE_SHOT.x + 60 },
];
/** After the dive: the bite, the tense close-ups, and back out. */
const AFTER: readonly Shot[] = [
  { t: BITE + 0.05, ...fightPoint({ x: -120, y: 80 }), zoom: 0.6 },
  { t: FIGHTS_AT, x: OPENING_AT.x, y: OPENING_AT.y, zoom: 0.82 },
  { t: BACK_AT + 0.3, x: OPENING_AT.x - 40, y: OPENING_AT.y - 30, zoom: 0.92 },
  { t: SUCKERS_AT, ...fightPoint({ x: -120, y: 30 }), zoom: 1.35 },
  { t: SCARS_AT + 0.2, ...fightPoint({ x: -200, y: 0 }), zoom: 1.45 },
  { t: FACE_AT - 0.3, ...fightPoint({ x: -380, y: -20 }), zoom: 1.3 },
  { t: DAYS.from + 0.4, ...fightPoint({ x: -300, y: -150 }), zoom: 0.42 },
  { t: EVERY_AT + 0.4, ...fightPoint({ x: -300, y: -160 }), zoom: 0.4 },
  { t: SUB.from + 0.45, ...fightPoint({ x: -250, y: -350 }), zoom: 0.5 },
  { t: IT2_AT + 0.2, ...fightPoint({ x: -230, y: -330 }), zoom: 0.52 },
  { t: SOMEWHERE_AT - 0.1, ...fightPoint({ x: -150, y: -150 }), zoom: 0.56 },
  { t: LOOP_S - 0.35, x: OPENING_AT.x - 6 * 0.35, y: OPENING_AT.y, zoom: OPENING_ZOOM * Math.exp(-0.012 * 0.35), vx: 6, vz: 0.012 },
  OPENING_END,
];

const track = (shots: readonly Shot[], f: (s: Shot) => number, rate: (s: Shot) => number | undefined): Key[] => shots.map((s) => ({ t: s.t, at: f(s), rate: rate(s) ?? 0 }));
const keysOf = (shots: readonly Shot[]): { x: Key[]; y: Key[]; z: Key[] } => ({
  x: track(shots, (s) => s.x, (s) => s.vx),
  y: track(shots, (s) => s.y, (s) => s.vy),
  z: track(shots, (s) => Math.log(s.zoom), (s) => s.vz),
});
const BEFORE_KEYS = keysOf(SHOTS);
const AFTER_KEYS = keysOf(AFTER);

/** While it dives, the camera rides with the whale: centred a little ahead of its middle. */
function followAt(u: number): { readonly x: number; readonly y: number; readonly zoom: number } {
  const w = whaleAt(u);
  const mid = onWhale(w, { x: MIDDLE.x + 500, y: 0 });
  const zoom = lerp(0.34, 0.5, ramp(u, HUNT_AT, BITE));
  return { x: mid.x + 120 * ramp(u, HUNT_AT, BITE), y: mid.y + 200 * (1 - ramp(u, GIANT_AT, BITE)), zoom };
}

/** How much the camera rides with the diving whale. */
const FOLLOW = { from: DIVE_AT, in: KILOMETER_AT + 0.3, out: HUNT_AT, to: BITE + 0.05 } as const;

function shotAt(u: number): { x: number; y: number; zoom: number; vy: number } {
  const keys = u < FOLLOW.to ? BEFORE_KEYS : AFTER_KEYS;
  const y = curveAt(keys.y, u);
  return { x: curveAt(keys.x, u).at, y: y.at, zoom: Math.exp(curveAt(keys.z, u).at), vy: y.rate };
}

export function cameraAt(t: number): View {
  const u = wrap(t);
  const shot = shotAt(u);
  if (u < FOLLOW.from || u > FOLLOW.to) return shot;
  const f = followAt(u);
  // Blend from the surface shot into following, and from following into the bite shot.
  const into = ramp(u, FOLLOW.from, FOLLOW.in);
  const out = ramp(u, FOLLOW.out, FOLLOW.to);
  const bite = AFTER[0]!;
  const target = out > 0 ? { x: lerp(f.x, bite.x, out), y: lerp(f.y, bite.y, out), zoom: Math.exp(lerp(Math.log(f.zoom), Math.log(bite.zoom), out)) } : f;
  const yNext = followAt(Math.min(u + 1 / 60, FOLLOW.to)).y;
  return {
    x: lerp(shot.x, target.x, into),
    y: lerp(shot.y, target.y, into),
    zoom: Math.exp(lerp(Math.log(shot.zoom), Math.log(target.zoom), into)),
    vy: lerp(shot.vy, (yNext - f.y) * 60, into * (1 - out)),
  };
}

/** Jolts of the picture, px: the toss on "REAL", the bites, the arms whipping round. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  for (const j of [{ at: REAL_AT, amp: 14 }, { at: EATS_AT + 0.05, amp: 12 }, { at: BITE, amp: 20 }, { at: FIGHTS_AT, amp: 16 }, { at: BACK_AT, amp: 14 }, { at: FACE_AT, amp: 8 }]) {
    const s = u - j.at;
    if (s < 0 || s > 0.4) continue;
    const amp = j.amp * (1 - s / 0.4) ** 2;
    x += amp * Math.sin(s * 110);
    y += amp * 0.7 * Math.cos(s * 140);
  }
  // A tremor all through the tense beat.
  const tense = window01(u, FIGHTS_AT, FACE_AT + 0.3, 0.2);
  return { x: x + tense * 2.5 * Math.sin(u * 61), y: y + tense * 2 * Math.cos(u * 47) };
}

// ---------------------------------------------------------------- the light

/** How much daylight reaches the camera: 1 at the surface, 0 a few hundred metres down. */
export const daylightAt = (v: View): number => 1 - ramp(v.y, 300, 3800);

/** The faint light from above on the fight: dim while the submarine's lamp is the light, back for the end. */
export const poolAt = (t: number): number => 1 - 0.55 * window01(wrap(t), SUB.from + 0.2, SOMEWHERE_AT - 0.3, 0.5);

// ---------------------------------------------------------------- the blow, the depth, the days

/** The whale's blow at the surface on "Sperm whales": 0 .. 1 over its life. */
export const blowAt = (t: number): number => (wrap(t) - (SPERM_AT - 0.1)) / 0.9;

/** The depth readout, ticking to 1,000 m on "a KILOMETER down". */
export const readoutAt = (t: number): number => window01(wrap(t), KILOMETER_AT - 0.15, GIANT_AT + 0.1, 0.2);
export const metresAt = (t: number): number => Math.round(lerp(0, 1000, ramp(wrap(t), KILOMETER_AT - 0.05, DOWN_AT + 0.3)) / 10) * 10;

/** The sky sliding in from the top for the days, 0 .. 1. */
export const skyAt = (t: number): number => window01(wrap(t), DAYS.from, DAYS.to + 0.4, 0.4);
/** Days gone by: the sun rises at whole numbers, the moon at halves. */
export const daysAt = (t: number): number => (wrap(t) - DAYS.from - 0.15) / 0.55;

// ---------------------------------------------------------------- the submarine

export interface SubState {
  /** World px. */
  readonly x: number;
  readonly y: number;
  /** 1 facing right, -1 facing left (turning: in between). */
  readonly facing: number;
  /** Its searchlight: on 0 .. 1, and where it points, radians (0 right, + down). */
  readonly lamp: number;
  readonly aim: number;
  /** Its camera's REC overlay, 0 .. 1. */
  readonly rec: number;
}

const SUB_HOME = fightPoint({ x: -800, y: -1350 });

export function subAt(t: number): SubState | null {
  const u = wrap(t);
  if (u < SUB.from || u > SUB.to) return null;
  const arrive = ramp(u, SUB.from, NOBODY_AT + 0.1);
  const leave = ramp(u, IT2_AT + 0.15, SUB.to);
  const turn = ramp(u, IT2_AT, IT2_AT + 0.45);
  const bob = 10 * Math.sin(u * 3.1);
  const sweep = ramp(u, NOBODY_AT, EVER_AT + 0.25);
  const away = ramp(u, FILMED_AT + 0.1, IT2_AT + 0.25);
  return {
    x: SUB_HOME.x - 900 * (1 - arrive) - 1100 * leave,
    y: SUB_HOME.y - 300 * (1 - arrive) - 400 * leave + bob,
    facing: 1 - 2 * turn,
    lamp: window01(u, NOBODY_AT - 0.2, IT2_AT + 0.5, 0.12),
    aim: lerp(lerp(-0.1, 0.3, sweep), -0.8, away),
    rec: window01(u, NOBODY_AT - 0.05, IT2_AT + 0.12, 0.12),
  };
}

/** The submarine's length, world px (its drawing is 520 px long), and where its searchlight sits on it (drawing px, facing right). */
export const SUB_LEN = 700;
const LAMP = { x: 262, y: 65 } as const;
/** How far the searchlight's beam reaches, world px, and how far along it its pool of light (and the camera's frame) sits. */
export const BEAM_REACH = 1350;
export const POOL_AT = 0.62;

export interface Beam {
  readonly from: Pt;
  /** Radians, 0 right, + down. */
  readonly angle: number;
  /** 0 .. 1. */
  readonly on: number;
  /** The middle of its pool of light, world px. */
  readonly pool: Pt;
}

/** The searchlight's beam, world px (null while there's no submarine). */
export function beamAt(t: number): Beam | null {
  const sub = subAt(t);
  if (!sub) return null;
  const k = SUB_LEN / 520;
  const from = { x: sub.x + LAMP.x * k * sub.facing, y: sub.y + LAMP.y * k };
  const angle = sub.facing >= 0 ? sub.aim : Math.PI - sub.aim;
  const reach = BEAM_REACH * POOL_AT;
  return { from, angle, on: sub.lamp * Math.max(0, sub.facing), pool: { x: from.x + Math.cos(angle) * reach, y: from.y + Math.sin(angle) * reach } };
}

// ---------------------------------------------------------------- bubbles

export interface Bubble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly alpha: number;
}

/** Where bubbles leak from in the fight: the jaws, the arms round the head (local px). */
const LEAKS: readonly Pt[] = [{ x: -150, y: 200 }, { x: -60, y: -150 }, { x: 160, y: 260 }, { x: -300, y: 60 }, { x: 60, y: 420 }];
const BUBBLE_SEEDS = Array.from({ length: 22 }, (_, k) => ({
  source: k % LEAKS.length,
  /** Whole rises a loop, so they're where they were at the seam. */
  laps: 6 + (k % 5),
  offset: ((k * 37) % 23) / 23,
  dx: (((k * 53) % 17) / 17 - 0.5) * 90,
  r: 7 + ((k * 29) % 11),
}));

/** Bubbles rising from the fight, world px (none while the diver is on screen). */
export function bubblesAt(t: number): readonly Bubble[] {
  const u = wrap(t);
  if (diving(u)) return [];
  const w = whaleAt(u);
  return BUBBLE_SEEDS.map((b) => {
    const age = (((u / LOOP_S) * b.laps + b.offset) % 1 + 1) % 1;
    const from = onWhale(w, LEAKS[b.source]!);
    return {
      x: from.x + b.dx * age + 14 * Math.sin(age * 9 + b.offset * 6),
      y: from.y - age * 900,
      r: b.r * (1 + 0.6 * age),
      alpha: 0.7 * Math.min(1, age * 6) * (1 - age),
    };
  });
}
