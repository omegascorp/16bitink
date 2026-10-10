import { add, bezier, contact, type Draw, edge, glint, lerp, mottle, normals, oval, pt, shade, skin, tint } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, leaning, mouth, tilted } from './common';
import { across, along, at, type Body, below, body, off, settle, swell, tangent, whorlAt } from './spire';

/**
 * Wreck Cove (beach 7): what a Gulf shelling beach throws up by the wreck.
 * Like the other shells they rest on the ground line, apex back, with the
 * opening low on the right at MOUTH_X (see shellArt.ts). Told apart by
 * outline: the nassa a small beaded cone, the fig shell a bulb trailing a
 * long tail, the tulip a smooth banded spindle, the lightning whelk a
 * knobbed pear (left-handed, see lightningwhelk), the horse conch a huge
 * many-whorled spindle.
 *
 * Spiral marks (sutures, cords, bands) run across these lying shells and
 * axial ones (ribs, streaks) along them, as on a real shell seen side-on.
 */

/** A long opening along the underside from u0 to u1, its inner edge bowed `depth` of the way up into the body. */
function aperture(d: Draw, b: Body, [u0, u1]: readonly [number, number], depth: number, wash: string): Pt[] {
  const i0 = at(b, u0);
  const i1 = at(b, u1);
  const lens = (k: number): number => -0.93 + depth * Math.sin((Math.PI * k) / (i1 - i0));
  const inner = [...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i0 + k, lens(k))), ...Array.from({ length: i1 - i0 + 1 }, (_, k) => off(b, i1 - k, -0.95))];
  skin(d, inner, wash, 0.9);
  return inner;
}

/** The hole the crab comes out of, at `x` just above the underside. */
function hole(d: Draw, b: Body, x: number, rx: number, ry: number, lift = 9): void {
  const my = below(b, x) - lift;
  mouth(d, oval(x, my, rx, ry, 18).map(leaning(my, -0.3)), 1.1);
}

/** Raised spiral cords across the shell from u0 to u1, every `step` spine points: lit on top, inked below. */
function cords(d: Draw, b: Body, u0: number, u1: number, step: number, dark: string, alpha: number): void {
  for (let i = at(b, u0); i <= at(b, u1); i += step) {
    const c = across(b, i, 4);
    d.pen.stroke(c.map((p) => add(p, pt(0.9, 1.1))), 1.1, dark, alpha, false);
    d.pen.hair(c, 0.9, PAPER_FILL, alpha);
  }
}

// ---------------------------------------------------------------- the shells

