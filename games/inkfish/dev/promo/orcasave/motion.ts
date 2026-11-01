import type { Pt } from '../../../src/art/pen';
import { lerp, ramp } from '../short';
import {
  ARCHED_AT, CHEST_AT, cycles, decay, FLOE_FROM, IT_AT, LANDED_AT, LOOP_S, OVER_AT, ROLLED_AT, SAVE_FROM, UP_AT, WATER_AT, WAVE_FROM,
} from './story';

/** Where everything is, as functions of time: the humpback and the seal (save / hook), the orca fins, the floe and the wave. */

/** The waterline of the whale scenes, y in px. */
export const W = 1090;
export const WHALE_LEN = 2250;
/** The humpback's own frame: 2600 units snout to fluke tip, the middle at x -80. */
export const WHALE_UNITS = 2600;
export const WHALE_CENTRE_X = -80;
export const WS = WHALE_LEN / WHALE_UNITS;
/** Where the seal lies on the chest, in the humpback's own units (the throat pleats), and how high its middle sits over the skin. */
export const CHEST_LOCAL: Pt = { x: 800, y: 300 };
/** Chest height above the middle of the whale, px. */
const CH = CHEST_LOCAL.y * WS;
/** Where the whale's middle is when the seal lands (the chest under x 700). */
const LAND_CX = 700 - (CHEST_LOCAL.x - WHALE_CENTRE_X) * WS;
export const SEAL_LEN = 500;
export const SEAL_UP = 64;

const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const osc = (t: number, n: number, phase = 0): number => Math.sin((2 * Math.PI * n * t) / LOOP_S + phase);
/** An ease half way between linear and a smoothstep. */
const ease = (u: number): number => 0.5 * u + 0.5 * u * u * (3 - 2 * u);

/** Piecewise eased interpolation through [time, value] keys. */
export function keyed(t: number, keys: readonly (readonly [number, number])[]): number {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0] = keys[i - 1]!;
    const [t1, v1] = keys[i]!;
    if (t <= t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1]![1];
}

// ---------------------------------------------------------------- the humpback and the seal

export interface WhaleState {
  readonly cx: number;
  readonly cy: number;
  /** 1 back up .. -1 belly up (the picture is squashed through zero as it rolls). */
  readonly roll: number;
  readonly tilt: number;
  /** The flippers: 0 trailing .. 1 open like arms. */
  readonly spread: number;
  /** Water running off the chest, 0 .. 1. */
  readonly pour: number;
}

/** A point of the humpback's own frame on screen. */
export function onWhale(w: WhaleState, local: Pt): Pt {
  const p = rot({ x: (local.x - WHALE_CENTRE_X) * WS, y: w.roll * local.y * WS }, w.tilt);
  return { x: w.cx + p.x, y: w.cy + p.y };
}

export interface SealState {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly mood: 'nervous' | 'plain';
  readonly sweat: number;
  readonly smile: number;
  readonly beat: number;
}

/** The pose frame 1 holds (and the lift ends on): belly up, the chest out of the water, the flippers open, the seal safe on top. */
export function hookWhale(t: number): WhaleState {
  return { cx: -150, cy: W - 80 + 7 * osc(t, 2), roll: -1, tilt: -0.2 + 0.006 * osc(t, 3, 1), spread: 1, pour: 0.5 };
}

const attachedSeal = (w: WhaleState, beat: number, mood: SealState['mood'], smile: number): SealState => {
  const a = onWhale(w, CHEST_LOCAL);
  const up = rot({ x: 0, y: -SEAL_UP }, w.tilt);
  return { x: a.x + up.x, y: a.y + up.y, rot: 0.1 + 0.5 * w.tilt, mood, sweat: 0, smile, beat };
};

export function hookSeal(t: number): SealState {
  return attachedSeal(hookWhale(t), (2 * Math.PI * 6 * t) / LOOP_S, 'plain', 1);
}

