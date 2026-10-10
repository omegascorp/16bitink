import { add, bezier, closed, contact, type Draw, edge, glint, lerp, mottle, normals, oval, pt, ribbon, shade, skin, TAU, tint, tube } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, mouth, tilted } from './common';
import { across, along, at, type Body, off, swell } from './spire';

/**
 * Ash & Basalt (beach 5): shells thrown up on a black volcanic beach. Like
 * the other shells they rest on the ground line, apex back, with the
 * opening low on the right at MOUTH_X (see shellArt.ts). Told apart by
 * outline: the drupe a knobbly ball, the horn shell a slim beaded spike
 * hooked at the front, the spindle pointed at both ends, the bonnet a
 * checkered egg with a pointed cap, the harp a big rose oval strung with ribs.
 */

// ---------------------------------------------------------------- spired bodies (shared helpers in spire.ts)

/** The ribbon of a spired shell: `w(u)` is its width, `bump(u)` pushes both outlines out (beads, ribs). */
function body(from: Pt, to: Pt, w: (u: number) => number, n: number, bump?: (u: number) => number): Body {
  const spine = Array.from({ length: n + 1 }, (_, i) => lerp(from, to, i / n));
  const r = ribbon(spine, w);
  const nrm = normals(spine);
  const out = (p: Pt, i: number, side: number): Pt => (bump ? add(p, pt(nrm[i]!.x * bump(i / n) * side, nrm[i]!.y * bump(i / n) * side)) : p);
  const top = r.top.map((p, i) => out(p, i, 1));
  const bot = r.bot.map((p, i) => out(p, i, -1));
  return { spine, top, bot, shape: [...top, ...[...bot].reverse()], n };
}

/** Builds a body, then drops it so its lowest point rests on the ground. */
function settle(make: (dy: number) => Body, g: number): Body {
  const low = Math.max(...make(0).shape.map((p) => p.y));
  return make(g - 1 - low);
}

/** Which whorl `u` is on (between sutures, or past the last up to `end`), and how far through it. */
function whorlAt(u: number, sutures: readonly number[], end: number): { k: number; t: number } {
  const k = sutures.findIndex((s) => u < s);
  const s0 = k === 0 ? 0 : k < 0 ? sutures[sutures.length - 1]! : sutures[k - 1]!;
  const s1 = k < 0 ? end : sutures[k]!;
  return { k, t: Math.min(1, Math.max(0, (u - s0) / (s1 - s0))) };
}

/** The bottom outline's y nearest `x`: for setting a mouth on the underside. */
function below(b: Body, x: number): number {
  return b.bot.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best)).y;
}

const leaning = (cy: number, k: number) => (p: Pt): Pt => pt(p.x + (p.y - cy) * k, p.y);

// ---------------------------------------------------------------- egg-shaped bodies

/**
 * A rounded body whorl seen side-on: an egg whose axis runs from the apex
 * (back and up) to the front, tilted down `a` radians. `s` runs along the
 * axis to the front, `n` across it towards the ground side. `broad` widens
 * the back (the shoulder) and narrows the front.
 */
interface Egg {
  readonly c: Pt;
  readonly a: number;
  readonly A: number;
  readonly B: number;
  readonly broad: number;
}

const place = (e: Egg, s: number, n: number): Pt => pt(e.c.x + s * Math.cos(e.a) - n * Math.sin(e.a), e.c.y + s * Math.sin(e.a) + n * Math.cos(e.a));

/** The egg's half-width at `s`. */
const half = (e: Egg, s: number): number => e.B * Math.sqrt(Math.max(0, 1 - (s / e.A) ** 2)) * (1 - (e.broad * s) / e.A);

function eggline(e: Egg, n = 56, t0 = 0, t1 = TAU, inset = 0): Pt[] {
  const k = t1 - t0 >= TAU - 1e-6 ? n : n + 1;
  return Array.from({ length: k }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / n;
    return place(e, (e.A - inset) * Math.cos(t), (e.B - inset) * Math.sin(t) * (1 - e.broad * Math.cos(t)));
  });
}

