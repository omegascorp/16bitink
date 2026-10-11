import { add, bezier, closed, contact, cub, type Draw, edge, glint, lerp, mottle, normals, oval, pt, shade, skin, tint } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, leaning, mouth, tilted } from './common';
import { across, along, at, type Body, below, body, off, settle, swell, tangent } from './spire';

/**
 * Moonlit Bay (beach 10): the great shells of a Queensland reef bay, the
 * last and grandest of the game. Like the other shells they rest on the
 * ground line, apex back, with the opening low on the right at MOUTH_X (see
 * shellArt.ts). Told apart by outline: the tiger moon snail a spotted globe
 * with a stepped little spire, the giant tun a scalloped egg of broad ribs,
 * the horned helmet a squat hump crowned with big blunt horns over its flat
 * shield, the triton's trumpet a long elegant spire with a flaring orange
 * lip, the baler a vast swollen egg with a crown of spines round its sunken
 * spire.
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

/** A band of the shell from u0 to u1, top outline to bottom. */
const band = (b: Body, u0: number, u1: number): Pt[] => along(b, 1, u0, u1).concat(along(b, -1, u0, u1).reverse());

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

/** A tiger moon snail (Naticarius / Natica tigrina): a glossy cream globe boldly spotted dark brown in spiral rows, a low stepped spire, a big round mouth with a white callus over the navel. */
export function tigermoon(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const r = 40;
  const cx = -16;
  const cy = g - r - 1;
  contact(d, cx + 6, r * 1.1);
  // The spot: a rounded blot, two overlapping ovals turned along the coil.
  const spot = (p: Pt, s: number, a: number): void => {
    tint(d, tilted(p.x, p.y, s * (1 + pen.rng() * 0.5), s * (0.65 + pen.rng() * 0.25), a + pen.jitter(0.5), 10), '#4e2814', 0.85);
    if (pen.rng() < 0.5) tint(d, tilted(p.x + pen.jitter(s * 0.6), p.y + pen.jitter(s * 0.6), s * 0.6, s * 0.5, a, 8), '#4e2814', 0.8);
  };
  // The spire: three low whorls stepping up at the back of the crown, the smallest on top.
  const steps = [[0.66, 1.06, 0.12, 0.08], [0.58, 0.96, 0.26, 0.14], [0.46, 0.8, 0.44, 0.24]] as const;
  for (const [x, y, rx, ry] of steps) {
    const w = tilted(cx - r * x, cy - r * y, r * rx, r * ry, -0.48, 22);
    skin(d, w, '#efe0c0', 0.75);
    pen.clipped(w, () => {
      for (let k = 0; k < Math.round(rx * 12); k++) spot(pt(cx - r * x + pen.jitter(r * rx * 0.8), cy - r * y + r * ry * 0.3 + pen.jitter(r * ry * 0.3)), 1 + rx * 4, -0.48);
    });
    edge(d, w, 1.2);
  }
  const globe = oval(cx, cy, r * 1.08, r, 48);
  skin(d, globe, '#f0e2c2', 0.75);
  // The coil seen from the side: a spiral out from the apex, the suture along the crown.
  const spiral = (k: number, n = 52): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = -Math.PI * 0.95 + t * Math.PI * 1.9;
    const rr = r * (0.2 + t * 0.62) + k;
    return pt(cx - r * 0.22 + Math.cos(a) * rr * 1.05, cy - r * 0.12 + Math.sin(a) * rr * 0.92);
  });
  pen.clipped(globe, () => {
    tint(d, oval(cx + r * 0.2, cy + r * 0.4, r * 1.1, r * 0.7), '#e2b888', 0.35);
    // The tiger spots: spiral rows following the coil, on the earlier whorl too, bigger as the whorl grows, left off the pale band under the suture.
    for (const k of [-15, -8, 9, 16, 23, 30, 37, 44, 51]) {
      for (let t = 0.02; t < 1.15; ) {
        const a = -Math.PI * 0.95 + t * Math.PI * 1.9;
        const rr = r * (0.2 + t * 0.62) + k;
        const s = 1.2 + Math.max(0, rr) * 0.075;
        if (rr > 6 && pen.rng() > 0.1) {
          const p = pt(cx - r * 0.22 + Math.cos(a) * rr * 1.05 + pen.jitter(1.5), cy - r * 0.12 + Math.sin(a) * rr * 0.92 + pen.jitter(1.5));
          spot(p, s, a + Math.PI / 2);
        }
        t += (s * 3.4) / (Math.max(8, rr) * Math.PI * 1.9);
      }
    }
    pen.stroke(spiral(4), 5, '#fbf3e0', 0.6, false);
    pen.stroke(spiral(0), 1, d.ink, 0.85, false);
    // Fine growth lines, and the high polish.
    for (let k = 0; k < 14; k++) {
      const a = -1.3 + k * 0.21;
      pen.hair(bezier(pt(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.45), pt(cx + Math.cos(a + 0.12) * r * 0.85, cy + Math.sin(a + 0.12) * r * 0.8), pt(cx + Math.cos(a + 0.1) * r * 1.1, cy + Math.sin(a + 0.1) * r * 1.05), 8), 0.4, '#5a3a20', 0.25);
    }
    glint(d, bezier(pt(cx - r * 0.82, cy - r * 0.1), pt(cx - r * 0.62, cy - r * 0.78), pt(cx + r * 0.14, cy - r * 0.86), 12), 3.4, 0.85);
    pen.fill(oval(cx - r * 0.44, cy - r * 0.52, 3.4, 2.2, 8), PAPER_FILL, 0.95);
  });
  shade(d, globe, 0.42);
  edge(d, globe, 1.7);
  // The big round mouth: a thin cream lip, a white callus on its inner side, the navel at the callus's foot.
  const x = MOUTH_X.tigermoon;
  const my = cy + r * 0.4;
  const lean = (p: Pt): Pt => pt(p.x + (p.y - cy) * -0.15, p.y);
  const rim = oval(x, my, r * 0.42, r * 0.55, 26).map(lean);
  skin(d, rim, '#f2e4c8', 0.8);
  pen.clipped(rim, () => tint(d, oval(x + 6, my, r * 0.3, r * 0.5).map(lean), '#c89a6a', 0.35));
  edge(d, rim, 1.1);
  const callus = [...bezier(pt(x - 6, my - r * 0.52), pt(x - 22, my - r * 0.1), pt(x - 13, my + r * 0.52), 10), ...bezier(pt(x - 13, my + r * 0.52), pt(x - 4, my), pt(x - 6, my - r * 0.52), 10).slice(1)].map(lean);
  skin(d, callus, '#fbf4e4', 0.95);
  glint(d, [pt(x - 14, my - r * 0.22), pt(x - 13, my + r * 0.15)].map(lean), 1.4, 0.9);
  edge(d, callus, 1);
  const navel = bezier(pt(x - 18, my + r * 0.2), pt(x - 22, my + r * 0.36), pt(x - 16, my + r * 0.52), 8).map(lean);
  pen.stroke(navel, 2.4, DARK, 0.9, false);
  pen.hair(navel.map((p) => add(p, pt(-2, 0))), 0.7, d.ink, 0.7);
  mouth(d, oval(x + 3, my, r * 0.28, r * 0.42, 18).map(lean));
}

