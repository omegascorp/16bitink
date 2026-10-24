import { closed, oval, pt, TAU } from './kit';
import { INK, UI } from './palette';
import { Pen, pathOf, type Pt } from './pen';
import { castShadow, giltGradient, innerShadow, roundRect } from './uiArt';
import { rgba } from './wash';

/**
 * The interface's small parts: button plates (an enamelled or leather face
 * in a bevelled gilt rim), their icons, and the medals a won map earns.
 * Each paints with its origin at the top-left of a canvas a little bigger
 * than the part (see the *_PAD constants); `res` is texture px per unit,
 * for canvas shadows.
 */

/** Room round a button plate for its rim, units. */
export const PLATE_PAD = 5;
/** Room round a button's cast shadow for its blur, units. */
export const SHADOW_PAD = 12;
/** Texture px per unit the plates are baked at (the scenes' UI_RES), for canvas shadows. */
const RES = 2;

/** The main action (crimson enamel), a plain one (leather) or the Crown's (blue enamel). */
export type PlateKind = 'primary' | 'plain' | 'crown';

const FACES: Readonly<Record<PlateKind, { light: string; mid: string; deep: string }>> = {
  primary: { light: '#b0402c', mid: '#7c2117', deep: '#43100b' },
  plain: { light: '#5e3626', mid: '#3a1f17', deep: '#1f0f0b' },
  crown: { light: '#3c5ba6', mid: '#22397a', deep: '#101c42' },
};

/** Corner radius for a button h tall. */
export const plateRadius = (h: number): number => Math.min(h * 0.2, 8);

function plateShape(w: number, h: number, round: boolean, inset = 0): Pt[] {
  return round
    ? oval(PLATE_PAD + w / 2, PLATE_PAD + h / 2, w / 2 - inset, h / 2 - inset, 48)
    : roundRect(PLATE_PAD + inset, PLATE_PAD + inset, w - inset * 2, h - inset * 2, Math.max(1, plateRadius(h) - inset * 0.5), 3);
}

/**
 * A button's plate, w × h at PLATE_PAD: a bevelled gilt rim, the face
 * inside it lit from above with a soft gloss, its grain, and a dark edge.
 */
export function paintPlate(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, kind: PlateKind, round = false): void {
  const pen = new Pen(ctx, seed, 0.3);
  const c = FACES[kind];
  const [x, y] = [PLATE_PAD, PLATE_PAD];
  const rim = Math.min(3.2, h * 0.08 + 1);
  const outer = plateShape(w, h, round);
  const face = plateShape(w, h, round, rim);
  // The rim: gilt, lit along its top-left and turning dark along its bottom-right.
  ctx.save();
  pathOf(ctx, outer);
  ctx.fillStyle = giltGradient(ctx, x, y, w, h);
  ctx.fill();
  const bevel = ctx.createLinearGradient(0, y, 0, y + h);
  bevel.addColorStop(0, rgba(UI.giltLight, 0.55));
  bevel.addColorStop(0.5, rgba(UI.giltLight, 0));
  bevel.addColorStop(1, rgba('#000000', 0.4));
  ctx.fillStyle = bevel;
  ctx.fill();
  ctx.restore();
  pen.clipped(face, () => {
    const g = ctx.createLinearGradient(0, y + rim, 0, y + h - rim);
    g.addColorStop(0, c.light);
    g.addColorStop(0.55, c.mid);
    g.addColorStop(1, c.deep);
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    pen.stipple(face, Math.round((w * h) / 16), () => 0.6, 0.3, rgba(c.deep, 0.6));
    // A soft gloss across the top half of the face.
    const gloss = ctx.createLinearGradient(0, y + rim, 0, y + h * 0.55);
    gloss.addColorStop(0, rgba('#fff4d6', 0.22));
    gloss.addColorStop(1, rgba('#fff4d6', 0));
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, w, h * 0.55);
  });
  innerShadow(ctx, face, RES, 2.2, 0.6);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(INK, 0.95);
  ctx.lineWidth = 1.1;
  pathOf(ctx, outer);
  ctx.stroke();
  ctx.strokeStyle = rgba('#000000', 0.45);
  ctx.lineWidth = 0.7;
  pathOf(ctx, face);
  ctx.stroke();
  ctx.restore();
}

