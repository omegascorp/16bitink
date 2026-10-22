import type { Board } from '../../../src/logic/board';
import type { ColourId } from '../../../src/logic/colours';
import type { Marble } from '../../../src/logic/line';
import { buildPath, pointAt, type Pt } from '../../../src/logic/path';
import type { LevelDef } from '../../../src/level/types';
import { INK_ON_PAPER, type Caption } from '../captions';
import { curveAt, loopCurve, type Key } from '../short';
import type { View } from '../play/stage';
import { record, type Hand, type Recording, type Script } from '../play/director';

/**
 * "Wait for it…": one shot sets off a six-link chain reaction, in the garden
 * (chapter 1, the free one; its "Snail Trail" level teaches the pull).
 * Played on the game's own Board by a scripted gecko: every link is the
 * game's rule (a gap whose two sides match rolls back, the parts meet, the
 * seam pops), each pop pitched a step higher up the scale.
 *
 * The loop is a level's start to its end, round and round: the line rushes
 * out of the burrow (the game's rush), the gecko swaps to green and spits
 * once, and the line collapses link by link, "combo ×2" … "combo ×6!". The
 * few marbles left rush out to meet it and are picked off, the board is
 * clear, and the next line rushes out. Loop times (the video starts at
 * START, see record.mjs):
 *
 *   0      the burrow lets the line out, rushing
 *   2.3    "wait for it…"
 *   4.6    the gecko swaps green into its mouth
 *   5.3    the video starts: the line round the ring, the gecko aimed
 *   5.4    it spits: green into the green pair in the middle of the line
 *   5.6–6.7 pop, then five links a fifth of a second apart, each rolling the
 *          front back to meet the rest, pitched up the scale: "combo ×6!"
 *   6.9    "oddly satisfying"
 *   8.3, 9.6, 10.9  the stragglers (rushed out to meet it), a pair at a time
 *   11.1–12 the board clear, the splashes drying.
 */
export const LOOP_S = 12;
/**
 * Where the video starts in the loop: just before the payoff (the playbook's
 * rule), the whole line round the ring and the gecko aimed, a beat before it
 * spits, so the chain lands in the first second and a half; the line rushing
 * out again is the build-up to it on every loop after the first.
 */
export const START = 5.3;
/** The garden's speed for "Snail Trail" (chapter 1, level 3). */
export const SPEED = 38;

export const GECKO: Pt = { x: 640, y: 400 };
/** The ring round the gecko the line fills, board px. */
export const RING_R = 190;

const ring = (from: number, to: number, step: number): Pt[] => {
  const n = Math.max(1, Math.round(Math.abs(to - from) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: Math.round(GECKO.x + Math.cos(a) * RING_R), y: Math.round(GECKO.y + Math.sin(a) * RING_R) };
  });
};

/**
 * The track: in from the burrow (off the top of the upright screen), round
 * three-quarters of a ring about the gecko, and away round the board's
 * edges to a well out of shot. The line rushes out of the burrow until its
 * front is 30% of the way along (logic/line.ts RUSH_UNTIL), so the long way
 * round after the ring is what lands the whole line in the ring, where the
 * chain happens.
 */
export const TRACK: readonly Pt[] = [
  { x: 150, y: 110 }, { x: 300, y: 150 }, { x: 450, y: 196 },
  ...ring(-Math.PI / 2 - 0.5, Math.PI, 0.25),
  { x: 330, y: 400 }, { x: 200, y: 420 }, { x: 90, y: 520 }, { x: 120, y: 670 },
  { x: 400, y: 690 }, { x: 800, y: 690 }, { x: 1180, y: 680 }, { x: 1240, y: 450 }, { x: 1230, y: 150 }, { x: 1100, y: 40 }, { x: 800, y: 30 },
];
export const PATH = buildPath(TRACK);

export const LEVEL: LevelDef = {
  id: 'promo-chain', name: 'Snail Trail', shooter: { kind: 'pivot', ...GECKO },
  tracks: [{ points: TRACK }], colours: 4, speed: SPEED, goal: 1e9, par: 0, charms: [],
};

/** The chain's colours, from the middle out: the green pair the shot completes, then each link. */
export const LINKS: readonly ColourId[] = ['green', 'blue', 'yellow', 'red', 'green', 'blue'];
/** The stragglers behind the chain, front to back: three pairs. */
export const STRAGGLERS: readonly ColourId[] = ['yellow', 'yellow', 'red', 'red', 'green', 'green'];

/**
 * The whole line, front to back, as it comes out of the burrow: a single of
 * each link's colour (outermost first) down to the green in the middle, then
 * the other green, a pair of each link's colour going out, and the stragglers.
 * Each link pops one marble from the front side and two from the back.
 */
export const LINE: readonly ColourId[] = [
  ...[...LINKS].reverse(),
  ...LINKS.flatMap((c, i) => (i === 0 ? [c] : [c, c])),
  ...STRAGGLERS,
];
/** The green the shot lands beside: the sixth from the front. */
export const MIDDLE = LINKS.length;

export const SWAP_AT = 4.6;
export const CHAIN_AT = 5.4;
export const CLEANUP = [8.3, 9.6, 10.9] as const;
export const FIRES = [CHAIN_AT, ...CLEANUP] as const;

