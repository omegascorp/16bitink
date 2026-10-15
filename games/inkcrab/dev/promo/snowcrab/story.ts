import type { SfxId } from '../../../src/audio/recipes';
import { lerp, ramp, window01 } from '../short';
import { CRABS, crabAt, REFILL_FROM } from './field';
import {
  A_AT, ALASKA_AT, ALASKAS_AT, BERING_AT, BURN_AT, CANCELLED_AT, COUNT_AT, DISAPPEARED_AT, DISAPPEARED_END, ENERGY_AT, EVER_AT, EVER_END,
  FIRST_AT, HEATWAVE_AT, ICY_AT, IN_AT, LOOP_S, SAYS_AT, SEA_AT, SEASON_END, SNOW2_AT, SNOW_AT, STARVED_AT, THE_COUNT_AT,
  VANISHED_AT, VANISHED_END, WARM_AT, WARMED_AT, WATER_END, Y2018_AT, Y2022_AT, YEAR_TICKS,
} from './timing';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "Ten billion crabs vanished": the snow crabs of the eastern Bering Sea,
 * 2018–2021 (Szuwalski et al., Science 2023), and the first cancelled season
 * (2022). Told by a narrator (words.ts) over a cold seafloor, every beat timed
 * to the words, a function of time in seconds over a loop of LOOP_S.
 * Serious throughout: no jokes, no comic sounds, and no dead crabs, only
 * crabs fading to empty outlines (field.ts).
 *
 *   0     a field of snow crabs, "10,000,000,000" and "snow crabs vanished"
 *         over it, the back rows already fading to outlines
 *   2.5   "Between 2018 and 2021": a year counter ticks 2018 → 2021, a few
 *         crabs going each year
 *   5.0   "snow crabs": a callout on a front crab; "Alaska's": a map card of
 *         Alaska; "Bering Sea": a pin; "disappeared": the last crab goes
 *   8.3   "A marine heatwave": a thermometer, the label; "warmed": it rises
 *         blue to red and the water warms; "icy water": the ice crystals in
 *         the water melt to nothing
 *   10.9  "warm crabs burn more energy": one crab walks in under an energy
 *         bar, which drains from "burn"; "starved": the bar is empty and the
 *         crab fades to an outline
 *   14.4  "In 2022, Alaska…": a fishing notice; "cancelled": a red stamp
 *         thuds down (the payoff); "first time EVER" written under it
 *   19.0  "The count still says:": the notice drops away, the field fills
 *         again and "10,000,000,000" is written back, and the loop finishes
 *         the sentence.
 */
export { LOOP_S };

/** Something already up at the loop point: 1 there, written in again from `from` near the end. */
const kept = (t: number, out: number, outS: number, back: number, backS: number): number =>
  t < LOOP_S / 2 ? 1 - ramp(t, out, out + outS) : ramp(t, back, back + backS);

// ---------------------------------------------------------------- the hook's header

/** "10,000,000,000": up through the hook, gone for the years, written back on "count". */
export const numberAt = (t: number): number => kept(t, VANISHED_END + 0.1, 0.35, COUNT_AT - 0.05, 0.45);
/** "snow crabs vanished" under it: written back on "says". */
export const vanishedAt = (t: number): number => kept(t, VANISHED_END + 0.1, 0.35, SAYS_AT - 0.05, 0.4);
/** A red underline drawn under "vanished" as it is said. */
export const underlineAt = (t: number): number => (t < LOOP_S / 2 ? ramp(t, VANISHED_AT - 0.05, VANISHED_AT + 0.35) * (1 - ramp(t, VANISHED_END + 0.1, VANISHED_END + 0.45)) : 0);

// ---------------------------------------------------------------- the years

export const yearsAt = (t: number): number => window01(t, Y2018_AT - 0.3, ALASKAS_AT - 0.1, 0.3);
/** The year on the counter (2018 .. 2021) and how far it has rolled to it, 0 .. 1. */
export function yearAt(t: number): { readonly year: number; readonly roll: number } {
  let k = 0;
  YEAR_TICKS.forEach((at, i) => {
    if (t >= at - 0.12) k = i;
  });
  return { year: 2018 + k, roll: k === 0 ? 1 : ramp(t, YEAR_TICKS[k]! - 0.12, YEAR_TICKS[k]! + 0.12) };
}

// ---------------------------------------------------------------- the field

/** The labelled crab's callout, "snow crab", from "snow crabs" until it goes. */
export const crabLabelAt = (t: number): number => window01(t, SNOW_AT - 0.05, DISAPPEARED_AT + 0.4, 0.2);

/** How many crabs are there (body over half), for the tests. */
export const crabsShown = (t: number): number => CRABS.filter((c) => crabAt(c, t).body > 0.5).length;
export const outlinesShown = (t: number): number => CRABS.filter((c) => crabAt(c, t).ghost > 0.3).length;

