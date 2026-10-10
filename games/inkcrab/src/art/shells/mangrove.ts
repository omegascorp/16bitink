import { add, bezier, closed, contact, cub, type Draw, edge, glint, lerp, mottle, normals, oval, pt, ribbon, shade, skin, tint } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, mouth, tilted } from './common';

/**
 * Mangrove Margins (beach 4): snails of the roots and the mud. Like the
 * other shells they rest on the ground line, apex back, with the opening
 * low on the right at MOUTH_X (see shellArt.ts). The three spired ones are
 * told apart by their lean and finish: the periwinkle small and bulging,
 * the mud creeper long, low and corded, the telescope a straight spike.
 */

/** A shell's body seen side-on: a ribbon round a spine from the apex (u 0) to the front (u 1). */
interface Body {
  readonly spine: Pt[];
  readonly top: Pt[];
  readonly bot: Pt[];
  readonly shape: Pt[];
  readonly n: number;
}

/**
 * The ribbon of a spired shell: `w(u)` is its width, `bend` bows the spine
 * up (towards the top outline), `bump(u)` pushes the top outline out (knobs).
 */
function body(from: Pt, to: Pt, w: (u: number) => number, bend = 0, n = 48, bump?: (u: number) => number): Body {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const c = add(lerp(from, to, 0.5), pt(((to.y - from.y) / l) * bend, (-(to.x - from.x) / l) * bend));
  const spine = bezier(from, c, to, n);
  const r = ribbon(spine, w);
  const nrm = normals(spine);
  const top = bump ? r.top.map((p, i) => add(p, pt(nrm[i]!.x * bump(i / n), nrm[i]!.y * bump(i / n)))) : r.top;
  return { spine, top, bot: r.bot, shape: [...top, ...[...r.bot].reverse()], n };
}

const at = (b: Body, u: number): number => Math.round(Math.min(1, Math.max(0, u)) * b.n);

/** The point `v` of the way from the spine out to the top outline (v > 0) or the bottom one (v < 0). */
const off = (b: Body, i: number, v: number): Pt => lerp(b.spine[i]!, v >= 0 ? b.top[i]! : b.bot[i]!, Math.abs(v));

/** A spiral line along the shell at `v`, from u0 to u1. */
function along(b: Body, v: number, u0 = 0, u1 = 1): Pt[] {
  const i0 = at(b, u0);
  return Array.from({ length: at(b, u1) - i0 + 1 }, (_, k) => off(b, i0 + k, v));
}

/** Unit direction of the spine at `i`, towards the front. */
function tangent(b: Body, i: number): Pt {
  const p = b.spine[Math.max(0, i - 1)]!;
  const q = b.spine[Math.min(b.n, i + 1)]!;
  const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  return pt((q.x - p.x) / l, (q.y - p.y) / l);
}

/** A line across the shell at `i` (a suture or rib), bowed `bow` towards the front. */
function across(b: Body, i: number, bow: number): Pt[] {
  const t = tangent(b, i);
  return bezier(b.top[i]!, add(b.spine[i]!, pt(t.x * bow, t.y * bow)), b.bot[i]!, 8);
}

/** Convex whorls: each swells between its sutures by `bulge` of the width; the body whorl, after the last, does not dip. */
function swell(u: number, sutures: readonly number[], bulge: number): number {
  const k = sutures.findIndex((s) => u < s);
  if (k < 0) return 1;
  const s0 = k === 0 ? 0 : sutures[k - 1]!;
  return 1 - bulge + bulge * Math.sin((Math.PI * (u - s0)) / (sutures[k]! - s0));
}

/** A cone widening to its broadest at `peak`, then rounding off to `end` of that at the front. */
function taper(u: number, peak: number, end: number): number {
  if (u < peak) return Math.pow(u / peak, 0.9);
  return Math.sqrt(Math.max(0, 1 - ((u - peak) / (1 - peak)) ** 2)) * (1 - end) + end;
}

// ---------------------------------------------------------------- the shells

