import { add, bezier, closed, contact, type Draw, edge, glint, lerp, mottle, oval, pt, shade, skin, tint, tube } from '../kit';
import { MOUTH_X } from '../mouth';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { DARK, leaning, mouth, tilted } from './common';
import { across, along, at, type Body, below, body, off, settle, swell, tangent, whorlAt } from './spire';

/**
 * Monsoon Harbour (beach 8): Indian Ocean shells off the Malabar coast, the
 * kind sold in heaps on the harbour wall. Like the other shells they rest on
 * the ground line, apex back, with the opening low on the right at MOUTH_X
 * (see shellArt.ts). Told apart by outline: the auger a long thin needle,
 * the babylon a plump egg with a stepped spire, the cone a wedge with a flat
 * top, the spider conch a fan of curved fingers, the volute a big orange ball
 * with its crown sunk in.
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

/** A patch on the shell from (u, v) spanning du along it and dv across it, following its curve. */
function patch(b: Body, u: number, v: number, du: number, dv: number): Pt[] {
  const i0 = at(b, u);
  const i1 = Math.max(i0 + 1, at(b, u + du));
  return [off(b, i0, v - dv), off(b, i1, v - dv), off(b, i1, v + dv), off(b, i0, v + dv)];
}

// ---------------------------------------------------------------- the shells

/** An auger (Terebra subulata): a very long, thin, straight-sided needle of many flat whorls, glossy cream with rows of squarish dark-brown spots, a small notched mouth. */
export function auger(d: Draw): void {
  const { pen } = d;
  contact(d, -46, 76);
  const W = 40;
  // Twelve flat whorls, each a little taller than the one behind it, then the short body whorl.
  const sutures = Array.from({ length: 12 }, (_, k) => 0.8 * Math.pow((k + 1) / 12, 1.25));
  const w = (u: number): number => {
    if (u < 0.8) return W * 0.86 * Math.pow(u / 0.8, 0.98) * swell(u, sutures, 0.05);
    const t = (u - 0.8) / 0.2;
    if (t < 0.35) return W * (0.86 + 0.14 * Math.sin(((t / 0.35) * Math.PI) / 2));
    return W * (0.32 + 0.68 * Math.pow(Math.cos((((t - 0.35) / 0.65) * Math.PI) / 2), 0.8));
  };
  const b = settle((dy) => body(pt(-130, -34 + dy), pt(34, 12 + dy), w, 150), d.g);
  skin(d, b.shape, '#efe2c4', 0.75);
  pen.clipped(b.shape, () => {
    tint(d, along(b, 0.9, 0, 0.1).concat(along(b, -0.9, 0, 0.1).reverse()), '#c8a478', 0.5);
    // Each whorl: a narrow band behind its groove, then the squarish spots, one row on the band and one on the whorl, four on the body whorl.
    sutures.forEach((s1, k) => {
      const s0 = k === 0 ? 0.01 : sutures[k - 1]!;
      const h = s1 - s0;
      pen.hair(across(b, at(b, s0 + h * 0.3), 1.5), 0.6, '#6a4a2e', 0.55);
      if (k < 2) return;
      [s0 + h * 0.06, s0 + h * 0.5].forEach((u, r) => {
        for (let j = 0; j < 4; j++) {
          const v = -0.72 + j * 0.48 + (r ? 0.24 : 0);
          if (v < 0.9) tint(d, patch(b, u, v, h * (r ? 0.32 : 0.2), 0.11), '#5a321c', 0.75);
        }
      });
    });
    for (const u of [0.83, 0.88, 0.93]) {
      for (let j = 0; j < 5; j++) tint(d, patch(b, u, -0.8 + j * 0.4 + (u > 0.85 && u < 0.9 ? 0.2 : 0), 0.025, 0.1), '#5a321c', 0.7);
    }
    for (const s of sutures) pen.stroke(across(b, at(b, s), 1.5), 1, d.ink, 0.85, false);
    glint(d, along(b, 0.55, 0.1, 0.9), 1.8, 0.75);
  });
  mottle(d, b.shape, 40, -40, 40, '#5a321c', 0.4);
  shade(d, b.shape, 0.4);
  edge(d, b.shape, 1.5);
  // The small mouth near the front, brown inside, and the short notch of its canal.
  const inner = aperture(d, b, [0.82, 0.99], 0.5, '#e6cfaa');
  pen.clipped(inner, () => tint(d, along(b, -0.6, 0.84, 0.95).concat(along(b, -0.85, 0.84, 0.95).reverse()), '#8a5a34', 0.5));
  edge(d, inner, 1);
  pen.stroke(along(b, -0.5, 0.95, 1), 1.8, DARK, 0.8, false);
  hole(d, b, MOUTH_X.auger, 9, 6, 7);
}

