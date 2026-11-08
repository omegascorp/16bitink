import { createRng } from '../logic/rng';
import { bezier, closed, oval, pt, TAU } from './kit';
import { BLUE, INK, PAPER_FILL, RED } from './palette';
import { Pen, type Pt } from './pen';
import { bloom, castShadow, deckle, innerShadow, roundRect } from './uiArt';
import { rgba } from './wash';

/**
 * The interface's painted parts: button plates, their icons, the bar's
 * groove and the vine that grows along it, the sockets lives sit in,
 * ink blots and a rubber stamp. Each paints with its origin at the
 * top-left of a canvas a little bigger than the part (see the *_PAD
 * constants); `res` is texture px per unit, for canvas shadows.
 */

/** Room round a button plate for its wobble and contour, units. */
export const PLATE_PAD = 5;
/** Room round a button's cast shadow for its blur, units. */
export const SHADOW_PAD = 12;
/** Room round the bar's groove, units. */
export const GROOVE_PAD = 5;

export type PlateKind = 'leaf' | 'paper' | 'sky';

const PLATES: Readonly<Record<PlateKind, { top: string; bottom: string; blooms: readonly string[]; rim: string; shine: number }>> = {
  leaf: { top: '#b4d58f', bottom: '#72a257', blooms: ['#cfe6a6', '#5d8f47', '#a8cf86'], rim: '#3d6a32', shine: 0.5 },
  paper: { top: '#fffaf0', bottom: '#eee2c4', blooms: ['#f6ead0', '#e2d0a6', '#dfe6cf'], rim: '#b49867', shine: 0.2 },
  sky: { top: '#b7cfea', bottom: '#7398cc', blooms: ['#cfdff0', '#5f86c0', '#a9c2e4'], rim: '#2f4f8f', shine: 0.45 },
};

/** Corner radius for a button h tall. */
export const plateRadius = (h: number): number => Math.min(h * 0.38, 20);

/** A plate's outline: a rounded rectangle, or a circle when w = h and round. */
function plateShape(seed: number, w: number, h: number, round: boolean): Pt[] {
  const rng = createRng(seed);
  const base = round ? oval(PLATE_PAD + w / 2, PLATE_PAD + h / 2, w / 2, h / 2, 40) : roundRect(PLATE_PAD, PLATE_PAD, w, h, plateRadius(h), 4);
  return deckle(rng, base, 0.55, 0);
}

/**
 * A button's plate, w × h at PLATE_PAD: paper under a graded watercolour
 * wash printed a touch off-register, granulation, a pooled rim, a
 * dry-brush shine along the top, hatching in the shadow side and a pen
 * contour.
 */
export function paintPlate(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, kind: PlateKind, round = false): void {
  const c = PLATES[kind];
  const pen = new Pen(ctx, seed, 0.45);
  const { rng } = pen;
  const shape = plateShape(seed, w, h, round);
  const [x, y] = [PLATE_PAD, PLATE_PAD];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.translate(1.2, 0.8);
    const g = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
    g.addColorStop(0, c.top);
    g.addColorStop(1, c.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.translate(-1.2, -0.8);
    for (let i = 0; i < 4; i++) bloom(ctx, x + w * rng(), y + h * (0.2 + rng() * 0.7), Math.max(w, h) * (0.18 + rng() * 0.22), c.blooms[i % c.blooms.length]!, 0.3);
    pen.stipple(shape, Math.round((w * h) / 18), (_, py) => 0.25 + ((py - y) / h) * 0.6, 0.45, rgba(c.rim, 0.4));
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(c.rim, 0.32);
    ctx.lineWidth = 5;
    ctx.beginPath();
    shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    // Dry-brush shine: a few broken strokes of bare paper along the top.
    for (let i = 0; i < 3; i++) {
      const sy = y + h * (0.16 + i * 0.07);
      const x0 = x + w * (0.12 + rng() * 0.1);
      const x1 = x + w * (0.55 + rng() * 0.3);
      pen.hair([pt(x0, sy), pt((x0 + x1) / 2, sy - 0.6), pt(x1, sy + 0.4)], 1.6 - i * 0.4, PAPER_FILL, c.shine * (1 - i * 0.25));
    }
    pen.crescent(shape, pt(-w * 0.04, -h * 0.28), () => pen.hatch(shape, 3.2, 2.3, 0.45, { color: INK, alpha: 0.14 }));
  });
  pen.stroke(closed(shape), round ? 1.5 : 1.7, INK, 0.92);
}

