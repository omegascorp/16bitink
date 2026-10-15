import type { SfxId } from '../../../src/audio/recipes';
import { NOSE } from '../chain';
import { curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { facingAt, fishAt, seamTime, type View, type WorldFish } from '../gameplay/fish';
import { floatLife } from '../gameplay/hud';
import { slideLoopPath, type PathKey, type PathPoint } from './loopPath';

export type { View, WorldFish };

/**
 * "Throws smoke bomb": the inkling's ink, played as a gameplay highlight.
 * In the game (chapter 1, from level 3) you press E or tap "ink": a cloud
 * billows out round you and every hunter inside it loses you for 3.5 s
 * ("Lost you!"). The pike is the tide pool's big hunter (from level 7).
 *
 *   0     the pike is on you, jaws wide: snap! Missed by a whisker. You dash.
 *   0.3-1.9  you glide, it closes in again, jaws opening
 *   2.05  snap! You jink up and its jaws close on water; it corrects course
 *   2.2-4.2  you dash ahead; it gains on you, jaws opening on the last approach
 *   4.2   the jaws are at your tail: INK. "Lost you!"; you dive inside it
 *   4.45  the pike bites the cloud: nothing. It bursts out the far side
 *   5.55  "?": it looks about, while you sit smugly just behind its tail
 *   8.0   it turns to look back; you zip under its belly to its tail again
 *   10.4  it turns round, and there you are: "!"
 *   10.9  you bolt, it charges, which is where the loop began.
 *
 * Positions are world px. The scene travels SHIFT px to the right each loop
 * and the camera with it (two tiles of the current marks, so they line up
 * too): at the loop's end everything is where it began, SHIFT further on.
 */
export const LOOP_S = 12;
export const SHIFT = 3000;

export const INKLING_LEN = 210;
export const PIKE_LEN = 470;

/** The pike's first snap, which misses. */
export const SNAP_AT = 0.3;
/** Its second snap: you jink up and it bites water. */
export const SNAP2_AT = 2.05;
/** You squirt the ink (the game's ability, on the ink button). */
export const INK_AT = 4.2;
/** The pike bites the middle of the cloud, where you were. */
export const CHOMP_AT = 4.45;
/** It turns to look behind it, and turns back. */
export const TURN_AWAY = 8.0;
export const TURN_BACK = 10.4;
/** It sees you: "!". */
export const SPOT_AT = 10.62;
/** The ink button's ring is full again (the game's 10 s cooldown, shortened to fit the loop). */
export const READY_AT = 11.2;
/** The pike's chase hands over to its own path here, and back. */
const CHASE_TO = INK_AT;
const CHASE_FROM = 11.0;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);

const tailGap = INKLING_LEN / 2;
const mouthReach = NOSE * PIKE_LEN;

/** A path read at any time, wrapping round the loop (shifted by SHIFT each time round). */
function wrapped(path: (t: number) => PathPoint): (t: number) => PathPoint {
  return (t) => {
    const loops = Math.floor(t / LOOP_S);
    const p = path(t - loops * LOOP_S);
    return { ...p, x: p.x + loops * SHIFT };
  };
}

// ---------------------------------------------------------------- the pike's spot

/** Where you squirt the ink: the pike bites here. */
const INK_X = 2200;

/** Where the pike sits after bursting out of the cloud, looking about. */
const PIKE_STOP = { x: 2700, y: 6 } as const;
/** Your hiding places, just behind its tail: on its left while it faces right, then on its right. */
const HIDE_LEFT = { x: PIKE_STOP.x - PIKE_LEN / 2 - INKLING_LEN / 2 - 25, y: PIKE_STOP.y + 14 } as const;
const HIDE_RIGHT = { x: PIKE_STOP.x + PIKE_LEN / 2 + INKLING_LEN / 2 + 25, y: PIKE_STOP.y + 12 } as const;

// ---------------------------------------------------------------- you

