import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import {
  capyHeadAt, type CapybaraPose, headFor, type PelicanHead, type PelicanPose, PELICAN_K, type Pt, worldToOwn,
} from './rig';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This pelican tried to swallow a CAPYBARA!": at a zoo in Japan a pelican
 * half-heartedly tried to eat a capybara pup, then the pup next to it; the
 * pups sat by their mother and didn't react; it gave up and nobody was hurt.
 * Told by a narrator (words.ts), one sunny enclosure seen through a camera
 * that cuts between shots, every beat a pure function of time over LOOP_S:
 *
 *   0     "This pelican tried to swallow a CAPYBARA!" (shock + comedy): frame 1,
 *         close: the white pelican's bill wide open over pup A, its pouch
 *         stretched round the pup's head and shoulders, the pup's face calm
 *         between the jaws, eyes half shut; the pouch tugs.
 *   2.8   "Its pouch holds about three GALLONS…" (curious): the pelican side-on,
 *         three gallon jugs pop into its pouch one by one; "3 gal" over "11 L".
 *   5.1   "so, at a zoo in Japan, it picked a baby capybara." (sly): wide on
 *         the sunny enclosure, "A zoo in Japan" and the flag; the mother and two
 *         pups by the pond; the pelican waddles in and, on "baby", goes for pup A.
 *   9.1   "The capybara? Didn't even FLINCH!" (surprise): close on the pup's
 *         deadpan face in the bill, then out to the pelican, a "!" over it.
 *  11.6   "So the pelican tried the NEXT baby." (cheeky): it lets go, shuffles
 *         over and, on "NEXT", tries pup B.
 *  14.0   "Same face." (sarcastic): both pups side by side, the same face; they
 *         blink together.
 *  15.3   "It gave up…" (sad): it lets go and waddles off, pouch empty, the
 *         colour drains.
 *  16.4   "but hey, at least" (mischief): it stops, turns back with a sly eye,
 *         leans in, and the cut lands on frame 1.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const AT = {
  pelican: said('pelican'),
  capy: said('CAPYBARA!'),
  its: said('Its'),
  pouch: said('pouch'),
  about: said('about'),
  three: said('three'),
  gallons: said('GALLONS…'),
  so: said('so,'),
  zoo: said('zoo'),
  japan: said('Japan,'),
  picked: said('picked'),
  baby: said('baby'),
  capyA: said('capybara.'),
  the: said('The'),
  capyQ: said('capybara?'),
  didnt: said('Didn\'t'),
  flinch: said('FLINCH!'),
  so2: said('So'),
  pelican2: said('pelican', 2),
  next: said('NEXT'),
  babyB: said('baby.'),
  same: said('Same'),
  face: said('face.'),
  it: said('It'),
  gave: said('gave'),
  up: said('up…'),
  but: said('but'),
  hey: said('hey,'),
  at: said('at', 2),
  least: said('least'),
} as const;

// ---------------------------------------------------------------- the shots

export type ShotName = 'hook' | 'pouch' | 'zoo' | 'flinch' | 'next' | 'same' | 'gave' | 'but';

export const CUTS = {
  pouch: AT.its - 0.12,
  zoo: AT.so - 0.1,
  flinch: AT.the - 0.1,
  next: AT.so2 - 0.1,
  same: AT.same - 0.12,
  gave: AT.it - 0.12,
  but: AT.but - 0.1,
  /** Back to frame 1, the bill coming down over pup A. */
  hook: AT.at + 0.18,
} as const;

export interface Shot {
  readonly name: ShotName;
  /** Seconds into the shot; the hook runs across the loop point, from before it (negative) to after. */
  readonly s: number;
}

export function shotAt(t: number): Shot {
  const u = wrap(t);
  if (u >= CUTS.hook) return { name: 'hook', s: u - LOOP_S };
  if (u < CUTS.pouch) return { name: 'hook', s: u };
  const order: readonly ShotName[] = ['pouch', 'zoo', 'flinch', 'next', 'same', 'gave', 'but'];
  let name: ShotName = 'pouch';
  for (const n of order) if (u >= CUTS[n as Exclude<ShotName, 'hook'>]) name = n;
  return { name, s: u - CUTS[name as Exclude<ShotName, 'hook'>] };
}