/** An egg placed so the point (s, n) on it lands at frame x `x`, resting on the ground. */
function eggAt(shape: Omit<Egg, 'c'>, s: number, n: number, x: number, g: number): Egg {
  const cx = x - place({ ...shape, c: pt(0, 0) }, s, n).x;
  const low = Math.max(...eggline({ ...shape, c: pt(cx, 0) }).map((p) => p.y));
  return { ...shape, c: pt(cx, g - 1 - low) };
}

/** A line across the egg at `s`, bowed `bow` towards the front: a spiral band seen side-on. */
const ring = (e: Egg, s: number, bow: number, n = 16): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const f = -Math.PI / 2 + (Math.PI * i) / n;
    return place(e, s + bow * Math.cos(f), half(e, s) * Math.sin(f));
  });

/** A line along the egg at `k` (-1..1) of its half-width: an axial rib seen side-on. */
const meridian = (e: Egg, k: number, s0: number, s1: number, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const s = s0 + ((s1 - s0) * i) / n;
    return place(e, s, half(e, s) * k);
  });

/** A small pointed spire at the egg's back: a cone from `base` back along the axis, stepped by sutures. */
function spireCone(d: Draw, e: Egg, len: number, w0: number, w1: number, wash: string, line: string): void {
  const { pen } = d;
  const b = -e.A + 8;
  const tip = place(e, b - len, -2);
  const side = (n: number): Pt[] => Array.from({ length: 5 }, (_, i) => {
    const f = i / 4;
    // A little shoulder at each whorl.
    const step = i > 0 && i < 4 ? 1.6 * Math.sign(n) : 0;
    return place(e, b - len * f, n * (1 - f) + step);
  });
  const cone = [...side(-w0), tip, ...side(w1).reverse()];
  skin(d, cone, wash, 0.7);
  pen.clipped(cone, () => {
    for (const f of [0.28, 0.52, 0.74]) pen.stroke(bezier(place(e, b - len * f, -w0 * (1 - f) - 2), place(e, b - len * f + 4, 0), place(e, b - len * f, w1 * (1 - f) + 2), 6), 0.9, d.ink, 0.8, false);
    pen.hair([place(e, b, -w0 * 0.4), tip], 0.6, line, 0.5);
  });
  edge(d, cone, 1.2);
}

// ---------------------------------------------------------------- the shells

/** A dark, lit knob: a drupe's nodule. */
function knob(d: Draw, p: Pt, s: number): void {
  tint(d, oval(p.x + s * 0.2, p.y + s * 0.25, s * 1.1, s * 0.95, 10), '#1c1a22', 0.88);
  tint(d, oval(p.x - s * 0.35, p.y - s * 0.4, s * 0.45, s * 0.3, 8), PAPER_FILL, 0.75);
}