const INKLING_KEYS: readonly PathKey[] = [
  { t: 0, x: 600, y: 0 },
  // A dash away from the first snap, then a glide while it closes in.
  { t: 0.5, x: 900, y: -50 },
  { t: 1.0, x: 1040, y: -10 },
  { t: 1.5, x: 1160, y: 50 },
  { t: 1.9, x: 1260, y: 65 },
  // The jink: straight up out of its jaws, and away.
  { t: 2.2, x: 1390, y: -120 },
  { t: 2.6, x: 1650, y: -160 },
  { t: 3.1, x: 1840, y: -90 },
  { t: 3.65, x: 2020, y: -20 },
  { t: INK_AT, x: INK_X, y: 0 },
  // Down and out of its line, inside the ink, then up behind its tail.
  { t: 4.55, x: 2235, y: 105 },
  { t: 5.3, x: 2260, y: 125 },
  { t: 6.4, ...HIDE_LEFT, vx: 0, vy: 0 },
  { t: TURN_AWAY - 0.45, ...HIDE_LEFT, vx: 0, vy: 0 },
  // Zip under its belly as it turns: down, along, up.
  { t: TURN_AWAY - 0.2, x: HIDE_LEFT.x + 90, y: 150 },
  { t: TURN_AWAY + 0.05, x: PIKE_STOP.x + 20, y: 175 },
  { t: TURN_AWAY + 0.28, x: HIDE_RIGHT.x - 90, y: 150 },
  { t: TURN_AWAY + 0.55, ...HIDE_RIGHT, vx: 0, vy: 0 },
  { t: TURN_BACK, x: HIDE_RIGHT.x - 10, y: HIDE_RIGHT.y + 4, vx: 0, vy: 0 },
  { t: 10.85, x: HIDE_RIGHT.x - 5, y: HIDE_RIGHT.y - 6, vx: 0, vy: 0 },
  { t: 11.4, x: 3330, y: 0 },
];
const inklingPath = wrapped(slideLoopPath(INKLING_KEYS, LOOP_S, SHIFT));

/** You squirting: a jolt that stretches you out and back. 0 .. 1. */
export function squirt(t: number): number {
  const s = t - INK_AT;
  return s > 0 && s < 0.35 ? Math.sin((Math.PI * s) / 0.35) : 0;
}

export function inklingFish(t: number): WorldFish {
  return fishAt('inkling', inklingPath(t), INKLING_LEN, 1, 3, t);
}

/** Your eyes: squeezed as you squirt, smugly shut while you hide behind its tail. */
export function inklingEyes(t: number): 'squeeze' | 'happy' | null {
  if (t >= INK_AT - 0.04 && t < INK_AT + 0.25) return 'squeeze';
  if (t >= 6.6 && t < TURN_AWAY - 0.45) return 'happy';
  if (t >= TURN_AWAY + 0.65 && t < SPOT_AT) return 'happy';
  return null;
}

/** Your mouth: a gasp when it sees you. */
export function inklingJaw(t: number): number {
  const s = t - SPOT_AT;
  return s > 0 && s < 0.7 ? 0.65 * Math.sin((Math.PI * s) / 0.7) : 0;
}

// ---------------------------------------------------------------- the pike

/** How far the pike's mouth is behind your tail while it chases you (world px), by seam time. */
const GAP: readonly Key[] = [
  { t: -1.6, at: 70 },
  { t: CHASE_FROM - LOOP_S, at: 110 },
  { t: -0.45, at: 95 },
  { t: 0, at: 18 },
  { t: SNAP_AT, at: 30 },
  { t: 0.85, at: 150 },
  { t: 1.5, at: 60 },
  { t: SNAP2_AT, at: 0 },
  { t: 2.5, at: 70 },
  { t: 3.0, at: 165 },
  { t: 3.6, at: 90 },
  { t: INK_AT, at: 12, rate: -40 },
  { t: 5.5, at: 0 },
];
const gapAt = (t: number): number => curveAt(GAP, seam(t)).at;

/** While it chases, the pike rides your wake: its mouth just behind your tail, following your weave a beat late. */
function pikeChasing(t: number): { readonly x: number; readonly y: number } {
  const you = inklingPath(t);
  return { x: you.x - tailGap - gapAt(t) - mouthReach, y: inklingPath(t - 0.38).y + 18 };
}