/** The soft shadow a plate w × h casts, at SHADOW_PAD. */
export function paintPlateShadow(ctx: CanvasRenderingContext2D, w: number, h: number, res: number, round = false): void {
  const shape = round ? oval(SHADOW_PAD + w / 2, SHADOW_PAD + h / 2, w / 2, h / 2, 40) : roundRect(SHADOW_PAD, SHADOW_PAD, w, h, plateRadius(h), 4);
  castShadow(ctx, shape, res, { blur: 5, dx: 0, dy: 0, alpha: 0.42 });
}

export type IconKind = 'pause' | 'sound' | 'muted' | 'close' | 'clock';

/** A pen-and-wash icon centred on (0, 0), about 26 units across. */
export function paintIcon(ctx: CanvasRenderingContext2D, kind: IconKind, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  if (kind === 'pause') {
    for (const x of [-5.5, 5.5]) {
      const bar = roundRect(x - 3.4, -10, 6.8, 20, 2.6, 2);
      pen.fill(bar, BLUE, 0.85);
      pen.hair([pt(x - 1.4, -7), pt(x - 1.2, 5)], 1.1, PAPER_FILL, 0.45);
      pen.stroke(closed(bar), 1.2, INK, 0.95);
    }
  } else if (kind === 'sound' || kind === 'muted') {
    const head = oval(-6, 6.5, 5.2, 3.8, 18).map((p) => rotate(p, pt(-6, 6.5), -0.45));
    pen.fill(head, INK, 0.92);
    pen.stroke([pt(-1.4, 5.5), pt(-1.2, -11)], 1.7, INK, 1, false);
    pen.stroke(bezier(pt(-1.2, -11), pt(6, -8.5), pt(4.6, -1.5), 8), 1.6, INK, 1, false);
    if (kind === 'sound') {
      for (const r of [8, 12.5]) pen.stroke(Array.from({ length: 9 }, (_, i) => pt(4 + Math.cos(-0.55 + i * 0.14) * r, Math.sin(-0.55 + i * 0.14) * r)), 1.2, BLUE, 0.75, false);
    } else {
      pen.stroke([pt(-11, -10), pt(11, 11)], 2.4, RED, 0.95, false);
    }
  } else if (kind === 'close') {
    pen.stroke([pt(-7, -7), pt(7, 7)], 2.2, INK, 1, false);
    pen.stroke([pt(7, -7), pt(-7, 7)], 2.2, INK, 1, false);
  } else {
    const face = oval(0, 0, 9, 9, 28);
    pen.fill(face, PAPER_FILL, 1);
    pen.fill(face, '#d6e0ea', 0.5);
    pen.stroke(closed(face), 1.3, INK, 0.9);
    pen.stroke([pt(0, 0), pt(0, -6)], 1.3, INK, 1, false);
    pen.stroke([pt(0, 0), pt(4, 2)], 1.3, INK, 1, false);
  }
}

function rotate(p: Pt, c: Pt, a: number): Pt {
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  return pt(c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, c.y + (p.x - c.x) * sin + (p.y - c.y) * cos);
}

/** The bar's capsule w × h at GROOVE_PAD. */
const capsule = (w: number, h: number, inset = 0): Pt[] => roundRect(GROOVE_PAD + inset, GROOVE_PAD + inset, w - inset * 2, h - inset * 2, (h - inset * 2) / 2, 3);

/** The bar's groove: a channel pressed into the paper, soil-washed, with pencil ticks at the quarters. */
export function paintGroove(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, res: number): void {
  const pen = new Pen(ctx, seed, 0.35);
  const shape = capsule(w, h);
  pen.stroke(shift1(capsule(w, h), 0, 1.4), 1.4, PAPER_FILL, 0.9, false);
  pen.fill(shape, '#d8c597', 0.95);
  pen.clipped(shape, () => {
    for (let i = 0; i < 5; i++) bloom(ctx, GROOVE_PAD + w * pen.rng(), GROOVE_PAD + h * 0.6, h * 1.4, i % 2 ? '#bfa877' : '#e8dcbc', 0.45);
    pen.stipple(shape, Math.round(w * h * 0.08), () => 0.7, 0.4, rgba('#8f7a52', 0.4));
  });
  innerShadow(ctx, shape, res, 5, 0.55);
  for (const q of [0.25, 0.5, 0.75]) pen.hair([pt(GROOVE_PAD + w * q, GROOVE_PAD + h * 0.72), pt(GROOVE_PAD + w * q, GROOVE_PAD + h - 1.5)], 0.8, INK, 0.3);
  pen.stroke(closed(shape), 1.35, INK, 0.9);
}

const shift1 = (pts: readonly Pt[], dx: number, dy: number): Pt[] => closed(pts.map((p) => pt(p.x + dx, p.y + dy)));

