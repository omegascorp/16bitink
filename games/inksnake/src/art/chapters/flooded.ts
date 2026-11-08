import { CAPY } from '../../logic/chapters/floodedPrey';
import { JAGUAR_ART } from './floodedBoss';
import { FLOODED_CRITTERS } from './floodedCritters';
import { FLOODED_PLACE } from './floodedPlace';
import { FLOODED_RIVALS } from './floodedRivals';
import { ANACONDA_ART } from './floodedSnake';
import { floodedView } from './floodedView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 10's art: the green anaconda, the Flooded Forest's boards, its
 * critters, the bigger anaconda (a rival, drawn as a snake) and its own
 * layer over the board (ripples, the submerged snake's eyes, dawn mist).
 * Each critter's poses (what each one means):
 *
 * - piranha (red-bellied piranha): 'swim0', 'swim1' (tail sweeping), 'dart' (bolting, body bent)
 * - egret (great egret): 'stand' (tall and still at the water's edge), 'fish' (neck shot out, bill stabbing the water),
 *   'walk0', 'walk1' (wading), 'fly0', 'fly1' (wings up and down, legs trailing)
 * - capybara: 'graze' (head down in the grass), 'walk0', 'walk1', 'drink' (at the water's edge, nose to the water),
 *   'run0', 'run1' (bolting)
 * - young-caiman: 'idle', 'swim0', 'swim1' (tail sweeping)
 * - river-turtle: 'idle', 'paddle0', 'paddle1'
 * - black-caiman: 'eyes' (only its eyes and nostrils above the water), 'bubbles' (bubbles rising round its snout: the tell),
 *   'lunge' (jaws wide, half out of the water), 'under' (a dark shape gliding under the surface)
 * - jaguar: 'walk0', 'walk1' (prowling), 'crouch' (low at the bank, tail twitching), 'leap' (stretched out in the air),
 *   'swim0', 'swim1' (head up, paddling), 'shake' (shaking off the water), 'drink' (head down, lapping: the open moment),
 *   'look' (head up, ears pricked), 'startle' (springing back, ears flat)
 */
export const FLOODED_ART: ChapterArt = {
  ...(ANACONDA_ART ? { snake: ANACONDA_ART } : {}),
  ...(FLOODED_PLACE ? { place: FLOODED_PLACE } : {}),
  critters: { ...FLOODED_CRITTERS, ...(JAGUAR_ART ? { jaguar: JAGUAR_ART } : {}) },
  rivals: FLOODED_RIVALS,
  poseOf: {
    piranha: (c, t) => (c.mode === 'flee' ? 'dart' : `swim${phase(t, 4)}`),
    egret: (c, t) => {
      if (c.alt > 0.05) return `fly${phase(t, 6)}`;
      if ((c.data?.fish ?? 0) > 0) return 'fish';
      return c.mode === 'walk' ? `walk${phase(t, 3)}` : 'stand';
    },
    capybara: (c, t) => {
      if (c.data?.phase === CAPY.drink) return 'drink';
      if (c.mode === 'flee') return `run${phase(t, 9)}`;
      return c.mode === 'walk' ? `walk${phase(t, 3)}` : 'graze';
    },
    'young-caiman': (c, t) => (c.mode === 'walk' || c.mode === 'flee' ? `swim${phase(t, c.mode === 'flee' ? 6 : 3)}` : 'idle'),
    'river-turtle': (c, t) => (c.mode === 'walk' || c.mode === 'flee' ? `paddle${phase(t, 4)}` : 'idle'),
    'black-caiman': (c) => (c.mode === 'tell' ? 'bubbles' : c.mode === 'lunge' ? 'lunge' : c.mode === 'sink' || c.mode === 'move' ? 'under' : 'eyes'),
    jaguar: (c, t) => {
      switch (c.mode) {
        case 'crouch': case 'leap': case 'shake': case 'drink': case 'look': case 'startle':
          return c.mode;
        case 'swim':
          return `swim${phase(t, 3)}`;
        default:
          return `walk${phase(t, c.mode === 'retreat' || c.mode === 'enter' ? 8 : 4)}`;
      }
    },
  },
  view: floodedView,
};
