import type { Rng } from '../../logic/rng';
import { closed, pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { frontArc, P, quad, SKEW, type Box, type Surface } from '../sites/build';
import { crisp, flat, LIGHT, mix, SHADOW } from '../sites/paintKit';
import {
  atmosphere, balustrade, box, disc, drumWindows, castOn, column, cornice, dome, door, face, flag, frontAt, gableZ, GOLD, hipRoof, MARBLE, pediment, roundBody,
  shadeOn, SLATE, slab, statue, steps, surround, urn, window,
} from './hallParts';

/**
 * The two grandest halls: the city hall (a colonnaded civic front under a
 * blue dome ribbed in gilt, statues on its wings) and the capitol palace
 * (a terrace and grand stair, a pedimented portico of eight columns, wings
 * ending in flagged pavilions, and a great gilded dome on a colonnaded drum).
 */

const LIME = '#e0d3b6';
const SLATES = { row: 4, tab: 4.8 } as const;

/** Rusticated stonework: deep horizontal joints, every other course a little set back in shade. */
function rustic(d: Draw, at: Surface, clip: readonly Pt[], w: number, h: number, course = 5.6): void {
  d.pen.clipped(clip, () => {
    for (let v = course; v < h; v += course) {
      d.pen.fill(quad(at, -1, v - 1.1, w + 1, v), SHADOW, 0.3);
      d.pen.hair([at(0, v - 1.2), at(w, v - 1.2)], 0.5, d.ink, 0.55);
      d.pen.hair([at(0, v + 0.2), at(w, v + 0.2)], 0.6, LIGHT, 0.5);
    }
  });
}

interface WingOpts {
  readonly stone: string;
  readonly windows: readonly number[];
  readonly statues: readonly number[];
  readonly gilt: boolean;
}

/** A wing: rusticated ground floor, tall windows above under hoods, cornice, a low slate roof behind a balustrade, statues and urns along it. */
function wing(d: Draw, rng: Rng, b: Box, o: WingOpts): Pt[] {
  const w = b.x1 - b.x0;
  const h = b.h1 - b.h0;
  const at = frontAt(b);
  face(d, rng, (u, v) => P(b.x1, b.z0 + u, b.h0 + v), b.z1 - b.z0, h, o.stone, { tone: 0.42 });
  const wall = face(d, rng, at, w, h, o.stone, { tone: 0.03 });
  rustic(d, at, wall, w, h * 0.42);
  for (const u of o.windows) {
    window(d, at, u - 5, 6, 10, h * 0.42 - 12, o.stone, { key: true, transoms: 1, frame: 2 });
    window(d, at, u - 5.5, h * 0.42 + 6, 11, h * 0.42, o.stone, { key: true, transoms: 2, frame: 2.2 });
    const hood = crisp(quad(at, u - 9, h * 0.84 + 7.5, u + 9, h * 0.84 + 9.5), 2);
    shadeOn(d, wall, quad(at, u - 8, h * 0.84 + 4, u + 10, h * 0.84 + 7.5), 0.3, 1.5);
    flat(d, hood, mix(o.stone, LIGHT, 0.3), { tone: -0.05, line: 0.45 });
  }
  cornice(d, at, wall, w, h * 0.42, 2.4, o.stone);
  hipRoof(d, rng, { ...b, x0: b.x0 + 2, x1: b.x1 - 2, z0: b.z0 + 4, z1: b.z1 - 2 }, 12, 10, SLATE, SLATES, 0);
  cornice(d, at, wall, w, h, 3.6, o.stone);
  balustrade(d, at, 0, w, h, 7, o.stone);
  for (const u of o.statues) {
    slab(d, box(b.x0 + u - 3.4, b.x0 + u + 3.4, b.z0 - 0.5, b.z0 + 4, b.h1, b.h1 + 8), o.stone, { line: 0.45 });
    statue(d, at(u, h + 8), 18, o.gilt ? GOLD : mix(o.stone, '#9fae9c', 0.25), o.gilt, u < w / 2 ? 1 : -1);
  }
  for (const u of [2.5, w - 2.5]) {
    slab(d, box(b.x0 + u - 3, b.x0 + u + 3, b.z0 - 0.5, b.z0 + 4, b.h1, b.h1 + 8), o.stone, { line: 0.45 });
    urn(d, at(u, h + 8), 8, o.gilt ? GOLD : o.stone);
  }
  return wall;
}

/** Shifts a drawing back from the anchor (so its steps stay near the footprint's front edge). */
function setBack(d: Draw, z: number, draw: () => void): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.translate(SKEW * z, -0.6 * z);
  draw();
  ctx.restore();
}

