import { BOIL } from '../../../src/art/palette';
import { BOIL_FPS } from '../sprites';
import { curveAt, type Key, ramp, window01 } from '../short';
import { TEMPO, type Word, WORDS } from './words';

/**
 * "This animal has three hearts": the common octopus. Two branchial hearts
 * pump blood through its gills, one systemic heart pumps it round the body;
 * its blood is blue (hemocyanin carries oxygen on copper, where ours uses
 * iron); the systemic heart pauses while it swims (why is still debated, so
 * the short doesn't say); and it hunts crabs by feel, probing holes with its
 * arms. Told by a narrator (words.ts) in a rock pool, every beat timed to the
 * words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     the octopus hovers in the pool, seen through like an X-ray: three
 *         beating hearts numbered 1 2 3 (rung in turn on "THREE")
 *   2.4   "Two pump blood through its gills": hearts 1 and 2 light up, blood
 *         flows up into the two gills ("gills")
 *   4.6   "and one pumps it round the body": heart 3 lights up, blood flows
 *         down into the arms and back ("body")
 *   6.2   "And its blood is BLUE": the blood floods blue; O₂ rides along on
 *         "oxygen"; a Cu tile on "copper", an Fe tile crossed out on "iron"
 *   10.3  "Oh, and the main heart…": heart 3 ringed, a heart monitor slides in
 *   11.8  "…stops beating while it swims" (the payoff): it jets away up the
 *         pool and trace 3 goes flat (heart 3 still) while 1 and 2 beat on;
 *         it parachutes down onto the rocks and heart 3 starts again
 *   13.6  "Bad news for crabs": a hermit crab by the rocks "!"; an arm feels
 *         its shell ("knock") and it pulls in (the game's hide); arms poke
 *         into each hole in the rocks
 *   18.6  "Count them again:" it rises back, hearts numbered 1, 2, 3 as each
 *         word lands, and the loop finishes the sentence.
 *
 * motion.ts moves the octopus, its arms and the crab; this file has the
 * beats, the hearts, the labels, the captions and the sounds.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const THREE_AT = said('THREE');
export const HEARTS_AT = said('hearts.');
export const TWO_AT = said('Two');
export const GILLS_AT = said('gills,');
export const ONE_AT = said('one');
export const ROUND_AT = said('round');
export const BODY_AT = said('body.');
export const AND_BLOOD_AT = said('And');
export const BLUE_AT = said('BLUE:');
export const OXYGEN_AT = said('oxygen');
export const COPPER_AT = said('copper,');
export const NOT_AT = said('not');
export const IRON_AT = said('iron.');
export const OH_AT = said('Oh,');
export const MAIN_AT = said('main');
export const STOPS_AT = said('stops');
export const SWIMS_AT = said('swims.');
export const BAD_AT = said('Bad');
export const CRABS_AT = said('crabs:');
export const HUNTS_AT = said('hunts');
export const FEEL_AT = said('feel,');
export const POKING_AT = said('poking');
export const INTO_AT = said('into');
export const EVERY_AT = said('every');
export const HOLE_AT = said('hole.');
export const COUNT_AT = said('Count');
export const THEM_AT = said('them', 2);
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

/** A quick pop, 0 → ~1.25 → 1, from `at`. */
export function pop(t: number, at: number, s = 0.3): number {
  const u = t - at;
  if (u <= 0) return 0;
  return u < s * 0.4 ? 1.25 * (u / (s * 0.4)) : 1.25 - 0.25 * ramp(u, s * 0.4, s);
}

/** A ring spreading from a moment, 0 .. 1 over `s` (outside: < 0 or > 1, not drawn). */
export const ringAt = (t: number, at: number, s = 0.8): number => (t - at) / s;

// ---------------------------------------------------------------- the hearts

/** Heart 1 and 2 are the gill (branchial) hearts, heart 3 the main (systemic) one. */
export type HeartId = 1 | 2 | 3;
export const HEART_IDS: readonly HeartId[] = [1, 2, 3];

/** One beat every BEAT_S (26 to the loop); the gill hearts squeeze first, then the main heart. */
export const BEAT_S = 0.75;
export const BEAT_OFFSET: Readonly<Record<HeartId, number>> = { 1: 0, 2: 0.06, 3: 0.24 };

