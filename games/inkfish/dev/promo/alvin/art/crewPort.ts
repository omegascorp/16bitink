import type { Pt } from './draw';
import { CREW, drawCrew, type FaceLook } from './faces';

/** The three crew in the three portholes (paints each face, shifted by `jolt` own units, into the glass the porthole clipped). */
export function crewPorts(looks: readonly FaceLook[], jolt = 0): (ctx: CanvasRenderingContext2D, i: number, at: Pt, r: number) => void {
  return (ctx, i, at, r) => {
    const bob = jolt * r * 0.25 * (i % 2 === 0 ? 1 : -0.7);
    drawCrew(ctx, CREW[i]!, at.x, at.y + r * 0.02 + bob, r * 0.52, looks[i] ?? looks[0]!);
  };
}
