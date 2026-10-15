import { bezier, type Draw, edge, makeDraw, oval, pt, shade, skin, tint, tube } from '../../../src/art/kit';
import { createRng } from '../../../src/logic/rng';
import type { Pt } from '../../../src/art/pen';
import { HIGHLIGHT, INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { clamp01, lerp, smooth } from '../short';
import type { Lens } from './beats';

/**
 * The payoff's magnifiers: a raccoon's hand seen palm up, drawn big with
 * the game's pen, its fingers and pads packed with nerve endings (ink dots
 * with fine branches) that light up in highlighter yellow as they fire. The
 * wet one has water beaded on it and fires far brighter. Lens space runs
 * -100 .. 100 across the glass.
 */
const PALM = '#8f8794';
const WET_WASH = '#6f9ccc';

/** The fingers: where each leaves the palm, which way it points (radians) and how long it is. */
const FINGERS: readonly (readonly [number, number, number, number])[] = [
  [-38, 8, -2.6, 46], [-22, -10, -2.0, 60], [0, -15, -1.57, 66], [22, -10, -1.14, 60], [38, 8, -0.55, 46],
];
const PALM_C = pt(0, 26);
/** A finger's spine, root to tip, bowed a little outwards. */
function spine(f: readonly [number, number, number, number]): Pt[] {
  const [x, y, a, len] = f;
  const tip = pt(x + Math.cos(a) * len, y + Math.sin(a) * len);
  const bow = pt((x + tip.x) / 2 + Math.cos(a - Math.PI / 2) * 4 * Math.sign(x), (y + tip.y) / 2 + Math.sin(a - Math.PI / 2) * 4 * Math.sign(x));
  return bezier(pt(x, y), bow, tip, 10);
}

/** The nerve endings: packed into the fingertips and the pads, fewer between. */
const NERVES: readonly Pt[] = (() => {
  const rng = createRng(1986);
  const out: Pt[] = [];
  for (const f of FINGERS) {
    const s = spine(f);
    for (let k = 0; k < 9; k++) {
      const u = 0.3 + 0.7 * Math.sqrt(rng());
      const p = s[Math.round(u * (s.length - 1))]!;
      out.push(pt(p.x + (rng() - 0.5) * 12, p.y + (rng() - 0.5) * 12));
    }
  }
  for (let k = 0; k < 26; k++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    out.push(pt(PALM_C.x + Math.cos(a) * 38 * r, PALM_C.y + Math.sin(a) * 28 * r));
  }
  // Shuffled, so they fill in all over at once rather than finger by finger.
  return out.map((p) => ({ p, k: rng() })).sort((a, b) => a.k - b.k).map((e) => e.p);
})();
export const NERVE_COUNT = NERVES.length;

/** The hand, palm up: a broad pad, five long fingers each ending in a round pad and a small claw. */
function drawHand(d: Draw, wet: boolean): void {
  const { pen } = d;
  const wash = wet ? WET_WASH : PALM;
  for (const f of FINGERS) {
    const s = spine(f);
    const tip = s[s.length - 1]!;
    const claw = pt(tip.x + Math.cos(f[2]) * 17, tip.y + Math.sin(f[2]) * 17);
    pen.stroke(bezier(pt(tip.x + Math.cos(f[2]) * 8, tip.y + Math.sin(f[2]) * 8), pt(claw.x + Math.cos(f[2] + 1.2) * 3, claw.y + Math.sin(f[2] + 1.2) * 3), claw, 4), 3, INK, 0.9, false);
    const shape = tube(s, 22, 17);
    skin(d, shape, wash, 0.55);
    edge(d, shape, 1.4);
    const pad = oval(tip.x, tip.y, 11, 11, 16);
    skin(d, pad, wash, 0.45);
    tint(d, oval(tip.x - 2, tip.y - 2, 6, 6, 12), PAPER_FILL, 0.5);
    edge(d, pad, 1.3);
  }
  const palm = oval(PALM_C.x, PALM_C.y, 48, 38, 28);
  skin(d, palm, wash, 0.6);
  // The pads: one across the base of the fingers, two at the heel.
  for (const [x, y, rx, ry] of [[0, 10, 30, 11], [-17, 40, 14, 11], [17, 40, 14, 11]] as const) {
    const pad = oval(x, y, rx, ry, 18);
    tint(d, pad, PAPER_FILL, 0.4);
    pen.hair([...pad, pad[0]!], 0.8, INK, 0.5);
  }
  shade(d, palm, 0.3);
  edge(d, palm, 1.6);
}

/** The nerve endings: each a dot with three fine branches, lit by a yellow glow at `glow`. */
function drawNerves(d: Draw, shown: number, glow: number, flicker: number): void {
  const { pen, ctx } = { pen: d.pen, ctx: d.pen.ctx };
  const n = Math.round(NERVES.length * clamp01(shown));
  for (let i = 0; i < n; i++) {
    const p = NERVES[i]!;
    const lit = clamp01(glow * (0.75 + 0.25 * Math.sin(flicker * 9 + i * 1.7)));
    if (lit > 0.02) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 5 + 13 * lit);
      g.addColorStop(0, `rgba(243,224,74,${0.95 * lit})`);
      g.addColorStop(1, 'rgba(243,224,74,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 20, p.y - 20, 40, 40);
    }
    for (let k = 0; k < 3; k++) {
      const a = i * 2.4 + k * 2.1;
      pen.hair([p, pt(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6)], 0.6, INK, 0.75);
    }
    pen.dot(p.x, p.y, 2 + 1 * lit, lit > 0.5 ? '#7a5a00' : INK, 0.95);
  }
}

