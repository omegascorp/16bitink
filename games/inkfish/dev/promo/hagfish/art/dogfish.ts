import { INK, Pen, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { clamp, linePath, lookup, mix, polyPath, ramp3 } from './geom';
import { newGel, paintGel, threadsAlong } from './slime';

/**
 * The small deep-sea dogfish (about 1 m): slim grey-brown above, pale belly,
 * big green-glinting eyes, a short pointed snout, two dorsal fins each with a
 * small spine in front, five clear gill slits behind the head, a heterocercal
 * tail. Painted in the manner of the great white
 * (../../foodchain/art/greatWhite.ts): layered washes across the depth of the
 * body (countershading with a soft break line), light along the back, thin
 * interior ink, a firm outline, a real eye with a catchlight.
 *
 * Own units: 300 long in all (nose at +152, tail tip at -172), the middle at
 * 0,0, nose to the right, belly down. Drawn live (no baked sprites) so it can
 * bend, gape, flare its gills and take slime in them.
 */

export const DOG_UNITS = 300;

export interface DogPlaced {
  readonly x: number;
  readonly y: number;
  /** Length in px. */
  readonly len: number;
  /** Radians, positive: nose down. */
  readonly rot: number;
  readonly face: 1 | -1;
  /** Tail-beat phase, radians. */
  readonly beat: number;
}

export interface DogLook {
  /** The rear body's bend (a struggle), about -0.4 .. 0.4. */
  readonly bend?: number;
  /** Mouth open, 0 .. 1. */
  readonly gape?: number;
  /** Eye wide with fright, 0 .. 1. */
  readonly wide?: number;
  /** Gill slits flared open, 0 .. 1. */
  readonly flare?: number;
  /** Slime filling the gills, 0 .. 1. */
  readonly gel?: number;
  /** Phase for the slime strands streaming from the gills. */
  readonly drift?: number;
  /** Gel pouring back out of the gills and mouth (gagging), 0 .. 1. */
  readonly spew?: number;
}

// ---------------------------------------------------------------- shape

/** Body depth, stretched a little from the drawn outline. */
const Y = 1.2;
const deep = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: p.x, y: p.y * Y }));

const BACK: readonly Pt[] = deep(spline([
  { x: 152, y: 4.5 }, { x: 148, y: -0.5 }, { x: 140, y: -4.6 }, { x: 126, y: -8.6 }, { x: 108, y: -11.6 }, { x: 86, y: -14.2 },
  { x: 60, y: -16.4 }, { x: 32, y: -17.4 }, { x: 4, y: -17.2 }, { x: -24, y: -16.2 }, { x: -52, y: -13 }, { x: -80, y: -9.2 },
  { x: -104, y: -5.4 }, { x: -122, y: -3.4 }, { x: -140, y: -2.2 },
], 5));
const BELLY: readonly Pt[] = deep(spline([
  { x: 152, y: 4.5 }, { x: 148, y: 7.4 }, { x: 140, y: 9.4 }, { x: 126, y: 11.2 }, { x: 108, y: 12.8 }, { x: 86, y: 14.4 },
  { x: 60, y: 15.6 }, { x: 32, y: 16.2 }, { x: 4, y: 15.8 }, { x: -24, y: 14.6 }, { x: -52, y: 10.6 }, { x: -80, y: 7.2 },
  { x: -104, y: 4.4 }, { x: -122, y: 2.8 }, { x: -140, y: 2 },
], 5));
const topAt = lookup(BACK);
const botAt = lookup(BELLY);

/** First dorsal with its spine in front; second, slightly smaller, further back with its own spine. */
const DORSAL1: readonly Pt[] = deep(spline([{ x: 28, y: -17.3 }, { x: 20, y: -26 }, { x: 12, y: -33.5 }, { x: 6, y: -37.5 }, { x: 1, y: -36 }, { x: -4, y: -30 }, { x: -8, y: -23 }, { x: -13, y: -17.2 }], 5));
const DORSAL2: readonly Pt[] = deep(spline([{ x: -66, y: -12.4 }, { x: -72, y: -20 }, { x: -78, y: -27 }, { x: -83, y: -30.5 }, { x: -87, y: -28 }, { x: -90, y: -22 }, { x: -94, y: -15 }, { x: -98, y: -9.4 }], 5));
const SPINE1: readonly Pt[] = deep([{ x: 30, y: -16.6 }, { x: 22.5, y: -27.5 }, { x: 24, y: -27.7 }, { x: 33, y: -16.8 }]);
const SPINE2: readonly Pt[] = deep([{ x: -64, y: -11.8 }, { x: -73.5, y: -23 }, { x: -71.5, y: -23.2 }, { x: -60, y: -12 }]);

