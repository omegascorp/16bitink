import { makeCanvas, pathOf, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { createRng, type Rng } from '../../../../src/logic/rng';
import { CAPTION_FONT } from '../../captions';
import type { KitEntry } from '../../foodchain/kit';
import { clamp01, lerp, smooth } from '../../short';
import { boilOf, range, rot, spline, trace } from '../../swallowyou/art/ink';
import { RED } from '../../swallowyou/text';

/**
 * The legends behind the sea monsters, as old sea-chart engravings on
 * parchment (the monsters of Olaus Magnus' Carta Marina, 1539, and
 * Pontoppidan's kraken): sepia lines cut with a burin, swelling in the middle
 * and tapering to points, cross-contour hatching that follows each form, the
 * sea as rows of little engraved crests, the sky as ruled hairlines, a ribbon
 * banner with the caption in Caveat. One card per legend:
 *
 *   serpent     a frilled serpent's head rising beside a rowing boat (sec 2)
 *   seaserpent  maned coils humping out of the sea along a ship, "Here be serpents" (sec 4)
 *   mermaid     a mermaid on a rock combing her hair, "1493" (sec 3)
 *   carcass     not an engraving: a faded 1977 press photo of the Zuiyō Maru carcass
 *               on the crane, under a newspaper strip "LIVING PLESIOSAUR?" (sec 6)
 *   kraken      a giant squid's arms wrapping a ship's mast, "1752" (sec 0, 7)
 *   island      sailors on the kraken's back, which they take for an island; it opens an eye, "1752"
 *   essex       a sperm whale's head smashing into a whaler's bow, "1820" (sec 0, 8)
 *   blue        the blue whale (the map's drawing; its card is a plain engraving)
 *
 * The engraving is drawn in "picture units" (PW x PH, 3:2) and cover-cropped
 * into the card's frame, so a card can be any shape; the parchment, frame,
 * banner and stamp are laid out on the card itself. The still parts are baked
 * once per line-boil frame in prepare() (white where a figure hides what's
 * behind it, so the picture multiplies onto the parchment); what moves (a
 * serpent rising, the whale ramming, the eye opening, foam) is drawn live.
 * About 200 MB of canvases (most of it the 3:2 backgrounds, three boil frames each at 1500 x 1000).
 *
 * The monster map is an old chart (coastlines with water-lining, a compass
 * rose, a portolan web of rhumb lines) that collects a little engraving per
 * legend, each with its own REAL stamp.
 */

export type Legend = 'serpent' | 'seaserpent' | 'mermaid' | 'carcass' | 'kraken' | 'island' | 'essex' | 'blue';
/** The legend cards, in the video's order. */
export const LEGENDS: readonly Legend[] = ['kraken', 'island', 'essex', 'serpent', 'mermaid', 'seaserpent', 'carcass'];
/** The drawings on the monster map. */
export const MAP_LEGENDS: readonly Legend[] = ['serpent', 'mermaid', 'seaserpent', 'carcass', 'kraken', 'essex', 'blue'];
/** The caption on each card's banner ('' for none). */
export const CAPTIONS: Readonly<Record<Legend, string>> = {
  serpent: 'Sea serpent', seaserpent: 'Here be serpents', mermaid: '1493', carcass: '1977', kraken: '1752', island: '1752', essex: '1820', blue: '',
};
/** The cards are composed at 3:2; other shapes crop the picture (never the frame or caption). */
export const LEGEND_ASPECT = 1.5;
/** The monster map's sheet, width over height; it's fitted inside the box it's given. */
export const MAP_ASPECT = 1.4;

export interface LegendLook {
  readonly alpha?: number;
  /** 0..1: the card rips down the middle and the halves pull apart (and fade), showing what's behind. */
  readonly tear?: number;
  /** 0..1: the red REAL stamp thumps on (down from 1.6x, slightly turned). */
  readonly stamp?: number;
  /** island: 0 shut .. 1 the kraken's eye wide open. */
  readonly eye?: number;
  /** essex: 0 the whale coming .. 0.7 contact .. 1 the bow stove in, splinters flying (default 1). */
  readonly impact?: number;
  /** serpent, seaserpent, kraken: 0 under the sea .. 1 risen (default 1). */
  readonly rise?: number;
}

// ---------------------------------------------------------------- constants

const SEPIA = '#3a2412';
const RHUMB_RED = '#a1372a';
const PW = 1200;
const PH = 800;
/** Cache pixels per picture unit: crisp up to a card about 1500 px wide. */
const RES = 1.25;
/** Towards the light, up and to the left. */
const LIGHT: Pt = { x: -0.5, y: -0.866 };
const FULL: Box = { x: 0, y: 0, w: PW, h: PH };

interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

const P = (x: number, y: number): Pt => ({ x, y });
const pts = (flat: readonly number[]): Pt[] => Array.from({ length: flat.length / 2 }, (_, i) => P(flat[2 * i]!, flat[2 * i + 1]!));
const add = (a: Pt, b: Pt, k = 1): Pt => P(a.x + b.x * k, a.y + b.y * k);
const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 28, a0 = 0, a1 = Math.PI * 2): Pt[] =>
  range(n, (u) => P(cx + rx * Math.cos(a0 + (a1 - a0) * u), cy + ry * Math.sin(a0 + (a1 - a0) * u)));

/** Points spread evenly along a short polyline (so a two-point line can still taper). */
function resample(src: readonly Pt[], n: number): Pt[] {
  const segs = src.length - 1;
  return range(n - 1, (u) => {
    const f = u * segs;
    const i = Math.min(segs - 1, Math.floor(f));
    const a = src[i]!;
    const b = src[i + 1]!;
    return P(lerp(a.x, b.x, f - i), lerp(a.y, b.y, f - i));
  });
}

/** A polyline resampled to points about `step` apart along it. */
function even(src: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [src[0]!];
  let carry = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1]!;
    const c = src[i]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    let d = step - carry;
    while (d <= len) {
      out.push(P(lerp(a.x, c.x, d / len), lerp(a.y, c.y, d / len)));
      d += step;
    }
    carry = len - (d - step);
  }
  const last = src[src.length - 1]!;
  if (Math.hypot(last.x - out[out.length - 1]!.x, last.y - out[out.length - 1]!.y) > step * 0.3) out.push(last);
  return out;
}

// ---------------------------------------------------------------- the burin

/**
 * An engraver's burin: every line a ribbon that swells in the middle and
 * tapers to points, wobbling a little (a different seed per boil frame).
 * Widths and gaps are in page px; `in(k)` keeps them so under a scale of k.
 */
class Burin {
  constructor(
    readonly ctx: CanvasRenderingContext2D, private readonly rng: Rng,
    readonly wobble = 0.5, readonly px = 1, readonly weight = 1, readonly gapMul = 1,
  ) {}

  static make(ctx: CanvasRenderingContext2D, seed: number, weight = 1, gapMul = 1): Burin {
    return new Burin(ctx, createRng(seed), 0.5, 1, weight, gapMul);
  }

  in(k: number): Burin {
    return new Burin(this.ctx, this.rng, this.wobble, this.px / k, this.weight, this.gapMul);
  }

  r(): number {
    return this.rng();
  }

  j(a = this.wobble): number {
    return (this.rng() - 0.5) * 2 * a * this.px;
  }

  gap(spacing: number): number {
    return spacing * this.gapMul * this.px;
  }

  /** One cut: taper 1 swells and points both ends, 0 keeps an even width. */
  line(src: readonly Pt[], width: number, alpha = 1, taper = 1): void {
    if (src.length < 2 || alpha <= 0) return;
    const pa = this.rng() * 6.3;
    const pb = this.rng() * 6.3;
    const amp = this.wobble * this.px;
    const p = (src.length < 5 ? resample(src, 6) : src).map((q, i) => P(q.x + amp * Math.sin(i * 0.37 + pa), q.y + amp * Math.sin(i * 0.29 + pb)));
    const page = width * this.weight;
    const w = page * this.px;
    const { ctx } = this;
    ctx.globalAlpha = Math.min(1, alpha);
    if (page < 1.1) {
      ctx.strokeStyle = SEPIA;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      trace(ctx, p, false);
      ctx.stroke();
    } else {
      const n = p.length;
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = p[Math.max(0, i - 1)]!;
        const c = p[Math.min(n - 1, i + 1)]!;
        const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
        const nx = -(c.y - a.y) / len;
        const ny = (c.x - a.x) / len;
        const hw = (w / 2) * (1 - taper + taper * (0.12 + 0.88 * Math.sqrt(Math.sin((Math.PI * i) / (n - 1)))));
        left.push(P(p[i]!.x + nx * hw, p[i]!.y + ny * hw));
        right.push(P(p[i]!.x - nx * hw, p[i]!.y - ny * hw));
      }
      ctx.fillStyle = SEPIA;
      trace(ctx, [...left, ...right.reverse()]);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** A closed contour. */
  ring(src: readonly Pt[], width: number, alpha = 1): void {
    this.line([...src, src[0]!], width, alpha, 0.35);
  }

  /** Paper over whatever is behind (white multiplies to nothing on the parchment). */
  white(src: readonly Pt[]): void {
    this.ctx.fillStyle = '#ffffff';
    trace(this.ctx, src);
    this.ctx.fill();
  }

  tone(src: readonly Pt[], alpha: number): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = SEPIA;
    trace(this.ctx, src);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  dot(x: number, y: number, r: number, alpha = 1): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = SEPIA;
    this.ctx.beginPath();
    this.ctx.arc(x + this.j(), y + this.j(), Math.max(0.3 * this.px, r * this.weight * this.px), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }

  clipped(clip: readonly Pt[], draw: () => void): void {
    this.ctx.save();
    pathOf(this.ctx, clip);
    this.ctx.clip();
    draw();
    this.ctx.restore();
  }

  /** Parallel straight hatching inside a shape. */
  hatch(clip: readonly Pt[], spacing: number, angle: number, width: number, alpha = 0.8): void {
    const xs = clip.map((p) => p.x);
    const ys = clip.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 4;
    const d = P(Math.cos(angle), Math.sin(angle));
    const n = P(-d.y, d.x);
    const sp = this.gap(spacing);
    this.clipped(clip, () => {
      for (let off = -span / 2; off < span / 2; off += sp * (0.85 + 0.3 * this.r())) {
        const o = add(P(cx, cy), n, off);
        this.line([add(o, d, -span / 2), o, add(o, d, span / 2)], width, alpha, 0.25);
      }
    });
  }

  /** Engraved stipple, denser where `density` (0..1) is high. */
  stipple(clip: readonly Pt[], count: number, r: number, alpha: number, density: (p: Pt) => number = () => 1): void {
    const xs = clip.map((p) => p.x);
    const ys = clip.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    this.clipped(clip, () => {
      for (let i = 0; i < count / this.gapMul; i++) {
        const p = P(x0 + this.r() * (x1 - x0), y0 + this.r() * (y1 - y0));
        if (this.r() < density(p)) this.dot(p.x, p.y, r * (0.6 + 0.7 * this.r()), alpha);
      }
    });
  }
}

// ---------------------------------------------------------------- forms

interface TubeOpts {
  /** Contour width. */
  readonly ink?: number;
  /** Cross-contour hatching: spacing (px) and line width. */
  readonly hatch?: number;
  readonly weight?: number;
  /** Lengthwise lines on the shadowed side (offsets 0..1 across the radius). */
  readonly long?: readonly number[];
  /** Suckers along one side (+1 / -1 of the spine's normal). */
  readonly suckers?: number;
  /** Spines along one side. */
  readonly spikes?: number;
  /** Rows of little scale arcs on the lit side. */
  readonly scales?: number;
  /** Close the ends with a line (default: when they're wider than 2 px). */
  readonly caps?: boolean;
}

const tangents = (spine: readonly Pt[]): Pt[] =>
  spine.map((_, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const c = spine[Math.min(spine.length - 1, i + 1)]!;
    const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    return P((c.x - a.x) / len, (c.y - a.y) / len);
  });

/** A round body along a spine (an arm, a neck, a tail), hatched across its curve on the side away from the light. */
function tube(b: Burin, spineIn: readonly Pt[], rad: (u: number) => number, o: TubeOpts = {}): Pt[] {
  const spine = even(spineIn, 2.5 * b.px);
  const n = spine.length;
  const tan = tangents(spine);
  const nrm = tan.map((t) => P(-t.y, t.x));
  const r = spine.map((_, i) => rad(i / (n - 1)));
  const left = spine.map((p, i) => add(p, nrm[i]!, r[i]!));
  const right = spine.map((p, i) => add(p, nrm[i]!, -r[i]!));
  const outline = [...left, ...[...right].reverse()];
  b.white(outline);
  const shade = (i: number): number => (nrm[i]!.x * LIGHT.x + nrm[i]!.y * LIGHT.y < 0 ? 1 : -1);
  const sp = o.hatch ?? 0;
  if (sp > 0) {
    let next = 0;
    let acc = 0;
    for (let i = 1; i < n - 1; i++) {
      acc += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y);
      if (acc < next) continue;
      next = acc + b.gap(sp) * (0.85 + 0.3 * b.r());
      const d = P(nrm[i]!.x * shade(i), nrm[i]!.y * shade(i));
      const f = Math.min(1, -(d.x * LIGHT.x + d.y * LIGHT.y) + 0.25);
      const s0 = lerp(0.35, -0.4, f);
      const line = range(6, (u) => {
        const s = lerp(s0, 1, u);
        return add(add(spine[i]!, d, r[i]! * s), tan[i]!, r[i]! * 0.22 * Math.sqrt(Math.max(0, 1 - s * s)));
      });
      b.line(line, (o.weight ?? 0.9) * (0.6 + 0.6 * f), 0.85, 1);
    }
  }
  for (const s of o.long ?? []) {
    let run: Pt[] = [];
    let side = shade(0);
    const flush = (): void => {
      if (run.length > 3) b.line(run, (o.weight ?? 0.9) * 0.7, 0.6, 1);
      run = [];
    };
    for (let i = 0; i < n; i++) {
      if (shade(i) !== side) {
        flush();
        side = shade(i);
      }
      run.push(add(spine[i]!, nrm[i]!, r[i]! * s * side));
    }
    flush();
  }
  if (o.scales) tubeScales(b, spine, tan, nrm, r, shade, o.scales);
  if (o.suckers) suckers(b, spine, tan, nrm, r, o.suckers);
  if (o.spikes) spikes(b, spine, nrm, r, o.spikes);
  const ink = o.ink ?? 2.4;
  b.line(left, ink, 1, 0.3);
  b.line(right, ink, 1, 0.3);
  if ((o.caps ?? true) && r[n - 1]! > 2) b.line([left[n - 1]!, right[n - 1]!], ink * 0.8, 1, 0.3);
  return outline;
}

function tubeScales(b: Burin, spine: readonly Pt[], tan: readonly Pt[], nrm: readonly Pt[], r: readonly number[], shade: (i: number) => number, every: number): void {
  let acc = 0;
  let next = 0;
  let row = 0;
  for (let i = 1; i < spine.length - 1; i++) {
    acc += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y);
    if (acc < next) continue;
    next = acc + b.gap(every);
    row++;
    for (let s = -0.85 + (row % 2) * 0.12; s < 0.45; s += 0.24) {
      const c = add(spine[i]!, nrm[i]!, -r[i]! * s * shade(i));
      const k = b.gap(every) * 0.5;
      const arc = range(4, (u) => add(add(c, nrm[i]!, k * (u * 2 - 1)), tan[i]!, -k * 0.7 * Math.sin(Math.PI * u)));
      b.line(arc, 0.6, 0.55, 1);
    }
  }
}

function suckers(b: Burin, spine: readonly Pt[], tan: readonly Pt[], nrm: readonly Pt[], r: readonly number[], side: number): void {
  let acc = 0;
  let next = 0;
  for (let i = 1; i < spine.length - 1; i++) {
    acc += Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y);
    if (acc < next || r[i]! < 2.5) continue;
    next = acc + r[i]! * 1.25;
    const c = add(spine[i]!, nrm[i]!, side * r[i]! * 0.62);
    const rx = r[i]! * 0.36;
    const ry = r[i]! * 0.24;
    const ring = range(14, (u) => add(add(c, tan[i]!, rx * Math.cos(u * Math.PI * 2)), nrm[i]!, ry * Math.sin(u * Math.PI * 2)));
    b.white(ring);
    b.ring(ring.slice(0, -1), 0.9, 0.95);
    b.dot(c.x, c.y, Math.max(0.5, ry * 0.35), 0.8);
  }
}

function spikes(b: Burin, spine: readonly Pt[], nrm: readonly Pt[], r: readonly number[], side: number): void {
  for (let i = 3; i < spine.length - 3; i += Math.max(3, Math.round((r[i]! * 1.1) / Math.max(0.5, Math.hypot(spine[i]!.x - spine[i - 1]!.x, spine[i]!.y - spine[i - 1]!.y))))) {
    const a = add(spine[i - 2]!, nrm[i - 2]!, side * r[i - 2]! * 0.92);
    const c = add(spine[i + 1]!, nrm[i + 1]!, side * r[i + 1]! * 0.92);
    const tip = add(add(spine[i]!, nrm[i]!, side * r[i]! * 1.55), P(a.x - c.x, a.y - c.y), 0.6);
    b.white([a, tip, c]);
    b.line([a, tip, c], 1.1, 1, 0.3);
    b.line([add(a, P(c.x - a.x, c.y - a.y), 0.5), tip], 0.6, 0.6, 1);
  }
}

