import { Board, type BoardEvent, type BoardInput } from '../../../src/logic/board';
import type { CharmId } from '../../../src/logic/charms';
import { COLOUR_WASH, COLOURS, type ColourId } from '../../../src/logic/colours';
import type { Marble, Spawned } from '../../../src/logic/line';
import type { Path } from '../../../src/logic/path';
import type { LevelDef } from '../../../src/level/types';

/**
 * Plays the game's own Board (logic/board.ts) with a scripted player, frame
 * by frame, so a promo short shows real mechanics: the line pushed out of
 * the burrow at the level's speed, shots flying at the game's speed and
 * landing where they hit, matches popping, gaps rolling back and chaining,
 * charms, the Hedgehog eating its way up the line. The script only stands
 * in for the player's hand: where the gecko looks, when it spits, which
 * marbles it holds, and what the burrow deals.
 *
 * Everything is a pure function of the script: `record` steps the board at
 * a fixed rate and keeps one snapshot per video frame, plus every event
 * with its time, for the renderer and the soundtrack. DOM-free, so the
 * tests can check the loop seam against the real logic.
 */
export const FPS = 30;
/** Board steps per video frame. */
export const SUB = 8;
export const DT = 1 / (FPS * SUB);

/** How fast a drawn marble catches up with where the line says it is, per second (scenes/game/marblesView.ts CATCH_UP). */
const CATCH_UP = 16;
/** How fast the gecko's skin turns to the loaded marble's colour, per second (geckoView.ts TINT_RATE). */
const TINT_RATE = 9;
/** How long the mouth stays open after a spit, s (geckoView.ts SPIT_MS). */
export const SPIT_S = 0.13;
/** The heartbeat starts once a line's front is this far to its well (GameScene.ts DANGER_FROM). */
const DANGER_FROM = 0.82;

/** What the gecko holds: the marble in its mouth and the one curled in its tail. */
export interface Hand {
  readonly loaded: ColourId;
  readonly next: ColourId;
}

export interface Script {
  readonly level: LevelDef;
  readonly loopS: number;
  /**
   * True: a new board every loop (the line rushes out of the burrow again,
   * as a level starts). False: one board played on, its state at the loop's
   * end being its state at the start.
   */
  readonly fresh: boolean;
  /** The loop time the board starts at: `setup` lays the board as it is then (0 for fresh boards). */
  readonly startAt?: number;
  /** Lays the board as it is at `startAt`, on each new board. */
  setup(board: Board): void;
  /** The n-th marble out of the burrow (0 = the first since the board was made); null once the burrow is shut. */
  feed(n: number): Spawned | null;
  /** Where the gecko faces at loop time t, radians: it may look at the board, as a player aims at a marble. */
  angle(t: number, board: Board): number;
  /** Loop times the gecko spits. */
  readonly fires: readonly number[];
  /** Loop times the gecko swaps its two marbles (`hand` changes with them). */
  readonly swaps: readonly number[];
  hand(t: number): Hand;
  /** Charms that turn up on a marble (as on the game's pivot levels, every few seconds). */
  readonly charms?: readonly CharmCue[];
}

export interface CharmCue {
  readonly t: number;
  readonly charm: CharmId;
  pick(board: Board): Marble | undefined;
}

export interface MarbleSnap {
  readonly id: number;
  readonly colour: ColourId;
  readonly s: number;
  /** Where the game draws it: it glides after the line rather than jumping. */
  readonly shown: number;
  readonly charm: CharmId | null;
  readonly charmAge: number;
  /**
   * Which boil frame it starts on (0..2). The game offsets each marble's boil
   * by its id; here by its colour, so a marble and the one that takes its
   * place a loop later boil alike across the seam.
   */
  readonly look: number;
}

export interface Snap {
  readonly t: number;
  readonly lines: readonly (readonly MarbleSnap[])[];
  readonly shots: readonly { readonly id: number; readonly x: number; readonly y: number; readonly colour: ColourId }[];
  readonly gecko: { readonly x: number; readonly y: number; readonly angle: number };
  readonly loaded: ColourId;
  readonly next: ColourId;
  /** The skin's wash, easing to the loaded marble's colour, as #rrggbb. */
  readonly tint: string;
  readonly spitting: boolean;
  /** The marbles' jostle after a swap, 0..1. */
  readonly bounce: number;
  readonly hedgehog: { readonly line: number; readonly s: number } | null;
  /** How close each line's front is to its well, 0..1. */
  readonly danger: readonly number[];
  /** How hard the lines roll, 0..1 (the rumble under play). */
  readonly rolling: number;
}