const CAUDAL: readonly Pt[] = deep(spline([
  { x: -122, y: -3.6 }, { x: -136, y: -5 }, { x: -150, y: -14 }, { x: -162, y: -28 }, { x: -174, y: -42 }, { x: -170, y: -32 }, { x: -166, y: -22 },
  { x: -166, y: -10 }, { x: -164, y: -1 }, { x: -160, y: 7 }, { x: -154, y: 14 }, { x: -148, y: 11 }, { x: -142, y: 5 },
  { x: -130, y: 3.8 }, { x: -122, y: 3.4 },
], 4));
const PECTORAL: readonly Pt[] = spline([
  { x: 0, y: -5 }, { x: 8, y: -6 }, { x: 18, y: -3 }, { x: 28, y: 3 }, { x: 36, y: 11 }, { x: 40, y: 18 }, { x: 34, y: 16 }, { x: 24, y: 11.5 },
  { x: 12, y: 8 }, { x: 0, y: 6 },
], 4);
const PELVIC: readonly Pt[] = spline([
  { x: 0, y: -2 }, { x: 8, y: 0 }, { x: 14, y: 6 }, { x: 18, y: 12 }, { x: 10, y: 10 }, { x: 0, y: 6 }, { x: -4, y: 2 },
], 4);
const PEC_AT: Pt = { x: 68, y: 10 * Y };
const PELVIC_AT: Pt = { x: -34, y: 13 * Y };

/** The eye: large and round, set high. */
export const DOG_EYE: Pt = { x: 112, y: -4.4 * Y };
const EYE_R = 6.4;
/** The mouth under the snout, front to corner. */
const MOUTH: readonly Pt[] = spline([140, 134, 124, 114].map((x) => ({ x, y: botAt(x) - 1.6 })), 5);
/** Where a bitten animal is held. */
export const DOG_MOUTH_MID: Pt = { x: 128, y: 11.4 * Y };
/** Five gill slits behind the head. */
export const GILL_XS = [84, 78, 72, 66, 60] as const;
/** The middle of the gills, for close-ups. */
export const DOG_GILLS: Pt = { x: 72, y: 0 };

// ---------------------------------------------------------------- painting

/** Across the body, back (0) to belly (1): dark where the back turns away, the top light on the upper flank, a core shadow over the break, a pale belly turning under. */
const BACK_STOPS: readonly (readonly [number, string])[] = [
  [0, '#1a1813'], [0.1, '#2e2b22'], [0.22, '#474234'], [0.32, '#58533f'], [0.44, '#4c4837'], [0.55, '#3b382b'], [0.6, '#46422f'],
  [0.64, '#8d8771'], [0.7, '#bcb69f'], [0.8, '#cfc9b2'], [0.9, '#b5af98'], [1, '#6f6a58'],
]
const FIN_DARK = '#2c2a22';
const FIN_MID = '#5a5646';

/** The rear body's bend and the tail beat: a shear that moves each x onto the curved midline. */
function curve(x: number, bend: number, beat: number): number {
  const b = clamp((10 - x) / 160);
  return (bend * Math.max(0, 70 - x) ** 2) / 170 + 6.5 * b * b * Math.sin(beat - 2.4 * b);
}

class Painter {
  readonly pen: Pen;
  constructor(readonly ctx: CanvasRenderingContext2D, readonly k: number, boil: number, readonly bend: number, readonly beat: number) {
    this.pen = new Pen(ctx, 4177 + boil * 977, 0.9 / k);
  }
  /** Own-unit point bent onto the midline. */
  at = (p: Pt): Pt => ({ x: p.x, y: p.y + curve(p.x, this.bend, this.beat) });
  all = (pts: readonly Pt[]): Pt[] => pts.map(this.at);
  /** A length of `n` screen pixels in own units. */
  px = (n: number): number => n / this.k;
}

