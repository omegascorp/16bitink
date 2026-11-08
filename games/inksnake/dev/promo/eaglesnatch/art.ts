import { SNAKE_EAGLE_ART } from '../../../src/art/chapters/mountainsCrittersEagle';
import { eagleFoot } from '../../../src/art/chapters/mountainsCrittersEagleParts';
import { AGAMA_ART } from '../../../src/art/chapters/mountainsCrittersAgama';
import { MOUNTAINS_PLACE } from '../../../src/art/chapters/mountainsPlace';
import { SPIDER_HEAD } from '../../../src/art/chapters/mountainsSnakeHead';
import { SPIDER_TONGUE } from '../../../src/art/chapters/mountainsSnakeJaws';
import { SPIDERTAIL_ART } from '../../../src/art/chapters/mountainsSnake';
import { makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import type { LevelDef, SolidDef } from '../../../src/level/types';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { KB, TILE_H } from './story';

/** The game's own chapter 7 drawings (the ash-brown snake eagle, the rock agama, the spider-tailed viper, the limestone slope), baked for the video. */

/** The talons, over the flapping poses (the stoop pose has its own). */
const FEET: SpriteArt<'feet'> = {
  frame: 150,
  res: 2,
  poses: ['feet'],
  draw: (d) => {
    const { ctx } = d.pen;
    ctx.save();
    ctx.scale(0.8, 0.8);
    ctx.translate(2, 0);
    eagleFoot(d, pt(31, 8), 0.2, 1, 11);
    eagleFoot(d, pt(31, -8), -0.2, -1, 11);
    ctx.restore();
  },
};

/** Boulders in the cropped board, so the snake crawls past rocks. Board px. */
const BOARD_CROP = { x: 40, y: 60, w: 172, h: TILE_H / KB } as const;
const SOLIDS: readonly SolidDef[] = [
  { kind: 'circle', look: 'boulder', x: 58, y: 110, r: 9 },
  { kind: 'circle', look: 'boulder', x: 168, y: 118, r: 8 },
];
const LEVEL: LevelDef = {
  id: 'promo-eaglesnatch', name: 'Eagle Shadow', snake: 'spidertail', start: { x: 0, y: 0 }, heading: 0, length: 130, target: 400, par: 50, prey: [], zones: [], solids: SOLIDS, cover: [],
};
const RES = 6;

export interface Cast {
  readonly ground: HTMLCanvasElement;
  readonly strip: Strip;
  readonly head: Readonly<Record<'shut' | 'open' | 'strike', Sprite>>;
  readonly tongue: Sprite;
  readonly agama: Readonly<Record<'idle' | 'bob' | 'run0' | 'run1', Sprite>>;
  readonly eagle: Readonly<Record<'soar' | 'hover' | 'flap0' | 'flap1' | 'stoop', Sprite>>;
  readonly feet: Sprite;
}

/** One vertical tile of the Mountains' slope (the board painted by the game's painter, cropped). */
function paintGround(): HTMLCanvasElement {
  const place = MOUNTAINS_PLACE;
  if (!place) throw new Error('eaglesnatch: no Mountains art');
  const { canvas, ctx } = makeCanvas(Math.round(BOARD_CROP.w * RES), Math.round(BOARD_CROP.h * RES));
  ctx.scale(RES, RES);
  ctx.translate(-BOARD_CROP.x, -BOARD_CROP.y);
  const d = makeDraw(ctx, 4417, 0, 0);
  place.ground(d, LEVEL);
  for (const s of SOLIDS) place.solid(d, s);
  releaseScratch();
  return canvas;
}

export function bakeCast(): Cast {
  const snake = SPIDERTAIL_ART;
  if (!snake) throw new Error('eaglesnatch: no spider-tailed viper art');
  return {
    ground: paintGround(),
    strip: bakeStrip(snake, 5),
    head: {
      shut: bakeSprite(SPIDER_HEAD, 'shut', 5, 300),
      open: bakeSprite(SPIDER_HEAD, 'open', 5, 310),
      strike: bakeSprite(SPIDER_HEAD, 'strike', 5, 320),
    },
    tongue: bakeSprite(SPIDER_TONGUE, 'flick', 5, 330),
    agama: {
      idle: bakeSprite(AGAMA_ART, 'idle', 8, 340),
      bob: bakeSprite(AGAMA_ART, 'bob', 8, 350),
      run0: bakeSprite(AGAMA_ART, 'run0', 8, 360),
      run1: bakeSprite(AGAMA_ART, 'run1', 8, 370),
    },
    eagle: {
      soar: bakeSprite(SNAKE_EAGLE_ART, 'soar', 6, 380),
      hover: bakeSprite(SNAKE_EAGLE_ART, 'hover', 6, 390),
      flap0: bakeSprite(SNAKE_EAGLE_ART, 'flap0', 6, 400),
      flap1: bakeSprite(SNAKE_EAGLE_ART, 'flap1', 6, 410),
      stoop: bakeSprite(SNAKE_EAGLE_ART, 'stoop', 6, 420),
    },
    feet: bakeSprite(FEET, 'feet', 6, 430),
  };
}
