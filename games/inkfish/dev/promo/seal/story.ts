import { BOIL_FPS } from '../../../src/art/textures';
import type { Pt } from '../../../src/art/pen';
import { lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "This seal HUNTS sharks": off Cape Point, South Africa, in December 2012,
 * a young Cape fur seal killed five blue sharks in about two hours (Fallows,
 * Benoit and Hammerschlag, 2015); the largest was nearly 1.5 m / 5 ft. It ate
 * only the insides and let the rest sink. Cape fur seals are normally prey for
 * great whites. Told by a narrator (words.ts), each beat timed to the words, a
 * function of time over a loop of LOOP_S. One mood a sentence:
 *
 *   0     "This seal HUNTS sharks!" (mischievous): close, a Cape fur seal biting
 *         a blue shark behind its head, both filling the frame, the seal shaking
 *         its head, the shark thrashing, bubbles bursting; a punch-in on "HUNTS".
 *   2.4   "Off Cape Point, South Africa, great whites eat seals…" (dramatic): from
 *         below, the seal at the surface, the place tag; a huge great white rises
 *         under it, jaws opening (the classic breach set-up).
 *   6.4   "but one young seal flipped the script!" (surprised): the picture shrinks
 *         to a card and flips over; right way up again, the roles are swapped:
 *         the seal on top, diving at a scared blue shark below.
 *   8.6   "It caught FIVE blue sharks in two hours!" (excited): a counter 1 to 5,
 *         five shark icons, a clock; quick chase cuts.
 *  11.6   "And ate only the best bits." (chuckles): the seal tugs at a shark's
 *         belly from behind; cut to the smug seal in a napkin, a burp of bubbles,
 *         the shark's dark shape sinking away below.
 *  13.6   "Some of those sharks were as long as the seal itself…" (nervous): the
 *         seal and a blue shark side by side, equal length bars, 5 ft / 1.5 m.
 *  16.6   "So who's the predator now?" (sarcastic): a big great white noses in from
 *         the side, looks at the seal, gets a nervous eye and a sweat drop, and backs off.
 *  18.3   "Because": back to the bite of frame 1.
 */

/** The line boil steps at the game's 8 a second. */
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

export const HUNTS_AT = said('HUNTS');
export const SHARKS_HOOK_AT = said('sharks!');
export const OFF_AT = said('Off');
export const CAPE_AT = said('Cape');
export const SOUTH_AT = said('South');
export const GREAT_AT = said('great');
export const WHITES_AT = said('whites');
export const SEALS_AT = said('seals…');
export const BUT_AT = said('but');
export const YOUNG_AT = said('young');
export const FLIPPED_AT = said('flipped');
export const SCRIPT_AT = said('script!');
export const IT_AT = said('It');
export const CAUGHT_AT = said('caught');
export const FIVE_AT = said('FIVE');
export const BLUE_AT = said('blue');
export const SHARKS_AT = said('sharks');
export const TWO_AT = said('two');
export const HOURS_AT = said('hours!');
export const AND_AT = said('And');
export const ATE_AT = said('ate');
export const BEST_AT = said('best');
export const BITS_AT = said('bits.');
export const SOME_AT = said('Some');
export const THOSE_SHARKS_AT = said('sharks', 2);
export const LONG_AT = said('long');
export const SEAL_AGAIN_AT = said('seal', 3);
export const ITSELF_AT = said('itself…');
export const SO_AT = said('So');
export const WHOS_AT = said('who\'s');
export const PREDATOR_AT = said('predator');
export const NOW_AT = said('now?');
export const BECAUSE_AT = said('Because');

// ---------------------------------------------------------------- the scenes

export type SceneId = 'bite' | 'surface' | 'chase' | 'tug' | 'bars' | 'peek';

/** The picture rolls over on "flipped"; the scenes swap half way round. */
export const ROLL_FROM = FLIPPED_AT - 0.35;
export const ROLL_TO = SCRIPT_AT + 0.15;
/** Half way round (smoothstep 0.5): the surface scene gives way to the chase. */
export const ROLL_CUT = (ROLL_FROM + ROLL_TO) / 2;
export const TUG_FROM = AND_AT - 0.05;
export const BARS_FROM = SOME_AT - 0.1;
export const PEEK_FROM = SO_AT - 0.1;
export const BITE_BACK = BECAUSE_AT - 0.45;
const FADE = 0.2;

/** How much of each scene is on screen. */
export function sceneAlpha(id: SceneId, t: number): number {
  switch (id) {
    case 'bite':
      return Math.max(1 - ramp(t, OFF_AT - 0.05, OFF_AT + 0.35), ramp(t, BITE_BACK, BITE_BACK + 0.5));
    case 'surface':
      return t < ROLL_CUT ? ramp(t, OFF_AT - 0.05, OFF_AT + 0.35) : 0;
    case 'chase':
      return t < ROLL_CUT ? 0 : 1 - ramp(t, TUG_FROM, TUG_FROM + FADE);
    case 'tug':
      return ramp(t, TUG_FROM, TUG_FROM + FADE) * (1 - ramp(t, BARS_FROM, BARS_FROM + FADE));
    case 'bars':
      return ramp(t, BARS_FROM, BARS_FROM + FADE) * (1 - ramp(t, PEEK_FROM, PEEK_FROM + FADE));
    case 'peek':
      return ramp(t, PEEK_FROM, PEEK_FROM + FADE) * (1 - ramp(t, BITE_BACK, BITE_BACK + 0.5));
  }
}

export const SCENE_IDS: readonly SceneId[] = ['bite', 'surface', 'chase', 'tug', 'bars', 'peek'];

// ---------------------------------------------------------------- geometry

/** An animal's own units: 310 long, middle at 0,0, nose to the right. */
export const UNITS = 310;

export interface Placed {
  readonly x: number;
  readonly y: number;
  /** Length in px (the animal's own units are 310 long). */
  readonly len: number;
  /** Radians, positive: nose down. */
  readonly rot: number;
  /** 1: facing right, -1: facing left. */
  readonly face: 1 | -1;
  /** Tail / flipper beat phase (radians). */
  readonly beat: number;
}

/** Where a point in an animal's own units lands on screen. */
export function onAnimal(p: Placed, local: Pt): Pt {
  const k = p.len / UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [lx, ly] = [local.x * k, local.y * k];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}

/** Where the Placed must go so that its own-units point `local` lands on `target` (screen). */
export function pinned(p: Omit<Placed, 'x' | 'y'>, local: Pt, target: Pt): Placed {
  const at = onAnimal({ ...p, x: 0, y: 0 }, local);
  return { ...p, x: target.x - at.x, y: target.y - at.y };
}

/** Where the seal's jaws close, and the blue shark's nape and belly, in their own units. */
export const SEAL_MOUTH: Pt = { x: 130, y: 12 };
export const SHARK_NAPE: Pt = { x: 40, y: -19 };
export const SHARK_BELLY: Pt = { x: 0, y: 18 };

/** The great white as drawGreatWhite takes it: centre, snout-to-tail length, heading, mirrored to swim left. */
export interface WhitePose {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly angle: number;
  readonly flip: boolean;
  /** 0 shut .. 1 wide. */
  readonly jaw: number;
  /** 0 calm .. 1 worried (a big white-ringed eye). */
  readonly worried: number;
  /** The tail beat's phase. */
  readonly tail: number;
}

/** A point of the great white's own frame (snout at 0,0, tail at x -1000, belly +y) on screen. */
export function onWhite(w: WhitePose, local: Pt): Pt {
  const s = w.len / 1000;
  const lx = (local.x + 500) * s;
  const ly = (w.flip ? -local.y : local.y) * s;
  const [c, n] = [Math.cos(w.angle), Math.sin(w.angle)];
  return { x: w.x + lx * c - ly * n, y: w.y + lx * n + ly * c };
}

/** The great white's snout and eye in its own frame. */
export const WHITE_SNOUT: Pt = { x: 0, y: 0 };
export const WHITE_EYE: Pt = { x: -92, y: -6 };

// ---------------------------------------------------------------- the camera

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
  /** How far the picture has shrunk to a card for the flip (0 .. 1): its edge is inked. */
  readonly card: number;
}

