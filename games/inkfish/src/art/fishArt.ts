import type { SpeciesId } from '../levels/types';
import { ellipse, INK, Pen, type Pt } from './pen';

export type FishShape = SpeciesId | 'inkling';
/** light = prey/peer look, heavy = predator look (engraved cross-hatching). */
export type InkVariant = 'light' | 'heavy';

/** Texture side in px (power of two, so the GPU can mipmap the fine lines). */
export const FISH_TEX = 256;
/** A fish of game radius R is drawn at scale R / FISH_RADIUS. */
export const FISH_RADIUS = 86;

const C = FISH_TEX / 2;
const PAPER_FILL = '#fffaf0';

type Tail = 'fork' | 'round' | 'point';

interface Fin {
  /** Along the body, 0 = nose, 1 = tail base. */
  readonly from: number;
  readonly to: number;
  /** Height relative to the body's half height. */
  readonly height: number;
  readonly spiny?: boolean;
}

interface Anatomy {
  /** Half length and maximum half height of the body. */
  readonly hl: number;
  readonly hh: number;
  /** Where the body is tallest (0 nose .. 1 tail). */
  readonly peak: number;
  /** 0 = pointed snout, 1 = round head. */
  readonly blunt: number;
  /** Tail-stalk height as a fraction of hh. */
  readonly peduncle: number;
  readonly tail: Tail;
  readonly tailSize: number;
  readonly dorsal?: Fin;
  readonly dorsal2?: Fin;
  readonly anal?: Fin;
  readonly pectoral: number;
  readonly pelvic: boolean;
  readonly scales: boolean;
  readonly eye: { readonly t: number; readonly r: number };
  readonly mouth: 'small' | 'teeth' | 'gape' | 'beak';
  readonly wash: string;
  readonly finWash?: string;
  readonly ink?: string;
  readonly extras?: (k: Kit) => void;
  /** Body undulation amplitude in px (eels). */
  readonly wave?: number;
}

/** Everything a species' extra-detail hook needs. */
interface Kit {
  readonly pen: Pen;
  readonly a: Anatomy;
  readonly body: Pt[];
  readonly heavy: boolean;
  readonly ink: string;
  x(t: number): number;
  h(t: number): number;
}

// ---------------------------------------------------------------- profile

function heightAt(a: Anatomy, t: number): number {
  if (t <= a.peak) {
    const u = t / a.peak;
    return a.hh * Math.pow(Math.sin((u * Math.PI) / 2), 0.35 + 0.9 * (1 - a.blunt));
  }
  const u = (t - a.peak) / (1 - a.peak);
  return a.hh * (a.peduncle + (1 - a.peduncle) * Math.pow(Math.cos((u * Math.PI) / 2), 1.15));
}

const xAt = (a: Anatomy, t: number): number => C + a.hl - 2 * a.hl * t;
const topAt = (a: Anatomy, t: number): number => C - heightAt(a, t) * 1.04;
const bottomAt = (a: Anatomy, t: number): number => C + heightAt(a, t) * 0.92;

function outline(a: Anatomy): Pt[] {
  const n = 48;
  const top = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(a, i / n), y: topAt(a, i / n) }));
  const bottom = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(a, 1 - i / n), y: bottomAt(a, 1 - i / n) }));
  return [...top, ...bottom];
}