/** A drupe: small, squat and thick, white flushed violet under spiral rows of blunt black knobs that stand out of its outline, a narrow toothed violet mouth. */
export function drupe(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const rx = 40;
  const ry = 33;
  const cx = -16;
  const cy = g - ry - 1;
  contact(d, cx + 8, rx * 1.1);
  // Knobs stand out of the outline round the back, top and front, not where it rests.
  const KNOBS = 13;
  const lift = (t: number): number => Math.min(1, Math.max(0, (0.45 - Math.sin(t)) / 0.5));
  const k = (t: number): number => 1 + 0.1 * Math.max(0, Math.cos(KNOBS * t)) * lift(t);
  const shell = Array.from({ length: 117 }, (_, i) => {
    const t = (i / 117) * TAU;
    return pt(cx + Math.cos(t) * rx * k(t), Math.min(g - 1, cy + Math.sin(t) * ry * k(t)));
  });
  // The spire: a low knobbly cap at the back.
  const cap = tilted(cx - rx * 0.46, cy - ry * 0.86, 11, 6.5, -0.5, 18);
  skin(d, cap, '#e9e1e8', 0.75);
  pen.clipped(cap, () => {
    knob(d, pt(cx - rx * 0.5, cy - ry * 0.98), 2.2);
    knob(d, pt(cx - rx * 0.33, cy - ry * 1.02), 2);
  });
  edge(d, cap, 1.1);
  skin(d, shell, '#ece5ec', 0.75);
  pen.clipped(shell, () => {
    for (let i = 0; i < 9; i++) {
      const t = pen.rng() * TAU;
      tint(d, tilted(cx + Math.cos(t) * rx * 0.6, cy + Math.sin(t) * ry * 0.6, 6 + pen.rng() * 6, 4 + pen.rng() * 3, t), '#a88ac2', 0.28);
    }
    // Spiral rows of knobs round the low spire, seen side-on as rings closing in on the apex, staggered row to row.
    const apex = pt(cx - rx * 0.42, cy - ry * 0.72);
    const ringAt = (k: number, t: number): Pt => {
      const c = lerp(pt(cx, cy), apex, 1 - k);
      return pt(c.x + Math.cos(t) * rx * k, c.y + Math.sin(t) * ry * k);
    };
    for (const k of [0.8, 0.58, 0.37]) pen.hair(Array.from({ length: 41 }, (_, i) => ringAt(k, (i / 40) * TAU)), 0.5, d.ink, 0.3);
    [0.91, 0.69, 0.47, 0.26].forEach((k, row) => {
      const count = row === 0 ? KNOBS : Math.round(KNOBS * k * 1.05);
      for (let j = 0; j < count; j++) {
        const p = ringAt(k, ((j + (row % 2) * 0.5) * TAU) / count);
        if (p.y < g - 4) knob(d, p, 5.6 - row * 0.9);
      }
    });
    glint(d, bezier(pt(cx - rx * 0.8, cy - ry * 0.1), pt(cx - rx * 0.6, cy - ry * 0.75), pt(cx, cy - ry * 0.85), 10), 2, 0.5);
  });
  mottle(d, shell, 90, cy - ry, cy + ry * 0.4, '#5a4a6a', 0.5);
  shade(d, shell, 0.45);
  edge(d, shell, 1.7);
  // The thick white lip round a narrow violet throat, toothed on both sides.
  const x = MOUTH_X.drupe;
  const my = cy + ry * 0.4;
  const lean = leaning(my, -0.2);
  const lip = oval(x + 1, my, 10, 19, 24).map(lean);
  skin(d, lip, '#f3edf1', 0.9);
  skin(d, oval(x, my, 7, 16, 20).map(lean), '#7a4a9c', 0.85);
  edge(d, lip, 1.4);
  mouth(d, oval(x, my, 4, 13, 16).map(lean), 1);
  for (let i = 0; i < 5; i++) {
    for (const side of [-1, 1]) {
      const p = lean(pt(x + side * 4.6, my - 10 + i * 5));
      pen.fill(oval(p.x, p.y, 1.8, 1.2, 6), '#f6f0f4', 1);
    }
  }
}