/** A blow that dies away over `len` seconds from `at`. */
const decay = (t: number, at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

/** The punch-in on "HUNTS", held until the bite gives way. */
export const punchAt = (t: number): number => ramp(t, HUNTS_AT - 0.06, HUNTS_AT + 0.14) * (1 - ramp(t, OFF_AT - 0.15, OFF_AT + 0.3));

/**
 * Frame 1 pushes in and out a little all loop (whole cycles: the loop point
 * matches), punches in with a jolt on "HUNTS" and "sharks", and on "flipped"
 * the picture shrinks to a card, flips over and grows back.
 */
export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const theta = Math.PI * ramp(t, ROLL_FROM, ROLL_TO);
  const roll = theta < Math.PI / 2 ? theta : theta - Math.PI;
  const rolling = Math.sin(theta);
  const jolt = decay(t, HUNTS_AT, 0.45) + 0.7 * decay(t, SHARKS_HOOK_AT, 0.4);
  return {
    zoom: 1.02 + 0.025 * Math.sin(ph) + 0.09 * punchAt(t) - 0.44 * rolling,
    rot: roll,
    dx: 6 * Math.sin(2 * ph) + 18 * jolt * Math.sin(t * 71),
    dy: 5 * Math.sin(3 * ph) + 14 * jolt * Math.sin(t * 83 + 1),
    card: rolling,
  };
}

