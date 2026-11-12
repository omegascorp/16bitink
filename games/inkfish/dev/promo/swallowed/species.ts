import type { FishShape, InkVariant } from '../../../src/art/fishArt';
import type { Anatomy } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { BLACKTIP } from '../goliath/cast';
import { makeSprite } from '../sprites';
import { SWALLOWER } from '../swallower/anatomy';
import type { SwimSprite } from './swimmer';

/**
 * Who is in the video, as the game draws them, and the numbers the video
 * states for each (script.md has the sources). Every swallow step measures
 * the same thing: the meal's length as a share of the eater's.
 */

export type FishId =
  | 'grouper' | 'blacktip' | 'pike' | 'pikelet' | 'lionfish' | 'frogfish' | 'wrasse' | 'pelican' | 'swallower' | 'mackerel';

/** The snake mackerel: the barracuda's long silver body made slimmer and darker, as Gempylus serpens is. */
const SNAKE_MACKEREL: Anatomy = { ...ANATOMY.barracuda, hh: 11, wash: '#59606e', extras: undefined };

interface Drawing {
  readonly shape: FishShape;
  readonly anatomy: Anatomy;
  readonly res: number;
  readonly variant: InkVariant;
}

const drawing = (shape: FishShape, res: number, variant: InkVariant = 'light', anatomy: Anatomy = ANATOMY[shape]): Drawing => ({ shape, anatomy, res, variant });

const DRAWINGS: Readonly<Record<FishId, Drawing>> = {
  grouper: drawing('grouper', 6, 'heavy'),
  blacktip: drawing('shark', 4, 'light', BLACKTIP),
  pike: drawing('pike', 6, 'heavy'),
  pikelet: drawing('pike', 4),
  lionfish: drawing('lionfish', 5),
  frogfish: drawing('angler', 6, 'heavy'),
  wrasse: drawing('wrasse', 4),
  pelican: drawing('gulper', 5),
  // The shape is only a name here: the anatomy is the swallower short's own.
  swallower: drawing('fangtooth', 6, 'light', SWALLOWER),
  mackerel: drawing('barracuda', 5, 'light', SNAKE_MACKEREL),
};

export interface Step {
  readonly eater: FishId;
  readonly meal: FishId;
  /** The meal's length over the eater's, as the counter shows it (percent). */
  readonly pct: number;
  /** The counter's label: "+" for "at least". */
  readonly suffix: '' | '+';
  readonly stamp: 'MEASURED' | 'ESTIMATED' | 'REPORTED';
  readonly name: string;
  readonly us: string;
  readonly metric: string;
  /** The ladder strip's short name. */
  readonly short: string;
}

export type StepId = 'grouper' | 'pike' | 'frogfish' | 'swallower';

export const STEPS: Readonly<Record<StepId, Step>> = {
  grouper: { eater: 'grouper', meal: 'blacktip', pct: 50, suffix: '+', stamp: 'ESTIMATED', name: 'THE GOLIATH GROUPER', us: 'grows to 8 ft · 800 lb', metric: '2.5 m · 363 kg', short: 'grouper' },
  pike: { eater: 'pike', meal: 'pikelet', pct: 66, suffix: '', stamp: 'MEASURED', name: 'THE NORTHERN PIKE', us: 'young pike eat young pike', metric: 'meal: ⅔ of its length on average (pond study)', short: 'pike' },
  frogfish: { eater: 'frogfish', meal: 'wrasse', pct: 100, suffix: '+', stamp: 'REPORTED', name: 'THE FROGFISH', us: 'prey bigger than itself', metric: 'one of the fastest strikes of any vertebrate', short: 'frogfish' },
  swallower: { eater: 'swallower', meal: 'mackerel', pct: 450, suffix: '', stamp: 'MEASURED', name: 'THE BLACK SWALLOWER', us: 'usually 6–8 in · 15–20 cm', metric: '2007, Grand Cayman: a 34 in (86 cm) meal', short: 'swallower' },
};

export const STEP_ORDER: readonly StepId[] = ['grouper', 'pike', 'frogfish', 'swallower'];

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

/** The game shape each fish is drawn as (a Pose needs one). */
export const shapeOf = (id: FishId): FishShape => DRAWINGS[id].shape;
