import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import {
  FILMED_AT, FINS_AT, FOUR_AT, GET_AT, HUNT_AT, LOOP_S, MAHI_AT, METRES_AT, RECORD_AT, SEABIRDS_AT, SECONDS_AT, SPREAD_AT, TV_AT, UP_AT,
  WINGS_AT, WINGS_END, YEAR_AT,
} from './beats';
import { BREACHES, DIVES, FLICKS } from './flight';
import { GANNET_IN, MAHI_IN, MAHI_SNAP, PLUNGE_AT } from './hunters';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish flew for forty-five seconds": the record flying fish glide,
 * filmed by a Japanese TV crew from a ferry off Yakushima in May 2008.
 * Told by a narrator (words.ts) over a cross-section of the sea that follows
 * the fish (flight.ts), with the hunters it flies from (hunters.ts). This
 * file has the notes inked over it, the captions and the sounds.
 *
 *   0     mid-glide, a stopwatch racing 0 → 45 s by "seconds."
 *   2.3   "A Japanese TV crew filmed the record in 2008": a ferry sails in, a
 *         camera on deck tracking the fish, a REC frame round it, and a
 *         "record 45 s · 2008" badge
 *   6.0   it drops back into the sea; "burst out of the water": it breaks out
 *   8.7   "spread their fins like wings": they unfold, inked orange: fins = wings
 *   10.9  "flick their tails on the waves": a zigzag of splashes
 *   12.7  "up to four hundred metres": a ruler runs out to 400 m
 *   14.6  back in the sea: "Mahi-mahi hunt them from below", "and seabirds
 *         from above": a gannet plunges in; "!"
 *   18.5  "To get away,": it bursts out, wings open, into the opening glide.
 */
export { LOOP_S } from './beats';

// ---------------------------------------------------------------- the stopwatch and the record

/** The stopwatch, shown from the escape until the ferry has gone. */
export const STOPWATCH_HIDE = { from: YEAR_AT + 0.9, to: YEAR_AT + 1.3 } as const;
export const STOPWATCH_SHOW = { from: GET_AT + 0.35, to: GET_AT + 0.6 } as const;

export function stopwatchAt(t: number): { readonly alpha: number; readonly seconds: number } {
  const alpha = t < LOOP_S / 2 ? 1 - ramp(t, STOPWATCH_HIDE.from, STOPWATCH_HIDE.to) : ramp(t, STOPWATCH_SHOW.from, STOPWATCH_SHOW.to);
  // Fast-forward through the flight: 45 s gone by the time the narrator says "seconds."
  const u = clamp01(t / (SECONDS_AT + 0.25));
  const seconds = t < LOOP_S / 2 ? 45 * (u < 1 ? u * (1.6 - 0.6 * u) : 1) : 0;
  return { alpha, seconds };
}

/** The record badge: on "record", the year on "2008". */
export function badgeAt(t: number): { readonly alpha: number; readonly year: number } {
  return {
    alpha: window01(t, RECORD_AT - 0.05, STOPWATCH_HIDE.to, 0.3),
    year: window01(t, YEAR_AT - 0.05, STOPWATCH_HIDE.to, 0.25),
  };
}

/** The camera crew: their camera from "TV", recording (the REC frame round the fish) from "filmed". */
export const cameraAt = (t: number): number => window01(t, TV_AT - 0.2, YEAR_AT + 0.85, 0.3);
export const recAt = (t: number): number => window01(t, FILMED_AT - 0.1, DIVES[0] - 0.2, 0.2);

// ---------------------------------------------------------------- fins, ruler, labels

/** The wings inked orange from "fins", the note "fins" then "= wings". */
export const wingGlowAt = (t: number): number => window01(t, FINS_AT - 0.1, WINGS_END + 0.6, 0.2) * (0.75 + 0.25 * Math.cos(2 * Math.PI * 2 * (t - FINS_AT)));
export function finsNoteAt(t: number): { readonly fins: number; readonly wings: number } {
  return { fins: window01(t, FINS_AT - 0.05, WINGS_END + 0.7, 0.2), wings: window01(t, WINGS_AT - 0.05, WINGS_END + 0.7, 0.2) };
}