/** A mangrove periwinkle: small and thin, a sharp high spire of bulging whorls, finely ribbed, tan streaked with dark zigzags and flecks. */
export function mangrovewinkle(d: Draw): void {
  const { pen } = d;
  contact(d, -10, 44);
  const sutures = [0.09, 0.18, 0.28, 0.39, 0.52];
  const b = body(pt(-84, -58), pt(28, 38), (u) => 54 * taper(u, 0.7, 0.16) * swell(u, sutures, 0.2), -3);
  skin(d, b.shape, '#cfa86e', 0.65);
  pen.clipped(b.shape, () => {
    // Two faint brown bands, then fine spiral ribs close together.
    for (const v of [0.45, -0.3]) pen.stroke(along(b, v), 3, '#8a5630', 0.35, false);
    for (let v = -0.88; v < 0.9; v += 0.16) pen.hair(along(b, v), 0.45, d.ink, 0.35);
    // Dark zigzag streaks across the whorls, broken here and there, and flecks along the ribs.
    for (let i = at(b, 0.1); i < at(b, 0.95); i += 3) {
      if (pen.rng() < 0.3) continue;
      const t = tangent(b, i);
      pen.stroke(Array.from({ length: 7 }, (_, k) => add(off(b, i, 1 - k / 3), pt(t.x * (k % 2 ? 2 : -2), t.y * (k % 2 ? 2 : -2)))), 1.3, '#5a341a', 0.55, false);
    }
    for (let k = 0; k < 70; k++) {
      const p = off(b, at(b, 0.1 + pen.rng() * 0.85), Math.round((pen.rng() * 2 - 1) * 5.5) * 0.16);
      tint(d, oval(p.x, p.y, 1.6, 0.9, 6), '#4a2a14', 0.6);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 4), 1, d.ink, 0.85, false);
    glint(d, along(b, 0.55, 0.18, 0.86), 2, 0.6);
  });
  mottle(d, b.shape, 140, -60, 40, '#5a341a', 0.5);
  shade(d, b.shape);
  edge(d, b.shape, 1.6);
  // A thin pale lip round the oval mouth, banded brown at its edge.
  const x = MOUTH_X.mangrovewinkle;
  const lean = (p: Pt): Pt => pt(p.x + (p.y - 26) * -0.35, p.y);
  const lip = oval(x + 2, 26, 12, 17, 24).map(lean);
  skin(d, lip, '#ead6ae', 0.8);
  pen.clipped(lip, () => {
    for (let k = 0; k < 4; k++) pen.stroke([lean(pt(x + 8, 14 + k * 7)), lean(pt(x + 16, 14 + k * 7))], 2, '#7a4a26', 0.5, false);
  });
  edge(d, lip, 1.2);
  mouth(d, oval(x, 26, 9, 14, 18).map(lean), 1.1);
}

/** A river nerite: a squat glossy ball with no spire to speak of, olive-black under fine yellow tented lines, and a big half-moon mouth beside a smooth shelf. */
export function rivernerite(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const r = 39;
  const cx = -18;
  const cy = g - r - 1;
  contact(d, cx + 8, r * 1.15);
  // The apex: a worn chalky nub just showing at the back.
  const nub = tilted(cx - r * 0.44, cy - r * 0.86, 6, 4, -0.5, 14);
  skin(d, nub, '#bdb48e', 0.75);
  edge(d, nub, 1.1);
  const globe = oval(cx, cy, r * 1.06, r, 44);
  skin(d, globe, '#36402a', 0.9);
  // A point on the coil winding out from the apex, t 0..1, `k` bands further out.
  const coil = (t: number, rr: number): Pt => {
    const a = -Math.PI * 0.9 + t * Math.PI * 2.4;
    return pt(cx - r * 0.2 + Math.cos(a) * rr * 1.05, cy - r * 0.12 + Math.sin(a) * rr * 0.92);
  };
  pen.clipped(globe, () => {
    tint(d, oval(cx - r * 0.3, cy - r * 0.45, r * 0.8, r * 0.5), '#74833e', 0.45);
    // Fine yellow lines following the coil, tented into tight zigzags.
    for (let k = 0; k < 9; k++) {
      const zig = Array.from({ length: 81 }, (_, i) => {
        const t = 0.15 + (i / 80) * 0.85;
        return coil(t, r * (0.12 + t * 0.7) + k * r * 0.085 + (i % 2 ? 1.8 : -1.8));
      });
      pen.hair(zig, 0.7, '#e3cc62', 0.75);
    }
    // The worn apex's chalky patch, the suture, and a wet polish.
    tint(d, oval(cx - r * 0.48, cy - r * 0.62, 8, 5), '#cfc8a6', 0.6);
    pen.stroke(Array.from({ length: 51 }, (_, i) => coil(i / 50, r * (0.1 + (i / 50) * 0.64))), 0.9, d.ink, 0.85, false);
    glint(d, bezier(pt(cx - r * 0.82, cy - r * 0.1), pt(cx - r * 0.6, cy - r * 0.85), pt(cx + r * 0.2, cy - r * 0.88), 12), 3.4, 0.85);
    d.pen.fill(oval(cx - r * 0.5, cy - r * 0.42, 3, 2.2, 8), PAPER_FILL, 0.95);
  });
  shade(d, globe, 0.4);
  edge(d, globe, 1.7);
  neriteMouth(d, MOUTH_X.rivernerite - 9, g - 42, g - 3, cy);
}

