import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, smooth } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish sold for three million dollars": at the first tuna auction of
 * 2019 (5 January, Toyosu market, Tokyo) a 278 kg Pacific bluefin went for
 * ¥333.6 million, about $3.1 million, to a sushi-chain boss who had expected
 * to pay ¥30–50 million. Told by a narrator (words.ts) over the game's tuna
 * powering through the sea, gulping sardines and anchovies, with a price tag
 * trailing from its fin. Every beat is timed to the words, a function of time
 * in seconds over a loop of LOOP_S (beats.ts has the sketched notes).
 *
 *   0     a winter morning fading out (lanterns, snow); the tuna gulps a
 *         sardine, its tag reads "$3,100,000"; "SOLD" stamped on "sold"
 *   3.0   "One bluefin tuna": named; "278 kilos": a scale's needle swings round
 *   6.6   "…the first auction of 2019 in Tokyo": bidding paddles pop up
 *         faster and faster, the yen climbing to ¥333,600,000; "2019"
 *         stamped; on "Tokyo" the gavel slams (the payoff) and "TOKYO" lands
 *   9.3   "The first tuna of the year": a "1st" rosette; "luck": a lucky cat
 *         waves; "headlines": a newspaper spins in
 *   12.3  "so a sushi boss kept on bidding": a sketched bidder raises his
 *         paddle again and again
 *   14.6  "He'd planned to pay a fraction of that": planned vs paid, as bars
 *   16.7  "But on that winter morning,": snow and lanterns, and the loop
 *         finishes the sentence.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
/** Time since `at`, folded into [-LOOP_S/2, LOOP_S/2): negative before it, round the loop. */
export const since = (t: number, at: number): number => wrap(t - at + LOOP_S / 2) - LOOP_S / 2;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const SOLD_AT = said('sold');
export const MILLION_AT = said('MILLION');
export const DOLLARS_AT = said('dollars.');
export const BLUEFIN_AT = said('bluefin');
export const TWO_AT = said('two');
export const HUNDRED_AT = said('hundred');
export const SEVENTY_AT = said('seventy-eight');
export const KILOS_AT = said('kilos,');
export const AT_AT = said('at');
export const AUCTION_AT = said('auction');
export const YEAR_AT = said('2019');
export const TOKYO_AT = said('Tokyo.');
export const FIRST_TUNA_AT = said('first', 2);
export const LUCK_AT = said('luck,');
export const HEADLINES_AT = said('headlines,');
export const SO_AT = said('so');
export const SUSHI_AT = said('sushi');
export const KEPT_AT = said('kept');
export const ON_AT = said('on');
export const BIDDING_AT = said('bidding.');
export const HED_AT = said("He'd");
export const PLANNED_AT = said('planned');
export const FRACTION_AT = said('fraction');
export const BUT_AT = said('But');
export const WINTER_AT = said('winter');

/** The payoff: the gavel comes down as the narrator says "Tokyo". */
export const SLAM_AT = TOKYO_AT + 0.02;

// ---------------------------------------------------------------- the tuna

/** A fish on screen. `face` is -1 (left) or 1 (right). */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: -1 | 1;
  /** Nose up, radians (as drawSwimmer takes it). */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
  /** A swallowed meal's swelling, 0 .. 1. */
  readonly lump: number;
}

/** Where the tuna holds station, powering left against the stream (the camera keeps up with it). */
export const TUNA = { x: 575, y: 865, len: 600 } as const;

/** Its meals, gulped at these moments: one every ~2.3 s, none while the gavel falls. */
export const EATS: readonly number[] = [0.3, 2.7, 5.2, 10.0, 12.3, 14.4, 16.4];
/** How long a meal is dragged into its mouth before the jaws shut. */
export const SUCK_S = 0.3;
const LUNGE_S = 0.5;

/** The meal nearest to t: which one and the time since it was gulped (negative before), round the loop. */
function nearestEat(t: number): { readonly i: number; readonly u: number } {
  let best = { i: 0, u: Infinity };
  EATS.forEach((at, i) => {
    const u = since(t, at);
    if (Math.abs(u) < Math.abs(best.u)) best = { i, u };
  });
  return best;
}

/** A push forward (to the left) as it strikes, 0 .. 1. */
const lungeAt = (u: number): number => (u < 0 ? smooth(1 + u / LUNGE_S) : 1 - ramp(u, 0.05, 0.7));

export function tunaAt(t: number): Fish {
  const { u } = nearestEat(t);
  const lunge = lungeAt(u);
  const jaw = u < 0 ? 0.85 * ramp(u, -0.5, -SUCK_S) : 0.85 * (1 - ramp(u, 0, 0.07));
  const w = (2 * Math.PI * t) / LOOP_S;
  return {
    x: TUNA.x + 28 * Math.sin(2 * w) - 45 * lunge,
    y: TUNA.y + 24 * Math.sin(3 * w + 1),
    len: TUNA.len,
    face: -1,
    tilt: 0.035 * Math.cos(3 * w + 1) + 0.03 * lunge,
    beat: 34 * w,
    effort: 0.55 + 0.4 * lunge,
    jaw: Math.max(0, jaw),
    lump: u >= 0 && u < 1.6 ? 0.5 * ramp(u, 0, 0.25) * (1 - ramp(u, 0.6, 1.6)) : 0,
  };
}