/** A giant tun (Tonna galea): a thin, inflated globe on a short stepped spire, girdled by broad flat spiral ribs between narrow grooves, pale tan clouded brown, a huge mouth inside a thin crinkled lip. */
export function gianttun(d: Draw): void {
  const { pen } = d;
  contact(d, -16, 76);
  const W = 128;
  const END = 0.2;
  const sutures = [0.05, 0.1, 0.15, END];
  const w = (u: number): number => {
    if (u < END) return W * 0.46 * Math.pow(u / END, 0.75) * swell(u, sutures, 0.3);
    const t = (u - END) / (1 - END);
    return W * (0.1 + 0.9 * Math.sqrt(Math.max(0, 1 - ((t - 0.44) / 0.56) ** 2)));
  };
  // The grooves between the ribs: two to a spire whorl, twelve round the body whorl; each nicks the outline.
  const GROOVES = [...sutures.slice(1).map((s, k) => (sutures[k]! + s) / 2), ...Array.from({ length: 12 }, (_, k) => END + 0.04 + k * 0.062)];
  const nick = (u: number): number => -(0.8 + 2.4 * u) * Math.max(...GROOVES.map((c) => Math.exp(-(((u - c) / 0.008) ** 2))));
  const b = settle((dy) => body(pt(-96, -46 + dy), pt(54, 22 + dy), w, 150, nick), d.g);
  skin(d, b.shape, '#e4caa0', 0.8);
  pen.clipped(b.shape, () => {
    // Brown clouds over the ribs, a paler spire.
    for (let k = 0; k < 10; k++) {
      const p = off(b, at(b, 0.26 + pen.rng() * 0.66), pen.rng() * 1.6 - 0.8);
      tint(d, tilted(p.x, p.y, 5 + pen.rng() * 8, 10 + pen.rng() * 14, pen.rng() * 0.6 - 0.3, 12), '#9a6a3a', 0.25);
    }
    tint(d, band(b, 0, 0.1), '#f4e6ca', 0.6);
    // The ribs: each a broad flat band lit along its crest, the narrow groove before it dark.
    for (const c of GROOVES) {
      const i = at(b, c);
      const s = c < END ? 0.6 : 1;
      const bow = c < END ? 3 : 12;
      pen.stroke(across(b, i + 1, bow).map((p) => add(p, pt(0.8, 1))), 2.6 * s, '#6a4424', 0.35, false);
      pen.stroke(across(b, i, bow), 0.9 * s, d.ink, 0.8, false);
      pen.hair(across(b, Math.min(b.n, i + Math.round(0.026 * b.n)), bow), 3 * s, '#fbf1dc', 0.4);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 2), 1.5, d.ink, 0.95, false);
    // Fine growth lines along the shell, and the thin shell's soft sheen.
    for (let v = -0.85; v < 0.9; v += 0.11) pen.hair(along(b, v + pen.jitter(0.02), 0.21, 0.97), 0.35, '#5a3a20', 0.18);
    glint(d, along(b, 0.6, 0.24, 0.72), 2.6, 0.55);
  });
  mottle(d, b.shape, 80, -70, 30, '#6a4424', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  // The huge mouth along most of the underside, brown deep inside, its thin pale lip crinkled where the ribs end.
  const inner = aperture(d, b, [0.3, 0.99], 0.74, '#f0dcbc');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.45, 0.36, 0.9).concat(along(b, -0.8, 0.36, 0.9).reverse()), '#a8744a', 0.4);
    for (const c of GROOVES.filter((u) => u > 0.32)) pen.hair(across(b, at(b, c), 3), 0.6, '#7a4e2a', 0.45);
    glint(d, along(b, -0.52, 0.38, 0.72), 2.2, 0.55);
  });
  edge(d, inner, 1.1);
  const lip = along(b, -0.93, 0.32, 0.98);
  pen.stroke(lip, 3.2, '#faf0dc', 0.95, false);
  for (const c of GROOVES.filter((u) => u > 0.33 && u < 0.97)) {
    const p = off(b, at(b, c), -0.93);
    pen.fill(oval(p.x, p.y, 1.6, 1.6, 6), '#6a4424', 0.8);
  }
  pen.stroke(along(b, -0.5, 0.95, 1), 2.2, DARK, 0.75, false);
  hole(d, b, MOUTH_X.gianttun, 12, 9, 10);
}

