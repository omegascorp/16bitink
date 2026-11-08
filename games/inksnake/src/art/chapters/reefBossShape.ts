import { pt } from '../kit';
import type { Pt } from '../pen';
import { type Body, bodyOf, widthOf } from './reefCrittersKit';

/**
 * The Tiger Shark's shape, seen from above facing +x: its spine for each
 * pose and the body built along it. The spine runs from the snout (s = 0)
 * to the tip of the tail's long upper lobe (s = LEN); the shark's middle
 * (the point the rules move, just ahead of the first dorsal fin) sits at
 * the frame's centre, so the snout is MID px ahead of it.
 */
export type SharkPose = 'swim0' | 'swim1' | 'tell' | 'charge' | 'turn' | 'struck';
export const SHARK_POSES: readonly SharkPose[] = ['swim0', 'swim1', 'tell', 'charge', 'turn', 'struck'];

export const LEN = 150;
/** Where the body proper ends and the tail fin begins. */
export const PEDUNCLE = 104;
/** The middle: this far back from the snout. */
export const MID = 46;

/** The body's width from above: the broad blunt head, fullest at the pectorals, the slim root of the tail. */
export const WIDTH = widthOf([[0, 8], [2.5, 16], [7, 22.5], [15, 27], [28, 30.5], [44, 29.5], [60, 24.5], [75, 17.5], [90, 10.5], [PEDUNCLE, 6.2], [112, 4.6], [LEN, 0.6]]);

/** How the body bends in each pose: the angle its spine is turned at u = s / LEN (0 at the snout). */
const BEND: Readonly<Record<SharkPose, (u: number) => number>> = {
  swim0: (u) => 0.62 * u * u - 0.24 * u + 0.03,
  swim1: (u) => -(0.62 * u * u - 0.24 * u + 0.03),
  charge: (u) => 0.2 * u * u * u,
  tell: (u) => 1.05 * (u - 0.3) + 0.3 * u * u,
  turn: (u) => 1.75 * (u - 0.3) + 0.2 * u * u,
  struck: (u) => 0.75 * Math.sin(Math.PI * 2 * (u * 1.05 - 0.12)) * (0.35 + u),
};

/** The spine for a pose: the tangent turned by BEND, integrated out from the middle (at the origin, facing +x). */
export function spineOf(pose: SharkPose): (s: number) => Pt {
  const bend = BEND[pose];
  const mid = bend(MID / LEN);
  const step = 1;
  const pts: Pt[] = [];
  // From the middle forward to the snout, then back from the middle to the tail.
  const fwd: Pt[] = [pt(0, 0)];
  for (let s = MID; s > 0; s -= step) {
    const a = bend((s - step / 2) / LEN) - mid;
    const p = fwd[fwd.length - 1]!;
    fwd.push(pt(p.x + Math.cos(a) * step, p.y + Math.sin(a) * step));
  }
  const back: Pt[] = [pt(0, 0)];
  for (let s = MID; s < LEN; s += step) {
    const a = bend((s + step / 2) / LEN) - mid;
    const p = back[back.length - 1]!;
    back.push(pt(p.x - Math.cos(a) * step, p.y - Math.sin(a) * step));
  }
  pts.push(...fwd.reverse(), ...back.slice(1));
  return (s) => {
    const k = Math.max(0, Math.min(pts.length - 1.001, s / step));
    const i = Math.floor(k);
    const u = k - i;
    const a = pts[i]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    return pt(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
  };
}

/** The body (snout to the root of the tail) for a pose, and its spine. */
export function sharkBody(pose: SharkPose): { z: Body; spine: (s: number) => Pt } {
  const spine = spineOf(pose);
  return { z: bodyOf(spine, WIDTH, PEDUNCLE + 4, 96), spine };
}
