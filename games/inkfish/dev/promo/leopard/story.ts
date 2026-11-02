import { BOIL_FPS } from '../../../src/art/textures';
import { lerp, ramp } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This leopard seal put a photographer's head in her MOUTH": Paul Nicklen,
 * Antarctica, 2006: a big female leopard seal took his camera and head in her
 * jaws without hurting him, then for four days kept bringing him penguins.
 * Told by a narrator (words.ts), each beat timed to the words, a function of
 * time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "This leopard seal put a photographer's head in her MOUTH." (nervous):
 *         close, the seal's jaws wide round a diver's camera dome and head.
 *   3.9   "Antarctica, two thousand six." (dramatic): wide, ice overhead, light
 *         shafts, the seal swimming past the small diver; the place and year.
 *   6.3   "Her head was bigger than a grizzly bear's!": the seal's head with a
 *         painted grizzly's head for scale, growing as it is said.
 *   8.5   "But she didn't bite…" (surprised): the jaws again, tense, then open
 *         wide and let go; the diver slides out, a beat of stillness.
 *   9.8   "she brought him a PENGUIN!" (excited): bright, the seal swims up with
 *         a penguin across its jaws, held out to the camera.
 *  11.4   "Then another. And another. For four DAYS!" (chuckles): penguins plop
 *         down in a heap in front of the diver; a day counter 1 to 4.
 *  14.6   "He says she thought he was a" (sarcastic): the seal's flat stare.
 *  15.6   "useless hunter…": a penguin zips past the clumsy diver.
 *  17.0   "who'd starve." (sad, quiet): cold, grey-blue, the diver sinks, the seal
 *         looks on with a worried eye, a penguin left floating.
 *  18.1   "And it all started when": back to the jaws of frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
export function saidEnd(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const MOUTH_AT = said('MOUTH.');
export const ANTARCTICA_AT = said('Antarctica,');
export const YEAR_AT = said('two thousand six.');
export const HER_AT = said('Her');
export const BIGGER_AT = said('bigger');
export const GRIZZLY_AT = said('grizzly');
export const BUT_AT = said('But');
export const DIDNT_AT = said('didn\'t');
export const BITE_AT = said('bite…');
export const BROUGHT_AT = said('brought');
export const PENGUIN_AT = said('PENGUIN!');
export const THEN_AT = said('Then');
export const ANOTHER_AT = said('another.');
export const AND_AT = said('And');
export const ANOTHER2_AT = said('another.', 2);
export const FOR_AT = said('For');
export const FOUR_AT = said('four');
export const DAYS_AT = said('DAYS!');
export const HE_AT = said('He');
export const USELESS_AT = said('useless');
export const HUNTER_AT = said('hunter…');
export const WHOD_AT = said('who\'d');
export const STARVE_AT = said('starve.');
export const START_AT = said('And', 2);

export const decay = (t: number, at: number, tau: number): number => (t < at ? 0 : Math.exp(-(t - at) / tau));

// ---------------------------------------------------------------- scenes

export type SceneId = 'jaws' | 'ice' | 'bear' | 'offer' | 'pile' | 'glare' | 'drift';
export const SCENE_IDS: readonly SceneId[] = ['jaws', 'ice', 'bear', 'offer', 'pile', 'glare', 'drift'];
export const FADE = 0.25;

/** Where each scene starts (the cut times are just before the words). */
export const CUT = {
  ice: ANTARCTICA_AT - 0.12,
  bear: HER_AT - 0.12,
  jaws2: BUT_AT - 0.12,
  offer: said('she', 2) - 0.1,
  pile: THEN_AT - 0.1,
  glare: HE_AT - 0.05,
  drift: USELESS_AT - 0.25,
  back: START_AT - 0.35,
} as const;

const SEGMENTS: readonly { readonly id: SceneId; readonly from: number; readonly to: number }[] = [
  { id: 'jaws', from: -1, to: CUT.ice },
  { id: 'ice', from: CUT.ice, to: CUT.bear },
  { id: 'bear', from: CUT.bear, to: CUT.jaws2 },
  { id: 'jaws', from: CUT.jaws2, to: CUT.offer },
  { id: 'offer', from: CUT.offer, to: CUT.pile },
  { id: 'pile', from: CUT.pile, to: CUT.glare },
  { id: 'glare', from: CUT.glare, to: CUT.drift },
  { id: 'drift', from: CUT.drift, to: CUT.back },
  { id: 'jaws', from: CUT.back, to: LOOP_S + 1 },
];

export function sceneAlpha(id: SceneId, t: number): number {
  let a = 0;
  for (const s of SEGMENTS) {
    if (s.id !== id) continue;
    const inn = s.from < 0 ? 1 : ramp(t, s.from, s.from + FADE);
    const out = s.to > LOOP_S ? 1 : 1 - ramp(t, s.to, s.to + FADE);
    a = Math.max(a, inn * out);
  }
  return a;
}

// ---------------------------------------------------------------- camera

export interface Camera {
  readonly zoom: number;
  readonly dx: number;
  readonly dy: number;
  readonly rot: number;
}

export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const jolt = decay(t, MOUTH_AT, 0.4) + 0.8 * decay(t, PENGUIN_AT, 0.35) + 0.5 * decay(t, DAYS_AT, 0.35) + 0.7 * decay(t, BITE_AT, 0.4);
  const punch = 0.1 * decay(t, MOUTH_AT, 0.7) + 0.07 * decay(t, PENGUIN_AT, 0.5) + 0.05 * decay(t, DAYS_AT, 0.5);
  // The camera creeps in over the hook (nervous), eases out for the wide shot.
  return {
    zoom: 1.07 + 0.025 * Math.sin(ph) + punch + 0.03 * ramp(t, 0, MOUTH_AT) * (1 - ramp(t, MOUTH_AT, CUT.ice)),
    dx: 6 * Math.sin(2 * ph) + 16 * jolt * Math.sin(t * 71),
    dy: 5 * Math.sin(3 * ph) + 12 * jolt * Math.sin(t * 83 + 1),
    rot: 0.012 * Math.sin(ph) + 0.01 * decay(t, MOUTH_AT, 0.5) * Math.sin(t * 40),
  };
}

