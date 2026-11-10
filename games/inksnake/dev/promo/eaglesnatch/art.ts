import { SNAKE_EAGLE_ART } from '../../../src/art/chapters/mountainsCrittersEagle';
import { EAGLE } from '../../../src/art/chapters/mountainsCrittersEagleParts';
import { ellipseAt } from '../../../src/art/critters/birdKit';
import { AGAMA_ART } from '../../../src/art/chapters/mountainsCrittersAgama';
import { MOUNTAINS_PLACE } from '../../../src/art/chapters/mountainsPlace';
import { SPIDER_HEAD } from '../../../src/art/chapters/mountainsSnakeHead';
import { SPIDER_TONGUE } from '../../../src/art/chapters/mountainsSnakeJaws';
import { SPIDERTAIL_ART } from '../../../src/art/chapters/mountainsSnake';
import { closed, cub, makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import type { LevelDef, SolidDef } from '../../../src/level/types';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { KB, TILE_H, W } from './story';

/** The game's own chapter 7 drawings (the ash-brown snake eagle, the rock agama, the spider-tailed viper, the limestone slope), baked for the video. */

/** The bare scaly toes and legs: pale grey, lit on top. */
export const TOE = '#a7a8a1';
export const TOE_LIT = '#d9dad2';

/** The snake's half-width under the feet, in hawk units (the snake's width W over the eagle's 0.8 board px per hawk unit). */
const GRIP_HALF = W / 2 / (0.8 * KB);

/**
 * One foot gripping the snake, seen from above, in hawk units: the snake runs
 * along x under it, the foot sits on its back. Short pale-grey scaly toes, three
 * forward round the far flank (+y), the hind toe round the near one, each with a
 * curved black talon hooked over the flank's edge; the tarsus comes down onto
 * the middle (render.ts draws the leg).
 */
const GRIP: SpriteArt<'grip'> = {
  frame: 36,
  res: 8,
  poses: ['grip'],
  draw: (d) => {
    const { pen } = d;
    // An accipitrid's foot: three toes forward, fanned, over the snake's far flank (+y), and the thick hind toe (the hallux) opposing them on the near flank.
    const toes: readonly (readonly [number, number, number])[] = [
      // angle off the snake's axis, reach (share of the half-width), thickness
      [Math.PI / 2 - 0.55, 0.96, 2.7],
      [Math.PI / 2, 1, 2.9],
      [Math.PI / 2 + 0.5, 0.94, 2.7],
      [-Math.PI / 2 + 0.08, 0.92, 3.2],
    ];
    for (const [a, reach, w] of toes) {
      const side = Math.sign(Math.sin(a));
      const r = GRIP_HALF * reach;
      // Over the snake's round back the toe runs out, then bends down its flank: from above it curves towards the axis' line at its end.
      const tip = pt(Math.cos(a) * r * 0.62, side * r * 0.97);
      const path = cub(pt(Math.cos(a) * 0.8, Math.sin(a) * 0.8), pt(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45), pt(Math.cos(a) * r * 0.66, side * r * 0.8), tip, 10);
      // Its shadow on the snake's back.
      pen.stroke(path.map((p) => pt(p.x + 0.7, p.y + 1)), w + 0.6, d.ink, 0.25, false);
      pen.stroke(path, w + 1, d.ink, 0.95, false);
      pen.stroke(path, w, TOE, 1, false);
      pen.stroke(path.map((p) => pt(p.x - 0.3, p.y - 0.35 * side)), w * 0.35, TOE_LIT, 0.75, false);
      // The scutes across the toe.
      for (let k = 2; k < path.length - 1; k += 2) {
        const [p0, p1] = [path[k - 1]!, path[k + 1]!];
        const l = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        const [nx, ny] = [-(p1.y - p0.y) / l, (p1.x - p0.x) / l];
        const c = path[k]!;
        pen.hair([pt(c.x + nx * w * 0.5, c.y + ny * w * 0.5), pt(c.x + (p1.x - p0.x) * 0.1, c.y + (p1.y - p0.y) * 0.1), pt(c.x - nx * w * 0.5, c.y - ny * w * 0.5)], 0.3, d.ink, 0.55);
      }
      // The talon: a long curved black hook out over the flank's edge, bending along it, its point turned in under the snake.
      const dx = Math.sign(Math.cos(a));
      const hook = cub(tip, pt(tip.x + dx * 0.5, tip.y + side * 2), pt(tip.x + dx * 2.6, tip.y + side * 2.5), pt(tip.x + dx * 4, tip.y + side * 1.1), 12);
      pen.stroke(hook.slice(0, 5), 2, EAGLE.talon, 1, false);
      pen.stroke(hook.slice(3, 9), 1.35, EAGLE.talon, 1, false);
      pen.stroke(hook.slice(7), 0.7, EAGLE.talon, 1, false);
      pen.hair(hook.slice(1, 8).map((p) => pt(p.x - 0.2 * dx, p.y - 0.4 * side)), 0.4, '#7d7872', 0.85);
    }
    // The ball of the foot, under the tarsus.
    pen.fill(ellipseAt(0, 0, 2.6, 2.4, 0, 18), TOE, 1);
    pen.stroke(closed(ellipseAt(0, 0, 2.6, 2.4, 0, 18)), 0.6, d.ink, 0.85, false);
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
  readonly head: Readonly<Record<'shut' | 'strike', Sprite>>;
  readonly tongue: Sprite;
  readonly agama: Readonly<Record<'idle' | 'bob' | 'run0' | 'run1', Sprite>>;
  readonly eagle: Readonly<Record<'soar' | 'hover' | 'flap0' | 'flap1' | 'stoop', Sprite>>;
  readonly grip: Sprite;
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
    grip: bakeSprite(GRIP, 'grip', 8, 430),
  };
}
