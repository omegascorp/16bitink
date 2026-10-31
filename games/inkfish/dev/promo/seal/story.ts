import { BOIL_FPS } from '../../../src/art/textures';
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
 *         a blue shark behind its head, both filling the frame.
 *   2.4   "Off Cape Point, South Africa, great whites eat seals…" (dramatic): from
 *         below, a seal at the surface, the place tag; a great white rises under it.
 *   6.4   "but one young seal flipped the script!" (surprised): the picture rolls
 *         180 degrees; right way up again, the seal is chasing a blue shark.
 *   8.6   "It caught FIVE blue sharks in two hours!" (excited): a counter 1 to 5,
 *         five shark icons, a clock; quick chase cuts.
 *  11.6   "And ate only the best bits." (chuckles): the seal tugs at a shark's
 *         belly from behind; the shark sinks away, a dark shape; a burp.
 *  13.6   "Some of those sharks were as long as the seal itself…" (nervous): the
 *         seal and a blue shark side by side, equal length bars, 5 ft / 1.5 m.
 *  16.6   "So who's the predator now?" (sarcastic): a great white peeks in, looks
 *         at the seal, and backs off with a nervous eye.
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

// ---------------------------------------------------------------- the camera

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
}

/** Frame 1 pushes in and out a little all loop (whole cycles: the loop point matches); a roll on "flipped". */
export function cameraAt(t: number): Camera {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const theta = Math.PI * ramp(t, ROLL_FROM, ROLL_TO);
  const roll = theta < Math.PI / 2 ? theta : theta - Math.PI;
  const rolling = Math.sin(theta);
  return {
    zoom: 1.02 + 0.025 * Math.sin(ph) + 0.55 * rolling,
    rot: roll,
    dx: 6 * Math.sin(2 * ph),
    dy: 5 * Math.sin(3 * ph),
  };
}

/** A white flash as the scenes swap over, and as each chase cut lands. */
export function flashAt(t: number): number {
  const decay = (at: number, len: number): number => (t >= at && t < at + len ? 1 - (t - at) / len : 0);
  return Math.max(0.6 * decay(ROLL_CUT - 0.05, 0.3), ...CHASE_CUTS.map((at) => 0.28 * decay(at, 0.16)));
}

/** The grey-blue gloom of the great white's rise and the sickly tint of the nervous beat. */
export const gloomAt = (t: number): number => window01(t, GREAT_AT - 0.1, ROLL_FROM + 0.4, 0.35);
export const nervousAt = (t: number): number => window01(t, BARS_FROM, PEEK_FROM + 0.1, 0.25);

// ---------------------------------------------------------------- one animal on screen

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

// ---------------------------------------------------------------- the bite (frame 1)

export const BITE_SHARK_LEN = 1000;
export const BITE_SEAL_LEN = 760;
/** Where on the shark (screen) the seal's jaws close: just behind its head. */
export const BITE_NAPE = { x: 770, y: 790 } as const;

export interface BiteLook {
  /** The jaw's opening, 0 .. 1. */
  readonly gape: number;
}

/** The shark in the bite: thrashing against the grip, whole cycles a loop. */
export function biteShark(t: number): Placed & { readonly bend: number } {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const shake = Math.sin(40 * ph);
  return {
    x: 520 + 16 * Math.sin(2 * ph) + 5 * shake,
    y: 960 + 12 * Math.sin(3 * ph) + 7 * Math.sin(40 * ph + 1),
    bend: 0.13 + 0.03 * Math.sin(2 * ph) + 0.02 * shake,
    len: BITE_SHARK_LEN,
    rot: -0.07 + 0.04 * Math.sin(2 * ph) + 0.015 * shake,
    face: 1,
    beat: 60 * ph,
  };
}

/** The seal's head is pinned at the nape, its body trailing up and away. */
export function biteSeal(t: number): Placed & BiteLook {
  const ph = (2 * Math.PI * t) / LOOP_S;
  const shark = biteShark(t);
  return {
    x: 0,
    y: 0,
    len: BITE_SEAL_LEN,
    rot: 0.95 + 0.025 * Math.sin(40 * ph + 2),
    face: 1,
    beat: 30 * ph,
    gape: 0.62 + 0.08 * Math.sin(40 * ph) + 0.0 * shark.x,
  };
}

