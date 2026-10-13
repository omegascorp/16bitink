import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish has no face": the faceless cusk (Typhlonus nasus), 4 km down,
 * found by HMS Challenger in the 1870s and hauled up again by CSIRO's RV
 * Investigator off Australia in 2017. Told by a narrator (words.ts), every
 * beat timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     close on its blank head, hanging in the research ship's net under
 *         the deck lamp, wriggling, an inked "?" where its face should be
 *   2.2   "The faceless cusk lives four kilometres down": it slips through the
 *         mesh and dives home, the depth counting to 4,000 m
 *   4.9   "…where there's no light at all": the dark closes in
 *   6.6   "Its tiny eyes are buried under its skin": an X-ray lens on its head
 *         finds them; "…its mouth is tucked underneath": the lens slides down
 *         to its chin, it tips its nose up, an arrow points at the mouth
 *   11.4  "Scientists first found it in the 1870s": pulled right back, the
 *         whole 4 km, HMS Challenger at the top, her dredge down to the fish
 *   14    "When Australian researchers hauled one up again in 2017,": RV
 *         Investigator takes her place, drops a net, hauls it up fast, the
 *         camera riding up with it; out of the water it swings to the stern
 *   17.4  "…they took one look and realised:": the deck lamp swings onto its
 *         head, the close-up, and the loop finishes the sentence.
 *
 * World units are px at zoom 1: y points down, the sea's surface at 0, the
 * seafloor at FLOOR_Y (4,000 m). The fish's position is its body's centre.
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

export const FACE_AT = said('face.');
export const CUSK_AT = said('cusk');
export const FOUR_AT = said('four');
export const DOWN_AT = said('down,');
export const LIGHT_AT = said('light');
export const ALL_AT = said('all.');
export const ITS_AT = said('Its');
export const TINY_AT = said('tiny');
export const EYES_AT = said('eyes');
export const BURIED_AT = said('buried');
export const UNDER_AT = said('under');
export const SKIN_AT = said('skin,');
export const AND_AT = said('and');
export const MOUTH_AT = said('mouth');
export const TUCKED_AT = said('tucked');
export const UNDERNEATH_AT = said('underneath.');
export const SCIENTISTS_AT = said('Scientists');
export const FOUND_AT = said('found');
export const SEVENTIES_AT = said('1870s.');
export const WHEN_AT = said('When');
export const AUSTRALIAN_AT = said('Australian');
export const HAULED_AT = said('hauled');
export const YEAR_AT = said('2017,');
export const THEY_AT = said('they');
export const LOOK_AT = said('look');
export const REALISED_AT = said('realised:');

/** The fish, nose to tail. */
export const FISH_LEN = 500;
/** 4,000 m, drawn 0.45 px a metre. */
export const DEPTH_M = 4000;
export const FLOOR_Y = 1800;
/** It hovers this far over the seafloor (its centre). */
export const BOTTOM_Y = FLOOR_Y - 0.3 * FISH_LEN;
/** How high over the sea it hangs in the net. */
export const HANG = 210;

/** The stern's A-frame: the sheave at its top the net's warp runs over, and the deck lamp on its leg. */
export const SHEAVE = { x: 0, y: -HANG - 300 } as const;
export const LAMP = { x: -60, y: -HANG - 180 } as const;

// ---------------------------------------------------------------- the fish

/** It slips through the net on "The…", dives in, and is down on "…down,". */
export const DROP_FROM = said('The') - 0.05;
export const ENTRY_AT = DROP_FROM + 0.4;
export const LAND_AT = DOWN_AT + 0.25;
/** The net comes down on "Australian", reaches it just before "hauled", and breaks the surface on "2017". */
export const NET_DROP_FROM = AUSTRALIAN_AT + 0.25;
export const NET_LAND_AT = HAULED_AT - 0.08;
export const BREACH_AT = YEAR_AT + 0.35;
export const HUNG_AT = BREACH_AT + 0.6;

const FISH_Y: readonly Key[] = [
  { t: 0, at: -HANG, rate: 0 },
  { t: DROP_FROM, at: -HANG, rate: 0 },
  { t: ENTRY_AT, at: 0, rate: 800 },
  { t: LAND_AT, at: BOTTOM_Y, rate: 0 },
  { t: HAULED_AT, at: BOTTOM_Y, rate: 0 },
  { t: BREACH_AT, at: 0, rate: -1500 },
  { t: HUNG_AT, at: -HANG, rate: 0 },
  { t: LOOP_S, at: -HANG, rate: 0 },
];

