import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { ellipse, INK, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { resample, spline } from '../../kraken/whale';
import type { HeadPose } from './contract';
import { drawCropped, type Rect } from './crocCrop';
import { drawGape, drawGum, drawRow, type Ink, type TeethRow } from './sharkJaw';

/**
 * A painted shark's head and shoulders that bites like a real one, shared by
 * the bull shark, the great white and megalodon. Drawn live in head units
 * (100 = snout tip to the last gill slit; the bite point at 0,0; facing +x),
 * in the manner of ../../foodchain/art/greatWhite.ts: paper, a slate wash
 * laid a little off it and lit from above, dry-brushed sheen along the back,
 * hatching into a ragged countershading line, a cool-shaded white belly, long
 * gill slits, a firm ink outline, a black eye with a catchlight.
 *
 * The bite, as `jaw` goes 0..1: the snout lifts and wrinkles, the upper jaw
 * (not fused to the skull) slides forward and down out from under it on its
 * pink gum, the lower jaw drops on its hinge at the corner of the mouth, the
 * throat stretches under it, and the eye rolls back white. Shut, the upper
 * teeth's tips just show over the lower lip, meeting the lower row at the
 * bite point.
 */

export interface Gill { readonly x: number; readonly top: number; readonly bottom: number }

export interface SharkColours {
  readonly slate: string;
  readonly dark: string;
  readonly sheen: string;
  readonly cool: string;
  /** A wash over the white underside (megalodon's is greyed). */
  readonly tint?: string;
  /** A darker glaze over the slate, 0..1. */
  readonly glaze?: number;
}

export interface SharkSpec {
  readonly seed: number;
  /** Snout tip back along the top to the shoulders (control points). */
  readonly back: readonly Pt[];
  /** Snout tip under the cone to the front of the mouth. */
  readonly under: readonly Pt[];
  /** The mouth line, front to its corner (the hinge). */
  readonly mouth: readonly Pt[];
  /** The lower jaw's underside, front of the mouth back under the throat (ends on the belly). */
  readonly chin: readonly Pt[];
  /** The crease from the corner of the mouth down to where the chin meets the belly. */
  readonly cheek: readonly Pt[];
  /** From the end of the chin back along the belly to the shoulders. */
  readonly belly: readonly Pt[];
  /** The countershading line, snout to shoulders (before its raggedness). */
  readonly shade: readonly Pt[];
  readonly dorsal: readonly Pt[];
  readonly pectoral: readonly Pt[];
  readonly gills: readonly Gill[];
  readonly eye: Pt;
  readonly eyeR: number;
  readonly colours: SharkColours;
  /** Radians the lower jaw drops at jaw = 1; how far the snout lifts. */
  readonly gape: number;
  readonly lift: number;
  /** The upper jaw at jaw = 1: slid by this (units) and tipped forward this much (radians). */
  readonly protrude: Pt;
  readonly tip: number;
  readonly upper: TeethRow;
  readonly lower: TeethRow;
  /** How deep the gum shows over the teeth. */
  readonly gum: number;
  /** The scratch area around the bite point, head units. */
  readonly rect: Rect;
  /** Ink weight × (a heavier pen for the heavier animal). */
  readonly weight: number;
  /** A soft countershading line (the bull shark's), not the great white's ragged break. */
  readonly soft?: boolean;
  /** Extra marks on the skin (scars), drawn clipped to the body after the washes. */
  readonly marks?: (b: Brush, warp: (p: Pt) => Pt) => void;
}

export interface Brush extends Ink {
  readonly rng: () => number;
}

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const turn = (p: Pt, about: Pt, a: number): Pt => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return { x: about.x + (p.x - about.x) * c - (p.y - about.y) * s, y: about.y + (p.x - about.x) * s + (p.y - about.y) * c };
};

function edgeAt(line: readonly Pt[], x: number): number {
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1]!, line[i]!];
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return x > line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

const ragged = (x: number): number => 1.5 * Math.sin(x * 0.12) + 1 * Math.sin(x * 0.29 + 1.3) + 0.5 * Math.sin(x * 0.75 + 0.4);

