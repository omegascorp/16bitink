import type { ShellKind } from '../logic/shells';
import type { Pt } from './pen';
import { add, bezier, closed, contact, cub, type Draw, edge, glint, lerp, mottle, normals, oval, pt, ribbon, shade, skin, tint, tube } from './kit';
import { MOUTH_X } from './mouth';
import { PAPER_FILL } from './palette';
import { DARK, mouth, tilted } from './shells/common';
import { bonnet, drupe, harp, hornshell, spindle } from './shells/basalt';
import { blackturban, kellets, kelpsnail, oregontriton, wavyturban } from './shells/kelp';
import { mangrovewinkle, mudcreeper, mudwhelk, rivernerite, telescope } from './shells/mangrove';

/**
 * Sea and land snail shells, each with its own silhouette and colours. All
 * rest on the ground line with the opening low on the right (around
 * x 0..25), where the crab's head comes out (see crabArt.ts). Each beach
 * from Mangrove Margins on keeps its shells in its own file under shells/.
 */

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
  shade(d, shape);
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

/** A frond: a curved, frilled spine standing off a murex's varix. */
function frond(d: Draw, base: Pt, tip: Pt, w: number): void {
  const mid = add(lerp(base, tip, 0.5), pt((tip.y - base.y) * 0.18, (base.x - tip.x) * 0.18));
  const ribs = bezier(base, mid, tip, 8);
  const shape = tube(ribs, w, 0.8);
  skin(d, shape, '#dcbf94', 0.75);
  d.pen.clipped(shape, () => d.pen.stroke(ribs, w * 0.35, '#9a4a24', 0.5, false));
  edge(d, shape, 1);
  // Frills: little barbs along the outer side.
  for (const t of [0.35, 0.6, 0.82]) {
    const i = Math.round(t * 8);
    const p = ribs[i]!;
    const q = ribs[Math.min(8, i + 1)]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    d.pen.hair([p, add(p, pt(dx * 0.6 + dy * 0.9, dy * 0.6 - dx * 0.9))], 0.9, d.ink, 0.85);
  }
}

/** A murex: a short spire, rows of fronds on its varices, a long siphonal canal reaching forward over the mouth. */
function murex(d: Draw): void {
  const { pen } = d;
  // The canal: a long tapering spout from the front, above the mouth.
  const canal = tube(bezier(pt(6, -2), pt(30, -8), pt(56, -26), 8), 15, 3);
  skin(d, canal, '#e8d6b4', 0.7);
  pen.clipped(canal, () => pen.stroke(bezier(pt(8, 2), pt(32, -4), pt(56, -24), 8), 2.4, '#9a4a24', 0.45, false));
  edge(d, canal, 1.3);
  const { top, bot, spine } = coiled(d, { wash: '#e8d6b4', band: '#9a4a24', whorls: [0.14, 0.28, 0.44], width: 70, from: pt(-76, -24), to: pt(24, 8) });
  // Varices: thick rust ridges across the shell, each crowned with a fan of fronds.
  for (const [u, len] of [[0.3, 13], [0.5, 20], [0.7, 22]] as const) {
    const i = Math.round(u * 40);
    pen.stroke(bezier(top[i]!, add(spine[i]!, pt(8, -2)), bot[i]!, 10), 3.4, '#9a4a24', 0.6, false);
    pen.stroke(bezier(top[i]!, add(spine[i]!, pt(9, -2)), bot[i]!, 10), 1.1, d.ink, 0.85, false);
    for (const lean of [-0.55, 0, 0.5]) {
      const b = top[i + Math.round(lean * 2)]!;
      frond(d, add(b, pt(0, 3)), add(b, pt(lean * len * 0.8 + len * 0.25, -len * (1 - Math.abs(lean) * 0.3))), len * 0.32);
    }
  }
  // Two more on the canal.
  for (const t of [0.35, 0.65]) {
    const b = lerp(pt(14, -12), pt(48, -28), t);
    frond(d, b, add(b, pt(6, -12)), 4);
  }
  mouth(d, oval(MOUTH_X.murex, 20, 9, 15, 18).map((p) => pt(p.x + (p.y - 20) * -0.35, p.y)));
}

