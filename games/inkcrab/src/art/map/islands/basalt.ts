import { bezier, cub, type Draw, oval, pt, ribbon } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL, RED } from '../../palette';
import { type IslandArt, within } from '../context';
import type { BiomeArt } from '../island';
import { crown, hachures } from '../symbols';
import { anywhere, centre, name, place } from './common';

/**
 * Beach 5, Ash & Basalt: a volcanic island under its smoking cone, drawn
 * as a cartographer draws relief, in contours and hachures, with lava
 * flows tonguing down to the sea and steaming where they reach it, black
 * sand beaches, honeycomb basalt columns at the points, cactus scrub on
 * the old eastern lavas and a younger cone offshore.
 */
const LAVA = '#2f2b28';
const ASH = '#6f675c';

/** The cone's summit and base. */
function cone(a: IslandArt): { cx: number; cy: number; rx: number; ry: number } {
  const cx = a.at(0.27);
  return { cx, cy: a.inland(cx) - 10, rx: 150, ry: 102 };
}

/** A cluster of basalt columns seen from above: a honeycomb of hexagons. */
function columns(d: Draw, x: number, y: number, n: number, r = 5): void {
  for (let k = 0; k < n; k++) {
    const ring = Math.floor(Math.sqrt(k));
    const a = k * 2.4;
    const hx = x + Math.cos(a) * ring * r * 1.75;
    const hy = y + Math.sin(a) * ring * r * 1.2;
    const hex = Array.from({ length: 6 }, (_, i) => pt(hx + Math.cos((i / 6) * Math.PI * 2) * r, hy + Math.sin((i / 6) * Math.PI * 2) * r * 0.75));
    d.pen.fill(hex, PAPER_FILL, 1);
    d.pen.fill(hex, ['#4a4540', '#5e5850', '#3b3733'][k % 3]!, 0.85);
    d.pen.hair([...hex, hex[0]!], 0.5, d.ink, 0.85);
  }
}

/** A cushion of prickly pear: flat paddles in elevation. */
function cactus(d: Draw, x: number, y: number, s: number): void {
  for (const [dx, dy, r] of [[0, -6, 4], [-4, -12, 3], [4, -12, 3], [0, -16, 2.6]] as const) {
    const pad = oval(x + dx * s, y + dy * s, r * 0.75 * s, r * s, 10);
    d.pen.fill(pad, '#7f9f5a', 0.85);
    d.pen.hair([...pad, pad[0]!], 0.5, d.ink, 0.85);
  }
}

/** A lava flow from p0 to p1: a meandering tongue, ropy across, lobed where it stopped. */
function lavaFlow(a: IslandArt, p0: Pt, c0: Pt, c1: Pt, p1: Pt, fresh: boolean): void {
  const base = cub(p0, c0, c1, p1, 26);
  const spine = base.map((p, i) => {
    const q = base[Math.min(base.length - 1, i + 1)]!;
    const r = base[Math.max(0, i - 1)]!;
    const l = Math.hypot(q.x - r.x, q.y - r.y) || 1;
    const k = (Math.sin(i * 0.37 + p0.x) * 0.6 + Math.sin(i * 0.83 + p0.y) * 0.4) * 6 * Math.min(1, i / 5);
    return pt(p.x - ((q.y - r.y) / l) * k, p.y + ((q.x - r.x) / l) * k);
  });
  const mid = spine[13]!;
  a.el(mid.x, mid.y, 200, (e) => within(a.ctx, a.land, () => {
    const tongue = ribbon(spine, (u) => 6 + 9 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)) + 2.5 * Math.sin(u * 11 + p0.x));
    e.pen.fill(tongue.shape, LAVA, 0.66);
    const end = spine.at(-1)!;
    for (const [dx, dy, r] of [[-6, 4, 6], [5, 5, 5], [0, 9, 4]] as const) e.pen.fill(oval(end.x + dx, end.y + dy, r, r * 0.8, 10), LAVA, 0.78);
    for (let k = 3; k < spine.length - 1; k += 3) {
      const q = spine[k]!;
      const n = spine[k + 1]!;
      const ang = Math.atan2(n.y - q.y, n.x - q.x) + Math.PI / 2;
      const w = 5;
      e.pen.hair(bezier(pt(q.x + Math.cos(ang) * w, q.y + Math.sin(ang) * w), pt(q.x + (n.x - q.x) * 1.4, q.y + (n.y - q.y) * 1.4), pt(q.x - Math.cos(ang) * w, q.y - Math.sin(ang) * w), 5), 0.4, '#9a9286', 0.55);
    }
    if (fresh) {
      e.pen.stroke(spine.slice(6), 1.4, '#e0703a', 0.75, false);
      for (const [dx, dy] of [[-6, 4], [5, 5]] as const) e.pen.fill(oval(end.x + dx, end.y + dy, 3, 2.4, 8), RED, 0.7);
    }
    e.pen.hair([...tongue.shape, tongue.shape[0]!], 0.5, a.ink, 0.75);
  }));
}