/** A spiral babylon (Babylonia spirata): a plump, glossy egg with a short stepped spire, each whorl's shoulder cut off by a deep channel, white blotched rich orange-brown, a white mouth and a deep navel. */
export function babylon(d: Draw): void {
  const { pen } = d;
  contact(d, -16, 64);
  const W = 100;
  const sutures = [0.08, 0.16, 0.25, 0.35];
  // Every whorl steps in at its channelled suture, then shoulders out and runs straight.
  const step = (t: number): number => 0.8 + 0.2 * Math.sin((Math.min(1, t / 0.28) * Math.PI) / 2);
  const w = (u: number): number => {
    if (u < 0.35) return W * 0.64 * Math.pow(u / 0.35, 0.85) * step(whorlAt(u, sutures, 0.35).t);
    const t = (u - 0.35) / 0.65;
    return W * (0.1 + 0.9 * Math.sqrt(Math.max(0, 1 - ((t - 0.4) / 0.6) ** 2))) * (0.88 + 0.12 * Math.min(1, t / 0.07));
  };
  const b = settle((dy) => body(pt(-94, -42 + dy), pt(46, 22 + dy), w, 120), d.g);
  skin(d, b.shape, '#f6f0e4', 0.85);
  pen.clipped(b.shape, () => {
    // Rounded orange-brown blotches in spiral rows, bigger and bolder on the body whorl, a few run together into flames.
    const blot = (u: number, v: number, s: number): void => {
      const p = off(b, at(b, u), v);
      const a = Math.atan2(tangent(b, at(b, u)).y, tangent(b, at(b, u)).x) + pen.jitter(0.4);
      tint(d, tilted(p.x, p.y, s * (1.1 + pen.rng() * 0.6), s * (0.7 + pen.rng() * 0.3), a, 12), pen.rng() < 0.3 ? '#8a3c18' : '#c0642a', 0.7 + pen.rng() * 0.2);
    };
    sutures.slice(1).forEach((s1, k) => {
      const s0 = sutures[k]!;
      for (const v of [-0.55, 0, 0.55]) blot(s0 + (s1 - s0) * 0.62, v + pen.jitter(0.1), 2 + 18 * s0);
    });
    for (const [v, n] of [[0.72, 7], [0.32, 8], [-0.1, 8], [-0.5, 7]] as const) {
      for (let j = 0; j < n; j++) blot(0.39 + (0.5 * (j + pen.rng() * 0.5)) / n, v + pen.jitter(0.08), 3.6 + pen.rng() * 3);
    }
    // The channels: a dark groove along each suture with a pale shelf just in front of it.
    for (const s of sutures) {
      pen.stroke(across(b, at(b, s + 0.012), 3), 2.4, PAPER_FILL, 0.85, false);
      pen.stroke(across(b, at(b, s), 3), 1.5, d.ink, 0.95, false);
    }
    for (let i = at(b, 0.38); i < at(b, 0.95); i += 8) pen.hair(across(b, i, 4), 0.45, d.ink, 0.1);
    glint(d, along(b, 0.6, 0.38, 0.82), 3, 0.85);
    glint(d, along(b, 0.3, 0.12, 0.3), 1.6, 0.6);
  });
  mottle(d, b.shape, 40, -50, 30, '#8a3c18', 0.4);
  shade(d, b.shape, 0.4);
  edge(d, b.shape, 1.7);
  // The navel: a deep slit behind the mouth, edged by an orange-brown keel; then the white mouth.
  const x = MOUTH_X.babylon;
  const ny = below(b, x - 22) - 9;
  const navel = bezier(pt(x - 30, ny - 4), pt(x - 24, ny + 4), pt(x - 14, ny + 4), 8);
  pen.stroke(navel.map((p) => add(p, pt(0, -2.6))), 2.4, '#b0582a', 0.8, false);
  pen.stroke(navel, 3.2, DARK, 0.9, false);
  const inner = aperture(d, b, [0.56, 0.97], 0.45, '#fbf6ec');
  pen.clipped(inner, () => glint(d, along(b, -0.6, 0.56, 0.8), 2, 0.7));
  edge(d, inner, 1.1);
  pen.stroke(along(b, -0.55, 0.92, 1), 2, DARK, 0.75, false);
  hole(d, b, x, 11, 8);
}