/** A helmet shell: a great domed body whorl checkered brown, a low stepped spire, and a thick glossy lip flaring round the mouth. */
function helmet(d: Draw): void {
  const { pen } = d;
  contact(d, -22, 66);
  // The low spire: flat whorls stepping up at the back.
  for (const s of [tilted(-76, -42, 9, 5, -0.35), tilted(-68, -36, 18, 9, -0.35)]) {
    skin(d, s, '#e9dcc0', 0.6);
    pen.clipped(s, () => tint(d, oval(-72, -40, 5, 3), '#8a4a26', 0.5));
    edge(d, s, 1.2);
  }
  const body = [...cub(pt(-80, -18), pt(-74, -48), pt(-10, -56), pt(16, -30), 16), ...cub(pt(16, -30), pt(36, -10), pt(36, 34), pt(20, 46), 14).slice(1),
    ...cub(pt(20, 46), pt(-20, 48), pt(-74, 46), pt(-84, 22), 14).slice(1), ...cub(pt(-84, 22), pt(-90, 6), pt(-86, -6), pt(-80, -18), 8).slice(1)];
  skin(d, body, '#eadcc0', 0.65);
  pen.clipped(body, () => {
    // Spiral bands of brown blotches, checkered: each band follows the dome down towards the mouth.
    const crown = cub(pt(-90, 0), pt(-80, -52), pt(0, -60), pt(40, -12), 24);
    for (let row = 0; row < 5; row++) {
      const band = crown.map((p) => lerp(p, pt(-26, 60), 0.1 + row * 0.15));
      pen.hair(band.map((p) => add(p, pt(0, 6))), 0.5, d.ink, 0.3);
      for (let i = row % 2; i < band.length - 1; i += 2) {
        const p = band[i]!;
        const q = band[i + 1]!;
        const s = 3 + pen.rng() * 2;
        tint(d, [p, q, add(q, pt(pen.jitter(1), s + 2)), add(p, pt(pen.jitter(1), s + 2))], '#8a4a26', 0.55 + pen.rng() * 0.2);
      }
    }
    // Blunt knobs on the shoulder, and the body's sheen.
    for (let i = 0; i < 5; i++) tint(d, oval(-58 + i * 14, -38 + i * 2, 4, 3), PAPER_FILL, 0.6);
    glint(d, cub(pt(-74, -12), pt(-70, -38), pt(-40, -48), pt(-14, -46), 10), 3, 0.7);
  });
  mottle(d, body, 120, -50, 0, '#8a4a26', 0.5);
  shade(d, body, 0.5);
  edge(d, body, 1.8);
  // The thick outer lip, rolled round the front, and the glossy shield spread back along the base.
  const lip = [...cub(pt(6, -30), pt(22, -34), pt(37, -14), pt(37, 12), 12), ...cub(pt(37, 12), pt(37, 32), pt(30, 46), pt(18, 46), 10).slice(1),
    ...cub(pt(18, 46), pt(-6, 46), pt(-40, 46), pt(-56, 44), 10).slice(1), ...cub(pt(-56, 44), pt(-40, 34), pt(-10, 34), pt(0, 22), 10).slice(1),
    ...cub(pt(0, 22), pt(10, 6), pt(8, -14), pt(4, -30), 10).slice(1)];
  skin(d, lip, '#f1c9a6', 0.7);
  pen.clipped(lip, () => {
    tint(d, oval(26, 4, 9, 30), '#fbe6d0', 0.75);
    for (let i = 0; i < 4; i++) tint(d, oval(32 - i * 1, -14 + i * 14, 3, 4), '#8a4a26', 0.5);
    glint(d, cub(pt(12, -28), pt(26, -30), pt(36, -14), pt(36, 6), 10), 2.4, 0.85);
  });
  edge(d, lip, 1.6);
  // Teeth along the inner edge of the lip.
  for (let i = 0; i < 6; i++) pen.hair([pt(MOUTH_X.helmet + 7 - i * 1.6, 16 + i * 5), pt(MOUTH_X.helmet + 12 - i * 1.6, 15 + i * 5)], 1, d.ink, 0.8);
  mouth(d, oval(MOUTH_X.helmet, 28, 8, 16, 18).map((p) => pt(p.x + (p.y - 28) * -0.3, p.y)), 1.1);
}

interface Round {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly wash: string;
  readonly band: string;
  readonly glaze?: string;
  readonly bands: number;
  readonly spire: number;
  readonly growth?: number;
  /** Size of the opening (1 = a periwinkle's), its bottom kept in place. */
  readonly gape?: number;
  /** A pale rim round the opening. */
  readonly lip?: string;
  /** A row of dots just below the suture (necklace shell). */
  readonly dots?: string;
}

/** Where `round` puts its opening, centre and radii, before the lean. */
function roundMouth(o: Round): { x: number; y: number; rx: number; ry: number } {
  const k = o.gape ?? 1;
  return { x: o.cx + o.r * 0.78, y: o.cy + o.r * (0.87 - 0.42 * k), rx: o.r * 0.3 * k, ry: o.r * 0.42 * k };
}

/** A low, round shell seen side-on: a coil around (cx, cy). */
function round(d: Draw, o: Round): void {
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
    if (o.dots) {
      // The necklace: a spiral row of brown spots just outside the suture, growing with the whorl.
      for (let t = 0.3; t <= 1.0001; t += 0.07) {
        const a = -Math.PI * 0.9 + t * Math.PI * 2.6;
        const rr = r * (0.18 + t * 0.62);
        const s = 1 + t * 2.4;
        tint(d, oval(cx - r * 0.2 + Math.cos(a) * rr * 1.05, cy - r * 0.1 + Math.sin(a) * rr * 0.9, s * 1.2, s, 8), o.dots, 0.8);
      }
    }
    // Growth lines across the last whorl.
    const growth = o.growth ?? 9;
    for (let i = 0; i < growth; i++) {
      const a = -0.2 + (i * 1.98) / growth;
      pen.hair([pt(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.5), pt(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r)], 0.45, d.ink, 0.35);
    }
    glint(d, bezier(pt(cx - r * 0.75, cy - r * 0.25), pt(cx - r * 0.5, cy - r * 0.8), pt(cx + r * 0.1, cy - r * 0.85), 10), 2.6, 0.6);
  });
  mottle(d, body, 160, cy - r, cy + r * 0.2, o.band, 0.5);
  shade(d, body);
  edge(d, body, 1.7);
  const m = roundMouth(o);
  const lean = (p: Pt): Pt => pt(p.x + (p.y - cy) * -0.15, p.y);
  if (o.lip) {
    const rim = oval(m.x, m.y, m.rx + 4, m.ry + 4, 22).map(lean);
    skin(d, rim, o.lip, 0.75);
    edge(d, rim, 1.1);
  }
  mouth(d, oval(m.x, m.y, m.rx, m.ry, 18).map(lean));
}

const snail = (d: Draw): void => round(d, { cx: -14, cy: 8, r: 38, wash: '#e0b85e', band: '#5a3a20', bands: 2, spire: 0.6 });
/** The starter: a small, dark, tightly coiled periwinkle, banded grey-green. */
const periwinkle = (d: Draw): void => round(d, { cx: -14, cy: 8, r: 38, wash: '#9aa38c', band: '#34402f', bands: 3, spire: 0.9 });
const moonsnail = (d: Draw): void => round(d, { cx: -18, cy: 2, r: 44, wash: '#e8d8b8', band: '#9a7e9a', glaze: '#b9a6c8', bands: 1, spire: 0.25 });
/** A sun-bleached desert snail: chalk white, almost no spire, close growth lines. */
const desertsnail = (d: Draw): void => round(d, { cx: -14, cy: 8, r: 38, wash: '#ebe5d2', band: '#b9ad92', bands: 1, spire: 0.3, growth: 20 });

