import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../sprites';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import { LINE_SIZES, TEMPO, WORDS, type Word } from './words';

/**
 * "Fifty million crabs march to the sea": Christmas Island's red crab
 * migration, told by a narrator (words.ts) over one long strip of island
 * (layout.ts) the camera pans along, every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S.
 *
 *   0     the hook: a river of red crabs pouring across the beach into the
 *         sea, "50,000,000" over it and "→ sea" at the water
 *   2.9   "Every year on Christmas Island": a whip pan back to the forest
 *         under a map card (Java, Australia, the pin on the island)
 *   4.8   "red crabs leave the forest for the coast": a red crab called out,
 *         the forest named, "coast →"
 *   6.9   "covering roads, gardens, even houses": the camera runs along the
 *         march, over a road, a garden and a house that crabs climb
 *   9.5   "Rangers close the roads": a ranger and a ROAD CLOSED barrier
 *   11.0  "and built crab BRIDGES": the bridge rises under the crowd, which
 *         streams over it while a car drives under (the payoff)
 *   12.9  "Then, with the moon": night on the beach, the moon rises
 *         (its phases, last quarter ringed); "the mothers" at the waterline
 *         shake out clouds of eggs "into the waves"
 *   16.6  "Next year, again:" day comes back, the counter stamps in, and the
 *         loop finishes the sentence on the hook.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
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

export const FIFTY_AT = said('FIFTY');
export const MILLION_AT = said('million');
export const SEA_AT = said('sea.');
export const EVERY_AT = said('Every');
export const CHRISTMAS_AT = said('Christmas');
export const RED_AT = said('red');
export const FOREST_AT = said('forest');
export const COAST_AT = said('coast,');
export const ROADS_AT = said('roads,', 1);
export const GARDENS_AT = said('gardens,');
export const EVEN_AT = said('even');
export const HOUSES_AT = said('houses.');
export const RANGERS_AT = said('Rangers');
export const CLOSE_AT = said('close');
export const BUILT_AT = said('built');
export const CRAB_AT = said('crab');
export const BRIDGES_AT = said('BRIDGES');
export const ACROSS_AT = said('across.');
export const THEN_AT = said('Then,');
export const MOON_AT = said('moon,');
export const MOTHERS_AT = said('mothers');
export const RELEASE_AT = said('release');
export const EGGS_AT = said('eggs');
export const WAVES_AT = said('waves.');
export const NEXT_AT = said('Next');
export const AGAIN_AT = said('again:');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
export function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

/** Something on screen across the loop point: shown at 0, gone from `out`, back from `back` (overshooting a little as it lands). */
export function aroundLoop(t: number, out: number, back: number, fade = 0.25): number {
  return t < LOOP_S / 2 ? 1 - ramp(t, out, out + fade) : ramp(t, back, back + fade);
}

// ---------------------------------------------------------------- the camera

/**
 * The world x at the screen's left edge. It drifts with the march, whips back
 * to the forest under the map card, runs along with the crowd past the road,
 * the garden and the house as each is named, then on to the closed road, the
 * bridge and the beach, ending where it began.
 */
export const HOOK_X = 2800;
export const cameraAt = looped([
  { t: 0, at: HOOK_X, rate: 18 },
  { t: EVERY_AT - 0.05, at: HOOK_X + 45, rate: 0 },
  { t: EVERY_AT + 0.5, at: 0, rate: 0 },
  { t: COAST_AT - 0.05, at: 110, rate: 120 },
  { t: ROADS_AT, at: 610, rate: 560 },
  { t: GARDENS_AT, at: 920, rate: 380 },
  { t: HOUSES_AT, at: 1240, rate: 60 },
  { t: RANGERS_AT - 0.1, at: 1280, rate: 0 },
  { t: CLOSE_AT + 0.05, at: 1520, rate: 40 },
  { t: BUILT_AT - 0.35, at: 1560, rate: 0 },
  { t: CRAB_AT + 0.1, at: 2020, rate: 50 },
  { t: THEN_AT - 0.1, at: 2080, rate: 0 },
  { t: MOON_AT - 0.1, at: HOOK_X - 70, rate: 30 },
  { t: NEXT_AT, at: HOOK_X - 30, rate: 18 },
]);

