import { bezier, cub, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { straight } from './context';

/**
 * The chart's small vocabulary of symbols, drawn the way a surveyor
 * sketches into a chart: trees and palms from above with a cast shadow,
 * rocks, reef marks, roofs, boats and hachured hills. Sizes are world px.
 */
const SHADOW = 'rgba(38,49,106,0.16)';

/** A soft cast shadow to the lower right, so symbols sit on the paper. */
export function shadow(d: Draw, x: number, y: number, rx: number, ry: number): void {
  d.pen.fill(oval(x + rx * 0.45, y + ry * 0.55, rx, ry, 12), SHADOW, 1);
}

/** A coconut palm from above: a star of arching fronds round a dark heart. */
export function palmStar(d: Draw, x: number, y: number, r: number, wash = '#6f9f4f'): void {
  shadow(d, x + r * 0.4, y + r * 0.3, r * 0.8, r * 0.45);
  const n = 7;
  const ph = d.pen.rng() * 6;
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * Math.PI * 2;
    const tip = pt(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8);
    const side = pt(-Math.sin(a) * r * 0.22, Math.cos(a) * r * 0.22);
    const mid = pt(x + Math.cos(a) * r * 0.55 + side.x, y + Math.sin(a) * r * 0.45 + side.y);
    const frond = [pt(x, y), mid, tip, pt(mid.x - side.x * 1.6, mid.y - side.y * 1.6)];
    d.pen.fill(frond, wash, 0.85);
    d.pen.hair(bezier(pt(x, y), mid, tip, 6), 0.6, d.ink, 0.75);
  }
  d.pen.dot(x, y, r * 0.16, d.ink, 0.8);
}

/** A conifer as a chart's tree mark: a little two-tier spire with its trunk. */
export function conifer(d: Draw, x: number, y: number, h: number, wash = '#4f7a5a'): void {
  shadow(d, x + h * 0.15, y, h * 0.32, h * 0.12);
  for (let k = 0; k < 2; k++) {
    const by = y - h * 0.15 - k * h * 0.32;
    const w = h * (0.3 - k * 0.07);
    const tri = [pt(x - w, by), pt(x + w, by), pt(x, by - h * 0.55)];
    d.pen.fill(tri, wash, 0.85);
    d.pen.hair(straight([tri[0]!, tri[2]!, tri[1]!], 2, true), 0.7, d.ink, 0.8);
  }
  d.pen.hair([pt(x, y - h * 0.15), pt(x, y)], 0.8, d.ink, 0.8);
}

/** A broadleaf tree or bush from above: a scalloped crown, stippled on its shadow side. */
export function crown(d: Draw, x: number, y: number, r: number, wash: string, alpha = 0.8): void {
  shadow(d, x, y, r, r * 0.7);
  const n = Math.max(9, Math.round(r * 1.3));
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const rr = r * (i % 2 ? 0.86 : 1.04) * (0.92 + d.pen.rng() * 0.14);
    pts.push(pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85));
  }
  d.pen.fill(pts, PAPER_FILL, 1);
  d.pen.fill(pts, wash, alpha);
  d.pen.stipple(pts, Math.round(r * r * 0.35), (px, py) => Math.max(0, ((px - x) * 0.6 + (py - y) * 0.8) / r + 0.1), 0.45, d.ink);
  d.pen.hair([...pts, pts[0]!], 0.7, d.ink, 0.8);
}

/** A rock: a lumpy outline, washed, shaded on its lower right. */
export function rock(d: Draw, x: number, y: number, r: number, wash = '#9a9488', alpha = 0.8): void {
  const shape = oval(x, y, r, r * 0.72, 10).map((p) => pt(p.x + d.pen.jitter(r * 0.16), p.y + d.pen.jitter(r * 0.13)));
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, wash, alpha);
  d.pen.crescent(shape, pt(-r * 0.4, -r * 0.35), () => d.pen.hatch(shape, Math.max(1.4, r / 5), 0.9, 0.45, { color: d.ink, alpha: 0.55 }));
  d.pen.hair([...shape, shape[0]!], Math.min(1.1, 0.5 + r / 20), d.ink, 0.85);
}

