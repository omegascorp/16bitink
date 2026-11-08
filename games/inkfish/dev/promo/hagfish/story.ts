import { BOIL_FPS } from '../../../src/art/textures';
import type { Pt } from '../../../src/art/pen';
import { lerp, ramp, window01 } from '../short';
import { arm, arcLength, clamp, evenly } from './art/geom';
import { DOG_MOUTH_MID, type DogLook, type DogPlaced, onDog, pinDog } from './art/dogfish';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This shark bit a hagfish and instantly REGRETTED it": a small deep-sea
 * dogfish (about 1 m) bites a hagfish (about half its length); in under half a
 * second the hagfish squirts glassy slime straight into the shark's gills; the
 * shark gags and lets go; the hagfish ties a knot in itself and slides it from
 * head to tail to scrape the slime off. Hagfish slime is a famous defence, and
 * a hagfish really does knot itself to clean off; cameras caught this behaviour
 * fourteen times in New Zealand. Told by a narrator (words.ts), each beat timed
 * to the words, a function of time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "This shark bit a hagfish… and instantly REGRETTED it!" (excited, then
 *         comic): dark deep water lit by a bait camera's cone, the shark big
 *         and close with its jaws round the hagfish's middle, the first slime
 *         puffs bursting; on "REGRETTED" its eye goes wide.
 *   4.0   "In under half a second, the hagfish shot out SLIME…" (dramatic): a
 *         stopwatch, 0.4 s; the slime explodes in a glassy cloud.
 *   7.4   "straight into the shark's gills!" (disgusted): a close-up of the five
 *         gill slits filling with slime threads.
 *   9.9   "It gagged, choked… and let go!" (surprised): the shark convulses,
 *         gills flaring, mouth gaping; the hagfish drops out and wriggles off.
 *  12.5   "Then the hagfish tied itself in a KNOT to wipe the slime off." (laugh):
 *         an overhand knot slides from head to tail, scraping the slime off.
 *  16.3   "Cameras caught this fourteen times. And yes," (mischievous): a camera
 *         viewfinder over the first picture, 14 ticking up, New Zealand; the
 *         overlay clears so the last frame is the first.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const BIT_AT = said('bit');
export const HAGFISH_AT = said('hagfish…');
export const REGRETTED_AT = said('REGRETTED');
export const IN_AT = said('In');
export const UNDER_AT = said('under');
export const HALF_AT = said('half');
export const SECOND_AT = said('second,');
export const HAGFISH2_AT = said('hagfish', 1);
export const SHOT_AT = said('shot');
export const SLIME_AT = said('SLIME…');
export const STRAIGHT_AT = said('straight');
export const SHARKS_AT = said('shark\'s');
export const GILLS_AT = said('gills!');
export const IT_AT = said('It');
export const GAGGED_AT = said('gagged,');
export const CHOKED_AT = said('choked…');
export const LET_AT = said('let');
export const GO_AT = said('go!');
export const THEN_AT = said('Then');
export const HAGFISH3_AT = said('hagfish', 2);
export const TIED_AT = said('tied');
export const KNOT_AT = said('KNOT');
export const WIPE_AT = said('wipe');
export const SLIME2_AT = said('slime');
export const OFF_AT = said('off.');
export const CAMERAS_AT = said('Cameras');
export const CAUGHT_AT = said('caught');
export const FOURTEEN_AT = said('fourteen');
export const TIMES_AT = said('times.');
export const AND_AT = said('And');
export const YES_AT = said('yes,');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'bite' | 'gills' | 'knot';
export const SCENE_IDS: readonly SceneId[] = ['bite', 'gills', 'knot'];

export const SLIME_FROM = IN_AT - 0.1;
export const GILLS_FROM = STRAIGHT_AT - 0.1;
export const GAG_FROM = IT_AT - 0.1;
export const KNOT_FROM = THEN_AT - 0.1;
export const VIEW_FROM = CAMERAS_AT - 0.1;
/** The viewfinder clears before the loop point so the last frame is the first. */
export const CLEAR_FROM = AND_AT - 0.1;
const FADE = 0.14;

