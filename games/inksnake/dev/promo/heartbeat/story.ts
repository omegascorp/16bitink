import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, window01 } from '../short';

/**
 * "This snake squeezes until the heart stops": a boa constrictor feels the
 * rat's heartbeat through its coils and tightens in bursts on each beat, no
 * voice, told by the picture and a heartbeat. A pure function of time:
 *
 *   0     frame 1: the coils round the rat, the heart mid-beat
 *   0-3.7 thump, squeeze: every beat tightens the coils a notch
 *   3.7   the heart slows: the beats drift apart and dim
 *   6.8   the last faint beat
 *   7.1   stopped: silence, and the coils still hold on
 *   8.0   only now do they loosen; 8.5 the mouth opens
 *   9.0   the swallow, head first; the body bulges round the meal
 *   10.2  gulp; the jaws shut, the lump slides on
 *   10.5  the real game: the corn snake coils round a rat
 *   12.9  the heart's glow blooms up from the prey into frame 1
 */
export const LOOP_S = 13.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export const STOP_AT = 7.1;
export const LOOSEN_AT = 8;
export const OPEN_AT = 8.5;
export const SWALLOW_AT = 9;
export const GULP_AT = 10.2;
export const GAME_AT = 10.5;
export const BLOOM_AT = 12.9;
/** Nothing about the game or where to play it shows before this. */
export const CTA_AT = GAME_AT;
export const CTA_END = LOOP_S - 0.6;

export const sceneAt = (t: number): 'coil' | 'swallow' | 'game' => {
  const u = wrap(t);
  return u < SWALLOW_AT ? 'coil' : u < GAME_AT ? 'swallow' : 'game';
};

// ---------------------------------------------------------------- the heart

interface Beat {
  readonly t: number;
  /** How hard it beats. */
  readonly k: number;
}

/** The beats. The first two fall just before the loop point (as negative times): frame 1 lands on the peak of one. */
export const BEATS: readonly Beat[] = [
  { t: -0.72, k: 0.75 }, { t: -0.04, k: 1 },
  { t: 0.7, k: 1 }, { t: 1.46, k: 1 }, { t: 2.22, k: 1 }, { t: 2.98, k: 1 }, { t: 3.74, k: 1 },
  { t: 4.6, k: 0.8 }, { t: 5.6, k: 0.6 }, { t: 6.8, k: 0.34 },
];

const hit = (s: number): number => (s <= 0 ? 0 : Math.min(1, s / 0.03) * Math.exp(-Math.max(0, s - 0.03) / 0.11));
/** One heartbeat's lub and dub. */
const lubDub = (s: number): number => Math.max(hit(s), 0.55 * hit(s - 0.25));

/** The beat now, 0..1, seen through the loop point. */
export function pulseAt(t: number): number {
  const u = wrap(t);
  return BEATS.reduce((m, b) => Math.max(m, b.k * Math.max(lubDub(u - b.t), lubDub(u - LOOP_S - b.t))), 0);
}

/** How alive the heart is: 1, sinking as it slows, 0 once it has stopped. Back at 1 for the bloom into frame 1. */
export function lifeAt(t: number): number {
  const u = wrap(t);
  if (u >= GAME_AT) return 1;
  return 1 - 0.5 * ramp(u, 3.8, 6.8) - 0.5 * ramp(u, 6.85, STOP_AT);
}

export interface Heart {
  readonly scale: number;
  /** Its red glow through the coils. */
  readonly glow: number;
  /** How much of the live heart shows over the dark one. */
  readonly life: number;
  readonly alpha: number;
}

export function heartAt(t: number): Heart {
  const u = wrap(t);
  const life = lifeAt(u);
  const pulse = pulseAt(u);
  return {
    scale: (0.86 + 0.14 * life) * (1 + 0.17 * pulse),
    glow: life ** 1.15 * (0.42 + 0.58 * pulse),
    life,
    alpha: u < GAME_AT ? 1 - ramp(u, LOOSEN_AT, LOOSEN_AT + 0.55) : 1,
  };
}

// ---------------------------------------------------------------- the coils

const TIGHT_0 = 0.22;
const NOTCH = 0.095;
const MAIN_BEATS = BEATS.filter((b) => b.t > 0 && b.k > 0.5);

/** How tight the coils are: 0 as frame 1 finds them, about 1 at the last, below 0 once let go; bursts on each beat. */
export function tightAt(t: number): number {
  const u = wrap(t);
  const burst = 0.2 * pulseAt(u);
  if (u >= GAME_AT) return TIGHT_0 + burst;
  const notches = MAIN_BEATS.reduce((sum, b) => sum + ramp(u, b.t + 0.02, b.t + 0.2), 0) * NOTCH;
  return TIGHT_0 + notches + burst - 1.75 * ramp(u, LOOSEN_AT, LOOSEN_AT + 0.85);
}

/** The camera on the coils: it pushes in through the slowing, and settles into frame 1 through the bloom. */
export function coilZoom(t: number): number {
  const u = wrap(t);
  if (u >= GAME_AT) return 1.05 - 0.05 * ramp(u, BLOOM_AT, LOOP_S);
  return 1 + 0.15 * ramp(u, 0, STOP_AT) - 0.09 * ramp(u, LOOSEN_AT, SWALLOW_AT);
}