const NET_Y: readonly Key[] = [
  { t: 0, at: -HANG, rate: 0 },
  { t: NET_DROP_FROM, at: -HANG, rate: 0 },
  { t: NET_LAND_AT, at: BOTTOM_Y, rate: 0 },
];

/** Nose up is positive: level in the net, nose down for the dive, nose up to show its chin. */
const TILT: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: DROP_FROM, at: 0, rate: 0 },
  { t: DROP_FROM + 0.45, at: -0.75 },
  { t: LAND_AT - 0.6, at: -0.45 },
  { t: LAND_AT + 0.35, at: 0, rate: 0 },
  { t: MOUTH_AT - 0.05, at: 0, rate: 0 },
  { t: UNDERNEATH_AT, at: 0.45, rate: 0 },
  { t: UNDERNEATH_AT + 0.75, at: 0.45, rate: 0 },
  { t: SCIENTISTS_AT + 0.45, at: 0, rate: 0 },
  { t: LOOP_S, at: 0, rate: 0 },
];

/** Wriggling hard in the net, calmer at home, fighting again when caught. */
const EFFORT: readonly Key[] = [
  { t: 0, at: 0.9, rate: 0 },
  { t: DROP_FROM, at: 0.9 },
  { t: ENTRY_AT + 0.3, at: 0.65 },
  { t: LAND_AT + 0.6, at: 0.3, rate: 0 },
  { t: HAULED_AT, at: 0.3, rate: 0 },
  { t: HAULED_AT + 0.3, at: 0.95 },
  { t: LOOP_S, at: 0.9, rate: 0 },
];

/** Tail beats a loop (about two a second), the net's swings and its little bobs at home: whole numbers, so they loop. */
const BEATS = 39;
const SWINGS = 9;
const SWING = 0.05;
const BOBS = 5;
const WRIGGLES = 13;
/** The knot the net hangs from, above its centre. */
export const PIVOT = -SHEAVE.y - HANG;

export const fishY = (t: number): { readonly at: number; readonly rate: number } => curveAt(FISH_Y, t);

/** How much it hangs from the A-frame, 0 .. 1 (1 well out of the water). */
const hanging = (y: number): number => clamp01(-y / HANG);

/** The net's swing from the sheave, radians. */
export const swingAt = (t: number, y: number): number => SWING * hanging(y) * Math.sin((2 * Math.PI * SWINGS * t) / LOOP_S);

