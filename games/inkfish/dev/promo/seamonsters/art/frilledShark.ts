import { ellipse, INK, type Pen } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../../foodchain/kit';
import { boilOf, paint, penFor, type Pt, range, rot, spline, trace } from '../../swallowyou/art/ink';

/**
 * The frilled shark (Chlamydoselachus anguineus), side on, in the game's pen
 * and ink painted like the crocodile (../../swallowyou/art/croc.ts): a long
 * eel-like body in dark chocolate brown, the flat snake's head with its
 * mouth right at the front (not tucked underneath like most sharks), a big
 * pale green eye, six frilly gill flaps (the first one runs on under the
 * throat like a collar), the little fins set far back, and the long tail with
 * its big lower lobe. The jaw drops about a hinge far behind the eye onto
 * rows of pale three-pointed (trident) teeth. The body swims in an eel's
 * travelling wave that grows from nothing at the head to the tail tip.
 *
 * Local px: the snout's tip at x = 0, facing right, the tail tip at
 * x = -LEN, y down, the body's middle line at y = 0. Everything is drawn
 * straight, then carried along the wave by `bend`.
 */

const LEN = 1000;

export interface FrilledSharkPose {
  /** Jaws, 0 shut .. 1 wide. */
  readonly gape?: number;
  /** The body wave's phase, radians (defaults to swimming steadily with time). */
  readonly swim?: number;
  /** How hard it swims: the wave's height, 0 still .. 1 (default 0.6). */
  readonly effort?: number;
}

/** Body height (fins and the swimming wave included) over length, for laying it out beside "you". */
export const FRILLED_SHARK_HEIGHT = 0.15;

const BROWN_TOP = '#24180f';
const BROWN = '#3b281d';
const BROWN_FLANK = '#56392a';
const BROWN_BELLY = '#6e4f3c';
const FIN_FAR = '#2a1b13';
const FRILL = '#6b4434';
const FRILL_LIGHT = '#a8775c';
const FRILL_RED = '#6e2a26';
const SLIT = '#1a0807';
const MOUTH_DEEP = '#150709';
const MOUTH = '#4a2025';
const MOUTH_LIP = '#7e4246';
const GUM = '#a8676a';
const TOOTH = '#f6f1e2';
const TOOTH_BACK = '#d3c8b0';
const LATERAL = '#b08f74';
const SHEEN = '#e2cdb6';

/** The jaw turns about the corner of the mouth, far back behind the eye; at full gape by this much (radians). */
const HINGE: Pt = { x: -98, y: 8 };
const GAPE_MAX = 0.72;
const EYE = { x: -45, y: -11, r: 8.5 } as const;

// ---------------------------------------------------------------- the shapes, straight (before the wave)

/** Upper outline, snout to tail tip: the rounded snout, the flat head, the long back, the upper edge of the tail. */
const TOP: readonly Pt[] = spline([
  { x: 0, y: -1 }, { x: 0, y: -6 }, { x: -4, y: -13 }, { x: -12, y: -19 }, { x: -24, y: -22.5 }, { x: -45, y: -24.5 }, { x: -75, y: -26 }, { x: -105, y: -28 },
  { x: -140, y: -31 }, { x: -200, y: -35 }, { x: -300, y: -38 }, { x: -420, y: -37 }, { x: -540, y: -33 }, { x: -640, y: -28 },
  { x: -740, y: -21 }, { x: -830, y: -15 }, { x: -910, y: -10 }, { x: -970, y: -5 }, { x: -1000, y: -1 },
], 5);

/** The underside, tail tip back to the throat. */
const UNDER: readonly Pt[] = spline([
  { x: -1000, y: 2 }, { x: -960, y: 5 }, { x: -900, y: 9 }, { x: -820, y: 14 }, { x: -740, y: 20 }, { x: -640, y: 27 }, { x: -520, y: 33 },
  { x: -400, y: 36 }, { x: -280, y: 35 }, { x: -200, y: 32 }, { x: -150, y: 29 }, { x: -118, y: 26 },
], 5);

