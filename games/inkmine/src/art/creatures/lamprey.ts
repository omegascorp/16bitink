import { closed, oval, pt, ribbon, TAU, type Draw } from '../kit';
import { dab, gleam, LIGHT, mix, paint, SHADOW, soft } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob } from './flesh';

/**
 * The rasp eel (a lunger, hostile, inked in red): a cave lamprey that lives
 * in a burrow bored into the basalt of Brine's flooded caves and lunges out
 * at whatever swims past. It has no jaws: its mouth is a round sucking disc,
 * as a real lamprey's is, ringed with rows of rasping teeth. Each tooth is
 * capped with magnetite, black iron oxide, the hardest thing any animal on
 * Earth grows (real chitons cap their teeth with it to scrape rock); Brine's
 * basalt is full of magnetite, and the eel takes it in with what it rasps.
 * Behind the disc: one nostril on top of the head and a row of seven round
 * gill pores along each side, both as a lamprey's are; small eyes; a slick
 * dark body, pale beneath, glossy with slime, a low fin along its back.
 * Drawn facing right, origin at the burrow mouth on the wall face (x = 0,
 * y = the middle of its body), the wall to the left; at reach `r` the head
 * is r × LAMPREY_REACH units out, and at full reach the disc gapes.
 */
export const LAMPREY_ART = { w: 156, h: 44, ox: 16, oy: 22 } as const;
/** Units from the burrow mouth to the disc at full reach (4 tiles). */
export const LAMPREY_REACH = 128;
/** How far out it's drawn, in baked steps (its reach, 0..1, rounded to the nearest). */
export const LAMPREY_STEPS = [0, 1 / 3, 2 / 3, 1] as const;

const BACK = '#3a3352';
const BELLY = '#b8a9bf';
const FIN = '#8f7fa6';
const DISC = '#b98aa4';
const MAGNETITE = '#24232b';
const STEEL = '#9fb0d0';
const THROAT = '#1d1220';
const HOLE = '#16131f';
const BASALT = '#5d5f6e';

/** How far out the disc's front is at a reach: just peeking at 0, LAMPREY_REACH at 1. */
const tipAt = (r: number): number => 10 + r * (LAMPREY_REACH - 10);
/** The body's thickness, and the head's just behind the disc. */
const GIRTH = 11;
const HEAD = 12.5;

/** The spine from inside the burrow to the disc: straightening as it lunges, a slow wave in it on the way. */
function spine(r: number, f: number): Pt[] {
  const tip = tipAt(r);
  const amp = 1.4 + 2.4 * Math.sin(Math.PI * r);
  const pts: Pt[] = [];
  for (let x = -9; x < tip - 4; x += 2) {
    const env = Math.min(1, Math.max(0, x / 28)) * Math.min(1, Math.max(0, (tip - 16 - x) / 24));
    pts.push(pt(x, Math.sin((tip - x) / 15 + f * 0.9) * amp * env));
  }
  pts.push(pt(tip - 4, 0));
  return pts;
}

/** Its thickness along the spine: the body, swelling a little to the head, then drawn in to the disc. */
function girth(r: number, pts: readonly Pt[]): (u: number) => number {
  const tip = tipAt(r);
  const x0 = pts[0]!.x;
  return (u: number) => {
    const x = x0 + (tip - 4 - x0) * u;
    const head = Math.max(0, Math.min(1, (x - (tip - 22)) / 10));
    const neck = Math.max(0, Math.min(1, (x - (tip - 8)) / 5));
    return GIRTH + (HEAD - GIRTH) * head - neck * 2.2;
  };
}

/** The burrow: a dark hole in the wall face, the eel's body going into it. */
function hole(d: Draw): void {
  dab(d, oval(-3, 0, 7.5, 11.5, 22), HOLE, 0.95, 0.8);
  dab(d, oval(-5, 0, 4.5, 8.5, 18), '#07060b', 0.9, 1.2);
}

/** The burrow's collar: a knuckle of crusted basalt above and below its mouth, standing proud of the wall, salt and silt caught on its top. */
function lips(d: Draw): void {
  for (const [sy, seed] of [[-1, 7201], [1, 7202]] as const) {
    const c = pt(-2.4, sy * 12.6);
    const shape = blob(c, 6.2, 4.3, 0.28, seed, 18);
    paint(d, shape, BASALT, { alpha: 1, shadow: 0.6, hatch: 0.25, line: 0.7 });
    d.pen.stipple(shape, 34, () => 0.6, 0.3, mix(BASALT, SHADOW, 0.55));
    d.pen.stipple(shape, 18, (_, y) => (y < c.y - 1 ? 0.9 : 0.1), 0.32, '#ece6ea');
    d.pen.hair([pt(c.x - 2, c.y - 1.5), pt(c.x + 0.6, c.y + 0.4), pt(c.x + 1.4, c.y + 2.6)], 0.35, mix(BASALT, SHADOW, 0.7), 0.7);
    // The lip's inner edge, dark where it overhangs the hole.
    d.pen.hair([pt(-7, sy * 8.9), pt(-2, sy * 8.5), pt(2.8, sy * 9.4)], 0.5, '#0c0a12', 0.75);
  }
}

