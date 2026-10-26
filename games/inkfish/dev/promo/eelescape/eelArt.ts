import { INK, Pen, type Pt } from '../../../src/art/pen';
import { lerpPt, tube } from './geom';

/**
 * A young Japanese eel in pen and ink: slender and see-through grey, a
 * darker line along its back and a pale belly, the soft fin running round
 * the back half of its body to the tail, a small dark eye. Drawn live along
 * a centre line from head to tail (it bends with every frame); the pen's
 * seed steps with the line boil.
 */

export interface EelLook {
  /** How solid the eel is painted, 0 (outline only) .. 1. */
  readonly fill: number;
  /** Gold over it (the one in four that made it), 0 .. 1. */
  readonly gold: number;
  readonly line: string;
  readonly lineAlpha: number;
}

export const EEL_LOOK: EelLook = { fill: 1, gold: 0, line: INK, lineAlpha: 1 };

/** The eel's half-width along it (f = 0 head .. 1 tail), as a share of its widest. */
export function eelProfile(f: number): number {
  if (f < 0.07) return 0.5 + 0.5 * Math.sin(((f / 0.07) * Math.PI) / 2);
  if (f < 0.5) return 1;
  return Math.max(0.06, 1 - 0.92 * ((f - 0.5) / 0.5) ** 1.25);
}

export function drawEel(ctx: CanvasRenderingContext2D, spine: readonly Pt[], half: number, seed: number, look: EelLook = EEL_LOOK): void {
  if (spine.length < 3) return;
  const pen = new Pen(ctx, seed, Math.min(1, half * 0.06));
  const prof = (f: number): number => half * eelProfile(f);
  const body = tube(spine, prof);
  const outline = [...body.left, ...[...body.right].reverse()];
  // The fin round the back half, out to a rounded tip.
  const finHalf = (f: number): number => prof(f) + (f < 0.32 ? 0 : half * 0.5 * Math.min(1, (f - 0.32) / 0.14));
  const fin = tube(spine, finHalf);
  const last = spine[spine.length - 1]!;
  const prev = spine[spine.length - 3]!;
  const d = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
  const tip = { x: last.x + ((last.x - prev.x) / d) * half * 0.8, y: last.y + ((last.y - prev.y) / d) * half * 0.8 };
  const from = Math.floor(spine.length * 0.32);
  const finShape = [...fin.left.slice(from), tip, ...fin.right.slice(from).reverse()];
  if (look.fill > 0.01) {
    pen.fill(finShape, '#c9d4cf', 0.32 * look.fill);
    pen.fill(outline, '#f4f6f0', 0.35 * look.fill);
    pen.fill(outline, '#8e9c98', 0.78 * look.fill);
    // A darker line along the back, a pale belly.
    const back = spine.map((p, i) => lerpPt(p, body.left[i]!, 0.55));
    const belly = spine.map((p, i) => lerpPt(p, body.right[i]!, 0.5));
    pen.stroke(back.slice(1, -2), half * 0.6, '#3f4a48', 0.5 * look.fill, false);
    pen.stroke(belly.slice(2, Math.floor(spine.length * 0.7)), half * 0.4, '#eef2ea', 0.45 * look.fill, false);
    if (look.gold > 0.01) {
      pen.fill(outline, '#f5c84a', 0.7 * look.gold);
      pen.fill(finShape, '#f5c84a', 0.35 * look.gold);
    }
  }
  pen.hair([...fin.left.slice(from), tip, ...fin.right.slice(from).reverse()], Math.max(0.8, half * 0.08), look.line, 0.5 * look.lineAlpha);
  pen.stroke([...outline, outline[0]!], Math.max(1.2, half * 0.16), look.line, look.lineAlpha, false);
  // The eye, and the gill slit behind it.
  const ei = Math.max(1, Math.round(spine.length * 0.035));
  const eye = lerpPt(spine[ei]!, body.left[ei]!, 0.35);
  pen.dot(eye.x, eye.y, Math.max(1.5, half * 0.22), look.fill > 0.3 ? '#0b0705' : look.line, Math.max(look.lineAlpha * 0.8, look.fill));
  if (look.fill > 0.3) pen.dot(eye.x - half * 0.06, eye.y - half * 0.07, Math.max(0.6, half * 0.07), '#ffffff', 0.85 * look.fill);
  const gi = Math.max(2, Math.round(spine.length * 0.12));
  pen.hair([lerpPt(spine[gi]!, body.left[gi]!, 0.6), spine[gi + 1]!, lerpPt(spine[gi]!, body.right[gi]!, 0.4)], Math.max(0.7, half * 0.07), look.line, 0.5 * look.lineAlpha);
}
