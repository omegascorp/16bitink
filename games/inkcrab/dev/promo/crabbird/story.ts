import type { Pt } from '../../../src/art/pen';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { spline } from './art/paint';
import { inVoice, WORDS, type Word } from './words';

/**
 * "This crab took down a bird", narrated: every beat as a pure function of
 * time, timed from the voice's words (words.ts). One night in March 2016 on
 * the Chagos Archipelago a scientist watched a coconut crab climb to a
 * red-footed booby asleep on a low branch, break its wing and bring it to the
 * ground; five more crabs came within about 20 minutes. A single observed
 * event: nothing here says crabs usually do this.
 *
 * The hook (frame 1) is the instant before the snap, so the story rewinds to
 * the calm, climbs back to the same pose, and the last ink wash lands on it.
 */
export const LOOP_S = 16.5;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return inVoice(w.start);
}

/** The beats, seconds into the loop, each on its word. */
export const AT = {
  hookOut: said('Middle') - 0.42,
  reach: said('and') - 0.4,
  climbEnd: said('It'),
  grabs: said('grabs'),
  wing: said('wing,'),
  snap: said('SNAPS'),
  fall: said('The') - 0.05,
  ground: said('falls…') + 0.3,
  firstEyes: said('and', 3) - 0.24,
  moreEyes: said('five'),
  ctaStart: LOOP_S - 3,
  ctaGone: LOOP_S - 0.6,
  wash: LOOP_S - 0.6,
} as const;

// ---------------------------------------------------------------- the set, world px (the hook frame is the world at 1:1)

/** Centre of the branch at x, rising to the right. */
export const branchY = (x: number): number => 1218 - 0.265 * (x - 40) + 12 * Math.sin(x * 0.009);
/** Its thickness at x. */
export const branchW = (x: number): number => Math.max(70, 170 - 0.1 * x);
export const branchTop = (x: number): number => branchY(x) - branchW(x) / 2;
export const branchBottom = (x: number): number => branchY(x) + branchW(x) / 2;
export const TRUNK = { x: 110, w: 250 } as const;

/** Where the bird's feet grip the branch. */
const PERCH: Pt = { x: 766, y: branchTop(766) + 16 };
export const BIRD_SCALE = 0.84;
/** The wing, where the claw takes it (world px). */
export const WING_AT: Pt = { x: 640, y: 900 };
/** The painted crab's size in the world: local drawing units to px. */
export const CRAB_SCALE = 0.8;

// ---------------------------------------------------------------- poses

export interface ClawPose {
  readonly wrist: Pt;
  /** Which way the claw points, radians. */
  readonly angle: number;
  /** 0 shut .. 1 wide. */
  readonly open: number;
  /** 1 keeps the movable finger on the screen's upper side; -1 mirrors it. */
  readonly flip: number;
}

export interface CrabPose {
  readonly x: number;
  readonly y: number;
  readonly heading: number;
  /** One per LEGS entry in coconutCrab.ts. */
  readonly feet: readonly Pt[];
  readonly bigClaw: ClawPose;
  readonly smallClaw: ClawPose;
  readonly antennae: readonly (readonly Pt[])[];
}

export interface BirdPose {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scale: number;
  /** 0 sunk into the shoulders .. 1 stretched up in alarm; below 0 low. */
  readonly neck: number;
  readonly headTilt: number;
  /** 0 shut .. 1 wide. */
  readonly eye: number;
  /** 0 bill shut .. 1 open. */
  readonly gape: number;
  /** 0 folded .. 1 spread. */
  readonly wing: number;
  /** The folded wing hanging away from the body, 0 .. 1. */
  readonly droop: number;
  /** -1 .. 1, the slow rise and fall of a sleeping chest. */
  readonly breath: number;
  readonly feetDown: boolean;
}

export interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const HOOK = { x: 306, y: 1082, heading: -0.28 } as const;
const HOOK_FEET: readonly Pt[] = [
  { x: 556, y: branchTop(556) + 12 },
  { x: 62, y: 806 },
  { x: 74, y: 960 },
  { x: 636, y: branchBottom(636) - 6 },
  { x: 150, y: 1530 },
  { x: 120, y: 1336 },
];
const BIG_HOOK: ClawPose = { wrist: { x: 446, y: 880 }, angle: 0.03, open: 0.92, flip: 1 };
const SMALL_HOOK: ClawPose = { wrist: { x: 470, y: 1190 }, angle: 0.1, open: 0.5, flip: -1 };