// ---------------------------------------------------------------- the cast

/** Pup A (tried first, frame 1), pup B (the next one), their mother behind. */
export const PUP_A = { x: -10, y: 1195, k: 1.05, face: 1, tone: 0 } as const;
export const PUP_B = { x: -340, y: 1180, k: 1.0, face: 1, tone: 0 } as const;
export const MOTHER = { x: -470, y: 1060, k: 1.45, face: 1, tone: 1 } as const;
const GROUND_Y = 1150;
/** How far right of a pup's head the pelican stands to get its pouch over the pup's head. */
const REACH_X = 360;
const DEADPAN = 0.56;

/** The point in the bill (head frame) that sits on the pup's head, and the engulfing bill's set. */
const IN_BILL: Pt = { x: 150, y: 50 };
const ENGULF = { a: 0.95, gape: 0.12, sack: 92, bulge: 0.55, seeThrough: 1 } as const;

const REST: PelicanHead = { x: 132, y: -292, a: 0.95, gape: 0, sack: 20, bulge: 0.4, seeThrough: 0, alarm: 0, squint: 0 };

function blendHead(a: PelicanHead, b: PelicanHead, u: number): PelicanHead {
  const v = clamp01(u);
  return {
    x: lerp(a.x, b.x, v), y: lerp(a.y, b.y, v), a: lerp(a.a, b.a, v), gape: lerp(a.gape, b.gape, v), sack: lerp(a.sack, b.sack, v), bulge: lerp(a.bulge, b.bulge, v),
    seeThrough: lerp(a.seeThrough, b.seeThrough, v), alarm: lerp(a.alarm, b.alarm, v), squint: lerp(a.squint, b.squint, v),
  };
}

const bodyAt = (x: number, face: 1 | -1 = -1) => ({ x, y: GROUND_Y, k: PELICAN_K, face });

/** The head round a pup's head and shoulders, for a body standing at `bodyX`; `tug` (0 .. 1) heaves the pouch. */
function engulfHead(pup: { readonly x: number; readonly y: number; readonly k: number; readonly face: 1 | -1 }, bodyX: number, tug: number): PelicanHead {
  const target = worldToOwn(bodyAt(bodyX), capyHeadAt(pup));
  const at = headFor(target, IN_BILL, ENGULF.a);
  return { ...REST, x: at.x - 2 * tug, y: at.y - 7 * tug, a: ENGULF.a - 0.02 * tug, gape: ENGULF.gape, sack: ENGULF.sack + 6 * tug, bulge: ENGULF.bulge, seeThrough: ENGULF.seeThrough };
}

/** The same head lifted clear, jaws apart: about to come down, or just let go. */
function hoverHead(pup: { readonly x: number; readonly y: number; readonly k: number; readonly face: 1 | -1 }, bodyX: number): PelicanHead {
  const e = engulfHead(pup, bodyX, 0);
  return { ...e, x: e.x + 10, y: e.y - 150, a: 0.3, gape: 0.7, sack: 40, seeThrough: 0 };
}

export interface PelicanState {
  readonly pose: PelicanPose;
  /** Which pup is in the bill: 'A', 'B' or none. */
  readonly holds: 'A' | 'B' | null;
  /** The three jugs in the pouch, each 0 (not there) .. 1 (in). */
  readonly jugs: readonly [number, number, number];
}

const pose = (x: number, face: 1 | -1, head: PelicanHead, extra: Partial<Pick<PelicanPose, 'lean' | 'step' | 'walk'>> = {}): PelicanPose => ({
  ...bodyAt(x, face), head, lean: extra.lean ?? 0, step: extra.step ?? 0, walk: extra.walk ?? 0,
});

/** Heaves of the pouch while it tries: a few slow tugs, faded in and out. */
function tugs(s: number, from: number, to: number, period: number): number {
  if (s <= from || s >= to) return 0;
  const env = ramp(s, from, from + 0.25) * (1 - ramp(s, to - 0.3, to));
  return env * Math.sin((Math.PI * (s - from)) / period) ** 2;
}

