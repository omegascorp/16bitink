import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW, softBand } from '../groundKit';
import { cub, type Draw, normals, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { distTo, type Keep, noiseOf, resample, smoothstep } from '../places/farmKit';
import { specks, stripShape } from '../places/farmGroundParts';
import { mix, rgba } from '../wash';
import { H, SAND_BUFF, SAND_DEEP, SAND_GREY, SAND_PALE, W } from './barrensPlaceKit';
import { deerPrint, foxPrint, raccoonPrint } from './barrensPlaceParts';

/**
 * The Pine Barrens' tracks across a board: a sand road of loose white sugar
 * sand with two soft wheel ruts, or a narrow trodden path, laid where it
 * crosses the fewest of the level's things, with an animal's prints along
 * it. `Bare` remembers where they lie so the needles and plants thin out
 * over them.
 */

/** How bare the ground is (0 needle-strewn, 1 open track), on a coarse grid. */
export class Bare {
  static readonly CELL = 4;
  private readonly cols = Math.ceil(W / Bare.CELL) + 1;
  private readonly rows = Math.ceil(H / Bare.CELL) + 1;
  private readonly v = new Float32Array(this.cols * this.rows);

  /** Marks a band along a polyline bare: fully in its middle, fading over its edge. */
  line(pts: readonly Pt[], half: number): void {
    for (const p of pts) this.spot(p, half);
  }

  spot(p: Pt, half: number): void {
    const c = Bare.CELL;
    const reach = half * 1.25;
    for (let gy = Math.max(0, Math.floor((p.y - reach) / c)); gy <= Math.min(this.rows - 1, Math.ceil((p.y + reach) / c)); gy++) {
      for (let gx = Math.max(0, Math.floor((p.x - reach) / c)); gx <= Math.min(this.cols - 1, Math.ceil((p.x + reach) / c)); gx++) {
        const dist = Math.hypot(gx * c - p.x, gy * c - p.y);
        const k = 1 - smoothstep((dist - half * 0.7) / (half * 0.5));
        const i = gy * this.cols + gx;
        if (k > this.v[i]!) this.v[i] = k;
      }
    }
  }

  at(x: number, y: number): number {
    const gx = Math.round(x / Bare.CELL);
    const gy = Math.round(y / Bare.CELL);
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return 0;
    return this.v[gy * this.cols + gx]!;
  }
}

/** A point just off one side of the board (0 top, 1 right, 2 bottom, 3 left). */
function offEdge(side: number, rng: Rng): Pt {
  const u = 0.12 + rng() * 0.76;
  return side === 0 ? pt(W * u, -30) : side === 1 ? pt(W + 30, H * u) : side === 2 ? pt(W * u, H + 30) : pt(-30, H * u);
}

/** The track that crosses the fewest of the level's things (and of `avoid`), of eighteen tried, bending gently. */
export function planTrack(things: readonly Keep[], avoid: (p: Pt) => number, rng: Rng): Pt[] {
  let best: Pt[] = [];
  let bestScore = Infinity;
  for (let t = 0; t < 18; t++) {
    const s0 = Math.floor(rng() * 4);
    const s1 = (s0 + 1 + Math.floor(rng() * 3)) % 4;
    const p0 = offEdge(s0, rng);
    const p1 = offEdge(s1, rng);
    const c0 = pt(W * (0.15 + rng() * 0.7), H * (0.15 + rng() * 0.7));
    const c1 = pt(W * (0.15 + rng() * 0.7), H * (0.15 + rng() * 0.7));
    const pts = resample(cub(p0, c0, c1, p1, 60), 6);
    let score = 0;
    for (let i = 3; i + 3 < pts.length; i += 3) {
      const a0 = Math.atan2(pts[i]!.y - pts[i - 3]!.y, pts[i]!.x - pts[i - 3]!.x);
      const a1 = Math.atan2(pts[i + 3]!.y - pts[i]!.y, pts[i + 3]!.x - pts[i]!.x);
      const turn = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)));
      if (turn > 0.3) score += 40 * (turn - 0.3);
    }
    for (const p of pts) {
      for (const k of things) score += Math.max(0, 1 - distTo(k, p.x, p.y) / 44);
      score += avoid(p);
    }
    if (score < bestScore) {
      bestScore = score;
      best = pts;
    }
  }
  return best;
}

/** A pen line broken into lengths, some left out: an edge that comes and goes. */
function brokenLine(d: Draw, pts: readonly Pt[], w: number, alpha: number, rng: Rng, keep = 0.55): void {
  for (let i = 0; i < pts.length - 2; ) {
    const n = 3 + Math.floor(rng() * 7);
    if (rng() < keep) d.pen.hair(pts.slice(i, i + n + 1), w, d.ink, alpha);
    i += n;
  }
}

/** Grains of sand over an area: dark grit, quartz glints. */
function grains(d: Draw, area: () => Pt, n: number, rng: Rng): void {
  const grit: [number, number, number][] = [];
  const lit: [number, number, number][] = [];
  for (let k = 0; k < n; k++) {
    const p = area();
    (rng() < 0.6 ? grit : lit).push([p.x, p.y, 0.3 + rng() * 0.5]);
  }
  specks(d, SAND_DEEP, 0.4, grit);
  specks(d, PAPER_FILL, 0.75, lit);
}

