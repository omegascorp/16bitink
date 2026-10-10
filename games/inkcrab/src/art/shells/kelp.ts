import { add, bezier, closed, contact, type Draw, edge, glint, lerp, mottle, oval, pt, shade, skin, tint } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, leaning, mouth, tilted } from './common';
import { across, along, at, type Body, below, body, off, settle, swell, tangent, whorlAt } from './spire';

/**
 * Fog & Kelp (beach 6): snails of a cold kelp coast, from the rocks, the
 * kelp forest and the deep water off it. Like the other shells they rest on
 * the ground line, apex back, with the opening low on the right at MOUTH_X
 * (see shellArt.ts). Told apart by outline: the black turban a small squat
 * knob, the kelp snail a low glossy bun, Kellet's whelk a long spindle with
 * a crenulated spire, the Oregon triton a shaggy, hairy spindle, the wavy
 * turban a big stepped cone.
 */

/** Mother-of-pearl: a pale rim flushed sea-green and pink. */
function nacre(d: Draw, shape: readonly Pt[], c: Pt, rx: number, ry: number, lean: (p: Pt) => Pt = (p) => p): void {
  skin(d, shape, '#e9e4ec', 0.8);
  d.pen.clipped(shape, () => {
    tint(d, oval(c.x - rx * 0.3, c.y + ry * 0.35, rx * 0.8, ry * 0.5).map(lean), '#bfe0d8', 0.55);
    tint(d, oval(c.x + rx * 0.35, c.y - ry * 0.4, rx * 0.7, ry * 0.45).map(lean), '#f2c4d4', 0.5);
  });
  edge(d, shape, 1.2);
}

// ---------------------------------------------------------------- the shells

/** A black turban (Tegula funebralis): small, squat and rounded, purple-black, its worn apex showing orange and pearl, a pearly mouth with a white tooth on the pillar. */
export function blackturban(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const r = 36;
  const cx = -16;
  const cy = g - r * 0.92 - 1;
  contact(d, cx + 6, r * 1.15);
  // The low spire: a blunt cone of rounded whorls leaning up and back, its worn tip showing orange and pearl.
  const sutures = [0.3, 0.6];
  const spire = body(pt(cx - r * 0.92, cy - r * 1.3), pt(cx - r * 0.08, cy - r * 0.2), (u) => r * 2.1 * Math.pow(u, 0.6) * swell(u, sutures, 0.1) * Math.sqrt(1 - Math.max(0, (u - 0.75) / 0.25) ** 2), 40);
  skin(d, spire.shape, '#2e2236', 0.9);
  pen.clipped(spire.shape, () => {
    tint(d, spire.shape, '#6a4a7a', 0.3);
    for (const v of [-0.6, -0.2, 0.2, 0.6]) pen.hair(along(spire, v, 0.05, 1), 0.5, '#9a86a6', 0.45);
    tint(d, along(spire, 0.9, 0, 0.36).concat(along(spire, -0.9, 0, 0.36).reverse()), '#d08a4a', 0.75);
    tint(d, along(spire, 0.5, 0, 0.22).concat(along(spire, -0.5, 0, 0.22).reverse()), '#f4e6d0', 0.6);
    for (const u of sutures) pen.stroke(across(spire, at(spire, u), 2), 1, d.ink, 0.85, false);
  });
  shade(d, spire.shape, 0.35);
  edge(d, spire.shape, 1.3);
  // The body whorl: a rounded ball, faintly threaded, worn paler on its shoulder.
  const shell = tilted(cx, cy, r * 1.12, r * 0.92, -0.08, 44);
  skin(d, shell, '#2e2236', 0.9);
  pen.clipped(shell, () => {
    tint(d, tilted(cx - r * 0.2, cy - r * 0.3, r * 0.9, r * 0.5, -0.08), '#6a4a7a', 0.4);
    for (let j = 0; j < 9; j++) {
      const v = -0.8 + (1.6 * (j + 0.5)) / 9;
      pen.hair(Array.from({ length: 25 }, (_, i) => {
        const x = -r * 1.2 + (r * 2.4 * i) / 24;
        return pt(cx + x, cy + v * r * 0.92 - r * 0.28 * (1 - (x / r / 1.12) ** 2));
      }), 0.5, '#9a86a6', 0.45);
    }
    tint(d, tilted(cx - r * 0.5, cy - r * 0.62, r * 0.32, r * 0.14, -0.4), '#c08a6a', 0.45);
    glint(d, bezier(pt(cx - r * 0.85, cy - r * 0.05), pt(cx - r * 0.7, cy - r * 0.7), pt(cx - r * 0.05, cy - r * 0.86), 10), 2.2, 0.45);
  });
  shade(d, shell, 0.4);
  edge(d, shell, 1.7);
  // A pearly mouth, the white pillar running down its back with a tooth at its foot.
  const x = MOUTH_X.blackturban;
  const my = cy + r * 0.38;
  const lean = leaning(cy, -0.15);
  const rim = oval(x + 1, my, r * 0.4, r * 0.5, 24).map(lean);
  nacre(d, rim, pt(x + 1, my), r * 0.4, r * 0.5, lean);
  mouth(d, oval(x + 2, my + 1, r * 0.28, r * 0.38, 18).map(lean), 1.1);
  const pillar = bezier(pt(x - r * 0.24, my - r * 0.3), pt(x - r * 0.34, my + r * 0.1), pt(x - r * 0.12, my + r * 0.38), 8).map(lean);
  pen.stroke(pillar, 3.2, '#f2eee8', 0.95, false);
  pen.fill(oval(lean(pt(x - r * 0.14, my + r * 0.3)).x, lean(pt(x - r * 0.14, my + r * 0.3)).y, 2.6, 2, 8), '#fbf8f2', 1);
}