const between = (t: number, a: number, b: number): number => ramp(t, a, a + FADE) * (1 - ramp(t, b, b + FADE));

export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'gills': return between(t, GILLS_FROM, GAG_FROM);
    case 'knot': return between(t, KNOT_FROM, VIEW_FROM);
    case 'bite': return 1 - between(t, GILLS_FROM, GAG_FROM) - between(t, KNOT_FROM, VIEW_FROM);
  }
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

// ---------------------------------------------------------------- the bite (frame 1)

/** Whole cycles a loop for the thrash and the water's drift, so the loop point matches. */
export const THRASH = 20;
export const SHARK_LEN = 1750;
/** Where the jaws close, on screen (the middle of the hagfish). */
export const MOUTH_AT: Pt = { x: 570, y: 770 };
export const HAG_LEN = 740;
export const HAG_HALF_BITE = 46;
/** The shark's eye is already starting to widen in the first frame (the "uh-oh"). */
export const UH_OH = 0.25;

export const gagAt = (t: number): number => window01(t, GAGGED_AT - 0.1, LET_AT + 0.9, 0.14);
export const freedAt = (t: number): number => ramp(t, LET_AT - 0.04, LET_AT + 0.22) * (1 - ramp(t, KNOT_FROM - 0.05, KNOT_FROM + 0.1));
export const wideAt = (t: number): number => Math.max(window01(t, REGRETTED_AT - 0.12, SLIME_FROM + FADE, 0.12), 0.35 * gagAt(t), 0.9 * window01(t, CHOKED_AT, LET_AT + 0.6, 0.2));
/** Slime in the gills: it floods in during the close-up and stays while the shark gags. */
export const gelAt = (t: number): number => ramp(t, GILLS_FROM, GILLS_FROM + 1.3) * (1 - ramp(t, KNOT_FROM - 0.1, KNOT_FROM + 0.1));
export const flareAt = (t: number): number => 0.08 + 0.6 * ramp(t, GILLS_FROM + 0.4, GILLS_AT) * (1 - ramp(t, KNOT_FROM - 0.1, KNOT_FROM + 0.1)) + 0.4 * gagAt(t) * (0.5 + 0.5 * Math.sin(t * 17));
export const chokeAt = (t: number): number => window01(t, CHOKED_AT, LET_AT + 0.9, 0.2);

export interface Bite {
  readonly shark: DogPlaced;
  readonly look: DogLook;
  /** Where the hagfish is gripped, on screen. */
  readonly hold: Pt;
  /** The hagfish, head first. */
  readonly spine: Pt[];
  readonly half: number;
  /** 1: held in the jaws; 0: free. */
  readonly held: number;
  readonly jets: number;
}

/**
 * Gripped by the middle and thrashing in an S on both sides of the jaws: the
 * head half runs forward under the snout and curls up in front of it, the
 * tail half runs back under the throat and curls down below. Head first.
 */
function heldSpine(t: number, hold: Pt): Pt[] {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const half = HAG_LEN / 2;
  const STEPS = 20;
  const sm = (v: number): number => v * v * (3 - 2 * v);
  const limb = (a0: number, turn: number, w: number, lag: number): Pt[] => {
    const out: Pt[] = [hold];
    let { x, y } = hold;
    for (let i = 1; i <= STEPS; i++) {
      const u = (i - 0.5) / STEPS;
      const a = a0 + turn * sm(clamp(u * 1.08)) + w * Math.sin(THRASH * ph + lag - 2.2 * u) * u;
      x += Math.cos(a) * (half / STEPS);
      y += Math.sin(a) * (half / STEPS);
      out.push({ x, y });
    }
    return out;
  };
  // Head half: forward and a little down out of the front of the mouth, then hooking up in front of the snout.
  const head = limb(0.38, -2.95, 0.26, 0);
  // Tail half: back under the throat, down, then curling forward below.
  const tail = limb(Math.PI - 0.62, -1.95, 0.36, 1.7);
  return [...head.reverse(), ...tail.slice(1)];
}