/** A low fin along the back, from the head towards the burrow: a membrane on fine rays, its edge lightly scalloped. */
function fin(d: Draw, top: readonly Pt[], tip: number): void {
  const from = tip - 70;
  const to = tip - 26;
  const run = top.filter((p) => p.x > Math.max(from, 3) && p.x < to);
  if (run.length < 3) return;
  const h = (x: number): number => 4.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - from) / (to - from))));
  const edge = run.map((p) => pt(p.x + 1, p.y - h(p.x) - (Math.round(p.x) % 4 === 0 ? 0.4 : 0)));
  const shape = [...run, ...[...edge].reverse()];
  paint(d, shape, FIN, { alpha: 0.85, shadow: 0.3, hatch: 0, line: 0.5 });
  run.forEach((p, i) => {
    if (i % 2) return;
    const e = edge[i]!;
    d.pen.hair([pt(p.x, p.y + 0.3), pt(e.x + 0.6, e.y + 0.3)], 0.3, mix(FIN, SHADOW, 0.5), 0.7);
  });
}

/**
 * The body, painted as a slick cylinder: dark violet above, a deep core
 * shadow under the flank, pale beneath with light bounced up into it, a lit
 * band along the back and a sharp highlight of slime on it; the lateral
 * line, and mottling. Inked along both edges.
 */
function body(d: Draw, top: readonly Pt[], bot: readonly Pt[], shape: readonly Pt[]): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const band = (k0: number, k1: number): Pt[] => [...top.map((p, i) => pt(p.x, p.y + (bot[i]!.y - p.y) * k0)), ...[...top].reverse().map((p, ri) => {
    const i = top.length - 1 - ri;
    return pt(p.x, p.y + (bot[i]!.y - p.y) * k1);
  })];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BACK, 1);
  pen.clipped(shape, () => {
    soft(ctx, 1.2, () => pen.fill(band(0.12, 0.42), mix(BACK, LIGHT, 0.3), 0.75));
    soft(ctx, 1, () => pen.fill(band(0.55, 0.78), mix(BACK, SHADOW, 0.6), 0.8));
    soft(ctx, 0.8, () => pen.fill(band(0.74, 1.1), BELLY, 0.95));
    soft(ctx, 0.6, () => pen.fill(band(0.9, 1.1), mix(BELLY, '#8a7aa6', 0.4), 0.6));
    pen.stipple(shape, Math.round(shape.length * 2.5), (_, y) => (y < 2 ? 0.7 : 0.15), 0.42, mix(BACK, SHADOW, 0.6));
    pen.stipple(shape, Math.round(shape.length * 0.8), (_, y) => (y < 0 ? 0.6 : 0.1), 0.32, mix(BACK, PAPER_FILL, 0.4));
  });
  const line = top.map((p, i) => pt(p.x, p.y + (bot[i]!.y - p.y) * 0.56));
  for (let i = 2; i < line.length - 8; i += 3) pen.hair([line[i]!, line[i + 1]!], 0.35, mix(BELLY, PAPER_FILL, 0.3), 0.75);
  const slick = top.map((p, i) => pt(p.x, p.y + (bot[i]!.y - p.y) * 0.2));
  if (slick.length > 6) gleam(d, slick.slice(3, -4), 0.7, 0.75);
  pen.stroke(top, 0.75, d.ink, 0.9, false);
  pen.stroke(bot, 0.85, d.ink, 0.9, false);
}