/** What fills the groove: a leaf-green wash with a vine winding through it, leaves alternating. Registers with paintGroove. */
export function paintVine(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  const shape = capsule(w, h, 1.6);
  const mid = GROOVE_PAD + h / 2;
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, GROOVE_PAD, 0, GROOVE_PAD + h);
    g.addColorStop(0, '#b3d78c');
    g.addColorStop(1, '#5f9447');
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w + GROOVE_PAD * 2, h + GROOVE_PAD * 2);
    ctx.globalAlpha = 1;
    for (let x = 0; x < w; x += h * 1.6) bloom(ctx, GROOVE_PAD + x + pen.rng() * h, mid + (pen.rng() - 0.5) * h * 0.6, h * (0.6 + pen.rng() * 0.5), pen.rng() < 0.5 ? '#d5eaa8' : '#4f8a3c', 0.35);
    pen.stipple(shape, Math.round(w * h * 0.06), () => 0.6, 0.4, rgba('#2f5a2a', 0.45));
    const stem = Array.from({ length: Math.ceil(w / 3) + 1 }, (_, i) => pt(GROOVE_PAD + i * 3, mid + Math.sin(i * 3 / 15) * h * 0.17));
    pen.stroke(stem, 1.3, '#2f5a2a', 0.85, false);
    for (let i = 0, x = 9; x < w - 6; i++, x += 13 + pen.rng() * 5) {
      const side = i % 2 ? 1 : -1;
      const at = pt(GROOVE_PAD + x, mid + Math.sin(x / 15) * h * 0.17);
      const len = h * (0.36 + pen.rng() * 0.08);
      const tip = pt(at.x + len * 0.7, at.y + side * len);
      const leaf = [...bezier(at, pt(at.x + len * 0.75, at.y + side * len * 0.25), tip, 6), ...bezier(tip, pt(at.x - len * 0.05, at.y + side * len * 0.8), at, 6).slice(1)];
      pen.fill(leaf, '#3f7a34', 0.8);
      pen.hair(closed(leaf), 0.5, '#24461f', 0.7);
    }
    pen.hair([pt(GROOVE_PAD + 6, GROOVE_PAD + 3.6), pt(GROOVE_PAD + w - 8, GROOVE_PAD + 3.4)], 1.3, PAPER_FILL, 0.45);
  });
}

/** The vine's growing tip: a curl of tendril and two fresh leaves, centred on (0, 0) and reaching to +x. */
export function paintSprout(ctx: CanvasRenderingContext2D, seed: number): void {
  const pen = new Pen(ctx, seed, 0.25);
  const curl = Array.from({ length: 14 }, (_, i) => {
    const a = -Math.PI / 2 + i * 0.42;
    const r = 6 - i * 0.32;
    return pt(2 + Math.cos(a) * r, -3 + Math.sin(a) * r);
  });
  pen.stroke([pt(-6, 1), pt(-1, 0), pt(2, -2), ...curl], 1.1, '#2f5a2a', 0.95, false);
  for (const [angle, len] of [[-1.0, 10], [0.55, 8]] as const) {
    const tip = pt(-2 + Math.cos(angle) * len, Math.sin(angle) * len);
    const leaf = [...bezier(pt(-2, 0), pt(-2 + Math.cos(angle - 0.6) * len * 0.7, Math.sin(angle - 0.6) * len * 0.7), tip, 6), ...bezier(tip, pt(-2 + Math.cos(angle + 0.6) * len * 0.7, Math.sin(angle + 0.6) * len * 0.7), pt(-2, 0), 6).slice(1)];
    pen.fill(leaf, PAPER_FILL, 1);
    pen.fill(leaf, '#86c060', 0.85);
    pen.stroke(closed(leaf), 0.9, INK, 0.85);
  }
}

/** An empty socket a life marble sits in, radius r, centred at (r + 3, r + 3). */
export function paintSocket(ctx: CanvasRenderingContext2D, r: number, seed: number, res: number): void {
  const pen = new Pen(ctx, seed, 0.25);
  const shape = oval(r + 3, r + 3, r, r, 28);
  pen.fill(shape, '#e3d6b4', 0.92);
  innerShadow(ctx, shape, res, 3.5, 0.45);
  pen.stroke(closed(shape), 1, INK, 0.55);
}

/**
 * An ink blot, radius about r, centred on a canvas 3.2r across: a pooled
 * puddle of ballpoint-blue ink, darker at its rim, a gloss, and spatter.
 */