/** The 400 m ruler, from "up to" until the mahi comes. */
export const rulerAt = (t: number): number => window01(t, UP_AT - 0.25, MAHI_AT + 0.4, 0.3);
/** How far along the ruler the marker is, m: racing out on "four hundred", there on "metres". */
export const metresAt = (t: number): number => 400 * ramp(t, FOUR_AT - 0.1, METRES_AT + 0.1);
/** "400 m!" circled when it gets there. */
export const fourHundredAt = (t: number): number => window01(t, METRES_AT, MAHI_AT + 0.4, 0.2);

/** The hunters' names, as the narrator says them. */
export const mahiLabelAt = (t: number): number => window01(t, MAHI_AT, SEABIRDS_AT + 0.2, 0.25);
export const gannetLabelAt = (t: number): number => window01(t, SEABIRDS_AT, PLUNGE_AT + 0.25, 0.2);

/** The fish's "!": it sees the mahi on "hunt", and keeps staring until it bursts out. */
export function alarmAt(t: number): number {
  const from = HUNT_AT;
  const to = BREACHES[1] - 0.05;
  if (t < from || t > to) return 0;
  const u = (t - from) / 0.12;
  const pop = u < 1 ? u * u * (3 - 2 * u) * 1.2 : 1 + 0.2 * Math.max(0, 1 - (u - 1) * 2);
  return pop * (1 - ramp(t, to - 0.12, to));
}

/** When the ruler's marker passes 100, 200, 300 and 400 m. */
export const RULER_TICKS: readonly number[] = [100, 200, 300, 400].map((m) => {
  let a = FOUR_AT - 0.1;
  let b = METRES_AT + 0.1;
  for (let i = 0; i < 40; i++) {
    const mid = (a + b) / 2;
    if (metresAt(mid) < m - 0.5) a = mid;
    else b = mid;
  }
  return b;
});

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
  // The stopwatch ticking through 45 s.
  ...Array.from({ length: 8 }, (_, i): SoundCue => ({ id: 'click', t: 0.05 + i * 0.25, pitch: 1.5 + 0.05 * i, gain: 0.16, pan: 0.5 })),
  { id: 'click', t: RECORD_AT, pitch: 1.0, gain: 0.35, pan: -0.3 },
  { id: 'powerup', t: YEAR_AT + 0.05, pitch: 1.0, gain: 0.12, pan: -0.3 },
  { id: 'splash', t: DIVES[0], pitch: 1.0, gain: 0.3, pan: 0 },
  { id: 'dash', t: BREACHES[0] - 0.25, pitch: 1.2, gain: 0.2, pan: 0 },
  { id: 'splash', t: BREACHES[0], pitch: 1.15, gain: 0.35, pan: 0 },
  { id: 'rustle', t: SPREAD_AT + 0.05, pitch: 1.3, gain: 0.18, pan: -0.2 },
  { id: 'click', t: FINS_AT, pitch: 1.1, gain: 0.25, pan: -0.2 },
  ...FLICKS.map((t, i): SoundCue => ({ id: 'drop', t, pitch: 1.3 + 0.1 * (i % 3), gain: 0.16, pan: -0.3 })),
  // The ruler's marker passing 100, 200, 300 and 400 m.
  ...[1, 2, 3, 4].map((i): SoundCue => ({ id: 'click', t: RULER_TICKS[i - 1]!, pitch: 1.2 + 0.1 * i, gain: 0.2, pan: 0.2 * (i - 2) })),
  { id: 'splash', t: DIVES[1], pitch: 0.95, gain: 0.3, pan: 0 },
  { id: 'dash', t: MAHI_IN + 0.1, pitch: 0.7, gain: 0.16, pan: -0.6 },
  { id: 'spotted', t: HUNT_AT, pitch: 1.1, gain: 0.18, pan: 0.1 },
  { id: 'squawk', t: GANNET_IN + 0.2, pitch: 0.85, gain: 0.16, pan: 0.6 },
  { id: 'splash', t: PLUNGE_AT, pitch: 0.8, gain: 0.35, pan: 0.2 },
  { id: 'lunge', t: MAHI_SNAP - 0.35, pitch: 0.85, gain: 0.25, pan: -0.3 },
  { id: 'clang', t: MAHI_SNAP, pitch: 1.6, gain: 0.08, pan: -0.3 },
  { id: 'dash', t: BREACHES[1] - 0.2, pitch: 1.3, gain: 0.22, pan: 0.1 },
  { id: 'splash', t: BREACHES[1], pitch: 1.2, gain: 0.35, pan: 0.1 },
];
