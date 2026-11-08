import { MORAY_ART } from '../../../src/art/chapters/reefCrittersMoray';
import { KRAIT_ART } from '../../../src/art/chapters/reefSnake';
import type { SnakeArt } from '../../../src/art/types';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { LONG_EEL_ART } from './eel';
import { type Board, paintBoard } from './reef';

/**
 * The short's cast, baked once at video size from the game's own drawings
 * (chapter 6): the banded sea krait (its back strip, its head shut, gaping
 * and striking, its tongue), the yellow-margined moray (swimming one way and
 * the other, and out of its hole), and the reef's board. Seeds as the game's
 * textures.ts uses them, so the wobble is the game's.
 */
export interface Cast {
  readonly art: SnakeArt;
  readonly strip: Strip;
  readonly head: { readonly shut: Sprite; readonly open: Sprite; readonly strike: Sprite };
  readonly tongue: Sprite;
  readonly moray: { readonly swim0: Sprite; readonly swim1: Sprite; readonly out0: Sprite; readonly out1: Sprite };
  /** The moray drawn long and even, for the one in the krait's jaws (eel.ts). */
  readonly eel: { readonly swim0: Sprite; readonly swim1: Sprite };
  readonly board: Board;
}

/** Px per art unit the sprites are baked at: the most any shot shows them at. */
const SNAKE_RES = 10;
const EEL_RES = 14;
const BOARD_RES = 8;
const LONG_EEL_RES = 13;
/** The game's seed for the moray (textures.ts seedOf('moray')), and its poses' order. */
const MORAY_SEED = ((): number => {
  let h = 0;
  for (const c of 'moray') h = (h * 31 + c.charCodeAt(0)) % 100000;
  return h;
})();

export function makeCast(): Cast {
  const art = KRAIT_ART!;
  const pose = (p: 'out0' | 'out1' | 'swim0' | 'swim1', i: number): Sprite => bakeSprite(MORAY_ART, p, EEL_RES, MORAY_SEED + i * 10);
  return {
    art,
    strip: bakeStrip(art, SNAKE_RES),
    head: {
      shut: bakeSprite(art.head, 'shut', SNAKE_RES, 300),
      open: bakeSprite(art.head, 'open', SNAKE_RES, 310),
      strike: bakeSprite(art.head, 'strike', SNAKE_RES, 320),
    },
    tongue: bakeSprite(art.tongue, 'flick', SNAKE_RES, 400),
    moray: { out0: pose('out0', 0), out1: pose('out1', 1), swim0: pose('swim0', 2), swim1: pose('swim1', 3) },
    eel: { swim0: bakeSprite(LONG_EEL_ART, 'swim0', LONG_EEL_RES, MORAY_SEED + 20), swim1: bakeSprite(LONG_EEL_ART, 'swim1', LONG_EEL_RES, MORAY_SEED + 30) },
    board: paintBoard(BOARD_RES),
  };
}
