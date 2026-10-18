import { BOIL } from '../../../src/art/palette';
import { BOIL_FPS } from '../sprites';
import { clamp01, curveAt, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "Plants on most planets could be BLACK": round a dim red dwarf, a plant
 * would soak up every colour of light it gets and look black (Kiang and
 * colleagues, NASA GISS, Astrobiology 2007). Told by the narrator
 * (words.ts), one mood per beat, every beat timed to a word and a pure
 * function of loop time t (seconds) over LOOP_S:
 *
 *   0     EERIE: a huge dim red sun, still in the sky, and a forest of black
 *         plants against it, the prospector tiny on a rise; a slow push in;
 *         on "BLACK" a hit: the sun throbs and the camera punches in
 *   4.2   DRAMA: "Most stars": the forest pulls away into a starfield; on
 *         "red dwarfs" three in four stars flare red, then dim on "dim"
 *   7.8   TENDER: "A plant there": in to one black leaf; rays of every
 *         colour fall on it and sink in; "pitch black": a violet sheen
 *   12.7  SURPRISE: "NASA scientists": a bright notebook page pops in, the
 *         finding sketched on it
 *   14.6  SARCASM: "Our plants?": a smug green Earth leaf; the rainbow hits
 *         it and the green ray boings straight back out
 *   17.6  PROVOCATION: "Earth's plants are doing it WRONG": a red stamp
 *         slams over it and the leaf wilts in offence
 *   20.2  EERIE whisper: "Out there, under a red sun…": the page fades and
 *         the camera pushes back into the black forest: frame 1.
 */
export const LOOP_S = 22.5;
const HALF = LOOP_S / 2;

/** The line boil: 180 steps a loop, 60 whole cycles. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => (Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS) % BOIL;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time from the loop point, negative before it: for beats that run across the seam. */
export const seam = (t: number): number => (wrap(t) < HALF ? wrap(t) : wrap(t) - LOOP_S);

/** When word `i` of the voiceover begins, in voice.mp3's time. */
export function said(i: number): number {
  const w = WORDS[i];
  if (!w) throw new Error(`word ${i} isn't in the voiceover`);
  return w.start / TEMPO;
}

/** The words each beat hangs on, by index (the test checks their text). */
export const CUE_WORDS = {
  stars: 2, galaxy: 5, plants: 6, black: 9, most: 10, red: 13, dwarfs: 14, dim: 15, a: 18, soak: 22, every: 24, gets: 29, pitch: 32, pitchBlack: 33,
  nasa: 34, scientists: 35, worked: 36, out: 38, our: 39, ourPlants: 40, they: 41, bounce: 42, straight: 45, back: 46, honestly: 47, earths: 48,
  wrong: 53, outThere: 54, sun: 59,
} as const;
type Cue = keyof typeof CUE_WORDS;
export const AT = Object.fromEntries(Object.entries(CUE_WORDS).map(([k, i]) => [k, said(i)])) as Readonly<Record<Cue, number>>;

/** The return to the forest, measured from the loop point (negative). */
const RETURN = AT.outThere - LOOP_S;

/** Overshooting ease for pops. */
const backOut = (u: number): number => {
  const c = clamp01(u);
  const k = 1.9;
  return 1 + (k + 1) * (c - 1) ** 3 + k * (c - 1) ** 2;
};

/** A quick rise and a slow fall: a hit's envelope, 0 .. 1 .. 0. */
const hit = (t: number, at: number, rise: number, fall: number): number => ramp(t, at - rise, at) * (1 - ramp(t, at, at + fall));

/** A loop-periodic wave: `k` whole cycles a loop. */
export const wave = (t: number, k: number, phase = 0): number => Math.sin((2 * Math.PI * k * t) / LOOP_S + phase);

// ---------------------------------------------------------------- the forest under the red sun

/** The point the camera zooms about: the red sun's middle. */
export const SUN = { x: 540, y: 590, r: 370 } as const;

/** The forest's camera and how much of it shows: a slow push in across the loop point, a punch on "BLACK", the pull-out on "Most". */
export function forestAt(t: number): { readonly push: number; readonly away: number; readonly zoom: number; readonly alpha: number } {
  const u = seam(t);
  const push = curveAt([
    { t: RETURN - 0.2, at: 0.8, rate: 0.12 },
    { t: 0, at: 1, rate: 0.035 },
    { t: AT.most, at: 1.1, rate: 0.02 },
  ], u).at;
  const punch = 1 + 0.045 * hit(u, AT.black + 0.04, 0.12, 0.9);
  const away = Math.exp(Math.log(0.05) * smooth(ramp(u, AT.most - 0.05, AT.most + 1.1)));
  const alpha = ramp(u, RETURN - 0.15, RETURN + 0.75) * (1 - ramp(u, AT.most + 0.45, AT.most + 1.05));
  return { push: push * punch, away, zoom: push * punch * away, alpha };
}

/** How bright the red sun is: a slow breathing glow, and a throb on "BLACK" (and a little on "red sun"). */
export function sunGlowAt(t: number): number {
  const u = seam(t);
  return 0.82 + 0.06 * wave(t, 5) + 0.55 * hit(u, AT.black + 0.04, 0.15, 1.2) + 0.12 * hit(u, AT.sun - LOOP_S + 0.1, 0.4, 1.6);
}

/** The galaxy's band brightening on "galaxy", the stars twinkling on "stars". */
export const galaxyAt = (t: number): number => window01(seam(t), AT.galaxy - 0.1, AT.black - 0.2, 0.45);
export const twinkleAt = (t: number): number => window01(seam(t), AT.stars - 0.1, AT.black - 0.3, 0.3);

/** A plant's sway (radians): a slow alien breeze, whole cycles a loop, stirred harder on "BLACK". */
export function swayAt(t: number, phase: number, depth: number): number {
  const gust = 1 + 1.6 * hit(seam(t), AT.black + 0.2, 0.3, 1.6);
  return depth * gust * (0.7 * wave(t, 4, phase) + 0.3 * wave(t, 9, phase * 1.7));
}

// ---------------------------------------------------------------- the starfield

/** The starfield's camera: pulled out from the sun on "Most", pushed into it again on "A plant there". */
export function starfieldAt(t: number): { readonly zoom: number; readonly alpha: number } {
  const w = wrap(t);
  const out = Math.exp(Math.log(5) * (1 - smooth(ramp(w, AT.most - 0.05, AT.most + 1.1))));
  const back = Math.exp(Math.log(9) * smooth(ramp(w, AT.a - 0.15, AT.a + 0.6)));
  return { zoom: out * back, alpha: ramp(w, AT.most + 0.2, AT.most + 0.75) * (1 - ramp(w, AT.a + 0.15, AT.a + 0.55)) };
}

/** The red dwarfs flare on "red dwarfs", then sink to a dim glow on "dim". */
export const redFlareAt = (t: number): number => window01(wrap(t), AT.red - 0.1, AT.dim + 0.15, 0.25);
export const redDimAt = (t: number): number => ramp(wrap(t), AT.dim - 0.05, AT.dim + 0.5) * (1 - ramp(wrap(t), AT.a - 0.2, AT.a));
export const dwarfLabel = (t: number): number => window01(wrap(t), AT.red - 0.05, AT.a + 0.1, 0.2);
export const shareLabel = (t: number): number => window01(wrap(t), AT.dim - 0.05, AT.a + 0.1, 0.2);

// ---------------------------------------------------------------- one black leaf, every colour

export const leafSceneAt = (t: number): number => window01(wrap(t), AT.a + 0.05, AT.nasa + 0.55, 0.35);

/** The black leaf: its middle, its angle, its length (px). */
export const LEAF = { x: 565, y: 780, angle: -0.36, length: 920 } as const;

export const RAY_COLOURS = ['#ff4b3a', '#ff9a2e', '#ffe14a', '#5fd35a', '#4f8fff', '#a066ff'] as const;

/** A ray: where it comes from (above the frame), where it falls on the leaf, and how much of it is drawn (`from`..`to`, 0 the source, 1 the leaf). */
export interface Ray {
  readonly colour: string;
  readonly sx: number;
  readonly sy: number;
  readonly hx: number;
  readonly hy: number;
  readonly from: number;
  readonly to: number;
}

/** Where along the leaf's midline (−1 .. 1 of its half-length) each ray falls. */
const ALONG = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5] as const;
export const leafPoint = (k: number): { readonly x: number; readonly y: number } => ({
  x: LEAF.x + Math.cos(LEAF.angle) * k * LEAF.length * 0.42,
  y: LEAF.y + Math.sin(LEAF.angle) * k * LEAF.length * 0.42,
});