/** A horned helmet (Cassis cornuta): massive and squat, a row of great blunt horns along its shoulder over a low flat spire, cream clouded orange-brown, turned a little to show its broad flat glossy shield, a slit of a mouth and a thick toothed lip. */
export function hornedhelmet(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -28, 78);
  // The low spire: a flat cone of three whorls at the back of the shoulder.
  const spire = [...cub(pt(-90, -2), pt(-98, -12), pt(-104, -18), pt(-105, -22), 8), ...cub(pt(-105, -22), pt(-100, -27), pt(-88, -30), pt(-74, -32), 8).slice(1), pt(-78, -8)];
  skin(d, spire, '#ecdcbc', 0.75);
  pen.clipped(spire, () => {
    for (const x of [-99, -91]) pen.stroke(bezier(pt(x, -30), pt(x - 3, -18), pt(x + 2, -6), 6), 1, d.ink, 0.85, false);
    tint(d, oval(-102, -22, 3, 2.4), '#9a5a2e', 0.6);
  });
  edge(d, spire, 1.3);
  // The shoulder's line, from the spire to the lip: the horns stand up off it.
  const crest = [...cub(pt(-86, -22), pt(-70, -46), pt(-34, -54), pt(-2, -46), 24), ...cub(pt(-2, -46), pt(14, -42), pt(26, -34), pt(32, -26), 10).slice(1)];
  const HORNS = [[0.1, 0.07, 5], [0.27, 0.09, 13], [0.46, 0.1, 21], [0.66, 0.1, 25], [0.85, 0.07, 9]] as const;
  const horn = (t: number): number => Math.max(0, ...HORNS.map(([c, wd, h]) => (Math.abs(t - c) < wd ? h * Math.cos(((t - c) / wd) * (Math.PI / 2)) ** 1.2 : 0)));
  const nrm = normals(crest);
  // Each horn leans a little back, towards the spire.
  const top = crest.map((p, i) => {
    const h = horn(i / (crest.length - 1));
    return add(p, pt(nrm[i]!.x * h - h * 0.2, nrm[i]!.y * h));
  });
  const shell = [...cub(pt(-92, g - 3), pt(-100, 10), pt(-96, -12), pt(-86, -22), 10), ...top.slice(1),
    ...cub(pt(32, -26), pt(42, -10), pt(46, 20), pt(40, g - 1), 10).slice(1), ...cub(pt(40, g - 1), pt(0, g), pt(-50, g), pt(-92, g - 3), 12).slice(1)];
  skin(d, shell, '#e8d6b4', 0.75);
  pen.clipped(shell, () => {
    // Orange-brown clouds, deeper along the shoulder and over the horns.
    tint(d, oval(-26, -36, 66, 16), '#c88450', 0.35);
    for (let k = 0; k < 10; k++) tint(d, tilted(-82 + pen.rng() * 100, -28 + pen.rng() * 30, 5 + pen.rng() * 8, 3 + pen.rng() * 4, pen.rng() * 3, 12), '#a8683a', 0.3);
    // A lower spiral row of low nodules, each lit up-left and shadowed down-right, and the spiral threads.
    for (let k = 0; k < 6; k++) {
      const x = -74 + k * 15;
      const y = -18 + k * 1.5;
      tint(d, oval(x + 1.8, y + 2, 4.6, 3.4, 10), '#5a3018', 0.35);
      tint(d, oval(x - 1, y - 1.2, 3.4, 2.4, 10), PAPER_FILL, 0.7);
    }
    for (const y of [-28, -8]) pen.hair(bezier(pt(-96, y + 6), pt(-30, y - 6), pt(40, y + 2), 12), 0.5, '#5a3018', 0.3);
    // The horns: lit on their back flanks, shadowed on their front.
    HORNS.filter(([, , h]) => h > 10).forEach(([c, , h]) => {
      const i = Math.round(c * (crest.length - 1));
      const tip = top[i]!;
      glint(d, bezier(add(crest[i]!, pt(-h * 0.4, 2)), add(tip, pt(-h * 0.32, h * 0.2)), add(tip, pt(-1, 2.5)), 8), 2.2, 0.75);
      tint(d, tilted(tip.x + h * 0.16, tip.y + h * 0.5, h * 0.16, h * 0.4, -0.25, 12), '#6a3418', 0.3);
    });
    // Growth lines down the body.
    for (let k = 0; k < 18; k++) {
      const x = -84 + k * 6.6;
      pen.hair(bezier(pt(x, -50), pt(x + 6, -10), pt(x + 2, g), 8), 0.4, '#5a3018', 0.2);
    }
    glint(d, cub(pt(-88, 0), pt(-86, -20), pt(-70, -36), pt(-48, -42), 10), 2.6, 0.6);
  });
  mottle(d, shell, 100, -60, 0, '#5a3018', 0.5);
  shade(d, shell, 0.5);
  edge(d, shell, 1.8);
  // The parietal shield: the broad flat glossy face of the underside, turned towards us, widening from the back to the mouth.
  const shield = [...cub(pt(-98, g - 3), pt(-60, g - 12), pt(-10, -2), pt(18, -24), 14), pt(26, -28), pt(30, g - 1),
    ...cub(pt(30, g - 1), pt(-10, g), pt(-60, g), pt(-98, g - 3), 12).slice(1)];
  skin(d, shield, '#f2b07a', 0.85);
  pen.clipped(shield, () => {
    tint(d, tilted(-6, 22, 44, 14, -0.45), '#e88a4a', 0.4);
    tint(d, tilted(-30, 30, 50, 6, -0.3), '#fbe0bc', 0.55);
    // Wrinkles on the shield beside the mouth: the parietal folds.
    for (let k = 0; k < 6; k++) {
      const y = -10 + k * 9;
      pen.stroke(bezier(pt(4 + k * 1.6 - 14, y + 4), pt(4 + k * 1.6 - 6, y - 1), pt(4 + k * 1.6, y + 2), 6), 1.6, '#fdf2e0', 0.85, false);
    }
    glint(d, cub(pt(-90, g - 5), pt(-56, g - 13), pt(-14, -3), pt(14, -22), 12), 2.2, 0.9);
  });
  edge(d, shield, 1.6);
  // The thick outer lip at the front, barred dark brown outside, its white teeth facing the slit of the mouth.
  const lip = [...cub(pt(18, -30), pt(36, -36), pt(52, -14), pt(52, 12), 12), ...cub(pt(52, 12), pt(52, 32), pt(48, g - 2), pt(40, g - 1), 10).slice(1),
    pt(26, g - 1), ...cub(pt(26, g - 1), pt(24, 20), pt(28, -10), pt(18, -30), 12).slice(1)];
  skin(d, lip, '#f6c896', 0.8);
  pen.clipped(lip, () => {
    tint(d, oval(36, 6, 7, 36), '#fde8cc', 0.7);
    for (let k = 0; k < 6; k++) pen.stroke([pt(42, -22 + k * 12), pt(58, -26 + k * 12)], 3.6, '#6a2e16', 0.7, false);
    glint(d, cub(pt(26, -32), pt(40, -32), pt(48, -14), pt(48, 8), 10), 2.2, 0.85);
  });
  edge(d, lip, 1.6);
  const x = MOUTH_X.hornedhelmet;
  const my = g - 16;
  const lean = leaning(my, -0.3);
  mouth(d, [...cub(pt(x + 12, -26), pt(x + 2, -4), pt(x - 8, 20), pt(x - 6, g - 4), 12), ...cub(pt(x - 6, g - 4), pt(x + 8, g - 4), pt(x + 12, 20), pt(x + 12, -26), 12).slice(1)].map(lean), 1.1);
  for (let k = 0; k < 7; k++) {
    const p = lean(pt(x + 12 - k * 0.3, -18 + k * 8.5));
    pen.fill(tilted(p.x, p.y, 3.6, 2, 0, 8), PAPER_FILL, 0.95);
    pen.stroke(closed(tilted(p.x, p.y, 3.6, 2, 0, 8)), 0.7, d.ink, 0.7, false);
  }
}