/** A nassa (Nassarius vibex): small and stubby, a pointed spire of beaded whorls latticed all over, grey-brown with a darker band, a glossy cream callus spread over its underside and a thick toothed lip. */
export function nassa(d: Draw): void {
  const { pen } = d;
  contact(d, -24, 58);
  const W = 86;
  const sutures = [0.13, 0.25, 0.37, 0.5];
  const w = (u: number): number => {
    if (u < 0.5) return W * 0.72 * Math.pow(u / 0.5, 0.95) * swell(u, sutures, 0.16);
    const t = (u - 0.5) / 0.5;
    if (t < 0.25) return W * (0.72 + 0.28 * Math.sin(((t / 0.25) * Math.PI) / 2));
    return W * (0.22 + 0.78 * Math.sqrt(Math.max(0, 1 - ((t - 0.25) / 0.75) ** 2)));
  };
  // Beads stand out of the outline where each spiral cord crosses a rib: two to a spire whorl, four on the body whorl.
  const beads = (u: number): number => {
    if (u > 0.92) return 0;
    const { k, t } = whorlAt(u, sutures, 0.92);
    return (0.8 + 2.8 * u) * Math.pow(Math.abs(Math.sin(t * Math.PI * (k < 0 ? 4 : 2))), 0.7);
  };
  const b = settle((dy) => body(pt(-100, -50 + dy), pt(42, 18 + dy), w, 84, beads), d.g);
  skin(d, b.shape, '#a39282', 0.75);
  pen.clipped(b.shape, () => {
    // A darker brown band round the body whorl, and the worn, paler tip.
    tint(d, [...across(b, at(b, 0.6), 4), ...across(b, at(b, 0.72), 4).reverse()], '#5e4636', 0.45);
    tint(d, along(b, 0.9, 0, 0.12).concat(along(b, -0.9, 0, 0.12).reverse()), '#e2d6c4', 0.6);
    // The lattice: axial ribs along each whorl crossed by spiral cords, beaded where they meet.
    const RIBS = Array.from({ length: 8 }, (_, j) => Math.sin(-1.2 + (j * 2.4) / 7));
    for (let k = 0; k <= sutures.length; k++) {
      const s0 = k === 0 ? 0.03 : sutures[k - 1]!;
      const s1 = k < sutures.length ? sutures[k]! : 0.9;
      const rows = k < sutures.length ? 2 : 4;
      for (const v of RIBS) pen.hair(along(b, v, s0 + 0.01, s1 - 0.01), 0.7, '#4a3a2e', 0.4);
      for (let r = 0; r < rows; r++) {
        const i = at(b, s0 + ((s1 - s0) * (r + 0.5)) / rows);
        pen.hair(across(b, i, 3), 0.6, '#4a3a2e', 0.35);
        for (const v of RIBS) {
          const p = off(b, i, v);
          const s = 1.3 + 2.6 * (i / b.n);
          tint(d, oval(p.x + s * 0.35, p.y + s * 0.45, s * 1.1, s * 0.9, 8), '#3a2c22', 0.5);
          tint(d, oval(p.x - s * 0.25, p.y - s * 0.3, s * 0.75, s * 0.6, 8), '#efe6da', 0.85);
        }
      }
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.1, d.ink, 0.9, false);
    glint(d, along(b, 0.58, 0.2, 0.8), 1.6, 0.4);
  });
  mottle(d, b.shape, 90, -50, 40, '#3a2c22', 0.5);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.6);
  // The callus: a glossy cream shield spread back over the underside from the mouth.
  const x = MOUTH_X.nassa;
  const my = below(b, x) - 14;
  const a = Math.atan2(b.spine[b.n]!.y - b.spine[0]!.y, b.spine[b.n]!.x - b.spine[0]!.x);
  const callus = tilted(x - 16, my + 4, 26, 12, a, 26);
  pen.clipped(b.shape, () => {
    skin(d, callus, '#efe4cc', 0.9);
    pen.clipped(callus, () => glint(d, bezier(pt(x - 34, my), pt(x - 18, my - 6), pt(x - 2, my - 4), 8), 2.2, 0.8));
    edge(d, callus, 1.1);
  });
  // The thick outer lip round the front of the mouth, toothed inside, and the short notch of the canal.
  const lean = leaning(my, -0.25);
  const lip = oval(x + 3, my, 11, 12, 24).map(lean);
  skin(d, lip, '#f4ecdc', 0.9);
  pen.clipped(lip, () => glint(d, bezier(pt(x + 6, my - 10), pt(x + 15, my - 4), pt(x + 10, my + 9), 8), 1.8, 0.7));
  edge(d, lip, 1.4);
  pen.stroke(bezier(lean(pt(x + 6, my + 8)), lean(pt(x + 12, my + 12)), lean(pt(x + 18, my + 10)), 6), 2.4, DARK, 0.85, false);
  mouth(d, oval(x, my, 7, 9, 16).map(lean), 1.1);
  for (let k = 0; k < 4; k++) {
    const p = lean(pt(x + 6.5, my - 5 + k * 3.6));
    pen.fill(oval(p.x, p.y, 1.6, 1.1, 6), '#f8f2e6', 1);
  }
}