const toWorld = (p: Pt, b: { x: number; y: number; heading: number }): Pt => {
  const [c, s] = [Math.cos(b.heading) * CRAB_SCALE, Math.sin(b.heading) * CRAB_SCALE];
  return { x: b.x + p.x * c - p.y * s, y: b.y + p.x * s + p.y * c };
};

function antennaeOf(b: { x: number; y: number; heading: number }, t: number): readonly (readonly Pt[])[] {
  const sway = (k: number, phase: number): number => k * Math.sin(t * 2.3 + phase);
  return [
    [{ x: 170, y: -5 }, { x: 262, y: -14 }, { x: 330, y: -150 + sway(10, 0) }, { x: 480, y: -350 + sway(20, 0.7) }, { x: 720, y: -300 + sway(30, 1.4) }, { x: 900, y: -210 + sway(44, 2.1) }],
    [{ x: 170, y: 5 }, { x: 270, y: 8 }, { x: 390, y: 36 + sway(10, 1) }, { x: 540, y: 130 + sway(20, 1.7) }, { x: 700, y: 262 + sway(32, 2.4) }, { x: 860, y: 300 + sway(44, 3.1) }],
  ].map((line) => line.map((p) => toWorld(p, b)));
}

/** The crab in the hook's pose: everything but the claw only breathes and feels the air. */
export function hookCrab(t: number): CrabPose {
  const tap = window01(t, 0.35, 0.95, 0.3);
  return {
    ...HOOK,
    feet: HOOK_FEET.map((f, i) => (i === 3 ? { x: f.x + 26 * tap, y: f.y - 30 * tap } : f)),
    bigClaw: { ...BIG_HOOK, wrist: { x: BIG_HOOK.wrist.x + 7 * Math.sin(t * 1.9), y: BIG_HOOK.wrist.y - 5 * Math.sin(t * 2.6) }, open: BIG_HOOK.open + 0.05 * Math.sin(t * 3.1) },
    smallClaw: { ...SMALL_HOOK, open: SMALL_HOOK.open + 0.14 * Math.sin(t * 2.2) },
    antennae: antennaeOf(HOOK, t),
  };
}

// The climb: up the trunk out of the dark and along the branch.
const PATH: readonly Pt[] = (() => {
  const line = spline([{ x: 120, y: 2520 }, { x: 118, y: 2150 }, { x: 122, y: 1800 }, { x: 128, y: 1480 }, { x: 146, y: 1290 }, { x: 226, y: 1150 }, { x: HOOK.x, y: HOOK.y }], 24);
  return line;
})();
const LENGTHS: readonly number[] = PATH.reduce<number[]>((acc, p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1]! + Math.hypot(p.x - PATH[i - 1]!.x, p.y - PATH[i - 1]!.y));
  return acc;
}, []);
const PATH_LEN = LENGTHS[LENGTHS.length - 1]!;

/** A point on the climb `s` px along it, with its heading (past either end it runs straight on). */
export function climbAt(s: number): { x: number; y: number; heading: number } {
  const c = Math.max(0, Math.min(PATH_LEN, s));
  let i = 1;
  while (i < LENGTHS.length - 1 && LENGTHS[i]! < c) i++;
  const [a, b] = [PATH[i - 1]!, PATH[i]!];
  const u = (c - LENGTHS[i - 1]!) / (LENGTHS[i]! - LENGTHS[i - 1]! || 1);
  const heading = lerp(Math.atan2(b.y - a.y, b.x - a.x), HOOK.heading, ramp(c, PATH_LEN - 260, PATH_LEN));
  return { x: lerp(a.x, b.x, u) + Math.cos(heading) * (s - c), y: lerp(a.y, b.y, u) + Math.sin(heading) * (s - c), heading };
}

/** How far along the climb the crab is. */
const climbS = (t: number): number => curveAt([
  { t: AT.reach, at: 0, rate: 500 },
  { t: AT.reach + (AT.climbEnd - AT.reach) * 0.55, at: PATH_LEN * 0.56 },
  { t: AT.climbEnd, at: PATH_LEN, rate: 0 },
], t).at;