/** A white flash as the scenes swap over, as each chase cut lands, and on the tug's cut. */
export function flashAt(t: number): number {
  return Math.max(0.6 * decay(t, ROLL_CUT - 0.05, 0.3), 0.35 * decay(t, TUG_CUT, 0.2), ...CHASE_CUTS.map((at) => 0.28 * decay(t, at, 0.16)));
}

/** The grey-blue gloom of the great white's rise and the sickly tint of the nervous beat. */
export const gloomAt = (t: number): number => window01(t, GREAT_AT - 0.1, ROLL_FROM + 0.4, 0.35);
export const nervousAt = (t: number): number => window01(t, BARS_FROM, PEEK_FROM + 0.1, 0.25);

// ---------------------------------------------------------------- the bite (frame 1)

export const BITE_SHARK_LEN = 1000;
export const BITE_SEAL_LEN = 760;
/** The thrash: whole cycles a loop (about 2.5 a second), so the loop point matches. */
const THRASH = 48;

export interface BiteLook {
  /** The jaw's opening, 0 .. 1. */
  readonly gape: number;
}

/** The shark in the bite: thrashing against the grip, its body bending one way and the other, the tail whipping. */
export function biteShark(t: number): Placed & { readonly bend: number } {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const th = Math.sin(THRASH * ph);
  return {
    x: 520 + 16 * Math.sin(2 * ph) + 14 * th,
    y: 960 + 12 * Math.sin(3 * ph) + 12 * Math.sin(THRASH * ph + 1.2),
    bend: 0.05 + 0.2 * Math.sin(THRASH * ph - 0.9),
    len: BITE_SHARK_LEN,
    rot: -0.07 + 0.04 * Math.sin(2 * ph) + 0.05 * th,
    face: 1,
    beat: 2 * THRASH * ph,
  };
}

/** The seal's jaws are clamped on the nape and it shakes its head, its body swinging round the grip. */
export function biteSeal(t: number): Placed & BiteLook {
  const ph = (2 * Math.PI * t) / LOOP_S;
  return {
    x: 0,
    y: 0,
    len: BITE_SEAL_LEN,
    rot: 0.95 + 0.11 * Math.sin(THRASH * ph + 2),
    face: 1,
    beat: 30 * ph,
    gape: 0.6 + 0.12 * Math.sin(THRASH * ph + 0.4),
  };
}

/** Where the seal's jaws close on the shark (screen). */
export const biteNape = (t: number): Pt => onAnimal(biteShark(t), SHARK_NAPE);

/** The seal placed so its jaws close on the nape. */
export const bitePlaced = (t: number): Placed & BiteLook => ({ ...biteSeal(t), ...pinned(biteSeal(t), SEAL_MOUTH, biteNape(t)) });

