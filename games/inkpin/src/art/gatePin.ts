import { ART_RES, GOLD, GOLD_DARK, GOLD_LIGHT, INK, RED } from './palette';
import { makeCanvas, Pen, type Pt } from './pen';
import { PIN_RING } from './props';
import { mix, rgba } from './wash';

/**
 * A gate pin: the plain pin's gold shaft striped red like a barrier gate,
 * a square bronze gate plate where the shaft meets the ring, with a
 * curling arrow cut in it, and a little lever ring on the plate's corner,
 * so it reads as "this one goes back in". Drawn exactly like paintPin
 * (lying along +x, the ring's centre at (PIN_RING + 2, height / 2)), so the
 * scene places both the same way.
 */
export function paintGatePin(length: number, half: number, lit: boolean): HTMLCanvasElement {
  const h = PIN_RING * 2 + 4;
  const w = length + PIN_RING * 2 + 4;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * ART_RES), Math.ceil(h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  const cy = h / 2;
  const cx = PIN_RING + 2;
  const pen = new Pen(ctx, 23 + length, 0.3);
  if (lit) {
    ctx.shadowColor = rgba(GOLD_LIGHT, 0.95);
    ctx.shadowBlur = 8;
  }
  const s0 = cx + PIN_RING - 3;
  const tip = cx + length;
  const shaft: Pt[] = [{ x: s0, y: cy - half }, { x: tip - half, y: cy - half }, { x: tip, y: cy }, { x: tip - half, y: cy + half }, { x: s0, y: cy + half }];
  const sg = ctx.createLinearGradient(0, cy - half, 0, cy + half);
  sg.addColorStop(0, GOLD_LIGHT);
  sg.addColorStop(0.35, GOLD);
  sg.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = sg;
  fill(ctx, shaft);
  ctx.shadowBlur = 0;
  // Red stripes slanting across the shaft, as on a barrier gate.
  ctx.save();
  ctx.clip(path(shaft));
  const stripe = half * 2.4;
  for (let x = s0 + PIN_RING; x < tip - half; x += stripe * 2) {
    const band = [{ x, y: cy + half }, { x: x + half, y: cy - half }, { x: x + half + stripe, y: cy - half }, { x: x + stripe, y: cy + half }];
    const rg = ctx.createLinearGradient(0, cy - half, 0, cy + half);
    rg.addColorStop(0, mix(RED, '#ffffff', 0.3));
    rg.addColorStop(1, mix(RED, '#4a0e0a', 0.35));
    ctx.fillStyle = rg;
    fill(ctx, band);
  }
  ctx.restore();
  pen.fill([{ x: s0 + 4, y: cy - half * 0.55 }, { x: tip - half * 1.5, y: cy - half * 0.55 }, { x: tip - half * 1.5, y: cy - half * 0.2 }, { x: s0 + 4, y: cy - half * 0.2 }], '#ffffff', 0.35);
  edge(ctx, shaft, 1.6);
  // The ring.
  ctx.lineWidth = 6;
  ctx.strokeStyle = GOLD;
  ctx.beginPath();
  ctx.arc(cx, cy, PIN_RING - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = GOLD_LIGHT;
  ctx.beginPath();
  ctx.arc(cx, cy, PIN_RING - 5, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();
  pen.circle(cx, cy, PIN_RING - 0.8, 1.5, INK);
  pen.circle(cx, cy, PIN_RING - 7.2, 1.3, INK);
  // The gate plate: a square of bronze across the shaft's root, riveted, with a curling arrow.
  const px = s0 + 1;
  const ph = half + 3;
  const plate: Pt[] = [{ x: px, y: cy - ph }, { x: px + 12, y: cy - ph }, { x: px + 12, y: cy + ph }, { x: px, y: cy + ph }];
  const pg = ctx.createLinearGradient(px, cy - ph, px + 12, cy + ph);
  pg.addColorStop(0, '#d9a066');
  pg.addColorStop(0.5, '#a8673a');
  pg.addColorStop(1, '#5e3820');
  ctx.fillStyle = pg;
  fill(ctx, plate);
  pen.hair([{ x: px + 1.5, y: cy - ph + 1.2 }, { x: px + 10.5, y: cy - ph + 1.2 }], 0.9, '#ffe2b8', 0.8);
  for (const [rx, ry] of [[2.6, -ph + 2.8], [9.4, -ph + 2.8], [2.6, ph - 2.8], [9.4, ph - 2.8]] as const) pen.dot(px + rx, cy + ry, 0.9, '#4a2a16', 1);
  // The "back in" arrow: a hook curling round to point at the shaft.
  const arrow: Pt[] = [];
  for (let a = -Math.PI * 0.9; a <= Math.PI * 0.55; a += 0.25) arrow.push({ x: px + 6 + Math.cos(a) * 3.2, y: cy + Math.sin(a) * 3.6 });
  pen.hair(arrow, 1.1, '#3a1e10', 0.95);
  const end = arrow[arrow.length - 1]!;
  pen.fill([{ x: end.x + 2.2, y: end.y - 0.4 }, { x: end.x - 1.2, y: end.y + 2.6 }, { x: end.x - 1.4, y: end.y - 1.8 }], '#3a1e10', 0.95);
  edge(ctx, plate, 1.3);
  // The little lever ring on the plate's lower corner.
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#a8673a';
  ctx.beginPath();
  ctx.arc(px + 12, cy + ph + 1, 2.2, 0, Math.PI * 2);
  ctx.stroke();
  pen.circle(px + 12, cy + ph + 1, 3.1, 0.8, INK);
  return canvas;
}

function path(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
  return p;
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.fill(path(pts));
}

function edge(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke(path(pts));
  ctx.restore();
}