// ---- City hall ----

/** The city hall's portico: podium and steps, six columns, an entablature and a pediment with the Crown's arms. */
function cityPortico(d: Draw, rng: Rng, back: readonly Pt[]): void {
  const atB: Surface = (u, v) => P(-46 + u, 22, v);
  castOn(d, back, quad(atB, 4, 54, 88, 62), 2, 10, 0.5, 4);
  shadeOn(d, back, quad(atB, 0, 0, 92, 62), 0.28, 3);
  slab(d, box(-41, 41, 4, 22, 0, 6), LIME);
  for (const x of [-35, -21, -7, 7, 21, 35]) column(d, x, 10, 6, 54, 3.4, LIME);
  const e = box(-42, 42, 5, 22, 54, 62);
  slab(d, e, LIME);
  const at = frontAt(e);
  d.pen.hair([at(0, 4.6), at(84, 4.6)], 0.5, d.ink, 0.55);
  for (let u = 3; u < 84; u += 6) d.pen.fill(crisp(quad(at, u, 5.4, u + 2.6, 7.2), 1), mix(LIME, SHADOW, 0.3), 0.6);
  gableZ(d, rng, { ...e, z1: 22 }, 20, SLATE, LIME, SLATES, 1.5, 22);
  pediment(d, (u, v) => P(-42 + u, 5, 62 + v), 0, 84, 0, 20, LIME);
  steps(d, -32, 32, -4, 3, 6, 2.7, mix(LIME, '#8f8676', 0.2), 1.5);
}

/** The city hall's dome: a drum with round windows and pilasters, a blue slate dome ribbed in gilt, a lantern. */
function cityDome(d: Draw): void {
  const base = P(0, 46, 84);
  disc(d, pt(base.x, base.y + 1), 27, 2, LIME);
  const drum = roundBody(d, base, 24, 20, LIME);
  d.pen.clipped(drum, () => {
    for (let v = 4; v < 20; v += 4) d.pen.hair(Array.from({ length: 17 }, (_, i) => pt(base.x - 24 * Math.cos((i / 16) * Math.PI), base.y - v + 14.4 * Math.sin((i / 16) * Math.PI))), 0.35, d.ink, 0.35);
  });
  drumWindows(d, base, 24, 3, 16, 7, LIME);
  d.pen.stroke([...drum, drum[0]!], 0.6, d.ink, 0.85);
  disc(d, P(0, 46, 104), 26.5, 3, mix(LIME, LIGHT, 0.15));
  const crown = dome(d, P(0, 46, 107), 25, 28, SLATE, GOLD, 10);
  lantern(d, crown, 6, 10, SLATE);
}

/** A lantern on a dome's crown: little columns round a dark core, a small cap and a gilt finial. */
function lantern(d: Draw, c: Pt, r: number, h: number, cap: string): void {
  roundBody(d, pt(c.x, c.y + 1), r - 1.2, h, '#3a3550', 0);
  for (const t of [0.12, 0.38, 0.62, 0.88]) {
    const x = c.x - r * Math.cos(t * Math.PI);
    const y = c.y + 1 + r * 0.6 * Math.sin(t * Math.PI);
    slab(d, box(x - 1, x + 1, 0, 0.1, -y, -y + h), LIME, { line: 0.4, top: false });
  }
  const top = roundBody(d, pt(c.x, c.y - h + 1), r + 1, 2, mix(LIME, LIGHT, 0.2), 0);
  d.pen.stroke([...top, top[0]!], 0.45, d.ink, 0.8);
  const crown = dome(d, pt(c.x, c.y - h - 1), r + 0.5, r * 0.9, cap, GOLD, 6);
  d.pen.stroke([crown, pt(crown.x, crown.y - 7)], 0.9, d.ink, 0.95, false);
  d.pen.dot(crown.x, crown.y - 3, 1.6, GOLD, 1);
  d.pen.dot(crown.x, crown.y - 7.5, 1, GOLD, 1);
}

