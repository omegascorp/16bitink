import { ellipse, INK, PAPER, type Pen } from '../../../../src/art/pen';
import { CAPTION_FONT } from '../../captions';
import { boilOf, paint, penFor, type Pt, spline, trace } from './ink';

/**
 * The small things, in the same pen: what the tiger shark had inside it (two
 * cans, a plastic bottle, two burlap sacks), the crocodile's stones, the
 * Greenland shark's reindeer antlers, polar bear jaw and scrap of moose hide,
 * a trash-can lid, a school bus, a seal, a grape, a film frame and the 1891
 * newspaper clipping. Each is drawn about its middle, `size` px across.
 */

type Draw = (ctx: CanvasRenderingContext2D, pen: Pen, s: number) => void;

function place(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, seed: number, draw: Draw): void {
  if (size < 2) return;
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  draw(ctx, penFor(ctx, seed, boilOf(t), Math.max(0.4, 0.9 / s)), s);
  ctx.restore();
}

const box = (w: number, h: number, r = 0): Pt[] => (r > 0
  ? spline([{ x: -w / 2 + r, y: -h / 2 }, { x: w / 2 - r, y: -h / 2 }, { x: w / 2, y: -h / 2 + r }, { x: w / 2, y: h / 2 - r }, { x: w / 2 - r, y: h / 2 }, { x: -w / 2 + r, y: h / 2 }, { x: -w / 2, y: h / 2 - r }, { x: -w / 2, y: -h / 2 + r }], 3, true)
  : [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }]);

/** A tin can, a little dented, its label in `colour`. */
export function drawCan(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, colour = '#c8452c'): void {
  place(ctx, x, y, size, angle, t, 11, (c, pen, s) => {
    const body = [{ x: -34, y: -48 }, { x: 34, y: -48 }, { x: 36, y: 10 }, { x: 30, y: 22 }, { x: 34, y: 48 }, { x: -34, y: 48 }, { x: -36, y: 0 }];
    paint(c, pen, body, { from: { x: -36, y: 0 }, to: { x: 36, y: 0 }, stops: ['#9aa3a8', '#e7ecee', '#8b9297', '#4c5257'], ink: 2.4 / Math.max(0.5, s), hatch: 0, mottle: 0.3, seed: 3 });
    pen.fill([{ x: -35, y: -24 }, { x: 35, y: -24 }, { x: 35, y: 20 }, { x: -35, y: 20 }], colour, 0.85);
    pen.hair([{ x: -20, y: -4 }, { x: 18, y: -4 }], 3, PAPER, 0.8);
    pen.fill(ellipse(0, -48, 34, 8, 16), '#d9dee0', 1);
    pen.stroke([...ellipse(0, -48, 34, 8, 16), ellipse(0, -48, 34, 8, 16)[0]!], 2.2, INK, 1, false);
  });
}

/** A plastic bottle, pale blue, cap on. */
export function drawBottle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 12, (c, pen, s) => {
    const body = spline([{ x: -8, y: -50 }, { x: 8, y: -50 }, { x: 9, y: -40 }, { x: 22, y: -22 }, { x: 22, y: 46 }, { x: 0, y: 50 }, { x: -22, y: 46 }, { x: -22, y: -22 }, { x: -9, y: -40 }], 3, true);
    paint(c, pen, body, { from: { x: -22, y: 0 }, to: { x: 22, y: 0 }, stops: ['rgba(180,220,235,0.9)', 'rgba(235,250,255,0.85)', 'rgba(120,170,195,0.9)'], ink: 2.2 / Math.max(0.5, s), hatch: 0, mottle: 0 });
    pen.fill(box(18, 12).map((p) => ({ x: p.x, y: p.y - 54 })), '#2f6db0', 1);
    pen.fill(box(44, 22).map((p) => ({ x: p.x, y: p.y + 6 })), '#e9e4d2', 0.9);
    pen.hair([{ x: -12, y: 6 }, { x: 12, y: 6 }], 2, '#2f6db0', 0.9);
  });
}