/** A flat periwinkle: a smooth glossy bead of bright yellow, its spire worn flat, with a big round mouth. */
function flatwinkle(d: Draw): void {
  const o = { cx: -16, cy: 10, r: 36, wash: '#f4b81c', band: '#c07a10', glaze: '#fff09a', bands: 0, spire: 0, growth: 4, gape: 1.3, lip: '#fbe7a6' };
  round(d, o);
  // Wet-looking polish: a long glint over the crown and a bright spot.
  glint(d, cub(pt(o.cx - 30, o.cy - 4), pt(o.cx - 28, o.cy - 24), pt(o.cx - 12, o.cy - 32), pt(o.cx + 6, o.cy - 32), 12), 3.4, 0.9);
  d.pen.fill(oval(o.cx - 18, o.cy - 18, 3, 2.2, 8), PAPER_FILL, 0.95);
}

/** A necklace shell: a glossy fawn globe with a low spire, a row of brown spots under the suture, and a D-shaped mouth beside a deep navel. */
function necklace(d: Draw): void {
  const { pen } = d;
  const o = { cx: -18, cy: 3, r: 43, wash: '#d9a874', band: '#9a6436', glaze: '#f4dcb4', bands: 0, spire: 0.55, growth: 6, gape: 1.25, dots: '#6a3418' };
  round(d, o);
  // The inner lip: a cream callus over the mouth's back half, straight along its edge, making the D.
  const m = roundMouth(o);
  const lean = (p: Pt): Pt => pt(p.x + (p.y - o.cy) * -0.15, p.y);
  const x = m.x - m.rx * 0.4;
  const callus = [pt(x, m.y - m.ry * 0.92), pt(x, m.y + m.ry * 0.92), ...cub(pt(x, m.y + m.ry * 0.92), pt(x - 8, m.y + m.ry + 2), pt(x - 12, m.y + m.ry * 0.4), pt(x - 11, m.y), 8).slice(1),
    ...cub(pt(x - 11, m.y), pt(x - 11, m.y - m.ry * 0.5), pt(x - 7, m.y - m.ry), pt(x, m.y - m.ry * 0.92), 8).slice(1)].map(lean);
  skin(d, callus, '#f6ead2', 0.85);
  glint(d, [pt(x - 4, m.y - m.ry * 0.6), pt(x - 5, m.y + m.ry * 0.3)].map(lean), 1.6, 0.8);
  edge(d, callus, 1.1);
  // The umbilicus: a deep slit of a navel tucked under the callus's foot.
  const navel = bezier(pt(x - 12, m.y + m.ry * 0.35), pt(x - 16, m.y + m.ry * 0.75), pt(x - 8, m.y + m.ry * 1.02), 8).map(lean);
  pen.stroke(navel, 3.4, DARK, 0.9, false);
  pen.hair(navel.map((p) => add(p, pt(-2.2, 0))), 0.8, d.ink, 0.8);
  glint(d, cub(pt(o.cx - 34, o.cy + 8), pt(o.cx - 34, o.cy - 20), pt(o.cx - 18, o.cy - 34), pt(o.cx + 4, o.cy - 38), 12), 3, 0.85);
}

/** A turban: squat, stepped round whorls ringed with beaded spiral cords, mottled green-brown on cream. */
function turban(d: Draw): void {
  const { pen } = d;
  const cx = -16;
  const cy = 6;
  const r = 40;
  // The coil's axis leans up and back; whorls and their cords lie across it.
  const a = -0.58;
  contact(d, cx + 6, r * 1.1);
  const whorls = [
    { x: cx - r * 0.66, y: cy - r * 1.3, rx: r * 0.22, ry: r * 0.14 },
    { x: cx - r * 0.5, y: cy - r * 1.04, rx: r * 0.5, ry: r * 0.28 },
    { x: cx - r * 0.26, y: cy - r * 0.64, rx: r * 0.8, ry: r * 0.42 },
    { x: cx, y: cy + r * 0.13, rx: r * 1.06, ry: r * 0.87 },
  ];
  whorls.forEach((o, k) => {
    const w = tilted(o.x, o.y, o.rx, o.ry, k === 3 ? 0 : a, 40);
    skin(d, w, '#e6dcc0', 0.6);
    pen.clipped(w, () => {
      // Green-brown flames, then spiral cords studded with beads.
      for (let i = 0; i < 3 + k * 4; i++) {
        const t = pen.rng() * Math.PI * 2;
        const p = pt(o.x + Math.cos(t) * o.rx * 0.75, o.y + Math.sin(t) * o.ry * 0.5);
        tint(d, tilted(p.x, p.y, 1.5 + pen.rng() * 2, o.ry * (0.3 + pen.rng() * 0.3), 0.5), pen.rng() < 0.5 ? '#5f6a38' : '#7a5030', 0.4);
      }
      const rows = k === 3 ? 7 : k === 0 ? 1 : 3;
      for (let j = 0; j < rows; j++) {
        const off = -0.75 + (1.5 * (j + 0.5)) / rows;
        const cord = Array.from({ length: 25 }, (_, i) => {
          const x = -o.rx * 1.1 + (o.rx * 2.2 * i) / 24;
          const y = off * o.ry - o.ry * 0.28 * (1 - (x / o.rx) ** 2);
          const ca = k === 3 ? Math.cos(a * 0.5) : Math.cos(a);
          const sa = k === 3 ? Math.sin(a * 0.5) : Math.sin(a);
          return pt(o.x + x * ca - y * sa, o.y + x * sa + y * ca);
        });
        pen.stroke(cord, 1, '#6b4a2a', 0.55, false);
        for (let i = 0; i < cord.length; i += 2) pen.fill(oval(cord[i]!.x, cord[i]!.y, 1.3, 1.1, 6), d.ink, 0.4);
      }
      if (k === 3) glint(d, bezier(pt(cx - r * 0.8, cy - r * 0.1), pt(cx - r * 0.6, cy - r * 0.7), pt(cx, cy - r * 0.85), 10), 2.4, 0.55);
    });
    shade(d, w, 0.45);
    edge(d, w, k === 3 ? 1.7 : 1.3);
  });
  // A pearly rim round the round mouth.
  const rim = oval(MOUTH_X.turban, cy + r * 0.45, r * 0.38, r * 0.5, 22).map((p) => pt(p.x + (p.y - cy) * -0.15, p.y));
  skin(d, rim, '#e9e4ea', 0.7);
  edge(d, rim, 1.1);
  mouth(d, oval(MOUTH_X.turban, cy + r * 0.47, r * 0.28, r * 0.4, 18).map((p) => pt(p.x + (p.y - cy) * -0.15, p.y)));
}