/** Night on the beach, 0 day .. 1 night: dusk on "Then, with the moon", dawn on "Next year". */
export const nightAt = (t: number): number => window01(t, THEN_AT + 0.1, NEXT_AT + 0.7, 0.9);

// ---------------------------------------------------------------- the hook

/** "50,000,000": on from the loop's start, gone once the hook is said (before the map card), stamped back on "again:". */
export const counterAt = (t: number): number => aroundLoop(t, SEA_AT + 0.35, AGAIN_AT - 0.08, 0.2);
/** Its pulse as "FIFTY" and "million" are said, and the stamp as it lands. */
export const counterPulseAt = (t: number): number =>
  Math.max(window01(t, FIFTY_AT - 0.05, FIFTY_AT + 0.4, 0.15), 0.5 * window01(t, MILLION_AT - 0.05, MILLION_AT + 0.35, 0.12), window01(t, AGAIN_AT, AGAIN_AT + 0.35, 0.12));
/** "→ sea" over the water, with a nudge on "sea.". */
export const seaLabelAt = (t: number): number => aroundLoop(t, SEA_AT + 0.4, AGAIN_AT + 0.1, 0.2);
export const seaNudgeAt = (t: number): number => window01(t, SEA_AT - 0.05, SEA_AT + 0.5, 0.15);

// ---------------------------------------------------------------- Christmas Island

/** The map card: up on "Every year", gone as "red crabs" starts. */
export const mapAt = (t: number): number => window01(t, EVERY_AT - 0.1, RED_AT + 0.05, 0.3);
/** The pin dropping onto the island on "Christmas", 0 .. 1. */
export const pinAt = (t: number): number => ramp(t, CHRISTMAS_AT - 0.1, CHRISTMAS_AT + 0.15);

// ---------------------------------------------------------------- labels

export type LabelId = 'redcrab' | 'forest' | 'coast' | 'road' | 'garden' | 'house' | 'rangers' | 'bridge' | 'moon' | 'mothers' | 'eggs' | 'next';
const LABEL_TIMES: Readonly<Record<LabelId, readonly [number, number]>> = {
  redcrab: [RED_AT - 0.05, COAST_AT + 0.2],
  forest: [FOREST_AT - 0.05, ROADS_AT - 0.3],
  coast: [COAST_AT - 0.05, ROADS_AT],
  road: [ROADS_AT - 0.05, GARDENS_AT + 0.4],
  garden: [GARDENS_AT - 0.05, HOUSES_AT + 0.2],
  house: [HOUSES_AT - 0.05, RANGERS_AT],
  rangers: [RANGERS_AT - 0.05, BUILT_AT - 0.4],
  bridge: [CRAB_AT - 0.05, THEN_AT],
  moon: [MOON_AT - 0.05, MOTHERS_AT + 0.6],
  mothers: [MOTHERS_AT - 0.05, EGGS_AT + 0.6],
  eggs: [EGGS_AT - 0.05, NEXT_AT],
  next: [NEXT_AT - 0.05, AGAIN_AT - 0.1],
};
export const labelAt = (id: LabelId, t: number): number => window01(t, LABEL_TIMES[id][0], LABEL_TIMES[id][1], 0.18);

/** Crabs climbing the house, one after another from "even houses". */
export const HOUSE_CRABS = 6;
export const houseCrabAt = (i: number, t: number): number => (t < LOOP_S - 0.5 ? ramp(t, EVEN_AT + 0.1 * i, EVEN_AT + 0.1 * i + 0.25) : 0);

// ---------------------------------------------------------------- the road closed, the bridge

/** The ranger walking in on "Rangers"; the barrier and its sign dropping on "close". */
export const rangerAt = (t: number): number => (t < LOOP_S - 0.5 ? ramp(t, RANGERS_AT - 0.2, RANGERS_AT + 0.25) : 0);
export const barrierAt = (t: number): number => (t < LOOP_S - 0.5 ? ramp(t, CLOSE_AT - 0.05, CLOSE_AT + 0.3) : 0);

/**
 * How much of the bridge stands, 0 flat .. 1 built: it rises under the crowd
 * on "built", up before "BRIDGES", and stays for the beach and the hook (its
 * far ramp is just off the hook's left edge). It is lowered again while the
 * camera is away in the forest, so it can rise once more.
 */