/** A burlap sack, tied at the neck, its weave hatched. */
export function drawSack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 13, (c, pen) => {
    const body = spline([{ x: -10, y: -40 }, { x: 10, y: -40 }, { x: 34, y: -10 }, { x: 40, y: 30 }, { x: 22, y: 48 }, { x: -22, y: 48 }, { x: -40, y: 28 }, { x: -32, y: -10 }], 4, true);
    paint(c, pen, body, { from: { x: -40, y: -40 }, to: { x: 40, y: 48 }, stops: ['#d8b984', '#b8925a', '#7d5d34'], ink: 2.4, hatch: 6, hatchAlpha: 0.25, mottle: 0.8, seed: 9 });
    pen.clipped(body, () => pen.hatch(body, 7, 0.6, 0.8, { color: '#5b4021', alpha: 0.35 }));
    pen.fill(spline([{ x: -14, y: -44 }, { x: -18, y: -60 }, { x: 0, y: -52 }, { x: 18, y: -62 }, { x: 14, y: -44 }], 3, true), '#c9a56c', 1);
    pen.stroke([{ x: -12, y: -42 }, { x: 12, y: -42 }], 4, '#6b4a24', 1, false);
  });
}

/** A rounded stone, grey with a pale fleck. */
export function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number, seed = 1): void {
  place(ctx, x, y, size, angle, t, 20 + seed, (c, pen) => {
    const r = (k: number): number => 44 + 8 * Math.sin(k * 2.3 + seed) + 4 * Math.sin(k * 5 + seed * 2);
    const body = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return { x: Math.cos(a) * r(a), y: Math.sin(a) * r(a) * 0.78 };
    });
    paint(c, pen, body, { from: { x: -30, y: -40 }, to: { x: 30, y: 40 }, stops: ['#b9b6ad', '#8a8780', '#4f4d49'], ink: 2.4, hatch: 7, hatchAlpha: 0.25, mottle: 0.8, seed: 17 + seed });
    pen.dot(-12, -14, 5, '#e6e2d6', 0.6);
  });
}

/** A pair of reindeer antlers. */
export function drawAntlers(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 14, (c, pen) => {
    const beam = (side: 1 | -1): Pt[][] => {
      const main = spline([{ x: side * 6, y: 40 }, { x: side * 16, y: 10 }, { x: side * 34, y: -16 }, { x: side * 40, y: -40 }, { x: side * 30, y: -56 }], 4);
      const tines = [
        [{ x: side * 14, y: 18 }, { x: side * 2, y: 0 }, { x: side * -4, y: -8 }],
        [{ x: side * 30, y: -10 }, { x: side * 46, y: -18 }, { x: side * 52, y: -28 }],
        [{ x: side * 38, y: -36 }, { x: side * 24, y: -44 }],
        [{ x: side * 36, y: -48 }, { x: side * 48, y: -58 }],
      ];
      return [main, ...tines.map((p) => spline(p, 3))];
    };
    for (const side of [1, -1] as const) {
      for (const p of beam(side)) {
        c.save();
        c.lineCap = 'round';
        c.strokeStyle = INK;
        c.lineWidth = 11;
        trace(c, p, false);
        c.stroke();
        c.strokeStyle = '#c9b08a';
        c.lineWidth = 7;
        trace(c, p, false);
        c.stroke();
        c.restore();
      }
    }
    pen.fill(ellipse(0, 42, 12, 7, 12), '#e1d6bd', 1);
  });
}

