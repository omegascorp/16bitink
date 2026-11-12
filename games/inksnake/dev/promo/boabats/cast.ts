import { CORN } from '../../../src/art/snakes/corn';
import { CORN_HEAD } from '../../../src/art/snakes/cornHead';
import { makeCanvas } from '../../../src/art/pen';
import type { GameSnake } from '../deer/cta';
import { VIDEO } from '../short';
import { bakeSprite, bakeStrip, type Sprite } from '../sprites';
import { paintCave, paintCeiling } from './cave';
import { CUBAN_BODY } from './cubanArt';
import { CUBAN_FRONT, CUBAN_LOWER, CUBAN_UPPER } from './cubanHead';
import { type BatPose, FRUIT_BAT } from './fruitBat';
import type { BatCast, BoaCast } from './rig';

/**
 * The short's cast, baked once at video size: the Cuban boa (its strip, its
 * side-on jaws, its head-on face, its tongue), the fruit bat at three sizes
 * in each pose, the cave in each framing with its ceiling, a frame-sized
 * scratch for the dissolve into frame 1, and InkSnake's corn snake for the
 * call to action.
 */
export interface Cast {
  readonly boa: BoaCast;
  readonly bats: BatCast;
  readonly hookBg: HTMLCanvasElement;
  readonly hookCeiling: HTMLCanvasElement;
  readonly passageBg: HTMLCanvasElement;
  readonly passageCeiling: HTMLCanvasElement;
  readonly aloneBg: HTMLCanvasElement;
  readonly aloneCeiling: HTMLCanvasElement;
  readonly veil: HTMLCanvasElement;
  readonly game: GameSnake;
}

export const MARGIN = 120;
/** The bats' line: dark brown, as the boa's, not the game's ballpoint blue. */
const BAT_LINE = '#24170f';
export const HOOK_MOUTH = { x: 700, y: 1030, rx: 420, ry: 235 } as const;
export const PASSAGE_MOUTH = { x: 540, y: 1330, rx: 430, ry: 240 } as const;
export const ALONE_MOUTH = { x: 660, y: 1230, rx: 420, ry: 235 } as const;
export const CEILING_LIP = { hook: 170, passage: 300, alone: 300 } as const;

const poses = (res: number, seed: number): Record<BatPose, Sprite> => ({
  fly0: bakeSprite(FRUIT_BAT, 'fly0', res, seed, BAT_LINE),
  fly1: bakeSprite(FRUIT_BAT, 'fly1', res, seed + 10, BAT_LINE),
  swoop: bakeSprite(FRUIT_BAT, 'swoop', res, seed + 20, BAT_LINE),
});

const shifted = (m: { x: number; y: number; rx: number; ry: number }) => ({ ...m, x: m.x + MARGIN, y: m.y + MARGIN });
const cave = (m: { x: number; y: number; rx: number; ry: number }, seed: number): HTMLCanvasElement =>
  paintCave({ width: VIDEO.width + MARGIN * 2, height: VIDEO.height + MARGIN * 2, mouth: shifted(m) }, seed);

export function bakeCast(): Cast {
  return {
    boa: {
      body: bakeStrip(CUBAN_BODY, 9, 31),
      upper: { open: bakeSprite(CUBAN_UPPER, 'open', 9, 540), squeeze: bakeSprite(CUBAN_UPPER, 'squeeze', 9, 540) },
      lower: bakeSprite(CUBAN_LOWER, 'jaw', 9, 550),
      front: bakeSprite(CUBAN_FRONT, 'front', 9, 560),
      tongue: bakeSprite(CORN.tongue, 'flick', 9, 320),
    },
    bats: { big: poses(15, 700), mid: poses(9, 730), far: poses(2.5, 760) },
    hookBg: cave(HOOK_MOUTH, 81),
    hookCeiling: paintCeiling(VIDEO.width + MARGIN * 2, CEILING_LIP.hook + MARGIN, 82, HOOK_MOUTH.x + MARGIN),
    passageBg: cave(PASSAGE_MOUTH, 83),
    passageCeiling: paintCeiling(VIDEO.width + MARGIN * 2, CEILING_LIP.passage + MARGIN, 84, PASSAGE_MOUTH.x + MARGIN),
    aloneBg: cave(ALONE_MOUTH, 85),
    aloneCeiling: paintCeiling(VIDEO.width + MARGIN * 2, CEILING_LIP.alone + MARGIN, 86, ALONE_MOUTH.x + MARGIN),
    veil: makeCanvas(VIDEO.width, VIDEO.height).canvas,
    game: { strips: { right: bakeStrip(CORN, 6, 51), left: bakeStrip(CORN, 6, 51) }, head: bakeSprite(CORN_HEAD, 'shut', 6, 660) },
  };
}
