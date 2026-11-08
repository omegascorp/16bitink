import { createRng, type Rng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { pathOf, withScratch, type Pt } from '../pen';
import { LIGHT, mix, rgba, SHADOW, soft as filterSoft } from '../sites/paintKit';

/**
 * The landscape painter's kit for the menu's paintings: smooth lines
 * through control points, layers glazed with haze for aerial perspective,
 * graded washes with pooled edges, form light and shadow for broad masses
 * (hills, cloud banks), painted clouds and the paper's grain.
 */

export { LIGHT, mix, rgba, SHADOW };

const unitPx = (ctx: CanvasRenderingContext2D): number => {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
};

/**
 * Runs `draw` with a soft edge of `r` units, through the canvas filter.
 * Filters cost a canvas-sized pass each, so an edge too fine to see (under
 * about 3 texture px) is simply drawn crisp.
 */
export function soft(ctx: CanvasRenderingContext2D, r: number, draw: () => void): void {
  if (r * unitPx(ctx) < 3) draw();
  else filterSoft(ctx, r, draw);
}

/**
 * A feathered fill (or stroke) of one flat colour, cheaply: the path is
 * built far off to the side and only its blurred shadow lands in place.
 * `build` only lays out the path; clipping and compositing still apply.
 */
export function softly(ctx: CanvasRenderingContext2D, r: number, color: string, alpha: number, build: (c: CanvasRenderingContext2D) => void, o: { readonly stroke?: number; readonly rule?: CanvasFillRule } = {}): void {
  const m = ctx.getTransform();
  const far = 50000;
  ctx.save();
  ctx.shadowColor = rgba(color, alpha);
  ctx.shadowBlur = Math.max(0, r * unitPx(ctx) * 2);
  ctx.shadowOffsetX = far * m.a;
  ctx.shadowOffsetY = far * m.b;
  ctx.translate(-far, 0);
  build(ctx);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  if (o.stroke) {
    ctx.lineWidth = o.stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  } else ctx.fill(o.rule ?? 'nonzero');
  ctx.restore();
}

/** A closed polygon added to the current path. */
export function ring(ctx: CanvasRenderingContext2D, shape: readonly Pt[], dx = 0, dy = 0): void {
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  ctx.closePath();
}

/** Catmull-Rom through the control points, resampled about every `step` units. */
export function through(points: readonly Pt[], step = 6): Pt[] {
  const n = points.length;
  if (n < 3) return [...points];
  const at = (i: number): Pt => points[Math.max(0, Math.min(n - 1, i))]!;
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const k = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  out.push(at(n - 1));
  return out;
}

/** A skyline from x0 to x1: gentle swells (sum of slow waves) plus a little noise, about `y` with `amp` rise. */
export function skyline(rng: Rng, x0: number, x1: number, y: number, amp: number, waves = 3, step = 8): Pt[] {
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU];
  const span = x1 - x0;
  const out: Pt[] = [];
  for (let x = x0; x <= x1 + 0.01; x += step) {
    const u = (x - x0) / span;
    const s = 0.6 * Math.sin(TAU * u * waves * 0.5 + ph[0]!) + 0.3 * Math.sin(TAU * u * waves * 1.3 + ph[1]!) + 0.1 * Math.sin(TAU * u * waves * 3.1 + ph[2]!);
    out.push(pt(x, y - amp * (0.5 + 0.5 * s) + (rng() - 0.5) * amp * 0.04));
  }
  return out;
}

/** A closed band: a top line, then straight down to `bottom` and back. */
export const bandBelow = (top: readonly Pt[], bottom: number): Pt[] => [...top, pt(top[top.length - 1]!.x, bottom), pt(top[0]!.x, bottom)];

