import { HAWK } from '../critters/hawk';
import { ROADRUNNER_ART } from './dunesBoss';
import { DUNES_CRITTERS } from './dunesCritters';
import { DUNES_PLACE } from './dunesPlace';
import { KINGSNAKE_ART } from './dunesRival';
import { SIDEWINDER_ART } from './dunesSnake';
import { dunesView } from './dunesView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 3's art: the sidewinder, the Dunes' boards, and its critters,
 * all seen from above. Each critter's poses (what each one means):
 *
 * - kangaroo-rat: 'idle' (sitting up on its big hind feet, long tufted tail out behind),
 *   'hop' (mid-bound: hind legs stretched back, forepaws tucked, tail streaming),
 *   'kick' (back turned, hind feet flinging sand behind it, travelling +x so the sand flies -x),
 *   'sleep' (curled up, eyes shut: the venom's work)
 * - pocket-mouse: 'idle', 'run0', 'run1'
 * - side-lizard (side-blotched lizard): 'idle', 'run0', 'run1' (legs mid-stride, tail swinging)
 * - coyote: 'walk0', 'walk1', 'run0', 'run1', 'bite' (jaws open, lunging)
 * - redtail: the farm's red-tailed hawk (painted): 'soar', 'stoop', 'ground', 'flap0', 'flap1'
 * - dust-devil: 'spin0', 'spin1' (a whirl of sand and grit, two turns of its spin, travelling +x)
 * - roadrunner: 'walk0', 'walk1' (trotting, crest down), 'aim' (the tell: head low and forward,
 *   tail cocked straight up), 'dash0', 'dash1' (running flat out, neck stretched, legs a blur),
 *   'skid' (feet braced, wings out, tail flung forward: off balance),
 *   'startle' (crest up, wings flared, hopping back)
 *
 * The kingsnake is drawn as a snake (its own SnakeArt under `rivals`:
 * black with cream bands, dunesRival.ts).
 */
export const DUNES_ART: ChapterArt = {
  ...(SIDEWINDER_ART ? { snake: SIDEWINDER_ART } : {}),
  ...(DUNES_PLACE ? { place: DUNES_PLACE } : {}),
  critters: { redtail: HAWK, ...DUNES_CRITTERS, ...(ROADRUNNER_ART ? { roadrunner: ROADRUNNER_ART } : {}) },
  rivals: { kingsnake: KINGSNAKE_ART },
  poseOf: {
    'kangaroo-rat': (c) => {
      if (c.mode === 'sleep') return 'sleep';
      if ((c.data?.kick ?? 0) > 0) return 'kick';
      return c.mode === 'hop' || c.mode === 'stagger' ? 'hop' : 'idle';
    },
    'pocket-mouse': (c, t) => (c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger' ? `run${phase(t, c.mode === 'flee' ? 14 : 8)}` : 'idle'),
    'side-lizard': (c, t) => (c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger' ? `run${phase(t, c.mode === 'flee' ? 16 : 9)}` : 'idle'),
    coyote: (c, t) => (c.mode === 'bite' ? 'bite' : c.mode === 'chase' || c.mode === 'flee' ? `run${phase(t, 10)}` : `walk${phase(t, 4)}`),
    redtail: (c, t) => {
      if (c.mode === 'dive') return 'stoop';
      if (c.mode === 'ground') return 'ground';
      if (c.mode === 'rise') return `flap${phase(t, 7)}`;
      return Math.sin(t / 900) > 0.85 ? `flap${phase(t, 6)}` : 'soar';
    },
    'dust-devil': (_c, t) => `spin${phase(t, 8)}`,
    roadrunner: (c, t) => {
      if (c.mode === 'aim' || c.mode === 'skid' || c.mode === 'startle') return c.mode;
      if (c.mode === 'dash') return `dash${phase(t, 14)}`;
      return `walk${phase(t, c.mode === 'retreat' || c.mode === 'enter' ? 9 : 5)}`;
    },
  },
  view: dunesView,
};