/** A kelp snail (Norrisia norrisii): a low, smooth, glossy bun of a turban, chestnut red-brown, an orange-red lip and a blue-green navel. */
export function kelpsnail(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const rx = 50;
  const ry = 32;
  const cx = -16;
  const cy = g - ry - 1;
  contact(d, cx + 6, rx * 1.05);
  // The spire: barely raised, a flattened dome at the back.
  const cap = tilted(cx - rx * 0.36, cy - ry * 0.8, rx * 0.5, ry * 0.3, -0.2, 28);
  skin(d, cap, '#9a4a28', 0.85);
  pen.clipped(cap, () => {
    pen.hair(closed(tilted(cx - rx * 0.44, cy - ry * 0.98, rx * 0.18, ry * 0.12, -0.22, 14)), 0.7, d.ink, 0.7);
    tint(d, tilted(cx - rx * 0.46, cy - ry * 1.0, rx * 0.12, ry * 0.08, -0.22), '#e0b080', 0.5);
  });
  edge(d, cap, 1.2);
  const shell = oval(cx, cy, rx, ry, 48);
  skin(d, shell, '#8a3a1c', 0.88);
  pen.clipped(shell, () => {
    // Warmer chestnut on the crown, a darker band low down, faint growth lines sweeping back, and a high polish.
    tint(d, oval(cx - rx * 0.2, cy - ry * 0.5, rx * 0.85, ry * 0.5), '#b8602e', 0.45);
    tint(d, oval(cx + rx * 0.1, cy + ry * 0.75, rx * 0.95, ry * 0.4), '#4a1e10', 0.35);
    for (let i = 0; i < 11; i++) {
      const x = cx - rx * 0.7 + (i / 10) * rx * 1.5;
      pen.hair(bezier(pt(x - 6, cy - ry), pt(x + 4, cy), pt(x - 2, cy + ry), 8), 0.45, '#3a160a', 0.2);
    }
    pen.hair(bezier(pt(cx - rx * 0.78, cy - ry * 0.42), pt(cx - rx * 0.3, cy - ry * 0.78), pt(cx + rx * 0.2, cy - ry * 0.84), 12), 0.6, '#3a160a', 0.5);
    glint(d, bezier(pt(cx - rx * 0.86, cy - ry * 0.05), pt(cx - rx * 0.7, cy - ry * 0.9), pt(cx + rx * 0.05, cy - ry * 0.92), 12), 3.4, 0.85);
    glint(d, bezier(pt(cx - rx * 0.1, cy - ry * 0.55), pt(cx + rx * 0.35, cy - ry * 0.62), pt(cx + rx * 0.62, cy - ry * 0.4), 8), 1.6, 0.6);
    pen.fill(oval(cx - rx * 0.56, cy - ry * 0.48, 3, 2.2, 8), PAPER_FILL, 0.95);
  });
  mottle(d, shell, 60, cy - ry, cy + ry * 0.2, '#3a160a', 0.45);
  shade(d, shell, 0.45);
  edge(d, shell, 1.7);
  // The navel: a deep pit in a blue-green callus, tucked in under the mouth's back edge.
  const x = MOUTH_X.kelpsnail;
  const my = cy + ry * 0.22;
  const lean = leaning(cy, -0.12);
  const navel = tilted(x - 17, g - 9, 10, 6.5, -0.3, 18);
  skin(d, navel, '#2f8a82', 0.85);
  pen.clipped(navel, () => tint(d, tilted(x - 19, g - 11, 6, 3, -0.3), '#9ad6c8', 0.6));
  edge(d, navel, 1.1);
  pen.stroke(bezier(pt(x - 22, g - 9), pt(x - 17, g - 5), pt(x - 12, g - 8), 6), 2.6, DARK, 0.9, false);
  // An orange-red lip round a pearly round mouth.
  const lip = oval(x + 1, my, 15, 18, 24).map(lean);
  skin(d, lip, '#d4502a', 0.85);
  edge(d, lip, 1.3);
  const pearl = oval(x + 1, my + 1, 12, 15, 22).map(lean);
  nacre(d, pearl, pt(x + 1, my + 1), 12, 15, lean);
  mouth(d, oval(x + 2, my + 2, 9, 12, 18).map(lean), 1.1);
}