/** Rows of little engraved crests: the sea of an old chart, finer and denser towards the horizon. */
function sea(b: Burin, x0: number, x1: number, y0: number, y1: number, rough = 1): void {
  let y = y0 + 2;
  while (y < y1) {
    const v = (y - y0) / (y1 - y0);
    const len0 = lerp(14, 70, v) * rough;
    const amp = len0 * lerp(0.07, 0.15, v) * Math.sqrt(rough);
    const w = lerp(0.7, 1.8, v);
    let x = x0 - b.r() * len0;
    if (v < 0.1) {
      while (x < x1) {
        const len = 40 + b.r() * 160;
        b.line([P(x, y), P(x + len / 2, y + b.j(0.4)), P(x + len, y)], 0.6, 0.55, 0.6);
        x += len + 4 + b.r() * 18;
      }
    } else {
      while (x < x1) {
        const len = len0 * (0.7 + 0.5 * b.r());
        b.line(range(7, (u) => P(x + u * len, y - amp * Math.pow(Math.sin(Math.PI * u), 1.3))), w, 0.9, 1);
        if (v > 0.3) {
          b.line(range(4, (u) => P(x + len * (0.45 + 0.5 * u), y + amp * 0.5 - amp * 0.35 * Math.sin(Math.PI * u))), w * 0.55, 0.7, 1);
        }
        if (v > 0.55 && b.r() < 0.6) {
          b.line(range(4, (u) => P(x + len * (0.55 + 0.4 * u), y + amp * 1.1 - amp * 0.25 * Math.sin(Math.PI * u))), w * 0.45, 0.6, 1);
        }
        x += len * (1.1 + 0.5 * b.r());
      }
      if (v > 0.4) {
        for (let fx = x0 - b.r() * 60; fx < x1; ) {
          const len = 30 + b.r() * 90;
          b.line([P(fx, y + amp * 1.5), P(fx + len / 2, y + amp * 1.5 + b.j(0.6)), P(fx + len, y + amp * 1.5)], 0.55, 0.45, 0.6);
          fx += len + 10 + b.r() * 40;
        }
      }
    }
    y += lerp(4.5, 19, v) * (0.9 + 0.2 * b.r());
  }
}

interface Cloud { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** The engraved sky: ruled hairlines, darker high up, broken by scalloped clouds. */
function sky(b: Burin, x0: number, x1: number, y0: number, y1: number, clouds: readonly Cloud[], dark = 0): void {
  for (let y = y0 + 3; y < y1 - 3; y += lerp(4, 6.5, (y - y0) / (y1 - y0))) {
    const v = (y - y0) / (y1 - y0);
    const alpha = lerp(0.8, 0.12, v) + dark * 0.25;
    let x = x0 - b.r() * 40;
    while (x < x1) {
      const len = 90 + b.r() * 300;
      b.line(range(Math.ceil(len / 45), (u) => P(x + u * len, y + Math.sin((x + u * len) * 0.012 + y) * 0.5)), 0.7 + dark * 0.3, alpha, 0.5);
      x += len + 3 + b.r() * 12;
    }
  }
  for (const c of clouds) cloud(b, c);
}

function cloud(b: Burin, c: Cloud): void {
  const n = Math.max(3, Math.round(c.w / (c.h * 0.8)));
  const bumps = Array.from({ length: n }, (_, i) => ({
    cx: c.x - c.w / 2 + ((i + 0.5) * c.w) / n + (b.r() - 0.5) * c.w * 0.05,
    rx: (c.w / n) * 0.72,
    ry: c.h * (0.45 + 0.55 * Math.sin((Math.PI * (i + 0.5)) / n)) * (0.8 + 0.35 * b.r()),
  }));
  const heightAt = (x: number): number => bumps.reduce((y, m) => {
    const dx = (x - m.cx) / m.rx;
    return Math.abs(dx) < 1 ? Math.min(y, c.y - m.ry * Math.sqrt(1 - dx * dx)) : y;
  }, c.y);
  const top = range(64, (u) => P(c.x - c.w / 2 + u * c.w, heightAt(c.x - c.w / 2 + u * c.w)));
  const outline = [...top, P(c.x + c.w / 2, c.y + c.h * 0.06), P(c.x, c.y + c.h * 0.14), P(c.x - c.w / 2, c.y + c.h * 0.06)];
  b.white(outline);
  b.clipped(outline, () => {
    for (const m of bumps) {
      for (let k = 0; k < 5; k++) {
        const s = 0.92 - k * 0.12;
        b.line(range(8, (u) => {
          const a = lerp(0.05, 0.75, u) * Math.PI;
          return P(m.cx + Math.cos(a) * m.rx * s, c.y - m.ry * 0.15 + Math.sin(a) * m.ry * s * 0.6 - m.ry * 0.35);
        }), 0.6, 0.45 - k * 0.06, 1);
      }
    }
    for (let y = c.y - c.h * 0.12; y < c.y + c.h * 0.2; y += b.gap(2.8)) b.line([P(c.x - c.w / 2, y), P(c.x + c.w / 2, y)], 0.55, 0.5, 0.2);
  });
  b.line(top.filter((p) => p.y < c.y - 0.5), 1.4, 0.95, 0.4);
  bumps.slice(1).forEach((m) => {
    const x0 = m.cx - m.rx * 0.98;
    b.line(range(6, (u) => P(x0 + u * m.rx * 0.5, heightAt(x0) + u * m.ry * 0.5 + Math.sin(u * Math.PI) * 2)), 0.8, 0.6, 1);
  });
}

/** Broken water where something meets the sea: scalloped crests, a curl at each end, ripples and spray. */
function foam(b: Burin, cx: number, cy: number, w: number): void {
  const h = Math.min(w * 0.12, 10);
  b.white(ellipsePts(cx, cy + h * 0.3, w * 0.5, h, 26));
  const n = Math.max(3, Math.round(w / 15));
  for (let i = 0; i < n; i++) {
    const x = cx - w / 2 + ((i + 0.5) * w) / n + (b.r() - 0.5) * 4;
    const r = (w / n) * (0.55 + 0.25 * b.r());
    const lift = Math.min(1, (1 - Math.abs((i + 0.5) / n - 0.5) * 2) * 1.6 + 0.3);
    b.line(range(7, (u) => P(x - r + 2 * r * u, cy - Math.sin(Math.PI * u) * r * 0.7 * lift)), 1.1, 0.95, 1);
    if (i % 2 === 0) b.line(range(5, (u) => P(x + r * 0.2 + Math.sin(u * 3) * r * 0.5, cy - r * 0.7 * lift + (1 - Math.cos(u * 3)) * r * 0.3)), 0.7, 0.8, 1);
  }
  for (const side of [-1, 1]) {
    b.line(range(10, (u) => {
      const a = u * 4.4;
      const rr = Math.min(w * 0.08, 14) * (1 - u * 0.6);
      return P(cx + side * (w * 0.5 + rr * Math.sin(a)), cy - rr * (1 - Math.cos(a)));
    }), 1.1, 0.9, 1);
  }
  for (let k = 1; k <= 2; k++) {
    b.line(range(Math.max(8, Math.round(w / 20)), (u) => P(cx - w * (0.5 + 0.08 * k) + u * w * (1 + 0.16 * k), cy + h * 0.6 + k * 4 + Math.sin(u * w * 0.08) * 1)), 0.7, 0.55, 1);
  }
  for (let i = 0; i < Math.min(14, 3 + w / 30); i++) b.dot(cx + (b.r() - 0.5) * w * 0.8, cy - 6 - b.r() * Math.min(26, w * 0.12), 0.7 + b.r() * 0.9, 0.8);
}

/** A rock, cragged and cross-hatched on its shadowed side. */
function rock(b: Burin, outline: readonly Pt[]): void {
  b.white(outline);
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const top = Math.min(...ys);
  const w = Math.max(...xs) - Math.min(...xs);
  b.clipped(outline, () => {
    b.hatch(outline.map((p) => P(p.x + w * 0.2, p.y + 18)), 3.2, 1.2, 0.8, 0.7);
    b.hatch(outline.map((p) => P(p.x + w * 0.45, p.y + 40)), 3.4, -0.5, 0.7, 0.6);
    for (let i = 0; i < 9; i++) {
      const x = cx + (b.r() - 0.5) * w * 0.8;
      const y = top + 14 + b.r() * 60;
      b.line([P(x, y), P(x + 8 + b.r() * 14, y + 10 + b.r() * 20), P(x + 4 + b.r() * 20, y + 30 + b.r() * 26)], 1.1, 0.85, 1);
    }
  });
  b.ring(outline, 2.1);
}

/** A little sailor standing: a frock coat hatched dark, breeches, a tricorn; arms at angles from hanging down. */
function figure(b: Burin, x: number, y: number, h: number, armL = 0.3, armR = -0.3): void {
  const sh = y - h * 0.8;
  for (const s of [-1, 1]) {
    const leg = [P(x + s * h * 0.025, y - h * 0.36), P(x + s * h * 0.105, y - h * 0.36), P(x + s * h * 0.095, y - h * 0.02), P(x + s * h * 0.045, y - h * 0.02)];
    b.white(leg);
    b.hatch(leg, 1.6, 0.2, 0.5, 0.8);
    b.ring(leg, 0.8);
    b.tone(ellipsePts(x + s * h * 0.08, y - h * 0.01, h * 0.055, h * 0.022, 8), 1);
  }
  const coat = spline(pts([x - h * 0.13, sh, x + h * 0.13, sh, x + h * 0.11, y - h * 0.56, x + h * 0.17, y - h * 0.3, x - h * 0.17, y - h * 0.3, x - h * 0.11, y - h * 0.56]), 3, true);
  b.white(coat);
  b.hatch(coat, 1.5, 1.35, 0.55, 0.85);
  b.clipped(coat, () => b.hatch([P(x, sh - 4), P(x + h, sh - 4), P(x + h, y), P(x, y)], 1.6, 0.4, 0.5, 0.8));
  b.ring(coat, 1);
  b.line([P(x, sh + h * 0.04), P(x, y - h * 0.31)], 0.6, 0.9, 0);
  for (const [s, a] of [[-1, armL], [1, armR]] as const) {
    const from = P(x + s * h * 0.12, sh + h * 0.03);
    const hand = P(from.x + Math.sin(a) * h * 0.34 * s, from.y + Math.cos(a) * h * 0.34);
    b.line([from, P(lerp(from.x, hand.x, 0.5) + s * h * 0.02, lerp(from.y, hand.y, 0.5)), hand], h * 0.065, 1, 0.15);
    b.dot(hand.x, hand.y, h * 0.03, 1);
  }
  const head = ellipsePts(x, y - h * 0.885, h * 0.072, h * 0.082, 14);
  b.white(head);
  b.ring(head.slice(0, -1), 0.9);
  b.clipped(head, () => b.hatch(head.map((p) => P(p.x + h * 0.05, p.y)), 1.4, 1.2, 0.4, 0.7));
  const hat = spline(pts([x - h * 0.15, y - h * 0.93, x - h * 0.06, y - h * 1.02, x, y - h * 1.06, x + h * 0.06, y - h * 1.02, x + h * 0.15, y - h * 0.93, x, y - h * 0.96]), 3, true);
  b.white(hat);
  b.tone(hat, 0.85);
  b.ring(hat, 0.9);
}

/** A rower sitting with his back to the bow, leaning into the stroke, hands on the loom. */
function rower(b: Burin, x: number, y: number, h: number): void {
  const torso = spline(pts([x - h * 0.08, y, x - h * 0.2, y - h * 0.5, x - h * 0.02, y - h * 0.55, x + h * 0.1, y]), 3, true);
  b.white(torso);
  b.hatch(torso, 1.5, 1.3, 0.5, 0.85);
  b.ring(torso, 0.9);
  b.line([P(x - h * 0.08, y - h * 0.48), P(x + h * 0.12, y - h * 0.3), P(x + h * 0.26, y - h * 0.26)], h * 0.07, 1, 0.15);
  const head = ellipsePts(x - h * 0.14, y - h * 0.66, h * 0.08, h * 0.09, 12);
  b.white(head);
  b.ring(head.slice(0, -1), 0.8);
  b.tone([P(x - h * 0.26, y - h * 0.7), P(x - h * 0.14, y - h * 0.8), P(x - h * 0.02, y - h * 0.7), P(x - h * 0.14, y - h * 0.73)], 0.9);
}

/** A ribbon banner with swallow-tailed ends and the caption in Caveat. */
function banner(b: Burin, text: string, cx: number, cy: number, size: number): void {
  if (!text) return;
  const { ctx } = b;
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const tw = ctx.measureText(text).width;
  const bw = tw + size * 1.3;
  const bh = size * 1.05;
  const arch = size * 0.12;
  for (const s of [-1, 1]) {
    const ex = cx + s * bw * 0.5;
    const tail = [P(ex - s * size * 0.35, cy - bh * 0.22), P(ex + s * size * 0.95, cy - bh * 0.1), P(ex + s * size * 0.6, cy + bh * 0.36), P(ex + s * size * 1.0, cy + bh * 0.84), P(ex - s * size * 0.35, cy + bh * 0.74)];
    b.white(tail);
    b.hatch(tail, 2.6, s > 0 ? 1.1 : 2.0, 0.7, 0.75);
    b.ring(tail, 1.4);
    const fold = [P(ex - s * size * 0.02, cy + bh * 0.5 - arch * 0.2), P(ex - s * size * 0.35, cy + bh * 0.74), P(ex - s * size * 0.02, cy + bh * 0.72)];
    b.tone(fold, 0.85);
  }
  const top = range(16, (u) => P(cx - bw / 2 + u * bw, cy - bh / 2 - arch * Math.sin(Math.PI * u)));
  const bottom = range(16, (u) => P(cx + bw / 2 - u * bw, cy + bh / 2 - arch * Math.sin(Math.PI * u)));
  const band = [...top, ...bottom];
  b.white(band);
  b.line(top, 1.6, 1, 0.2);
  b.line(bottom, 1.6, 1, 0.2);
  b.line(top.map((p) => P(p.x, p.y + size * 0.1)), 0.6, 0.6, 0.2);
  b.line(bottom.map((p) => P(p.x, p.y - size * 0.1)), 0.6, 0.6, 0.2);
  b.line([top[0]!, bottom[16]!], 1.4, 1, 0.2);
  b.line([top[16]!, bottom[0]!], 1.4, 1, 0.2);
  ctx.fillStyle = SEPIA;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy - arch * 0.8 + size * 0.02);
}

// ---------------------------------------------------------------- ships

interface ShipLook {
  readonly facing?: 1 | -1;
  readonly whaler?: boolean;
  readonly flags?: boolean;
  /** Sails furled on the yards against a storm (bare masts), one topsail torn loose. */
  readonly furled?: boolean;
}

/** The hull's top line, stern (left) to bow, in ship units: hull from x -104 to 104, the waterline at y 0. */
const SHEER = spline(pts([-104, -54, -88, -54, -72, -50, -64, -38, -30, -32, 10, -31, 50, -32, 68, -38, 84, -44, 100, -48]), 4);
const HULL = [...SHEER, ...spline(pts([100, -48, 104, -36, 102, -20, 94, -6, 84, 6, 40, 16, -40, 16, -88, 10, -98, -10, -106, -34, -104, -54]), 3).slice(1)];
const MASTS = [
  { x: -60, top: -160, sz: 0.72, mizzen: true },
  { x: -2, top: -218, sz: 1, mizzen: false },
  { x: 52, top: -198, sz: 0.9, mizzen: false },
] as const;

/** A three-masted ship side on: `s` px from the middle to the bow, its waterline at (x, y), heeled `heel` radians. */
function ship(b: Burin, x: number, y: number, s: number, heel: number, o: ShipLook = {}): void {
  const k = s / 100;
  const { ctx } = b;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heel);
  ctx.scale((o.facing ?? 1) * k, k);
  const q = b.in(k);
  shipSpars(q);
  if (o.furled) for (const m of MASTS) furledSails(q, m.x, m.sz, m.mizzen);
  else {
    for (const m of MASTS) (m.mizzen ? spanker : squareSails)(q, m.x, m.sz);
    jib(q);
  }
  shipRigging(q);
  if (o.flags ?? true) for (const m of MASTS) pennant(q, m.x, m.top);
  shipHull(q, o);
  ctx.restore();
}

function shipSpars(q: Burin): void {
  for (const m of MASTS) {
    const mast = [P(m.x - 2.2, -30), P(m.x - 1.4, m.top), P(m.x + 1.4, m.top), P(m.x + 2.2, -30)];
    q.white(mast);
    q.line([mast[0]!, mast[1]!], 1, 1, 0.1);
    q.line([mast[3]!, mast[2]!], 1.4, 1, 0.1);
    const topY = -30 + (m.top + 30) * 0.5;
    q.line([P(m.x - 9 * m.sz, topY), P(m.x + 9 * m.sz, topY)], 2.2, 1, 0.1);
  }
  q.line([P(98, -47), P(152, -74)], 3, 1, 0.6);
}

function sail(q: Burin, cx: number, top: number, foot: number, hw: number): void {
  const belly = (foot - top) * 0.16;
  const left = range(8, (u) => P(cx - hw * lerp(1, 0.9, u) - belly * 0.5 * Math.sin(Math.PI * u), lerp(top, foot, u)));
  const bottom = range(10, (u) => P(cx - hw * 0.9 + u * hw * 1.8, foot + belly * Math.sin(Math.PI * u)));
  const right = range(8, (u) => P(cx + hw * lerp(0.9, 1, u) + belly * 0.5 * Math.sin(Math.PI * u), lerp(foot, top, u)));
  const outline = [...left, ...bottom, ...right];
  q.white(outline);
  q.clipped(outline, () => {
    for (let s = 0.05; s < 1; s += q.gap(4.2) / hw) {
      const dark = clamp01((s - 0.3) / 0.7);
      if (dark <= 0 && s > 0.12) continue;
      q.line(range(6, (u) => P(cx - hw + s * hw * 2 + (s - 0.5) * belly * 1.2 * Math.sin(Math.PI * u), lerp(top + 1, foot + belly * Math.sin(Math.PI * s), u))), 0.5 + 0.5 * dark, 0.3 + 0.6 * dark, 1);
    }
    for (let s = 0.25; s < 0.8; s += 0.27) q.line([P(cx - hw + s * hw * 2, top + 2), P(cx - hw + s * hw * 2 + 3, foot + belly * 0.8)], 0.7, 0.5, 1);
  });
  q.ring(outline, 1.4);
  q.line([P(cx - hw - 6, top), P(cx, top - 1.5), P(cx + hw + 6, top)], 2.4, 1, 0.8);
  for (let x = cx - hw + 5; x < cx + hw - 3; x += 7) q.line([P(x, top + 4), P(x, top + 7)], 0.6, 0.6, 0);
}

