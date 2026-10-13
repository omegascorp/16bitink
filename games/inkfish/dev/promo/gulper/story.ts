import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { curveAt, type Key, lerp, ramp, smooth, window01 } from '../short';
import { GILL, HALF, mouthGeom, type MouthGeom, type Pt } from './mouth';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "Its mouth is bigger than its body": the gulper eel throws its jaws open
 * and balloons up to swallow water and prey in one gulp, then squeezes the
 * water out through its gills, all to eat tiny shrimp. Told by a narrator
 * (words.ts), every beat timed to the words, a function of time in seconds
 * over a loop of LOOP_S.
 *
 *   0     "…its mouth is bigger than its body.": the mouth balloons open as the
 *         camera pulls back; a dashed ring round it, "mouth", then round the
 *         thin body, "body"
 *   2.5   "The gulper eel lives up to three kilometres down.": jaws shut, the
 *         pouch goes slack, and it sinks with us, the readout counting to
 *         3,000 m; its tail tip glows
 *   5.6   "When food drifts close,": three shrimp drift in
 *   7.1   "it throws its jaws open and balloons up,": the jaw swings down, the pouch fills
 *   9.8   "swallowing water and prey in one gulp,": water rushes in, the shrimp
 *         with it; the jaws snap shut on "gulp"
 *   12.5  "then squeezes the water out through its gills.": the pouch shrinks,
 *         water jets out of the gill slit
 *   15.1  "The strange part? It mostly eats tiny shrimp.": close on the open
 *         mouth, one tiny shrimp in front of it, a "?"
 *   18.6  "Still,": the pouch fills again, gulps the shrimp, and the camera pulls
 *         back into the opening frame.
 */
export const LOOP_S = 19.5;

/** A point along a quadratic Bezier. */
const bezier = (a: Pt, c: Pt, b: Pt, u: number): Pt => ({
  x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x,
  y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y,
});

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

export const MOUTH_AT = said('mouth');
export const BIGGER_AT = said('bigger');
export const BODY_AT = said('body.');
export const GULPER_AT = said('gulper');
export const LIVES_AT = said('lives');
export const THREE_AT = said('three');
export const DOWN_AT = said('down.');
export const WHEN_AT = said('When');
export const FOOD_AT = said('food');
export const CLOSE_AT = said('close,');
export const THROWS_AT = said('throws');
export const JAWS_AT = said('jaws');
export const OPEN_AT = said('open');
export const BALLOONS_AT = said('balloons');
export const UP_AT = said('up,');
export const SWALLOWING_AT = said('swallowing');
export const WATER_AT = said('water');
export const PREY_AT = said('prey');
export const GULP_AT = said('gulp,');
export const SQUEEZES_AT = said('squeezes');
export const OUT_AT = said('out');
export const GILLS_AT = said('gills.');
export const STRANGE_AT = said('strange');
export const PART_AT = said('part?');
export const MOSTLY_AT = said('mostly');
export const TINY_AT = said('tiny');
export const SHRIMP_AT = said('shrimp.');
export const STILL_AT = said('Still,');
/** The jaws snap shut on "gulp". */
export const SHUT_AT = GULP_AT + 0.1;

// ---------------------------------------------------------------- the mouth

/** Jaw opening, 0 shut .. 1 wide: open at the loop's start, shut to sink, thrown open, snapped shut on "gulp", opened on the shrimp. */
const JAW_KEYS: readonly Key[] = [
  { t: 0, at: 0.8, rate: 0.45 },
  { t: 0.7, at: 1, rate: 0 },
  { t: BODY_AT + 0.6, at: 1, rate: 0 },
  { t: LIVES_AT + 0.3, at: 0.05, rate: 0 },
  { t: THROWS_AT, at: 0.05, rate: 0 },
  { t: OPEN_AT + 0.15, at: 1, rate: 0 },
  { t: GULP_AT - 0.12, at: 1, rate: 0 },
  { t: SHUT_AT, at: 0, rate: 0 },
  { t: STRANGE_AT, at: 0, rate: 0 },
  { t: PART_AT + 0.35, at: 0.62, rate: 0 },
  { t: STILL_AT, at: 0.62, rate: 0 },
  { t: LOOP_S, at: 0.8, rate: 0.45 },
];