const raySent = (i: number): number => AT.soak + 0.05 + i * 0.17;
const RAY_TRAVEL = 0.5;
const rayDrained = (i: number): number => AT.gets + i * 0.12;

/** The rays falling on the black leaf on "soak up EVERY colour", each sinking into it, then draining away on "gets…". */
export function leafRays(t: number): readonly Ray[] {
  return RAY_COLOURS.map((colour, i) => {
    const h = leafPoint(ALONG[i]!);
    return {
      colour, sx: 120 + i * 168, sy: -60, hx: h.x, hy: h.y,
      from: smooth(ramp(t, rayDrained(i), rayDrained(i) + 0.6)),
      to: smooth(ramp(t, raySent(i), raySent(i) + RAY_TRAVEL)),
    };
  });
}

/** Each ray's light sinking into the leaf where it lands: 0 .. 1 over its life, from its arrival. */
export const sinkAt = (i: number, t: number): number => (t - (raySent(i) + RAY_TRAVEL - 0.05)) / 1.1;

/** "pitch black": the glint that sweeps the leaf (0 .. 1 along it), and how deep the black is. */
export const glintAt = (t: number): number => ramp(t, AT.pitch - 0.1, AT.pitchBlack + 0.7);
export const deepAt = (t: number): number => ramp(t, AT.pitch - 0.2, AT.pitchBlack + 0.3);