/** Where a polyline (running left to right) crosses x: its y there. */
export function yAt(line: readonly Pt[], x: number): number {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / Math.max(1e-6, b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

export interface Haze {
  readonly color: string;
  /** Haze at the layer's far (upper) edge and at its near (lower) edge. */
  readonly far: number;
  readonly near: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * Paints `draw` on a spare layer with ctx's transform, lets `after` work
 * over what was painted (still in ctx's units), then lays the layer over ctx.
 */
export function onLayer(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, after?: (c: CanvasRenderingContext2D) => void): void {
  const m = ctx.getTransform();
  const { width, height } = ctx.canvas;
  withScratch(width, height, (s, canvas) => {
    s.setTransform(m);
    draw(s);
    if (after) {
      s.save();
      s.setTransform(m);
      after(s);
      s.restore();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}

/**
 * A building set into the evening at `x, y`, scaled by `s`: painted, then
 * sunk under a dusky glaze (`shade`), the side towards the sun kept warm.
 */
export function dusk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, shade: number, draw: (c: CanvasRenderingContext2D) => void): void {
  onLayer(ctx, (c) => {
    c.translate(x, y);
    c.scale(s, s);
    draw(c);
  }, (c) => {
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(x - 120 * s, 0, x + 120 * s, 0);
    g.addColorStop(0, rgba('#6a4028', shade * 0.6));
    g.addColorStop(1, rgba('#20182a', shade * 1.2));
    c.fillStyle = g;
    c.fillRect(x - 400, y - 400, 800, 500);
  });
}

/** Paints `draw` on a layer, glazes what it painted with haze (thicker towards the far edge: aerial perspective), and lays it over ctx. */
export function hazed(ctx: CanvasRenderingContext2D, haze: Haze, draw: (c: CanvasRenderingContext2D) => void): void {
  onLayer(ctx, draw, (s) => {
    s.globalCompositeOperation = 'source-atop';
    const g = s.createLinearGradient(0, haze.y0, 0, haze.y1);
    g.addColorStop(0, rgba(haze.color, haze.far));
    g.addColorStop(1, rgba(haze.color, haze.near));
    s.fillStyle = g;
    s.fillRect(-4000, -4000, 8000, 8000);
  });
}

/** A vertical graded wash inside a shape: `top` colour at y0 settling to `bottom` at y1. */
export function gradeFill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], y0: number, y1: number, stops: readonly (readonly [number, string])[], alpha = 1): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, rgba(c, alpha));
  ctx.save();
  ctx.fillStyle = g;
  pathOf(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/**
 * Form light for a broad mass: a warm glow on the faces turned up and left
 * (the shape minus itself moved down-right) and a cool core shadow on the
 * far side, each feathered by `blur`.
 */
export function modelForm(ctx: CanvasRenderingContext2D, shape: readonly Pt[], o: { readonly reach: number; readonly blur: number; readonly lit: string; readonly litAlpha: number; readonly shade: string; readonly shadeAlpha: number }): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  for (const [k, color, alpha] of [[1, o.lit, o.litAlpha], [-1, o.shade, o.shadeAlpha]] as const) {
    softly(ctx, o.blur, color, alpha, (c) => {
      c.beginPath();
      ring(c, shape);
      ring(c, shape, k * o.reach * 0.55, k * o.reach * 0.84);
    }, { rule: 'evenodd' });
  }
  ctx.restore();
}

/** Pigment pooled along a wash's edge: a feathered darker line just inside the shape. */
export function poolEdge(ctx: CanvasRenderingContext2D, shape: readonly Pt[], color: string, alpha: number, width: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  softly(ctx, width * 0.35, color, alpha, (c) => pathOf(c, shape), { stroke: width });
  ctx.restore();
}

/** A soft round bloom of colour (a wet-in-wet blot). */
export function bloomAt(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.5));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
}

type Box = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/**
 * Variegated wash: soft blooms of neighbouring tints dropped into a wet
 * shape, and a few cauliflower back-runs (a paler blot with a hard, darker
 * tide line) where water crept back into a drying wash.
 */
export function variegate(ctx: CanvasRenderingContext2D, rng: Rng, shape: readonly Pt[], tints: readonly string[], box: Box, alpha: number, backruns = 2): void {
  const span = Math.max(40, Math.min(box.x1 - box.x0, (box.y1 - box.y0) * 3));
  const count = Math.round(((box.x1 - box.x0) * (box.y1 - box.y0)) / (span * span * 0.04));
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  for (let i = 0; i < Math.min(90, count); i++) {
    const c = pt(box.x0 + rng() * (box.x1 - box.x0), box.y0 + rng() * (box.y1 - box.y0));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, 0.45);
    bloomAt(ctx, pt(0, 0), span * (0.08 + rng() * 0.14), tints[i % tints.length]!, alpha * (0.5 + rng()));
    ctx.restore();
  }
  for (let i = 0; i < backruns; i++) {
    const c = pt(box.x0 + rng() * (box.x1 - box.x0), box.y0 + rng() * (box.y1 - box.y0));
    const r = span * (0.03 + rng() * 0.04);
    const ring: Pt[] = Array.from({ length: 28 }, (_, k) => {
      const a = (k / 28) * TAU;
      const rr = r * (1 + 0.28 * Math.sin(a * 5 + c.x) + 0.18 * Math.sin(a * 9 + c.y) + (rng() - 0.5) * 0.2);
      return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.55);
    });
    soft(ctx, r * 0.15, () => {
      ctx.fillStyle = rgba(mix(tints[0]!, LIGHT, 0.35), 0.14);
      pathOf(ctx, ring);
      ctx.fill();
    });
    ctx.strokeStyle = rgba(mix(tints[0]!, SHADOW, 0.45), 0.16);
    ctx.lineWidth = 0.9;
    pathOf(ctx, ring);
    ctx.stroke();
  }
  ctx.restore();
}

