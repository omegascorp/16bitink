import { INK } from '../../src/art/pen';
import { createRng } from '../../src/logic/rng';
import { mouthOf, type Pose } from './chain';

/**
 * The bite's effects, shared by every promo short: water rushing into an
 * open mouth, the prey dragged in and down the throat, the comic snap, and
 * the hand-inked "!" of a prey that has seen it coming.
 */

/** The snap: fat ink wedges bursting from the shut mouth, comic-style, gone in a blink. `u` runs 0 → 1 over the burst. */
export function drawChomp(ctx: CanvasRenderingContext2D, pose: Pose, u: number): void {
  if (u < 0 || u > 1) return;
  const m = mouthOf(pose);
  const grow = 1 - (1 - u) ** 3;
  const r0 = pose.length * (0.05 + 0.08 * grow);
  const r1 = pose.length * (0.12 + 0.13 * grow);
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  for (let k = 0; k < 7; k++) {
    // Spray forwards from the mouth, not back through the head.
    const a = (k / 6 - 0.5) * Math.PI * 1.15;
    const w = pose.length * 0.012 * (1 - u * 0.7) * (k % 2 ? 0.7 : 1);
    const len = k % 2 ? 0.75 : 1;
    const cos = Math.cos(a) * pose.facing;
    const sin = Math.sin(a);
    const at = (r: number, side: number): [number, number] => [m.x + cos * r - sin * side * pose.facing, m.y + sin * r + cos * side];
    ctx.beginPath();
    ctx.moveTo(...at(r0, 0));
    ctx.lineTo(...at(r0 + (r1 - r0) * len * 0.35, w));
    ctx.lineTo(...at(r0 + (r1 - r0) * len, 0));
    ctx.lineTo(...at(r0 + (r1 - r0) * len * 0.35, -w));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Water streaming into an open mouth: the game's "~" current marks and specks, drawn in towards the lips, shrinking as they go. */
const STREAKS = (() => {
  const rng = createRng(53);
  return Array.from({ length: 11 }, (_, k) => ({
    angle: ((k + 0.2 + rng() * 0.6) / 11 - 0.5) * 1.5,
    phase: rng(),
    reach: 0.7 + rng() * 0.45,
    speck: k % 3 === 2,
  }));
})();

/** `pull` is how hard the water rushes in (0..1); `clock` drives the flow, about one mark every 1/7 of it. */
export function drawSuction(ctx: CanvasRenderingContext2D, pose: Pose, pull: number, clock: number): void {
  if (pull <= 0) return;
  const m = mouthOf(pose);
  const far = pose.length * 0.5;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    // Each mark flows in, accelerating, and starts again further out.
    const flow = (s.phase + clock * 7) % 1;
    const d = far * s.reach * (1 - flow) ** 1.6;
    const near = d / far;
    const fade = Math.min(1, near * 6) * Math.min(1, (1 - flow) * 5);
    if (fade <= 0.02) continue;
    // Bent gently towards the mouth's axis as it closes in.
    const angle = s.angle * (0.55 + 0.45 * near);
    const dx = pose.facing * Math.cos(angle);
    const dy = Math.sin(angle);
    ctx.globalAlpha = 0.5 * pull * fade;
    const x0 = m.x + dx * d;
    const y0 = m.y + dy * d;
    if (s.speck) {
      ctx.beginPath();
      ctx.arc(x0, y0, Math.max(1.2, pose.length * 0.006 * (0.4 + near)), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // A short wavy stroke lying along the flow, stretched as it speeds up.
    const len = pose.length * (0.035 + 0.07 * near) * (1 + flow);
    const wave = pose.length * 0.006 * (0.5 + near);
    ctx.lineWidth = Math.max(1, pose.length * 0.0035 * (0.5 + near));
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const along = d + (len * i) / 6;
      const side = Math.sin(i * 1.4 + s.phase * 6) * wave;
      const x = m.x + dx * along - dy * side * pose.facing;
      const y = m.y + dy * along + Math.cos(angle) * side;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The prey's last moments: dragged head-first to the eater's lips, then down
 * the throat, stretching long and thin as it goes (the throat's shadow,
 * drawn over it, swallows it into the dark).
 */
export function suckedIn(prey: Pose, eater: Pose, u: number): [Pose, { stretch: number; squash: number }] {
  const lips = mouthOf(eater);
  const throat = {
    x: eater.x + eater.facing * eater.length * 0.12,
    y: eater.y + eater.length * 0.05,
  };
  const e = u ** 1.7;
  // A curve from where it was, through the lips, into the throat.
  const a = (1 - e) ** 2;
  const b = 2 * e * (1 - e);
  const c = e * e;
  const x = a * prey.x + b * lips.x + c * throat.x;
  const y = a * prey.y + b * lips.y + c * throat.y;
  const pull = Math.sin(Math.PI * Math.min(1, u * 1.15));
  return [
    { ...prey, x, y, length: prey.length * (1 - 0.45 * e), tilt: prey.tilt * (1 - e) },
    { stretch: 1 + 0.5 * pull, squash: 1 - 0.3 * pull },
  ];
}

/** A hand-inked "!" centred at (x, y), `h` tall, tilted by `rotation`. */
export function drawExclaim(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = INK;
  ctx.beginPath();
  // A tapering stroke: fat at the top, a point at the bottom.
  ctx.moveTo(-h * 0.11, -h * 0.5);
  ctx.quadraticCurveTo(0, -h * 0.62, h * 0.11, -h * 0.5);
  ctx.lineTo(h * 0.025, h * 0.18);
  ctx.lineTo(-h * 0.025, h * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, h * 0.38, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