/** The chart mark for a rock awash or a coral head: a little cross with dots. */
export function awash(d: Draw, x: number, y: number, s: number, alpha = 0.7): void {
  d.pen.hair([pt(x - s, y), pt(x + s, y)], 0.6, d.ink, alpha);
  d.pen.hair([pt(x, y - s), pt(x, y + s)], 0.6, d.ink, alpha);
  for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) d.pen.dot(x + dx * s * 0.6, y + dy * s * 0.6, 0.45, d.ink, alpha);
}

/** Surf breaking on a reef or a rock: a run of little curls. */
export function breakers(d: Draw, line: readonly Pt[], every = 9, s = 3, alpha = 0.6): void {
  for (let i = 0; i < line.length - 1; i += Math.max(1, Math.round(every / 3))) {
    const p = line[i]!;
    const q = line[Math.min(line.length - 1, i + 1)]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const curl = bezier(pt(p.x - c * s, p.y - sn * s), pt(p.x - sn * s * 1.4, p.y + c * s * 1.4 - s), pt(p.x + c * s, p.y + sn * s), 5);
    d.pen.hair(curl, 0.55, d.ink, alpha);
  }
}

/** A roof from above: a rectangle with its ridge and hips, washed in its tiles' colour. */
export function roof(d: Draw, x: number, y: number, w: number, h: number, angle: number, wash: string): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const P = (dx: number, dy: number): Pt => pt(x + dx * c - dy * s, y + dx * s + dy * c);
  const box = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];
  d.pen.fill(box.map((p) => pt(p.x + 1.6, p.y + 1.6)), SHADOW, 1);
  d.pen.fill(box, PAPER_FILL, 1);
  d.pen.fill(box, wash, 0.8);
  const r0 = P(-w / 2 + h / 2, 0);
  const r1 = P(w / 2 - h / 2, 0);
  d.pen.fill([box[2]!, box[3]!, r0, r1], 'rgba(38,49,106,0.22)', 1);
  d.pen.hair(straight(box, 2), 0.7, d.ink, 0.85);
  d.pen.hair([box[0]!, r0, box[3]!], 0.5, d.ink, 0.7);
  d.pen.hair([box[1]!, r1, box[2]!], 0.5, d.ink, 0.7);
  d.pen.hair([r0, r1], 0.6, d.ink, 0.8);
}

/** A boat from above: a pointed hull with its thwarts. */
export function boatTop(d: Draw, x: number, y: number, len: number, angle: number, wash = '#a5683f'): void {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const P = (dx: number, dy: number): Pt => pt(x + dx * c - dy * s, y + dx * s + dy * c);
  const w = len * 0.2;
  const hull = [P(len / 2, 0), P(len * 0.2, -w), P(-len * 0.4, -w * 0.8), P(-len / 2, 0), P(-len * 0.4, w * 0.8), P(len * 0.2, w)];
  d.pen.fill(hull, PAPER_FILL, 1);
  d.pen.fill(hull, wash, 0.7);
  d.pen.hair(straight(hull, 2), 0.7, d.ink, 0.85);
  for (const k of [-0.2, 0.05, 0.28]) d.pen.hair([P(len * k, -w * 0.8), P(len * k, w * 0.8)], 0.4, d.ink, 0.6);
  // A wake trailing off astern.
  d.pen.hair([P(-len * 0.55, 0), P(-len * 1.3, -w * 0.9)], 0.4, d.ink, 0.35);
  d.pen.hair([P(-len * 0.55, 0), P(-len * 1.3, w * 0.9)], 0.4, d.ink, 0.35);
}