/** A union of circles as one path (so a translucent fill never doubles where they overlap). */
function puffPath(ctx: CanvasRenderingContext2D, puffs: readonly Puff[], dx = 0, dy = 0, k = 1): void {
  ctx.beginPath();
  for (const p of puffs) {
    ctx.moveTo(p.x + dx + p.r * k, p.y + dy);
    ctx.arc(p.x + dx, p.y + dy, p.r * k, 0, TAU);
  }
}

interface Puff {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface CloudTone {
  readonly body: string;
  readonly lit: string;
  readonly shade: string;
  readonly alpha: number;
}

/**
 * A cumulus cloud as a watercolourist leaves it: the sky painted round
 * its crisp, sunlit tops (near-bare warm paper), the piled puffs each
 * turning a cool grey-violet on their lower right where the next one
 * shades it, the shade gathering towards a flat base that melts softly
 * into the sky.
 */
export function cloud(ctx: CanvasRenderingContext2D, rng: Rng, cx: number, cy: number, w: number, h: number, tone: CloudTone): void {
  const puffs: Puff[] = [];
  const n = Math.max(5, Math.round(w / (h * 0.45)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const hump = Math.sin(Math.PI * u) ** 0.8;
    const r = h * (0.2 + 0.34 * hump) * (0.75 + rng() * 0.5);
    puffs.push({ x: cx - w / 2 + w * u + (rng() - 0.5) * w * 0.06, y: cy - r * 0.5 - h * 0.3 * hump * (0.5 + rng() * 0.5), r });
  }
  for (let i = 0; i < n * 0.8; i++) {
    const u = 0.2 + rng() * 0.6;
    const hump = Math.sin(Math.PI * u);
    const r = h * (0.16 + rng() * 0.2);
    puffs.push({ x: cx - w / 2 + w * u, y: cy - h * (0.3 + 0.5 * hump * rng()), r });
  }
  puffs.sort((a, b) => a.y - b.y);
  const top = Math.min(...puffs.map((p) => p.y - p.r));
  onLayer(ctx, (c) => {
    // The sunlit body, its top edge crisp where the sky was painted round it.
    soft(c, 0.8, () => {
      c.fillStyle = rgba(tone.lit, tone.alpha);
      puffPath(c, puffs);
      c.fill();
    });
    c.save();
    c.globalCompositeOperation = 'source-atop';
    // Each puff turns from the light on its lower right: a soft cool core there.
    for (const p of puffs) {
      softly(c, p.r * 0.3, tone.body, 0.45, (cc) => {
        cc.beginPath();
        cc.arc(p.x + p.r * 0.42, p.y + p.r * 0.5, p.r * 0.78, 0, TAU);
      });
    }
    // The puffs in front cast a little shade along the edge of those behind.
    for (const p of puffs.filter((q) => q.r > h * 0.2)) {
      softly(c, 1.2, tone.body, 0.35, (cc) => {
        cc.beginPath();
        cc.arc(p.x, p.y, p.r * 0.98, -0.2, 1.9);
      }, { stroke: 1.4 });
    }
    const g = c.createLinearGradient(0, top + (cy - top) * 0.45, 0, cy);
    g.addColorStop(0, rgba(tone.shade, 0));
    g.addColorStop(1, rgba(tone.shade, 0.5));
    c.fillStyle = g;
    c.fillRect(cx - w, top - h, w * 2, h * 3);
    c.restore();
  }, (c) => {
    // The flat base melts away into the sky.
    const g = c.createLinearGradient(0, cy - h * 0.15, 0, cy + h * 0.1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = g;
    c.fillRect(cx - w, cy - h * 0.16, w * 2, h * 3);
  });
}

export interface MassTone {
  /** The billows' body, the deep shade away from the sun, the lit edge turned to it and the glow just inside that edge. */
  readonly body: string;
  readonly deep: string;
  readonly lit: string;
  readonly glow: string;
  readonly alpha: number;
}

/**
 * A towering cloud mass in a low sun, as an old master paints a storm
 * coming on at evening: billows piled into a dome, each a heavy grey-violet
 * turning darker away from the sun, its edge turned to the sun caught in
 * gold (brightest nearest it, `reach` the falloff), a glow sunk just inside
 * that edge; the underside gathering into dark shade, its base dissolving
 * raggedly into the sky.
 */
export function massCloud(ctx: CanvasRenderingContext2D, rng: Rng, cx: number, cy: number, w: number, h: number, tone: MassTone, sun: Pt, reach: number): void {
  const puffs: Puff[] = [];
  const n = Math.max(6, Math.round(w / (h * 0.32)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const hump = Math.sin(Math.PI * u) ** 0.7;
    const r = h * (0.13 + 0.3 * hump) * (0.7 + rng() * 0.6);
    puffs.push({ x: cx - w / 2 + w * u + (rng() - 0.5) * w * 0.05, y: cy - r * 0.35 - h * 0.5 * hump * (0.55 + rng() * 0.45), r });
  }
  for (let i = 0; i < n; i++) {
    const u = 0.06 + rng() * 0.88;
    const hump = Math.sin(Math.PI * u);
    const r = h * (0.12 + rng() * 0.18);
    puffs.push({ x: cx - w / 2 + w * u, y: cy - h * (0.05 + 0.75 * hump * rng()), r });
  }
  puffs.sort((a, b) => a.y - b.y);
  // Billows are never circles: each a lumpy, cauliflowered blob.
  const shapes = puffs.map((p) => lumpy(rng, p));
  const top = Math.min(...puffs.map((p) => p.y - p.r));
  const toSun = (x: number, y: number): { ux: number; uy: number; k: number } => {
    const dist = Math.hypot(sun.x - x, sun.y - y) || 1;
    return { ux: (sun.x - x) / dist, uy: (sun.y - y) / dist, k: Math.max(0.15, Math.min(1, 1.15 - dist / reach)) };
  };
  const all = (c: CanvasRenderingContext2D, dx = 0, dy = 0): void => {
    c.beginPath();
    for (const s of shapes) ring(c, s, dx, dy);
  };
  const whole = toSun(cx, cy - h * 0.4);
  onLayer(ctx, (c) => {
    soft(c, 1, () => {
      c.fillStyle = rgba(tone.body, tone.alpha);
      all(c);
      c.fill('nonzero');
    });
    c.save();
    c.globalCompositeOperation = 'source-atop';
    // The billows' forms: each sinks into shade on the side away from the sun and glows on the side towards it, softly, so they read as volume rather than outlines.
    for (const [i, p] of puffs.entries()) {
      const { ux, uy, k } = toSun(p.x, p.y);
      const low = Math.max(0, Math.min(1, (p.y - top) / Math.max(1, cy - top)));
      softly(c, p.r * 0.45, tone.deep, 0.3 + low * 0.35, (cc) => {
        cc.beginPath();
        cc.ellipse(p.x - ux * p.r * 0.45, p.y - uy * p.r * 0.45, p.r * 0.95, p.r * 0.8, 0, 0, TAU);
      });
      if (k > 0.25) softly(c, p.r * 0.35, tone.glow, 0.35 * k, (cc) => {
        cc.beginPath();
        cc.ellipse(p.x + ux * p.r * 0.45, p.y + uy * p.r * 0.45, p.r * 0.6, p.r * 0.5, 0, 0, TAU);
      });
      // A lit lip on the billow's sun side, feathered inwards.
      if (i % 2 === 0 || k > 0.6) {
        const off = p.r * 0.22;
        softly(c, p.r * 0.12, tone.lit, 0.4 * k * k, (cc) => {
          cc.beginPath();
          ring(cc, shapes[i]!);
          ring(cc, shapes[i]!, -ux * off, -uy * off);
        }, { rule: 'evenodd' });
      }
    }
    // The underside gathers into shadow.
    const g = c.createLinearGradient(0, top + (cy - top) * 0.45, 0, cy);
    g.addColorStop(0, rgba(tone.deep, 0));
    g.addColorStop(1, rgba(tone.deep, 0.5));
    c.fillStyle = g;
    c.fillRect(cx - w, top - h, w * 2, h * 3);
    c.restore();
    // The silver lining: the whole mass's edge turned to the sun caught in light, crisp outside, feathered within, brightest nearest the sun.
    onLayer(c, (l) => {
      l.fillStyle = tone.lit;
      all(l);
      l.fill('nonzero');
    }, (l) => {
      l.globalCompositeOperation = 'destination-out';
      const off = h * 0.05;
      soft(l, h * 0.02, () => {
        l.fillStyle = '#000';
        all(l, -whole.ux * off, -whole.uy * off);
        l.fill('nonzero');
      });
      l.globalCompositeOperation = 'destination-in';
      const fade = l.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, reach * 1.3);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0.12)');
      l.fillStyle = fade;
      l.fillRect(cx - w, top - h, w * 2, h * 3);
    });
  }, (c) => {
    // The base dissolves raggedly into the sky.
    const m = c.createLinearGradient(0, cy - h * 0.12, 0, cy + h * 0.12);
    m.addColorStop(0, 'rgba(0,0,0,0)');
    m.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = m;
    c.fillRect(cx - w, cy - h * 0.13, w * 2, h * 3);
  });
}

/** A billow's outline: a circle swelling into small cauliflower lobes, a little flattened. */
function lumpy(rng: Rng, p: Puff): Pt[] {
  const lobes = 5 + Math.floor(rng() * 4);
  const ph = rng() * TAU;
  const q = rng() * TAU;
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    const k = 0.9 + 0.1 * Math.abs(Math.sin((a * lobes) / 2 + ph)) ** 0.7 + 0.06 * Math.sin(a * 2 + q) + (rng() - 0.5) * 0.03;
    return pt(p.x + Math.cos(a) * p.r * k, p.y + Math.sin(a) * p.r * k * 0.88);
  });
}

