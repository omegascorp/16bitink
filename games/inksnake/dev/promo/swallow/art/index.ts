import type { SnakeArt, SpriteArt } from '../../../../src/art/types';
import { DEER } from './deer';
import { FAWN } from './fawn';
import { HYENA } from './hyena';
import { BURMESE_PYTHON, ROCK_PYTHON } from './pythons';

/**
 * The drawings this video adds to the game's own, all seen from above like
 * the game, facing +x, in the game's pen-and-wash style (src/art/kit.ts).
 *
 * A meal has one pose, 'limp': the animal as a python swallows it head
 * first, stretched straight out along +x (head forward), forelegs folded back
 * along the chest, hind legs trailing back past the rump, tail along them.
 * The video draws it going into the jaws (the head first, so what shows
 * outside the mouth is its back half and hind legs) and faintly through the
 * snake's skin inside the lump. Never gory: no blood, no wounds, eyes shut.
 *
 * `len` is the animal's nose-to-rump length in art units (not counting the
 * trailing legs or the tail), and `cm` that length in life: the video scales
 * every drawing by cm, so a fawn and a deer drawn at any `len` come out the
 * right size next to each other and next to the snakes. The frame's centre
 * is the middle of the body; the nose is `len / 2` ahead of it.
 */
export interface MealArt {
  readonly art: SpriteArt<'limp'>;
  readonly len: number;
  readonly cm: number;
}

export { BURMESE_PYTHON, DEER, FAWN, HYENA, ROCK_PYTHON };

/** The two new snakes, as the game's SnakeArt (strip + head + tongue). */
export const NEW_SNAKES: Readonly<Record<string, SnakeArt>> = { burmese: BURMESE_PYTHON, rock: ROCK_PYTHON };

/** The three new meals. */
export const NEW_MEALS: Readonly<Record<string, MealArt>> = { fawn: FAWN, deer: DEER, hyena: HYENA };
