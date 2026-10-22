import type { Board } from '../../../src/logic/board';
import type { ColourId } from '../../../src/logic/colours';
import { D, type Marble } from '../../../src/logic/line';
import { buildPath, pointAt, type Pt } from '../../../src/logic/path';
import { squareSpiral } from '../../../src/level/shapes';
import type { LevelDef } from '../../../src/level/types';
import { RED_ON_PAPER, type Caption } from '../captions';
import { curveAt, loopCurve, type Key } from '../short';
import type { View } from '../play/stage';
import { record, type Hand, type Recording, type Script } from '../play/director';

/**
 * "It's so over… we're so back": a last-second save at the well, in the
 * allotment (chapter 6, where the Hedgehog charm lives, as in its level
 * "The Hedgehog"). Played on the game's own Board by a scripted gecko.
 *
 *   0     the line a few marbles from the well, the well blushing red, the
 *         heartbeat going; a panic shot already in the air
 *   0.05  it lands in the wrong place: the whole front is shoved one marble
 *         nearer the hole, then a triple pops behind it (the front stalls)
 *   0.6   "it's so over…"
 *   2.2   the gecko swaps to red; the back of the line catches up (clack)
 *         and the front creeps on to the hole
 *   4.0   it spits red at the front pair, which carries the Hedgehog charm:
 *         the shot shoves the front marble right to the lip, half sunk…
 *   4.3   …and the three pop. "Hedgehog!": it bursts out of the well and
 *         eats its way up the line, ten marbles, munch munch munch (the payoff, ~40%)
 *   5.5   "we're so back"
 *   5.9   a new Hedgehog charm turns up on a marble further back
 *   8.6   the gecko swaps to purple as the line creeps back towards the well;
 *         the heartbeat returns
 *   11.1  the panic shot, which is frame 1.
 *
 * The loop is the game's own arithmetic: the line is pushed LOOP_S × SPEED =
 * 14 marbles' worth, and 14 marbles go (the panic pop's two, the save's
 * two and the Hedgehog's ten), so the line ends where it started. Its colours
 * repeat every 14 marbles, so the marbles that take the lost ones' places
 * are the same colours too.
 */
export const LOOP_S = 11.2;
/** The line's speed, board px/s: the fastest the game's levels run (chapter 6's "The Hedgehog" runs at 30). */
export const SPEED = 40;
/** Marbles that go each loop, and so the line's period. */
export const PERIOD = 14;

/**
 * The board, in the game's own coordinates (1280 × 720): the video shows it
 * turned a quarter, as the game does on a phone held upright (render.ts).
 */
export const GECKO: Pt = { x: 640, y: 400 };

/**
 * A squared spiral like the allotment's beds (chapter 6's tracks): 1.6 turns
 * from the burrow (off screen, low on the right) round the gecko into the
 * well below it on the board, which the upright phone shows on its left.
 */
export const TRACK: readonly Pt[] = squareSpiral(GECKO.x, GECKO.y, 300, 140, 1.6, -0.3 * Math.PI, -1, 1.75, 1);
export const PATH = buildPath(TRACK);

export const LEVEL: LevelDef = {
  id: 'promo-hedgehog', name: 'The Hedgehog', shooter: { kind: 'pivot', ...GECKO },
  tracks: [{ points: TRACK }], colours: 5, speed: SPEED, goal: 1e9, par: 0, charms: ['hedgehog'],
};

/** The line's colours from its front, repeating every PERIOD: a red pair at the front, a purple pair seven back. */
export const PATTERN: readonly ColourId[] = [
  'red', 'red', 'yellow', 'blue', 'green', 'yellow', 'blue', 'purple', 'purple', 'green', 'yellow', 'blue', 'green', 'yellow',
];
/** The j-th marble from the front (1 = the front), its colour. */
export const colourOf = (j: number): ColourId => PATTERN[(((j - 1) % PERIOD) + PERIOD) % PERIOD]!;

/** How far the front marble is from the end of the track (the well's hole) at frame 1, board px. */
export const FRONT_GAP = 140;
/** Where the front marble is at frame 1. */
export const FRONT_S = PATH.length - FRONT_GAP;

/** The panic shot (the loop's last moment: frame 1 shows it in the air) and the save. */
export const PANIC_AT = LOOP_S - 0.1;
export const SAVE_AT = 4.0;
export const SWAPS = [2.2, 8.6] as const;
/** The next Hedgehog charm turns up (on the marble that will be second from the front a loop on). */
export const CHARM_AT = 5.9;
/** Where the played board starts: a quiet moment (the line creeping on, nothing in the air), laid as the line is then. */
export const START_AT = 9.6;

/** What the gecko holds: purple for the panic shot, red for the save, swapped into its mouth from its tail. */
export function handAt(t: number): Hand {
  // Each change comes just after the step the gecko spits on.
  const after = (at: number): boolean => t > at + 0.01;
  if (t < SWAPS[0] || after(PANIC_AT)) return { loaded: 'yellow', next: 'red' };
  if (!after(SAVE_AT)) return { loaded: 'red', next: 'yellow' };
  if (t < SWAPS[1]) return { loaded: 'yellow', next: 'purple' };
  return { loaded: 'purple', next: 'yellow' };
}

/** The j-th marble from the front of the line now. */
export const fromFront = (board: Board, j: number): Marble | undefined => {
  const ms = board.lines[0]!.marbles;
  return ms[ms.length - j];
};