/** The upper lip, hinge to snout tip: nearly straight, the mouth runs the whole head. */
const UPPER_LIP: readonly Pt[] = spline([{ x: -98, y: 6 }, { x: -80, y: 5 }, { x: -55, y: 4 }, { x: -30, y: 3 }, { x: -12, y: 2 }, { x: 0, y: 0 }], 4);

/** The lower jaw (shut): its lip from the tip back to the hinge, its underside from behind the hinge to the chin. */
const JAW_LIP: readonly Pt[] = spline([{ x: -1, y: 3 }, { x: -14, y: 5 }, { x: -32, y: 6 }, { x: -56, y: 7 }, { x: -80, y: 8 }, { x: -98, y: 9 }], 4);
const JAW_UNDER: readonly Pt[] = spline([{ x: -124, y: 26 }, { x: -100, y: 23 }, { x: -75, y: 19 }, { x: -50, y: 15 }, { x: -26, y: 11 }, { x: -9, y: 8 }, { x: -2, y: 5 }], 4);

/** The six gill slits, front to back (x), and how far up and down each runs. */
const GILLS: readonly number[] = [-120, -133, -146, -159, -172, -185];

/** The fins, closed outlines: the small paddle pectoral, the low pelvic, the dorsal and anal set far back, the tail's big lower lobe. */
const PECTORAL: readonly Pt[] = spline([{ x: -198, y: 24 }, { x: -204, y: 36 }, { x: -220, y: 46 }, { x: -238, y: 47 }, { x: -236, y: 36 }, { x: -224, y: 27 }], 4, true);
const PELVIC: readonly Pt[] = spline([{ x: -555, y: 30 }, { x: -580, y: 48 }, { x: -625, y: 60 }, { x: -668, y: 58 }, { x: -655, y: 42 }, { x: -628, y: 30 }], 4, true);
const DORSAL: readonly Pt[] = spline([{ x: -628, y: -26 }, { x: -648, y: -40 }, { x: -684, y: -46 }, { x: -712, y: -38 }, { x: -720, y: -22 }, { x: -680, y: -20 }], 4, true);
const ANAL: readonly Pt[] = spline([{ x: -648, y: 24 }, { x: -668, y: 44 }, { x: -712, y: 54 }, { x: -752, y: 46 }, { x: -758, y: 18 }, { x: -700, y: 18 }], 4, true);
const CAUDAL: readonly Pt[] = spline([
  { x: -762, y: 16 }, { x: -800, y: 36 }, { x: -856, y: 58 }, { x: -902, y: 64 }, { x: -930, y: 50 }, { x: -968, y: 22 }, { x: -1000, y: 3 },
  { x: -930, y: 4 }, { x: -850, y: 8 },
], 4, true);

/** Where a line (running in x) crosses x. */
function edgeY(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
  }
  return line[line.length - 1]!.y;
}

interface Speck { readonly p: Pt; readonly r: number; readonly light: boolean; readonly a: number }

/** Fine speckles fixed to the skin (not the boil): dark ones all over, pale ones down on the belly. */
const SPECKS: readonly Speck[] = (() => {
  const rng = createRng(6221);
  return Array.from({ length: 700 }, () => {
    const x = -20 - rng() * 960;
    const v = rng();
    const y = edgeY(TOP, x) * (1 - v) + edgeY(UNDER, x) * v;
    const light = v > 0.55 && rng() < 0.7;
    return { p: { x, y: y * 0.92 }, r: 0.6 + rng() * 1.1, light, a: 0.25 + rng() * 0.3 };
  });
})();

// ---------------------------------------------------------------- the swimming wave

interface Wave {
  readonly phase: number;
  readonly amp: number;
}

/** The spine's height and slope at x: nothing at the snout, growing to the tail tip, travelling backwards. */
function spineAt(x: number, w: Wave): { readonly y: number; readonly slope: number } {
  const s = Math.max(0, Math.min(1, -x / LEN));
  const k = Math.PI * 2 * 1.2;
  const a = w.amp * s ** 1.6;
  const arg = w.phase - k * s;
  const dyds = w.amp * 1.6 * s ** 0.6 * Math.sin(arg) - a * k * Math.cos(arg);
  return { y: a * Math.sin(arg), slope: -dyds / LEN };
}

