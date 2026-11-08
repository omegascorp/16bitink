import { drawFish } from '../../../src/art/fishArt';
import { type Anatomy, bezier, bottomAt, C, FISH_TEX, heightAt, type Kit, PAPER_FILL, spots, topAt, xAt } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';

/**
 * The sarcastic fringehead (Neoclinus blanchardi): a long, low blenny with a
 * tall dorsal fin carrying two eyespots, a fringe of cirri over each eye, and
 * the huge upper jaw that runs far back past the head. The body is the game's
 * own fish drawing (fishArt, with this anatomy); the jaw is drawn here on top,
 * from folded along the cheek to flared into a yellow-rimmed funnel far
 * bigger than the head.
 *
 * Local units are fish-texture px with the nose at the origin, facing +x.
 */

const OLIVE = '#6f6436';

/** A small branched skin tentacle rising from `root` (the "fringe" over the eye). */
function cirrus(k: Kit, root: Pt, len: number, lean: number): void {
  const tip = { x: root.x + lean, y: root.y - len };
  k.pen.stroke(bezier(root, { x: root.x + lean * 0.2, y: root.y - len * 0.6 }, tip, 6), 1, k.ink, 1, false);
  for (const f of [0.45, 0.72]) {
    const p = { x: root.x + lean * f * 0.6, y: root.y - len * f };
    k.pen.hair([p, { x: p.x + 2.4, y: p.y - 2.2 }], 0.7, k.ink, 0.9);
    k.pen.hair([p, { x: p.x - 2.2, y: p.y - 1.8 }], 0.7, k.ink, 0.9);
  }
}

export const FRINGEHEAD: Anatomy = {
  hl: 100, hh: 19, peak: 0.2, blunt: 0.85, peduncle: 0.42, tail: 'round', tailSize: 0.95,
  dorsal: { from: 0.13, to: 0.97, height: 0.95 }, anal: { from: 0.48, to: 0.97, height: 0.6 },
  pectoral: 0.85, pelvic: false, scales: false, eye: { t: 0.085, r: 6.2 }, mouth: 'none',
  wash: '#7a6a3a', finWash: '#7d6a3c', finAlpha: 0.55, lateral: false,
  extras: (k) => {
    // A deeper olive wash, darker along the back, then mottling and a pale belly.
    k.pen.clipped(k.body, () => {
      const g = k.pen.ctx.createLinearGradient(0, C - 22, 0, C + 20);
      g.addColorStop(0, 'rgba(70,62,30,0.75)');
      g.addColorStop(0.55, 'rgba(120,104,56,0.45)');
      g.addColorStop(1, 'rgba(226,206,150,0.25)');
      k.pen.ctx.fillStyle = g;
      k.pen.ctx.fillRect(0, 0, FISH_TEX, FISH_TEX);
    });
    spots(k, 26, [2.2, 5.5], '#3d3418', { from: 0.12, to: 0.96, outline: false, alpha: 0.45 });
    spots(k, 10, [1.5, 3], '#e6d6a0', { from: 0.25, to: 0.9, outline: false, alpha: 0.5 });
    // Two eyespots on the front of the dorsal fin: dark, ringed in gold and blue.
    for (const t of [0.25, 0.34]) {
      const x = k.x(t) - 3;
      const y = topAt(k.a, t) - k.h(t) * 0.45;
      k.pen.fill(ellipse(x, y, 3.6, 2.8, 14), '#3c6fb8', 0.85);
      k.pen.fill(ellipse(x, y, 2.6, 2, 14), '#e9b93c', 0.95);
      k.pen.fill(ellipse(x, y, 1.6, 1.3, 12), '#1d1612', 1);
      k.pen.hair([...ellipse(x, y, 3.6, 2.8, 14), { x: x + 3.6, y }], 0.4, k.ink, 0.7);
    }
    // The fringe: branched cirri over the eye.
    const ex = k.x(k.a.eye.t);
    const top = topAt(k.a, k.a.eye.t);
    cirrus(k, { x: ex + 2, y: top + 1.5 }, 12, 3);
    cirrus(k, { x: ex - 3, y: top + 1.8 }, 9, -1.5);
    cirrus(k, { x: ex - 7, y: top + 2.2 }, 6, -1);
    // Jugular pelvic rays under the throat.
    const b = { x: k.x(0.19), y: bottomAt(k.a, 0.19) - 1 };
    for (const dx of [0, 3]) k.pen.stroke([{ x: b.x - dx, y: b.y }, { x: b.x - dx - 5, y: b.y + 8 }], 0.9, k.ink, 1, false);
  },
};

