import { BOIL_FPS } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This whale's mouthful is BIGGER than its body!": a blue whale lunges into
 * a krill swarm, drops its jaw, and its pleated throat balloons out like a
 * parachute round more than its own weight in water and krill (about 125%:
 * Goldbogen et al., Science 2012); it pushes the water out through its
 * baleen and keeps the krill, up to ~457,000 kcal a mouthful (Goldbogen et
 * al. 2011). Told by a narrator (words.ts), every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "This whale's mouthful is BIGGER than its body!" (excited): the whale
 *         mid-lunge, jaw dropped, its throat ballooned into a pouch bigger than
 *         the rest of it, a pink cloud of krill pouring in; slow motion, the
 *         jaws shut on "body!" (gulp boom)
 *   2.7   ⏪ the gulp runs back, the whale sinks away from the krill
 *   2.99  "A blue whale lunges into krill and opens wide…" (curious): wide, the
 *         whale beats up at the swarm, its jaw drops on "opens wide"
 *   5.92  "and its throat balloons like a parachute!" (surprised): the pleats
 *         stretch and the pouch inflates; a parachute pops open beside it
 *   8.46  "One gulp: more than its own weight in water." (dramatically): the jaws
 *         shut; whip down to a giant balance, the whale on one pan; the gulp of
 *         water drops on the other and outweighs it
 *  11.42  "Four hundred thousand POUNDS!": "≈ 400,000 lb (180 t)" counts up, ding
 *  14.04  "It pushes the water out and keeps the krill…" (chuckles): whip back;
 *         close on the head, water squirting out through the baleen, krill kept,
 *         a satisfied face
 *  16.36  "nearly half a million calories." (mischievous): pull back; a ticker
 *         races to "≈ 450,000 calories" beside a growing stack of burgers
 *  18.45  "So yes,": ⏪ back into the lunge, which is frame 1.
 */

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const BIGGER_AT = said('BIGGER');
export const BODY_AT = said('body!');
export const BLUE_AT = said('blue');
export const LUNGES_AT = said('lunges');
export const KRILL_AT = said('krill');
export const OPENS_AT = said('opens');
export const WIDE_AT = said('wide…');
export const AND_ITS_AT = said('and', 2);
export const THROAT_AT = said('throat');
export const BALLOONS_AT = said('balloons');
export const PARACHUTE_AT = said('parachute!');
export const ONE_AT = said('One');
export const GULP_AT = said('gulp:');
export const MORE_AT = said('more');
export const OWN_AT = said('own');
export const WATER_AT = said('water.');
export const FOUR_AT = said('Four');
export const POUNDS_AT = said('POUNDS!');
export const IT_AT = said('It');
export const PUSHES_AT = said('pushes');
export const OUT_AT = said('out');
export const KEEPS_AT = said('keeps');
export const KRILL2_AT = said('krill…');
export const NEARLY_AT = said('nearly');
export const HALF_AT = said('half');
export const MILLION_AT = said('million');
export const CALORIES_AT = said('calories.');
export const SO_AT = said('So');

/** Whole cycles a loop, as a phase in radians at time t: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

export interface Pt {
  readonly x: number;
  readonly y: number;
}
export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

// ---------------------------------------------------------------- the story clock

/** Story seconds: the jaw drops, the throat is fully ballooned, the jaws shut on the gulp. */
export const OPEN_S = OPENS_AT;
export const FULL_S = PARACHUTE_AT - 0.05;
export const SHUT_S = ONE_AT + 0.05;
/** The water squeezed out (story seconds), then the mouth shut and the krill swallowed. */
export const SQUEEZE_S = { from: 9.3, to: 11.7 } as const;
/** Frame 1: the story moment the loop opens on (jaw wide, pouch full), and how slowly it plays there. */
export const OPENING = 7.32;
const OPENING_RATE = 0.1;
/** The jaws shut in the hook, on "body!". */
export const HOOK_SHUT = BODY_AT + 0.14;
/** The two rewinds, video seconds. */
export const REWINDS = [
  { from: 2.68, to: 3.22 },
  { from: 18.42, to: 18.98 },
] as const;
/** Where the story plays at the video's own pace. */
export const LIVE = { from: 3.22, to: 8.9 } as const;

