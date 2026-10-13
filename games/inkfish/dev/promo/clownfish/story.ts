import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "Nemo's dad should have become his mom": clownfish are all born male and
 * rank by size, and when the female dies her mate turns female. Told by a
 * narrator (words.ts) over one anemone, every beat timed to the words, a
 * function of time in seconds over a loop of LOOP_S.
 *
 *   0     a barracuda gulps down "mom"; "dad" gets a "!", and on "…become his
 *         mom" his label is struck out for "mom" as he grows into her place
 *   2.5   "Every clownfish is born male": two eggs hatch, both ♂
 *   4.6   "…ranked by size": the fry take their places, numbered #1–#4;
 *         "female", "her mate", "waiting…" as the narrator names each
 *   13.4  "When the female dies": she rolls belly up and drifts away;
 *         "her mate turns into a female": everyone moves up a rank, his ♂ flips to ♀
 *   16.7  "So when the barracuda ate Nemo's mother,": the three left are
 *         labelled mom, dad and Nemo; the barracuda slides in and bites,
 *         and the loop finishes the sentence.
 *
 * Four clownfish play it, A to D, by their place at the loop's start: A is
 * "dad", B "Nemo", C and D hatch. At the loop point C has become A and D B,
 * so the end flows into the start.
 */
export const LOOP_S = 19.5;

/** The line boil steps at the game's 8 a second: 156 steps, 52 whole cycles a loop. */
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

export const BECOME_AT = said('become');
export const MOM_AT = said('mom.');
export const EVERY_AT = said('Every');
export const BORN_AT = said('born');
export const MALE_AT = said('male.');
export const ANEMONE_AT = said('anemone,');
export const RANKED_AT = said('ranked');
export const SIZE_AT = said('size:');
export const BIGGEST_AT = said('biggest');
export const FEMALE_AT = said('female,');
export const NEXT_AT = said('next');
export const MATE_AT = said('mate,');
export const REST_AT = said('rest');
export const WAITING_AT = said('waiting');
export const WHEN_AT = said('When');
export const DIES_AT = said('dies,');
export const TURNS_AT = said('turns');
export const TURNED_AT = said('female.');
export const SO_AT = said('So');
export const BARRACUDA_AT = said('barracuda');
export const ATE_AT = said('ate');
/** The barracuda's jaws shut on her as the narrator says "mother". */
export const BITE_AT = said('mother,') + 0.05;
/** How long she is dragged into its mouth before the jaws shut. */
export const SUCK_S = 0.3;

// ---------------------------------------------------------------- places

export interface Place {
  readonly x: number;
  readonly y: number;
  /** Body length on screen, px. */
  readonly len: number;
  /** 1 faces right, -1 left. */
  readonly face: number;
}

/** The ranks round the anemone, biggest first: left and right in turn, each a size smaller and nearer its tentacles. */
export const RANKS: readonly Place[] = [
  { x: 300, y: 560, len: 360, face: 1 },
  { x: 770, y: 690, len: 270, face: -1 },
  { x: 330, y: 885, len: 190, face: 1 },
  { x: 765, y: 950, len: 130, face: -1 },
];

/** The anemone (its disc's centre), the sand, and the rock with the clutch of eggs. */
export const ANEMONE = { x: 520, y: 1030 } as const;
export const FLOOR_Y = 1095;
export const EGGS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 862, y: 1050 }, { x: 884, y: 1043 }, { x: 906, y: 1049 }, { x: 928, y: 1042 },
  { x: 873, y: 1064 }, { x: 895, y: 1058 }, { x: 917, y: 1063 }, { x: 939, y: 1057 },
];
/** The two eggs that hatch: C's and D's. */
export const HATCHING = [5, 2] as const;
/** New eggs, laid by the new female, fill the gaps. */
export const LAID_AT = TURNED_AT + 0.7;