function squareSails(q: Burin, mx: number, sz: number): void {
  const at = (v: number): number => -30 + v * sz;
  sail(q, mx, at(-62), at(-14), 46 * sz);
  sail(q, mx, at(-118), at(-66), 37 * sz);
  sail(q, mx, at(-162), at(-122), 27 * sz);
}

function furledSails(q: Burin, mx: number, sz: number, mizzen: boolean): void {
  const at = (v: number): number => -30 + v * sz;
  const yards = mizzen ? [[-100, 34], [-126, 24]] : [[-62, 48], [-118, 39], [-162, 29]];
  yards.forEach(([y, hw], i) => {
    const top = at(y!);
    const roll = [...range(10, (u) => P(mx - hw! + u * hw! * 2, top + 1)), ...range(10, (u) => P(mx + hw! * 0.95 - u * hw! * 1.9, top + 5.5 + Math.sin(u * Math.PI * 7) * 0.8))];
    q.white(roll);
    q.hatch(roll, 1.8, 1.4, 0.5, 0.75);
    q.ring(roll, 1.1);
    for (let x = mx - hw! + 6; x < mx + hw! - 4; x += 9) q.line([P(x, top), P(x + 1, top + 6)], 0.7, 1, 0);
    q.line([P(mx - hw! - 6, top), P(mx, top - 1.5), P(mx + hw! + 6, top)], 2.4, 1, 0.8);
    if (mx > 40 && i === 1) tornSail(q, mx - hw!, top);
  });
  if (mizzen) q.line([P(mx, -42), P(mx - 66, -42)], 2, 1, 0.5);
}

/** A sail torn loose from its yard, flogging away downwind. */
function tornSail(q: Burin, x: number, y: number): void {
  const flap = spline(pts([x + 4, y, x - 22, y + 4, x - 42, y + 1, x - 50, y + 9, x - 38, y + 16, x - 44, y + 25, x - 26, y + 22, x - 14, y + 30, x - 2, y + 20]), 3, true);
  q.white(flap);
  q.hatch(flap, 2.6, 0.4, 0.6, 0.6);
  q.ring(flap, 1.2);
}

function spanker(q: Burin, mx: number, sz: number): void {
  const outline = [P(mx - 2, -40), P(mx - 2, -30 - 100 * sz), P(mx - 48, -30 - 116 * sz), P(mx - 60, -42)];
  q.white(outline);
  q.hatch(outline, 4, 1.45, 0.6, 0.55);
  q.ring(outline, 1.3);
  q.line([P(mx, -30 - 100 * sz), P(mx - 52, -30 - 118 * sz)], 2, 1, 0.5);
  q.line([P(mx, -42), P(mx - 66, -42)], 2, 1, 0.5);
  sail(q, mx, -30 - 126 * sz, -30 - 104 * sz, 22 * sz);
}

function jib(q: Burin): void {
  const outline = [P(148, -72), P(56, -168), P(98, -54)];
  q.white(outline);
  q.hatch(outline, 4.5, -0.9, 0.6, 0.5);
  q.ring(outline, 1.3);
  const fore = [P(124, -61), P(56, -138), P(84, -50)];
  q.white(fore);
  q.ring(fore, 1.1);
}

function shipRigging(q: Burin): void {
  for (const m of MASTS) {
    const at = -30 + (m.top + 30) * 0.5;
    for (let i = 0; i < 4; i++) q.line([P(m.x, at), P(m.x - 16 + i * 4, -33)], 0.5, 0.75, 0);
    for (let i = 0; i < 3; i++) q.line([P(m.x, m.top + 6), P(m.x - 8 * m.sz + i * 3, at)], 0.5, 0.7, 0);
  }
  q.line([P(52, -198), P(150, -73)], 0.6, 0.8, 0);
  q.line([P(-2, -218), P(52, -150)], 0.6, 0.8, 0);
  q.line([P(-60, -160), P(-2, -120)], 0.6, 0.8, 0);
  q.line([P(-2, -218), P(-100, -56)], 0.5, 0.6, 0);
}

function pennant(q: Burin, mx: number, top: number): void {
  const len = 34;
  const spine = range(10, (u) => P(mx - u * len, top - 2 + Math.sin(u * 7) * 3 * u));
  const outline = [...spine.map((p, i) => P(p.x, p.y - 3.4 * (1 - i / 10))), ...[...spine].reverse().map((p, i) => P(p.x, p.y + 3.4 * (i / 10)))];
  q.white(outline);
  q.ring(outline, 0.9);
  q.line([P(mx, top), P(mx, top - 8)], 1, 1, 0);
}

function shipHull(q: Burin, o: ShipLook): void {
  q.white(HULL);
  const below = (d: number): Pt[] => SHEER.map((p) => P(p.x, p.y + d));
  q.clipped(HULL, () => {
    for (let d = 3; d < 72; d += q.gap(3.2)) q.line(below(d), 0.7, lerp(0.35, 0.95, clamp01(d / 55)), 0.15);
    q.tone([...below(9), ...below(12.5).reverse()], 0.9);
    q.tone([...below(20), ...below(22.5).reverse()], 0.9);
    q.hatch([...below(28), P(120, 30), P(-120, 30)], 3.4, 0.45, 0.7, 0.55);
    if (!o.whaler) for (let x = -50; x <= 60; x += 14) q.tone([P(x, -21), P(x + 5, -21), P(x + 5, -16), P(x, -16)].map((p) => P(p.x, p.y + (SHEER[Math.round(((x + 104) / 204) * (SHEER.length - 1))]!.y + 31))), 0.95);
    for (let i = 0; i < 3; i++) q.tone([P(-100 + i * 7, -50), P(-95 + i * 7, -50), P(-95 + i * 7, -43), P(-100 + i * 7, -43)], 0.9);
  });
  q.ring(HULL, 2.2);
  const rail = SHEER.filter((p) => p.x > -62 && p.x < 66).map((p) => P(p.x, p.y - 5));
  q.line(rail, 0.9, 1, 0.1);
  rail.forEach((p, i) => i % 2 === 0 && q.line([p, P(p.x, p.y + 5)], 0.6, 0.8, 0));
  if (o.whaler) for (const bx of [-34, 22]) whaleboatOnDavits(q, bx);
}

function whaleboatOnDavits(q: Burin, x: number): void {
  const y = -44;
  const hull = [...range(8, (u) => P(x - 18 + u * 36, y - 3 + Math.sin(Math.PI * u) * 0.5)), P(x + 15, y + 4), P(x - 15, y + 4)];
  q.white(hull);
  q.hatch(hull, 2.6, 0.2, 0.5, 0.6);
  q.ring(hull, 1);
  for (const s of [-1, 1]) q.line([P(x + s * 14, -32), P(x + s * 14, y - 10), P(x + s * 10, y - 12)], 1, 1, 0.2);
}

/** A rowing boat, `s` px long, with three rowers and a man at the bow with a harpoon. */
function boat(b: Burin, x: number, y: number, s: number, facing: 1 | -1): void {
  const k = s / 100;
  const { ctx } = b;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * k, k);
  const q = b.in(k);
  for (const rx of [-26, -2, 22]) rower(q, rx, -8, 34);
  figure(q, 40, -9, 38, 0.5, 2.6);
  q.line([P(30, -46), P(82, -64)], 1.2, 1, 0.2);
  q.tone([P(82, -64), P(74, -64), P(78, -59)], 1);
  const hull = [...spline(pts([-52, -14, -30, -10, 0, -9, 30, -10, 54, -18]), 3), P(48, -4), P(38, 3), P(0, 6), P(-40, 4), P(-50, -4)];
  q.white(hull);
  q.clipped(hull, () => {
    for (let d = 2; d < 22; d += q.gap(2.6)) q.line([P(-55, -12 + d), P(0, -8 + d), P(56, -16 + d)], 0.6, lerp(0.4, 0.9, d / 20), 0.2);
  });
  q.ring(hull, 1.6);
  for (const rx of [-26, -2, 22]) {
    q.line([P(rx + 1, -17), P(rx - 34, 12)], 1.1, 1, 0.2);
    q.line(range(5, (u) => P(rx - 42 + u * 16, 12 - Math.sin(Math.PI * u) * 3)), 0.9, 0.9, 1);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the serpent

const CORNER = P(26, 9);
const JAW_EDGE = pts([26, 9, 50, 6, 80, 4, 110, 2, 140, 0, 160, -2]);
const SKULL = [...spline(pts([-6, -36, 18, -46, 46, -50, 72, -44, 100, -34, 130, -25, 156, -16, 166, -8, 160, -2]), 3), ...[...JAW_EDGE].reverse().slice(1), P(8, 20), P(-6, 30)];
const JAW = pts([26, 9, 60, 11, 100, 12, 140, 12, 158, 10, 152, 20, 124, 27, 84, 31, 48, 29, 22, 24]);

/** A sea serpent's head, facing +x from (x, y) where it meets the neck: jaws open `gape`, a frilled collar or a flowing mane behind. */
function serpentHead(b: Burin, x: number, y: number, angle: number, s: number, gape: number, mane: boolean): void {
  const { ctx } = b;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  const q = b.in(s);
  if (mane) maneOf(q);
  else frill(q);
  const jaw = JAW.map((p) => rot(p, gape * 0.55, CORNER));
  const jawTop = jaw.slice(0, 5);
  const mouth = [...JAW_EDGE, ...[...jawTop].reverse()];
  q.tone(mouth, 0.92);
  teeth(q, JAW_EDGE, 1);
  teeth(q, jawTop, -1);
  q.white(jaw);
  q.hatch([...jaw.slice(5), jaw[0]!].map((p, i) => (i === 0 ? p : p)), 2.6, 0.3 + gape * 0.55, 0.7, 0.8);
  q.ring(jaw, 1.8);
  q.white(SKULL);
  q.clipped(SKULL, () => {
    q.hatch([P(-10, -12), P(170, -6), P(170, 30), P(-10, 30)], 2.6, 0.08, 0.8, 0.8);
    q.hatch([P(-10, 4), P(170, 2), P(170, 30), P(-10, 30)], 2.8, -0.6, 0.6, 0.6);
    for (let r = 0; r < 4; r++) {
      for (let cx = 6 + (r % 2) * 5; cx < 150 - r * 18; cx += 10) {
        const cy = -40 + r * 8 + (cx / 160) * 18;
        q.line(range(4, (u) => P(cx + 3.5 * Math.cos(Math.PI * (0.5 + u)), cy + 3.5 * Math.sin(Math.PI * (0.5 + u)))), 0.6, 0.6, 1);
      }
    }
  });
  q.ring(SKULL, 2.2);
  const eye = ellipsePts(74, -30, 9.5, 7, 16);
  q.white(eye);
  q.ring(eye.slice(0, -1), 1.3);
  q.dot(76, -30, 4.6, 1);
  q.dot(74.5, -32, 1.3, 0);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(74.5, -32, 1.4, 0, Math.PI * 2);
  ctx.fill();
  q.line([P(56, -40), P(74, -45), P(94, -38)], 2, 1, 1);
  q.line([P(60, -22), P(76, -19), P(90, -24)], 0.7, 0.7, 1);
  q.dot(150, -12, 1.8, 1);
  ctx.restore();
}

function teeth(q: Burin, edge: readonly Pt[], down: number): void {
  const len = edge.reduce((s, p, i) => (i ? s + Math.hypot(p.x - edge[i - 1]!.x, p.y - edge[i - 1]!.y) : 0), 0);
  for (let d = 10; d < len - 4; d += 7.5) {
    let acc = 0;
    let i = 1;
    while (i < edge.length - 1 && acc + Math.hypot(edge[i]!.x - edge[i - 1]!.x, edge[i]!.y - edge[i - 1]!.y) < d) {
      acc += Math.hypot(edge[i]!.x - edge[i - 1]!.x, edge[i]!.y - edge[i - 1]!.y);
      i++;
    }
    const a = edge[i - 1]!;
    const c = edge[i]!;
    const seg = Math.hypot(c.x - a.x, c.y - a.y) || 1;
    const u = clamp01((d - acc) / seg);
    const t = P((c.x - a.x) / seg, (c.y - a.y) / seg);
    const base = P(lerp(a.x, c.x, u), lerp(a.y, c.y, u));
    const nrm = P(-t.y * down, t.x * down);
    const tri = [add(base, t, -2.4), add(base, nrm, 6.5), add(base, t, 2.4)];
    q.white(tri);
    q.line(tri, 0.6, 0.9, 0);
  }
}

function frill(q: Burin): void {
  for (const [scale, offset] of [[1, 0], [0.74, 0.5]] as const) {
    const lobes = 9;
    const a0 = -Math.PI / 2 - 0.15;
    const a1 = -Math.PI * 1.5 + 0.15;
    const outer: Pt[] = [];
    const valleys: Pt[] = [];
    for (let i = 0; i <= lobes * 6; i++) {
      const u = i / (lobes * 6);
      const a = lerp(a0, a1, u);
      const lobe = Math.abs(Math.sin(Math.PI * (u * lobes + offset)));
      const r = (52 + 16 * lobe) * scale;
      outer.push(P(-4 + Math.cos(a) * r * 1.15, -3 + Math.sin(a) * r * 0.85));
      if (i % 6 === 0) valleys.push(P(-4 + Math.cos(a) * r * 1.15, -3 + Math.sin(a) * r * 0.85));
    }
    const inner = range(12, (u) => {
      const a = lerp(a1, a0, u);
      return P(-4 + Math.cos(a) * 22 * scale, -3 + Math.sin(a) * 30 * scale);
    });
    const outline = [...outer, ...inner];
    q.white(outline);
    q.clipped(outline, () => {
      valleys.forEach((v, i) => {
        const a = lerp(a0, a1, i / lobes);
        const from = P(-4 + Math.cos(a) * 20 * scale, -3 + Math.sin(a) * 26 * scale);
        q.line([from, v], 1.1, 0.95, 1);
        for (let k = 1; k <= 3; k++) {
          const a2 = lerp(a0, a1, (i + k * 0.13) / lobes);
          const to = P(-4 + Math.cos(a2) * 60 * scale * 1.15, -3 + Math.sin(a2) * 60 * scale * 0.85);
          q.line([from, to], 0.6, 0.6, 1);
        }
      });
    });
    q.line(outer, 1.6, 1, 0.2);
  }
}

function maneOf(q: Burin): void {
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const start = P(lerp(-8, 40, u), lerp(-30, -48, u));
    const len = lerp(200, 90, u) * (0.8 + 0.4 * q.r());
    const strand = range(10, (v) => P(start.x - v * len, start.y + v * len * 0.25 + Math.sin(v * 6 + i) * 8 * v));
    q.line(strand, lerp(2.2, 1.2, u), 0.95, 1);
  }
}

/** An arch of a serpent's body, humped out of the water at `wl`: the spine runs down under the surface at both ends. */
function archSpine(xm: number, wl: number, rx: number, ry: number): Pt[] {
  return range(40, (u) => {
    const a = Math.PI + 0.45 - u * (Math.PI + 0.9);
    return P(xm + rx * Math.cos(a), wl - ry * Math.sin(a));
  });
}

// ---------------------------------------------------------------- the mermaid

/** A mermaid on her rock, combing her long hair; in picture units around (520, 500). */
function mermaid(b: Burin): void {
  rock(b, spline(pts([418, 690, 424, 600, 446, 548, 480, 516, 526, 504, 574, 510, 606, 536, 626, 590, 636, 690]), 3, true));
  // The far arm, propped on the rock behind her, under her hair.
  tube(b, spline(pts([486, 400, 470, 448, 462, 500]), 6), (u) => lerp(6.5, 5, u), { ink: 1.5, hatch: 2.4, weight: 0.6 });
  mermaidBody(b);
  // The tail, from her hips along the rock and down into the sea, scaled, its fluke flipped up.
  tube(b, spline(pts([486, 492, 520, 500, 556, 508, 592, 528, 616, 562, 622, 604, 612, 646]), 8), (u) => lerp(27, 10, u), { ink: 2.1, hatch: 3.2, weight: 0.8, scales: 7, long: [0.72, 0.9], caps: false });
  const fluke = spline(pts([612, 646, 636, 626, 668, 600, 702, 586, 694, 610, 728, 616, 698, 636, 660, 650, 626, 662]), 4, true);
  b.white(fluke);
  b.clipped(fluke, () => {
    for (let i = 0; i < 12; i++) b.line([P(622, 654), P(672 + i * 5, 590 + i * 4.5)], 0.6, 0.75, 1);
  });
  b.ring(fluke, 1.5);
  mermaidUpper(b);
  foam(b, 626, 666, 70);
  foam(b, 440, 682, 80);
  foam(b, 590, 688, 90);
}

/** Her body, in profile, facing right, shaded on the side away from the light. */
function mermaidBody(b: Burin): void {
  const body = spline(pts([510, 374, 512, 386, 526, 394, 531, 410, 527, 426, 518, 442, 518, 460, 516, 480, 512, 496, 470, 496, 470, 478, 478, 448, 474, 420, 476, 398, 490, 380, 498, 372]), 4, true);
  b.white(body);
  b.clipped(body, () => {
    for (let x = 504; x < 540; x += b.gap(2.2)) b.line(range(10, (u) => P(x + Math.sin(u * Math.PI) * 5, lerp(370, 504, u))), 0.5, 0.25 + 0.6 * clamp01((x - 504) / 26), 1);
    b.line(range(8, (u) => P(510 + u * 20, 424 + Math.sin(u * Math.PI) * 4)), 0.6, 0.7, 1);
  });
  b.ring(body, 1.5);
}