const A = FRINGEHEAD;
/** The nose in texture px. */
const NOSE = { x: xAt(A, 0), y: C };
/** Nose to tail base, texture px: a pose's `len` is this many local units. */
export const BODY_UNITS = 2 * A.hl;
/** Where the head ends (the gill cover), local x. */
export const HEAD_END = xAt(A, 0.24) - NOSE.x;
/** The eye, local. */
export const EYE = { x: xAt(A, A.eye.t) - NOSE.x, y: -heightAt(A, A.eye.t) * 0.3, r: A.eye.r };

/** Sprite px per texture px. */
const RES = 6;

export interface FringeheadSprite {
  readonly frames: readonly HTMLCanvasElement[];
}

export function makeFringeheadSprite(): FringeheadSprite {
  const side = FISH_TEX * RES;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(RES, RES);
    drawFish(ctx, 'blenny', 'light', 1301 + f * 977, undefined, FRINGEHEAD);
    return canvas;
  });
  return { frames };
}

export type Mood = 'calm' | 'angry' | 'smug' | 'worried';

export interface FishPose {
  /** The nose, screen px. */
  readonly x: number;
  readonly y: number;
  /** Nose to tail base, screen px. */
  readonly len: number;
  /** 1 facing right, -1 facing left. */
  readonly dir: 1 | -1;
  /** Nose up, radians (in the fish's own frame). */
  readonly tilt: number;
  /** 0 folded .. 1 flared. */
  readonly jaw: number;
  /** 0 .. 1: the flared rim pressed flat against a rival's. */
  readonly press: number;
  /** Puffed up, 0 .. 1: a wider, taller gape and a fatter body. */
  readonly puff: number;
  readonly mood: Mood;
  /** Tail beat phase (radians) and size (local px at the tail tip). */
  readonly beat: number;
  readonly wag: number;
  readonly alpha?: number;
}

/** Local px per screen px for a pose. */
export const unitsOf = (p: FishPose): number => p.len / BODY_UNITS;

/** Local point to screen px, through a pose. */
export function toScreenOf(p: FishPose, q: Pt): Pt {
  const k = unitsOf(p);
  const c = Math.cos(p.tilt);
  const s = Math.sin(p.tilt);
  const x = (q.x * c + q.y * s) * k;
  const y = (-q.x * s + q.y * c) * k;
  return { x: p.x + p.dir * x, y: p.y + y };
}

/** Enters the fish's local frame (nose at the origin, facing +x). */
export function enterFish(ctx: CanvasRenderingContext2D, p: FishPose): void {
  const k = unitsOf(p);
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir, 1);
  ctx.rotate(-p.tilt);
  ctx.scale(k, k);
}

