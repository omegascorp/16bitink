import { ellipse, INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { CHALK, INK_BG, SPOKEN } from './scene';
import { TEXT } from './script';
import { type WhalePose } from './story';
import { drawOneKrill, drawWhaleBack, drawWhaleFront } from './whale';

/**
 * The props that echo the narration: the parachute that pops open beside
 * the ballooning throat, the giant balance (the whale on one pan, its gulp of
 * water on the other), the numbers, and the stack of burgers for the calories.
 * All drawn in screen px.
 */

const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };
const GOLD_ON_INK: TextInk = { fill: SPOKEN, halo: INK_BG };

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// ---------------------------------------------------------------- the parachute

const GORES = 7;

/** A parachute, canopy centre at `c`, `r` across half its width, popped open by `pop` (over 1: overshooting). */
export function drawParachute(ctx: CanvasRenderingContext2D, c: Pt, r: number, pop: number, sway: number, boil: number): void {
  if (pop <= 0.01) return;
  const pen = new Pen(ctx, 610 + boil * 37, 1.2);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(sway);
  // It billows out: wide before tall.
  ctx.scale(pop * (1 + 0.15 * (1 - Math.min(1, pop))), pop);
  ctx.globalAlpha = Math.min(1, pop * 1.5);
  const ry = r * 0.78;
  const rimY = 16;
  const edge = (i: number): number => -r + (2 * r * i) / GORES;
  // The skirt scallops up between the lines.
  const skirt = range(GORES * 8, (u) => ({ x: r - 2 * r * u, y: rimY - 22 * Math.abs(Math.sin(u * GORES * Math.PI)) }));
  const dome = range(40, (u) => ({ x: -r * Math.cos(Math.PI * u), y: rimY - (ry + rimY) * Math.sin(Math.PI * u) ** 0.85 }));
  const canopy = [...dome, ...skirt];
  const load = { x: 0, y: r * 1.55 };
  // The lines, behind the canopy.
  for (let i = 0; i <= GORES; i++) pen.hair([{ x: edge(i) * 0.98, y: rimY }, load], 1.8, '#e9e2d2', 0.85);
  // Gores, red and paper in turn, each a wedge from the crown curving out to the skirt.
  pen.clipped(canopy, () => {
    for (let i = 0; i < GORES; i++) {
      const x0 = edge(i);
      const x1 = edge(i + 1);
      ctx.fillStyle = i % 2 ? '#f1e8d6' : '#d9483a';
      ctx.beginPath();
      ctx.moveTo(0, -ry);
      ctx.quadraticCurveTo(x0 * 1.25, -ry * 0.75, x0, rimY + 10);
      ctx.lineTo(x1, rimY + 10);
      ctx.quadraticCurveTo(x1 * 1.25, -ry * 0.75, 0, -ry);
      ctx.closePath();
      ctx.fill();
    }
    const g = ctx.createLinearGradient(-r, -ry, r, rimY);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,20,40,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(-r - 10, -ry - 10, 2 * r + 20, ry + 50);
    pen.hatch([{ x: r * 0.25, y: -ry }, { x: r, y: -ry }, { x: r, y: 30 }, { x: r * 0.25, y: 30 }], 9, 1.0, 1, { color: INK, alpha: 0.22 });
  });
  for (let i = 1; i < GORES; i++) {
    const x = edge(i);
    pen.hair([{ x: 0, y: -ry }, { x: x * 1.0, y: -ry * 0.62 }, { x, y: rimY - 6 }], 1.8, INK, 0.55);
  }
  pen.stroke([...canopy, canopy[0]!], 3.2, INK);
  // A little crate on the lines.
  const box = [{ x: -26, y: load.y }, { x: 26, y: load.y }, { x: 26, y: load.y + 44 }, { x: -26, y: load.y + 44 }];
  pen.fill(box, '#b07a44', 1);
  pen.hair([{ x: -26, y: load.y + 22 }, { x: 26, y: load.y + 22 }], 2, INK, 0.6);
  pen.closed(box, 2.6, INK);
  ctx.restore();
}

// ---------------------------------------------------------------- the balance