// ---------------------------------------------------------------- the notebook page

export const CARD = { x: 540, y: 700, w: 940, h: 800, rot: -0.018 } as const;

/** The page popping in on "NASA" with a flash, and fading on "Out there". */
export function cardAt(t: number): { readonly alpha: number; readonly scale: number } {
  const w = wrap(t);
  const fade = ramp(w, AT.outThere - 0.1, AT.outThere + 0.55);
  return {
    alpha: ramp(w, AT.nasa - 0.12, AT.nasa + 0.02) * (1 - fade),
    scale: (0.72 + 0.28 * backOut(ramp(w, AT.nasa - 0.12, AT.nasa + 0.22))) * (1 - 0.06 * fade),
  };
}
export const flashAt = (t: number): number => hit(wrap(t), AT.nasa, 0.06, 0.35);

/** The scientists' note: written on, sketched, "BLACK!" ringed on "out!", cleared on "Our plants?". */
export function notesAt(t: number): {
  readonly heading: number; readonly star: number; readonly arrow: number; readonly leaf: number; readonly black: number; readonly ring: number; readonly cite: number; readonly alpha: number;
} {
  return {
    heading: ramp(t, AT.nasa - 0.05, AT.scientists + 0.45),
    star: ramp(t, AT.nasa + 0.1, AT.nasa + 0.45),
    arrow: ramp(t, AT.scientists + 0.1, AT.worked + 0.05),
    leaf: ramp(t, AT.scientists + 0.25, AT.worked + 0.15),
    black: ramp(t, AT.worked - 0.05, AT.worked + 0.2),
    ring: ramp(t, AT.out - 0.05, AT.out + 0.35),
    cite: ramp(t, AT.worked + 0.1, AT.worked + 0.45),
    alpha: 1 - ramp(t, AT.our - 0.2, AT.our + 0.05),
  };
}

// ---------------------------------------------------------------- the smug green Earth leaf

/** Where the green leaf's stem meets the page, and how long its blade is (px). */
export const GREEN = { x: 430, y: 960, length: 540, angle: -0.95 } as const;