/** The shape, smoothed once per spec. */
interface Shape {
  readonly back: readonly Pt[];
  readonly under: readonly Pt[];
  readonly mouth: readonly Pt[];
  readonly chin: readonly Pt[];
  readonly cheek: readonly Pt[];
  readonly belly: readonly Pt[];
  readonly shade: readonly Pt[];
  readonly dorsal: readonly Pt[];
  readonly pectoral: readonly Pt[];
  readonly bottom: readonly Pt[];
  readonly hinge: Pt;
}

const shapes = new WeakMap<SharkSpec, Shape>();
function shapeOf(s: SharkSpec): Shape {
  const have = shapes.get(s);
  if (have) return have;
  const mouth = spline(s.mouth, 6);
  const chin = spline(s.chin, 6);
  const made: Shape = {
    back: spline(s.back, 6),
    under: spline(s.under, 6),
    mouth: [...mouth, s.mouth[s.mouth.length - 1]!],
    chin: [...chin, s.chin[s.chin.length - 1]!],
    cheek: spline(s.cheek, 5),
    belly: spline(s.belly, 6),
    shade: spline(s.shade, 6).map((p) => ({ x: p.x, y: p.y + ragged(p.x) * (s.soft ? 0.25 : 1) * Math.min(1, Math.max(0, (6 - p.x) / 25)) })),
    dorsal: spline(s.dorsal, 6),
    pectoral: spline(s.pectoral, 5),
    bottom: [...spline(s.under, 6), ...chin.slice(1), ...spline(s.belly, 6).slice(1)],
    hinge: s.mouth[s.mouth.length - 1]!,
  };
  shapes.set(s, made);
  return made;
}

// ---------------------------------------------------------------- pose

interface Rig {
  readonly j: number;
  /** The snout's lift: the skull bent up about a point behind the eye. */
  readonly warp: (p: Pt) => Pt;
  /** The upper jaw (shut frame → world) and the lower jaw (shut frame → world). */
  readonly upper: (p: Pt) => Pt;
  readonly lower: (p: Pt) => Pt;
  readonly upperFrame: (ctx: CanvasRenderingContext2D) => void;
  readonly lowerFrame: (ctx: CanvasRenderingContext2D) => void;
  readonly retract: number;
}

function rigOf(s: SharkSpec, sh: Shape, jaw: number): Rig {
  const j = smooth(jaw * 1.04);
  const pivot = { x: s.eye.x - 8, y: s.eye.y + 8 };
  const lift = -s.lift * j;
  const warp = (p: Pt): Pt => (lift === 0 ? p : turn(p, pivot, lift * smooth((p.x - pivot.x + 4) / 34)));
  const retract = s.upper.len[0] * 0.55 * (1 - j);
  const h = sh.hinge;
  const tip = s.tip * j;
  const slide = { x: s.protrude.x * j, y: s.protrude.y * j };
  const upper = (p: Pt): Pt => {
    const q = turn({ x: p.x, y: p.y - retract }, h, tip);
    return { x: q.x + slide.x, y: q.y + slide.y };
  };
  const open = s.gape * j;
  const lower = (p: Pt): Pt => turn(p, h, open);
  return {
    j, warp, upper, lower, retract,
    upperFrame: (ctx) => {
      ctx.translate(slide.x, slide.y);
      ctx.translate(h.x, h.y);
      ctx.rotate(tip);
      ctx.translate(-h.x, -h.y - retract);
    },
    lowerFrame: (ctx) => {
      ctx.translate(h.x, h.y);
      ctx.rotate(open);
      ctx.translate(-h.x, -h.y);
    },
  };
}

// ---------------------------------------------------------------- brushwork

function fillPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function shadeIn(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly (readonly [number, string])[]): void {
  ctx.save();
  fillPath(ctx, shape);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  ctx.fillStyle = g;
  ctx.fillRect(-400, -400, 800, 800);
  ctx.restore();
}

/** Paper, then the slate wash laid a little off it, lit from above. */
function slateSkin(b: Brush, s: SharkSpec, shape: readonly Pt[], y0: number, y1: number): void {
  const { pen, ctx, px } = b;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.translate(px(1.6), px(1.3));
    pen.fill(shape, s.colours.slate, 0.92);
  });
  shadeIn(ctx, shape, y0, y1, [[0, 'rgba(227,234,240,0.26)'], [0.35, 'rgba(227,234,240,0)'], [1, 'rgba(12,16,22,0.45)']]);
}