// ---------------------------------------------------------------- odd shapes

/** A nerite: a plump low dome with no spire to speak of, banded in black and white zigzags, its D-shaped mouth toothed and stained red. */
function nerite(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -18, 50);
  const dome = [...cub(pt(-62, g - 2), pt(-68, g - 52), pt(-10, g - 74), pt(22, g - 34), 16), ...cub(pt(22, g - 34), pt(32, g - 20), pt(30, g), pt(18, g), 8).slice(1),
    ...cub(pt(18, g), pt(-10, g + 1), pt(-40, g + 1), pt(-62, g - 2), 8).slice(1)];
  skin(d, dome, '#f2eee4', 0.8);
  pen.clipped(dome, () => {
    // Zigzag bands following the dome, black on white.
    const crown = cub(pt(-70, g), pt(-72, g - 60), pt(-6, g - 80), pt(30, g - 34), 30);
    for (let row = 0; row < 4; row++) {
      const band = crown.map((p) => lerp(p, pt(-12, g + 6), 0.12 + row * 0.2));
      const zig = band.map((p, i) => add(p, pt(0, i % 2 ? 4 : -4)));
      pen.stroke(zig, 3.2, '#26242a', 0.8, false);
    }
    glint(d, cub(pt(-54, g - 20), pt(-52, g - 46), pt(-24, g - 58), pt(-4, g - 56), 10), 3, 0.8);
  });
  shade(d, dome, 0.45);
  edge(d, dome, 1.7);
  // The spire: a tiny worn bump at the back.
  pen.stroke(closed(oval(-46, g - 48, 5, 3, 10)), 1, d.ink, 0.8, false);
  // The inner lip: a cream shelf with red-stained teeth, then the D-shaped mouth.
  const shelf = [pt(-6, g - 30), ...cub(pt(-6, g - 30), pt(-12, g - 18), pt(-10, g - 6), pt(-2, g), 8).slice(1), pt(4, g), pt(2, g - 30)];
  skin(d, shelf, '#efe2c4', 0.8);
  for (let i = 0; i < 4; i++) {
    const y = g - 26 + i * 6.5;
    tint(d, oval(0, y, 3.5, 2.6, 8), '#c8452c', 0.75);
    pen.fill(oval(1.5, y, 1.6, 1.4, 6), PAPER_FILL, 1);
  }
  edge(d, shelf, 1);
  const dee = [pt(4, g - 32), ...cub(pt(4, g - 32), pt(24, g - 30), pt(26, g - 2), pt(4, g - 1), 12).slice(1)];
  mouth(d, dee.map((p) => pt(p.x + (MOUTH_X.nerite - 13), p.y)), 1.2);
}

/** A top shell: a straight-sided cone like a spinning top lying on its side, its flat base to the right with mother-of-pearl round the mouth. */
function topshell(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -24, 52);
  // One side of the cone lies along the ground from the apex; the base stands up at the right.
  const apex = pt(-72, g - 2);
  const low = pt(18, g - 2);
  const high = pt(-22, g - 78);
  const mid = lerp(low, high, 0.5);
  const tilt = Math.atan2(high.y - low.y, high.x - low.x);
  const face = tilted(mid.x, mid.y, Math.hypot(high.x - low.x, high.y - low.y) / 2, 12, tilt, 36);
  const cone = [...Array.from({ length: 10 }, (_, i) => lerp(apex, low, i / 10)), ...face.filter((p) => p.x * Math.sin(tilt) - p.y * Math.cos(tilt) >= mid.x * Math.sin(tilt) - mid.y * Math.cos(tilt) - 0.5).sort((p, q) => q.y - p.y), ...Array.from({ length: 10 }, (_, i) => lerp(high, apex, i / 10))];
  skin(d, cone, '#ecd9c6', 0.75);
  pen.clipped(cone, () => {
    // Pink-red flames fanning out from the apex, then whorl sutures, each with rows of beads.
    for (let i = 0; i < 9; i++) pen.stroke([apex, lerp(low, high, (i + 0.5) / 9)], 4.5, '#c0505e', 0.45, false);
    const across = (u: number): Pt[] => bezier(lerp(apex, low, u), add(lerp(lerp(apex, low, u), lerp(apex, high, u), 0.5), pt(5 * u, 0)), lerp(apex, high, u), 12);
    for (const u of [0.25, 0.45, 0.65, 0.85]) {
      pen.stroke(across(u), 1, d.ink, 0.85, false);
      for (const v of [0.06, 0.12]) for (const p of across(u - v)) pen.fill(oval(p.x, p.y, 1.3, 1.3, 6), '#7a2a34', 0.55);
    }
    glint(d, [lerp(apex, high, 0.2), lerp(apex, high, 0.85)], 2.4, 0.6);
  });
  shade(d, cone, 0.5);
  edge(d, cone, 1.7);
  // The flat base, pearly round the round mouth.
  skin(d, face, '#e8dde6', 0.7);
  pen.clipped(face, () => {
    tint(d, tilted(mid.x + 4, mid.y + 6, 24, 6, tilt), '#bfe0d8', 0.5);
    tint(d, tilted(mid.x - 2, mid.y - 10, 20, 5, tilt), '#f2c4d4', 0.5);
  });
  edge(d, face, 1.3);
  mouth(d, tilted(MOUTH_X.topshell, g - 20, 14, 8, tilt, 18), 1.2);
}

