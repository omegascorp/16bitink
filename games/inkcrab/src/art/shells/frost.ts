import { add, bezier, closed, contact, type Draw, edge, glint, mottle, normals, oval, pt, shade, skin, tint } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, leaning, mouth, tilted } from './common';
import { across, along, at, type Body, below, body, off, settle, swell, whorlAt } from './spire';

/**
 * Frost Shingle (beach 9): cold-water snails washed onto the Labrador
 * shingle among the ice. Like the other shells they rest on the ground line,
 * apex back, with the opening low on the right at MOUTH_X (see shellArt.ts).
 * Told apart by outline: the wentletrap a slim spire of round ribbed whorls,
 * the Arctic moon snail a smooth globe, the Neptune whelk a corded spindle
 * with its canal flicked up, the Arctic whelk a stout wavy cone cut off
 * blunt, the Iceland whelk a huge swollen egg with a stubby blunt spire.
 *
 * Spiral marks (sutures, cords, bands) run across these lying shells and
 * axial ones (ribs, waves, growth lines) along them, as on a real shell seen
 * side-on.
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

/** A raised spiral cord across the shell at spine point `i`: lit on top, inked below. */
function cord(d: Draw, b: Body, i: number, w: number, dark: string, alpha: number): void {
  const c = across(b, i, 4);
  d.pen.stroke(c.map((p) => add(p, pt(1, 1.2))), w * 1.2, dark, alpha, false);
  d.pen.stroke(c, w, PAPER_FILL, alpha, false);
}

/** A raised blade along the shell at `v` from u0 to u1 (a rib or costa): its shadow behind, its lit crest. */
function blade(d: Draw, b: Body, v: number, u0: number, u1: number, w: number, dark: string): void {
  const line = along(b, v, u0, u1);
  d.pen.stroke(line.map((p) => add(p, pt(1.2, 1.5))), w * 1.1, dark, 0.75, false);
  d.pen.stroke(line, w, '#fbf8f0', 0.95, false);
  d.pen.hair(line.map((p) => add(p, pt(0.6, 0.8))), 0.5, d.ink, 0.55);
}

/** Bends a body's front from u0 on by up to `lift` px (a canal turned up), leaving the rest. */
function flick(b: Body, u0: number, lift: number): Body {
  const bend = (p: Pt, i: number): Pt => {
    const t = Math.max(0, (i / b.n - u0) / (1 - u0));
    return pt(p.x - lift * 0.3 * t * t, p.y - lift * t * t);
  };
  const top = b.top.map(bend);
  const bot = b.bot.map(bend);
  return { spine: b.spine.map(bend), top, bot, shape: [...top, ...[...bot].reverse()], n: b.n };
}

// ---------------------------------------------------------------- the shells

/** An Arctic wentletrap (Epitonium greenlandicum): a slender spire of round, deeply parted whorls crossed by thin raised ribs, chalky ivory, a round mouth in a thick round lip. */
export function wentletrap(d: Draw): void {
  const { pen } = d;
  contact(d, -36, 64);
  const W = 58;
  const END = 0.74;
  // Eight round whorls, the deep sutures closer together towards the tip.
  const sutures = Array.from({ length: 8 }, (_, k) => END * Math.pow((k + 1) / 8, 1.2));
  const w = (u: number): number => {
    if (u < END) return W * 0.82 * Math.pow(u / END, 0.85) * swell(u, sutures, 0.34);
    const t = (u - END) / (1 - END);
    if (t < 0.3) return W * (0.82 + 0.18 * Math.sin(((t / 0.3) * Math.PI) / 2));
    return W * Math.max(0.06, Math.sqrt(Math.max(0, 1 - ((t - 0.3) / 0.7) ** 2)));
  };
  const b = settle((dy) => body(pt(-118, -62 + dy), pt(40, 8 + dy), w, 140), d.g);
  skin(d, b.shape, '#f2ecdc', 0.8);
  pen.clipped(b.shape, () => {
    tint(d, along(b, 0.95, 0, 0.12).concat(along(b, -0.95, 0, 0.12).reverse()), '#c8b088', 0.5);
    tint(d, along(b, -0.2, 0.05, 0.95).concat(along(b, -1, 0.05, 0.95).reverse()), '#c4c8cc', 0.25);
    // Fine spiral threads between the ribs, then the deep sutures.
    for (let i = at(b, 0.04); i < b.n - 4; i += 3) pen.hair(across(b, i, 2), 0.4, '#8a8478', 0.25);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 2), 1.6, d.ink, 0.95, false);
    // The costae: thin white blades along every whorl, running on over the sutures from one whorl to the next.
    const RIBS = [-0.7, -0.22, 0.26, 0.7];
    sutures.forEach((s1, k) => {
      if (k < 1) return;
      const s0 = sutures[k - 1]!;
      for (const v of RIBS) blade(d, b, v + (k % 2) * 0.12, s0 - 0.006, s1 + 0.006, 1.4 + 3 * s1, '#5a5448');
    });
    for (const v of [-0.82, -0.36, 0.1, 0.56]) blade(d, b, v, END - 0.006, 0.97, 3.4, '#5a5448');
    glint(d, along(b, 0.55, 0.1, 0.9), 1.4, 0.5);
  });
  mottle(d, b.shape, 50, -40, 40, '#6a6458', 0.4);
  shade(d, b.shape, 0.4);
  edge(d, b.shape, 1.5);
  // The round mouth at the front of the body whorl, ringed by a thick white lip, a varix of the last rib.
  const x = MOUTH_X.wentletrap;
  const my = below(b, x) - 11;
  const lean = leaning(my, -0.2);
  const lip = oval(x + 1, my, 14, 13, 26).map(lean);
  skin(d, lip, '#faf6ec', 0.9);
  pen.clipped(lip, () => {
    pen.hair(closed(oval(x + 1, my, 11.5, 10.5, 24).map(lean)), 0.5, '#8a8478', 0.6);
    glint(d, bezier(pt(x - 9, my - 7), pt(x, my - 15), pt(x + 11, my - 6), 8), 1.6, 0.8);
  });
  edge(d, lip, 1.3);
  mouth(d, oval(x, my, 8.5, 8, 18).map(lean), 1.1);
}