const PIVOT: Pt = { x: 540, y: 590 };
const BEAM = 300;
const DROP = 280;
const PAN_W = 165;
const BRASS = ['#f0cf7a', '#c9963f', '#8a5f22'] as const;

/** Where a pan hangs (its rim's centre) for the beam's tilt; `side` -1 left, 1 right. */
function panAt(tilt: number, side: -1 | 1): Pt {
  return { x: PIVOT.x + side * BEAM * Math.cos(tilt), y: PIVOT.y + side * BEAM * Math.sin(tilt) + DROP };
}

function brass(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], from: Pt, to: Pt, ink = 3): void {
  const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  BRASS.forEach((c, i) => g.addColorStop(i / (BRASS.length - 1), c));
  pen.fill(outline, '#000', 0);
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.clipped(outline, () => pen.hatch(outline, 8, 2.2, 1, { color: '#3a2508', alpha: 0.25 }));
  pen.stroke([...outline, outline[0]!], ink, INK);
}

/** A pan: a shallow brass dish, hung on three chains from the beam's end. */
function drawPan(ctx: CanvasRenderingContext2D, pen: Pen, end: Pt, pan: Pt): void {
  for (const dx of [-PAN_W * 0.92, 0, PAN_W * 0.92]) pen.hair([end, { x: pan.x + dx, y: pan.y }], 2.6, '#d8b46a', 0.95);
  const dish = [...range(16, (u) => ({ x: pan.x - PAN_W + 2 * PAN_W * u, y: pan.y + 46 * Math.sin(Math.PI * u) }))];
  brass(ctx, pen, dish, { x: pan.x, y: pan.y - 10 }, { x: pan.x, y: pan.y + 50 });
  pen.stroke([{ x: pan.x - PAN_W, y: pan.y }, { x: pan.x + PAN_W, y: pan.y }], 4, INK);
}

/** The gulp: a great wobbling blob of sea water, krill caught in it, its outline trembling. */
function drawWaterBlob(ctx: CanvasRenderingContext2D, pen: Pen, base: Pt, squash: number, t: number, boil: number): void {
  const rx = 158 * (1 + squash);
  const ry = 138 * (1 - squash);
  const c = { x: base.x, y: base.y - ry * 0.92 };
  const rng = createRng(31 + boil);
  const outline = range(48, (u) => {
    const a = u * Math.PI * 2;
    const wob = 1 + 0.035 * Math.sin(a * 3 + t * 5) + 0.02 * Math.sin(a * 5 - t * 7) + (rng() - 0.5) * 0.01;
    // Flattened where it sits on the pan.
    const y = Math.sin(a) * ry * wob;
    return { x: c.x + Math.cos(a) * rx * wob, y: c.y + (y > ry * 0.8 ? ry * 0.8 + (y - ry * 0.8) * 0.3 : y) };
  });
  const g = ctx.createRadialGradient(c.x - rx * 0.3, c.y - ry * 0.4, 10, c.x, c.y, rx * 1.1);
  g.addColorStop(0, 'rgba(170,225,255,0.95)');
  g.addColorStop(0.5, 'rgba(60,150,215,0.9)');
  g.addColorStop(1, 'rgba(18,70,140,0.95)');
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const krng = createRng(99);
  for (let i = 0; i < 46; i++) {
    const kx = c.x + (krng() - 0.5) * rx * 1.6;
    const ky = c.y + (krng() - 0.5) * ry * 1.5;
    drawOneKrill(ctx, { x: kx + 4 * Math.sin(t * 3 + i), y: ky }, krng() * 6.3, 0.9, 0.85);
  }
  pen.hatch(outline, 10, 2.4, 1, { color: '#06203f', alpha: 0.18 });
  ctx.restore();
  pen.fill(ellipse(c.x - rx * 0.38, c.y - ry * 0.45, rx * 0.22, ry * 0.12, 16), '#ffffff', 0.5);
  pen.fill(ellipse(c.x - rx * 0.1, c.y - ry * 0.62, rx * 0.08, ry * 0.05, 10), '#ffffff', 0.6);
  pen.stroke([...outline, outline[0]!], 3.4, INK);
}

export interface BalanceState {
  readonly tilt: number;
  /** The water's fall: 0 high above .. 1 on the pan, and its squash. */
  readonly fall: number;
  readonly squash: number;
  readonly zoom: number;
  readonly whale: WhalePose;
}