/** A fig shell (Ficus communis): thin and fig-shaped, a round bulb with a spire barely raised at its back, tapering to a long tail of a canal, finely latticed, pale pinkish-tan flushed lilac, the long opening violet-brown inside. */
export function figshell(d: Draw): void {
  const { pen } = d;
  contact(d, -30, 76);
  const W = 104;
  const w = (u: number): number => {
    // The spire: a tiny low nub, then the body whorl steps out round it.
    if (u < 0.3) return W * (Math.sqrt(Math.max(0, 1 - ((0.3 - u) / 0.3) ** 2)) + 0.1 * Math.exp(-((u / 0.02) ** 2)));
    return W * (0.06 + 0.94 * Math.pow(Math.cos((((u - 0.3) / 0.7) * Math.PI) / 2), 2.1));
  };
  const b = settle((dy) => body(pt(-108, -22 + dy), pt(108, 34 + dy), w, 120), d.g);
  skin(d, b.shape, '#e6c6b0', 0.7);
  pen.clipped(b.shape, () => {
    tint(d, oval(b.spine[at(b, 0.24)]!.x - 6, b.spine[at(b, 0.24)]!.y - 20, 38, 22), '#c9b2d0', 0.4);
    tint(d, along(b, -0.2, 0.4, 0.9).concat(along(b, 0.5, 0.4, 0.9).reverse()), '#d8b2a6', 0.3);
    // Fine spiral cords across the whole shell, every few a stronger one dotted brown; finer axial threads along it.
    for (let i = at(b, 0.05); i < b.n - 1; i += 2) {
      const strong = i % 6 === 0;
      pen.hair(across(b, i, 3), strong ? 0.8 : 0.45, '#7a5a52', strong ? 0.5 : 0.35);
      if (strong) {
        for (let v = -0.75; v < 0.8; v += 0.3) {
          const p = lerp(off(b, i, v), off(b, i, v + 0.01), 0.5);
          tint(d, oval(p.x, p.y, 1.6, 1.2, 6), '#8a5a3a', 0.45);
        }
      }
    }
    for (let v = -0.9; v < 0.92; v += 0.09) pen.hair(along(b, v, 0.05, 0.98), 0.35, '#7a5a52', 0.22);
    // The barely raised spire, its one suture where the body whorl laps round it.
    pen.stroke(across(b, at(b, 0.03), 2), 1.1, d.ink, 0.85, false);
    pen.stroke(across(b, at(b, 0.012), 1), 0.8, d.ink, 0.6, false);
    glint(d, along(b, 0.6, 0.1, 0.62), 2.6, 0.55);
    glint(d, along(b, 0.45, 0.6, 0.9), 1.4, 0.4);
  });
  mottle(d, b.shape, 60, -40, 30, '#7a5a52', 0.4);
  shade(d, b.shape, 0.42);
  edge(d, b.shape, 1.5);
  // The opening runs almost the whole length of the underside: violet-brown in the throat, a thin lip.
  const inner = aperture(d, b, [0.2, 0.98], 0.62, '#b48aa0');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.55, 0.3, 0.7).concat(along(b, -0.85, 0.3, 0.7).reverse()), '#6a3e58', 0.45);
    for (let i = at(b, 0.24); i < at(b, 0.9); i += 4) pen.hair(across(b, i, 2), 0.5, '#f0dce4', 0.4);
    glint(d, along(b, -0.62, 0.3, 0.6), 1.8, 0.55);
  });
  edge(d, inner, 1);
  hole(d, b, MOUTH_X.figshell, 11, 7, 8);
}

