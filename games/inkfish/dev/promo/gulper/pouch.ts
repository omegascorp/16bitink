import { PAPER_FILL } from '../../../src/art/fish/kit';
import { INK, Pen, type Pt as PenPt } from '../../../src/art/pen';
import { HINGE, type MouthGeom, type Pt, SNOUT, THROAT, UPPER } from './mouth';

/**
 * The gulper's jaw and pouch, inked like the game's drawing of it: a paper
 * membrane with a lilac wash and fine hatching, a dark gape between the
 * jaws, and the long lower jaw with its little white teeth. Drawn in
 * snout-relative texture px (mouth.ts): the caller sets up the transform.
 *
 * In two passes round the body: `drawPouch` behind it (the membrane and the
 * gape, and whatever is inside), `drawJaw` in front (the lower jaw and the
 * pouch's rim).
 */

const WASH = '#4a3e4c';
const SKIN = '#26222c';
const DARK = '#1d1a22';
const GAPE = '#3a1d24';
const THROAT_DARK = '#0c0709';
const CHALK = '#e8e2f0';

const seedOf = (boil: number, k: number): number => 401 + boil * 977 + k * 131;

/** The membrane: from the jaw tip round the balloon to the throat, back along the throat to the hinge, and down the jaw. */
function pouchShape(g: MouthGeom): PenPt[] {
  return [...g.pouch, HINGE, ...g.lower.slice(1, -1)];
}

/** The gape: along the upper jaw to the hinge, down the lower jaw to its tip, and back across the opening. */
function gapeShape(g: MouthGeom): PenPt[] {
  return [...UPPER, ...g.lower.slice(1), ...[...g.opening].reverse().slice(1)];
}

export function drawPouch(ctx: CanvasRenderingContext2D, g: MouthGeom, fill: number, jaw: number, boil: number, inside: () => void): void {
  const pen = new Pen(ctx, seedOf(boil, 0), 0.45);
  const shape = pouchShape(g);
  const b = g.balloon;
  // Paper, then the wash, lighter as it stretches thin.
  pen.fill(shape, PAPER_FILL, 0.95);
  pen.fill(shape, WASH, 0.5 - 0.18 * Math.min(1, fill));
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  const r = Math.min(b.r, Math.max(box.x1 - box.x0, box.y1 - box.y0));
  pen.clipped(shape, () => {
    // Hatching down the membrane.
    // Hatching down the membrane, bowed out round the balloon like the lines on a globe.
    const mid = (box.x0 + box.x1) / 2;
    const bow = 0.3 * Math.min(1, fill * 1.5);
    for (let x = box.x0 - 4; x < box.x1 + 4; x += 2.8) {
      const line = Array.from({ length: 7 }, (_, i) => {
        const v = i / 6;
        return { x: x + (x - mid) * bow * Math.sin(Math.PI * v), y: box.y0 - 2 + (box.y1 - box.y0 + 4) * v };
      });
      pen.hair(line, 0.45, INK, 0.26);
    }
    // Shade towards its far side, and the dark of the cavity seen through the open mouth.
    const shade = ctx.createRadialGradient(b.cx - r * 0.25, b.cy - r * 0.35, r * 0.15, b.cx, b.cy, r * 1.05);
    shade.addColorStop(0, 'rgba(29,26,34,0)');
    shade.addColorStop(1, 'rgba(29,26,34,0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(box.x0 - 2, box.y0 - 2, box.x1 - box.x0 + 4, box.y1 - box.y0 + 4);
    if (jaw > 0.05) {
      const depth = ctx.createRadialGradient(g.gate.x, g.gate.y, 0, g.gate.x, g.gate.y, Math.max(8, r * 1.25));
      depth.addColorStop(0, `rgba(42,20,24,${(0.92 * Math.min(1, jaw * 1.5)).toFixed(3)})`);
      depth.addColorStop(0.55, `rgba(42,20,24,${(0.55 * Math.min(1, jaw * 1.5)).toFixed(3)})`);
      depth.addColorStop(1, 'rgba(42,20,24,0)');
      ctx.fillStyle = depth;
      ctx.fillRect(box.x0 - 2, box.y0 - 2, box.x1 - box.x0 + 4, box.y1 - box.y0 + 4);
    }
  });
  inside();
  // The gape: dark, darkest down the throat.
  if (jaw > 0.02) {
    const gape = gapeShape(g);
    pen.fill(gape, GAPE, 0.97);
    pen.clipped(gape, () => {
      const throat = ctx.createLinearGradient(HINGE.x, HINGE.y, (SNOUT.x + g.tip.x) / 2, (SNOUT.y + g.tip.y) / 2);
      throat.addColorStop(0, THROAT_DARK);
      throat.addColorStop(0.7, 'rgba(12,7,9,0.25)');
      throat.addColorStop(1, 'rgba(12,7,9,0)');
      ctx.fillStyle = throat;
      ctx.fillRect(HINGE.x - 10, Math.min(SNOUT.y, HINGE.y) - 10, SNOUT.x - HINGE.x + 30, g.tip.y - SNOUT.y + 30);
    });
  }
}

/** Little white teeth along a jaw, pointing `dir` (1 down, -1 up) across the gape. */
function teeth(pen: Pen, line: readonly Pt[], dir: number, open: number): void {
  for (let i = 2; i < line.length - 1; i += 2) {
    const p = line[i]!;
    pen.hair([p, { x: p.x - 0.4, y: p.y + dir * (1.4 + 1.6 * open) }], 0.65, PAPER_FILL, 0.95);
  }
}

export function drawJaw(ctx: CanvasRenderingContext2D, g: MouthGeom, fill: number, jaw: number, boil: number): void {
  const pen = new Pen(ctx, seedOf(boil, 1), 0.45);
  // The pouch's rim, and a highlight where the stretched membrane catches light.
  pen.stroke(g.pouch, 1.6, INK, 1, true);
  if (fill > 0.15) {
    // Along the back of the balloon, just inside its rim.
    const b = g.balloon;
    const n = g.pouch.length - 1;
    const arc = g.pouch.slice(Math.round(n * 0.62), Math.round(n * 0.86)).map((p) => {
      const k = Math.min(0.2, 9 / b.r);
      return { x: p.x + (b.cx - p.x) * k, y: p.y + (b.cy - p.y) * k };
    });
    pen.hair(arc, 2.2, CHALK, 0.35 * Math.min(1, (fill - 0.15) * 2));
  }
  // The lower jaw: a long bony band, wide at the hinge.
  const n = g.lower.length - 1;
  const band = (side: number): Pt[] =>
    g.lower.map((p, i) => {
      const q = g.lower[Math.min(n, i + 1)]!;
      const r = g.lower[Math.max(0, i - 1)]!;
      const len = Math.hypot(q.x - r.x, q.y - r.y) || 1;
      const w = 2.4 - 1.2 * (i / n);
      return { x: p.x - ((q.y - r.y) / len) * w * side, y: p.y + ((q.x - r.x) / len) * w * side };
    });
  const bone = [...band(-1), ...band(1).reverse()];
  pen.fill(bone, PAPER_FILL, 1);
  pen.fill(bone, SKIN, 0.4);
  pen.fill(bone, DARK, 0.35);
  pen.stroke([...bone, bone[0]!], 1.1, INK, 1, false);
  if (jaw > 0.05) {
    teeth(pen, band(-1), -1, jaw);
    teeth(pen, UPPER.slice(1), 1, jaw);
  }
  // The throat end of the pouch, tucked under the body.
  pen.hair([THROAT, { x: THROAT.x + 3, y: THROAT.y + 2 }], 1, INK, 0.8);
}