function chaseKey(t: number): readonly [Key, Key] {
  const a = pikeChasing(t);
  const b = pikeChasing(t + 1e-3);
  return [{ t, at: a.x, rate: (b.x - a.x) / 1e-3 }, { t, at: a.y, rate: (b.y - a.y) / 1e-3 }];
}

/** Through the cloud and out the far side, then still, looking about. */
const PIKE_OWN: readonly (readonly [number, number, number])[] = [
  [CHOMP_AT, INK_X - mouthReach + 10, 4],
  [5.0, 2330, 0],
  [5.75, 2610, 2],
  [6.6, PIKE_STOP.x, PIKE_STOP.y],
  [TURN_AWAY, PIKE_STOP.x + 15, PIKE_STOP.y + 2],
  [TURN_BACK, PIKE_STOP.x - 10, PIKE_STOP.y + 4],
];

const PIKE_X: readonly Key[] = [chaseKey(CHASE_TO)[0], ...PIKE_OWN.map(([t, x], i) => ({ t, at: x, ...(i >= 3 ? { rate: 0 } : {}) })), chaseKey(CHASE_FROM)[0]];
const PIKE_Y: readonly Key[] = [chaseKey(CHASE_TO)[1], ...PIKE_OWN.map(([t, , y], i) => ({ t, at: y, ...(i >= 3 ? { rate: 0 } : {}) })), chaseKey(CHASE_FROM)[1]];

const chasing = (t: number): boolean => t < CHASE_TO || t >= CHASE_FROM;

function pikePoint(t: number): PathPoint {
  if (chasing(t)) {
    const a = pikeChasing(t);
    const b = pikeChasing(t + 1e-3);
    return { ...a, vx: (b.x - a.x) / 1e-3, vy: (b.y - a.y) / 1e-3 };
  }
  const x = curveAt(PIKE_X, t);
  const y = curveAt(PIKE_Y, t);
  return { x: x.at, y: y.at, vx: x.rate, vy: y.rate };
}
const pikePath = wrapped(pikePoint);

const PIKE_TURNS = [[0, 1], [TURN_AWAY, -1], [TURN_BACK, 1]] as const;

/** Nose up, nose down: the pike looking about for you. */
function lookAbout(t: number): number {
  const first = window01(t, 5.7, 7.6, 0.35) * 0.16 * Math.sin(2 * Math.PI * 0.9 * (t - 5.7));
  const second = window01(t, TURN_AWAY + 0.3, TURN_BACK - 0.1, 0.35) * 0.16 * Math.sin(2 * Math.PI * 0.8 * (t - TURN_AWAY));
  return first + second;
}

export function pikeFish(t: number): WorldFish {
  const f = fishAt('pike', pikePath(t), PIKE_LEN, facingAt(PIKE_TURNS, ((t % LOOP_S) + LOOP_S) % LOOP_S), 2, t);
  return { ...f, tilt: f.tilt + lookAbout(t) };
}

/** Turning round: 0 .. 1 over a turn, the fish squashed edge-on at 0.5 (where its facing flips). */
export function turnSquash(t: number): number {
  for (const at of [TURN_AWAY, TURN_BACK]) {
    const s = (t - at) / 0.26 + 0.5;
    if (s > 0 && s < 1) return Math.max(0.14, Math.abs(Math.cos(Math.PI * s)));
  }
  return 1;
}

/** How far the pike's jaw hangs open: wide across the seam, snapped shut on the miss; wide again for the last lunge, shut on the cloud; slack while it wonders. */
export function pikeJaw(t: number): number {
  const s = seam(t);
  if (s > -0.9 && s <= SNAP_AT) {
    if (s < -0.4) return ramp(s, -0.9, -0.4);
    return s < SNAP_AT - 0.05 ? 1 : 1 - ramp(s, SNAP_AT - 0.05, SNAP_AT);
  }
  if (t > 1.35 && t < SNAP2_AT) return t < SNAP2_AT - 0.06 ? ramp(t, 1.35, 1.8) : 1 - ramp(t, SNAP2_AT - 0.06, SNAP2_AT);
  if (t > 3.3 && t < CHOMP_AT) return t < CHOMP_AT - 0.06 ? ramp(t, 3.3, 4.0) : 1 - ramp(t, CHOMP_AT - 0.06, CHOMP_AT);
  return 0.22 * window01(t, 5.5, TURN_AWAY - 0.2, 0.3);
}