/** Walking from x0 to x1 between s0 and s1: where, the stride phase and how much it walks. */
function waddle(s: number, s0: number, s1: number, x0: number, x1: number): { readonly x: number; readonly step: number; readonly walk: number } {
  const u = clamp01((s - s0) / (s1 - s0));
  const x = lerp(x0, x1, u);
  const walking = s > s0 && s < s1 ? Math.min(1, (s - s0) / 0.15, (s1 - s) / 0.15) : 0;
  return { x, step: (Math.abs(x - x0) / 46) * Math.PI, walk: walking };
}

const A_BODY = capyHeadAt(PUP_A).x + REACH_X;
const B_BODY = capyHeadAt(PUP_B).x + REACH_X;
const POUCH_BODY = 900;

export function pelicanAt(t: number): PelicanState {
  const { name, s } = shotAt(t);
  const none: [number, number, number] = [0, 0, 0];
  switch (name) {
    case 'hook': {
      // From the cut (s about -0.73) the bill comes down over pup A, then holds and tugs.
      const down = ramp(s, CUTS.hook - LOOP_S, -0.18);
      const head = blendHead(hoverHead(PUP_A, A_BODY), engulfHead(PUP_A, A_BODY, tugs(s, 0.05, 2.75, 0.7)), down);
      return { pose: pose(A_BODY, -1, head, { lean: 0.12 * down }), holds: down > 0.5 ? 'A' : null, jugs: none };
    }
    case 'pouch': {
      const jug = (at: number): number => ramp(t, at - 0.12, at + 0.08);
      const jugs: [number, number, number] = [jug(AT.about), jug(AT.three), jug(AT.gallons)];
      const fill = jugs[0] + jugs[1] + jugs[2];
      const nod = Math.sin(Math.PI * clamp01((t - AT.gallons) / 0.5)) * 0.06;
      const head: PelicanHead = { ...REST, x: 128, y: -300, a: 0.3 + nod, gape: 0.04, sack: 34 + 30 * fill, bulge: 0.5, seeThrough: 1, alarm: 0, squint: 0 };
      return { pose: pose(POUCH_BODY, -1, head), holds: null, jugs };
    }
    case 'zoo': {
      // It waddles in from the right, stops by the pups, eyes pup A, and on "baby" goes for it.
      const w = waddle(t, CUTS.zoo, AT.picked - 0.1, A_BODY + 330, A_BODY);
      const eye = blendHead(REST, { ...hoverHead(PUP_A, A_BODY), gape: 0.1, sack: 22, squint: 0.6 }, ramp(t, AT.picked - 0.25, AT.picked + 0.25));
      const go = ramp(t, AT.baby - 0.05, AT.baby + 0.3);
      const head = blendHead(eye, engulfHead(PUP_A, A_BODY, tugs(t, AT.capyA, CUTS.flinch + 0.4, 0.7)), go);
      return { pose: pose(w.x, -1, head, { step: w.step, walk: w.walk, lean: 0.12 * go }), holds: go > 0.5 ? 'A' : null, jugs: none };
    }
    case 'flinch': {
      const shock = ramp(t, AT.flinch - 0.05, AT.flinch + 0.08) * (1 - ramp(t, CUTS.next - 0.3, CUTS.next));
      const base = engulfHead(PUP_A, A_BODY, tugs(t, CUTS.flinch - 0.2, AT.flinch - 0.1, 0.65));
      const head: PelicanHead = { ...base, alarm: shock, y: base.y - 6 * shock };
      return { pose: pose(A_BODY, -1, head, { lean: 0.12 }), holds: 'A', jugs: none };
    }
    case 'next': {
      // It lets go of A, shuffles left, and on "NEXT" tries B.
      const off = ramp(t, CUTS.next, CUTS.next + 0.45);
      const w = waddle(t, CUTS.next + 0.45, AT.next - 0.25, A_BODY, B_BODY);
      const lifted = blendHead(engulfHead(PUP_A, A_BODY, 0), { ...REST, squint: 0.5 }, off);
      const aim = ramp(t, AT.next - 0.35, AT.next - 0.05);
      const down = ramp(t, AT.next - 0.05, AT.next + 0.25);
      const head = blendHead(blendHead(lifted, hoverHead(PUP_B, B_BODY), aim), engulfHead(PUP_B, B_BODY, tugs(t, AT.babyB, CUTS.same + 1.4, 0.7)), down);
      const holds = off < 0.5 ? 'A' : down > 0.5 ? 'B' : null;
      return { pose: pose(w.x, -1, head, { step: w.step, walk: w.walk, lean: 0.12 * Math.max(1 - off, down) }), holds, jugs: none };
    }
    case 'same': {
      const head = engulfHead(PUP_B, B_BODY, tugs(t, CUTS.same - 0.4, AT.face + 0.1, 0.7));
      return { pose: pose(B_BODY, -1, head, { lean: 0.12 }), holds: 'B', jugs: none };
    }
    case 'gave': {
      // Lets go, turns away, waddles off with the empty pouch hanging.
      const off = ramp(t, CUTS.gave, CUTS.gave + 0.35);
      const sad: PelicanHead = { ...REST, x: 140, y: -270, a: 1.15, sack: 30, bulge: 0.35 };
      if (t < CUTS.gave + 0.38) {
        return { pose: pose(B_BODY, -1, blendHead(engulfHead(PUP_B, B_BODY, 0), sad, off), { lean: 0.12 * (1 - off) }), holds: off < 0.5 ? 'B' : null, jugs: none };
      }
      const w = waddle(t, CUTS.gave + 0.38, CUTS.but + 0.4, B_BODY, B_BODY + 320);
      return { pose: pose(w.x, 1, sad, { step: w.step * 0.8, walk: w.walk * 0.8 }), holds: null, jugs: none };
    }
    case 'but': {
      // Stops, turns back on "hey" with a sly eye, leans in on "at".
      const w = waddle(t, CUTS.gave + 0.38, CUTS.but + 0.4, B_BODY, B_BODY + 320);
      const sad: PelicanHead = { ...REST, x: 140, y: -270, a: 1.15, sack: 30, bulge: 0.35 };
      if (t < AT.hey - 0.05) return { pose: pose(w.x, 1, blendHead(sad, REST, ramp(t, CUTS.but, AT.hey)), { step: w.step * 0.8, walk: w.walk * 0.8 }), holds: null, jugs: none };
      const sly: PelicanHead = { ...REST, x: 150, y: -280, a: 0.55, gape: 0.05, squint: 0.85 };
      const lunge = ramp(t, AT.at - 0.05, CUTS.hook);
      const head: PelicanHead = { ...sly, x: sly.x + 40 * lunge, y: sly.y + 50 * lunge, gape: 0.05 + 0.6 * lunge };
      return { pose: pose(w.x, -1, head, { lean: 0.15 * lunge }), holds: null, jugs: none };
    }
  }
}

