import type { SnakeArt } from '../types';
import { KRAIT_ART } from './jungleRivalsKrait';
import { PYTHON_ART } from './jungleRivalsPython';
import { RATSNAKE_ART } from './jungleRivalsRat';

/**
 * The Jungle's rival snakes, by enemy kind, drawn like the player's snake
 * (see SnakeArt): 'ratsnake' (Indian rat snake: slim, olive-brown with
 * broken dark crossbars, jungleRivalsRat.ts), 'banded-krait' and
 * 'big-krait' (banded krait, the same species bigger: bold black and yellow
 * rings of equal width, a ridged back, jungleRivalsKrait.ts), 'rock-python'
 * (Indian rock python: heavy, pale buff with big dark-edged brown blotches
 * and an arrowhead mark on the head, jungleRivalsPython.ts).
 */
export const JUNGLE_RIVALS: Readonly<Record<string, SnakeArt>> = {
  ratsnake: RATSNAKE_ART,
  'banded-krait': KRAIT_ART,
  'big-krait': KRAIT_ART,
  'rock-python': PYTHON_ART,
};
