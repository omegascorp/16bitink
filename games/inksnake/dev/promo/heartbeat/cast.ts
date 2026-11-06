import { RAT } from '../../../src/art/critters/rat';
import { makeDraw } from '../../../src/art/kit';
import { FARM } from '../../../src/art/places/farm';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { CORN } from '../../../src/art/snakes/corn';
import { CHAPTER_1 } from '../../../src/level/chapter1';
import { BOARD } from '../../../src/level/types';
import { SNAKE_INSIDE } from '../gulphen/snakeSide';
import { VIDEO } from '../short';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { BOA_BODY, BOA_TAIL } from './boaArt';
import { BOA_LOWER, BOA_UPPER } from './boaHead';
import { HEART } from './heartArt';
import { paintDark } from './night';
import { RAT_SIDE } from './ratArt';

/**
 * The short's cast, baked once at video size: the boa (its strips and its
 * side-on jaws), the rat from the side, the heart, the dark ground; and the
 * real game: chapter 1's "Rat Run" board painted as the game paints it, the
 * corn snake and the game's rat, seeds as textures.ts uses them.
 */
export interface Cast {
  readonly body: Strip;
  readonly tail: Strip;
  readonly upper: Readonly<Record<'open' | 'squeeze', Sprite>>;
  readonly lower: Sprite;
  readonly roof: Sprite;
  readonly floor: Sprite;
  readonly tongue: Sprite;
  readonly rat: Readonly<Record<'open' | 'shut', Sprite>>;
  readonly heart: Readonly<Record<'live' | 'dead', Sprite>>;
  readonly dark: HTMLCanvasElement;
  /** A frame-sized scratch: the coils as they stood, to veil across the heart. */
  readonly veil: HTMLCanvasElement;
  readonly game: GameCast;
}

export interface GameCast {
  readonly board: HTMLCanvasElement;
  readonly res: number;
  readonly strip: Strip;
  readonly head: Sprite;
  readonly open: Sprite;
  readonly rat: Readonly<Record<'idle' | 'run0' | 'run1', Sprite>>;
}

const BOARD_RES = 7;
/** The rat's close-up line: dark brown, as the boa's. */
const RAT_LINE = '#2a1810';
/** The level the short's game shot is: chapter 1's first coil level. */
export const RAT_RUN = CHAPTER_1[2]!;

const seedOf = (s: string): number => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 0);

function paintRatRun(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(BOARD.w * BOARD_RES, BOARD.h * BOARD_RES);
  ctx.scale(BOARD_RES, BOARD_RES);
  const seed = seedOf(RAT_RUN.id);
  FARM.ground(makeDraw(ctx, 600 + seed, 0, 0), RAT_RUN);
  (RAT_RUN.solids ?? []).forEach((s, i) => FARM.solid(makeDraw(ctx, 700 + i + seed, 0, 0), s));
  (RAT_RUN.cover ?? []).forEach((c, i) => FARM.cover(makeDraw(ctx, 800 + i + seed, 0, 0), c));
  releaseScratch();
  return canvas;
}

function bakeGame(): GameCast {
  const seed = seedOf('rat');
  const pose = (p: 'idle' | 'run0' | 'run1', i: number): Sprite => bakeSprite(RAT, p, 6, seed + i * 10);
  return {
    board: paintRatRun(),
    res: BOARD_RES,
    strip: bakeStrip(CORN, 6),
    head: bakeSprite(CORN.head, 'shut', 6, 300),
    open: bakeSprite(CORN.head, 'open', 6, 310),
    rat: { idle: pose('idle', 0), run0: pose('run0', 1), run1: pose('run1', 2) },
  };
}

export function bakeCast(): Cast {
  return {
    body: bakeStrip(BOA_BODY, 11, 21),
    tail: bakeStrip(BOA_TAIL, 9, 22),
    upper: { open: bakeSprite(BOA_UPPER, 'open', 9, 340), squeeze: bakeSprite(BOA_UPPER, 'squeeze', 9, 340) },
    lower: bakeSprite(BOA_LOWER, 'jaw', 9, 350),
    roof: bakeSprite(SNAKE_INSIDE, 'roof', 9, 360),
    floor: bakeSprite(SNAKE_INSIDE, 'floor', 9, 360),
    tongue: bakeSprite(CORN.tongue, 'flick', 9, 320),
    rat: { open: bakeSprite(RAT_SIDE, 'open', 6, 400, RAT_LINE), shut: bakeSprite(RAT_SIDE, 'shut', 6, 400, RAT_LINE) },
    heart: { live: bakeSprite(HEART, 'live', 7, 450), dead: bakeSprite(HEART, 'dead', 7, 450) },
    dark: paintDark(VIDEO.width + 400, VIDEO.height + 400),
    veil: makeCanvas(VIDEO.width, VIDEO.height).canvas,
    game: bakeGame(),
  };
}