/** Kellet's whelk (Kelletia kelletii): heavy and spindle-shaped, a tall spire with a row of strong knobs on each whorl's shoulder, chalky white-tan threaded with brown, a white mouth and an open canal. */
export function kellets(d: Draw): void {
  const { pen } = d;
  contact(d, -20, 70);
  const W = 70;
  const sutures = [0.07, 0.14, 0.215, 0.295, 0.38];
  const SHOULDER = 0.445;
  const w = (u: number): number => {
    if (u < 0.38) return W * 0.56 * Math.pow(u / 0.38, 0.95) * swell(u, sutures, 0.08);
    if (u < 0.46) return W * (0.56 + 0.44 * Math.sin((((u - 0.38) / 0.08) * Math.PI) / 2));
    if (u < 0.8) return W * (0.16 + 0.84 * Math.pow(Math.cos((((u - 0.46) / 0.34) * Math.PI) / 2), 0.85));
    return W * 0.16 * (1 - 0.45 * ((u - 0.8) / 0.2));
  };
  // Each spire whorl's shoulder (low on it, just above the next suture) and the body whorl's stand out in knobs.
  const knob = (u: number): number => {
    if (u < 0.38) {
      const { t } = whorlAt(u, sutures, 0.38);
      return (0.6 + 9 * u) * Math.exp(-(((t - 0.66) / 0.17) ** 2));
    }
    return 3.5 * Math.exp(-(((u - SHOULDER) / 0.035) ** 2));
  };
  const b = settle((dy) => body(pt(-112, -40 + dy), pt(70, 26 + dy), w, 120, knob), d.g);
  // Where each row of knobs runs across the shell.
  const rows = [...sutures.map((s, k) => (k === 0 ? s * 0.66 : sutures[k - 1]! + (s - sutures[k - 1]!) * 0.66)), SHOULDER];
  skin(d, b.shape, '#e9dfca', 0.75);
  pen.clipped(b.shape, () => {
    tint(d, along(b, 0.4, 0.42, 0.75).concat(along(b, -0.2, 0.42, 0.75).reverse()), '#c9a87a', 0.3);
    // Fine brown spiral threads, a few bolder.
    for (let v = -0.92; v < 0.95; v += 0.1) pen.hair(along(b, v, 0.02, 0.97), 0.5, '#7a5634', 0.45);
    for (const v of [0.7, 0.3, -0.1, -0.5]) pen.stroke(along(b, v, 0.4, 0.85), 1.4, '#8a5a34', 0.4, false);
    for (let i = at(b, 0.46); i < at(b, 0.8); i += 5) pen.hair(across(b, i, 4), 0.45, d.ink, 0.18);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.1, d.ink, 0.9, false);
    // The knobs: blunt and axially drawn out, lit above, shadowed below.
    rows.forEach((u, k) => {
      const i = at(b, u);
      const big = k === rows.length - 1;
      const n = big ? 6 : 4;
      for (let j = 0; j < n; j++) {
        const v = -0.85 + (1.7 * (j + 0.5)) / n;
        const p = off(b, i, v);
        const t = tangent(b, i);
        const s = big ? 4.2 : 1.4 + 6 * u;
        const len = s * 1.5;
        const ang = Math.atan2(t.y, t.x);
        tint(d, tilted(p.x + 1.4, p.y + 1.8, len, s * 0.75, ang, 10), '#5a3a20', 0.45);
        tint(d, tilted(p.x - 0.6, p.y - 0.8, len * 0.8, s * 0.5, ang, 10), PAPER_FILL, 0.8);
      }
    });
    glint(d, along(b, 0.58, 0.14, 0.7), 2.2, 0.5);
  });
  mottle(d, b.shape, 90, -50, 40, '#6a4a2a', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  whelkMouth(d, b, MOUTH_X.kellets, [0.5, 0.8], '#f6f0e4', '#e6c8a0');
}