export const builtAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, CHRISTMAS_AT, RED_AT) : ramp(t, BUILT_AT - 0.05, BRIDGES_AT - 0.08));
/** The deck lighting up red as it fills, and the ding: on "BRIDGES". */
export const bridgeFlashAt = (t: number): number => window01(t, BRIDGES_AT - 0.05, BRIDGES_AT + 0.6, 0.15);
/** A car driving away along the road under the deck, 0 near .. 1 far: the road stays open. */
export const carAt = (t: number): number => ramp(t, BRIDGES_AT + 0.05, THEN_AT + 0.25);

// ---------------------------------------------------------------- the moon and the eggs

/** The moon rising on "moon", setting at dawn. */
export const moonAt = (t: number): number => window01(t, MOON_AT - 0.45, NEXT_AT + 0.5, 0.45);
/** The row of the moon's phases with the last quarter ringed. */
export const phasesAt = (t: number): number => window01(t, MOON_AT, MOTHERS_AT + 0.6, 0.2);

/** The mothers: walking down to the waterline after "Then", shaking out eggs from "release", into the sea from "Next". */
export const MOTHERS = [
  { x: 3330, depth: 0.42, delay: 0 },
  { x: 3365, depth: 0.66, delay: 0.12 },
  { x: 3300, depth: 0.9, delay: 0.24 },
] as const;
export const mothersAt = (t: number): number => window01(t, THEN_AT + 0.2, AGAIN_AT, 0.6);
/** How far each has walked, 0 back up the beach .. 1 at the water .. 2 gone into it. */
export const motherWalkAt = (i: number, t: number): number =>
  ramp(t, THEN_AT + 0.2 + MOTHERS[i]!.delay, MOTHERS_AT - 0.1 + MOTHERS[i]!.delay) + ramp(t, NEXT_AT - 0.1, AGAIN_AT + 0.2);
/** Shaking, 0 .. 1: while they release their eggs. */
export const shakeAt = (t: number): number => window01(t, RELEASE_AT - 0.1, WAVES_AT + 0.2, 0.15);

/** The clouds of eggs: a puff from each mother every EGG_GAP_S while they shake. */
export const EGG_GAP_S = 0.42;
export const EGG_LIFE_S = 1.6;
export const EGG_PUFFS: readonly { readonly mother: number; readonly t: number }[] = Array.from({ length: 4 }, (_, k) =>
  MOTHERS.map((_, mother) => ({ mother, t: RELEASE_AT + 0.05 + k * EGG_GAP_S + mother * 0.13 })),
).flat();
/** A puff's age, 0 .. 1 while it drifts out and fades (outside: not drawn). */
export const eggPuffAt = (i: number, t: number): number => (t - EGG_PUFFS[i]!.t) / EGG_LIFE_S;