/** The three capybaras: pup A, pup B, the mother. They never react. */
export function capybarasAt(t: number): { readonly a: CapybaraPose; readonly b: CapybaraPose; readonly mother: CapybaraPose } {
  const u = wrap(t);
  // One slow blink together on "face."
  const blink = Math.sin(Math.PI * clamp01((u - AT.face) / 0.5));
  const lid = DEADPAN + (1 - DEADPAN) * Math.max(0, blink);
  return {
    a: { ...PUP_A, lid },
    b: { ...PUP_B, lid },
    mother: { ...MOTHER, lid: DEADPAN + 0.1 },
  };
}

/** What is in the shot: the mother and pup B stay out of frame 1 so it is the pelican and one pup. */
export function castAt(t: number): { readonly mother: boolean; readonly b: boolean } {
  const { name } = shotAt(t);
  const wide = name !== 'hook' && name !== 'pouch' && name !== 'flinch';
  return { mother: wide, b: wide || name === 'flinch' };
}

// ---------------------------------------------------------------- the camera

export interface Cam {
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
  /** 1 sharp background .. 0 soft (out of focus behind a close-up). */
  readonly focus: number;
}

const headA = capyHeadAt(PUP_A);
const headB = capyHeadAt(PUP_B);
export const HOOK_CAM: Cam = { zoom: 2.0, cx: headA.x - 20, cy: headA.y + 30, focus: 0 };