/** A textile cone (Conus textile): a glossy wedge, a low flat-topped spire on a sharp shoulder tapering to the front, white tents netted in brown, crossed by three darker bands streaked gold, a long slit of a mouth. */
export function cone(d: Draw): void {
  const { pen } = d;
  contact(d, -16, 72);
  const W = 100;
  const SHOULDER = 0.15;
  const w = (u: number): number => {
    if (u < SHOULDER) return W * 0.9 * Math.pow(u / SHOULDER, 0.75);
    if (u < 0.2) return W * (0.9 + 0.1 * Math.sin((((u - SHOULDER) / 0.05) * Math.PI) / 2));
    return W * (1 - 0.93 * Math.pow((u - 0.2) / 0.8, 1.2));
  };
  const b = settle((dy) => body(pt(-104, -34 + dy), pt(68, 30 + dy), w, 140), d.g);
  skin(d, b.shape, '#f4ead4', 0.8);
  pen.clipped(b.shape, () => {
    // The brown net under everything, three darker bands across it.
    tint(d, b.shape, '#8a5428', 0.5);
    const BANDS = [[0.28, 0.36], [0.52, 0.6], [0.76, 0.84]] as const;
    for (const [u0, u1] of BANDS) {
      tint(d, along(b, 1, u0, u1).concat(along(b, -1, u0, u1).reverse()), '#4a2412', 0.45);
      for (let v = -0.9; v < 0.95; v += 0.12) pen.hair(along(b, v + pen.jitter(0.03), u0 + 0.01, u1 - 0.01), 0.9, '#e0b040', 0.6);
    }
    // The tents: white triangles packed over the net, pointing back towards the spire, sparse in the bands.
    const inBand = (u: number): boolean => BANDS.some(([u0, u1]) => u > u0 && u < u1);
    for (let k = 0; k < 560; k++) {
      const u = 0.02 + pen.rng() * 0.93;
      if (inBand(u) && pen.rng() < 0.85) continue;
      const v = -0.95 + pen.rng() * 1.9;
      const du = (0.007 + pen.rng() * 0.02) * (u < SHOULDER ? 0.5 : 1);
      const dv = 0.035 + pen.rng() * 0.06;
      const tent = [off(b, at(b, u), v), off(b, at(b, u + du * 2), v - dv), off(b, at(b, u + du * 2), v + dv)];
      tint(d, tent, '#fbf4e2', 0.95);
      pen.hair(closed(tent), 0.5, '#4a2412', 0.45);
    }
    // The flat spire: its sutures close together, and the sharp shoulder.
    for (const s of [0.04, 0.08, 0.12]) pen.stroke(across(b, at(b, s), 1), 1, d.ink, 0.8, false);
    pen.stroke(across(b, at(b, SHOULDER + 0.02), 2), 1.3, d.ink, 0.6, false);
    glint(d, along(b, 0.6, 0.2, 0.86), 3.2, 0.85);
    glint(d, along(b, 0.32, 0.4, 0.7), 1.4, 0.55);
  });
  shade(d, b.shape, 0.42);
  edge(d, b.shape, 1.7);
  // The long, narrow mouth along the whole underside, pale lilac inside.
  const inner = aperture(d, b, [0.22, 0.98], 0.32, '#e8dcec');
  pen.clipped(inner, () => glint(d, along(b, -0.82, 0.3, 0.7), 1.4, 0.7));
  edge(d, inner, 1);
  hole(d, b, MOUTH_X.cone, 11, 7, 7);
}

