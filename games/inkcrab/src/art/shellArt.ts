import type { ShellKind } from '../logic/shells';
import type { Pt } from './pen';
import { add, bezier, closed, contact, cub, type Draw, edge, glint, lerp, mottle, oval, pt, ribbon, shade, skin, tint } from './kit';
import { MOUTH_X } from './mouth';
import { PAPER_FILL } from './palette';

/**
 * Shells, natural and trash, each in its own material. All rest on the
 * ground line with the opening low on the right (around x 0..25), where
 * the crab's head comes out (see crabArt.ts).
 */
const DARK = '#2a2228';

/** The dark hole the crab lives in, with a lip. */
function mouth(d: Draw, shape: readonly Pt[], lip = 1.3): void {
  d.pen.fill(shape, DARK, 0.82);
  d.pen.stroke(closed(shape), lip, d.ink, 1, false);
}

// ---------------------------------------------------------------- spiral shells

interface Coil {
  readonly wash: string;
  readonly band: string;
  /** Whorl boundaries along the spine, 0 apex .. 1 mouth. */
  readonly whorls: readonly number[];
  readonly width: number;
  readonly from: Pt;
  readonly to: Pt;
  /** Shoulder knobs (conch). */
  readonly knobs?: boolean;
}

/** A high-spired shell lying on its side: a ribbon along the spine, apex back and up (InkFish's whelk). */
function coiled(d: Draw, c: Coil): { top: Pt[]; bot: Pt[]; shape: Pt[]; spine: Pt[] } {
  const { pen } = d;
  const spine = Array.from({ length: 41 }, (_, i) => lerp(c.from, c.to, i / 40));
  const w = (u: number): number => {
    const k = c.whorls.findIndex((s) => u < s);
    const s0 = k <= 0 ? 0 : c.whorls[k - 1]!;
    const s1 = k < 0 ? 1 : c.whorls[k]!;
    const last = c.whorls[c.whorls.length - 1]!;
    const bulge = u < last ? 0.82 + 0.18 * Math.sin(Math.PI * ((u - s0) / (s1 - s0))) : 1;
    const env = u < 0.62 ? Math.pow(u / 0.62, 0.85) : Math.pow(Math.max(0, 1 - ((u - 0.62) / 0.38) ** 2), 0.8) * 0.88 + 0.12;
    return c.width * env * bulge;
  };
  const r = ribbon(spine, w);
  let top = r.top;
  if (c.knobs) {
    // Blunt knobs on each whorl's shoulder.
    top = top.map((p, i) => {
      const u = i / 40;
      const near = c.whorls.some((s) => Math.abs(u - (s - 0.05)) < 0.025) || (u > 0.3 && u < 0.62 && i % 4 === 0);
      return near ? add(p, pt(-1, -6 * Math.min(1, u * 2))) : p;
    });
  }
  const shape = [...top, ...[...r.bot].reverse()];
  skin(d, shape, c.wash, 0.6);
  pen.clipped(shape, () => {
    for (const v of [0.25, 0.45, 0.7]) pen.stroke(spine.map((p, i) => lerp(p, top[i]!, v)), 2.4, c.band, 0.4, false);
    for (const v of [0.3, 0.6]) pen.stroke(spine.map((p, i) => lerp(p, r.bot[i]!, v)), 2.2, c.band, 0.35, false);
    for (const s of c.whorls) {
      const i = Math.round(s * 40);
      pen.stroke(bezier(top[i]!, add(spine[i]!, pt(6, -2)), r.bot[i]!, 8), 1, d.ink, 0.9, false);
    }
    for (let i = 26; i < 40; i += 2) pen.hair(bezier(top[i]!, add(spine[i]!, pt(3, 0)), r.bot[i]!, 6), 0.45, d.ink, 0.4);
    // Light from above-left: a pale streak along the shoulder.
    glint(d, spine.slice(8, 34).map((p, i) => lerp(p, top[i + 8]!, 0.62)), 2.2, 0.55);
  });
  mottle(d, shape, 240, -40, 30, c.band);
  shade(d, shape, 14);
  edge(d, shape);
  return { top, bot: r.bot, shape, spine };
}