function bezier(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

// ---------------------------------------------------------------- fins

function drawTail(k: Kit): void {
  const { a, pen } = k;
  if (a.tail === 'point') return;
  const x0 = xAt(a, 1) + 3;
  const base = Math.max(3, heightAt(a, 1));
  const L = a.hh * a.tailSize;
  const S = a.hh * a.tailSize * 0.85;
  const top = { x: x0, y: C - base * 0.9 };
  const bot = { x: x0, y: C + base * 0.9 };
  const edge: Pt[] =
    a.tail === 'fork'
      ? [
          ...bezier(top, { x: x0 - L * 0.5, y: C - S * 0.55 }, { x: x0 - L, y: C - S }),
          ...bezier({ x: x0 - L, y: C - S }, { x: x0 - L * 0.62, y: C - S * 0.25 }, { x: x0 - L * 0.55, y: C }),
          ...bezier({ x: x0 - L * 0.55, y: C }, { x: x0 - L * 0.62, y: C + S * 0.25 }, { x: x0 - L, y: C + S }),
          ...bezier({ x: x0 - L, y: C + S }, { x: x0 - L * 0.5, y: C + S * 0.55 }, bot),
        ]
      : [
          ...bezier(top, { x: x0 - L * 0.55, y: C - S * 0.95 }, { x: x0 - L * 0.95, y: C - S * 0.35 }),
          ...bezier({ x: x0 - L * 0.95, y: C - S * 0.35 }, { x: x0 - L * 1.08, y: C }, { x: x0 - L * 0.95, y: C + S * 0.35 }),
          ...bezier({ x: x0 - L * 0.95, y: C + S * 0.35 }, { x: x0 - L * 0.55, y: C + S * 0.95 }, bot),
        ];
  membrane(k, edge, { x: x0 + 2, y: C }, 14);
}

/** Fin membrane: paper fill, faint wash, rays fanning from `root`, outlined. */
function membrane(k: Kit, shape: Pt[], root: Pt, rays: number): void {
  const { pen, a, heavy, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, a.finWash ?? a.wash, heavy ? 0.3 : 0.16);
  // Rays: from the root to evenly spaced points along the outer edge.
  for (let i = 1; i < rays; i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(0.6), y: (root.y + p.y) / 2 }, p], 0.55, ink, 0.6);
  }
  pen.stroke(shape, 1.25, ink, 1, false);
}

/** Dorsal (top) or anal (bottom) fin rising from the body edge. */
function drawEdgeFin(k: Kit, fin: Fin, side: 'top' | 'bottom'): void {
  const { a, pen, ink } = k;
  const dir = side === 'top' ? -1 : 1;
  const edgeY = (t: number): number => (side === 'top' ? topAt(a, t) : bottomAt(a, t));
  const n = Math.max(6, Math.round((fin.to - fin.from) * 40));
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = fin.from + (fin.to - fin.from) * f;
    // Spiny fins are tallest at the front; soft fins are rounded.
    const prof = fin.spiny ? 0.35 + 0.65 * Math.pow(1 - f, 0.6) : Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.7);
    const height = a.hh * fin.height * Math.max(0.12, prof);
    base.push({ x: xAt(a, t), y: edgeY(t) - dir * 2 });
    // Rays rake back towards the tail.
    tips.push({ x: xAt(a, t) - height * 0.45, y: edgeY(t) + dir * height });
  }
  const edge: Pt[] = fin.spiny
    ? tips.flatMap((p, i) => {
        // Membrane dips between spines.
        const next = tips[i + 1];
        if (!next) return [p];
        const b = base[i]!;
        return [p, { x: (p.x + next.x) / 2 + 1, y: (p.y + next.y) / 2 * 0.7 + b.y * 0.3 }];
      })
    : tips;
  const shape = [...base, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, a.finWash ?? a.wash, 0.16);
  base.forEach((b, i) => {
    if (i % (fin.spiny ? 1 : 2)) return;
    pen.hair([b, tips[i]!], fin.spiny ? 0.9 : 0.5, ink, fin.spiny ? 0.9 : 0.6);
  });
  pen.stroke(edge, fin.spiny ? 0.8 : 1.1, ink, 1, false);
}

function drawPelvic(k: Kit): void {
  const { a } = k;
  const t = 0.42;
  const r = { x: xAt(a, t), y: bottomAt(a, t) - 3 };
  const s = a.hh * 0.42;
  const shape = [r, ...bezier({ x: r.x, y: r.y }, { x: r.x - s * 0.4, y: r.y + s * 0.9 }, { x: r.x - s * 1.1, y: r.y + s * 0.85 }, 8), { x: r.x - s * 0.5, y: r.y }];
  membrane(k, shape, r, 6);
}