const FRY_LEN = 62;
/** Just hatched, each fry darts up a little off the rock. */
const FRY: readonly Place[] = [
  { x: 860, y: 990, len: FRY_LEN, face: -1 },
  { x: 950, y: 975, len: FRY_LEN, face: -1 },
];

export type Role = 'A' | 'B' | 'C' | 'D';
export const ROLES: readonly Role[] = ['A', 'B', 'C', 'D'];

interface Move {
  readonly from: number;
  readonly to: number;
  readonly place: Place;
}

/** Moving up a rank: on "become his mom", the fry on "ranked by size", everyone on "her mate turns into a female". */
const UP1 = { from: BECOME_AT, to: MOM_AT + 0.4 };
const SORT = { from: RANKED_AT - 0.2, to: SIZE_AT + 0.3 };
const UP2 = { from: TURNS_AT - 0.15, to: TURNED_AT + 0.4 };

const PATHS: Readonly<Record<Role, { readonly start: Place; readonly moves: readonly Move[] }>> = {
  A: { start: RANKS[1]!, moves: [{ ...UP1, place: RANKS[0]! }] },
  B: { start: RANKS[2]!, moves: [{ ...UP1, place: RANKS[1]! }, { ...UP2, place: RANKS[0]! }] },
  C: { start: FRY[0]!, moves: [{ ...SORT, place: RANKS[2]! }, { ...UP2, place: RANKS[1]! }] },
  D: { start: FRY[1]!, moves: [{ ...SORT, place: RANKS[3]! }, { ...UP2, place: RANKS[2]! }] },
};

/** When C and D hatch, popping out of their eggs. */
export const HATCH_AT: Readonly<Record<'C' | 'D', number>> = { C: BORN_AT, D: MALE_AT };
const POP_S = 0.3;

/** Where a role is in its path: its place, and how far through a move it is (0 when still). */
function placeOf(role: Role, t: number): { readonly place: Place; readonly moving: number } {
  const { start, moves } = PATHS[role];
  let place = start;
  let moving = 0;
  for (const m of moves) {
    if (t <= m.from) break;
    const u = smooth((t - m.from) / (m.to - m.from));
    if (u < 1) moving = Math.sin(Math.PI * u);
    place = {
      x: lerp(place.x, m.place.x, u),
      // Swimming up and over to the new place.
      y: lerp(place.y, m.place.y, u) - 50 * Math.sin(Math.PI * u),
      len: lerp(place.len, m.place.len, u),
      face: lerp(place.face, m.place.face, u),
    };
  }
  return { place, moving };
}

// ---------------------------------------------------------------- the clownfish

/** C goes on to play A, and D B, so each pair shares its bob and tail beat. */
const PHASE: Readonly<Record<Role, number>> = { A: 0.3, B: 2.1, C: 0.3, D: 2.1 };
const BOBS = 6;
const BEATS = 26;

export interface Clown {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** -1 (left) .. 1 (right): passes through 0 as it turns. */
  readonly face: number;
  /** 1 upright, -1 belly up. */
  readonly up: number;
  readonly alpha: number;
  readonly beat: number;
  readonly effort: number;
}

/** A dies on "dies": rolls belly up, drifts up and fades. */
const ROLL_S = 0.5;
const GONE_S = 2.2;