/** A triton's trumpet: a long tapering spire patterned in brown crescents, varices, and a big orange lip toothed white. */
function triton(d: Draw): void {
  const { pen } = d;
  contact(d, -24, 62);
  const { top, bot, spine } = coiled(d, { wash: '#eedcb8', band: '#8a5a34', whorls: [0.08, 0.16, 0.25, 0.35, 0.47, 0.62], width: 66, from: pt(-96, -46), to: pt(26, 8) });
  const shape = [...top, ...[...bot].reverse()];
  pen.clipped(shape, () => {
    // Brown crescents scattered along each whorl.
    for (let i = 4; i < 38; i += 3) {
      for (const v of [0.3, 0.7]) {
        const p = lerp(spine[i]!, top[i]!, v);
        const s = 2 + (i / 40) * 4;
        tint(d, [...bezier(add(p, pt(-s, -s)), add(p, pt(s, 0)), add(p, pt(-s, s)), 6), ...bezier(add(p, pt(-s, s)), add(p, pt(s * 0.2, 0)), add(p, pt(-s, -s)), 6)], '#6a3a1e', 0.7);
      }
    }
  });
  // Varices: pale rounded ridges where the lip once stood.
  for (const u of [0.42, 0.66]) {
    const i = Math.round(u * 40);
    pen.stroke(bezier(top[i]!, add(spine[i]!, pt(8, -2)), bot[i]!, 10), 4, PAPER_FILL, 0.75, false);
    pen.stroke(bezier(top[i]!, add(spine[i]!, pt(10, -2)), bot[i]!, 10), 1.1, d.ink, 0.85, false);
  }
  // The flared orange lip, then white teeth along its inner edge.
  const lip = oval(MOUTH_X.triton + 2, 16, 15, 26, 28).map((p) => pt(p.x + (p.y - 16) * -0.35, p.y));
  skin(d, lip, '#e07a3a', 0.8);
  pen.clipped(lip, () => tint(d, oval(MOUTH_X.triton + 8, 10, 6, 18), '#f4b070', 0.7));
  edge(d, lip, 1.5);
  const hole = oval(MOUTH_X.triton, 18, 9, 18, 20).map((p) => pt(p.x + (p.y - 18) * -0.35, p.y));
  mouth(d, hole, 1.1);
  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 5.5;
    const x = MOUTH_X.triton + 8 + (y - 18) * -0.35;
    pen.stroke([pt(x, y), pt(x - 4, y)], 2, PAPER_FILL, 0.95, false);
  }
}

/** A tun: a big thin globe ringed with deep spiral ribs, a tiny spire, and a huge mouth with a thin crinkled lip. */
function tun(d: Draw): void {
  const { pen } = d;
  const cx = -22;
  const cy = d.g - 50;
  const r = 50;
  contact(d, cx + 6, r * 1.15);
  const spire = tilted(cx - r * 0.66, cy - r * 0.78, 9, 6, -0.75);
  skin(d, spire, '#d8b884', 0.6);
  edge(d, spire, 1.1);
  const globe = oval(cx, cy, r * 1.06, r, 44);
  skin(d, globe, '#d8b884', 0.65);
  pen.clipped(globe, () => {
    // Spiral ribs: lines across the coil's axis (leaning up and back), bowed towards us, darker between pairs.
    const a = -0.75;
    const along = pt(Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2));
    const across = pt(Math.cos(a), Math.sin(a));
    const rib = (t: number): Pt[] => Array.from({ length: 21 }, (_, i) => {
      const s = -1.2 + (2.4 * i) / 20;
      const bow = (1 - s * s) * 8;
      return pt(cx + along.x * t * r + across.x * s * r + along.x * bow, cy + along.y * t * r + across.y * s * r + along.y * bow);
    });
    for (let k = 0; k < 12; k++) {
      const t = -0.95 + k * 0.17;
      if (k % 3 === 1) tint(d, [...rib(t), ...rib(t + 0.08).reverse()], '#8a5a2a', 0.45);
      pen.stroke(rib(t), 1.4, d.ink, 0.7, false);
      pen.hair(rib(t + 0.03), 0.8, PAPER_FILL, 0.7);
    }
    glint(d, bezier(pt(cx - r * 0.8, cy - r * 0.15), pt(cx - r * 0.55, cy - r * 0.8), pt(cx + r * 0.1, cy - r * 0.85), 10), 2.6, 0.55);
  });
  shade(d, globe, 0.5);
  edge(d, globe, 1.7);
  // The thin lip, crinkled where each rib reaches it, round a huge mouth.
  const lip = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(t * 14);
    return pt(MOUTH_X.tun + Math.cos(t) * 15 * k + (Math.sin(t) * 26 * k) * 0.25, cy + 22 + Math.sin(t) * 26 * k);
  });
  skin(d, lip, '#f0e2c4', 0.7);
  edge(d, lip, 1.2);
  mouth(d, oval(MOUTH_X.tun, cy + 23, 11, 22, 22).map((p) => pt(p.x + (p.y - cy - 23) * 0.25, p.y)), 1.1);
}

