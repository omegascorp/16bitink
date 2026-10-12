import { type FishPose, project, toCamera, v3 } from './space';

/**
 * An adult hand drawn in chalk behind the fish, for scale: 18.6 cm from
 * wrist to the tip of the middle finger, the fish 16 cm at most. Drawn in
 * the fish's own centimetres just below it, fingers pointing the way it
 * faces, so the two line up like a ruler: wrist past its tail, fingertips
 * past its snout.
 */

type P = readonly [number, number];

/** The outline, fingers up (a little spread) and thumb to the left, wrist along y = 0. */
const OUTLINE: readonly P[] = [
  [3.4, 0], [3.7, 3.0], [4.0, 6.5], [4.25, 9.4],
  // Little finger.
  [4.9, 11.8], [5.3, 13.9], [5.0, 14.7], [4.3, 14.6], [3.8, 12.3], [3.15, 10.6],
  // Ring finger.
  [3.1, 12.6], [3.0, 16.0], [2.4, 16.9], [1.7, 16.2], [1.55, 12.8], [1.15, 11.0],
  // Middle finger.
  [1.0, 13.0], [0.85, 17.6], [0.15, 18.6], [-0.6, 17.7], [-0.65, 13.0], [-1.0, 10.9],
  // Index finger.
  [-1.25, 12.6], [-1.75, 16.2], [-2.45, 16.9], [-3.15, 16.2], [-3.2, 12.4], [-3.45, 9.9],
  // Thumb, held in.
  [-3.9, 8.6], [-4.6, 8.4], [-5.4, 9.2], [-5.9, 10.0], [-6.3, 9.6], [-6.0, 8.3], [-5.2, 6.4], [-4.5, 3.8], [-4.0, 1.6],
  [-3.7, 0],
];

/** Palm and finger creases. */
const CREASES: readonly (readonly P[])[] = [
  [[4.1, 8.6], [2.4, 9.1], [0.4, 9.0], [-1.6, 8.5]],
  [[-3.85, 7.4], [-2.0, 6.9], [0.2, 6.5], [2.2, 5.8]],
  [[-3.7, 7.1], [-3.0, 4.8], [-2.1, 2.6], [-1.4, 0.9]],
  // Finger joints.
  [[3.95, 12.3], [5.0, 12.0]], [[4.2, 13.6], [5.15, 13.4]],
  [[1.6, 13.0], [3.05, 13.1]], [[1.65, 14.9], [3.0, 14.9]],
  [[-0.6, 13.4], [0.95, 13.4]], [[-0.6, 15.6], [0.85, 15.6]],
  [[-3.15, 12.9], [-1.4, 13.1]], [[-3.1, 14.8], [-1.6, 14.9]],
];

/** Where the wrist sits in the fish's frame, and how far behind it the hand lies (cm). */
const WRIST_X = -11.0;
/** The palm's middle line, below the fish: its little finger's edge just under the dimension line. */
const MIDDLE_Y = -10.4;
const BEHIND = 0;
const CHALK = '#dcd6e6';

/** Catmull-Rom through points, closed or open, sampled densely. */
function smoothPath(points: readonly P[], closed: boolean): P[] {
  const n = points.length;
  const at = (i: number): P => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: P[] = [];
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < 6; s++) {
      const u = s / 6;
      const c = (a: number, b: number, c2: number, d: number): number => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(points[n - 1]!);
  return out;
}

const OUTLINE_PATH = smoothPath(OUTLINE, false);
const CREASE_PATHS = CREASES.map((c) => (c.length > 2 ? smoothPath(c, false) : [...c]));

/** A hand point (fingers up) in the fish's frame: fingers along +x the way it faces, thumb down. */
const inFishFrame = ([x, y]: P): P => [WRIST_X + y, MIDDLE_Y + x];

/** Where the palm's middle is in the fish's frame, for its label. */
export const PALM: P = inFishFrame([0, 5.2]);

/**
 * Draws the hand behind the fish at `pose` (without its jaw or sway), the
 * outline traced `drawn` (0 .. 1) of the way round, faded by `shown`.
 */
export function drawHand(ctx: CanvasRenderingContext2D, pose: FishPose, drawn: number, shown: number, boil: number): void {
  if (shown <= 0 || drawn <= 0) return;
  const place = (p: P, k: number): { x: number; y: number; scale: number } => {
    const [x, y] = inFishFrame(p);
    const s = project(toCamera(pose, v3(x, y, -BEHIND)));
    // Boil: a slight steady wobble per point and frame.
    const a = Math.min(1.6, s.scale * 0.03);
    return { x: s.x + a * Math.sin(k * 12.9898 + boil * 78.233), y: s.y + a * Math.cos(k * 39.3468 + boil * 11.135), scale: s.scale };
  };
  const outline = OUTLINE_PATH.map((p, k) => place(p, k));
  const scale = outline[0]!.scale;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = shown;
  // A faint pale wash in the palm, so it reads as a hand and the dark fish stands out on it.
  ctx.beginPath();
  outline.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = `rgba(220,214,230,${(0.1 * Math.min(1, drawn * 1.4)).toFixed(3)})`;
  ctx.fill();
  // The outline, traced as if being drawn.
  const lengths = outline.map((p, k) => (k === 0 ? 0 : Math.hypot(p.x - outline[k - 1]!.x, p.y - outline[k - 1]!.y)));
  const total = lengths.reduce((s, l) => s + l, 0);
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = Math.max(2.5, scale * 0.09);
  ctx.setLineDash([total * drawn, total]);
  ctx.beginPath();
  outline.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
  // The creases, once the outline is most of the way round.
  ctx.globalAlpha = shown * 0.45 * Math.max(0, (drawn - 0.6) / 0.4);
  ctx.lineWidth = Math.max(1.5, scale * 0.05);
  CREASE_PATHS.forEach((c, q) => {
    const pts = c.map((p, k) => place(p, 1000 + q * 40 + k));
    ctx.beginPath();
    pts.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  });
  ctx.restore();
}

/** Hand length, wrist to fingertip, cm. */
export const HAND_LENGTH = 18.6;