/** The waterline: three slow washes a loop, and a bigger one on "waves.", px up the sand. */
export const surgeAt = (t: number): number => 22 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S) + 70 * window01(t, WAVES_AT - 0.2, WAVES_AT + 1.1, 0.5);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines (LINE_SIZES), each up from its first word until the next. */
export const LINES: readonly Line[] = (() => {
  const groups = LINE_SIZES.map((n, i) => {
    const start = LINE_SIZES.slice(0, i).reduce((s, k) => s + k, 0);
    return WORDS.slice(start, start + n);
  });
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the first frame: the hook is on screen before its first word lands.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  let word = line === LINES[0] ? 0 : -1;
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

/** Many small feet: a dense, quiet patter of ticks all loop, softer at night when most of the crowd is in the sea. */
const FEET: readonly SoundCue[] = Array.from({ length: Math.round(LOOP_S / 0.075) }, (_, i): SoundCue => {
  const h = (k: number): number => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const t = i * 0.075 + 0.05 * h(1);
  const night = window01(t, THEN_AT + 0.4, NEXT_AT + 0.4, 0.5);
  return { id: h(2) < 0.8 ? 'click' : 'tok', t, pitch: lerp(0.6, 1.5, h(3)), gain: lerp(0.18, 0.4, h(4)) * (1 - 0.6 * night) * (h(2) < 0.8 ? 1 : 0.3), pan: lerp(-0.7, 0.7, h(5)) };
});

/**
 * Quiet under the voice. The patter of feet all through; a bright ding on the
 * number; a whoosh for the whip pan and a pin dropping on the map; knocks on
 * the house; the barrier's clack; the bridge thudding up and a fanfare on
 * "BRIDGES"; warm, soft tones for the moon and the eggs, and the tide.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...FEET,
  { id: 'find', t: FIFTY_AT, pitch: 1, gain: 0.5, pan: 0 },
  { id: 'join', t: MILLION_AT, pitch: 1.2, gain: 0.2, pan: 0.1 },
  { id: 'tide', t: SEA_AT - 0.3, pitch: 1, gain: 0.35, pan: 0.5 },
  { id: 'gust', t: EVERY_AT - 0.2, pitch: 1.3, gain: 0.22, pan: -0.3 },
  { id: 'place', t: CHRISTMAS_AT + 0.1, pitch: 1.1, gain: 0.5, pan: -0.2 },
  { id: 'join', t: CHRISTMAS_AT + 0.15, pitch: 1, gain: 0.22, pan: -0.2 },
  { id: 'tok', t: RED_AT, pitch: 1, gain: 0.3, pan: 0.1 },
  { id: 'gust', t: FOREST_AT - 0.3, pitch: 0.7, gain: 0.16, pan: -0.4 },
  { id: 'tide', t: COAST_AT - 0.2, pitch: 1.2, gain: 0.14, pan: 0.6 },
  { id: 'tok', t: ROADS_AT, pitch: 0.8, gain: 0.3, pan: -0.1 },
  { id: 'tok', t: GARDENS_AT, pitch: 1.2, gain: 0.3, pan: 0.1 },
  ...Array.from({ length: HOUSE_CRABS }, (_, i): SoundCue => ({ id: 'tok', t: EVEN_AT + 0.1 * i + 0.1, pitch: 1.1 + 0.12 * (i % 3), gain: 0.22, pan: -0.3 + 0.12 * i })),
  { id: 'knock', t: HOUSES_AT + 0.1, pitch: 1, gain: 0.45, pan: 0.2 },
  { id: 'click', t: RANGERS_AT, pitch: 0.8, gain: 0.3, pan: -0.3 },
  { id: 'hide', t: CLOSE_AT + 0.1, pitch: 0.8, gain: 0.5, pan: 0 },
  { id: 'place', t: CLOSE_AT + 0.25, pitch: 0.8, gain: 0.45, pan: 0 },
  { id: 'gust', t: BUILT_AT - 0.45, pitch: 1.2, gain: 0.14, pan: 0.3 },
  ...[0, 0.15, 0.3].map((d, i): SoundCue => ({ id: 'place', t: BUILT_AT + d, pitch: 0.9 + 0.15 * i, gain: 0.4, pan: -0.2 + 0.2 * i })),
  { id: 'win', t: BRIDGES_AT, pitch: 1, gain: 0.45, pan: 0 },
  { id: 'gust', t: BRIDGES_AT + 0.4, pitch: 1.5, gain: 0.12, pan: 0.2 },
  ...[0.55, 0.85, 1.15].map((d, i): SoundCue => ({ id: 'join', t: BRIDGES_AT + d, pitch: 1 + 0.1 * i, gain: 0.14, pan: -0.3 + 0.3 * i })),
  { id: 'tide', t: THEN_AT - 0.1, pitch: 0.9, gain: 0.3, pan: 0.4 },
  { id: 'grow', t: MOON_AT, pitch: 0.5, gain: 0.3, pan: 0.3 },
  { id: 'join', t: MOTHERS_AT, pitch: 0.6, gain: 0.16, pan: -0.1 },
  ...EGG_PUFFS.filter((p) => p.mother === 0).map((p, k): SoundCue => ({ id: 'pour', t: p.t, pitch: 0.7 + 0.08 * k, gain: 0.12, pan: 0.3 })),
  { id: 'find', t: EGGS_AT, pitch: 0.55, gain: 0.18, pan: 0.2 },
  { id: 'tide', t: WAVES_AT - 0.35, pitch: 1, gain: 0.45, pan: 0.4 },
  { id: 'trade', t: NEXT_AT, pitch: 1, gain: 0.25, pan: 0 },
  { id: 'place', t: AGAIN_AT + 0.05, pitch: 1.2, gain: 0.45, pan: 0 },
];

/** How much of the soundscape is the sea, 0 inland .. 1 at the beach (for the surf under it all). */
export const seasideAt = (t: number): number => {
  const x = cameraAt(t);
  return 0.25 + 0.75 * ramp(x, 1900, 2700);
};
