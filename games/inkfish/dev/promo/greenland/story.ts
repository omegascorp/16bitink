import { BOIL_FPS } from '../../../src/art/textures';
import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { bodyPoint, EYE, type SharkPose } from './shark';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This shark may have been born before Isaac Newton": how old Greenland
 * sharks get, told by a narrator (words.ts). Every beat is timed to the
 * words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     a huge old shark glides under the sea ice; above it, a ribbon of
 *         history from 1550 to today: its life starts (somewhere) before
 *         Newton's birth in 1642
 *   3.2   "…grow about one centimetre a year": a tape measure along its
 *         flank; a century of growth fills one metre of it
 *   6.2   "Scientists aged them by the lenses of their eyes": the camera
 *         goes to its eye; a magnifier shows the eye, its parasite, then the
 *         lens cut through, layer on layer like tree rings round a core
 *         formed before birth
 *   9.5   "…the oldest came out at around four hundred years": the core is
 *         dated; "≈ 400 years" is stamped over the picture
 *   11.9  "They don't even have babies until…a hundred and fifty": the stamp
 *         flies up to the ribbon, which now counts the shark's age; it
 *         counts up to 150, the first pups
 *   15    "So if you ever meet one under the Arctic ice, remember:": the
 *         shark, which sank a little while the ribbon counted, rises back
 *         up under the ice into the opening shot.
 *
 * World units are px at zoom 1, with the shark's body centre at the origin.
 */
export const LOOP_S = 18;

/** The line boil, as the game does it: BOIL_FPS drawings a second, cycling through BOIL_FRAMES (a whole number of cycles per loop). */
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-6);

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string): number {
  const w = WORDS.find((x) => x.text === text);
  if (!w) throw new Error(`"${text}" isn't in the voiceover`);
  return w.start / TEMPO;
}

// The beats, from the words.
export const NEWTON_AT = said('Isaac');
export const BORN_AT = said('born');
export const TAPE_FROM = said('Greenland');
export const GROW_FROM = said('grow');
export const GROW_TO = said('year.') + 0.25;
export const ZOOM_FROM = said('Scientists') - 0.05;
export const ZOOM_TO = said('by') + 0.15;
export const LENS_FROM = said('aged') - 0.1;
export const SECTION_FROM = said('lenses') - 0.05;
export const CORE_AT = said('eyes,');
export const DATED_FROM = said('oldest');
export const PULL_FROM = said('came');
export const STAMP_AT = said('four') - 0.04;
export const FLY_FROM = said('They');
export const FLY_TO = said('babies');
export const COUNT_FROM = said('until');
export const PUPS_AT = said('fifty.');
export const SETTLE_FROM = said('So');
export const SETTLE_TO = said('Arctic') + 0.75;
const PULL_TO = FLY_FROM + 0.1;

// ---------------------------------------------------------------- the shark

/** Its length nose to tail base, world px (its tail fin reaches a sixth further). */
export const SHARK_LEN = 860;
/** Slow, heavy tail beats and a gentle rise and fall, whole numbers per loop. */
const BEATS = 5;
const BOBS = 2;
const BOB = 9;
const EFFORT = 0.3;

/** How far it sinks while the ribbon counts its age (room for the labels), rising again under the ice. */
export const SINK = 120;
export const sinkAt = (t: number): number => SINK * Math.min(ramp(t, PULL_FROM + 0.4, FLY_FROM + 0.4), 1 - ramp(t, SETTLE_FROM, SETTLE_TO));

export function sharkAt(t: number): SharkPose {
  const phase = (2 * Math.PI * t) / LOOP_S;
  return {
    x: 0, y: BOB * Math.sin(BOBS * phase) + sinkAt(t), length: SHARK_LEN, facing: 1,
    tilt: 0.02 * Math.cos(BOBS * phase), beat: BEATS * phase, effort: EFFORT,
  };
}

interface Pt { readonly x: number; readonly y: number }

/**
 * A point on the shark, in world px: `along` 0 nose .. 1 tail base, `across`
 * in half-heights below its midline. Bent with its wave and tilted exactly
 * as shark.ts draws it.
 */