// ---------------------------------------------------------------- the map

/** The map card, 0 .. 1: dropped in on "Alaska's", away after "disappeared". */
export const mapAt = (t: number): number => window01(t, ALASKAS_AT - 0.3, DISAPPEARED_END + 0.4, 0.35);
/** What is written on the card is wiped once the card has gone, so the loop starts clean. */
const mapWiped = (t: number): number => 1 - ramp(t, DISAPPEARED_END + 0.4, DISAPPEARED_END + 0.8);
export const alaskaLabelAt = (t: number): number => ramp(t, ALASKAS_AT - 0.05, ALASKAS_AT + 0.4) * mapWiped(t);
/** The pin, 0 .. ~1.2 with an overshoot as it lands on "Bering". */
export function pinAt(t: number): number {
  const u = t - (BERING_AT - 0.15);
  if (u <= 0) return 0;
  return (u < 0.15 ? lerp(0, 1.25, u / 0.15) : lerp(1.25, 1, ramp(u, 0.15, 0.35))) * mapWiped(t);
}
export const seaLabelAt = (t: number): number => ramp(t, BERING_AT, SEA_AT + 0.2) * mapWiped(t);
/** A ring spreading from the pin, once as it lands and once on "disappeared". */
export const pinRingAt = (t: number): number => {
  const u = (t - BERING_AT) / 0.9;
  return u >= 0 && u <= 1 ? u : (t - DISAPPEARED_AT) / 0.9;
};

// ---------------------------------------------------------------- the heatwave

/** The thermometer, 0 .. 1: in on "A marine heatwave", out after "starved". */
export const thermoAt = (t: number): number => window01(t, A_AT - 0.2, STARVED_AT + 0.6, 0.35);
/** How hot, 0 (cold, blue) .. 1 (red): up on "warmed", reset once the thermometer has gone. */
export const heatAt = (t: number): number => 0.18 + 0.72 * ramp(t, WARMED_AT - 0.05, WATER_END) * (1 - ramp(t, STARVED_AT + 0.6, STARVED_AT + 1.2));
export const heatwaveLabelAt = (t: number): number => window01(t, HEATWAVE_AT - 0.05, STARVED_AT + 0.6, 0.25);
/** The warm wash over the water, 0 .. 1. */
export const warmthAt = (t: number): number => ramp(t, WARMED_AT, WATER_END + 0.2) * (1 - ramp(t, STARVED_AT + 0.4, ALASKA_AT));
/** "icy water": the ice crystals in the water ringed and named, then melted by the warmth. */
export const icyLabelAt = (t: number): number => window01(t, ICY_AT - 0.05, WARM_AT + 0.1, 0.2);
/** How icy the drifting flecks are, 1 (crystals) .. 0 (plain specks). */
export const iceAt = (t: number): number => 1 - ramp(t, ICY_AT + 0.1, WARM_AT) * (1 - ramp(t, IN_AT, REFILL_FROM));

// ---------------------------------------------------------------- one warm crab

/** The crab that walks in on "warm crabs": in (0 .. 1) and where it is. */
export const loneAt = (t: number): { readonly body: number; readonly ghost: number; readonly x: number } => ({
  body: ramp(t, WARM_AT - 0.1, WARM_AT + 0.35) * (1 - ramp(t, STARVED_AT, STARVED_AT + 0.5)),
  ghost: 0.75 * ramp(t, STARVED_AT + 0.05, STARVED_AT + 0.35) * (1 - ramp(t, STARVED_AT + 0.8, STARVED_AT + 1.6)),
  x: lerp(330, 470, ramp(t, WARM_AT - 0.1, WARM_AT + 0.9) * offstage(t)) + 6 * Math.sin(t * 3.1) * ramp(t, WARM_AT, WARM_AT + 0.5) * offstage(t),
});
/** 1 while the lone crab is about, 0 once even its outline has gone (it goes back to its mark for the next loop). */
const offstage = (t: number): number => 1 - ramp(t, STARVED_AT + 1.7, STARVED_AT + 2.1);
/** The energy bar over it: shown from "warm crabs", drained from "burn" to "starved". */
export const barAt = (t: number): number => window01(t, WARM_AT, STARVED_AT + 0.7, 0.25);
/** Its energy, 1 .. 0, filled again once the bar has gone. */
export const energyAt = (t: number): number =>
  1 - (ramp(t, BURN_AT - 0.05, ENERGY_AT + 0.7) * 0.55 + ramp(t, ENERGY_AT + 0.7, STARVED_AT) * 0.45) * (1 - ramp(t, STARVED_AT + 0.7, STARVED_AT + 1.3));
