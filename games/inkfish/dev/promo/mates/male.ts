import { createRng } from '../../../src/logic/rng';

/**
 * The male anglerfish, in pale ink so he reads against the dark: a small
 * dark body, a big eye and big nostrils (he finds her by smell), no lure,
 * hooked teeth at the front of his jaw for biting on. Drawn as paths, so he
 * stays crisp however close the camera gets. Plus the magnifier that shows
 * his mouth fusing into her skin.
 */
const CHALK = '#dcd6e6';
const BODY = '#544b5e';
const SKIN = '#1d1a22';
const BLOOD = '#c4483e';

export interface MaleLook {
  readonly beat: number;
  readonly effort: number;
  /** 0 free .. 1 fused into her. */
  readonly fused: number;
  readonly alpha?: number;
}

/** His outline in his own units: length 1, head at +0.5, belly down. */
function bodyPath(ctx: CanvasRenderingContext2D, tailSwing: number): void {
  ctx.beginPath();
  ctx.moveTo(0.5, 0.01);
  ctx.bezierCurveTo(0.48, -0.12, 0.3, -0.19, 0.1, -0.18);
  ctx.bezierCurveTo(-0.15, -0.16, -0.35, -0.08, -0.44, -0.04 + tailSwing * 0.3);
  ctx.lineTo(-0.44, 0.05 + tailSwing * 0.3);
  ctx.bezierCurveTo(-0.3, 0.12, -0.1, 0.17, 0.12, 0.16);
  ctx.bezierCurveTo(0.32, 0.15, 0.47, 0.1, 0.5, 0.01);
  ctx.closePath();
}