/** A small curved piece of jawbone with a few teeth. */
export function drawJawbone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 15, (c, pen) => {
    const bone = spline([{ x: -48, y: 10 }, { x: -20, y: 18 }, { x: 20, y: 16 }, { x: 46, y: 0 }, { x: 44, y: 18 }, { x: 18, y: 34 }, { x: -24, y: 34 }, { x: -50, y: 24 }], 3, true);
    paint(c, pen, bone, { from: { x: 0, y: 0 }, to: { x: 0, y: 34 }, stops: ['#f1e9d2', '#d6c9a6', '#a99a74'], ink: 2.2, hatch: 0, mottle: 0.5 });
    for (let i = 0; i < 4; i++) {
      const bx = -34 + i * 20;
      pen.fill([{ x: bx - 6, y: 14 }, { x: bx, y: -8 - (i === 1 ? 8 : 0) }, { x: bx + 6, y: 14 }], '#fbf6e6', 1);
      pen.hair([{ x: bx - 6, y: 14 }, { x: bx, y: -8 - (i === 1 ? 8 : 0) }, { x: bx + 6, y: 14 }], 1.5, INK, 0.9);
    }
  });
}

/** A ragged scrap of moose hide, hairy brown. */
export function drawHide(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 16, (c, pen) => {
    const hide = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const r = 40 + 10 * Math.sin(a * 3) + 6 * Math.sin(a * 7);
      return { x: Math.cos(a) * r * 1.2, y: Math.sin(a) * r * 0.7 };
    });
    paint(c, pen, hide, { from: { x: 0, y: -30 }, to: { x: 0, y: 30 }, stops: ['#6b4b33', '#4a3221', '#2b1d13'], ink: 2.2, hatch: 4, hatchAlpha: 0.4, mottle: 0.8, seed: 21 });
    for (let i = 0; i < 18; i++) pen.hair([{ x: -40 + i * 4.6, y: -10 + (i % 3) * 8 }, { x: -36 + i * 4.6, y: -24 + (i % 3) * 8 }], 1.2, '#a0805c', 0.7);
  });
}

/** A seal, side on, as a dark silhouette from below (the great white's prey, never touched). */
export function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 17, (c, pen) => {
    const body = spline([{ x: 52, y: -2 }, { x: 40, y: -10 }, { x: 10, y: -14 }, { x: -30, y: -10 }, { x: -50, y: -4 }, { x: -62, y: -12 }, { x: -66, y: 0 }, { x: -62, y: 12 }, { x: -50, y: 4 }, { x: -20, y: 12 }, { x: 20, y: 12 }, { x: 46, y: 6 }], 3, true);
    paint(c, pen, body, { from: { x: 0, y: -14 }, to: { x: 0, y: 12 }, stops: ['#1a1d22', '#2c3138', '#4a5058'], ink: 2, hatch: 0, mottle: 0.3 });
    const flip = Math.sin(t * 6) * 6;
    pen.fill([{ x: 8, y: 8 }, { x: -6, y: 22 + flip }, { x: 14, y: 12 }], '#1a1d22', 1);
  });
}

/** A single grape, for "like a bad grape". */
export function drawGrape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, t: number): void {
  place(ctx, x, y, size, angle, t, 18, (c, pen) => {
    const g = ellipse(0, 6, 34, 40, 20);
    paint(c, pen, g, { from: { x: -20, y: -30 }, to: { x: 20, y: 40 }, stops: ['#b58ad6', '#6d3e95', '#3a1f55'], ink: 2.4, hatch: 0, mottle: 0.4 });
    pen.dot(-12, -10, 7, '#f3e6ff', 0.75);
    pen.stroke([{ x: 0, y: -34 }, { x: 4, y: -48 }, { x: 14, y: -54 }], 4, '#5a7a2c', 1, false);
  });
}