export interface FishPose {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** Is it in the net: before it slips out, and from when it is caught. */
export const inNet = (t: number): boolean => t < DROP_FROM + 0.2 || t >= HAULED_AT;

export function fishAt(t: number): FishPose {
  const y = fishY(t).at;
  const swing = swingAt(t, y);
  const home = clamp01((y - (BOTTOM_Y - 300)) / 300);
  return {
    x: -PIVOT * Math.sin(swing),
    y: y + 8 * home * Math.sin((2 * Math.PI * BOBS * t) / LOOP_S),
    tilt: curveAt(TILT, t).at + swing + 0.06 * hanging(y) * Math.sin((2 * Math.PI * WRIGGLES * t) / LOOP_S),
    beat: (2 * Math.PI * BEATS * t) / LOOP_S,
    effort: clamp01(curveAt(EFFORT, t).at),
  };
}

/** The net: hanging at the stern, dropped to the fish, then hauled up with it inside. */
export interface NetPose {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

export function netAt(t: number): NetPose {
  if (t >= HAULED_AT) {
    const f = fishAt(t);
    return { x: f.x, y: fishY(t).at, angle: swingAt(t, fishY(t).at) };
  }
  const y = curveAt(NET_Y, t).at;
  const angle = swingAt(t, y);
  return { x: -PIVOT * Math.sin(angle), y, angle };
}

/** When the empty net hits the water on its way down. */
export const NET_ENTRY_AT = (() => {
  let t = NET_DROP_FROM;
  while (t < NET_LAND_AT && curveAt(NET_Y, t).at < 0) t += 0.002;
  return t;
})();

/** The depth readout, metres: 0 at the surface (and above it) to 4,000 at home. */
export const metresAt = (t: number): number => DEPTH_M * clamp01(fishY(t).at / BOTTOM_Y + 1e-9);

// ---------------------------------------------------------------- the ships

/** HMS Challenger (1870s) in RV Investigator's place: swapped in while the camera is deep, out on "When…". */
export const challengerAt = (t: number): number => Math.min(ramp(t, 10.6, 10.65), 1 - ramp(t, WHEN_AT, WHEN_AT + 0.5));

/** Challenger's dredge goes down on "first found", and drags along the bottom towards the fish. */
const DREDGE_FROM = said('first');
const DREDGE_DOWN = FOUND_AT + 0.6;
export const DREDGE_TOP = { x: -560, y: 0 } as const;
export function dredgeAt(t: number): { readonly x: number; readonly y: number } | null {
  if (t < DREDGE_FROM || challengerAt(t) <= 0) return null;
  const down = ramp(t, DREDGE_FROM, DREDGE_DOWN);
  const drag = ramp(t, DREDGE_DOWN, WHEN_AT + 0.5);
  return { x: -560 + 120 * down + 220 * drag, y: (FLOOR_Y - 20) * down };
}

/** The deck lamp's aim, radians (0 points right, π/2 straight down): on its head, down at the water while it's away, swung back on "look". */
const aimAt = (p: { readonly x: number; readonly y: number }): number => Math.atan2(p.y - LAMP.y, p.x - LAMP.x);
export const AIM_HEAD = aimAt({ x: 0.36 * FISH_LEN, y: -HANG - 0.02 * FISH_LEN });
export const AIM_WATER = aimAt({ x: 40, y: -10 });
const LAMP_KEYS: readonly Key[] = [
  { t: 0, at: AIM_HEAD, rate: 0 },
  { t: DROP_FROM, at: AIM_HEAD, rate: 0 },
  { t: ENTRY_AT + 0.1, at: AIM_WATER, rate: 0 },
  { t: LOOK_AT - 0.1, at: AIM_WATER, rate: 0 },
  { t: LOOK_AT + 0.35, at: AIM_HEAD + 0.1, rate: 0 },
  { t: LOOK_AT + 0.75, at: AIM_HEAD - 0.035, rate: 0 },
  { t: LOOK_AT + 1.15, at: AIM_HEAD + 0.01, rate: 0 },
  { t: LOOP_S, at: AIM_HEAD, rate: 0 },
];
export const lampAimAt = (t: number): number => curveAt(LAMP_KEYS, t).at;

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Close on its head; back for the dive; close again at home; the whole 4 km for the history. */
export const CLOSE = 2.4;
/** The pull back to the whole 4 km, over "Scientists first found". */
const PULL_FROM = SCIENTISTS_AT - 0.4;
const PULL_TO = FOUND_AT + 0.45;
const DIVE = 1.15;
const HOME = 2.0;
export const SECTION = 0.35;
const ZOOM: readonly Key[] = [
  { t: 0, at: Math.log(CLOSE), rate: 0 },
  { t: DROP_FROM, at: Math.log(CLOSE), rate: 0 },
  { t: DROP_FROM + 0.8, at: Math.log(DIVE), rate: 0 },
  { t: LAND_AT - 0.2, at: Math.log(DIVE), rate: 0 },
  { t: ALL_AT, at: Math.log(HOME), rate: 0 },
  { t: PULL_FROM, at: Math.log(HOME), rate: 0 },
  { t: PULL_TO, at: Math.log(SECTION), rate: 0 },
  { t: HAULED_AT + 0.1, at: Math.log(SECTION), rate: 0 },
  { t: BREACH_AT, at: Math.log(1.1) },
  { t: THEY_AT, at: Math.log(1.25) },
  { t: REALISED_AT, at: Math.log(CLOSE), rate: 0 },
  { t: LOOP_S, at: Math.log(CLOSE), rate: 0 },
];
export const zoomAt = (t: number): number => Math.exp(curveAt(ZOOM, t).at);

/** Where the fish sits on screen while the camera follows it. */
const ANCHOR_X: readonly Key[] = [
  { t: 0, at: 330, rate: 0 },
  { t: DROP_FROM, at: 330, rate: 0 },
  { t: DROP_FROM + 0.8, at: 540, rate: 0 },
  { t: LAND_AT - 0.2, at: 540, rate: 0 },
  { t: ALL_AT, at: 300, rate: 0 },
  { t: SCIENTISTS_AT, at: 300, rate: 0 },
  { t: HAULED_AT, at: 600, rate: 0 },
  { t: THEY_AT, at: 580, rate: 0 },
  { t: REALISED_AT, at: 330, rate: 0 },
  { t: LOOP_S, at: 330, rate: 0 },
];
const ANCHOR_Y: readonly Key[] = [
  { t: 0, at: 760, rate: 0 },
  { t: DROP_FROM, at: 760, rate: 0 },
  { t: DROP_FROM + 0.8, at: 700, rate: 0 },
  { t: LAND_AT - 0.2, at: 700, rate: 0 },
  { t: ALL_AT, at: 740, rate: 0 },
  { t: SCIENTISTS_AT, at: 740, rate: 0 },
  { t: HAULED_AT, at: 760, rate: 0 },
  { t: LOOP_S, at: 760, rate: 0 },
];
/** 0 following the fish, 1 holding the whole 4 km in the picture. */
const SECTION_W: readonly Key[] = [
  { t: 0, at: 0, rate: 0 },
  { t: PULL_FROM, at: 0, rate: 0 },
  { t: PULL_TO, at: 1, rate: 0 },
  { t: HAULED_AT + 0.1, at: 1, rate: 0 },
  { t: BREACH_AT - 0.2, at: 0, rate: 0 },
  { t: LOOP_S, at: 0, rate: 0 },
];
export const sectionAt = (t: number): number => clamp01(curveAt(SECTION_W, t).at);
/** The whole column: surface near the top of the safe area, seafloor just above the captions. */
const SECTION_CAM = { x: -480, y: 1400 } as const;

export function cameraAt(t: number): Camera {
  const zoom = zoomAt(t);
  const f = fishAt(t);
  const sx = curveAt(ANCHOR_X, t).at;
  const sy = curveAt(ANCHOR_Y, t).at;
  const follow = { x: f.x - (sx - 540) / zoom, y: f.y - (sy - 960) / zoom };
  const w = sectionAt(t);
  return { x: follow.x + (SECTION_CAM.x - follow.x) * w, y: follow.y + (SECTION_CAM.y - follow.y) * w, zoom };
}

// ---------------------------------------------------------------- light

/** The dark over everything, 0 .. 1: night at the surface, black at home, lifted for the diagram of the whole 4 km. */
const DARK: readonly Key[] = [
  { t: 0, at: 0.42, rate: 0 },
  { t: DROP_FROM, at: 0.42, rate: 0 },
  { t: LAND_AT, at: 0.62 },
  { t: ALL_AT + 0.3, at: 0.9, rate: 0 },
  { t: SCIENTISTS_AT - 0.1, at: 0.9, rate: 0 },
  { t: FOUND_AT + 0.2, at: 0.08, rate: 0 },
  { t: HAULED_AT + 0.2, at: 0.08, rate: 0 },
  { t: BREACH_AT, at: 0.42, rate: 0 },
  { t: LOOP_S, at: 0.42, rate: 0 },
];
export const darkAt = (t: number): number => clamp01(curveAt(DARK, t).at);

/** A faint glow round the fish so it can just be made out in the dark, 0 .. 1. */
const GLOW: readonly Key[] = [
  { t: 0, at: 0.35, rate: 0 },
  { t: LAND_AT, at: 0.35, rate: 0 },
  { t: ALL_AT + 0.3, at: 0.18, rate: 0 },
  { t: EYES_AT, at: 0.55, rate: 0 },
  { t: SCIENTISTS_AT, at: 0.55, rate: 0 },
  { t: BREACH_AT, at: 0.35, rate: 0 },
  { t: LOOP_S, at: 0.35, rate: 0 },
];
export const glowAt = (t: number): number => clamp01(curveAt(GLOW, t).at);

/** The lamp is RV Investigator's: lit whenever she is there. */
export const lampAt = (t: number): number => 1 - challengerAt(t);

// ---------------------------------------------------------------- notes on the picture

/** The inked "?" on its blank face: there at the start, gone as it drops; popping back on "realised". */
export const questionAt = (t: number): number => Math.max(1 - ramp(t, DROP_FROM - 0.15, DROP_FROM + 0.05), ramp(t, REALISED_AT, REALISED_AT + 0.2));
/** Its pop: a little overshoot as it comes back, 1 when settled. */
export const questionPop = (t: number): number => 1 + 0.25 * Math.sin(Math.PI * clamp01((t - REALISED_AT) / 0.35));

/** The depth readout at the top, during the dive and down to "no light at all". */
export const readoutAt = (t: number): number => window01(t, DROP_FROM + 0.15, ITS_AT, 0.3);

/**
 * The lens on its head: an X-ray finding the buried eye on "eyes", then
 * sliding down to the chin for the mouth, gone as the camera pulls back.
 */
export interface Lens {
  readonly alpha: number;
  /** 0 on the eye .. 1 on the mouth. */
  readonly slide: number;
  /** 1 X-ray .. 0 just a light. */
  readonly xray: number;
}
export function lensAt(t: number): Lens {
  const slide = ramp(t, AND_AT + 0.1, MOUTH_AT + 0.3);
  return { alpha: window01(t, EYES_AT - 0.2, SCIENTISTS_AT + 0.1, 0.3), slide, xray: 1 - slide };
}

/** "tiny eye" on "tiny eyes", "under the skin" on "under", the arrow and "mouth" on "mouth". */
export const eyeLabelAt = (t: number): number => window01(t, EYES_AT, AND_AT + 0.15, 0.25);
export const skinLabelAt = (t: number): number => window01(t, UNDER_AT, AND_AT + 0.15, 0.25);
export const mouthLabelAt = (t: number): number => window01(t, MOUTH_AT, SCIENTISTS_AT, 0.25);
/** The arrow to the mouth draws on over "mouth is tucked". */
export const mouthArrowAt = (t: number): number => (mouthLabelAt(t) > 0 ? ramp(t, MOUTH_AT, TUCKED_AT + 0.2) : 0);

/** The ship's name and year, stamped at the top: Challenger's on "Scientists… 1870s", Investigator's on "Australian… 2017". */
export const challengerNameAt = (t: number): number => window01(t, FOUND_AT + 0.25, WHEN_AT + 0.15, 0.3);
export const seventiesAt = (t: number): number => window01(t, SEVENTIES_AT, WHEN_AT + 0.15, 0.2);
export const investigatorNameAt = (t: number): number => window01(t, AUSTRALIAN_AT, THEY_AT + 0.3, 0.3);
export const yearAt = (t: number): number => window01(t, YEAR_AT, THEY_AT + 0.3, 0.2);
/** A stamp's thump as it lands, 1 → 1.3 → 1. */
export const thumpAt = (t: number, at: number): number => 1 + 0.3 * Math.sin(Math.PI * clamp01((t - at) / 0.3));

/** The ring round the tiny fish 4 km down, with its scientific name, from "found it" until "When…". */
export const foundAt = (t: number): number => window01(t, FOUND_AT + 0.2, WHEN_AT + 0.2, 0.3);
/** The 4 km ruler down the side of the whole column. */
export const rulerAt = (t: number): number => window01(t, FOUND_AT, HAULED_AT + 0.4, 0.3);

/** A splash where it goes in, where the net goes in, and where the net comes out: 0 .. 1 over its life. */
export const SPLASHES: readonly { readonly at: number; readonly size: number; readonly s: number }[] = [
  { at: ENTRY_AT, size: 0.55, s: 0.6 },
  { at: NET_ENTRY_AT, size: 0.5, s: 0.6 },
  { at: BREACH_AT, size: 0.7, s: 0.9 },
];

/** Seawater dripping off the hanging net: a burst as it comes out, then steady drips, the last across the loop point. */
export const DRIPS: readonly { readonly at: number; readonly dx: number }[] = [
  { at: 0.35, dx: -0.1 }, { at: 1.15, dx: 0.16 }, { at: 1.85, dx: -0.03 },
  { at: BREACH_AT + 0.12, dx: -0.28 }, { at: BREACH_AT + 0.2, dx: 0.2 }, { at: BREACH_AT + 0.3, dx: 0.04 },
  { at: BREACH_AT + 0.42, dx: -0.15 }, { at: BREACH_AT + 0.6, dx: 0.26 },
  { at: 17.7, dx: -0.06 }, { at: 18.5, dx: 0.14 }, { at: 19.3, dx: -0.18 },
];
const GRAVITY = 2600;
/** How far below the net's centre the drops leave it. */
export const NET_DROP = 0.15 * FISH_LEN;
const RING_S = 0.8;

export interface Drop {
  readonly x: number;
  readonly y: number;
  /** Falling (in the air), or the ring it left on the water, 0 .. 1. */
  readonly ring: number | null;
}

function fallTime(at: number): number {
  const from = netAt(at).y + NET_DROP;
  return Math.sqrt((2 * Math.max(0, -from)) / GRAVITY);
}

/** The drops at time t, world px. */
export function dropsAt(t: number): Drop[] {
  return DRIPS.flatMap((d): Drop[] => {
    const age = wrap(t - d.at);
    const fall = fallTime(d.at);
    if (age > fall + RING_S) return [];
    const from = netAt(d.at);
    const x = from.x + d.dx * FISH_LEN;
    if (age < fall) return [{ x, y: from.y + NET_DROP + 0.5 * GRAVITY * age * age, ring: null }];
    return [{ x, y: 0, ring: (age - fall) / RING_S }];
  });
}

/** When each drop hits the sea, round the loop. */
export const dripTimes = (): number[] => DRIPS.map((d) => wrap(d.at + fallTime(d.at)));

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines by hand, at most four words, broken at the phrases. */
const LINE_SIZES = [2, 3, 3, 2, 2, 3, 3, 3, 2, 3, 3, 3, 2, 3, 2, 2, 1, 3, 3, 4, 2] as const;

export const LINES: readonly Line[] = (() => {
  const groups = LINE_SIZES.map((n, i) => {
    const from = LINE_SIZES.slice(0, i).reduce((s: number, m) => s + m, 0);
    return WORDS.slice(from, from + n);
  });
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

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'free', t: DROP_FROM, pitch: 0.8, gain: 0.12, pan: 0.1 },
  { id: 'splash', t: ENTRY_AT, pitch: 0.8, gain: 0.3, pan: 0 },
  { id: 'dash', t: ENTRY_AT + 0.1, pitch: 0.5, gain: 0.12, pan: 0 },
  { id: 'lunge', t: LAND_AT, pitch: 0.45, gain: 0.12, pan: 0 },
  { id: 'zap', t: EYES_AT - 0.1, pitch: 1.4, gain: 0.06, pan: 0.2 },
  { id: 'click', t: EYES_AT + 0.05, pitch: 1.0, gain: 0.3, pan: 0.3 },
  { id: 'click', t: UNDER_AT + 0.05, pitch: 1.1, gain: 0.25, pan: 0.3 },
  { id: 'click', t: MOUTH_AT + 0.05, pitch: 0.9, gain: 0.3, pan: 0.3 },
  { id: 'clang', t: SEVENTIES_AT, pitch: 0.6, gain: 0.1, pan: 0.3 },
  { id: 'click', t: SEVENTIES_AT, pitch: 0.8, gain: 0.35, pan: 0.3 },
  { id: 'splash', t: NET_ENTRY_AT, pitch: 1.1, gain: 0.14, pan: 0.1 },
  { id: 'hooked', t: HAULED_AT, pitch: 0.7, gain: 0.16, pan: 0.1 },
  { id: 'dash', t: HAULED_AT + 0.2, pitch: 0.55, gain: 0.16, pan: 0 },
  { id: 'click', t: YEAR_AT, pitch: 0.8, gain: 0.35, pan: 0.3 },
  { id: 'splash', t: BREACH_AT, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'clang', t: LOOK_AT, pitch: 0.9, gain: 0.08, pan: -0.3 },
  { id: 'spotted', t: REALISED_AT, pitch: 0.9, gain: 0.18, pan: 0.2 },
  ...dripTimes().map((t, i): SoundCue => ({ id: 'drop', t, pitch: 1.3 + 0.07 * (i % 4), gain: 0.05, pan: DRIPS[i]!.dx })),
];
