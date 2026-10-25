import { SECRETARY_ART } from './savannaBoss';
import { SAVANNA_CRITTERS } from './savannaCritters';
import { SAVANNA_PLACE } from './savannaPlace';
import { EGGEATER_ART } from './savannaSnake';
import { savannaView } from './savannaView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 4's art: the African egg-eater, the Savanna's boards, its
 * critters, and its own layer (savannaView.ts: tall grass over the snake,
 * guineafowl ground nests, spat-out shells). Its critters are painted in
 * savannaCritters*.ts and the boss in savannaBoss*.ts; each one's poses
 * (what each one means):
 *
 * - weaver-egg: 'egg' (a small pale blue-green egg, lightly speckled, lying in its hanging nest; about 12 × 9)
 * - guinea-egg: 'egg' (a big cream-buff guineafowl egg, finely pitted, thick-shelled; about 32 × 25)
 * - banded-mongoose: 'walk0', 'walk1', 'run0', 'run1', 'bite' (jaws open, lunging), 'stand' (up on its hind legs, looking about:
 *   frozen still, or lost the snake)
 * - weaver: 'perch' (clinging to its hanging nest, tail down), 'fly0', 'fly1' (wingbeats), 'dart' (hanging over the snake, wings
 *   raised, beak down: the tell before a nip)
 * - wildebeest: 'run0', 'run1' (the herd's front galloping +x: a row of bearded heads, horns and dust)
 * - secretary-bird: 'walk0', 'walk1' (long strides, crest feathers back), 'raise' (one long leg lifted high, wings half open),
 *   'stamp' (the foot slammed down, wings flared), 'down' (the foot pinned to the ground, head low: open to a strike),
 *   'startle' (wings spread, jumping back), 'fly0', 'fly1' (flapping off, beaten)
 */
export const SAVANNA_ART: ChapterArt = {
  ...(EGGEATER_ART ? { snake: EGGEATER_ART } : {}),
  ...(SAVANNA_PLACE ? { place: SAVANNA_PLACE } : {}),
  critters: { ...SAVANNA_CRITTERS, 'secretary-bird': SECRETARY_ART },
  poseOf: {
    'weaver-egg': () => 'egg',
    'guinea-egg': () => 'egg',
    'banded-mongoose': (c, t) => {
      if (c.mode === 'bite') return 'bite';
      if (c.mode === 'frozen') return 'stand';
      return c.mode === 'chase' || c.mode === 'flee' || c.mode === 'enter' ? `run${phase(t, 11)}` : `walk${phase(t, 5)}`;
    },
    weaver: (c, t) => (c.mode === 'perch' ? 'perch' : c.mode === 'dart' ? 'dart' : `fly${phase(t, 12)}`),
    wildebeest: (_c, t) => `run${phase(t, 7)}`,
    'secretary-bird': (c, t) => {
      if (c.mode === 'raise' || c.mode === 'stamp' || c.mode === 'down' || c.mode === 'startle') return c.mode;
      if (c.mode === 'retreat') return `fly${phase(t, 7)}`;
      return `walk${phase(t, 3)}`;
    },
  },
  view: savannaView,
};
