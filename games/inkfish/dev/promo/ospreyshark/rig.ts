import { type Pt } from '../../../src/art/pen';
import { type OspreyGrip, type OspreyPose, worldToOsprey } from './art/osprey';
import { backAt, bellyAt, FISH_K, fishInShark, type SharkPlace, sharkToWorld } from './art/shark';

/**
 * Where the three animals sit relative to each other: the "rig", in px of the
 * hook shot (frame 1 shows it at zoom 1). The osprey flies right with its
 * wings raised; under it, both feet clamped along its back, the small grey
 * shark is carried head-forward (as ospreys carry fish); the silver fish
 * hangs from the shark's jaws, held by its tail.
 */

export const OSPREY_AT: Pt = { x: 560, y: 630 };
export const SHARK_SNOUT: Pt = { x: 808, y: 758 };
export const SHARK_LEN = 470;
export const SHARK_ANGLE = 0.03;
/** The middle of the group, for the wide shot (where the tiny bird is). */
export const RIG_MID: Pt = { x: 560, y: 680 };

/** Where each foot clamps on the shark's back (shark x, own frame), front then rear. */
const FEET_X: readonly [number, number] = [-250, -640];

export const sharkPlace = (jaw: number, tail: number, worried: number): SharkPlace => ({
  snout: SHARK_SNOUT, len: SHARK_LEN, angle: SHARK_ANGLE, jaw, tail, worried,
});

/** The feet and toe tips (osprey units) for the osprey and shark as placed. */
export function gripFor(osprey: OspreyPose, shark: SharkPlace): OspreyGrip {
  const foot = (x: number): { foot: Pt; toes: Pt[] } => {
    const top = backAt(x);
    const on = (dx: number, v: number): Pt => worldToOsprey(osprey, sharkToWorld(shark, { x: x + dx, y: top + (bellyAt(x + dx) - top) * v }));
    return {
      foot: worldToOsprey(osprey, sharkToWorld(shark, { x, y: top - 14 })),
      // Two toes forward and down the near flank, one back, one round the far side (short: hidden).
      toes: [on(70, 0.42), on(-62, 0.38), on(-20, 0.55), on(30, 0.18)],
    };
  };
  return { feet: [foot(FEET_X[0]), foot(FEET_X[1])] };
}

/** Points on the animals (rig px) the camera and the marks aim at. */
export const SPOTS = (() => {
  const s = sharkPlace(0.8, 0, 0);
  const fish = fishInShark(s, { worry: 0, wiggle: 0, look: 0 }, 0);
  const inFish = (p: Pt): Pt => {
    const [c, n] = [Math.cos(fish.a), Math.sin(fish.a)];
    return sharkToWorld(s, { x: fish.x + (p.x * c - p.y * n) * FISH_K, y: fish.y + (p.x * n + p.y * c) * FISH_K });
  };
  return {
    tail: sharkToWorld(s, { x: -930, y: -40 }),
    jaws: sharkToWorld(s, { x: -100, y: 40 }),
    fishMid: inFish({ x: 0, y: 0 }),
    fishFace: inFish({ x: 70, y: -2 }),
    fishBrow: inFish({ x: 60, y: -40 }),
  } as const;
})();