/** A river nerite's opening: a thin yellow-olive lip, a broad cream shelf with a finely toothed straight edge, and the half-moon hole. */
function neriteMouth(d: Draw, x0: number, y0: number, y1: number, cy: number): void {
  const { pen } = d;
  const lean = (p: Pt): Pt => pt(p.x + (p.y - cy) * -0.12, p.y);
  const mid = (y0 + y1) / 2;
  const rim = [pt(x0, y0 - 3), ...cub(pt(x0, y0 - 3), pt(x0 + 31, y0 - 2), pt(x0 + 33, y1 + 1), pt(x0, y1 + 1), 16).slice(1)].map(lean);
  skin(d, rim, '#b9b07a', 0.8);
  edge(d, rim, 1.4);
  const shelf = [pt(x0, y0), pt(x0, y1), ...cub(pt(x0, y1), pt(x0 - 10, y1 + 1), pt(x0 - 16, y1 - 12), pt(x0 - 15, mid), 8).slice(1),
    ...cub(pt(x0 - 15, mid), pt(x0 - 15, y0 + 8), pt(x0 - 9, y0 - 2), pt(x0, y0), 8).slice(1)].map(lean);
  skin(d, shelf, '#ece6c4', 0.85);
  glint(d, [pt(x0 - 8, y0 + 8), pt(x0 - 9, y1 - 10)].map(lean), 1.8, 0.8);
  edge(d, shelf, 1.1);
  for (let i = 0; i < 7; i++) {
    const y = y0 + 6 + i * ((y1 - y0 - 12) / 6);
    pen.hair([pt(x0 - 3, y), pt(x0, y)].map(lean), 0.8, d.ink, 0.7);
  }
  mouth(d, [pt(x0, y0), ...cub(pt(x0, y0), pt(x0 + 26, y0 + 1), pt(x0 + 28, y1 - 1), pt(x0, y1), 16).slice(1)].map(lean), 1.2);
}

/** A mud creeper: a long, heavy, low-lying cone of many whorls, latticed with strong cords over axial ribs, dark brown, with a broad flared lip. */
export function mudcreeper(d: Draw): void {
  const { pen } = d;
  contact(d, -30, 66);
  const sutures = [0.06, 0.12, 0.18, 0.25, 0.32, 0.4, 0.49, 0.59, 0.7];
  const b = body(pt(-114, -22), pt(24, 30), (u) => 58 * taper(u, 0.8, 0.22) * swell(u, sutures, 0.13), 5);
  skin(d, b.shape, '#6a4a30', 0.8);
  pen.clipped(b.shape, () => {
    // Axial ribs across each whorl, then strong spiral cords over them, crested pale: a beaded lattice.
    for (let i = 2; i < at(b, 0.8); i += 2) pen.stroke(across(b, i, 3), 1, d.ink, 0.4, false);
    for (const v of [-0.66, -0.33, 0, 0.33, 0.66]) {
      pen.stroke(along(b, v), 2.4, '#3a2414', 0.55, false);
      pen.hair(along(b, v + 0.09), 1, '#d8b890', 0.55);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.3, d.ink, 0.9, false);
    glint(d, along(b, 0.5, 0.1, 0.8), 2, 0.45);
  });
  mottle(d, b.shape, 160, -50, 40, '#2e1c10', 0.6);
  shade(d, b.shape, 0.55);
  edge(d, b.shape);
  // The flared outer lip: a thick wing standing out round the front, paler inside, grooved where the cords reach it.
  const x = MOUTH_X.mudcreeper;
  const lip = [...cub(pt(x - 20, -8), pt(x - 8, -26), pt(x + 14, -32), pt(x + 25, -14), 12), ...cub(pt(x + 25, -14), pt(x + 31, 4), pt(x + 25, 34), pt(x + 6, 44), 12).slice(1),
    ...cub(pt(x + 6, 44), pt(x - 6, 46), pt(x - 18, 42), pt(x - 22, 34), 8).slice(1), ...cub(pt(x - 22, 34), pt(x - 16, 20), pt(x - 22, 4), pt(x - 20, -8), 8).slice(1)];
  skin(d, lip, '#b48a5e', 0.75);
  pen.clipped(lip, () => {
    tint(d, oval(x + 2, 18, 14, 22), '#e6cca2', 0.7);
    for (let k = 0; k < 6; k++) pen.stroke([pt(x + 12, -12 + k * 10), pt(x + 28, -16 + k * 11)], 2.2, '#5a3a22', 0.55, false);
    glint(d, cub(pt(x - 10, -14), pt(x + 2, -26), pt(x + 18, -24), pt(x + 22, -6), 8), 1.8, 0.7);
  });
  edge(d, lip, 1.6);
  mouth(d, oval(x, 22, 10, 15, 18).map((p) => pt(p.x + (p.y - 22) * -0.3, p.y)), 1.1);
}