// ---------------------------------------------------------------- from below, off Cape Point

export const SURFACE_Y = 560;
/** The great white starts to rise on "great whites" and is under the seal by "seals". */
export const WHITE_FROM = GREAT_AT - 0.35;
export const WHITE_TO = SEALS_AT + 0.25;
const WHITE_TILT = 1.12;
const WHITE_LEN = 940;
const WHITE_END = { x: 330, y: 1130 } as const;

export interface Surfacing {
  readonly seal: { readonly x: number; readonly y: number; readonly len: number; readonly beat: number; readonly effort: number };
  readonly white: { readonly x: number; readonly y: number; readonly len: number; readonly tilt: number; readonly beat: number } | null;
}

export function surfaceAt(t: number): Surfacing {
  const rise = ramp(t, WHITE_FROM, WHITE_TO);
  const axis = { x: Math.cos(WHITE_TILT), y: -Math.sin(WHITE_TILT) };
  const back = 1500 * (1 - rise);
  const calm = 1 - ramp(t, WHITE_FROM, WHITE_TO);
  return {
    seal: {
      x: 540 + 40 * Math.sin(t * 1.3),
      y: SURFACE_Y + 60 + 6 * Math.sin(t * 2.2),
      len: 430,
      beat: t * 5.5,
      effort: 0.35 + 0.4 * calm,
    },
    white: t < WHITE_FROM - 0.1
      ? null
      : {
          x: WHITE_END.x - axis.x * back,
          y: WHITE_END.y - axis.y * back + 14 * Math.sin(t * 3),
          len: WHITE_LEN,
          tilt: WHITE_TILT,
          beat: t * 7,
        },
  };
}

// ---------------------------------------------------------------- the chase

/** The chase's cuts: wide, then one close or odd angle for each of FIVE, blue sharks, two, hours. */
export const CHASE_CUTS = [FIVE_AT, SHARKS_AT, TWO_AT, HOURS_AT] as const;

export interface ChaseView {
  readonly zoom: number;
  readonly rot: number;
  readonly mirror: 1 | -1;
  readonly flipY: 1 | -1;
  readonly cx: number;
  readonly cy: number;
}