function drawPectoral(k: Kit): void {
  const { a } = k;
  if (a.pectoral <= 0) return;
  const t = 0.3;
  const root = { x: xAt(a, t), y: C + heightAt(a, t) * 0.2 };
  const s = a.hh * a.pectoral;
  // A fan that sweeps back and down from just behind the gill cover.
  const upper = { x: root.x - s * 1.25, y: root.y + s * 0.02 };
  const lower = { x: root.x - s * 0.75, y: root.y + s * 0.72 };
  const shape = [
    { x: root.x, y: root.y - s * 0.12 },
    ...bezier({ x: root.x, y: root.y - s * 0.12 }, { x: root.x - s * 0.7, y: root.y - s * 0.22 }, upper, 8),
    ...bezier(upper, { x: root.x - s * 1.25, y: root.y + s * 0.6 }, lower, 8),
    ...bezier(lower, { x: root.x - s * 0.3, y: root.y + s * 0.45 }, { x: root.x, y: root.y + s * 0.1 }, 6),
  ];
  membrane(k, shape, root, 9);
}

// ---------------------------------------------------------------- surface

/** Shading lines that follow the belly curve, converging towards the tail. */
function contourHatch(k: Kit, rows: number, fromBottom: boolean, gap: number, alpha: number): void {
  const { a, pen, body, ink } = k;
  pen.clipped(body, () => {
    for (let r = 1; r <= rows; r++) {
      const start = 0.04 + r * 0.012 + pen.rng() * 0.05;
      const end = 0.96 - r * 0.015 - pen.rng() * 0.06;
      const pts: Pt[] = [];
      for (let t = start; t <= end; t += 0.03) {
        const scale = heightAt(a, t) / a.hh;
        const y = fromBottom ? bottomAt(a, t) - r * gap * scale : topAt(a, t) + r * gap * scale;
        pts.push({ x: xAt(a, t), y });
      }
      pen.hair(pts, 0.55, ink, alpha * (1 - (r / (rows + 2)) * 0.6));
    }
  });
}

/** Engraving-style cross contours: arcs from back to belly around the body. */
function crossHatch(k: Kit, step: number, alpha: number): void {
  const { a, pen, body, ink } = k;
  pen.clipped(body, () => {
    for (let t = 0.05; t < 1; t += step / (2 * a.hl)) {
      const x = xAt(a, t);
      const h = heightAt(a, t);
      const bulge = h * 0.18;
      pen.hair(bezier({ x, y: topAt(a, t) }, { x: x - bulge, y: C }, { x, y: bottomAt(a, t) }, 6), 0.5, ink, alpha);
    }
  });
}

/** Overlapping scale arcs in staggered rows, fading towards back and belly. */
function scaleRows(k: Kit): void {
  const { a, pen, body, ink } = k;
  const s = Math.max(2.6, a.hh * 0.11);
  pen.clipped(body, () => {
    let row = 0;
    for (let v = -0.7; v <= 0.7; v += (s * 1.5) / a.hh, row++) {
      for (let t = 0.32 + (row % 2) * (s / (2 * a.hl)); t < 0.92; t += (s * 1.7) / (2 * a.hl)) {
        if (pen.rng() < Math.abs(v) * 0.9 + 0.12) continue;
        const x = xAt(a, t);
        const y = C + heightAt(a, t) * v;
        const arc: Pt[] = [];
        for (let i = 0; i <= 6; i++) {
          const ang = -Math.PI / 2 + (i / 6) * Math.PI;
          arc.push({ x: x - Math.cos(ang) * s * 0.75, y: y + Math.sin(ang) * s });
        }
        pen.hair(arc, 0.45, ink, 0.5);
      }
    }
  });
}

function lateralLine(k: Kit): void {
  const { a, pen, ink } = k;
  for (let t = 0.3; t < 0.95; t += 0.028) {
    const y = C - heightAt(a, t) * 0.12;
    pen.hair([{ x: xAt(a, t), y }, { x: xAt(a, t + 0.012), y: C - heightAt(a, t + 0.012) * 0.12 }], 0.6, ink, 0.6);
  }
}

function gills(k: Kit): void {
  const { a, pen, ink } = k;
  const t = 0.27;
  const x = xAt(a, t);
  const h = heightAt(a, t);
  pen.stroke(bezier({ x: x + 2, y: C - h * 0.72 }, { x: x - h * 0.32, y: C }, { x: x + 3, y: C + h * 0.7 }), 1, ink, 1, false);
  pen.hair(bezier({ x: x + 6, y: C - h * 0.5 }, { x: x - h * 0.12, y: C + h * 0.05 }, { x: x + 6, y: C + h * 0.55 }), 0.55, ink, 0.6);
}

