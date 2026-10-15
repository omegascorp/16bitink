import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, window01 } from '../short';
import type { SfxId } from '../../../src/audio/recipes';
import type { Fish } from './cleaner';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish passed a test your dog fails": the cleaner wrasse passes the
 * mirror mark test (Kohda et al., PNAS 2019). Told by a narrator (words.ts)
 * at a mirror propped on the sand of a reef, every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S.
 *
 *   0     the wrasse faces its reflection; above it the checklist card, "the
 *         mirror test": dog ✗, cat ✗, cleaner wrasse ✓ (rows ringing on
 *         "passed" and "DOG")
 *   2.6   the card flies off and the wrasse turns its back on the mirror;
 *         "Scientists": a pipette comes in and on "brown mark" leaves a spot
 *         on its throat; a magnifier shows it, "brown mark", "cleaner wrasse"
 *   6.2   "a spot it could only see…": its line of sight runs ahead, the spot
 *         gets a ✗; "…in a mirror": it turns round, sees the reflection's
 *         spot (sight line, ring), and on "It looked…" a "!"
 *   9.1   "then scraped its throat on the sand": it dives and scrapes, puffs
 *         of sand at each stroke, the spot fading until it is gone on "off!"
 *   12.2  "That's the mirror test": the card comes back, rows ticked off as
 *         they are named: "Dogs do." ✗, "Cats do." ✗, "But somehow," ✓,
 *         and the loop finishes the sentence.
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

export const PASSED_AT = said('passed');
export const DOG_AT = said('DOG');
export const FAILS_AT = said('fails.');
export const SCIENTISTS_AT = said('Scientists');
export const BROWN_AT = said('brown');
export const MARK_AT = said('mark');
export const CLEANER_AT = said('cleaner');
export const THROAT_AT = said('throat,');
export const SPOT_AT = said('spot');
export const ONLY_AT = said('only');
export const MIRROR_AT = said('mirror.');
export const LOOKED_AT = said('looked…');
export const THEN_AT = said('then');
export const SCRAPED_AT = said('scraped');
export const SAND_AT = said('sand,');
export const TRYING_AT = said('trying');
export const OFF_AT = said('off!');
export const THATS_AT = said("That's");
export const TEST_MIRROR_AT = said('mirror');
export const MOST_AT = said('Most');
export const FAIL_AT = said('fail');
export const DOGS_AT = said('Dogs');
export const DOGS_DO_AT = said('do.', 1);
export const CATS_AT = said('Cats');
export const CATS_DO_AT = said('do.', 2);
export const BUT_AT = said('But');
export const SOMEHOW_AT = said('somehow,');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

// ---------------------------------------------------------------- the wrasse

/** Its length on screen, and the sand its throat scrapes along. */
export const WRASSE_LEN = 300;
export const SAND_Y = 1085;

/** Turned away from the mirror while it is marked; back round to it on "…in a mirror". */
const AWAY_FROM = FAILS_AT + 0.45;
const BACK_FROM = MIRROR_AT - 0.62;
const TURN_S = 0.45;

/** The scraping: strokes back and forth along the sand, STROKE_S each. */
export const SCRAPE_FROM = SCRAPED_AT - 0.05;
export const STROKE_S = 0.48;
export const STROKES = 5;
export const SCRAPE_TO = SCRAPE_FROM + STROKES * STROKE_S;
const STROKE_PX = 34;