/** The pale open sand of a track in a band: whiter than the floor, a little sunk (shade along the rim towards the light), its edges inked in broken lines. */
function openSand(d: Draw, pts: readonly Pt[], half: number, rng: Rng, inside: (strip: ReturnType<typeof stripShape>, area: () => Pt) => void): void {
  const { pen } = d;
  const n = noiseOf(rng, 70);
  const wob = (i: number, s: number): number => half * (1 + 0.16 * n(pts[i]!.x + s * 300, pts[i]!.y));
  const strip = stripShape(pts, (i) => wob(i, 0), (i) => wob(i, 1));
  const area = (): Pt => polar(pts[Math.floor(rng() * pts.length)]!, rng() * TAU, Math.sqrt(rng()) * half);
  pen.fill(strip.shape, PAPER_FILL, 0.55);
  pen.fill(strip.shape, SAND_PALE, 0.65);
  pen.clipped(strip.shape, () => {
    for (let k = 0; k < pts.length / 3; k++) pen.fill(blob(area(), 14 + rng() * 26, 8 + rng() * 14, rng, 0.35, 12, rng() * TAU), rng() < 0.5 ? SAND_GREY : SAND_BUFF, 0.07 + rng() * 0.06);
    inside(strip, area);
    grains(d, area, Math.round(pts.length * half * 0.9), rng);
  });
  pen.crescent(strip.shape, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(strip.shape, SAND_DEEP, 0.2));
  pen.crescent(strip.shape, pt(SHADOW.x * 8, SHADOW.y * 8), () => pen.hatch(strip.shape, 2.6, 0.9, 0.35, { color: d.ink, alpha: 0.12 }));
  pen.crescent(strip.shape, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(strip.shape, PAPER_FILL, 0.35));
  brokenLine(d, strip.left, 0.55, 0.35, rng);
  brokenLine(d, [...strip.right].reverse(), 0.55, 0.35, rng);
}

/**
 * A sand road: loose white sand, two wheel ruts (each a soft trough, its wall
 * towards the light in shade and the far wall lit, scuffed across where the
 * wheels slewed), a humped strip between them.
 */
export function sandRoad(d: Draw, pts: readonly Pt[], half: number, rng: Rng): void {
  const { pen } = d;
  openSand(d, pts, half, rng, () => {
    const nrm = normals(pts);
    const drift = noiseOf(rng, 90);
    for (const s of [1, -1]) {
      const rut = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * (half * 0.45 + drift(p.x, p.y) * 2.5), p.y + nrm[i]!.y * s * (half * 0.45 + drift(p.x, p.y) * 2.5)));
      softBand(d, rut, half * 0.42, SAND_GREY, 0.22);
      const rn = normals(rut);
      // Each wall: the one nearer the light is shaded, the far one lit.
      const wall = (k: number): Pt[] => rut.map((p, i) => {
        const n = rn[i]!;
        const towardsLight = n.x * SHADOW.x + n.y * SHADOW.y < 0 ? 1 : -1;
        return pt(p.x + n.x * towardsLight * k, p.y + n.y * towardsLight * k);
      });
      softBand(d, wall(half * 0.17), 3, mix(SAND_DEEP, d.ink, 0.15), 0.3);
      softBand(d, wall(-half * 0.18), 3.5, PAPER_FILL, 0.6);
      // Scuffs across the rut.
      for (let i = 2; i < rut.length - 2; i += 2 + Math.floor(rng() * 3)) {
        const p = rut[i]!;
        const n = rn[i]!;
        const a = polar(p, Math.atan2(n.y, n.x), half * 0.17);
        const b = polar(p, Math.atan2(n.y, n.x), -half * 0.17);
        pen.hair([a, pt((a.x + b.x) / 2 + (pts[i + 1]!.x - pts[i]!.x) * 0.3, (a.y + b.y) / 2 + (pts[i + 1]!.y - pts[i]!.y) * 0.3), b], 0.5, rng() < 0.5 ? SAND_DEEP : PAPER_FILL, 0.28);
      }
    }
  });
}

/** A narrow trodden path: pale sand, the line down its middle where feet go most polished paler. */
export function sandPath(d: Draw, pts: readonly Pt[], half: number, rng: Rng): void {
  openSand(d, pts, half, rng, () => {
    const { ctx } = d.pen;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(PAPER_FILL, 0.3);
    ctx.lineWidth = half * 0.7;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  });
}

export type PrintKind = 'raccoon' | 'fox' | 'deer';

/** An animal's trail along a stretch of a track: raccoon prints in pairs, a fox's in a neat single line, a deer's slots. */
export function trail(d: Draw, pts: readonly Pt[], kind: PrintKind, rng: Rng): void {
  const on = pts.filter((p) => p.x > 8 && p.y > 8 && p.x < W - 8 && p.y < H - 8);
  if (on.length < 10) return;
  const start = Math.floor(rng() * on.length * 0.3);
  const end = Math.min(on.length - 1, start + Math.floor(on.length * (0.45 + rng() * 0.25)));
  const step = kind === 'raccoon' ? 3 : kind === 'fox' ? 3 : 4;
  const wander = noiseOf(rng, 80);
  for (let i = start, k = 0; i < end; i += step, k++) {
    const p = on[i]!;
    const q = on[Math.min(on.length - 1, i + 1)]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const side = k % 2 ? 1 : -1;
    const off = wander(p.x, p.y) * 6;
    const at = (t: number): Pt => polar(polar(p, a + Math.PI / 2, off + t), a, 0);
    if (kind === 'raccoon') {
      raccoonPrint(d, at(side * 3.5), a + (rng() - 0.5) * 0.3, rng);
      raccoonPrint(d, polar(at(side * 3.5 - side * 7), a, 4), a + (rng() - 0.5) * 0.3, rng, 0.32);
    } else if (kind === 'fox') {
      foxPrint(d, at(side * 1.4), a + (rng() - 0.5) * 0.15, rng);
    } else {
      deerPrint(d, at(side * 3), a + (rng() - 0.5) * 0.2, rng);
    }
  }
}