/** The balance under a spotlight: the whale on the left pan, its gulp of water on the right, the water's side down. */
export function drawBalance(ctx: CanvasRenderingContext2D, s: BalanceState, t: number, boil: number): void {
  const pen = new Pen(ctx, 4100 + boil * 53, 1.3);
  ctx.save();
  ctx.translate(540, 760);
  ctx.scale(s.zoom, s.zoom);
  ctx.translate(-540, -760);
  // The spotlight from far above.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cone = ctx.createLinearGradient(0, 0, 0, 1300);
  cone.addColorStop(0, 'rgba(150,200,255,0.22)');
  cone.addColorStop(1, 'rgba(150,200,255,0.02)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(400, -40);
  ctx.lineTo(680, -40);
  ctx.lineTo(1060, 1260);
  ctx.lineTo(20, 1260);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The stand: a stepped plinth and a column up to the pivot.
  brass(ctx, pen, [{ x: 410, y: 1110 }, { x: 670, y: 1110 }, { x: 640, y: 1070 }, { x: 440, y: 1070 }], { x: 410, y: 1070 }, { x: 670, y: 1110 });
  brass(ctx, pen, [{ x: 522, y: 1072 }, { x: 558, y: 1072 }, { x: 550, y: PIVOT.y + 10 }, { x: 530, y: PIVOT.y + 10 }], { x: 522, y: 900 }, { x: 558, y: 900 });
  const left = { x: PIVOT.x - BEAM * Math.cos(s.tilt), y: PIVOT.y - BEAM * Math.sin(s.tilt) };
  const right = { x: PIVOT.x + BEAM * Math.cos(s.tilt), y: PIVOT.y + BEAM * Math.sin(s.tilt) };
  const lp = panAt(s.tilt, -1);
  const rp = panAt(s.tilt, 1);
  // The whale lies on its pan; the water sits (or falls) onto the other.
  const whale = { ...s.whale, x: lp.x + 437 * s.whale.scale, y: lp.y - 112 * s.whale.scale - 2 };
  drawWhaleBack(ctx, whale, boil);
  drawWhaleFront(ctx, whale, boil);
  drawPan(ctx, pen, left, lp);
  const waterBase = { x: rp.x, y: rp.y + 4 - 1100 * (1 - s.fall) };
  drawPan(ctx, pen, right, rp);
  drawWaterBlob(ctx, pen, waterBase, s.squash, t, boil);
  // The beam over the chains, with a pointer at the pivot.
  const n = { x: -Math.sin(s.tilt), y: Math.cos(s.tilt) };
  const beam = [
    { x: left.x - n.x * 9, y: left.y - n.y * 9 }, { x: right.x - n.x * 9, y: right.y - n.y * 9 },
    { x: right.x + n.x * 9, y: right.y + n.y * 9 }, { x: left.x + n.x * 9, y: left.y + n.y * 9 },
  ];
  brass(ctx, pen, beam, { x: PIVOT.x - n.x * 9, y: PIVOT.y - n.y * 9 }, { x: PIVOT.x + n.x * 9, y: PIVOT.y + n.y * 9 });
  const tip = { x: PIVOT.x + n.x * -90, y: PIVOT.y + n.y * -90 };
  pen.stroke([PIVOT, tip], 5, INK);
  pen.dot(PIVOT.x, PIVOT.y, 15, BRASS[1], 1);
  pen.circle(PIVOT.x, PIVOT.y, 15, 3, INK);
  ctx.restore();
}

// ---------------------------------------------------------------- numbers

const fmt = (n: number): string => n.toLocaleString('en-US');

/** "≈ 400,000 lb" and "(180 t)" under it, popping as they land. */
export function drawPounds(ctx: CanvasRenderingContext2D, p: { readonly shown: number; readonly value: number; readonly unit: number; readonly pop: number }): void {
  if (p.shown <= 0) return;
  const k = 1 + p.pop;
  drawTextLine(ctx, `≈ ${fmt(p.value)} lb`, VIDEO.width / 2, TEXT.pounds.y, TEXT.pounds.size * k, 700, p.shown, GOLD_ON_INK);
  drawTextLine(ctx, '(180 t)', VIDEO.width / 2, TEXT.tonnes.y, TEXT.tonnes.size * k, 700, p.shown * p.unit, PAPER_ON_INK);
}

/** "≈ 450,000" racing up, "calories" under it. */
export function drawCalories(ctx: CanvasRenderingContext2D, c: { readonly shown: number; readonly value: number; readonly pop: number }): void {
  if (c.shown <= 0) return;
  const k = 1 + c.pop;
  drawTextLine(ctx, `≈ ${fmt(c.value)}`, VIDEO.width / 2, TEXT.calories.y, TEXT.calories.size * k, 700, c.shown, GOLD_ON_INK);
  drawTextLine(ctx, 'calories', VIDEO.width / 2, TEXT.caloriesUnit.y, TEXT.caloriesUnit.size * k, 700, c.shown, PAPER_ON_INK);
}

// ---------------------------------------------------------------- burgers

const BURGER_W = 150;
const BURGER_H = 58;

/** One burger, its base's middle at `p`. */
function drawBurger(ctx: CanvasRenderingContext2D, pen: Pen, p: Pt, lean: number): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(lean);
  const w = BURGER_W / 2;
  const bottom = [{ x: -w, y: -14 }, { x: w, y: -14 }, { x: w - 6, y: -2 }, { x: -w + 6, y: -2 }];
  pen.fill(bottom, '#d99a4e', 1);
  pen.closed(bottom, 2.2, INK);
  const patty = range(12, (u) => ({ x: -w - 4 + (2 * w + 8) * u, y: -26 + 2 * Math.sin(u * 20) }));
  const pattyShape = [...patty, { x: w + 2, y: -14 }, { x: -w - 2, y: -14 }];
  pen.fill(pattyShape, '#6b3a22', 1);
  pen.stroke([...pattyShape, pattyShape[0]!], 2.2, INK);
  const cheese = [{ x: -w + 2, y: -28 }, { x: w - 2, y: -28 }, { x: w - 14, y: -18 }, { x: w - 30, y: -26 }, { x: -10, y: -16 }, { x: -24, y: -26 }, { x: -w + 6, y: -20 }];
  pen.fill(cheese, '#f2c33a', 1);
  const lettuce = range(14, (u) => ({ x: -w - 6 + (2 * w + 12) * u, y: -30 + 4 * Math.sin(u * Math.PI * 7) }));
  pen.stroke(lettuce, 5, '#5aa04a', 0.95);
  const top = range(16, (u) => ({ x: -w + 2 * w * u, y: -32 - 26 * Math.sin(Math.PI * u) ** 0.6 }));
  const bun = [...top, { x: w, y: -30 }, { x: -w, y: -30 }];
  pen.fill(bun, '#e0a456', 1);
  pen.fill(range(10, (u) => ({ x: -w * 0.6 + w * 1.0 * u, y: -48 - 6 * Math.sin(Math.PI * u) })), '#f2c98a', 0.6);
  for (const [x, y] of [[-34, -46], [-8, -52], [18, -50], [40, -42], [-50, -38], [4, -42]] as const) pen.dot(x, y, 2.6, '#fbf1d8', 1);
  pen.stroke([...bun, bun[0]!], 2.6, INK);
  ctx.restore();
}

/** The stack, `count` burgers (the last one dropping in), its foot at `base`. */
export function drawBurgers(ctx: CanvasRenderingContext2D, base: Pt, count: number, alpha: number, boil: number): void {
  if (alpha <= 0 || count <= 0) return;
  const pen = new Pen(ctx, 880 + boil * 41, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  const whole = Math.floor(count);
  for (let i = 0; i <= whole; i++) {
    const f = i < whole ? 1 : count - whole;
    if (f <= 0) break;
    const y = base.y - i * BURGER_H - 260 * (1 - f) ** 2;
    const lean = 0.05 * Math.sin(i * 2.3);
    ctx.globalAlpha = alpha * Math.min(1, f * 3);
    drawBurger(ctx, pen, { x: base.x + 8 * Math.sin(i * 1.7), y }, lean);
  }
  ctx.restore();
}

export { CHALK };