/** An Arctic moon snail (Cryptonatica affinis): a smooth, glossy globe with the spire barely raised, buff to grey-brown under a thin skin, a big round mouth and a small navel half hidden by a callus. */
export function arcticmoon(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const r = 44;
  const cx = -18;
  const cy = g - r - 1;
  contact(d, cx + 6, r * 1.1);
  const globe = oval(cx, cy, r * 1.06, r, 48);
  // The low spire: a shallow dome at the back of the crown, stepped by two sutures.
  const spire = tilted(cx - r * 0.42, cy - r * 0.82, r * 0.36, r * 0.2, -0.45, 22);
  skin(d, spire, '#d4c2a0', 0.7);
  pen.clipped(spire, () => {
    pen.stroke(tilted(cx - r * 0.47, cy - r * 0.92, r * 0.2, r * 0.1, -0.45, 16), 0.9, d.ink, 0.8, false);
    pen.fill(oval(cx - r * 0.52, cy - r * 0.98, 2.6, 1.8, 8), '#f4ead8', 0.9);
  });
  edge(d, spire, 1.2);
  skin(d, globe, '#cbb48e', 0.75);
  // The coil seen from the side: a spiral out from the apex, the suture along the crown.
  const spiral = (k: number, n = 52): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = -Math.PI * 0.95 + t * Math.PI * 1.9;
    const rr = r * (0.2 + t * 0.62) + k;
    return pt(cx - r * 0.22 + Math.cos(a) * rr * 1.05, cy - r * 0.12 + Math.sin(a) * rr * 0.92);
  });
  pen.clipped(globe, () => {
    // The grey-brown skin over the lower half, rubbed back to buff on the crown, a pale band under the suture.
    tint(d, oval(cx + r * 0.1, cy + r * 0.55, r * 1.2, r * 0.7), '#8a7c66', 0.4);
    tint(d, oval(cx - r * 0.25, cy - r * 0.45, r * 0.8, r * 0.45), '#efe2c6', 0.5);
    pen.stroke(spiral(5), 6, '#f2e6cc', 0.5, false);
    pen.stroke(spiral(0), 1, d.ink, 0.85, false);
    // Growth lines sweeping round the body whorl.
    for (let k = 0; k < 16; k++) {
      const a = -1.3 + k * 0.19;
      pen.hair(bezier(pt(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.45), pt(cx + Math.cos(a + 0.12) * r * 0.85, cy + Math.sin(a + 0.12) * r * 0.8), pt(cx + Math.cos(a + 0.1) * r * 1.1, cy + Math.sin(a + 0.1) * r * 1.05), 8), 0.4, '#5a4a38', 0.3);
    }
    glint(d, bezier(pt(cx - r * 0.8, cy - r * 0.15), pt(cx - r * 0.6, cy - r * 0.78), pt(cx + r * 0.12, cy - r * 0.86), 12), 3, 0.75);
    pen.fill(oval(cx - r * 0.42, cy - r * 0.5, 3, 2, 8), PAPER_FILL, 0.9);
  });
  mottle(d, globe, 120, cy - r, cy + r * 0.2, '#5a4a38', 0.45);
  shade(d, globe, 0.45);
  edge(d, globe, 1.7);
  // The big round mouth: a thin pale outer lip, a cream callus on its inner side, the small navel at the callus's foot.
  const x = MOUTH_X.arcticmoon;
  const my = cy + r * 0.4;
  const lean = (p: Pt): Pt => pt(p.x + (p.y - cy) * -0.15, p.y);
  const rim = oval(x, my, r * 0.4, r * 0.54, 26).map(lean);
  skin(d, rim, '#e6d6b8', 0.8);
  edge(d, rim, 1.1);
  const callus = [...bezier(pt(x - 6, my - r * 0.5), pt(x - 20, my - r * 0.1), pt(x - 12, my + r * 0.5), 10), ...bezier(pt(x - 12, my + r * 0.5), pt(x - 4, my), pt(x - 6, my - r * 0.5), 10).slice(1)].map(lean);
  skin(d, callus, '#f4ead4', 0.9);
  glint(d, [pt(x - 13, my - r * 0.2), pt(x - 12, my + r * 0.15)].map(lean), 1.4, 0.8);
  edge(d, callus, 1);
  const navel = bezier(pt(x - 17, my + r * 0.18), pt(x - 21, my + r * 0.36), pt(x - 15, my + r * 0.52), 8).map(lean);
  pen.stroke(navel, 2.6, DARK, 0.9, false);
  pen.hair(navel.map((p) => add(p, pt(-2, 0))), 0.7, d.ink, 0.7);
  mouth(d, oval(x + 3, my, r * 0.28, r * 0.42, 18).map(lean));
}