export function camAt(t: number): Cam {
  const { name, s } = shotAt(t);
  switch (name) {
    case 'hook': {
      const k = s - (CUTS.hook - LOOP_S);
      return { ...HOOK_CAM, zoom: HOOK_CAM.zoom + 0.045 * k, cy: HOOK_CAM.cy - 6 * k };
    }
    case 'pouch':
      return { zoom: lerp(2.35, 2.5, s / (CUTS.zoo - CUTS.pouch)), cx: POUCH_BODY - 330, cy: 790, focus: 0 };
    case 'zoo': {
      const push = ramp(t, AT.picked - 0.3, CUTS.flinch);
      return { zoom: lerp(1.0, 1.3, push), cx: lerp(-30, 60, push), cy: lerp(1040, 1060, push), focus: 1 - 0.6 * push };
    }
    case 'flinch': {
      const out = ramp(t, AT.didnt - 0.2, AT.didnt + 0.45);
      return { zoom: lerp(3.3, 2.1, out), cx: lerp(headA.x, headA.x + 110, out), cy: lerp(headA.y + 15, headA.y - 20, out), focus: 0 };
    }
    case 'next': {
      const u = ramp(t, CUTS.next, CUTS.same);
      return { zoom: lerp(1.5, 1.6, u), cx: lerp(40, -110, u), cy: 1060, focus: 0.6 };
    }
    case 'same':
      return { zoom: lerp(1.8, 1.9, s / (CUTS.gave - CUTS.same)), cx: (headA.x + headB.x) / 2 - 40, cy: (headA.y + headB.y) / 2 + 40, focus: 0 };
    case 'gave': {
      const u = ramp(t, CUTS.gave, CUTS.but);
      return { zoom: lerp(1.3, 1.25, u), cx: lerp(60, 250, u), cy: 1050, focus: 0.7 };
    }
    case 'but': {
      const u = ramp(t, CUTS.but, CUTS.hook);
      return { zoom: lerp(1.25, 1.4, u), cx: lerp(250, 300, u), cy: lerp(1050, 1030, u), focus: 0.7 };
    }
  }
}

// ---------------------------------------------------------------- mood and writing

export interface Mood {
  /** Colour drained to grey-blue, 0 .. 1 (the sad beat). */
  readonly drain: number;
  /** Warm golden sun, 0 .. 1. */
  readonly warm: number;
}

export function moodAt(t: number): Mood {
  const u = wrap(t);
  const sad = window01(u, CUTS.gave - 0.05, CUTS.but + 0.25, 0.3);
  const sly = window01(u, CUTS.zoo, CUTS.flinch, 0.3) + window01(u, CUTS.but, CUTS.hook + 0.01, 0.2) + window01(u, CUTS.next, CUTS.gave, 0.3) * 0.6;
  return { drain: 0.5 * sad, warm: 0.35 * clamp01(sly) };
}

/** The white flash on "FLINCH!". */
export function flashAt(t: number): number {
  const u = wrap(t);
  return u < AT.flinch ? 0 : 0.45 * (1 - ramp(u, AT.flinch, AT.flinch + 0.3));
}

export const galAt = (t: number): number => window01(wrap(t), AT.three - 0.08, CUTS.zoo, 0.18);
export const zooAt = (t: number): number => window01(wrap(t), AT.zoo - 0.12, CUTS.flinch - 0.1, 0.25);
/** The "!" over the pelican: how much, and its pop (scale). */
export function bangAt(t: number): { readonly alpha: number; readonly scale: number } {
  const u = wrap(t);
  const alpha = window01(u, AT.flinch - 0.04, CUTS.next, 0.1);
  const pop = 1 + 0.5 * Math.exp(-(((u - AT.flinch) * 9) ** 2)) * (u > AT.flinch - 0.1 ? 1 : 0);
  return { alpha, scale: pop };
}