/** The main heart stopped, 0 .. 1: from just after "stops" until it has settled on the rocks after its swim. */
export const STOP_FROM = STOPS_AT + 0.1;
export const STOP_TO = BAD_AT + 0.15;
export const stoppedAt = (t: number): number => window01(t, STOP_FROM, STOP_TO, 0.16);

/** A heart's squeeze, 0 .. 1, a quick swell at each beat (none while it is stopped). */
export function beatAt(id: HeartId, t: number): number {
  const u = (((t - BEAT_OFFSET[id]) % BEAT_S) + BEAT_S) % BEAT_S;
  const squeeze = u < 0.22 ? Math.sin((Math.PI * u) / 0.22) : 0;
  return id === 3 ? squeeze * (1 - stoppedAt(t)) : squeeze;
}

/** Each beat's start, for the thumps and the monitor's beeps (the main heart's skipped while it is stopped). */
export const BEATS: readonly { readonly id: HeartId; readonly t: number }[] = HEART_IDS.flatMap((id) =>
  Array.from({ length: Math.round(LOOP_S / BEAT_S) }, (_, k) => ({ id, t: k * BEAT_S + BEAT_OFFSET[id] })).filter((b) => b.id !== 3 || stoppedAt(b.t + 0.05) < 0.5));

/** How much each heart is singled out (bright, ringed) as the narrator names it. */
export function heartLitAt(id: HeartId, t: number): number {
  if (id === 3) return Math.max(window01(t, ONE_AT - 0.1, AND_BLOOD_AT, 0.2), window01(t, MAIN_AT - 0.1, BAD_AT, 0.2));
  return window01(t, TWO_AT - 0.1, ONE_AT - 0.1, 0.2);
}

/** The ring round each number on "THREE" (one after another) and as it's counted at the end. */
const RING_TIMES: Readonly<Record<HeartId, readonly number[]>> = {
  1: [THREE_AT, COUNT_AT],
  2: [THREE_AT + 0.18, THEM_AT],
  3: [THREE_AT + 0.36, AGAIN_AT, MAIN_AT],
};
/** Each ring spreads for RING_S: short enough that the last (on "again") is gone by the loop point. */
export const RING_S = 0.45;
export const heartRingsAt = (id: HeartId, t: number): number[] => RING_TIMES[id].map((at) => ringAt(t, at, RING_S));

/** The see-through view of its insides, 0 .. 1: on from the loop's start, off for the hunt, back for the count. */
export const xrayAt = (t: number): number => (t < LOOP_S / 2 ? 1 : Math.max(1 - ramp(t, CRABS_AT + 0.1, CRABS_AT + 0.6), ramp(t, COUNT_AT - 0.35, COUNT_AT)));

/** The numbers by the hearts: there from the start, gone with the X-ray, popped back one per word of "Count them again". */
const COUNTED: Readonly<Record<HeartId, number>> = { 1: COUNT_AT, 2: THEM_AT, 3: AGAIN_AT };
export function numberAt(id: HeartId, t: number): number {
  if (t < LOOP_S / 2) return 1;
  if (t < COUNTED[id] - 0.02) return 1 - ramp(t, CRABS_AT + 0.1, CRABS_AT + 0.5);
  return pop(t, COUNTED[id] - 0.02, 0.3);
}

// ---------------------------------------------------------------- the blood

/**
 * How far the blue has spread through the vessels, 0 .. 1: grey until
 * "BLUE" (the colour is the reveal), blue until the X-ray has faded for the
 * hunt, then grey again, ready for the next loop.
 */
export const blueAt = (t: number): number => (t < LOOP_S / 2 ? ramp(t, BLUE_AT - 0.08, BLUE_AT + 0.4) : 1 - ramp(t, CRABS_AT + 0.6, CRABS_AT + 0.8));

/** Blood flowing through the gills (bright on "Two pump blood…") and round the body (on "one pumps it round…"). */
export const gillFlowAt = (t: number): number => 0.75 + 0.25 * window01(t, TWO_AT - 0.1, AND_BLOOD_AT, 0.25);
export const bodyFlowAt = (t: number): number => 0.6 + 0.4 * window01(t, ONE_AT - 0.1, AND_BLOOD_AT + 0.4, 0.25);
/** The flash of blue through the mantle as "BLUE" lands. */
export const blueFlashAt = (t: number): number => (t < BLUE_AT - 0.05 ? 0 : Math.min(ramp(t, BLUE_AT - 0.05, BLUE_AT + 0.1), 1 - 0.7 * ramp(t, BLUE_AT + 0.3, BLUE_AT + 1.2), 1 - ramp(t, OH_AT, OH_AT + 0.5)));