/** A Neptune whelk (Neptunea despecta): a big chalky spindle of round whorls girdled by strong spiral cords, brownish-white, a long open canal turned up at its end, an apricot-cream mouth. */
export function neptunewhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -18, 72);
  const W = 86;
  const sutures = [0.05, 0.1, 0.155, 0.215, 0.28, 0.35, 0.43];
  const w = (u: number): number => {
    if (u < 0.43) return W * 0.62 * Math.pow(u / 0.43, 0.85) * swell(u, sutures, 0.2);
    if (u < 0.53) return W * (0.62 + 0.38 * Math.sin((((u - 0.43) / 0.1) * Math.PI) / 2));
    if (u < 0.78) return W * (0.15 + 0.85 * Math.pow(Math.cos((((u - 0.53) / 0.25) * Math.PI) / 2), 0.8));
    return W * 0.15 * (1 - 0.25 * ((u - 0.78) / 0.22));
  };
  // The strong cords: two keels round each spire whorl, more and closer over the body whorl and down the canal; they stand out of the outline.
  const CORDS = [
    ...sutures.slice(1).flatMap((s, k) => [sutures[k]! + (s - sutures[k]!) * 0.38, sutures[k]! + (s - sutures[k]!) * 0.72]),
    0.47, 0.51, 0.55, 0.59, 0.63, 0.67, 0.71, 0.75, 0.8, 0.85, 0.9,
  ];
  const ridge = (u: number): number => (u > 0.92 ? 0 : (u < 0.45 ? 0.4 + 3 * u : 0.9) * Math.max(...CORDS.map((c) => Math.exp(-(((u - c) / 0.008) ** 2)))));
  const b = settle((dy) => flick(body(pt(-112, -60 + dy), pt(92, 22 + dy), w, 160, ridge), 0.8, 7), d.g);
  skin(d, b.shape, '#e8dfcf', 0.8);
  pen.clipped(b.shape, () => {
    // Brownish wash in the grooves between the cords, and the worn tip.
    tint(d, along(b, 0.8, 0.06, 0.92).concat(along(b, -0.6, 0.06, 0.92).reverse()), '#b49878', 0.3);
    tint(d, along(b, 0.95, 0, 0.1).concat(along(b, -0.95, 0, 0.1).reverse()), '#d8c6a8', 0.6);
    for (let i = at(b, 0.03); i < b.n - 2; i += 2) pen.hair(across(b, i, 3), 0.4, '#7a6450', 0.3);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.4, d.ink, 0.95, false);
    for (const c of CORDS) cord(d, b, at(b, c), c < 0.43 ? 1.1 + 3 * c : 2, '#5a4634', 0.7);
    // Growth lines along the whorls.
    for (let v = -0.85; v < 0.9; v += 0.17) pen.hair(along(b, v, 0.44, 0.94), 0.35, '#5a4634', 0.2);
    glint(d, along(b, 0.6, 0.15, 0.7), 1.6, 0.4);
  });
  mottle(d, b.shape, 110, -60, 40, '#5a4634', 0.5);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  // The oval mouth, cords showing through its pale apricot inside, running out into the canal's long groove.
  const inner = aperture(d, b, [0.48, 0.8], 0.6, '#f4dcbc');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.55, 0.52, 0.74).concat(along(b, -0.85, 0.52, 0.74).reverse()), '#e2a878', 0.35);
    for (let i = at(b, 0.5); i < at(b, 0.79); i += 4) pen.hair(across(b, i, 2), 0.5, '#a07650', 0.45);
    glint(d, along(b, -0.52, 0.52, 0.68), 2, 0.6);
  });
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.5, 0.78, 0.99), 2.4, DARK, 0.8, false);
  hole(d, b, MOUTH_X.neptunewhelk, 11, 8);
}

