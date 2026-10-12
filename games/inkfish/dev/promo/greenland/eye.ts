import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';

/**
 * The magnifier on the shark's eye. It opens out of the eye itself and shows
 * it close up: pale and clouded, with the parasitic copepod many Greenland
 * sharks carry hanging off it. Then the eye is cut through to its lens:
 * layer on layer like tree rings, added through the shark's life round a
 * core that formed before it was born. The core is what was dated.
 */

const CHALK = '#dcd6e6';
const SKIN = '#2f2a26';
const CORE = '#f5c84a';
const LAYER_A = '#ece0b4';
const LAYER_B = '#d9c88c';
/** How many layers the lens is drawn with. */
export const LAYERS = 15;

export interface EyeLook {
  /** 0 shut .. 1 fully open. */
  readonly open: number;
  /** 0 the eye close up .. 1 its lens cut through, filling the magnifier. */
  readonly section: number;
  /** How many of the lens's layers have grown, 0 .. 1 (core first). */
  readonly layers: number;
  /** The core lit up as it's dated, 0 .. 1. */
  readonly lit: number;
  readonly t: number;
  readonly boil: number;
}

interface Circle { readonly x: number; readonly y: number; readonly r: number }

/** Fixed dark mottling on the skin round the eye (not reseeded per boil frame, so it doesn't jump about). */
const SPOTS = (() => {
  const rng = createRng(392);
  return Array.from({ length: 120 }, () => ({ a: rng() * Math.PI * 2, d: Math.sqrt(rng()), r: 0.004 + rng() * 0.012, dark: rng() < 0.7 }));
})();

/** Each layer's wobble: a little irregular, like a growth ring. */
const WOBBLE = (() => {
  const rng = createRng(1916);
  return Array.from({ length: LAYERS + 1 }, () => ({ a: 0.012 + rng() * 0.012, k: 2 + Math.floor(rng() * 3), p: rng() * Math.PI * 2 }));
})();

function ring(c: Pt, r: number, i: number): Pt[] {
  const w = WOBBLE[i]!;
  return Array.from({ length: 73 }, (_, j) => {
    const a = (j / 72) * Math.PI * 2;
    const rr = r * (1 + w.a * Math.sin(w.k * a + w.p));
    return { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr };
  });
}

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The eye's surface: clouded pale eyeball, dim pupil, a lid above. */
function drawEyeball(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, re: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(c.x - re * 0.3, c.y - re * 0.35, re * 0.1, c.x, c.y, re);
  g.addColorStop(0, '#e4ecef');
  g.addColorStop(1, '#94a4ab');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, re, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e4c54';
  ctx.beginPath();
  ctx.arc(c.x + re * 0.08, c.y, re * 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Clouded over: a milky film across the pupil.
  const film = ctx.createRadialGradient(c.x + re * 0.2, c.y + re * 0.1, 0, c.x + re * 0.2, c.y + re * 0.1, re * 0.7);
  film.addColorStop(0, 'rgba(230,238,240,0.6)');
  film.addColorStop(1, 'rgba(230,238,240,0)');
  ctx.fillStyle = film;
  ctx.beginPath();
  ctx.arc(c.x, c.y, re, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(c.x - re * 0.25, c.y - re * 0.3, re * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  pen.stroke(ring(c, re, 0), Math.max(3, re * 0.035), INK, alpha, true);
  // The lid's fold above it.
  const lid = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (1.08 + (0.84 * i) / 12);
    return { x: c.x + Math.cos(a) * re * 1.22, y: c.y + Math.sin(a) * re * 1.12 };
  });
  pen.stroke(lid, Math.max(3, re * 0.04), INK, alpha, true);
}

/**
 * The copepod hanging from the eye (Ommatokoita elongata): a pale tapering
 * body clamped to the cornea, two long egg sacs trailing from it, swaying.
 */
function drawCopepod(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, re: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const root = { x: c.x + re * 0.3, y: c.y + re * 0.52 };
  const sway = 0.1 * Math.sin(t * 2.2);
  /** A point `u` along a strand from the root (0) out to `len`, bending with the sway; `side` spreads the two sacs. */
  const along = (u: number, side: number, len: number, from: Pt = root): Pt => {
    const a = Math.PI / 2 - 0.3 + sway * u * 1.5 + side * 0.16 * u;
    return { x: from.x + Math.cos(a) * len * u, y: from.y + Math.sin(a) * len * u };
  };
  const strand = (from: Pt, len: number, side: number, widths: (u: number) => number): Pt[] => {
    const mid = Array.from({ length: 11 }, (_, i) => along(i / 10, side, len, from));
    const left = mid.map((p, i) => ({ x: p.x - widths(i / 10) * re, y: p.y }));
    const right = mid.map((p, i) => ({ x: p.x + widths(i / 10) * re, y: p.y }));
    return [...left, ...right.reverse()];
  };
  const bodyLen = re * 0.6;
  const end = along(1, 0, bodyLen);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const side of [-1, 1]) {
    const sac = strand(end, re * 0.62, side, (u) => 0.045 * Math.sin(Math.PI * (0.15 + 0.85 * u)) + 0.012);
    fillPath(ctx, sac, '#e0cfa4', 1);
    pen.closed(sac, Math.max(1.4, re * 0.012), INK);
    // The eggs inside, as dots.
    for (let k = 1; k < 8; k++) {
      const p = along(k / 8, side, re * 0.62, end);
      pen.dot(p.x, p.y, re * 0.014, INK, 0.5 * alpha);
    }
  }
  const body = strand(root, bodyLen, 0, (u) => 0.035 + 0.05 * Math.sin(Math.PI * Math.min(1, 0.2 + u)));
  fillPath(ctx, body, '#f1e6cc', 1);
  pen.closed(body, Math.max(1.8, re * 0.016), INK);
  for (let k = 2; k < 9; k += 2) {
    const p = along(k / 10, 0, bodyLen);
    pen.hair([{ x: p.x - re * 0.07, y: p.y - re * 0.01 }, { x: p.x + re * 0.07, y: p.y + re * 0.01 }], Math.max(1.2, re * 0.01), INK, 0.7);
  }
  // Its clamp, dug into the eye.
  pen.dot(root.x, root.y, re * 0.05, INK, 1);
  ctx.restore();
}

