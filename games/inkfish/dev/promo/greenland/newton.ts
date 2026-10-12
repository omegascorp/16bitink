import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';

/**
 * Isaac Newton as a little cameo: a paper oval with his silhouette in ink, a
 * generic periwig of the 1600s in profile, and an apple dropping beside it.
 * Shapes are in units of the oval's height, filled under a scaled context
 * and inked in screen px (the pen's wobble is in px); `boil` reseeds the
 * wobble like the game's line boil.
 */

const APPLE = '#c4483e';
const LEAF = '#6f9a4a';

/** His profile, facing right: forehead, nose, lips, chin, cravat and coat. Units: the oval's height. */
const FACE: readonly Pt[] = [
  { x: 0.06, y: -0.3 }, { x: 0.1, y: -0.24 }, { x: 0.11, y: -0.17 }, { x: 0.17, y: -0.09 }, { x: 0.12, y: -0.065 },
  { x: 0.13, y: -0.03 }, { x: 0.11, y: -0.01 }, { x: 0.12, y: 0.015 }, { x: 0.1, y: 0.03 }, { x: 0.11, y: 0.07 },
  { x: 0.06, y: 0.1 }, { x: 0.02, y: 0.11 }, { x: 0.03, y: 0.17 }, { x: 0.09, y: 0.2 }, { x: 0.12, y: 0.26 },
  { x: 0.08, y: 0.29 }, { x: 0.2, y: 0.36 }, { x: 0.27, y: 0.5 },
];

/** Curls of the periwig: centres and radii, from the crown down past the shoulders. */
const CURLS: readonly (readonly [number, number, number])[] = [
  [0.0, -0.3, 0.1], [-0.08, -0.33, 0.1], [-0.16, -0.28, 0.1], [-0.2, -0.19, 0.1], [-0.12, -0.2, 0.12],
  [-0.22, -0.09, 0.1], [-0.14, -0.08, 0.11], [-0.23, 0.02, 0.1], [-0.16, 0.04, 0.1], [-0.24, 0.13, 0.095],
  [-0.15, 0.15, 0.09], [-0.21, 0.24, 0.09], [-0.12, 0.25, 0.085], [-0.06, 0.2, 0.08], [-0.24, 0.32, 0.075],
  [-0.03, -0.24, 0.09], [-0.05, 0.12, 0.08],
];

const RX = 0.4;
const RY = 0.5;

/** Newton's cameo centred at (x, y), `h` px tall, swelling by `pulse` (0 .. 1). */
export function drawNewton(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, pulse: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const s = h * (1 + 0.12 * pulse);
  const px = (p: Pt): Pt => ({ x: x + p.x * s, y: y + p.y * s });
  const pen = new Pen(ctx, 1642 + boil * 7, 0.7);
  const oval = (r: number): void => {
    ctx.beginPath();
    ctx.ellipse(x, y, (r * s * RX) / RY, r * s, 0, 0, Math.PI * 2);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  // The paper oval, glowing a little as he is named.
  ctx.save();
  if (pulse > 0) {
    ctx.shadowColor = 'rgba(245,200,74,0.9)';
    ctx.shadowBlur = 50 * pulse;
  }
  oval(RY);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.restore();
  // His silhouette, clipped to the inner rim so his coat runs off its bottom edge.
  ctx.save();
  oval(RY - 0.035);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = INK;
  ctx.beginPath();
  FACE.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  for (const p of [{ x: 0.3, y: 0.6 }, { x: -0.4, y: 0.6 }, { x: -0.3, y: 0.38 }, { x: -0.1, y: 0.3 }, { x: -0.02, y: -0.35 }]) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  for (const [cx, cy, r] of CURLS) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // The cravat, pale at his throat.
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(0.05, 0.2);
  ctx.quadraticCurveTo(0.13, 0.25, 0.1, 0.31);
  ctx.quadraticCurveTo(0.03, 0.3, 0.0, 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Pale curl lines in the wig, and an eye.
  for (const [cx, cy, r] of CURLS) {
    const curl = Array.from({ length: 9 }, (_, i) => {
      const a = 0.6 + (i / 8) * Math.PI * 1.4;
      const rr = r * (0.62 - 0.25 * (i / 8));
      return px({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    });
    pen.hair(curl, Math.max(1, s * 0.011), PAPER, 0.45);
  }
  pen.hair([px({ x: 0.07, y: -0.16 }), px({ x: 0.1, y: -0.155 })], Math.max(1.2, s * 0.018), PAPER, 0.9);
  // The oval's double rim, in pen.
  const rim = (r: number): Pt[] => Array.from({ length: 41 }, (_, i) => px({ x: Math.cos((i / 40) * Math.PI * 2) * r * (RX / RY), y: Math.sin((i / 40) * Math.PI * 2) * r }));
  pen.stroke(rim(RY), Math.max(2, s * 0.03), INK, 1, false);
  pen.stroke(rim(RY - 0.035), Math.max(1, s * 0.012), INK, 0.8, false);
  ctx.restore();
}

/** An apple drawn at (x, y), `r` px round, with a few speed lines above it as it drops. */
export function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const px = (p: Pt): Pt => ({ x: x + p.x * r, y: y + p.y * r });
  const pen = new Pen(ctx, 77 + boil * 13, 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const dx of [-0.45, 0, 0.45]) pen.stroke([px({ x: dx, y: -1.5 - Math.abs(dx) * 0.4 }), px({ x: dx, y: -2.4 - Math.abs(dx) * 0.4 })], Math.max(1.5, r * 0.12), PAPER, 0.6, false);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.fillStyle = APPLE;
  ctx.beginPath();
  ctx.moveTo(0, -0.7);
  ctx.bezierCurveTo(0.5, -1.05, 1.1, -0.6, 0.95, 0.05);
  ctx.bezierCurveTo(0.85, 0.75, 0.35, 1.0, 0, 0.85);
  ctx.bezierCurveTo(-0.35, 1.0, -0.85, 0.75, -0.95, 0.05);
  ctx.bezierCurveTo(-1.1, -0.6, -0.5, -1.05, 0, -0.7);
  ctx.fill();
  ctx.fillStyle = LEAF;
  ctx.beginPath();
  ctx.moveTo(0.06, -1.0);
  ctx.quadraticCurveTo(0.45, -1.35, 0.75, -1.05);
  ctx.quadraticCurveTo(0.4, -0.85, 0.06, -1.0);
  ctx.fill();
  ctx.restore();
  const outline: Pt[] = [
    { x: 0, y: -0.7 }, { x: 0.5, y: -0.95 }, { x: 0.98, y: -0.4 }, { x: 0.95, y: 0.1 }, { x: 0.7, y: 0.7 }, { x: 0, y: 0.85 },
    { x: -0.7, y: 0.7 }, { x: -0.95, y: 0.1 }, { x: -0.98, y: -0.4 }, { x: -0.5, y: -0.95 }, { x: 0, y: -0.7 },
  ];
  pen.stroke(outline.map(px), Math.max(1.6, r * 0.1), INK, 1, false);
  // A shine, a stalk and the leaf's vein.
  pen.stroke([px({ x: -0.55, y: -0.35 }), px({ x: -0.5, y: 0.0 })], Math.max(1.6, r * 0.14), PAPER, 0.75, false);
  pen.stroke([px({ x: 0, y: -0.7 }), px({ x: 0.08, y: -1.15 })], Math.max(1.4, r * 0.1), INK, 1, false);
  pen.hair([px({ x: 0.06, y: -1.0 }), px({ x: 0.75, y: -1.05 })], Math.max(1, r * 0.05), INK, 0.8);
  ctx.restore();
}