/** A hagfish swimming: head at `head`, heading `dir`, a travelling wave down the body. */
export function swimSpine(head: Pt, dir: number, len: number, phase: number, amp: number, n = 41): Pt[] {
  const out: Pt[] = [head];
  let { x, y } = head;
  for (let i = 1; i < n; i++) {
    const u = i / (n - 1);
    const a = dir + Math.PI + amp * Math.sin(phase - 6.4 * u) * (0.25 + u);
    x += Math.cos(a) * (len / (n - 1));
    y += Math.sin(a) * (len / (n - 1));
    out.push({ x, y });
  }
  return out;
}

/** Let go: the hagfish drops out of the jaws as it was, still wriggling, tumbling down and away. */
function freeSpine(t: number, held: readonly Pt[]): Pt[] {
  const u = Math.max(0, t - LET_AT);
  const off = { x: 160 * u + 200 * u * u, y: 200 * u + 1500 * u * u };
  const mid = held[Math.floor(held.length / 2)]!;
  const a = 0.9 * u;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return held.map((p) => {
    const [dx, dy] = [p.x - mid.x, p.y - mid.y];
    return { x: mid.x + dx * c - dy * s + off.x, y: mid.y + dx * s + dy * c + off.y };
  });
}

/** The shark and the hagfish in the bite scene: held and thrashing, then (after "let go") the hagfish dropping free. */
export function biteAt(t: number): Bite {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const th = Math.sin(THRASH * ph);
  const gag = gagAt(t);
  const shake = Math.sin(t * 41);
  const bend = 0.07 * th + 0.34 * gag * Math.sin(t * 15.5) * (1 - ramp(t, LET_AT + 0.3, LET_AT + 0.9) * 0.5);
  const rot = 0.05 + 0.035 * Math.sin(2 * ph) + 0.045 * gag * shake;
  const base: Omit<DogPlaced, 'x' | 'y'> = { len: SHARK_LEN, rot, face: 1, beat: 3 * THRASH * ph / 3 + 0.4 };
  const aim = { x: MOUTH_AT.x + 12 * th + 26 * gag * shake, y: MOUTH_AT.y + 8 * Math.sin(3 * ph) + 18 * gag * Math.sin(t * 37 + 1) };
  const shark = pinDog(base, DOG_MOUTH_MID, aim, bend);
  const freed = freedAt(t);
  const gape = 0.86 + 0.14 * Math.max(gag * 0.6, chokeAt(t));
  const look: DogLook = {
    bend, gape, wide: Math.max(UH_OH, wideAt(t)), flare: flareAt(t), gel: gelAt(t), drift: t * 9, spew: gagAt(t),
  };
  const hold = onDog(shark, { x: 128, y: 17 }, bend);
  const held = heldSpine(t, hold);
  const spine = freed < 0.002 ? held : swimBlend(held, freeSpine(t, held), freed);
  const idle = 0.14 + 0.1 * Math.sin(THRASH * ph * 0.5 + 1);
  const jets = t >= GAG_FROM && t < KNOT_FROM ? 0 : t >= SLIME_FROM && t < GILLS_FROM ? Math.max(idle, ramp(t, SHOT_AT - 0.05, SHOT_AT + 0.25)) : idle;
  return { shark, look, hold, spine, half: HAG_HALF_BITE, held: 1 - freed, jets };
}

function swimBlend(a: readonly Pt[], b: readonly Pt[], u: number): Pt[] {
  return a.map((p, i) => ({ x: lerp(p.x, b[i]!.x, u), y: lerp(p.y, b[i]!.y, u) }));
}

/** Small slime puffs at the bite: a few, each bursting once every third of the loop (whole cycles). */
export const PUFFS = 14;
export const puffAge = (t: number, i: number): number => ((((PUFFS * t) / LOOP_S + i / 3) % 1) + 1) % 1;

// ---------------------------------------------------------------- the slime burst