/** A little sailing boat in elevation: hull, mast and a triangle of sail. */
export function sailboat(d: Draw, x: number, y: number, s: number, sail = PAPER_FILL): void {
  const hull = [pt(x - 9 * s, y - 3 * s), pt(x + 9 * s, y - 3 * s), pt(x + 6 * s, y + 1.5 * s), pt(x - 6 * s, y + 1.5 * s)];
  const main = [pt(x - 0.5 * s, y - 4 * s), pt(x - 0.5 * s, y - 21 * s), pt(x + 8 * s, y - 5 * s)];
  const jib = [pt(x - 2 * s, y - 4 * s), pt(x - 2 * s, y - 17 * s), pt(x - 8 * s, y - 5 * s)];
  for (const p of [main, jib]) {
    d.pen.fill(p, sail, 1);
    d.pen.stroke(straight(p, 2), 0.8, d.ink, 0.9, false);
  }
  d.pen.fill(hull, '#7a5a3a', 0.8);
  d.pen.stroke(straight(hull, 2), 0.8, d.ink, 0.9, false);
  for (let k = 0; k < 3; k++) d.pen.hair([pt(x - 12 * s + k * 3 * s, y + 3.5 * s), pt(x - 7 * s + k * 3 * s, y + 3.5 * s)], 0.5, d.ink, 0.45);
}

/** Hachures down a slope: short strokes radiating from a ridge or summit, denser in shadow. */
export function hachures(d: Draw, cx: number, cy: number, r0: number, r1: number, n: number, sy = 0.8, alpha = 0.6): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + d.pen.jitter(0.05);
    const shade = 0.5 + 0.5 * Math.max(0, Math.cos(a - 0.8));
    if (d.pen.rng() > 0.35 + shade * 0.65) continue;
    const a0 = r0 * (0.95 + d.pen.rng() * 0.1);
    const a1 = r1 * (0.85 + d.pen.rng() * 0.2);
    d.pen.hair([pt(cx + Math.cos(a) * a0, cy + Math.sin(a) * a0 * sy), pt(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1 * sy)], 0.35 + shade * 0.35, d.ink, alpha);
  }
}

/** A grass or marram tuft: three or four short blades. */
export function tuft(d: Draw, x: number, y: number, h: number, alpha = 0.7): void {
  for (let k = -1.5; k <= 1.5; k += 1) d.pen.hair([pt(x + k * h * 0.15, y), pt(x + k * h * 0.45 + d.pen.jitter(h * 0.1), y - h * (0.7 + d.pen.rng() * 0.4))], 0.5, d.ink, alpha);
}

/** A lighthouse in elevation: a tapering tower, banded, its lamp throwing beams. */
export function lighthouse(d: Draw, x: number, y: number, s: number, bands = RED, beam = '#e8c75a'): void {
  shadow(d, x + 3 * s, y, 7 * s, 2.5 * s);
  const tower = [pt(x - 5 * s, y), pt(x + 5 * s, y), pt(x + 3.2 * s, y - 30 * s), pt(x - 3.2 * s, y - 30 * s)];
  d.pen.fill(tower, PAPER_FILL, 1);
  for (const k of [0.15, 0.5]) {
    const y0 = y - 30 * s * k;
    const y1 = y0 - 7 * s;
    const w0 = 5 - 1.8 * k;
    const w1 = 5 - 1.8 * (k + 0.23);
    d.pen.fill([pt(x - w0 * s, y0), pt(x + w0 * s, y0), pt(x + w1 * s, y1), pt(x - w1 * s, y1)], bands, 0.7);
  }
  d.pen.stroke(straight(tower, 2), 0.9, d.ink, 0.9, false);
  const lamp = [pt(x - 3 * s, y - 30 * s), pt(x + 3 * s, y - 30 * s), pt(x + 2.4 * s, y - 36 * s), pt(x - 2.4 * s, y - 36 * s)];
  d.pen.fill(lamp, beam, 0.8);
  d.pen.stroke(straight(lamp, 2), 0.8, d.ink, 0.9, false);
  d.pen.fill([pt(x - 3.4 * s, y - 36 * s), pt(x + 3.4 * s, y - 36 * s), pt(x, y - 40 * s)], d.ink, 0.7);
  for (const a of [-0.3, -0.12, 0.12, 0.3]) {
    for (const dir of [-1, 1]) {
      const l = 26 * s + d.pen.rng() * 10 * s;
      d.pen.hair([pt(x + dir * 4 * s, y - 33 * s), pt(x + dir * Math.cos(a) * l, y - 33 * s + Math.sin(a) * l)], 0.6, beam, 0.8);
    }
  }
}

