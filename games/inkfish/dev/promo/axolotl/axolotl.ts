import { PAPER_FILL } from '../../../src/art/fish/kit';
import { halo } from '../../../src/art/glowArt';
import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { closed, livePen, pt, ribbon } from './ink';
import { drawInsides, drawLegInsides, type Insides } from './insides';
import { drawGhostLeg, drawLeg, FAR_HIND, grownLeg, legShape, NEAR_FRONT, NEAR_HIND, SKIN, SKIN_DARK } from './legs';

/**
 * The axolotl, inked live each frame so it can move: pink skin washed over
 * paper, three pairs of feathery gills, a wide smile, a fin fold along its
 * back and tail, and four thin legs. Its near front leg is the one that
 * regrows: from a glowing bud to a whole leg, its four toes popping out last.
 *
 * Drawn in its own units, side on, facing right: the snout at x = 140, the
 * tail tip at x = -205, the spine along y = 0 and the feet at y ≈ 62.
 */

const GILL = '#d2405e';
const GILL_LIGHT = '#f27e95';
const FIN = '#f6c4cf';

export interface LegLook {
  /** How much of the leg there is, 0 .. 1 (the bud is about 0.2). */
  readonly grow: number;
  /** Each toe's pop-in scale. */
  readonly toes: readonly number[];
  /** The bud's glow, 0 .. ~1.3. */
  readonly glow: number;
  /** The dashed outline of the whole leg, 0 .. 1. */
  readonly ghost: number;
}

export interface AxoLook {
  readonly smile: number;
  readonly squint: number;
  readonly droop: number;
  readonly smug: number;
  readonly wave: number;
  readonly wiggle: number;
  readonly gills: number;
  readonly leg: LegLook;
  readonly insides: Insides;
}

// ---------------------------------------------------------------- the body's shape

/** The spine's sideways swing at x: none in the head, more toward the tail. */
const spineY = (x: number, look: AxoLook): number => {
  if (x > 40) return 0;
  const k = (40 - x) / 245;
  return look.wiggle * 13 * k ** 1.5 * Math.sin(look.wave - x * 0.028);
};

/** Half the body's depth at x: a broad round head, a slight neck, a long body tapering into the tail. */
function halfDepth(x: number): number {
  if (x > 55) return 37 * Math.sqrt(Math.max(0, 1 - ((x - 90) / 52) ** 2));
  if (x >= -80) return 25 + 3 * Math.sin((Math.PI * (x + 80)) / 135);
  return 25 * Math.max(0, (x + 205) / 125) ** 0.9;
}
/** The fin fold's height above the back and below the tail. */
const finTop = (x: number): number => (x > 30 ? 0 : x > -120 ? 15 * ((30 - x) / 150) ** 0.8 : 15 + 5 * Math.sin((Math.PI * (-120 - x)) / 85));
const finBottom = (x: number): number => (x > -85 ? 0 : 13 * Math.sin((Math.PI * (-85 - x)) / 120) ** 0.7);

const XS = Array.from({ length: 70 }, (_, i) => 142 - (347 * i) / 69);

function outline(look: AxoLook, top: (x: number) => number, bottom: (x: number) => number): Pt[] {
  const upper = XS.map((x) => pt(x, spineY(x, look) - top(x)));
  const lower = [...XS].reverse().map((x) => pt(x, spineY(x, look) + bottom(x)));
  return [...upper, ...lower];
}

// ---------------------------------------------------------------- gills

const GILLS: readonly (readonly [Pt, number, number])[] = [
  [pt(60, -24), -2.2, 44],
  [pt(57, -13), -2.62, 50],
  [pt(56, -1), -2.98, 42],
];

/** One feathery gill stalk: a curved stem fringed with fine filaments. */
function drawGill(pen: Pen, root: Pt, angle: number, len: number, lw: number, far: boolean): void {
  const dir = pt(Math.cos(angle), Math.sin(angle));
  const nrm = pt(-dir.y, dir.x);
  const bend = 9;
  const stem: Pt[] = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12;
    return pt(root.x + dir.x * len * u + nrm.x * bend * Math.sin(Math.PI * u * 0.8), root.y + dir.y * len * u + nrm.y * bend * Math.sin(Math.PI * u * 0.8));
  });
  const deep = far ? '#9c2e47' : GILL;
  // A feather: narrow at the root, full in the middle, rounded at the tip.
  const { shape } = ribbon(stem, (u) => 8.5 * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.9)) ** 0.7 + 0.8);
  pen.fill(shape, far ? '#c9566f' : GILL_LIGHT, far ? 0.5 : 0.6);
  stem.forEach((p, i) => {
    if (i === 0) return;
    const u = i / 12;
    const a = stem[i - 1]!;
    const tx = (p.x - a.x) / (Math.hypot(p.x - a.x, p.y - a.y) || 1);
    const ty = (p.y - a.y) / (Math.hypot(p.x - a.x, p.y - a.y) || 1);
    const reach = 10 * (1 - 0.5 * u);
    for (const side of [1, -1]) {
      for (const k of [0, 0.5]) {
        const q = pt(a.x + (p.x - a.x) * k, a.y + (p.y - a.y) * k);
        pen.hair([q, pt(q.x - ty * side * reach + tx * reach * 0.55, q.y + tx * side * reach + ty * reach * 0.55)], lw * 0.42, deep, 0.85);
      }
    }
  });
  pen.stroke(stem, lw * 0.75, far ? '#7d2238' : '#9a2742', 1, false);
}

