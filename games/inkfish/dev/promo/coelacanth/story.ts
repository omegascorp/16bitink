import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, curveAt, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish was supposed to be extinct": the coelacanth, known only from
 * fossils until one turned up in a trawler's catch in 1938. Told by a
 * narrator (words.ts); every beat is timed to the words, a function of time
 * in seconds over a loop of LOOP_S.
 *
 *   0     a living coelacanth paddles past a deep-sea cave; "EXTINCT" is stamped over it
 *   2.4   "Scientists knew the coelacanth only from fossils": sediment buries it, layer by
 *         layer, and it turns to stone, its skeleton inking in
 *   5     "…died out with the dinosaurs, sixty-six million years ago": the camera rises
 *         through the rock to dinosaurs on a ridge; a meteor strikes
 *   9     "Then, in 1938": back down to the fossil, which cracks, blue light in the cracks,
 *         and bursts: the living fish leaps out
 *   10.6  "…found one in a fisherman's catch": it lands on a trawler's catch, a curator looking on
 *   14.3  "It had been hiding in deep sea caves all along": the camera dives from the boat to
 *         the cave, where eyes shine in the dark
 *   17    "And it's still down there today, living to a hundred": the fish swims out of the
 *         cave to where the loop began; a lens counts the growth rings on a scale
 *
 * Two worlds share the screen's coordinates (y down, px). The sea: the cave
 * fills the screen at camera 0, the trawler sits DECK_Y above it. The stone:
 * the fossil where the fish stopped, the ridge RISE above it.
 */
export const LOOP_S = 22.5;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 0): number {
  const w = WORDS.filter((x) => x.text === text)[nth];
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return w.start / TEMPO;
}

export const STAMP_AT = said('extinct.');
export const STOP_FROM = said('Scientists');
const BRAKE_S = 0.8;
export const BURY_FROM = STOP_FROM + 0.15;
export const BURY_TO = said('fossils,');
export const BONES_FROM = said('coelacanth') + 0.3;
export const BONES_TO = said('fossils,') + 0.35;
export const RISE_FROM = said('and');
export const RISE_TO = said('dinosaurs,') + 0.15;
export const METEOR_FROM = said('sixty-six') - 0.25;
export const IMPACT_AT = said('million') + 0.1;
export const SINK_FROM = said('Then,');
export const SINK_TO = said('1938,') + 0.05;
export const CRACK_FROM = said('1938,') - 0.05;
export const BURST_AT = said('museum') - 0.3;
/** The burst's white flash, and the moment under it when the picture changes to the trawler. */
export const FLASH_S = 0.85;
export const SWAP_AT = BURST_AT + 0.31;
export const LAND_AT = BURST_AT + 0.7;
export const CURATOR_FROM = said('curator') - 0.25;
export const DIVE_FROM = said('It') - 0.1;
export const CAVE_AT = said('caves') + 0.1;
export const EMERGE_FROM = said('And') - 0.2;
export const AGE_FROM = said('living') - 0.1;
export const AGE_FULL = said('hundred,') + 0.35;
export const AGE_TO = LOOP_S - 0.45;

/** How far the camera rises from the fossil to the ridge, and how far above the cave the trawler is. */
export const RISE = 850;
export const DECK_Y = -3000;

export type World = 'sea' | 'stone';

/** Which world is on screen: the fossil's from the burial until the burst's flash hides the change. */
export const worldAt = (t: number): World => (t >= BURY_FROM && t < SWAP_AT ? 'stone' : 'sea');

/** The camera: how far up (negative) the picture looks, px, plus a shake while the rock cracks. */
export function cameraAt(t: number): { readonly y: number; readonly shakeX: number; readonly shakeY: number } {
  const shake = 14 * ramp(t, CRACK_FROM, BURST_AT) * (t < BURST_AT ? 1 : 0);
  const shakeX = shake > 0 ? shake * Math.sin(t * 91) : 0;
  const shakeY = shake > 0 ? shake * Math.cos(t * 73) : 0;
  if (worldAt(t) === 'stone') {
    const y = -RISE * Math.min(ramp(t, RISE_FROM, RISE_TO), 1 - ramp(t, SINK_FROM, SINK_TO));
    return { y, shakeX, shakeY };
  }
  if (t < SWAP_AT || t >= CAVE_AT) return { y: 0, shakeX, shakeY };
  // The dive: eased in and out a little harder than smoothstep, to linger on the boat and arrive gently.
  const u = smooth(smooth((t - DIVE_FROM) / (CAVE_AT - DIVE_FROM)));
  return { y: DECK_Y * (1 - u), shakeX: 0, shakeY: 0 };
}

// ---------------------------------------------------------------- the fish