/** A telescope snail: a very tall, dead-straight cone of flat whorls, spirally grooved, chocolate with a pale band, on a flat base with a twisted pillar. */
export function telescope(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -2, 34);
  // The axis leans steeply up and back; the cone rests on the low rim of its base.
  const a = (52 * Math.PI) / 180;
  const ax = pt(-Math.cos(a), -Math.sin(a));
  const side = pt(Math.sin(a), -Math.cos(a));
  const R = 27;
  const base = pt(14, g - R * Math.cos(a) - 3);
  const lo = add(base, pt(-side.x * R, -side.y * R));
  const hi = add(base, pt(side.x * R, side.y * R));
  const apex = add(base, pt(ax.x * 168, ax.y * 168));
  const tilt = Math.atan2(side.y, side.x);
  const face = tilted(base.x, base.y, R, 9, tilt, 36);
  // The cone's sides run on round the far half of the base's rim, so its corners stay smooth.
  const rim = Array.from({ length: 17 }, (_, i) => {
    const t = Math.PI - (i / 16) * Math.PI;
    return add(base, pt(-side.x * Math.cos(t) * R + ax.x * Math.sin(t) * -9, -side.y * Math.cos(t) * R + ax.y * Math.sin(t) * -9));
  });
  // Sides in short steps, so the pen's smoothing does not overshoot where they meet the rim.
  const cone = [...Array.from({ length: 24 }, (_, i) => lerp(apex, rim[0]!, i / 24)), ...rim, ...Array.from({ length: 23 }, (_, i) => lerp(rim[16]!, apex, (i + 1) / 24))];
  // Each whorl a fifth taller than the one before: sutures at these fractions of the way from the apex.
  const rings = Array.from({ length: 12 }, (_, j) => Math.pow(1.2, -j));
  const ring = (u: number): Pt[] => bezier(lerp(apex, lo, u), add(lerp(apex, base, u), pt(-ax.x * 4 * u, -ax.y * 4 * u)), lerp(apex, hi, u), 14);
  skin(d, cone, '#4a2e1c', 0.85);
  pen.clipped(cone, () => {
    for (let j = 1; j < rings.length; j++) {
      const u0 = rings[j]!;
      const h = rings[j - 1]! - u0;
      // A pale band under each suture, then fine spiral grooves.
      tint(d, [...ring(u0 + h * 0.1), ...ring(u0 + h * 0.38).reverse()], '#c9a878', 0.5);
      for (const v of [0.5, 0.68, 0.86]) pen.hair(ring(u0 + h * v), 0.5, '#1e140c', 0.5);
      pen.stroke(ring(u0), 1.1, d.ink, 0.85, false);
    }
    glint(d, [lerp(apex, lo, 0.15), lerp(apex, lo, 0.95)].map((p) => add(p, pt(side.x * 5, side.y * 5))), 2.4, 0.5);
  });
  shade(d, cone, 0.5);
  edge(d, cone, 1.7);
  // The flat base, ringed with growth lines, the mouth near its low rim and the twisted pillar winding into it.
  skin(d, face, '#d9c4a0', 0.75);
  pen.clipped(face, () => {
    for (const k of [0.4, 0.65, 0.88]) pen.hair(closed(tilted(base.x + 2, base.y + 1, R * k, 9 * k, tilt, 24)), 0.5, '#6a4a30', 0.5);
  });
  edge(d, face, 1.3);
  const my = base.y + 3;
  mouth(d, tilted(MOUTH_X.telescope, my, 11, 6.5, tilt, 18), 1.2);
  const pillar = cub(add(base, pt(side.x * 6, side.y * 6)), add(base, pt(4, 3)), pt(MOUTH_X.telescope + 7, my - 6), pt(MOUTH_X.telescope + 4, my - 1), 10);
  pen.stroke(pillar, 2.2, '#efe2c8', 0.95, false);
  pen.hair(pillar.map((p, i) => add(p, pt(0, Math.sin(i * 1.2) * 1.2 + 1))), 0.6, d.ink, 0.75);
}