/** A horn shell (Cerithium): a slim, tall spire of many whorls, beaded all over in spiral rows, cream banded brown, with a short canal twisted up at the front. */
export function hornshell(d: Draw): void {
  const { pen } = d;
  contact(d, -36, 62);
  const sutures = [0.1, 0.19, 0.28, 0.37, 0.46, 0.55, 0.64, 0.74];
  // Beads along both outlines: two per whorl on the spire, three on the body whorl.
  const beads = (u: number): number => {
    if (u > 0.94) return 0;
    const { k, t } = whorlAt(u, sutures, 0.94);
    return (1 + 2.6 * u) * Math.pow(Math.abs(Math.sin(t * Math.PI * (k < 0 ? 3 : 2))), 0.7);
  };
  const W = 44;
  const w = (u: number): number => {
    const cone = u < 0.8 ? Math.pow(u / 0.8, 0.9) : Math.sqrt(Math.max(0, 1 - ((u - 0.8) / 0.2) ** 2)) * 0.68 + 0.32;
    return W * cone * swell(u, sutures, 0.16);
  };
  const b = settle((dy) => body(pt(-114, -44 + dy), pt(18, 30 + dy), w, 72, beads), d.g);
  // The short canal, turned up at the front like a hook.
  const tip = b.spine[b.n]!;
  const hook = bezier(add(tip, pt(-8, 1)), add(tip, pt(10, 7)), add(tip, pt(15, -9)), 8);
  const canal = tube(hook, 10, 3.5);
  skin(d, canal, '#e3d1ae', 0.75);
  pen.hair(hook.map((p, i) => add(p, pt(Math.sin(i * 1.3) * 1.5, Math.cos(i * 1.3) * 1.5))), 0.6, '#6a4224', 0.7);
  edge(d, canal, 1.2);
  skin(d, b.shape, '#e6d6b6', 0.7);
  pen.clipped(b.shape, () => {
    // Two brown spiral bands, then rows of beads over everything: brown on the bands, pale between.
    const BANDS = [0.4, -0.32];
    for (const v of BANDS) pen.stroke(along(b, v, 0.04, 0.97), 6, '#8a5a34', 0.35, false);
    for (const v of [-0.76, -0.32, 0.04, 0.4, 0.76]) {
      const brown = BANDS.includes(v);
      for (let i = at(b, 0.04); i < at(b, 0.96); i += 2) {
        const p = off(b, i, v);
        const s = Math.max(0.9, Math.hypot(b.top[i]!.x - b.bot[i]!.x, b.top[i]!.y - b.bot[i]!.y) * 0.075);
        tint(d, oval(p.x + s * 0.35, p.y + s * 0.45, s * 1.1, s * 0.9, 8), brown ? '#4a2a14' : d.ink, brown ? 0.6 : 0.3);
        tint(d, oval(p.x - s * 0.2, p.y - s * 0.25, s * 0.75, s * 0.6, 8), brown ? '#a06a3c' : PAPER_FILL, brown ? 0.8 : 0.8);
      }
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1, d.ink, 0.85, false);
    glint(d, along(b, 0.6, 0.2, 0.9), 1.8, 0.5);
  });
  mottle(d, b.shape, 90, -50, 40, '#5a341a', 0.5);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.6);
  // A small oval mouth with a thin pale lip, banded where the brown rows reach it.
  const x = MOUTH_X.hornshell;
  const my = below(b, x) - 11;
  const lean = leaning(my, -0.4);
  const lip = oval(x + 2, my, 10, 12, 22).map(lean);
  skin(d, lip, '#f1e6cf', 0.85);
  pen.clipped(lip, () => {
    for (const dy of [-6, 4]) pen.stroke([lean(pt(x + 6, my + dy)), lean(pt(x + 13, my + dy - 1))], 2.4, '#7a4a26', 0.55, false);
  });
  edge(d, lip, 1.2);
  mouth(d, oval(x, my + 1, 7, 9, 16).map(lean), 1.1);
}