export interface FishPose {
  /** Its middle (half way from nose to tail tip), px in its world, and nose to tail tip. */
  readonly x: number;
  readonly y: number;
  readonly length: number;
  /** Where its head points, radians (0 is right, negative is nose up). */
  readonly angle: number;
  /** Fin-stroke phase, radians, and how hard it paddles (0 still .. 1 cruising). */
  readonly paddle: number;
  readonly effort: number;
  /** Its body bent tail-up (+) or tail-down (-), for flopping on deck. */
  readonly bend: number;
}

export const FISH_LEN = 800;
/** Where it is as the loop begins, and how fast it cruises, px/s. */
export const HOME = { x: 520, y: 720 } as const;
export const CRUISE = 22;
/** Fin strokes per loop: the lobed fins paddle in alternating pairs. */
export const PADDLES = 12;
const BOBS = 3;

const paddleAt = (clock: number): number => (2 * Math.PI * PADDLES * clock) / LOOP_S;
const bob = (clock: number): { readonly dy: number; readonly tilt: number } => {
  const a = (2 * Math.PI * BOBS * clock) / LOOP_S;
  return { dy: 9 * Math.sin(a), tilt: -0.02 + 0.025 * Math.cos(a) };
};

/** The fish's own clock: it slows to a stop as the sediment comes for it ("Scientists…"). */
function stoppingClock(t: number): number {
  if (t < STOP_FROM) return t;
  const tau = Math.min(t - STOP_FROM, BRAKE_S);
  return STOP_FROM + tau - (tau * tau) / (2 * BRAKE_S);
}

const cruising = (clock: number, effort: number): FishPose => ({
  x: HOME.x + CRUISE * clock,
  y: HOME.y + bob(clock).dy,
  length: FISH_LEN,
  angle: bob(clock).tilt,
  paddle: paddleAt(clock),
  effort,
  bend: 0,
});

/** Where it lies in the rock: where it stopped. */
export const FOSSIL: FishPose = { ...cruising(stoppingClock(LOOP_S), 0) };

/**
 * The fish of the opening shot: cruising past the cave, stopping, buried
 * (until the burst); and, at the end, swimming out of the cave to where the
 * loop began. Null while it's elsewhere.
 */
export function swimmerAt(t: number): FishPose | null {
  if (t < BURST_AT) return cruising(stoppingClock(t), 1 - clamp01((t - STOP_FROM) / BRAKE_S));
  if (t < EMERGE_FROM) return null;
  const u = (t - EMERGE_FROM) / (LOOP_S - EMERGE_FROM);
  // Settling into its cruise for the last second, exactly as it goes on after the loop point.
  const settled = LOOP_S - 1.2;
  const x = curveAt([{ t: EMERGE_FROM, at: -500, rate: 360 }, { t: settled, at: HOME.x - CRUISE * 1.2, rate: CRUISE }, { t: LOOP_S, at: HOME.x, rate: CRUISE }], t).at;
  // Out of the cave, rising a little as it comes.
  const rise = 1 - smooth(u);
  const b = bob(t);
  return { x, y: HOME.y + b.dy + 70 * rise, length: FISH_LEN, angle: b.tilt - 0.1 * rise, paddle: paddleAt(t), effort: 1 + 0.5 * rise, bend: 0 };
}

/** The living fish leaping out of the shattered rock, over the burst's first moments. */
export function leapAt(t: number): FishPose | null {
  if (t < BURST_AT || t >= SWAP_AT) return null;
  const tau = t - BURST_AT;
  return { ...FOSSIL, y: FOSSIL.y - 120 * tau - 1400 * tau * tau, length: FISH_LEN * (1 + 0.6 * tau), angle: -0.5 * smooth(tau / 0.15), paddle: paddleAt(t) * 2, effort: 1.6 };
}

/** On the trawler (deck coordinates: as on screen with the camera on the boat). */
export const DECK_REST = { x: 430, y: 760, angle: -0.06 } as const;
export const DECK_LEN = 600;
const FLOPS = [0, 1.25, 2.4] as const;