export type StageEvent = BoardEvent | { readonly type: 'swap' } | { readonly type: 'danger' } | { readonly type: 'rush' };

export interface Timed {
  /** Seconds from the start of the recorded loop: negative for the loop before it (its effects still showing). */
  readonly t: number;
  readonly e: StageEvent;
}

export interface Recording {
  readonly loopS: number;
  readonly paths: readonly Path[];
  /** One per video frame of the loop: frame i at t = i / FPS. */
  readonly frames: readonly Snap[];
  readonly events: readonly Timed[];
  /** The state where the warm-up loop and the kept loop began and ended, for checking the seam. */
  readonly seams: readonly { readonly start: Snap; readonly end: Snap }[];
}

const hex = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** A board that deals what the script says, its random charms off (the script places them). */
function makeBoard(script: Script, seed: number): Board {
  const board = new Board({ ...script.level, charms: [] }, seed);
  let n = 0;
  const line = board.lines[0]!;
  // The burrow's dealer is private to the board; the script stands in for it.
  (board as unknown as { spawnNext: () => Spawned }).spawnNext = () => {
    const next = script.feed(n++);
    if (!next) throw new Error('The burrow ran out: shut it before its last marble');
    if (script.feed(n) === null) line.spawning = false;
    return next;
  };
  script.setup(board);
  if (script.feed(n) === null) line.spawning = false;
  // Facing where the script had it look on the step before, as on every other frame.
  const L = script.loopS;
  const before = (((script.startAt ?? 0) - DT) % L + L) % L;
  board.gecko.angle = script.angle(before, board);
  const hand = script.hand(before);
  board.loaded = hand.loaded;
  board.next = hand.next;
  return board;
}

/** Passes over the loop that are played: the first (from `startAt`) and the second warm the board up; the third is kept. */
const PASSES = 3;

/**
 * Plays the script round the loop from `startAt` until a whole loop has been
 * played after a whole warm-up loop, and keeps that last loop (so glides,
 * tints and effects carry over its seam as they would in play).
 */