/** A spindle shell (Fusinus): long and slender, pointed at both ends, a tall spire and a long straight canal, pale, latticed by strong spiral cords over rounded axial ribs. */
export function spindle(d: Draw): void {
  const { pen } = d;
  contact(d, -14, 64);
  const W = 56;
  const sutures = [0.06, 0.12, 0.18, 0.245, 0.31, 0.38, 0.45];
  const w = (u: number): number => {
    if (u < 0.45) return W * 0.66 * Math.pow(u / 0.45, 0.9) * swell(u, sutures, 0.2);
    if (u < 0.55) return W * (0.66 + 0.34 * Math.sin((((u - 0.45) / 0.1) * Math.PI) / 2));
    if (u < 0.74) return W * (0.14 + 0.86 * Math.pow(Math.cos((((u - 0.55) / 0.19) * Math.PI) / 2), 1.2));
    return W * 0.14 * (1 - 0.5 * ((u - 0.74) / 0.26));
  };
  const b = settle((dy) => body(pt(-110, 4 + dy), pt(76, 22 + dy), w, 120), d.g);
  skin(d, b.shape, '#eee4d0', 0.75);
  pen.clipped(b.shape, () => {
    // Rounded axial ribs: a few short swellings along each whorl, lit above and shadowed below.
    for (let k = 0; k <= sutures.length; k++) {
      const s0 = k === 0 ? 0.02 : sutures[k - 1]!;
      const s1 = k < sutures.length ? sutures[k]! : 0.62;
      for (const f of [-1.1, -0.55, 0, 0.55, 1.1]) {
        const v = Math.sin(f);
        const rib = along(b, v, s0 + (s1 - s0) * 0.12, s1 - (s1 - s0) * 0.12);
        if (rib.length < 2) continue;
        pen.stroke(rib.map((p) => add(p, pt(0.8, 1.6))), 2.6, '#a07a52', 0.4, false);
        pen.stroke(rib, 2.4, PAPER_FILL, 0.7, false);
      }
    }
    // Strong spiral cords across every whorl and down the canal.
    for (let i = 2; i < b.n - 1; i += 3) {
      pen.hair(across(b, i, 3), 0.9, '#6a4a2c', 0.5);
      pen.hair(across(b, i + 1, 3), 0.7, PAPER_FILL, 0.5);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.2, d.ink, 0.9, false);
    tint(d, along(b, 0.5, 0.48, 0.68).concat(along(b, 0.85, 0.48, 0.68).reverse()), '#c9a87e', 0.3);
    glint(d, along(b, 0.55, 0.3, 0.68), 2.2, 0.5);
  });
  mottle(d, b.shape, 80, -20, 40, '#7a5a3a', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.6);
  // The aperture on the underside, running out into the canal's open groove.
  const i0 = at(b, 0.5);
  const i1 = at(b, 0.72);
  const lens = (k: number): number => -0.92 + 0.6 * Math.sin((Math.PI * k) / (i1 - i0));
  const inner = [...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i0 + k, lens(k))), ...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i1 - k, -0.94))];
  skin(d, inner, '#f6eee0', 0.85);
  pen.clipped(inner, () => tint(d, oval(MOUTH_X.spindle + 4, below(b, MOUTH_X.spindle) - 6, 18, 6), '#d9b48a', 0.4));
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.5, 0.72, 0.98), 2, DARK, 0.75, false);
  const x = MOUTH_X.spindle;
  const my = below(b, x) - 8;
  mouth(d, oval(x, my, 10, 7, 18).map(leaning(my, -0.3)), 1.1);
}