/** A banded tulip (Cinctura hunteria): a smooth glossy spindle, a tallish spire and a long canal, cream with fine dark spiral lines over soft blue-grey and tan flames, a pale mouth. */
export function tulip(d: Draw): void {
  const { pen } = d;
  contact(d, -18, 66);
  const W = 78;
  const sutures = [0.06, 0.12, 0.185, 0.255, 0.33, 0.41];
  const w = (u: number): number => {
    if (u < 0.44) return W * 0.68 * Math.pow(u / 0.44, 0.8) * swell(u, sutures, 0.1);
    if (u < 0.54) return W * (0.68 + 0.32 * Math.sin((((u - 0.44) / 0.1) * Math.PI) / 2));
    if (u < 0.82) return W * (0.15 + 0.85 * Math.pow(Math.cos((((u - 0.54) / 0.28) * Math.PI) / 2), 0.9));
    return W * 0.15 * (1 - 0.45 * ((u - 0.82) / 0.18));
  };
  const b = settle((dy) => body(pt(-114, -38 + dy), pt(82, 24 + dy), w, 120), d.g);
  skin(d, b.shape, '#efe4cc', 0.75);
  pen.clipped(b.shape, () => {
    // Soft flames: irregular blue-grey and tan streaks running along the whorls.
    for (let k = 0; k < 16; k++) {
      const u0 = 0.06 + pen.rng() * 0.74;
      const len = 0.05 + pen.rng() * 0.12;
      const v = -0.8 + pen.rng() * 1.6;
      const wv = 0.12 + pen.rng() * 0.18;
      const blob = along(b, v + wv, u0, u0 + len).concat(along(b, v - wv, u0 + len * 0.15, u0 + len * 0.85).reverse());
      if (blob.length > 3) tint(d, blob, k % 3 === 0 ? '#c69a6a' : '#8a9cae', 0.35 + pen.rng() * 0.2);
    }
    // The fine dark spiral lines, two to each spire whorl and evenly spaced down the body and canal.
    const LINES = [...sutures.flatMap((s, k) => {
      const s0 = k === 0 ? 0 : sutures[k - 1]!;
      return k === 0 ? [] : [s0 + (s - s0) * 0.35, s0 + (s - s0) * 0.7];
    }), 0.44, 0.475, 0.51, 0.545, 0.58, 0.615, 0.65, 0.685, 0.72, 0.76, 0.8, 0.85, 0.9];
    for (const u of LINES) pen.stroke(across(b, at(b, u), 3), 0.9, '#3a2418', 0.75, false);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1, d.ink, 0.8, false);
    // High gloss.
    glint(d, along(b, 0.6, 0.12, 0.74), 2.6, 0.75);
    glint(d, along(b, 0.4, 0.48, 0.66), 1.4, 0.5);
  });
  mottle(d, b.shape, 40, -50, 30, '#5a4a3a', 0.4);
  shade(d, b.shape, 0.42);
  edge(d, b.shape, 1.6);
  // The opening: creamy, its lines showing through, running out into the canal's groove.
  const inner = aperture(d, b, [0.5, 0.82], 0.6, '#f6eedc');
  pen.clipped(inner, () => {
    for (let i = at(b, 0.52); i < at(b, 0.8); i += 4) pen.hair(across(b, i, 2), 0.5, '#9a7a5a', 0.4);
    glint(d, along(b, -0.55, 0.52, 0.7), 2, 0.6);
  });
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.55, 0.78, 0.98), 2.2, DARK, 0.75, false);
  hole(d, b, MOUTH_X.tulip, 10, 7.5);
}

/**
 * A spiral line across a left-handed shell at `u`: it climbs towards the
 * front, its top end `lean` spine points ahead and its bottom end as far
 * behind. Lying apex back with the opening under it facing out, as every
 * shell here does, a left-handed shell's coil runs this way.
 */
function sinistral(b: Body, u: number, lean: number, bow: number): Pt[] {
  const i = at(b, u);
  const t = tangent(b, i);
  const clamp = (k: number): number => Math.min(b.n, Math.max(0, k));
  return bezier(b.bot[clamp(i - lean)]!, add(b.spine[i]!, pt(t.x * bow, t.y * bow)), b.top[clamp(i + lean)]!, 10);
}

/**
 * A lightning whelk (Sinistrofulgur sinistrum): a big pear, left-handed, a
 * low knobbed spire, a shoulder crowned with knobs and a long canal, cream
 * with brown wavy lightning streaks running down the whorls, a pale
 * apricot mouth. Its sutures, shoulder and the rows of knobs lean the
 * left-handed way (see sinistral) where other whelks' sit square.
 */
