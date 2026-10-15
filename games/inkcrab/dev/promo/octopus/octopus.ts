import { bezier, capsule, closed, type Draw, edge, makeDraw, mottle, oval, pt, ribbon, shade, skin, tint } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { type Octo, OCTO_K, type P } from './motion';

/**
 * The common octopus, out of its den: the game draws it peering from a
 * crevice (critters/octopus.ts); this one is the whole animal, drawn with
 * the same pen kit and colours, every frame from its pose. Head and mantle
 * are drawn mantle-up in local units and turned by the pose's angle; the
 * arms are tapering ribbons along the spines motion.ts gives them, with pale
 * suckers along one edge, as the game draws its reaching arm.
 */
const SKINS = ['#ab5a3a', '#b5683f', '#a0523a'] as const;
const DARK = '#5c2a1e';
const PALE = '#e9cfae';
const IRIS = '#d9b45a';
const ARM_W = 6.8;

/** The mantle (the bag behind the head) and the head, local units, mantle up. */
export const MANTLE = { x: 0, y: -44, rx: 22, ry: 29 } as const;
const HEAD = { x: 0, y: -13, rx: 15.5, ry: 12.5 } as const;

export const mantleShape = (squeeze: number): Pt[] =>
  oval(MANTLE.x, MANTLE.y + squeeze * 2, MANTLE.rx * (1 - 0.13 * squeeze), MANTLE.ry * (1 + 0.05 * squeeze), 28)
    // A little fuller on its crown, as a real mantle sags.
    .map((p) => pt(p.x * (1 + 0.06 * Math.max(0, (MANTLE.y - p.y) / MANTLE.ry)), p.y));

/** Draws the arms (under the body), outermost first so the inner ones lie on top. */
export function drawArms(ctx: CanvasRenderingContext2D, o: Octo, boil: number, extra?: (d: Draw, i: number, spine: readonly P[]) => void): void {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(OCTO_K, OCTO_K);
  const d = makeDraw(ctx, 4100 + boil * 7, boil, 0);
  const wash = SKINS[boil % SKINS.length]!;
  for (const i of [0, 7, 1, 6, 2, 5, 3, 4]) {
    const spine = o.arms[i]!;
    arm(d, spine, wash);
    extra?.(d, i, spine);
  }
  ctx.restore();
}

function arm(d: Draw, spine: readonly P[], wash: string): void {
  const { pen } = d;
  const a = ribbon(spine, (u) => ARM_W * (1 - u * 0.86));
  skin(d, a.shape, wash, 0.8);
  // The paler underside along the edge nearer the bottom of the screen, where the suckers are.
  const lowSide = a.top.reduce((s, p) => s + p.y, 0) > a.bot.reduce((s, p) => s + p.y, 0) ? a.top : a.bot;
  pen.clipped(a.shape, () => tint(d, [...lowSide, ...[...spine].reverse()], PALE, 0.5));
  edge(d, a.shape, 0.55);
  for (let s = 1; s < spine.length - 1; s += 2) {
    const u = s / (spine.length - 1);
    const p = lowSide[s]!;
    const q = spine[s]!;
    const r = Math.max(0.5, ARM_W * 0.26 * (1 - u * 0.75));
    const c = pt(p.x + (q.x - p.x) * 0.2, p.y + (q.y - p.y) * 0.2);
    pen.fill(oval(c.x, c.y, r, r, 8), PAPER_FILL, 0.95);
    pen.hair(closed(oval(c.x, c.y, r, r, 8)), 0.45, d.ink, 0.8);
    pen.dot(c.x, c.y, r * 0.35, d.ink, 0.45);
  }
}

/**
 * Draws the head and mantle at the pose; `inside` draws the see-through
 * view in the mantle's local units (clipped to it) when the X-ray is on
 * (the pen sets its own alpha, so `inside` fades itself by `xray`).
 */