/** The picture kicks with each beat. */
export const kickAt = (t: number): number => pulseAt(t) * lifeAt(t);

/** The ink's boil holds still through the silence. */
export const boilTime = (t: number): number => {
  const u = wrap(t);
  return u > STOP_AT + 0.1 && u < LOOSEN_AT ? STOP_AT + 0.1 : u;
};

/** The rat's eye shut, 0..1, as the heart gives out. */
export const ratEyeShut = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? ramp(u, 6.9, STOP_AT + 0.05) : 0;
};

/** The rat's head sinks as it goes still, and when the coils let it down. */
export const ratSag = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 0.3 * ramp(u, 4, STOP_AT) + 0.7 * ramp(u, LOOSEN_AT, SWALLOW_AT) : 0;
};

/** The boa's head as it rests by the rat, 0, then swings round to it, 1. */
export const headSwing = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? ramp(u, LOOSEN_AT + 0.2, SWALLOW_AT) : 0;
};

/** The gape in the coil shot, each side of the axis, px. */
export const coilGape = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 118 * ramp(u, OPEN_AT, SWALLOW_AT) : 0;
};

/** The tongue, 0 in .. 1 out: tasting the rat while the heart still beats. */
export function tongueAt(t: number): number {
  const u = wrap(t);
  for (const s of [1.05, 1.3, 2.6, 4.9, 5.15]) if (u >= s && u < s + 0.22) return Math.sin(((u - s) / 0.22) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the swallow

/** The rat along its axis in the swallow: its nose is at a = 0, its rump at RAT_LEN; the tail runs on to RAT_END. */
export const RAT_LEN = 770;
export const RAT_END = 1210;

const RAT_KNOTS: readonly (readonly [number, number])[] = [
  [0, 0], [50, 40], [120, 68], [228, 112], [300, 138], [400, 158], [500, 168], [600, 158], [660, 145], [730, 100], [770, 34],
];

/** The rat's half thickness at a: its outline in the swallow, and the shape of the lump. */
export function ratHalf(a: number): number {
  if (a <= 0 || a >= RAT_END) return 0;
  if (a >= RAT_LEN) return 34 * (1 - (a - RAT_LEN) / (RAT_END - RAT_LEN));
  for (let i = 1; i < RAT_KNOTS.length; i++) {
    const k1 = RAT_KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = RAT_KNOTS[i - 1]!;
    return lerp(k0[1], k1[1], (a - k0[0]) / (k1[0] - k0[0]));
  }
  return 0;
}

const HEAVES: readonly (readonly [number, number, number])[] = [
  [9.02, 9.3, 190], [9.38, 9.66, 190], [9.72, 9.98, 160], [10.02, GULP_AT, 640],
];
const RIM_0 = 170;

/** How far along the rat the rim of the mouth has come. */
export const rimAt = (t: number): number => RIM_0 + HEAVES.reduce((sum, [from, to, by]) => sum + by * ramp(t, from, to), 0);

/** The meal slides on down after the gulp. */
export const lumpSlide = (t: number): number => 150 * ramp(t, GULP_AT + 0.02, GAME_AT);

/** The gape at the rim, each side of the axis. */
export function swallowGape(t: number): number {
  const rim = rimAt(t);
  return (ratHalf(rim) + 14) * (1 - ramp(t, GULP_AT, GULP_AT + 0.12)) + 6 * ramp(t, GULP_AT, GULP_AT + 0.12);
}

/** A jolt on each heave. */
export const heaveShake = (t: number): number => HEAVES.reduce((m, [from]) => Math.max(m, window01(t, from, from + 0.2, 0.08)), 0);

// ---------------------------------------------------------------- the game

/** The corn snake's progress round the rat, 0..1, then its squeezes. */
export const coilProgress = (t: number): number => clamp01((wrap(t) - GAME_AT) / 1.25);
export const CLOSE_AT = GAME_AT + 1.25;
export const gameSqueeze = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 0 : 0.6 * ramp(u, CLOSE_AT + 0.05, CLOSE_AT + 0.4) + 0.4 * ramp(u, CLOSE_AT + 0.65, CLOSE_AT + 1);
};
/** The game's blue dotted ring, as the loop is about to close. */
export const ringAt = (t: number): number => window01(wrap(t), GAME_AT + 0.6, CLOSE_AT + 0.08, 0.1);

/** Frame 1 opening out of the prey: 0 nothing yet, 1 the whole frame. */
export const bloomAt = (t: number): number => {
  const u = wrap(t);
  return u < BLOOM_AT ? 0 : clamp01((u - BLOOM_AT) / (LOOP_S - BLOOM_AT - 0.04));
};

/** How much of the frame is the coil shot: all of it from frame 1 until the swallow, and again by the end of the bloom. */
export const coilShown = (t: number): number => (sceneAt(t) === 'coil' ? 1 : bloomAt(t));

/** The heart's glow in the prey before the bloom, 0..1. */
export const preyGlow = (t: number): number => {
  const u = wrap(t);
  return u < GAME_AT ? 0 : ramp(u, 12.3, BLOOM_AT);
};

// ---------------------------------------------------------------- the words

export interface Caption {
  readonly lines: readonly string[];
  /** The first line's baseline. */
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
  /** Paper on the dark, or ink on the farm's bright ground. */
  readonly onDark: boolean;
}

/** The hook is drawn from before the loop point, so frame 1 has it in full. */
export const HOOK: Caption = { lines: ['IT CAN FEEL', 'THE HEARTBEAT'], y: 400, size: 142, from: LOOP_S - 0.3, to: 2.05, onDark: true };

export const CAPTIONS: readonly Caption[] = [
  HOOK,
  { lines: ['Still beating?', 'It squeezes.'], y: 400, size: 142, from: 2.15, to: 3.9, onDark: true },
  { lines: ['Slower…'], y: 450, size: 190, from: 4.05, to: 6.6, onDark: true },
  { lines: ['Stopped.'], y: 450, size: 190, from: STOP_AT, to: LOOSEN_AT - 0.05, onDark: true },
  { lines: ['Now it lets go.'], y: 420, size: 150, from: LOOSEN_AT + 0.05, to: SWALLOW_AT, onDark: true },
  { lines: ['Coil round what', 'you can’t swallow'], y: 372, size: 122, from: GAME_AT + 0.05, to: CTA_END, onDark: false },
];

const CAPTION_FADE = 0.13;
/** Lines of a caption stand this far apart, in sizes. */
export const LEADING = 0.92;

/** How much of a caption shows; the hook runs through the loop point at full strength. */
export function captionAlpha(c: Caption, t: number): number {
  const u = wrap(t);
  if (c.from > c.to) return Math.max(ramp(u, c.from, c.from + 0.25), 1 - ramp(u, c.to - CAPTION_FADE, c.to));
  return window01(u, c.from, c.to, CAPTION_FADE);
}

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

/** The call to action, last 3 s, gone 0.6 s before the loop point. */
export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.3);
/** The arrow inks itself in, 0..1. */
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.35) / 0.55);