export const stopwatchAt = (t: number): number => window01(t, UNDER_AT - 0.15, GILLS_FROM + 0.02, 0.15);
/** The stopwatch's hand: 0 .. 1 of its dial (0.4 s), sweeping on "half a second". */
export const handAt = (t: number): number => ramp(t, UNDER_AT, SECOND_AT + 0.1);
export const secondsAt = (t: number): number => 0.4 * handAt(t);
export const burstAt = (t: number): number => ramp(t, SHOT_AT - 0.05, SLIME_AT + 0.5);
/** How much of the cloud shows: the burst, then thinner as the shark gags. */
export const cloudAt = (t: number): number => ramp(t, SHOT_AT - 0.05, SHOT_AT + 0.3) * (1 - ramp(t, GILLS_FROM, GILLS_FROM + 0.12)) + 0.22 * ramp(t, GAG_FROM, GAG_FROM + 0.2) * (1 - ramp(t, LET_AT + 0.2, KNOT_FROM - 0.1));
export const shockAt = (t: number): number => (t >= SHOT_AT - 0.02 && t < SHOT_AT + 0.6 ? (t - (SHOT_AT - 0.02)) / 0.62 : 0);

// ---------------------------------------------------------------- the gill close-up

export const GILL_FOCUS: Pt = { x: 560, y: 800 };
/** The middle of the head in own units: the eye, snout, mouth and all five slits in frame. */
export const GILLS_HEAD: Pt = { x: 104, y: 0 };
export interface Gills {
  readonly shark: DogPlaced;
  readonly look: DogLook;
}

/** The camera pushes in on the five slits as the narrator says the shark's gills. */
export function gillsAt(t: number): Gills {
  const g = ramp(t, STRAIGHT_AT, GILLS_AT + 0.25);
  const len = lerp(2350, 2800, g);
  const flare = 0.3 + 0.7 * ramp(t, STRAIGHT_AT + 0.3, GILLS_AT);
  const base: Omit<DogPlaced, 'x' | 'y'> = { len, rot: 0.04 + 0.015 * Math.sin(t * 3), face: 1, beat: t * 4 };
  const shark = pinDog(base, GILLS_HEAD, { x: GILL_FOCUS.x + 10 * Math.sin(t * 9) * g, y: GILL_FOCUS.y + 8 * Math.sin(t * 7.3) });
  return { shark, look: { flare, gel: ramp(t, GILLS_FROM + 0.1, GILLS_AT + 0.1), drift: t * 10, wide: 0.15 } };
}
export const gillStreamAt = (t: number): number => ramp(t, GILLS_FROM, GILLS_FROM + 0.5);

// ---------------------------------------------------------------- the knot

export const KNOT_UNIT = 46;
export const KNOT_HALF = 30;
export const KNOT_LEN = 2050;
export const KNOT_C: Pt = { x: 540, y: 1030 };
const GAP = 0.3;
const TRE_N = 140;

/** The open trefoil, centred, in px with a depth in -1 .. 1: from just right of its top tip, all the way round, to just left of it. */
function trefoil(): { readonly pts: Pt[]; readonly z: number[] } {
  const pts: Pt[] = [];
  const z: number[] = [];
  for (let i = 0; i <= TRE_N; i++) {
    const t = Math.PI + GAP + ((2 * Math.PI - 2 * GAP) * i) / TRE_N;
    pts.push({ x: (Math.sin(t) + 2 * Math.sin(2 * t)) * KNOT_UNIT, y: (Math.cos(t) - 2 * Math.cos(2 * t)) * KNOT_UNIT + 0.4 * KNOT_UNIT });
    z.push(-Math.sin(3 * t));
  }
  return { pts, z };
}
const TRE = trefoil();
export const KNOT_ARC = arcLength(TRE.pts);

export const swimInAt = (t: number): number => ramp(t, KNOT_FROM, HAGFISH3_AT + 0.4);
export const tieAt = (t: number): number => ramp(t, TIED_AT, KNOT_AT + 0.05);
export const slideAt = (t: number): number => ramp(t, KNOT_AT + 0.1, OFF_AT - 0.05);

export interface KnotPose {
  readonly spine: Pt[];
  readonly depth: number[];
  readonly half: number;
  /** Slime on the skin by position along the body (0 head .. 1 tail). */
  readonly coat: (u: number) => number;
  /** Where the scraped slime piles up (beside the knot, on the tail side). */
  readonly pile: Pt;
  /** The tail tip. */
  readonly tip: Pt;
  readonly tie: number;
  readonly slide: number;
}