function whelk(d: Draw): void {
  contact(d, -18, 56);
  coiled(d, { wash: '#c69c5c', band: '#7a4a2a', whorls: [0.12, 0.24, 0.38, 0.6], width: 74, from: pt(-78, -30), to: pt(34, 10) });
  mouth(d, oval(MOUTH_X.whelk, 18, 16, 10, 18).map((p) => pt(p.x + (p.y - 18) * -0.4, p.y)));
}

function conch(d: Draw): void {
  contact(d, -20, 64);
  coiled(d, { wash: '#dcb88a', band: '#a0643a', whorls: [0.1, 0.2, 0.32, 0.46, 0.62], width: 86, from: pt(-86, -38), to: pt(30, 8), knobs: true });
  // The flared lip: a wing rising past the shoulder, glossy pink inside.
  const lip = [...cub(pt(-8, -18), pt(4, -40), pt(20, -58), pt(28, -60), 12), ...cub(pt(28, -60), pt(30, -40), pt(42, -14), pt(34, 16), 12).slice(1),
    ...cub(pt(34, 16), pt(28, 34), pt(14, 44), pt(-2, 44), 10).slice(1)];
  skin(d, lip, '#dcb88a', 0.6);
  const inner = [...cub(pt(-2, -14), pt(8, -32), pt(20, -46), pt(24, -48), 10), ...cub(pt(24, -48), pt(28, -30), pt(34, -10), pt(28, 14), 10).slice(1),
    ...cub(pt(28, 14), pt(22, 30), pt(10, 38), pt(-2, 38), 8).slice(1)];
  skin(d, inner, '#ef9f95', 0.8);
  d.pen.clipped(inner, () => {
    tint(d, oval(16, -4, 10, 30), '#f9d2c4', 0.75);
    for (let i = 0; i < 5; i++) d.pen.hair(bezier(pt(2, 30 - i * 14), pt(16, 26 - i * 14), pt(30, 18 - i * 16), 8), 0.5, '#b4645a', 0.45);
  });
  glint(d, cub(pt(8, -30), pt(18, -44), pt(26, -40), pt(28, -20), 10), 1.8, 0.75);
  edge(d, inner, 0.9, 0.7);
  edge(d, lip, 1.6);
  mouth(d, oval(MOUTH_X.conch, 20, 9, 14, 16).map((p) => pt(p.x + (p.y - 20) * -0.3, p.y)), 1.1);
}

/** A low, round shell seen side-on: a coil around (cx, cy). */
function round(d: Draw, o: { cx: number; cy: number; r: number; wash: string; band: string; glaze?: string; bands: number; spire: number }): void {
  const { pen } = d;
  const { cx, cy, r } = o;
  contact(d, cx + 6, r * 1.1);
  const body = oval(cx, cy, r * 1.08, r, 40);
  // A little spire peeking up behind the body whorl.
  const spire = oval(cx - r * 0.45, cy - r * 0.62, r * 0.42, r * 0.38 * o.spire + 1, 20);
  if (o.spire > 0) {
    skin(d, spire, o.wash, 0.55);
    edge(d, spire, 1.2);
  }
  skin(d, body, o.wash, 0.6);
  pen.clipped(body, () => {
    if (o.glaze) tint(d, oval(cx - r * 0.2, cy - r * 0.4, r * 0.9, r * 0.6), o.glaze, 0.35);
    // Spiral bands winding out from the apex to the mouth.
    for (let b = 0; b < o.bands; b++) {
      const pts: Pt[] = [];
      for (let t = 0; t <= 1.0001; t += 0.02) {
        const a = -Math.PI * 0.9 + t * Math.PI * 2.6;
        const rr = r * (0.18 + t * 0.7) + b * r * 0.11;
        pts.push(pt(cx - r * 0.2 + Math.cos(a) * rr * 1.05, cy - r * 0.1 + Math.sin(a) * rr * 0.9));
      }
      pen.stroke(pts, 2.6, o.band, 0.42, false);
    }
    // The suture: the spiral line between whorls.
    const suture: Pt[] = [];
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const a = -Math.PI * 0.9 + t * Math.PI * 2.6;
      const rr = r * (0.12 + t * 0.62);
      suture.push(pt(cx - r * 0.2 + Math.cos(a) * rr * 1.05, cy - r * 0.1 + Math.sin(a) * rr * 0.9));
    }
    pen.stroke(suture, 0.9, d.ink, 0.85, false);
    // Growth lines across the last whorl.
    for (let i = 0; i < 9; i++) {
      const a = -0.2 + i * 0.22;
      pen.hair([pt(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.5), pt(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r)], 0.45, d.ink, 0.35);
    }
    glint(d, bezier(pt(cx - r * 0.75, cy - r * 0.25), pt(cx - r * 0.5, cy - r * 0.8), pt(cx + r * 0.1, cy - r * 0.85), 10), 2.6, 0.6);
  });
  mottle(d, body, 160, cy - r, cy + r * 0.2, o.band, 0.5);
  shade(d, body, cy + r * 0.3);
  edge(d, body, 1.7);
  mouth(d, oval(cx + r * 0.78, cy + r * 0.45, r * 0.3, r * 0.42, 18).map((p) => pt(p.x + (p.y - cy) * -0.15, p.y)));
}

