import { createRng, type Rng } from '../../logic/rng';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze, roundShade } from '../propsKit';
import { mix } from '../wash';

/**
 * The Old Tortoise's carapace seen from above, nose at +x: a high dome of
 * horn plates (five vertebrals down the spine, four costals each side and a
 * rim of marginals), each plate olive at its seams and ochre in its growth
 * rings, weathered stone-grey in places with a little moss in the seams.
 */
export const SHELL = { cx: -4, rx: 30, ry: 24 } as const;

export const TORT = {
  olive: '#6f6d36',
  ochre: '#c29a45',
  horn: '#e2c278',
  deep: '#3a321d',
  stone: '#a29d8f',
  moss: '#7e9d4a',
  mossDeep: '#465f2c',
  seed: 5150,
} as const;

/** Shell space: u along, v across, 1 at the rim; `RING` is where the marginals begin. */
type Np = readonly [number, number];
const RING = 0.75;

/** Shell space to board px, domed: plates near the rim are foreshortened as the dome falls away. */
export function shellAt(u: number, v: number): Pt {
  const r = Math.hypot(u, v);
  const k = r < 1e-6 ? 1 : (0.5 * r + 0.5 * Math.sin((r * Math.PI) / 2)) / r;
  return pt(SHELL.cx + u * k * SHELL.rx, v * k * SHELL.ry);
}

const ring = (th: number, r = RING): Np => [Math.cos(th) * r, Math.sin(th) * r];

/** Points along the ring from angle a0 to a1 (either way round). */
function ringArc(a0: number, a1: number, r = RING): Np[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.12));
  return Array.from({ length: n + 1 }, (_, i) => ring(a0 + ((a1 - a0) * i) / n, r));
}

/** A plate in shell space, its straight seams subdivided so the dome bends them, mapped to board px. */
function plate(ns: readonly Np[]): Pt[] {
  const out: Pt[] = [];
  ns.forEach((a, i) => {
    const b = ns[(i + 1) % ns.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.06));
    for (let k = 0; k < n; k++) out.push(shellAt(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n));
  });
  return out;
}

/** Vertebral seams along the spine, half-widths at the seams and at the plates' side corners. */
const SEAM = [-0.47, -0.16, 0.16, 0.47] as const;
const MID = [-0.6, -0.315, 0, 0.315, 0.6] as const;
const W = 0.25;
const W2 = 0.31;
const END = 0.36;

interface Plates {
  readonly vertebrals: Pt[][];
  readonly costals: Pt[][];
  readonly marginals: Pt[][];
  readonly rim: Pt[];
}

function plates(): Plates {
  const [b1, b2, b3, b4] = SEAM;
  const [m0, m1, m2, m3, m4] = MID;
  const vertebrals = [
    plate([[b1, -W], [m0, -W2], ...ringArc(Math.PI + END, Math.PI - END), [m0, W2], [b1, W]]),
    ...[0, 1, 2].map((k) => plate([[SEAM[k]!, -W], [MID[k + 1]!, -W2], [SEAM[k + 1]!, -W], [SEAM[k + 1]!, W], [MID[k + 1]!, W2], [SEAM[k]!, W]])),
    plate([[b4, W], [m4, W2], ...ringArc(END, -END), [m4, -W2], [b4, -W]]),
  ];
  const costals: Pt[][] = [];
  for (const s of [1, -1]) {
    const arc = (a0: number, a1: number): Np[] => ringArc(s * a0, s * a1);
    const v = (u: number, w: number): Np => [u, s * w];
    const [c1, c2, c3] = [2.02, Math.PI / 2, 1.12];
    costals.push(
      plate([...arc(Math.PI - END, c1), v(m1, W2), v(b1, W), v(m0, W2)]),
      plate([...arc(c1, c2), v(m2, W2), v(b2, W), v(m1, W2)]),
      plate([...arc(c2, c3), v(m3, W2), v(b3, W), v(m2, W2)]),
      plate([...arc(c3, END), v(m4, W2), v(b4, W), v(m3, W2)]),
    );
  }
  // Marginals: 24 round the rim, the nuchal centred at the nose; each bulges a little at its outer edge.
  const n = 24;
  const marginals = Array.from({ length: n }, (_, i) => {
    const a0 = ((i + 0.5) / n) * TAU;
    const a1 = ((i + 1.5) / n) * TAU;
    const rear = Math.max(0, -Math.cos((a0 + a1) / 2));
    const out = (a: number, t: number): Np => ring(a, 1 + 0.035 * rear * Math.sin(Math.PI * t));
    return plate([...ringArc(a0, a1), ...[1, 0.75, 0.5, 0.25, 0].map((t) => out(a0 + (a1 - a0) * t, t))]);
  });
  return { vertebrals, costals, marginals, rim: rimOf() };
}

/** The shell's outline: the marginals' outer edges, scalloped at the back. */
function rimOf(): Pt[] {
  const n = 24;
  return Array.from({ length: n * 6 }, (_, i) => {
    const a = (i / (n * 6)) * TAU;
    const t = ((((a / TAU) * n - 0.5) % 1) + 1) % 1;
    const rear = Math.max(0, -Math.cos(a));
    return shellAt(...ring(a, 1 + 0.035 * rear * Math.sin(Math.PI * t)));
  });
}

const centroid = (ps: readonly Pt[]): Pt => pt(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
const toward = (ps: readonly Pt[], c: Pt, k: number): Pt[] => ps.map((p) => pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k));

