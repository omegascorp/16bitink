import type { FishShape, InkVariant } from '../../../src/art/fishArt';
import type { Anatomy } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { GOLDFISH } from '../goldfish/goldfish';
import { makeSprite } from '../sprites';
import type { SwimSprite } from '../swallowed/swimmer';
import { ALBACORE, BIGEYE, BLUEFIN, YELLOWFIN } from './art/tunas';
import { GIANT_MUDSKIPPER, ICEFISH, LUNGFISH, MUDSKIPPER, NURSE_SHARK, PUPFISH, RIVULUS, SAILFISH, SALMON } from './art/anatomy';

/**
 * Who is in the tournament, as the game draws them, and what the video says
 * about each (script.md and sizes.md have the sources). The new fish come from
 * ./art/anatomy.ts (painted by another agent): they are drawn through the same
 * makeSprite as the game's own, and nothing here depends on how they look.
 */

export type FishId =
  | 'pupfish' | 'mudskipper' | 'rivulus' | 'goldfish' | 'eel' | 'icefish' | 'salmon' | 'tuna' | 'cod' | 'mako' | 'white'
  | 'giantMudskipper' | 'sailfish' | 'nurse' | 'lungfish' | 'flyingfish'
  | 'yellowfin' | 'bluefin' | 'bigeye' | 'albacore';

/** The great white: the game's shark (a grey reef shark) made stouter and greyer. */
const GREAT_WHITE: Anatomy = { ...ANATOMY.shark, hh: ANATOMY.shark.hh * 1.18, wash: '#6e7a86' };

interface Drawing {
  readonly shape: FishShape;
  readonly anatomy: Anatomy;
  readonly res: number;
  readonly variant: InkVariant;
}

// The shape is only a name for the new fish: the anatomy is what gets drawn.
const drawing = (shape: FishShape, res: number, anatomy: Anatomy = ANATOMY[shape], variant: InkVariant = 'light'): Drawing => ({ shape, anatomy, res, variant });

const DRAWINGS: Readonly<Record<FishId, Drawing>> = {
  pupfish: drawing('minnow', 5, PUPFISH),
  mudskipper: drawing('goby', 5, MUDSKIPPER),
  rivulus: drawing('goby', 6, RIVULUS),
  goldfish: drawing('clownfish', 5, GOLDFISH),
  eel: drawing('eel', 5),
  icefish: drawing('cod', 5, ICEFISH),
  salmon: drawing('bass', 5, SALMON),
  tuna: drawing('tuna', 4),
  cod: drawing('cod', 5),
  mako: drawing('mako', 5),
  white: drawing('shark', 8, GREAT_WHITE, 'heavy'),
  giantMudskipper: drawing('goby', 5, GIANT_MUDSKIPPER),
  sailfish: drawing('swordfish', 5, SAILFISH),
  nurse: drawing('shark', 4, NURSE_SHARK),
  lungfish: drawing('eel', 4, LUNGFISH),
  flyingfish: drawing('flyingfish', 4),
  yellowfin: drawing('tuna', 4, YELLOWFIN),
  bluefin: drawing('tuna', 4, BLUEFIN),
  bigeye: drawing('tuna', 4, BIGEYE),
  albacore: drawing('tuna', 4, ALBACORE),
};

/** The five tunas of the school, mixed through it (skipjack is the game's own tuna). */
export const TUNAS: readonly FishId[] = ['tuna', 'yellowfin', 'bluefin', 'bigeye', 'albacore'];

export type Evidence = 'MEASURED' | 'ESTIMATED' | 'REPORTED' | 'MYTH' | 'NO STUDY';

/** A contestant in the line-up: its card and its size tag (sizes.md; weights only where script.md gives one). */
export interface Contestant {
  readonly id: FishId;
  readonly no: number;
  readonly name: string;
  /** The card's one line. */
  readonly line: string;
  readonly size: string;
  /** Typical length, inches: the line-up is drawn to scale. */
  readonly inches: number;
}

const c = (id: FishId, no: number, name: string, line: string, size: string, inches: number): Contestant => ({ id, no, name, line, size, inches });

/** Smallest to biggest, as the line-up runs. */
export const LINEUP: readonly Contestant[] = [
  c('pupfish', 1, 'DESERT PUPFISH', 'FROM DESERT SPRINGS', '2 in · 5 cm', 2),
  c('mudskipper', 2, 'MUDSKIPPER', 'WALKS ON LAND', '2 in · 5 cm', 2),
  c('rivulus', 3, 'MANGROVE RIVULUS', 'REMEMBER THIS ONE', '1.6–2.2 in · 4–5.5 cm', 1.9),
  c('goldfish', 4, 'GOLDFISH', 'THE HOUSE PET', '4 in · 10 cm', 4),
  c('eel', 5, 'EUROPEAN EEL', 'THE WRIGGLER', '20 in · 50 cm', 20),
  c('icefish', 6, 'ICEFISH', 'SEE-THROUGH BLOOD', '20 in · 50 cm', 20),
  c('salmon', 7, 'ATLANTIC SALMON', 'THE JUMPER', '29 in · 74 cm · 10 lb · 4.5 kg', 29),
  c('tuna', 8, 'SKIPJACK TUNA', '+ 90 FRIENDS: 5 KINDS OF TUNA', '31 in · 80 cm · 20 lb · 9 kg', 31),
  c('cod', 9, 'ATLANTIC COD', 'POPULAR… ON PLATES', '39 in · 100 cm', 39),
  c('mako', 10, 'SHORTFIN MAKO', 'THE SPEEDSTER', '9 ft · 2.7 m', 108),
  c('white', 11, 'GREAT WHITE SHARK', 'THE FAVOURITE', '15 ft · 4.6 m · 2,200+ lb · 1,000+ kg', 180),
];

export const contestant = (id: FishId): Contestant => {
  const found = LINEUP.find((k) => k.id === id);
  if (!found) throw new Error(`${id} is not a contestant`);
  return found;
};

/** The short name the evidence tags lead with. */
export const SHORT: Readonly<Partial<Record<FishId, string>>> = {
  pupfish: 'PUPFISH', mudskipper: 'MUDSKIPPER', rivulus: 'RIVULUS', goldfish: 'GOLDFISH', eel: 'EEL', icefish: 'ICEFISH',
  salmon: 'SALMON', tuna: 'TUNAS', cod: 'COD', mako: 'MAKO', white: 'GREAT WHITE', giantMudskipper: 'MUDSKIPPER',
};

let sprites: Record<FishId, SwimSprite> | null = null;

/** Draws every fish once (all boil frames), before the first frame. */
export function prepareSprites(): void {
  if (sprites) return;
  const made = {} as Record<FishId, SwimSprite>;
  for (const id of Object.keys(DRAWINGS) as FishId[]) {
    const d = DRAWINGS[id];
    const s = makeSprite(d.shape, d.res, d.variant, d.anatomy);
    made[id] = { ...s, bodyPx: d.anatomy.hl * 2 * d.res, anatomy: d.anatomy };
  }
  sprites = made;
}

export function spriteOf(id: FishId): SwimSprite {
  if (!sprites) throw new Error('prepareSprites() first');
  return sprites[id];
}

export const shapeOf = (id: FishId): FishShape => DRAWINGS[id].shape;

/** The body's height over its length (the drawing's own), for laying fish out without overlap. */
export const aspectOf = (id: FishId): number => DRAWINGS[id].anatomy.hh / DRAWINGS[id].anatomy.hl;