/** The body, its tail half swaying (sprite columns shifted), drawn in local px. */
function drawBody(ctx: CanvasRenderingContext2D, sprite: FringeheadSprite, p: FishPose, boil: number): void {
  const canvas = sprite.frames[boil % sprite.frames.length]!;
  const side = canvas.width;
  const step = 6;
  const fat = 1 + 0.08 * p.puff;
  ctx.save();
  ctx.translate(-NOSE.x, -NOSE.y * fat);
  ctx.scale(1 / RES, fat / RES);
  const tailX = (C - A.hl - A.hh) * RES;
  const pivot = xAt(A, 0.35) * RES;
  for (let sx = 0; sx < side; sx += step) {
    const mid = sx + step / 2;
    const back = Math.max(0, Math.min(1, (pivot - mid) / (pivot - tailX)));
    const dy = (p.wag * RES * back * back * Math.sin(p.beat - 2.4 * back)) / fat;
    ctx.drawImage(canvas, sx, 0, step, side, sx, dy, step + 1, side);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the jaw

export interface Gape {
  /** The rim: centre x, half height, half width (it's seen nearly side on). */
  readonly cx: number;
  readonly r: number;
  readonly rx: number;
  readonly upper: Pt[];
  readonly lower: Pt[];
}

const UPPER_HINGE = { x: -68, y: 5 };
const LOWER_HINGE = { x: -52, y: 12 };

/** The gape's shape, local px, for a jaw opening (0 .. 1), pressed flat by `press`, puffed by `puff`. */
export function gapeOf(jaw: number, press: number, puff: number): Gape {
  const u = Math.max(0, Math.min(1, jaw));
  const e = 1 - (1 - u) ** 2;
  const r = 1.2 + (54 + 8 * puff) * e * (1 - 0.06 * press);
  const cx = 1.5 + (21 + 3 * puff) * e - 3 * press * e;
  const rx = Math.max(0.6, r * (0.42 - 0.1 * press));
  const upper = cubic(UPPER_HINGE, { x: -28, y: 6 }, { x: cx - 5 * e, y: -r * 0.12 }, { x: cx, y: -r }, 24);
  const lower = cubic(LOWER_HINGE, { x: -22, y: 13 + e }, { x: cx - 12 * e, y: r * 0.4 }, { x: cx, y: r }, 24);
  return { cx, r, rx, upper, lower };
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p1: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const m = 1 - t;
    return {
      x: m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p1.x,
      y: m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p1.y,
    };
  });
}

/** The rim ellipse's back half (from its top round the back to its bottom). */
function rimBack(g: Gape): Pt[] {
  return Array.from({ length: 17 }, (_, i) => {
    const a = -Math.PI / 2 - (i / 16) * Math.PI;
    return { x: g.cx + Math.cos(a) * g.rx, y: Math.sin(a) * g.r };
  });
}

const RIM = '#ffd447';
const MEMBRANE_NEAR = '#e8bd38';
const MEMBRANE_FAR = '#7a6d34';
const INSIDE = ['#e9b934', '#4a58c0', '#26090f'] as const;
const INSIDE_K = [1, 0.86, 0.74] as const;