const snail = (d: Draw): void => round(d, { cx: -14, cy: 8, r: 38, wash: '#e0b85e', band: '#5a3a20', bands: 2, spire: 0.6 });
/** The starter: a small, dark, tightly coiled periwinkle, banded grey-green. */
const periwinkle = (d: Draw): void => round(d, { cx: -14, cy: 8, r: 38, wash: '#9aa38c', band: '#34402f', bands: 3, spire: 0.9 });
const moonsnail = (d: Draw): void => round(d, { cx: -18, cy: 2, r: 44, wash: '#e8d8b8', band: '#9a7e9a', glaze: '#b9a6c8', bands: 1, spire: 0.25 });

// ---------------------------------------------------------------- trash shells

/** A cylinder lying on its side, open end facing right. Returns the side shape and the end ellipses. */
function cylinder(x0: number, x1: number, r: number, endRx: number, g: number): { side: Pt[]; back: Pt[]; front: Pt[]; cy: number } {
  const cy = g - r;
  const back = oval(x0, cy, endRx, r, 28);
  const front = oval(x1, cy, endRx, r, 28);
  const arc = (x: number, from: number, to: number): Pt[] => Array.from({ length: 15 }, (_, i) => {
    const a = from + ((to - from) * i) / 14;
    return pt(x + Math.cos(a) * endRx, cy + Math.sin(a) * r);
  });
  const side = [...arc(x0, Math.PI / 2, Math.PI * 1.5), ...arc(x1, -Math.PI / 2, Math.PI / 2)];
  return { side, back, front, cy };
}

function bottlecap(d: Draw): void {
  const { pen } = d;
  contact(d, -14, 44);
  const r = 38;
  const { side, back, front, cy } = cylinder(-34, 4, r, 9, d.g);
  // Crimped skirt: the side's top and bottom edges are fluted.
  skin(d, side, '#d9a93a', 0.75);
  skin(d, back, '#c8952a', 0.8);
  pen.clipped(side, () => {
    for (let x = -34; x < 6; x += 4.2) pen.stroke([pt(x, cy - r - 2), pt(x + 1, cy + r + 2)], 1.6, '#8a6a1a', 0.45, false);
    tint(d, oval(-14, cy + r * 0.6, 26, r * 0.45), '#7a5a10', 0.35);
    glint(d, [pt(-30, cy - r * 0.55), pt(0, cy - r * 0.6)], 3, 0.75);
  });
  edge(d, side, 1.6);
  edge(d, back, 1.2);
  // A blue star printed on the top face.
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? 7 : 16;
    return pt(-34 + Math.cos(a) * rr * 0.35, cy + Math.sin(a) * rr);
  });
  tint(d, star, '#3f5fa8', 0.7);
  // Inside: the cork liner ring, then the dark hollow.
  skin(d, front, '#e8e0c8', 0.6);
  edge(d, front, 1.4);
  mouth(d, oval(MOUTH_X.bottlecap, cy, 6.5, r * 0.8, 24), 1);
}