/**
 * Where to aim to hit the gap between two touching marbles (j and j + 1 from
 * the front) as they will be when a shot spat now gets there: they roll on
 * at the line's speed while it flies.
 */
function aimBetween(board: Board, j: number): number {
  const a = fromFront(board, j);
  const b = fromFront(board, j + 1);
  if (!a || !b) return 0;
  const g = board.gecko;
  let s = (a.s + b.s) / 2;
  for (let k = 0; k < 3; k++) {
    const p = pointAt(PATH, s);
    s = (a.s + b.s) / 2 + SPEED * (Math.hypot(p.x - g.x, p.y - g.y) / 1150);
  }
  const p = pointAt(PATH, s);
  return Math.atan2(p.y - g.y, p.x - g.x);
}

/** Unwraps `a` to within half a turn of `to`. */
const near = (a: number, to: number): number => a + 2 * Math.PI * Math.round((to - a) / (2 * Math.PI));

/**
 * Where the gecko looks between its shots, as keys round the loop: it
 * glances about while the line creeps on, follows the Hedgehog up the line,
 * and settles on each target over the second before it spits (see angleAt).
 */
const LOOK: readonly Key[] = [
  { t: 0, at: 0.35 },
  { t: 0.9, at: -0.35 },
  { t: 1.9, at: 0.9 },
  { t: 2.9, at: 2.2 },
  { t: 4.6, at: 2.9 },
  { t: 5.6, at: 3.6 },
  { t: 7.0, at: 2.4 },
  { t: 8.4, at: 3.1 },
  { t: 9.8, at: 1.2 },
  { t: LOOP_S, at: 0.35 },
];

/** How the gecko settles on a target: fully locked over the last LOCK_S before it spits, and a beat after. */
const LOCK_S = 0.9;
const lock = (t: number, at: number): number => {
  const before = (at - t) / LOCK_S;
  if (before >= 0 && before < 1) return 1 - before * before;
  const after = t - at;
  if (after >= 0 && after < 0.3) return 1;
  if (after >= 0.3 && after < 0.7) return 1 - (after - 0.3) / 0.4;
  return 0;
};

export function angleAt(t: number, board: Board): number {
  const free = curveAt(LOOK, t).at;
  // The panic shot comes round the loop's end: its lock spans the seam.
  const panic = Math.max(lock(t, PANIC_AT), lock(t + LOOP_S, PANIC_AT));
  const save = lock(t, SAVE_AT);
  if (panic > 0) {
    const target = near(aimBetween(board, 8), free);
    return free + (target - free) * panic;
  }
  if (save > 0) {
    const target = near(aimBetween(board, 2), free);
    return free + (target - free) * save;
  }
  return free;
}

/** Marbles laid at the start (the feed carries on behind them). */
let laid = 0;

export const SCRIPT: Script = {
  level: LEVEL,
  loopS: LOOP_S,
  fresh: false,
  startAt: START_AT,
  setup(board) {
    const line = board.lines[0]!;
    // Back to front, the back one just out of the burrow: the line START_AT into the loop, pushed on from there to frame 1.
    const front = FRONT_S - SPEED * (LOOP_S - START_AT);
    laid = Math.floor(front / D) + 1;
    line.lay(Array.from({ length: laid }, (_, i) => colourOf(laid - i)), front - (laid - 1) * D, true);
    line.rushing = false;
    // The Hedgehog charm, second from the front since CHARM_AT.
    const second = fromFront(board, 2)!;
    second.charm = 'hedgehog';
    second.charmAge = START_AT - CHARM_AT;
  },
  feed: (n) => ({ colour: colourOf(laid + 1 + n) }),
  angle: angleAt,
  fires: [SAVE_AT, PANIC_AT],
  swaps: SWAPS,
  hand: handAt,
  charms: [{ t: CHARM_AT, charm: 'hedgehog', pick: (board) => fromFront(board, 2) }],
};

let cached: Recording | null = null;
/** The loop as played (after a warm-up loop), made once. */
export function recording(): Recording {
  cached ??= record(SCRIPT);
  return cached;
}

// ---------------------------------------------------------------- the camera and the captions

/**
 * The camera (play/stage.ts View): the board point at the video's focus and
 * the zoom, drifting round the loop. It leans towards the well as the line
 * creeps in, pushes in on the save, and eases back out along the Hedgehog's run.
 */
const CAM_X = loopCurve([
  { t: 0, at: 615 }, { t: 3.2, at: 620 }, { t: 4.3, at: 628 }, { t: 6.0, at: 610 }, { t: 9.0, at: 612 },
], LOOP_S);
const CAM_Y = loopCurve([
  { t: 0, at: 465 }, { t: 3.2, at: 472 }, { t: 4.3, at: 480 }, { t: 6.0, at: 458 }, { t: 9.0, at: 462 },
], LOOP_S);
const CAM_Z = loopCurve([
  { t: 0, at: 2.44 }, { t: 3.4, at: 2.52 }, { t: 4.3, at: 2.62 }, { t: 6.2, at: 2.42 }, { t: 9.0, at: 2.4 },
], LOOP_S);

export function viewAt(t: number): View {
  return { cx: CAM_X(t), cy: CAM_Y(t), z: CAM_Z(t) };
}

/** The meme, in two lines: none in frame 1. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'it’s so over…', from: 0.6, to: 3.9, y: 480, size: 104, colours: RED_ON_PAPER },
  { text: 'we’re so back', from: 5.0, to: 8.4, y: 480, size: 112 },
];