export function onShark(along: number, across: number, t: number): Pt {
  const pose = sharkAt(t);
  const p = bodyPoint(along, across, pose.beat, pose.effort);
  const [cos, sin] = [Math.cos(pose.tilt), Math.sin(pose.tilt)];
  return { x: pose.x + (p.x * cos + p.y * sin) * SHARK_LEN, y: pose.y + (-p.x * sin + p.y * cos) * SHARK_LEN };
}

/** The middle of its eye. */
export const eyeAt = (t: number): Pt => onShark(EYE.along, EYE.across, t);

/** Its eye's radius in world px. */
export const EYE_R = EYE.r * SHARK_LEN;

// ---------------------------------------------------------------- the camera

export interface Camera {
  /** The world point at the middle of the picture, and px per world px. */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** The opening shot: the shark big and low, the ice and the ribbon of history above it. */
export const WIDE: Camera = { x: -40, y: 150, zoom: 1 };
/** Close on its head, the eye where the magnifier opens. */
const HEAD_ZOOM = 2.3;
/** The magnifier, on screen: its middle and radius. */
export const LENS = { x: 540, y: 610, r: 310 } as const;

const onEye = (t: number): Pt => {
  const eye = eyeAt(t);
  return { x: eye.x - (LENS.x - 540) / HEAD_ZOOM, y: eye.y - (LENS.y - 960) / HEAD_ZOOM };
};

/**
 * Zooming between two framings: the zoom moves evenly in scale (log), and
 * the middle of the picture moves so that both ends stay put on screen
 * rather than swinging out of view on the way.
 */
function zoomBetween(u: number, from: Camera, to: Camera): Camera {
  const zoom = Math.exp(lerp(Math.log(from.zoom), Math.log(to.zoom), smooth(u)));
  if (Math.abs(from.zoom - to.zoom) < 1e-6) {
    const e = smooth(u);
    return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), zoom };
  }
  const w = (1 / zoom - 1 / to.zoom) / (1 / from.zoom - 1 / to.zoom);
  return { x: to.x + (from.x - to.x) * w, y: to.y + (from.y - to.y) * w, zoom };
}

export function cameraAt(t: number): Camera {
  if (t < ZOOM_FROM) return WIDE;
  const head = (): Camera => ({ ...onEye(t), zoom: HEAD_ZOOM });
  if (t < ZOOM_TO) return zoomBetween((t - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM), WIDE, head());
  if (t < PULL_FROM) return head();
  if (t < PULL_TO) return zoomBetween((t - PULL_FROM) / (PULL_TO - PULL_FROM), head(), WIDE);
  return WIDE;
}

// ---------------------------------------------------------------- the water

/** The ice drifts past overhead (the shark is swimming): one stretch of ice per loop. */
export const ICE_PERIOD = 1700;
export const iceShift = (t: number): number => (ICE_PERIOD * t) / LOOP_S;
/** The underside of the ice, world y. */
export const ICE_Y = -675;

/** Marine snow, nearer than the ice, so it drifts by faster: two screen widths per loop. */
export const SNOW_LAPS = 2;

// ---------------------------------------------------------------- the ribbon of history

/** The years the ribbon spans, and where on screen. */
export const RIBBON = { from: 1550, to: 2030, left: 80, right: 1000, y: 478 } as const;
export const TODAY = 2026;
/** About 400 years: the oldest shark in the study came out at around 392 (95% range 272–512). */
export const LIFE = 400;
export const BIRTH = TODAY - LIFE;
export const NEWTON_BORN = 1642;
export const PUPS_AGE = 150;
/** Newton's cameo above the ribbon, pinned to 1642: its middle and height on screen. */
export const CAMEO = { x: 0, y: RIBBON.y - 158, h: 150 } as const;
export const ribbonX = (year: number): number => RIBBON.left + ((year - RIBBON.from) / (RIBBON.to - RIBBON.from)) * (RIBBON.right - RIBBON.left);