/** A whelk's or triton's opening: a long pale aperture along the underside running out into the canal's groove, toothed along its lip, the hole at `x`. */
function whelkMouth(d: Draw, b: Body, x: number, [u0, u1]: readonly [number, number], wash: string, throat: string): void {
  const { pen } = d;
  const i0 = at(b, u0);
  const i1 = at(b, u1);
  const lens = (k: number): number => -0.92 + 0.62 * Math.sin((Math.PI * k) / (i1 - i0));
  const inner = [...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i0 + k, lens(k))), ...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i1 - k, -0.94))];
  skin(d, inner, wash, 0.9);
  pen.clipped(inner, () => {
    tint(d, oval(x + 4, below(b, x) - 8, 18, 7), throat, 0.4);
    glint(d, along(b, -0.5, u0 + 0.02, u0 + (u1 - u0) * 0.6), 2, 0.6);
  });
  edge(d, inner, 1.1);
  // Little teeth inside the outer lip.
  for (let k = 3; k < i1 - i0 - 2; k += 3) pen.hair([off(b, i0 + k, -0.94), off(b, i0 + k, -0.86)], 0.9, d.ink, 0.6);
  pen.stroke(along(b, -0.55, u1 - 0.04, 0.98), 2.4, DARK, 0.8, false);
  const my = below(b, x) - 9;
  mouth(d, oval(x, my, 10, 7.5, 18).map(leaning(my, -0.3)), 1.1);
}