export function saveWhale(t: number): WhaleState {
  const landed = ramp(t, SAVE_FROM, LANDED_AT);
  const cx = t < LANDED_AT ? lerp(-900, LAND_CX, landed) : lerp(LAND_CX, -150, ramp(t, IT_AT, IT_AT + 1.6));
  const cy = keyed(t, [
    [SAVE_FROM, W + 900], [ROLLED_AT, W + 650], [OVER_AT + 0.4, W + 430], [LANDED_AT, W + CH + 12], [CHEST_AT, W + CH - 4], [IT_AT, W + CH - 4], [WATER_AT - 0.1, W - 80],
  ]);
  const roll = Math.cos(Math.PI * ramp(t, ROLLED_AT - 0.2, OVER_AT + 0.3));
  const settled = ramp(t, WATER_AT - 1.2, WATER_AT);
  return {
    cx,
    cy: cy + 7 * osc(t, 2) * settled,
    roll,
    tilt: -0.2 * ramp(t, IT_AT, WATER_AT - 0.2),
    spread: ramp(t, ARCHED_AT + 0.05, UP_AT + 0.5),
    pour: ramp(t, ARCHED_AT, UP_AT + 0.3) * 0.9,
  };
}

/** The seal in the save scene: floating nervously, then hopping onto the chest as the whale rolls under it. */
export function saveSeal(t: number): SealState {
  const w = saveWhale(t);
  const floatX = lerp(900, 700, ramp(t, SAVE_FROM, SAVE_FROM + 1.5));
  const floating: SealState = {
    x: floatX, y: W - 46 + 5 * Math.sin(t * 5), rot: 0.12 * Math.sin(t * 6.5), mood: 'nervous', sweat: 0.8, smile: 0, beat: t * 6,
  };
  if (t < LANDED_AT) return floating;
  const u = ramp(t, LANDED_AT, LANDED_AT + 0.4);
  const on = attachedSeal(w, t * 2, u > 0.6 ? 'plain' : 'nervous', ramp(t, CHEST_AT, CHEST_AT + 0.5));
  const hop = 80 * Math.sin(Math.PI * u) + 18 * Math.abs(Math.sin((t - CHEST_AT) * 12)) * decay(t, CHEST_AT, 0.45);
  return {
    x: lerp(floating.x, on.x, u), y: lerp(floating.y, on.y, u) - hop, rot: lerp(floating.rot, on.rot, u),
    mood: on.mood, sweat: lerp(0.8, 0, u), smile: on.smile, beat: lerp(floating.beat, on.beat, u),
  };
}

// ---------------------------------------------------------------- orca fins

export interface Fin {
  readonly x: number;
  /** Below the waterline, px. */
  readonly y: number;
  readonly h: number;
  /** -1 leaning back to the left .. 1 to the right (the way it is going). */
  readonly lean: number;
}

/** The fins circling the humpback (frame 1 and the lift), round and round a whole number of times a loop. */
export function circlingFins(t: number): readonly Fin[] {
  const mk = (x0: number, amp: number, n: number, ph: number, y: number, h: number): Fin => ({
    x: x0 + amp * osc(t, n, ph), y: y + 7 * osc(t, n * 2, ph), h, lean: Math.cos((2 * Math.PI * n * t) / LOOP_S + ph),
  });
  return [mk(990, 40, 3, 0.4, 40, 230), mk(110, 70, 3, 2.9, 34, 180), mk(560, 110, 2, 1.6, 120, 160)];
}

// ---------------------------------------------------------------- the floe and the wave

/** The waterline of the floe and wave scenes. */
export const WF = 1040;
export const FLOE_X = 580;
export const FLOE_HALF = 400;
export const FLOE_TOP = 80;
export const FLOE_SEAL_LEN = 450;

/** Three fins closing in on the floe, from both sides. */
export function approachFins(t: number): readonly Fin[] {
  const u = ramp(t, FLOE_FROM, WAVE_FROM);
  return [
    { x: lerp(1230, 960, u), y: 34, h: lerp(170, 240, u), lean: -1 },
    { x: lerp(-40, 150, u), y: 30, h: lerp(150, 215, u), lean: 1 },
    { x: lerp(-330, -10, u), y: 60, h: lerp(110, 170, u), lean: 1 },
  ];
}