function paintFin(b: Brush, s: SharkSpec, shape: readonly Pt[], root: Pt): void {
  const { pen, px } = b;
  const ys = shape.map((p) => p.y);
  slateSkin(b, s, shape, Math.min(...ys), Math.max(...ys));
  const far = shape.reduce((a, p) => (Math.hypot(p.x - root.x, p.y - root.y) > Math.hypot(a.x - root.x, a.y - root.y) ? p : a));
  const reach = Math.hypot(far.x - root.x, far.y - root.y);
  pen.clipped(shape, () => {
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      const to = { x: far.x + (root.x - far.x) * 0.12 + (u - 0.5) * reach * 0.5, y: far.y + (u - 0.5) * reach * 0.3 };
      pen.hair([root, to], px(0.7), s.colours.dark, 0.16 + 0.22 * u);
    }
  });
  pen.stroke(shape, px(2.4), INK, 1, true);
}

/** The tall dorsal fin: fine lines up from its foot, the light on its leading edge, its trailing edge in shadow. */
function paintDorsal(b: Brush, s: SharkSpec, shape: readonly Pt[]): void {
  const { pen, ctx, px } = b;
  const ys = shape.map((p) => p.y);
  slateSkin(b, s, shape, Math.min(...ys), Math.max(...ys));
  const at = shape.reduce((a, p, i) => (p.y < shape[a]!.y ? i : a), 0);
  const apex = shape[at]!;
  const [front, rear] = [shape[0]!, shape[shape.length - 2]!];
  pen.clipped(shape, () => {
    for (let i = 0; i < 13; i++) {
      const u = i / 12;
      const foot = { x: lerp(front.x, rear.x, u), y: lerp(front.y, rear.y, u) + 4 };
      const top = { x: apex.x + u * 1.5, y: apex.y + 3 + u * 7 };
      pen.hair([foot, { x: (foot.x + top.x) / 2 - 1, y: (foot.y + top.y) / 2 }, top], px(0.75), u < 0.3 ? s.colours.sheen : s.colours.dark, u < 0.3 ? 0.3 : 0.12 + 0.3 * u);
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(28,35,43,0.24)';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    shape.slice(at, -1).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  });
  pen.stroke(shape.slice(0, -1), px(2.4), INK, 1, true);
}

/** A line along the body at `v` of the way down (0 the back, 1 the belly), from x0 back to x1. */
function contour(sh: Shape, v: number, x0: number, x1: number, step = 4): Pt[] {
  const pts: Pt[] = [];
  for (let x = x0; x >= x1; x -= step) {
    const top = edgeAt(sh.back, x);
    pts.push({ x, y: top + (edgeAt(sh.bottom, x) - top) * v });
  }
  return pts;
}

// ---------------------------------------------------------------- the head

function bodyOf(sh: Shape, w: (p: Pt) => Pt): Pt[] {
  return [...sh.under, ...sh.mouth.slice(1), ...sh.cheek.slice(1), ...sh.belly.slice(1), ...[...sh.back].reverse().slice(0, -1)].map(w);
}

function paintSkin(b: Brush, s: SharkSpec, sh: Shape, rig: Rig, body: readonly Pt[]): void {
  const { pen, ctx, px, rng } = b;
  const { warp } = rig;
  const c = s.colours;
  const left = sh.back[sh.back.length - 1]!.x;
  const nose = sh.back[0]!.x;
  const slateSide = [...sh.shade.map((p) => ({ x: p.x, y: p.y + (s.soft ? 5 : 0) })), { x: left - 40, y: -300 }, { x: nose + 40, y: -300 }].map(warp);
  pen.fill(body, PAPER_FILL, 1);
  pen.clipped(body, () => {
    pen.clipped(slateSide, () => {
      ctx.translate(px(1.6), px(1.3));
      pen.fill(body, c.slate, 0.92);
      ctx.translate(-px(1.6), -px(1.3));
      if (c.glaze) pen.fill(body, c.dark, c.glaze);
      shadeIn(ctx, body, -70, 10, [[0, 'rgba(227,234,240,0.32)'], [0.3, 'rgba(227,234,240,0.12)'], [0.6, 'rgba(227,234,240,0)'], [1, 'rgba(12,16,22,0.3)']]);
      // Dry-brushed light along the back.
      for (let r = 0; r < 14; r++) {
        const v = 0.02 + (0.32 * (r + rng() * 0.7)) / 14;
        let x = nose - 4 - rng() * 14;
        while (x > left) {
          const end = Math.max(left, x - 10 - rng() * 32);
          pen.hair(contour(sh, v, x, end).map(warp), px(1.2), c.sheen, 0.36 * (1 - v / 0.36));
          x = end - 3 - rng() * 12;
        }
      }
      // Darkening into the countershading line, hatched along it.
      shadeIn(ctx, slateSide, -12, 6, [[0, 'rgba(12,16,22,0)'], [1, 'rgba(12,16,22,0.24)']]);
      if (!s.soft) {
        pen.hair(sh.shade.map((p) => warp({ x: p.x, y: p.y - 0.8 })), px(1.6), c.dark, 0.3);
        for (const lift of [10, 5]) {
          pen.clipped([...sh.shade.map((p) => ({ x: p.x, y: p.y - lift })), ...[...sh.shade].reverse()].map(warp), () => pen.hatch(body, px(8), -1.1, px(0.7), { color: c.dark, alpha: 0.24 }));
        }
      }
      pen.stipple(body, 1300, (_x, y) => 0.42 * Math.max(0, 1 - (y + 30) / 30), px(0.7), 'rgba(227,234,240,0.5)');
      // Old pale scratches.
      for (let i = 0; i < 10; i++) {
        const x = -8 - rng() * 120;
        const y = edgeAt(sh.back, x) + 5 + rng() * 18;
        const len = 4 + rng() * 9;
        const a = -0.4 + rng() * 0.8;
        pen.hair([{ x, y }, { x: x - Math.cos(a) * len, y: y + Math.sin(a) * len }].map(warp), px(0.8), c.sheen, 0.35);
      }
    });
    if (s.soft) {
      // The grey melting into the white over a hand's width, not breaking off.
      const m = ctx.getTransform();
      ctx.save();
      ctx.filter = `blur(${(2.4 * Math.hypot(m.a, m.b)).toFixed(1)}px)`;
      pen.fill([...sh.shade.map((p) => ({ x: p.x, y: p.y + 1.5 })), { x: left - 40, y: 200 }, { x: nose + 40, y: 200 }].map(warp), PAPER_FILL, 1);
      ctx.restore();
    }
    paintWhite(b, s, sh, body, sh.hinge.x + 6, left, 600);
    s.marks?.(b, warp);
  });
  pen.hair(sh.shade.map(warp), px(1.2), INK, s.soft ? 0.18 : 0.7);
}

function paintGills(b: Brush, s: SharkSpec): void {
  const { pen, px } = b;
  for (const g of s.gills) {
    const slit = spline([{ x: g.x + 2.4, y: g.top }, { x: g.x - 0.5, y: g.top * 0.4 + g.bottom * 0.6 * 0.4 }, { x: g.x - 0.8, y: g.bottom * 0.4 + g.top * 0.1 }, { x: g.x + 1.4, y: g.bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 1.4 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], s.colours.dark, 0.38);
    pen.stroke(slit, px(1.4), INK, 0.95, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 1.6, y: p.y })), px(1), s.colours.sheen, 0.32);
  }
}

/** Pores on the snout, the nostril, and the skin folding up over the snout as it lifts. */
function paintSnout(b: Brush, s: SharkSpec, sh: Shape, rig: Rig, body: readonly Pt[]): void {
  const { pen, px, rng } = b;
  const nose = sh.back[0]!;
  pen.clipped(body, () => {
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 8; i++) {
        const x = nose.x - 3 - row * 1.6 - i * 2.6 - rng() * 1.2;
        const top = edgeAt(sh.back, x);
        const y = top + (edgeAt(sh.bottom, x) - top) * (0.36 + row * 0.12) + rng();
        const p = rig.warp({ x, y });
        pen.dot(p.x, p.y, px(1) * (0.55 + rng() * 0.35) * 1.6, s.colours.dark, 0.45);
      }
    }
    // Wrinkles: the skin over the snout bunching as the snout lifts.
    const wr = smooth((rig.j - 0.15) / 0.6);
    if (wr > 0.01) {
      for (let i = 0; i < 4; i++) {
        const x = s.eye.x + 10 + i * 3.4;
        const top = edgeAt(sh.back, x);
        const len = 4.2 + (i % 2) * 1.4;
        const fold = spline([{ x: x + 0.4, y: top - 0.5 }, { x: x + 1.1, y: top + len * 0.5 }, { x: x + 0.3, y: top + len }], 4).map(rig.warp);
        pen.stroke(fold.map((p) => ({ x: p.x - 0.7, y: p.y })), px(4), s.colours.dark, 0.3 * wr, false);
        pen.stroke(fold, px(1.4), INK, 0.8 * wr, false);
        pen.hair(fold.map((p) => ({ x: p.x + 0.8, y: p.y })), px(1.3), s.colours.sheen, 0.5 * wr);
      }
    }
  });
  const nostril = [{ x: nose.x - 3.5, y: nose.y + 3.6 }, { x: nose.x - 5.6, y: nose.y + 4.6 }, { x: nose.x - 8.4, y: nose.y + 4.6 }].map(rig.warp);
  pen.stroke(spline(nostril, 3), px(1.6), INK, 1, false);
}