/** The head: the nostril on top, a small eye, seven gill pores in a row behind it. */
function head(d: Draw, tip: number): void {
  const eye = pt(tip - 10.5, -2.2);
  for (let k = 0; k < 7; k++) {
    const p = pt(tip - 17 - k * 2.6, 0.6 + Math.sin(k * 0.9) * 0.2);
    if (p.x < -1) continue;
    d.pen.fill(oval(p.x, p.y, 0.75, 0.9, 10), THROAT, 0.92);
    d.pen.hair([pt(p.x - 0.8, p.y - 0.9), pt(p.x, p.y - 1.25), pt(p.x + 0.8, p.y - 0.9)], 0.3, mix(BELLY, PAPER_FILL, 0.5), 0.6);
  }
  if (tip - 14 > -2) {
    d.pen.fill(oval(tip - 14, -5.6, 0.7, 0.45, 8), THROAT, 0.9);
    d.pen.hair([pt(tip - 15, -6), pt(tip - 14, -6.4), pt(tip - 13, -6)], 0.3, PAPER_FILL, 0.6);
  }
  const socket = oval(eye.x, eye.y, 2.2, 1.9, 14);
  d.pen.fill(socket, mix(BACK, SHADOW, 0.5), 0.9);
  paint(d, oval(eye.x, eye.y, 1.5, 1.4, 12), '#d8c86a', { alpha: 1, shadow: 0.4, hatch: 0, line: 0.45, gloss: true });
  d.pen.fill(oval(eye.x + 0.15, eye.y, 0.7, 1.15, 10), '#120d16', 0.95);
  d.pen.dot(eye.x - 0.4, eye.y - 0.55, 0.35, PAPER_FILL, 0.95);
}

/**
 * The oral disc at the front, turned a little to us: a fleshy lip fringed
 * with papillae round a ring of magnetite-capped teeth, inner rows bigger,
 * the throat dark in the middle. `gape` 0..1 opens it wide.
 */
function disc(d: Draw, tip: number, gape: number): void {
  const c = pt(tip - 2.4 - gape * 0.6, 0.6);
  const rx = 2.6 + gape * 2.2;
  const ry = 5.6 + gape * 1.8;
  // The fringe of papillae round the lip.
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    const p = pt(c.x + Math.cos(a) * (rx + 0.35), c.y + Math.sin(a) * (ry + 0.35));
    d.pen.dot(p.x, p.y, 0.45, mix(DISC, PAPER_FILL, 0.35), 0.95);
  }
  const lip = oval(c.x, c.y, rx + 0.6, ry + 0.6, 22);
  paint(d, lip, DISC, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.7 });
  const inner = oval(c.x + 0.3, c.y, rx * 0.78, ry * 0.8, 20);
  d.pen.fill(inner, mix(DISC, THROAT, 0.55), 1);
  // Rows of teeth, outer small, inner big, each pointing in to the throat.
  for (const [k, n, size] of [[0.9, 12, 0.6 + gape * 0.35], [0.62, 9, 0.85 + gape * 0.45], [0.36, 6, 1 + gape * 0.5]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k;
      const base = pt(c.x + 0.3 + Math.cos(a) * rx * 0.78 * k, c.y + Math.sin(a) * ry * 0.8 * k);
      const inward = Math.atan2(c.y - base.y, (c.x + 0.3 - base.x) * (ry / rx));
      const tooth = [pt(base.x - Math.sin(inward) * size * 0.5, base.y + Math.cos(inward) * size * 0.5), pt(base.x + Math.cos(inward) * size * 1.3, base.y + Math.sin(inward) * size * 1.3), pt(base.x + Math.sin(inward) * size * 0.5, base.y - Math.cos(inward) * size * 0.5)];
      d.pen.fill(tooth, MAGNETITE, 1);
      d.pen.hair([pt(base.x - Math.sin(inward) * size * 0.3, base.y + Math.cos(inward) * size * 0.3), pt(base.x + Math.cos(inward) * size * 0.9, base.y + Math.sin(inward) * size * 0.9)], Math.max(0.18, size * 0.16), STEEL, 0.75);
    }
  }
  d.pen.fill(oval(c.x + 0.4, c.y, rx * 0.22, ry * 0.24, 12), THROAT, 1);
  d.pen.stroke(closed(inner), 0.4, mix(DISC, SHADOW, 0.6), 0.8);
  gleam(d, Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos(Math.PI * (1.05 + i * 0.07)) * (rx + 0.4), c.y + Math.sin(Math.PI * (1.05 + i * 0.07)) * (ry + 0.4))), 0.6, 0.7);
}

/** The rasp eel at a `reach` from 0 (peeking from its burrow) to 1 (lunged full out, disc gaping). */
export function drawLamprey(d: Draw, reach: number): void {
  const r = Math.max(0, Math.min(1, reach));
  const tip = tipAt(r);
  hole(d);
  const pts = spine(r, d.f);
  const w = girth(r, pts);
  const rb = ribbon(pts, w);
  fin(d, rb.top, tip);
  body(d, rb.top, rb.bot, rb.shape);
  head(d, tip);
  disc(d, tip, 0.4 + 0.6 * r * r * r);
  lips(d);
}
