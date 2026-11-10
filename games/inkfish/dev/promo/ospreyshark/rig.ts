import { type Pt } from '../../../src/art/pen';
import { type OspreyFoot, type OspreyGrip, type OspreyPose, type OspreyToe, worldToOsprey } from './art/osprey';
import { backAt, fishInShark, fishToShark, type SharkPlace, sharkToWorld } from './art/shark';

/**
 * Where the three animals sit relative to each other: the "rig", in px of the
 * hook shot (frame 1 shows it at zoom 1). The osprey flies right with its
 * wings raised; under it, held close to the belly by both feet, one in front
 * of the other along its back, the small grey shark is carried head-forward
 * (as ospreys carry fish); the silver fish hangs from the shark's jaws, its
 * head bitten.
 */

export const OSPREY_AT: Pt = { x: 560, y: 630 };
export const SHARK_SNOUT: Pt = { x: 752, y: 758 };
export const SHARK_LEN = 470;
export const SHARK_ANGLE = 0.03;
/** The middle of the group, for the wide shot (where the tiny bird is). */
export const RIG_MID: Pt = { x: 560, y: 680 };

/** Where each foot grips the shark's back (shark x, own frame), front then rear: either side of the dorsal fin. */
const FEET_X: readonly [number, number] = [-236, -506];

/** `lift`: how far the shark rises with the bird's wingbeat (px), so the feet keep their grip. */
export const sharkPlace = (jaw: number, tail: number, worried: number, lift = 0): SharkPlace => ({
  snout: { x: SHARK_SNOUT.x, y: SHARK_SNOUT.y + lift }, len: SHARK_LEN, angle: SHARK_ANGLE, jaw, tail, worried,
});

/**
 * The toes in the shark's frame, from the ankle, as (along the back, down
 * from the back line at that point): on the near flank one forward and one
 * back (the hind toe, shorter and thicker), each curling down round the body;
 * on the far side the other two, which show only as knuckles over the back.
 */
interface ToeDef { readonly pts: readonly Pt[]; readonly far: boolean; readonly w: number }
const TOES: readonly ToeDef[] = [
  { pts: [{ x: 2, y: -10 }, { x: 20, y: -10 }, { x: 38, y: -3 }, { x: 50, y: 12 }], far: true, w: 9 },
  { pts: [{ x: -2, y: -10 }, { x: -18, y: -9 }, { x: -34, y: -2 }, { x: -44, y: 12 }], far: true, w: 9.5 },
  { pts: [{ x: 5, y: -6 }, { x: 24, y: 1 }, { x: 44, y: 13 }, { x: 60, y: 31 }, { x: 67, y: 52 }], far: false, w: 10 },
  { pts: [{ x: -5, y: -6 }, { x: -24, y: 2 }, { x: -42, y: 15 }, { x: -54, y: 31 }, { x: -58, y: 46 }], far: false, w: 11 },
];
/** The toes' reach (their lines above are for a foot this much smaller). */
const TOE_K = 1.12;
/** The ankle: on top of the back, a touch above it. */
const ANKLE_UP = 12;

/** The feet (osprey units) for the osprey and shark as placed. */
export function gripFor(osprey: OspreyPose, shark: SharkPlace): OspreyGrip {
  const toOsprey = (p: Pt): Pt => worldToOsprey(osprey, sharkToWorld(shark, p));
  const onBack = (x: number, down: number): Pt => toOsprey({ x, y: backAt(x) + down });
  const foot = (x0: number): OspreyFoot => {
    const toes: OspreyToe[] = TOES.map((t) => ({ path: t.pts.map((p) => onBack(x0 + p.x * TOE_K, p.y * TOE_K)), far: t.far, w: t.w }));
    const back = Array.from({ length: 13 }, (_, i) => onBack(x0 - 120 + i * 20, 0));
    return { ankle: onBack(x0, -ANKLE_UP), toes, back };
  };
  return { feet: [foot(FEET_X[0]), foot(FEET_X[1])] };
}

/** Points on the animals (rig px) the camera and the marks aim at. */
export const SPOTS = (() => {
  const s = sharkPlace(0.8, 0, 0);
  const fish = fishInShark(s, { worry: 0, wiggle: 0, look: 0 }, 0);
  const inFish = (p: Pt): Pt => sharkToWorld(s, fishToShark(fish, p));
  return {
    tail: sharkToWorld(s, { x: -930, y: -40 }),
    jaws: sharkToWorld(s, { x: -100, y: 40 }),
    fishMid: inFish({ x: 0, y: 0 }),
    fishFace: inFish({ x: 70, y: -2 }),
    fishBrow: inFish({ x: 60, y: -40 }),
  } as const;
})();