function paintFin(P: Painter, shape: readonly Pt[], root: Pt, tip: Pt): void {
  const { ctx, pen } = P;
  const s = P.all(shape);
  ctx.save();
  polyPath(ctx, s);
  ctx.fillStyle = FIN_MID;
  ctx.fill();
  ctx.clip();
  const [r, t] = [P.at(root), P.at(tip)];
  const g = ctx.createLinearGradient(r.x, r.y, t.x, t.y);
  g.addColorStop(0, 'rgba(120,114,92,0.55)');
  g.addColorStop(0.55, 'rgba(60,56,44,0.1)');
  g.addColorStop(1, 'rgba(10,10,8,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -80, 400, 160);
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const to = { x: t.x + (u - 0.5) * 16, y: t.y + (u - 0.5) * 7 };
    pen.hair([r, to], P.px(1.2), FIN_DARK, 0.2 + 0.2 * u);
  }
  linePath(ctx, s.slice(0, Math.ceil(s.length / 2)));
  ctx.strokeStyle = 'rgba(210,205,180,0.35)';
  ctx.lineWidth = P.px(2.4);
  ctx.stroke();
  ctx.restore();
  pen.stroke(s, P.px(2.4), INK, 1, true);
}

function paintBody(P: Painter): void {
  const { ctx, pen } = P;
  const xs: number[] = [];
  for (let x = 152; x >= -141; x -= 3) xs.push(x);
  const contour = (v: number): Pt[] => xs.map((x) => P.at({ x, y: topAt(x) + (botAt(x) - topAt(x)) * v }));
  const outline = [...contour(0), ...contour(1).reverse()];
  ctx.save();
  polyPath(ctx, outline);
  ctx.fillStyle = '#4a473a';
  ctx.fill();
  ctx.clip();
  // Layered washes across the depth: thin bands, each its own tone, so the countershading builds like glazes.
  const BANDS = 46;
  for (let b = 0; b < BANDS; b++) {
    const [v0, v1] = [b / BANDS, (b + 1) / BANDS + 0.012];
    polyPath(ctx, [...contour(v0), ...contour(Math.min(1, v1)).reverse()]);
    ctx.fillStyle = ramp3(BACK_STOPS, (v0 + v1) / 2);
    ctx.fill();
  }
  // Lengthwise: the lamp lights the head and shoulders, the body falls into shadow towards the tail.
  const head = P.at({ x: 110, y: -10 });
  const lamp = ctx.createRadialGradient(head.x + 10, head.y - 30, 4, head.x, head.y, 170);
  lamp.addColorStop(0, 'rgba(236,240,220,0.3)');
  lamp.addColorStop(1, 'rgba(236,240,220,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(-60, -80, 260, 160);
  const fall = ctx.createLinearGradient(60, 0, -150, 0);
  fall.addColorStop(0, 'rgba(8,10,8,0)');
  fall.addColorStop(1, 'rgba(8,10,8,0.42)');
  ctx.fillStyle = fall;
  ctx.fillRect(-200, -80, 400, 160);
  // The break line between dark back and pale belly: a soft ink-wash edge, a hair of ink.
  pen.hair(contour(0.615).filter((_, i) => i % 2 === 0), P.px(1), '#4a4636', 0.28);
  ctx.lineCap = 'round';
  for (const [v, w, c, a] of [[0.3, 9, '#dfe2cc', 0.08], [0.31, 2.5, '#eef0de', 0.12], [0.8, 8, '#efe9d2', 0.12], [0.97, 4, '#4b4738', 0.3]] as const) {
    linePath(ctx, contour(v));
    ctx.strokeStyle = c;
    ctx.globalAlpha = a;
    ctx.lineWidth = P.px(w * 1.6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Broken sheen along the back, and the pale spots a dogfish carries on its flanks.
  for (let r = 0; r < 7; r++) {
    const v = 0.16 + r * 0.03;
    let x = 140 - pen.rng() * 30;
    while (x > -125) {
      const end = Math.max(-130, x - 14 - pen.rng() * 40);
      pen.hair(contour(v).filter((p) => p.x <= x && p.x >= end), P.px(1.1), '#e6e8d6', 0.2 * (1 - r / 8));
      x = end - 5 - pen.rng() * 16;
    }
  }
  for (let i = 0; i < 26; i++) {
    const x = 118 - pen.rng() * 235;
    const v = 0.18 + pen.rng() * 0.36;
    const p = P.at({ x, y: topAt(x) + (botAt(x) - topAt(x)) * v });
    pen.dot(p.x, p.y, P.px(0.9 + pen.rng() * 0.7), '#dfe0cd', 0.5);
  }
  pen.stipple(outline, 900, (_, y) => (y < 0 ? 0.35 : 0.1), P.px(0.8), 'rgba(15,14,10,0.32)');
  ctx.restore();
  pen.stroke(contour(0).filter((_, i) => i % 2 === 0), P.px(2.6), INK, 1, true);
  pen.stroke(contour(1).filter((_, i) => i % 2 === 0), P.px(3), INK, 1, true);
  // The lateral line, faint.
  pen.hair(contour(0.42).filter((p) => p.x < 100 && p.x > -125 && Math.round(p.x) % 2 === 0), P.px(1), '#c6c8b2', 0.25);
}

function paintDorsal(P: Painter, fin: readonly Pt[], spine: readonly Pt[], foot0: number, foot1: number, apex: Pt): void {
  const { ctx, pen } = P;
  const s = P.all(fin);
  ctx.save();
  polyPath(ctx, s);
  ctx.fillStyle = '#3d3a2f';
  ctx.fill();
  ctx.clip();
  const root = P.at({ x: (foot0 + foot1) / 2, y: topAt((foot0 + foot1) / 2) });
  const a = P.at(apex);
  const g = ctx.createLinearGradient(root.x, root.y, a.x, a.y);
  g.addColorStop(0, 'rgba(60,56,44,0.0)');
  g.addColorStop(1, 'rgba(8,8,6,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -80, 400, 160);
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const foot = P.at({ x: foot0 + (foot1 - foot0) * u, y: topAt(foot0 + (foot1 - foot0) * u) });
    pen.hair([foot, { x: a.x + (u - 0.2) * 5, y: a.y + 3 + u * 5 }], P.px(1.1), u < 0.3 ? '#a9ad98' : '#0e0e0a', u < 0.3 ? 0.35 : 0.2 + 0.2 * u);
  }
  ctx.restore();
  pen.stroke(s.slice(0, s.length - 1), P.px(2.4), INK, 1, true);
  // The spine in front: a pale, firm spike with its own outline.
  const sp = P.all(spine);
  polyPath(ctx, sp);
  const sg = ctx.createLinearGradient(sp[0]!.x, sp[0]!.y, sp[1]!.x, sp[1]!.y);
  sg.addColorStop(0, '#ddd8bf');
  sg.addColorStop(1, '#faf6e6');
  ctx.fillStyle = sg;
  ctx.fill();
  pen.stroke([...sp, sp[0]!], P.px(1.8), INK, 1, false);
}

/** Five gill slits: dark, edged, the lips pale. Flared they open to red filaments; with slime they bulge with gel and trail strands. */
function paintGills(P: Painter, look: DogLook): void {
  const { ctx, pen } = P;
  const flare = clamp(look.flare ?? 0);
  const gel = clamp(look.gel ?? 0);
  for (const x of GILL_XS) {
    const top = topAt(x) * 0.42;
    const bot = botAt(x) * 0.5;
    const open = 0.9 + 2.9 * flare;
    const slit = spline([{ x: x + 2.4, y: top }, { x: x - 0.2, y: top * 0.4 }, { x: x - 0.5, y: bot * 0.4 }, { x: x + 1.6, y: bot }], 6).map(P.at);
    const mouthPts = [...slit, ...[...slit].reverse().map((p, k, all) => ({ x: p.x - open * Math.sin((Math.PI * k) / (all.length - 1)), y: p.y }))];
    polyPath(ctx, mouthPts);
    ctx.fillStyle = flare > 0.2 ? mix('#2a0e12', '#8a1c28', flare) : '#15100e';
    ctx.fill();
    if (flare > 0.25) {
      ctx.save();
      polyPath(ctx, mouthPts);
      ctx.clip();
      for (let f = 0; f < 6; f++) {
        const p = slit[Math.floor(((f + 0.5) / 6) * (slit.length - 1))]!;
        pen.hair([{ x: p.x, y: p.y }, { x: p.x - open * 0.9, y: p.y + 0.5 }], P.px(1.2), '#e0617a', 0.7 * flare);
      }
      ctx.restore();
    }
    pen.stroke(slit, P.px(1.9), INK, 1, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x + 1.6, y: p.y })), P.px(1.3), '#f1eedc', 0.45);
  }
  paintGillGel(P, look);
}

