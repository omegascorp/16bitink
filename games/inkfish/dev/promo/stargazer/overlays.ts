import { CAPTION_FONT, drawTextLine } from '../captions';
import { INK, Pen, type Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/fish/kit';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { CHALK, INK_BG } from './scenery';
import { STAMP_HALF_H, TEXT } from './script';

/**
 * Marks over the picture: chalk stars, rings and an arrow for the curious
 * beat, the electric arcs and the diver's hand, "50 V", the glints on the
 * spines, the referee's yellow card and the "UNFAIR!" stamp.
 */

/** A chalk line with a dark halo, so it reads over the water and the fish. */
function chalk(ctx: CanvasRenderingContext2D, draw: () => void, width: number, alpha: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = INK_BG;
  ctx.lineWidth = width * 2.6;
  draw();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = width;
  draw();
  ctx.restore();
}

/** A four-pointed twinkle at `at`, `r` px. */
function twinkle(ctx: CanvasRenderingContext2D, at: Pt, r: number, colour: string, alpha: number): void {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.22;
    const x = at.x + Math.cos(a) * d;
    const y = at.y + Math.sin(a) * d;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const STARS = (() => {
  const rng = createRng(73);
  return Array.from({ length: 9 }, (_, i) => ({ dx: (i / 8 - 0.5) * 700 + rng() * 60, dy: -120 - rng() * 260, r: 14 + rng() * 18, phase: rng() * 6 }));
})();

/** Stars over its upturned eyes: `at` the middle of the crown on screen, `scale` screen px per head px. */
export function drawStars(ctx: CanvasRenderingContext2D, at: Pt, scale: number, amount: number, t: number): void {
  if (amount <= 0) return;
  for (const s of STARS) {
    const tw = 0.6 + 0.4 * Math.sin(t * 9 + s.phase);
    const p = { x: at.x + s.dx * scale, y: at.y + s.dy * scale };
    twinkle(ctx, p, s.r * scale * 1.6 * tw * amount, INK_BG, amount * 0.6);
    twinkle(ctx, p, s.r * scale * tw * amount, '#fff3b8', amount);
  }
}

/** Chalk rings drawn round the two eyes (screen px), `drawn` 0 .. 1 of the way round. */
export function drawRings(ctx: CanvasRenderingContext2D, eyes: readonly Pt[], r: number, drawn: number, alpha: number): void {
  if (alpha <= 0 || drawn <= 0) return;
  eyes.forEach((e, i) => {
    const start = -Math.PI * 0.75 + i * 0.4;
    chalk(ctx, () => {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const a = start + (k / 40) * Math.PI * 2.1 * drawn;
        const rr = r * (1 + 0.06 * Math.sin(a * 3 + i));
        const x = e.x + Math.cos(a) * rr;
        const y = e.y + Math.sin(a) * rr * 0.9;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }, 9, alpha);
  });
}

/** A curved chalk arrow rising from the mouth (screen px) and curling up past the head, `drawn` 0 .. 1. */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, scale: number, drawn: number, alpha: number): void {
  if (alpha <= 0 || drawn <= 0) return;
  const pts: Pt[] = [];
  const n = Math.max(2, Math.round(40 * drawn));
  for (let k = 0; k <= n; k++) {
    const u = (k / 40);
    // Straight up from the mouth between the eyes, with a little wave.
    pts.push({ x: from.x + scale * 34 * Math.sin(u * Math.PI * 2), y: from.y - scale * 330 * u });
  }
  chalk(ctx, () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    if (drawn > 0.9) {
      const tip = pts[pts.length - 1]!;
      const prev = pts[pts.length - 3]!;
      const a = Math.atan2(tip.y - prev.y, tip.x - prev.x);
      const h = 40 * scale + 20;
      ctx.beginPath();
      ctx.moveTo(tip.x + Math.cos(a + 2.5) * h, tip.y + Math.sin(a + 2.5) * h);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x + Math.cos(a - 2.5) * h, tip.y + Math.sin(a - 2.5) * h);
      ctx.stroke();
    }
  }, 11, alpha);
}

/** A jagged electric arc from `a` to `b` (screen px), its kinks set by `rng`. */
function arcPath(a: Pt, b: Pt, rng: () => number, kink: number): Pt[] {
  const n = 7;
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const off = i === 0 || i === n ? 0 : (rng() * 2 - 1) * kink;
    return { x: a.x + (b.x - a.x) * u + (nx / len) * off, y: a.y + (b.y - a.y) * u + (ny / len) * off };
  });
}

/**
 * Arcs crackling round its head: from behind the eyes out into the water,
 * and to the hand's fingertip while it's close. `head(p)` maps head px to
 * the screen. They jump to new shapes 15 times a second.
 */
