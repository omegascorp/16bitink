import { createRng } from '../logic/rng';
import { INK, LEATHER, RED, WOOD, WOOD_DARK } from './palette';
import { Pen, type Pt } from './pen';
import { bloom, castShadow, deckle, innerShadow, PAPER_FILL, roundRect } from './uiArt';
import { arc, bezier, closed, oval, pt, rotate, TAU } from './uiKit';
import { rgba } from './wash';

/**
 * The interface's painted parts (ported from InkSnake and grown for the
 * ruins): button plates, their icons, ink blots, and the thumbstick's
 * discs. Each paints with its origin at the top-left of a canvas a little
 * bigger than the part (see the *_PAD constants); `res` is texture px per
 * unit, for canvas shadows.
 */

/** Room round a button plate for its wobble and contour, units. */
export const PLATE_PAD = 5;
/** Room round a button's cast shadow for its blur, units. */
export const SHADOW_PAD = 12;

const BLUE = '#2f4f9a';
const SKY = '#a9c4e4';

export type PlateKind = 'paper' | 'leaf' | 'gold' | 'clay';

const PLATES: Readonly<Record<PlateKind, { top: string; bottom: string; blooms: readonly string[]; rim: string; shine: number }>> = {
  paper: { top: '#fffaf0', bottom: '#eee2c4', blooms: ['#f6ead0', '#e2d0a6', '#dfe6cf'], rim: '#b49867', shine: 0.2 },
  // Jungle green: the way on.
  leaf: { top: '#b4d58f', bottom: '#6a9c50', blooms: ['#cfe6a6', '#5d8f47', '#a8cf86'], rim: '#3d6a32', shine: 0.5 },
  // Temple gold: leave with the treasure, or buy the full game.
  gold: { top: '#fbe39a', bottom: '#d9a335', blooms: ['#fff0bd', '#c98d26', '#f2cf6c'], rim: '#8a5a17', shine: 0.6 },
  // Terracotta: try again.
  clay: { top: '#eaa287', bottom: '#b9533b', blooms: ['#f4bea6', '#a4432e', '#de8d70'], rim: '#6e2a1d', shine: 0.45 },
};

/** Corner radius for a button h tall. */
export const plateRadius = (h: number): number => Math.min(h * 0.38, 20);

function plateShape(seed: number, w: number, h: number, round: boolean): Pt[] {
  const rng = createRng(seed);
  const base = round ? oval(PLATE_PAD + w / 2, PLATE_PAD + h / 2, w / 2, h / 2, 40) : roundRect(PLATE_PAD, PLATE_PAD, w, h, plateRadius(h), 4);
  return deckle(rng, base, 0.55, 0);
}

/**
 * A button's plate, w × h at PLATE_PAD: paper under a graded watercolour
 * wash printed a touch off-register, granulation, a pooled rim, a
 * dry-brush shine along the top, hatching in the shadow side and a pen contour.
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

export type IconKind = 'restart' | 'map' | 'zoomIn' | 'zoomOut' | 'jump' | 'close' | 'hint';

/** A pen-and-wash icon centred on (0, 0), about 26 units across. */
export function paintIcon(ctx: CanvasRenderingContext2D, kind: IconKind, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  if (kind === 'restart') paintRestart(pen);
  else if (kind === 'map') paintMap(pen);
  else if (kind === 'jump') paintJump(pen);
  else if (kind === 'hint') {
    // A question mark in blue ink: the level's tip again.
    const hook = arc(0, -4.5, 5.6, Math.PI * 1.05, Math.PI * 2.35, 14);
    pen.stroke([...hook, pt(0.4, 1.6), pt(0, 4.2)], 2.6, BLUE, 0.95, false);
    pen.dot(0, 9, 1.9, BLUE, 0.95);
  }
  else if (kind === 'close') {
    pen.stroke([pt(-7, -7), pt(7, 7)], 2.6, INK, 1, false);
    pen.stroke([pt(7, -7), pt(-7, 7)], 2.6, INK, 1, false);
  } else paintLens(pen, kind === 'zoomIn');
}

/** A loop of ink nearly closed, gap at the top right, an open arrowhead pointing into the gap: go round again. */
function paintRestart(pen: Pen): void {
  const r = 8.6;
  const a1 = Math.PI * 1.72;
  const loop = arc(0, 0.5, r, Math.PI * 0.08, a1, 24);
  pen.stroke(loop, 2.7, BLUE, 0.95, false);
  pen.hair(arc(0, 0.5, r - 0.2, Math.PI * 0.7, Math.PI * 1.15, 8), 1, PAPER_FILL, 0.55);
  // The arrowhead: a filled barb a little ahead along the loop, pointing on round it.
  const end = loop[loop.length - 1]!;
  const dir = pt(-Math.sin(a1), Math.cos(a1));
  const tip = pt(end.x + dir.x * 5, end.y + dir.y * 5);
  const back = pt(tip.x - dir.x * 9, tip.y - dir.y * 9);
  const head = [tip, rotate(back, tip, 0.5), pt(end.x - dir.x * 1.5, end.y - dir.y * 1.5), rotate(back, tip, -0.5)];
  pen.fill(head, BLUE, 0.95);
  pen.stroke(closed(head), 1.1, INK, 0.9);
}