/** Bursts of bubbles at the bite: one a thrash, so the loop point matches. Returns each burst's age 0 .. 1. */
export const burstAt = (t: number): number => (((THRASH * t) / LOOP_S) % 1 + 1) % 1;

// ---------------------------------------------------------------- from below, off Cape Point

export const SURFACE_Y = 560;
/** The great white starts to rise on "great whites" and is under the seal by "seals", jaws opening. */
export const WHITE_FROM = GREAT_AT - 0.4;
export const WHITE_TO = WHITES_AT + 0.55;
const WHITE_ANGLE = -1.15;
const WHITE_LEN = 1080;
/** Where its snout ends up: a little below and behind the seal. */
const WHITE_SNOUT_END = { x: 520, y: 760 } as const;

export interface Surfacing {
  readonly seal: Placed;
  /** The seal narrows its eyes on "young seal". */
  readonly fierce: boolean;
  readonly white: WhitePose | null;
}

export function surfaceAt(t: number): Surfacing {
  const rise = ramp(t, WHITE_FROM, WHITE_TO);
  const creep = 50 * ramp(t, WHITE_TO, ROLL_CUT);
  const axis = { x: Math.cos(WHITE_ANGLE), y: Math.sin(WHITE_ANGLE) };
  const back = 1150 * (1 - rise) - creep;
  const half = WHITE_LEN / 2;
  return {
    seal: {
      x: 590 + 30 * Math.sin(t * 1.3),
      y: SURFACE_Y + 52 + 5 * Math.sin(t * 2.2),
      len: 420,
      rot: 0.04 * Math.sin(t * 1.7),
      face: -1,
      beat: t * 5.5,
    },
    fierce: t >= YOUNG_AT - 0.05,
    white: t < WHITE_FROM - 0.02
      ? null
      : {
          x: WHITE_SNOUT_END.x - axis.x * (half + back),
          y: WHITE_SNOUT_END.y - axis.y * (half + back) + 10 * Math.sin(t * 3),
          len: WHITE_LEN,
          angle: WHITE_ANGLE + 0.03 * Math.sin(t * 2.3),
          flip: false,
          jaw: 0.85 * ramp(t, SEALS_AT - 0.45, SEALS_AT + 0.25),
          worried: 0,
          tail: t * 7,
        },
  };
}

// ---------------------------------------------------------------- the chase

/** The chase's cuts: wide, then a new angle for each of FIVE, blue sharks, two, hours. */
export const CHASE_CUTS = [FIVE_AT, SHARKS_AT, TWO_AT, HOURS_AT] as const;

export interface ChaseView {
  readonly zoom: number;
  readonly rot: number;
  readonly mirror: 1 | -1;
  readonly cx: number;
  readonly cy: number;
}

/** Five angles on the same dive: [from, view]. All keep the whole seal in frame. */
const VIEWS: readonly (readonly [number, ChaseView])[] = [
  [ROLL_CUT, { zoom: 1, rot: 0, mirror: 1, cx: 510, cy: 770 }],
  [CHASE_CUTS[0], { zoom: 1.08, rot: 0.1, mirror: -1, cx: 540, cy: 790 }],
  [CHASE_CUTS[1], { zoom: 1.02, rot: -0.12, mirror: 1, cx: 500, cy: 770 }],
  [CHASE_CUTS[2], { zoom: 1.08, rot: 0.1, mirror: -1, cx: 530, cy: 800 }],
  [CHASE_CUTS[3], { zoom: 1, rot: -0.05, mirror: 1, cx: 505, cy: 770 }],
];

export function chaseViewAt(t: number): ChaseView {
  let view = VIEWS[0]![1];
  for (const [from, v] of VIEWS) if (t >= from) view = v;
  return view;
}

export interface Chase {
  readonly seal: Placed & { readonly gape: number };
  readonly shark: Placed;
}

