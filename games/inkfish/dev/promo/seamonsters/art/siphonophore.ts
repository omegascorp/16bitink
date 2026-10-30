import { INK, makeCanvas, pathOf, Pen } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { boundsOf, type Box, capsule, clamp01, closed, cub, lerp, pt, ribbon, smooth, TAU } from '../../foodchain/art/plankton/ink';
import type { KitEntry } from '../../foodchain/kit';
import { boilOf, penFor, type Pt, spline } from '../../swallowyou/art/ink';

/**
 * The giant Apolemia siphonophore that Schmidt Ocean Institute's ROV filmed
 * off Ningaloo in 2020, coiled in black water: a pale, faintly glowing string
 * of beads and frills, peach-white with orange tints, in the game's pen and
 * ink painted like a scientific plate (a thin wash, a brighter gel rim, a
 * glassy glint, an ink contour that boils 8 times a second).
 *
 * It is a colony of identical clones (zooids) on one stem:
 * - The head (nectosome): a tiny gas float with an orange tip, then a double
 *   row of translucent swimming bells (nectophores), the young ones small at
 *   the front, each jetting water out of its back opening as it pulses.
 * - Behind it, thousands of repeats of one group (a cormidium): two gel
 *   shields (bracts) above, one below, a feeding polyp (gastrozooid) hanging
 *   down, orange, with its mouth at the tip; a small palpon, a cluster of
 *   buds (gonophores), and a fine stinging tentacle trailing from the polyp's
 *   base, beaded with nematocyst batteries. The groups near the head are
 *   young and small, and the last ones at the tail end taper off.
 *
 * Geometry is in "units": the bracts' envelope is ENVELOPE units across, and
 * that is the `width` px the caller asks for; one cormidium is SPACING units
 * long. Local frame: x from the head's tip towards the tail, y towards the
 * polyps' side. Long runs stamp baked sprites (per size tier, boil frame,
 * pulse step) along the path; tentacles, glow and the lens are drawn live.
 */

/** Height (the bracts' envelope) over length, for laying it out beside "you": a thread. */
export const SIPHONOPHORE_HEIGHT = 0.004;

export interface SiphonophoreLook {
  /** Overall opacity, 0..1 (default 1). */
  readonly alpha?: number;
  /** Bioluminescent glow, 0..1 (default 0: just the faint sheen of gel in a lamp). */
  readonly glow?: number;
  /** How much of the path is drawn, from the head end, 0..1 (default 1). */
  readonly reveal?: number;
  /** Thickness in px (the bracts' envelope; polyps and tentacles hang beyond it). Default 10. */
  readonly width?: number;
  /** Which side the polyps and tentacles hang on, looking from head to tail: 1 right, -1 left (default; down when the head points right). */
  readonly side?: 1 | -1;
  /** The travelling ripple along the stem, 0 holds the path exactly (default 1). */
  readonly sway?: number;
}

export type SiphonophorePose = Omit<SiphonophoreLook, 'width' | 'side'>;

export type ZooidKind = 'swim' | 'sting' | 'eat';

/** Units across the bracts' envelope; one cormidium's length; the head's length; its swimming bells. */
const ENVELOPE = 20;
const SPACING = 12;
const HEAD_LEN = 48;
const BELLS = 8;
/** Swimming bells' pulse, Hz. */
const PULSE_HZ = 1.4;

const JELLY = '255,230,212';
const PEACH = '#f6cdb2';
const APRICOT = '#f2a274';
const ORANGE = '#e6693f';
const RUST = '#a5401f';
const SPOT = '#fffaf2';
const STRAND = '255,228,210';

// ---------------------------------------------------------------- the brush: one painting at one scale

interface Brush {
  readonly ctx: CanvasRenderingContext2D;
  /** px per unit. */
  readonly k: number;
  /** Contour and hairline widths, px. */
  readonly line: number;
  readonly fine: number;
  /** How much ink contour shows: none at the smallest sprite sizes, where it would only grey the gel. */
  readonly inked: number;
  readonly seed: number;
  readonly wobble: number;
}

function makeBrush(ctx: CanvasRenderingContext2D, k: number, seed: number): Brush {
  return {
    ctx, k, seed,
    line: Math.min(3.4, 0.25 + 0.3 * k),
    fine: Math.min(1.5, 0.18 + 0.12 * k),
    inked: smooth((k - 0.55) / 1.1),
    wobble: Math.min(1.3, Math.max(0.05, k * 0.14)),
  };
}

/** A pen per part, so a pose change in one part never shifts another's boil. */
const penOf = (b: Brush, part: number): Pen => new Pen(b.ctx, b.seed + part * 7919, b.wobble);
const px = (b: Brush, q: Pt): Pt => pt(q.x * b.k, q.y * b.k);
const pxs = (b: Brush, qs: readonly Pt[]): Pt[] => qs.map((q) => px(b, q));

const rotated = (x: number, y: number, a: number): Pt => pt(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));

/** An egg: fat end towards +x (turned by `rot`), the narrow end where it is attached. */
function egg(c: Pt, rx: number, ry: number, rot: number, n = 22): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const p = rotated(rx * Math.cos(a), ry * Math.sin(a) * (0.78 + 0.22 * Math.cos(a)), rot);
    return pt(c.x + p.x, c.y + p.y);
  });
}

const hash01 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------------------------------------------------------------- painted gel

interface JellyStyle {
  /** The thin body wash, the brighter rim, the warm off-register tint, and opacity. */
  readonly body: number;
  readonly rim: number;
  readonly warm: number;
  readonly alpha: number;
}

/** The arc of a closed shape facing the light (upper left in the local frame), for a glint. */
function litArc(shape: readonly Pt[], c: Pt): Pt[] {
  const facing = (p: Pt): number => (p.x - c.x) * -0.6 + (p.y - c.y) * -0.8;
  let start = 0;
  shape.forEach((p, i) => {
    if (facing(p) < facing(shape[start]!)) start = i;
  });
  const loop = [...shape.slice(start), ...shape.slice(0, start)];
  return loop.filter((p) => facing(p) > 0.25 * Math.hypot(p.x - c.x, p.y - c.y));
}