/** A folded treasure map: three panels, a dashed trail and a red cross. */
function paintMap(pen: Pen): void {
  const xs = [-11, -3.7, 3.7, 11];
  const top = [-8, -10, -8, -10];
  const bottom = [9, 7, 9, 7];
  for (let i = 0; i < 3; i++) {
    const panel = [pt(xs[i]!, top[i]!), pt(xs[i + 1]!, top[i + 1]!), pt(xs[i + 1]!, bottom[i + 1]!), pt(xs[i]!, bottom[i]!)];
    pen.fill(panel, PAPER_FILL, 1);
    pen.fill(panel, i === 1 ? '#e2cf9e' : '#f1e4bf', 0.9);
  }
  pen.fill([pt(-9, 3), pt(-5, 1), pt(-4, 5), pt(-8.5, 6)], '#9fc27c', 0.6);
  const trail = bezier(pt(-8.5, 4), pt(-2, -8), pt(6, -3), 10);
  for (let i = 0; i + 1 < trail.length; i += 2) pen.hair([trail[i]!, trail[i + 1]!], 1.1, INK, 0.8);
  pen.stroke([pt(4.6, -5.2), pt(8.4, -1.4)], 1.8, RED, 0.95, false);
  pen.stroke([pt(8.4, -5.2), pt(4.6, -1.4)], 1.8, RED, 0.95, false);
  const outline = xs.map((x, i) => pt(x, top[i]!)).concat(xs.map((x, i) => pt(x, bottom[i]!)).reverse());
  pen.stroke(closed(outline), 1.3, INK, 0.95);
  for (const i of [1, 2]) pen.hair([pt(xs[i]!, top[i]!), pt(xs[i]!, bottom[i]!)], 0.9, INK, 0.6);
}

/** A magnifying glass with a plus or a minus in its lens. */
function paintLens(pen: Pen, plus: boolean): void {
  const c = pt(-2.5, -2.5);
  const handle = [pt(3.4, 5.6), pt(5.6, 3.4), pt(11.6, 9.4), pt(9.4, 11.6)];
  pen.fill(handle, WOOD, 0.95);
  pen.hair([pt(5, 4.8), pt(10.4, 10.2)], 0.9, '#d9b58a', 0.8);
  pen.stroke(closed(handle), 1.2, INK, 0.95);
  const glass = oval(c.x, c.y, 8.2, 8.2, 28);
  pen.fill(glass, PAPER_FILL, 1);
  pen.fill(glass, SKY, 0.45);
  pen.hair(arc(c.x, c.y, 5.6, Math.PI * 1.05, Math.PI * 1.45, 6), 1.4, PAPER_FILL, 0.9);
  pen.stroke(closed(glass), 2.2, LEATHER, 0.95);
  pen.hair(closed(oval(c.x, c.y, 9.3, 9.3, 28)), 0.8, INK, 0.9);
  pen.stroke([pt(c.x - 4, c.y), pt(c.x + 4, c.y)], 2.2, INK, 1, false);
  if (plus) pen.stroke([pt(c.x, c.y - 4), pt(c.x, c.y + 4)], 2.2, INK, 1, false);
}

/** A bold arrow leaping up off a scrap of floor. */
function paintJump(pen: Pen): void {
  const arrow = [pt(0, -12), pt(9, -2), pt(3.6, -2), pt(3.6, 6), pt(-3.6, 6), pt(-3.6, -2), pt(-9, -2)];
  pen.fill(arrow, PAPER_FILL, 1);
  pen.fill(arrow, BLUE, 0.85);
  pen.hair([pt(-1.6, -8), pt(-5.2, -3.6)], 1.2, PAPER_FILL, 0.55);
  pen.stroke(closed(arrow), 1.4, INK, 0.95);
  pen.stroke([pt(-9, 11), pt(-3, 10.4), pt(3, 11.2), pt(9, 10.6)], 1.6, WOOD_DARK, 0.9, false);
  for (const x of [-6, 6]) pen.hair([pt(x, 8.6), pt(x * 1.3, 6)], 0.9, INK, 0.6);
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
 * The thumbstick at rest, radius r, centred at (r + 8, r + 8): a faint
 * wash disc with a dashed pencil ring and four ticks, to say "a thumb goes here".
 */
export function paintStickRest(ctx: CanvasRenderingContext2D, r: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  const c = r + 8;
  pen.fill(oval(c, c, r, r, 40), PAPER_FILL, 0.5);
  pen.fill(oval(c, c, r, r, 40), '#dccdaa', 0.3);
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * TAU;
    pen.hair(Array.from({ length: 4 }, (_, k) => pt(c + Math.cos(a0 + k * 0.05) * r, c + Math.sin(a0 + k * 0.05) * r)), 1.6, INK, 0.62);
  }
  // Four ticks round a dot: which ways it pushes.
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) pen.hair([pt(c + Math.cos(a) * (r - 12), c + Math.sin(a) * (r - 12)), pt(c + Math.cos(a) * (r - 5), c + Math.sin(a) * (r - 5))], 1.8, INK, 0.55);
  pen.dot(c, c, 4, INK, 0.35);
}

/** The thumbstick under a thumb, radius r, centred at (r + 8, r + 8): a well pressed into a paper disc. */
export function paintStickBase(ctx: CanvasRenderingContext2D, r: number, seed: number, res: number): void {
  const pen = new Pen(ctx, seed, 0.3);
  const c = r + 8;
  const disc = oval(c, c, r, r, 48);
  castShadow(ctx, disc, res, { blur: 6, dx: 0, dy: 3, alpha: 0.3 });
  pen.fill(disc, PAPER_FILL, 0.9);
  pen.fill(disc, '#e8dcbc', 0.6);
  const well = oval(c, c, r - 8, r - 8, 44);
  pen.fill(well, '#d8c597', 0.55);
  innerShadow(ctx, well, res, 6, 0.4);
  pen.stroke(closed(disc), 1.4, INK, 0.7);
  pen.hair(closed(well), 0.8, INK, 0.4);
}