/** The flared membrane, the colourful inside seen through the rim, the long jaw bones. */
function drawJaw(ctx: CanvasRenderingContext2D, p: FishPose, boil: number): void {
  const g = gapeOf(p.jaw, p.press, p.puff);
  const pen = new Pen(ctx, 2201 + boil * 613, 0.35);
  const open = Math.max(0, Math.min(1, (g.r - 3) / 30));
  if (open > 0.01) {
    // The membrane's outside: olive at the hinge to gold at the rim, with fan ribs.
    const shape = [...g.upper, ...rimBack(g), ...[...g.lower].reverse()];
    ctx.save();
    ctx.beginPath();
    shape.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    const wash = ctx.createLinearGradient(UPPER_HINGE.x, 0, g.cx, 0);
    wash.addColorStop(0, MEMBRANE_FAR);
    wash.addColorStop(0.55, '#b39a3c');
    wash.addColorStop(1, MEMBRANE_NEAR);
    ctx.fillStyle = wash;
    ctx.globalAlpha = Math.min(1, open * 1.6);
    ctx.fill();
    ctx.clip();
    // A blue sheen along the rim, and shade towards the jaw bones.
    const sheen = ctx.createLinearGradient(g.cx - g.rx * 2.4, 0, g.cx, 0);
    sheen.addColorStop(0, 'rgba(70,110,200,0)');
    sheen.addColorStop(1, 'rgba(70,110,200,0.45)');
    ctx.fillStyle = sheen;
    ctx.fillRect(g.cx - 80, -g.r - 10, 100, 2 * g.r + 20);
    ctx.restore();
    const n = g.upper.length - 1;
    const back = rimBack(g);
    for (let i = 1; i < 9; i++) {
      const f = i / 9;
      const from = { x: UPPER_HINGE.x + (LOWER_HINGE.x - UPPER_HINGE.x) * f + 18, y: 5 + 6 * f };
      const to = back[Math.round(f * (back.length - 1))]!;
      const mid = { x: (from.x + to.x) / 2 - 4, y: (from.y + to.y) / 2 };
      pen.hair(bezier(from, mid, to, 8), 0.5, '#4a3d16', 0.55 * open);
    }
    // Ink outline of the membrane's back edge (the rim's far half is hidden behind it).
    pen.hair(g.upper.slice(Math.round(n * 0.5)), 0.6, INK, 0.5 * open);
    // The inside, seen through the rim: the gold inner membrane, its blue-violet fringe, the dark throat ringed with small teeth.
    INSIDE.forEach((colour, i) => {
      const k = INSIDE_K[i]!;
      pen.fill(ellipse(g.cx + g.rx * (1 - k) * 0.6, 0, g.rx * k, g.r * k, 32), colour, 1);
    });
    const tc = { x: g.cx + g.rx * 0.16, rx: g.rx * 0.74, r: g.r * 0.74 };
    const throat = ctx.createRadialGradient(tc.x + tc.rx * 0.2, 0, 0, tc.x, 0, tc.r);
    throat.addColorStop(0, 'rgba(4,1,2,0.95)');
    throat.addColorStop(0.7, 'rgba(30,8,14,0.6)');
    throat.addColorStop(1, 'rgba(110,40,50,0.5)');
    ctx.save();
    ctx.fillStyle = throat;
    ctx.beginPath();
    ctx.ellipse(tc.x, 0, tc.rx, tc.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Fine ribs on the gold membrane, converging on the throat.
    pen.clipped(ellipse(g.cx, 0, g.rx, g.r, 32), () => {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        pen.hair([{ x: tc.x + Math.cos(a) * tc.rx, y: Math.sin(a) * tc.r }, { x: g.cx + Math.cos(a) * g.rx, y: Math.sin(a) * g.r }], 0.4, '#7a5a12', 0.5 * open);
      }
    });
    if (open > 0.3) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.1;
        const base = { x: tc.x + Math.cos(a) * tc.rx, y: Math.sin(a) * tc.r };
        const len = 0.11 * tc.r;
        const tip = { x: tc.x + Math.cos(a) * (tc.rx - len * (tc.rx / tc.r)), y: Math.sin(a) * (tc.r - len) };
        const side = { x: -Math.sin(a) * 1.3, y: Math.cos(a) * 1.3 };
        pen.fill([{ x: base.x + side.x, y: base.y + side.y }, tip, { x: base.x - side.x, y: base.y - side.y }], PAPER_FILL, open);
      }
    }
    // The bright rim, inked.
    const rim = ellipse(g.cx, 0, g.rx, g.r, 36);
    pen.stroke([...rim, rim[0]!], 2.6, RIM, open, false);
    pen.stroke([...rim, rim[0]!], 0.8, INK, 0.9 * open, false);
  }
  // The long upper jaw bone (maxilla) and the lower jaw, inked over the edges.
  const bone = (pts: readonly Pt[], w: number): void => {
    const band = pts.map((q, i) => ({ x: q.x, y: q.y - w * Math.sin((Math.PI * i) / (pts.length - 1)) * 0.5 }));
    const under = pts.map((q, i) => ({ x: q.x, y: q.y + w * Math.sin((Math.PI * i) / (pts.length - 1)) * 0.5 }));
    pen.fill([...band, ...[...under].reverse()], OLIVE, 0.95);
    pen.stroke(band, 1.1, INK, 1, false);
    pen.stroke(under, 0.8, INK, 0.9, false);
  };
  bone(g.upper, 4.2);
  bone(g.lower, 3);
}

