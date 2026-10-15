import { clamp01, ramp, window01 } from '../short';
import {
  AUCTION_AT, BIDDING_AT, BLUEFIN_AT, BUT_AT, EAT_SOUNDS, FIRST_TUNA_AT, FRACTION_AT, HEADLINES_AT, HED_AT, HUNDRED_AT, KEPT_AT, KILOS_AT, LOOP_S,
  LUCK_AT, MILLION_AT, ON_AT, PLANNED_AT, SEVENTY_AT, SLAM_AT, SO_AT, SOLD_AT, type SoundCue, SUSHI_AT, TWO_AT, WINTER_AT, YEAR_AT,
} from './story';

/**
 * The sketched notes over the tuna, each timed to the words: the scale, the
 * auction (paddles, the climbing yen, stamps and the gavel), the lucky cat,
 * the newspaper, the bidder, the planned-vs-paid bars and the winter morning.
 */

/** A pop: 0 → 1 with a little overshoot over `s` seconds from `at`. */
export const popIn = (t: number, at: number, s = 0.22): number => {
  const u = clamp01((t - at) / s);
  return u >= 1 ? 1 : u * (1 + 0.6 * Math.sin(Math.PI * u));
};
/** A bump: 0 → 1 → 0 over `s` seconds from `at`. */
export const bump = (t: number, at: number, s: number): number => Math.max(0, Math.sin(Math.PI * clamp01((t - at) / s)));

// ---------------------------------------------------------------- "One bluefin tuna, 278 kilos"

/** "Pacific bluefin tuna", under it, from "bluefin" until the auction. */
export const nameLabel = (t: number): number => window01(t, BLUEFIN_AT - 0.05, AUCTION_AT - 0.1, 0.25);

/** The scale, from "two" until the auction. */
export const scaleShown = (t: number): number => window01(t, TWO_AT - 0.3, AUCTION_AT, 0.25);

/** The needle, kg: up to 200 on "two hundred", on to 278 on "seventy-eight", with a wobble as it settles. */
export function needleKg(t: number): number {
  const first = 200 * ramp(t, TWO_AT, HUNDRED_AT + 0.25);
  const second = 78 * ramp(t, SEVENTY_AT - 0.05, SEVENTY_AT + 0.4);
  const settle = t > SEVENTY_AT + 0.4 ? 9 * Math.exp(-(t - SEVENTY_AT - 0.4) * 5) * Math.sin((t - SEVENTY_AT - 0.4) * 22) : 0;
  return first + second + settle;
}

/** The readout, built as it is said: "2", "200", "278", "278 kg". */
export function kgText(t: number): string {
  if (t < TWO_AT - 0.03) return '';
  if (t < HUNDRED_AT - 0.03) return '2';
  if (t < SEVENTY_AT - 0.03) return '200';
  return t < KILOS_AT - 0.03 ? '278' : '278 kg';
}

// ---------------------------------------------------------------- the auction

export interface Paddle {
  readonly at: number;
  readonly x: number;
  readonly number: number;
  /** The bid it raises the price to, yen. */
  readonly bid: number;
}

/** The last bid: ¥333.6 million. */
export const PRICE_YEN = 333_600_000;
const BIDS = [20, 50, 90, 130, 170, 210, 250, 280, 300, 320, 333.6].map((m) => Math.round(m * 1_000_000));
const PADDLE_XS = [190, 760, 420, 920, 300, 640, 120, 540, 860, 230, 700];
const PADDLE_NOS = [12, 7, 31, 4, 18, 26, 9, 15, 3, 22, 1];
const FIRST_BID_AT = AUCTION_AT - 0.05;
const LAST_BID_AT = SLAM_AT - 0.3;

/** Paddles popping up from "auction" on, faster and faster, each one a higher bid; the last just before the gavel. */
export const PADDLES: readonly Paddle[] = BIDS.map((bid, k) => {
  const f = k / (BIDS.length - 1);
  return { at: FIRST_BID_AT + (LAST_BID_AT - FIRST_BID_AT) * f ** 0.62, x: PADDLE_XS[k]!, number: PADDLE_NOS[k]!, bid };
});

/** How far paddle k is up, 0 .. 1: up with a jolt, held a moment, down again (all down after the gavel). */
export function paddleUp(k: number, t: number): number {
  const p = PADDLES[k]!;
  const down = Math.min(p.at + 0.75, SLAM_AT + 0.35);
  return Math.min(popIn(t, p.at, 0.14), 1 - ramp(t, down - 0.2, down));
}

