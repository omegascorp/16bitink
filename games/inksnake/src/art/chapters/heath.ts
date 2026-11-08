import { BADGER_ART } from './heathBoss';
import { HEATH_CRITTERS } from './heathCritters';
import { HEATH_PLACE } from './heathPlace';
import { ADDER_ART } from './heathSnake';
import { heathView } from './heathView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 8's art: the European adder, the Heath's boards, its critters,
 * and its own layer (heathView.ts: cloud shadows drifting over the sun
 * patches, frost on a cold snake, a trembling sett). Each critter's poses
 * (what each one means; the frog is the farm's):
 *
 * - woodmouse (wood mouse): 'idle', 'run0', 'run1', 'sleep' (curled up asleep)
 * - common-lizard (common or viviparous lizard): 'idle' (flat to the ground, basking), 'run0', 'run1', 'sleep'
 * - vole (field vole): 'idle', 'run0', 'run1' (also staggering off after a bite), 'sleep' (curled up asleep)
 * - buzzard (common buzzard): 'soar' (wings spread, fingered tips), 'flap0', 'flap1', 'stoop' (wings half folded, talons forward),
 *   'ground' (standing on the heath after a miss)
 * - hedgehog: 'walk0', 'walk1', 'run0', 'run1', 'bite' (snout thrust forward)
 * - heron (grey heron): 'stand' (neck tucked), 'wade0', 'wade1' (a slow step), 'raise' (neck drawn back in an S, bill aimed),
 *   'stab' (neck shot out, bill down), 'fly0', 'fly1' (neck folded, legs trailing)
 * - badger: 'emerge' (head and shoulders out of the sett, soil about), 'lunge' (jaws open, forepaws out), 'sniff0', 'sniff1'
 *   (nose down, snuffling), 'startle' (flinching back after a strike), 'dive' (rump and hind legs going down the hole)
 */
export const HEATH_ART: ChapterArt = {
  ...(ADDER_ART ? { snake: ADDER_ART } : {}),
  ...(HEATH_PLACE ? { place: HEATH_PLACE } : {}),
  critters: { ...HEATH_CRITTERS, ...(BADGER_ART ? { badger: BADGER_ART } : {}) },
  poseOf: {
    buzzard: (c, t) => {
      if (c.mode === 'dive') return 'stoop';
      if (c.mode === 'ground') return 'ground';
      if (c.mode === 'rise') return `flap${phase(t, 7)}`;
      // Soaring on broad wings, a few wingbeats now and then.
      return Math.sin(t / 1100) > 0.88 ? `flap${phase(t, 5)}` : 'soar';
    },
    hedgehog: (c, t) => (c.mode === 'bite' ? 'bite' : c.mode === 'chase' || c.mode === 'flee' ? `run${phase(t, 11)}` : `walk${phase(t, 5)}`),
    heron: (c, t) => {
      if (c.mode === 'fly' || c.mode === 'flee') return `fly${phase(t, 3)}`;
      if (c.mode === 'raise' || c.mode === 'stab') return c.mode;
      if (c.mode === 'rest') return 'stab';
      return c.mode === 'wade' ? `wade${phase(t, 1.6)}` : 'stand';
    },
    badger: (c, t) => {
      if (c.mode === 'sniff') return `sniff${phase(t, 3)}`;
      if (c.mode === 'emerge' || c.mode === 'lunge' || c.mode === 'startle' || c.mode === 'dive') return c.mode;
      return 'emerge';
    },
  },
  view: heathView,
};