/** The straight swim: a wave across the screen, head at the left. */
function swimLine(t: number, shift: number): Pt[] {
  const pts: Pt[] = [];
  const A = 150;
  const wl = 470;
  const phase = t * 5.4;
  for (let i = 0; i <= 200; i++) {
    const s = (KNOT_LEN * i) / 200;
    const x = 70 + s * 0.46 + shift;
    pts.push({ x, y: 905 + A * Math.sin((2 * Math.PI * (x - shift)) / wl - phase) * (0.35 + 0.65 * Math.min(1, s / 500)) });
  }
  return pts;
}

/** The knotted body, head first: the head-side tail, the trefoil, the tail-side tail. */
function knotted(slide: number): { readonly pts: Pt[]; readonly z: number[] } {
  const a = lerp(110, 700, slide);
  const b = KNOT_LEN - KNOT_ARC - a;
  const start = { x: KNOT_C.x + TRE.pts[0]!.x, y: KNOT_C.y + TRE.pts[0]!.y };
  const end = { x: KNOT_C.x + TRE.pts[TRE_N]!.x, y: KNOT_C.y + TRE.pts[TRE_N]!.y };
  // The head-side tail leaves the knot's first end going left, then curls up.
  const A = arm(start, Math.PI + 0.12, Math.PI + 1.5, a, 420, 0.16, 0.5).reverse();
  const B = arm(end, -0.12, -1.5, b, 420, 0.16, 2.2);
  const pts = [...A, ...TRE.pts.map((p) => ({ x: KNOT_C.x + p.x, y: KNOT_C.y + p.y })), ...B];
  const z = [...A.map(() => 0.75), ...TRE.z, ...B.map(() => -0.75)];
  return { pts, z };
}

function resampled(pts: readonly Pt[], z: readonly number[], n: number): { readonly pts: Pt[]; readonly z: number[] } {
  const { pts: out, at } = evenly(pts, n);
  return {
    pts: out,
    z: at.map((f) => {
      const j = Math.min(z.length - 2, Math.floor(f));
      return lerp(z[j]!, z[j + 1]!, f - j);
    }),
  };
}

/** The hagfish in the knot scene: swims in, ties itself in a knot and slides it from head to tail. */
export function knotAt(t: number): KnotPose {
  const M = 220;
  const tie = tieAt(t);
  const slide = slideAt(t);
  const comes = 1 - swimInAt(t);
  const line = resampled(swimLine(t, 900 * comes * comes), swimLine(t, 0).map(() => 0), M);
  const kn = knotted(slide);
  const k = resampled(kn.pts, kn.z, M);
  const spine = line.pts.map((p, i) => ({ x: lerp(p.x, k.pts[i]!.x, tie), y: lerp(p.y, k.pts[i]!.y, tie) }));
  const depth = k.z.map((z) => z * tie);
  const a = lerp(110, 700, slide);
  const u0 = a / KNOT_LEN;
  const u1 = (a + KNOT_ARC) / KNOT_LEN;
  const clean = ramp(t, KNOT_AT + 0.1, OFF_AT);
  const coat = (u: number): number => (tie < 0.5 ? 1 : 1 - 0.92 * clamp(clean * 3) * (1 - ramp(u, u1 - 0.02, u1 + 0.03)));
  void u0;
  const endPt = { x: KNOT_C.x + TRE.pts[TRE_N]!.x, y: KNOT_C.y + TRE.pts[TRE_N]!.y };
  return { spine, depth, half: KNOT_HALF, coat, pile: { x: endPt.x + 30, y: endPt.y - 20 }, tip: spine[M - 1]!, tie, slide };
}

/** The slime the knot scrapes off collects at the knot, then flicks away off the tail on "off". */
export const pileAt = (t: number): number => ramp(t, KNOT_AT + 0.1, OFF_AT) * (1 - ramp(t, OFF_AT + 0.05, OFF_AT + 0.3));
export const flickAge = (t: number): number => t - OFF_AT;
export const sparkleAt = (t: number): number => window01(t, OFF_AT + 0.05, VIEW_FROM + FADE, 0.15);
export const smileAt = (t: number): number => ramp(t, TIED_AT - 0.1, TIED_AT + 0.3);