/** How full the pouch is, 0 slack .. 1 a balloon: full at the start, slack to sink, filled on "balloons up", squeezed out through the gills. */
const FILL_KEYS: readonly Key[] = [
  { t: 0, at: 0.5, rate: 0.9 },
  { t: 0.9, at: 1, rate: 0 },
  { t: BODY_AT + 0.6, at: 1, rate: 0 },
  { t: LIVES_AT + 0.6, at: 0.05, rate: 0 },
  { t: OPEN_AT, at: 0.05, rate: 0 },
  { t: UP_AT + 0.25, at: 1, rate: 0 },
  { t: SQUEEZES_AT, at: 1, rate: 0 },
  { t: GILLS_AT + 0.35, at: 0.05, rate: 0 },
  { t: STILL_AT, at: 0.05, rate: 0 },
  { t: LOOP_S, at: 0.5, rate: 0.9 },
];

export interface Mouth {
  readonly jaw: number;
  readonly fill: number;
}

export function mouthAt(t: number): Mouth {
  const u = wrap(t);
  // The gulp: a last swell of the pouch as the jaws shut on it.
  const gulp = 0.06 * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - GULP_AT + 0.1) / 0.5)));
  return { jaw: Math.max(0, curveAt(JAW_KEYS, u).at), fill: Math.max(0, curveAt(FILL_KEYS, u).at + gulp) };
}

export const geomAt = (t: number): MouthGeom => {
  const m = mouthAt(t);
  return mouthGeom(m.jaw, m.fill);
};

// ---------------------------------------------------------------- the eel

/** Its body length (snout to tail stalk) in world px; world px are screen px when the camera is at rest. */
export const EEL_LEN = 700;
/** World px per texture px. */
export const UNIT = EEL_LEN / (2 * HALF);
const HOME = { x: 430, y: 585 } as const;
/** Tail beats and bobs: whole numbers a loop. */
const BEATS = 15;
const BOBS = 2;