/**
 * Gel in the gills: each slit bulging, packed with milky gel; when the shark
 * gags (`spew`), gel trailing back out of each slit in the water.
 */
function paintGillGel(P: Painter, look: DogLook): void {
  const gel = clamp(look.gel ?? 0);
  if (gel < 0.02) return;
  const flare = clamp(look.flare ?? 0);
  const spew = clamp(look.spew ?? 0);
  const drift = look.drift ?? 0;
  const g = newGel();
  for (const [i, x] of GILL_XS.entries()) {
    const top = topAt(x) * 0.42;
    const bot = botAt(x) * 0.5;
    const open = 0.9 + 2.9 * flare;
    const sway = drift + i * 0.8;
    // The bulge: a lens of gel swelling out of the slit along its length.
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      const y = top + (bot - top) * (0.12 + 0.76 * u);
      const r = (0.9 + 0.8 * gel + 0.25 * open) * (0.7 + 0.5 * Math.sin(Math.PI * (0.15 + 0.7 * u)));
      g.lobes.push({ ...P.at({ x: x - open * 0.55 - 0.6 * gel, y }), r });
    }
    if (spew > 0.02) {
      // Trailing back out on the water flowing over the body.
      const base = P.at({ x: x - open, y: (top + bot) * 0.5 });
      const run = Array.from({ length: 10 }, (_, q) => {
        const u = q / 9;
        return { x: base.x - (q * 3.2 + 10 * u * u) * spew + 1.6 * Math.sin(sway + q * 0.7) * u, y: base.y + (q * 1.8 + 14 * u * u) * spew };
      });
      g.ribbons.push({ pts: run, w: 7 + Math.sin(sway), peak: 0.4 });
      for (const [k, r] of [[2, 4], [5, 5.5], [8, 6.5]] as const) g.lobes.push({ ...run[k]!, r: r * spew * (0.85 + 0.15 * Math.sin(sway * 1.3 + k)) });
      threadsAlong(g, run, 1.6, 2, 70 + i);
    }
    threadsAlong(g, Array.from({ length: 5 }, (_, q) => P.at({ x: x - open * 0.55, y: top + ((bot - top) * q) / 4 })), 0.8, 2, 90 + i);
  }
  paintGel(P.ctx, g, Math.min(1, 1.25 * gel));
}