export function greenLeafAt(t: number): { readonly pop: number; readonly alpha: number; readonly tilt: number; readonly wilt: number; readonly squash: number } {
  const w = wrap(t);
  const wiggle = w > AT.ourPlants ? 0.06 * Math.sin(2 * Math.PI * 3 * (w - AT.ourPlants)) * (1 - ramp(w, AT.ourPlants, AT.ourPlants + 0.8)) : 0;
  const preen = -0.07 * window01(w, AT.honestly - 0.1, AT.wrong - 0.05, 0.3);
  const boing = w > AT.bounce ? Math.sin(2 * Math.PI * 4 * (w - AT.bounce)) * (1 - ramp(w, AT.bounce, AT.bounce + 0.7)) : 0;
  return {
    pop: backOut(ramp(w, AT.our - 0.08, AT.our + 0.3)),
    alpha: ramp(w, AT.our - 0.08, AT.our + 0.06),
    tilt: wiggle + preen,
    wilt: smooth(ramp(w, AT.wrong + 0.03, AT.wrong + 0.5)),
    squash: 0.06 * boing,
  };
}
/** The leaf's face: smug until the stamp, then shocked. */
export const shockedAt = (t: number): boolean => wrap(t) >= AT.wrong + 0.02 && wrap(t) < AT.outThere + 1;

/** The rainbow coming in from the upper left onto the green leaf, from "They". */
/** Where the rainbow lands: high on the blade, clear of the face. */
export const EARTH_HIT = { x: 662, y: 640 } as const;
/** Earth's sun, a yellow one, in the page's top-left corner. */
export const EARTH_SUN = { x: 175, y: 385 } as const;
const earthSent = (i: number): number => AT.they - 0.3 + i * 0.04;
/** Side by side, a ribbon of colours, as a prism fans them. */
export function earthRays(t: number): readonly Ray[] {
  const dx = EARTH_HIT.x - EARTH_SUN.x;
  const dy = EARTH_HIT.y - EARTH_SUN.y;
  const l = Math.hypot(dx, dy);
  const n = { x: -dy / l, y: dx / l };
  return RAY_COLOURS.map((colour, i) => {
    const k = i - (RAY_COLOURS.length - 1) / 2;
    return {
      colour, sx: EARTH_SUN.x + n.x * k * 9, sy: EARTH_SUN.y + n.y * k * 9, hx: EARTH_HIT.x + n.x * k * 18, hy: EARTH_HIT.y + n.y * k * 18,
      from: 0.12, to: 0.12 + 0.88 * smooth(ramp(t, earthSent(i), earthSent(i) + 0.35)),
    };
  });
}
export const earthRaysAlpha = (t: number): number => 1 - ramp(t, AT.honestly + 0.1, AT.earths + 0.1);
/** The green ray bounced back out on "bounce", off the page on "straight back": how far it has gone, and how hard it wobbles. */
export const EXIT = { x: 1150, y: 390 } as const;
export function bounceAt(t: number): { readonly to: number; readonly wobble: number } {
  return {
    to: smooth(ramp(t, AT.bounce - 0.05, AT.straight + 0.15)),
    wobble: t < AT.bounce ? 0 : Math.exp(-(t - AT.bounce) * 2.2),
  };
}
export const boingLabel = (t: number): number => window01(t, AT.bounce - 0.05, AT.honestly + 0.1, 0.2);
export const globeAt = (t: number): number => backOut(ramp(t, AT.earths - 0.12, AT.earths + 0.3)) * (1 - ramp(t, AT.outThere - 0.1, AT.outThere + 0.6));

/** The stamp: slammed down on "WRONG" (scale 2.4 → 1 in three frames), then held. */
export function stampAt(t: number): { readonly scale: number; readonly alpha: number } | null {
  const w = wrap(t);
  if (w < AT.wrong - 0.06 || w > AT.outThere + 1) return null;
  const s = clamp01((w - (AT.wrong - 0.06)) / 0.1);
  return { scale: lerp(2.4, 1, s * s), alpha: Math.min(1, s * 2.5) };
}
/** Ink flecks off the stamp, 0 .. 1 of their life. */
export const splatAt = (t: number): number => (wrap(t) - (AT.wrong + 0.04)) / 0.6;

/** The page shaking from the slam. */
export function shakeAt(t: number): { readonly x: number; readonly y: number; readonly rot: number } {
  const u = wrap(t) - (AT.wrong + 0.04);
  if (u <= 0 || u > 0.55) return { x: 0, y: 0, rot: 0 };
  const k = 1 - u / 0.55;
  const s = Math.sin(2 * Math.PI * 13 * u) * k * k;
  return { x: 16 * s, y: 9 * Math.sin(2 * Math.PI * 17 * u) * k * k, rot: 0.02 * s };
}