/** Her head in profile, her hair, the lock over her shoulder and the arm combing. */
function mermaidUpper(b: Burin): void {
  const head = spline(pts([500, 330, 514, 336, 518, 344, 524, 352, 519, 356, 521, 360, 518, 363, 516, 369, 504, 375, 488, 366, 483, 350, 488, 336]), 4, true);
  b.white(head);
  b.ring(head, 1.3);
  b.line([P(509, 349), P(514, 348)], 1, 1, 1);
  b.line([P(508, 345), P(515, 343)], 0.6, 0.8, 1);
  mermaidHair(b);
  // A lock of hair over her shoulder and down her front.
  const lock = spline(pts([500, 352, 510, 368, 520, 386, 528, 406, 530, 428, 522, 444, 518, 428, 517, 406, 509, 388, 498, 370]), 4, true);
  b.white(lock);
  b.clipped(lock, () => {
    for (let i = 0; i < 6; i++) b.line(range(14, (v) => P(500 + i * 2.4 + Math.sin(v * 7 + i) * 2.5 + v * 22, 352 + v * 94)), 0.65, 0.9, 1);
  });
  b.ring(lock, 1);
  b.line(spline(pts([484, 346, 488, 334, 500, 328, 514, 334, 518, 344]), 4), 1.8, 1, 0.4);
  // The raised arm, reaching over to comb the back of her hair.
  tube(b, spline(pts([522, 396, 546, 372, 548, 348, 532, 328]), 6), (u) => lerp(7, 5, u), { ink: 1.5, hatch: 2.4, weight: 0.6 });
  const comb = [P(506, 320), P(532, 316), P(534, 325), P(508, 329)];
  b.white(comb);
  b.tone(comb, 0.35);
  b.ring(comb, 1.1);
  for (let i = 0; i < 8; i++) b.line([P(509 + i * 3.1, 327 - i * 0.5), P(508 + i * 3.1, 335 - i * 0.5)], 0.7, 1, 0);
}

/** Her hair, down her back in long waves to the rock, darker in its depths. */
function mermaidHair(b: Burin): void {
  const wave = (y: number): number => Math.sin(y * 0.06) * 4;
  const outerEdge = pts([504, 326, 486, 328, 472, 340, 464, 362, 458, 388, 450, 414, 440, 440, 430, 466, 418, 494, 406, 520, 392, 540]).map((p) => P(p.x + wave(p.y), p.y));
  const innerEdge = pts([414, 544, 436, 534, 456, 516, 470, 494, 482, 468, 490, 440, 494, 414, 496, 394, 498, 376, 500, 360, 504, 346, 510, 334]);
  const outer = spline([...outerEdge, ...innerEdge], 5, true);
  b.white(outer);
  b.clipped(outer, () => {
    for (let i = 0; i < 24; i++) {
      const u = i / 23;
      b.line(range(26, (v) => P(lerp(512, 480, u) - v * lerp(80, 96, u) + Math.sin(v * 7 + u * 4) * 5 * v + wave(330 + v * 205), 328 + v * 214)), 0.7, 0.9, 1);
    }
    b.clipped(outer.map((p) => P(p.x - 10, p.y + 50)), () => b.hatch(outer, 2, 1.2, 0.5, 0.7));
  });
  b.ring(outer, 1.5);
}

// ---------------------------------------------------------------- the kraken

/** A tapering squid arm along control points, suckers on one side, curling to a point. */
function arm(b: Burin, control: readonly Pt[], r0: number, side: number): Pt[] {
  const spine = spline(control, 10);
  tube(b, spine, (u) => r0 * Math.pow(1 - u, 0.85) + 1.2, { ink: 2, hatch: 4.2, weight: 0.9, long: [0.75, 0.92], suckers: side });
  return spine;
}

/** A big wary eye in wrinkled skin, open `open` (0 just the lid's seam). */
function bigEye(b: Burin, x: number, y: number, r: number, open: number): void {
  for (let k = 1; k <= 3; k++) {
    b.line(range(10, (u) => P(x - r * (1.5 + k * 0.35) + u * r * (3 + k * 0.7), y - r * (0.15 + k * 0.32) * Math.sin(Math.PI * u) - r * 0.1)), 1.1, 0.8, 1);
    b.line(range(10, (u) => P(x - r * (1.3 + k * 0.3) + u * r * (2.6 + k * 0.6), y + r * (0.2 + k * 0.28) * Math.sin(Math.PI * u))), 0.9, 0.6, 1);
  }
  const o = clamp01(open);
  const upper = range(14, (u) => P(x - r * 1.5 + u * r * 3, y - r * 1.05 * o * Math.sin(Math.PI * u)));
  const lower = range(14, (u) => P(x + r * 1.5 - u * r * 3, y + r * 0.62 * o * Math.sin(Math.PI * u)));
  if (o > 0.02) {
    const lids = [...upper, ...lower];
    b.white(lids);
    b.clipped(lids, () => {
      const iris = ellipsePts(x + r * 0.1, y - r * 0.12, r * 0.86, r * 0.86, 24);
      b.tone(iris, 0.25);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        b.line([P(x + r * 0.1 + Math.cos(a) * r * 0.42, y - r * 0.12 + Math.sin(a) * r * 0.42), P(x + r * 0.1 + Math.cos(a) * r * 0.84, y - r * 0.12 + Math.sin(a) * r * 0.84)], 0.7, 0.8, 1);
      }
      b.ring(iris.slice(0, -1), 1.2);
      b.tone(ellipsePts(x + r * 0.1, y - r * 0.12, r * 0.4, r * 0.4, 18), 0.95);
      b.ctx.fillStyle = '#ffffff';
      b.ctx.beginPath();
      b.ctx.arc(x - r * 0.08, y - r * 0.3, r * 0.12, 0, Math.PI * 2);
      b.ctx.fill();
    });
    b.line(lower, 1.4, 1, 0.5);
  }
  b.line(upper, 2.6, 1, 0.5);
}

// ---------------------------------------------------------------- whales

const SPERM_TOP = spline(pts([0, 0, -60, -6, -140, -8, -220, -4, -280, 6, -320, -6, -350, -10, -375, 4, -430, 40, -500, 110, -560, 220]), 4);
const SPERM = [...SPERM_TOP, P(-200, 260), P(-20, 240), ...spline(pts([-6, 196, 8, 160, 18, 110, 20, 60, 14, 20, 0, 0]), 4)];

/** A sperm whale's head and back, front-top of the snout at (x, y), facing +x; everything below `wl` (picture y) hidden. */
function spermWhale(b: Burin, x: number, y: number, s: number, wl: number, facing: 1 | -1 = 1): void {
  const { ctx } = b;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e4, -1e4, 2e4, wl + 1e4);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(facing * s, s);
  const q = b.in(s);
  q.white(SPERM);
  q.clipped(SPERM, () => {
    for (let d = 8; d < 240; d += q.gap(4.4) * (d < 120 ? 1 : 0.8)) {
      const dark = clamp01((d - 70) / 120);
      q.line(SPERM_TOP.map((p, i) => P(p.x, p.y + d + Math.sin(i * 0.9 + d) * 1.6)), 0.6 + 0.9 * dark, 0.35 + 0.6 * dark, 0.4);
    }
    q.hatch([P(-560, 140), P(30, 120), P(30, 260), P(-560, 260)], 3.2, -0.5, 0.7, 0.6);
    for (let i = 0; i < 9; i++) q.line(range(8, (u) => P(-4 - u * 6 + Math.sin(u * 3) * 2, 30 + i * 18 + u * 14)), 0.8, 0.55, 1);
  });
  q.ring(SPERM, 2.6);
  q.line(spline(pts([-4, 176, -60, 186, -130, 192, -190, 194]), 4), 1.8, 1, 0.6);
  q.line(spline(pts([-14, 200, -80, 212, -170, 214]), 4), 1.2, 0.9, 0.6);
  bigEye(q, -205, 150, 7, 0.8);
  q.line(range(6, (u) => P(-16 - u * 18, -2 - Math.sin(Math.PI * u) * 4)), 1.4, 1, 1);
  ctx.restore();
}

const BLUE_TOP = spline(pts([0, 0, 40, -16, 120, -28, 200, -27, 280, -20, 300, -21, 314, -34, 322, -20, 360, -9, 384, -6]), 4);
const BLUE_BELLY = spline(pts([384, 6, 360, 8, 260, 22, 160, 30, 90, 30, 40, 22, 8, 10, 0, 0]), 4);

/** The blue whale side on, snout at (x, y) facing -x when `facing` is -1, `len` px long, with a double spout. */
function blueWhale(b: Burin, x: number, y: number, len: number, facing: 1 | -1 = -1): void {
  const k = len / 420;
  const { ctx } = b;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-facing * k, k);
  const q = b.in(k);
  for (const s of [-1, 1]) {
    for (const k of [0, 0.5]) q.line(range(12, (u) => P(70 + s * (6 + k * 6 + u * 34), -24 - 62 * u + 50 * u * u - k * 6)), 1.4 - k, 0.9, 1);
    for (let i = 0; i < 5; i++) q.dot(70 + s * (34 + i * 5), -36 + i * 8, 1.5, 0.8);
  }
  const flukes = spline(pts([380, -6, 404, -30, 426, -36, 414, -4, 428, 22, 404, 18, 380, 6]), 3, true);
  q.white(flukes);
  q.hatch(flukes, 3, 1.2, 0.6, 0.6);
  q.ring(flukes, 1.6);
  const body = [...BLUE_TOP, ...BLUE_BELLY];
  q.white(body);
  q.clipped(body, () => {
    for (let d = 6; d < 40; d += q.gap(3.2)) q.line(BLUE_TOP.map((p) => P(p.x, p.y + d * (0.4 + p.x / 600))), 0.6, 0.2 + 0.7 * clamp01((d - 10) / 30), 0.4);
    for (let i = 0; i < 12; i++) q.line(range(6, (u) => P(8 + u * 150, 10 + i * 1.8 + u * (12 + i * 0.6))), 0.6, 0.8, 0.5);
  });
  q.ring(body, 2);
  const fin = spline(pts([100, 22, 140, 52, 152, 46, 124, 20]), 3, true);
  q.white(fin);
  q.hatch(fin, 2.4, 0.9, 0.5, 0.7);
  q.ring(fin, 1.3);
  q.dot(58, 6, 2.2, 1);
  q.line([P(4, 6), P(50, 12), P(90, 12)], 1, 1, 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------- layers

interface Layer { readonly frames: readonly HTMLCanvasElement[]; readonly box: Box }

/** Bakes a part of a picture once per boil frame (or once): ink and paper-white on transparent. */
function bake(box: Box, seed: number, draw: (b: Burin, frame: number) => void, frames = BOIL_FRAMES): Layer {
  const out = Array.from({ length: frames }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(box.w * RES), Math.ceil(box.h * RES));
    ctx.scale(RES, RES);
    ctx.translate(-box.x, -box.y);
    draw(Burin.make(ctx, seed * 977 + f * 131, 1.2), f);
    return canvas;
  });
  return { frames: out, box };
}

function put(c: CanvasRenderingContext2D, l: Layer, boil: number, dx = 0, dy = 0): void {
  c.drawImage(l.frames[boil % l.frames.length]!, l.box.x + dx, l.box.y + dy, l.box.w, l.box.h);
}

/** A body that rises out of the sea: slid down `depth` and cut at the waterline when rise is 0, foam where it breaks the surface. */
interface Riser {
  readonly layer: Layer;
  readonly spine: readonly Pt[];
  readonly rad: (u: number) => number;
  readonly wl: number;
  readonly depth: number;
  readonly from: number;
  readonly to: number;
}

function drawRiser(c: CanvasRenderingContext2D, r: Riser, boil: number, rise: number, live: Burin): void {
  const u = smooth((rise - r.from) / (r.to - r.from));
  if (u <= 0) return;
  const shift = r.depth * (1 - u);
  c.save();
  c.beginPath();
  c.rect(-1e4, -1e4, 2e4, r.wl + 1e4);
  c.clip();
  put(c, r.layer, boil, 0, shift);
  c.restore();
  const n = r.spine.length;
  for (let i = 1; i < n; i++) {
    const y0 = r.spine[i - 1]!.y + shift;
    const y1 = r.spine[i]!.y + shift;
    if ((y0 - r.wl) * (y1 - r.wl) > 0 || y0 === y1) continue;
    const x = lerp(r.spine[i - 1]!.x, r.spine[i]!.x, (r.wl - y0) / (y1 - y0));
    foam(live, x, r.wl, r.rad(i / (n - 1)) * 3.4);
  }
}

// ---------------------------------------------------------------- the cards

interface Card {
  draw(c: CanvasRenderingContext2D, boil: number, look: LegendLook, live: Burin): void;
}

function serpentCard(): Card {
  const wl = 612;
  const back = bake(FULL, 11, (b, f) => {
    sky(b, 0, PW, 0, 300, [{ x: 250, y: 120, w: 300, h: 70 }, { x: 980, y: 90, w: 240, h: 56 }, { x: 700, y: 210, w: 200, h: 40 }]);
    sea(Burin.make(b.ctx, 501 + f), 0, PW, 300, PH);
    boat(b, 900, 604, 200, -1);
    foam(b, 900, 608, 230);
  });
  const neckSpine = spline(pts([322, 840, 318, 720, 322, 610, 332, 510, 352, 420, 388, 340, 440, 284, 500, 252, 560, 242]), 8);
  const neckRad = (u: number): number => lerp(48, 31, u);
  const neck = bake({ x: 180, y: 120, w: 640, h: 740 }, 12, (b) => {
    tube(b, neckSpine, neckRad, { ink: 2.4, hatch: 4.2, weight: 1, long: [0.62, 0.8, 0.93], spikes: -1, scales: 10 });
    const end = neckSpine[neckSpine.length - 1]!;
    const prev = neckSpine[neckSpine.length - 4]!;
    serpentHead(b, end.x - 6, end.y, Math.atan2(end.y - prev.y, end.x - prev.x) + 0.05, 1.08, 0.9, false);
  });
  const humpSpine = archSpine(150, wl, 64, 92);
  const hump = bake({ x: 50, y: 470, w: 210, h: 200 }, 13, (b) => tube(b, humpSpine, () => 25, { ink: 2.2, hatch: 4, weight: 0.9, long: [0.7, 0.9], spikes: -1, scales: 10 }));
  const risers: Riser[] = [
    { layer: hump, spine: humpSpine, rad: () => 25, wl, depth: 130, from: 0, to: 0.45 },
    { layer: neck, spine: neckSpine, rad: neckRad, wl, depth: 620, from: 0.1, to: 1 },
  ];
  return {
    draw(c, boil, look, live) {
      put(c, back, boil);
      for (const r of risers) drawRiser(c, r, boil, look.rise ?? 1, live);
    },
  };
}

function seaserpentCard(): Card {
  const wl = 566;
  const back = bake(FULL, 21, (b, f) => {
    sky(b, 0, PW, 0, 320, [{ x: 200, y: 100, w: 260, h: 60 }, { x: 640, y: 150, w: 320, h: 66 }]);
    sea(Burin.make(b.ctx, 502 + f), 0, PW, 320, PH, 1.1);
    ship(b, 1000, 466, 158, 0.03, { facing: -1 });
    foam(b, 1000, 470, 300);
  });
  const humps = [[350, 72, 118, 30], [520, 64, 100, 27], [668, 54, 80, 23], [790, 42, 60, 19]] as const;
  const risers: Riser[] = humps.map(([xm, rx, ry, r], i) => {
    const spine = archSpine(xm, wl, rx, ry);
    const layer = bake({ x: xm - rx - r * 3, y: wl - ry - r * 3, w: (rx + r * 3) * 2, h: ry + r * 6 + 40 }, 22 + i, (b) =>
      tube(b, spine, () => r, { ink: 2.2, hatch: 4, weight: 0.9, long: [0.7, 0.9], spikes: -1, scales: 10 }));
    return { layer, spine, rad: () => r, wl, depth: ry + r + 10, from: 0.18 + i * 0.16, to: 0.5 + i * 0.16 };
  });
  const tailSpine = spline(pts([862, 640, 868, 566, 880, 524, 904, 500, 930, 504, 940, 526, 926, 542, 912, 532]), 8);
  const tailRad = (u: number): number => lerp(17, 3, u);
  const tail = bake({ x: 820, y: 470, w: 160, h: 200 }, 27, (b) => tube(b, tailSpine, tailRad, { ink: 2, hatch: 3.6, weight: 0.8, long: [0.8], spikes: -1 }));
  risers.push({ layer: tail, spine: tailSpine, rad: tailRad, wl, depth: 130, from: 0.7, to: 1 });
  const neckSpine = spline(pts([176, 720, 170, 620, 174, 530, 192, 456, 222, 404, 262, 374, 302, 362]), 8);
  const neckRad = (u: number): number => lerp(36, 26, u);
  const neck = bake({ x: 80, y: 220, w: 420, h: 520 }, 28, (b) => {
    tube(b, neckSpine, neckRad, { ink: 2.3, hatch: 4, weight: 1, long: [0.65, 0.85], spikes: -1, scales: 10 });
    serpentHead(b, 296, 362, -0.12, 0.86, 1, true);
  });
  risers.unshift({ layer: neck, spine: neckSpine, rad: neckRad, wl, depth: 420, from: 0, to: 0.55 });
  return {
    draw(c, boil, look, live) {
      put(c, back, boil);
      for (const r of risers) drawRiser(c, r, boil, look.rise ?? 1, live);
    },
  };
}