export function clownAt(role: Role, t: number): Clown | null {
  if (role === 'A' && t >= DIES_AT + GONE_S) return null;
  if (role === 'B' && t >= BITE_AT) return null;
  if ((role === 'C' || role === 'D') && t < HATCH_AT[role]) return null;
  const { place, moving } = placeOf(role, t);
  const phase = PHASE[role];
  const dead = role === 'A' ? ramp(t, DIES_AT, DIES_AT + ROLL_S) : 0;
  const pop = role === 'C' || role === 'D' ? ramp(t, HATCH_AT[role], HATCH_AT[role] + POP_S) : 1;
  // Fresh fry wriggle hard; everyone works their tail while moving up.
  const fry = role === 'C' || role === 'D' ? 1 - ramp(t, SORT.from, SORT.to) : 0;
  return {
    x: place.x,
    y: place.y + 7 * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S + phase) - 160 * ramp(t, DIES_AT + 0.3, DIES_AT + GONE_S) * (role === 'A' ? 1 : 0),
    len: place.len * (0.3 + 0.7 * pop),
    face: place.face,
    up: 1 - 2 * dead,
    alpha: pop * (1 - (role === 'A' ? ramp(t, DIES_AT + 0.8, DIES_AT + GONE_S) : 0)),
    beat: (2 * Math.PI * BEATS * t) / LOOP_S + phase * 3,
    effort: (0.3 + 0.6 * Math.max(moving, fry)) * (1 - dead),
  };
}

/** How far B has been dragged into the barracuda's mouth, 0 .. 1 (null when she isn't). */
export function eatenAt(t: number): number | null {
  const u = (t - (BITE_AT - SUCK_S)) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

// ---------------------------------------------------------------- badges, ranks, tags

export type Sex = 'male' | 'female';

/** ♂ or ♀ over each fish, flipping like a card from one to the other: A on "mom", B on "…into a female". */
const FLIPS: Partial<Record<Role, number>> = { A: MOM_AT, B: TURNED_AT };
const FLIP_S = 0.45;

export function badgeAt(role: Role, t: number): { readonly sex: Sex; readonly width: number } {
  const at = FLIPS[role];
  if (at === undefined) return { sex: 'male', width: 1 };
  const u = clamp01((t - at + FLIP_S / 2) / FLIP_S);
  return { sex: u < 0.5 ? 'male' : 'female', width: Math.abs(Math.cos(Math.PI * u)) };
}

/** Rank numbers, shown from "ranked by size" until the barracuda's story begins. */
export const rankShown = (t: number): number => window01(t, RANKED_AT - 0.1, SO_AT + 0.2, 0.3);

/** Each role's rank: a move up takes effect halfway through it. */
export function rankOf(role: Role, t: number): number {
  const first = { A: 2, B: 3, C: 3, D: 4 }[role];
  const ups = PATHS[role].moves.filter((m) => m.from !== SORT.from && t >= (m.from + m.to) / 2).length;
  return first - ups;
}

export interface Tag {
  readonly text: string;
  readonly alpha: number;
  /** A pen stroke through it, 0 .. 1 drawn. */
  readonly strike: number;
}

const tag = (text: string, alpha: number, strike = 0): Tag => ({ text, alpha, strike });
/** The film's names: on from "So…", off (for the hatchlings' story) on "Every". */
const named = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, EVERY_AT, EVERY_AT + 0.3) : ramp(t, SO_AT, SO_AT + 0.3));
const told = (t: number, from: number): number => window01(t, from - 0.05, WHEN_AT + 0.1, 0.25);

/**
 * The handwritten notes over a fish, left to right. Three acts: the film's
 * names at the start (until the hatchlings), the narrator's notes in the
 * middle, the names again from "So…".
 */
export function tagsAt(role: Role, t: number): readonly Tag[] {
  const act = t < EVERY_AT + 0.5 ? 'start' : t < SO_AT - 0.1 ? 'middle' : 'end';
  switch (role) {
    case 'A':
      if (act === 'start') return [tag('dad', named(t), ramp(t, BECOME_AT, BECOME_AT + 0.35)), tag('mom', named(t) * ramp(t, MOM_AT, MOM_AT + 0.3))];
      return [tag('female', told(t, FEMALE_AT))];
    case 'B':
      if (act === 'start') return [tag('Nemo', named(t))];
      if (act === 'middle') return [tag('her mate', told(t, MATE_AT))];
      return [tag('mom', named(t) * (1 - ramp(t, BITE_AT - SUCK_S, BITE_AT - 0.15)))];
    case 'C':
    case 'D':
      return act === 'end' ? [tag(role === 'C' ? 'dad' : 'Nemo', named(t))] : [tag('waiting…', told(t, WAITING_AT))];
  }
}