/** A triton's trumpet (Charonia tritonis): a long, elegant, tapering spire of round corded whorls with a varix every two-thirds of a turn, mottled in red-brown crescents on cream, a flaring orange mouth, its lip toothed in white on dark brown. */
export function tritonstrumpet(d: Draw): void {
  const { pen } = d;
  contact(d, -20, 92);
  const W = 106;
  const END = 0.55;
  const sutures = Array.from({ length: 8 }, (_, k) => END * Math.pow((k + 1) / 8, 1.15));
  const w = (u: number): number => {
    if (u < END) return W * 0.6 * Math.pow(u / END, 1.1) * swell(u, sutures, 0.24);
    if (u < 0.68) return W * (0.6 + 0.4 * Math.sin((((u - END) / 0.12) * Math.PI) / 2));
    return W * (0.2 + 0.8 * Math.pow(Math.max(0, Math.cos((((u - 0.68) / 0.32) * Math.PI) / 2)), 0.7));
  };
  const VARICES = [0.25, 0.36, 0.46, 0.54, 0.78];
  const varix = (u: number): number => (0.6 + 4 * u) * Math.max(...VARICES.map((c) => Math.exp(-(((u - c) / 0.01) ** 2))));
  const b = settle((dy) => flick(body(pt(-122, -72 + dy), pt(80, 18 + dy), w, 200, varix), 0.9, 6), d.g);
  skin(d, b.shape, '#f2e2c2', 0.8);
  pen.clipped(b.shape, () => {
    tint(d, band(b, 0, 0.08), '#c8865a', 0.5);
    // A warm tan wash on the lower half of each whorl and red-brown clouds over the body whorl, under the pattern.
    tint(d, along(b, -0.1, 0.05, 1).concat(along(b, -1, 0.05, 1).reverse()), '#d8a070', 0.3);
    for (let k = 0; k < 9; k++) {
      const p = off(b, at(b, 0.5 + pen.rng() * 0.42), pen.rng() * 1.6 - 0.8);
      tint(d, tilted(p.x, p.y, 4 + pen.rng() * 6, 7 + pen.rng() * 9, -0.4, 12), '#b0582a', 0.3);
    }
    // The crescents: red-brown half-moons in rows along each whorl, their horns pointing to the front.
    const crescent = (p: Pt, s: number, t: Pt): Pt[] => {
      const n = pt(-t.y, t.x);
      const q = (a: number, c: number): Pt => add(p, pt(t.x * a + n.x * c, t.y * a + n.y * c));
      return [...bezier(q(s * 0.5, -s), q(-s * 1.2, 0), q(s * 0.5, s), 8), ...bezier(q(s * 0.5, s), q(-s * 0.1, 0), q(s * 0.5, -s), 8).slice(1)];
    };
    for (let i = at(b, 0.05), row = 0; i < at(b, 0.94); row++) {
      const u = i / b.n;
      const s = 1.8 + 6 * Math.min(u, 0.66);
      for (const v of [-0.74, -0.34, 0.06, 0.46]) {
        if (pen.rng() < 0.12) continue;
        const vv = v + (row % 2) * 0.2 + pen.jitter(0.05);
        tint(d, crescent(off(b, i, vv), s, tangent(b, i)), pen.rng() < 0.45 ? '#a8481e' : '#5a2410', 0.75);
      }
      i += Math.max(3, Math.round(s * 1.05));
    }
    // The broad spiral cords, two to a whorl, more on the body whorl: lit crests, dark grooves.
    const CORDS = [...sutures.slice(1).flatMap((s, k) => [sutures[k]! + (s - sutures[k]!) * 0.35, sutures[k]! + (s - sutures[k]!) * 0.7]), 0.6, 0.64, 0.68, 0.72, 0.76, 0.81, 0.86, 0.91];
    for (const c of CORDS) {
      const i = at(b, c);
      pen.hair(across(b, i, 3).map((p) => add(p, pt(1, 1.2))), 1 + c, '#4a2412', 0.3);
      pen.hair(across(b, i, 3), 1 + c * 2, '#fbf1dc', 0.4);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.4, d.ink, 0.95, false);
    // The varices: pale rounded ridges where the lip once stood.
    for (const c of VARICES) {
      const i = at(b, c);
      pen.stroke(across(b, i, 4), 2 + 5 * c, '#fbf1dc', 0.8, false);
      pen.stroke(across(b, i + 2, 4), 1, d.ink, 0.7, false);
    }
    glint(d, along(b, 0.58, 0.12, 0.74), 1.8, 0.55);
  });
  mottle(d, b.shape, 90, -80, 30, '#4a2412', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  // The flaring orange mouth: white ridges on the dark brown pillar, then the broad lip round its edge, toothed in pairs on brown blotches.
  const inner = aperture(d, b, [0.6, 0.97], 0.7, '#f29a52');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.36, 0.62, 0.9).concat(along(b, -0.56, 0.62, 0.9).reverse()), '#5a2a14', 0.65);
    for (let i = at(b, 0.64); i < at(b, 0.9); i += 5) pen.stroke([off(b, i, -0.38), off(b, i, -0.54)], 1.4, '#fbf1dc', 0.85, false);
    tint(d, along(b, -0.62, 0.62, 0.92).concat(along(b, -0.9, 0.62, 0.92).reverse()), '#f8c088', 0.5);
    glint(d, along(b, -0.72, 0.64, 0.86), 2, 0.6);
  });
  edge(d, inner, 1.1);
  const lip = along(b, -0.91, 0.6, 0.98);
  pen.stroke(lip, 5, '#f08a3a', 0.95, false);
  for (let i = at(b, 0.62); i < at(b, 0.96); i += 6) {
    const p = off(b, i, -0.9);
    pen.fill(oval(p.x, p.y, 3, 2.4, 8), '#5a2a14', 0.85);
    pen.stroke([add(p, pt(-1.6, -0.6)), add(p, pt(-1.6, 1.2))], 1, PAPER_FILL, 0.95, false);
    pen.stroke([add(p, pt(1.2, -0.6)), add(p, pt(1.2, 1.2))], 1, PAPER_FILL, 0.95, false);
  }
  pen.hair(lip.map((p) => add(p, pt(0, -3.2))), 0.6, d.ink, 0.55);
  pen.stroke(along(b, -0.45, 0.95, 1), 2.2, DARK, 0.8, false);
  hole(d, b, MOUTH_X.tritonstrumpet, 12, 8.5, 10);
}