/** The soft shadow a plate w × h casts, at SHADOW_PAD. */
export function paintPlateShadow(ctx: CanvasRenderingContext2D, w: number, h: number, res: number, round = false): void {
  const shape = round ? oval(SHADOW_PAD + w / 2, SHADOW_PAD + h / 2, w / 2, h / 2, 40) : roundRect(SHADOW_PAD, SHADOW_PAD, w, h, plateRadius(h), 4);
  castShadow(ctx, shape, res, { blur: 5, dx: 0, dy: 0, alpha: 0.7 });
}

export type IconKind = 'pause' | 'sound' | 'muted' | 'close' | 'clock';

/** Fills `shape` in gilt with a dark edge. */
function giltShape(pen: Pen, shape: readonly Pt[], line = 0.9): void {
  const { ctx } = pen;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  ctx.save();
  pathOf(ctx, shape);
  ctx.fillStyle = giltGradient(ctx, x0, y0, Math.max(...xs) - x0 + 1, Math.max(...ys) - y0 + 1);
  ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.75);
  ctx.lineWidth = line;
  ctx.stroke();
  ctx.restore();
}

/** A gilt line through `pts`, `w` wide, over a dark one that sets it off. */
function giltLine(pen: Pen, pts: readonly Pt[], w: number): void {
  pen.stroke(pts, w + 1.4, '#000000', 0.6, false);
  pen.stroke(pts, w, UI.gilt, 1, false);
  pen.stroke(pts, w * 0.35, UI.giltLight, 0.7, false);
}

/** A gilt icon centred on (0, 0), about 26 units across. */
export function paintIcon(ctx: CanvasRenderingContext2D, kind: IconKind, seed: number): void {
  const pen = new Pen(ctx, seed, 0.2);
  if (kind === 'pause') {
    for (const x of [-5.5, 5.5]) giltShape(pen, roundRect(x - 3.2, -9.5, 6.4, 19, 1.4, 2));
  } else if (kind === 'sound' || kind === 'muted') {
    // A herald's horn.
    giltShape(pen, [pt(-10, -3.5), pt(-4, -3.5), pt(5, -10), pt(5, 10), pt(-4, 3.5), pt(-10, 3.5)]);
    if (kind === 'sound') {
      for (const r of [8.5, 12.5]) giltLine(pen, Array.from({ length: 9 }, (_, i) => pt(3 + Math.cos(-0.6 + i * 0.15) * r, Math.sin(-0.6 + i * 0.15) * r)), 1.3);
    } else {
      giltLine(pen, [pt(-11, -10), pt(11, 11)], 2.2);
    }
  } else if (kind === 'close') {
    giltLine(pen, [pt(-7, -7), pt(7, 7)], 2.4);
    giltLine(pen, [pt(7, -7), pt(-7, 7)], 2.4);
  } else {
    const face = oval(0, 0, 9, 9, 28);
    giltShape(pen, face);
    pen.fill(oval(0, 0, 6.8, 6.8, 24), UI.leafDeep, 1);
    pen.stroke([pt(0, 0), pt(0, -5)], 1.3, UI.giltLight, 1, false);
    pen.stroke([pt(0, 0), pt(3.6, 1.8)], 1.3, UI.giltLight, 1, false);
  }
}

/** Five points of a star of radius r at (cx, cy). */
function star(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rr = i % 2 ? r * 0.45 : r;
    return pt(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  });
}

/** A sunk socket a medal sits in, radius r, centred on a canvas 3.2r across. */
function socket(pen: Pen, c: number, r: number): void {
  const shape = oval(c, c, r, r, 40);
  pen.fill(shape, UI.well, 1);
  innerShadow(pen.ctx, shape, RES, r * 0.3, 0.8);
  pen.hair(closed(oval(c, c, r + 0.8, r + 0.8, 40)), 1.2, UI.giltDeep, 0.9);
}

/** A won medal, radius about r, centred on a canvas 3.2r across: a gilt star in its socket. */
export function paintMedal(ctx: CanvasRenderingContext2D, r: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.2);
  const c = r * 1.6;
  socket(pen, c, r);
  giltShape(pen, star(c, c, r * 0.86), 1.2);
  // The lit facets on the upper-left arms.
  pen.fill([pt(c, c), ...star(c, c, r * 0.86).slice(7, 10), star(c, c, r * 0.86)[0]!], UI.giltLight, 0.45);
}

/** An empty socket where a medal would go, centred like paintMedal. */
export function paintMedalSlot(ctx: CanvasRenderingContext2D, r: number, seed: number): void {
  const pen = new Pen(ctx, seed, 0.2);
  const c = r * 1.6;
  socket(pen, c, r);
  pen.hair(closed(star(c, c, r * 0.8)), 0.9, UI.giltDeep, 0.6);
}