/** The price on the board, yen: each bid rolls up from the last over 0.12 s. */
export function yenAt(t: number): number {
  let shown = 0;
  let prev = 0;
  for (const p of PADDLES) {
    if (t < p.at) break;
    shown = prev + (p.bid - prev) * clamp01((t - p.at) / 0.12);
    prev = p.bid;
  }
  return shown;
}

/** "¥333,600,000". */
export const yenText = (yen: number): string => `¥${Math.round(yen).toLocaleString('en-US')}`;

/** The price board: from "auction" until the lucky cat. */
export const boardShown = (t: number): number => window01(t, AUCTION_AT - 0.15, LUCK_AT - 0.05, 0.2);
/** "≈ $3.1 million", under it once the gavel has fallen. */
export const dollarsShown = (t: number): number => boardShown(t) * ramp(t, SLAM_AT + 0.25, SLAM_AT + 0.5);

/** The rubber stamps: "2019" on "2019", "TOKYO" with the gavel. */
export const yearStamp = (t: number): number => popIn(t, YEAR_AT - 0.02, 0.16) * (1 - ramp(t, LUCK_AT - 0.3, LUCK_AT));
export const tokyoStamp = (t: number): number => popIn(t, SLAM_AT, 0.16) * (1 - ramp(t, LUCK_AT - 0.3, LUCK_AT));

/** The gavel's swing, radians from its strike: raised (positive) as the bidding starts, cocked back, then down on "Tokyo". */
export function gavelAngle(t: number): number {
  if (t < SLAM_AT - 0.1) return 0.75 + 0.35 * ramp(t, SLAM_AT - 0.45, SLAM_AT - 0.1) + 0.06 * Math.sin(t * 9);
  if (t < SLAM_AT) return 1.16 * (1 - ((t - (SLAM_AT - 0.1)) / 0.1) ** 2);
  // A little rebound, then rest on the block.
  return 0.12 * bump(t, SLAM_AT, 0.18) + 0.5 * ramp(t, LUCK_AT - 0.6, LUCK_AT - 0.1);
}
export const gavelShown = (t: number): number => window01(t, AUCTION_AT - 0.1, LUCK_AT, 0.2);

/** The strike: ink lines burst from the block, 0 .. 1 over its life. */
export const strikeAt = (t: number): number => (t - SLAM_AT) / 0.35;

/** A jolt of the picture as the gavel lands, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = t - SLAM_AT;
  if (u < 0 || u > 0.32) return { x: 0, y: 0 };
  const fade = (1 - u / 0.32) ** 2;
  return { x: 14 * fade * Math.sin(u * 95), y: 10 * fade * Math.cos(u * 77) };
}

// ---------------------------------------------------------------- luck and headlines

/** The "1st" rosette pinned on it on "first tuna of the year". */
export const rosetteAt = (t: number): number => popIn(t, FIRST_TUNA_AT - 0.03) * (1 - ramp(t, SO_AT - 0.1, SO_AT + 0.2));
/** The lucky cat, waving, on "luck". */
export const catAt = (t: number): number => popIn(t, LUCK_AT - 0.08) * (1 - ramp(t, SUSHI_AT - 0.3, SUSHI_AT));
/** Its paw: up and down, three waves a second. */
export const pawAt = (t: number): number => 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 3);
/** The newspaper spinning in on "headlines": its spin (0 → 1) and how much shows. */
export const paperSpin = (t: number): number => ramp(t, HEADLINES_AT - 0.3, HEADLINES_AT + 0.2);
export const paperShown = (t: number): number => paperSpin(t) * (1 - ramp(t, SUSHI_AT - 0.35, SUSHI_AT));

// ---------------------------------------------------------------- the sushi boss

export const bidderShown = (t: number): number => popIn(t, SUSHI_AT - 0.1) * (1 - ramp(t, HED_AT - 0.15, HED_AT + 0.1));
/** His paddle, 0 down .. 1 up: up as the narrator says "sushi boss", then up again and again on "kept on bidding". */
export const BID_RAISES: readonly number[] = [SUSHI_AT + 0.15, KEPT_AT, ON_AT, BIDDING_AT + 0.05];
export const bidderPaddle = (t: number): number => Math.max(...BID_RAISES.map((at) => bump(t, at - 0.05, 0.36)));
const BID_CALLS = ['¥300M!', '¥320M!', '¥330M!', '¥333.6M!'];
/** His calls, one per raise: the text and how much shows. */
export const bidCalls = (t: number): readonly { readonly text: string; readonly shown: number; readonly k: number }[] =>
  BID_RAISES.map((at, k) => ({ text: BID_CALLS[k]!, k, shown: popIn(t, at, 0.16) * (1 - ramp(t, at + 0.3, at + 0.45)) })).filter((c) => c.shown > 0);