/** The roles swapped: the seal on top, diving at a scared blue shark below that twists to get away. */
export function chaseAt(t: number): Chase {
  const u = t - ROLL_CUT;
  const close = 0.5 + 0.5 * Math.sin(u * 1.9 - 1.6);
  const shark: Placed = {
    x: 600 + 40 * Math.sin(u * 1.7),
    y: 1010 + 25 * Math.sin(u * 2.1),
    len: 480,
    rot: 0.08 * Math.sin(u * 2.6),
    face: 1,
    beat: u * 18,
  };
  const nape = onAnimal(shark, SHARK_NAPE);
  const rot = 1.0 + 0.07 * Math.sin(u * 2.1);
  const gap = 25 + 130 * (1 - close);
  const target = { x: nape.x - gap * Math.cos(rot) * 0.6, y: nape.y - gap * Math.sin(rot) };
  return {
    seal: { ...pinned({ len: 520, rot, face: 1, beat: u * 11 }, SEAL_MOUTH, target), gape: 0.15 + 0.55 * ramp(close, 0.55, 1) },
    shark,
  };
}

/** The counter ticks 1 to 5, a quick rattle landing on "FIVE". */
export const TICK_AT: readonly number[] = [FIVE_AT - 0.66, FIVE_AT - 0.48, FIVE_AT - 0.31, FIVE_AT - 0.16, FIVE_AT];

/** The count at time t. */
export const countAt = (t: number): number => TICK_AT.filter((at) => t >= at).length;
/** The counter and the icons are on screen from just before "It" until the picture moves on. */
export const counterAt = (t: number): number => window01(t, IT_AT - 0.1, AND_AT, 0.2);
/** How far the n-th (0-based) icon has popped in: 0 .. 1, overshooting a little. */
export function iconPop(n: number, t: number): number {
  const u = (t - TICK_AT[n]!) / 0.28;
  if (u <= 0) return 0;
  return u >= 1 ? 1 : 1 + 0.45 * Math.sin(Math.PI * u) * (1 - u);
}
/** The clock: pops in on "two", its hand spins to the end of "hours". */
export const clockAt = (t: number): number => window01(t, TWO_AT - 0.1, AND_AT, 0.2);
export const clockHand = (t: number): number => 12 * ramp(t, TWO_AT, HOURS_AT + 0.2);

// ---------------------------------------------------------------- the tug, the smug seal and the sink

/** The tug at the belly until "best"; then a cut to the smug seal, a burp on "bits", the shark sinking below. */
export const TUG_CUT = BEST_AT - 0.12;
export const SINK_FROM = TUG_CUT;
export const BURP_AT = BITS_AT + 0.05;

export interface Tug {
  /** 'tug': the seal at the belly from behind; 'smug': after the cut. */
  readonly phase: 'tug' | 'smug';
  readonly shark: Placed & { readonly bend: number };
  /** 0: bright and blue; 1: a dark shape. */
  readonly dark: number;
  readonly sharkAlpha: number;
  readonly seal: Placed & { readonly gape: number };
  /** A puffed-cheek pulse for the burp, 0 .. 1. */
  readonly puff: number;
}

export function tugAt(t: number): Tug {
  const yank = Math.sin(t * 17);
  if (t < TUG_CUT) {
    // The shark horizontal, jerking; the seal below and behind it, jaws on the belly, yanking back.
    const shark = { x: 600 + 10 * yank, y: 600 + 14 * Math.max(0, yank), len: 880, rot: 0.04 + 0.04 * yank, face: 1 as const, beat: t * 14, bend: 0.06 + 0.08 * yank };
    const belly = onAnimal(shark, SHARK_BELLY);
    const rot = -0.62 + 0.06 * yank;
    const pull = 18 * Math.max(0, yank);
    const target = { x: belly.x - pull * Math.cos(rot), y: belly.y - pull * Math.sin(rot) + 8 };
    return {
      phase: 'tug',
      shark,
      dark: 0,
      sharkAlpha: 1,
      seal: { ...pinned({ len: 700, rot, face: 1, beat: t * 9 }, SEAL_MOUTH, target), gape: 0.55 + 0.1 * yank },
      puff: 0,
    };
  }
  const sink = ramp(t, SINK_FROM, SINK_FROM + 1.4);
  return {
    phase: 'smug',
    shark: { x: lerp(640, 760, sink), y: lerp(1300, 1900, sink), len: lerp(600, 460, sink), rot: lerp(0.35, 1.3, sink), face: 1, beat: t * 3, bend: 0 },
    dark: 1,
    sharkAlpha: 1 - ramp(t, BITS_AT + 0.25, BITS_AT + 0.9),
    seal: { x: 530, y: 700 + 6 * Math.sin(t * 2.4), len: 700, rot: -0.05, face: 1, beat: t * 4, gape: 0 },
    puff: Math.sin(Math.PI * ramp(t, BURP_AT - 0.1, BURP_AT + 0.35)),
  };
}