const CLOCK: readonly Key[] = [
  { t: 0, at: OPENING, rate: OPENING_RATE },
  { t: 1.8, at: OPENING + 0.2, rate: 0.14 },
  { t: HOOK_SHUT, at: SHUT_S, rate: 1.4 },
  { t: REWINDS[0].from, at: SHUT_S + 0.25, rate: 0 },
  { t: 2.95, at: 6.2, rate: -12 },
  { t: LIVE.from, at: LIVE.from, rate: 1 },
  { t: LIVE.to, at: LIVE.to, rate: 1 },
  { t: IT_AT - 0.1, at: SQUEEZE_S.from - 0.1, rate: 0.6 },
  { t: 16.25, at: SQUEEZE_S.to, rate: 1 },
  { t: REWINDS[1].from, at: 12.9, rate: 0 },
  { t: 18.72, at: 9.6, rate: -14 },
  { t: REWINDS[1].to, at: 6.75, rate: -2 },
  { t: LOOP_S, at: OPENING, rate: OPENING_RATE },
];

/** Story time at video time t. */
export const storyAt = (t: number): number => curveAt(CLOCK, wrap(t)).at;
/** How fast the story runs at video time t (negative: rewinding). */
export const storyRate = (t: number): number => curveAt(CLOCK, wrap(t)).rate;
/** The ⏪ over the picture while the story runs back, 0 .. 1. */
export const rewindAt = (t: number): number => Math.max(...REWINDS.map((r) => window01(wrap(t), r.from, r.to, 0.15)));

// ---------------------------------------------------------------- scenes

/** 0: the whale in the water; 1: the balance. Whipped down on "gulp:", back on "It". */
export const BALANCE_IN = { from: GULP_AT - 0.05, to: GULP_AT + 0.27 } as const;
export const BALANCE_OUT = { from: IT_AT - 0.2, to: IT_AT + 0.08 } as const;
export const sceneAt = (t: number): number => {
  const u = wrap(t);
  return ramp(u, BALANCE_IN.from, BALANCE_IN.to) * (1 - ramp(u, BALANCE_OUT.from, BALANCE_OUT.to));
};

// ---------------------------------------------------------------- the whale

/** The whale's own frame: snout along +x, belly +y, jaw hinge at the origin; ~1,650 units nose to fluke (a 25 m whale). */
export const TILT = 1.02;
/** How far the lower jaw swings open at its widest, radians. */
export const GAPE_MAX = 1.0;
const DIR: Pt = { x: Math.cos(TILT), y: -Math.sin(TILT) };

export type EyeMood = 'calm' | 'wide' | 'happy' | 'smug';

export interface WhalePose {
  /** Where its jaws hinge, world px, how far its snout is tipped up (radians), and its size (world px per unit). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly scale: number;
  /** 0 shut .. 1 wide open. */
  readonly gape: number;
  /** The throat: 0 flat .. 1 ballooned. */
  readonly balloon: number;
  /** The fluke's stroke: phase and size. */
  readonly beat: number;
  readonly stroke: number;
  readonly eye: EyeMood;
  /** Krill inside the mouth, 0 .. 1, and water squirting out through the baleen, 0 .. 1. */
  readonly krill: number;
  readonly squirt: number;
}

/** How far along its lunge the whale is (world px along its heading; 0 at frame 1). */
const TRAVEL: readonly Key[] = [
  { t: 0, at: -1500 },
  { t: 2.4, at: -1250, rate: 160 },
  { t: 3.6, at: -980, rate: 330 },
  { t: OPEN_S, at: -420, rate: 420 },
  { t: 5.7, at: -90, rate: 150 },
  { t: OPENING, at: 0, rate: 14 },
  { t: SHUT_S, at: 14, rate: 8 },
  { t: 10, at: 22, rate: 0 },
];