function paintEye(P: Painter, look: DogLook): void {
  const { ctx } = P;
  const wide = clamp(look.wide ?? 0);
  const { x, y } = P.at(DOG_EYE);
  const r = EYE_R * (1 + 0.3 * wide);
  const lw = P.px(1);
  const socket = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.9);
  socket.addColorStop(0, 'rgba(10,12,8,0.5)');
  socket.addColorStop(1, 'rgba(10,12,8,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#07100a';
  ctx.fill();
  ctx.clip();
  // The tapetum: a reflective green glow, brightest low in the eye, soft towards the dark rim.
  const g = ctx.createRadialGradient(x - r * 0.05, y + r * 0.3, r * 0.05, x, y + r * 0.1, r * 0.98);
  g.addColorStop(0, 'rgba(214,255,150,0.95)');
  g.addColorStop(0.4, 'rgba(110,210,104,0.9)');
  g.addColorStop(0.8, 'rgba(24,96,62,0.9)');
  g.addColorStop(1, 'rgba(5,24,16,1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
  ctx.fill();
  // The pupil: a dark oval, small when startled.
  ctx.fillStyle = '#030805';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.02, y - r * 0.05, r * (0.5 - 0.2 * wide), r * (0.44 - 0.14 * wide), 0, 0, Math.PI * 2);
  ctx.fill();
  // The catchlight: a bright window high up, and a small one low.
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y - r * 0.38, r * 0.22, r * 0.17, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - r * 0.38, y + r * 0.42, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}


