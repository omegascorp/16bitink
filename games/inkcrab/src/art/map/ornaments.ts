import { bezier, type Draw, oval, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { BLUE, INK, PAPER_FILL, RED } from '../palette';
import { letter, straight } from './context';

/**
 * The chart's decorations: the compass rose with its fleur-de-lis, smaller
 * wind roses in the straits, the title cartouche and scale bar before the
 * first island, and the hermit-crab sea monster after the last.
 */
const SEA_WASH = '#5f9fb8';

function point(d: Draw, x: number, y: number, a: number, len: number, half: number, wash: string): void {
  const tip = pt(x + Math.cos(a) * len, y + Math.sin(a) * len);
  const side = a + Math.PI / 2;
  const l = pt(x + Math.cos(side) * half, y + Math.sin(side) * half);
  const r = pt(x - Math.cos(side) * half, y - Math.sin(side) * half);
  d.pen.fill([l, tip, pt(x, y)], wash, 0.9);
  d.pen.fill([r, tip, pt(x, y)], d.ink, 0.72);
  d.pen.hair([l, tip, r], 0.7, d.ink, 0.9);
}

/** A fleur-de-lis marking north. */
function fleur(d: Draw, x: number, y: number, s: number): void {
  const petal = (dir: number): Pt[] => bezier(pt(x, y), pt(x + dir * 12 * s, y - 4 * s), pt(x + dir * 7 * s, y - 14 * s), 8);
  const mid = [pt(x - 3 * s, y), ...bezier(pt(x - 3 * s, y - 6 * s), pt(x, y - 26 * s), pt(x + 3 * s, y - 6 * s), 10), pt(x + 3 * s, y)];
  d.pen.fill(mid, RED, 0.75);
  d.pen.hair([...mid, mid[0]!], 0.8, d.ink, 0.9);
  for (const dir of [-1, 1]) d.pen.stroke(petal(dir), 1, d.ink, 0.9, false);
  d.pen.stroke([pt(x - 6 * s, y + 2 * s), pt(x + 6 * s, y + 2 * s)], 1.4, d.ink, 0.9, false);
}

/** The compass rose: a ring of degree ticks round thirty-two points, north crowned with a fleur-de-lis. */
export function compassRose(d: Draw, x: number, y: number, r: number): void {
  d.pen.fill(oval(x, y, r, r, 40), PAPER_FILL, 0.85);
  d.pen.fill(oval(x, y, r * 0.82, r * 0.82, 40), SEA_WASH, 0.18);
  d.pen.circle(x, y, r, 1.2, d.ink);
  d.pen.circle(x, y, r * 0.93, 0.6, d.ink);
  d.pen.circle(x, y, r * 0.82, 0.8, d.ink);
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const r0 = r * 0.82;
    const r1 = r * (k % 8 === 0 ? 0.93 : k % 2 ? 0.87 : 0.9);
    d.pen.hair([pt(x + Math.cos(a) * r0, y + Math.sin(a) * r0), pt(x + Math.cos(a) * r1, y + Math.sin(a) * r1)], 0.5, d.ink, 0.75);
  }
  for (let k = 0; k < 16; k++) point(d, x, y, (k / 16) * Math.PI * 2 - Math.PI / 2 + Math.PI / 16, r * 0.42, r * 0.05, '#f1e6c8');
  for (let k = 0; k < 8; k++) point(d, x, y, (k / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8, r * 0.6, r * 0.08, '#cfe4d6');
  for (let k = 0; k < 4; k++) point(d, x, y, (k / 4) * Math.PI * 2 - Math.PI / 2, r * 0.8, r * 0.12, k === 0 ? '#e9b9a9' : PAPER_FILL);
  d.pen.fill(oval(x, y, r * 0.07, r * 0.07, 12), PAPER_FILL, 1);
  d.pen.circle(x, y, r * 0.07, 0.8, d.ink);
  fleur(d, x, y - r * 0.98, r / 60);
  for (const [t, a] of [['E', 0], ['S', Math.PI / 2], ['W', Math.PI]] as const) letter(d.pen.ctx, t, x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12, { size: 18, color: INK, alpha: 0.85, italic: false });
}

/** A smaller wind rose: sixteen points in a ring. */
export function windRose(d: Draw, x: number, y: number, r: number): void {
  d.pen.fill(oval(x, y, r, r, 24), PAPER_FILL, 0.7);
  d.pen.circle(x, y, r, 0.8, d.ink);
  for (let k = 0; k < 8; k++) point(d, x, y, (k / 8) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8, r * 0.6, r * 0.09, '#cfe4d6');
  for (let k = 0; k < 4; k++) point(d, x, y, (k / 4) * Math.PI * 2 - Math.PI / 2, r * 0.95, r * 0.14, k === 0 ? '#e9b9a9' : PAPER_FILL);
}

/** A swash: a looping flourish under a title. */
function swash(d: Draw, x: number, y: number, w: number): void {
  for (const dir of [-1, 1]) {
    const pts = [...bezier(pt(x, y), pt(x + dir * w * 0.3, y + 10), pt(x + dir * w * 0.5, y), 12), ...bezier(pt(x + dir * w * 0.5, y), pt(x + dir * w * 0.56, y - 8), pt(x + dir * w * 0.47, y - 6), 6)];
    d.pen.stroke(pts, 1, d.ink, 0.8, false);
  }
  d.pen.dot(x, y, 2.2, RED, 0.8);
}

/** One jointed limb: segments through the given points, washed and inked. */
function limb(d: Draw, pts: readonly Pt[], w: number, wash: string): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = ribbon([pts[i]!, pts[i + 1]!], (u) => w * (1 - i * 0.18) * (1 - u * 0.15)).shape;
    d.pen.fill(seg, wash, 0.9);
    d.pen.hair([...seg, seg[0]!], 0.6, d.ink, 0.9);
  }
}