export function cityHall(d: Draw, rng: Rng): void {
  const lw = { stone: LIME, windows: [11, 33, 55], statues: [22, 44], gilt: false } as const;
  wing(d, rng, box(-112, -46, 26, 64, 0, 58), lw);
  const c = box(-46, 46, 22, 70, 0, 84);
  const at = frontAt(c);
  face(d, rng, (u, v) => P(c.x1, c.z0 + u, v), 48, 84, LIME, { tone: 0.42 });
  const front = face(d, rng, at, 92, 84, LIME, { tone: 0.02 });
  surround(d, at, 36, 6, 20, 30, 3, LIME, true);
  door(d, at, 36, 20, 30 + 6, { arched: true });
  for (const u of [12, 66]) window(d, at, u, 12, 12, 26, LIME, { key: true, transoms: 2 });
  for (const u of [10, 28, 52, 70]) window(d, at, u, 64, 10, 11, LIME, { frame: 1.8, transoms: 0, square: true });
  leads(d, rng, c);
  cornice(d, at, front, 92, 84, 4, LIME);
  balustrade(d, at, 0, 92, 84, 6, LIME);
  for (const x of [-40, 40]) flag(d, P(x, 26, 90), 26, 16, x * 0.03);
  wing(d, rng, box(46, 112, 26, 64, 0, 58), lw);
  cityDome(d);
  cityPortico(d, rng, front);
  atmosphere(d, -120, -190, 120, 16);
}

/** A low slate roof on a block, set back behind its balustrade. */
function leads(d: Draw, rng: Rng, b: Box): void {
  hipRoof(d, rng, { ...b, x0: b.x0 + 2, x1: b.x1 - 2, z0: b.z0 + 4, z1: b.z1 - 2 }, 14, 14, SLATE, SLATES, 0);
}

// ---- Capitol ----

const MARBLE_W = MARBLE;

/** A drum ringed with columns (a peristyle) under an attic, for the great dome. */
function peristyle(d: Draw, zc: number, h0: number, h1: number, r: number, R: number): void {
  const base = P(0, zc, h0);
  const wall = roundBody(d, base, r, h1 - h0, mix(MARBLE_W, SHADOW, 0.22), 0.35);
  d.pen.clipped(wall, () => {
    for (let i = 0; i < 9; i++) {
      const t = ((i + 0.5) / 9) * Math.PI;
      const x = base.x - r * Math.cos(t);
      const y = base.y + r * 0.6 * Math.sin(t);
      const w = 2.6 * Math.sin(t);
      d.pen.fill([pt(x - w, y - 4), pt(x + w, y - 4), pt(x + w, y - (h1 - h0) + 7), pt(x, y - (h1 - h0) + 4.6), pt(x - w, y - (h1 - h0) + 7)], '#2a2638', 0.9);
    }
  });
  d.pen.stroke([...wall, wall[0]!], 0.6, d.ink, 0.85);
  const order = Array.from({ length: 12 }, (_, i) => ((i + 0.5) / 12) * Math.PI).sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const t of order) {
    const z = zc - R * Math.sin(t);
    const x = -R * Math.cos(t) + SKEW * R * Math.sin(t);
    column(d, x, z, h0, h1, 2.4, MARBLE_W, true);
  }
}