function drawGills(pen: Pen, look: AxoLook, lw: number, far: boolean): void {
  GILLS.forEach(([root, angle, len], i) => {
    const sway = look.gills * (1 + 0.35 * i);
    const r = far ? pt(root.x + 4, root.y - 7) : root;
    drawGill(pen, r, angle + sway + (far ? 0.18 : 0), len * (far ? 0.92 : 1), lw, far);
  });
}

// ---------------------------------------------------------------- the face

function drawFace(pen: Pen, look: AxoLook, lw: number): void {
  const eye = pt(114, -15);
  if (look.squint > 0.5) {
    // Happy eyes: a little upturned arc.
    pen.stroke([pt(eye.x - 6, eye.y + 2), pt(eye.x - 2.5, eye.y - 3), pt(eye.x + 2.5, eye.y - 3), pt(eye.x + 6, eye.y + 2)], lw * 1.1, INK, 1, false);
  } else {
    pen.fill(ellipse(eye.x, eye.y, 6.5, 6.5, 16), '#3a2a2e', 0.35);
    pen.fill(ellipse(eye.x, eye.y, 5, 5, 16), INK, 1);
    pen.dot(eye.x + 1.6, eye.y - 1.8, 1.5, PAPER_FILL, 0.95);
    // A heavy, flat lid: low and sad, or half down and smug.
    const lidDown = Math.max(0.75 * look.droop, 0.5 * look.smug);
    if (lidDown > 0.02) {
      const y = eye.y - 7 + 10 * lidDown;
      const lid = [pt(eye.x - 7.5, y + 0.5), pt(eye.x + 7.5, y - 0.5), pt(eye.x + 7.5, eye.y - 8), pt(eye.x - 7.5, eye.y - 8)];
      pen.fill(lid, SKIN, 1);
      pen.hair([lid[0]!, lid[1]!], lw * 0.7, INK, 1);
    }
  }
  // The wide smile, from the snout back under the eye, wider and higher as it grins.
  const s = look.smile;
  const startP = pt(139, 4);
  const end = pt(104 - 15 * (s - 1), 8 - 5 * s + Math.max(0, 0.5 - s) * 22);
  const ctrl = pt(124, 11 + 5 * s);
  const mouth = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    const u = 1 - t;
    return pt(u * u * startP.x + 2 * u * t * ctrl.x + t * t * end.x, u * u * startP.y + 2 * u * t * ctrl.y + t * t * end.y);
  });
  if (s > 1.25) {
    const open = Math.min(1, (s - 1.25) / 0.4);
    const lower = mouth.map((p, i) => pt(p.x, p.y + 6 * open * Math.sin((Math.PI * i) / 10)));
    pen.fill([...mouth, ...[...lower].reverse()], '#8c2d42', 0.9);
    pen.fill([...lower.slice(3, 9).map((p) => pt(p.x, p.y - 2 * open)), ...[...lower.slice(3, 9)].reverse()], '#e8788c', 0.9);
  }
  pen.stroke(mouth, lw * 0.9, INK, 1, false);
  pen.hair([end, pt(end.x - 2.5, end.y - 3)], lw * 0.6, INK, 0.9);
  pen.fill(ellipse(end.x + 3, end.y + 6, 7, 4, 14), '#ee8098', 0.35);
  // Nostrils and the throat fold.
  pen.dot(136, -6, 1, INK, 0.7);
  pen.hair([pt(64, 20), pt(70, 26), pt(80, 29)], lw * 0.5, INK, 0.55);
}

// ---------------------------------------------------------------- the whole axolotl

/** Freckles on its back: the same every frame. */
const FRECKLES = (() => {
  const rng = createRng(4242);
  return Array.from({ length: 34 }, () => {
    const x = 120 - rng() * 290;
    return { x, up: 0.35 + rng() * 0.55, r: 0.6 + rng() * 0.9 };
  });
})();

/**
 * Draws the axolotl in its own units: the caller has translated, rotated and
 * scaled the context so 1 unit is `px` screen pixels.
 */