function volcano(a: IslandArt): void {
  const { cx, cy, rx, ry } = cone(a);
  const kx = cx - 22;
  const ky = cy - 28;
  a.el(cx, cy, rx + 10, (e) => within(a.ctx, a.land, () => {
    // The cone, lit from the upper left: lighter round the summit, darker down its far flank.
    const g = a.ctx.createRadialGradient(kx - 30, ky - 30, 10, cx, cy, rx * 1.1);
    g.addColorStop(0, 'rgba(160,150,138,0.35)');
    g.addColorStop(0.6, 'rgba(90,82,74,0.25)');
    g.addColorStop(1, 'rgba(40,36,32,0.42)');
    const foot = oval(cx, cy, rx, ry, 40).map((p) => pt(p.x + e.pen.jitter(3), p.y + e.pen.jitter(2.5)));
    e.pen.fill(foot, ASH, 0.25);
    a.ctx.save();
    a.ctx.fillStyle = g;
    a.ctx.beginPath();
    foot.forEach((p, i) => (i === 0 ? a.ctx.moveTo(p.x, p.y) : a.ctx.lineTo(p.x, p.y)));
    a.ctx.closePath();
    a.ctx.fill();
    a.ctx.restore();
    // Contours rising to the crater, each a little north-west of the last, hachured between.
    for (let k = 0; k < 6; k++) {
      const t = 1 - k / 6.6;
      const ring = oval(cx - k * 3.5, cy - k * 4.6, rx * t, ry * t, 44).map((p) => pt(p.x + e.pen.jitter(2.2 * t), p.y + e.pen.jitter(1.8 * t)));
      e.pen.hair([...ring, ring[0]!], 0.55, a.ink, 0.55);
    }
    hachures(e, kx, ky, 30, rx * 0.97, 320, ry / rx, 0.6);
  }));
  // Lava flows: one to the north shore (steaming), one fresh and still glowing to the south-east, an old one west.
  lavaFlow(a, pt(kx - 8, ky - 10), pt(kx - 30, ky - 40), pt(cx - 70, a.top(cx - 70) + 30), pt(cx - 86, a.top(cx - 86) - 4), false);
  lavaFlow(a, pt(kx + 20, ky + 8), pt(cx + 40, cy + 10), pt(cx + 100, cy + 60), pt(cx + 140, a.scrub(cx + 140) - 26), true);
  lavaFlow(a, pt(kx - 20, ky + 8), pt(cx - 90, cy + 10), pt(cx - 150, cy + 40), pt(cx - 190, a.inland(cx - 190) + 30), false);
  const steam = pt(cx - 86, a.top(cx - 86) - 4);
  for (let k = 0; k < 4; k++) a.el(steam.x, steam.y, 40, (e) => e.pen.circle(steam.x - 6 + k * 6, steam.y - 8 - k * 8, 4 + k * 2.4, 0.6, a.ink));
  // The crater, glowing.
  a.el(kx, ky, 40, (e) => {
    const rim = oval(kx, ky, 27, 16, 20).map((p) => pt(p.x + e.pen.jitter(2), p.y + e.pen.jitter(1.5)));
    e.pen.fill(rim, '#4a4540', 0.95);
    e.pen.fill(oval(kx + 2, ky + 2, 18, 9, 16), LAVA, 0.9);
    e.pen.fill(oval(kx + 3, ky + 3, 13, 6, 14), RED, 0.8);
    e.pen.fill(oval(kx + 4, ky + 3, 6, 3, 12), '#f0b04a', 0.95);
    e.pen.crescent(rim, pt(-4, -3), () => e.pen.hatch(rim, 1.6, 0.9, 0.4, { color: a.ink, alpha: 0.5 }));
    e.pen.stroke([...rim, rim[0]!], 1.3, a.ink, 0.95, false);
  });
  name(a, 'Mt. Cinder', cx + 70, cy - 40, 16);
}