/** The fish on the catch: dropping onto the pile, then flopping now and then. */
export function deckFishAt(t: number): FishPose | null {
  if (t < SWAP_AT || t >= CAVE_AT) return null;
  const base = { x: DECK_REST.x, length: DECK_LEN, paddle: paddleAt(t) * 0.7, effort: 0.35 };
  if (t < LAND_AT) {
    const u = (t - SWAP_AT) / (LAND_AT - SWAP_AT);
    return { ...base, x: DECK_REST.x + 120 * (1 - u), y: lerp(-420, DECK_REST.y, u * u), angle: lerp(-0.7, DECK_REST.angle, smooth(u)), effort: 1.4, bend: 0.25 * (1 - u) };
  }
  let bend = 0;
  let hop = 0;
  for (const at of FLOPS) {
    const tau = t - LAND_AT - at;
    if (tau < 0 || tau > 1.2) continue;
    bend += 0.32 * Math.sin(2 * Math.PI * 2.6 * tau) * Math.exp(-3.2 * tau);
    if (tau < 0.3) hop += 26 * Math.sin((Math.PI * tau) / 0.3) * (at === 0 ? 1.6 : 1);
  }
  return { ...base, y: DECK_REST.y - hop, angle: DECK_REST.angle - bend * 0.15, bend };
}

/** The boat's gentle roll, radians: the whole trawler scene tilts about its waterline. */
export const rollAt = (t: number): number => 0.018 * Math.sin((2 * Math.PI * t) / 3.2);

// ---------------------------------------------------------------- the burial

/**
 * The layers of sediment, world y of each layer's top, deepest first. The
 * fourth holds the fish: it takes longest to settle.
 */
export const LAYER_TOPS = [1640, 1330, 1010, 400, 215, 40, -150] as const;
export const FOSSIL_LAYER = 3;
const LAYER_WEIGHT = [1, 1, 1, 2.4, 1, 1, 1] as const;
const LAYER_START = (() => {
  const total = LAYER_WEIGHT.reduce((s, w) => s + w, 0);
  let at = BURY_FROM;
  return [...LAYER_WEIGHT.map((w) => {
    const from = at;
    at += ((BURY_TO - BURY_FROM) * w) / total;
    return from;
  }), BURY_TO];
})();

/** How far layer i has settled, 0 .. 1. */
export const layerAt = (i: number, t: number): number => ramp(t, LAYER_START[i]!, LAYER_START[i + 1]!);

/** The top of the sediment so far, world y: below the picture before the burial, the ridge's top after. */
export function sedimentTop(t: number): number {
  let top = 2000;
  LAYER_TOPS.forEach((y, i) => {
    const u = layerAt(i, t);
    if (u > 0) top = lerp(i === 0 ? 2000 : LAYER_TOPS[i - 1]!, y, u);
  });
  return top;
}

/** The skeleton inking in, nose to tail, 0 .. 1; and the stone darkening into a fossil. */
export const bonesAt = (t: number): number => (t >= SWAP_AT ? 1 : ramp(t, BONES_FROM, BONES_TO));
export const fossilisedAt = (t: number): number => ramp(t, BURY_TO - 0.5, BURY_TO + 0.2);

/** The cracks spreading through the rock, 0 .. 1, and the blue light glowing in them. */
export const crackAt = (t: number): number => clamp01((t - CRACK_FROM) / (BURST_AT - CRACK_FROM));

/** Seconds since the burst (negative before it). */
export const sinceBurst = (t: number): number => t - BURST_AT;

/** The burst's white flash, 0 .. 1. */
export const flashAt = (t: number): number => {
  const tau = t - BURST_AT;
  if (tau < 0 || tau > FLASH_S) return 0;
  // Builds while the rock flies apart, whites out the change of scene, then clears on the trawler.
  if (tau < 0.06) return 0;
  if (tau < 0.28) return ((tau - 0.06) / 0.22) ** 2;
  return tau < 0.36 ? 1 : 1 - smooth((tau - 0.36) / (FLASH_S - 0.36));
};

// ---------------------------------------------------------------- the stamp, the dinosaurs, the meteor

/** "EXTINCT", stamped above the fish: slammed down, hidden while the camera is up at the ridge, cracking with the rock. */
export function stampAt(t: number): { readonly alpha: number; readonly scale: number; readonly crack: number } | null {
  if (t < STAMP_AT || t >= BURST_AT + 0.1) return null;
  const u = clamp01((t - STAMP_AT) / 0.13);
  const away = window01(t, RISE_FROM - 0.1, SINK_TO + 0.1, 0.4);
  return { alpha: clamp01(u * 3) * (1 - away), scale: 1 + 0.9 * (1 - u) * (1 - u), crack: crackAt(t) };
}
/** Where the stamp sits, world (camera 0): high in the safe area, above the fish. */
export const STAMP = { x: 540, y: 400, angle: -0.09, scale: 0.88 } as const;

/** The meteor's flight, 0 .. 1 (its streak), and how far the blast has swept across the ridge, 0 .. 1. */
export const meteorAt = (t: number): number => clamp01((t - METEOR_FROM) / (IMPACT_AT - METEOR_FROM));
export const blastAt = (t: number): number => clamp01((t - IMPACT_AT) / 1.1);

// ---------------------------------------------------------------- the cave