/** A bonnet (Phalium): a glossy egg with a short pointed spire, cream checkered in rows of tan squares, a thick white toothed lip and a short canal turned up at the front. */
export function bonnet(d: Draw): void {
  const { pen } = d;
  const e = eggAt({ a: 0.42, A: 58, B: 44, broad: 0.1 }, 58 * 0.72, 44 * 0.08, MOUTH_X.bonnet, d.g);
  contact(d, e.c.x + 6, 62);
  // The recurved canal at the front, under the body's edge.
  const root = place(e, e.A - 10, e.B * 0.18);
  const hook = bezier(root, add(root, pt(16, 6)), add(root, pt(20, -7)), 8);
  const canal = tube(hook, 11, 4);
  skin(d, canal, '#efe2c4', 0.8);
  pen.hair(hook.map((p) => add(p, pt(0, 1.5))), 0.7, '#8a5a30', 0.6);
  edge(d, canal, 1.2);
  spireCone(d, e, 26, e.B * 0.42, e.B * 0.36, '#ead9b8', '#9a6a3a');
  const shell = eggline(e);
  skin(d, shell, '#f7f0e0', 0.8);
  pen.clipped(shell, () => {
    tint(d, eggline(e, 40, Math.PI * 1.05, Math.PI * 1.95, 0).concat([place(e, 0, -e.B * 0.2)]), '#fff6e2', 0.5);
    // Checkered spiral rows: tan squares, every other cell, offset row to row.
    const ROWS = 7;
    const span = (e.A * 1.62) / ROWS;
    for (let j = 0; j < ROWS; j++) {
      const s0 = -e.A * 0.8 + j * span;
      const h = span * 0.58;
      const a = ring(e, s0, 7, 14);
      const z = ring(e, s0 + h, 7, 14);
      pen.hair(ring(e, s0 - span * 0.2, 7, 14), 0.45, d.ink, 0.25);
      for (let c = j % 2; c < 14; c += 2) {
        tint(d, [a[c]!, a[c + 1]!, z[c + 1]!, z[c]!], '#cf7a32', 0.6 + pen.rng() * 0.25);
      }
    }
    glint(d, Array.from({ length: 12 }, (_, i) => {
      const s = -e.A * 0.6 + (i / 11) * e.A * 1.1;
      return place(e, s, -half(e, s) * 0.62);
    }), 3.4, 0.85);
    pen.fill(oval(place(e, -e.A * 0.35, -e.B * 0.5).x, place(e, -e.A * 0.35, -e.B * 0.5).y, 3, 2.2, 8), PAPER_FILL, 0.9);
  });
  mottle(d, shell, 60, e.c.y - e.B, e.c.y, '#8a5a30', 0.45);
  shade(d, shell, 0.45);
  edge(d, shell, 1.7);
  // The thick, rolled outer lip round the front, then the long slot of the aperture inside it, toothed.
  const [T0, T1] = [-1.05, 0.85];
  const rim = (inset: (f: number) => number, n = 24): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const t = T0 + ((T1 - T0) * i) / n;
    const k = inset(i / n);
    return place(e, (e.A - k) * Math.cos(t), (e.B - k) * Math.sin(t) * (1 - e.broad * Math.cos(t)));
  });
  // Thickest at the middle, thinning to nothing at both ends.
  const lip = [...rim(() => 0), ...rim((f) => 2 + 8 * Math.sin(Math.PI * f)).reverse()];
  const slot = [...eggline(e, 20, T0 + 0.1, T1 - 0.1, 9), ...eggline(e, 20, T0 + 0.1, T1 - 0.1, 20).reverse()];
  skin(d, slot, '#e2a46a', 0.8);
  skin(d, lip, '#fbf6ea', 0.95);
  pen.clipped(lip, () => glint(d, eggline(e, 16, T0 + 0.2, T1 - 0.3, 3), 1.8, 0.85));
  edge(d, lip, 1.4);
  for (let i = 1; i < 10; i++) {
    const t = T0 + 0.1 + ((T1 - T0 - 0.2) * i) / 10;
    const p = place(e, (e.A - 9) * Math.cos(t), (e.B - 9) * Math.sin(t) * (1 - e.broad * Math.cos(t)));
    const q = place(e, (e.A - 13) * Math.cos(t), (e.B - 13) * Math.sin(t) * (1 - e.broad * Math.cos(t)));
    pen.stroke([p, q], 1.3, DARK, 0.75, false);
  }
  const h = place(e, e.A * 0.72, e.B * 0.08);
  mouth(d, tilted(h.x, h.y, 6, 17, e.a, 18), 1.1);
}

