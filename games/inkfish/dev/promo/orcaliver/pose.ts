import type { Pt } from '../../../src/art/pen';
import { spline } from '../kraken/whale';

/**
 * Where an animal is on screen, as the food-chain video's painted orca and
 * great white take it (../foodchain/art): both are drawn 1000 local px snout
 * to tail, snout at local x 0 facing +x, the centre at local x -500; `flip`
 * mirrors the local y (an orca swimming left the right way up, or a shark on
 * its back).
 */
export interface BodyPose {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly angle: number;
  readonly flip: boolean;
}

const LEN = 1000;
const HALF = 500;

/** A point of the animal's local frame on screen. */
export function onBody(p: BodyPose, local: Pt): Pt {
  const s = p.length / LEN;
  const lx = (local.x + HALF) * s;
  const ly = (p.flip ? -local.y : local.y) * s;
  const c = Math.cos(p.angle);
  const n = Math.sin(p.angle);
  return { x: p.x + lx * c - ly * n, y: p.y + lx * n + ly * c };
}

/** The pose that puts the local point `local` at screen point `at`. */
export function poseWith(at: Pt, local: Pt, length: number, angle: number, flip: boolean): BodyPose {
  const probe = onBody({ x: 0, y: 0, length, angle, flip }, local);
  return { x: at.x - probe.x, y: at.y - probe.y, length, angle, flip };
}

/** The same pose moved `d` px along its heading. */
export const along = (p: BodyPose, d: number): BodyPose => ({ ...p, x: p.x + Math.cos(p.angle) * d, y: p.y + Math.sin(p.angle) * d });

/** The orca's eye and snout, and the corner of its mouth, in its local px. */
export const ORCA_EYE: Pt = { x: -122, y: 14 };
export const ORCA_SNOUT: Pt = { x: 0, y: 22 };
export const ORCA_THROAT: Pt = { x: -150, y: 70 };
/** The orca's blowhole, on top of the head behind the melon. */
export const ORCA_BLOWHOLE: Pt = { x: -205, y: -96 };

/** The great white's snout, eye and the middle of its belly, in its local px. */
export const SHARK_SNOUT: Pt = { x: 0, y: 8 };
export const SHARK_EYE: Pt = { x: -92, y: -6 };
export const SHARK_BELLY: Pt = { x: -380, y: 100 };
export const SHARK_HEAD: Pt = { x: -140, y: 0 };

/**
 * The shark's liver, in its local px: two long lobes low in the body from
 * behind the gills back towards the pelvic fins, the near lobe and the far
 * one a little higher and shorter. Drawn only as a glowing outline.
 */
export const LIVER_NEAR: readonly Pt[] = spline([
  { x: -238, y: 44 }, { x: -262, y: 14 }, { x: -320, y: 0 }, { x: -420, y: 6 }, { x: -520, y: 24 }, { x: -598, y: 52 },
  { x: -590, y: 66 }, { x: -510, y: 72 }, { x: -410, y: 80 }, { x: -310, y: 84 }, { x: -256, y: 72 }, { x: -238, y: 44 },
], 6);
export const LIVER_FAR: readonly Pt[] = spline([
  { x: -250, y: 30 }, { x: -280, y: 2 }, { x: -350, y: -14 }, { x: -440, y: -8 }, { x: -520, y: 10 }, { x: -548, y: 30 },
  { x: -520, y: 44 }, { x: -440, y: 50 }, { x: -340, y: 54 }, { x: -270, y: 50 }, { x: -250, y: 30 },
], 6);
/** The liver's middle, for its glow. */
export const LIVER_MID: Pt = { x: -410, y: 40 };