// ---------------------------------------------------------------- the length bars

export const BAR_X0 = 150;
export const BAR_X1 = 750;
export const BAR_SEAL_Y = 540;
export const BAR_SHARK_Y = 900;
export const sealBarAt = (t: number): number => ramp(t, SOME_AT, SOME_AT + 0.7);
export const sharkBarAt = (t: number): number => ramp(t, THOSE_SHARKS_AT, THOSE_SHARKS_AT + 0.6);
export const sharkLabelAt = (t: number): number => window01(t, LONG_AT, PEEK_FROM + FADE, 0.2);
export const sealLabelAt = (t: number): number => window01(t, SEAL_AGAIN_AT, PEEK_FROM + FADE, 0.2);
/** The bracket linking the two lengths, as "itself…" lands. */
export const equalAt = (t: number): number => window01(t, ITSELF_AT - 0.1, PEEK_FROM + FADE, 0.2);

// ---------------------------------------------------------------- the great white noses in

export const PEEK_IN = SO_AT + 0.05;
export const PEEK_LOOK = PREDATOR_AT - 0.2;
export const PEEK_OUT = NOW_AT + 0.35;
const PEEK_LEN = 1320;

export interface Peek {
  readonly white: WhitePose;
  /** It tips its nose down at the seal: 0 .. 1. */
  readonly look: number;
  /** The eye widens and a sweat drop rolls: 0 .. 1. */
  readonly scared: number;
  readonly seal: Placed;
  /** The seal's raised-flipper "shoo" wave, 0 .. 1. */
  readonly shoo: number;
}

/** Where the great white's snout is in the peek (x). */
export const peekSnoutX = (p: Peek): number => onWhite(p.white, WHITE_SNOUT).x;

export function peekAt(t: number): Peek {
  const slide = ramp(t, PEEK_IN, PEEK_IN + 0.5) - ramp(t, PEEK_OUT, PEEK_OUT + 0.45);
  const look = ramp(t, PEEK_LOOK, PEEK_LOOK + 0.25);
  const scared = ramp(t, NOW_AT - 0.05, NOW_AT + 0.2) * (1 - ramp(t, PEEK_OUT + 0.35, PEEK_OUT + 0.5));
  const backing = ramp(t, PEEK_OUT, PEEK_OUT + 0.45);
  return {
    white: {
      x: lerp(1080 + PEEK_LEN / 2 + 40, 640 + PEEK_LEN / 2, slide),
      y: 760 + 10 * Math.sin(t * 2.6),
      len: PEEK_LEN,
      angle: Math.PI - 0.12 * look + 0.12 * backing,
      flip: true,
      jaw: 0.3 * ramp(t, PEEK_IN, PEEK_IN + 0.3) * (1 - look),
      worried: scared,
      tail: t * (6 + 10 * backing),
    },
    look,
    scared,
    seal: { x: 250, y: 950, len: 500, rot: -0.03, face: 1, beat: t * 4 },
    shoo: window01(t, NOW_AT, NOW_AT + 0.9, 0.15),
  };
}

// ---------------------------------------------------------------- the place tag

export const placeAt = (t: number): number => window01(t, OFF_AT - 0.05, BUT_AT + 0.1, 0.2);
/** "great white" tagged on the rising shark. */
export const whiteTagAt = (t: number): number => window01(t, GREAT_AT, BUT_AT + 0.1, 0.2);
export const placeSouthAt = (t: number): number => window01(t, SOUTH_AT - 0.05, BUT_AT + 0.1, 0.2);