function mermaidCard(): Card {
  const main = bake(FULL, 31, (b, f) => {
    sky(b, 0, PW, 0, 330, [{ x: 860, y: 130, w: 300, h: 70 }, { x: 260, y: 90, w: 220, h: 50 }]);
    sun(b, 1040, 92, 46);
    sea(Burin.make(b.ctx, 503 + f), 0, PW, 330, PH);
    ship(b, 980, 334, 40, 0, { flags: true });
    for (const [x, y] of [[340, 220], [372, 206], [400, 234]] as const) b.line([P(x - 10, y), P(x - 4, y - 5), P(x, y), P(x + 4, y - 5), P(x + 10, y)], 1.2, 0.9, 1);
    b.ctx.save();
    b.ctx.translate(590, 690);
    b.ctx.scale(1.6, 1.6);
    b.ctx.translate(-540, -672);
    mermaid(b.in(1.6));
    b.ctx.restore();
  });
  return { draw: (c, boil) => put(c, main, boil) };
}

function sun(b: Burin, x: number, y: number, r: number): void {
  const disc = ellipsePts(x, y, r, r, 30);
  b.white(ellipsePts(x, y, r * 2.2, r * 2.2, 30));
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const len = i % 2 ? 1.5 : 2.1;
    if (i % 2) b.line([P(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12), P(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len)], 1, 0.85, 1);
    else {
      const w = 0.09;
      b.line([P(x + Math.cos(a - w) * r * 1.1, y + Math.sin(a - w) * r * 1.1), P(x + Math.cos(a) * r * len, y + Math.sin(a) * r * len), P(x + Math.cos(a + w) * r * 1.1, y + Math.sin(a + w) * r * 1.1)], 1.1, 0.9, 0.2);
    }
  }
  b.white(disc);
  b.hatch(disc, 3.6, 0, 0.5, 0.35);
  b.ring(disc.slice(0, -1), 1.8);
}

/** Where the kraken card's ship stands, so its arm can find the mast. */
const KRAKEN_SHIP = { x: 660, y: 540, s: 200, heel: -0.1 } as const;
const shipPoint = (lx: number, ly: number): Pt => {
  const k = KRAKEN_SHIP.s / 100;
  const p = rot(P(lx * k, ly * k), KRAKEN_SHIP.heel);
  return P(KRAKEN_SHIP.x + p.x, KRAKEN_SHIP.y + p.y);
};

function krakenCard(): Card {
  const wl = 600;
  const backdrop = bake(FULL, 41, (b, f) => {
    sky(b, 0, PW, 0, 290, [{ x: 220, y: 110, w: 360, h: 90 }, { x: 930, y: 80, w: 380, h: 80 }], 0.6);
    lightning(b, 1060, 120);
    sea(Burin.make(b.ctx, 504 + f), 0, PW, 290, PH, 1.35);
  });
  const shipLayer = bake({ x: 340, y: 0, w: 860, h: 680 }, 45, (b) => {
    ship(b, KRAKEN_SHIP.x, KRAKEN_SHIP.y, KRAKEN_SHIP.s, KRAKEN_SHIP.heel, { furled: true });
    foam(b, 660, 552, 440);
  });
  const head = bake({ x: 90, y: 470, w: 330, h: 200 }, 46, (b) => {
    krakenHead(b);
    foam(b, 252, 604, 300);
  });
  // The arm round the mainmast: up out of the sea, then a coil seen a little from above, its back turns behind the ship.
  const coilStart = shipPoint(-2, -66);
  const climb = spline(pts([560, 790, 548, 680, 556, 560, coilStart.x - 64, coilStart.y + 40, coilStart.x - 50, coilStart.y + 4]), 10).map((p) => ({ p, front: true }));
  const coil = Array.from({ length: 121 }, (_, i) => {
    const u = i / 120;
    const a = Math.PI + u * Math.PI * 2 * 1.65;
    const m = shipPoint(-2, lerp(-66, -190, u));
    const r = lerp(50, 30, u);
    return { p: P(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.45), front: Math.sin(a) > 0 };
  });
  const last = coil[coil.length - 1]!.p;
  const tip = spline([last, P(last.x + 14, last.y - 16), P(last.x + 30, last.y - 14), P(last.x + 30, last.y - 2), P(last.x + 20, last.y + 2)], 6).slice(1).map((p) => ({ p, front: true }));
  const path = [...climb, ...coil, ...tip];
  const n = path.length;
  const climbEnd = climb.length / path.length;
  const coilEnd = (climb.length + coil.length) / path.length;
  const wrapRad = (u: number): number =>
    u < climbEnd ? lerp(28, 13, u / climbEnd) : u < coilEnd ? lerp(13, 6.5, (u - climbEnd) / (coilEnd - climbEnd)) : lerp(6.5, 1.5, (u - coilEnd) / (1 - coilEnd));
  const coilArm = (front: boolean) => (b: Burin): void => {
    let start = -1;
    const flush = (end: number): void => {
      if (start >= 0 && end - start > 1) {
        const s0 = start;
        tube(b, path.slice(s0, end + 1).map((q) => q.p), (u) => wrapRad(lerp(s0, end, u) / (n - 1)), { ink: 2.4, hatch: 3.6, weight: 0.9, long: [0.75, 0.92], suckers: 1, caps: false });
      }
      start = -1;
    };
    path.forEach((q, i) => {
      if (q.front === front && start < 0) start = Math.max(0, i - 1);
      if (q.front !== front && start >= 0) flush(i);
    });
    flush(n - 1);
  };
  const spine = path.map((q) => q.p);
  const arms = [
    pts([900, 780, 912, 640, 940, 520, 912, 440, 852, 428, 822, 456, 834, 482, 856, 476]),
    pts([420, 800, 404, 660, 420, 560, 452, 500, 486, 482, 500, 498, 486, 510]),
    pts([250, 780, 266, 580, 296, 420, 344, 290, 404, 214, 448, 206, 460, 228, 446, 240]),
  ];
  const riser = (layer: Layer, sp: readonly Pt[], from: number, to: number): Riser => ({ layer, spine: sp, rad: () => 24, wl, depth: 380, from, to });
  const behind = riser(bake({ x: 190, y: 150, w: 320, h: 650 }, 44, (b) => arm(b, arms[2]!, 34, 1)), spline(arms[2]!, 10), 0, 0.55);
  const coilBack = riser(bake({ x: 470, y: 120, w: 300, h: 680 }, 42, coilArm(false)), spine, 0.25, 1);
  const front = riser(bake({ x: 360, y: 120, w: 620, h: 680 }, 43, (b) => {
    coilArm(true)(b);
    arm(b, arms[0]!, 30, -1);
    arm(b, arms[1]!, 26, 1);
  }), spine, 0.25, 1);
  return {
    draw(c, boil, look, live) {
      const rise = look.rise ?? 1;
      put(c, backdrop, boil);
      drawRiser(c, behind, boil, rise, live);
      drawRiser(c, coilBack, boil, rise, live);
      put(c, shipLayer, boil);
      drawRiser(c, front, boil, rise, live);
      put(c, head, boil);
    },
  };
}

function lightning(b: Burin, x: number, y: number): void {
  const bolt = pts([x, y, x - 14, y + 40, x + 2, y + 44, x - 22, y + 100, x - 4, y + 104, x - 30, y + 160]);
  b.line(bolt, 2.4, 1, 0.4);
  b.line(bolt.map((p) => P(p.x + 3, p.y)), 0.8, 0.7, 0.4);
}

function krakenHead(b: Burin): void {
  b.ctx.save();
  b.ctx.beginPath();
  b.ctx.rect(0, 0, PW, 604);
  b.ctx.clip();
  const mantle = spline(pts([120, 640, 136, 560, 184, 512, 250, 496, 320, 508, 368, 548, 384, 640]), 5);
  b.white(mantle);
  b.clipped(mantle, () => {
    for (let d = 6; d < 140; d += b.gap(4.4)) b.line(mantle.map((p) => P(p.x, p.y + d)), 0.6 + d / 120, 0.3 + 0.5 * clamp01(d / 100), 0.4);
    b.stipple(mantle, 400, 1, 0.5);
  });
  b.line(mantle, 2.4, 1, 0.3);
  bigEye(b, 270, 556, 22, 0.75);
  b.ctx.restore();
}

function islandCard(): Card {
  const main = bake(FULL, 51, (b, f) => {
    sky(b, 0, PW, 0, 300, [{ x: 760, y: 110, w: 340, h: 76 }, { x: 240, y: 150, w: 240, h: 50 }]);
    sea(Burin.make(b.ctx, 505 + f), 0, PW, 300, PH);
    ship(b, 150, 312, 44, 0, {});
    island(b);
  });
  return {
    draw(c, boil, look, live) {
      put(c, main, boil);
      bigEye(live, 262, 506, 24, look.eye ?? 0);
    },
  };
}

const ISLAND = spline(pts([170, 548, 196, 506, 240, 480, 300, 462, 362, 450, 430, 442, 520, 434, 600, 430, 680, 434, 760, 442, 840, 454, 910, 472, 970, 498, 1040, 548]), 6);

function island(b: Burin): void {
  const top = ISLAND.map((p, i) => P(p.x, p.y + Math.sin(i * 1.7) * 3 + Math.sin(i * 0.45) * 4));
  const outline = [...top, P(1040, 560), P(170, 560)];
  b.white(outline);
  b.clipped(outline, () => {
    for (let d = 8; d < 130; d += b.gap(4.2)) b.line(top.map((p, i) => P(p.x, p.y + d + Math.sin(i * 0.8 + d) * 1.4)), 0.6 + d / 90, 0.25 + 0.6 * clamp01(d / 90), 0.5);
    b.hatch(outline.map((p) => P(p.x, p.y + 50)), 3.4, -0.5, 0.7, 0.55);
    for (let i = 0; i < 40; i++) {
      const x = 220 + b.r() * 780;
      const y = 470 + b.r() * 70;
      b.line(range(4, (u) => P(x + u * 12, y - Math.sin(Math.PI * u) * 4)), 0.8, 0.7, 1);
    }
  });
  b.line(top, 2.6, 1, 0.3);
  for (let i = 0; i < 26; i++) {
    const x = 230 + b.r() * 760;
    const y = ISLAND_Y(x) + 30 + b.r() * 60;
    const r = 2 + b.r() * 3.5;
    b.white(ellipsePts(x, y, r, r * 0.8, 10));
    b.ring(ellipsePts(x, y, r, r * 0.8, 10).slice(0, -1), 0.8, 0.9);
    b.dot(x, y, r * 0.3, 0.9);
  }
  for (const x of [380, 830]) tree(b, x, ISLAND_Y(x) + 2);
  for (const x of [330, 420, 760, 880]) for (let i = 0; i < 5; i++) b.line([P(x + i * 3, ISLAND_Y(x)), P(x + i * 3 + (i - 2) * 2, ISLAND_Y(x) - 9 - (i % 2) * 4)], 0.8, 0.9, 1);
  figure(b, 520, ISLAND_Y(520), 46, 0.3, 2.9);
  b.line([P(528, ISLAND_Y(520) - 2), P(534, ISLAND_Y(520) - 90)], 1.4, 1, 0.1);
  const flag = range(8, (u) => P(534 + u * 40, ISLAND_Y(520) - 90 + Math.sin(u * 5) * 4));
  const flagShape = [...flag, ...[...flag].reverse().map((p) => P(p.x, p.y + 20))];
  b.white(flagShape);
  b.hatch(flagShape, 2.8, 0.3, 0.6, 0.7);
  b.ring(flagShape, 1.1);
  figure(b, 600, ISLAND_Y(600), 44, 2.5, -2.5);
  figure(b, 664, ISLAND_Y(664), 42, 0.8, -0.2);
  figure(b, 742, ISLAND_Y(742), 44, 0.2, -0.9);
  // Their cooking fire, smoke curling away.
  const fx = 702;
  const fy = ISLAND_Y(fx);
  for (let i = 0; i < 5; i++) b.line([P(fx - 12 + i * 6, fy), P(fx - 6 + i * 3, fy - 14 - (i % 2) * 6)], 1, 1, 1);
  smoke(b, fx, fy - 18);
  boat(b, 1020, 548, 120, -1);
  for (const [x, s] of [[110, 1], [1110, -1]] as const) arm(b, pts([x, 620, x + s * 6, 560, x + s * 26, 530, x + s * 44, 534, x + s * 46, 552, x + s * 34, 556]), 13, s);
  foam(b, 600, 556, 900);
}

/** Smoke billowing up and away on the wind, in puffs that grow as they rise. */
function smoke(b: Burin, x: number, y: number): void {
  const rng = createRng(1752);
  for (let k = 13; k >= 0; k--) {
    const r = (6 + k * 2.6) * (0.8 + rng() * 0.4);
    const c = P(x + k * 12 + Math.sin(k * 1.3) * 10 + (rng() - 0.5) * 8, y - k * 18);
    const puff = ellipsePts(c.x, c.y, r, r * 0.85, 18);
    b.white(puff);
    b.clipped(puff, () => b.hatch(puff.map((p) => P(p.x + r * 0.5, p.y + r * 0.45)), 2.4, 0.3, 0.5, 0.55));
    b.line(ellipsePts(c.x, c.y, r, r * 0.85, 12, Math.PI * 0.8, Math.PI * 2.1), 0.9, 0.85, 1);
  }
}

const ISLAND_Y = (x: number): number => {
  const i = ISLAND.findIndex((p) => p.x >= x);
  return (ISLAND[Math.max(0, i)]?.y ?? 450) + 4;
};

/** The Essex: whale and ship positions, at full impact. */
const ESSEX = { shipX: 880, wl: 548, s: 196, whaleX: 668, whaleY: 388, contact: P(690, 468) } as const;

function essexCard(): Card {
  const shipWl = ESSEX.wl;
  const seaOf = (b: Burin, f: number): void => sea(Burin.make(b.ctx, 506 + f), 0, PW, 300, PH);
  const back = bake(FULL, 61, (b, f) => {
    sky(b, 0, PW, 0, 300, [{ x: 300, y: 120, w: 320, h: 70 }, { x: 1000, y: 160, w: 260, h: 56 }]);
    b.clipped([P(0, 0), P(PW, 0), P(PW, shipWl), P(0, shipWl)], () => seaOf(b, f));
  });
  const shipLayer = bake({ x: 560, y: 60, w: 600, h: 560 }, 62, (b) => ship(b, ESSEX.shipX, shipWl, ESSEX.s, 0, { facing: -1, whaler: true }));
  const water = bake({ x: 0, y: shipWl - 4, w: PW, h: PH - shipWl + 4 }, 63, (b, f) => {
    b.white([P(0, shipWl), P(PW, shipWl), P(PW, PH), P(0, PH)]);
    b.clipped([P(0, shipWl), P(PW, shipWl), P(PW, PH), P(0, PH)], () => seaOf(b, f));
    foam(b, 880, shipWl + 4, 380);
  });
  const whale = bake({ x: 60, y: 360, w: 660, h: 300 }, 64, (b) => {
    spermWhale(b, ESSEX.whaleX, ESSEX.whaleY, 1, 616);
    foam(b, 640, 612, 160);
    foam(b, 320, 614, 300);
  });
  return {
    draw(c, boil, look, live) {
      const impact = look.impact ?? 1;
      const go = smooth(impact / 0.7);
      const hit = smooth((impact - 0.68) / 0.32);
      put(c, back, boil);
      c.save();
      c.translate(ESSEX.shipX, shipWl);
      c.rotate(0.1 * hit + 0.02 * Math.sin(hit * 14) * (1 - hit));
      c.translate(-ESSEX.shipX, -shipWl);
      put(c, shipLayer, boil);
      c.restore();
      put(c, water, boil);
      put(c, whale, boil, -(1 - go) * 320, (1 - go) * 10);
      if (hit > 0) {
        splash(live, P(ESSEX.contact.x - 10, 606), hit);
        splinters(live, ESSEX.contact, hit);
      }
    },
  };
}

/** Water thrown up where the whale strikes: curling crests climbing, falling away as `u` grows, and drops. */
function splash(b: Burin, at: Pt, u: number): void {
  const rng = createRng(606);
  const h = 150 * Math.sin(Math.min(1, u * 1.3) * Math.PI * 0.6);
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const spread = (0.2 + rng() * 0.8) * 70 * side;
    const top = P(at.x + spread * (0.6 + u * 0.5), at.y - h * (0.5 + rng() * 0.5));
    const crest = spline([at, P(lerp(at.x, top.x, 0.4) - side * 8, lerp(at.y, top.y, 0.6)), top, P(top.x + side * 14, top.y + 6), P(top.x + side * 10, top.y + 16)], 5);
    b.line(crest, 1.3, 0.9, 1);
    b.line(crest.slice(0, -4).map((p) => P(p.x + side * 5, p.y + 4)), 0.6, 0.6, 1);
  }
  for (let i = 0; i < 30; i++) b.dot(at.x + (rng() - 0.5) * 220 * u, at.y - rng() * h * 1.3, 0.8 + rng() * 1.6, 0.85);
}

/** Planks, splinters and spray bursting from the bow. */
function splinters(b: Burin, at: Pt, u: number): void {
  const rng = createRng(1820);
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (rng() - 0.3) * 2.4;
    const v = 70 + rng() * 220;
    const p = P(at.x + Math.cos(a) * v * u, at.y + Math.sin(a) * v * u + 70 * u * u);
    const len = 10 + rng() * 32;
    const w = 2.5 + rng() * 4;
    const spin = rng() * 6 + u * (rng() - 0.5) * 8;
    const d = P(Math.cos(spin), Math.sin(spin));
    const n = P(-d.y, d.x);
    const plank = [add(add(p, d, -len / 2), n, -w / 2), add(add(p, d, len / 2), n, -w / 2), add(add(p, d, len / 2 + 3), n, w / 2), add(add(p, d, -len / 2), n, w / 2)];
    b.white(plank);
    b.ring(plank, 1);
    b.line([add(p, d, -len / 2), add(p, d, len / 2)], 0.6, 0.8, 0.3);
  }
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * 2.2;
    const r0 = 30 + u * 40;
    const r1 = r0 + 20 + rng() * 50 * u;
    b.line([P(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0), P(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1)], 1.2, 0.9 * (1 - u * 0.5), 1);
  }
  for (let i = 0; i < 24; i++) b.dot(at.x + (rng() - 0.5) * 220 * u, at.y + 40 - rng() * 160 * u, 1 + rng() * 1.6, 0.85);
}