/** A streak of high cloud: a long feathered wisp, lit along its top. */
export function wisp(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, tone: CloudTone, tilt = 0): void {
  const ell = (x: number, y: number, rx: number, ry: number) => (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.ellipse(cx + x, cy + y, rx, ry, tilt, 0, TAU);
  };
  softly(ctx, h * 0.6, tone.body, tone.alpha * 0.7, ell(0, 0, w / 2, h / 2));
  softly(ctx, h * 0.6, tone.lit, tone.alpha, ell(-w * 0.06, -h * 0.25, w * 0.4, h * 0.3));
}

let grainTile: HTMLCanvasElement | null = null;

/** A tile of paper tooth: soft mottling, a fine speckle and stray fibres, for multiplying over a finished painting. */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const size = 384;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas is not available');
  const rng = createRng(4242);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, size, size);
  // Mottling: the sizing in the paper took the wash unevenly.
  for (let i = 0; i < 60; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 10 + rng() * 40;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]] as const) bloomAt(g, pt(x + dx, y + dy), r, '#e9e2d4', 0.35);
  }
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const k = rng() ** 4 * 46;
    img.data[i] = img.data[i]! - k;
    img.data[i + 1] = img.data[i + 1]! - k;
    img.data[i + 2] = img.data[i + 2]! - k * 1.15;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const a = rng() * TAU;
    const l = 3 + rng() * 9;
    g.strokeStyle = rgba(rng() < 0.5 ? '#cfc6b4' : '#ffffff', 0.5);
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  grainTile = c;
  return c;
}

/** Multiplies the paper's tooth over the whole canvas at `alpha`. */
export function paperGrain(ctx: CanvasRenderingContext2D, alpha: number): void {
  const pattern = ctx.createPattern(grain(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Short brush marks scattered over a shape: dry-brush texture in a few tints, leaning `angle`. */
export function brushwork(ctx: CanvasRenderingContext2D, rng: Rng, shape: readonly Pt[], count: number, box: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }, tints: readonly string[], o: { readonly len: number; readonly width: number; readonly alpha: number; readonly angle: number }): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = box.x0 + rng() * (box.x1 - box.x0);
    const y = box.y0 + rng() * (box.y1 - box.y0);
    const a = o.angle + (rng() - 0.5) * 0.5;
    const l = o.len * (0.5 + rng());
    ctx.strokeStyle = rgba(tints[i % tints.length]!, o.alpha * (0.5 + rng() * 0.5));
    ctx.lineWidth = o.width * (0.6 + rng() * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 - l * 0.08, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}