export interface Eel {
  /** The sprite's centre, world px. */
  readonly x: number;
  readonly y: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** It sinks with the camera on "lives up to three kilometres down", 0 .. 1. */
export const sinkAt = (t: number): number => window01(wrap(t), LIVES_AT - 0.2, WHEN_AT + 0.3, 0.6);

export function eelAt(t: number): Eel {
  const u = wrap(t);
  const fill = mouthAt(u).fill;
  return {
    x: HOME.x,
    y: HOME.y + 10 * Math.sin((2 * Math.PI * BOBS * u) / LOOP_S),
    // Heavy with water, the head dips a little; sinking, it noses down.
    tilt: 0.03 + 0.025 * Math.sin((2 * Math.PI * u) / LOOP_S + 1) - 0.05 * fill - 0.04 * sinkAt(u),
    beat: (2 * Math.PI * BEATS * u) / LOOP_S,
    effort: 0.4 + 0.35 * sinkAt(u),
  };
}

/** A point on the eel, given snout-relative in texture px, in world px. */
export function onEel(e: Eel, p: Pt): Pt {
  const lx = (HALF + p.x) * UNIT;
  const ly = (1 + p.y) * UNIT;
  const c = Math.cos(e.tilt);
  const s = Math.sin(e.tilt);
  return { x: e.x + lx * c + ly * s, y: e.y - lx * s + ly * c };
}

/** How the swimmer bends the column `x` texture px behind the snout (swimmer.ts), texture px down. */
function bendAt(e: Eel, x: number): number {
  const along = -x / (2 * HALF);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  return 13 * (0.12 + 0.14 * e.effort) * bend * bend * Math.sin(e.beat - 2.4 * along);
}

/** The thin whip past the tail, as the game draws it (root, bow, end; snout-relative), on the eel as it bends. */
const WHIP = { root: { x: -182, y: -1 }, ctrl: { x: -196, y: 21 }, end: { x: -210, y: -11 } } as const;

export function whipAt(t: number): Pt[] {
  const e = eelAt(t);
  return Array.from({ length: 13 }, (_, i) => {
    const p = bezier(WHIP.root, WHIP.ctrl, WHIP.end, i / 12);
    return onEel(e, { x: p.x, y: p.y + bendAt(e, p.x) });
  });
}

/** The glowing tip of its whip of a tail (the game draws a pink light there). */
export function tailTipAt(t: number): Pt {
  const e = eelAt(t);
  return onEel(e, { x: WHIP.end.x, y: WHIP.end.y + bendAt(e, WHIP.end.x) });
}

/** The tail light pulses twice a loop. */
export const tailGlowAt = (t: number): number => 0.75 + 0.25 * Math.sin((2 * Math.PI * 4 * wrap(t)) / LOOP_S);

// ---------------------------------------------------------------- the camera

/** World px shown at the screen's centre, and the zoom. At rest the world is the screen. */
export const CENTRE = { x: 540, y: 760 } as const;

const ZOOM_KEYS: readonly Key[] = [
  { t: 0, at: 1.2, rate: -0.5 },
  { t: 0.95, at: 1, rate: 0 },
  { t: FOOD_AT - 0.2, at: 1, rate: 0 },
  { t: CLOSE_AT + 0.3, at: 1.1, rate: 0 },
  { t: STRANGE_AT - 0.15, at: 1.1, rate: 0 },
  { t: PART_AT + 0.5, at: 1.9, rate: 0 },
  { t: STILL_AT, at: 1.9, rate: 0 },
  { t: LOOP_S, at: 1.2, rate: -0.5 },
];
const X_KEYS: readonly Key[] = [
  { t: 0, at: 570, rate: -110 },
  { t: 0.95, at: 460, rate: 0 },
  { t: FOOD_AT - 0.2, at: 460, rate: 0 },
  { t: CLOSE_AT + 0.3, at: 580, rate: 0 },
  { t: STRANGE_AT - 0.15, at: 580, rate: 0 },
  { t: PART_AT + 0.5, at: 760, rate: 0 },
  { t: STILL_AT, at: 760, rate: 0 },
  { t: LOOP_S, at: 570, rate: -110 },
];
const Y_KEYS: readonly Key[] = [
  { t: 0, at: 740, rate: 20 },
  { t: 0.95, at: 760, rate: 0 },
  { t: FOOD_AT - 0.2, at: 760, rate: 0 },
  { t: CLOSE_AT + 0.3, at: 740, rate: 0 },
  { t: STRANGE_AT - 0.15, at: 740, rate: 0 },
  { t: PART_AT + 0.5, at: 640, rate: 0 },
  { t: STILL_AT, at: 640, rate: 0 },
  { t: LOOP_S, at: 740, rate: 20 },
];

export interface Camera {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

export function cameraAt(t: number): Camera {
  const u = wrap(t);
  return { zoom: curveAt(ZOOM_KEYS, u).at, x: curveAt(X_KEYS, u).at, y: curveAt(Y_KEYS, u).at };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: (p.x - cam.x) * cam.zoom + CENTRE.x, y: (p.y - cam.y) * cam.zoom + CENTRE.y });

/** A jolt of the picture as the jaws snap shut, px. */
export function shakeAt(t: number): Pt {
  const u = wrap(t - SHUT_AT);
  if (u > 0.3) return { x: 0, y: 0 };
  const fade = (1 - u / 0.3) ** 2;
  return { x: 10 * fade * Math.sin(u * 95), y: 7 * fade * Math.cos(u * 77) };
}

// ---------------------------------------------------------------- marine snow

/**
 * How far the snow has scrolled up the screen, px: slowly, and fast while
 * we sink. Exactly one screen height a loop, so it loops.
 */
const SNOW_SPEEDUP = 8;
const SNOW_TABLE = (() => {
  const steps = 2400;
  const out = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) {
    const t = ((i - 0.5) / steps) * LOOP_S;
    out[i] = out[i - 1]! + (1 + SNOW_SPEEDUP * sinkAt(t)) * (LOOP_S / steps);
  }
  return out;
})();

/** Scroll as a fraction of the screen's height, 0 .. 1 over the loop. */
export function snowScroll(t: number): number {
  const steps = SNOW_TABLE.length - 1;
  const f = (wrap(t) / LOOP_S) * steps;
  const i = Math.min(steps - 1, Math.floor(f));
  const v = lerp(SNOW_TABLE[i]!, SNOW_TABLE[i + 1]!, f - i);
  return v / SNOW_TABLE[steps]!;
}

// ---------------------------------------------------------------- shrimp

export interface Shrimp {
  /** World px. */
  readonly x: number;
  readonly y: number;
  /** Body length, world px. */
  readonly len: number;
  /** Heading, radians (0 right). */
  readonly angle: number;
  readonly alpha: number;
  /** Tail-flick phase. */
  readonly flick: number;
  /** In the pouch (drawn faint, behind the jaws) rather than out in the water. */
  readonly inside: boolean;
}

interface Food {
  /** Where it hovers, world px from the snout. */
  readonly hover: Pt;
  /** Where it drifts in from, relative to its hover. */
  readonly from: Pt;
  readonly arrive: readonly [number, number];
  /** When it is sucked in (over SUCK_S), and where it sits in the pouch (relative to the balloon's centre, in radii). */
  readonly sucked: number;
  readonly held: Pt;
  readonly len: number;
  readonly phase: number;
}