function blueCard(): Card {
  const main = bake(FULL, 71, (b, f) => {
    sky(b, 0, PW, 0, 330, [{ x: 300, y: 110, w: 280, h: 60 }]);
    sea(Burin.make(b.ctx, 507 + f), 0, PW, 330, PH);
    b.clipped([P(0, 0), P(PW, 0), P(PW, 548), P(0, 548)], () => blueWhale(b, 260, 520, 760, -1));
    foam(b, 640, 548, 760);
  });
  return { draw: (c, boil) => put(c, main, boil) };
}

// ---------------------------------------------------------------- the 1977 photo

/** The Zuiyō Maru's catch on the crane, as a faded, grainy press photo (built once): soft sea, sharper carcass, grain and dust. */
function buildPhoto(): HTMLCanvasElement {
  const W = Math.round(PW * RES);
  const H = Math.round(PH * RES);
  const out = makeCanvas(W, H);
  const layer = (blur: number, draw: (c: CanvasRenderingContext2D) => void): void => {
    const l = makeCanvas(W, H);
    l.ctx.scale(RES, RES);
    draw(l.ctx);
    out.ctx.filter = `blur(${blur}px)`;
    out.ctx.drawImage(l.canvas, 0, 0);
    out.ctx.filter = 'none';
  };
  layer(4, photoBackground);
  layer(2.2, photoBoat);
  layer(1.6, (c) => {
    c.translate(0, -56);
    carcass(c);
  });
  layer(2.6, photoDeck);
  gradePhoto(out.ctx, W, H);
  return out.canvas;
}

function photoBackground(c: CanvasRenderingContext2D): void {
  const sky = c.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, '#7f817d');
  sky.addColorStop(1, '#cfd0c9');
  c.fillStyle = sky;
  c.fillRect(0, 0, PW, 330);
  c.filter = 'blur(26px)';
  for (const [x, y, rx, ry, col] of [[300, 120, 280, 60, '#a3a49f'], [900, 70, 320, 70, '#6f716d'], [620, 250, 380, 34, '#d9d9d2']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = 'none';
  const sea = c.createLinearGradient(0, 300, 0, PH);
  sea.addColorStop(0, '#797c78');
  sea.addColorStop(1, '#3c3f3d');
  c.fillStyle = sea;
  c.fillRect(0, 300, PW, PH - 300);
  const rng = createRng(77);
  for (let i = 0; i < 320; i++) {
    const y = 304 + Math.pow(rng(), 1.5) * 380;
    c.strokeStyle = rng() < 0.55 ? 'rgba(222,224,216,0.32)' : 'rgba(26,28,26,0.32)';
    c.lineWidth = 1 + (y - 300) / 90;
    const x = rng() * PW;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 20 + rng() * 90 * (1 + (y - 300) / 100), y + (rng() - 0.5) * 2);
    c.stroke();
  }
}

function photoBoat(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#474744';
  c.fillRect(960, 286, 260, 340);
  c.fillStyle = '#8f918c';
  c.fillRect(985, 328, 62, 52);
  c.fillRect(1065, 328, 62, 52);
  c.fillStyle = '#2c2b29';
  c.fillRect(948, 274, 272, 18);
  // The derrick: a post, a lattice boom, wires.
  c.beginPath();
  c.moveTo(864, PH);
  c.lineTo(896, PH);
  c.lineTo(889, 52);
  c.lineTo(871, 52);
  c.fill();
  c.strokeStyle = '#2b2a28';
  c.lineCap = 'round';
  for (const off of [-7, 7]) {
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(878 + off, 548);
    c.lineTo(470 + off * 0.4, 96);
    c.stroke();
  }
  c.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const u = i / 12;
    const a = P(lerp(871, 467, u), lerp(548, 96, u));
    const b2 = P(lerp(885, 473, u + 1 / 12), lerp(548, 96, u + 1 / 12));
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b2.x, b2.y);
    c.stroke();
  }
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(880, 54);
  c.lineTo(470, 96);
  c.moveTo(472, 98);
  c.lineTo(500, 140);
  c.stroke();
}

function carcass(c: CanvasRenderingContext2D): void {
  const rng = createRng(1977);
  // Ropes from the hook, down each side and under the mass.
  c.strokeStyle = '#2b2926';
  c.lineCap = 'round';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(500, 196);
  c.lineTo(478, 236);
  c.moveTo(500, 196);
  c.lineTo(548, 228);
  c.stroke();
  // The hanging mass: lumpy, sagging, two flaps hanging off it like ruined flippers.
  const mass = spline(pts([470, 236, 520, 222, 580, 240, 628, 284, 660, 340, 676, 404, 662, 452, 640, 470, 620, 500, 584, 520, 540, 512, 504, 520, 470, 498, 452, 452, 440, 392, 444, 320, 452, 270]), 6, true);
  const g = c.createLinearGradient(440, 240, 690, 520);
  g.addColorStop(0, '#efebe0');
  g.addColorStop(0.35, '#cdc8bb');
  g.addColorStop(1, '#5c574e');
  c.fillStyle = g;
  trace(c, mass);
  c.fill();
  c.save();
  trace(c, mass);
  c.clip();
  const shade = c.createRadialGradient(640, 470, 10, 640, 470, 200);
  shade.addColorStop(0, 'rgba(50,46,40,0.55)');
  shade.addColorStop(1, 'rgba(50,46,40,0)');
  c.fillStyle = shade;
  c.fillRect(400, 200, 320, 340);
  c.filter = 'blur(5px)';
  for (let i = 0; i < 30; i++) {
    const dark = rng() < 0.5;
    c.fillStyle = dark ? 'rgba(80,74,66,0.45)' : 'rgba(248,244,236,0.5)';
    c.beginPath();
    c.ellipse(450 + rng() * 220, 240 + rng() * 270, 6 + rng() * 26, 5 + rng() * 18, rng() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = 'none';
  // Sagging folds of skin across it, and a few strings of flesh.
  for (let i = 0; i < 22; i++) {
    const y = 250 + rng() * 230;
    const x = 440 + rng() * 150;
    const len = 50 + rng() * 120;
    const sag = 8 + rng() * 20;
    c.strokeStyle = `rgba(60,55,48,${0.15 + rng() * 0.22})`;
    c.lineWidth = 1.5 + rng() * 3;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len / 2, y + sag, x + len, y - sag * 0.3);
    c.stroke();
    c.strokeStyle = `rgba(248,244,236,${0.2 + rng() * 0.25})`;
    c.lineWidth = 1 + rng() * 2;
    c.beginPath();
    c.moveTo(x, y - 4);
    c.quadraticCurveTo(x + len / 2, y + sag - 4, x + len, y - sag * 0.3 - 4);
    c.stroke();
  }
  for (let i = 0; i < 50; i++) {
    const x = 450 + rng() * 220;
    const y = 300 + rng() * 160;
    c.strokeStyle = `rgba(240,236,226,${0.2 + rng() * 0.3})`;
    c.lineWidth = 0.7 + rng() * 1.4;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (rng() - 0.5) * 16, y + 30, x + (rng() - 0.5) * 20, y + 40 + rng() * 50);
    c.stroke();
  }
  c.restore();
  for (const [x, y, dx, dy] of [[452, 420, -50, 70], [656, 440, 40, 80]] as const) {
    c.fillStyle = '#b9b4a8';
    c.beginPath();
    c.moveTo(x, y - 20);
    c.quadraticCurveTo(x + dx * 1.2, y + dy * 0.2, x + dx, y + dy);
    c.quadraticCurveTo(x + dx * 0.4, y + dy * 0.8, x + 8 * Math.sign(-dx), y + 24);
    c.fill();
  }
  // The long "neck", slumped down over the rail to a small "head".
  const neck = spline(pts([486, 500, 452, 556, 414, 610, 374, 652, 336, 684, 306, 700]), 8);
  const tan = tangents(neck);
  const side = (k: number): Pt[] => neck.map((p, i) => add(p, P(-tan[i]!.y, tan[i]!.x), k * lerp(30, 12, i / (neck.length - 1))));
  const ng = c.createLinearGradient(330, 600, 380, 560);
  ng.addColorStop(0, '#8f8a7f');
  ng.addColorStop(1, '#d8d4c8');
  c.fillStyle = ng;
  trace(c, [...side(1), ...side(-1).reverse()]);
  c.fill();
  c.fillStyle = '#a7a296';
  c.beginPath();
  c.ellipse(300, 704, 22, 13, -0.3, 0, Math.PI * 2);
  c.fill();
  // Ragged fibres hanging off its underside.
  for (let i = 0; i < 90; i++) {
    const onNeck = i > 60;
    const at = onNeck ? neck[Math.floor(rng() * neck.length)]! : mass[Math.floor(mass.length * (0.3 + rng() * 0.38))]!;
    const len = 14 + rng() * (onNeck ? 34 : 70);
    c.strokeStyle = rng() < 0.65 ? `rgba(236,232,220,${0.35 + rng() * 0.4})` : 'rgba(96,90,82,0.5)';
    c.lineWidth = 0.8 + rng() * 2;
    c.beginPath();
    c.moveTo(at.x, at.y - 4);
    c.quadraticCurveTo(at.x + (rng() - 0.5) * 16, at.y + len * 0.6, at.x + (rng() - 0.5) * 24, at.y + len);
    c.stroke();
  }
}

function photoDeck(c: CanvasRenderingContext2D): void {
  c.fillStyle = '#3b3a37';
  c.beginPath();
  c.moveTo(0, 646);
  c.lineTo(PW, 592);
  c.lineTo(PW, 622);
  c.lineTo(0, 680);
  c.fill();
  c.strokeStyle = '#8a8983';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 647);
  c.lineTo(PW, 593);
  c.stroke();
  c.fillStyle = '#292826';
  c.beginPath();
  c.moveTo(0, 680);
  c.lineTo(PW, 622);
  c.lineTo(PW, PH);
  c.lineTo(0, PH);
  c.fill();
  c.strokeStyle = 'rgba(120,118,112,0.45)';
  c.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(i * 150 - 100, PH);
    c.lineTo(i * 140 + 40, 668 - i * 6);
    c.stroke();
  }
  // Two fishermen looking up at it.
  for (const [x, h] of [[752, 190], [676, 166]] as const) {
    const y = 652;
    c.fillStyle = '#22211f';
    c.beginPath();
    c.moveTo(x - h * 0.15, y);
    c.lineTo(x - h * 0.17, y - h * 0.68);
    c.quadraticCurveTo(x, y - h * 0.78, x + h * 0.17, y - h * 0.7);
    c.lineTo(x + h * 0.15, y);
    c.fill();
    c.beginPath();
    c.ellipse(x - h * 0.02, y - h * 0.82, h * 0.085, h * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(x - h * 0.02, y - h * 0.9, h * 0.12, h * 0.035, -0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6e6d68';
    c.fillRect(x - h * 0.1, y - h * 0.6, h * 0.04, h * 0.4);
  }
}

/** Faded, warm-grey tones, film grain, a vignette, dust and scratches. */
function gradePhoto(c: CanvasRenderingContext2D, W: number, H: number): void {
  const img = c.getImageData(0, 0, W, H);
  const d = img.data;
  const rng = createRng(1978);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dx = x / W - 0.5;
      const dy = y / H - 0.5;
      const vig = 1 - 0.55 * (dx * dx + dy * dy) * 1.6;
      const l = (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!) / 255;
      const v = clamp01((0.16 + 0.72 * l + (rng() - 0.5) * 0.13) * vig);
      d[i] = lerp(52, 238, v);
      d[i + 1] = lerp(44, 226, v);
      d[i + 2] = lerp(34, 200, v);
    }
  }
  c.putImageData(img, 0, 0);
  c.strokeStyle = 'rgba(245,240,226,0.5)';
  c.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const x = rng() * W;
    c.beginPath();
    c.moveTo(x, 0);
    c.quadraticCurveTo(x + (rng() - 0.5) * 80, H / 2, x + (rng() - 0.5) * 60, H * (0.4 + rng() * 0.6));
    c.stroke();
  }
  for (let i = 0; i < 70; i++) {
    c.fillStyle = rng() < 0.7 ? 'rgba(248,244,232,0.8)' : 'rgba(30,24,16,0.6)';
    c.beginPath();
    c.arc(rng() * W, rng() * H, 0.6 + rng() * 2.2, 0, Math.PI * 2);
    c.fill();
  }
}

// ---------------------------------------------------------------- parchment

/** One big sheet of aged parchment: blotches, fibres, speckle, foxing, a water stain and a fold. */
function buildParchment(W: number, H: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = createRng(seed);
  ctx.fillStyle = '#e4cf9f';
  ctx.fillRect(0, 0, W, H);
  const blob = (x: number, y: number, r: number, col: string): void => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 0; i < 40; i++) blob(rng() * W, rng() * H, 120 + rng() * 320, rng() < 0.5 ? `rgba(244,230,192,${0.12 + rng() * 0.12})` : `rgba(170,130,74,${0.05 + rng() * 0.06})`);
  for (let i = 0; i < 160; i++) blob(rng() * W, rng() * H, 14 + rng() * 50, rng() < 0.5 ? `rgba(248,236,204,${0.1 + rng() * 0.12})` : `rgba(160,118,64,${0.05 + rng() * 0.07})`);
  for (let i = 0; i < 2200; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const a = rng() * Math.PI;
    const len = 4 + rng() * 26;
    ctx.strokeStyle = rng() < 0.5 ? `rgba(120,86,40,${0.05 + rng() * 0.08})` : `rgba(255,248,226,${0.12 + rng() * 0.12})`;
    ctx.lineWidth = 0.6 + rng() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = `rgba(90,60,26,${0.08 + rng() * 0.22})`;
    ctx.fillRect(rng() * W, rng() * H, 0.8 + rng() * 1.2, 0.8 + rng() * 1.2);
  }
  for (let i = 0; i < 46; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 2 + rng() * 12;
    blob(x, y, r * 2.4, 'rgba(150,96,40,0.18)');
    blob(x, y, r, 'rgba(120,70,24,0.35)');
  }
  for (let i = 0; i < 3; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = 70 + rng() * 120;
    ctx.save();
    ctx.filter = 'blur(3px)';
    ctx.strokeStyle = 'rgba(140,100,50,0.22)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.8 + rng() * 0.3), rng(), 0.2, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
  }
  const fy = H * (0.45 + rng() * 0.1);
  ctx.fillStyle = 'rgba(130,92,44,0.16)';
  ctx.fillRect(0, fy, W, 3);
  ctx.fillStyle = 'rgba(255,248,226,0.35)';
  ctx.fillRect(0, fy + 3, W, 3);
  return canvas;
}

/** Draws an image over a box, cropped to fill it. */
function drawCover(c: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** A sheet's ragged edge (the same every frame). */
function deckle(w: number, h: number, seed: number, amp: number): Pt[] {
  const rng = createRng(seed);
  const out: Pt[] = [];
  const side = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number): void => {
    const n = Math.max(8, Math.round(Math.hypot(bx - ax, by - ay) / 7));
    let wander = 0;
    for (let i = 0; i < n; i++) {
      wander = wander * 0.8 + (rng() - 0.5) * amp;
      const nick = rng() < 0.02 ? amp * 2.5 : 0;
      const u = i / n;
      const off = Math.abs(wander) + nick;
      out.push(P(lerp(ax, bx, u) + nx * off, lerp(ay, by, u) + ny * off));
    }
  };
  side(0, 0, w, 0, 0, 1);
  side(w, 0, w, h, -1, 0);
  side(w, h, 0, h, 0, -1);
  side(0, h, 0, 0, 1, 0);
  return out;
}

/** Darker towards the edges, as old paper browns. */
function vignette(c: CanvasRenderingContext2D, w: number, h: number, strength = 1): void {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.translate(w / 2, h / 2);
  c.scale(w / 2, h / 2);
  const g = c.createRadialGradient(0, 0, 0.5, 0, 0, 1.45);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, `rgba(196,160,110,${0.3 * strength})`);
  g.addColorStop(1, `rgba(112,72,32,${0.9 * strength})`);
  c.fillStyle = g;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
}

/** The engraved border: a heavy rule, a band of alternating scale cells, a hairline. Returns the inner box. */
function frame(c: CanvasRenderingContext2D, w: number, h: number): Box {
  const s = Math.min(w, h);
  const m = s * 0.045;
  const band = s * 0.018;
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.strokeStyle = SEPIA;
  c.fillStyle = SEPIA;
  c.lineWidth = s * 0.0045;
  c.strokeRect(m, m, w - 2 * m, h - 2 * m);
  c.lineWidth = s * 0.0016;
  c.strokeRect(m + band, m + band, w - 2 * (m + band), h - 2 * (m + band));
  const cell = band * 2.4;
  c.globalAlpha = 0.85;
  for (let x = m + band, i = 0; x < w - m - band - 1; x += cell, i++) {
    if (i % 2) continue;
    const cw = Math.min(cell, w - m - band - x);
    c.fillRect(x, m, cw, band * 0.5);
    c.fillRect(x, h - m - band * 0.5, cw, band * 0.5);
  }
  for (let y = m + band, i = 0; y < h - m - band - 1; y += cell, i++) {
    if (i % 2) continue;
    const ch = Math.min(cell, h - m - band - y);
    c.fillRect(m, y, band * 0.5, ch);
    c.fillRect(w - m - band * 0.5, y, band * 0.5, ch);
  }
  c.globalAlpha = 1;
  const inset = m + band + s * 0.012;
  c.lineWidth = s * 0.0012;
  c.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
  c.restore();
  return { x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset };
}

