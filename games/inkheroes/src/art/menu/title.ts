import { createRng, type Rng } from '../../logic/rng';
import { closed, makeDraw, pt, type Draw } from '../kit';
import { DISPLAY, INK, UI } from '../palette';
import { pathOf, type Pt } from '../pen';
import { TITLE, type MenuDrawer } from './types';
import { bloomAt, LIGHT, mix, onLayer, poolEdge, rgba, SHADOW, soft } from './vistaKit';

/**
 * The game's name on a heraldic plaque: a long panel of deep oxblood
 * lacquer with pointed ends, set in a bevelled gilt frame lit from the
 * upper left, a fine inner fillet of gold, gilt bosses at its points and
 * rivets at its corners. The name is cut in Roman capitals and gilded:
 * bright on the faces turned to the light, sunk into dark on the far
 * edges, with a hard shadow where the letters stand off the lacquer.
 */
const { w: W, h: H } = TITLE;
const CX = W / 2;
const CY = 90;
/** The panel's half-width to where the ends begin to point, its half-height and how far the points reach. */
const HALF = 226;
const HALF_H = 52;
const POINT = 50;
const FRAME = 9;
/** Towards the light (upper left), as a unit vector. */
const TO_LIGHT = pt(-0.55, -0.84);

const GILT = UI.gilt;
const GILT_DEEP = UI.giltDeep;
const GILT_LIGHT = UI.giltLight;
const LACQUER = '#6e1c18';

function plaque(): Pt[] {
  return [pt(CX - HALF, CY - HALF_H), pt(CX + HALF, CY - HALF_H), pt(CX + HALF + POINT, CY), pt(CX + HALF, CY + HALF_H), pt(CX - HALF, CY + HALF_H), pt(CX - HALF - POINT, CY)];
}

/** A convex polygon (clockwise on screen) pulled in by `d` on every side. */
function inset(poly: readonly Pt[], d: number): Pt[] {
  const n = poly.length;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Inward normal for a clockwise outline in y-down space.
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    return { a: pt(a.x + nx * d, a.y + ny * d), dx: b.x - a.x, dy: b.y - a.y };
  });
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n]!;
    const den = m.dx * l.dy - m.dy * l.dx;
    const t = ((l.a.x - m.a.x) * l.dy - (l.a.y - m.a.y) * l.dx) / (den || 1);
    return pt(m.a.x + m.dx * t, m.a.y + m.dy * t);
  });
}

/** The gilt frame: one facet per side between the outer and inner outlines, each lit by how squarely it faces the light. */
function frame(d: Draw, outer: readonly Pt[], inner: readonly Pt[]): void {
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const a = outer[i]!;
    const b = outer[(i + 1) % n]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // The facet slopes away outwards, so it faces along the side's outward normal.
    const lit = ((b.y - a.y) / len) * TO_LIGHT.x - ((b.x - a.x) / len) * TO_LIGHT.y;
    const facet = [a, b, inner[(i + 1) % n]!, inner[i]!];
    const base = lit > 0 ? mix(GILT, GILT_LIGHT, lit * 0.6) : mix(GILT, GILT_DEEP, -lit * 0.9);
    d.pen.fill(facet, base, 1);
  }
  // Burnish: a few soft blooms and a fine scratch of light along the lit edges.
  d.pen.clipped(outer, () => {
    for (const [x, y, r] of [[CX - HALF + 30, CY - HALF_H + 3, 60], [CX - 40, CY - HALF_H + 3, 80], [CX - HALF - POINT * 0.5, CY - 20, 30]] as const) bloomAt(d.pen.ctx, pt(x, y), r, GILT_LIGHT, 0.5);
  });
  rule(d.pen.ctx, [outer[5]!, outer[0]!, outer[1]!].map((p) => pt(p.x + 0.6, p.y + 1.6)), 0.8, '#fff1c4', 0.7);
  rule(d.pen.ctx, closed(outer), 1.2, INK, 0.9);
  rule(d.pen.ctx, closed(inner), 0.9, mix(GILT_DEEP, SHADOW, 0.5), 0.9);
}

/** An engraver's clean rule along `pts`: the frame's lines are cut, not drawn freehand. */
function rule(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, color: string, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = w;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** The lacquered field: deep oxblood, glowing at the upper left, sinking to near-black at the lower right, mottled, with a little hatching in its shade. */
function field(d: Draw, rng: Rng, shape: readonly Pt[]): void {
  const ctx = d.pen.ctx;
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(CX - HALF, CY - HALF_H, CX + HALF * 0.4, CY + HALF_H * 1.6);
  g.addColorStop(0, mix(LACQUER, '#b04432', 0.18));
  g.addColorStop(0.45, LACQUER);
  g.addColorStop(1, mix(LACQUER, SHADOW, 0.6));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) bloomAt(ctx, pt(CX - HALF - POINT + rng() * (HALF + POINT) * 2, CY - HALF_H + rng() * HALF_H * 2), 20 + rng() * 40, rng() < 0.5 ? mix(LACQUER, '#a83a2a', 0.4) : mix(LACQUER, SHADOW, 0.5), 0.3);
  // A soft sheen across the upper third, where the lacquer takes the light.
  ctx.save();
  ctx.translate(CX - 80, CY - HALF_H * 0.55);
  ctx.scale(1, 0.18);
  bloomAt(ctx, pt(0, 0), 230, '#c86a4e', 0.28);
  ctx.restore();
  ctx.restore();
  d.pen.crescent(shape, pt(-6, -12), () => d.pen.hatch(shape, 2.6, 0.95, 0.4, { color: SHADOW, alpha: 0.28 }));
  poolEdge(ctx, shape, SHADOW, 0.6, 6);
}