/** An Oregon triton (Fusitriton oregonensis): a tall spindle of round, deep-sutured whorls, cross-ribbed under a shaggy brown skin of bristles that stand out round its outline, a white mouth. */
export function oregontriton(d: Draw): void {
  const { pen } = d;
  contact(d, -22, 66);
  const W = 78;
  const sutures = [0.07, 0.14, 0.22, 0.31, 0.41, 0.52];
  const w = (u: number): number => {
    if (u < 0.52) return W * 0.7 * Math.pow(u / 0.52, 0.9) * swell(u, sutures, 0.24);
    if (u < 0.58) return W * (0.7 + 0.3 * Math.sin((((u - 0.52) / 0.06) * Math.PI) / 2));
    if (u < 0.85) return W * (0.17 + 0.83 * Math.pow(Math.cos((((u - 0.58) / 0.27) * Math.PI) / 2), 0.75));
    return W * 0.17 * (1 - 0.35 * ((u - 0.85) / 0.15));
  };
  const b = settle((dy) => body(pt(-100, -58 + dy), pt(52, 32 + dy), w, 110), d.g);
  // The bristles first, so the shell's outline cuts across their roots.
  const hairs = (side: Pt[], down: boolean): void => {
    for (let i = at(b, 0.03); i < at(b, 0.92); i++) {
      const p = side[i]!;
      if (down && p.y > d.g - 4) continue;
      const q = b.spine[i]!;
      const l = Math.hypot(p.x - q.x, p.y - q.y) || 1;
      const t = tangent(b, i);
      const len = 2.5 + pen.rng() * 3 + 4 * (i / b.n);
      const tip = add(p, pt(((p.x - q.x) / l) * len - t.x * len * 0.6, ((p.y - q.y) / l) * len - t.y * len * 0.6));
      pen.hair([add(p, pt(((q.x - p.x) / l) * 2, ((q.y - p.y) / l) * 2)), tip], 0.7, '#4a3018', 0.8);
    }
  };
  hairs(b.top, false);
  hairs(b.bot, true);
  skin(d, b.shape, '#d8c29c', 0.7);
  pen.clipped(b.shape, () => {
    // The periostracum: a brown skin over everything, worn thin on the crests.
    tint(d, b.shape, '#7a5630', 0.5);
    // Axial ribs crossed by spiral cords: a coarse lattice.
    for (let i = 2; i < at(b, 0.8); i += 2) {
      const rib = across(b, i, 4);
      pen.stroke(rib.map((p) => add(p, pt(0.8, 1.2))), 1.4, '#3a2410', 0.4, false);
      pen.hair(rib, 1, '#e2cca4', 0.4);
    }
    for (let v = -0.84; v < 0.9; v += 0.21) pen.stroke(along(b, v, 0.02, 0.86), 1.2, '#4a2e14', 0.5, false);
    // Rows of short bristles over the face, raked back.
    for (let i = 3; i < at(b, 0.86); i += 2) {
      const t = tangent(b, i);
      for (let v = -0.8; v < 0.85; v += 0.21) {
        const p = off(b, i, v + (pen.rng() - 0.5) * 0.08);
        const len = 2 + pen.rng() * 2.5;
        pen.hair([p, add(p, pt(-t.x * len + t.y * len * 0.4, -t.y * len - t.x * len * 0.4))], 0.55, '#2e1c0c', 0.6);
      }
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 4), 1.4, d.ink, 0.95, false);
    glint(d, along(b, 0.55, 0.12, 0.7), 1.8, 0.35);
  });
  mottle(d, b.shape, 120, -60, 40, '#2e1c0c', 0.55);
  shade(d, b.shape, 0.5);
  edge(d, b.shape, 1.6);
  whelkMouth(d, b, MOUTH_X.oregontriton, [0.55, 0.84], '#f7f3ea', '#d8ccb8');
}