/** The point `v` across the shell at `u`, pushed `bow` towards the front mid-way across: spiral marks bow round the whorl. */
function bowed(b: Body, u: number, v: number, bow: number): Pt {
  const i = at(b, u);
  const t = tangent(b, i);
  const k = bow * (1 - v * v);
  return add(off(b, i, v), pt(t.x * k, t.y * k));
}

/** A baler (Melo amphora): the biggest shell of all, a vast swollen egg, glossy orange-tan with faint bands of brown zigzags, its spire sunk inside a crown of short spines, an enormous mouth down its underside with folds on the pillar. */
export function baler(d: Draw): void {
  const { pen } = d;
  contact(d, -18, 106);
  const W = 128;
  const CROWN = 0.22;
  // A broad domed crown at the back, then the swollen body whorl tapering to a broad blunt front.
  const w = (u: number): number => {
    if (u < CROWN) return W * (0.2 + 0.72 * Math.sqrt(Math.max(0, 1 - (1 - u / CROWN) ** 2)));
    const t = (u - CROWN) / (1 - CROWN);
    return W * (0.32 + 0.68 * Math.sqrt(Math.max(0, 1 - ((t - 0.18) / 0.82) ** 2))) * (0.92 + 0.08 * Math.min(1, t / 0.18));
  };
  // The front: rounded off rather than cut square.
  const nose = (b: Body): Body => {
    const t = tangent(b, b.n);
    const cap = bezier(b.top[b.n]!, add(b.spine[b.n]!, pt(t.x * 24, t.y * 24)), b.bot[b.n]!, 10);
    return { ...b, shape: [...b.top, ...cap.slice(1, -1), ...[...b.bot].reverse()] };
  };
  const b = settle((dy) => nose(body(pt(-104, -40 + dy), pt(84, 20 + dy), w, 180)), d.g);
  const tb = tangent(b, 0);
  const nrm = normals(b.spine);
  // The crown of short spines round the shoulder, rooted inside the outline so it cuts across them: out of the dome's top and underside, and back off its end.
  const outward = (side: readonly Pt[], i: number, sign: number): Pt => {
    const p = side[Math.max(0, i - 1)]!;
    const q = side[Math.min(b.n, i + 1)]!;
    return pt(-(q.y - p.y) * sign, (q.x - p.x) * sign);
  };
  const spike = (p: Pt, dir: Pt, len: number, wd: number): void => {
    const l = Math.hypot(dir.x, dir.y) || 1;
    const u = pt(dir.x / l, dir.y / l);
    const s = [add(p, pt(-u.y * wd, u.x * wd)), add(p, pt(u.x * len, u.y * len)), add(p, pt(u.y * wd, -u.x * wd))];
    skin(d, s, '#eeb072', 0.85);
    pen.clipped(s, () => tint(d, [s[1]!, s[2]!, p], '#a8582a', 0.35));
    pen.stroke(s, 1.1, d.ink, 0.9, false);
  };
  for (const [u, len] of [[0.035, 9], [0.09, 11], [0.15, 10]] as const) {
    const i = at(b, u);
    spike(lerp(b.spine[i]!, b.top[i]!, 0.9), outward(b.top, i, -1), len + 5, 4.2);
  }
  for (const [u, len] of [[0.05, 7]] as const) {
    const i = at(b, u);
    spike(lerp(b.spine[i]!, b.bot[i]!, 0.9), outward(b.bot, i, 1), len + 5, 4);
  }
  for (const v of [0.55, -0.35]) spike(off(b, 0, v * 0.9), pt(-tb.x + nrm[0]!.x * v, -tb.y + nrm[0]!.y * v), 12, 4);
  skin(d, b.shape, '#e8a35c', 0.8);
  pen.clipped(b.shape, () => {
    // Paler on the upper flank where the light falls, deeper orange underneath, the crown paler still.
    tint(d, along(b, 0.95, 0.1, 0.8).concat(along(b, 0.1, 0.1, 0.8).reverse()), '#f6cc94', 0.45);
    tint(d, along(b, -0.4, 0.1, 1).concat(along(b, -1, 0.1, 1).reverse()), '#c8743a', 0.3);
    tint(d, band(b, 0, CROWN * 0.6), '#f4c894', 0.45);
    // Faint spiral bands of brown zigzags: axial lines crowded together, bowing round the whorl with the band.
    for (const [u0, u1] of [[0.3, 0.4], [0.54, 0.63], [0.75, 0.83]] as const) {
      const bow = 16;
      const rim = (u: number): Pt[] => Array.from({ length: 17 }, (_, k) => bowed(b, u, -1 + k / 8, bow));
      tint(d, [...rim(u0), ...rim(u1).reverse()], '#b0602e', 0.12);
      for (let v = -0.94; v < 0.96; v += 0.08) {
        const zig = Array.from({ length: 7 }, (_, k) => bowed(b, u0 + ((u1 - u0) * k) / 6 + pen.jitter(0.004), v + (k % 2 ? 0.035 : -0.035) + pen.jitter(0.01), bow));
        pen.hair(zig, 0.7, '#7a3a1a', 0.3);
      }
    }
    for (let v = -0.9; v < 0.92; v += 0.15) pen.hair(along(b, v + pen.jitter(0.03), 0.1, 0.98), 0.35, '#7a3a1a', 0.16);
    // The crown's sunken middle: the suture curling round the spire, and the shoulder where the crown turns down into the body.
    pen.stroke(across(b, at(b, 0.04), -4), 1, d.ink, 0.7, false);
    pen.stroke(across(b, at(b, CROWN), 6), 0.9, d.ink, 0.35, false);
    glint(d, along(b, 0.64, 0.16, 0.74), 3.6, 0.85);
    glint(d, along(b, 0.36, 0.3, 0.6), 1.6, 0.5);
    const hi = off(b, at(b, 0.3), 0.62);
    pen.fill(oval(hi.x, hi.y, 3.6, 2.4, 8), PAPER_FILL, 0.95);
  });
  mottle(d, b.shape, 70, -80, 30, '#7a3a1a', 0.45);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.9);
  // The sunken spire: a small smooth cone peeping out of the middle of the crown.
  const tip = off(b, at(b, 0.012), 0.05);
  const cone = [add(tip, pt(nrm[0]!.x * 9, nrm[0]!.y * 9)), add(tip, pt(-tb.x * 9, -tb.y * 9)), add(tip, pt(-nrm[0]!.x * 9, -nrm[0]!.y * 9))];
  skin(d, cone, '#f6d4a4', 0.85);
  pen.clipped(cone, () => pen.stroke([add(tip, pt(nrm[0]!.x * 5 - tb.x * 4, nrm[0]!.y * 5 - tb.y * 4)), add(tip, pt(-nrm[0]!.x * 5 - tb.x * 4, -nrm[0]!.y * 5 - tb.y * 4))], 0.8, d.ink, 0.7, false));
  pen.stroke(cone, 1.2, d.ink, 1, false);
  // The enormous mouth down the underside, glossy cream-orange, its thin outer lip the shell's own edge.
  const inner = aperture(d, b, [0.2, 1], 0.78, '#f8d4a0');
  pen.clipped(inner, () => {
    tint(d, along(b, -0.4, 0.3, 0.9).concat(along(b, -0.75, 0.3, 0.9).reverse()), '#e8904a', 0.4);
    glint(d, along(b, -0.55, 0.3, 0.8), 2.6, 0.7);
  });
  edge(d, inner, 1.2);
  // Four folds on the pillar, at the back of the mouth.
  for (let k = 0; k < 4; k++) {
    const p = off(b, at(b, 0.26 + k * 0.05), -0.62);
    pen.stroke([p, add(p, pt(8, 2))], 2.4, '#fbe6c4', 0.95, false);
    pen.hair([add(p, pt(0, 1.6)), add(p, pt(8, 3.6))], 0.6, d.ink, 0.6);
  }
  hole(d, b, MOUTH_X.baler, 13, 10, 11);
}