const SUCK_S = 0.6;

export const FOOD: readonly Food[] = [
  { hover: { x: 95, y: 150 }, from: { x: 560, y: -300 }, arrive: [FOOD_AT - 0.25, CLOSE_AT + 0.4], sucked: WATER_AT - 0.15, held: { x: -0.3, y: 0.15 }, len: 76, phase: 0.4 },
  { hover: { x: 170, y: 45 }, from: { x: 520, y: -380 }, arrive: [FOOD_AT, CLOSE_AT + 0.6], sucked: WATER_AT + 0.2, held: { x: 0.2, y: 0.3 }, len: 68, phase: 2.1 },
  { hover: { x: 185, y: 255 }, from: { x: 560, y: -160 }, arrive: [FOOD_AT + 0.25, CLOSE_AT + 0.75], sucked: PREY_AT, held: { x: -0.1, y: 0.5 }, len: 72, phase: 4.0 },
];

/** The tiny one at the end: it hovers in the open mouth on "tiny shrimp", gulped on "Still,". */
const TINY: Food = {
  hover: { x: 10, y: 120 }, from: { x: 420, y: -320 }, arrive: [STRANGE_AT - 0.2, MOSTLY_AT + 0.25], sucked: STILL_AT + 0.15, held: { x: 0, y: 0.2 }, len: 40, phase: 1.2,
};


function shrimpOf(f: Food, t: number, gone: number): Shrimp | null {
  if (t < f.arrive[0] || t >= gone) return null;
  const e = eelAt(t);
  const nose = onEel(e, { x: 0, y: 0 });
  const flick = 2 * Math.PI * 1.3 * t + f.phase;
  const drift = 1 - ramp(t, f.arrive[0], f.arrive[1]);
  const hover = {
    x: nose.x + f.hover.x + f.from.x * drift ** 1.5 + 6 * Math.sin(1.7 * t + f.phase),
    y: nose.y + f.hover.y + f.from.y * drift ** 1.5 + 9 * Math.sin(1.1 * t + f.phase * 2),
  };
  const fadeIn = ramp(t, f.arrive[0], f.arrive[0] + 0.5);
  if (t < f.sucked) return { ...hover, len: f.len, angle: Math.PI + 0.25 * Math.sin(0.9 * t + f.phase), alpha: fadeIn, flick, inside: false };
  const g = geomAt(t);
  const gate = onEel(e, g.gate);
  const centre = onEel(e, { x: g.balloon.cx + f.held.x * g.balloon.r, y: g.balloon.cy + f.held.y * g.balloon.r });
  const u = Math.min(1, (t - f.sucked) / SUCK_S);
  if (u < 1) {
    const e2 = smooth(u);
    const p = bezier(hover, gate, centre, e2);
    const ahead = bezier(hover, gate, centre, Math.min(1, e2 + 0.05));
    return { ...p, len: f.len * (1 - 0.25 * e2), angle: Math.atan2(ahead.y - p.y, ahead.x - p.x), alpha: 1 - 0.55 * ramp(u, 0.5, 1), flick: flick * 3, inside: u > 0.6 };
  }
  // In the pouch, jostled by the water, until it goes down as the water is squeezed out.
  const jostle = { x: 6 * Math.sin(2.3 * t + f.phase), y: 6 * Math.cos(1.9 * t + f.phase) };
  return { x: centre.x + jostle.x, y: centre.y + jostle.y, len: f.len * 0.75, angle: Math.PI * 0.8 + 0.3 * Math.sin(t + f.phase), alpha: 0.45 * (1 - ramp(t, gone - 0.6, gone)), flick, inside: true };
}

/** The three shrimp that drift close and are swallowed; gone down the throat as the water is squeezed out. */
export const foodAt = (i: number, t: number): Shrimp | null => shrimpOf(FOOD[i]!, wrap(t), GILLS_AT);

/** The tiny shrimp in the open mouth at the end, gulped on "Still,". */
export const tinyAt = (t: number): Shrimp | null => shrimpOf(TINY, wrap(t), STILL_AT + 0.15 + SUCK_S);

// ---------------------------------------------------------------- water in and out

/** Water rushing into the open mouth: as it balloons at the loop's start, and on "balloons up, swallowing water…". */
export function suctionAt(t: number): number {
  const u = wrap(t);
  const hook = u < LOOP_S / 2 ? 1 - ramp(u, 0.5, 1.1) : ramp(u, STILL_AT, STILL_AT + 0.3);
  return Math.max(hook, window01(u, BALLOONS_AT - 0.3, GULP_AT, 0.3));
}