export function paintBlot(ctx: CanvasRenderingContext2D, r: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { rng } = pen;
  const c = r * 1.6;
  const [p1, p2, p3] = [rng() * TAU, rng() * TAU, rng() * TAU];
  const shape = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const k = 1 + 0.1 * Math.sin(3 * a + p1) + 0.07 * Math.sin(5 * a + p2) + 0.05 * Math.sin(8 * a + p3);
    return pt(c + Math.cos(a) * r * k, c + Math.sin(a) * r * k);
  });
  const g = ctx.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r * 1.15);
  g.addColorStop(0, '#4766c2');
  g.addColorStop(0.7, '#2a3f93');
  g.addColorStop(1, '#1b275f');
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.clipped(shape, () => {
    ctx.strokeStyle = rgba('#141c4a', 0.55);
    ctx.lineWidth = r * 0.16;
    ctx.stroke();
  });
  pen.fill(oval(c - r * 0.32, c - r * 0.38, r * 0.3, r * 0.17, 16).map((p) => rotate(p, pt(c - r * 0.32, c - r * 0.38), -0.6)), PAPER_FILL, 0.4);
  for (let i = 0; i < 7; i++) {
    const a = rng() * TAU;
    const d = r * (1.18 + rng() * 0.32);
    pen.dot(c + Math.cos(a) * d, c + Math.sin(a) * d, r * (0.04 + rng() * 0.07), '#22327a', 0.9);
  }
}

/** Where a blot would go: a dashed pencil ring on a faint wash, centred like paintBlot. */
export function paintBlotSlot(ctx: CanvasRenderingContext2D, r: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  const c = r * 1.6;
  pen.fill(oval(c, c, r * 0.95, r * 0.95, 32), '#dccdaa', 0.55);
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * TAU + 0.05;
    pen.hair(Array.from({ length: 4 }, (_, k) => pt(c + Math.cos(a0 + k * 0.09) * r, c + Math.sin(a0 + k * 0.09) * r)), 1.2, INK, 0.55);
  }
}

/**
 * A rubber stamp's impression, w × h at (4, 4): a double-ruled red frame
 * with `label` in it, worn where the rubber didn't take.
 */
export function paintStamp(ctx: CanvasRenderingContext2D, w: number, h: number, label: string, font: string, seed: number): void {
  const pen = new Pen(ctx, seed, 0.4);
  const { rng } = pen;
  pen.stroke(closed(roundRect(4, 4, w, h, 7, 4)), 2.6, RED, 0.9);
  pen.hair(closed(roundRect(8.5, 8.5, w - 9, h - 9, 4, 4)), 1, RED, 0.75);
  ctx.save();
  ctx.fillStyle = rgba(RED, 0.92);
  ctx.font = `700 ${Math.round(h * 0.58)}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 4 + w / 2, 4 + h / 2 + 1);
  // Worn: specks and scuffs where the ink didn't take.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < (w * h) / 22; i++) {
    ctx.globalAlpha = 0.4 + rng() * 0.6;
    ctx.beginPath();
    ctx.arc(4 + rng() * w, 4 + rng() * h, 0.3 + rng() * 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export type SpotTint = 'sun' | 'rain';

const SPOTS: Readonly<Record<SpotTint, { inner: string; outer: string; rim: string }>> = {
  sun: { inner: '#fdf3cf', outer: '#ecd08a', rim: '#c09447' },
  rain: { inner: '#e6ecef', outer: '#a9bccb', rim: '#6f879c' },
};

/**
 * A round pool of watercolour, radius about r, centred on a canvas 2.4r
 * across: the vignette a spot illustration sits on, pale at its heart,
 * pooled and hard-edged at its rim, with a smaller second wash inside.
 */
export function paintSpot(ctx: CanvasRenderingContext2D, r: number, seed: number, tint: SpotTint): void {
  const pen = new Pen(ctx, seed, 0.3);
  const { rng } = pen;
  const c = r * 1.2;
  const blob = (rr: number): Pt[] => {
    const [p1, p2] = [rng() * TAU, rng() * TAU];
    return Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * TAU;
      const k = 1 + 0.06 * Math.sin(2 * a + p1) + 0.04 * Math.sin(5 * a + p2) + (rng() - 0.5) * 0.015;
      return pt(c + Math.cos(a) * rr * k, c + Math.sin(a) * rr * k * 0.94);
    });
  };
  const s = SPOTS[tint];
  const outer = blob(r);
  const g = ctx.createRadialGradient(c - r * 0.2, c - r * 0.25, r * 0.1, c, c, r);
  g.addColorStop(0, s.inner);
  g.addColorStop(1, s.outer);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = g;
  ctx.beginPath();
  outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  pen.clipped(outer, () => {
    ctx.strokeStyle = rgba(s.rim, 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
    const inner = blob(r * 0.62).map((p) => pt(p.x + r * 0.12, p.y + r * 0.1));
    pen.fill(inner, s.outer, 0.18);
    pen.hair(closed(inner), 0.6, s.rim, 0.25);
    pen.stipple(outer, Math.round(r * r * 0.25), () => 0.5, 0.5, rgba(s.rim, 0.35));
  });
}