/**
 * A hermit crab in a whelk, as a doodle: the shell's whorls coiling up to
 * its spire, the crab leaning out of the aperture on its walking legs, the
 * big right claw raised, eyes up on their stalks.
 */
export function crabDoodle(d: Draw, x: number, y: number, s: number, wash = '#d9774f'): void {
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  // The whelk: body whorl, then smaller whorls stepping up and back to the spire.
  const whorls: [number, number, number][] = [[12, -8, 15], [24, -20, 10], [32, -29, 6.5], [37, -35, 4]];
  for (const [i, [dx, dy, r]] of [...whorls].reverse().entries()) {
    const w = oval(x + dx * s, y + dy * s, r * s * 1.25, r * s, 22);
    d.pen.fill(w, PAPER_FILL, 1);
    d.pen.fill(w, i % 2 ? '#e6cfa2' : '#dcbf8a', 0.9);
    d.pen.crescent(w, pt(-r * s * 0.4, -r * s * 0.4), () => d.pen.hatch(w, 1.6, 0.9, 0.4, { color: d.ink, alpha: 0.5 }));
    d.pen.stroke([...w, w[0]!], 0.9, d.ink, 0.9, false);
  }
  for (let k = 0; k < 4; k++) d.pen.hair(bezier(P(2 + k * 4, -18 + k), P(12 + k * 3, -10 + k * 2), P(8 + k * 4, 4), 8), 0.6, '#8a6a48', 0.7);
  // The aperture, dark, the crab coming out of it.
  d.pen.fill(oval(x + 1 * s, y + 0 * s, 7 * s, 9 * s, 16), '#3a2a22', 0.8);
  for (const k of [0, 1, 2]) limb(d, [P(-2, 4 + k * 2), P(-12 - k * 4, 2 + k * 3), P(-18 - k * 5, 12 + k * 2), P(-20 - k * 5, 16 + k * 2)], 3.2 * s, wash);
  // The small left claw, then the big right one, raised.
  limb(d, [P(-4, -2), P(-12, -6), P(-18, -4)], 3.4 * s, wash);
  limb(d, [P(-4, -5), P(-14, -16), P(-22, -18)], 4.6 * s, wash);
  const claw = [P(-22, -24), P(-34, -28), P(-40, -22), P(-34, -18), P(-24, -14)];
  const finger = [P(-26, -14), P(-38, -12), P(-36, -9), P(-25, -10)];
  for (const c of [claw, finger]) {
    d.pen.fill(c, PAPER_FILL, 1);
    d.pen.fill(c, wash, 0.9);
    d.pen.crescent(c, pt(-2 * s, -2 * s), () => d.pen.hatch(c, 1.4, 0.9, 0.35, { color: d.ink, alpha: 0.45 }));
    d.pen.stroke([...c, c[0]!], 0.9, d.ink, 0.95, false);
  }
  for (let k = 0; k < 5; k++) d.pen.dot(x + (-34 + k * 2.4) * s, y + (-25 + k * 0.8) * s, 0.5 * s, d.ink, 0.7);
  // Eyes on stalks, and long antennae sweeping back.
  for (const [ex, tilt] of [[-6, -1], [-1, 1]] as const) {
    d.pen.stroke([P(ex, -6), P(ex - 2 + tilt, -16)], 1.1 * s, wash, 0.95, false);
    d.pen.dot(x + (ex - 2 + tilt) * s, y - 17 * s, 1.8 * s, d.ink, 0.95);
    d.pen.dot(x + (ex - 1.6 + tilt) * s, y - 17.6 * s, 0.5 * s, PAPER_FILL, 1);
  }
  d.pen.hair(bezier(P(-6, -10), P(-20, -36), P(-4, -44), 10), 0.5, d.ink, 0.8);
  d.pen.hair(bezier(P(-4, -10), P(-8, -40), P(10, -46), 10), 0.5, d.ink, 0.8);
}