// ---------------------------------------------------------------- the stamp

const stamps = new Map<string, HTMLCanvasElement>();

/** The rubber stamp's impression: a double ring box and the word, the ink worn in specks and streaks, lighter where it pressed less. */
function stampCanvas(text: string): HTMLCanvasElement {
  const hit = stamps.get(text);
  if (hit) return hit;
  const size = 160;
  const probe = makeCanvas(4, 4).ctx;
  probe.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = Math.ceil(probe.measureText(text).width + size * 1.0);
  const h = Math.ceil(size * 1.3);
  const { canvas, ctx: c } = makeCanvas(w, h);
  c.strokeStyle = RED;
  c.fillStyle = RED;
  c.lineWidth = 14;
  c.beginPath();
  c.roundRect(9, 9, w - 18, h - 18, 24);
  c.stroke();
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(28, 28, w - 56, h - 56, 14);
  c.stroke();
  c.font = `700 ${size}px ${CAPTION_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, w / 2, h / 2 + size * 0.07);
  c.globalCompositeOperation = 'destination-out';
  const rng = createRng(text.length * 131 + 7);
  for (let i = 0; i < 520; i++) {
    c.globalAlpha = 0.4 + rng() * 0.6;
    c.beginPath();
    c.arc(rng() * w, rng() * h, 0.6 + rng() * 2.6, 0, Math.PI * 2);
    c.fill();
  }
  c.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    c.globalAlpha = 0.5 + rng() * 0.5;
    c.lineWidth = 1 + rng() * 2.5;
    const x = rng() * w;
    const y = rng() * h;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 20 + rng() * 60, y + (rng() - 0.5) * 8);
    c.stroke();
  }
  c.globalAlpha = 1;
  const g = c.createLinearGradient(0, 0, w, h * 0.4);
  g.addColorStop(0, 'rgba(0,0,0,0.05)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  stamps.set(text, canvas);
  return canvas;
}

/**
 * A red rubber stamp, `size` px wide, centred at (cx, cy): at progress 0..0.55
 * it comes down from 1.6x, turning, and lands; then a little squash. `onPaper`
 * multiplies the ink into the paper under it.
 */
export function drawStamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, _t: number, progress: number, text = 'REAL', onPaper = false): void {
  const p = clamp01(progress);
  if (p <= 0) return;
  const img = stampCanvas(text);
  const land = 0.55;
  const u = Math.min(1, p / land);
  const v = clamp01((p - land) / (1 - land));
  const scale = p < land ? 1.6 - 0.6 * u * u : 1 - 0.05 * Math.sin(Math.PI * v) * (1 - v);
  const k = (size / img.width) * scale;
  ctx.save();
  ctx.globalAlpha *= p < land ? 0.3 + 0.55 * u : 1;
  ctx.translate(cx, cy);
  ctx.rotate(lerp(-0.36, -0.2, smooth(u)));
  ctx.scale(k, k);
  if (onPaper && p >= land) ctx.globalCompositeOperation = 'multiply';
  else {
    ctx.shadowColor = 'rgba(40,20,10,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = p < land ? 18 * (1 - u) : 2;
  }
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

// ---------------------------------------------------------------- cards on paper

interface Art {
  readonly parchment: HTMLCanvasElement;
  readonly cards: ReadonlyMap<Legend, Card>;
  readonly photo: HTMLCanvasElement;
  readonly icons: ReadonlyMap<Legend, { readonly small: Layer; readonly large: Layer }>;
  readonly map: { readonly small: HTMLCanvasElement; readonly large: HTMLCanvasElement };
}

let art: Art | null = null;

const scratch = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  const s = makeCanvas(2, 2);
  s.ctx.imageSmoothingQuality = 'high';
  return s;
};
let SHEET: ReturnType<typeof scratch> | null = null;
let PIC: ReturnType<typeof scratch> | null = null;

function sized(s: ReturnType<typeof scratch>, w: number, h: number): CanvasRenderingContext2D {
  if (s.canvas.width !== w || s.canvas.height !== h) {
    s.canvas.width = w;
    s.canvas.height = h;
    s.ctx.imageSmoothingQuality = 'high';
  }
  s.ctx.setTransform(1, 0, 0, 1, 0, 0);
  s.ctx.globalCompositeOperation = 'source-over';
  s.ctx.globalAlpha = 1;
  s.ctx.clearRect(0, 0, w, h);
  return s.ctx;
}

const deviceScale = (ctx: CanvasRenderingContext2D): number => {
  const m = ctx.getTransform();
  return Math.max(0.05, Math.hypot(m.a, m.b));
};

const MAX_SCRATCH = 2600;

/** The engraving for one card, composed and cropped to fill w x h device px. */
function composePicture(a: Art, which: Legend, w: number, h: number, t: number, look: LegendLook): HTMLCanvasElement {
  PIC ??= scratch();
  const c = sized(PIC, w, h);
  const k = Math.max(w / PW, h / PH);
  c.setTransform(k, 0, 0, k, (w - PW * k) / 2, (h - PH * k) / 2);
  const boil = boilOf(t);
  a.cards.get(which)?.draw(c, boil, look, Burin.make(c, 9000 + boil * 37));
  return PIC.canvas;
}

/** The whole card (parchment, engraving, frame, banner, stamp) on the sheet scratch, w x h at device scale ds. */
function composeSheet(a: Art, which: Legend, w: number, h: number, ds: number, t: number, look: LegendLook): HTMLCanvasElement {
  SHEET ??= scratch();
  const k = Math.min(ds, MAX_SCRATCH / w, MAX_SCRATCH / h);
  const c = sized(SHEET, Math.ceil(w * k), Math.ceil(h * k));
  c.setTransform(k, 0, 0, k, 0, 0);
  if (which === 'carcass') photoSheet(a, c, w, h, k, t, look);
  else parchmentSheet(a, c, which, w, h, k, t, look);
  return SHEET.canvas;
}

function parchmentSheet(a: Art, c: CanvasRenderingContext2D, which: Legend, w: number, h: number, k: number, t: number, look: LegendLook): void {
  const s = Math.min(w, h);
  const edge = deckle(w, h, 7 + which.length, s * 0.006);
  c.save();
  pathOf(c, edge);
  c.clip();
  drawCover(c, a.parchment, 0, 0, w, h);
  // The engraving fills the frame's inside (see frame(): rule, scale band, hairline).
  const inner = { x: s * 0.075, y: s * 0.075, w: w - s * 0.15, h: h - s * 0.15 };
  const pic = composePicture(a, which, Math.max(2, Math.round(inner.w * k)), Math.max(2, Math.round(inner.h * k)), t, look);
  c.globalCompositeOperation = 'multiply';
  c.drawImage(pic, 0, 0, pic.width, pic.height, inner.x, inner.y, inner.w, inner.h);
  c.globalCompositeOperation = 'source-over';
  vignette(c, w, h);
  frame(c, w, h);
  const live = Burin.make(c, 4000 + boilOf(t) * 53);
  c.globalCompositeOperation = 'multiply';
  banner(live, CAPTIONS[which], w / 2, h - s * 0.15, s * 0.075);
  drawStamp(c, w * 0.7, h * 0.6, w * 0.34, t, look.stamp ?? 0, 'REAL', true);
  c.restore();
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.strokeStyle = 'rgba(110,70,30,0.35)';
  c.lineWidth = s * 0.006;
  trace(c, edge);
  c.stroke();
  c.restore();
}

/** The carcass card: a press print with a white border, a newspaper strip pasted across its foot. */
function photoSheet(a: Art, c: CanvasRenderingContext2D, w: number, h: number, _k: number, t: number, look: LegendLook): void {
  const s = Math.min(w, h);
  c.fillStyle = '#efe8d6';
  c.fillRect(0, 0, w, h);
  const yel = c.createLinearGradient(0, 0, w, h);
  yel.addColorStop(0, 'rgba(214,190,140,0.15)');
  yel.addColorStop(1, 'rgba(180,150,96,0.35)');
  c.fillStyle = yel;
  c.fillRect(0, 0, w, h);
  const m = s * 0.055;
  drawCover(c, a.photo, m, m, w - 2 * m, h - 2 * m);
  c.strokeStyle = 'rgba(60,50,36,0.35)';
  c.lineWidth = 1;
  c.strokeRect(m, m, w - 2 * m, h - 2 * m);
  vignette(c, w, h, 0.35);
  newspaperStrip(a, c, w, h);
  drawStamp(c, w * 0.7, h * 0.45, w * 0.34, t, look.stamp ?? 0, 'REAL', true);
}

function newspaperStrip(a: Art, c: CanvasRenderingContext2D, w: number, h: number): void {
  const sw = w * 0.86;
  const sh = h * 0.2;
  c.save();
  c.translate(w * 0.5, h * 0.865);
  c.rotate(-0.025);
  c.shadowColor = 'rgba(0,0,0,0.35)';
  c.shadowBlur = sh * 0.08;
  c.shadowOffsetY = sh * 0.03;
  c.fillStyle = '#e2d9c0';
  c.fillRect(-sw / 2, -sh / 2, sw, sh);
  c.shadowColor = 'transparent';
  c.globalAlpha = 0.5;
  c.globalCompositeOperation = 'multiply';
  drawCover(c, a.parchment, -sw / 2, -sh / 2, sw, sh);
  c.globalAlpha = 1;
  c.fillStyle = '#26211a';
  c.font = `700 ${sh * 0.13}px Georgia, 'Times New Roman', serif`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.fillText('25 JULY 1977', -sw * 0.46, -sh * 0.37);
  c.textAlign = 'right';
  c.fillText('LATE EDITION', sw * 0.46, -sh * 0.37);
  c.fillRect(-sw * 0.46, -sh * 0.27, sw * 0.92, Math.max(1, sh * 0.012));
  c.textAlign = 'center';
  let size = sh * 0.42;
  c.font = `900 ${size}px Georgia, 'Times New Roman', serif`;
  const tw = c.measureText('LIVING PLESIOSAUR?').width;
  if (tw > sw * 0.92) size *= (sw * 0.92) / tw;
  c.font = `900 ${size}px Georgia, 'Times New Roman', serif`;
  c.fillText('LIVING PLESIOSAUR?', 0, sh * 0.04);
  c.fillStyle = 'rgba(38,33,26,0.45)';
  for (let col = 0; col < 4; col++) {
    for (let r = 0; r < 2; r++) c.fillRect(-sw * 0.46 + col * sw * 0.235, sh * 0.3 + r * sh * 0.08, sw * (0.21 - (r === 1 && col % 2 ? 0.06 : 0)), sh * 0.03);
  }
  c.restore();
}

/** The rip down a card: a ragged line from top to bottom (the same every frame). */
function rip(w: number, h: number): Pt[] {
  const rng = createRng(4242);
  let x = w / 2;
  return range(60, (u) => {
    x += (rng() - 0.5) * w * 0.022 + (w / 2 - x) * 0.08;
    return P(x + (rng() - 0.5) * w * 0.006, u * h);
  });
}

function drawHalves(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, x: number, y: number, w: number, h: number, tear: number): void {
  const line = rip(w, h);
  const open = smooth(tear / 0.3);
  const apart = smooth((tear - 0.22) / 0.78);
  const fade = 1 - smooth((tear - 0.85) / 0.15);
  if (fade <= 0) return;
  for (const side of [-1, 1]) {
    const edgeX = side < 0 ? 0 : w;
    const half = [P(edgeX, 0), ...line, P(edgeX, h)];
    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.translate(x + w / 2 + side * w * 0.62 * apart, y + h + h * 0.1 * apart * apart);
    ctx.rotate(side * (0.025 * open + 0.15 * apart));
    ctx.translate(-w / 2, -h);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = Math.min(w, h) * 0.03;
    ctx.shadowOffsetY = Math.min(w, h) * 0.012;
    ctx.fillStyle = '#d9c497';
    pathOf(ctx, half);
    ctx.fill();
    ctx.restore();
    ctx.save();
    pathOf(ctx, half);
    ctx.clip();
    ctx.drawImage(sheet, 0, 0, w, h);
    ctx.strokeStyle = '#f6edd4';
    ctx.lineWidth = Math.min(w, h) * 0.014;
    trace(ctx, line, false);
    ctx.stroke();
    ctx.restore();
    fibres(ctx, line, side, Math.min(w, h));
    ctx.restore();
  }
}

/** Paper fibres standing out of a torn edge, towards the gap. */
function fibres(ctx: CanvasRenderingContext2D, line: readonly Pt[], side: number, s: number): void {
  const rng = createRng(77 + side);
  ctx.save();
  ctx.strokeStyle = 'rgba(246,238,214,0.9)';
  ctx.lineWidth = Math.max(0.6, s * 0.0015);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    for (let k = 0; k < 4; k++) {
      const u = rng();
      const p = P(lerp(a.x, b.x, u), lerp(a.y, b.y, u));
      const len = s * (0.004 + rng() * 0.012);
      const ang = (rng() - 0.5) * 1.6;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - side * Math.cos(ang) * len, p.y + Math.sin(ang) * len);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * One legend card filling the box (top left x, y): the old engraving on
 * parchment (the 1977 photo for 'carcass'), its banner, and whatever `look`
 * asks for: rising, the eye, the impact, the stamp, the tear.
 */
export function drawLegend(ctx: CanvasRenderingContext2D, which: Legend, x: number, y: number, w: number, h: number, t: number, look: LegendLook = {}): void {
  const alpha = look.alpha ?? 1;
  if (!art || alpha <= 0 || w < 4 || h < 4) return;
  const sheet = composeSheet(art, which, w, h, deviceScale(ctx), t, look);
  const tear = clamp01(look.tear ?? 0);
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (tear <= 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = Math.min(w, h) * 0.03;
    ctx.shadowOffsetY = Math.min(w, h) * 0.012;
    ctx.drawImage(sheet, x, y, w, h);
  } else drawHalves(ctx, sheet, x, y, w, h, tear);
  ctx.restore();
}

// ---------------------------------------------------------------- the map's little drawings

/** Icon units: each little drawing fills a 200 x 200 box. */
const ICON = 200;
const iconBox: Box = { x: 0, y: 0, w: ICON, h: ICON };

function waves(b: Burin, y: number, x0 = 20, x1 = 180): void {
  for (let r = 0; r < 3; r++) {
    for (let x = x0 + (r % 2) * 9; x < x1 - 10; x += 22) b.line(range(5, (u) => P(x + u * 16, y + r * 9 - Math.sin(Math.PI * u) * 3)), 1.2, 0.9, 1);
  }
}

const ICON_DRAW: Readonly<Record<Legend, (b: Burin) => void>> = {
  serpent: (b) => {
    waves(b, 160);
    const spine = spline(pts([70, 200, 68, 160, 74, 120, 94, 90, 116, 78]), 6);
    tube(b, spine, (u) => lerp(15, 11, u), { ink: 2.4, hatch: 5, weight: 1.1, long: [0.75], spikes: -1 });
    serpentHead(b, 112, 78, -0.15, 0.42, 0.9, false);
    foam(b, 70, 158, 50);
  },
  seaserpent: (b) => {
    waves(b, 150);
    for (const [xm, rx, ry, r] of [[78, 22, 36, 11], [122, 18, 28, 9], [158, 14, 20, 7]] as const) tube(b, archSpine(xm, 146, rx, ry), () => r, { ink: 2.2, hatch: 5, weight: 1, spikes: -1 });
    const spine = spline(pts([34, 170, 32, 130, 40, 96, 56, 78, 72, 72]), 6);
    tube(b, spine, (u) => lerp(12, 9, u), { ink: 2.2, hatch: 5, weight: 1, spikes: -1 });
    serpentHead(b, 70, 72, -0.1, 0.34, 1, true);
  },
  mermaid: (b) => {
    waves(b, 170);
    b.ctx.save();
    b.ctx.translate(100, 112);
    b.ctx.scale(0.36, 0.36);
    b.ctx.translate(-540, -480);
    mermaid(b.in(0.36));
    b.ctx.restore();
  },
  carcass: (b) => {
    const { ctx } = b;
    ctx.save();
    ctx.translate(100, 100);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#f1ebdc';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.fillRect(-78, -58, 156, 116);
    ctx.shadowColor = 'transparent';
    if (art) drawCover(ctx, art.photo, -70, -50, 140, 100);
    ctx.restore();
  },
  kraken: (b) => {
    waves(b, 160);
    ship(b, 104, 138, 44, -0.1, { flags: false });
    arm(b, pts([40, 200, 44, 140, 60, 90, 80, 64, 96, 60, 98, 74]), 12, 1);
    arm(b, pts([170, 200, 168, 140, 150, 104, 132, 100, 128, 114]), 11, -1);
    arm(b, pts([110, 210, 112, 160, 96, 132, 82, 130]), 9, 1);
  },
  island: (b) => ICON_DRAW.kraken(b),
  essex: (b) => {
    waves(b, 160);
    ship(b, 128, 132, 46, 0.06, { facing: -1, whaler: true, flags: false });
    spermWhale(b, 94, 104, 0.15, 150);
    b.ctx.save();
    b.ctx.translate(98, 116);
    b.ctx.scale(0.28, 0.28);
    splinters(b.in(0.28), P(0, 0), 0.7);
    b.ctx.restore();
  },
  blue: (b) => {
    waves(b, 150);
    blueWhale(b, 16, 128, 170, -1);
  },
};

function bakeIcon(which: Legend, seed: number, px: number, weight: number, gapMul: number): Layer {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(px, px);
    const k = px / ICON;
    ctx.scale(k, k);
    ICON_DRAW[which](new Burin(ctx, createRng(seed * 31 + f * 7), 0.5, 1 / k, weight, gapMul));
    return canvas;
  });
  return { frames, box: iconBox };
}

/**
 * The little drawing for a legend on the map, centred at (x, y), `size` px
 * square, with its own REAL stamp at `stamped` 0..1. Its ink multiplies (it's
 * meant for paper).
 */
export function drawMapIcon(ctx: CanvasRenderingContext2D, which: Legend, x: number, y: number, size: number, t: number, stamped: number, appear = 1): void {
  if (!art || appear <= 0) return;
  const set = art.icons.get(which);
  if (!set) return;
  const small = size * deviceScale(ctx) < 140;
  const img = (small ? set.small : set.large).frames[boilOf(t)]!;
  const pop = appear >= 1 ? 1 : 0.6 + 0.4 * appear + 0.25 * Math.sin(Math.PI * appear);
  const s = size * pop;
  ctx.save();
  ctx.globalAlpha *= clamp01(appear * 1.5);
  if (which !== 'carcass') ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
  ctx.restore();
  drawStamp(ctx, x + size * 0.28, y + size * 0.3, size * 0.5, t, stamped, 'REAL', true);
}

// ---------------------------------------------------------------- the monster map

const MW = 1400;
const MH = 1000;
const COMPASS = P(640, 520);
/** Where each legend sits on the map, and how big, in map units. */
const SPOTS: Readonly<Record<Legend, { readonly x: number; readonly y: number; readonly size: number }>> = {
  serpent: { x: 450, y: 240, size: 270 },
  seaserpent: { x: 830, y: 240, size: 290 },
  carcass: { x: 1150, y: 430, size: 230 },
  mermaid: { x: 390, y: 700, size: 270 },
  kraken: { x: 960, y: 620, size: 290 },
  island: { x: 960, y: 620, size: 290 },
  essex: { x: 1110, y: 850, size: 270 },
  blue: { x: 690, y: 870, size: 320 },
};

/** A coastline: control points made crinkly by midpoint displacement. */
function coast(control: readonly Pt[], seed: number, closed: boolean): Pt[] {
  const rng = createRng(seed);
  let p = [...control];
  for (let pass = 0; pass < 4; pass++) {
    const next: Pt[] = [];
    const n = closed ? p.length : p.length - 1;
    for (let i = 0; i < n; i++) {
      const a = p[i]!;
      const c = p[(i + 1) % p.length]!;
      const len = Math.hypot(c.x - a.x, c.y - a.y);
      const off = (rng() - 0.5) * len * 0.32;
      next.push(a, P((a.x + c.x) / 2 - ((c.y - a.y) / (len || 1)) * off, (a.y + c.y) / 2 + ((c.x - a.x) / (len || 1)) * off));
    }
    if (!closed) next.push(p[p.length - 1]!);
    p = next;
  }
  return p;
}

const LANDS: readonly Pt[][] = [
  coast(pts([-20, -20, 250, -20, 236, 60, 262, 122, 214, 182, 232, 242, 304, 290, 322, 332, 270, 362, 210, 420, 190, 500, 232, 560, 206, 640, 150, 700, 172, 780, 132, 860, 160, 940, 140, 1020, -20, 1020]), 11, true),
  coast(pts([980, 40, 1070, 18, 1180, 50, 1250, 36, 1302, 92, 1280, 152, 1200, 192, 1110, 176, 1030, 140, 990, 100]), 12, true),
  coast(pts([1420, 740, 1330, 784, 1292, 840, 1240, 880, 1226, 940, 1180, 1020, 1420, 1020]), 13, true),
  coast(pts([430, 870, 452, 858, 470, 874, 458, 892, 436, 890]), 14, true),
  coast(pts([1010, 296, 1030, 290, 1040, 306, 1022, 314]), 15, true),
];

/** The chart's ink (rhumb lines, water-lining, coasts, hills, compass rose, title) for a cache of `scale` px per map unit. */
function mapInk(c: CanvasRenderingContext2D, b: Burin, scale: number): void {
  // The portolan web, kept clear of the drawings and the rose.
  c.save();
  c.beginPath();
  c.rect(0, 0, MW, MH);
  for (const l of MAP_LEGENDS) {
    const s = SPOTS[l];
    c.moveTo(s.x + s.size * 0.5, s.y);
    c.ellipse(s.x, s.y, s.size * 0.5, s.size * 0.44, 0, 0, Math.PI * 2, true);
  }
  c.moveTo(COMPASS.x + 140, COMPASS.y);
  c.arc(COMPASS.x, COMPASS.y, 140, 0, Math.PI * 2, true);
  c.clip('evenodd');
  const origins = [COMPASS, ...range(15, (u) => P(COMPASS.x + Math.cos(u * Math.PI * 2) * 420, COMPASS.y + Math.sin(u * Math.PI * 2) * 420)).slice(0, 16)];
  origins.forEach((o, oi) => {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const main = i % 4 === 0;
      c.strokeStyle = main && oi % 2 === 0 ? RHUMB_RED : SEPIA;
      c.globalAlpha = main ? 0.5 : 0.3;
      c.lineWidth = (main ? 1 : 0.6) * b.weight;
      c.beginPath();
      c.moveTo(o.x, o.y);
      c.lineTo(o.x + Math.cos(a) * 2200, o.y + Math.sin(a) * 2200);
      c.stroke();
    }
  });
  c.globalAlpha = 1;
  c.restore();
  waterLining(c, b, scale);
  for (const land of LANDS) {
    const xs = land.map((p) => p.x);
    const ys = land.map((p) => p.y);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    b.white(land);
    b.stipple(land, area / 18, 0.9, 0.5, (p) => coastNear(land, p) * 0.8);
    hachures(b, land);
    b.ring(land, 2.4);
  }
  for (const [x, y] of [[80, 120], [130, 200], [70, 330], [120, 420], [60, 560], [90, 680], [60, 820], [1120, 90], [1190, 110], [1340, 900]] as const) hill(b, x, y, 26);
  for (const [x, y] of [[150, 260], [100, 500], [70, 760], [1060, 110]] as const) tree(b, x, y);
  compassRose(b, COMPASS.x, COMPASS.y, 120);
  b.ctx.globalCompositeOperation = 'source-over';
  banner(b, 'Here be monsters', 640, 74, 54);
}

/** Short strokes inland, square to the coast, darker at the shore: the shaded coast of an engraved chart. */
function hachures(b: Burin, land: readonly Pt[]): void {
  b.clipped(land, () => {
    for (let i = 2; i < land.length - 2; i += 2) {
      const a = land[i - 2]!;
      const c = land[i + 2]!;
      const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      const n = P(-(c.y - a.y) / len, (c.x - a.x) / len);
      const depth = 8 + b.r() * 10;
      for (const s of [1, -1]) b.line([land[i]!, add(land[i]!, n, s * depth)], 0.7, 0.55, 1);
    }
  });
}

function coastNear(land: readonly Pt[], p: Pt): number {
  let best = Infinity;
  for (let i = 0; i < land.length; i += 3) best = Math.min(best, Math.hypot(land[i]!.x - p.x, land[i]!.y - p.y));
  return clamp01(1 - best / 28);
}

/** Lines that follow the coast out to sea, wider spaced as they go (offset strokes, cut hollow). */
function waterLining(c: CanvasRenderingContext2D, b: Burin, scale: number): void {
  const tmp = makeCanvas(Math.round(MW * scale), Math.round(MH * scale));
  const t = tmp.ctx;
  t.scale(scale, scale);
  t.lineJoin = 'round';
  [54, 38, 25, 15, 7].forEach((d, j) => {
    const i = 4 - j;
    const lw = (1 - i * 0.12) * 0.9 * b.weight;
    for (const land of LANDS) {
      t.globalCompositeOperation = 'source-over';
      t.strokeStyle = SEPIA;
      t.globalAlpha = 0.75 - i * 0.12;
      t.lineWidth = d * 2 + lw;
      trace(t, land);
      t.stroke();
    }
    t.globalAlpha = 1;
    t.globalCompositeOperation = 'destination-out';
    for (const land of LANDS) {
      t.lineWidth = d * 2 - lw;
      trace(t, land);
      t.stroke();
    }
  });
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(tmp.canvas, 0, 0);
  c.restore();
}

function hill(b: Burin, x: number, y: number, s: number): void {
  const shape = [P(x - s, y), P(x - s * 0.2, y - s * 0.9), P(x + s * 0.1, y - s), P(x + s, y)];
  b.white(shape);
  b.hatch([P(x, y - s), P(x + s, y), P(x, y)], 3, 1.2, 0.7, 0.8);
  b.line(shape, 1.6, 1, 0.3);
}

function tree(b: Burin, x: number, y: number): void {
  b.line([P(x, y), P(x, y - 14)], 1.4, 1, 0.1);
  const crown = ellipsePts(x, y - 22, 9, 11, 14);
  b.white(crown);
  b.hatch(crown.map((p) => P(p.x + 5, p.y)), 2.4, 0.8, 0.6, 0.8);
  b.ring(crown.slice(0, -1), 1.3);
}

/** The compass rose: 16 points, each half inked and half paper, in two rings of ticks, a fleur-de-lis to the north. */
function compassRose(b: Burin, x: number, y: number, r: number): void {
  b.white(ellipsePts(x, y, r * 1.05, r * 1.05, 40));
  const ring1 = ellipsePts(x, y, r, r, 64);
  const ring2 = ellipsePts(x, y, r * 0.88, r * 0.88, 64);
  b.ring(ring1.slice(0, -1), 1.8);
  b.ring(ring2.slice(0, -1), 1);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    if (i % 2) continue;
    b.tone([P(x + Math.cos(a) * r, y + Math.sin(a) * r), P(x + Math.cos(a + 0.098) * r, y + Math.sin(a + 0.098) * r), P(x + Math.cos(a + 0.098) * r * 0.88, y + Math.sin(a + 0.098) * r * 0.88), P(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88)], 0.85);
  }
  const point = (a: number, len: number, wid: number): void => {
    const tip = P(x + Math.cos(a) * len, y + Math.sin(a) * len);
    const l = P(x + Math.cos(a - Math.PI / 2) * wid, y + Math.sin(a - Math.PI / 2) * wid);
    const rr = P(x + Math.cos(a + Math.PI / 2) * wid, y + Math.sin(a + Math.PI / 2) * wid);
    b.white([P(x, y), l, tip, rr]);
    b.tone([P(x, y), l, tip], 0.9);
    b.line([l, tip, rr], 1.2, 1, 0.2);
    b.line([P(x, y), tip], 0.7, 1, 0.2);
  };
  for (let i = 0; i < 8; i++) point(-Math.PI / 2 + Math.PI / 8 + (i * Math.PI) / 4, r * 0.55, r * 0.07);
  for (let i = 0; i < 4; i++) point(-Math.PI / 4 + (i * Math.PI) / 2, r * 0.78, r * 0.1);
  for (let i = 0; i < 4; i++) point(-Math.PI / 2 + (i * Math.PI) / 2, r * 1.2, r * 0.13);
  b.white(ellipsePts(x, y, r * 0.08, r * 0.08, 14));
  b.ring(ellipsePts(x, y, r * 0.08, r * 0.08, 14).slice(0, -1), 1);
  const fy = y - r * 1.26;
  const petal = (s: number): Pt[] => spline(pts([x, fy + 10, x + s * 4, fy - 4, x + s * 16, fy - 10, x + s * 14, fy + 2, x + s * 4, fy + 12]), 3, true);
  for (const s of [-1, 1]) {
    b.white(petal(s));
    b.ring(petal(s), 1.2);
  }
  const mid = spline(pts([x, fy - 26, x + 6, fy - 10, x + 3, fy + 10, x - 3, fy + 10, x - 6, fy - 10]), 3, true);
  b.white(mid);
  b.tone(mid, 0.8);
  b.ring(mid, 1.2);
  b.line([P(x - 9, fy + 12), P(x + 9, fy + 12)], 2, 1, 0.1);
}

function buildMap(scale: number, weight: number, gapMul: number): HTMLCanvasElement {
  const W = Math.round(MW * scale);
  const H = Math.round(MH * scale);
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.scale(scale, scale);
  const edge = deckle(MW, MH, 1539, 6);
  ctx.save();
  pathOf(ctx, edge);
  ctx.clip();
  if (art) drawCover(ctx, art.parchment, 0, 0, MW, MH);
  const ink = makeCanvas(W, H);
  ink.ctx.scale(scale, scale);
  mapInk(ink.ctx, new Burin(ink.ctx, createRng(1539), 0.5, 1, weight, gapMul), scale);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(ink.canvas, 0, 0);
  ctx.restore();
  vignette(ctx, MW, MH);
  frame(ctx, MW, MH);
  ctx.restore();
  ctx.strokeStyle = 'rgba(110,70,30,0.4)';
  ctx.lineWidth = 4;
  trace(ctx, edge);
  ctx.stroke();
  return canvas;
}

/**
 * The monster map: the old chart fitted inside the box (MAP_ASPECT), each
 * legend's drawing shown once it has an entry in `stamped` (or `shown` > 0),
 * with its REAL stamp at that level.
 */
export function drawMonsterMap(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number,
  stamped: Readonly<Partial<Record<Legend, number>>>, shown: Readonly<Partial<Record<Legend, number>>> = {},
): void {
  if (!art) return;
  const mw = Math.min(w, h * MAP_ASPECT);
  const mh = mw / MAP_ASPECT;
  const mx = x + (w - mw) / 2;
  const my = y + (h - mh) / 2;
  const small = mw * deviceScale(ctx) < 1000;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = mw * 0.03;
  ctx.shadowOffsetY = mw * 0.012;
  ctx.drawImage(small ? art.map.small : art.map.large, mx, my, mw, mh);
  ctx.restore();
  const k = mw / MW;
  for (const l of MAP_LEGENDS) {
    const appear = shown[l] ?? (l in stamped ? 1 : 0);
    if (appear <= 0) continue;
    const s = SPOTS[l];
    drawMapIcon(ctx, l, mx + s.x * k, my + s.y * k, s.size * k, t, stamped[l] ?? 0, appear);
  }
}

// ---------------------------------------------------------------- prepare

export async function prepare(): Promise<void> {
  if (art) return;
  const parchment = buildParchment(1800, 1200, 1752);
  const photo = buildPhoto();
  art = { parchment, photo, cards: new Map(), icons: new Map(), map: { small: parchment, large: parchment } };
  const cards = new Map<Legend, Card>([
    ['serpent', serpentCard()], ['seaserpent', seaserpentCard()], ['mermaid', mermaidCard()], ['kraken', krakenCard()],
    ['island', islandCard()], ['essex', essexCard()], ['blue', blueCard()],
  ]);
  const icons = new Map<Legend, { small: Layer; large: Layer }>();
  for (const l of [...MAP_LEGENDS, 'island' as const]) icons.set(l, { small: bakeIcon(l, l.length * 17, 160, 2, 2.2), large: bakeIcon(l, l.length * 17, 400, 1, 1) });
  art = { ...art, cards, icons };
  art = { ...art, map: { small: buildMap(0.6, 3, 2), large: buildMap(1.4, 1, 1) } };
}

// ---------------------------------------------------------------- the kit

/** The kit's 10 s cycle: rise, the eye, the impact, the stamp, then the tear. */
function kitLook(t: number): LegendLook {
  const p = t % 10;
  return { rise: smooth(p / 2.2), eye: smooth((p - 2) / 1.5), impact: clamp01(p / 3), stamp: clamp01((p - 4) / 0.35), tear: clamp01((p - 6.5) / 3) };
}

function kitGrid(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const items: readonly (Legend | 'map')[] = [...LEGENDS, 'map'];
  const cols = 4;
  const cw = w / cols;
  const ch = h / 2;
  items.forEach((it, i) => {
    const bx = (i % cols) * cw;
    const by = Math.floor(i / cols) * ch;
    if (it === 'map') {
      const p = t % 10;
      const stamped = Object.fromEntries(MAP_LEGENDS.map((l, j) => [l, clamp01((p - 1 - j * 0.6) / 0.35)]));
      drawMonsterMap(ctx, bx + 10, by + 10, cw - 20, ch - 20, t, stamped);
      return;
    }
    const cardW = Math.min(cw - 24, (ch - 24) * LEGEND_ASPECT);
    const cardH = cardW / LEGEND_ASPECT;
    drawLegend(ctx, it, bx + (cw - cardW) / 2, by + (ch - cardH) / 2, cardW, cardH, t, kitLook(t));
  });
}

/** From 10 s on, one at a time, big: each card for 2 s (the stamp lands at 1.5 s), then the map full size, then the corner map at video size. */
function kitShowcase(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const idx = Math.floor((t - 10) / 2) % (LEGENDS.length + 3);
  const p = (t - 10) % 2;
  const look: LegendLook = { rise: 1, eye: p < 1 ? 0.4 : 1, impact: p < 1 ? 0.85 : 1, stamp: p >= 1.5 ? 1 : 0 };
  const all = Object.fromEntries(MAP_LEGENDS.map((l) => [l, p >= 1 ? 1 : 0]));
  if (idx < LEGENDS.length) {
    const cw = Math.min(w - 40, (h - 40) * LEGEND_ASPECT);
    drawLegend(ctx, LEGENDS[idx]!, (w - cw) / 2, (h - cw / LEGEND_ASPECT) / 2, cw, cw / LEGEND_ASPECT, t, look);
  } else if (idx === LEGENDS.length) drawMonsterMap(ctx, 20, 20, w - 40, h - 40, t, all);
  else if (idx === LEGENDS.length + 1) {
    drawLegend(ctx, 'kraken', w * 0.04, h * 0.2, w * 0.5, w * 0.5 / LEGEND_ASPECT, t, look);
    drawMonsterMap(ctx, w - 420 * (w / 1920) - 30, 30, 420 * (w / 1920), 300 * (w / 1920), t, all);
  } else drawLegend(ctx, 'blue', (w - 900) / 2, (h - 600) / 2, 900, 600, t, look);
}

export const KIT: KitEntry = {
  name: 'legends',
  draw: (ctx, w, h, t) => (t < 10 ? kitGrid(ctx, w, h, t) : kitShowcase(ctx, w, h, t)),
};