/** A mud whelk: a big heavy spindle, a raised spire, a row of blunt knobs on the shoulder and a long canal, rusty brown under a worn dark skin. */
export function mudwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -20, 72);
  const W = 86;
  const sutures = [0.07, 0.14, 0.22];
  const w = (u: number): number => {
    if (u < 0.3) return W * 0.5 * Math.pow(u / 0.3, 0.95) * swell(u, sutures, 0.14);
    if (u < 0.36) return W * (0.5 + 0.5 * Math.sin((((u - 0.3) / 0.06) * Math.PI) / 2));
    if (u < 0.8) return W * (0.15 + 0.85 * Math.pow(Math.cos((((u - 0.36) / 0.44) * Math.PI) / 2), 1.3));
    return W * 0.15 * (1 - 0.4 * ((u - 0.8) / 0.2));
  };
  // Four blunt, rounded knobs along the shoulder, small nubs on the spire's whorls.
  const KNOBS = { from: 0.31, to: 0.62, n: 4 } as const;
  const hump = (u: number, from: number, to: number, n: number): number => Math.pow(Math.max(0, Math.sin(((u - from) / (to - from)) * Math.PI * (2 * n - 1))), 0.6);
  const knob = (u: number): number => {
    if (u > KNOBS.from && u < KNOBS.to) return 7 * hump(u, KNOBS.from, KNOBS.to, KNOBS.n);
    if (u > 0.08 && u < 0.29) return 2.5 * hump(u, 0.08, 0.29, 4);
    return 0;
  };
  const b = body(pt(-102, -30), pt(62, 40), w, -4, 96, knob);
  skin(d, b.shape, '#a65c2e', 0.72);
  pen.clipped(b.shape, () => {
    // The periostracum: a dark fibrous skin worn through in patches, hairy along the spiral.
    for (let k = 0; k < 14; k++) {
      const p = off(b, at(b, 0.1 + pen.rng() * 0.75), pen.rng() * 1.8 - 0.9);
      tint(d, tilted(p.x, p.y, 5 + pen.rng() * 7, 3 + pen.rng() * 3, 0.4), '#4e3220', 0.35);
    }
    for (let v = -0.9; v < 0.95; v += 0.12) pen.hair(along(b, v, 0.05, 0.95), 0.5, '#3a2414', 0.4);
    for (const v of [0.6, 0.25, -0.15, -0.5]) pen.stroke(along(b, v, 0.3, 0.85), 1.6, '#5a3018', 0.4, false);
    for (let i = at(b, 0.36); i < at(b, 0.82); i += 3) pen.hair(across(b, i, 4), 0.45, d.ink, 0.3);
    for (const s of [...sutures, 0.3]) pen.stroke(across(b, at(b, s), 4), 1, d.ink, 0.85, false);
    // Each shoulder knob lit on its upper side, shadowed below.
    for (let m = 0; m < KNOBS.n; m++) {
      const p = off(b, at(b, KNOBS.from + ((KNOBS.to - KNOBS.from) * (2 * m + 0.5)) / (2 * KNOBS.n - 1)), 0.8);
      tint(d, oval(p.x + 1.5, p.y + 3, 4.5, 3, 8), '#3a2010', 0.45);
      tint(d, oval(p.x - 1, p.y - 1, 3.5, 2.2, 8), PAPER_FILL, 0.55);
    }
    glint(d, along(b, 0.55, 0.14, 0.6), 2.6, 0.5);
  });
  mottle(d, b.shape, 140, -60, 30, '#3a2010', 0.6);
  shade(d, b.shape, 0.5);
  edge(d, b.shape);
  whelkMouth(d, b);
}

/** A mud whelk's opening: a long cream aperture along the underside running out into the canal's groove, the hole at MOUTH_X. */
function whelkMouth(d: Draw, b: Body): void {
  const { pen } = d;
  const i0 = at(b, 0.46);
  const i1 = at(b, 0.8);
  const lens = (k: number): number => -0.9 + 0.62 * Math.sin((Math.PI * k) / (i1 - i0));
  const inner = [...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i0 + k, lens(k))), ...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i1 - k, -0.92))];
  skin(d, inner, '#efdcbc', 0.85);
  pen.clipped(inner, () => {
    tint(d, oval(b.spine[at(b, 0.6)]!.x, b.spine[at(b, 0.6)]!.y + 18, 18, 8), '#d9925a', 0.35);
    glint(d, along(b, -0.5, 0.48, 0.7), 2, 0.55);
  });
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.55, 0.74, 0.97), 2.4, DARK, 0.8, false);
  const x = MOUTH_X.mudwhelk;
  mouth(d, oval(x, 30, 10, 11, 18).map((p) => pt(p.x + (p.y - 30) * -0.3, p.y)), 1.1);
}