function can(d: Draw): void {
  const { pen } = d;
  contact(d, -36, 60);
  const r = 40;
  const { side, back, front, cy } = cylinder(-82, 8, r, 11, d.g);
  skin(d, side, '#a7aeb5', 0.7);
  pen.clipped(side, () => {
    // Paper label with a teal band and a white wave.
    const label = [pt(-70, cy - r - 2), pt(-6, cy - r - 2), pt(-6, cy + r + 2), pt(-70, cy + r + 2)];
    pen.fill(label, PAPER_FILL, 1);
    tint(d, label, '#e9e1c9', 0.8);
    tint(d, [pt(-70, cy - 16), pt(-6, cy - 16), pt(-6, cy + 14), pt(-70, cy + 14)], '#3f8f8a', 0.75);
    pen.stroke(Array.from({ length: 13 }, (_, i) => pt(-66 + i * 5, cy - 2 + Math.sin(i * 0.9) * 4)), 2, PAPER_FILL, 0.9, false);
    pen.hair([pt(-70, cy - r), pt(-70, cy + r)], 0.7, d.ink, 0.8);
    pen.hair([pt(-6, cy - r), pt(-6, cy + r)], 0.7, d.ink, 0.8);
    // Ribs pressed into the metal, and rust.
    for (const x of [-78, -74, -2, 2]) pen.hair([pt(x, cy - r), pt(x + 0.5, cy + r)], 0.6, d.ink, 0.5);
    pen.stipple(side, 260, (x, y) => (y > cy + 10 && (x < -60 || x > -20) ? 0.9 : 0.08), 1.1, '#9a5530');
    tint(d, oval(-36, cy + r * 0.75, 50, r * 0.35), '#3a3a48', 0.2);
    glint(d, [pt(-80, cy - r * 0.6), pt(4, cy - r * 0.62)], 3, 0.6);
  });
  shade(d, side, cy + 18, 0.4);
  edge(d, side, 1.7);
  skin(d, back, '#8f979e', 0.7);
  edge(d, back, 1.2);
  // Pull-tab ring on the closed end.
  pen.stroke(closed(oval(-84, cy - 14, 3, 6, 12)), 1, d.ink, 0.9, false);
  // Rolled rim and the dark inside.
  skin(d, front, '#c3c9ce', 0.6);
  edge(d, front, 1.6);
  mouth(d, oval(MOUTH_X.can, cy, 8, r * 0.88, 26), 1);
}

function jar(d: Draw): void {
  const { pen } = d;
  contact(d, -40, 62);
  const r = 44;
  const cy = d.g - r;
  const body = [...cub(pt(-6, cy - r + 6), pt(-6, cy - r), pt(-84, cy - r), pt(-88, cy - r + 10), 10),
    ...cub(pt(-88, cy - r + 10), pt(-94, cy), pt(-94, cy), pt(-88, cy + r - 10), 8).slice(1),
    ...cub(pt(-88, cy + r - 10), pt(-84, cy + r), pt(-6, cy + r), pt(-6, cy + r - 6), 10).slice(1)];
  const neck = [pt(-8, cy - r + 8), pt(12, cy - r + 12), pt(12, cy + r - 12), pt(-8, cy + r - 8)];
  // Glass: a faint aqua glaze over paper, so the sand inside shows.
  for (const s of [body, neck]) {
    pen.fill(s, PAPER_FILL, 1);
    tint(d, s, '#cfe7e1', 0.45);
  }
  pen.clipped(body, () => {
    // A drift of sand inside, and an old label.
    const drift = [pt(-96, cy + r), ...cub(pt(-96, cy + 18), pt(-60, cy + 22), pt(-30, cy + 30), pt(0, cy + 26), 12), pt(0, cy + r)];
    tint(d, drift, '#e2cc98', 0.85);
    pen.stipple(drift, 200, () => 0.6, 0.5, '#6b5a3c');
    const label = [pt(-70, cy - 22), pt(-24, cy - 24), pt(-22, cy + 12), pt(-68, cy + 14)];
    tint(d, label, '#f4ecd6', 0.9);
    tint(d, oval(-46, cy - 6, 12, 10), '#8fae6a', 0.75);
    pen.hair(closed(label), 0.6, d.ink, 0.6);
    glint(d, cub(pt(-84, cy - 20), pt(-80, cy - 36), pt(-50, cy - 38), pt(-20, cy - 36), 10), 3.2, 0.9);
    glint(d, [pt(-80, cy + 8), pt(-78, cy - 6)], 2, 0.8);
  });
  edge(d, body, 1.5);
  for (let y = cy - r + 14; y < cy + r - 12; y += 7) pen.hair([pt(-2, y), pt(10, y + 3)], 0.7, d.ink, 0.6);
  edge(d, neck, 1.3);
  mouth(d, oval(MOUTH_X.jar, cy, 6, r * 0.62, 22), 1.2);
}