/**
 * How far the blood has gone along the vessels: at a steady pace, but the
 * main heart's circuit holds still while it is stopped. Integrated once,
 * so a dash pattern moves on smoothly and comes round whole at the loop.
 */
const FLOW_STEP = 1 / 240;
const STILL: readonly number[] = (() => {
  const out = [0];
  for (let i = 1; i * FLOW_STEP <= LOOP_S + 1e-9; i++) out.push(out[i - 1]! + stoppedAt((i - 0.5) * FLOW_STEP) * FLOW_STEP);
  return out;
})();
const stillFor = (t: number): number => {
  const i = Math.min(STILL.length - 2, Math.floor(wrap(t) / FLOW_STEP));
  const u = wrap(t) / FLOW_STEP - i;
  return STILL[i]! + (STILL[i + 1]! - STILL[i]!) * u;
};
/** The dashes' period along a vessel, local units, and how many go by in a loop. */
export const DASH = 9;
const GILL_DASHES = 52;
const BODY_DASHES = 40;
export const gillFlowOffset = (t: number): number => (wrap(t) * GILL_DASHES * DASH) / LOOP_S;
export const bodyFlowOffset = (t: number): number => ((wrap(t) - stillFor(t)) * BODY_DASHES * DASH) / (LOOP_S - STILL[STILL.length - 1]!);

// ---------------------------------------------------------------- labels and props

export const titleAt = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, TWO_AT - 0.2, TWO_AT + 0.1) : ramp(t, AGAIN_AT - 0.05, AGAIN_AT + 0.2));
export const gillsLabel = (t: number): number => window01(t, GILLS_AT - 0.1, BODY_AT - 0.1, 0.2);
export const bodyLabel = (t: number): number => window01(t, BODY_AT - 0.15, BLUE_AT - 0.15, 0.2);
export const blueLabel = (t: number): number => window01(t, BLUE_AT - 0.05, OXYGEN_AT - 0.05, 0.15);
export const oxygenLabel = (t: number): number => window01(t, OXYGEN_AT - 0.1, OH_AT, 0.2);
/** The element tiles: copper on "copper", iron on "not", crossed out on "iron". */
export const copperTile = (t: number): number => (t < COPPER_AT - 0.05 ? 0 : pop(t, COPPER_AT - 0.05) * (1 - ramp(t, OH_AT - 0.1, OH_AT + 0.25)));
export const ironTile = (t: number): number => (t < NOT_AT ? 0 : pop(t, NOT_AT) * (1 - ramp(t, OH_AT - 0.1, OH_AT + 0.25)));
export const ironCross = (t: number): number => ramp(t, IRON_AT + 0.05, IRON_AT + 0.3) * (1 - ramp(t, OH_AT - 0.1, OH_AT + 0.25));
export const mainLabel = (t: number): number => window01(t, MAIN_AT - 0.1, STOPS_AT + 0.35, 0.15);

/** The heart monitor: in on "main heart", out once the hunt starts. */
export const monitorAt = (t: number): number => window01(t, MAIN_AT - 0.3, CRABS_AT + 0.4, 0.3);
/** "stopped!" by the flat trace. */
export const stoppedLabel = (t: number): number => window01(t, STOP_FROM + 0.15, STOP_TO - 0.05, 0.15);

/** The crab's "!" on "crabs", and the knock and the "tap tap" on "feel". */
export function alarmAt(t: number): number {
  const u = t - (CRABS_AT - 0.05);
  return u < 0 || u > 0.9 ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, 0.75, 0.9));
}
export const KNOCK_AT = FEEL_AT - 0.05;
export const tapLabel = (t: number): number => window01(t, KNOCK_AT, KNOCK_AT + 0.7, 0.1);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/**
 * The voiceover cut into short lines: at most four words, broken after
 * punctuation, except the hook, which is up whole from the first frame.
 */
export const HOOK_WORDS = 5;
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [WORDS.slice(0, HOOK_WORDS)];
  for (const w of WORDS.slice(HOOK_WORDS)) {
    const last = groups[groups.length - 1]!;
    const prev = last[last.length - 1]!;
    const full = groups.length === 1 || last.length >= 4 || /[.,:…!]$/.test(prev.text) || [...last, w].map((x) => x.text).join(' ').length > 17;
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
