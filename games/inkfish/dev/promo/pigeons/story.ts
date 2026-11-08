import type { Pt } from '../../../src/art/pen';
import { curveAt, ramp, window01 } from '../short';
import {
  BURST_AT, FIVEFOOT_AT, FOUR_AT, GONE_AT, GRABS_AT, LOOP_S, LUNCH_AT, LUNGE_FROM, ALBI_AT, MOVE_AT, NERVOUS_FROM, PLACE_FROM, SO_AT, TRICK_AT, WASHING_AT, wrap,
} from './timing';

export * from './fish';
export * from './flock';
export * from './timing';

/** The camera, the mood, the spray and the writing over the loop; the beats themselves are told in timing.ts. */

export interface Cam {
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
}

/** Frame 1's camera, and the burst's landing: low on the gravel, the fish's head huge, its body running back behind it. */
export const HOOK_CAM: Cam = { zoom: 2.6, cx: 712, cy: 1128 };
const CAM_KEYS: readonly { readonly t: number; readonly cam: Cam }[] = [
  { t: 0, cam: HOOK_CAM },
  { t: 1.7, cam: HOOK_CAM },
  { t: 3.0, cam: { zoom: 1.15, cx: 590, cy: 1000 } },
  { t: 3.9, cam: { zoom: 1.15, cx: 600, cy: 1000 } },
  { t: 5.3, cam: { zoom: 1.6, cx: 740, cy: 1110 } },
  { t: 6.1, cam: { zoom: 1.62, cx: 720, cy: 1100 } },
  { t: 6.8, cam: { zoom: 1.3, cx: 560, cy: 1010 } },
  { t: 8.6, cam: { zoom: 1.36, cx: 620, cy: 1010 } },
  { t: 9.1, cam: { zoom: 2.0, cx: 716, cy: 1050 } },
  { t: 11.9, cam: { zoom: 2.08, cx: 712, cy: 1050 } },
  { t: 12.5, cam: { zoom: 1.62, cx: 690, cy: 1040 } },
  { t: 14.3, cam: { zoom: 1.4, cx: 640, cy: 1050 } },
  { t: 15.2, cam: { zoom: 1.7, cx: 610, cy: 1050 } },
  { t: 17.5, cam: { zoom: 1.85, cx: 600, cy: 1060 } },
  { t: 18.3, cam: { zoom: 2.3, cx: 570, cy: 1120 } },
  { t: 18.85, cam: { zoom: 2.9, cx: 570, cy: 1150 } },
  { t: 19.5, cam: { zoom: 2.9, cx: 590, cy: 1150 } },
  { t: 20.1, cam: { zoom: 3.0, cx: 800, cy: 1170 } },
  { t: 21.55, cam: { zoom: 3.05, cx: 800, cy: 1160 } },
  { t: LOOP_S, cam: HOOK_CAM },
];

export function camAt(t: number): Cam {
  const u = wrap(t);
  const pick = (f: (c: Cam) => number): number =>
    curveAt(CAM_KEYS.map((k, i) => ({ t: k.t, at: f(k.cam), rate: i === 0 || i === 1 || i === CAM_KEYS.length - 1 ? 0 : undefined })), u).at;
  const zoom = pick((c) => c.zoom);
  // Never show past the painted world's edges.
  const within = (v: number, half: number, size: number): number => Math.max(half, Math.min(size - half, v));
  return { zoom, cx: within(pick((c) => c.cx), 540 / zoom, 1080), cy: within(pick((c) => c.cy), 960 / zoom, 1920) };
}

/** The camera shaken by the lunge (pixels on screen). */
export function shakeAt(t: number): Pt {
  const u = wrap(t) - LUNGE_FROM - 0.1;
  const k = u < 0 || u > 1.2 ? 0 : Math.exp(-u * 3.6) * 34;
  return { x: k * Math.sin(u * 61), y: k * Math.sin(u * 47 + 1) };
}

// ---------------------------------------------------------------- the mood

export interface Mood {
  /** Colour drained to grey, 0 .. 1. */
  readonly drain: number;
  /** Cooled blue, 0 .. 1. */
  readonly cool: number;
  /** Warmed gold, 0 .. 1. */
  readonly warm: number;
}

export function moodAt(t: number): Mood {
  const u = wrap(t);
  const nervous = ramp(u, NERVOUS_FROM, NERVOUS_FROM + 0.5) * (1 - ramp(u, LUNGE_FROM, LUNGE_FROM + 0.12));
  const sly = ramp(u, TRICK_AT, TRICK_AT + 0.4) * (1 - ramp(u, GRABS_AT - 0.3, GRABS_AT));
  const tense = ramp(u, GRABS_AT, MOVE_AT) * (1 - ramp(u, MOVE_AT + 0.05, MOVE_AT + 0.3));
  const comic = ramp(u, SO_AT, SO_AT + 0.4) * (1 - ramp(u, BURST_AT - 0.05, BURST_AT + 0.25));
  const sunny = ramp(u, PLACE_FROM, PLACE_FROM + 0.4) * (1 - ramp(u, NERVOUS_FROM, NERVOUS_FROM + 0.3));
  return {
    drain: Math.max(0.78 * nervous, 0.3 * sly, 0.6 * tense, 0.22 * comic),
    cool: Math.max(0.5 * nervous, 0.35 * tense, 0.2 * comic),
    warm: Math.max(0.5 * sunny, 0.18 * sly),
  };
}

/** The white flash of an impact. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const pulse = (t0: number, k: number): number => (u < t0 ? 0 : k * (1 - ramp(u, t0, t0 + 0.28)));
  return Math.max(pulse(LUNGE_FROM + 0.1, 0.55), pulse(BURST_AT + 0.3, 0.5));
}

/** The spray's age at loop time t: the burst that opens the loop, the lunge, the dive. */
export function sprayAges(t: number): { readonly hook: number; readonly lunge: number; readonly dive: number } {
  const u = wrap(t);
  return { hook: u >= BURST_AT + 0.1 ? u - BURST_AT - 0.1 : u + LOOP_S - BURST_AT - 0.1, lunge: u - LUNGE_FROM - 0.1, dive: u - (GONE_AT - 0.2) };
}

/** The feather the lunch leaves behind: where, how big and how visible. */
export function featherAt(t: number): { readonly x: number; readonly y: number; readonly turn: number; readonly alpha: number } {
  const u = wrap(t) - (LUNCH_AT - 0.35);
  if (u < 0) return { x: 0, y: 0, turn: 0, alpha: 0 };
  return { x: 620 + 45 * Math.sin(u * 2.6), y: 960 + 135 * u ** 0.9, turn: 0.8 * Math.sin(u * 2.6 + 1), alpha: ramp(u, 0, 0.2) * (1 - ramp(u, 2.0, 2.6)) };
}

// ---------------------------------------------------------------- the writing

export const albiAt = (t: number): number => window01(wrap(t), ALBI_AT - 0.05, WASHING_AT + 1, 0.3);
export const metricAt = (t: number): number => window01(wrap(t), FIVEFOOT_AT - 0.05, FOUR_AT, 0.25);
export const timerAt = (t: number): number => window01(wrap(t), FOUR_AT - 0.1, TRICK_AT - 0.1, 0.25);

/** The ticking timer's reading, in seconds, 0.0 .. 4.0, running evenly. */
export function timerValue(t: number): number {
  const u = wrap(t);
  return Math.round(4 * Math.max(0, Math.min(1, (u - FOUR_AT) / (LUNCH_AT - 0.1 - FOUR_AT))) * 10) / 10;
}