/** A gilt boss: a domed stud with its rim, lit upper left. */
function boss(d: Draw, c: Pt, r: number): void {
  const ctx = d.pen.ctx;
  soft(ctx, 1.2, () => {
    ctx.fillStyle = rgba(SHADOW, 0.6);
    ctx.beginPath();
    ctx.arc(c.x + r * 0.3, c.y + r * 0.45, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  });
  const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.4, r * 0.1, c.x, c.y, r);
  g.addColorStop(0, GILT_LIGHT);
  g.addColorStop(0.5, GILT);
  g.addColorStop(1, GILT_DEEP);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.4, r * 0.22, '#fff4d0', 0.9);
  d.pen.circle(c.x, c.y, r, 0.7, INK);
}

/** A gilt lozenge at the plaque's point, with a boss at its heart. */
function lozenge(d: Draw, c: Pt, rx: number, ry: number): void {
  const shape = [pt(c.x, c.y - ry), pt(c.x + rx, c.y), pt(c.x, c.y + ry), pt(c.x - rx, c.y)];
  d.pen.fill(shape, GILT, 1);
  d.pen.fill([shape[3]!, shape[0]!, c], GILT_LIGHT, 0.85);
  d.pen.fill([shape[1]!, shape[2]!, c], GILT_DEEP, 0.85);
  d.pen.stroke(closed(shape), 0.8, INK, 0.9);
  boss(d, c, Math.min(rx, ry) * 0.38);
}

/** The name, cut in Roman capitals and gilded. */
function lettering(ctx: CanvasRenderingContext2D, text: string): void {
  let size = 74;
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.letterSpacing = '4px';
  const fit = 400;
  const measured = ctx.measureText(text).width;
  if (measured > fit) size = Math.floor((size * fit) / measured);
  const font = `700 ${size}px ${DISPLAY}`;
  const setup = (c: CanvasRenderingContext2D): void => {
    c.font = font;
    c.letterSpacing = '4px';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
  };
  const base = CY + size * 0.36;
  const top = base - size * 0.72;
  ctx.save();
  setup(ctx);
  // Where the letters stand off the lacquer: a hard dark shadow down and right, then a softer one.
  soft(ctx, 2.2, () => {
    ctx.fillStyle = rgba('#120604', 0.8);
    ctx.fillText(text, CX + 3, base + 4);
  });
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#1e0c06', 0.95);
  ctx.lineWidth = 3.2;
  ctx.strokeText(text, CX, base);
  const gold = ctx.createLinearGradient(0, top, 0, base);
  gold.addColorStop(0, '#fff0b8');
  gold.addColorStop(0.32, GILT_LIGHT);
  gold.addColorStop(0.5, GILT);
  gold.addColorStop(0.56, '#8e6018');
  gold.addColorStop(0.8, '#c8963a');
  gold.addColorStop(1, '#e8c070');
  ctx.fillStyle = gold;
  ctx.fillText(text, CX, base);
  ctx.restore();
  // The bevel: a bright edge on the strokes' upper-left faces, a dark one on their lower-right.
  for (const [dx, dy, color, alpha] of [[1.4, 1.8, '#fff6d6', 0.85], [-1.2, -1.6, '#3a2008', 0.7]] as const) {
    onLayer(ctx, (c) => {
      setup(c);
      c.fillStyle = rgba(color, alpha);
      c.fillText(text, CX, base);
    }, (c) => {
      setup(c);
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.fillText(text, CX + dx, base + dy);
    });
  }
}

export const drawTitle: MenuDrawer = (ctx, seed) => {
  const rng = createRng(seed);
  const d = makeDraw(ctx, seed + 1, 0, 0);
  const outer = plaque();
  const inner = inset(outer, FRAME);
  const fillet = inset(outer, FRAME + 6);
  // The plaque's shadow thrown down and right onto the sky.
  soft(ctx, 8, () => {
    ctx.fillStyle = rgba('#0a0608', 0.6);
    pathOf(ctx, outer.map((p) => pt(p.x + 5, p.y + 9)));
    ctx.fill();
  });
  d.pen.fill(outer, GILT, 1);
  frame(d, outer, inner);
  field(d, rng, inner);
  // The fillet: a fine gilt line inside the frame, lit along its upper-left run.
  rule(ctx, closed(fillet).map((p) => pt(p.x + 0.7, p.y + 0.9)), 1.3, SHADOW, 0.7);
  rule(ctx, closed(fillet), 1.1, mix(GILT, GILT_DEEP, 0.3), 0.95);
  rule(ctx, [fillet[5]!, fillet[0]!, fillet[1]!].map((p) => pt(p.x - 0.3, p.y - 0.4)), 0.5, GILT_LIGHT, 0.8);
  for (const p of [inset(outer, FRAME + 13)[0]!, inset(outer, FRAME + 13)[1]!, inset(outer, FRAME + 13)[3]!, inset(outer, FRAME + 13)[4]!]) boss(d, p, 2.6);
  lozenge(d, pt(CX - HALF - POINT + 32, CY), 13, 17);
  lozenge(d, pt(CX + HALF + POINT - 32, CY), 13, 17);
  // A last warm glaze from the light's side over the whole plaque.
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.beginPath();
  outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  bloomAt(ctx, pt(CX - HALF, CY - HALF_H), 300, LIGHT, 0.35);
  ctx.restore();
  lettering(ctx, 'INKHEROES');
};