function eye(k: Kit): void {
  const { a, pen, ink } = k;
  const x = xAt(a, a.eye.t);
  const y = C - heightAt(a, a.eye.t) * 0.3;
  const r = a.eye.r;
  pen.fill(ellipse(x, y, r, r, 18), PAPER_FILL, 1);
  pen.stroke(ellipse(x, y, r, r, 18).concat([{ x: x + r, y }]), 0.9, ink, 1, false);
  pen.hair(ellipse(x, y, r * 0.68, r * 0.68, 16).concat([{ x: x + r * 0.68, y }]), 0.45, ink, 0.7);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    pen.hair([{ x: x + Math.cos(ang) * r * 0.4, y: y + Math.sin(ang) * r * 0.4 }, { x: x + Math.cos(ang) * r * 0.66, y: y + Math.sin(ang) * r * 0.66 }], 0.35, ink, 0.55);
  }
  pen.dot(x + r * 0.08, y, r * 0.38, ink);
  pen.dot(x + r * 0.22, y - r * 0.2, Math.max(0.6, r * 0.13), PAPER_FILL);
  // Socket shadow above the eye.
  pen.hair(bezier({ x: x - r * 1.1, y: y - r * 0.6 }, { x, y: y - r * 1.6 }, { x: x + r * 1.15, y: y - r * 0.55 }), 0.5, ink, 0.55);
}

function mouth(k: Kit): void {
  const { a, pen, ink } = k;
  const nx = xAt(a, 0);
  const t = 0.07;
  const y = C + heightAt(a, t) * 0.18;
  if (a.mouth === 'small' || a.mouth === 'beak') {
    pen.stroke([{ x: nx - 1, y: C + 1 }, { x: xAt(a, t), y: y + 1 }, { x: xAt(a, t + 0.015), y: y - 1 }], 0.9, ink, 1, false);
    if (a.mouth === 'beak') pen.hair([{ x: nx - 2, y: C - 2 }, { x: nx - 2, y: C + 3 }], 0.7, ink, 0.9);
    return;
  }
  if (a.mouth === 'gape') {
    anglerMouth(k);
    return;
  }
  // Pike: a long toothy jaw line under the snout.
  const back = xAt(a, 0.14);
  const jaw = bezier({ x: nx + 1, y: C + 1 }, { x: (nx + back) / 2, y: C + 3 }, { x: back, y: C + 2.5 });
  pen.stroke(jaw, 1, ink, 1, false);
  for (let i = 1; i < 7; i++) {
    const p = jaw[Math.round((i / 7) * (jaw.length - 1))]!;
    needle(pen, p, { x: p.x - 0.6, y: p.y - 2.6 }, 1.4, ink);
  }
}

/** A white needle tooth from `base` to `tip`, outlined in hairline ink. */
function needle(pen: Pen, base: Pt, tip: Pt, width: number, ink: string): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  pen.fill(tooth, PAPER_FILL, 1);
  pen.hair(tooth, 0.4, ink, 0.9);
}

/**
 * Angler: a deep crescent mouth reaching far back along the head, an
 * under-bite chin, and long needle teeth pointing into the dark mouth.
 */