export function drawArcs(ctx: CanvasRenderingContext2D, head: (p: Pt) => Pt, scale: number, amount: number, t: number, finger: Pt | null): void {
  if (amount <= 0.01) return;
  const rng = createRng(1 + Math.floor(t * 15));
  const bolts: Pt[][] = [];
  const count = Math.round(3 + 5 * amount);
  for (let i = 0; i < count; i++) {
    const s = i % 2 === 0 ? 1 : -1;
    const from = head({ x: s * (rng() * 250), y: -226 });
    const a = -Math.PI / 2 + s * (0.2 + rng() * 1.2);
    const reach = (150 + rng() * 170) * scale;
    bolts.push(arcPath(from, { x: from.x + Math.cos(a) * reach, y: from.y + Math.sin(a) * reach }, rng, 34 * scale));
  }
  if (finger) bolts.push(arcPath(head({ x: 170, y: -226 }), finger, rng, 26 * scale), arcPath(head({ x: 230, y: -212 }), finger, rng, 34 * scale));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, colour, a] of [[26, 'rgba(110,150,255,0.25)', 1], [11, 'rgba(160,210,255,0.6)', 1], [4, 'rgba(255,255,255,0.95)', 1]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * Math.max(0.6, scale);
    ctx.globalAlpha = amount * a;
    for (const b of bolts) {
      ctx.beginPath();
      b.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  // A blue glow round the crown.
  const c = head({ x: 0, y: -230 });
  const g = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, 420 * scale);
  g.addColorStop(0, `rgba(120,160,255,${(0.35 * amount).toFixed(3)})`);
  g.addColorStop(1, 'rgba(120,160,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(c.x - 420 * scale, c.y - 420 * scale, 840 * scale, 840 * scale);
  ctx.restore();
}

/** A capsule (a rounded bar) from `a` to `b`, radius `r`, as a closed outline. */
function capsule(a: Pt, b: Pt, r: number): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = ang + Math.PI / 2 + (i / 10) * Math.PI;
    pts.push({ x: a.x + Math.cos(t) * r, y: a.y + Math.sin(t) * r });
  }
  for (let i = 0; i <= 10; i++) {
    const t = ang - Math.PI / 2 + (i / 10) * Math.PI;
    pts.push({ x: b.x + Math.cos(t) * r, y: b.y + Math.sin(t) * r });
  }
  return pts;
}

/** A diver's gloved hand reaching in from the upper right, its index finger pointing; `tip` the fingertip on screen, `size` px. */
export function drawHand(ctx: CanvasRenderingContext2D, tip: Pt, size: number, boil: number, shock: number): void {
  const pen = new Pen(ctx, 3301 + boil * 977, 1.1);
  const s = size / 100;
  // The arm comes down from the top right corner.
  const turn = -0.62;
  const [c, n] = [Math.cos(turn), Math.sin(turn)];
  const at = (x: number, y: number): Pt => ({ x: tip.x + (x * c - y * n) * s, y: tip.y + (x * n + y * c) * s });
  const part = (shape: Pt[], colour: string): void => {
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, colour, 0.95);
    pen.clipped(shape, () => pen.hatch(shape, 7, 0.9 + turn, 1, { color: '#06101c', alpha: 0.3 }));
    pen.stroke([...shape, shape[0]!], 2.8, INK, 1);
  };
  // The wetsuit sleeve, the glove's cuff.
  part([at(250, -70), at(900, -10), at(900, 190), at(250, 110)], '#1b2533');
  part([at(205, -62), at(275, -70), at(275, 112), at(205, 104)], '#11161f');
  // The fist: curled fingers under, the knuckles, the index finger pointing, the thumb along the top.
  part(capsule(at(150, 58), at(210, 58), 34 * s), '#2e5c8c');
  part(capsule(at(140, 22), at(210, 22), 34 * s), '#3468a0');
  part(capsule(at(130, -16), at(215, -16), 30 * s), '#3a74ae');
  part(capsule(at(18, -14), at(135, -14), 17 * s), '#3e7cb8');
  part(capsule(at(105, -48), at(205, -42), 19 * s), '#356ca4');
  if (shock > 0) {
    // Zig-zag jolt lines off the hand.
    chalk(ctx, () => {
      for (const [dx, dy] of [[60, -80], [150, -110], [220, -40]] as const) {
        ctx.beginPath();
        ctx.moveTo(tip.x + dx * s, tip.y + dy * s);
        ctx.lineTo(tip.x + (dx + 18) * s, tip.y + (dy - 28) * s);
        ctx.lineTo(tip.x + (dx - 6) * s, tip.y + (dy - 44) * s);
        ctx.lineTo(tip.x + (dx + 14) * s, tip.y + (dy - 76) * s);
        ctx.stroke();
      }
    }, 7, shock);
  }
}