/** The ribbon's presence: full in the wide shots, faded while the tape is out, gone while the camera is at the eye. */
export const ribbonShow = (t: number): number =>
  Math.min(1 - 0.6 * window01(t, TAPE_FROM, ZOOM_FROM + 0.1, 0.4), 1 - window01(t, ZOOM_FROM, FLY_FROM + 0.45, 0.5));

/** Newton's portrait swells a little as the narrator names him, 0 .. 1 .. 0. */
export const newtonPulse = (t: number): number => Math.sin(Math.PI * clamp01((t - (NEWTON_AT - 0.15)) / 1.3));
/** The fuzzy start of the shark's life pulses as the narrator says "born", 0 .. 1 .. 0. */
export const birthPulse = (t: number): number => Math.sin(Math.PI * clamp01((t - (BORN_AT - 0.1)) / 1.1));

/** Newton's name beside his cameo: it makes way for the stamp flying in and the age labels. */
export const newtonName = (t: number): number => 1 - window01(t, FLY_FROM - 0.15, SETTLE_FROM + 1.0, 0.35);

/** Its labels counting its age instead of the calendar, 0 .. 1. */
export const ageMode = (t: number): number => window01(t, FLY_FROM + 0.2, SETTLE_FROM + 0.9, 0.5);
/** The age counted along its life: up to 150 as the narrator gets there. */
export const ageCount = (t: number): number => PUPS_AGE * ramp(t, COUNT_FROM, PUPS_AT + 0.05);
/** How long since the "first pups" milestone landed, s (negative before). */
export const pupsSince = (t: number): number => t - PUPS_AT;
/** The two newborn pups that swim out from the milestone, on screen. */
export function pupsAt(t: number): readonly SharkPose[] {
  const since = pupsSince(t);
  if (since < 0) return [];
  const x = ribbonX(BIRTH + PUPS_AGE);
  const out = 1 - Math.exp(-since * 2.2);
  return ([-1, 1] as const).map((side, k) => ({
    x: x + side * (150 + 60 * out), y: RIBBON.y + 166 + 6 * Math.sin(since * 3 + k),
    length: 100 * (0.6 + 0.4 * Math.min(1, since / 0.25)), facing: side, tilt: 0.05 * Math.sin(since * 2.5 + k), beat: since * 9 + k, effort: 0.8,
  }));
}

/** The age counter and milestone's presence, 0 .. 1. */
export const ageMarks = (t: number): number => window01(t, COUNT_FROM - 0.2, SETTLE_FROM + 0.8, 0.3);

// ---------------------------------------------------------------- the tape measure

/** The shark is drawn about 4.5 m long, nose to tail base. */
export const SHARK_M = 4.5;
/** Where along its flank the tape lies, in half-heights below its midline. */
export const TAPE_ACROSS = 0.18;
/** How far the tape has unrolled from its tail towards its nose, 0 .. 1. */
export const tapeOut = (t: number): number => ramp(t, TAPE_FROM, TAPE_FROM + 0.75);
/** The tape's presence, 0 .. 1. */
export const tapeShow = (t: number): number => window01(t, TAPE_FROM - 0.05, ZOOM_FROM + 0.45, 0.3);
/** Years of growth counted: a century, which adds a metre at about a centimetre a year. */
export const YEARS_GROWN = 100;
export const yearsAt = (t: number): number => YEARS_GROWN * clamp01((t - GROW_FROM) / (GROW_TO - GROW_FROM)) ** 1.1;
/** Metres grown, about one centimetre a year. */
export const grownM = (t: number): number => yearsAt(t) / 100;

// ---------------------------------------------------------------- the magnifier on the eye