/** An olive: a glossy bullet with a tiny pointed spire, tented in brown zigzags, its long narrow mouth along the underside. */
function olive(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -32, 60);
  const cy = g - 24;
  const body = [pt(-100, cy - 8), ...cub(pt(-100, cy - 8), pt(-94, cy - 12), pt(-88, cy - 20), pt(-78, cy - 22), 6).slice(1),
    ...cub(pt(-78, cy - 22), pt(-40, cy - 30), pt(14, cy - 28), pt(26, cy - 10), 14).slice(1), ...cub(pt(26, cy - 10), pt(30, cy), pt(26, cy + 20), pt(10, cy + 23), 8).slice(1),
    ...cub(pt(10, cy + 23), pt(-30, cy + 25), pt(-70, cy + 22), pt(-84, cy + 12), 12).slice(1), ...cub(pt(-84, cy + 12), pt(-92, cy + 6), pt(-96, cy - 2), pt(-100, cy - 8), 6).slice(1)];
  skin(d, body, '#e8d6ae', 0.8);
  pen.clipped(body, () => {
    // Tent markings: rows of brown zigzags, crowded into darker bands.
    for (let row = 0; row < 7; row++) {
      const y = cy - 26 + row * 7.5;
      const zig = Array.from({ length: 26 }, (_, i) => pt(-96 + i * 5, y + (i % 2 ? 5 : -2) + (i * 5 - 96) * -0.03));
      pen.stroke(zig, row % 3 === 1 ? 2.4 : 1.2, '#6a3a1e', 0.6, false);
    }
    tint(d, oval(-34, cy + 4, 60, 6), '#6a3a1e', 0.3);
    // The spire's suture, and the glossy polish.
    pen.stroke(bezier(pt(-80, cy - 22), pt(-84, cy - 6), pt(-80, cy + 12), 8), 1, d.ink, 0.8, false);
    glint(d, cub(pt(-76, cy - 14), pt(-50, cy - 24), pt(-10, cy - 24), pt(14, cy - 16), 12), 5, 1);
    glint(d, [pt(-60, cy + 14), pt(-30, cy + 16)], 1.8, 0.6);
  });
  shade(d, body, 0.4);
  edge(d, body, 1.7);
  // A pale band near the front, then the long slit of a mouth widening to the notch.
  pen.stroke(bezier(pt(4, cy + 22), pt(14, cy), pt(24, cy - 14), 8), 3, '#f4ead4', 0.8, false);
  const slit = [pt(-56, g - 3), ...cub(pt(-56, g - 3), pt(-20, g - 5), pt(0, g - 8), pt(MOUTH_X.olive + 4, g - 15), 12).slice(1),
    ...cub(pt(MOUTH_X.olive + 4, g - 15), pt(MOUTH_X.olive + 9, g - 9), pt(MOUTH_X.olive + 5, g - 2), pt(MOUTH_X.olive - 4, g - 1), 8).slice(1), pt(-56, g - 1)];
  mouth(d, slit, 1.1);
}

// ---------------------------------------------------------------- cold rock-pool shells

/** A dog whelk: stout, with a short sharp spire, coarse spiral ridges banded cream and brown, a thick toothed lip and a notch below the mouth. */
function dogwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -14, 52);
  const { top, bot, shape, spine } = coiled(d, { wash: '#efe4c8', band: '#6e4426', whorls: [0.2, 0.4, 0.62], width: 90, from: pt(-60, -16), to: pt(30, 18) });
  pen.clipped(shape, () => {
    // A broad brown spiral band, then the coarse ridges: dark grooves with a pale crest beside each.
    for (const [side, v] of [[top, 0.5], [bot, 0.45]] as const) pen.stroke(spine.map((p, i) => lerp(p, side[i]!, v)), 10, '#5a3418', 0.5, false);
    for (const side of [top, bot]) {
      for (let v = 0.15; v < 1; v += 0.2) {
        pen.stroke(spine.map((p, i) => lerp(p, side[i]!, v)), 1.1, d.ink, 0.45, false);
        pen.hair(spine.map((p, i) => lerp(p, side[i]!, v + 0.06)), 1.4, PAPER_FILL, 0.55);
      }
    }
  });
  edge(d, shape);
  // The thick white outer lip, the siphonal notch cut in its foot, then the mouth with teeth inside the lip.
  const lean = (p: Pt): Pt => pt(p.x + (p.y - 24) * -0.3, p.y);
  const lip = oval(MOUTH_X.dogwhelk + 2, 24, 14, 20, 24).map(lean);
  skin(d, lip, '#f6efdc', 0.9);
  pen.clipped(lip, () => tint(d, oval(MOUTH_X.dogwhelk + 13, 18, 5, 16), '#c9a87a', 0.5));
  edge(d, lip, 1.6);
  const notch = [lean(pt(MOUTH_X.dogwhelk - 5, 38)), lean(pt(MOUTH_X.dogwhelk + 3, 38)), lean(pt(MOUTH_X.dogwhelk - 3, 45))];
  pen.fill(notch, DARK, 0.85);
  pen.stroke(notch, 1, d.ink, 0.9, false);
  mouth(d, oval(MOUTH_X.dogwhelk, 24, 8, 15, 18).map(lean), 1.1);
  for (let i = 0; i < 4; i++) {
    const p = lean(pt(MOUTH_X.dogwhelk + 7, 16 + i * 5.5));
    pen.fill(oval(p.x, p.y, 1.8, 1.3, 6), '#f6efdc', 1);
  }
}