/** Water jetting out of the gills as the pouch is squeezed. */
export const jetsAt = (t: number): number => window01(wrap(t), SQUEEZES_AT, GILLS_AT + 0.6, 0.35);

/** Where the gill slit is, world px. */
export const gillAt = (t: number): Pt => onEel(eelAt(t), GILL);

/** The snap of the jaws on "gulp", 0 .. 1 over its life. */
export const snapAt = (t: number): number => (wrap(t) - SHUT_AT) / 0.35;

// ---------------------------------------------------------------- notes

/** The dashed ring round the mouth on "mouth", and round the body on "body": how much is drawn, and how strongly. */
export const mouthRing = (t: number): { readonly drawn: number; readonly alpha: number } => {
  const u = wrap(t);
  return { drawn: ramp(u, MOUTH_AT - 0.05, MOUTH_AT + 0.45), alpha: u > LOOP_S / 2 ? 0 : 1 - ramp(u, GULPER_AT, GULPER_AT + 0.35) };
};
export const bodyRing = (t: number): { readonly drawn: number; readonly alpha: number } => {
  const u = wrap(t);
  return { drawn: ramp(u, BODY_AT - 0.05, BODY_AT + 0.45), alpha: u > LOOP_S / 2 ? 0 : 1 - ramp(u, GULPER_AT, GULPER_AT + 0.35) };
};

/** The depth readout: shown while we sink, counting down to 3,000 m. */
export const readoutAt = (t: number): number => window01(wrap(t), LIVES_AT - 0.3, WHEN_AT + 0.25, 0.3);
export const metresAt = (t: number): number => lerp(200, 3000, ramp(wrap(t), LIVES_AT, DOWN_AT + 0.25));

/** "glowing tail" while it's dark and deep. */
export const tailLabel = (t: number): number => window01(wrap(t), THREE_AT, FOOD_AT, 0.3);

/** "gills" as the narrator says it. */
export const gillLabel = (t: number): number => window01(wrap(t), GILLS_AT - 0.1, STRANGE_AT + 0.2, 0.25);

/** The "?" over its head on "The strange part?", until the shrimp is gulped. */
export function questionAt(t: number): number {
  const u = wrap(t);
  if (u < PART_AT || u > STILL_AT + 0.45) return 0;
  return Math.min(1.15 * ramp(u, PART_AT, PART_AT + 0.15), 1 - ramp(u, STILL_AT + 0.15, STILL_AT + 0.45));
}

/** The ring and "tiny shrimp" note on "tiny shrimp". */
export const tinyLabel = (t: number): number => window01(wrap(t), TINY_AT - 0.05, STILL_AT + 0.25, 0.2);

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
    const full = !last || last.length >= 4 || /[.,:?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  { id: 'click', t: MOUTH_AT + 0.05, pitch: 0.9, gain: 0.3, pan: 0.2 },
  { id: 'click', t: BODY_AT + 0.05, pitch: 1.2, gain: 0.3, pan: -0.2 },
  { id: 'dash', t: LIVES_AT, pitch: 0.5, gain: 0.12, pan: 0 },
  { id: 'drop', t: DOWN_AT + 0.2, pitch: 0.6, gain: 0.14, pan: 0 },
  { id: 'rustle', t: FOOD_AT, pitch: 1.4, gain: 0.1, pan: 0.5 },
  { id: 'lunge', t: THROWS_AT + 0.1, pitch: 0.7, gain: 0.3, pan: 0.2 },
  { id: 'grow', t: BALLOONS_AT - 0.1, pitch: 0.75, gain: 0.22, pan: 0.1 },
  { id: 'suck', t: WATER_AT - 0.25, pitch: 0.8, gain: 0.2, pan: 0.3 },
  { id: 'eatBig', t: SHUT_AT, pitch: 0.85, gain: 0.45, pan: 0.2 },
  { id: 'splash', t: SQUEEZES_AT + 0.2, pitch: 0.55, gain: 0.12, pan: -0.2 },
  { id: 'spotted', t: PART_AT, pitch: 1.1, gain: 0.18, pan: 0.2 },
  { id: 'suck', t: STILL_AT + 0.05, pitch: 1.0, gain: 0.16, pan: 0.2 },
  { id: 'eat', t: STILL_AT + 0.15 + SUCK_S, pitch: 1.6, gain: 0.3, pan: 0.2 },
];