/** The heat shimmering off it while it burns. */
export const shimmerAt = (t: number): number => window01(t, WARM_AT, STARVED_AT + 0.1, 0.3);

// ---------------------------------------------------------------- the notice

/** The fishing notice, 0 .. 1: up on "In 2022", away on "The count". */
export const noticeAt = (t: number): number => window01(t, IN_AT - 0.2, THE_COUNT_AT + 0.15, 0.4);
/** What is written on the notice is wiped once it has gone, so the loop starts clean. */
const noticeWiped = (t: number): number => 1 - ramp(t, THE_COUNT_AT + 0.15, THE_COUNT_AT + 0.55);
export const noticeYearAt = (t: number): number => ramp(t, Y2022_AT - 0.05, Y2022_AT + 0.45) * noticeWiped(t);
export const noticeAlaskaAt = (t: number): number => ramp(t, ALASKA_AT - 0.05, ALASKA_AT + 0.4) * noticeWiped(t);
/** "snow crab season" underlined as it is said. */
export const seasonLineAt = (t: number): number => ramp(t, SNOW2_AT - 0.05, SEASON_END) * noticeWiped(t);
/** The stamp, 0 .. ~1.35: slammed down on "cancelled" with an overshoot. */
export function stampAt(t: number): number {
  const u = t - (CANCELLED_AT - 0.08);
  if (u <= 0) return 0;
  return (u < 0.08 ? lerp(1.8, 1, u / 0.08) : 1) * noticeWiped(t);
}
/** The notice jolting as the stamp lands. */
export const joltAt = (t: number): number => {
  const u = t - (CANCELLED_AT - 0.02);
  return u < 0 || u > 0.4 ? 0 : Math.sin(u * 45) * (1 - u / 0.4);
};
export const firstTimeAt = (t: number): number => ramp(t, FIRST_AT - 0.05, EVER_AT) * noticeWiped(t);
/** "EVER" underlined twice as it is said. */
export const everAt = (t: number): number => ramp(t, EVER_AT - 0.05, EVER_END + 0.1) * noticeWiped(t);

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
 * The game's effects, quiet under the voice and never playful: soft ticks for
 * the years, a soft thud for the pin, low uneasy chords for the heatwave and
 * "starved", a rush of water as cards come and go, and a heavy thud for the
 * stamp.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...YEAR_TICKS.map((at, i): SoundCue => ({ id: 'click', t: at, pitch: 0.55 - 0.04 * i, gain: 0.35, pan: 0 })),
  { id: 'gust', t: ALASKAS_AT - 0.45, pitch: 0.45, gain: 0.12, pan: -0.2 },
  { id: 'place', t: BERING_AT - 0.02, pitch: 0.8, gain: 0.3, pan: -0.3 },
  { id: 'dark', t: A_AT, pitch: 0.8, gain: 0.32, pan: 0 },
  { id: 'dark', t: STARVED_AT, pitch: 0.7, gain: 0.3, pan: 0 },
  { id: 'gust', t: IN_AT - 0.45, pitch: 0.4, gain: 0.12, pan: 0.2 },
  { id: 'caught', t: CANCELLED_AT, pitch: 0.55, gain: 0.55, pan: 0 },
  { id: 'place', t: CANCELLED_AT, pitch: 0.5, gain: 0.5, pan: 0 },
  { id: 'tide', t: REFILL_FROM - 0.3, pitch: 0.5, gain: 0.1, pan: 0 },
];

/** A soft, falling sine: the sound of something going quiet. */
export interface Fade {
  readonly t: number;
  readonly from: number;
  readonly to: number;
  readonly dur: number;
  readonly gain: number;
  readonly pan: number;
}

/** One for each wave of crabs going (on "vanished", each year, "disappeared"), and for the lone crab and the empty bar. */
export const FADES: readonly Fade[] = [
  // The hook's first, a moment into the loop (the first crabs began to go on "says:").
  { t: 0.35, from: 523, to: 440, dur: 1.4, gain: 0.05, pan: -0.3 },
  { t: VANISHED_AT, from: 440, to: 330, dur: 1.6, gain: 0.06, pan: 0.2 },
  ...YEAR_TICKS.map((at, i): Fade => ({ t: at + 0.08, from: 392 - 24 * i, to: 330 - 24 * i, dur: 1.1, gain: 0.04, pan: (i % 2 ? 0.3 : -0.3) })),
  { t: DISAPPEARED_AT + 0.1, from: 330, to: 220, dur: 2.0, gain: 0.07, pan: 0 },
  { t: STARVED_AT + 0.05, from: 294, to: 196, dur: 1.8, gain: 0.06, pan: 0 },
  { t: SAYS_AT, from: 587, to: 494, dur: 1.2, gain: 0.04, pan: 0.3 },
];