function bulb(d: Draw): void {
  const { pen } = d;
  contact(d, -32, 52);
  const cy = d.g - 38;
  const globe = [...oval(-44, cy, 40, 38, 40).filter((p) => p.x < -12), ...cub(pt(-14, cy + 30), pt(-8, cy + 22), pt(-6, cy + 16), pt(-4, cy + 14), 6), pt(-4, cy - 14), ...cub(pt(-4, cy - 14), pt(-6, cy - 16), pt(-8, cy - 22), pt(-14, cy - 30), 6)];
  const ring = oval(-44, cy, 40, 38, 40);
  pen.fill(ring, PAPER_FILL, 1);
  tint(d, ring, '#e2eef2', 0.6);
  pen.clipped(ring, () => {
    // The filament on its two wires, and a warm tinge round it.
    tint(d, oval(-46, cy - 4, 16, 12), '#f6d76a', 0.35);
    pen.hair([pt(-6, cy - 6), pt(-38, cy - 10)], 0.6, d.ink, 0.8);
    pen.hair([pt(-6, cy + 6), pt(-38, cy + 2)], 0.6, d.ink, 0.8);
    pen.hair(Array.from({ length: 9 }, (_, i) => pt(-38 - i * 2.4, cy - 10 + (i % 2 ? 6 : 0) + i * 1.4)), 0.7, '#8a4520', 0.9);
    glint(d, cub(pt(-74, cy - 6), pt(-72, cy - 28), pt(-56, cy - 34), pt(-38, cy - 34), 10), 3.6, 0.95);
    glint(d, [pt(-70, cy + 12), pt(-66, cy + 20)], 2, 0.8);
  });
  edge(d, globe, 1.4);
  // Brass screw base, broken open at the end.
  const base = [pt(-8, cy - 16), pt(16, cy - 16), pt(16, cy + 16), pt(-8, cy + 16)];
  skin(d, base, '#c49a3e', 0.8);
  pen.clipped(base, () => {
    for (let x = -6; x < 16; x += 4.4) pen.stroke(bezier(pt(x, cy - 17), pt(x + 3, cy), pt(x, cy + 17), 6), 1.6, '#7a5a18', 0.6, false);
    glint(d, [pt(-8, cy - 9), pt(16, cy - 9)], 2.2, 0.7);
  });
  edge(d, base, 1.4);
  mouth(d, oval(MOUTH_X.bulb, cy, 5, 14, 18), 1.1);
}

function coconut(d: Draw): void {
  const { pen } = d;
  contact(d, -22, 62);
  const cy = d.g - 44;
  // The outer husk: a dome with its cut face turned to the right.
  const husk = [...cub(pt(16, cy - 40), pt(-20, cy - 64), pt(-84, cy - 40), pt(-84, cy + 4), 16),
    ...cub(pt(-84, cy + 4), pt(-84, cy + 40), pt(-30, cy + 48), pt(4, cy + 42), 12).slice(1)];
  skin(d, husk, '#8a5a30', 0.85);
  pen.clipped(husk, () => {
    for (let i = 0; i < 70; i++) {
      const x = -84 + pen.rng() * 100;
      const y = cy - 50 + pen.rng() * 96;
      const a = 0.9 + pen.rng() * 0.5;
      pen.hair([pt(x, y), pt(x + Math.cos(a) * 7, y + Math.sin(a) * 7)], 0.6, '#3a2210', 0.6);
    }
    tint(d, oval(-34, cy + 30, 50, 18), '#3a2210', 0.3);
  });
  shade(d, husk, cy + 10, 0.4, true);
  edge(d, husk, 1.8);
  // The cut face: a white rim of flesh around the dark hollow.
  const face = oval(4, cy + 1, 13, 42, 30);
  skin(d, face, '#f3ecd8', 0.5);
  edge(d, face, 1.5);
  mouth(d, oval(MOUTH_X.coconut, cy + 2, 8, 34, 26), 1.1);
}

const DRAW: Readonly<Record<ShellKind, (d: Draw) => void>> = {
  periwinkle, bottlecap, snail, bulb, can, whelk, moonsnail, jar, coconut, conch,
};

export function drawShell(d: Draw, kind: ShellKind): void {
  DRAW[kind](d);
}