// ---------------------------------------------------------------- the ink

/** Where the ink was squirted (world px): round you, as in the game. */
export const CLOUD_AT = (() => {
  const p = inklingPath(INK_AT);
  return { x: p.x, y: p.y };
})();

/** Seconds since the squirt (negative before it). */
export const cloudSince = (t: number): number => t - INK_AT;

/** The game's "Lost you!" over you as the hunter loses you: risen and visible, or null. */
export const lostYou = (t: number): { readonly rise: number; readonly alpha: number } | null => floatLife(t - INK_AT - 0.05, 1.2);

// ---------------------------------------------------------------- the camera

/** Screen px per world px. */
const ZOOM = 1.15;

/** The middle of the two of you, nose to tail, so both stay in the frame (and the cloud, while it hangs). */
function cameraTarget(t: number): { readonly x: number; readonly y: number } {
  const you = inklingPath(t);
  const pike = pikePath(t);
  const fishLeft = Math.min(you.x - INKLING_LEN / 2, pike.x - PIKE_LEN / 2);
  // While the ink hangs, keep most of the cloud in the shot too.
  const left = lerp(fishLeft, Math.min(fishLeft, INK_X - 200), window01(t, INK_AT - 0.3, 7.0, 0.6));
  const right = Math.max(you.x + INKLING_LEN / 2, pike.x + PIKE_LEN / 2);
  return { x: (left + right) / 2, y: 0.5 * (you.y + pike.y) };
}

/** How far either side the camera looks to smooth its path, s: wide in the chase, so it lags your dashes and the fish move about the frame. */
const smoothing = (t: number): number => 0.48 + 1.0 * window01(t, 0.15, INK_AT - 0.25, 0.6);

export function viewAt(t: number): View {
  let x = 0;
  let y = 0;
  const n = 13;
  const h = smoothing(t);
  for (let k = 0; k < n; k++) {
    const w = cameraTarget(t + ((k - (n - 1) / 2) / ((n - 1) / 2)) * h);
    x += w.x / n;
    y += w.y / n;
  }
  return { x, y, zoom: ZOOM };
}

/** Camera shake, px. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  const jolts = [{ at: SNAP_AT, amp: 9 }, { at: SNAP2_AT, amp: 10 }, { at: INK_AT, amp: 6 }, { at: CHOMP_AT, amp: 14 }];
  let x = 0;
  let y = 0;
  for (const j of jolts) {
    const s = t - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

// ---------------------------------------------------------------- "!", "?", the ink button

/** An inked mark popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? smooth(since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - ((since - 0.12) / 0.06));
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

const YOU_SPOT = SPOT_AT + 0.12;
/** Your "!" when it turns round on you, staying up as the loop comes round. */
export const inklingAlarm = (t: number): number => pop(seam(t) + (LOOP_S - YOU_SPOT), LOOP_S - YOU_SPOT + 0.55);
/** The pike's "!" when it sees you. */
export const pikeAlarm = (t: number): number => pop(t - SPOT_AT, 0.75);
/** The pike's "?": once out of the cloud, again when it looks behind. */
export const pikePuzzled = (t: number): number => Math.max(pop(t - 5.55, 2.1), pop(t - TURN_AWAY - 0.25, TURN_BACK - TURN_AWAY - 0.35));

export interface InkButton {
  /** 0 .. 1 recharged (1 ready). */
  readonly ready: number;
  /** How much it is pushed in by the tap, 0 .. 1. */
  readonly press: number;
  /** The tap's ripple, 0 .. 1 over its life, or null. */
  readonly ripple: number | null;
  /** A little pulse as it comes ready again, 0 .. 1. */
  readonly pulse: number;
}