/** Coelacanths resting in the cave, seen as the camera arrives: shapes in the dark with shining eyes. */
export interface Hidden {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly angle: number;
  readonly facing: 1 | -1;
  readonly from: number;
}
export const HIDDEN: readonly Hidden[] = [
  { x: 250, y: 610, length: 300, angle: 0.25, facing: 1, from: CAVE_AT - 0.15 },
  { x: 380, y: 830, length: 250, angle: -0.15, facing: -1, from: CAVE_AT + 0.15 },
  { x: 150, y: 860, length: 220, angle: 0.4, facing: 1, from: CAVE_AT + 0.4 },
];
export const HIDE_TO = said('living');

/** How much of a resting coelacanth shows, 0 .. 1. */
export const hiddenAt = (h: Hidden, t: number): number => (t < SWAP_AT ? 0 : window01(t, h.from, HIDE_TO, 0.45));

/** The lifespan lens on screen (lens.ts), and its count beside it. */
export const LENS = { x: 800, y: 440, r: 150 } as const;
export const AGE_TEXT = { x: 330, y: 430, size: 110 } as const;

/** The lifespan lens: how open, and the years counted on the scale so far. */
export function ageAt(t: number): { readonly open: number; readonly years: number } {
  const u = clamp01((t - AGE_FROM - 0.15) / (AGE_FULL - AGE_FROM - 0.15));
  return { open: window01(t, AGE_FROM, AGE_TO, 0.3), years: Math.round(100 * (1 - (1 - u) * (1 - u))) };
}

// ---------------------------------------------------------------- labels

export interface Label {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly from: number;
  readonly to: number;
  /** Ink on paper (above the water), else paper on ink. */
  readonly onPaper: boolean;
}

/** The facts on screen, each in the safe area (y 270 .. 1250). */
export const LABELS: readonly Label[] = [
  { text: '66 million years ago', y: 350, size: 92, from: said('sixty-six') - 0.2, to: SINK_FROM + 0.35, onPaper: false },
  { text: '1938 · South Africa', y: 360, size: 96, from: said('South') - 0.25, to: DIVE_FROM + 0.45, onPaper: true },
  { text: 'off East London, in a trawler’s catch', y: 434, size: 54, from: said('found') - 0.1, to: DIVE_FROM + 0.45, onPaper: true },
  { text: 'caves 150–250 m down', y: 350, size: 88, from: CAVE_AT - 0.2, to: EMERGE_FROM + 0.5, onPaper: false },
];
export const labelAt = (l: Label, t: number): number => window01(t, l.from, l.to, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'clang', t: STAMP_AT, pitch: 0.45, gain: 0.2, pan: 0 },
  { id: 'rustle', t: BURY_FROM + 0.1, pitch: 0.55, gain: 0.22, pan: 0 },
  { id: 'suck', t: BONES_FROM, pitch: 0.5, gain: 0.12, pan: 0 },
  { id: 'dash', t: RISE_FROM + 0.05, pitch: 0.5, gain: 0.16, pan: 0 },
  { id: 'dash', t: METEOR_FROM + 0.1, pitch: 1.5, gain: 0.14, pan: 0.4 },
  { id: 'boom', t: IMPACT_AT, pitch: 0.55, gain: 0.32, pan: 0.3 },
  { id: 'dash', t: SINK_FROM + 0.05, pitch: 0.65, gain: 0.14, pan: 0 },
  ...[0.15, 0.45, 0.7].map((at, i): SoundCue => ({ id: 'click', t: CRACK_FROM + at * (BURST_AT - CRACK_FROM), pitch: 0.6 + i * 0.12, gain: 0.2, pan: -0.2 + i * 0.2 })),
  { id: 'smash', t: BURST_AT, pitch: 0.8, gain: 0.3, pan: 0 },
  { id: 'splash', t: LAND_AT, pitch: 0.8, gain: 0.18, pan: -0.15 },
  ...FLOPS.slice(1).map((at): SoundCue => ({ id: 'lash', t: LAND_AT + at, pitch: 1.3, gain: 0.1, pan: -0.15 })),
  { id: 'splash', t: DIVE_FROM + 0.35, pitch: 0.6, gain: 0.18, pan: 0 },
  { id: 'dash', t: DIVE_FROM + 0.5, pitch: 0.45, gain: 0.16, pan: 0 },
  ...HIDDEN.map((h, i): SoundCue => ({ id: 'drop', t: h.from + 0.1, pitch: 1.5 + i * 0.15, gain: 0.08, pan: -0.4 + i * 0.15 })),
  { id: 'grow', t: AGE_FROM + 0.1, pitch: 0.9, gain: 0.12, pan: 0.3 },
];