/** The title cartouche: a framed panel with the chart's title, its maker and a crab. */
export function titleCartouche(d: Draw, x0: number, y0: number, w: number, h: number): void {
  const { ctx } = d.pen;
  const box = [pt(x0, y0), pt(x0 + w, y0), pt(x0 + w, y0 + h), pt(x0, y0 + h)];
  d.pen.fill(box.map((p) => pt(p.x + 5, p.y + 6)), 'rgba(38,49,106,0.14)', 1);
  d.pen.fill(box, PAPER_FILL, 1);
  d.pen.fill(box, '#efe1bd', 0.5);
  for (const inset of [0, 7]) {
    const b = [pt(x0 + inset, y0 + inset), pt(x0 + w - inset, y0 + inset), pt(x0 + w - inset, y0 + h - inset), pt(x0 + inset, y0 + h - inset)];
    d.pen.stroke(straight(b, 4), inset ? 0.7 : 1.6, d.ink, 0.9, false);
  }
  // Corner rosettes.
  for (const [cx, cy] of [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]] as const) {
    d.pen.fill(oval(cx, cy, 11, 11, 16), PAPER_FILL, 1);
    d.pen.fill(oval(cx, cy, 11, 11, 16), '#cfe4d6', 0.6);
    d.pen.circle(cx, cy, 11, 1, d.ink);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      d.pen.hair([pt(cx, cy), pt(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9)], 0.7, d.ink, 0.8);
    }
    d.pen.dot(cx, cy, 2, RED, 0.85);
  }
  const cx = x0 + w / 2;
  letter(ctx, 'A Beachcomber’s Map', cx, y0 + 46, { size: 40, color: BLUE, alpha: 0.95, italic: false });
  letter(ctx, 'of the Ten Beaches', cx, y0 + 86, { size: 30, color: BLUE, alpha: 0.95, italic: false });
  swash(d, cx, y0 + 112, w * 0.62);
  letter(ctx, 'surveyed on foot by a hermit crab,', cx + 30, y0 + 142, { size: 19, color: INK, alpha: 0.8 });
  letter(ctx, 'with every shell worth moving into', cx + 30, y0 + 164, { size: 19, color: INK, alpha: 0.8 });
  letter(ctx, 'soundings in crab-lengths', cx + 30, y0 + 194, { size: 15, color: INK, alpha: 0.65 });
  crabDoodle(d, x0 + 78, y0 + h - 40, 1.2);
}

/** A scale bar: alternate blocks along a ruled bar, numbered in crab steps. */
export function scaleBar(d: Draw, x: number, y: number, w: number): void {
  const { ctx } = d.pen;
  letter(ctx, 'Scale of Crab Steps', x + w / 2, y - 18, { size: 17, color: INK, alpha: 0.85 });
  const n = 8;
  for (let k = 0; k < n; k++) {
    const bx = x + (w * k) / n;
    const cell = [pt(bx, y), pt(bx + w / n, y), pt(bx + w / n, y + 7), pt(bx, y + 7)];
    d.pen.fill(cell, k % 2 ? PAPER_FILL : d.ink, k % 2 ? 1 : 0.75);
  }
  d.pen.stroke(straight([pt(x, y), pt(x + w, y), pt(x + w, y + 7), pt(x, y + 7)], 2), 0.8, d.ink, 0.9, false);
  for (let k = 0; k <= 4; k++) letter(ctx, String(k * 25), x + (w * k) / 4, y + 20, { size: 14, color: INK, alpha: 0.75, italic: false });
}

/** After the last island: the hermit crab as a sea monster, "here be crabs", and the end of the map. */
export function hereBeCrabs(d: Draw, x: number, y: number): void {
  const { ctx } = d.pen;
  for (let k = 0; k < 4; k++) d.pen.hair(bezier(pt(x - 120 + k * 16, y + 70 + k * 8), pt(x, y + 58 + k * 10), pt(x + 120 - k * 16, y + 70 + k * 8), 12), 0.7, d.ink, 0.45 - k * 0.08);
  crabDoodle(d, x + 10, y + 30, 2.6);
  letter(ctx, 'Here be Crabs', x, y + 128, { size: 38, color: BLUE, alpha: 0.95 });
  letter(ctx, '— the map ends where the sand does —', x, y + 160, { size: 17, color: INK, alpha: 0.7 });
}
