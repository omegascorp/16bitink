import { BARRENS_CRITTERS } from './barrensCritters';
import { FOX_ART } from './barrensFoxArt';
import { BARRENS_PLACE } from './barrensPlace';
import { HOGNOSE_ART } from './barrensSnake';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 2's art: the eastern hognose, the Pine Barrens' boards, and its
 * critters. Each critter's poses (what each one means):
 *
 * - toad: 'sit', 'hop' (legs out behind), 'puff' (blown up round, sitting tight)
 * - lizard (fence lizard): 'idle', 'run0', 'run1'
 * - raccoon: 'walk0', 'walk1', 'grab' (forepaws reaching for the tail), 'run0', 'run1' (running off)
 * - opossum: 'walk0', 'walk1', 'run0', 'run1', 'bite' (jaws open)
 * - wildfire: 'flame0', 'flame1' (a front of flames across its path, travelling +x)
 * - fox: 'walk0', 'walk1', 'crouch' (low, ears pricked), 'leap' (high arc, forepaws tucked, seen from above),
 *   'sniff' (nose down, tail up), 'startle' (jumping back, tail bushed)
 */
export const BARRENS_ART: ChapterArt = {
  ...(HOGNOSE_ART ? { snake: HOGNOSE_ART } : {}),
  ...(BARRENS_PLACE ? { place: BARRENS_PLACE } : {}),
  critters: { ...BARRENS_CRITTERS, ...(FOX_ART ? { fox: FOX_ART } : {}) },
  poseOf: {
    toad: (c) => ((c.data?.puff ?? 0) > 0 ? 'puff' : c.mode === 'hop' ? 'hop' : 'sit'),
    lizard: (c, t) => (c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger' ? `run${phase(t, c.mode === 'flee' ? 16 : 9)}` : 'idle'),
    raccoon: (c, t) => (c.mode === 'peck' ? 'grab' : c.mode === 'flee' ? `run${phase(t, 10)}` : `walk${phase(t, 5)}`),
    opossum: (c, t) => (c.mode === 'bite' ? 'bite' : c.mode === 'chase' || c.mode === 'flee' ? `run${phase(t, 10)}` : `walk${phase(t, 4)}`),
    wildfire: (_c, t) => `flame${phase(t, 6)}`,
    fox: (c, t) => {
      if (c.mode === 'crouch' || c.mode === 'leap' || c.mode === 'sniff' || c.mode === 'startle') return c.mode;
      return `walk${phase(t, c.mode === 'retreat' ? 9 : 4)}`;
    },
  },
};