/** A harp shell (Harpa): a big, broad, inflated body whorl strung with evenly spaced sharp ribs, rose and cream with chevrons between them, a crown of points on the shoulder, a short spire and a wide mouth. */
export function harp(d: Draw): void {
  const { pen } = d;
  const e = eggAt({ a: 0.6, A: 62, B: 52, broad: 0.12 }, 62 * 0.42, 52 * 0.5, MOUTH_X.harp, d.g);
  contact(d, e.c.x + 6, 70);
  spireCone(d, e, 22, e.B * 0.34, e.B * 0.3, '#eab6b0', '#8a3a40');
  const shell = eggline(e);
  skin(d, shell, '#e7a6a6', 0.62);
  // Ribs at evenly turned angles round the whorl, so they crowd towards the outline.
  const RIBS = Array.from({ length: 10 }, (_, j) => Math.sin(-1.3 + (j * 2.6) / 9));
  const S0 = -e.A * 0.8;
  const S1 = e.A * 0.97;
  pen.clipped(shell, () => {
    // Cream spiral bands across the whorl.
    for (const [s0, s1] of [[-0.5, -0.32], [0.02, 0.18], [0.5, 0.64]] as const) tint(d, [...ring(e, e.A * s0, 8), ...ring(e, e.A * s1, 8).reverse()], '#f8eadb', 0.65);
    // Chevrons between the ribs, pointing forward.
    for (let j = 0; j < RIBS.length - 1; j++) {
      const k0 = RIBS[j]!;
      const k1 = RIBS[j + 1]!;
      for (let s = S0 + 6; s < S1 - 6; s += 9) {
        const v = [place(e, s, half(e, s) * k0), place(e, s + 4.5, half(e, s + 4.5) * (k0 + k1) / 2), place(e, s, half(e, s) * k1)];
        pen.stroke(v, 1.3, '#7a2e38', 0.5, false);
      }
    }
    // The ribs: sharp raised ridges, pale on the crest, inked on the shadow side, barred brown here and there.
    for (const k of RIBS) {
      const rib = meridian(e, k, S0, S1, 30);
      pen.stroke(rib.map((p) => add(p, pt(1.2, 1.6))), 1.6, d.ink, 0.75, false);
      pen.stroke(rib, 3.4, '#fdf1ec', 0.92, false);
      for (let i = 4; i < rib.length - 2; i += 6) pen.stroke([lerp(rib[i]!, rib[i + 1]!, 0.2), lerp(rib[i]!, rib[i + 1]!, 0.8)], 3.4, '#6a2a2a', 0.5, false);
    }
    glint(d, meridian(e, -0.62, -e.A * 0.5, e.A * 0.45, 12), 2.4, 0.5);
  });
  shade(d, shell, 0.45);
  edge(d, shell, 1.8);
  // The crown: each rib ends in a little point on the shoulder, standing out round the outline.
  for (const k of RIBS) {
    const s = S0 + 2;
    const hw = half(e, s);
    const spike = [place(e, s + 2, hw * k - 2.2), place(e, s - 5, hw * k * 1.12), place(e, s + 2, hw * k + 2.2)];
    skin(d, spike, '#f6dcd6', 0.9);
    edge(d, spike, 0.9);
  }
  // The wide mouth along the underside: a glossy pink apron with a dark blotch at its back, the thick last rib for a lip.
  const M = { s: e.A * 0.42, n: e.B * 0.5 };
  const m = place(e, M.s, M.n);
  const apron = tilted(m.x, m.y, e.A * 0.56, e.B * 0.42, e.a, 36);
  pen.clipped(shell, () => {
    skin(d, apron, '#f2cfc4', 0.85);
    const blot = place(e, M.s - e.A * 0.4, M.n - e.B * 0.1);
    pen.clipped(apron, () => {
      tint(d, tilted(blot.x, blot.y, 11, 8, e.a), '#7a3a2e', 0.35);
      glint(d, [place(e, M.s - e.A * 0.3, M.n - e.B * 0.32), place(e, M.s + e.A * 0.3, M.n - e.B * 0.3)], 2, 0.7);
    });
    pen.stroke(closed(apron), 1.2, d.ink, 1, false);
  });
  const lipArc = Array.from({ length: 15 }, (_, i) => {
    const t = -0.55 + (i / 14) * 1.5;
    return place(e, M.s + Math.cos(t) * e.A * 0.56, M.n + Math.sin(t) * e.B * 0.42);
  });
  pen.clipped(shell, () => {
    pen.stroke(lipArc, 6, '#fbeee8', 0.95, false);
    pen.stroke(lipArc.map((p) => add(p, pt(-1.8, -2.2))), 1.1, d.ink, 0.8, false);
  });
  mouth(d, tilted(m.x, m.y, e.A * 0.4, e.B * 0.24, e.a, 24), 1.1);
}