export const WAVE_PUSH_FROM = WAVE_FROM + 0.3;
export const WAVE_HIT = 6.55;
export const SLIDE_FROM = 6.62;
export const SLIDE_TO = 7.0;

/** The crest the three orcas push: a bump in the waterline, moving right. */
export function crestX(t: number): number {
  return lerp(180, 760, ramp(t, WAVE_PUSH_FROM, WAVE_HIT + 0.3));
}
export const crestAmp = (t: number): number => 78 * ramp(t, WAVE_PUSH_FROM, WAVE_PUSH_FROM + 0.8) * (1 - 0.55 * ramp(t, WAVE_HIT + 0.5, SAVE_FROM));

/** The waterline in the wave scene at x. */
export const waterAt = (x: number, t: number): number => {
  const c = crestX(t);
  const bump = crestAmp(t) * Math.exp(-(((x - c) / 150) ** 2));
  return WF + 6 * Math.sin(x / 80 - (2 * Math.PI * 3 * t) / LOOP_S) + 3.5 * Math.sin(x / 33 + (2 * Math.PI * 2 * t) / LOOP_S) - bump;
};

export interface Orca { readonly x: number; readonly y: number; readonly len: number }
/** The three orcas abreast, nearest last. */
export function waveOrcas(t: number): readonly Orca[] {
  const drift = 210 * ramp(t, WAVE_FROM, SAVE_FROM);
  return [
    { x: 150 + drift, y: WF + 46, len: 540 },
    { x: 215 + drift, y: WF + 108, len: 620 },
    { x: 285 + drift, y: WF + 176, len: 700 },
  ];
}

/** How far the floe is tipped (radians, right side down). */
export const floeTilt = (t: number): number => 0.44 * ramp(t, WAVE_HIT, SLIDE_TO + 0.1) * (1 - 0.35 * ramp(t, SLIDE_TO + 0.2, SAVE_FROM));
/** The floe's pivot: it rides up on the crest. */
export const floePivotY = (t: number): number => waterAt(FLOE_X, t) - 12;

function sealOnFloe(t: number): SealState {
  const s = ramp(t, SLIDE_FROM, SLIDE_TO);
  const sx = lerp(0, FLOE_HALF - 90, s * s);
  const a = floeTilt(t);
  const p = rot({ x: sx, y: -(FLOE_TOP + 46) }, a);
  const shake = 1 - ramp(t, WAVE_HIT, SLIDE_FROM);
  return {
    x: FLOE_X + p.x, y: floePivotY(t) + p.y, rot: a + 0.06 * Math.sin(t * 9) * shake, mood: 'nervous', sweat: 0.9, smile: 0, beat: t * 6,
  };
}

/** The seal in the wave scene: on the floe, sliding off as it tips, then falling into the sea. */
export function waveSeal(t: number): SealState {
  const leave = SLIDE_TO;
  if (t < leave) return sealOnFloe(t);
  const at = sealOnFloe(leave);
  const before = sealOnFloe(leave - 1 / 60);
  const vx = (at.x - before.x) * 60;
  const vy = (at.y - before.y) * 60;
  const dt = t - leave;
  const y = at.y + vy * dt + 0.5 * 1800 * dt * dt;
  const water = waterAt(at.x + vx * dt, t) - 36;
  return { ...at, x: at.x + vx * dt, y: Math.min(y, water), rot: at.rot + 0.5 * Math.min(1, dt * 2), beat: t * 6 };
}

/** When the seal reaches the water (a splash). */
export const SPLASH_T = (() => {
  for (let t = SLIDE_TO; t < SLIDE_TO + 1; t += 0.005) {
    const at = sealOnFloe(SLIDE_TO);
    const dt = t - SLIDE_TO;
    const before = sealOnFloe(SLIDE_TO - 1 / 60);
    const y = at.y + (at.y - before.y) * 60 * dt + 900 * dt * dt;
    if (y >= waterAt(at.x, t) - 36) return t;
  }
  return SLIDE_TO + 0.4;
})();
