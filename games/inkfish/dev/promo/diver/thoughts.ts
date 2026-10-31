import { INK, Pen, type Pt } from '../../../src/art/pen';

/** Thought bubbles over the picture (screen px): a cloud with a trail of small bubbles, and what he thinks of in it. */

const CREAM = '#fbf3de';

/** A cloud centred at c, rx by ry, with bubbles trailing towards `tail`, popped in by `pop` (0 .. 1). Returns the scale used. */
export function drawCloud(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, rx: number, ry: number, tail: Pt, pop: number): number {
  const k = Math.min(1.08, pop * 1.4 - 0.1 * Math.sin(pop * Math.PI));
  if (k <= 0.02) return 0;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(k, k);
  ctx.translate(-c.x, -c.y);
  // The trail: three bubbles shrinking towards the thinker.
  [0.55, 0.78, 0.94].forEach((u, i) => {
    const p = { x: c.x + (tail.x - c.x) * u, y: c.y + (tail.y - c.y) * u + ry * (1 - u) * 0.9 };
    const r = 30 - i * 8;
    pen.dot(p.x, p.y, r, CREAM, 1);
    pen.circle(p.x, p.y, r, 3, INK);
  });
  const lobes = 12;
  const outline: Pt[] = [];
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2;
    for (let s = 0; s <= 6; s++) {
      const a = a0 + (s / 6) * ((Math.PI * 2) / lobes);
      const bump = 1 + 0.12 * Math.sin(s * (Math.PI / 6));
      outline.push({ x: c.x + Math.cos(a) * rx * bump, y: c.y + Math.sin(a) * ry * bump });
    }
  }
  pen.fill(outline, CREAM, 1);
  pen.closed(outline, 4, INK);
  ctx.restore();
  return k;
}

/** A shark, side on, jaws gaping with teeth: what he thinks has got him. Centred at c, `size` long. */
export function drawShark(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, size: number): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(size / 100, size / 100);
  const body = [
    { x: 52, y: 4 }, { x: 40, y: -10 }, { x: 10, y: -20 }, { x: -6, y: -22 }, { x: -14, y: -42 }, { x: -22, y: -22 }, { x: -50, y: -10 }, { x: -64, y: -26 },
    { x: -58, y: 0 }, { x: -68, y: 24 }, { x: -50, y: 8 }, { x: -20, y: 14 }, { x: 10, y: 16 }, { x: 24, y: 12 },
  ];
  pen.fill(body, '#33495a', 1);
  pen.fill([{ x: 40, y: 8 }, { x: 10, y: 16 }, { x: -20, y: 14 }, { x: -50, y: 8 }, { x: -50, y: 2 }, { x: -10, y: 4 }, { x: 24, y: 2 }], '#d9e0dc', 0.9);
  pen.closed(body, 2.2, INK);
  // The open jaw, the red inside and a row of teeth along each lip.
  const jaw = [{ x: 52, y: 4 }, { x: 24, y: -6 }, { x: 22, y: 14 }, { x: 40, y: 24 }];
  pen.fill([{ x: 52, y: 4 }, { x: 24, y: -4 }, { x: 24, y: 14 }, { x: 44, y: 22 }], '#7c1f22', 1);
  for (let i = 0; i < 5; i++) {
    const x = 28 + i * 5;
    pen.fill([{ x, y: -4 + i * 1.2 }, { x: x + 3, y: -4 + i * 1.2 }, { x: x + 1.5, y: 5 + i * 0.6 }], '#fbf8ef', 1);
    pen.fill([{ x: x + 1, y: 14 + i * 1.8 }, { x: x + 4, y: 14 + i * 1.8 }, { x: x + 2.5, y: 5 + i * 0.6 }], '#fbf8ef', 1);
  }
  pen.closed(jaw, 1.8, INK);
  pen.dot(26, -8, 2.4, '#0b0e12', 1);
  pen.hair([{ x: 8, y: -4 }, { x: 8, y: 4 }], 1.2, INK, 0.7);
  ctx.restore();
}

/** A woman and two boys, holding hands, as warm silhouettes: his wife and sons. Centred at c, `size` tall. */
export function drawFamily(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, size: number): void {
  const col = '#5b3a2a';
  ctx.save();
  ctx.translate(c.x, c.y + size / 2);
  ctx.scale(size / 100, size / 100);
  const person = (x: number, h: number, dress: boolean): void => {
    const headR = h * 0.12;
    const headY = -h + headR;
    const shoulder = headY + headR * 1.7;
    const body = dress
      ? [{ x: x - h * 0.1, y: shoulder }, { x: x + h * 0.1, y: shoulder }, { x: x + h * 0.22, y: -h * 0.32 }, { x: x + h * 0.2, y: -h * 0.05 }, { x: x - h * 0.2, y: -h * 0.05 }, { x: x - h * 0.22, y: -h * 0.32 }]
      : [{ x: x - h * 0.13, y: shoulder }, { x: x + h * 0.13, y: shoulder }, { x: x + h * 0.14, y: -h * 0.34 }, { x: x + h * 0.14, y: 0 }, { x: x + h * 0.02, y: 0 }, { x: x, y: -h * 0.34 }, { x: x - h * 0.02, y: 0 }, { x: x - h * 0.14, y: 0 }, { x: x - h * 0.14, y: -h * 0.34 }];
    pen.fill(body, col, 1);
    pen.dot(x, headY, headR, col, 1);
    if (dress) pen.dot(x + headR * 0.4, headY - headR * 0.9, headR * 0.6, col, 1);
    pen.closed(body, 1.8, INK);
    pen.circle(x, headY, headR, 1.8, INK);
  };
  person(-30, 74, false);
  person(0, 100, true);
  person(30, 70, false);
  // Hands joined.
  pen.stroke([{ x: -22, y: -42 }, { x: -12, y: -48 }], 3, col, 1, false);
  pen.stroke([{ x: 12, y: -46 }, { x: 22, y: -40 }], 3, col, 1, false);
  ctx.restore();
}

/** Small stars of tenderness around the family: a few warm sparkles. */
export function drawSparkles(ctx: CanvasRenderingContext2D, c: Pt, spread: number, t: number, amount: number): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    const r = spread * (0.8 + 0.25 * Math.sin(i * 3.1));
    const tw = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 1.9);
    ctx.globalAlpha = amount * (0.35 + 0.5 * tw);
    const x = c.x + Math.cos(a) * r;
    const y = c.y + Math.sin(a) * r * 0.8;
    const s = 6 + 5 * tw;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.6);
    ctx.lineTo(x + s * 0.35, y - s * 0.35);
    ctx.lineTo(x + s * 1.6, y);
    ctx.lineTo(x + s * 0.35, y + s * 0.35);
    ctx.lineTo(x, y + s * 1.6);
    ctx.lineTo(x - s * 0.35, y + s * 0.35);
    ctx.lineTo(x - s * 1.6, y);
    ctx.lineTo(x - s * 0.35, y - s * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