/** The game's ink button: tapped as you squirt, faded while its ring fills back up. */
export function inkButton(t: number): InkButton {
  const s = t - INK_AT + 0.08;
  const r = t - READY_AT;
  return {
    ready: t < INK_AT || t >= READY_AT ? 1 : (t - INK_AT) / (READY_AT - INK_AT),
    press: s > 0 && s < 0.25 ? Math.sin((Math.PI * s) / 0.25) : 0,
    ripple: s > 0 && s < 0.5 ? s / 0.5 : null,
    pulse: r > 0 && r < 0.3 ? Math.sin((Math.PI * r) / 0.3) : 0,
  };
}

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] seconds, fading at both ends; may run past the loop's ends, wrapping round. */
  readonly from: number;
  readonly to: number;
}

const CONFUSED = { from: 7.75, to: 10.35 };
export const CAPTIONS: readonly Caption[] = [
  { text: 'the pike thought he had me…', y: 380, size: 100, from: -1.0, to: 3.2 },
  { text: '*throws smoke bomb*', y: 380, size: 120, from: INK_AT + 0.02, to: 7.5 },
  { text: 'pike.exe', y: 350, size: 104, ...CONFUSED },
  { text: 'has stopped working', y: 455, size: 104, ...CONFUSED },
];

const CAPTION_FADE = 0.2;

/** How visible a caption is at time t, 0 .. 1, counting its copies a loop before and after (so it can span the seam). */
export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, CAPTION_FADE)));
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  // The miss: jaws clack shut behind you, and you're off.
  { id: 'eat', t: SNAP_AT, pitch: 0.45, gain: 0.7, pan: -0.1 },
  { id: 'clang', t: SNAP_AT, pitch: 0.5, gain: 0.12, pan: -0.1 },
  { id: 'dash', t: SNAP_AT + 0.03, pitch: 1.1, gain: 0.45, pan: 0.1 },
  // The chase: it surges, snaps again, and bites water as you jink up.
  { id: 'lunge', t: 1.45, pitch: 0.7, gain: 0.55, pan: -0.2 },
  { id: 'dash', t: 1.92, pitch: 1.2, gain: 0.45, pan: 0.1 },
  { id: 'eat', t: SNAP2_AT, pitch: 0.42, gain: 0.75, pan: -0.1 },
  { id: 'clang', t: SNAP2_AT, pitch: 0.5, gain: 0.12, pan: -0.1 },
  { id: 'dash', t: 2.3, pitch: 1.05, gain: 0.4, pan: 0.1 },
  { id: 'lunge', t: 3.3, pitch: 0.75, gain: 0.7, pan: -0.2 },
  // Ink: the game's own sound for it (a splash at 0.6), and the hunter losing you.
  { id: 'click', t: INK_AT - 0.08, pitch: 1, gain: 0.4, pan: 0 },
  { id: 'splash', t: INK_AT, pitch: 0.6, gain: 0.9, pan: 0 },
  { id: 'splash', t: INK_AT + 0.02, pitch: 0.4, gain: 0.5, pan: 0 },
  { id: 'dash', t: INK_AT + 0.08, pitch: 1.2, gain: 0.3, pan: 0.1 },
  // It bites the ink: a clack on nothing.
  { id: 'eat', t: CHOMP_AT, pitch: 0.4, gain: 0.8, pan: 0 },
  { id: 'clang', t: CHOMP_AT, pitch: 0.45, gain: 0.15, pan: 0 },
  { id: 'yuck', t: 5.55, pitch: 0.7, gain: 0.35, pan: 0.2 },
  // It looks behind; you zip under it.
  { id: 'rustle', t: TURN_AWAY - 0.1, pitch: 0.8, gain: 0.4, pan: 0.2 },
  { id: 'dash', t: TURN_AWAY - 0.25, pitch: 1.4, gain: 0.3, pan: 0.2 },
  { id: 'yuck', t: TURN_AWAY + 0.25, pitch: 0.6, gain: 0.3, pan: -0.2 },
  // It turns round: there you are.
  { id: 'rustle', t: TURN_BACK - 0.1, pitch: 0.9, gain: 0.4, pan: 0 },
  { id: 'spotted', t: SPOT_AT, pitch: 1.2, gain: 0.55, pan: 0 },
  { id: 'dash', t: 10.95, pitch: 1.1, gain: 0.45, pan: 0.2 },
  { id: 'lunge', t: CHASE_FROM + 0.1, pitch: 0.6, gain: 0.9, pan: -0.1 },
];