/** A cottage in elevation: walls, a pitched roof, a door and a chimney. */
export function cottage(d: Draw, x: number, y: number, s: number, wall: string, roofWash = '#6d5a4a', saltbox = false): void {
  shadow(d, x + 4 * s, y, 10 * s, 2.4 * s);
  const w = 9 * s;
  const h = 8 * s;
  const body = [pt(x - w, y), pt(x + w, y), pt(x + w, y - h), pt(x - w, y - h)];
  d.pen.fill(body, PAPER_FILL, 1);
  d.pen.fill(body, wall, 0.85);
  const roofPts = saltbox ? [pt(x - w - 1.5 * s, y - h), pt(x + w + 1.5 * s, y - h * 0.55), pt(x + w * 0.1, y - h * 1.9)] : [pt(x - w - 1.5 * s, y - h), pt(x + w + 1.5 * s, y - h), pt(x, y - h * 1.85)];
  d.pen.fill(roofPts, roofWash, 0.85);
  d.pen.stroke(straight(body, 2), 0.8, d.ink, 0.9, false);
  d.pen.stroke(straight(roofPts, 2), 0.8, d.ink, 0.9, false);
  d.pen.fill([pt(x - 1.6 * s, y), pt(x + 1.6 * s, y), pt(x + 1.6 * s, y - 4.6 * s), pt(x - 1.6 * s, y - 4.6 * s)], d.ink, 0.6);
  d.pen.hair([pt(x + w * 0.5, y - h * 1.3), pt(x + w * 0.5, y - h * 1.75)], 1.2, d.ink, 0.8);
}

/** A stretch of shoreline hatched on its landward side: cliffs or steep banks. */
export function cliffTicks(d: Draw, line: readonly Pt[], len: number, every = 2, alpha = 0.55): void {
  for (let i = 1; i < line.length - 1; i += every) {
    const a = line[i - 1]!;
    const b = line[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / l;
    const ny = (b.x - a.x) / l;
    const p = line[i]!;
    const k = len * (0.6 + d.pen.rng() * 0.6);
    d.pen.hair([p, pt(p.x + nx * k, p.y + ny * k)], 0.45, d.ink, alpha);
  }
}

/**
 * A wading bird standing in the shallows, side on: a washed body, its neck in
 * an S, stilt legs (one tucked up) and a ripple round its foot. `bill`: a
 * flamingo's, bent down in the middle, or a spoonbill's flat spatula.
 */
export function wader(d: Draw, x: number, y: number, s: number, dir: 1 | -1, wash: string, bill: 'bent' | 'spoon'): void {
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, y + dy * s);
  d.pen.hair(oval(x, y + 0.4 * s, 3.4 * s, 0.8 * s, 12), 0.4, d.ink, 0.35);
  d.pen.hair([P(0.4, -4.6), P(0.5, 0)], 0.45, d.ink, 0.85);
  d.pen.hair([P(-0.4, -4.6), P(-1.2, -2.6), P(0, -2.9)], 0.4, d.ink, 0.75);
  const body = [P(-3.6, -6.4), ...bezier(P(-2.6, -8.2), P(1, -8.6), P(3, -6.8), 8), ...bezier(P(3, -6.8), P(1.4, -4.4), P(-2.2, -5.2), 8)];
  d.pen.fill(body, wash, 0.95);
  d.pen.hair([...body, body[0]!], 0.4, d.ink, 0.8);
  const neck = cub(P(2.2, -7.2), P(4.6, -9.4), P(0.2, -11.4), P(2, -13.6), 10);
  d.pen.stroke(neck, 1.1 * s, wash, 0.95, false);
  d.pen.hair(neck, 0.35, d.ink, 0.6);
  d.pen.dot(x + 2.2 * s * dir, y - 13.8 * s, 0.9 * s, wash, 1);
  if (bill === 'bent') d.pen.hair([P(2.8, -14), P(3.9, -13.6), P(4.2, -12.3)], 0.55, d.ink, 0.9);
  else {
    d.pen.hair([P(2.8, -13.8), P(4.8, -13.3)], 0.5, d.ink, 0.9);
    d.pen.dot(x + 5 * s * dir, y - 13.3 * s, 0.6 * s, d.ink, 0.85);
  }
}
