import type { SpriteArt } from '../types';
import { BOAR_ART } from './mountainsBoss';
import { MOUNTAINS_CRITTERS } from './mountainsCritters';
import { MOUNTAINS_PLACE } from './mountainsPlace';
import { SPIDERTAIL_ART } from './mountainsSnake';
import { mountainsView } from './mountainsView';
import { phase, type ChapterArt, type PosePicker } from './types';

/**
 * Chapter 7's art: the spider-tailed horned viper, the Mountains' boards,
 * and its critters, all seen from above facing +x. Each critter's poses
 * (what each one means):
 *
 * - lark (crested lark), warbler, desert-finch, shrike (Isabelline shrike): 'idle' (standing,
 *   head up), 'hop' (mid-hop, wings tight), 'peck' (head down at the ground, or at the spider),
 *   'fly0', 'fly1' (wings up, wings down: two beats, seen from above), 'sleep' (fluffed up,
 *   eyes shut: the venom's work; only the shrike needs it, the rest go down whole)
 * - agama (rock agama): 'idle', 'bob' (head raised, front legs straight: the push-up), 'run0', 'run1'
 * - snake-eagle (short-toed snake eagle): 'soar' (wings flat out), 'hover' (kiting into the
 *   wind, wings arched, tail fanned: the lock), 'flap0', 'flap1', 'stoop' (wings folded, feet
 *   forward), 'ground' (standing, wings half open, after a miss)
 * - rockfall: 'rocks0', 'rocks1' (a tumble of rocks and dust, two turns of the tumble, travelling +x)
 * - boar (the Wild Boar): 'walk0', 'walk1', 'root' (snout down in the soil, turning it over),
 *   'paw' (the tell: head low, a forefoot scraping, bristles up), 'charge0', 'charge1' (flat out,
 *   head down), 'dazed' (stopped short, head swaying; the view draws stars round it),
 *   'startle' (jumping back from a strike, squealing)
 */
/** A bird's pose: in the air, hopping, pecking (a lured one pecks in quick dabs at the spider), asleep. */
const birdPose: PosePicker = (c, t) => {
  if (c.mode === 'sleep') return 'sleep';
  if (c.mode === 'stagger') return 'hop';
  if (c.alt > 0.02 || c.data?.fly) return `fly${phase(t, 12)}`;
  if (c.mode === 'hop') return 'hop';
  if ((c.data?.peck ?? 0) > 0) return (c.data?.lure ?? 0) > 0 && phase(t, 6) === 1 ? 'idle' : 'peck';
  return 'idle';
};

const CRITTERS: Readonly<Record<string, SpriteArt>> = { ...MOUNTAINS_CRITTERS, ...(BOAR_ART ? { boar: BOAR_ART } : {}) };

export const MOUNTAINS_ART: ChapterArt = {
  ...(SPIDERTAIL_ART ? { snake: SPIDERTAIL_ART } : {}),
  ...(MOUNTAINS_PLACE ? { place: MOUNTAINS_PLACE } : {}),
  critters: CRITTERS,
  poseOf: {
    lark: birdPose,
    warbler: birdPose,
    'desert-finch': birdPose,
    shrike: birdPose,
    agama: (c, t) => {
      if (c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger') return `run${phase(t, c.mode === 'flee' ? 16 : 9)}`;
      return Math.floor(t / 700) % 3 === 0 ? 'bob' : 'idle';
    },
    'snake-eagle': (c, t) => {
      if (c.mode === 'dive') return 'stoop';
      if (c.mode === 'ground') return 'ground';
      if (c.mode === 'lock') return 'hover';
      if (c.mode === 'rise') return `flap${phase(t, 7)}`;
      return Math.sin(t / 900) > 0.85 ? `flap${phase(t, 6)}` : 'soar';
    },
    rockfall: (_c, t) => `rocks${phase(t, 8)}`,
    boar: (c, t) => {
      if (c.mode === 'root' && Math.floor(t / 600) % 2 === 0) return 'root';
      if (c.mode === 'paw' || c.mode === 'dazed' || c.mode === 'startle') return c.mode;
      if (c.mode === 'charge') return `charge${phase(t, 10)}`;
      return `walk${phase(t, c.mode === 'retreat' || c.mode === 'skid' ? 8 : 4)}`;
    },
  },
  view: (scene, world) => mountainsView(scene, world, CRITTERS),
};