export function drawAxolotl(ctx: CanvasRenderingContext2D, look: AxoLook, px: number, boil: number): void {
  /** Line widths in units, thinning a little as it gets bigger on screen. */
  const lw = 1.25 * (2.4 / px) ** 0.6;
  const pen = livePen(ctx, boil, 1, 0.35);
  const clear = look.insides.xray;
  const leg = look.leg;

  // Behind the body: the far gills and hind leg (its far front leg is hidden behind the near one's shoulder).
  drawGills(pen, look, lw, true);
  drawLeg(pen, FAR_HIND, 1, [1, 1, 1, 1, 1], lw, true, 0, clear);
  // The near legs, their roots tucked under the belly (the front one regrowing, see-through as its bones form).
  drawLeg(pen, NEAR_HIND, 1, [1, 1, 1, 1, 1], lw, false, 0, clear);
  const legClear = Math.max(clear, look.insides.legXray);
  // New skin is paler and brighter while it grows, and glows as a bud.
  const fresh = Math.max(leg.grow < 0.999 ? 0.5 : 0, 0.55 * Math.min(1, leg.glow)) * (1 - legClear);
  const regrowing = grownLeg(NEAR_FRONT, leg.grow);
  drawLeg(pen, regrowing, 1, leg.toes, lw, false, fresh, legClear);
  if (legClear > 0.01) drawLegInsides(pen, look.insides, regrowing, { ...leg, grow: 1 }, lw, legClear);

  // The fin fold, see-through, with fine rays.
  const fin = outline(look, (x) => halfDepth(x) * 0.92 + finTop(x), (x) => halfDepth(x) * 1.05 + finBottom(x));
  pen.fill(fin, PAPER_FILL, 0.35);
  pen.fill(fin, FIN, 0.55);
  pen.clipped(fin, () => {
    for (let x = 24; x > -205; x -= 6) {
      const y = spineY(x, look);
      const top = halfDepth(x) * 0.92;
      pen.hair([pt(x, y - top), pt(x - 3, y - top - finTop(x))], lw * 0.35, SKIN_DARK, 0.45);
      if (finBottom(x) > 1) pen.hair([pt(x, y + top), pt(x - 3, y + top + finBottom(x) * 1.1)], lw * 0.35, SKIN_DARK, 0.45);
    }
  });
  pen.stroke(closed(fin), lw * 0.75, INK, 0.85, false);

  // The body: paper, the pink wash, shade underneath, freckles.
  const body = outline(look, (x) => halfDepth(x) * 0.92, (x) => halfDepth(x) * 1.05);
  pen.fill(body, PAPER_FILL, 1 - 0.7 * clear);
  pen.fill(body, SKIN, 0.92 * (1 - 0.6 * clear));
  pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -36, 0, 36);
    g.addColorStop(0, 'rgba(255,240,236,0.5)');
    g.addColorStop(0.45, 'rgba(255,240,236,0)');
    g.addColorStop(0.75, 'rgba(176,82,104,0.18)');
    g.addColorStop(1, 'rgba(150,60,84,0.45)');
    ctx.save();
    ctx.globalAlpha = 1 - 0.6 * clear;
    ctx.fillStyle = g;
    ctx.fillRect(-220, -60, 380, 120);
    ctx.restore();
  });
  pen.hatch(body, 3.2, 0.75, lw * 0.32, { color: SKIN_DARK, alpha: 0.55 * (1 - clear), onlyBelow: 12 });
  pen.stipple(body, 900, (_, y) => Math.max(0, (y - 4) / 30), lw * 0.32, SKIN_DARK);
  for (const f of FRECKLES) pen.dot(f.x, spineY(f.x, look) - halfDepth(f.x) * 0.92 * f.up, f.r, '#b0607a', 0.5 * (1 - clear));
  if (clear > 0.01) drawInsides(ctx, pen, look.insides, (x) => spineY(x, look), lw);
  pen.stroke(closed(body), lw * 1.15, INK, 1);

  // Over the body: the outline of the leg to come, the bud's glow, the near gills, the face.
  drawGhostLeg(ctx, NEAR_FRONT, leg.ghost, lw);
  if (leg.glow > 0.01) {
    const tip = regrowing.foot;
    halo(ctx, tip.x, tip.y - 4, 36, '#ffd98a', 0.16 * leg.glow);
    // A bright rim round the new little leg, below the belly.
    const bud = legShape(regrowing, 1).shape.filter((p) => p.y > 27);
    pen.stroke(bud, lw * 0.8, '#ffe58f', 0.9 * Math.min(1, leg.glow), false);
  }
  drawGills(pen, look, lw, false);
  drawFace(pen, look, lw);
}

/** The regrowing leg's tip in the axolotl's units (where the bud glows). */
export const budTip = (grow: number): Pt => grownLeg(NEAR_FRONT, grow).foot;