const wrasseX = looped([
  { t: 0.4, at: 412 },
  { t: AWAY_FROM - 0.1, at: 430 },
  { t: SCIENTISTS_AT + 0.6, at: 335 },
  { t: BACK_FROM - 0.1, at: 322 },
  { t: MIRROR_AT + 0.2, at: 410 },
  { t: LOOKED_AT + 0.3, at: 468 },
  { t: THEN_AT + 0.05, at: 462 },
  { t: SCRAPE_FROM + 0.35, at: 425 },
  { t: SCRAPE_TO - 0.1, at: 440 },
  { t: THATS_AT + 0.45, at: 405 },
  { t: 16.2, at: 398 },
]);
const wrasseY = looped([
  { t: 0.4, at: 905 },
  { t: AWAY_FROM - 0.1, at: 900 },
  { t: SCIENTISTS_AT + 0.6, at: 880 },
  { t: BACK_FROM - 0.1, at: 890 },
  { t: MIRROR_AT + 0.2, at: 905 },
  { t: LOOKED_AT + 0.3, at: 918 },
  { t: THEN_AT + 0.05, at: 925 },
  { t: SCRAPE_FROM + 0.35, at: SAND_Y - 44 },
  { t: SCRAPE_TO - 0.1, at: SAND_Y - 44 },
  { t: THATS_AT + 0.45, at: 900 },
  { t: 16.2, at: 908 },
]);
/** Nose up is positive: it rolls its throat towards the mirror to look, dives nose first, and lies flat to scrape. */
const wrasseTilt = looped([
  { t: 0.4, at: 0.02 },
  { t: BACK_FROM - 0.1, at: 0 },
  { t: MIRROR_AT + 0.2, at: 0.05 },
  { t: LOOKED_AT + 0.3, at: 0.3 },
  { t: THEN_AT + 0.05, at: 0.15 },
  { t: SCRAPE_FROM + 0.2, at: -0.32 },
  { t: SCRAPE_FROM + 0.45, at: -0.1 },
  { t: SCRAPE_TO - 0.1, at: -0.08 },
  { t: SCRAPE_TO + 0.35, at: 0.22 },
  { t: THATS_AT + 0.45, at: 0.02 },
]);

/** How hard it is scraping, 0 .. 1. */
export const scrapingAt = (t: number): number => window01(t, SCRAPE_FROM + 0.25, SCRAPE_TO, 0.2);

export function wrasseAt(t: number): Fish {
  const face = 1 - 2 * ramp(t, AWAY_FROM, AWAY_FROM + TURN_S) + 2 * ramp(t, BACK_FROM, BACK_FROM + TURN_S);
  const scrape = scrapingAt(t);
  const stroke = Math.sin((2 * Math.PI * (t - SCRAPE_FROM)) / STROKE_S);
  const busy = window01(t, AWAY_FROM - 0.2, SCIENTISTS_AT + 0.8, 0.3) + window01(t, BACK_FROM - 0.1, LOOKED_AT + 0.4, 0.3)
    + window01(t, THEN_AT - 0.1, THATS_AT + 0.5, 0.3);
  return {
    x: wrasseX(t) + face * STROKE_PX * scrape * stroke,
    y: wrasseY(t) + 7 * Math.sin((2 * Math.PI * 5 * t) / LOOP_S) * (1 - scrape),
    len: WRASSE_LEN,
    face,
    tilt: wrasseTilt(t) + 0.07 * scrape * Math.cos((2 * Math.PI * (t - SCRAPE_FROM)) / STROKE_S),
    beat: (2 * Math.PI * 30 * t) / LOOP_S,
    effort: 0.3 + 0.6 * Math.min(1, busy),
  };
}

/** Its reflection: the mirror is the plane x = MIRROR.x, the image a little smaller, as if further off. */
export const MIRROR = { x: 640, depth: 0.8 } as const;
export function reflectionOf(f: Fish): Fish {
  return { ...f, x: MIRROR.x + (MIRROR.x - f.x) * MIRROR.depth, len: f.len * MIRROR.depth, face: -f.face };
}

/**
 * The brown mark, 0 .. 1: dropped on "brown", scuffed paler by the strokes
 * but not gone (it was put under the skin: "trying to rub it off"), and
 * faded away while the card has everyone's attention, so the loop starts
 * clean.
 */
export function markAt(t: number): number {
  return ramp(t, BROWN_AT, BROWN_AT + 0.3) * (1 - 0.5 * ramp(t, SCRAPE_FROM + 0.4, OFF_AT + 0.05)) * (1 - ramp(t, MOST_AT, DOGS_AT));
}

/** Puffs of sand from its throat, one at the front of each stroke. */
export const PUFFS: readonly number[] = Array.from({ length: STROKES }, (_, k) => SCRAPE_FROM + (k + 0.25) * STROKE_S).filter((at) => scrapingAt(at) > 0.5);
export const PUFF_S = 0.75;
export const puffAt = (i: number, t: number): number => (t - PUFFS[i]!) / PUFF_S;

// ---------------------------------------------------------------- the pipette and the magnifier

/** The pipette, 0 away .. 1 at its throat: in on "Scientists", a drop on "brown", out again after "mark". */
export function pipetteAt(t: number): number {
  return ramp(t, SCIENTISTS_AT - 0.05, BROWN_AT - 0.05) * (1 - ramp(t, MARK_AT + 0.2, MARK_AT + 0.85));
}
/** Its bulb squeezed on "brown". */
export const squeezeAt = (t: number): number => window01(t, BROWN_AT - 0.12, BROWN_AT + 0.3, 0.12);