/** The lens cut through: layers round the core, grown core first, the core lit as it's dated. */
function drawLensSection(ctx: CanvasRenderingContext2D, pen: Pen, c: Pt, re: number, look: EyeLook, alpha: number): void {
  if (alpha <= 0) return;
  const core = re * 0.16;
  const radius = (i: number): number => core + ((re - core) * i) / LAYERS;
  // The lens still to grow: a faint ghost of it.
  fillPath(ctx, ring(c, re, LAYERS), '#a8996a', alpha * 0.6);
  const grown = look.layers * LAYERS;
  for (let i = LAYERS; i >= 1; i--) {
    const u = Math.max(0, Math.min(1, grown - (i - 1)));
    if (u <= 0) continue;
    const r = radius(i - 1) + (radius(i) - radius(i - 1)) * u;
    fillPath(ctx, ring(c, r, i), i % 2 ? LAYER_A : LAYER_B, alpha);
    pen.stroke(ring(c, r, i), Math.max(1.5, re * 0.007), INK, alpha * 0.55, false);
  }
  // The core: there before birth, glowing gold as it's dated.
  fillPath(ctx, ring(c, core, 0), look.lit > 0 ? CORE : '#cdb56c', alpha);
  if (look.lit > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, core * 3);
    g.addColorStop(0, `rgba(255,220,120,${(0.75 * look.lit * alpha).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - core * 3, c.y - core * 3, core * 6, core * 6);
    ctx.restore();
  }
  pen.stroke(ring(c, core, 0), Math.max(2.5, re * 0.012), INK, alpha, false);
  // Round like a bead: shaded towards its lower right, a gleam at its upper left.
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, re, 0, Math.PI * 2);
  ctx.clip();
  const shade = ctx.createRadialGradient(c.x - re * 0.35, c.y - re * 0.4, re * 0.2, c.x, c.y, re * 1.05);
  shade.addColorStop(0, 'rgba(60,40,10,0)');
  shade.addColorStop(0.7, 'rgba(60,40,10,0.08)');
  shade.addColorStop(1, `rgba(40,25,5,${(0.45 * alpha).toFixed(3)})`);
  ctx.fillStyle = shade;
  ctx.fillRect(c.x - re, c.y - re, re * 2, re * 2);
  ctx.restore();
  const gleam = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (1.12 + (0.3 * i) / 8);
    return { x: c.x + Math.cos(a) * re * 0.82, y: c.y + Math.sin(a) * re * 0.82 };
  });
  pen.stroke(gleam, Math.max(3, re * 0.03), PAPER, alpha * 0.7, false);
  pen.stroke(ring(c, re, LAYERS), Math.max(3, re * 0.014), INK, alpha, false);
}

/** The magnifier, opening out of the eye (`from`, on screen) into `lens`. */
export function drawEyeLens(ctx: CanvasRenderingContext2D, from: Circle, lens: Circle, look: EyeLook): void {
  if (look.open <= 0) return;
  const o = look.open;
  const c = { x: from.x + (lens.x - from.x) * o, y: from.y + (lens.y - from.y) * o };
  const r = from.r * 1.6 + (lens.r - from.r * 1.6) * o;
  const pen = new Pen(ctx, 3900 + look.boil * 11, 1.1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, o * 1.5);
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  // The skin round the eye, mottled.
  ctx.fillStyle = SKIN;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  for (const s of SPOTS) {
    ctx.fillStyle = s.dark ? '#191512' : '#5b524b';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(s.a) * s.d * r, c.y + Math.sin(s.a) * s.d * r, s.r * r * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const sec = look.section;
  const re = r * (0.4 + 0.52 * sec);
  // The socket's shadow round the eyeball.
  const socket = ctx.createRadialGradient(c.x, c.y, re * 0.95, c.x, c.y, re * 1.45);
  socket.addColorStop(0, 'rgba(8,10,12,0.75)');
  socket.addColorStop(1, 'rgba(8,10,12,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  drawLensSection(ctx, pen, c, re, look, Math.min(1, sec * 1.6));
  drawEyeball(ctx, pen, c, re, 1 - Math.min(1, sec * 1.4));
  drawCopepod(ctx, pen, c, re, look.t, 1 - Math.min(1, sec * 2));
  ctx.restore();
  pen.stroke(ring(c, r, 0), 5, CHALK, 1, false);
  ctx.restore();
}

/** Where the core is drawn, and its radius, for labels pointing at it. */
export function coreOf(lens: Circle, section: number): Circle {
  return { x: lens.x, y: lens.y, r: lens.r * (0.4 + 0.52 * section) * 0.16 };
}