/** The capitol's great dome: a stepped base, the peristyle, an attic, the gilded dome and its lantern. */
function greatDome(d: Draw): void {
  const zc = 50;
  disc(d, P(0, zc, 88), 37, 4, MARBLE_W);
  peristyle(d, zc, 92, 110, 29, 34);
  disc(d, P(0, zc, 110), 37, 3.5, mix(MARBLE_W, LIGHT, 0.15));
  const g = frontArc(P(0, zc, 111.6).x, P(0, zc, 111.6).y, 37, 20);
  d.pen.stroke(g, 0.9, GOLD, 0.9, false);
  const attic = roundBody(d, P(0, zc, 113.5), 32, 6, MARBLE_W, 0.25);
  d.pen.clipped(attic, () => {
    for (let i = 1; i < 12; i++) {
      const t = (i / 12) * Math.PI;
      const b = P(0, zc, 113.5);
      const x = b.x - 32 * Math.cos(t);
      d.pen.hair([pt(x, b.y + 19.2 * Math.sin(t)), pt(x, b.y + 19.2 * Math.sin(t) - 6)], 0.4, d.ink, 0.45);
    }
  });
  d.pen.stroke(frontArc(P(0, zc, 117.6).x, P(0, zc, 117.6).y, 32, 20), 0.8, GOLD, 0.9, false);
  d.pen.stroke([...attic, attic[0]!], 0.6, d.ink, 0.85);
  const crown = dome(d, P(0, zc, 119.5), 31, 28, GOLD, '#e9bf55', 12, true);
  lantern(d, crown, 6.5, 10, GOLD);
}

/** The portico: eight columns on the terrace, the entablature and a pediment holding the Crown's arms, a gilt angel at its peak. */
function capitolPortico(d: Draw, rng: Rng, back: readonly Pt[]): void {
  const atB: Surface = (u, v) => P(-50 + u, 34, v);
  shadeOn(d, back, quad(atB, 0, 16, 100, 70), 0.3, 3);
  castOn(d, back, quad(atB, 2, 64, 98, 74), 2, 9, 0.45, 4);
  for (let i = 0; i < 8; i++) column(d, -42 + i * 12, 22, 16, 66, 3.3, MARBLE_W, true);
  const e = box(-48, 48, 18, 34, 66, 74);
  slab(d, e, MARBLE_W);
  const at = frontAt(e);
  d.pen.fill(crisp(quad(at, 1, 2.6, 95, 5.4), 2), GOLD, 0.55);
  d.pen.hair([at(0, 5.6), at(96, 5.6)], 0.5, d.ink, 0.6);
  gableZ(d, rng, { ...e, z1: 34 }, 22, SLATE, MARBLE_W, SLATES, 1.5, 34);
  const peak = pediment(d, (u, v) => P(-48 + u, 18, 74 + v), 0, 96, 0, 22, MARBLE_W);
  statue(d, peak, 20, GOLD, true);
  for (const u of [-1, 97]) statue(d, P(-48 + u, 18, 74), 16, GOLD, true, u < 0 ? 1 : -1);
}

/** The grand stair up to the terrace, its cheeks crowned with urns. */
function grandStair(d: Draw): void {
  steps(d, -30, 30, -5, 8, 16, 2.6, mix(MARBLE_W, '#8f8676', 0.18), 0.8);
  for (const x of [-37, 37]) {
    slab(d, box(x - 4.5, x + 4.5, -6, 16, 0, 18), MARBLE_W);
    urn(d, P(x, 4, 18), 10, GOLD);
  }
}

const IN = 50;
const OUT = 86;
const END = 108;