/** Where its mouth is (chain.ts's NOSE: the lips sit 0.46 body lengths ahead of the centre). */
export function tunaMouth(f: Fish): { readonly x: number; readonly y: number } {
  return { x: f.x + f.face * Math.cos(f.tilt) * 0.46 * f.len, y: f.y - Math.sin(f.tilt) * 0.46 * f.len };
}

// ---------------------------------------------------------------- the meals

export type PreyShape = 'sardine' | 'anchovy';
const PREY_LEN: Readonly<Record<PreyShape, number>> = { sardine: 135, anchovy: 120 };
/** How long a meal is on screen before it is caught: it drifts in from the left, outswum. */
const APPROACH_S = 1.9;

export interface Prey extends Fish {
  readonly shape: PreyShape;
  /** How far it has been dragged into the tuna's mouth, 0 .. 1 (null while it isn't). */
  readonly eaten: number | null;
}

/** Meal i (null when it isn't on screen): a sardine or an anchovy fleeing left, slower than the tuna. */
export function preyAt(i: number, t: number): Prey | null {
  const u = since(t, EATS[i]!);
  if (u < -APPROACH_S || u >= 0) return null;
  const shape: PreyShape = i % 2 === 0 ? 'sardine' : 'anchovy';
  const len = PREY_LEN[shape];
  const tuna = tunaAt(t);
  const mouth = tunaMouth(tuna);
  // Caught just ahead of the lips, then dragged in.
  const caught = { x: mouth.x - 0.42 * len, y: mouth.y + 6 };
  const k = clamp01((u + APPROACH_S) / (APPROACH_S - SUCK_S));
  const dodge = (i % 3) - 1;
  const start = { x: -170, y: mouth.y - 120 + 110 * dodge };
  const e = 1 - (1 - k) ** 1.4;
  return {
    shape,
    x: lerp(start.x, caught.x, e),
    y: lerp(start.y, caught.y, e) + 14 * Math.sin(u * 9 + i) * (1 - k),
    len,
    face: -1,
    tilt: 0.12 * Math.sin(u * 7 + i) * (1 - k),
    beat: u * 26 + i,
    effort: 0.6 + 0.4 * k,
    jaw: 0,
    lump: 0,
    eaten: u >= -SUCK_S ? (u + SUCK_S) / SUCK_S : null,
  };
}

/** Water rushing into the open mouth just before each gulp. */
export const suctionAt = (t: number): number => {
  const { u } = nearestEat(t);
  return u < 0 ? ramp(u, -0.55, -SUCK_S) : 1 - ramp(u, 0, 0.05);
};
/** The ink burst of a gulp, 0 .. 1 over its life (outside: none). */
export const chompAt = (t: number): number => nearestEat(t).u / 0.16;

// ---------------------------------------------------------------- the price tag

/** It trails from the tuna's back on a string, fluttering in the stream. */
export const STRING_LEN = 125;

/** The string's angle (radians, screen y down: negative is up), from where it's tied, back and up from the tuna. */
export function stringAngle(t: number): number {
  const w = (2 * Math.PI * t) / LOOP_S;
  const { u } = nearestEat(t);
  return -0.6 + 0.07 * Math.sin(5 * w) + 0.05 * Math.sin(7 * w + 1) + 0.12 * lungeAt(u);
}

/** The tag's little jump, 0 .. 1: on "sold", "MILLION" and the gavel. */
export function tagPop(t: number): number {
  const bump = (at: number): number => Math.max(0, Math.sin(Math.PI * clamp01((t - at) / 0.35)));
  return Math.max(bump(SOLD_AT), bump(MILLION_AT), 0.8 * bump(SLAM_AT));
}

/** The red "SOLD" stamp on the tag: slapped on as the narrator says "sold", gone once the tuna is named. */
export function soldStampAt(t: number): number {
  return Math.min(ramp(t, SOLD_AT - 0.02, SOLD_AT + 0.04), 1 - ramp(t, BLUEFIN_AT + 0.1, BLUEFIN_AT + 0.4));
}

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
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
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

/** Each gulp: water rushing in, then the gulp (quiet: the voice does the talking). */
export const EAT_SOUNDS: readonly SoundCue[] = EATS.flatMap((at): SoundCue[] => [
  { id: 'suck', t: wrap(at - 0.55), pitch: 1.5, gain: 0.07, pan: -0.4 },
  { id: 'eat', t: at, pitch: 1.1, gain: 0.26, pan: -0.4 },
]);