/** One of a spider conch's fingers: a long spine from `root` out along `ang`, curling `curl` upwards at its tip, banded brown, its open groove showing the lip's colour. */
function finger(d: Draw, root: Pt, ang: number, len: number, curl: number, w: number): void {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const tip = add(root, pt(dir.x * len, dir.y * len - curl));
  const line = bezier(root, add(root, pt(dir.x * len * 0.7, dir.y * len * 0.7)), tip, 12);
  const shape = tube(line, w, 1.8);
  skin(d, shape, '#e6d4b2', 0.8);
  d.pen.clipped(shape, () => {
    for (const t of [0.45, 0.62, 0.78]) tint(d, oval(line[Math.round(t * 12)]!.x, line[Math.round(t * 12)]!.y, w * 0.45, w * 0.45, 8), '#7a4a2a', 0.5);
    d.pen.stroke(line.slice(2, 11).map((p) => add(p, pt(dir.y * w * 0.18, -dir.x * w * 0.18))), w * 0.22, '#e8907a', 0.8, false);
  });
  shade(d, shape, 0.35);
  edge(d, shape, 1.2);
}

/** A spider conch (Lambis lambis): a heavy humped body with a short spire and knobbed shoulder, six long curved fingers reaching out from its flared lip, cream mottled brown outside, glossy pink-orange and finely lined within. */
export function spiderconch(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -14, 82);
  const W = 98;
  const sutures = [0.07, 0.14, 0.22, 0.3];
  const w = (u: number): number => {
    if (u < 0.3) return W * 0.46 * Math.pow(u / 0.3, 0.9) * swell(u, sutures, 0.12);
    if (u < 0.42) return W * (0.46 + 0.54 * Math.sin((((u - 0.3) / 0.12) * Math.PI) / 2));
    return W * (0.2 + 0.8 * Math.pow(Math.cos((((u - 0.42) / 0.58) * Math.PI) / 2), 1.1));
  };
  // A few blunt knobs on the spire, three big ones on the hump of the shoulder.
  const knob = (u: number): number => {
    if (u < 0.3) return (0.3 + 6 * u) * Math.exp(-(((whorlAt(u, sutures, 0.3).t - 0.6) / 0.18) ** 2));
    return u < 0.66 ? 10 * Math.max(0, Math.sin(((u - 0.34) / 0.32) * Math.PI * 3)) ** 3 : 0;
  };
  const b = settle((dy) => body(pt(-112, -40 + dy), pt(40, 20 + dy), w, 120, knob), d.g);
  // The fingers, rooted inside the body so its outline cuts across them: one back along the spire, four off the lip, the long canal in front.
  const FINGERS = [[0.3, -2.8, 62, 20, 9], [0.52, -1.95, 46, 10, 10], [0.66, -1.5, 50, 8, 10], [0.8, -1.05, 50, 12, 10], [0.92, -0.6, 50, 16, 10], [1, -0.12, 60, 24, 11]] as const;
  for (const [u, ang, len, curl, fw] of FINGERS) finger(d, off(b, at(b, u), u < 1 ? 0.7 : 0), ang, len, curl, fw);
  skin(d, b.shape, '#e2d0ae', 0.75);
  pen.clipped(b.shape, () => {
    for (let k = 0; k < 22; k++) tint(d, patch(b, 0.05 + pen.rng() * 0.9, pen.rng() * 1.6 - 0.8, 0.02 + pen.rng() * 0.05, 0.06 + pen.rng() * 0.1), '#7a4a2a', 0.45);
    for (let v = -0.8; v < 0.85; v += 0.2) pen.hair(along(b, v, 0.02, 0.97), 0.6, '#5a3a20', 0.35);
    for (const s of sutures) pen.stroke(across(b, at(b, s), 3), 1.2, d.ink, 0.9, false);
    glint(d, along(b, 0.6, 0.32, 0.7), 2.2, 0.5);
  });
  mottle(d, b.shape, 100, -60, 30, '#5a3a20', 0.5);
  shade(d, b.shape, 0.45);
  edge(d, b.shape, 1.7);
  // The flared lip along the front of the underside: its glossy pink-orange face, finely lined, round the mouth.
  const x = MOUTH_X.spiderconch;
  const lip = [...bezier(pt(x - 50, g - 1), pt(x - 26, g - 52), pt(x + 26, g - 44), 14), ...bezier(pt(x + 26, g - 44), pt(x + 50, g - 38), pt(x + 46, g - 6), 8).slice(1), pt(x + 36, g - 1)];
  skin(d, lip, '#f0a07a', 0.8);
  pen.clipped(lip, () => {
    tint(d, oval(x - 6, g - 14, 30, 18), '#f8d0c2', 0.6);
    for (let i = 0; i < 11; i++) {
      const a = -2.9 + i * 0.27;
      pen.hair([pt(x + Math.cos(a) * 14, g - 18 + Math.sin(a) * 18), pt(x + Math.cos(a) * 40, g - 18 + Math.sin(a) * 40)], 0.6, '#9a4a5a', 0.45);
    }
    glint(d, bezier(pt(x - 34, g - 14), pt(x - 16, g - 42), pt(x + 24, g - 38), 10), 2.4, 0.75);
  });
  edge(d, lip, 1.5);
  mouth(d, tilted(x, g - 16, 9, 13, 0.25, 18), 1.1);
}