/** The magnifier over the eye, 0 .. 1. */
export const lensOpen = (t: number): number => window01(t, LENS_FROM, PULL_FROM + 0.55, 0.45);
/** Inside it: the eye close up (0), then the lens cut through, filling the circle (1). */
export const section = (t: number): number => ramp(t, SECTION_FROM, SECTION_FROM + 0.6);
/** The lens's layers drawn so far, core first, outwards: the order it grew in. */
export const layersGrown = (t: number): number => ramp(t, SECTION_FROM + 0.15, CORE_AT + 0.1);
/** The core lit up as it's dated, 0 .. 1. */
export const coreLit = (t: number): number => ramp(t, CORE_AT, DATED_FROM + 0.3);
/** Labels inside: "lens" and "core: formed before birth". */
export const lensLabel = (t: number): number => ramp(t, SECTION_FROM + 0.2, SECTION_FROM + 0.5);
export const coreLabel = (t: number): number => ramp(t, CORE_AT + 0.05, CORE_AT + 0.4);

// ---------------------------------------------------------------- the "≈ 400 years" stamp

/** Where the stamp lands at first, and where it ends up on the ribbon. */
export const STAMP_HOME = { x: 540, y: 600, size: 1 } as const;
export const STAMP_RIBBON = { x: 620, y: 368, size: 0.44 } as const;

/** The stamp: how far it has popped (0 .. 1, overshooting), and where it is. */
export function stampAt(t: number): { readonly show: number; readonly pop: number; readonly x: number; readonly y: number; readonly size: number } {
  const since = t - STAMP_AT;
  // Slams in, overshoots, and settles.
  const pop = since <= 0 ? 0 : 1 - Math.exp(-since * 9) * Math.cos(since * 20);
  const fly = ramp(t, FLY_FROM, FLY_TO);
  const show = since <= 0 ? 0 : Math.min(clamp01(since / 0.08), 1 - ramp(t, SETTLE_FROM + 0.2, SETTLE_FROM + 0.8));
  return {
    show,
    pop: Math.max(0, pop),
    x: lerp(STAMP_HOME.x, STAMP_RIBBON.x, fly),
    y: lerp(STAMP_HOME.y, STAMP_RIBBON.y, fly) - 40 * Math.sin(Math.PI * fly),
    size: lerp(STAMP_HOME.size, STAMP_RIBBON.size, fly),
  };
}

/** The stamp's ink burst: 0 .. 1 over its life, or outside that. */
export const stampBurst = (t: number): number => (t - STAMP_AT) / 0.4;

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
    const full = !last || last.length >= 4 || /[.,…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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

/** Ticks as a counter passes each of `marks` steps from `from` to `to` s. */
const ticks = (from: number, to: number, marks: number, pitch: number, gain: number): SoundCue[] =>
  Array.from({ length: marks }, (_, i) => ({ id: 'click', t: lerp(from, to, (i + 1) / marks), pitch: pitch + i * 0.03, gain, pan: -0.2 + (0.4 * i) / marks }));

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'rustle', t: TAPE_FROM + 0.05, pitch: 1.2, gain: 0.2, pan: -0.2 },
  ...ticks(GROW_FROM, GROW_TO, 10, 1.1, 0.1),
  { id: 'drop', t: GROW_TO, pitch: 1.3, gain: 0.16, pan: 0 },
  { id: 'dash', t: ZOOM_FROM + 0.1, pitch: 0.6, gain: 0.18, pan: 0.2 },
  { id: 'drop', t: LENS_FROM + 0.15, pitch: 0.8, gain: 0.14, pan: 0 },
  ...ticks(SECTION_FROM + 0.15, CORE_AT + 0.1, 8, 1.4, 0.07),
  { id: 'zap', t: DATED_FROM + 0.05, pitch: 0.7, gain: 0.08, pan: 0 },
  { id: 'dash', t: PULL_FROM + 0.1, pitch: 0.5, gain: 0.16, pan: -0.2 },
  { id: 'boom', t: STAMP_AT, pitch: 0.6, gain: 0.22, pan: 0 },
  { id: 'dash', t: FLY_FROM + 0.05, pitch: 1.3, gain: 0.12, pan: 0.3 },
  ...ticks(COUNT_FROM, PUPS_AT, 6, 1.2, 0.08),
  { id: 'drop', t: PUPS_AT, pitch: 1.5, gain: 0.18, pan: -0.1 },
  { id: 'dash', t: SETTLE_FROM + 0.2, pitch: 0.45, gain: 0.16, pan: 0 },
];