/** "50 V" in electric chalk at the top, popping in. */
export function drawVolts(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  if (amount <= 0) return;
  const pop = 0.75 + 0.25 * amount;
  const flicker = 0.85 + 0.15 * Math.sin(t * 47);
  const size = TEXT.volts.size * pop;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(VIDEO.width / 2, TEXT.volts.y - size * 0.35, 20, VIDEO.width / 2, TEXT.volts.y - size * 0.35, size * 1.4);
  g.addColorStop(0, `rgba(120,170,255,${(0.35 * amount * flicker).toFixed(3)})`);
  g.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, TEXT.volts.y - size * 2, VIDEO.width, size * 3);
  ctx.restore();
  // Drawn as chalk strokes, not in the caption font: its bold 5 reads as an "S".
  const h = size * 0.62;
  const x0 = VIDEO.width / 2 - h * 1.25;
  const base = TEXT.volts.y;
  const top = base - h;
  chalk(ctx, () => {
    ctx.beginPath();
    // 5: the bar, the stem, the belly.
    ctx.moveTo(x0 + h * 0.5, top);
    ctx.lineTo(x0 + h * 0.05, top);
    ctx.lineTo(x0, top + h * 0.45);
    ctx.bezierCurveTo(x0 + h * 0.45, top + h * 0.3, x0 + h * 0.62, top + h * 0.6, x0 + h * 0.52, top + h * 0.8);
    ctx.bezierCurveTo(x0 + h * 0.42, base + h * 0.04, x0 + h * 0.08, base + h * 0.02, x0 - h * 0.02, top + h * 0.85);
    ctx.stroke();
    // 0.
    ctx.beginPath();
    ctx.ellipse(x0 + h * 0.98, top + h * 0.5, h * 0.27, h * 0.5, 0.05, 0, Math.PI * 2);
    ctx.stroke();
    // V.
    ctx.beginPath();
    ctx.moveTo(x0 + h * 1.6, top);
    ctx.lineTo(x0 + h * 1.9, base);
    ctx.lineTo(x0 + h * 2.2, top);
    ctx.stroke();
  }, size * 0.09, amount * flicker);
}

/** Glints running along the spines (tips on screen). */
export function drawGlints(ctx: CanvasRenderingContext2D, tips: readonly Pt[], size: number, amount: number, t: number): void {
  if (amount <= 0) return;
  for (const tip of tips) {
    const r = size * amount * (0.8 + 0.2 * Math.sin(t * 20));
    twinkle(ctx, tip, r * 1.5, INK_BG, amount * 0.4);
    twinkle(ctx, tip, r, '#ffffff', amount);
  }
}

/** The referee's yellow card, held up at the top left, a little turned. */
export function drawCard(ctx: CanvasRenderingContext2D, amount: number, boil: number, t: number): void {
  if (amount <= 0) return;
  const pen = new Pen(ctx, 5501 + boil * 977, 1);
  const pop = 0.6 + 0.4 * amount;
  const cx = 215;
  const cy = 560 + 6 * Math.sin(t * 5);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.scale(pop, pop);
  const card = [{ x: -78, y: -112 }, { x: 78, y: -112 }, { x: 78, y: 112 }, { x: -78, y: 112 }];
  pen.fill(card.map((p) => ({ x: p.x + 8, y: p.y + 10 })), INK_BG, 0.5);
  pen.fill(card, '#f6cf2c', 1);
  pen.clipped(card, () => pen.hatch(card, 10, 0.9, 1, { color: '#b88a10', alpha: 0.35, onlyBelow: 40 }));
  pen.stroke([...card, card[0]!], 3.2, INK, 1);
  // Fingers gripping its bottom.
  for (let k = 0; k < 3; k++) {
    const f = [{ x: -50 + k * 30, y: 85 }, { x: -24 + k * 30, y: 85 }, { x: -24 + k * 30, y: 140 }, { x: -50 + k * 30, y: 140 }];
    pen.fill(f, '#d8a27c', 1);
    pen.stroke([...f, f[0]!], 2.2, INK, 1);
  }
  ctx.restore();
}

/** The "UNFAIR!" stamp: red ink in a double box, slammed down a little crooked. */
export function drawStamp(ctx: CanvasRenderingContext2D, amount: number, scale: number): void {
  if (amount <= 0) return;
  const { x, y, size } = TEXT.stamp;
  ctx.save();
  ctx.translate(x, y - size * 0.35);
  ctx.rotate(-0.16);
  ctx.scale(scale, scale);
  ctx.globalAlpha = amount * (scale > 1.05 ? 0.6 : 1);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText('UNFAIR!').width + size * 0.5;
  const h = size * STAMP_HALF_H * 2;
  ctx.lineJoin = 'round';
  for (const [colour, width] of [[INK_BG, 22], ['#e0322a', 10]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = width * 0.5;
    ctx.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32);
  }
  ctx.restore();
  ctx.save();
  ctx.translate(x, y - size * 0.35);
  ctx.rotate(-0.16);
  ctx.scale(scale, scale);
  drawTextLine(ctx, 'UNFAIR!', 0, size * 0.35, size, 700, amount * (scale > 1.05 ? 0.6 : 1), { fill: '#ff3b30', halo: INK_BG });
  ctx.restore();
}