export function gapeAt(s: number): number {
  if (s < SHUT_S + 0.4) return ramp(s, OPEN_S, WIDE_AT + 0.25) * (1 - ramp(s, SHUT_S - 0.6, SHUT_S));
  // Lips parted a little while it squeezes the water out through the baleen.
  return 0.2 * window01(s, SQUEEZE_S.from - 0.2, SQUEEZE_S.to + 0.1, 0.3);
}

export function balloonAt(s: number): number {
  const fill = ramp(s, AND_ITS_AT + 0.1, FULL_S);
  // A wobble as it snaps taut on "parachute!".
  const d = s - FULL_S;
  const snap = d > 0 && d < 0.9 ? 0.07 * Math.exp(-5 * d) * Math.sin(18 * d) : 0;
  const squeeze = ramp(s, SQUEEZE_S.from, SQUEEZE_S.to);
  return Math.max(0, fill + snap - 0.86 * squeeze);
}

/** The whale at story time s (and video time t, for its face and a slow sway). */
export function whaleAt(s: number, t: number): WhalePose {
  const d = curveAt(TRAVEL, s).at;
  const sway = 0.012 * Math.sin(cycles(2, t));
  return {
    x: DIR.x * d,
    y: DIR.y * d,
    tilt: TILT + sway - 0.14 * (1 - ramp(s, 3.6, OPEN_S + 0.4)),
    scale: 1,
    gape: gapeAt(s),
    balloon: balloonAt(s),
    beat: 2 * Math.PI * 1.15 * s,
    stroke: 0.25 + 0.75 * window01(s, 2.4, OPEN_S + 0.4, 0.6),
    eye: eyeAt(t),
    krill: ramp(s, OPEN_S + 0.3, FULL_S) * (1 - ramp(s, SQUEEZE_S.to, SQUEEZE_S.to + 0.4)),
    squirt: window01(s, SQUEEZE_S.from, SQUEEZE_S.to, 0.25),
  };
}

/** The face carries each beat's mood (video time). */
export function eyeAt(t: number): EyeMood {
  const u = wrap(t);
  if (u < REWINDS[0].from || u >= REWINDS[1].to) return 'wide';
  if (u < AND_ITS_AT - 0.1) return 'calm';
  if (u < BALANCE_OUT.from) return 'wide';
  if (u < NEARLY_AT - 0.1) return 'happy';
  return 'smug';
}

// ---------------------------------------------------------------- the camera

/** The screen point the camera centres on. */
export const FOCUS = { x: 540, y: 800 } as const;
export const toScreen = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) * v.zoom + FOCUS.x, y: (p.y - v.y) * v.zoom + FOCUS.y });

/** Frame 1's camera: the whole whale, the pouch and the krill. */
export const CAM0: View = { x: 105, y: 245, zoom: 0.68 };

const CAM: readonly (View & { readonly t: number })[] = [
  { t: 0, ...CAM0 },
  { t: 1.9, x: 112, y: 240, zoom: 0.71 },
  { t: REWINDS[0].from, x: 112, y: 240, zoom: 0.71 },
  { t: 3.25, x: -180, y: 700, zoom: 0.42 },
  { t: 4.4, x: -60, y: 420, zoom: 0.44 },
  { t: 5.7, x: 40, y: 260, zoom: 0.55 },
  { t: 6.4, x: 60, y: 320, zoom: 0.6 },
  { t: 8.3, x: 80, y: 330, zoom: 0.66 },
  { t: 8.9, x: 80, y: 330, zoom: 0.7 },
  // The squeeze, close on the head; then back for the calories.
  { t: 13.9, x: 200, y: -10, zoom: 0.98 },
  { t: 16.1, x: 160, y: -110, zoom: 1.1 },
  { t: 16.8, x: 330, y: -210, zoom: 0.78 },
  { t: REWINDS[1].from, x: 335, y: -215, zoom: 0.8 },
  { t: REWINDS[1].to, x: 95, y: 250, zoom: 0.66 },
  { t: LOOP_S, ...CAM0 },
];
const CAM_X = CAM.map((k) => ({ t: k.t, at: k.x, rate: 0 }));
const CAM_Y = CAM.map((k) => ({ t: k.t, at: k.y, rate: 0 }));
const CAM_ZOOM = CAM.map((k) => ({ t: k.t, at: Math.log(k.zoom), rate: 0 }));