/** A trash-can lid, seen face on, as a dashed outline with its handle: the grouper's mouth. */
export function drawLid(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = Math.max(3, size * 0.02);
  ctx.setLineDash([size * 0.06, size * 0.04]);
  ctx.beginPath();
  ctx.ellipse(x, y, size / 2, size / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.4, size * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.roundRect(x - size * 0.14, y - size * 0.04, size * 0.28, size * 0.08, size * 0.04);
  ctx.stroke();
  ctx.restore();
}

/** A school bus, side on, as a pale inked outline (behind the whale shark): `length` px, its wheels on y. */
export function drawBus(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, alpha: number): void {
  if (alpha <= 0) return;
  const h = length * 0.27;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,205,60,0.18)';
  ctx.strokeStyle = 'rgba(255,214,90,0.95)';
  ctx.lineWidth = Math.max(3, length * 0.005);
  ctx.setLineDash([length * 0.02, length * 0.012]);
  ctx.beginPath();
  ctx.roundRect(x - length / 2, y - h, length, h * 0.86, h * 0.08);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const wx = x - length / 2 + length * (0.1 + i * 0.085);
    ctx.strokeRect(wx, y - h * 0.86, length * 0.06, h * 0.3);
  }
  ctx.setLineDash([]);
  for (const wx of [x - length * 0.3, x + length * 0.3]) {
    ctx.beginPath();
    ctx.arc(wx, y - h * 0.12, h * 0.13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A strip of film round a rectangle: sprocket holes top and bottom. `tear` 0 .. 1 rips it off to the side. */
export function drawFilmFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, tear: number): void {
  if (alpha <= 0) return;
  const band = 54;
  ctx.save();
  ctx.globalAlpha = alpha * (1 - tear);
  ctx.translate(tear * 900, tear * -160);
  ctx.rotate(tear * 0.5);
  ctx.fillStyle = '#121214';
  for (const yy of [y - band, y + h]) {
    ctx.fillRect(x - 20, yy, w + 40, band);
    ctx.fillStyle = '#e8e0cc';
    for (let k = x; k < x + w; k += 56) {
      ctx.beginPath();
      ctx.roundRect(k, yy + 14, 30, band - 28, 5);
      ctx.fill();
    }
    ctx.fillStyle = '#121214';
  }
  ctx.fillRect(x - 20, y, 20, h);
  ctx.fillRect(x + w, y, 20, h);
  ctx.restore();
}

/** The sepia clipping: "SWALLOWED BY A WHALE!", 1891, a sailor's name, columns of print. */
export function drawClipping(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const h = w * 0.72;
  const pen = penFor(ctx, 1891, boilOf(t), 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.04);
  const edge = Array.from({ length: 40 }, (_, i) => {
    const u = i / 40;
    const side = Math.floor(u * 4);
    const f = (u * 4) % 1;
    const j = 6 * Math.sin(i * 7.3);
    if (side === 0) return { x: -w / 2 + f * w, y: -h / 2 + j * 0.5 };
    if (side === 1) return { x: w / 2 + j * 0.5, y: -h / 2 + f * h };
    if (side === 2) return { x: w / 2 - f * w, y: h / 2 + j * 0.5 };
    return { x: -w / 2 + j * 0.5, y: h / 2 - f * h };
  });
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  paint(ctx, pen, edge, { from: { x: -w / 2, y: -h / 2 }, to: { x: w / 2, y: h / 2 }, stops: ['#ead7ae', '#d8bd88', '#b8955c'], ink: 2, hatch: 0, mottle: 1, seed: 1891 });
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#3a2a18';
  ctx.textAlign = 'center';
  ctx.font = `700 ${w * 0.05}px Georgia, serif`;
  ctx.fillText('— AUGUST 1891 —', 0, -h / 2 + w * 0.08);
  ctx.fillRect(-w * 0.44, -h / 2 + w * 0.1, w * 0.88, 3);
  ctx.font = `700 ${w * 0.085}px ${CAPTION_FONT}`;
  ctx.fillText('SWALLOWED BY A WHALE!', 0, -h / 2 + w * 0.2);
  ctx.font = `500 ${w * 0.045}px Georgia, serif`;
  ctx.fillText('Sailor James Bartley found alive inside', 0, -h / 2 + w * 0.27);
  // Columns of print, as grey lines.
  ctx.fillStyle = 'rgba(58,42,24,0.45)';
  for (let col = 0; col < 3; col++) {
    for (let r = 0; r < 9; r++) {
      const lx = -w * 0.43 + col * w * 0.3;
      const len = w * (0.24 - (r % 4 === 3 ? 0.08 : 0));
      ctx.fillRect(lx, -h / 2 + w * 0.33 + r * w * 0.035, len, w * 0.012);
    }
  }
  ctx.restore();
}