// ---------------------------------------------------------------- the viewfinder

export const viewAt = (t: number): number => ramp(t, VIEW_FROM, VIEW_FROM + 0.25) * (1 - ramp(t, CLEAR_FROM, LOOP_S - 0.15));
export const recAt = (t: number): number => viewAt(t);
/** The counter ticks 0 .. 14 over "fourteen". */
export const countAt = (t: number): number => Math.round(14 * ramp(t, FOURTEEN_AT - 0.05, FOURTEEN_AT + 0.5));
export const countShowAt = (t: number): number => window01(t, CAUGHT_AT - 0.1, CLEAR_FROM + 0.2, 0.12);
export const zealandAt = (t: number): number => window01(t, TIMES_AT + 0.05, CLEAR_FROM + 0.25, 0.15);
export const stopwatchTextAt = (t: number): number => stopwatchAt(t);

// ---------------------------------------------------------------- the camera and the grade

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
  /** The point the zoom is about. */
  readonly pivot: Pt;
}

/** A slow push in and out all loop (whole cycles), a shake on each blow, a push on the slime and on the gag. */
export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const jolt = decay(t, REGRETTED_AT, 0.4) * 0.6 + decay(t, SHOT_AT, 0.7) + 0.7 * decay(t, GILLS_AT, 0.4) + 0.9 * decay(t, GAGGED_AT, 0.4) + 0.9 * decay(t, CHOKED_AT, 0.4) + decay(t, LET_AT, 0.45) + 0.5 * decay(t, KNOT_AT, 0.35);
  const push = 0.3 * window01(t, SLIME_FROM, GILLS_FROM + 0.1, 0.5) + 0.14 * window01(t, GAG_FROM, KNOT_FROM + 0.1, 0.25) + 0.07 * Math.sin(Math.PI * ramp(t, VIEW_FROM, LOOP_S));
  const toMouth = clamp(window01(t, SLIME_FROM, GILLS_FROM + 0.1, 0.5) + window01(t, GAG_FROM, KNOT_FROM + 0.1, 0.25));
  return {
    zoom: 1.03 + 0.02 * Math.sin(ph) + push,
    rot: 0.012 * Math.sin(2 * ph) + 0.02 * jolt * Math.sin(t * 53),
    dx: 6 * Math.sin(2 * ph) + 24 * jolt * Math.sin(t * 71),
    dy: 5 * Math.sin(3 * ph) + 20 * jolt * Math.sin(t * 83 + 1),
    pivot: { x: lerp(540, MOUTH_AT.x + 40, toMouth), y: lerp(800, MOUTH_AT.y + 60, toMouth) },
  };
}

/** A white flash on each cut and each blow. */
export function flashAt(t: number): number {
  return Math.max(0.5 * decay(t, SHOT_AT - 0.02, 0.35), 0.28 * decay(t, SLIME_FROM, 0.16), 0.25 * decay(t, GILLS_FROM, 0.16), 0.4 * decay(t, GAG_FROM, 0.2), 0.5 * decay(t, LET_AT - 0.02, 0.3), 0.3 * decay(t, KNOT_FROM, 0.18), 0.4 * decay(t, KNOT_AT, 0.25), 0.2 * decay(t, VIEW_FROM, 0.16));
}

/** The mood colour of each beat: weights 0 .. 1. */
export interface Grade {
  /** Dramatic: deep violet. */
  readonly violet: number;
  /** Disgusted: a sickly olive. */
  readonly olive: number;
  /** Surprised: bright cold cyan. */
  readonly cyan: number;
  /** Laughing: warm sunny gold. */
  readonly warm: number;
  /** Mischievous: magenta night-vision. */
  readonly magenta: number;
}
export function gradeAt(t: number): Grade {
  return {
    violet: window01(t, SLIME_FROM, GILLS_FROM + 0.1, 0.25),
    olive: window01(t, GILLS_FROM, GAG_FROM + 0.1, 0.2),
    cyan: window01(t, GAG_FROM, KNOT_FROM + 0.1, 0.15),
    warm: window01(t, KNOT_FROM, VIEW_FROM + 0.1, 0.2),
    magenta: viewAt(t),
  };
}