/** An Indian volute (Melo melo): a big smooth glossy ball, orange-tan with faint darker bands, its crown sunk into the top and lightly coronated, a huge glossy mouth down its front with folds on its pillar. */
export function volute(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const rx = 66;
  const ry = 56;
  const cx = -30;
  const cy = g - ry - 1;
  contact(d, cx + 8, rx * 1.05);
  // The coil's axis leans up and back; the crown is its sunken top end.
  const ax = pt(-0.6, -0.8);
  const side = pt(0.8, -0.6);
  const ball = oval(cx, cy, rx, ry, 64);
  const crown = pt(cx + ax.x * rx * 0.62, cy + ax.y * ry * 0.7);
  skin(d, ball, '#e8964a', 0.8);
  pen.clipped(ball, () => {
    tint(d, oval(cx - rx * 0.25, cy - ry * 0.4, rx * 0.75, ry * 0.5), '#f6c486', 0.5);
    // Faint darker spiral bands round the ball, across its axis, bowed towards us.
    const ring = (t: number): Pt[] => Array.from({ length: 25 }, (_, i) => {
      const s = -1.3 + (2.6 * i) / 24;
      const bow = (1 - s * s * 0.6) * 10;
      return pt(cx + ax.x * t * rx + side.x * s * rx - ax.x * bow, cy + ax.y * t * ry + side.y * s * ry - ax.y * bow);
    });
    for (const [t, alpha] of [[0.12, 0.3], [-0.38, 0.35], [-0.72, 0.22]] as const) {
      tint(d, [...ring(t), ...ring(t - 0.16).reverse()], '#a8522a', alpha);
    }
    // Growth lines sweeping down from the crown, and the high polish.
    for (let k = 0; k < 9; k++) {
      const f = -0.9 + k * 0.22;
      const a = add(crown, pt(side.x * 30 * f, side.y * 30 * f));
      pen.hair(bezier(a, pt(a.x + 30 - f * 10, a.y + 40), pt(a.x + 50 + f * 30, a.y + 100), 10), 0.45, '#7a3a1a', 0.22);
    }
    glint(d, bezier(pt(cx - rx * 0.8, cy + ry * 0.1), pt(cx - rx * 0.7, cy - ry * 0.75), pt(cx + rx * 0.1, cy - ry * 0.88), 12), 3.6, 0.85);
    pen.fill(oval(cx - rx * 0.5, cy - ry * 0.5, 3.4, 2.4, 8), PAPER_FILL, 0.95);
  });
  mottle(d, ball, 60, cy - ry, cy + ry * 0.3, '#7a3a1a', 0.45);
  shade(d, ball, 0.45);
  edge(d, ball, 1.8);
  crownOf(d, crown, Math.atan2(side.y, side.x), ax);
  // The huge mouth runs down the whole front: the glossy inside showing between the thin outer lip (the ball's edge) and the pillar.
  const rim = (a: number): Pt => pt(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  const outer = Array.from({ length: 25 }, (_, i) => rim(-1.05 + (2.55 * i) / 24));
  const pillar = bezier(rim(1.5), pt(cx + rx * 0.3, cy + ry * 0.1), rim(-1.05), 16);
  const throat = [...outer, ...pillar.slice(1, -1)];
  skin(d, throat, '#f8d4a0', 0.85);
  pen.clipped(throat, () => {
    tint(d, oval(cx + rx * 0.62, cy + ry * 0.35, 18, 30), '#e89a5a', 0.4);
    glint(d, outer.slice(4, 18).map((p) => add(p, pt(-5, 0))), 2.6, 0.75);
  });
  edge(d, throat, 1.2);
  pen.stroke(outer, 2, d.ink, 1, false);
  const x = MOUTH_X.volute;
  const my = cy + ry * 0.42;
  mouth(d, oval(x, my, 12, 21, 22).map(leaning(my, -0.2)), 1.1);
  // Three folds on the pillar, low down at the back of the mouth.
  for (const k of [0, 1, 2]) {
    const p = pillar[3 + k * 2]!;
    pen.stroke([p, add(p, pt(7, -2))], 2.4, '#fbe6c4', 0.95, false);
    pen.hair([add(p, pt(0, 1.6)), add(p, pt(7, -0.4))], 0.6, d.ink, 0.6);
  }
}

/** The volute's sunken crown at `c`: a shallow dish across the axis with the tiny smooth tip in its middle, low points round its far rim. */
function crownOf(d: Draw, c: Pt, tilt: number, ax: Pt): void {
  const dish = tilted(c.x, c.y, 26, 8, tilt, 28);
  skin(d, dish, '#f2c08a', 0.8);
  d.pen.clipped(dish, () => tint(d, tilted(c.x + 2, c.y - 2, 22, 5, tilt), '#a8582a', 0.35));
  edge(d, dish, 1.2);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + 0.35 + k * 0.6;
    const p = add(c, pt(Math.cos(a) * 26 * Math.cos(tilt) - Math.sin(a) * 8 * Math.sin(tilt), Math.cos(a) * 26 * Math.sin(tilt) + Math.sin(a) * 8 * Math.cos(tilt)));
    const point = [add(p, pt(-3, 1)), add(p, pt(ax.x * 5, ax.y * 5)), add(p, pt(3, -1))];
    skin(d, point, '#e8a060', 0.8);
    d.pen.stroke(point, 1, d.ink, 0.9, false);
  }
  d.pen.fill(oval(c.x, c.y + 1, 3.4, 2.4, 10), '#f8dcb4', 1);
  d.pen.stroke(closed(oval(c.x, c.y + 1, 3.4, 2.4, 10)), 0.8, d.ink, 0.8, false);
}