// ---------------------------------------------------------------- planned vs paid

/** ¥30–50 million planned; ¥333.6 million paid. */
export const PLANNED_YEN = 50_000_000;
export const barsShown = (t: number): number => window01(t, HED_AT - 0.1, BUT_AT + 0.2, 0.25);
/** The paid bar runs out full as the narrator starts; the planned one, a stub, on "planned". */
export const paidBar = (t: number): number => ramp(t, HED_AT - 0.1, HED_AT + 0.3);
export const plannedBar = (t: number): number => ramp(t, PLANNED_AT, PLANNED_AT + 0.35);
/** A ring round the stub on "fraction", 0 .. 1 over its life. */
export const fractionRing = (t: number): number => (t - FRACTION_AT + 0.05) / 0.9;

// ---------------------------------------------------------------- the winter morning

/** Snow and lanterns: in on "But on that winter…", on through the loop point, gone by "dollars". */
export const winterAt = (t: number): number => (t > LOOP_S / 2 ? ramp(t, BUT_AT - 0.1, WINTER_AT + 0.3) : 1 - ramp(t, MILLION_AT, SOLD_AT + 2.2));

// ---------------------------------------------------------------- sounds

/** Quiet under the voice: bright dings for the money, a wooden thunk for the gavel. */
export const SOUNDS: readonly SoundCue[] = [
  ...EAT_SOUNDS,
  { id: 'hurt', t: SOLD_AT, pitch: 1.5, gain: 0.22, pan: 0.3 },
  { id: 'clang', t: SOLD_AT + 0.02, pitch: 2.2, gain: 0.18, pan: 0.3 },
  { id: 'powerup', t: MILLION_AT, pitch: 1.0, gain: 0.16, pan: 0.3 },
  { id: 'click', t: BLUEFIN_AT, pitch: 1.0, gain: 0.3, pan: 0 },
  ...[TWO_AT, HUNDRED_AT, SEVENTY_AT].map((at, k): SoundCue => ({ id: 'click', t: at, pitch: 0.8 + 0.2 * k, gain: 0.3, pan: -0.4 })),
  { id: 'drop', t: KILOS_AT, pitch: 1.0, gain: 0.16, pan: -0.4 },
  ...PADDLES.map((p, k): SoundCue => ({ id: 'clang', t: p.at, pitch: 1.4 + 0.1 * k, gain: 0.13, pan: (p.x - 540) / 700 })),
  { id: 'hurt', t: YEAR_AT, pitch: 1.4, gain: 0.25, pan: -0.2 },
  { id: 'lunge', t: SLAM_AT - 0.12, pitch: 1.2, gain: 0.18, pan: -0.5 },
  { id: 'hurt', t: SLAM_AT, pitch: 0.7, gain: 0.32, pan: -0.5 },
  { id: 'clang', t: SLAM_AT, pitch: 1.0, gain: 0.14, pan: -0.3 },
  { id: 'powerup', t: SLAM_AT + 0.15, pitch: 1.2, gain: 0.15, pan: 0 },
  { id: 'drop', t: FIRST_TUNA_AT, pitch: 1.5, gain: 0.16, pan: -0.2 },
  { id: 'frenzy', t: LUCK_AT, pitch: 1.2, gain: 0.18, pan: -0.4 },
  { id: 'dash', t: HEADLINES_AT - 0.3, pitch: 1.2, gain: 0.1, pan: 0.4 },
  { id: 'rustle', t: HEADLINES_AT + 0.1, pitch: 1.0, gain: 0.2, pan: 0.4 },
  { id: 'free', t: SUSHI_AT - 0.1, pitch: 1.0, gain: 0.14, pan: -0.4 },
  ...BID_RAISES.slice(1).map((at, k): SoundCue => ({ id: 'clang', t: at, pitch: 2.0 + 0.2 * k, gain: 0.14, pan: -0.3 })),
  { id: 'grow', t: HED_AT, pitch: 1.0, gain: 0.16, pan: 0 },
  { id: 'drop', t: PLANNED_AT, pitch: 0.7, gain: 0.18, pan: -0.3 },
  { id: 'spotted', t: FRACTION_AT, pitch: 0.8, gain: 0.16, pan: -0.3 },
  { id: 'rustle', t: BUT_AT, pitch: 0.6, gain: 0.14, pan: 0 },
  { id: 'drop', t: WINTER_AT, pitch: 2.2, gain: 0.07, pan: 0.5 },
  { id: 'drop', t: WINTER_AT + 0.3, pitch: 2.5, gain: 0.06, pan: -0.5 },
];