/** Draws him at (x, y) on screen, `length` px long, head pointing `angle`. */
export function drawMale(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, look: MaleLook): void {
  if (length < 2) return;
  const swing = Math.sin(look.beat) * (0.04 + 0.1 * look.effort);
  ctx.save();
  ctx.globalAlpha = look.alpha ?? 1;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(length, length);
  const line = Math.max(1.4, length * 0.022) / length;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = CHALK;
  // Tail fan, swinging.
  ctx.beginPath();
  ctx.moveTo(-0.43, 0.005 + swing * 0.3);
  ctx.quadraticCurveTo(-0.6, -0.14 + swing, -0.66, -0.1 + swing * 1.4);
  ctx.quadraticCurveTo(-0.58, 0.01 + swing, -0.66, 0.12 + swing * 1.4);
  ctx.quadraticCurveTo(-0.6, 0.15 + swing, -0.43, 0.02 + swing * 0.3);
  ctx.fillStyle = BODY;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.stroke();
  bodyPath(ctx, swing);
  ctx.fill();
  ctx.stroke();
  // Pectoral fin.
  ctx.beginPath();
  ctx.moveTo(0.12, 0.04);
  ctx.quadraticCurveTo(0.0, 0.12 + swing * 0.5, -0.06, 0.1);
  ctx.stroke();
  // Hooked teeth on the snout, for holding on.
  for (const k of [0, 1, 2]) {
    ctx.beginPath();
    ctx.moveTo(0.47 - k * 0.03, 0.02);
    ctx.quadraticCurveTo(0.5 - k * 0.03, 0.06, 0.46 - k * 0.03, 0.07);
    ctx.stroke();
  }
  // A big eye, and a big nostril in front of it.
  const dim = 1 - 0.6 * look.fused;
  ctx.globalAlpha = (look.alpha ?? 1) * dim;
  ctx.beginPath();
  ctx.arc(0.3, -0.06, 0.065, 0, Math.PI * 2);
  ctx.fillStyle = CHALK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.31, -0.06, 0.035, 0, Math.PI * 2);
  ctx.fillStyle = '#0d0b12';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0.42, -0.07, 0.022, 0, Math.PI * 2);
  ctx.lineWidth = line * 0.8;
  ctx.stroke();
  ctx.globalAlpha = look.alpha ?? 1;
  // Fused: the front of him darkens into her skin.
  if (look.fused > 0) {
    const g = ctx.createLinearGradient(0.5, 0, 0.1, 0);
    g.addColorStop(0, `rgba(29,26,34,${look.fused.toFixed(3)})`);
    g.addColorStop(1, 'rgba(29,26,34,0)');
    bodyPath(ctx, swing);
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

/** Blood vessels branching from her skin down into him: a fixed tree, drawn as far as `grown` (0 .. 1). */
const VESSELS = (() => {
  const rng = createRng(77);
  const branches: { x0: number; y0: number; x1: number; y1: number; at: number; width: number }[] = [];
  const grow = (x: number, y: number, angle: number, len: number, at: number, depth: number): void => {
    const x1 = x + Math.cos(angle) * len;
    const y1 = y + Math.sin(angle) * len;
    branches.push({ x0: x, y0: y, x1, y1, at, width: 0.03 - depth * 0.007 });
    if (depth >= 3) return;
    for (const turn of [-0.45, 0.4]) grow(x1, y1, angle + turn + (rng() - 0.5) * 0.3, len * (0.65 + rng() * 0.15), at + 0.22, depth + 1);
  };
  // Three trunks from the join: one deep into him, two along his body.
  for (const a of [Math.PI / 2, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35]) grow(0, 0, a, 0.28, 0, 0);
  // And a few up into her, where they come from.
  for (const a of [-Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5]) grow(0, 0, a, 0.22, 0, 1);
  return branches;
})();

/**
 * The magnifier: a circle on screen showing the join close up, her skin above
 * and his head below, `fused` and `grown` showing how far it has gone, with a
 * line down to where it is. `open` fades it in and out.
 */
export function drawLens(
  ctx: CanvasRenderingContext2D, lens: { x: number; y: number; r: number }, to: { x: number; y: number }, open: number, fused: number, grown: number, beat: number,
): void {
  if (open <= 0) return;
  const { x, y, r } = lens;
  ctx.save();
  ctx.globalAlpha = open;
  // The leader line, to the join.
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, r * (0.85 + 0.15 * open), 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#0a1024';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Her skin across the top, its edge where his mouth goes in.
  const edge = y - r * 0.05;
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x + r, y - r);
  ctx.lineTo(x + r, edge + 18);
  ctx.bezierCurveTo(x + r * 0.4, edge - 6, x - r * 0.4, edge + 14, x - r, edge);
  ctx.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Pores and stipple on her skin.
  const rng = createRng(5);
  ctx.fillStyle = CHALK;
  for (let k = 0; k < 70; k++) {
    const px = x - r + rng() * r * 2;
    const py = y - r + rng() * (r * 0.9);
    ctx.globalAlpha = open * (k % 7 === 0 ? 0.7 : 0.25);
    ctx.beginPath();
    ctx.arc(px, py, k % 7 === 0 ? 3.2 : 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = open;
  // Him, head up into her, mouth at the edge, sinking in as he fuses.
  const len = r * 1.5;
  const sink = 0.06 * fused;
  drawMale(ctx, x, edge + len * (0.5 - sink), len, -Math.PI / 2, { beat, effort: 0.15 * (1 - fused), fused, alpha: open });
  // Over the join, her skin closes round his snout.
  ctx.fillStyle = SKIN;
  ctx.globalAlpha = open * fused;
  ctx.beginPath();
  ctx.ellipse(x, edge + 4, len * 0.14 * fused + 1, len * 0.05 * fused + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = open;
  // The shared blood vessels, growing branch by branch.
  ctx.strokeStyle = BLOOD;
  ctx.lineCap = 'round';
  for (const b of VESSELS) {
    const u = Math.max(0, Math.min(1, (grown - b.at) / 0.34));
    if (u <= 0) continue;
    ctx.lineWidth = Math.max(2, b.width * len);
    ctx.beginPath();
    ctx.moveTo(x + b.x0 * len, edge + b.y0 * len);
    ctx.lineTo(x + (b.x0 + (b.x1 - b.x0) * u) * len, edge + (b.y0 + (b.y1 - b.y0) * u) * len);
    ctx.stroke();
  }
  ctx.restore();
  // The lens rim.
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, r * (0.85 + 0.15 * open), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