/** The camera at video time t (before any shake). */
export function cameraAt(t: number): View {
  const u = wrap(t);
  return { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at, zoom: Math.exp(curveAt(CAM_ZOOM, u).at) };
}

/** Jolts as the jaws shut (on "body!" in the hook and "One" in the story) and as the water lands on the scale, screen px. */
export function shakeAt(t: number): Pt {
  let x = 0;
  let y = 0;
  for (const j of [{ at: HOOK_SHUT, amp: 20 }, { at: SHUT_S, amp: 22 }, { at: WATER_LANDS, amp: 16 }, { at: POUNDS_AT, amp: 10 }]) {
    const d = wrap(t) - j.at;
    if (d < 0 || d > 0.4) continue;
    const amp = j.amp * (1 - d / 0.4) ** 2;
    x += amp * Math.sin(d * 110);
    y += amp * 0.7 * Math.cos(d * 140);
  }
  return { x, y };
}

// ---------------------------------------------------------------- the krill swarm

export interface Krill {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly size: number;
}

/** The swarm, in the world: a long patch ahead of the whale's mouth at frame 1 (the part it swims through is eaten). */
const SWARM = (() => {
  const rng = createRng(2012);
  const centre = { x: 430, y: -420 };
  return Array.from({ length: 720 }, () => {
    const r = Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    return {
      x: centre.x + Math.cos(a) * r * 430,
      y: centre.y + Math.sin(a) * r * 500,
      phase: rng() * Math.PI * 2,
      angle: rng() * Math.PI * 2,
      size: 0.75 + rng() * 0.5,
    };
  });
})();

/** The krill round the whale: all there for the lunge, out of the picture once it's eaten (back for the rewind into frame 1). */
export const swarmShownAt = (t: number): number => {
  const u = wrap(t);
  return 1 - window01(u, BALANCE_OUT.from, REWINDS[1].from + 0.35, 0.3);
};

/** Where the mouth pulls water in: just inside the open lips. */
export function mouthCentre(w: WhalePose): Pt {
  const a = w.gape * GAPE_MAX;
  return onWhale(w, { x: 260 * Math.cos(a / 2), y: 260 * Math.sin(a / 2) - 10 });
}

/** The krill, drifting, and pulled towards the open mouth as the water rushes in. */
export function krillAt(w: WhalePose, t: number): readonly Krill[] {
  const m = mouthCentre(w);
  const pull = ramp(w.gape, 0.2, 0.9) * (1 - ramp(w.balloon, 0.95, 1.05) * 0.4);
  return SWARM.map((k) => {
    const x = k.x + 10 * Math.sin(cycles(2, t) + k.phase);
    const y = k.y + 8 * Math.sin(cycles(3, t) + k.phase * 1.3);
    const dx = m.x - x;
    const dy = m.y - y;
    const dist = Math.hypot(dx, dy) || 1;
    const draw = pull * Math.min(0.85, 260 / (dist + 120)) * Math.max(0, 1 - dist / 900);
    return { x: x + dx * draw, y: y + dy * draw, angle: Math.atan2(dy, dx) * (draw > 0.05 ? 1 : 0) + k.angle * (draw > 0.05 ? 0 : 1), size: k.size };
  });
}

/** A point of the whale's own frame in the world. */
export function onWhale(w: WhalePose, p: Pt): Pt {
  const c = Math.cos(-w.tilt);
  const sn = Math.sin(-w.tilt);
  return { x: w.x + w.scale * (p.x * c - p.y * sn), y: w.y + w.scale * (p.x * sn + p.y * c) };
}

/** A world point in the whale's own frame. */
export function inWhale(w: WhalePose, p: Pt): Pt {
  const dx = (p.x - w.x) / w.scale;
  const dy = (p.y - w.y) / w.scale;
  const c = Math.cos(w.tilt);
  const sn = Math.sin(w.tilt);
  return { x: dx * c - dy * sn, y: dx * sn + dy * c };
}

// ---------------------------------------------------------------- the parachute