/** A wavy turban (Megastraea undosa): big and heavy, a broad stepped cone, each whorl ribbed with wavy oblique folds out to a wavy keel, under a tan-brown skin, a pearly mouth on its flat base. */
export function wavyturban(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -6, 70);
  // The axis leans up and back; the cone rests on the low rim of its base, the base facing down and forward.
  const ax = pt(-0.72, -0.69);
  const side = pt(0.69, -0.72);
  const R = 62;
  const FACE = 15;
  const base = pt(24, g - R * 0.72 - 4);
  const L = 102;
  const apex = add(base, pt(ax.x * L, ax.y * L));
  const tilt = Math.atan2(side.y, side.x);
  // Whorls between sutures (fractions of the way from apex to base): each slopes out to a keel just above the next.
  const SUTURES = [0.2, 0.36, 0.54, 0.75];
  const half = (u: number): number => {
    const { t } = whorlAt(u, SUTURES, 1);
    return R * Math.pow(u, 0.9) * (0.86 + 0.14 * Math.pow(t, 1.4));
  };
  const N = 80;
  // Ending a little short of the base, so the face covers the cone's end.
  const rim = (s: number): Pt[] => Array.from({ length: N + 1 }, (_, i) => {
    const u = (i / N) * 0.96;
    const h = half(u);
    return add(lerp(apex, base, u), pt(side.x * h * s, side.y * h * s));
  });
  const cone = [...rim(-1), ...rim(1).reverse()];
  // A line round the cone at `u`, bowed towards the base, with `wave` folds along it.
  const ring = (u: number, wave = 0, n = 24): Pt[] => {
    const h = half(u);
    return Array.from({ length: n + 1 }, (_, i) => {
      const f = -1 + (2 * i) / n;
      const bow = 6 * u * Math.sqrt(1 - f * f) + wave * Math.sin(i * 1.6);
      return add(lerp(apex, base, u), pt(side.x * h * f - ax.x * bow, side.y * h * f - ax.y * bow));
    });
  };
  skin(d, cone, '#a8845a', 0.75);
  pen.clipped(cone, () => {
    // The worn apex, paler and pearly; brown patches of skin.
    tint(d, oval(apex.x + 8, apex.y + 10, 14, 12), '#e6dccc', 0.6);
    for (let i = 0; i < 10; i++) {
      const u = 0.3 + pen.rng() * 0.7;
      const p = add(lerp(apex, base, u), pt(side.x * half(u) * (pen.rng() * 1.6 - 0.8), side.y * half(u) * (pen.rng() * 1.6 - 0.8)));
      tint(d, tilted(p.x, p.y, 6 + pen.rng() * 8, 3 + pen.rng() * 4, tilt), '#6a4626', 0.35);
    }
    // Oblique wavy folds across each whorl, from its suture out to the keel, lit on one side.
    const starts = [0.04, ...SUTURES];
    starts.forEach((s0, k) => {
      const s1 = k < SUTURES.length ? SUTURES[k]! : 0.99;
      const folds = 5 + k * 2;
      for (let j = 0; j < folds; j++) {
        const f0 = -0.95 + (1.9 * (j + 0.3)) / folds;
        const f1 = f0 + 0.18;
        const a = ring(s0 + 0.01)[Math.round(((f0 + 1) / 2) * 24)]!;
        const z = ring(s1 - 0.02)[Math.min(24, Math.round(((f1 + 1) / 2) * 24))]!;
        const m = add(lerp(a, z, 0.5), pt(side.x * 2, side.y * 2));
        const fold = bezier(a, m, z, 8);
        pen.stroke(fold.map((p) => add(p, pt(1.2, 1.4))), 2.2, '#4a2e16', 0.45, false);
        pen.stroke(fold, 1.8, '#e2cfaa', 0.6, false);
      }
      // The keel: a wavy ridge just above the next suture, then the suture tucked under it.
      pen.stroke(ring(s1 - 0.02, 1.4), 2.4, '#e8d8b8', 0.7, false);
      pen.stroke(ring(s1 - 0.005, 1.4), 1.1, d.ink, 0.85, false);
    });
    glint(d, [lerp(apex, add(base, pt(-side.x * R, -side.y * R)), 0.15), lerp(apex, add(base, pt(-side.x * R, -side.y * R)), 0.85)].map((p) => add(p, pt(side.x * 6, side.y * 6))), 2.2, 0.5);
  });
  mottle(d, cone, 120, -70, 30, '#4a2e16', 0.55);
  shade(d, cone, 0.5);
  edge(d, cone, 1.8);
  // The flat base, ringed with spiral cords, and the pearly mouth near its low rim.
  const face = tilted(base.x, base.y, R, FACE, tilt, 40);
  skin(d, face, '#cdb48c', 0.8);
  pen.clipped(face, () => {
    for (const k of [0.3, 0.48, 0.66, 0.84]) pen.hair(closed(tilted(base.x + 3, base.y + 2, R * k, FACE * k, tilt, 28)), 0.6, '#5a3a1e', 0.5);
  });
  edge(d, face, 1.4);
  const x = MOUTH_X.wavyturban;
  const my = base.y + ((x - base.x) / side.x) * side.y + 4;
  const pearl = tilted(x + 2, my - 1, 20, 12, tilt, 24);
  nacre(d, pearl, pt(x + 2, my - 1), 20, 12);
  mouth(d, tilted(x, my, 14, 8, tilt, 18), 1.2);
}