/** A straight-drawn point carried onto the wave: shifted with the spine and turned with it, so the body keeps its thickness. */
function bend(p: Pt, w: Wave): Pt {
  const { y, slope } = spineAt(p.x, w);
  const a = Math.atan(slope);
  return { x: p.x - p.y * Math.sin(a), y: y + p.y * Math.cos(a) };
}

const at = (path: readonly Pt[], u: number): Pt => {
  const f = Math.max(0, Math.min(1, u)) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(f));
  const k = f - i;
  return { x: path[i]!.x + (path[i + 1]!.x - path[i]!.x) * k, y: path[i]!.y + (path[i + 1]!.y - path[i]!.y) * k };
};

// ---------------------------------------------------------------- drawing

/** What every part needs: the pen, the line widths in local px, the wave. */
interface Kit {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** Local px per screen px. */
  readonly k: number;
  readonly ink: number;
  readonly wave: Wave;
  readonly bent: (pts: readonly Pt[]) => Pt[];
}

/** A soft dark (or light) edge along part of an outline, painted inside it in three soft passes. */
function edgeShade(ctx: CanvasRenderingContext2D, clip: readonly Pt[], edge: readonly Pt[], width: number, rgba: string): void {
  ctx.save();
  trace(ctx, clip);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba;
  for (const f of [1, 0.62, 0.32]) {
    ctx.lineWidth = width * f;
    trace(ctx, edge, false);
    ctx.stroke();
  }
  ctx.restore();
}