export const CTA = {
  big: { text: '10 levels free', y: 1095, size: 158 },
  small: { text: 'tap the channel name', y: 1195, size: 88 },
  /** The arrow, from under the words round to where YouTube shows the channel name. */
  arrow: { from: { x: 300, y: 1248 }, c0: { x: 335, y: 1390 }, c1: { x: 270, y: 1425 }, tip: { x: 170, y: 1470 } },
} as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const creak = (t: number, gain: number, pitch = 0.72): SoundCue => ({ id: 'squeeze', t, pitch, gain, pan: 0 });

/** Each beat's coil creak; none after 5.6, so the last faint beat stands alone and the silence is silence. */
export const SOUNDS: readonly SoundCue[] = [
  ...MAIN_BEATS.map((b) => creak(b.t + 0.05, 0.5 * b.k, 0.7 + 0.04 * (b.t % 2))),
  { id: 'steps', t: LOOSEN_AT + 0.02, pitch: 0.65, gain: 0.8, pan: 0.1 },
  { id: 'steps', t: LOOSEN_AT + 0.42, pitch: 0.55, gain: 0.7, pan: -0.1 },
  { id: 'strike', t: OPEN_AT + 0.02, pitch: 0.7, gain: 0.55, pan: 0 },
  { id: 'gulp', t: 9.1, pitch: 0.6, gain: 0.8, pan: 0 },
  creak(9.36, 0.55, 0.8),
  { id: 'gulp', t: 9.42, pitch: 0.55, gain: 0.85, pan: 0 },
  { id: 'gulp', t: 9.76, pitch: 0.52, gain: 0.85, pan: 0 },
  { id: 'swallow', t: GULP_AT - 0.08, pitch: 0.8, gain: 1, pan: 0 },
  { id: 'steps', t: GAME_AT + 0.05, pitch: 1, gain: 0.5, pan: 0.2 },
  { id: 'squeak', t: GAME_AT + 0.5, pitch: 1, gain: 0.6, pan: 0 },
  { id: 'steps', t: GAME_AT + 0.65, pitch: 1, gain: 0.45, pan: -0.2 },
  { id: 'appear', t: GAME_AT + 0.65, pitch: 1.2, gain: 0.6, pan: 0 },
  creak(CLOSE_AT + 0.06, 0.8, 1),
  creak(CLOSE_AT + 0.66, 0.8, 0.92),
];

/** Every value the picture is drawn from at t, by name. */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const heart = heartAt(t);
  return {
    pulse: pulseAt(t), life: lifeAt(t), heartScale: heart.scale, glow: heart.glow, heartAlpha: heart.alpha, tight: tightAt(t), zoom: coilZoom(t), kick: kickAt(t),
    eyeShut: ratEyeShut(t), sag: ratSag(t), swing: headSwing(t), gape: coilGape(t), tongue: tongueAt(t), coil: coilShown(t),
    hook: captionAlpha(HOOK, t), cta: ctaAt(t),
  };
}
