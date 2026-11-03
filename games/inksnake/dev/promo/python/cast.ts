import { ANACONDA_TONE, type AnacondaTone } from '../../../src/art/chapters/floodedSnakePaint';
import { anacondaArt } from '../../../src/art/chapters/floodedSnake';
import type { SnakeArt } from '../../../src/art/types';
import { bakeSprite, bakeStrip, type Sprite, type Strip } from '../sprites';
import { type Board, paintBoard } from './board';
import { FRESHWATER_CROC_ART } from './croc';

/**
 * The cast, baked once at video size. The olive python is the game's
 * anaconda painter (chapter 10: its wet scales, its head, its tongue) in a
 * plain olive-brown with the spots and the stripe painted out; the
 * freshwater croc is croc.ts; the lake is board.ts.
 */
export const OLIVE: AnacondaTone = {
  ...ANACONDA_TONE,
  wash: ['#b3a460', '#968848', '#7a6f3a', '#5e552c', '#403a1e'],
  ground: '#7a6f3a',
  olive: '#97894a',
  moss: '#544c26',
  shadow: '#1d1a0d',
  spot: '#6e6435',
  spotLit: '#7a6f3a',
  spotDeep: '#625a30',
  ocellus: '#7a6f3a',
  ocellusLit: '#85794a',
  stripe: '#85794a',
  iris: '#b8962f',
  lip: '#cfc58c',
  belly: '#d8cf98',
  sheen: 0.34,
  seed: 4242,
};

export interface Cast {
  readonly art: SnakeArt;
  readonly strip: Strip;
  readonly head: { readonly shut: Sprite; readonly open: Sprite; readonly strike: Sprite };
  readonly tongue: Sprite;
  readonly croc: { readonly swim0: Sprite; readonly swim1: Sprite; readonly face: Sprite };
  readonly board: Board;
}

const SNAKE_RES = 10;
const CROC_RES = 12;
const BOARD_RES = 6;

export function makeCast(): Cast {
  const art = anacondaArt(OLIVE);
  return {
    art,
    strip: bakeStrip(art, SNAKE_RES),
    head: {
      shut: bakeSprite(art.head, 'shut', SNAKE_RES, 300),
      open: bakeSprite(art.head, 'open', SNAKE_RES, 310),
      strike: bakeSprite(art.head, 'strike', SNAKE_RES, 320),
    },
    tongue: bakeSprite(art.tongue, 'flick', SNAKE_RES, 400),
    croc: {
      swim0: bakeSprite(FRESHWATER_CROC_ART, 'swim0', CROC_RES, 510),
      swim1: bakeSprite(FRESHWATER_CROC_ART, 'swim1', CROC_RES, 520),
      face: bakeSprite(FRESHWATER_CROC_ART, 'face', CROC_RES, 530),
    },
    board: paintBoard(BOARD_RES),
  };
}