/** An Arctic whelk (Buccinum undatum, the waved whelk): stout, its round whorls rippled by oblique waves crossed by fine spiral threads, grey-buff under a thin brown skin, a big oval mouth and a short notched canal. */
export function arcticwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -20, 70);
  const W = 104;
  const sutures = [0.07, 0.14, 0.215, 0.3, 0.4];
  const w = (u: number): number => {
    if (u < 0.4) return W * 0.66 * Math.pow(u / 0.4, 0.85) * swell(u, sutures, 0.2);
    if (u < 0.5) return W * (0.66 + 0.34 * Math.sin((((u - 0.4) / 0.1) * Math.PI) / 2));
    return W * (0.24 + 0.76 * Math.pow(Math.max(0, Math.cos((((u - 0.5) / 0.5) * Math.PI) / 2)), 0.7));
  };
  // The waves ripple both outlines a little: a few crests to a spire whorl, more on the body whorl.
  const ripple = (u: number): number => {
    if (u > 0.8) return 0;
    const { k, t } = whorlAt(u, sutures, 0.8);
    return (0.4 + 3.2 * u) * Math.pow(Math.abs(Math.sin(t * Math.PI * (k < 0 ? 5 : 2))), 2);
  };
  const b = settle((dy) => body(pt(-112, -62 + dy), pt(62, 22 + dy), w, 140, ripple), d.g);
  skin(d, b.shape, '#c8bca4', 0.8);
  pen.clipped(b.shape, () => {
    // The thin brown skin, rubbed off the spire and in patches on the body whorl.
    tint(d, b.shape, '#8a6a46', 0.22);
    for (let k = 0; k < 10; k++) {
      const p = off(b, at(b, 0.42 + pen.rng() * 0.46), pen.rng() * 1.4 - 0.7);
      tint(d, tilted(p.x, p.y, 5 + pen.rng() * 10, 3 + pen.rng() * 5, pen.rng() * 3, 12), '#d8ccb4', 0.5);
    }
    tint(d, along(b, 0.95, 0, 0.22).concat(along(b, -0.95, 0, 0.22).reverse()), '#ddd2bc', 0.6);
    // The waves: broad oblique folds along each whorl, lit on one flank and shadowed on the other.
    const wave = (v0: number, u0: number, u1: number, s: number): void => {
      const crest = along(b, 0, u0, u1).map((_, k, a) => off(b, at(b, u0) + k, v0 + 0.22 * (k / Math.max(1, a.length - 1))));
      pen.stroke(crest.map((p) => add(p, pt(1.6, 2))), s * 1.4, '#4a3624', 0.3, false);
      pen.stroke(crest, s, '#ece4d2', 0.55, false);
    };
    sutures.forEach((s1, k) => {
      if (k < 1) return;
      const s0 = sutures[k - 1]!;
      for (const v of [-0.7, -0.25, 0.2, 0.62]) wave(v, s0 + 0.004, s1 - 0.004, 1 + 4 * s1);
    });
    for (const v of [-0.95, -0.62, -0.3, 0.02, 0.34, 0.64]) wave(v, 0.4, 0.82, 3);
    // Fine spiral threads all over, the sutures cut between whorls.
    for (let i = at(b, 0.03); i < at(b, 0.97); i += 2) pen.hair(across(b, i, 3), 0.45, '#3a2a1c', 0.35);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.4, d.ink, 0.95, false);
    glint(d, along(b, 0.6, 0.12, 0.72), 1.4, 0.35);
  });
  mottle(d, b.shape, 140, -60, 40, '#3a2a1c', 0.5);
  shade(d, b.shape, 0.48);
  edge(d, b.shape, 1.7);
  // The big oval mouth, creamy white inside, and the short notch of the canal at the blunt front.
  const inner = aperture(d, b, [0.48, 0.95], 0.66, '#f2e8cc');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.55, 0.54, 0.84).concat(along(b, -0.85, 0.54, 0.84).reverse()), '#d8b888', 0.4);
    glint(d, along(b, -0.5, 0.54, 0.76), 2.2, 0.6);
  });
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.45, 0.92, 1), 2.4, DARK, 0.85, false);
  hole(d, b, MOUTH_X.arcticwhelk, 12, 8.5);
}