/** One horn plate: olive pooled at its seams, ochre growth rings round a pale areola nearer `focus`. */
function hornPlate(d: Draw, poly: readonly Pt[], rng: Rng, rings: number, focus: Pt): void {
  const { pen } = d;
  const m = centroid(poly);
  const c = pt(m.x + (focus.x - m.x) * 0.22, m.y + (focus.y - m.y) * 0.22);
  const size = Math.sqrt(Math.max(...poly.map((p) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2)));
  const base = mix(TORT.olive, TORT.ochre, rng() * 0.25);
  pen.fill(poly, PAPER_FILL, 1);
  pen.fill(poly, base, 0.92);
  pen.clipped(poly, () => {
    glaze(d, c.x, c.y, size * 0.72, size * 0.6, rng() * 3, TORT.ochre, 0.72);
    glaze(d, c.x - size * 0.08, c.y - size * 0.08, size * 0.36, size * 0.3, rng() * 3, TORT.horn, 0.75);
    pen.hair(closed(poly), 3.2, mix(TORT.olive, TORT.deep, 0.5), 0.5);
    for (let k = 1; k <= rings; k++) {
      const t = 1 - k / (rings + 1.3) + (rng() - 0.5) * 0.05;
      pen.hair(closed(toward(poly, c, t)), k === 1 ? 0.45 : 0.32, TORT.deep, k === 1 ? 0.55 : 0.38);
    }
    pen.stipple(poly, 30, () => 0.5, 0.28, TORT.deep);
  });
}

/** A marginal: ochre, with the dark wedge that runs back from its seam and a growth line along it. */
function marginal(d: Draw, poly: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const c = centroid(poly);
  pen.fill(poly, PAPER_FILL, 1);
  pen.fill(poly, mix(TORT.ochre, TORT.olive, 0.3 + rng() * 0.35), 0.9);
  pen.clipped(poly, () => {
    const p = poly[0]!;
    glaze(d, p.x, p.y, 3.6, 2.4, Math.atan2(p.y - c.y, p.x - c.x), TORT.deep, 0.5);
    pen.hair(closed(toward(poly, c, 0.55)), 0.3, TORT.deep, 0.35);
  });
}

/** Weathering: stone-grey patches worn into the horn, with grit, and moss tufts tucked into seams. */
function weather(d: Draw, shell: readonly Pt[]): void {
  const { pen } = d;
  const rng = createRng(TORT.seed + 7);
  pen.clipped(shell, () => {
    for (const [u, v, r] of [[-0.45, 0.45, 10], [0.32, -0.52, 8], [-0.8, -0.25, 6.5], [0.62, 0.3, 5]] as const) {
      const p = shellAt(u, v);
      glaze(d, p.x, p.y, r, r * 0.7, rng() * 3, TORT.stone, 0.8);
      glaze(d, p.x + r * 0.2, p.y + r * 0.15, r * 0.55, r * 0.4, rng() * 3, mix(TORT.stone, TORT.deep, 0.35), 0.35);
      pen.stipple(shell, 60, (x, y) => (Math.hypot(x - p.x, y - p.y) < r * 0.75 ? 1 : 0), 0.3, mix(TORT.stone, TORT.deep, 0.65));
    }
  });
  for (const [u, v, n] of [[-0.47, -0.25, 16], [-0.86, 0.3, 12], [0.47, 0.6, 10], [-0.16, 0.76, 14], [0.16, -0.25, 7]] as const) {
    const p = shellAt(u, v);
    const tuft = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * TAU;
      const r = 1.7 + rng() * 1.5;
      return pt(p.x + Math.cos(a) * r * 1.3, p.y + Math.sin(a) * r);
    });
    pen.fill(tuft, TORT.moss, 0.85);
    pen.stipple(tuft, n * 4, () => 0.8, 0.42, TORT.mossDeep);
    pen.crescent(tuft, pt(-0.8, -0.8), () => pen.fill(tuft, TORT.mossDeep, 0.5));
    for (let k = 0; k < n / 3; k++) pen.dot(p.x - 1 + rng() * 2, p.y - 1.2 + rng() * 1.2, 0.35, mix(TORT.moss, PAPER_FILL, 0.6), 0.9);
  }
}

/** The whole carapace, its outline returned so the caller can cast its shadow first. */
export function shellRim(): Pt[] {
  return rimOf();
}

export function paintShell(d: Draw): void {
  const { pen } = d;
  const rng = createRng(TORT.seed);
  const { vertebrals, costals, marginals, rim } = plates();
  pen.fill(rim, PAPER_FILL, 1);
  for (const m of marginals) marginal(d, m, rng);
  for (const c of costals) hornPlate(d, c, rng, 4, pt(centroid(c).x, 0));
  for (const v of vertebrals) hornPlate(d, v, rng, 4, centroid(v));
  // The dome: lit at the upper left, falling into shadow at the lower right.
  pen.clipped(rim, () => {
    glaze(d, SHELL.cx - 8, -7, 16, 11, -0.4, PAPER_FILL, 0.3);
    glaze(d, SHELL.cx - 10, -9, 6, 3.5, -0.5, PAPER_FILL, 0.35);
    pen.crescent(rim, pt(-6, -8), () => pen.fill(rim, TORT.deep, 0.3));
    pen.crescent(rim, pt(-2.4, -3.4), () => pen.fill(rim, TORT.deep, 0.22));
  });
  weather(d, rim);
  roundShade(d, rim, SHELL.cx, 0, SHELL.rx, TORT.deep, 0.45);
  shade(d, rim, 0.28);
  // Seams inked, the rim heaviest.
  for (const p of [...marginals, ...costals, ...vertebrals]) pen.hair(closed(p), 0.6, d.ink, 0.78);
  pen.stroke(closed(rim), 1.05, d.ink, 0.92);
}