/** A ring pulsing round a fish as the narrator names it, 0 .. 1 over its life (outside that, none). */
const RING_AT: Readonly<Record<Role, number>> = { A: BIGGEST_AT, B: NEXT_AT, C: REST_AT, D: REST_AT + 0.12 };
export const ringAt = (role: Role, t: number): number => (t - RING_AT[role]) / 0.8;

/** The "!": B (mom) as the barracuda comes for her, and dad (C, then A after the loop point) once she's gone. */
export function alarmAt(role: Role, t: number): number {
  const pop = (u: number, hold: number): number => (u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.15, hold)));
  // Mom spots it as it looms over her, and keeps staring until it strikes.
  const spotted = BARRACUDA_AT + 0.5;
  if (role === 'B') return pop(t - spotted, BITE_AT - SUCK_S - spotted);
  const since = wrap(t - BITE_AT - 0.05);
  if (role === 'C' && t >= BITE_AT) return pop(since, 1.4);
  if (role === 'A' && t < LOOP_S / 2) return pop(since, 1.4);
  return 0;
}

// ---------------------------------------------------------------- eggs and the anemone

/** How much of each egg shows: the hatching two pop, and are laid again by the new female. */
export function eggAt(i: number, t: number): number {
  const which = HATCHING.indexOf(i as 5 | 2);
  if (which < 0) return 1;
  const hatch = HATCH_AT[which === 0 ? 'C' : 'D'];
  return t < hatch ? 1 : ramp(t, LAID_AT, LAID_AT + 0.6);
}

/** The ring of a hatching egg, 0 .. 1 over its life. */
export const hatchRingAt = (role: 'C' | 'D', t: number): number => (t - HATCH_AT[role]) / 0.5;

/** The tentacles sway a whole number of times a loop. */
export const SWAYS = 5;
/** The anemone swells as the narrator names it. */
export const anemonePulse = (t: number): number => Math.sin(Math.PI * clamp01((t - ANEMONE_AT + 0.1) / 0.9));

// ---------------------------------------------------------------- the barracuda

/**
 * It slides in high on the left on "barracuda", hangs over mom looking down
 * at her, cocks back on "ate", dives onto her, and swims off across the
 * top, past the loop point.
 */
const IN_AT = BARRACUDA_AT - 0.1;
export const BARRA_LEN = 780;
const OUT_S = 4.6;
const BITE_B = BITE_AT - IN_AT;
const COCK_B = ATE_AT - IN_AT;

const X_KEYS: readonly Key[] = [
  { t: 0, at: -520, rate: 650 },
  { t: COCK_B - 0.15, at: -40, rate: 50 },
  { t: COCK_B + 0.3, at: -80, rate: 0 },
  { t: BITE_B, at: 40, rate: 650 },
  { t: OUT_S, at: 1700, rate: 750 },
];
const Y_KEYS: readonly Key[] = [
  { t: 0, at: 250, rate: 0 },
  { t: COCK_B - 0.15, at: 290 },
  { t: COCK_B + 0.3, at: 270, rate: 0 },
  { t: BITE_B, at: 470, rate: 0 },
  { t: BITE_B + 1.1, at: 430 },
  { t: OUT_S, at: 360, rate: -30 },
];
/** Nose up is positive: level as it comes in, looking down at her, a steep dive, then level again. */
const TILT_KEYS: readonly Key[] = [
  { t: 0, at: 0.05, rate: 0 },
  { t: COCK_B - 0.15, at: -0.18 },
  { t: COCK_B + 0.3, at: -0.12, rate: 0 },
  { t: BITE_B - 0.1, at: -0.42 },
  { t: BITE_B + 0.7, at: 0.08 },
  { t: OUT_S, at: 0.05, rate: 0 },
];

