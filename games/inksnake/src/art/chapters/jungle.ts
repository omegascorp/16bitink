import { MONGOOSE_ART } from './jungleBoss';
import { JUNGLE_CRITTERS } from './jungleCritters';
import { JUNGLE_PLACE } from './junglePlace';
import { JUNGLE_RIVALS } from './jungleRivals';
import { COBRA_ART } from './jungleSnake';
import { jungleView } from './jungleView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 9's art: the king cobra, the Jungle's boards, its critters, its
 * rival snakes, and its own layer (jungleView.ts: the hood spread over the
 * head as it rears, rings round rivals).
 * Each critter's poses (what each one means):
 *
 * - bullfrog (Indian bullfrog): 'sit', 'hop' (legs kicked out behind)
 * - bandicoot (bandicoot rat): 'idle', 'run0', 'run1', 'sleep' (curled up, asleep from venom)
 * - skink: 'idle', 'run0', 'run1', 'sleep'
 * - honey-badger: 'walk0', 'walk1', 'run0', 'run1', 'bite' (jaws open, lunging), 'stand' (stopped, nose up: lost you)
 * - grey-mongoose (boss): 'run0', 'run1' (circling fast, tail streaming), 'feint' (darting in low and stretched,
 *   already turning back), 'wobble' (off balance after the feint: legs splayed, tail swung out), 'crouch' (low,
 *   fur and tail bristled, eyes on the snake: the real dart is coming), 'dart' (the lunge, jaws open), 'stare'
 *   (stopped dead at a spread hood, up on its haunches), 'startle' (struck: jumping back, tail bottle-brushed)
 * - ratsnake, banded-krait, big-krait, rock-python, as meals: 'coil' (the rival coiled up small, seen from
 *   above, for the moment it's swallowed; a python asleep from venom). On the board they're drawn as snakes
 *   (`rivals`).
 */

/** The rival kinds, each also a meal kind (see logic/chapters/junglePrey.ts). */
const RIVAL_KINDS = ['ratsnake', 'banded-krait', 'big-krait', 'rock-python'] as const;

const runOrIdle = (rate: number) => (c: { readonly mode: string }, t: number): string => {
  if (c.mode === 'sleep') return 'sleep';
  return c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger' ? `run${phase(t, c.mode === 'flee' ? rate * 1.6 : rate)}` : 'idle';
};

export const JUNGLE_ART: ChapterArt = {
  ...(COBRA_ART ? { snake: COBRA_ART } : {}),
  ...(JUNGLE_PLACE ? { place: JUNGLE_PLACE } : {}),
  critters: { ...JUNGLE_CRITTERS, ...(MONGOOSE_ART ? { 'grey-mongoose': MONGOOSE_ART } : {}) },
  rivals: JUNGLE_RIVALS,
  poseOf: {
    bullfrog: (c) => (c.mode === 'hop' ? 'hop' : 'sit'),
    bandicoot: runOrIdle(9),
    skink: runOrIdle(11),
    'honey-badger': (c, t) => {
      if (c.mode === 'bite') return 'bite';
      if (c.mode === 'frozen') return 'stand';
      return c.mode === 'chase' || c.mode === 'flee' || c.mode === 'enter' ? `run${phase(t, 10)}` : `walk${phase(t, 4)}`;
    },
    'grey-mongoose': (c, t) => {
      if (c.mode === 'feint' || c.mode === 'wobble' || c.mode === 'crouch' || c.mode === 'dart' || c.mode === 'stare') return c.mode;
      if (c.mode === 'struck') return 'startle';
      return `run${phase(t, 12)}`;
    },
    ...Object.fromEntries(RIVAL_KINDS.map((k) => [k, () => 'coil'])),
  },
  view: jungleView,
};