export function lightningwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -18, 70);
  const W = 94;
  const sutures = [0.055, 0.11, 0.165, 0.225];
  const SHOULDER = 0.285;
  const w = (u: number): number => {
    if (u < 0.225) return W * 0.5 * Math.pow(u / 0.225, 0.9) * swell(u, sutures, 0.08);
    if (u < 0.3) return W * (0.5 + 0.5 * Math.sin((((u - 0.225) / 0.075) * Math.PI) / 2));
    return W * (0.09 + 0.91 * Math.pow(Math.cos((((u - 0.3) / 0.7) * Math.PI) / 2), 1.7));
  };
  // A low nub on each spire whorl, round both outlines.
  const nub = (u: number): number => {
    if (u >= 0.225) return 0;
    const { t } = whorlAt(u, sutures, 0.225);
    return (0.3 + 7 * u) * Math.exp(-(((t - 0.62) / 0.16) ** 2));
  };
  const plain = settle((dy) => body(pt(-108, -26 + dy), pt(84, 30 + dy), w, 120, nub), d.g);
  // The crown: triangular points along the top of the shoulder, dwindling forward (the ones on its far side, seen past the near one).
  const crown = (u: number): number => (u > SHOULDER - 0.03 && u < 0.4 ? 7 * (1 - (u - SHOULDER) * 5) * Math.max(0, Math.sin(((u - SHOULDER + 0.03) / 0.13) * Math.PI * 3)) ** 3 : 0);
  const nrm = normals(plain.spine);
  const top = plain.top.map((p, i) => add(p, pt(nrm[i]!.x * crown(i / plain.n), nrm[i]!.y * crown(i / plain.n))));
  const b: Body = { ...plain, top, shape: [...top, ...[...plain.bot].reverse()] };
  skin(d, b.shape, '#eadcc0', 0.75);
  pen.clipped(b.shape, () => {
    tint(d, along(b, 0.7, 0.3, 0.6).concat(along(b, 0.1, 0.3, 0.6).reverse()), '#d8b88c', 0.3);
    // Lightning: bold brown zigzag streaks running from the shoulder down the body towards the canal, and fine ones on the spire.
    const zig = (v: number, u0: number, u1: number, amp: number, step = 3): Pt[] => {
      const i0 = at(b, u0);
      const i1 = at(b, u1);
      return Array.from({ length: Math.floor((i1 - i0) / step) + 1 }, (_, k) => off(b, i0 + k * step, v + (k % 2 ? amp : -amp) * (0.6 + 0.4 * Math.sin(k * 1.7))));
    };
    for (let v = -0.84; v < 0.9; v += 0.24) {
      const streak = zig(v, SHOULDER + 0.01, 0.8, 0.07);
      pen.stroke(streak, 3.2, '#7a4428', 0.55, false);
      pen.stroke(streak.map((p) => add(p, pt(0, 2.4))), 1.1, '#5a2e1a', 0.4, false);
    }
    for (let k = 1; k < sutures.length; k++) {
      for (const v of [-0.45, 0.15, 0.7]) pen.stroke(zig(v, sutures[k - 1]! + 0.008, sutures[k]! - 0.008, 0.1, 2), 1.1, '#7a4428', 0.5, false);
    }
    // The coil: sutures and the shoulder's ridge leaning the left-handed way, faint growth lines too.
    for (const s of sutures) pen.stroke(sinistral(b, s, Math.round(2 + 36 * s), 3), 1.2, d.ink, 0.9, false);
    const ridge = sinistral(b, SHOULDER, 9, 4);
    pen.stroke(ridge.map((p) => add(p, pt(1.4, 1.6))), 1.6, '#5a3a20', 0.4, false);
    pen.stroke(ridge, 1.4, PAPER_FILL, 0.65, false);
    for (let i = at(b, 0.32); i < at(b, 0.95); i += 6) pen.hair(sinistral(b, i / b.n, 6, 3), 0.45, d.ink, 0.15);
    glint(d, along(b, 0.58, 0.28, 0.7), 2.4, 0.5);
  });
  mottle(d, b.shape, 90, -40, 30, '#6a4a2a', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  // A long apricot-cream opening along the underside, out into the canal's groove.
  const inner = aperture(d, b, [0.34, 0.86], 0.62, '#f2c890');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.6, 0.4, 0.7).concat(along(b, -0.85, 0.4, 0.7).reverse()), '#e8a060', 0.35);
    for (let i = at(b, 0.38); i < at(b, 0.82); i += 5) pen.hair(sinistral(b, i / b.n, 4, 2), 0.5, '#b0703a', 0.35);
    glint(d, along(b, -0.55, 0.38, 0.62), 2, 0.6);
  });
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.55, 0.82, 0.98), 2.4, DARK, 0.8, false);
  hole(d, b, MOUTH_X.lightningwhelk, 11, 8);
}