/** The terrace the palace stands on: a rusticated front with small arched openings and a balustrade along its edge. */
function terrace(d: Draw, rng: Rng): void {
  const t = box(-END - 2, END + 2, 16, 30, 0, 16);
  const w = 2 * END + 4;
  const at = frontAt(t);
  face(d, rng, (u, v) => P(t.x1, t.z0 + u, v), 14, 16, MARBLE_W, { tone: 0.42, finish: 'smooth' });
  const wall = face(d, rng, at, w, 16, mix(MARBLE_W, '#b7a986', 0.25), { tone: 0.08, finish: 'smooth' });
  rustic(d, at, wall, w, 16, 5.2);
  for (const u of [14, 36, 58, w - 58, w - 36, w - 14]) {
    const hole = crisp([at(u - 3, 0), at(u - 3, 6), at(u, 9), at(u + 3, 6), at(u + 3, 0)], 1.5);
    d.pen.fill(hole, '#2a2638', 0.9);
    d.pen.stroke(closed(hole), 0.45, d.ink, 0.8);
  }
  flat(d, crisp([P(-END - 2, 16, 16), P(END + 2, 16, 16), P(END + 2, 36, 16), P(-END - 2, 36, 16)], 4), mix(MARBLE_W, '#c9b48c', 0.3), { tone: -0.15, line: 0.5 });
  for (const [u0, u1] of [[0, w / 2 - 42], [w / 2 + 42, w]] as const) balustrade(d, at, u0, u1, 16, 6, MARBLE_W);
}

/** An end pavilion: a taller block with its own pediment, a flag above. */
function pavilion(d: Draw, rng: Rng, x0: number, x1: number, wave: number): void {
  const b = box(x0, x1, 30, 70, 16, 92);
  const at = frontAt(b);
  const w = x1 - x0;
  face(d, rng, (u, v) => P(b.x1, b.z0 + u, 16 + v), 40, 76, MARBLE_W, { tone: 0.42 });
  const wall = face(d, rng, at, w, 76, MARBLE_W, { tone: 0.02 });
  for (const u of [0, w - 3]) d.pen.fill(crisp(quad(at, u, 0, u + 3, 76), 2), LIGHT, 0.2);
  window(d, at, w / 2 - 6, 6, 12, 22, MARBLE_W, { key: true, transoms: 2 });
  window(d, at, w / 2 - 6, 38, 12, 24, MARBLE_W, { key: true, transoms: 2, lit: 0.2 });
  cornice(d, at, wall, w, 76, 4, MARBLE_W);
  hipRoof(d, rng, { ...b, z0: b.z0 + 2 }, 16, 8, SLATE, SLATES, 1);
  pediment(d, (u, v) => P(x0 + u, 30, 92 + v), 0, w, 0, 10, MARBLE_W, false);
  flag(d, P((x0 + x1) / 2 - 2, 44, 104), 26, 15, wave);
}

export function capitol(d: Draw, rng: Rng): void {
  const ws = { stone: MARBLE_W, windows: [9, 27], statues: [18], gilt: true } as const;
  wing(d, rng, box(-OUT, -IN, 38, 80, 16, 82), ws);
  pavilion(d, rng, -END, -OUT, 0.4);
  const c = box(-IN, IN, 34, 84, 16, 88);
  const at = frontAt(c);
  face(d, rng, (u, v) => P(c.x1, c.z0 + u, 16 + v), 50, 72, MARBLE_W, { tone: 0.42 });
  const front = face(d, rng, at, 100, 72, MARBLE_W, { tone: 0.02 });
  surround(d, at, 40, 0, 20, 32, 3, MARBLE_W, true);
  door(d, at, 40, 20, 32, { arched: true, color: '#6a4a30' });
  for (const u of [14, 74]) window(d, at, u, 8, 12, 28, MARBLE_W, { key: true, transoms: 2, lit: 0.25 });
  leads(d, rng, c);
  cornice(d, at, front, 100, 72, 4, MARBLE_W);
  balustrade(d, at, 0, 100, 72, 6, MARBLE_W);
  wing(d, rng, box(IN, OUT, 38, 80, 16, 82), ws);
  pavilion(d, rng, OUT, END, 1.6);
  terrace(d, rng);
  greatDome(d);
  capitolPortico(d, rng, front);
  grandStair(d);
  atmosphere(d, -125, -200, 125, 16);
}

export { setBack };
