import { clamp01, curveAt, type Key, lerp, ramp, smooth } from '../short';

/**
 * "This crab hid from an osprey": the game's real hunt, once round. A crab
 * about to eat (a crust of bread, the game's crumb); an osprey hovers, its
 * red shadow tightening on the sand, then stoops. The crab pulls into its
 * shell, the talons strike it ("tok! safe in the shell"), the osprey flies
 * off, and the crab comes out still holding its snack. The osprey that
 * returns at the end is the one already diving in frame 1.
 *
 * Everything runs on the story clock `tau` (seconds since the osprey
 * flew in), so the loop seam is simply tau = 12 -> 0.
 */
export const LOOP_S = 12;
/** Loop time at which the story clock starts: the osprey flies in. */
export const T0 = 5.4;

/** Story clock for loop time t. */
export const tauOf = (t: number): number => (((t - T0) % LOOP_S) + LOOP_S) % LOOP_S;
/** Loop time of a story-clock moment. */
export const loopOf = (tau: number): number => (((tau + T0) % LOOP_S) + LOOP_S) % LOOP_S;

export const AT = {
  flyIn: 0,
  hover: 1.3,
  shadow: 1.7,
  fold: 5.8,
  dive: 6.15,
  alarm: 6.75,
  hide: 7.0,
  hidden: 7.3,
  hit: 7.5,
  gone: 9.2,
  out: 9.0,
  smug: 9.5,
} as const;

export const GROUND_Y = 1150;
export const CRAB = { x: 360, scale: 3.7 } as const;
export const OSPREY_SCALE = 8.5;
/** Where the stoop is aimed on the sand, and the shell's top where the talons land. */
export const AIM_X = CRAB.x + 6;
export const STRIKE = { x: 393, y: 862 } as const;

export interface Vec {
  readonly x: number;
  readonly y: number;
}

const track = (keys: readonly Key[], tau: number): number => curveAt(keys, tau).at;

/** Osprey centre (the sprite's middle, not its ground point), on screen. */
const OSPREY_X: readonly Key[] = [
  { t: 0, at: 1500 }, { t: 1.4, at: 700, rate: 0 }, { t: 5.8, at: 680, rate: -10 }, { t: 6.9, at: 545, rate: -90 },
  { t: 7.5, at: 486, rate: -30 },
  { t: 7.85, at: 570, rate: 150 }, { t: 8.5, at: 330 }, { t: 9.4, at: -50 }, { t: 10.2, at: -500 },
];
const OSPREY_Y: readonly Key[] = [
  { t: 0, at: 60 }, { t: 1.4, at: 250, rate: 0 }, { t: 5.8, at: 240, rate: 10 }, { t: 6.9, at: 305, rate: 190 },
  { t: 7.5, at: 534, rate: 600 },
  { t: 7.85, at: 450, rate: -300 }, { t: 8.5, at: 280, rate: -300 }, { t: 9.4, at: 130 }, { t: 10.2, at: -150 },
];

/** The dive sprite is turned a little more level, so the long bird fits above the crab. */
export const DIVE_TURN = 0.2;

export interface OspreyPose {
  readonly x: number;
  readonly y: number;
  /** 0 hovering pose .. 1 diving pose. */
  readonly dive: number;
  /** Radians, about the sprite's middle. */
  readonly tilt: number;
  readonly visible: boolean;
}

export function ospreyAt(tau: number): OspreyPose {
  const sway = tau > 1.4 && tau < AT.fold ? Math.sin(tau * 2.3) * 16 : 0;
  const bob = tau > 1.4 && tau < AT.fold ? Math.sin(tau * 3.4) * 11 : 0;
  const dive = tau < AT.fold ? 0 : tau < AT.hit + 0.04 ? ramp(tau, AT.fold, AT.dive) : 1 - ramp(tau, AT.hit + 0.1, AT.hit + 0.3);
  const x = track(OSPREY_X, tau) + sway;
  const y = track(OSPREY_Y, tau) + bob;
  // Flying away it banks: head up, then level.
  const bank = tau > AT.hit + 0.1 ? -0.4 * (1 - ramp(tau, AT.hit + 0.2, AT.hit + 1.3)) : 0;
  const tilt = bank + DIVE_TURN * dive;
  return { x, y, dive, tilt, visible: tau < 10.2 };
}