/** A translucent gel part (px shape): a thin wash, a rim denser than the middle, a warm tint laid off the line, a glint, ink. */
function jelly(b: Brush, pen: Pen, shape: readonly Pt[], s: JellyStyle): void {
  const { ctx } = b;
  const box = boundsOf(shape);
  const c = pt((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
  const r = Math.max(box.x1 - box.x0, box.y1 - box.y0) * 0.55 + 0.5;
  pen.fill(shape, `rgb(${JELLY})`, s.body * s.alpha);
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  const g = ctx.createRadialGradient(c.x - r * 0.2, c.y - r * 0.25, 0, c.x, c.y, r);
  g.addColorStop(0, 'rgba(255,250,244,0)');
  g.addColorStop(0.62, `rgba(${JELLY},${(0.12 * s.alpha).toFixed(3)})`);
  g.addColorStop(1, `rgba(255,246,238,${(s.rim * s.alpha).toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(box.x0 - 1, box.y0 - 1, box.x1 - box.x0 + 2, box.y1 - box.y0 + 2);
  if (s.warm > 0) {
    ctx.translate(b.k * 0.7, b.k * 0.5);
    pen.fill(shape, APRICOT, s.warm * s.alpha);
  }
  ctx.restore();
  if (b.inked > 0) pen.stroke(closed(shape), b.line * 0.55, INK, 0.6 * b.inked * s.alpha, false);
  const inset = Math.min(0.25, (0.7 * b.k) / r);
  const glint = litArc(shape.map((p) => lerp(p, c, inset)), c);
  if (glint.length > 1) pen.hair(glint, b.fine, SPOT, 0.55 * s.alpha);
}

// ---------------------------------------------------------------- the stem, the bells, the polyps

/** A stretch of the stem (units), pale and opaque so the stamped repeats join without seams. */
function stem(b: Brush, pen: Pen, x0: number, x1: number, w: number, alpha: number): void {
  const { ctx } = b;
  const shape = pxs(b, capsule(pt(x0, 0), pt(x1, 0), w, w));
  const g = ctx.createLinearGradient(0, -w * 0.5 * b.k, 0, w * 0.5 * b.k);
  g.addColorStop(0, '#fff1e4');
  g.addColorStop(0.45, PEACH);
  g.addColorStop(1, '#d99a78');
  ctx.save();
  ctx.globalAlpha *= alpha;
  pathOf(ctx, shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  if (b.k > 0.7) pen.hair(pxs(b, [pt(x0 + 0.5, 0.05), pt(x1 - 0.5, 0.05)]), b.fine * 0.9, ORANGE, 0.55 * alpha);
  if (b.inked <= 0) return;
  pen.stroke(pxs(b, [pt(x0, -w / 2), pt(x1, -w / 2)]), b.line * 0.45, INK, 0.5 * b.inked * alpha, false);
  pen.stroke(pxs(b, [pt(x0, w / 2), pt(x1, w / 2)]), b.line * 0.45, INK, 0.5 * b.inked * alpha, false);
}

/**
 * One swimming bell (units): a rounded gel box with a muscular sac inside and
 * its opening (ostium) at the back, so it jets towards the tail; `squeeze`
 * 0..1 is the stroke (narrower, with a puff of water out of the back).
 */
function bell(b: Brush, pen: Pen, c: Pt, len: number, ht: number, tilt: number, squeeze: number, alpha: number): void {
  const L = len * (1 - 0.05 * squeeze);
  const H = ht * (1 - 0.17 * squeeze);
  const at = (x: number, y: number): Pt => {
    const p = rotated(x, y, tilt);
    return pt(c.x + p.x, c.y + p.y);
  };
  const outline = (s: number, dx: number): Pt[] => {
    const q = (x: number, y: number): Pt => at(dx + x * s, y * s);
    const top = cub(q(-0.5 * L, 0), q(-0.5 * L, -0.62 * H), q(0.26 * L, -0.64 * H), q(0.5 * L, -0.36 * H), 10);
    const lip = cub(q(0.5 * L, -0.36 * H), q(0.4 * L, -0.16 * H), q(0.4 * L, 0.16 * H), q(0.5 * L, 0.36 * H), 6).slice(1);
    const bot = cub(q(0.5 * L, 0.36 * H), q(0.26 * L, 0.64 * H), q(-0.5 * L, 0.62 * H), q(-0.5 * L, 0), 10).slice(1, -1);
    return [...top, ...lip, ...bot];
  };
  jelly(b, pen, pxs(b, outline(1, 0)), { body: 0.3, rim: 0.88, warm: 0.14, alpha });
  jelly(b, pen, pxs(b, outline(0.66 - 0.1 * squeeze, 0.08 * L)), { body: 0.14, rim: 0.55, warm: 0.16, alpha: alpha * 0.9 });
  if (b.k > 1.4) {
    // Four radial canals across the sac, and the ring of the opening.
    for (const v of [-0.27, -0.09, 0.09, 0.27]) {
      pen.hair(pxs(b, [at(-0.24 * L, v * H * 0.8), at(0.12 * L, v * H * 1.15), at(0.42 * L, v * H * 1.05)]), b.fine * 0.8, APRICOT, 0.55 * alpha);
    }
    const ring = Array.from({ length: 12 }, (_, i) => at(0.46 * L + 0.05 * L * Math.cos((i / 12) * TAU), 0.3 * H * Math.sin((i / 12) * TAU)));
    pen.hair(pxs(b, closed(ring)), b.fine, SPOT, 0.6 * alpha);
  }
  const jet = clamp01((squeeze - 0.45) / 0.55);
  if (jet > 0 && b.k > 0.7) {
    for (const v of [-0.18, 0, 0.18]) pen.hair(pxs(b, [at(0.52 * L, v * H), at((0.6 + 0.55 * jet) * L, v * H * 1.6)]), b.fine * 0.8, SPOT, 0.3 * jet * alpha);
  }
}

/** The feeding polyp (units): an orange sac hanging from the stem, a bulb near its base, its mouth at the tip; `bend` writhes it. */
function gastrozooid(b: Brush, pen: Pen, base: Pt, tip: Pt, bend: number, alpha: number): void {
  const { ctx } = b;
  const len = Math.hypot(tip.x - base.x, tip.y - base.y);
  const d = pt((tip.x - base.x) / len, (tip.y - base.y) / len);
  const n = pt(-d.y, d.x);
  const off = (u: number, k: number): Pt => pt(base.x + d.x * len * u + n.x * bend * k, base.y + d.y * len * u + n.y * bend * k);
  const spine = pxs(b, cub(base, off(0.33, 0.8), off(0.66, 1.2), pt(tip.x + n.x * bend * 0.5, tip.y + n.y * bend * 0.5), 16));
  const width = (u: number): number => b.k * (1.2 + 1.3 * Math.exp(-(((u - 0.2) / 0.1) ** 2)) + 1.9 * Math.exp(-(((u - 0.66) / 0.2) ** 2)) + 0.9 * Math.exp(-(((u - 0.98) / 0.05) ** 2)));
  const rib = ribbon(spine, width);
  const g = ctx.createLinearGradient(spine[0]!.x, spine[0]!.y, spine[spine.length - 1]!.x, spine[spine.length - 1]!.y);
  g.addColorStop(0, PEACH);
  g.addColorStop(0.25, APRICOT);
  g.addColorStop(0.62, ORANGE);
  g.addColorStop(0.9, '#d4552f');
  g.addColorStop(1, RUST);
  ctx.save();
  ctx.globalAlpha *= 0.92 * alpha;
  pathOf(ctx, rib.shape);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  if (b.k > 1.8) {
    // Shade on the far side, a band at the bulb, the gut showing through.
    const shadow = [...spine, ...[...rib.bot].reverse()];
    pen.clipped(shadow, () => pen.hatch(shadow, Math.max(1.4, b.k * 0.75), Math.atan2(d.y, d.x) + 0.9, b.fine * 0.8, { color: RUST, alpha: 0.2 * alpha }));
    const band = Math.round(0.22 * (spine.length - 1));
    pen.hair([rib.top[band]!, rib.bot[band]!], b.fine * 1.2, RUST, 0.6 * alpha);
  }
  if (b.k > 0.8) {
    const glint = rib.top.slice(3, -4).map((p, i) => lerp(p, spine[i + 3]!, 0.35));
    pen.hair(glint, b.fine * 1.1, SPOT, 0.6 * alpha);
  }
  const mouth = spine[spine.length - 1]!;
  pen.dot(mouth.x, mouth.y, Math.max(0.35, b.k * 0.45), RUST, 0.9 * alpha);
  if (b.inked > 0) pen.stroke(closed(rib.shape), b.line * 0.6, INK, 0.8 * b.inked * alpha, false);
}

/** Where a cormidium's polyp and its tentacle hang from (units, in the cormidium's own frame). */
const GASTRO_BASE = pt(4.6, 1.0);
const GASTRO_TIP = pt(6.3, 10.4);
const TENTACLE_ROOT = pt(4.9, 2.2);

/** One repeat of the colony (units, x 0..SPACING): bracts, the polyp, a palpon, buds, the stem. */
function paintCormidium(b: Brush, body: number, eat: number, writhe: number): void {
  const pen = penOf(b, 3);
  for (const [x, y, r] of [[1.0, 2.6, 1.0], [2.3, 3.4, 1.1], [0.6, 3.9, 0.8]] as const) {
    jelly(b, pen, pxs(b, egg(pt(x, y), r, r * 0.9, 1.2, 12)), { body: 0.45, rim: 0.8, warm: 0.14, alpha: body });
    if (b.k > 1.2) pen.dot(x * b.k, y * b.k, b.k * 0.3, ORANGE, 0.7 * body);
  }
  const palpon = pxs(b, capsule(pt(10.6, 1.0), pt(11.4, 5.4), 1.4, 0.8));
  jelly(b, pen, palpon, { body: 0.5, rim: 0.5, warm: 0.3, alpha: body });
  pen.dot(11.4 * b.k, 5.4 * b.k, Math.max(0.3, b.k * 0.35), ORANGE, 0.8 * body);
  gastrozooid(b, penOf(b, 4), GASTRO_BASE, GASTRO_TIP, writhe, eat);
  stem(b, penOf(b, 5), -1.5, SPACING + 1.5, 1.05, 1);
  const bracts: readonly (readonly [number, number, number, number, number])[] = [
    [9.2, -3.7, 4.3, 3.1, -0.3],
    [3.6, -4.5, 5.3, 3.7, -0.42],
    [7.8, 3.6, 4.4, 3.0, 0.42],
  ];
  bracts.forEach(([x, y, rx, ry, rot], i) => {
    const bp = penOf(b, 6 + i);
    const shape = pxs(b, egg(pt(x, y), rx, ry, rot));
    jelly(b, bp, shape, { body: 0.34, rim: 0.92, warm: 0.16, alpha: body });
    if (b.k < 0.9) return;
    // The canal running into the bract, and the white spots Apolemia is known for.
    const root = pt(x - Math.cos(rot) * rx * 0.75, y - Math.sin(rot) * rx * 0.75);
    bp.hair(pxs(b, [root, pt(x + Math.cos(rot) * rx * 0.2, y + Math.sin(rot) * rx * 0.2)]), b.fine * 0.8, APRICOT, 0.6 * body);
    for (let j = 0; j < 3; j++) {
      const p = pt(x + Math.cos(rot) * rx * (0.05 + 0.25 * j) + (j - 1) * 0.4, y + Math.sin(rot) * rx * 0.25 * j + (j % 2 ? -1 : 1) * ry * 0.35);
      bp.dot(p.x * b.k, p.y * b.k, Math.max(0.35, b.k * 0.34), SPOT, 0.85 * body);
    }
  });
}

/** Swimming bell i: its centre (units, head frame), size, side and tilt. The young buds sit small at the front. */
function bellAt(i: number): { readonly c: Pt; readonly len: number; readonly ht: number; readonly tilt: number } {
  const sz = 0.42 + 0.58 * smooth(i / 4.5);
  const sgn = i % 2 === 0 ? 1 : -1;
  const ht = 8 * sz;
  return { c: pt(3.6 + i * 5.4 + (sz - 1) * 1.5, sgn * (ht * 0.5 + 0.5)), len: 9 * sz, ht, tilt: sgn * 0.18 };
}

/** The head (units, tip at the origin): the stem, the gas float, the swimming bells pulsing in a wave, `phase` in cycles. */
function paintHead(b: Brush, phase: number, swim: number): void {
  const pen = penOf(b, 1);
  stem(b, pen, 1.2, HEAD_LEN + 1.5, 0.95, 1);
  for (let i = BELLS - 1; i >= 0; i--) {
    const { c, len, ht, tilt } = bellAt(i);
    const bp = penOf(b, 10 + i);
    bp.hair(pxs(b, [pt(c.x - len * 0.25, 0), pt(c.x - len * 0.1, c.y * 0.55)]), b.fine * 1.2, PEACH, 0.8 * swim);
    bell(b, bp, c, len, ht, tilt, 0.5 + 0.5 * Math.sin(TAU * phase - i * 0.9), swim);
  }
  const float = pxs(b, egg(pt(1.6, 0), 2.1, 1.5, Math.PI, 16));
  jelly(b, penOf(b, 2), float, { body: 0.45, rim: 0.7, warm: 0.2, alpha: swim });
  pen.dot(0.25 * b.k, 0, Math.max(0.4, b.k * 0.62), ORANGE, 0.95 * swim);
}

// ---------------------------------------------------------------- sprites

/** Sprite sizes (width px) baked per boil frame; the smallest one at least the drawn size is used. */
const TIERS = [8, 16, 32, 64, 128] as const;
const PULSE_STEPS = 6;
/** Hand-drawn repeats of the same cormidium (same shapes, a different pen), so the clones are not pixel copies. */
const VARIANTS = 3;
const PAD = 3;
const CORM_BOX: Box = { x0: -3, x1: 15.5, y0: -9.5, y1: 12.5 };
const HEAD_BOX: Box = { x0: -1.5, x1: HEAD_LEN + 3, y0: -10.5, y1: 10.5 };

interface Sheet {
  readonly canvas: HTMLCanvasElement;
  /** Where the canvas's corner sits in the tier's px, and the tier's px per unit. */
  readonly ox: number;
  readonly oy: number;
  readonly k: number;
}

const sheets = new Map<string, Sheet>();

function bake(box: Box, tier: number, seed: number, paintIt: (b: Brush) => void): Sheet {
  const k = tier / ENVELOPE;
  const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * k) + 2 * PAD, Math.ceil((box.y1 - box.y0) * k) + 2 * PAD);
  ctx.translate(-box.x0 * k + PAD, -box.y0 * k + PAD);
  paintIt(makeBrush(ctx, k, seed));
  return { canvas, ox: box.x0 * k - PAD, oy: box.y0 * k - PAD, k };
}

function cormSheet(tier: number, boil: number, variant: number): Sheet {
  const key = `c|${tier}|${boil}|${variant}`;
  const hit = sheets.get(key);
  if (hit) return hit;
  const made = bake(CORM_BOX, tier, 7301 + variant * 3331 + boil * 977, (b) => paintCormidium(b, 1, 1, 0));
  sheets.set(key, made);
  return made;
}

function headSheet(tier: number, boil: number, step: number): Sheet {
  const key = `h|${tier}|${boil}|${step}`;
  const hit = sheets.get(key);
  if (hit) return hit;
  const made = bake(HEAD_BOX, tier, 5101 + boil * 977, (b) => paintHead(b, step / PULSE_STEPS, 1));
  sheets.set(key, made);
  return made;
}

let glowSprite: HTMLCanvasElement | null = null;
/** A soft warm light, baked once and stretched where needed. */
function glowDot(): HTMLCanvasElement {
  if (glowSprite) return glowSprite;
  const { canvas, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,214,182,1)');
  g.addColorStop(0.35, 'rgba(255,180,140,0.45)');
  g.addColorStop(1, 'rgba(255,160,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowSprite = canvas;
  return canvas;
}

/** Bakes every sprite (all tiers, boil frames, variants and pulse steps), yielding between tiers. */
export async function prepare(): Promise<void> {
  glowDot();
  for (const tier of TIERS) {
    for (let boil = 0; boil < BOIL_FRAMES; boil++) {
      for (let v = 0; v < VARIANTS; v++) cormSheet(tier, boil, v);
      for (let s = 0; s < PULSE_STEPS; s++) headSheet(tier, boil, s);
    }
    await new Promise<void>((done) => setTimeout(done, 0));
  }
}

// ---------------------------------------------------------------- along a path

/** Points every `step` px along a polyline, from its start up to `upTo` px along it. */
function resample(path: readonly Pt[], step: number, upTo: number): Pt[] {
  const out: Pt[] = [];
  const count = Math.floor(upTo / step + 1e-6);
  let seg = 0;
  let segStart = 0;
  let segLen = Math.hypot(path[1]!.x - path[0]!.x, path[1]!.y - path[0]!.y);
  for (let j = 0; j <= count; j++) {
    const s = j * step;
    while (s > segStart + segLen && seg < path.length - 2) {
      segStart += segLen;
      seg++;
      segLen = Math.hypot(path[seg + 1]!.x - path[seg]!.x, path[seg + 1]!.y - path[seg]!.y);
    }
    out.push(lerp(path[seg]!, path[seg + 1]!, segLen > 0 ? Math.min(1, (s - segStart) / segLen) : 0));
  }
  return out;
}

function pathLength(path: readonly Pt[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
  return total;
}

/** Unit directions (head to tail) at each point, by central differences. */
function directions(pts: readonly Pt[], fallback: Pt): Pt[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    return d > 1e-6 ? pt((b.x - a.x) / d, (b.y - a.y) / d) : fallback;
  });
}

/** A gentle wave travelling from the head down the stem, across the path. */
function ripple(pts: readonly Pt[], step: number, w: number, t: number, sway: number, fallback: Pt): Pt[] {
  if (sway <= 0) return [...pts];
  const dirs = directions(pts, fallback);
  return pts.map((p, j) => {
    const s = j * step;
    const amp = sway * 0.16 * w * Math.min(1, s / (3 * w)) * Math.sin((TAU * s) / (9 * w) - 2.3 * t);
    return pt(p.x - dirs[j]!.y * amp, p.y + dirs[j]!.x * amp);
  });
}

/** The current transform as numbers, for composing stamps quickly. */
interface Mat {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

/** Sets base ∘ (translate p · rotate to dir · scale s, y flipped by side). */
function setStamp(ctx: CanvasRenderingContext2D, m: Mat, p: Pt, dir: Pt, s: number, side: number): void {
  const a = s * dir.x;
  const b = s * dir.y;
  const c = -s * side * dir.y;
  const d = s * side * dir.x;
  ctx.setTransform(m.a * a + m.c * b, m.b * a + m.d * b, m.a * c + m.c * d, m.b * c + m.d * d, m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
}

interface Run {
  readonly ctx: CanvasRenderingContext2D;
  readonly m: Mat;
  readonly pts: readonly Pt[];
  readonly dirs: readonly Pt[];
  /** px per unit, the polyps' side, time, glow, the cormidia in the whole (not just revealed) length. */
  readonly k: number;
  readonly side: number;
  readonly t: number;
  readonly glow: number;
  readonly total: number;
}

/** Young cormidia grow behind the head; the oldest taper off at the tail end. */
const HEAD_STEPS = HEAD_LEN / SPACING;
const taperOf = (run: Run, c: number): number =>
  (0.7 + 0.3 * smooth(c / Math.min(6, run.total * 0.15))) * (0.35 + 0.65 * smooth((run.total - c) / Math.min(18, run.total * 0.25)));

function onScreen(run: Run, p: Pt, margin: number): boolean {
  const { m } = run;
  const x = m.a * p.x + m.c * p.y + m.e;
  const y = m.b * p.x + m.d * p.y + m.f;
  return x > -margin && y > -margin && x < run.ctx.canvas.width + margin && y < run.ctx.canvas.height + margin;
}

/** The halo of light round the whole visible string (additive). */
function drawHalo(run: Run, w: number): void {
  const { ctx, pts } = run;
  if (pts.length < 2) return;
  const g = 0.3 + run.glow;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [mult, a] of [[5.5, 0.03], [2.6, 0.055], [1.2, 0.08]] as const) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.lineWidth = Math.min(w * mult, 14 * mult + w * 0.8);
    ctx.strokeStyle = `rgba(255,186,150,${(a * g).toFixed(3)})`;
    ctx.stroke();
  }
  ctx.restore();
}

/** Where cormidium c's tentacle hangs: root, a swaying bend, the tip (px). */
function tentacleOf(run: Run, c: number, j: number): { readonly root: Pt; readonly mid: Pt; readonly tip: Pt; readonly long: boolean } {
  const p = run.pts[j]!;
  const d = run.dirs[j]!;
  const nv = pt(-d.y * run.side, d.x * run.side);
  const k = run.k * taperOf(run, c);
  const root = pt(p.x + d.x * TENTACLE_ROOT.x * k + nv.x * TENTACLE_ROOT.y * k, p.y + d.y * TENTACLE_ROOT.x * k + nv.y * TENTACLE_ROOT.y * k);
  const hx = nv.x * 0.8 + d.x * 0.7;
  const hy = nv.y * 0.8 + d.y * 0.7 + 0.25;
  const hl = Math.hypot(hx, hy) || 1;
  const h = pt(hx / hl, hy / hl);
  // Most are pulled up short, some hang loose, a few are fishing at full stretch.
  const roll = hash01(c * 7.13);
  const long = roll > 0.8;
  const len = ENVELOPE * k * (long ? 2.6 + 2.6 * hash01(c * 3.7) : roll < 0.45 ? 0.35 + roll : 1 + 1.6 * hash01(c * 5.9));
  const bow = (hash01(c * 2.3) - 0.5) * 0.7;
  const sway = Math.sin(1.1 * run.t + c * 0.83) * 0.22 + bow;
  const mid = pt(root.x + h.x * len * 0.5 - h.y * len * sway, root.y + h.y * len * 0.5 + h.x * len * sway);
  const sway2 = Math.sin(1.1 * run.t + c * 0.83 - 1.2) * 0.3 - bow * 0.4;
  const tip = pt(root.x + h.x * len + d.x * len * 0.25 - h.y * len * sway2, root.y + h.y * len + d.y * len * 0.25 + h.x * len * sway2);
  return { root, mid, tip, long };
}

const quadAt = (a: Pt, c: Pt, b: Pt, u: number): Pt => {
  const v = 1 - u;
  return pt(v * v * a.x + 2 * v * u * c.x + u * u * b.x, v * v * a.y + 2 * v * u * c.y + u * u * b.y);
};

/** Every revealed cormidium's fine tentacle in one stroke, the long ones beaded with stinging batteries. */
function drawTentacles(run: Run, w: number, count: number): void {
  const { ctx } = run;
  const beads: Pt[] = [];
  ctx.save();
  ctx.beginPath();
  for (let c = 0; c < count; c++) {
    const j = c + HEAD_STEPS;
    if (!onScreen(run, run.pts[j]!, w * 8)) continue;
    const tn = tentacleOf(run, c, j);
    ctx.moveTo(tn.root.x, tn.root.y);
    ctx.quadraticCurveTo(tn.mid.x, tn.mid.y, tn.tip.x, tn.tip.y);
    if (tn.long && w >= 9) for (const u of [0.45, 0.6, 0.74, 0.87, 1]) beads.push(quadAt(tn.root, tn.mid, tn.tip, u));
  }
  ctx.lineWidth = Math.min(2.2, Math.max(0.5, w * 0.035));
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(${STRAND},0.42)`;
  ctx.stroke();
  if (beads.length) {
    const r = Math.min(3.2, Math.max(0.6, w * 0.045));
    ctx.beginPath();
    for (const b of beads) {
      ctx.moveTo(b.x + r, b.y);
      ctx.arc(b.x, b.y, r, 0, TAU);
    }
    ctx.fillStyle = 'rgba(242,128,88,0.75)';
    ctx.fill();
  }
  ctx.restore();
}

/** One unbroken stem under the stamps, so tapered clones at the ends still hang on a line. */
function drawStem(run: Run): void {
  const { ctx, pts } = run;
  if (pts.length <= HEAD_STEPS) return;
  ctx.save();
  ctx.beginPath();
  for (let j = HEAD_STEPS - 1; j < pts.length; j++) (j === HEAD_STEPS - 1 ? ctx.moveTo(pts[j]!.x, pts[j]!.y) : ctx.lineTo(pts[j]!.x, pts[j]!.y));
  ctx.lineWidth = Math.max(0.5, run.k * 0.9);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PEACH;
  ctx.stroke();
  ctx.restore();
}

/** Stamps the cormidia, tail end first, then the head on top. */
function drawBodies(run: Run, w: number, count: number, scale: number): void {
  const { ctx, m } = run;
  const need = (w * scale) / ENVELOPE;
  const tier = TIERS.find((s) => s / ENVELOPE >= need) ?? TIERS[TIERS.length - 1]!;
  const boil = boilOf(run.t);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (let c = count - 1; c >= 0; c--) {
    const j = c + HEAD_STEPS;
    if (!onScreen(run, run.pts[j]!, w * 3 * scale)) continue;
    const sheet = cormSheet(tier, boil, (c + boil) % VARIANTS);
    // Each clone sits a little differently on the stem, so the repeats don't read as a zipper.
    const d = run.dirs[j]!;
    const turn = (hash01(c * 1.9) - 0.5) * 0.3 * clamp01((40 - w) / 30);
    const dir = pt(d.x * Math.cos(turn) - d.y * Math.sin(turn), d.x * Math.sin(turn) + d.y * Math.cos(turn));
    setStamp(ctx, m, run.pts[j]!, dir, (run.k * taperOf(run, c) * (0.88 + 0.24 * hash01(c * 4.3))) / sheet.k, run.side);
    ctx.drawImage(sheet.canvas, sheet.ox, sheet.oy);
  }
  const hj = Math.min(run.pts.length - 1, HEAD_STEPS);
  const head = run.pts[0]!;
  const dl = Math.hypot(run.pts[hj]!.x - head.x, run.pts[hj]!.y - head.y);
  const dir = dl > 1e-6 ? pt((run.pts[hj]!.x - head.x) / dl, (run.pts[hj]!.y - head.y) / dl) : run.dirs[0]!;
  // The bells catch the light: a soft glow round the head.
  const centre = pt(head.x + dir.x * HEAD_LEN * 0.45 * run.k, head.y + dir.y * HEAD_LEN * 0.45 * run.k);
  const gr = HEAD_LEN * 0.55 * run.k;
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= 0.25 + 0.5 * run.glow;
  ctx.drawImage(glowDot(), centre.x - gr, centre.y - gr, 2 * gr, 2 * gr);
  ctx.restore();
  const step = Math.floor(run.t * PULSE_HZ * PULSE_STEPS) % PULSE_STEPS;
  const sheet = headSheet(tier, boil, step);
  setStamp(ctx, m, head, dir, run.k / sheet.k, run.side);
  ctx.drawImage(sheet.canvas, sheet.ox, sheet.oy);
  ctx.restore();
}

/** Twinkles of bioluminescence along the string (additive). */
function drawSparks(run: Run, w: number, count: number): void {
  if (run.glow <= 0) return;
  const { ctx } = run;
  const dot = glowDot();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let c = 0; c < count; c += 3) {
    const j = c + HEAD_STEPS;
    const p = run.pts[j]!;
    if (!onScreen(run, p, w * 4)) continue;
    const tw = Math.max(0, Math.sin(run.t * 2.1 + c * 1.7));
    if (tw <= 0.05) continue;
    const r = w * (0.9 + 0.8 * hash01(c));
    ctx.globalAlpha = run.glow * tw * 0.7;
    ctx.drawImage(dot, p.x - r, p.y - r, 2 * r, 2 * r);
  }
  ctx.restore();
}

/** The siphonophore along any polyline, its head at path[0]. */
export function drawSiphonophoreAlong(ctx: CanvasRenderingContext2D, path: readonly Pt[], t: number, look: SiphonophoreLook = {}): void {
  const alpha = clamp01(look.alpha ?? 1);
  if (alpha <= 0 || path.length < 2) return;
  const w = look.width ?? 10;
  const k = w / ENVELOPE;
  const step = SPACING * k;
  const length = pathLength(path);
  const shown = length * clamp01(look.reveal ?? 1);
  if (shown <= 0 || length <= 0) return;
  const fallback = (() => {
    const d = Math.hypot(path[1]!.x - path[0]!.x, path[1]!.y - path[0]!.y) || 1;
    return pt((path[1]!.x - path[0]!.x) / d, (path[1]!.y - path[0]!.y) / d);
  })();
  const pts = ripple(resample(path, step, shown), step, w, t, look.sway ?? 1, fallback);
  const tm = ctx.getTransform();
  const m: Mat = { a: tm.a, b: tm.b, c: tm.c, d: tm.d, e: tm.e, f: tm.f };
  const run: Run = {
    ctx, m, pts, k, t,
    dirs: directions(pts, fallback),
    side: look.side ?? -1,
    glow: clamp01(look.glow ?? 0),
    total: Math.max(1, Math.floor(length / step) - HEAD_STEPS + 1),
  };
  const count = Math.max(0, pts.length - HEAD_STEPS);
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawHalo(run, w);
  drawTentacles(run, w, count);
  drawStem(run);
  drawBodies(run, w, count, Math.hypot(tm.a, tm.b));
  drawSparks(run, w, count);
  ctx.restore();
}

/**
 * The contract shared with the other animals: the head (swimming bells) at
 * (x, y), `length` px to the far end, which lies to the left when facing = 1,
 * along a gently waving line on y; it is SIPHONOPHORE_HEIGHT x length thick.
 */
export function drawSiphonophore(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, pose: SiphonophorePose = {}): void {
  if (length <= 0) return;
  const w = Math.max(3, length * SIPHONOPHORE_HEIGHT);
  const n = Math.min(2000, Math.max(8, Math.ceil(length / (1.5 * w))));
  const amp = Math.min(2.2 * w, 0.012 * length);
  const wave = Math.max(30 * w, length / 2.5);
  const path = Array.from({ length: n + 1 }, (_, i) => {
    const s = (length * i) / n;
    return pt(x - facing * s, y + amp * smooth(s / (8 * w)) * Math.sin((TAU * s) / wave - 0.6 * t));
  });
  drawSiphonophoreAlong(ctx, path, t, { ...pose, width: w, side: facing === 1 ? -1 : 1 });
}

/** An Archimedean spiral (radius growing evenly with angle) from r0 to r1 over `turns`, n + 1 points: the coil the ROV filmed. */
export function spiralPath(cx: number, cy: number, r0: number, r1: number, turns: number, n: number): Pt[] {
  const steps = Math.max(2, Math.round(n));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    const a = -Math.PI / 2 + TAU * turns * u;
    const r = r0 + (r1 - r0) * u;
    return pt(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });
}

// ---------------------------------------------------------------- the close-up lens

/** The lens's scale (px per unit over r), the stem's tilt, which unit sits where. */
const LENS_K = 0.036;
const LENS_TILT = -0.2;
const LENS_CENTRE_U = 52;
const LENS_STEM = pt(-0.02, -0.1);
const LENS_CORMIDIA = 4;

function lensPoint(cx: number, cy: number, r: number, q: Pt): Pt {
  const k = r * LENS_K;
  const p = rotated((q.x - LENS_CENTRE_U) * k, q.y * k, LENS_TILT);
  return pt(cx + LENS_STEM.x * r + p.x, cy + LENS_STEM.y * r + p.y);
}

/** Cormidium c's tentacle in the lens (units): hanging nearly straight down, swaying more towards the tip. */
function lensTentacle(c: number, t: number, swaying = true): Pt[] {
  const root = pt(HEAD_LEN + c * SPACING + TENTACLE_ROOT.x, TENTACLE_ROOT.y);
  const sway = (j: number): number => (swaying ? 1 : 0) * (j / 5) ** 1.8 * 2 * Math.sin(t * 1.1 + c * 0.9 - j * 0.6);
  const bow = (j: number): number => 1.6 * Math.sin((j / 5) * Math.PI) * (c % 2 ? 1 : -1) + 0.12 * j * j;
  return spline([0, 1, 2, 3, 4, 5].map((j) => pt(root.x + j * 0.9 + bow(j) + sway(j), root.y + j * 5.6)), 6);
}

/** Screen points to hang the video's labels on: a swimming bell, a stinging tentacle's batteries, a feeding polyp. */
export function zooidPoints(cx: number, cy: number, r: number): { readonly swim: Pt; readonly sting: Pt; readonly eat: Pt } {
  const b7 = bellAt(BELLS - 1);
  const rest = lensTentacle(0, 0, false);
  return {
    swim: lensPoint(cx, cy, r, b7.c),
    sting: lensPoint(cx, cy, r, rest[Math.round(rest.length * 0.6)]!),
    eat: lensPoint(cx, cy, r, pt(HEAD_LEN + SPACING + 5.5, 6.3)),
  };
}

/** Where each kind sits in the lens (units), for the highlight's light. */
function kindSpots(kind: ZooidKind, t: number): Pt[] {
  if (kind === 'swim') return [4, 5, 6, 7].map((i) => bellAt(i).c);
  if (kind === 'eat') return [0, 1, 2].map((c) => pt(HEAD_LEN + c * SPACING + 5.5, 6.3));
  return [0, 1, 2].flatMap((c) => {
    const tn = lensTentacle(c, t);
    return [tn[Math.round(tn.length * 0.45)]!, tn[Math.round(tn.length * 0.8)]!];
  });
}

/** A beaded stinging tentacle (units): a fine strand with coiled batteries along its lower part. */
function paintTentacle(b: Brush, pen: Pen, line: readonly Pt[], alpha: number): void {
  pen.hair(pxs(b, line), b.fine * 1.2, `rgb(${STRAND})`, 0.8 * alpha);
  const dirs = directions(line, pt(0, 1));
  for (let i = Math.round(line.length * 0.3); i < line.length; i += 2 + (i % 3 === 0 ? 1 : 0)) {
    const p = line[i]!;
    const d = dirs[i]!;
    const sz = 0.75 + 0.35 * hash01(i * 3.1);
    const bead = pxs(b, egg(p, 0.8 * sz, 0.5 * sz, Math.atan2(d.y, d.x), 12));
    pen.fill(bead, '#ee7a50', 0.9 * alpha);
    if (b.k > 3) pen.dot((p.x - 0.2) * b.k, (p.y - 0.15) * b.k, b.k * 0.16, SPOT, 0.8 * alpha);
    if (b.inked > 0) pen.stroke(closed(bead), b.line * 0.35, INK, 0.6 * alpha, false);
  }
}

/** Drifting specks of marine snow in the lens. */
function drawSnow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(220,226,230,0.5)';
  for (let i = 0; i < 22; i++) {
    const u = hash01(i * 1.31);
    const v = (hash01(i * 2.77) + t * 0.025 * (0.5 + hash01(i))) % 1;
    const x = cx + (u * 2 - 1) * r;
    const y = cy + (v * 2 - 1) * r + Math.sin(t * 0.7 + i) * r * 0.02;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.8, r * 0.005 * (0.6 + hash01(i * 5.1))), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The magnifier's frame: a dark contour, a pale metal ring with a glint, the handle down to the right. */
function drawLensFrame(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  const rim = Math.max(6, r * 0.075);
  const hx = Math.SQRT1_2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = rim * 2.1;
  ctx.beginPath();
  ctx.moveTo(cx + r * 1.02 * hx, cy + r * 1.02 * hx);
  ctx.lineTo(cx + r * 1.38 * hx, cy + r * 1.38 * hx);
  ctx.stroke();
  ctx.strokeStyle = '#cfc5b0';
  ctx.lineWidth = rim * 1.25;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#d8cfba';
  ctx.lineWidth = rim * 0.45;
  ctx.stroke();
  ctx.strokeStyle = '#fbf5e6';
  ctx.lineWidth = rim * 0.14;
  ctx.beginPath();
  ctx.arc(cx, cy, r - rim * 0.08, Math.PI * 1.02, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();
  penFor(ctx, 8807, boilOf(t), 1).circle(cx, cy, r + rim * 0.5, Math.max(1.5, r * 0.009), INK);
}

/**
 * A magnifier over a short piece of the colony where the head meets the
 * stem: the last swimming bells pulsing, then repeats of the same group, each
 * polyp's beaded tentacle hanging into the dark. `highlight` lights every
 * clone of one kind and dims the rest.
 */
export function drawZooidCloseUp(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, highlight: ZooidKind | null): void {
  if (r <= 0) return;
  const dim = (kind: ZooidKind): number => (highlight === null || highlight === kind ? 1 : 0.55);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  const water = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r * 1.1);
  water.addColorStop(0, '#16293a');
  water.addColorStop(1, '#03060a');
  ctx.fillStyle = water;
  ctx.fill();
  ctx.clip();
  drawSnow(ctx, cx, cy, r, t);
  if (highlight) {
    const dot = glowDot();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 + 0.15 * Math.sin(t * 4);
    for (const q of kindSpots(highlight, t)) {
      const p = lensPoint(cx, cy, r, q);
      const gr = r * (highlight === 'sting' ? 0.12 : 0.2);
      ctx.drawImage(dot, p.x - gr, p.y - gr, 2 * gr, 2 * gr);
    }
    ctx.restore();
  }
  const k = r * LENS_K;
  const boil = boilOf(t);
  const anchor = lensPoint(cx, cy, r, pt(0, 0));
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(LENS_TILT);
  for (let c = 0; c < LENS_CORMIDIA; c++) paintTentacle(makeBrush(ctx, k, 9301 + c * 31 + boil * 977), new Pen(ctx, 9301 + c * 31 + boil * 977, Math.min(1.3, k * 0.14)), lensTentacle(c, t), dim('sting'));
  for (let c = LENS_CORMIDIA - 1; c >= 0; c--) {
    ctx.save();
    ctx.translate((HEAD_LEN + c * SPACING) * k, 0);
    paintCormidium(makeBrush(ctx, k, 7301 + (c % VARIANTS) * 3331 + boil * 977), Math.min(1, 0.35 + dim('eat') * 0.65) * (highlight ? 0.85 : 1), dim('eat'), 0.8 * Math.sin(t * 0.9 + c * 1.3));
    ctx.restore();
  }
  paintHead(makeBrush(ctx, k, 5101 + boil * 977), t * PULSE_HZ, dim('swim'));
  ctx.restore();
  const vignette = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
  drawLensFrame(ctx, cx, cy, r, t);
}

// ---------------------------------------------------------------- the kit preview

const HIGHLIGHTS: readonly (ZooidKind | null)[] = ['swim', 'sting', 'eat', null];

/** Black water lit from above, like the ROV's lamps. */
function drawDark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.45, h * 0.15, 0, w * 0.45, h * 0.3, Math.max(w, h) * 0.8);
  g.addColorStop(0, '#0d1b27');
  g.addColorStop(1, '#020407');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export const KIT: KitEntry = {
  name: 'siphonophore',
  draw: (ctx, w, h, t) => {
    drawDark(ctx, w, h);
    const coil = spiralPath(w * 0.25, h * 0.38, h * 0.045, h * 0.3, 3, 300);
    drawSiphonophoreAlong(ctx, coil, t, { width: Math.max(6, h * 0.009), glow: 0.5 + 0.5 * Math.sin(t * 0.8), reveal: clamp01(t / 4) });
    drawSiphonophore(ctx, w * 0.97, h * 0.88, w * 0.94, 1, t);
    const r = h * 0.3;
    const cx = w * 0.7;
    const cy = h * 0.38;
    const hl = HIGHLIGHTS[Math.floor(t / 1.2) % HIGHLIGHTS.length]!;
    drawZooidCloseUp(ctx, cx, cy, r, t, hl);
    const pts = zooidPoints(cx, cy, r);
    ctx.save();
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 2;
    for (const p of [pts.swim, pts.sting, pts.eat]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },
};
