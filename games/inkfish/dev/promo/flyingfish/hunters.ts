import { DIVE_FRAME } from '../../../src/art/birdArt';
import type { Pose } from '../chain';
import { clamp01, curveAt, type Key, ramp } from '../short';
import { ABOVE_AT, GET_AT, JAPANESE_AT, LOOP_S, MAHI_AT, SEABIRDS_AT, TV_AT, wrap } from './beats';
import { BOLT_AT, CAMERA, type Splash, SURFACE_Y } from './flight';

/**
 * Everyone else: the ferry the TV crew filmed from, the mahi-mahi hunting
 * from below and the gannet diving from above. Both hunters miss as the fish
 * bursts out "to get away", and are left behind across the loop point.
 */

// ---------------------------------------------------------------- the ferry

/** It sails in from the right, the crew filming, and pulls ahead once the fish is back in the sea. */
const FERRY_IN = JAPANESE_AT - 0.45;
const FERRY_X: readonly Key[] = [
  { t: 0, at: 1420, rate: -700 },
  { t: TV_AT - FERRY_IN, at: 930, rate: -20 },
  { t: 5.0 - FERRY_IN, at: 925, rate: 0 },
  { t: 6.6 - FERRY_IN, at: 1010 },
  { t: 8.4 - FERRY_IN, at: 1500, rate: 420 },
];
const FERRY_S = 8.4 - FERRY_IN;
export const FERRY_LEN = 430;
/** The ferry is drawn this much bigger than its plan (ferry.ts). */
export const FERRY_SCALE = 1.2;

export function ferryAt(t: number): { readonly x: number; readonly y: number; readonly roll: number } | null {
  const f = t - FERRY_IN;
  if (f < 0 || f > FERRY_S) return null;
  return { x: curveAt(FERRY_X, f).at, y: SURFACE_Y + 6 + 5 * Math.sin(2 * Math.PI * 0.6 * t), roll: 0.025 * Math.sin(2 * Math.PI * 0.45 * t + 1) };
}

// ---------------------------------------------------------------- the mahi-mahi

/** It comes in from behind on "Mahi-mahi", stalks the fish below, lunges as it bursts out, and falls behind. */
export const MAHI_IN = MAHI_AT - 0.35;
export const MAHI_LEN = 380;
const MAHI_S = 6.9;
const LUNGE_B = BOLT_AT + 0.75 - MAHI_IN;
const MX: readonly Key[] = [
  { t: 0, at: -320, rate: 520 },
  { t: 1.0, at: 110 },
  { t: 2.0, at: 160 },
  { t: LUNGE_B - 0.5, at: 170, rate: 0 },
  { t: LUNGE_B, at: 300, rate: 260 },
  { t: LUNGE_B + 0.5, at: 300, rate: -150 },
  { t: MAHI_S, at: -360, rate: -560 },
];
const MY: readonly Key[] = [
  { t: 0, at: 1030, rate: 0 },
  { t: 1.0, at: 1020 },
  { t: 2.0, at: 1015 },
  { t: LUNGE_B - 0.5, at: 1020, rate: 0 },
  { t: LUNGE_B, at: 975, rate: -100 },
  { t: LUNGE_B + 0.6, at: 975, rate: 60 },
  { t: MAHI_S, at: 1030, rate: 0 },
];

export interface Hunter extends Pose {
  readonly jaw: number;
}

/** Since the mahi came in, s (looping), or null while it is off screen. */
const mahiTime = (t: number): number | null => {
  const m = wrap(t - MAHI_IN);
  return m < MAHI_S ? m : null;
};

export function mahiAt(t: number): Hunter | null {
  const m = mahiTime(t);
  if (m === null) return null;
  const x = curveAt(MX, m);
  const y = curveAt(MY, m);
  const vx = CAMERA.rate(t) + x.rate;
  const jaw = m < LUNGE_B ? ramp(m, LUNGE_B - 0.45, LUNGE_B - 0.1) : 1 - ramp(m, LUNGE_B + 0.02, LUNGE_B + 0.1);
  return {
    j: 0,
    shape: 'mahi',
    age: 0,
    x: x.at,
    y: y.at,
    length: MAHI_LEN,
    facing: 1,
    tilt: Math.max(-0.6, Math.min(0.6, Math.atan2(-y.rate, vx))),
    beat: 2 * Math.PI * 3.2 * m,
    effort: 0.45 + 0.55 * clamp01((vx - 250) / 400),
    jaw,
  };
}