/** The red warning on the sand: how big, how settled (1 = locked on), how bright. */
export function shadowAt(tau: number): { readonly rx: number; readonly settle: number; readonly alpha: number } {
  const settle = tau >= AT.hit - 0.5 ? 1 : clamp01((tau - AT.shadow) / (AT.fold - AT.shadow + 0.2));
  const rx = lerp(350, 215, smooth(settle));
  const alpha = Math.min(ramp(tau, AT.shadow, AT.shadow + 0.4), 1 - ramp(tau, AT.hit + 0.05, AT.hit + 0.35));
  return { rx, settle, alpha };
}

/** How far the crab is pulled into its shell: 0 out, 1 in (a little past 0 as it pops back out). */
export function hiddenAt(tau: number): number {
  const keys: readonly Key[] = [
    { t: AT.hide - 0.001, at: 0, rate: 0 }, { t: AT.hide + 0.02, at: 0, rate: 0 }, { t: AT.hidden, at: 1, rate: 0 },
    { t: AT.out, at: 1, rate: 0 }, { t: AT.out + 0.28, at: -0.18, rate: 0 }, { t: AT.out + 0.55, at: 0, rate: 0 },
  ];
  return tau < AT.hide ? 0 : tau > AT.out + 0.55 ? 0 : curveAt(keys, tau).at;
}

/** The shell's rattle after the strike: a turn about its base, decaying. */
export function rattleAt(tau: number): number {
  const s = tau - AT.hit;
  return s < 0 || s > 1.2 ? 0 : 0.13 * Math.sin(s * 38) * Math.exp(-s * 5);
}

/** The crab's hops when it's pleased (px up), and a gentle bob otherwise. */
export function hopAt(tau: number): number {
  const hop = (from: number, h: number): number => {
    const u = (tau - from) / 0.32;
    return u < 0 || u > 1 ? 0 : h * 4 * u * (1 - u);
  };
  const idle = tau < AT.alarm || tau > AT.smug + 1.4 ? Math.sin(tau * 3.1) * 2 : 0;
  return idle + hop(AT.smug, 34) + hop(AT.smug + 0.45, 26);
}

/** "!" over the crab as it spots the shadow's owner. */
export function alarmAt(tau: number): number {
  return Math.min(ramp(tau, AT.alarm, AT.alarm + 0.08), 1 - ramp(tau, AT.hit + 0.15, AT.hit + 0.4));
}

/** A burst where the talons strike, 0 .. 1 over its life (-1 outside it). */
export function strikeAt(tau: number): number {
  const u = (tau - AT.hit) / 0.5;
  return u < 0 || u > 1 ? -1 : u;
}

export interface Caption {
  readonly text: string;
  readonly alpha: number;
  readonly size: number;
}

export const CAPTION_Y = 1245;
const CAPTIONS: readonly { text: string; from: number; to: number; size: number }[] = [
  { text: 'lunch?', from: 1.0, to: 7.45, size: 120 },
  { text: 'NOPE', from: 7.6, to: 9.3, size: 150 },
  { text: 'still mine', from: 9.4, to: 11.75, size: 120 },
];

/** The caption on screen at story time `tau`, if any. */
export function captionAt(tau: number): Caption | null {
  for (const c of CAPTIONS) {
    const alpha = Math.min(ramp(tau, c.from, c.from + 0.18), 1 - ramp(tau, c.to - 0.18, c.to));
    if (alpha > 0) return { text: c.text, alpha, size: c.size };
  }
  return null;
}

/** Sound cues in story time. */
export const CUES = {
  whoosh: AT.fold - 0.1,
  alarm: AT.alarm,
  hide: AT.hide + 0.03,
  tok: AT.hit,
  out: AT.out + 0.1,
  smug: AT.smug + 0.12,
} as const;
