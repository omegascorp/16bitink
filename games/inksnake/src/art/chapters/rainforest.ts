import type { SpriteArt } from '../types';
import { EAGLE_ART } from './rainforestBoss';
import { RAINFOREST_CRITTERS } from './rainforestCritters';
import { RAINFOREST_PLACE } from './rainforestPlace';
import { FLYING_ART } from './rainforestSnake';
import { RainforestView } from './rainforestView';
import { phase, type ChapterArt, type PosePicker } from './types';

/**
 * Chapter 5's art: the paradise flying snake, the Rainforest's boards, its
 * critters, and its own layer (rainforestView.ts: the canopy's dappled
 * light, a glide's landing marker).
 * Each critter's poses (what each one means):
 *
 * - gecko: 'idle', 'run0', 'run1', 'flat' (pressed flat to the bark while a glide passes over)
 * - treefrog: 'sit', 'hop' (legs out behind), 'flat'
 * - tokay (tokay gecko, big, blue-grey with orange spots): 'idle', 'run0', 'run1', 'sleep' (bitten, asleep), 'flat'
 * - bat (a small bat, seen from above): 'fly0', 'fly1' (wings up, down), 'swoop' (dipping low after insects)
 * - monitor (water monitor, on the forest floor): 'walk0', 'walk1', 'run0', 'run1', 'bite' (jaws open), 'look' (lost you: head up, tongue out)
 * - hornbill: 'stand', 'hop', 'peck' (casque and bill down at the tail), 'fly0', 'fly1'
 * - serpent-eagle (the Crested Serpent Eagle, crest raised): 'perch' (sitting up in a tall crown), 'soar', 'flap0', 'flap1',
 *   'stoop' (wings folded, talons forward: the swoop), 'land' (on a crown after a miss, wings half open: the open moment),
 *   'startle' (struck: wings flung up, crest up)
 */
const running = (mode: string): boolean => mode === 'walk' || mode === 'flee' || mode === 'stagger';

/** How each critter picks its pose from what it's doing (the logic's modes, see logic/chapters/rainforest*.ts). */
const POSE_OF: Readonly<Record<string, PosePicker>> = {
  gecko: (c, t) => (c.mode === 'hidden' ? 'flat' : running(c.mode) ? `run${phase(t, c.mode === 'flee' ? 16 : 9)}` : 'idle'),
  treefrog: (c) => (c.mode === 'hidden' ? 'flat' : c.mode === 'hop' ? 'hop' : 'sit'),
  tokay: (c, t) => (c.mode === 'sleep' ? 'sleep' : c.mode === 'hidden' ? 'flat' : running(c.mode) ? `run${phase(t, c.mode === 'flee' ? 12 : 7)}` : 'idle'),
  bat: (c, t) => (c.alt < 0.2 ? 'swoop' : `fly${phase(t, 12)}`),
  monitor: (c, t) => (c.mode === 'bite' ? 'bite' : c.mode === 'lost' ? 'look' : c.mode === 'chase' ? `run${phase(t, 10)}` : `walk${phase(t, 4)}`),
  hornbill: (c, t) => {
    if (c.mode === 'peck') return 'peck';
    if (c.mode === 'fly' || c.mode === 'flee') return `fly${phase(t, 7)}`;
    return c.mode === 'hop' && phase(t, 4) ? 'hop' : 'stand';
  },
  'serpent-eagle': (c, t) => {
    if (c.mode === 'perch') return 'perch';
    if (c.mode === 'open') return 'land';
    if (c.mode === 'swoop') return 'stoop';
    if (c.mode === 'startle') return 'startle';
    if (c.mode === 'lift' || c.mode === 'lock' || c.mode === 'settle') return `flap${phase(t, 6)}`;
    return Math.sin(t / 700) > 0.6 ? `flap${phase(t, 5)}` : 'soar';
  },
};

const CRITTERS: Readonly<Record<string, SpriteArt>> = { ...RAINFOREST_CRITTERS, ...(EAGLE_ART ? { 'serpent-eagle': EAGLE_ART } : {}) };

export const RAINFOREST_ART: ChapterArt = {
  ...(FLYING_ART ? { snake: FLYING_ART } : {}),
  ...(RAINFOREST_PLACE ? { place: RAINFOREST_PLACE } : {}),
  critters: CRITTERS,
  poseOf: POSE_OF,
  view: (scene, world) => new RainforestView(scene, world, { critters: CRITTERS, poseOf: POSE_OF }),
};