/** The mahi's jaws snapping shut on nothing, s since. */
export const MAHI_SNAP = MAHI_IN + LUNGE_B + 0.05;

// ---------------------------------------------------------------- the gannet

/** It flies in high from behind on "seabirds", folds and plunges on "above", just misses, and bobs up to sit on the sea. */
export const GANNET_IN = SEABIRDS_AT - 0.3;
export const PLUNGE_AT = ABOVE_AT;
const FOLD_G = 0.6;
const PLUNGE_G = PLUNGE_AT - GANNET_IN;
const SURFACED_G = PLUNGE_G + 1.5;
const GANNET_S = SURFACED_G + 2.6;
/** Screen px per px of the game's bird drawing. */
export const GANNET_SCALE = 3;
const SITTING_Y = SURFACE_Y - 16;

const GX: readonly Key[] = [
  { t: 0, at: -150, rate: 460 },
  { t: FOLD_G, at: 160 },
  { t: PLUNGE_G, at: 350, rate: 420 },
  { t: PLUNGE_G + 0.35, at: 410, rate: 80 },
  { t: PLUNGE_G + 0.9, at: 390, rate: -140 },
  { t: SURFACED_G, at: 270, rate: -120 },
];
const GY: readonly Key[] = [
  { t: 0, at: 330, rate: 0 },
  { t: FOLD_G, at: 355, rate: 250 },
  { t: PLUNGE_G, at: SURFACE_Y, rate: 1100 },
  { t: PLUNGE_G + 0.35, at: 772, rate: 30 },
  { t: PLUNGE_G + 0.9, at: 770, rate: -100 },
  { t: SURFACED_G, at: SITTING_Y, rate: 0 },
];
/** Nose down is positive (it faces right). */
const GH: readonly Key[] = [
  { t: 0, at: 0.05, rate: 0 },
  { t: FOLD_G - 0.05, at: 0.15 },
  { t: FOLD_G + 0.25, at: 1.1 },
  { t: PLUNGE_G + 0.1, at: 0.95 },
  { t: PLUNGE_G + 0.35, at: 0.45 },
  { t: PLUNGE_G + 0.9, at: -0.4 },
  { t: SURFACED_G, at: 0, rate: 0 },
];

export interface Gannet {
  readonly x: number;
  readonly y: number;
  /** Nose down, radians (it faces right). */
  readonly heading: number;
  readonly frame: number;
  /** Below the surface. */
  readonly under: boolean;
}

const FLAP = [0, 1, 2, 1] as const;

export function gannetAt(t: number): Gannet | null {
  const g = wrap(t - GANNET_IN);
  if (g >= GANNET_S) return null;
  if (g >= SURFACED_G) {
    // Sitting on the sea, left behind as the camera follows the fish.
    const at = GANNET_IN + SURFACED_G;
    const x = curveAt(GX, SURFACED_G).at - (CAMERA.at(at + (g - SURFACED_G)) - CAMERA.at(at));
    return { x, y: SITTING_Y + 4 * Math.sin(2 * Math.PI * 1.1 * g), heading: 0.03 * Math.sin(2 * Math.PI * 1.1 * g), frame: DIVE_FRAME, under: false };
  }
  const y = curveAt(GY, g).at;
  const flapping = g < FOLD_G;
  return {
    x: curveAt(GX, g).at,
    y,
    heading: curveAt(GH, g).at,
    frame: flapping ? FLAP[Math.floor(g * 14) % 4]! : DIVE_FRAME,
    under: y > SURFACE_Y + 10,
  };
}

/** The gannet's plunge, a tall narrow splash. */
export const GANNET_SPLASH: Splash = { at: PLUNGE_AT, wx: curveAt(GX, PLUNGE_G).at + CAMERA.at(PLUNGE_AT), size: 0.85, kind: 'plunge' };

/** Seconds of the loop the gannet is on screen. */
export const GANNET_SPAN = { from: GANNET_IN, to: GANNET_IN + GANNET_S - LOOP_S } as const;
