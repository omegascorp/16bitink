import { anacondaArt } from '../../../src/art/chapters/floodedSnake';
import { GUINEA_EGG_ART } from '../../../src/art/chapters/savannaCrittersEggs';
import { EGGEATER_ART } from '../../../src/art/chapters/savannaSnake';
import { MOUSE } from '../../../src/art/critters/mouse';
import { RAT } from '../../../src/art/critters/rat';
import { makeCanvas } from '../../../src/art/pen';
import { CORN } from '../../../src/art/snakes/corn';
import type { SnakeArt, SpriteArt } from '../../../src/art/types';
import { OLIVE } from '../python/cast';
import { FRESHWATER_CROC_ART } from '../python/croc';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { BURMESE_PYTHON, DEER, FAWN, HYENA, ROCK_PYTHON } from './art/index';
import { type Boards, paintBoards } from './boards';

/**
 * Everything the video draws, baked once at video size: the five snakes
 * (strip, heads, tongue), the meals (their pose going in, plus a pale
 * x-ray rim for showing them through the skin), and the boards. Sizes are
 * true: every snake and meal carries its length and width in life (cm),
 * and every shot draws them on one scale.
 */

export type SnakeId = 'corn' | 'olive' | 'burmese' | 'rock' | 'eggeater';
export type MealId = 'mouse' | 'rat' | 'croc' | 'fawn' | 'deer' | 'hyena' | 'egg';

export interface Snake {
  readonly art: SnakeArt;
  readonly strip: Strip;
  readonly shut: Sprite;
  readonly open: Sprite;
  readonly tongue: Sprite;
}

export interface Meal {
  readonly sprite: Sprite;
  /** The pale outline of the sprite, and its pale silhouette, for the x-ray through the skin. */
  readonly rim: Sprite;
  readonly ghost: Sprite;
  /** Nose to rump, art units, and in life (cm); its width in life across the back (cm). */
  readonly len: number;
  readonly cm: number;
  readonly wideCm: number;
}

export interface Cast {
  readonly snakes: Readonly<Record<SnakeId, Snake>>;
  readonly meals: Readonly<Record<MealId, Meal>>;
  readonly boards: Boards;
}

/** Length and body width in life, cm. */
export const SNAKE_CM: Readonly<Record<SnakeId, { readonly cm: number; readonly wide: number }>> = {
  corn: { cm: 120, wide: 3.2 },
  olive: { cm: 300, wide: 9 },
  burmese: { cm: 450, wide: 14 },
  rock: { cm: 400, wide: 12 },
  eggeater: { cm: 90, wide: 2.2 },
};

const X_RAY = '#f8eed2';

/** The drawing's silhouette in the x-ray's pale. */
function ghostOf(sprite: Sprite): Sprite {
  const frames = sprite.frames.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = X_RAY;
    ctx.fillRect(0, 0, src.width, src.height);
    return canvas;
  });
  return { ...sprite, frames };
}

/** A pale ring just outside the drawing's edge, `r` canvas px wide. */
function rimOf(sprite: Sprite, r: number): Sprite {
  const frames = sprite.frames.map((src) => {
    const { canvas, ctx } = makeCanvas(src.width, src.height);
    for (let a = 0; a < 12; a++) ctx.drawImage(src, Math.cos((a / 12) * Math.PI * 2) * r, Math.sin((a / 12) * Math.PI * 2) * r);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = X_RAY;
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(src, 0, 0);
    return canvas;
  });
  return { ...sprite, frames };
}

function bakeSnake(art: SnakeArt, res: number, seed: number): Snake {
  return {
    art,
    strip: bakeStrip(art, res, seed),
    shut: bakeSprite(art.head, 'shut', res, seed + 300),
    open: bakeSprite(art.head, 'open', res, seed + 310),
    tongue: bakeSprite(art.tongue, 'flick', res, seed + 400),
  };
}

function bakeMeal<P extends string>(art: SpriteArt<P>, pose: P, res: number, len: number, cm: number, wideCm: number, seed: number): Meal {
  const sprite = bakeSprite(art, pose, res, seed);
  return { sprite, rim: rimOf(sprite, Math.max(2, res * 1.1)), ghost: ghostOf(sprite), len, cm, wideCm };
}

export function makeCast(): Cast {
  return {
    snakes: {
      corn: bakeSnake(CORN, 5, 11),
      olive: bakeSnake(anacondaArt(OLIVE), 5, 12),
      burmese: bakeSnake(BURMESE_PYTHON, 6, 13),
      rock: bakeSnake(ROCK_PYTHON, 6, 14),
      eggeater: bakeSnake(EGGEATER_ART!, 5, 15),
    },
    meals: {
      mouse: bakeMeal(MOUSE, 'idle', 6, 30, 9, 3.6, 500),
      rat: bakeMeal(RAT, 'idle', 5, 54, 20, 6.5, 510),
      croc: bakeMeal(FRESHWATER_CROC_ART, 'swim0', 5, 104, 100, 18, 520),
      fawn: bakeMeal(FAWN.art, 'limp', 6, FAWN.len, FAWN.cm, 26, 530),
      deer: bakeMeal(DEER.art, 'limp', 6, DEER.len, DEER.cm, 40, 540),
      hyena: bakeMeal(HYENA.art, 'limp', 6, HYENA.len, HYENA.cm, 42, 550),
      egg: bakeMeal(GUINEA_EGG_ART, 'egg', 8, 40, 5.4, 4.2, 560),
    },
    boards: paintBoards(5),
  };
}