/** A painted top shell: a tall, sharp, straight-sided cone, smooth pink with red-purple flecks along each whorl's edge, standing on its flat base. */
function paintedtop(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  contact(d, -6, 44);
  // The axis leans up and back; the cone rests on the low rim of its base, the base facing down and forward.
  const ax = pt(-0.6, -0.8);
  const across = pt(0.8, -0.6);
  const R = 38;
  const base = pt(16, g - R * 0.6 - 3);
  const lo = add(base, pt(-across.x * R, -across.y * R));
  const hi = add(base, pt(across.x * R, across.y * R));
  const apex = add(base, pt(ax.x * 86, ax.y * 86));
  const cone = [apex, ...Array.from({ length: 13 }, (_, i) => lerp(lerp(lo, base, 0.08), lerp(hi, base, 0.08), i / 12)), apex];
  skin(d, cone, '#e9a3ac', 0.75);
  pen.clipped(cone, () => {
    // Whorl edges: each suture bowed towards the base, flecked red-purple just above it, with fine spiral cords between.
    const ring = (u: number): Pt[] => bezier(lerp(apex, lo, u), add(lerp(apex, lerp(lo, hi, 0.5), u), pt(-ax.x * 5 * u, -ax.y * 5 * u)), lerp(apex, hi, u), 16);
    for (const u of [0.16, 0.3, 0.45, 0.62, 0.81]) {
      pen.stroke(ring(u), 1, d.ink, 0.85, false);
      ring(u - 0.035).forEach((p, i) => { if (i % 2) tint(d, oval(p.x, p.y, 2.2 * u + 1, 1.2 * u + 0.8, 6), '#7a2448', 0.75); });
      for (const v of [0.05, 0.09]) pen.hair(ring(u - v), 0.45, '#9a3a56', 0.4);
    }
    tint(d, [apex, lerp(apex, lo, 1.1), lerp(apex, lerp(lo, hi, 0.3), 1.1)], '#f6d0d4', 0.35);
    glint(d, [lerp(apex, lo, 0.12), lerp(apex, lo, 0.8)].map((p) => add(p, pt(4, -1))), 2.6, 0.8);
  });
  shade(d, cone, 0.45);
  edge(d, cone, 1.7);
  // The flat base, pearly, with the round mouth near its low rim.
  const tilt = Math.atan2(across.y, across.x);
  const face = tilted(base.x, base.y, R, 11, tilt, 36);
  skin(d, face, '#f1dde0', 0.75);
  pen.clipped(face, () => {
    for (const k of [0.45, 0.7]) pen.hair(closed(tilted(base.x + 3, base.y + 2, R * k, 11 * k, tilt, 24)), 0.5, '#9a3a56', 0.5);
    tint(d, tilted(base.x + 6, base.y - 4, 18, 4, tilt), '#cfe6e0', 0.5);
  });
  edge(d, face, 1.3);
  mouth(d, tilted(MOUTH_X.paintedtop, base.y + 5, 12, 7, tilt, 18), 1.2);
}

/** Knobs and a frilled flange: one of a frog shell's varices, standing off its outline at `at`, pushing out along `out`. */
function varix(d: Draw, at: Pt, out: Pt, s: number): void {
  const along = pt(-out.y, out.x);
  const lobe = Array.from({ length: 15 }, (_, i) => {
    const t = (i / 14) * Math.PI;
    const k = s * (1 + 0.08 * Math.sin(t * 9));
    return pt(at.x + along.x * Math.cos(t) * k * 0.8 + out.x * (Math.sin(t) - 0.35) * k, at.y + along.y * Math.cos(t) * k * 0.8 + out.y * (Math.sin(t) - 0.35) * k);
  });
  skin(d, lobe, '#e6d2ae', 0.75);
  d.pen.clipped(lobe, () => d.pen.stroke([at, add(at, pt(out.x * s, out.y * s))], s * 0.5, '#7a4a2a', 0.5, false));
  edge(d, lobe, 1.1);
}

/** A frog shell: squat and knobbly, rough brown on cream, with a row of varices down each side, a frilled lip, and a channel at the top of its mouth. */
function frogshell(d: Draw): void {
  const { pen } = d;
  contact(d, -22, 60);
  const { top, bot, shape, spine } = coiled(d, { wash: '#d8c09a', band: '#6e4426', whorls: [0.15, 0.3, 0.5], width: 84, from: pt(-74, -22), to: pt(24, 13) });
  pen.clipped(shape, () => {
    // Spiral rows of knobs, lit from the upper left.
    for (const side of [top, bot]) {
      for (const v of [0.3, 0.68]) {
        for (let i = 5; i < 36; i += 3) {
          const p = lerp(spine[i]!, side[i]!, v);
          const s = 1.6 + (i / 40) * 2.6;
          tint(d, oval(p.x + s * 0.5, p.y + s * 0.6, s, s * 0.8, 8), '#4a2a16', 0.55);
          tint(d, oval(p.x - s * 0.3, p.y - s * 0.3, s * 0.7, s * 0.55, 8), PAPER_FILL, 0.75);
        }
      }
    }
  });
  mottle(d, shape, 140, -40, 40, '#4a2a16', 0.7);
  // The varices, lined up along the top and bottom outline: one per half whorl, on opposite sides.
  const norms = (from: readonly Pt[], to: readonly Pt[], i: number): Pt => {
    const dx = to[i]!.x - from[i]!.x;
    const dy = to[i]!.y - from[i]!.y;
    const l = Math.hypot(dx, dy) || 1;
    return pt(dx / l, dy / l);
  };
  for (const u of [0.2, 0.38, 0.58]) {
    const i = Math.round(u * 40);
    const s = 5 + u * 12;
    varix(d, top[i]!, norms(spine, top, i), s);
    if (u < 0.5) varix(d, bot[i]!, norms(spine, bot, i), s * 0.8);
  }
  // The frilled lip, crinkled all round, striped where the spiral rows meet it.
  const lean = (p: Pt): Pt => pt(p.x + (p.y - 16) * -0.3, p.y + 3);
  const lip = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(t * 12);
    return lean(pt(MOUTH_X.frogshell + 2 + Math.cos(t) * 17 * k, 15 + Math.sin(t) * 25 * k));
  });
  skin(d, lip, '#f2e6cc', 0.8);
  pen.clipped(lip, () => {
    for (let i = 0; i < 6; i++) pen.stroke([lean(pt(MOUTH_X.frogshell + 10, -6 + i * 9)), lean(pt(MOUTH_X.frogshell + 22, -6 + i * 9))], 2.6, '#7a4a2a', 0.55, false);
  });
  edge(d, lip, 1.3);
  // The posterior channel: a slot running up from the top of the mouth.
  const slot = [lean(pt(MOUTH_X.frogshell - 2, 2)), lean(pt(MOUTH_X.frogshell + 1, -10)), lean(pt(MOUTH_X.frogshell + 4, -9)), lean(pt(MOUTH_X.frogshell + 4, 2))];
  pen.fill(slot, DARK, 0.85);
  mouth(d, oval(MOUTH_X.frogshell, 19, 9, 16, 18).map(lean), 1.1);
  for (let i = 0; i < 5; i++) {
    const p = lean(pt(MOUTH_X.frogshell + 8, 9 + i * 5));
    pen.fill(oval(p.x - 1, p.y, 2, 1.4, 6), '#f2e6cc', 1);
  }
}