/** The eye, redrawn over the flared membrane (as the game draws it), so the face still reads. */
function drawEye(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 4301 + boil * 197, 0.3);
  const { x, y, r } = EYE;
  pen.fill(ellipse(x, y, r * 1.25, r * 1.25, 18), '#6f6436', 0.9);
  pen.fill(ellipse(x, y, r, r, 18), PAPER_FILL, 1);
  pen.stroke([...ellipse(x, y, r, r, 18), { x: x + r, y }], 0.9, INK, 1, false);
  pen.hair([...ellipse(x, y, r * 0.68, r * 0.68, 16), { x: x + r * 0.68, y }], 0.45, INK, 0.7);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pen.hair([{ x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4 }, { x: x + Math.cos(a) * r * 0.66, y: y + Math.sin(a) * r * 0.66 }], 0.35, INK, 0.55);
  }
  pen.dot(x + r * 0.12, y, r * 0.4, INK);
  pen.dot(x + r * 0.26, y - r * 0.2, Math.max(0.6, r * 0.13), PAPER_FILL);
}

/** A lid or a brow over the eye, for the mood. */
function drawMood(ctx: CanvasRenderingContext2D, p: FishPose, boil: number): void {
  const pen = new Pen(ctx, 4401 + boil * 211, 0.25);
  const { x, y, r } = EYE;
  if (p.mood === 'smug') {
    // Lids half down, flat: very pleased with itself.
    pen.clipped(ellipse(x, y, r + 0.2, r + 0.2, 20), () => pen.fill([{ x: x - r - 1, y: y - r - 1 }, { x: x + r + 1, y: y - r - 1 }, { x: x + r + 1, y: y + 0.4 }, { x: x - r - 1, y: y - 0.6 }], '#8a7a44', 1));
    pen.stroke([{ x: x - r, y: y - 0.6 }, { x: x + r, y: y + 0.4 }], 1.1, INK, 1, false);
  } else if (p.mood === 'angry') {
    pen.clipped(ellipse(x, y, r + 0.2, r + 0.2, 20), () => pen.fill([{ x: x - r - 1, y: y - r - 1 }, { x: x + r + 1, y: y - r - 1 }, { x: x + r + 1, y: y - 0.5 }, { x: x - r - 1, y: y - r * 0.9 }], '#8a7a44', 1));
    pen.stroke([{ x: x - r * 1.3, y: y - r * 1.25 }, { x: x + r * 1.15, y: y - r * 0.2 }], 1.5, INK, 1, false);
  } else if (p.mood === 'worried') {
    pen.stroke([{ x: x - r * 1.2, y: y - r * 0.7 }, { x: x + r * 1.1, y: y - r * 1.6 }], 1.2, INK, 1, false);
    pen.dot(x + r * 0.5, y + r * 1.4, 0.9, '#cfe6f0', 0.8);
  }
}

/** One fringehead at its pose. */
export function drawFringehead(ctx: CanvasRenderingContext2D, sprite: FringeheadSprite, p: FishPose, boil: number): void {
  ctx.save();
  if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
  enterFish(ctx, p);
  drawBody(ctx, sprite, p, boil);
  drawJaw(ctx, p, boil);
  drawEye(ctx, boil);
  drawMood(ctx, p, boil);
  ctx.restore();
}

/** The head's outline (snout to gill cover), local px: the faint guide that shows how far the jaw reaches past it. */
export function headOutline(): Pt[] {
  const n = 14;
  const t1 = 0.24;
  const top = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(A, (t1 * i) / n) - NOSE.x, y: topAt(A, (t1 * i) / n) - C }));
  const bottom = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(A, t1 - (t1 * i) / n) - NOSE.x, y: bottomAt(A, t1 - (t1 * i) / n) - C }));
  return [...top, ...bottom];
}

/** Where the rim is, local: its top, bottom and centre (for effects). */
export function rimOf(p: FishPose): { readonly top: Pt; readonly bottom: Pt; readonly centre: Pt } {
  const g = gapeOf(p.jaw, p.press, p.puff);
  return { top: toScreenOf(p, { x: g.cx, y: -g.r }), bottom: toScreenOf(p, { x: g.cx, y: g.r }), centre: toScreenOf(p, { x: g.cx, y: 0 }) };
}

export { PAPER_FILL };