function fin(c: Kit, shape: readonly Pt[], far: boolean, seed: number): void {
  const pts = c.bent(shape);
  const ys = pts.map((p) => p.y);
  const xs = pts.map((p) => p.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const stops = far ? [FIN_FAR, FIN_FAR, BROWN] : [BROWN, BROWN_FLANK, BROWN_TOP];
  paint(c.ctx, c.pen, pts, { from: { x: mid, y: Math.min(...ys) }, to: { x: mid, y: Math.max(...ys) }, stops, ink: c.ink * 0.85, hatch: 0, mottle: 0.5, seed });
  // Fin rays: faint lines fanning out from the root.
  if (!far && c.k < 1.2) {
    c.pen.clipped(pts, () => {
      for (let i = 1; i < 6; i++) {
        const tip = pts[Math.round((i / 6) * (pts.length * 0.55))]!;
        const root = pts[pts.length - 1]!;
        c.pen.hair([root, tip], Math.max(0.6, 0.8 * c.k), '#140c08', 0.3);
      }
    });
  }
}

/** The inside of the open mouth, the stretched throat under it, and the dropped lower jaw with its teeth. */
function drawJaw(c: Kit, gape: number): void {
  const turn = (p: Pt): Pt => rot(p, gape, HINGE);
  const jawLip = JAW_LIP.map(turn);
  if (gape > 0.01) {
    drawThroat(c, JAW_UNDER.map(turn));
    drawMouthInside(c, jawLip);
  }
  const jaw = c.bent([...JAW_LIP, ...JAW_UNDER].map(turn));
  paint(c.ctx, c.pen, jaw, { from: turn({ x: -50, y: 2 }), to: turn({ x: -50, y: 22 }), stops: [BROWN_FLANK, BROWN, BROWN_TOP], ink: c.ink, hatch: 0, mottle: 0.5, seed: 72 });
  if (gape > 0.04) teethRows(c, [...jawLip].reverse(), -Math.PI / 2 - 0.4 + gape, gape);
}

/**
 * The throat skin stretched between the belly behind the gills and the
 * dropped jaw: only its lower edge is inked, the rest tucks under the body.
 */
function drawThroat(c: Kit, under: readonly Pt[]): void {
  const chin = under[Math.round(under.length * 0.55)]!;
  const back = under[0]!;
  const edge = spline([{ x: -215, y: 33.5 }, { x: -160, y: 32 }, { x: (chin.x - 140) / 2, y: (chin.y + 30) / 2 + 4 }, chin], 6);
  const upTo = under.slice(0, Math.round(under.length * 0.55) + 1).reverse();
  const shape = c.bent([...edge, ...upTo, back, { x: -150, y: 4 }, { x: -215, y: 10 }]);
  paint(c.ctx, c.pen, shape, { from: { x: -130, y: 10 }, to: { x: -130, y: 60 }, stops: [BROWN, BROWN_FLANK, BROWN_BELLY], ink: 0, hatch: 0, mottle: 0.4, seed: 71 });
  // Folds where the skin stretches.
  for (let i = 1; i < 4; i++) {
    const f = i / 4;
    const fold = spline([{ x: -200 + 40 * f, y: 30 }, { x: -150 + 30 * f, y: 30 + 6 * f }, { x: chin.x - 30 * (1 - f), y: chin.y - 6 }], 5);
    c.pen.hair(c.bent(fold), Math.max(0.5, c.ink * 0.3), '#1a0f0a', 0.35);
  }
  c.pen.stroke(c.bent(edge), c.ink * 0.9, INK, 1, true);
}

function drawMouthInside(c: Kit, jawLip: readonly Pt[]): void {
  const { ctx } = c;
  const tipU = UPPER_LIP[UPPER_LIP.length - 1]!;
  const tipL = jawLip[0]!;
  const spread = Math.hypot(tipL.x - tipU.x, tipL.y - tipU.y);
  const toHinge = Math.atan2(HINGE.y - (tipU.y + tipL.y) / 2, HINGE.x - (tipU.x + tipL.x) / 2);
  const front = { x: (tipU.x + tipL.x) / 2 + Math.cos(toHinge) * spread * 0.16, y: (tipU.y + tipL.y) / 2 + Math.sin(toHinge) * spread * 0.16 };
  const inside = c.bent([{ x: -112, y: 9 }, ...UPPER_LIP, ...spline([tipU, front, tipL], 4).slice(1, -1), ...jawLip]);
  const g = ctx.createLinearGradient(-110, 0, 0, 0);
  g.addColorStop(0, MOUTH_DEEP);
  g.addColorStop(0.45, MOUTH);
  g.addColorStop(1, MOUTH_LIP);
  ctx.save();
  trace(ctx, inside);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The gullet: dark, deep at the hinge.
  const throat = ctx.createRadialGradient(-104, 12, 2, -104, 12, 70);
  throat.addColorStop(0, 'rgba(6,1,2,0.95)');
  throat.addColorStop(1, 'rgba(30,8,10,0)');
  ctx.fillStyle = throat;
  ctx.fillRect(-180, -70, 200, 160);
  ctx.restore();
  // Pink gums along both lips, where the teeth root, and the tongue on the floor.
  c.pen.clipped(inside, () => {
    c.pen.stroke(c.bent(UPPER_LIP.slice(3)), c.ink * 2.6, GUM, 0.55, false);
    c.pen.stroke(c.bent(jawLip.slice(0, -3)), c.ink * 2.6, GUM, 0.55, false);
    const floor = jawLip.slice(5, -4).map((p) => ({ x: p.x - 4, y: p.y - 7 }));
    c.pen.stroke(c.bent(floor), c.ink * 3, '#8a4a4c', 0.5, false);
  });
  c.pen.stroke(inside, c.ink * 0.7, INK, 0.9, false);
}

/**
 * A trident tooth: three slender needles from one root, the middle one the
 * longest, the outer two splayed; pale, with a fine inked edge.
 */
function trident(c: Kit, base: Pt, angle: number, len: number, w: number, color: string, alpha: number): void {
  const d = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = { x: -d.y, y: d.x };
  const p = (along: number, side: number): Pt => ({ x: base.x + d.x * len * along + n.x * w * side, y: base.y + d.y * len * along + n.y * w * side });
  const cusps = [-1, 0, 1].map((s) => (s === 0 ? [p(0, -0.45), p(1, 0), p(0, 0.45)] : [p(0, s * 0.7), p(0.72, s * 1.9), p(0.05, s * 0.05)]));
  const root = [p(-0.12, -1.05), p(0.12, -0.9), p(0.18, 0), p(0.12, 0.9), p(-0.12, 1.05)];
  c.pen.fill(root, color, alpha);
  for (const cusp of cusps) {
    c.pen.fill(cusp, color, alpha);
    if (c.k < 0.9) c.pen.hair([...cusp, cusp[0]!], Math.max(0.3, 0.45 * c.k), INK, 0.75 * alpha);
  }
}

/** Rows of trident teeth along a lip (hinge .. tip): a big front row on the lip, a smaller row set back inside the mouth. */
function teethRows(c: Kit, lip: readonly Pt[], angle: number, open: number): void {
  const grow = Math.min(1, open / 0.3);
  const count = 12;
  for (let row = 1; row >= 0; row--) {
    for (let i = 0; i < count - row; i++) {
      const u = 0.1 + (i + row * 0.5) * (0.87 / count);
      const base = at(lip, u);
      const inward = { x: Math.cos(angle) * 4 * row, y: Math.sin(angle) * 4 * row };
      const size = (row ? 0.7 : 1) * (0.8 + 0.3 * Math.sin(Math.PI * u)) * grow;
      const pt = c.bent([{ x: base.x + inward.x, y: base.y + inward.y }])[0]!;
      trident(c, pt, angle, 12.5 * size, 1.9 * size, row ? TOOTH_BACK : TOOTH, row ? 0.8 : 1);
    }
  }
}

/** One frilly gill flap: the dark slit, and the scalloped free edge of the flap lying back over it, red gill showing beneath. */
function gill(c: Kit, x: number, first: boolean): void {
  const top = -19 + (x + 120) * 0.04;
  const bottom = first ? 31 : 27 - (x + 120) * 0.02;
  const n = 60;
  const slit = range(n, (v) => ({ x: x + 3.5 * Math.sin(Math.PI * v) - (first ? 8 : 3) * v * v, y: top + (bottom - top) * v }));
  // Scallops: uneven rounded lobes along the free edge, deepest in the middle of the slit; no two flaps alike.
  const lobe = (v: number): number =>
    3.6 + (2.2 + 1.2 * Math.sin(v * 9 + x)) * Math.abs(Math.sin(v * Math.PI * (5.5 + (x % 3)) + x * 0.37)) * Math.sin(Math.PI * Math.min(1, v * 1.1));
  const edge = slit.map((p, i) => ({ x: p.x - lobe(i / n), y: p.y }));
  const flap = c.bent([...slit, ...[...edge].reverse()]);
  const gap = c.bent([...edge, ...[...edge].reverse().map((p) => ({ x: p.x - 3.4, y: p.y }))]);
  c.pen.fill(gap, SLIT, 0.95);
  c.pen.fill(c.bent(edge.map((p) => ({ x: p.x - 1.4, y: p.y }))).concat(c.bent([...edge].reverse().map((p) => ({ x: p.x - 2.4, y: p.y })))), FRILL_RED, 0.75);
  const g = c.ctx.createLinearGradient(x, top, x, bottom);
  g.addColorStop(0, BROWN);
  g.addColorStop(0.6, BROWN_FLANK);
  g.addColorStop(1, FRILL);
  c.ctx.save();
  trace(c.ctx, flap);
  c.ctx.fillStyle = g;
  c.ctx.fill();
  c.ctx.restore();
  // Light catching the crinkled free edge.
  c.pen.clipped(flap, () => c.pen.stroke(c.bent(edge.map((p) => ({ x: p.x + 1.4, y: p.y }))), 2.2, FRILL_LIGHT, 0.4, false));
  c.pen.hair(c.bent(edge), Math.max(0.6, c.ink * 0.5), INK, 0.95);
  c.pen.hair(c.bent(slit), Math.max(0.5, c.ink * 0.3), SLIT, 0.5);
}

function drawBody(c: Kit, outline: readonly Pt[]): void {
  paint(c.ctx, c.pen, outline, { from: { x: -400, y: -38 }, to: { x: -400, y: 36 }, stops: [BROWN_TOP, BROWN, BROWN_FLANK, BROWN_BELLY], ink: 0, hatch: 0, mottle: 0.9, seed: 73 });
  // Light from above: a dark back, a soft sheen on the upper flank, a warmer belly, all following the wave.
  edgeShade(c.ctx, outline, c.bent(TOP), 24, 'rgba(14,8,5,0.24)');
  edgeShade(c.ctx, outline, c.bent(range(40, (u) => ({ x: -60 - u * 880, y: -14 + 9 * u }))), 12, 'rgba(190,150,118,0.07)');
  edgeShade(c.ctx, outline, c.bent(UNDER), 16, 'rgba(160,120,92,0.16)');
  // Hatching on the shadowed underside only.
  const band = c.bent([...UNDER, ...[...UNDER].reverse().map((p) => ({ x: p.x, y: p.y * 0.3 }))]);
  const spacing = Math.max(7, 4.5 * c.k);
  c.pen.clipped(outline, () => c.pen.hatch(band, spacing, 1.05, Math.max(0.6, 0.8 * c.k), { color: '#0b0705', alpha: 0.4 }));
  if (c.k < 3) {
    c.pen.clipped(outline, () => {
      for (const sp of SPECKS) {
        const q = bend(sp.p, c.wave);
        c.ctx.globalAlpha = sp.a;
        c.ctx.fillStyle = sp.light ? '#caa98a' : '#0f0805';
        c.ctx.beginPath();
        c.ctx.arc(q.x, q.y, (0.45 + 0.6 * sp.r) * c.k, 0, Math.PI * 2);
        c.ctx.fill();
      }
    });
  }
  // The lateral line, an open groove down the flank, and wet light along the back.
  c.pen.hair(c.bent(range(40, (u) => ({ x: -190 - u * 790, y: -3 + 2 * u }))), Math.max(0.6, 1.1 * c.k), LATERAL, 0.45);
  c.pen.hair(c.bent(range(30, (u) => ({ x: -150 - u * 560, y: -29 + 3 * Math.sin(Math.PI * u) }))), Math.max(1, 2.4 * c.k), SHEEN, 0.28);
  // The contour, all but the cheek behind the mouth's corner (open there onto the throat).
  c.pen.stroke(c.bent([...UPPER_LIP, ...TOP.slice(1), ...UNDER.slice(1)]), c.ink, INK, 1, true);
}

/** The big pale-green eye in its dark socket, with a glint. */
function drawEye(c: Kit): void {
  const { ctx, pen } = c;
  const e = c.bent([EYE])[0]!;
  // Never smaller than a few screen px, so it still reads small in the line-up.
  const r = Math.max(EYE.r, 2.6 * c.k);
  pen.fill(ellipse(e.x, e.y, r * 1.28, r * 1.08, 22), '#120a07', 1);
  const g = ctx.createRadialGradient(e.x + r * 0.2, e.y - r * 0.2, r * 0.1, e.x, e.y, r);
  g.addColorStop(0, '#dfe39d');
  g.addColorStop(0.55, '#a6b35f');
  g.addColorStop(1, '#4f5c24');
  ctx.save();
  trace(ctx, ellipse(e.x, e.y, r, r * 0.88, 22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.fill(ellipse(e.x + r * 0.12, e.y + r * 0.04, r * 0.5, r * 0.46, 18), '#07070a', 1);
  pen.dot(e.x + r * 0.32, e.y - r * 0.34, r * 0.24, '#fffbea', 0.95);
  pen.dot(e.x - r * 0.25, e.y + r * 0.28, r * 0.1, '#fffbea', 0.6);
  pen.stroke([...ellipse(e.x, e.y, r * 1.28, r * 1.08, 22), ellipse(e.x, e.y, r * 1.28, r * 1.08, 22)[0]!], c.ink * 0.75, INK, 1, false);
  // A heavy brow over it: a snake's frown.
  const b = r / EYE.r;
  pen.hair(c.bent(spline([{ x: EYE.x - 13 * b, y: EYE.y - 7 * b }, { x: EYE.x, y: EYE.y - 13 * b }, { x: EYE.x + 13 * b, y: EYE.y - 9 * b }], 4)), Math.max(0.8, c.ink * 0.6), INK, 0.85);
  // The nostril, a slit on the snout.
  pen.hair(c.bent([{ x: -7, y: -9 }, { x: -12, y: -11 }]), Math.max(0.8, c.ink * 0.6), INK, 0.9);
}

/** The whole shark in its local frame (call inside a transform; `scale` = screen px per local px). */
function drawLocal(ctx: CanvasRenderingContext2D, pose: FrilledSharkPose, t: number, scale: number): void {
  const k = 1 / scale;
  const pen = penFor(ctx, 5203, boilOf(t), Math.max(0.5, (0.5 + 0.7 * Math.min(1, scale)) * k));
  const wave: Wave = { phase: pose.swim ?? t * 3.4, amp: 34 * (pose.effort ?? 0.6) };
  const c: Kit = { ctx, pen, k, ink: Math.min(5, Math.max(1.4, 2.4 * Math.sqrt(scale))) * k, wave, bent: (pts) => pts.map((p) => bend(p, wave)) };
  const gape = Math.max(0, Math.min(1, pose.gape ?? 0)) * GAPE_MAX;

  // The far pectoral and pelvic, and the fins on the midline, behind the body.
  fin(c, PECTORAL.map((p) => ({ x: p.x + 8, y: p.y - 3 })), true, 81);
  fin(c, PELVIC.map((p) => ({ x: p.x + 14, y: p.y - 3 })), true, 82);
  fin(c, CAUDAL, false, 83);
  fin(c, DORSAL, false, 84);
  fin(c, ANAL, false, 85);

  drawJaw(c, gape);
  const outline = c.bent([...TOP, ...UNDER, ...UPPER_LIP]);
  drawBody(c, outline);
  for (let i = GILLS.length - 1; i >= 0; i--) gill(c, GILLS[i]!, i === 0);
  drawEye(c);
  // Upper teeth hanging from the lip (the tips show even with the jaw shut).
  if (gape > 0.04) teethRows(c, UPPER_LIP, Math.PI / 2 + 0.4, gape);
  else if (c.k < 1.5) for (let i = 0; i < 12; i++) trident(c, c.bent([at(UPPER_LIP, 0.18 + i * 0.065)])[0]!, Math.PI / 2 + 0.35, 4.5, 1.4, TOOTH, 0.9);
  c.pen.stroke(c.bent(UPPER_LIP), c.ink * 0.9, INK, 1, false);

  fin(c, PECTORAL, false, 86);
  fin(c, PELVIC, false, 87);
}

export async function prepare(): Promise<void> {}

/**
 * Draws the frilled shark with its snout tip at (x, y) in screen px, `length`
 * snout to tail tip, facing right (1) or left (-1), at `t` seconds (the line
 * boil, and the swimming wave unless the pose sets it).
 */
export function drawFrilledShark(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, pose: FrilledSharkPose = {}): void {
  const scale = length / LEN;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  drawLocal(ctx, pose, t, scale);
  ctx.restore();
}

/** The middle of the frilled shark's mouth (between the lips, halfway along) in screen px, for a ring or a label. */
export function frilledSharkMouth(x: number, y: number, length: number, facing: 1 | -1, gape = 0): Pt {
  const s = length / LEN;
  const upper = { x: -42, y: 4 };
  const lower = rot({ x: -42, y: 7 }, Math.max(0, Math.min(1, gape)) * GAPE_MAX, HINGE);
  return { x: x + (facing * (upper.x + lower.x) * s) / 2, y: y + ((upper.y + lower.y) * s) / 2 };
}

/** The preview: the head huge with its teeth (the close-up), the whole shark, and one small as in the line-up (facing left). */
export const KIT: KitEntry = {
  name: 'frilledShark',
  draw: (ctx, w, h, t) => {
    const gape = 0.5 - 0.5 * Math.cos(t * 1.8);
    drawFrilledShark(ctx, w * 0.64, h * 0.3, w * 2.5, 1, t, { gape });
    drawFrilledShark(ctx, w * 0.74, h * 0.74, w * 0.62, 1, t, { gape });
    drawFrilledShark(ctx, w * 0.04, h * 0.93, Math.min(200, w * 0.2), -1, t, { gape });
  },
};