/** What the gecko holds: green swapped in for the chain, then each straggler pair's colour. */
export function handAt(t: number): Hand {
  const after = (at: number): boolean => t > at + 0.01;
  if (after(CLEANUP[2])) return { loaded: 'yellow', next: 'green' };
  // Only green is left in play: the game deals nothing else.
  if (after(CLEANUP[1])) return { loaded: 'green', next: 'green' };
  if (after(CLEANUP[0])) return { loaded: 'red', next: 'green' };
  if (after(CHAIN_AT)) return { loaded: 'yellow', next: 'red' };
  if (t >= SWAP_AT) return { loaded: 'green', next: 'yellow' };
  return { loaded: 'yellow', next: 'green' };
}

/** The j-th marble from the front of the line now. */
export const fromFront = (board: Board, j: number): Marble | undefined => {
  const ms = board.lines[0]!.marbles;
  return ms[ms.length - j];
};

/** Where to aim to hit between marbles j and j + 1 from the front as they will be when a shot spat now gets there. */
function aimBetween(board: Board, j: number): number {
  const a = fromFront(board, j);
  const b = fromFront(board, j + 1);
  if (!a || !b) return 0;
  const g = board.gecko;
  const pushed = board.lines[0]!.rushing ? SPEED * 8 : SPEED;
  let s = (a.s + b.s) / 2;
  for (let k = 0; k < 3; k++) {
    const p = pointAt(PATH, s);
    s = (a.s + b.s) / 2 + pushed * (Math.hypot(p.x - g.x, p.y - g.y) / 1150);
  }
  const p = pointAt(PATH, s);
  return Math.atan2(p.y - g.y, p.x - g.x);
}

const near = (a: number, to: number): number => a + 2 * Math.PI * Math.round((to - a) / (2 * Math.PI));

/** Where the gecko looks between shots: following the line out of the burrow, round to the chain, then the stragglers. */
const LOOK: readonly Key[] = [
  { t: 0, at: -1.6 },
  { t: 2.0, at: -0.6 },
  { t: 3.5, at: 0.4 },
  { t: 4.6, at: 1.2 },
  { t: 6.3, at: 0.9 },
  { t: 7.3, at: 0.2 },
  { t: 9.0, at: 0.6 },
  { t: 10.2, at: -0.4 },
  { t: 11.5, at: -1.1 },
  { t: LOOP_S, at: -1.6 },
]

const LOCK_S = 0.8;
const lock = (t: number, at: number): number => {
  const before = (at - t) / LOCK_S;
  if (before >= 0 && before < 1) return 1 - before * before;
  const after = t - at;
  if (after >= 0 && after < 0.25) return 1;
  if (after >= 0.25 && after < 0.65) return 1 - (after - 0.25) / 0.4;
  return 0;
};

export function angleAt(t: number, board: Board): number {
  const free = curveAt(LOOK, t).at;
  const chain = lock(t, CHAIN_AT);
  if (chain > 0) return free + (near(aimBetween(board, MIDDLE), free) - free) * chain;
  for (const c of CLEANUP) {
    const k = lock(t, c);
    if (k > 0) return free + (near(aimBetween(board, 1), free) - free) * k;
  }
  return free;
}

export const SCRIPT: Script = {
  level: LEVEL,
  loopS: LOOP_S,
  fresh: true,
  setup: () => undefined,
  feed: (n) => (n < LINE.length ? { colour: LINE[n]! } : null),
  angle: angleAt,
  fires: FIRES,
  swaps: [SWAP_AT],
  hand: handAt,
};

let cached: Recording | null = null;
/** The loop as played (after a warm-up loop), made once. */
export function recording(): Recording {
  cached ??= record(SCRIPT);
  return cached;
}

// ---------------------------------------------------------------- the camera and the captions

/**
 * The camera keeps the ring round the gecko centred in the clear band (its
 * marbles from y ≈ 290 down to just above the credit at 1228), and leans in a
 * touch on the chain.
 */
const CAM_X = loopCurve([{ t: 0, at: 652 }, { t: 4.8, at: 652 }, { t: 6.4, at: 652 }, { t: 9, at: 652 }], LOOP_S);
const CAM_Y = loopCurve([{ t: 0, at: 400 }, { t: 4.8, at: 401 }, { t: 6.4, at: 401 }, { t: 9, at: 400 }], LOOP_S);
const CAM_Z = loopCurve([{ t: 0, at: 2.15 }, { t: 4.8, at: 2.16 }, { t: 6.0, at: 2.19 }, { t: 7.4, at: 2.16 }, { t: 9.5, at: 2.14 }], LOOP_S);

export function viewAt(t: number): View {
  return { cx: CAM_X(t), cy: CAM_Y(t), z: CAM_Z(t) };
}

/** Captions, in loop time, inside the ring above the gecko (the line runs round its far side): "wait for it…" over the rush and the aim, still up in the video's first frame. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'wait for it…', from: 2.3, to: CHAIN_AT + 0.25, y: 430, size: 100, colours: INK_ON_PAPER },
  { text: 'oddly satisfying', from: 6.9, to: 10.2, y: 430, size: 100 },
];