/** A Florida horse conch (Triplofusus giganteus): the giant, a very tall spindle of many whorls, each with a row of rounded knobs, corded all over, under a chalky grey-tan skin flaking off the orange shell, an orange mouth with folds on its pillar. */
export function horseconch(d: Draw): void {
  const { pen } = d;
  contact(d, -14, 84);
  const W = 86;
  const sutures = [0.04, 0.08, 0.125, 0.17, 0.22, 0.275, 0.335, 0.4, 0.47];
  const SHOULDER = 0.52;
  const w = (u: number): number => {
    if (u < 0.47) return W * 0.64 * Math.pow(u / 0.47, 0.92) * swell(u, sutures, 0.2);
    if (u < 0.55) return W * (0.64 + 0.36 * Math.sin((((u - 0.47) / 0.08) * Math.PI) / 2));
    if (u < 0.84) return W * (0.15 + 0.85 * Math.pow(Math.cos((((u - 0.55) / 0.29) * Math.PI) / 2), 0.85));
    return W * 0.15 * (1 - 0.4 * ((u - 0.84) / 0.16));
  };
  // A row of rounded knobs round the middle of every whorl, biggest on the body whorl's shoulder.
  const knob = (u: number): number => {
    if (u < 0.47) {
      const { t } = whorlAt(u, sutures, 0.47);
      return (0.5 + 9 * u) * Math.exp(-(((t - 0.58) / 0.2) ** 2));
    }
    return 6 * Math.exp(-(((u - SHOULDER) / 0.04) ** 2));
  };
  const b = settle((dy) => body(pt(-124, -66 + dy), pt(104, 30 + dy), w, 140, knob), d.g);
  // Where each row of knobs runs across the shell.
  const rows = [...sutures.slice(1).map((s, k) => sutures[k]! + (s - sutures[k]!) * 0.58), SHOULDER];
  skin(d, b.shape, '#b4a890', 0.8);
  pen.clipped(b.shape, () => {
    // The orange shell showing through: the worn spire tip, flakes where the skin has peeled, the knobs' crests.
    tint(d, along(b, 0.95, 0, 0.12).concat(along(b, -0.95, 0, 0.12).reverse()), '#e2843e', 0.8);
    for (let k = 0; k < 14; k++) {
      const p = off(b, at(b, 0.12 + pen.rng() * 0.72), pen.rng() * 1.6 - 0.8);
      const flake = tilted(p.x, p.y, 4 + pen.rng() * 9, 2.5 + pen.rng() * 4, pen.rng() * 3, 12);
      tint(d, flake, '#e4884a', 0.7);
      pen.hair(flake.slice(0, 8), 0.6, '#5a4a3a', 0.6);
    }
    // Spiral cords all over, then the sutures cut deep.
    cords(d, b, 0.02, 0.97, 3, '#4a3e30', 0.5);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 4), 1.4, d.ink, 0.95, false);
    // The knobs: rounded, drawn out along the whorl, orange where they are worn.
    rows.forEach((u, k) => {
      const i = at(b, u);
      const big = k === rows.length - 1;
      const t = tangent(b, i);
      const ang = Math.atan2(t.y, t.x);
      const n = big ? 6 : 4;
      for (let j = 0; j < n; j++) {
        const p = off(b, i, -0.84 + (1.68 * (j + 0.5)) / n);
        const s = big ? 4.6 : 1.4 + 6.5 * u;
        tint(d, tilted(p.x + 1.4, p.y + 1.8, s * 1.5, s * 0.8, ang, 10), '#3a3024', 0.45);
        tint(d, tilted(p.x - 0.4, p.y - 0.6, s * 1.15, s * 0.55, ang, 10), '#eaa060', 0.75);
        tint(d, tilted(p.x - 0.8, p.y - 1, s * 0.6, s * 0.28, ang, 8), PAPER_FILL, 0.7);
      }
    });
    glint(d, along(b, 0.6, 0.2, 0.72), 1.8, 0.35);
  });
  mottle(d, b.shape, 160, -70, 40, '#4a3e30', 0.55);
  shade(d, b.shape, 0.5);
  edge(d, b.shape, 1.8);
  // The orange mouth, lined inside, three folds on the pillar at its back, out into the long canal's groove.
  const inner = aperture(d, b, [0.52, 0.85], 0.64, '#e8783a');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.55, 0.56, 0.78).concat(along(b, -0.85, 0.56, 0.78).reverse()), '#c4502a', 0.4);
    for (let i = at(b, 0.54); i < at(b, 0.84); i += 3) pen.hair(across(b, i, 2), 0.6, '#f8c08a', 0.5);
    glint(d, along(b, -0.52, 0.55, 0.72), 2.2, 0.55);
  });
  edge(d, inner, 1.2);
  for (const u of [0.6, 0.64, 0.68]) pen.stroke([off(b, at(b, u), -0.34), off(b, at(b, u + 0.02), -0.48)], 2.2, '#fbe0c0', 0.95, false);
  pen.stroke(along(b, -0.55, 0.8, 0.98), 2.6, DARK, 0.8, false);
  hole(d, b, MOUTH_X.horseconch, 12, 8);
}
