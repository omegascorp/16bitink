import { ART_RES, GOLD, GOLD_DARK, GOLD_LIGHT, INK, WOOD, WOOD_DARK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/** A straight-edged outline with round joins, for boxes the pen's smoothing would round off. */
function edge(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, color = INK): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Nib's treasure chest, closed or flung open and full. Centred; its base at y = 22. */
export const CHEST_FRAME = { w: 84, h: 84, ox: 42, oy: 50 } as const;

export function paintChest(open: boolean): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(CHEST_FRAME.w * ART_RES, CHEST_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(CHEST_FRAME.ox, CHEST_FRAME.oy);
  const pen = new Pen(ctx, 77, 0.5);
  // Its shadow on the floor.
  ctx.fillStyle = 'rgba(40,32,24,0.28)';
  ctx.beginPath();
  ctx.ellipse(2, 23, 32, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  const box = [{ x: -27, y: -6 }, { x: 27, y: -6 }, { x: 26, y: 22 }, { x: -26, y: 22 }];
  const wood = (pts: readonly Pt[], y0: number, y1: number, light = 0): void => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mix(WOOD, '#ffffff', 0.18 + light));
    g.addColorStop(1, mix(WOOD, WOOD_DARK, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  if (open) {
    // The lid thrown back, its inside dark, and a heap of gold with a glow.
    const lid = [{ x: -27, y: -6 }, { x: 27, y: -6 }, { x: 24, y: -30 }, { x: -24, y: -30 }];
    wood(lid, -30, -6, -0.15);
    pen.fill([{ x: -23, y: -9 }, { x: 23, y: -9 }, { x: 21, y: -27 }, { x: -21, y: -27 }], WOOD_DARK, 0.55);
    edge(ctx, lid, 1.8);
    const glow = ctx.createRadialGradient(0, -10, 0, 0, -10, 36);
    glow.addColorStop(0, rgba(GOLD_LIGHT, 0.85));
    glow.addColorStop(1, rgba(GOLD_LIGHT, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(-42, -46, 84, 72);
    const heap = [{ x: -25, y: -4 }, { x: -16, y: -13 }, { x: -4, y: -18 }, { x: 8, y: -17 }, { x: 18, y: -12 }, { x: 25, y: -4 }];
    pen.fill(heap, GOLD, 1);
    for (let i = 0; i < 11; i++) {
      const x = -20 + i * 4;
      const y = -6 - Math.sin((i / 10) * Math.PI) * 9;
      pen.dot(x, y, 2.6, GOLD);
      pen.circle(x, y, 2.6, 0.8, GOLD_DARK);
      pen.dot(x - 0.8, y - 0.8, 0.8, GOLD_LIGHT);
    }
    pen.stroke(heap, 1.3, INK, 0.9, false);
    // A sparkle.
    pen.hair([{ x: 10, y: -26 }, { x: 10, y: -18 }], 1, '#ffffff', 0.95);
    pen.hair([{ x: 6, y: -22 }, { x: 14, y: -22 }], 1, '#ffffff', 0.95);
  }
  wood(box, -6, 22);
  pen.clipped(box, () => {
    // Planks with grain.
    for (let y = 1; y < 22; y += 7) {
      pen.hair([{ x: -26, y }, { x: 26, y: y + 0.5 }], 1, WOOD_DARK, 0.7);
      pen.hair([{ x: -20, y: y + 3 }, { x: -6, y: y + 3.6 }, { x: 4, y: y + 3 }], 0.6, WOOD_DARK, 0.35);
    }
  });
  edge(ctx, box, 2);
  if (!open) {
    const lid = [{ x: -28, y: -6 }, { x: -26, y: -18 }, { x: -14, y: -24 }, { x: 14, y: -24 }, { x: 26, y: -18 }, { x: 28, y: -6 }];
    wood(lid, -24, -6, 0.1);
    pen.clipped(lid, () => pen.hair([{ x: -26, y: -14 }, { x: -10, y: -19 }, { x: 10, y: -19 }, { x: 26, y: -14 }], 0.7, WOOD_DARK, 0.5));
    edge(ctx, lid, 2);
  }
  // Iron corners and gold bands with rivets, and the lock.
  for (const bx of [-17, 17]) {
    const band = [{ x: bx - 3, y: open ? -6 : -23 }, { x: bx + 3, y: open ? -6 : -23 }, { x: bx + 3, y: 22 }, { x: bx - 3, y: 22 }];
    const g = ctx.createLinearGradient(bx - 3, 0, bx + 3, 0);
    g.addColorStop(0, GOLD_LIGHT);
    g.addColorStop(1, GOLD_DARK);
    ctx.fillStyle = g;
    ctx.fillRect(bx - 3, open ? -6 : -23, 6, open ? 28 : 45);
    edge(ctx, band, 0.9, mix(GOLD_DARK, INK, 0.5));
    for (const ry of [2, 12, 19]) pen.dot(bx, ry, 0.9, GOLD_DARK);
  }
  for (const [cx, cy, sx, sy] of [[-26, 22, 1, -1], [26, 22, -1, -1], [-27, -6, 1, 1], [27, -6, -1, 1]] as const) {
    pen.fill([{ x: cx, y: cy }, { x: cx + sx * 7, y: cy }, { x: cx, y: cy + sy * 7 }], '#5c5a62', 1);
  }
  const lock = ellipse(0, -3, 5, 6, 12);
  pen.fill(lock, GOLD, 1);
  edge(ctx, lock, 1, mix(GOLD_DARK, INK, 0.5));
  pen.dot(0, -3.5, 1.4, INK);
  pen.fill([{ x: -0.7, y: -3 }, { x: 0.7, y: -3 }, { x: 0.5, y: 0 }, { x: -0.5, y: 0 }], INK, 1);
  return canvas;
}

/** A coin, seen at an angle `turn` (0 face-on .. 1 edge-on), 14 board px across. */
export const COIN_SIZE = 16;

export function paintCoin(turn: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(COIN_SIZE * ART_RES, COIN_SIZE * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(COIN_SIZE / 2, COIN_SIZE / 2);
  const pen = new Pen(ctx, 13 + Math.round(turn * 10), 0.2);
  const rx = 6.4 * (1 - turn * 0.6);
  // The rim: the coin's edge showing below its face.
  pen.fill(ellipse(0.6 * turn, 0.9, rx, 6.4, 16), GOLD_DARK, 1);
  const face = ellipse(0, 0, rx, 6.4, 16);
  const g = ctx.createRadialGradient(-rx * 0.4, -2.4, 0.5, 0, 0, 7);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.55, GOLD);
  g.addColorStop(1, mix(GOLD, GOLD_DARK, 0.6));
  ctx.fillStyle = g;
  ctx.beginPath();
  face.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Embossed ring and mark.
  if (turn < 0.8) {
    ctx.strokeStyle = rgba(GOLD_DARK, 0.7);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.68, 4.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (turn < 0.5) {
      pen.hair([{ x: 0, y: -2.2 }, { x: 0, y: 2.2 }], 0.9, GOLD_DARK, 0.8);
      pen.hair([{ x: -1.4 * (1 - turn), y: -0.6 }, { x: 1.4 * (1 - turn), y: 0.6 }], 0.7, GOLD_DARK, 0.6);
    }
  }
  edge(ctx, face, 1.1, mix(GOLD_DARK, INK, 0.45));
  pen.dot(-rx * 0.45, -2.8, 0.9, '#ffffff', 0.85);
  return canvas;
}

/**
 * A pin: a gold shaft with a ring at its pulling end. Drawn lying along +x
 * with the ring's centre at (RING, height / 2); `length` is the shaft from
 * the ring's centre to its tip.
 */
export const PIN_RING = 14;

export function paintPin(length: number, half: number, lit: boolean): HTMLCanvasElement {
  const h = PIN_RING * 2 + 4;
  const w = length + PIN_RING * 2 + 4;
  const { canvas, ctx } = makeCanvas(Math.ceil(w * ART_RES), Math.ceil(h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  const cy = h / 2;
  const cx = PIN_RING + 2;
  const pen = new Pen(ctx, 17 + length, 0.3);
  if (lit) {
    ctx.shadowColor = rgba(GOLD_LIGHT, 0.95);
    ctx.shadowBlur = 8;
  }
  const shaft = [{ x: cx + PIN_RING - 3, y: cy - half }, { x: cx + length - half, y: cy - half }, { x: cx + length, y: cy }, { x: cx + length - half, y: cy + half }, { x: cx + PIN_RING - 3, y: cy + half }];
  const sg = ctx.createLinearGradient(0, cy - half, 0, cy + half);
  sg.addColorStop(0, GOLD_LIGHT);
  sg.addColorStop(0.35, GOLD);
  sg.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = sg;
  ctx.beginPath();
  shaft.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  pen.fill([{ x: cx + PIN_RING, y: cy - half * 0.55 }, { x: cx + length - half * 1.5, y: cy - half * 0.55 }, { x: cx + length - half * 1.5, y: cy - half * 0.15 }, { x: cx + PIN_RING, y: cy - half * 0.15 }], GOLD_LIGHT, 0.85);
  pen.fill([{ x: cx + PIN_RING, y: cy + half * 0.4 }, { x: cx + length - half, y: cy + half * 0.4 }, { x: cx + length - half, y: cy + half * 0.9 }, { x: cx + PIN_RING, y: cy + half * 0.9 }], GOLD_DARK, 0.5);
  edge(ctx, shaft, 1.6);
  // The ring: a thick gold loop.
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
  return canvas;
}

/** A soft puff of steam or smoke. */
export function paintPuff(color: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(32 * ART_RES, 32 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 5, 0.6);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
  g.addColorStop(0, rgba(color, 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  pen.hair([{ x: 8, y: 18 }, { x: 11, y: 11 }, { x: 18, y: 9 }, { x: 24, y: 14 }], 1, INK, 0.35);
  return canvas;
}

/** A torch flame, one of three flicker frames; its base at (0, 0) of a 28 × 40 frame centred at (14, 34). */
export const FLAME_FRAME = { w: 28, h: 40, ox: 14, oy: 34 } as const;

export function paintFlame(frame: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FLAME_FRAME.w * ART_RES, FLAME_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(FLAME_FRAME.ox, FLAME_FRAME.oy);
  const pen = new Pen(ctx, 90 + frame * 7, 0.3);
  const sway = [0, 2.5, -2][frame]!;
  const tall = [24, 27, 22][frame]!;
  const outer = [{ x: -7, y: 0 }, { x: -8, y: -8 }, { x: -3 + sway * 0.4, y: -tall * 0.6 }, { x: sway, y: -tall }, { x: 4 + sway * 0.4, y: -tall * 0.55 }, { x: 8, y: -8 }, { x: 7, y: 0 }, { x: 0, y: 3 }];
  pen.fill(outer, '#e8722c', 0.95);
  const inner = outer.map((p) => ({ x: p.x * 0.55, y: p.y * 0.62 + 1 }));
  pen.fill(inner, '#ffd25a', 1);
  pen.fill(inner.map((p) => ({ x: p.x * 0.5, y: p.y * 0.55 + 1 })), '#fff6d0', 1);
  pen.stroke([...outer, outer[0]!], 1, mix('#e8722c', INK, 0.5), 0.8, false);
  return canvas;
}

/** The warm glow round a flame, drawn additively. */
export function paintGlow(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,190,90,0.55)');
  g.addColorStop(0.5, 'rgba(255,150,60,0.18)');
  g.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

/** The chest's treasure: a little golden idol of a round-eyed temple spirit. Centred. */
export function paintIdol(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(32 * ART_RES, 40 * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(16, 20);
  const pen = new Pen(ctx, 55, 0.3);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  glow.addColorStop(0, rgba(GOLD_LIGHT, 0.7));
  glow.addColorStop(1, rgba(GOLD_LIGHT, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-16, -20, 32, 40);
  const body = [{ x: -7, y: 14 }, { x: -8, y: 2 }, { x: -10, y: -6 }, { x: -6, y: -14 }, { x: 0, y: -16 }, { x: 6, y: -14 }, { x: 10, y: -6 }, { x: 8, y: 2 }, { x: 7, y: 14 }];
  const g = ctx.createLinearGradient(-10, -16, 10, 14);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(0.5, GOLD);
  g.addColorStop(1, GOLD_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  edge(ctx, body, 1.2, mix(GOLD_DARK, INK, 0.5));
  // Round eyes, a grin and a little headdress.
  pen.circle(-3.5, -7, 2.4, 1, GOLD_DARK);
  pen.circle(3.5, -7, 2.4, 1, GOLD_DARK);
  pen.dot(-3.5, -7, 0.9, INK);
  pen.dot(3.5, -7, 0.9, INK);
  pen.hair([{ x: -3, y: -1 }, { x: 0, y: 1 }, { x: 3, y: -1 }], 1, GOLD_DARK, 0.9);
  for (const a of [-0.5, 0, 0.5]) pen.stroke([{ x: Math.sin(a) * 5, y: -15 }, { x: Math.sin(a) * 9, y: -20 }], 1.6, GOLD, 1, false);
  pen.hair([{ x: -6, y: 6 }, { x: 6, y: 6 }], 0.8, GOLD_DARK, 0.8);
  pen.dot(-5, -12, 1.1, '#ffffff', 0.8);
  return canvas;
}