/** The mouth under the snout: a firm line; open, a dark gape with a row of small teeth and a pale lower jaw. */
function paintMouth(P: Painter, look: DogLook): void {
  const { ctx, pen } = P;
  const gape = clamp(look.gape ?? 0);
  const upper = P.all(MOUTH);
  if (gape > 0.03) {
    const drop = 9 * gape;
    const lower = MOUTH.map((p, i, all) => {
      const u = i / (all.length - 1);
      return P.at({ x: p.x - 3 * gape * u, y: p.y + drop * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.12)) ** 0.8 });
    });
    polyPath(ctx, [...upper, ...[...lower].reverse()]);
    ctx.fillStyle = '#240a10';
    ctx.fill();
    // Lower jaw skin under the gape.
    polyPath(ctx, [...lower, ...lower.map((p) => ({ x: p.x + 1, y: p.y + 1.3 + 0.8 * gape })).reverse()]);
    ctx.fillStyle = '#bdb7a0';
    ctx.fill();
    ctx.save();
    polyPath(ctx, [...upper, ...[...lower].reverse()]);
    ctx.clip();
    ctx.fillStyle = '#c24d62';
    const tongue = upper[Math.floor(upper.length * 0.55)]!;
    ctx.beginPath();
    ctx.ellipse(tongue.x, tongue.y + drop * 0.65, 8, 2.5 + 2 * gape, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#f5f0e0';
    for (const [row, sgn] of [[upper, 1], [lower, -1]] as const) {
      for (let i = 1; i < 9; i++) {
        const p = row[Math.round((i / 9) * (row.length - 1))]!;
        ctx.beginPath();
        ctx.moveTo(p.x - 1.1, p.y);
        ctx.lineTo(p.x, p.y + sgn * 2.2);
        ctx.lineTo(p.x + 1.1, p.y);
        ctx.fill();
      }
    }
    pen.stroke(lower, P.px(2), INK, 1, false);
  }
  pen.stroke(upper, P.px(2.2), INK, 1, false);
  pen.hair(spline([{ x: 114, y: 12 }, { x: 111.5, y: 11 }, { x: 110.5, y: 9 }], 3).map(P.at), P.px(1.4), INK, 0.7);
  // The nostril and a few pores on the snout.
  pen.stroke(spline([{ x: 146, y: 3.2 }, { x: 143.5, y: 4.4 }, { x: 140.5, y: 4.6 }], 3).map(P.at), P.px(1.5), INK, 0.9, false);
  for (let i = 0; i < 9; i++) {
    const p = P.at({ x: 140 - i * 2.6 - pen.rng() * 1.2, y: topAt(140 - i * 2.6) + (i % 3) * 2.8 + 3 });
    pen.dot(p.x, p.y, P.px(0.9), '#16140e', 0.45);
  }
}