export function drawBody(ctx: CanvasRenderingContext2D, o: Octo, boil: number, xray: number, inside: (d: Draw) => void): void {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle);
  ctx.scale(OCTO_K, OCTO_K);
  const d = makeDraw(ctx, 5200 + boil * 7, boil, 0);
  const { pen } = d;
  const wash = SKINS[boil % SKINS.length]!;
  const mantle = mantleShape(o.squeeze);
  skin(d, mantle, wash, 0.85);
  tint(d, mantle, wash, 0.3);
  pen.clipped(mantle, () => {
    for (let i = 0; i < 16; i++) tint(d, oval(-18 + pen.rng() * 36, -70 + pen.rng() * 48, 1.6 + pen.rng() * 2.4, 1.2 + pen.rng() * 1.6, 8), DARK, 0.35);
    for (let i = 0; i < 14; i++) tint(d, oval(-18 + pen.rng() * 36, -70 + pen.rng() * 48, 1 + pen.rng(), 0.8 + pen.rng(), 8), PALE, 0.45);
  });
  mottle(d, mantle, 140, -73, -15, DARK, 0.55);
  shade(d, mantle, 0.4);
  if (xray > 0) {
    const window = oval(MANTLE.x, MANTLE.y + o.squeeze * 2, MANTLE.rx * (1 - 0.13 * o.squeeze) - 2.6, MANTLE.ry - 2.6, 28);
    pen.clipped(window, () => {
      pen.fill(window, PAPER_FILL, 0.88 * xray);
      pen.fill(window, '#f2c9c0', 0.25 * xray);
      inside(d);
    });
    // The cut-away's edge, dashed.
    ctx.save();
    ctx.setLineDash([2.2, 1.8]);
    ctx.globalAlpha = 0.5 * xray;
    ctx.strokeStyle = d.ink;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    window.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  edge(d, mantle, 1.2);
  // Papillae: little raised warts over the crown.
  for (let i = 15; i < 27; i += 2) {
    const p = mantle[i]!;
    pen.dot(p.x, p.y + 0.6, 1, wash, 1);
    pen.hair(bezier(pt(p.x - 1, p.y + 0.8), pt(p.x, p.y - 1.2), pt(p.x + 1, p.y + 0.8), 3), 0.55, d.ink, 0.85);
  }
  // The head, in front of the mantle's lower edge, with the eyes on its sides.
  const head = oval(HEAD.x, HEAD.y, HEAD.rx, HEAD.ry, 24);
  skin(d, head, wash, 0.85);
  tint(d, head, wash, 0.3);
  mottle(d, head, 50, -25, -1, DARK, 0.5);
  pen.clipped(head, () => tint(d, oval(0, -4, 12, 5, 14), PALE, 0.35));
  shade(d, head, 0.4);
  edge(d, head, 1.2);
  const siphon = [pt(11, -5), pt(15.5, -6.5), pt(17, -3.5), pt(12.5, -2)];
  pen.fill(siphon, wash, 0.75);
  pen.hair(closed(siphon), 0.6, d.ink, 0.75);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    eye(d, 12, -18, 4.6, wash);
    ctx.restore();
  }
  ctx.restore();
}

/** A bulging eye (as the game's octopus has): a gold iris, a bar of a pupil, a heavy lid and a little horn of skin. */
function eye(d: Draw, x: number, y: number, r: number, wash: string): void {
  const { pen } = d;
  const bulge = oval(x, y, r * 1.4, r * 1.25, 16);
  skin(d, bulge, wash, 0.85);
  tint(d, bulge, wash, 0.35);
  pen.stroke(bezier(pt(x - r * 1.4, y + r * 0.2), pt(x - r * 0.6, y - r * 1.9), pt(x + r * 1.4, y - r * 0.2), 8), 1.1, d.ink, 1, false);
  const cx = x + r * 0.2;
  const cy = y + r * 0.15;
  const ball = oval(cx, cy, r, r * 0.85, 14);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, IRIS, 0.85);
  pen.fill(capsule(pt(cx - r * 0.62, cy + r * 0.1), pt(cx + r * 0.62, cy + r * 0.1), r * 0.42, r * 0.42), d.ink, 0.95);
  pen.clipped(ball, () => {
    const lid = [pt(cx - r * 1.2, cy - r * 1.2), pt(cx + r * 1.2, cy - r * 1.2), pt(cx + r * 1.2, cy - r * 0.4), pt(cx - r * 1.2, cy - r * 0.25)];
    pen.fill(lid, PAPER_FILL, 1);
    pen.fill(lid, wash, 0.9);
  });
  pen.dot(cx + r * 0.45, cy - r * 0.05, r * 0.16, PAPER_FILL, 0.95);
  pen.stroke(closed(ball), 0.8, d.ink, 0.95, false);
  pen.hair([pt(cx - r * 1.05, cy - r * 0.25), pt(cx + r * 1.05, cy - r * 0.4)], 0.9, d.ink, 0.95);
  pen.stroke(bezier(pt(x - r * 0.3, y - r * 1.25), pt(x - r * 0.1, y - r * 2.2), pt(x - r * 0.7, y - r * 2.6), 5), 1, d.ink, 0.9, false);
}