// ---------------------------------------------------------------- placed animals

export interface Placed {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly rot: number;
  readonly face: 1 | -1;
  readonly beat: number;
}

const cyc = (t: number, n: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** The jaws scene: the seal, how wide, the diver's head in the seal's own units. */
export interface JawsAt {
  readonly seal: Placed;
  readonly gape: number;
  readonly lid: number;
  readonly diver: { readonly x: number; readonly y: number; readonly rot: number; readonly kick: number };
}

/** The hook (and its return): the jaws wide, the diver's head inside, trembling. */
export function jawsAt(t: number): JawsAt {
  const hook = t < 8 || t > 12;
  const u = hook ? t : t - CUT.jaws2;
  if (hook) {
    const gape = 0.9 + 0.05 * Math.sin(cyc(t, 5)) - 0.34 * decay(t, MOUTH_AT, 0.5) * ramp(t, MOUTH_AT - 0.05, MOUTH_AT + 0.05);
    return {
      seal: { x: -667 + 10 * Math.sin(cyc(t, 2)), y: 398 + 8 * Math.sin(cyc(t, 3)), len: 3300, rot: 0, face: 1, beat: cyc(t, 6) },
      gape,
      lid: 0.12,
      diver: { x: 168 + 1.6 * Math.sin(cyc(t, 7)), y: 46 + 1.6 * Math.sin(cyc(t, 9) + 1), rot: 0.24 + 0.02 * Math.sin(cyc(t, 11)), kick: 0.12 * Math.sin(cyc(t, 8)) },
    };
  }
  // "But she didn't bite…": the jaws tense, then open wide; the diver slides out; stillness.
  const open = ramp(t, DIDNT_AT, BITE_AT + 0.2);
  const slide = ramp(t, BITE_AT + 0.05, BITE_AT + 0.75);
  const back = ramp(t, BITE_AT + 0.1, BITE_AT + 0.9);
  return {
    seal: { x: -667 - 90 * back, y: 398 + 8 * Math.sin(u * 2), len: 3300, rot: -0.03 * back, face: 1, beat: u * 2.4 },
    gape: lerp(0.5 + 0.03 * Math.sin(u * 14), 1, open),
    lid: lerp(0.3, 0, ramp(t, BITE_AT, BITE_AT + 0.2)),
    diver: { x: lerp(168, 340, slide), y: lerp(46, 36, slide), rot: 0.24 - 0.3 * slide, kick: 0.2 * Math.sin(u * 7) * slide },
  };
}

/** The ice scene: the seal swims past, the diver small, drifting. */
export function iceAt(t: number): { readonly seal: Placed; readonly diver: { readonly x: number; readonly y: number; readonly rot: number } } {
  const s = ramp(t, CUT.ice, YEAR_AT + 0.6);
  return {
    seal: { x: lerp(-700, 300, s), y: 1060 + 18 * Math.sin(t * 1.7), len: 1150, rot: 0.04 * Math.sin(t * 1.3), face: 1, beat: t * 4.2 },
    diver: { x: 760 + 20 * Math.sin(t * 1.1), y: 800 + 14 * Math.sin(t * 1.5), rot: 0.12 + 0.04 * Math.sin(t * 1.9) },
  };
}

/** The bear scene: the seal's head grows as "bigger" is said; the grizzly's stays. */
export function bearAt(t: number): { readonly seal: Placed; readonly bear: { readonly x: number; readonly y: number; readonly len: number }; readonly grow: number } {
  const grow = ramp(t, BIGGER_AT - 0.1, GRIZZLY_AT + 0.3);
  const len = lerp(2150, 2650, grow);
  const k = len / 410;
  return {
    seal: { x: 1045 - 206 * k, y: 1010 - 3 * k + 6 * Math.sin(t * 1.6), len, rot: 0, face: 1, beat: t * 2.2 },
    bear: { x: 400, y: 480 + 5 * Math.sin(t * 1.3), len: 112 * k },
    grow,
  };
}

/** The offer: the seal swims up with a penguin across its jaws. */
export function offerAt(t: number): { readonly seal: Placed; readonly gape: number; readonly diver: { readonly x: number; readonly y: number; readonly rot: number }; readonly pop: number } {
  const s = ramp(t, CUT.offer - 0.2, CUT.offer + 0.7);
  return {
    seal: { x: lerp(-420, 230, s), y: 760 + 14 * Math.sin(t * 2.4), len: 1400, rot: lerp(0.1, -0.03, s), face: 1, beat: t * 5 },
    gape: 0.2 + 0.04 * Math.sin(t * 6),
    diver: { x: 790 + 12 * Math.sin(t * 1.6), y: 1020 + 10 * Math.sin(t * 2.1), rot: 0.14 },
    pop: decay(t, PENGUIN_AT, 0.4),
  };
}

// ---------------------------------------------------------------- the pile

export interface PileSpot { readonly x: number; readonly y: number; readonly rot: number; readonly len: number; readonly at: number; readonly face: 1 | -1 }

const SPOTS: readonly Omit<PileSpot, 'at'>[] = [
  { x: 640, y: 1000, rot: -0.3, len: 250, face: 1 },
  { x: 800, y: 930, rot: 0.5, len: 240, face: -1 },
  { x: 700, y: 810, rot: -0.9, len: 240, face: 1 },
  { x: 900, y: 1050, rot: 0.2, len: 250, face: -1 },
  { x: 610, y: 1130, rot: 0.9, len: 230, face: 1 },
  { x: 880, y: 800, rot: -0.4, len: 230, face: -1 },
  { x: 560, y: 880, rot: 0.3, len: 230, face: 1 },
  { x: 790, y: 1110, rot: -0.6, len: 230, face: -1 },
];
const ARRIVES: readonly number[] = [-9, ANOTHER_AT - 0.35, AND_AT - 0.35, ANOTHER2_AT - 0.35, FOR_AT - 0.1, FOUR_AT - 0.2, DAYS_AT - 0.35, DAYS_AT + 0.5];
export const PILE: readonly PileSpot[] = SPOTS.map((s, i) => ({ ...s, at: ARRIVES[i]! }));
export const TICK_AT: readonly number[] = [FOR_AT + 0.05, FOUR_AT - 0.12, FOUR_AT + 0.12, DAYS_AT];

/** A penguin dropping in: how far above its spot (px), how squashed it is on landing, 0 before it arrives. */
export function dropAt(t: number, at: number): { readonly here: boolean; readonly dy: number; readonly squash: number } {
  const u = (t - at) / 0.4;
  if (u < 0) return { here: false, dy: 0, squash: 0 };
  if (u < 1) return { here: true, dy: -1300 * (1 - u) * (1 - u), squash: 0 };
  const w = (u - 1) * 0.4;
  return { here: true, dy: -22 * Math.exp(-w * 5) * Math.abs(Math.sin(w * 9)), squash: Math.exp(-w * 8) };
}

export function countAt(t: number): number {
  return TICK_AT.filter((x) => t >= x).length;
}
/** 0 .. 1 pop of the counter, 1 within a beat of each tick. */
export const countPop = (t: number): number => Math.max(...TICK_AT.map((x) => decay(t, x, 0.18)));
export const counterAt = (t: number): number => ramp(t, TICK_AT[0]! - 0.05, TICK_AT[0]! + 0.1) * (1 - ramp(t, CUT.glare - 0.05, CUT.glare + 0.15));

export function pileDiver(t: number): { readonly x: number; readonly y: number; readonly rot: number; readonly kick: number } {
  const shake = decay(t, DAYS_AT, 0.5) * Math.sin(t * 40);
  return { x: 360 + 4 * Math.sin(t * 2) + 4 * shake, y: 990 + 8 * Math.sin(t * 1.6), rot: 0.05 * Math.sin(t * 1.3), kick: 0.2 * Math.sin(t * 4) };
}

// ---------------------------------------------------------------- glare, drift

export function glareAt(t: number): Placed & { readonly lid: number; readonly slant: number } {
  const s = ramp(t, CUT.glare, HE_AT + 0.9);
  return { x: -330 + 12 * s, y: 900, len: lerp(2300, 2420, s), rot: 0.01 + 0.015 * Math.sin(t * 1.4), face: 1, beat: t * 1.2, lid: 0.45 + 0.08 * Math.sin(t * 2), slant: 0.55 };
}

/** The zipping penguin: x runs right to left across the diver's reach at "useless". */
export function zipAt(t: number): { readonly x: number; readonly y: number; readonly on: number } {
  const u = (t - (USELESS_AT - 0.05)) / 0.62;
  return { x: lerp(1400, -300, Math.min(1, Math.max(0, u))), y: 800 + 30 * Math.sin(u * 7), on: u > 0 && u < 1 ? 1 : 0 };
}

export function driftAt(t: number): {
  readonly diver: { readonly x: number; readonly y: number; readonly rot: number; readonly kick: number };
  readonly seal: Placed;
  readonly sad: number;
  readonly sealIn: number;
  readonly miss: number;
} {
  const sad = ramp(t, WHOD_AT - 0.15, WHOD_AT + 0.45);
  const flail = decay(t, USELESS_AT + 0.1, 0.5) * (1 - sad);
  const swing = Math.sin((t - USELESS_AT) * 9);
  const sealIn = ramp(t, WHOD_AT - 0.5, WHOD_AT + 0.7);
  return {
    diver: {
      x: 260 + 20 * Math.sin(t * 1.4) + 24 * flail * swing,
      y: lerp(880 + 14 * Math.sin(t * 1.7), 1010, sad),
      rot: lerp(0.1 + 0.55 * flail * swing + 0.06 * Math.sin(t * 2.1), 0.5, sad),
      kick: lerp(0.35 * Math.sin(t * 8) * (0.3 + flail), 0.08, sad),
    },
    seal: { x: lerp(2000, 1330, sealIn), y: 880 + 12 * Math.sin(t * 1.3), len: 1300, rot: 0.05, face: -1, beat: t * 2.3 },
    sad,
    sealIn,
    miss: flail,
  };
}

// ---------------------------------------------------------------- text and washes

export const placeAt = (t: number): number => ramp(t, ANTARCTICA_AT - 0.05, ANTARCTICA_AT + 0.2) * (1 - ramp(t, CUT.bear - 0.1, CUT.bear + 0.1));
export const yearAt = (t: number): number => ramp(t, YEAR_AT - 0.05, YEAR_AT + 0.2) * (1 - ramp(t, CUT.bear - 0.1, CUT.bear + 0.1));
export const tagAt = (t: number): number => ramp(t, GRIZZLY_AT - 0.1, GRIZZLY_AT + 0.2) * (1 - ramp(t, CUT.jaws2 - 0.1, CUT.jaws2 + 0.1));
export const pengTextAt = (t: number): number => ramp(t, PENGUIN_AT - 0.05, PENGUIN_AT + 0.12) * (1 - ramp(t, CUT.pile - 0.15, CUT.pile + 0.1));
/** The cold, flat wash of the sad line, and the white flash on "bite…". */
export const sadAt = (t: number): number => ramp(t, WHOD_AT - 0.15, WHOD_AT + 0.45) * (1 - ramp(t, CUT.back, CUT.back + 0.35));
export const flashAt = (t: number): number => 0.4 * decay(t, BITE_AT + 0.15, 0.12) * ramp(t, BITE_AT + 0.1, BITE_AT + 0.16) + 0.25 * decay(t, PENGUIN_AT, 0.1);
export const punchAt = (t: number): number => decay(t, MOUTH_AT, 0.6);