/** Feet ahead of the body as it climbs, in body coordinates, and each foot's place in the gait. */
const CLIMB_FEET: readonly { readonly at: Pt; readonly phase: number }[] = [
  { at: { x: 640, y: -170 }, phase: 0 },
  { at: { x: 160, y: -400 }, phase: 0.5 },
  { at: { x: -210, y: -270 }, phase: 0.2 },
  { at: { x: 640, y: 170 }, phase: 0.5 },
  { at: { x: 160, y: 400 }, phase: 0 },
  { at: { x: -210, y: 270 }, phase: 0.7 },
];
const STRIDE = 240;

function climbFoot(i: number, s: number): Pt {
  const { at, phase } = CLIMB_FEET[i]!;
  const cycle = s / STRIDE + phase;
  const n = Math.floor(cycle);
  const plant = (k: number): Pt => toWorld(at, climbAt((k - phase) * STRIDE + STRIDE * 0.5));
  const swing = clamp01((cycle - n) / 0.34);
  const u = swing * swing * (3 - 2 * swing);
  const [a, b] = [plant(n), plant(n + 1)];
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

function climbingCrab(t: number): CrabPose {
  const s = climbS(t);
  const b = climbAt(s);
  const settle = ramp(t, AT.climbEnd - 0.45, AT.climbEnd);
  const hook = hookCrab(t);
  const feet = HOOK_FEET.map((_, i) => {
    const f = climbFoot(i, s);
    const g = hook.feet[i]!;
    return { x: lerp(f.x, g.x, settle), y: lerp(f.y, g.y, settle) };
  });
  const wristOf = (p: Pt, h: ClawPose, u: number): Pt => {
    const w = toWorld(p, b);
    return { x: lerp(w.x, h.wrist.x, u), y: lerp(w.y, h.wrist.y, u) };
  };
  // The claw comes round on "grabs" and is about the wing on "wing".
  const reach = ramp(t, AT.grabs - 0.22, AT.wing);
  return {
    ...b,
    feet,
    bigClaw: { ...hook.bigClaw, wrist: wristOf({ x: 170, y: -196 }, hook.bigClaw, reach), angle: lerp(b.heading + 1.1, BIG_HOOK.angle, reach), open: lerp(0.15, hook.bigClaw.open, reach) },
    smallClaw: { ...hook.smallClaw, wrist: wristOf({ x: 170, y: 184 }, hook.smallClaw, reach), angle: lerp(b.heading - 1.1, SMALL_HOOK.angle, reach) },
    antennae: antennaeOf(b, t),
  };
}

/** The crab during the night shot; null before it's in reach of the frame. */
export function nightCrab(t: number): CrabPose | null {
  if (t < AT.reach) return null;
  const base = climbingCrab(t);
  if (t < AT.wing) return base;
  const shut = ramp(t, AT.snap - 0.09, AT.snap);
  const lunge = ramp(t, AT.snap - 0.14, AT.snap) * (1 - 0.7 * ramp(t, AT.snap + 0.25, AT.fall + 0.3));
  const windUp = ramp(t, AT.wing, AT.snap - 0.14) * (1 - shut);
  return {
    ...base,
    bigClaw: {
      ...base.bigClaw,
      wrist: { x: base.bigClaw.wrist.x + 34 * lunge - 14 * windUp, y: base.bigClaw.wrist.y + 8 * lunge },
      open: lerp(base.bigClaw.open + 0.1 * windUp, 0.04, shut),
    },
  };
}

// ---------------------------------------------------------------- the bird

/** A sleeping chest: one breath every 1.8 s. */
export const breathAt = (t: number): number => Math.sin((t / 1.8) * Math.PI * 2);

const ASLEEP: BirdPose = {
  ...PERCH, rotation: 0, scale: BIRD_SCALE, neck: 0, headTilt: 0.14, eye: 0, gape: 0, wing: 0, droop: 0, breath: 0, feetDown: true,
};

export const hookBird = (t: number): BirdPose => ({ ...ASLEEP, breath: breathAt(t), headTilt: ASLEEP.headTilt + 0.02 * breathAt(t) });

/** The bird during the night shot: asleep, jolted awake, then falling. */
export function nightBird(t: number): BirdPose {
  if (t < AT.snap) return hookBird(t);
  const woke = ramp(t, AT.snap, AT.snap + 0.09);
  const flail = ramp(t, AT.snap + 0.2, AT.fall + 0.1);
  const drop = Math.max(0, t - AT.fall);
  return {
    ...ASLEEP,
    x: PERCH.x + 40 * drop,
    y: PERCH.y + 1500 * drop * drop,
    rotation: 0.14 * flail + 0.62 * drop,
    neck: woke * 1,
    headTilt: lerp(ASLEEP.headTilt, -0.3, woke),
    eye: woke,
    gape: woke * (0.85 + 0.15 * Math.sin(t * 40)),
    wing: flail,
  };
}

/** The bird on the ground, low-angle: it barely moves, its head sinking. */
export function groundBird(t: number): BirdPose {
  const u = ramp(t, AT.ground, AT.firstEyes + 0.9);
  return {
    x: 500, y: 1268, rotation: 0.05, scale: 0.98, neck: lerp(-0.12, -0.3, u), headTilt: lerp(0.08, 0.42, u), eye: 0.28, gape: 0.08, wing: 0, droop: 0.5,
    breath: 0.7 * Math.sin((t / 2.6) * Math.PI * 2), feetDown: false,
  };
}

// ---------------------------------------------------------------- camera

const camKeys = (pick: (c: Cam) => number): readonly Key[] => {
  const CAMS: readonly (readonly [number, Cam])[] = [
    [AT.hookOut, { x: 704, y: 880, zoom: 1.36 }],
    [said('low') - 0.1, { x: 700, y: 870, zoom: 1.26 }],
    [AT.reach + 0.62, { x: 470, y: 1130, zoom: 1 }],
    [AT.climbEnd - 0.5, { x: 520, y: 1060, zoom: 1 }],
    [AT.climbEnd, { x: 540, y: 960, zoom: 1 }],
    [AT.snap - 0.02, { x: 560, y: 950, zoom: 1.02 }],
    [AT.snap + 0.12, { x: 690, y: 900, zoom: 1.16 }],
    [AT.fall, { x: 696, y: 900, zoom: 1.16 }],
    [AT.ground + 0.2, { x: 680, y: 1900, zoom: 1 }],
  ];
  return CAMS.map(([t, c]) => ({ t, at: pick(c), rate: 0 }));
};
const [CAM_X, CAM_Y, CAM_ZOOM] = [camKeys((c) => c.x), camKeys((c) => c.y), camKeys((c) => c.zoom)];

export function nightCam(t: number): Cam {
  const since = t - AT.snap;
  const shake = since >= 0 && since < 0.42 ? 26 * (1 - since / 0.42) : 0;
  return {
    x: curveAt(CAM_X, t).at + shake * Math.sin(since * 92),
    y: curveAt(CAM_Y, t).at + shake * Math.cos(since * 71),
    zoom: curveAt(CAM_ZOOM, t).at,
  };
}

export const hookCam = (t: number): Cam => ({ x: 540, y: 960, zoom: 1 + 0.012 * (t + 0.6) });

// ---------------------------------------------------------------- feathers

export interface Feather {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly size: number;
  readonly pale: boolean;
}

const unit = (i: number, k: number): number => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Feathers knocked loose at the snap, in world px, drifting down. */
export function snapFeathers(t: number): readonly Feather[] {
  const u = t - AT.snap;
  if (u < 0 || t > AT.ground + 0.25) return [];
  return Array.from({ length: 13 }, (_, i) => {
    const kick = Math.min(u, 0.32);
    const a = unit(i, 1) * Math.PI * 2;
    const speed = 260 + 620 * unit(i, 2);
    return {
      x: WING_AT.x + 60 + Math.cos(a) * speed * kick + 34 * Math.sin(u * (2.6 + unit(i, 3) * 2) + i),
      y: WING_AT.y + Math.sin(a) * speed * kick + 170 * Math.max(0, u - 0.25) * (0.7 + unit(i, 4)),
      angle: u * (1.4 + unit(i, 5) * 3) * (i % 2 ? 1 : -1) + i,
      size: 46 + 54 * unit(i, 6) * unit(i, 12),
      pale: i % 3 === 0,
    };
  });
}

/** Feathers still settling in the low shot, screen px. */
export function groundFeathers(t: number): readonly Feather[] {
  return Array.from({ length: 6 }, (_, i) => {
    const u = clamp01((t - AT.ground - i * 0.09) / (2.1 + unit(i, 7) * 1.2));
    const eased = 1 - (1 - u) * (1 - u);
    const side = i % 2 === 0 ? 1 : -1;
    return {
      x: 540 + side * (250 + 240 * unit(i, 8)) + 46 * Math.sin(t * 1.7 + i * 2) * (1 - u),
      y: lerp(150 + 200 * unit(i, 9), 1236 + 70 * unit(i, 10), eased),
      angle: lerp(i, 0.1 * side + (1 - u) * 3 * side, eased),
      size: 54 + 40 * unit(i, 11),
      pale: i % 3 === 0,
    };
  });
}

// ---------------------------------------------------------------- the eyes in the dark

export interface EyePair {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** When its stalks start to rise. */
  readonly at: number;
}

/** The first crab's eyes, then the five that came, one by one along "five MORE crabs". */
export const EYE_PAIRS: readonly EyePair[] = [
  { x: 195, y: 1088, size: 1.3, at: AT.firstEyes },
  { x: 884, y: 1072, size: 1.16, at: AT.moreEyes },
  { x: 372, y: 950, size: 0.86, at: AT.moreEyes + 0.15 },
  { x: 742, y: 930, size: 0.82, at: AT.moreEyes + 0.32 },
  { x: 560, y: 870, size: 0.68, at: AT.moreEyes + 0.5 },
  { x: 58, y: 930, size: 0.74, at: AT.moreEyes + 0.66 },
];

/** How far the low shot has risen to clear the ground for the invitation, px. */
export const groundLiftAt = (t: number): number => 270 * ramp(t, AT.ctaStart - 0.2, AT.ctaStart + 0.3);

/** How far a pair has risen, 0 .. 1. */
export const eyeRiseAt = (p: EyePair, t: number): number => ramp(t, p.at, p.at + 0.32);
/** They edge in on the bird once they're up. */
export const eyeCreepAt = (p: EyePair, t: number): number => clamp01((t - p.at) / 3) * 26;

// ---------------------------------------------------------------- shots and washes

export type ShotId = 'hook' | 'night' | 'ground';

export interface Shot {
  readonly id: ShotId;
  /** The time its pieces are posed at (the hook runs just before 0 across the loop point). */
  readonly at: number;
}

export interface FrameState {
  readonly under: Shot;
  /** Coming in over `under`. */
  readonly over: Shot | null;
  /** How far in, 0 .. 1. */
  readonly u: number;
  readonly how: 'wash' | 'fade';
}

const still = (id: ShotId, at: number): FrameState => ({ under: { id, at }, over: null, u: 0, how: 'wash' });

const CROSS_FADE_S = 0.16;
const WASH_S = 0.3;

/** Which shots are on screen at time t, in [0, LOOP_S]. */
export function shotsAt(t: number): FrameState {
  if (t < AT.hookOut) return still('hook', t);
  if (t < AT.hookOut + WASH_S) return { under: { id: 'hook', at: t }, over: { id: 'night', at: t }, u: (t - AT.hookOut) / WASH_S, how: 'wash' };
  if (t < AT.ground) return still('night', t);
  if (t < AT.ground + CROSS_FADE_S) return { under: { id: 'night', at: t }, over: { id: 'ground', at: t }, u: (t - AT.ground) / CROSS_FADE_S, how: 'fade' };
  if (t < AT.wash) return still('ground', t);
  const u = (t - AT.wash) / (LOOP_S - AT.wash);
  // The last wash lands exactly on frame 1.
  return u >= 1 ? still('hook', t - LOOP_S) : { under: { id: 'ground', at: t }, over: { id: 'hook', at: t - LOOP_S }, u, how: 'wash' };
}

/** The crab, bird and camera of a night shot at its time (the hook is the same world, just before the snap). */
export interface NightPose {
  readonly cam: Cam;
  readonly crab: CrabPose | null;
  readonly bird: BirdPose;
}

export const nightPoseOf = (shot: Shot): NightPose => (shot.id === 'hook'
  ? { cam: hookCam(shot.at), crab: hookCrab(shot.at), bird: hookBird(shot.at) }
  : { cam: nightCam(shot.at), crab: nightCrab(shot.at), bird: nightBird(shot.at) });

// ---------------------------------------------------------------- words

/** A row of the spoken caption: its words, which is being said, where and how big. */
export interface SpokenRow {
  readonly words: readonly string[];
  /** Index of the word being said; -1 before its first word. */
  readonly current: number;
  readonly y: number;
  readonly size: number;
  /** How solid its words are before they're said. */
  readonly unsaid: number;
}

/** How the script breaks into caption lines, by word count. The first two lines are the hook, shown together. */
const LINE_WORDS = [4, 3, 4, 3, 4, 4, 2, 4, 3, 3, 4, 1, 3, 3, 2] as const;
const HOOK_LINES = 2;
const HOOK_ROWS = [{ y: 372, size: 146 }, { y: 506, size: 146 }] as const;
const ROW = { y: 400, size: 126 } as const;

export const LINES: readonly (readonly Word[])[] = LINE_WORDS.reduce<{ at: number; lines: (readonly Word[])[] }>(
  (acc, n) => ({ at: acc.at + n, lines: [...acc.lines, WORDS.slice(acc.at, acc.at + n)] }),
  { at: 0, lines: [] },
).lines;

const startOf = (line: readonly Word[]): number => inVoice(line[0]!.start);
const currentIn = (line: readonly Word[], t: number): number => line.reduce((c, w, i) => (t >= inVoice(w.start) ? i : c), -1);
const texts = (line: readonly Word[]): readonly string[] => line.map((w) => w.text);

/** The spoken caption at time t: the hook's two rows up from frame 1, then one line at a time. */
export function spokenAt(time: number): readonly SpokenRow[] {
  const t = time >= LOOP_S ? time - LOOP_S : time;
  if (t < startOf(LINES[HOOK_LINES]!)) {
    return LINES.slice(0, HOOK_LINES).map((line, i) => ({
      words: texts(line), current: i === 0 ? Math.max(0, currentIn(line, t)) : currentIn(line, t), unsaid: 1, ...HOOK_ROWS[i]!,
    }));
  }
  const line = [...LINES].reverse().find((l) => t >= startOf(l))!;
  return [{ words: texts(line), current: currentIn(line, t), unsaid: 0.55, ...ROW }];
}

/** The big inked "SNAP", on the word. */
export const SNAP_MARK = { y: 760, size: 300 } as const;
export const snapMarkAt = (t: number): number => window01(t, AT.snap, AT.fall + 0.2, 0.05);

// ---------------------------------------------------------------- the invitation at the end

export const CTA_FADE_S = 0.3;
export const CTA = {
  x: 372,
  y: 1132,
  size: 122,
  subY: 1226,
  subSize: 72,
  /** Arrow: a hand-inked curve, down and to the left, towards the channel name. */
  arrow: [{ x: 300, y: 1262 }, { x: 212, y: 1300 }, { x: 176, y: 1380 }, { x: 170, y: 1470 }] as readonly Pt[],
  /** The small inked card of the game: its top-left corner, and size. */
  card: { x: 700, y: 954, w: 326, h: 296 },
} as const;

/** How much of the invitation shows: only in the last 3 s, gone 0.6 s before the loop point. */
export const ctaAt = (t: number): number => window01(t, AT.ctaStart + 0.1, AT.ctaGone, CTA_FADE_S);

/** The card's crab eating and growing: a size step on each bite. */
export const cardCrabAt = (t: number): number => 1.05 + 0.13 * ramp(t, AT.ctaStart + 0.6, AT.ctaStart + 0.75) + 0.13 * ramp(t, AT.ctaStart + 1.3, AT.ctaStart + 1.45);

/** Everything on screen at time t, as data: t = 0 and t = LOOP_S must match exactly. */
export function stateAt(t: number): { readonly shots: FrameState; readonly pose: NightPose | null; readonly spoken: readonly SpokenRow[]; readonly snap: number; readonly cta: number } {
  const shots = shotsAt(t);
  const top = shots.over && shots.u >= 0.5 ? shots.over : shots.under;
  return { shots, pose: top.id === 'hook' || top.id === 'night' ? nightPoseOf(top) : null, spoken: spokenAt(t), snap: snapMarkAt(t), cta: ctaAt(t) };
}