/**
 * The magnifier, three times: on its throat from "brown" (the mark close up)
 * until it turns round; on the reflection's throat on "…in a mirror" (the
 * payoff: it can see the spot now); on its throat in the sand on "sand,"
 * (scraping, and the mark still there).
 */
export type LensId = 'throat' | 'mirror' | 'scrape';
export interface Lens {
  readonly id: LensId;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly zoom: number;
}
export const LENSES: Readonly<Record<LensId, Lens>> = {
  throat: { id: 'throat', x: 640, y: 560, r: 210, zoom: 2.6 },
  mirror: { id: 'mirror', x: 540, y: 545, r: 220, zoom: 2.4 },
  scrape: { id: 'scrape', x: 600, y: 600, r: 210, zoom: 2.4 },
};
const LENS_TIMES: Readonly<Record<LensId, readonly [number, number, number, number]>> = {
  throat: [BROWN_AT + 0.15, MARK_AT + 0.45, BACK_FROM - 0.3, BACK_FROM + 0.05],
  mirror: [MIRROR_AT - 0.2, MIRROR_AT + 0.25, THEN_AT - 0.1, THEN_AT + 0.25],
  scrape: [SAND_AT - 0.15, TRYING_AT + 0.1, THATS_AT - 0.35, THATS_AT + 0.05],
};
/** Which lens is out and how far open, 0 .. 1 (null when none). */
export function lensAt(t: number): { readonly lens: Lens; readonly open: number } | null {
  for (const id of ['throat', 'mirror', 'scrape'] as const) {
    const [a, b, c, d] = LENS_TIMES[id];
    const open = Math.min(ramp(t, a, b), 1 - ramp(t, c, d));
    if (open > 0) return { lens: LENSES[id], open };
  }
  return null;
}

// ---------------------------------------------------------------- what it sees

/** Its line of sight, straight ahead and away from the mirror, on "a spot it could only see…". */
export const blindSightAt = (t: number): number => window01(t, SPOT_AT - 0.05, BACK_FROM + 0.05, 0.2);
/** A ✗ by its own spot, from "spot it could…": it can't see it. */
export const blindCrossAt = (t: number): number => window01(t, SPOT_AT + 0.15, BACK_FROM + 0.05, 0.15);
/** Its line of sight to the reflection's spot, on "…in a mirror", and a ring round that spot. */
export const mirrorSightAt = (t: number): number => window01(t, MIRROR_AT - 0.12, THEN_AT, 0.18);
export const mirrorRingAt = (t: number): number => (t - (MIRROR_AT + 0.05)) / 0.9;
/** The mirror's glint as each "mirror" is said. */
export const glintAt = (t: number): number => Math.max(window01(t, MIRROR_AT - 0.1, MIRROR_AT + 0.5, 0.15), window01(t, TEST_MIRROR_AT - 0.1, TEST_MIRROR_AT + 0.5, 0.15));

/** The "!" over the wrasse as it looks. */
export function alarmAt(t: number): number {
  const u = t - (LOOKED_AT - 0.05);
  const hold = 0.95;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.15, hold));
}

// ---------------------------------------------------------------- labels

export const scientistsLabel = (t: number): number => window01(t, SCIENTISTS_AT - 0.05, MARK_AT + 0.7, 0.2);
export const markLabel = (t: number): number => window01(t, BROWN_AT + 0.05, BACK_FROM - 0.3, 0.2);
export const throatLabel = (t: number): number => window01(t, THROAT_AT - 0.05, BACK_FROM - 0.3, 0.2);
export const reflectionLabel = (t: number): number => window01(t, MIRROR_AT - 0.05, THEN_AT - 0.1, 0.2);
export const nameLabel = (t: number): number => window01(t, CLEANER_AT - 0.05, BACK_FROM, 0.2);
export const scrapeLabel = (t: number): number => window01(t, SCRAPED_AT, OFF_AT + 0.3, 0.2);

// ---------------------------------------------------------------- the checklist card

/** Something already on the card at the loop point: 1 there, built up again from `from` after the middle. */
const kept = (t: number, from: number, s = 0.25): number => (t < LOOP_S / 2 ? 1 : ramp(t, from, from + s));