export interface Barracuda {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
  /** Squash and stretch on the snap. */
  readonly snap: number;
  /** Mom in its belly. */
  readonly lump: number;
}

/** Since it came in, s (looping); null while it is off screen. */
const barraTime = (t: number): number | null => {
  const b = wrap(t - IN_AT);
  return b < OUT_S ? b : null;
};

export function barracudaAt(t: number): Barracuda | null {
  const b = barraTime(t);
  if (b === null) return null;
  const y = curveAt(Y_KEYS, b);
  const x = curveAt(X_KEYS, b);
  const snap = Math.sin(Math.PI * clamp01((b - BITE_B) / 0.25));
  const jaw = b < BITE_B ? ramp(b, COCK_B + 0.25, BITE_B - 0.12) : 1 - ramp(b, BITE_B, BITE_B + 0.06);
  return {
    x: x.at,
    y: y.at,
    tilt: curveAt(TILT_KEYS, b).at,
    beat: 2 * Math.PI * 2.4 * b,
    effort: 0.35 + 0.65 * ramp(x.rate, 100, 800),
    jaw: Math.max(0, jaw),
    snap,
    lump: b < BITE_B ? 0 : 0.7 * ramp(b, BITE_B, BITE_B + 0.3),
  };
}

/** Water rushing into its open mouth just before the bite. */
export const suctionAt = (t: number): number => window01(t, BITE_AT - 0.55, BITE_AT + 0.02, 0.15);
/** The ink burst of the bite, 0 .. 1 over its life. */
export const chompAt = (t: number): number => wrap(t - BITE_AT + 1) - 1;
/** A jolt of the picture on the bite, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t - BITE_AT);
  if (u > 0.3) return { x: 0, y: 0 };
  const fade = (1 - u / 0.3) ** 2;
  return { x: 12 * fade * Math.sin(u * 95), y: 8 * fade * Math.cos(u * 77) };
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
  { id: 'grow', t: BECOME_AT + 0.1, pitch: 1, gain: 0.22, pan: -0.1 },
  { id: 'click', t: MOM_AT, pitch: 0.9, gain: 0.45, pan: -0.3 },
  { id: 'drop', t: BORN_AT, pitch: 1.5, gain: 0.18, pan: 0.5 },
  { id: 'drop', t: MALE_AT, pitch: 1.7, gain: 0.18, pan: 0.6 },
  { id: 'rustle', t: ANEMONE_AT, pitch: 0.9, gain: 0.16, pan: 0 },
  { id: 'dash', t: SORT.from + 0.1, pitch: 1.3, gain: 0.08, pan: 0.2 },
  { id: 'click', t: BIGGEST_AT, pitch: 1.0, gain: 0.3, pan: -0.3 },
  { id: 'click', t: NEXT_AT, pitch: 1.1, gain: 0.3, pan: 0.3 },
  { id: 'click', t: REST_AT, pitch: 1.2, gain: 0.3, pan: 0 },
  { id: 'lose', t: DIES_AT, pitch: 1.0, gain: 0.12, pan: -0.3 },
  { id: 'grow', t: UP2.from + 0.1, pitch: 1.05, gain: 0.22, pan: 0 },
  { id: 'click', t: TURNED_AT, pitch: 0.9, gain: 0.45, pan: -0.3 },
  { id: 'dash', t: IN_AT + 0.05, pitch: 0.6, gain: 0.14, pan: -0.6 },
  { id: 'lunge', t: ATE_AT + 0.25, pitch: 0.8, gain: 0.35, pan: -0.4 },
  { id: 'suck', t: BITE_AT - SUCK_S - 0.05, pitch: 0.9, gain: 0.16, pan: -0.4 },
  { id: 'eatBig', t: BITE_AT, pitch: 1.0, gain: 0.5, pan: -0.4 },
  { id: 'spotted', t: BITE_AT + 0.05, pitch: 1.1, gain: 0.22, pan: 0.3 },
];