/** A pectoral or pelvic drawn at its root (0,0), washed and outlined; unbent. */
function paintFinShaded(P: Painter, shape: readonly Pt[], far: boolean): void {
  const { ctx, pen } = P;
  ctx.save();
  polyPath(ctx, shape);
  ctx.fillStyle = far ? '#2e2c24' : '#55513f';
  ctx.fill();
  ctx.clip();
  const g = ctx.createLinearGradient(0, -6, 30, 18);
  g.addColorStop(0, far ? 'rgba(0,0,0,0.25)' : 'rgba(150,146,120,0.5)');
  g.addColorStop(0.55, 'rgba(40,38,30,0.1)');
  g.addColorStop(1, far ? 'rgba(0,0,0,0.55)' : 'rgba(8,8,6,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -20, 60, 50);
  if (!far) {
    for (let i = 0; i < 7; i++) pen.hair([{ x: 1, y: -3 + i * 1.6 }, { x: 28 + i * 1.5, y: 4 + i * 2.2 }], P.px(1), FIN_DARK, 0.25);
    linePath(ctx, shape.slice(0, Math.ceil(shape.length / 2)));
    ctx.strokeStyle = 'rgba(220,215,190,0.4)';
    ctx.lineWidth = P.px(2.4);
    ctx.stroke();
  }
  ctx.restore();
  pen.stroke([...shape, shape[0]!], P.px(far ? 2 : 2.4), INK, 1, true);
}

/** The dogfish, nose right in its own units, placed, turned and mirrored by `p`. */
export function drawDogfish(ctx: CanvasRenderingContext2D, p: DogPlaced, look: DogLook, boil: number): void {
  const k = p.len / DOG_UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const P = new Painter(ctx, k, boil, look.bend ?? 0, p.beat);
  const paddle = 0.05 * Math.sin(p.beat * 0.5);
  // The far pectoral, shaded dark behind the body.
  ctx.save();
  ctx.translate(PEC_AT.x - 6, PEC_AT.y - 1);
  ctx.rotate(0.22 + paddle);
  ctx.scale(0.8, 0.8);
  paintFinShaded(P, PECTORAL, true);
  ctx.restore();
  paintFin(P, CAUDAL, { x: -120, y: 0 }, { x: -170, y: -37 * Y });
  paintBody(P);
  paintDorsal(P, DORSAL1, SPINE1, 28, -13, { x: 6, y: -37.5 * Y });
  paintDorsal(P, DORSAL2, SPINE2, -66, -98, { x: -83, y: -30.5 * Y });
  ctx.save();
  const pelvic = P.at(PELVIC_AT);
  ctx.translate(pelvic.x, pelvic.y);
  ctx.rotate(0.2 - paddle);
  paintFinShaded(P, PELVIC, false);
  ctx.restore();
  paintGills(P, look);
  paintMouth(P, look);
  paintEye(P, look);
  ctx.save();
  ctx.translate(PEC_AT.x, PEC_AT.y);
  ctx.rotate(0.1 + paddle - 0.25 * (look.flare ?? 0));
  ctx.scale(0.85, 0.85);
  paintFinShaded(P, PECTORAL, false);
  ctx.restore();
  ctx.restore();
}

/** Screen position of a point in the dogfish's own units. */
export function onDog(p: DogPlaced, local: Pt, bend = 0): Pt {
  const k = p.len / DOG_UNITS;
  const ly = local.y + curve(local.x, bend, p.beat);
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  return { x: p.x + p.face * (local.x * k * c - ly * k * s), y: p.y + local.x * k * s + ly * k * c };
}

/** Where the dogfish must sit so that own-units `local` lands on `target`. */
export function pinDog(p: Omit<DogPlaced, 'x' | 'y'>, local: Pt, target: Pt, bend = 0): DogPlaced {
  const off = onDog({ ...p, x: 0, y: 0 }, local, bend);
  return { ...p, x: target.x - off.x, y: target.y - off.y };
}

/**
 * A few teeth showing round whatever the underslung jaws hold, drawn over it: the
 * upper row pointing down from the snout, the lower row pointing up from the
 * dropped lower jaw.
 */
export function drawBiteJaws(ctx: CanvasRenderingContext2D, p: DogPlaced, bend: number, gape: number): void {
  const k = p.len / DOG_UNITS;
  const drop = 9 * clamp(gape);
  ctx.save();
  ctx.fillStyle = '#f7f2e2';
  ctx.strokeStyle = 'rgba(27,26,31,0.9)';
  ctx.lineWidth = Math.max(1.2, k * 0.3);
  ctx.lineJoin = 'round';
  const tooth = (x: number, y: number, dy: number): void => {
    const [a, b, tip] = [onDog(p, { x: x + 1.3, y }, bend), onDog(p, { x: x - 1.3, y }, bend), onDog(p, { x, y: y + dy }, bend)];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  for (let i = 1; i < 8; i++) {
    const m = MOUTH[Math.round((i / 8) * (MOUTH.length - 1))]!;
    const u = i / 8;
    if (m.x > 108 && m.x < 138) {
      tooth(m.x, m.y, 2.6);
      tooth(m.x - 3 * gape * u, m.y + drop * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.12)) ** 0.8, -2.6);
    }
  }
  ctx.restore();
}