/** The eye: black with a catchlight; rolling back white as the shark bites. */
function paintEye(b: Brush, s: SharkSpec, rig: Rig): void {
  const { pen, ctx, px } = b;
  const { x, y } = rig.warp(s.eye);
  const r = s.eyeR;
  const roll = smooth((rig.j - 0.45) / 0.45);
  pen.fill(ellipse(x, y, r * 1.5, r * 1.22, 24), s.colours.dark, 0.35);
  const ball = ellipse(x, y, r, r * 0.95, 24);
  pen.fill(ball, '#050608', 1);
  ctx.save();
  fillPath(ctx, ball);
  ctx.clip();
  // The eye turned back in its socket: the white comes round from the front and below.
  if (roll > 0.001) {
    const g = ctx.createLinearGradient(x + r, y + r, x - r, y - r);
    g.addColorStop(0, '#f1f3f2');
    g.addColorStop(0.7, '#d5dcdf');
    g.addColorStop(1, '#9aa6ad');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.62 - r * 2.2 * (1 - roll), y + r * 0.5, r * 1.3, r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(150,90,100,${0.5 * roll})`;
    ctx.lineWidth = px(0.8);
    for (const a of [-0.6, 0.1, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
      ctx.lineTo(x + r * 0.55 * Math.cos(a + 0.25), y + r * 0.55 * Math.sin(a + 0.25));
      ctx.stroke();
    }
  }
  ctx.restore();
  pen.dot(x + r * 0.34, y - r * 0.38, r * 0.24, '#ffffff', 0.95);
  pen.dot(x - r * 0.3, y + r * 0.36, r * 0.08, '#ffffff', 0.6);
  pen.stroke([...ball, ball[0]!], px(1.3), INK, 1, false);
  // The ridge over the eye, pulled down as it bites.
  const ridge = spline([{ x: x - r * 2.2, y: y - r * 1.0 }, { x: x - r * 0.2, y: y - r * (1.6 - 0.35 * roll) }, { x: x + r * 1.8, y: y - r * (1.25 - 0.4 * roll) }], 6);
  pen.hair(ridge.map((p) => ({ x: p.x, y: p.y - px(2.5) })), px(1.4), s.colours.sheen, 0.45);
  pen.stroke(ridge, px(1.3 + 0.8 * roll), INK, 0.6 + 0.4 * roll, false);
}

/** Where the chin's ink hands over to the throat's, and where the throat meets the belly. */
const chinSplit = (sh: Shape): number => Math.floor(sh.chin.length * 0.42);
const bellyJoin = (sh: Shape): number => Math.max(1, sh.belly.findIndex((p) => p.x < sh.belly[0]!.x - 12));

/**
 * The throat skin: shut, it runs on along the chin into the belly; as the jaw
 * drops it stretches in a full curve from the jaw back to the belly.
 */
function throatOf(sh: Shape, rig: Rig): { fill: Pt[]; edge: Pt[] } {
  const i = chinSplit(sh);
  const jb = bellyJoin(sh);
  const to = sh.belly[jb]!;
  const shut = resample([...sh.chin.slice(i), ...sh.belly.slice(1, jb + 1)], 28);
  const from = rig.lower(sh.chin[i]!);
  const mid = { x: lerp(from.x, to.x, 0.45), y: lerp(from.y, to.y, 0.45) + 1.5 + 3.5 * rig.j };
  const open = resample(spline([from, mid, to], 10).concat([to]), 28);
  const blend = shut.map((p, k) => ({ x: lerp(p.x, open[k]!.x, rig.j), y: lerp(p.y, open[k]!.y, rig.j) }));
  // Pinned to the jaw at every gape, easing out toward the belly.
  const miss = { x: from.x - blend[0]!.x, y: from.y - blend[0]!.y };
  const edge = blend.map((p, k) => {
    const u = 1 - smooth(k / (blend.length * 0.6));
    return { x: p.x + miss.x * u, y: p.y + miss.y * u };
  });
  return { fill: [sh.hinge, ...edge, ...[...sh.belly.slice(0, jb + 1)].reverse(), ...[...sh.cheek].reverse()], edge };
}

/** The white underside's wash: cool in the shade under the belly, ruled along it. */
function paintWhite(b: Brush, s: SharkSpec, sh: Shape, shape: readonly Pt[], x0: number, x1: number, dots: number): void {
  const { pen, ctx, px } = b;
  const low = Math.max(...sh.belly.map((p) => p.y));
  if (s.colours.tint) pen.fill(shape, s.colours.tint, 1);
  shadeIn(ctx, shape, 0, low + 3, [[0, 'rgba(85,104,124,0)'], [0.5, 'rgba(85,104,124,0.1)'], [1, 'rgba(85,104,124,0.5)']]);
  pen.clipped(shape, () => {
    for (let r = 1; r <= 8; r++) pen.hair(contour(sh, 1 - r * 0.03, x0, x1, 4), px(0.85), s.colours.cool, 0.45 - r * 0.045);
    pen.stipple(shape, dots, (_x, y) => Math.max(0, (y - low * 0.55) / (low * 0.5)), px(0.8), s.colours.cool);
  });
}

function paintLowerJaw(b: Brush, s: SharkSpec, sh: Shape, rig: Rig): void {
  const { pen, ctx, px } = b;
  const shape = [...sh.mouth, ...sh.chin.slice(0, chinSplit(sh) + 1).reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  paintWhite(b, s, sh, shape, sh.mouth[0]!.x + 2, sh.chin[sh.chin.length - 1]!.x, 260);
  // The lower gum and its teeth, grown out as the jaw drops: the second row first, behind.
  const show = smooth(rig.j * 3);
  if (show > 0.01) {
    drawRow(b, sh.mouth, -1, s.lower, true, show);
    drawRow(b, sh.mouth, -1, s.lower, false, show);
    drawGum(b, sh.mouth, -1, s.lower, s.gum * 0.8 * show);
  }
  pen.stroke(sh.chin.slice(0, chinSplit(sh) + 1), px(2.6 * s.weight), INK, 1, true);
  // The jaw's back edge, a crease once the throat stretches behind it.
  pen.hair([sh.hinge, sh.chin[chinSplit(sh)]!], px(1.2), INK, 0.45 * smooth(rig.j * 3));
  ctx.save();
  ctx.globalAlpha = 1 - show;
  pen.hair(sh.mouth, px(1.4), '#3b3236', 0.8);
  ctx.restore();
}

function paintUpperJaw(b: Brush, s: SharkSpec, sh: Shape): void {
  drawRow(b, sh.mouth, 1, s.upper, true);
  drawRow(b, sh.mouth, 1, s.upper, false);
  drawGum(b, sh.mouth, 1, s.upper, s.gum + 14);
}

export function drawShark(ctx: CanvasRenderingContext2D, s: SharkSpec, p: HeadPose): void {
  const sh = shapeOf(s);
  const frame = Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES;
  const rig = rigOf(s, sh, Math.max(0, Math.min(1, p.jaw)));
  drawCropped(ctx, p, p.size / 100, s.rect, 70, (c) => {
    const m = c.getTransform();
    const unit = Math.hypot(m.a, m.b);
    const weight = Math.max(0.85, Math.min(2.2, Math.sqrt(unit / 6)));
    const px = (n: number): number => (n * weight) / unit;
    const brush = (seed: number): Brush => {
      const pen = new Pen(c, s.seed + seed + frame * 977, px(0.6));
      return { ctx: c, pen, px, rng: pen.rng };
    };
    const body = bodyOf(sh, rig.warp);
    // Below the skull's edge: where the gum, the teeth and the gape may show.
    const below = [{ x: 200, y: body[0]!.y }, ...[...sh.under, ...sh.mouth.slice(1)].map(rig.warp), { x: sh.hinge.x - 2, y: sh.hinge.y + 6 }, { x: sh.hinge.x - 2, y: 300 }, { x: 200, y: 300 }];
    const k = brush(11);
    // 1 · the dorsal fin, behind the back.
    paintDorsal(brush(3), s, sh.dorsal);
    // 2 · the gape and the stretched throat, behind the jaws.
    const throat = throatOf(sh, rig);
    k.pen.fill(throat.fill, PAPER_FILL, 1);
    paintWhite(k, s, sh, throat.fill, sh.mouth[0]!.x, sh.belly[bellyJoin(sh)]!.x, 200);
    k.pen.clipped(throat.fill, () => {
      for (let r = 1; r <= 5; r++) k.pen.hair(throat.edge.map((q) => ({ x: q.x, y: q.y - r * 1.4 })), px(0.85), s.colours.cool, (0.4 - r * 0.06) * rig.j);
    });
    c.save();
    fillPath(c, below);
    c.clip();
    drawGape(brush(5), sh.mouth.map(rig.upper), sh.mouth.map(rig.lower), rig.j);
    c.restore();
    // 3 · the lower jaw on its hinge.
    c.save();
    rig.lowerFrame(c);
    paintLowerJaw(brush(7), s, sh, rig);
    c.restore();
    // 4 · the upper jaw slid out from under the snout, its teeth over the lower lip.
    c.save();
    fillPath(c, below);
    c.clip();
    rig.upperFrame(c);
    paintUpperJaw(brush(9), s, sh);
    c.restore();
    // 5 · the skull and shoulders, the snout lifted.
    paintSkin(k, s, sh, rig, body);
    paintGills(brush(13), s);
    paintSnout(brush(17), s, sh, rig, body);
    k.pen.stroke(sh.belly.slice(bellyJoin(sh)).filter((q) => q.x > sh.belly[sh.belly.length - 1]!.x + 18), px(2.8 * s.weight), INK, 1, true);
    k.pen.stroke(throat.edge, px(2.6 * s.weight), INK, 1, true);
    k.pen.stroke([...sh.back].reverse().filter((q) => q.x > sh.back[sh.back.length - 1]!.x + 18).concat(sh.under.slice(1)).map(rig.warp), px(2.8 * s.weight), INK, 1, true);
    k.pen.stroke(sh.mouth.map(rig.warp), px(2.2 * s.weight), INK, 1, false);
    k.pen.hair(sh.cheek.slice(0, Math.ceil(sh.cheek.length * 0.45)), px(1.3), INK, 0.6 * rig.j);
    // The lifted lip's shadow over the gum.
    if (rig.j > 0.01) {
      c.save();
      fillPath(c, below);
      c.clip();
      c.strokeStyle = `rgba(70,12,24,${0.45 * rig.j})`;
      c.lineWidth = 2.4;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      sh.mouth.map(rig.warp).forEach((q, i) => (i ? c.lineTo(q.x - 0.4, q.y + 0.9) : c.moveTo(q.x - 0.4, q.y + 0.9)));
      c.stroke();
      c.restore();
    }
    paintFin(brush(19), s, sh.pectoral, { x: sh.pectoral[0]!.x - 6, y: sh.pectoral[0]!.y + 2 });
    paintEye(brush(23), s, rig);
  });
}