function anglerMouth(k: Kit): void {
  const { a, pen, ink } = k;
  const nx = xAt(a, 0);
  const corner = { x: xAt(a, 0.3), y: C + a.hh * 0.06 };
  const snout = { x: nx - 1, y: C - a.hh * 0.06 };
  const chin = { x: nx + 5, y: C + a.hh * 0.42 };
  const upper = bezier(snout, { x: nx - 14, y: C + a.hh * 0.12 }, corner, 14);
  const lower = bezier(chin, { x: nx - 12, y: C + a.hh * 0.5 }, corner, 14);
  const underJaw = bezier(chin, { x: nx - 2, y: C + a.hh * 0.62 }, { x: xAt(a, 0.16), y: bottomAt(a, 0.16) - 2 }, 8);

  // Jaw flesh that juts past the snout: painted only *behind* existing
  // pixels (destination-over), so the body's own shading stays on top.
  const jaw = [...lower, ...[...underJaw].reverse()];
  pen.ctx.save();
  pen.ctx.globalCompositeOperation = 'destination-over';
  pen.fill(jaw, a.wash, k.heavy ? 0.38 : 0.22);
  pen.fill(jaw, PAPER_FILL, 1);
  pen.ctx.restore();
  pen.clipped(jaw, () => {
    for (let y = chin.y; y < chin.y + a.hh * 0.3; y += 2.4) pen.hair([{ x: chin.x + 2, y }, { x: chin.x - 16, y: y + 2 }], 0.5, ink, 0.6);
  });
  // Dark mouth interior, deepened with fine engraved hatching.
  const mouthShape = [...upper, ...[...lower].reverse()];
  pen.fill(mouthShape, '#2a2228', 0.78);
  pen.clipped(mouthShape, () => {
    for (let x = corner.x; x < chin.x + 4; x += 2.2) pen.hair([{ x, y: C - a.hh * 0.2 }, { x: x - 6, y: C + a.hh * 0.6 }], 0.5, ink, 0.7);
  });
  // Teeth: longest at the front, hanging down from the upper jaw and rising from the lower.
  for (let i = 1; i <= 7; i++) {
    const f = i / 8;
    const len = 11 - f * 6 + pen.rng() * 2;
    const u = upper[Math.round(f * 0.85 * (upper.length - 1))]!;
    needle(pen, u, { x: u.x - len * 0.25, y: u.y + len }, 3.2, ink);
    const l = lower[Math.round(f * 0.85 * (lower.length - 1))]!;
    needle(pen, l, { x: l.x - len * 0.35, y: l.y - len * 1.05 }, 3.4, ink);
  }
  pen.stroke(upper, 1.3, ink, 1, false);
  pen.stroke(lower, 1.5, ink);
  pen.stroke(underJaw, 1.6, ink);
  // A little crease where the lips meet.
  pen.hair(bezier(corner, { x: corner.x - 4, y: corner.y + 3 }, { x: corner.x - 6, y: corner.y + 8 }, 4), 0.6, ink, 0.8);
}

// ---------------------------------------------------------------- species

const backStipple = (density: number) => (k: Kit): void => {
  k.pen.stipple(k.body, 900, (x, y) => {
    const t = (C + k.a.hl - x) / (2 * k.a.hl);
    const top = topAt(k.a, t);
    const rel = (y - top) / (heightAt(k.a, t) * 2 || 1);
    return Math.max(0, (0.45 - rel) * density);
  }, 0.5, k.ink);
};

/** Bends a finished drawing into a sine wave by shifting 1px columns (eels swim in S-curves). */
function undulate(ctx: CanvasRenderingContext2D, amplitude: number): void {
  const { canvas } = ctx;
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  copy.getContext('2d')?.drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < canvas.width; x++) {
    const dy = Math.sin((x / canvas.width) * Math.PI * 2.2 + 0.6) * amplitude * Math.min(1, (canvas.width - x) / 60 + 0.25);
    ctx.drawImage(copy, x, 0, 1, canvas.height, x, dy, 1, canvas.height);
  }
}

