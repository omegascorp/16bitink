import { SHARK_ART } from './reefBoss';
import { REEF_CRITTERS } from './reefCritters';
import { REEF_PLACE } from './reefPlace';
import { KRAIT_ART } from './reefSnake';
import { reefView } from './reefView';
import { phase, type ChapterArt } from './types';

/**
 * Chapter 6's art: the banded sea krait, the reef's boards, and its
 * critters. Each critter's poses (what each one means):
 *
 * - goby: 'idle' (hovering, fins spread), 'dart' (body bent in a quick burst)
 * - conger (young conger eel) and moray (moray eel): 'out0', 'out1' (head and
 *   neck poking out of a hole, swaying left and right: the frame's centre is
 *   just past the hole's mouth, the rest of the eel hidden in it, -x),
 *   'swim0', 'swim1' (the whole eel in the open, an S one way and the other),
 *   'sleep' (lying slack on the sand, after the krait's venom)
 * - sea-eagle (white-bellied sea eagle): 'soar' (wings spread, from above), 'flap0', 'flap1',
 *   'stoop' (wings half closed, talons forward), 'ground' (standing on the sand, wings mantled)
 * - jelly (box jelly): 'pulse0' (bell open, tentacles trailing -x), 'pulse1' (bell squeezed)
 * - shark (tiger shark, seen from above): 'swim0', 'swim1' (tail beat one way and the other),
 *   'tell' (turning to face the snake, body bent), 'charge' (straight, tail driving),
 *   'turn' (a slow heavy turn, body curved), 'struck' (thrashing, jaws open)
 *
 * Each is painted in reefCritters*.ts (the shark in reefBoss*.ts).
 */

/** An eel's pose: out of its hole swaying, swimming in the open, or asleep. */
const eelPose = (c: { readonly mode: string; readonly data?: Readonly<Record<string, number>> }, t: number): string => {
  if (c.mode === 'sleep') return 'sleep';
  if (c.mode === 'idle' || c.mode === 'hidden') return Math.sin(c.data?.sway ?? 0) > 0 ? 'out0' : 'out1';
  return `swim${phase(t, c.mode === 'stagger' ? 3 : 5)}`;
};

export const REEF_ART: ChapterArt = {
  ...(KRAIT_ART ? { snake: KRAIT_ART } : {}),
  ...(REEF_PLACE ? { place: REEF_PLACE } : {}),
  critters: { ...REEF_CRITTERS, shark: SHARK_ART },
  poseOf: {
    goby: (c) => (c.mode === 'walk' || c.mode === 'flee' || c.mode === 'stagger' ? 'dart' : 'idle'),
    conger: eelPose,
    moray: eelPose,
    'sea-eagle': (c, t) => {
      if (c.mode === 'dive') return 'stoop';
      if (c.mode === 'ground') return 'ground';
      if (c.mode === 'rise') return `flap${phase(t, 7)}`;
      return Math.sin(t / 900) > 0.85 ? `flap${phase(t, 6)}` : 'soar';
    },
    jelly: (_c, t) => `pulse${phase(t, 1.6)}`,
    shark: (c, t) => {
      if (c.mode === 'tell' || c.mode === 'charge' || c.mode === 'turn' || c.mode === 'struck') return c.mode;
      return `swim${phase(t, c.mode === 'retreat' ? 4 : 2)}`;
    },
  },
  view: reefView,
};