/** An Iceland whelk (Volutopsius norwegicus): big and swollen, a short blunt spire on a bulbous tip, smooth but for growth lines, warm pinkish-buff with tan bands, a huge flaring mouth with a pale lip. */
export function icelandwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -10, 88);
  const W = 124;
  const sutures = [0.05, 0.11, 0.18];
  const w = (u: number): number => {
    if (u < 0.18) return W * (0.52 * Math.pow(u / 0.18, 0.5) * swell(u, sutures, 0.14) + 0.08 * Math.exp(-((u / 0.035) ** 2)));
    if (u < 0.42) return W * (0.52 + 0.48 * Math.sin((((u - 0.18) / 0.24) * Math.PI) / 2));
    return W * (0.15 + 0.85 * Math.sqrt(Math.max(0, 1 - ((u - 0.42) / 0.58) ** 2)));
  };
  // The flaring outer lip pushes the underside out along the mouth.
  const flare = (b: Body): Body => {
    const nrm = normals(b.spine);
    const bot = b.bot.map((p, i) => {
      const u = i / b.n;
      const f = u > 0.45 && u < 0.98 ? 7 * Math.sin(((u - 0.45) / 0.53) * Math.PI) : 0;
      return add(p, pt(-nrm[i]!.x * f, -nrm[i]!.y * f));
    });
    return { ...b, bot, shape: [...b.top, ...[...bot].reverse()] };
  };
  const b = settle((dy) => flare(body(pt(-118, -56 + dy), pt(100, 30 + dy), w, 150)), d.g);
  skin(d, b.shape, '#ecc8aa', 0.8);
  pen.clipped(b.shape, () => {
    // Soft tan bands round the body whorl, a rosier flush on the shoulder, the bulbous tip paler.
    for (const [u0, u1] of [[0.32, 0.4], [0.54, 0.62], [0.75, 0.81]] as const) tint(d, along(b, 1, u0, u1).concat(along(b, -1, u0, u1).reverse()), '#c48a62', 0.2);
    tint(d, oval(b.spine[at(b, 0.4)]!.x, b.spine[at(b, 0.4)]!.y - 22, 46, 20), '#f0b0a0', 0.3);
    tint(d, along(b, 1, 0, 0.06).concat(along(b, -1, 0, 0.06).reverse()), '#f6e6d4', 0.7);
    // Growth lines along the whorls, a few stronger where growth paused.
    for (let v = -0.9; v < 0.95; v += 0.075) pen.hair(along(b, v + pen.jitter(0.02), 0.19, 0.97), 0.4, '#7a4a32', 0.2);
    for (const v of [-0.5, 0.15, 0.6]) pen.hair(along(b, v, 0.2, 0.96), 0.7, '#7a4a32', 0.35);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 2), 1.4, d.ink, 0.95, false);
    glint(d, along(b, 0.6, 0.2, 0.75), 3, 0.7);
    glint(d, along(b, 0.3, 0.4, 0.7), 1.4, 0.45);
  });
  mottle(d, b.shape, 80, -60, 40, '#7a4a32', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.8);
  // The huge mouth along most of the underside, rosy inside, with the broad pale lip flaring round its front.
  const inner = aperture(d, b, [0.36, 0.98], 0.7, '#f6dccc');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.45, 0.42, 0.85).concat(along(b, -0.8, 0.42, 0.85).reverse()), '#e8a088', 0.4);
    glint(d, along(b, -0.5, 0.42, 0.7), 2.4, 0.65);
  });
  edge(d, inner, 1.1);
  const lip = along(b, -0.92, 0.4, 0.99);
  pen.stroke(lip, 5, '#fbf1e6', 0.95, false);
  pen.hair(lip.map((p) => add(p, pt(0, -2.6))), 0.6, d.ink, 0.5);
  pen.stroke(along(b, -0.5, 0.95, 1), 2, DARK, 0.7, false);
  hole(d, b, MOUTH_X.icelandwhelk, 12, 9, 10);
}