/** The parachute popping open beside the whale on "parachute!", 0 .. 1 (over 1: overshooting), gone as the jaws shut. */
export function parachuteAt(t: number): number {
  const u = wrap(t);
  const d = u - (PARACHUTE_AT - 0.06);
  if (d < 0 || u > SHUT_S + 0.25) return 0;
  const pop = d < 0.16 ? (d / 0.16) * 1.18 : 1 + 0.18 * Math.exp(-7 * (d - 0.16)) * Math.cos(16 * (d - 0.16));
  return pop * (1 - ramp(u, SHUT_S - 0.1, SHUT_S + 0.25));
}

// ---------------------------------------------------------------- the balance

/** The gulp of water drops onto its pan (video seconds). */
export const WATER_LANDS = MORE_AT - 0.12;

/** The weighing's own clock: video time, wound back to the start once the balance is out of the picture, so it loops. */
const weighing = (t: number): number => {
  const u = wrap(t);
  return u > BALANCE_OUT.to + 0.05 ? 0 : u;
};

/** The water falling onto the pan: 0 high above .. 1 landed, and its squash on landing. */
export function waterDropAt(t: number): { readonly fall: number; readonly squash: number } {
  const u = weighing(t);
  const fall = Math.min(1, Math.max(0, (u - (GULP_AT + 0.1)) / (WATER_LANDS - GULP_AT - 0.1)) ** 2);
  const d = u - WATER_LANDS;
  const squash = d > 0 && d < 1 ? 0.22 * Math.exp(-6 * d) * Math.cos(14 * d) : 0;
  return { fall, squash };
}

/** The beam's tilt, radians (positive: the water's side down), swinging as the water lands and settling heavier. */
export function beamAt(t: number): number {
  const u = weighing(t);
  const d = u - WATER_LANDS;
  if (d < 0) return -0.035 + 0.01 * Math.sin(cycles(5, t));
  return 0.17 - (0.17 + 0.035) * Math.exp(-2.6 * d) * Math.cos(6.5 * d);
}

/** The slow push in on the balance. */
export const balanceZoomAt = (t: number): number => lerp(1, 1.08, ramp(weighing(t), MORE_AT, BALANCE_OUT.from));

/** "≈ 400,000 lb": counting up from "Four", landing on "POUNDS!"; then the rest of the label. */
export function poundsAt(t: number): { readonly shown: number; readonly value: number; readonly unit: number; readonly pop: number } {
  const u = wrap(t);
  const shown = window01(u, FOUR_AT - 0.1, BALANCE_OUT.from + 0.05, 0.15);
  const value = 400000 * ramp(weighing(t), FOUR_AT, POUNDS_AT) ** 0.8;
  const d = u - POUNDS_AT;
  const pop = d > 0 && d < 0.6 ? 0.16 * Math.exp(-6 * d) * Math.sin(12 * d + 1.2) + 0.1 * Math.exp(-8 * d) : 0;
  return { shown, value: Math.round(value / 1000) * 1000, unit: ramp(weighing(t), POUNDS_AT - 0.05, POUNDS_AT + 0.1), pop };
}

// ---------------------------------------------------------------- the calories

/** "≈ 450,000 calories": the ticker racing up from "nearly" to "calories.", and the burgers stacking beside it. */
export function caloriesAt(t: number): { readonly shown: number; readonly value: number; readonly pop: number; readonly burgers: number } {
  const u = wrap(t);
  const shown = window01(u, NEARLY_AT - 0.15, REWINDS[1].from + 0.2, 0.15);
  // Back to nothing once it's gone, so it loops.
  const k = u > REWINDS[1].to ? 0 : ramp(u, NEARLY_AT, CALORIES_AT + 0.05);
  const d = u - CALORIES_AT - 0.05;
  const pop = d > 0 && d < 0.6 ? 0.14 * Math.exp(-6 * d) * Math.sin(12 * d + 1.2) + 0.1 * Math.exp(-8 * d) : 0;
  return { shown, value: Math.round((450000 * k) / 1000) * 1000, pop, burgers: 9 * k };
}