function smoke(a: IslandArt): void {
  const { cx, cy } = cone(a);
  const kx = cx - 22;
  const ky = cy - 34;
  for (let k = 0; k < 8; k++) {
    const x = kx + 10 + k * 18 + Math.sin(k) * 4;
    const y = ky - 14 - k * 9 - k * k * 0.6;
    const r = 7 + k * 2.6;
    a.el(x, y, r + 2, (e) => {
      const puff = oval(x, y, r, r * 0.8, 16).map((p) => pt(p.x + e.pen.jitter(r * 0.12), p.y + e.pen.jitter(r * 0.12)));
      e.pen.fill(puff, PAPER_FILL, 0.55);
      e.pen.fill(puff, '#8d8a86', 0.35 - k * 0.025);
      e.pen.hair([...puff, puff[0]!], 0.6, a.ink, 0.6 - k * 0.04);
    });
  }
}

function land(a: IslandArt): void {
  const d = a.pen(17);
  // Ash and cinders over the west, old lava gone green with scrub and cactus in the east.
  d.pen.stipple(a.land, 3000, (x, y) => (a.interior(x, y, 2) && x < a.at(0.55) ? 0.6 : 0), 0.6, '#3b3733');
  d.pen.stipple(a.land, 2000, (x, y) => (y > a.scrub(x) ? 0.7 : 0), 0.55, '#2b2723');
  for (const p of place(a, 40, () => anywhere(a, 0.56, 1), (q) => a.interior(q.x, q.y, 8), 18)) a.el(p.x, p.y, 8, (e) => crown(e, p.x, p.y, 4 + e.pen.rng() * 2, '#7c8f55', 0.8));
  for (const p of place(a, 24, () => anywhere(a, 0.56, 1), (q) => a.interior(q.x, q.y, 10), 24)) a.el(p.x, p.y, 10, (e) => cactus(e, p.x, p.y, 1));
  // A younger cinder cone in the east.
  const sx = a.at(0.84);
  const sy = a.inland(sx) - 6;
  a.el(sx, sy, 46, (e) => {
    hachures(e, sx, sy, 12, 40, 70, 0.7, 0.55);
    e.pen.fill(oval(sx, sy, 11, 7, 14), LAVA, 0.8);
    e.pen.circle(sx, sy, 11, 0.8, a.ink);
  });
  // Fumaroles steaming on the old lava plain.
  for (const p of place(a, 7, () => anywhere(a, 0.5, 0.95), (q) => a.interior(q.x, q.y, 16), 60)) {
    a.el(p.x, p.y, 20, (e) => {
      e.pen.dot(p.x, p.y, 1.6, a.ink, 0.8);
      for (let k = 0; k < 3; k++) e.pen.hair(bezier(pt(p.x + k * 2 - 2, p.y - 2), pt(p.x - 4 + k * 3, p.y - 9), pt(p.x + k * 3, p.y - 16 - k * 2), 6), 0.5, a.ink, 0.5);
    });
  }
  name(a, 'fumaroles', a.at(0.72), a.inland(a.at(0.72)) + 46, 13);
  // A colonnade of basalt columns along the northern cliffs.
  for (let u = 0.56; u < 0.96; u += 0.035) {
    const x = a.at(u);
    const y = a.top(x) + 12;
    a.el(x, y, 14, (e) => columns(e, x, y, 4, 4));
  }
  name(a, 'the colonnade', a.at(0.87), a.top(a.at(0.87)) + 34, 13);
  volcano(a);
  // Basalt columns at the points and on the shore beyond the levels.
  for (const [u, n] of [[0.0, 14], [0.06, 8], [0.97, 12], [1.03, 7]] as const) {
    const x = a.at(u);
    const y = a.coast(x) - 18;
    if (!a.clear(x, y, 16)) continue;
    a.el(x, y, 24, (e) => columns(e, x, y, n));
  }
  // The young cone offshore.
  const islet = a.plan.islets.find((s) => s.kind === 'cone');
  if (islet) {
    const c = centre(islet.shape);
    a.el(c.x, c.y, 40, (e) => {
      hachures(e, c.x, c.y, 6, 26, 50, 0.65, 0.5);
      e.pen.fill(oval(c.x, c.y, 6, 4, 10), RED, 0.6);
      e.pen.circle(c.x, c.y, 6, 0.7, a.ink);
      for (let k = 0; k < 3; k++) e.pen.circle(c.x + 6 + k * 5, c.y - 10 - k * 7, 3 + k, 0.5, a.ink);
    });
    for (const s of a.plan.islets.filter((v) => v.kind === 'stack')) {
      const v = centre(s.shape);
      a.el(v.x, v.y, 12, (e) => columns(e, v.x, v.y, 4, 3));
    }
  }
  name(a, 'black sand', a.at(1.02), a.coast(a.at(1.02)) + 20, 13);
}

export const BASALT: BiomeArt = { land, over: smoke, shallows: '#c9dde6', edge: 'rock' };