export function record(script: Script, seed = 7, strict = true): Recording {
  const L = script.loopS;
  const frames = Math.round(L * FPS);
  if (Math.abs(frames - L * FPS) > 1e-6) throw new Error(`A loop of ${L}s is not a whole number of frames`);
  const perLoop = frames * SUB;
  const first = Math.round((script.startAt ?? 0) * FPS) * SUB;
  const events: Timed[] = [];
  const kept: Snap[] = [];
  const starts: Snap[] = [];
  const ends: Snap[] = [];
  let board = makeBoard(script, seed);
  const shown = new Map<number, number>();
  let tint = hex(COLOUR_WASH[script.hand(script.startAt ?? 0).loaded]);
  /** Seconds since the recording began (all passes), and when the mouth closes again. */
  let clock = 0;
  let spitUntil = -1;
  let bounce = 0;
  let heartbeat = 0;
  const glide = 1 - Math.exp(-CATCH_UP * DT);
  const tintK = 1 - Math.exp(-TINT_RATE * DT);

  const snap = (t: number): Snap => ({
    t,
    lines: board.lines.map((line) => line.marbles.map((m) => ({
      id: m.id, colour: m.colour, s: m.s, shown: shown.get(m.id) ?? m.s, charm: m.charm, charmAge: m.charmAge, look: COLOURS.indexOf(m.colour) % 3,
    }))),
    shots: board.shots.map((s) => ({ id: s.id, x: s.x, y: s.y, colour: s.colour })),
    gecko: { ...board.gecko },
    loaded: board.loaded,
    next: board.next,
    tint: `#${tint.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`,
    spitting: clock < spitUntil,
    bounce,
    hedgehog: board.hedgehog ? { line: board.hedgehog.line, s: board.hedgehog.s } : null,
    danger: board.lines.map((l) => (l.marbles.length ? l.front() / l.path.length : 0)),
    rolling: rolling(board),
  });

  for (let k = first; k < PASSES * perLoop; k++) {
    const pass = Math.floor(k / perLoop);
    const i = k % perLoop;
    const t = i * DT;
    /** Event times count from the start of the kept loop. */
    const base = (pass - (PASSES - 1)) * L;
    if (i === 0) {
      // A fresh board's loop ends on the old board, before the new one comes.
      if (pass > 1) ends.push(snap(L));
      if (script.fresh && k > first) {
        board = makeBoard(script, seed);
        shown.clear();
      }
      if (script.fresh) events.push({ t: base, e: { type: 'rush' } });
      if (pass > 0) starts.push(snap(0));
    }
    if (i % SUB === 0 && pass === PASSES - 1) kept.push(snap(t));
    /** Cues land on whole board steps, so a cue on a step boundary can't fire twice. */
    const now = (at: number): boolean => Math.round(at / DT) % perLoop === i;
    for (const c of script.charms ?? []) {
      if (!now(c.t)) continue;
      const m = c.pick(board);
      if (!m) throw new Error(`No marble for the ${c.charm} charm at ${c.t}s`);
      m.charm = c.charm;
      m.charmAge = 0;
    }
    const hand = script.hand(t);
    board.loaded = hand.loaded;
    board.next = hand.next;
    const a = script.angle(t, board);
    const input: BoardInput = {
      aim: { x: board.gecko.x + Math.cos(a) * 100, y: board.gecko.y + Math.sin(a) * 100 },
      fire: script.fires.some(now),
      swap: false,
      move: 0,
      hop: null,
    };
    const out = board.step(input, DT);
    clock += DT;
    const at = base + t + DT;
    if (script.swaps.some(now)) {
      events.push({ t: at, e: { type: 'swap' } });
      bounce = 1;
    }
    for (const e of out) {
      events.push({ t: at, e });
      if (e.type === 'spit') spitUntil = clock + SPIT_S;
      if (e.type === 'well' && strict) throw new Error(`A marble fell in the well at ${t.toFixed(2)}s`);
    }
    // What the views do each frame (GameScene.update): glides, the skin's tint, the jostle, the heartbeat.
    const live = new Set<number>();
    for (const line of board.lines) {
      for (const m of line.marbles) {
        live.add(m.id);
        const was = shown.get(m.id) ?? m.s;
        shown.set(m.id, was + (m.s - was) * glide);
      }
    }
    for (const id of [...shown.keys()]) if (!live.has(id)) shown.delete(id);
    const want = hex(COLOUR_WASH[board.loaded]);
    tint = [0, 1, 2].map((c) => tint[c]! + (want[c]! - tint[c]!) * tintK) as [number, number, number];
    bounce = Math.max(0, bounce - DT * 5);
    const d = board.danger;
    if (d >= DANGER_FROM && board.state === 'play') {
      heartbeat -= DT;
      if (heartbeat <= 0) {
        heartbeat = 1.1 - ((d - DANGER_FROM) / (1 - DANGER_FROM)) * 0.6;
        events.push({ t: at, e: { type: 'danger' } });
      }
    }
  }
  ends.push(snap(L));
  const seams = starts.map((start, n) => ({ start, end: ends[n]! }));
  return { loopS: L, paths: board.lines.map((l) => l.path), frames: kept, events: events.filter((ev) => ev.t >= -L), seams };
}

/** How hard the lines are rolling, for the rumble (GameScene.rolling). */
function rolling(b: Board): number {
  if (b.state !== 'play' || b.lines.every((l) => !l.marbles.length)) return 0;
  if (b.lines.some((l) => l.rushing && l.marbles.length)) return 1;
  if (b.timers.reverse > 0 || b.lines.some((l) => l.rewind > 0)) return 0.55;
  if (b.lines.every((l) => !l.spawning)) return 0.08;
  return Math.max(0, Math.min(0.5, 0.14 + (b.level.speed / 40) * 0.18 * (b.timers.slow > 0 ? 0.5 : 1)));
}

/** The snapshot shown at loop time t (the frame it falls in). */
export function frameAt(rec: Recording, t: number): Snap {
  const n = rec.frames.length;
  const i = Math.floor(((t % rec.loopS) + rec.loopS) % rec.loopS * FPS + 1e-6);
  return rec.frames[Math.min(n - 1, i)]!;
}

/** Events of the recorded loop and the one before it, with how long ago each was at loop time t (seconds, ≥ 0). */
export function eventsBefore(rec: Recording, t: number, within: number): { readonly age: number; readonly e: StageEvent }[] {
  const out: { age: number; e: StageEvent }[] = [];
  for (const ev of rec.events) {
    for (const shift of [0, rec.loopS]) {
      const age = t - (ev.t + shift);
      if (age >= 0 && age < within) out.push({ age, e: ev.e });
    }
  }
  return out;
}