const ANATOMY: Record<FishShape, Anatomy> = {
  inkling: {
    hl: 70, hh: 40, peak: 0.38, blunt: 0.8, peduncle: 0.3, tail: 'round', tailSize: 1.0,
    dorsal: { from: 0.34, to: 0.72, height: 0.55 }, anal: { from: 0.6, to: 0.82, height: 0.42 },
    pectoral: 0.55, pelvic: true, scales: true, eye: { t: 0.17, r: 11 }, mouth: 'small',
    wash: '#3466c2', ink: '#1f3f8a',
  },
  minnow: {
    hl: 78, hh: 21, peak: 0.36, blunt: 0.5, peduncle: 0.32, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.42, to: 0.58, height: 0.95 }, anal: { from: 0.66, to: 0.8, height: 0.6 },
    pectoral: 0.45, pelvic: true, scales: true, eye: { t: 0.12, r: 6 }, mouth: 'small',
    wash: '#8fa3a8', extras: backStipple(1.4),
  },
  perch: {
    hl: 68, hh: 42, peak: 0.38, blunt: 0.55, peduncle: 0.26, tail: 'fork', tailSize: 0.95,
    dorsal: { from: 0.2, to: 0.52, height: 0.78, spiny: true }, dorsal2: { from: 0.56, to: 0.76, height: 0.55 },
    anal: { from: 0.66, to: 0.82, height: 0.48 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.15, r: 8 }, mouth: 'small', wash: '#b59a4a', finWash: '#c0563f',
    extras: (k) => {
      // Dark saddle bands, drawn as dense vertical hatching.
      k.pen.clipped(k.body, () => {
        for (let b = 0; b < 5; b++) {
          const t0 = 0.3 + b * 0.13;
          for (let t = t0; t < t0 + 0.05; t += 0.007) {
            const x = k.x(t);
            k.pen.hair([{ x, y: topAt(k.a, t) }, { x: x - 2, y: C + k.h(t) * 0.45 }], 0.5, k.ink, 0.7);
          }
        }
      });
    },
  },
  puffer: {
    hl: 58, hh: 52, peak: 0.45, blunt: 0.95, peduncle: 0.24, tail: 'round', tailSize: 0.75,
    dorsal: { from: 0.7, to: 0.82, height: 0.42 }, anal: { from: 0.72, to: 0.84, height: 0.38 },
    pectoral: 0.4, pelvic: false, scales: false, eye: { t: 0.22, r: 10 }, mouth: 'beak', wash: '#c9b36a',
    extras: (k) => {
      // Spines: a base dot with a fine prickle pointing backwards.
      k.pen.clipped(k.body, () => {
        const ex = k.x(k.a.eye.t);
        const ey = C - k.h(k.a.eye.t) * 0.3;
        for (let i = 0; i < 70; i++) {
          const t = 0.12 + k.pen.rng() * 0.75;
          const y = C + k.h(t) * (k.pen.rng() * 1.7 - 0.85);
          const x = k.x(t);
          if (Math.hypot(x - ex, y - ey) < k.a.eye.r * 2.2) continue;
          k.pen.dot(x, y, 0.8, k.ink, 0.8);
          k.pen.hair([{ x, y }, { x: x - 4, y: y + (y < C ? -2 : 2) }], 0.45, k.ink, 0.7);
        }
      });
      // Outline prickles.
      k.body.forEach((p, i) => {
        if (i % 4 || p.x < xAt(k.a, 0.85)) return;
        const dx = p.x - C;
        const dy = p.y - C;
        const d = Math.hypot(dx, dy) || 1;
        k.pen.hair([p, { x: p.x + (dx / d) * 5, y: p.y + (dy / d) * 5 }], 0.6, k.ink, 0.9);
      });
    },
  },
  pike: {
    hl: 92, hh: 22, peak: 0.45, blunt: 0.15, peduncle: 0.45, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.72, to: 0.86, height: 0.95 }, anal: { from: 0.74, to: 0.88, height: 0.8 },
    pectoral: 0.4, pelvic: true, scales: true, eye: { t: 0.13, r: 6 }, mouth: 'teeth', wash: '#5f7f4e',
    extras: (k) => {
      // Pale bean-shaped spots, each ringed in stipple.
      for (let i = 0; i < 16; i++) {
        const t = 0.28 + k.pen.rng() * 0.6;
        const y = C + k.h(t) * (k.pen.rng() * 1.2 - 0.6);
        const spot = ellipse(k.x(t), y, 3.2, 1.8, 10);
        k.pen.fill(spot, PAPER_FILL, 0.85);
        k.pen.hair(spot.concat([spot[0]!]), 0.4, k.ink, 0.6);
      }
      backStipple(1.2)(k);
    },
  },
  angler: {
    hl: 62, hh: 46, peak: 0.3, blunt: 0.95, peduncle: 0.3, tail: 'round', tailSize: 0.7,
    dorsal: { from: 0.62, to: 0.78, height: 0.5 }, anal: { from: 0.66, to: 0.8, height: 0.4 },
    pectoral: 0.6, pelvic: false, scales: false, eye: { t: 0.24, r: 5.5 }, mouth: 'gape', wash: '#6a5148',
    extras: (k) => {
      // Warty skin.
      k.pen.stipple(k.body, 1400, () => 0.35, 0.5, k.ink);
      for (let i = 0; i < 12; i++) {
        const t = 0.25 + k.pen.rng() * 0.6;
        const y = C + k.h(t) * (k.pen.rng() * 1.4 - 0.7);
        k.pen.hair(ellipse(k.x(t), y, 1.8, 1.4, 8).concat([{ x: k.x(t) + 1.8, y }]), 0.45, k.ink, 0.7);
      }
      // Lure on a jointed stalk, with a glowing bulb.
      const root = { x: k.x(0.28), y: topAt(k.a, 0.28) };
      const bulb = { x: k.x(0) + 16, y: topAt(k.a, 0.3) - 26 };
      k.pen.stroke(bezier(root, { x: k.x(0.12), y: bulb.y - 18 }, bulb), 1.1, k.ink, 1, false);
      k.pen.fill(ellipse(bulb.x, bulb.y, 9, 9, 16), '#f0c94a', 0.25);
      k.pen.fill(ellipse(bulb.x, bulb.y, 5, 5, 14), '#f0c94a', 0.95);
      k.pen.stroke(ellipse(bulb.x, bulb.y, 5, 5, 14).concat([{ x: bulb.x + 5, y: bulb.y }]), 0.8, k.ink, 1, false);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        k.pen.hair([{ x: bulb.x + Math.cos(ang) * 7, y: bulb.y + Math.sin(ang) * 7 }, { x: bulb.x + Math.cos(ang) * 10, y: bulb.y + Math.sin(ang) * 10 }], 0.45, '#b08a1a', 0.8);
      }
    },
  },
  eel: {
    hl: 108, hh: 13, peak: 0.3, blunt: 0.6, peduncle: 0.12, tail: 'point', tailSize: 0,
    dorsal: { from: 0.32, to: 1, height: 0.75 }, anal: { from: 0.55, to: 1, height: 0.65 },
    pectoral: 0.6, pelvic: false, scales: false, eye: { t: 0.07, r: 4.5 }, mouth: 'small', wash: '#4c5a66',
    extras: backStipple(1.6), wave: 9,
  },
};