/** Five angles on the same chase: [from, view]. */
const VIEWS: readonly (readonly [number, ChaseView])[] = [
  [ROLL_CUT, { zoom: 1, rot: 0, mirror: 1, flipY: 1, cx: 540, cy: 780 }],
  [CHASE_CUTS[0], { zoom: 1.9, rot: 0.1, mirror: 1, flipY: 1, cx: 470, cy: 760 }],
  [CHASE_CUTS[1], { zoom: 1.25, rot: -0.22, mirror: -1, flipY: 1, cx: 540, cy: 800 }],
  [CHASE_CUTS[2], { zoom: 1.7, rot: 0.32, mirror: 1, flipY: 1, cx: 600, cy: 790 }],
  [CHASE_CUTS[3], { zoom: 1.1, rot: 0.05, mirror: -1, flipY: 1, cx: 540, cy: 800 }],
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

/** The seal closing on a blue shark that jinks away, in the chase's own wide frame (nose right). */
export function chaseAt(t: number): Chase {
  const u = t - ROLL_CUT;
  const close = 0.5 + 0.5 * Math.sin(u * 2.4);
  const sharkX = 700 + 30 * Math.sin(u * 1.7);
  const sharkY = 790 + 70 * Math.sin(u * 2.1);
  return {
    seal: {
      x: sharkX - 650 + 120 * close,
      y: sharkY + 55 + 20 * Math.sin(u * 3.1 + 1),
      len: 620,
      rot: 0.06 * Math.sin(u * 2.1),
      face: 1,
      beat: u * 11,
      gape: 0.18 + 0.5 * ramp(close, 0.65, 1),
    },
    shark: { x: sharkX, y: sharkY, len: 520, rot: -0.03 * Math.cos(u * 2.1), face: 1, beat: u * 16 },
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

// ---------------------------------------------------------------- the tug and the sink

/** The shark lets go and sinks on "best bits"; the seal levels out, smug. */
export const SINK_FROM = ATE_AT + 0.45;
export const SINK_TO = BITS_AT + 0.3;
export const BURP_AT = BITS_AT + 0.05;

export interface Tug {
  readonly shark: Placed;
  /** 0: bright and blue; 1: a dark shape. */
  readonly dark: number;
  readonly sharkAlpha: number;
  readonly seal: Placed & { readonly gape: number };
  /** Where the seal's mouth is (screen), and how far the seal has levelled out and settled (0 .. 1). */
  readonly settle: number;
  /** A puffed-cheek pulse for the burp, 0 .. 1. */
  readonly puff: number;
}

export function tugAt(t: number): Tug {
  const tug = Math.sin(t * 19);
  const sink = ramp(t, SINK_FROM, SINK_FROM + 0.6);
  const settle = ramp(t, SINK_FROM, SINK_FROM + 0.5);
  const grab = 1 - ramp(t, SINK_FROM - 0.1, SINK_FROM + 0.25);
  return {
    shark: {
      x: lerp(500, 640, sink) + 10 * tug * grab,
      y: lerp(760, 1780, sink) + 8 * Math.sin(t * 13) * grab,
      len: lerp(980, 600, sink),
      rot: lerp(0.05, 1.25, sink) + 0.03 * tug * grab,
      face: 1,
      beat: t * 9,
    },
    dark: ramp(t, SINK_FROM, SINK_FROM + 0.45),
    sharkAlpha: 1 - ramp(t, SINK_TO - 0.1, SINK_TO + 0.3),
    seal: {
      x: 0,
      y: 0,
      len: 1040,
      rot: lerp(-0.95, -0.06, settle) + 0.05 * tug * grab,
      face: 1,
      beat: t * 8,
      gape: 0.5 * grab,
    },
    settle,
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

// ---------------------------------------------------------------- the great white peeks in

export const PEEK_IN = SO_AT + 0.05;
export const PEEK_LOOK = PREDATOR_AT - 0.2;
export const PEEK_OUT = NOW_AT + 0.1;

export interface Peek {
  readonly white: Placed;
  /** Where its eye looks, -1 (away from the seal) .. 1 (at it). */
  readonly look: number;
  /** The eye widens and a sweat drop rolls: 0 .. 1. */
  readonly scared: number;
  readonly seal: Placed;
  /** The seal's raised-flipper "shoo" wave, 0 .. 1. */
  readonly shoo: number;
}

export function peekAt(t: number): Peek {
  const slide = ramp(t, PEEK_IN, PEEK_IN + 0.5) - ramp(t, PEEK_OUT, PEEK_OUT + 0.35);
  return {
    white: { x: lerp(1700, 1110, slide), y: 740 + 12 * Math.sin(t * 2.6), len: 780, rot: 0.04, face: -1, beat: t * 5 },
    look: ramp(t, PEEK_LOOK, PEEK_LOOK + 0.25),
    scared: ramp(t, NOW_AT - 0.05, NOW_AT + 0.2) * (1 - ramp(t, PEEK_OUT + 0.3, PEEK_OUT + 0.45)),
    seal: { x: 230, y: 900, len: 700, rot: -0.03, face: 1, beat: t * 4 },
    shoo: window01(t, NOW_AT, NOW_AT + 0.9, 0.15),
  };
}

// ---------------------------------------------------------------- the place tag

export const placeAt = (t: number): number => window01(t, OFF_AT - 0.05, BUT_AT + 0.1, 0.2);
/** "great white" tagged on the rising shark. */
export const whiteTagAt = (t: number): number => window01(t, GREAT_AT, BUT_AT + 0.1, 0.2);
export const placeSouthAt = (t: number): number => window01(t, SOUTH_AT - 0.05, BUT_AT + 0.1, 0.2);