/** The card, 0 gone (up off the top) .. 1 in place: off after "fails", back on "That's the mirror test". */
export const cardAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, FAILS_AT + 0.4, FAILS_AT + 0.85) : ramp(t, THATS_AT - 0.15, THATS_AT + 0.3));
/** The title, written from "That's" and finished as "mirror" is said. */
export const titleAt = (t: number): number => kept(t, THATS_AT + 0.15, TEST_MIRROR_AT + 0.15 - (THATS_AT + 0.15));
export const mostAt = (t: number): number => kept(t, MOST_AT - 0.05, 0.4);
export const failAt = (t: number): number => kept(t, FAIL_AT - 0.05, 0.2);

export type RowId = 'dog' | 'cat' | 'wrasse';
export const ROWS: readonly RowId[] = ['dog', 'cat', 'wrasse'];
const ROW_IN: Readonly<Record<RowId, number>> = { dog: DOGS_AT, cat: CATS_AT, wrasse: BUT_AT };
const STAMP: Readonly<Record<RowId, number>> = { dog: DOGS_DO_AT, cat: CATS_DO_AT, wrasse: SOMEHOW_AT };

export const rowAt = (id: RowId, t: number): number => kept(t, ROW_IN[id] - 0.12, 0.3);
/** Its ✗ or ✓, 0 .. ~1.2: stamped on with an overshoot as it is named. */
export function stampAt(id: RowId, t: number): number {
  if (t < LOOP_S / 2) return 1;
  const u = t - (STAMP[id] - 0.05);
  if (u <= 0) return 0;
  return u < 0.12 ? lerp(0, 1.3, u / 0.12) : lerp(1.3, 1, ramp(u, 0.12, 0.3));
}
/** A ring round a row as the hook names it: the wrasse's on "passed", the dog's on "DOG". */
const RING_AT: Readonly<Record<RowId, number | null>> = { dog: DOG_AT - 0.05, cat: null, wrasse: PASSED_AT - 0.05 };
export const rowRingAt = (id: RowId, t: number): number => {
  const at = RING_AT[id];
  return at === null ? -1 : (t - at) / 1.1;
};
/** The dog's ✗ jolts again on "fails". */
export const failJoltAt = (t: number): number => window01(t, FAILS_AT - 0.05, FAILS_AT + 0.35, 0.1);

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
    const full = !last || last.length >= 4 || /[.,:…!]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
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

/**
 * Quiet under the voice: it does the talking. Bright clicks for the ticks and
 * the spot, a comic buzz for each ✗, the game's dash and scrapes for the
 * wrasse, and a cheerful power-up for its ✓.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'click', t: PASSED_AT, pitch: 1.5, gain: 0.25, pan: 0.2 },
  { id: 'hurt', t: FAILS_AT, pitch: 1.3, gain: 0.12, pan: -0.2 },
  { id: 'dash', t: FAILS_AT + 0.4, pitch: 1.3, gain: 0.08, pan: 0 },
  { id: 'click', t: BROWN_AT - 0.1, pitch: 0.9, gain: 0.25, pan: -0.5 },
  { id: 'drop', t: BROWN_AT, pitch: 0.8, gain: 0.22, pan: -0.5 },
  { id: 'click', t: MARK_AT + 0.05, pitch: 1.3, gain: 0.2, pan: 0 },
  { id: 'click', t: SPOT_AT + 0.15, pitch: 0.8, gain: 0.25, pan: -0.4 },
  { id: 'drop', t: MIRROR_AT, pitch: 1.9, gain: 0.16, pan: 0.4 },
  { id: 'spotted', t: LOOKED_AT, pitch: 1.1, gain: 0.22, pan: -0.1 },
  { id: 'dash', t: THEN_AT, pitch: 1.0, gain: 0.12, pan: -0.1 },
  ...PUFFS.map((at, i): SoundCue => ({ id: 'rustle', t: at - 0.05, pitch: 1.1 + 0.08 * (i % 2), gain: 0.2, pan: -0.15 })),
  { id: 'drop', t: OFF_AT + 0.05, pitch: 1.6, gain: 0.18, pan: -0.1 },
  { id: 'dash', t: THATS_AT - 0.15, pitch: 1.3, gain: 0.08, pan: 0 },
  { id: 'click', t: FAIL_AT, pitch: 0.8, gain: 0.22, pan: 0.2 },
  { id: 'hurt', t: DOGS_DO_AT, pitch: 1.2, gain: 0.14, pan: 0.3 },
  { id: 'hurt', t: CATS_DO_AT, pitch: 1.35, gain: 0.14, pan: 0.3 },
  { id: 'powerup', t: SOMEHOW_AT, pitch: 1.0, gain: 0.22, pan: 0.3 },
];
