import { bezier, edge, oval, pt, tint, type Draw } from '../../../src/art/kit';
import { gleam, mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { frost, patch, WASH } from '../../../src/art/prospector/parts';
import { arm } from '../../../src/art/prospector/suit';
import type { Frame } from '../sprites';

/**
 * The wings, strapped along the prospector's arm: a canvas wing on a light
 * wooden frame, as a da Vinci ornithopter or a hang glider is built, a spar
 * along the arm and ribs fanning back to a scalloped trailing edge, buckled
 * on with two leather straps. Drawn in the game's units with the shoulder at
 * the origin and the arm along +x; the canvas spreads to -y, so turned to
 * point back (about 180°) it hangs below the arm, the way a wing would.
 */
export const WING_FRAME: Frame = { w: 50, h: 26, ox: 5, oy: 21 };

/** The hand, where the glove grips the spar. */
const HAND = pt(11, 0.2);
/** The spar's root and tip. */
const SPAR = [pt(-1.4, -1.4), pt(42.5, -4.2)] as const;
/** Where each rib leaves the spar (0..1 of the way along) and where it ends on the trailing edge. */
const RIBS: readonly { readonly u: number; readonly tip: Pt }[] = [
  { u: 0.99, tip: pt(41.6, -7.4) },
  { u: 0.86, tip: pt(36.4, -13.2) },
  { u: 0.69, tip: pt(28.6, -16.8) },
  { u: 0.5, tip: pt(19.6, -17.2) },
  { u: 0.32, tip: pt(11.6, -13.6) },
  { u: 0.17, tip: pt(5.8, -6.6) },
  { u: 0.1, tip: pt(3.4, -2.2) },
];
const CANVAS = '#ead9b0';
const CANVAS_DEEP = '#d3b47e';
const WOOD = '#8f5d34';

const onSpar = (u: number): Pt => pt(SPAR[0].x + (SPAR[1].x - SPAR[0].x) * u, SPAR[0].y + (SPAR[1].y - SPAR[0].y) * u);

/** The trailing edge: scalloped between rib tips, the canvas sagging in between. */
function trailing(): Pt[] {
  return RIBS.slice(0, -1).flatMap((r, i) => {
    const next = RIBS[i + 1]!.tip;
    const mid = pt((r.tip.x + next.x) / 2, (r.tip.y + next.y) / 2);
    const toSpar = onSpar((r.u + RIBS[i + 1]!.u) / 2);
    const sag = pt(mid.x + (toSpar.x - mid.x) * 0.16, mid.y + (toSpar.y - mid.y) * 0.16);
    return bezier(r.tip, sag, next, 8).slice(i === 0 ? 0 : 1);
  });
}

/** The canvas's outline: along the spar to its tip, then back along the trailing edge. */
export function wingShape(): Pt[] {
  return [onSpar(0.1), SPAR[1], ...trailing()];
}

/** One panel of canvas between two ribs. */
function panel(i: number): Pt[] {
  const a = RIBS[i]!;
  const b = RIBS[i + 1]!;
  return [onSpar(a.u), a.tip, b.tip, onSpar(b.u)];
}

function strapAt(d: Draw, x: number): void {
  const s = [pt(x - 0.9, -3.4), pt(x + 0.9, -3.5), pt(x + 1, 2.5), pt(x - 0.8, 2.6)];
  paint(d, s, WASH.leather, { alpha: 0.95, shadow: 0.45, hatch: 0, line: 0.4, gloss: false });
  const buckle = [pt(x - 1.1, -0.6), pt(x + 1.1, -0.7), pt(x + 1.1, 1), pt(x - 1.1, 1.1)];
  paint(d, buckle, '#c9cfd8', { alpha: 1, shadow: 0.4, hatch: 0, line: 0.35, gloss: true });
  d.pen.hair([pt(x, -0.5), pt(x, 0.9)], 0.3, d.ink, 0.8);
}

/** The wing on its arm; `sleeve` is the arm's own cloth (the suit's). */
export function drawWing(d: Draw, suitMk: number, dark = false): void {
  const shape = wingShape();
  paint(d, shape, CANVAS, { alpha: 0.9, shadow: 0.4, hatch: 0.12, line: 0 });
  // Sewn panels, every other one a shade deeper, and a patch.
  for (let i = 0; i < RIBS.length - 1; i += 2) d.pen.clipped(shape, () => tint(d, panel(i), CANVAS_DEEP, 0.38));
  d.pen.clipped(shape, () => patch(d, 24, -10.5, 2, '#c98e5a'));
  // Light through the canvas near the spar, shadow pooling at the trailing edge.
  d.pen.clipped(shape, () => {
    const ctx = d.pen.ctx;
    const g = ctx.createLinearGradient(0, -2, 0, -19);
    g.addColorStop(0, 'rgba(255, 244, 214, 0.35)');
    g.addColorStop(1, 'rgba(60, 40, 40, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(-4, -22, 48, 22);
  });
  edge(d, shape, 0.7);
  // Ribs: thin wooden rods, stitched to the canvas.
  for (const r of RIBS.slice(0, -1)) {
    const root = onSpar(r.u);
    d.pen.stroke([root, r.tip], 0.95, d.ink, 0.95, false);
    d.pen.stroke([root, r.tip], 0.5, WOOD, 1, false);
    const n = 5;
    for (let k = 1; k < n; k++) {
      const p = pt(root.x + ((r.tip.x - root.x) * k) / n, root.y + ((r.tip.y - root.y) * k) / n);
      d.pen.hair([pt(p.x - 0.5, p.y - 0.3), pt(p.x + 0.5, p.y + 0.3)], 0.22, d.ink, 0.55);
    }
  }
  arm(d, suitMk, pt(0, 0), HAND);
  // The spar over the arm and past the hand.
  const spar = [SPAR[0], SPAR[1]];
  d.pen.stroke(spar, 1.7, d.ink, 1, false);
  d.pen.stroke(spar, 1.05, WOOD, 1, false);
  gleam(d, [pt(14, -2.6), pt(36, -3.6)], 0.35, 0.7);
  // Its glove round the spar again, over it.
  paint(d, oval(HAND.x, HAND.y - 0.6, 2.3, 2.1, 14), WASH.leather, { alpha: 0.95, shadow: 0.5, hatch: 0, line: 0.45 });
  for (const x of [3.2, 8.2]) strapAt(d, x);
  // A cap on the spar's tip.
  d.pen.dot(SPAR[1].x, SPAR[1].y, 0.9, mix(WOOD, SHADOW, 0.4), 1);
  if (dark) {
    // The far wing, in the body's shadow.
    const ctx = d.pen.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#3a1e10';
    ctx.fillRect(-10, -26, 60, 32);
    ctx.restore();
  }
}

/** Frost on the wing (drawn over it, faded in): rime along the spar and ribs, icy canvas at the edges. */
export function drawWingFrost(d: Draw): void {
  const shape = wingShape();
  const ctx = d.pen.ctx;
  d.pen.clipped(shape, () => {
    // Ice glazing the canvas from its edges in.
    const g = ctx.createLinearGradient(0, -2, 0, -20);
    g.addColorStop(0, 'rgba(220, 240, 255, 0.55)');
    g.addColorStop(0.45, 'rgba(220, 240, 255, 0.12)');
    g.addColorStop(1, 'rgba(232, 246, 255, 0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(-4, -22, 48, 22);
    // Feathery crystals fanning across each panel.
    RIBS.forEach((r, i) => {
      const root = onSpar(r.u);
      for (let k = 0; k < 5; k++) {
        const u = 0.2 + k * 0.16;
        const p = pt(root.x + (r.tip.x - root.x) * u, root.y + (r.tip.y - root.y) * u);
        const s = 1.6 + (i % 2) * 0.6;
        d.pen.hair([p, pt(p.x + s, p.y - s * 0.6)], 0.22, '#ffffff', 0.85);
        d.pen.hair([p, pt(p.x - s * 0.8, p.y - s * 0.8)], 0.22, '#ffffff', 0.85);
      }
    });
  });
  frost(d, Array.from({ length: 34 }, (_, i) => onSpar(i / 33)).map((p) => pt(p.x, p.y - 0.9)));
  frost(d, trailing().filter((_, i) => i % 2 === 0));
  for (const r of RIBS.slice(0, -1)) frost(d, [0.3, 0.55, 0.8].map((u) => { const root = onSpar(r.u); return pt(root.x + (r.tip.x - root.x) * u, root.y + (r.tip.y - root.y) * u); }));
  // Rime on the glove and the arm.
  frost(d, [pt(-1, -2), pt(2, -2.1), pt(5, -2.2), pt(8, -2.2), pt(10, -2.3), pt(12, -2)]);
  d.pen.fill(oval(HAND.x, HAND.y - 1.4, 2, 0.9, 10), PAPER_FILL, 0.55);
}

/** A puffy coat sleeve over the arm (the coat's), quilted in rings. */
export function drawSleeve(d: Draw, coat: string): void {
  const from = pt(-1.2, 0.1);
  const to = pt(9.6, 0.3);
  const n = 4;
  for (let i = n - 1; i >= 0; i--) {
    const u = (i + 0.5) / n;
    const c = pt(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u);
    const puff = oval(c.x, c.y, 1.9, 3.5 - u * 0.5, 16);
    paint(d, puff, coat, { alpha: 0.96, shadow: 0.5, hatch: 0.1, line: 0.5, gloss: true });
  }
  // A fleece cuff at the wrist.
  paint(d, oval(to.x + 0.8, to.y, 1.2, 2.9, 12), '#f1e7d2', { alpha: 1, shadow: 0.35, hatch: 0, line: 0.4 });
}