/** A knobbed whelk: a big pear with a low spire, a crown of strong knobs on its shoulder, a long open canal, pale fawn with faint streaks, orange inside. */
function knobbedwhelk(d: Draw): void {
  const { pen } = d;
  contact(d, -18, 68);
  const n = 60;
  const spine = Array.from({ length: n + 1 }, (_, i) => lerp(pt(-100, -8), pt(56, 30), i / n));
  const W = 90;
  // A low spire, a sudden shoulder, then the body swelling and tapering into the canal.
  const w = (u: number): number => {
    if (u < 0.18) return W * 0.42 * Math.pow(u / 0.18, 0.9);
    if (u < 0.24) return W * (0.42 + 0.58 * Math.sin(((u - 0.18) / 0.06) * Math.PI / 2));
    return W * (0.1 + 0.9 * Math.pow(Math.cos(((u - 0.24) / 0.76) * Math.PI / 2), 1.8));
  };
  const r = ribbon(spine, w);
  const nrm = normals(spine);
  // Knobs: four strong points along the shoulder's outline, little nubs on the spire's whorls.
  const knob = (u: number): number => {
    if (u > 0.2 && u < 0.44) return 12 * Math.max(0, Math.sin(((u - 0.2) / 0.24) * Math.PI * 7)) ** 2;
    if (u > 0.05 && u < 0.17) return 3.5 * Math.max(0, Math.sin(((u - 0.05) / 0.12) * Math.PI * 5)) ** 2;
    return 0;
  };
  const top = r.top.map((p, i) => add(p, pt(nrm[i]!.x * knob(i / n), nrm[i]!.y * knob(i / n))));
  const shape = [...top, ...[...r.bot].reverse()];
  skin(d, shape, '#ddd3c0', 0.7);
  pen.clipped(shape, () => {
    // Spire sutures and the shoulder's edge.
    for (const u of [0.07, 0.13, 0.19, 0.25]) {
      const i = Math.round(u * n);
      pen.stroke(bezier(top[i]!, add(spine[i]!, pt(6, -2)), r.bot[i]!, 10), u > 0.2 ? 0.7 : 1, d.ink, u > 0.2 ? 0.5 : 0.85, false);
    }
    // Faint wavy fawn streaks down the body.
    for (let i = 16; i < n - 6; i += 3) {
      const a = top[i]!;
      const b = r.bot[i]!;
      pen.stroke(Array.from({ length: 9 }, (_, k) => add(lerp(a, b, k / 8), pt(Math.sin(k * 1.4 + i) * 2, 0))), 1.6, '#8a6a4a', 0.28, false);
    }
    for (const v of [0.4, 0.75]) pen.hair(spine.map((p, i) => lerp(p, top[i]!, v)), 0.5, d.ink, 0.25);
    glint(d, spine.slice(14, 44).map((p, i) => lerp(p, r.top[i + 14]!, 0.6)), 3, 0.65);
  });
  mottle(d, shape, 120, -50, 20, '#8a6a4a', 0.5);
  shade(d, shape, 0.45);
  edge(d, shape);
  // The open aperture along the underside: orange inside, running out into the canal's groove.
  const inner = [...Array.from({ length: 29 }, (_, k) => lerp(spine[30 + k]!, r.bot[30 + k]!, 0.3)), ...Array.from({ length: 29 }, (_, k) => lerp(spine[58 - k]!, r.bot[58 - k]!, 0.92))];
  skin(d, inner, '#e8823a', 0.85);
  pen.clipped(inner, () => glint(d, Array.from({ length: 20 }, (_, k) => lerp(spine[32 + k]!, r.bot[32 + k]!, 0.5)), 2.2, 0.55));
  edge(d, inner, 1.1);
  pen.stroke(Array.from({ length: 14 }, (_, k) => lerp(spine[44 + k]!, r.bot[44 + k]!, 0.62)), 2.2, DARK, 0.8, false);
  mouth(d, oval(MOUTH_X.knobbedwhelk, 30, 11, 9, 18).map((p) => pt(p.x + (p.y - 30) * -0.3, p.y)), 1.1);
}

const DRAW: Readonly<Record<ShellKind, (d: Draw) => void>> = {
  periwinkle, snail, nerite, topshell, whelk, moonsnail, triton, tun, conch,
  desertsnail, turban, olive, murex, helmet,
  flatwinkle, dogwhelk, paintedtop, necklace, frogshell, knobbedwhelk,
  mangrovewinkle, rivernerite, mudcreeper, telescope, mudwhelk,
  drupe, hornshell, spindle, bonnet, harp,
  blackturban, kelpsnail, kellets, oregontriton, wavyturban,
};

export function drawShell(d: Draw, kind: ShellKind): void {
  DRAW[kind](d);
}