/** Draws one boil frame of a fish facing right, centred in a FISH_TEX square canvas. */
export function drawFish(ctx: CanvasRenderingContext2D, shape: FishShape, variant: InkVariant, seed: number): void {
  const a = ANATOMY[shape];
  const pen = new Pen(ctx, seed, 0.55);
  const heavy = variant === 'heavy';
  const ink = a.ink ?? INK;
  const body = outline(a);
  const k: Kit = { pen, a, body, heavy, ink, x: (t) => xAt(a, t), h: (t) => heightAt(a, t) };

  // Fins behind the body.
  drawTail(k);
  if (a.dorsal) drawEdgeFin(k, a.dorsal, 'top');
  if (a.dorsal2) drawEdgeFin(k, a.dorsal2, 'top');
  if (a.anal) drawEdgeFin(k, a.anal, 'bottom');
  if (a.pelvic) drawPelvic(k);

  // Body: paper, then a slightly misregistered watercolour wash.
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    ctx.translate(1.5, 1);
    pen.fill(body, a.wash, heavy ? 0.38 : 0.22);
    ctx.translate(-1.5, -1);
  });
  if (heavy) pen.fill(body, '#a3342b', 0.12);

  if (a.scales) scaleRows(k);
  a.extras?.(k);
  contourHatch(k, heavy ? Math.round((a.hh * 1.9) / 2.4) : 6, true, heavy ? 2.4 : 2.8, heavy ? 0.75 : 0.6);
  contourHatch(k, heavy ? 4 : 2, false, 2.6, 0.5);
  if (heavy) crossHatch(k, 3.2, 0.5);
  lateralLine(k);
  gills(k);
  drawPectoral(k);
  // Back and belly as two open strokes: no line across the tail stalk.
  const half = body.length / 2;
  pen.stroke(body.slice(0, half), heavy ? 2.6 : 2.1, ink);
  pen.stroke([...body.slice(half), body[0]!], heavy ? 2.6 : 2.1, ink);
  mouth(k);
  eye(k);
  if (heavy) {
    // Furrowed brow: predators read as predators at a glance.
    const ex = xAt(a, a.eye.t);
    const ey = C - heightAt(a, a.eye.t) * 0.3;
    pen.stroke([{ x: ex - a.eye.r * 1.3, y: ey - a.eye.r * 1.5 }, { x: ex + a.eye.r * 1.2, y: ey - a.eye.r * 0.9 }], 1.8, ink, 1, false);
  }
  if (a.wave) undulate(ctx, a.wave);
}