/** Water beaded on the wet hand: drops with a glint, a sheen across it. */
function drawWet(d: Draw): void {
  const { pen } = d;
  for (const [x, y, r] of [[-26, -48, 5], [14, -62, 4.5], [30, 8, 6], [-10, 30, 5], [-50, -18, 4], [44, -34, 4], [4, -28, 4]] as const) {
    const drop = oval(x, y, r, r * 1.2, 12);
    pen.fill(drop, WET_WASH, 0.5);
    pen.hair([...drop, drop[0]!], 0.6, INK, 0.7);
    pen.dot(x - r * 0.35, y - r * 0.45, r * 0.3, PAPER_FILL, 0.95);
  }
}

/** The "how much it feels" meter: five bars, `level` of them lit. */
function drawMeter(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  for (let k = 0; k < 5; k++) {
    const h = 18 + k * 12;
    const bx = x - 70 + k * 30;
    const fill = clamp01(level - k);
    ctx.fillStyle = '#0d1230';
    ctx.fillRect(bx - 2, y - h - 2, 24, h + 4);
    if (fill > 0) {
      ctx.fillStyle = HIGHLIGHT;
      ctx.fillRect(bx, y - h * fill, 20, h * fill);
    }
    ctx.strokeStyle = PAPER_FILL;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, y - h, 20, h);
  }
  ctx.restore();
}

/**
 * One magnifier, grown out of the paw at `spot` to its place: dashed
 * paper-white sight lines from the paw, a paper disc with the hand inside,
 * the rim, and under it the meter.
 */
export function drawLens(ctx: CanvasRenderingContext2D, lens: Lens, spot: Pt, t: number, boil: number): void {
  if (lens.open <= 0) return;
  const e = smooth(lens.open);
  const c = { x: lerp(spot.x, lens.x, e), y: lerp(spot.y, lens.y, e) };
  const r = lerp(16, lens.r, e);
  ctx.save();
  ctx.globalAlpha = clamp01(lens.open * 4);
  // Sight lines from the paw.
  const dist = Math.hypot(c.x - spot.x, c.y - spot.y) || 1;
  const px = -(c.y - spot.y) / dist;
  const py = (c.x - spot.x) / dist;
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(spot.x + px * 18 * s, spot.y + py * 18 * s);
    ctx.lineTo(c.x + px * r * s, c.y + py * r * s);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, 18, 0, Math.PI * 2);
  ctx.stroke();
  // The glass: paper, the hand, the nerves.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = PAPER;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.translate(c.x, c.y + r * 0.1);
  ctx.scale(r / 100, r / 100);
  const d = makeDraw(ctx, 7100 + boil + (lens.id === 'wet' ? 10 : 0), boil, 0);
  if (lens.id === 'wet') ctx.globalAlpha = 1;
  drawHand(d, lens.id === 'wet');
  drawNerves(d, lens.dots, lens.glow, t);
  if (lens.id === 'wet') drawWet(d);
  ctx.restore();
  // The rim, paper under ink so it holds against the night.
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#0d1230';
  ctx.lineWidth = 20;
  ctx.stroke();
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = 8;
  ctx.stroke();
  if (lens.pulse > 0 && lens.pulse < 1) {
    ctx.globalAlpha = (1 - lens.pulse) * clamp01(lens.open * 4);
    ctx.strokeStyle = HIGHLIGHT;
    ctx.lineWidth = 10 * (1 - lens.pulse) + 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r + 10 + 70 * lens.pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  drawMeter(ctx, c.x, c.y + r + 74, lens.bars, lens.meter);
}
