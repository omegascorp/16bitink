import { createRng } from '../logic/rng';
import type { MapRegion } from '../scenes/map/layout';
import { inkLines } from './atlas';
import { groundWashes, Layer, type Plan, regionSpan, regionWeight } from './atlasPlace';
import { blob, glow, type Rng, trace, wash } from './atlasWash';
import { BASALT, BASALT_DARK, BASALT_LIGHT, EMBER, EMBER_LIGHT, GOLD, INK } from './palette';
import { ellipse, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The Volcano Shrine's band of the Ink Atlas, painted once its chapter is
 * built: scorched ground washed in ash, rust and soot, ranges of dark
 * peaks hatched on their shaded faces, fields of cracked black basalt
 * with embers in the cracks, a lava river pouring from a volcano at the
 * band's top and cooling to a black fan above the jungle, groves of
 * charred trees, steam vents and cinder rocks; and at its foot the
 * volcano itself with the shrine in front.
 */

const LAVA = '#e8722c';
const CHAR = '#3b3036';
const PAGE = '#efe3c3';
/** The ranges' rock: a warm violet grey, paler than the shrine's basalt. */
const STONE = '#8a7f8c';
const STONE_DARK = '#4d4456';
const ASHES = ['#8d8590', '#7f7470', '#a07862', '#6a5f66', '#958a80', '#8a7062'] as const;

/** The lava river's course: down the right of the band, x by y. */
export function lavaX(y: number): number {
  return 850 + Math.sin(y / 150) * 34 + Math.sin(y / 61) * 8;
}

/** Where the lava river rises (under its volcano) and where it ends in its cooled fan. */
function lavaSpan(r: MapRegion): { srcY: number; endY: number } {
  return { srcY: r.top + 190, endY: r.bottom + 30 };
}

/** Clear of the lava river, its volcano and its fan. */
export function lavaKeepOut(r: MapRegion): (x: number, y: number, gap: number) => boolean {
  const { srcY, endY } = lavaSpan(r);
  return (x, y, gap) => {
    if (Math.hypot(x - lavaX(endY), (y - endY - 26) * 1.4) < 90 + gap * 0.5) return false;
    if (Math.hypot(x - lavaX(srcY), (y - srcY) * 1.2) < 110 + gap * 0.5) return false;
    return y < srcY - 140 || y > endY + 90 || Math.abs(x - lavaX(y)) > gap;
  };
}


export function planVolcano(plan: Plan, r: MapRegion): void {
  const { layout, clear } = plan;
  const span = regionSpan(layout, r);
  const rng = createRng(500 + r.index);
  const weight = (y: number): number => regionWeight(layout, r, y);
  const { srcY, endY } = lavaSpan(r);
  const offLava = lavaKeepOut(r);
  // Scorched ground: ash, rust and soot washed all over.
  groundWashes(plan, r, ASHES, 0.13, rng, 0.1);
  plan.add(Layer.Water, srcY, srcY - 30, endY + 110, (ctx, seed) => lavaRiver(ctx, new Pen(ctx, seed, 0.5), createRng(seed), srcY, endY));
  plan.add(Layer.Standing, srcY + 18, srcY - 330, srcY + 30, (ctx, seed) => {
    const pen = new Pen(ctx, seed, 0.5);
    const rr = createRng(seed);
    mountain(ctx, pen, lavaX(srcY) - 6, srcY + 18, 92, 118, rr, 'crater');
  });
  // Fields of black basalt, cracked, embers glowing in the cracks.
  for (let i = 0; i < 14; i++) {
    const x = 50 + rng() * (layout.width - 100);
    const y = span.top + rng() * (span.bottom - span.top);
    const w = 55 + rng() * 60;
    const h = 22 + rng() * 22;
    if (rng() > weight(y) || !clear.trail(x, y, w + 20) || !clear.ruin(x, y, 150 + w) || !offLava(x, y, w + 50)) continue;
    plan.add(Layer.Detail, y, y - h - 6, y + h + 6, (ctx, seed) => basaltField(ctx, new Pen(ctx, seed, 0.4), x, y, w, h, createRng(seed)));
  }
  // Ranges of peaks: a few each, the far ones first.
  for (let i = 0; i < 22; i++) {
    const side = i % 3 === 2 ? rng() : i % 2 ? rng() * 0.25 : 0.62 + rng() * 0.2;
    const cx = 40 + side * (layout.width - 80);
    const cy = span.top + 80 + rng() * (span.bottom - span.top - 80);
    if (rng() > weight(cy) * 1.1) continue;
    const peaks = 2 + Math.floor(rng() * 4);
    const placed: number[] = [];
    for (let k = 0; k < peaks; k++) {
      const w = 26 + rng() * 26;
      const h = w * (0.9 + rng() * 0.6);
      const px = cx + (k - (peaks - 1) / 2) * w * 1.1 + (rng() - 0.5) * 14;
      const py = cy + (rng() - 0.5) * 26 + (k % 2) * 10;
      if (!clear.ok(px, py, w * 0.85, h, 24) || !offLava(px, py, w + 40)) continue;
      const smoking = rng() < 0.18 ? 'smoke' : 'plain';
      plan.add(Layer.Standing, py, py - h - (smoking === 'smoke' ? 70 : 6), py + 8, (ctx, seed) => mountain(ctx, new Pen(ctx, seed, 0.5), px, py, w, h, createRng(seed), smoking));
      placed.push(px);
    }
    if (placed.length > 1) {
      // Foothills: a stony glaze the range stands in.
      const fx = (Math.min(...placed) + Math.max(...placed)) / 2;
      const fw = (Math.max(...placed) - Math.min(...placed)) / 2 + 60;
      plan.add(Layer.Detail, cy, cy - 40, cy + 40, (ctx, seed) => {
        const g = createRng(seed);
        wash(ctx, g, blob(g, fx, cy + 4, fw, 26, 10, 0.4), STONE, 0.2, 2, 0.3);
      });
    }
  }
  // Groves of charred trees; towards the jungle a few still have leaves.
  for (let i = 0; i < 18; i++) {
    const cx = 40 + rng() * (layout.width - 80);
    const cy = span.top + rng() * (span.bottom - span.top);
    if (rng() > weight(cy)) continue;
    const n = 3 + Math.floor(rng() * 5);
    for (let k = 0; k < n; k++) {
      const x = cx + gaussish(rng) * 40;
      const y = cy + gaussish(rng) * 22;
      const s = 11 + rng() * 9;
      if (!clear.ok(x, y, s * 0.6, s * 1.5, 30) || !offLava(x, y, 50)) continue;
      const leafy = y > r.bottom - 260 && rng() < 0.5;
      plan.add(Layer.Standing, y, y - s * 1.8, y + 4, (ctx, seed) => deadTree(new Pen(ctx, seed, 0.5), x, y, s, createRng(seed), leafy));
    }
  }
  // Steam vents, cinder rocks and lone dead trees between.
  for (let i = 0; i < 90; i++) {
    const x = 40 + rng() * (layout.width - 80);
    const y = span.top + rng() * (span.bottom - span.top);
    const roll = rng();
    if (rng() > weight(y) || !clear.ok(x, y, 12, 14, 40) || !offLava(x, y, 46)) continue;
    if (roll < 0.22) plan.add(Layer.Detail, y, y - 30, y + 4, (ctx, seed) => vent(ctx, new Pen(ctx, seed, 0.4), x, y));
    else if (roll < 0.75) plan.add(Layer.Standing, y, y - 14, y + 4, (ctx, seed) => rocks(ctx, new Pen(ctx, seed, 0.4), x, y, createRng(seed)));
    else plan.add(Layer.Detail, y, y - 6, y + 6, (ctx, seed) => cinders(new Pen(ctx, seed, 0.4), x, y, createRng(seed)));
  }
  // A stand of basalt columns.
  for (let tries = 0; tries < 30; tries++) {
    const x = 60 + rng() * (layout.width - 120);
    const y = r.top + 200 + rng() * (r.bottom - r.top - 500);
    if (!clear.ok(x, y, 50, 60, 30) || !offLava(x, y, 100)) continue;
    plan.add(Layer.Standing, y, y - 70, y + 10, (ctx, seed) => columns(ctx, new Pen(ctx, seed, 0.4), x, y, createRng(seed)));
    break;
  }
}

function gaussish(rng: Rng): number {
  return rng() + rng() - 1;
}

/** A ribbon of half-width `half(i)` along `pts`, as a polygon. */
function ribbon(pts: readonly Pt[], half: (i: number) => number, jag = 0, rng?: Rng): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = pts.length - 1;
  pts.forEach((p, i) => {
    const q = pts[Math.min(n, i + 1)]!;
    const o = pts[Math.max(0, i - 1)]!;
    const d = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    const nx = -(q.y - o.y) / d;
    const ny = (q.x - o.x) / d;
    const h = half(i);
    const jl = rng ? (rng() - 0.5) * jag : 0;
    const jr = rng ? (rng() - 0.5) * jag : 0;
    left.push({ x: p.x + nx * (h + jl), y: p.y + ny * (h + jl) });
    right.push({ x: p.x - nx * (h + jr), y: p.y - ny * (h + jr) });
  });
  return [...left, ...right.reverse()];
}

/**
 * The lava river: a heat haze on the page, a jagged crust of black rock
 * along both banks, the molten channel with broken streaks of white-hot
 * core, crust plates riding on it, and at its foot a fan of cooled black
 * rock still glowing in its cracks.
 */
function lavaRiver(ctx: CanvasRenderingContext2D, pen: Pen, rng: Rng, from: number, to: number): void {
  const pts: Pt[] = [];
  for (let y = from; y <= to; y += 10) pts.push({ x: lavaX(y), y });
  const n = pts.length - 1;
  if (n < 4) return;
  const [p1, p2] = [rng() * 6, rng() * 6];
  const width = (i: number): number => {
    const t = i / n;
    return Math.min(1, 0.35 + t * 6) * Math.min(1, (1 - t) * 4 + 0.2) * (0.8 + 0.3 * Math.sin(t * 11 + p1) + 0.12 * Math.sin(t * 31 + p2));
  };
  // Scorched banks, then the heat haze.
  ctx.fillStyle = rgba(CHAR, 0.16);
  trace(ctx, ribbon(pts, (i) => 34 * width(i) + 10, 14, rng));
  ctx.fill();
  for (let i = 0; i <= n; i += 4) glow(ctx, pts[i]!.x + (rng() - 0.5) * 10, pts[i]!.y, 40 + width(i) * 30, EMBER, 0.06);
  // The cooled fan at the foot.
  const foot = pts[n]!;
  const fan = blob(rng, foot.x - 6, foot.y + 26, 70, 40, 12, 0.35);
  wash(ctx, rng, fan, CHAR, 0.55, 2, 0.4);
  crackle(ctx, pen, fan, foot.x - 6, foot.y + 26, 70, 40, rng, 0.25);
  ctx.fillStyle = rgba(CHAR, 0.85);
  trace(ctx, ribbon(pts, (i) => 16 * width(i) + 3, 3.5, rng));
  ctx.fill();
  ctx.fillStyle = rgba(LAVA, 0.95);
  trace(ctx, ribbon(pts, (i) => 10 * width(i), 1.2, rng));
  ctx.fill();
  // White-hot core, in broken streaks.
  let run: Pt[] = [];
  const flush = (): void => {
    if (run.length > 2) {
      const seg = run;
      ctx.fillStyle = rgba(EMBER_LIGHT, 0.9);
      trace(ctx, ribbon(seg, (i) => 3.6 * Math.sin((Math.PI * (i + 0.5)) / seg.length)));
      ctx.fill();
      ctx.fillStyle = rgba('#fff1b8', 0.8);
      trace(ctx, ribbon(seg, (i) => 1.4 * Math.sin((Math.PI * (i + 0.5)) / seg.length)));
      ctx.fill();
    }
    run = [];
  };
  for (let i = 0; i <= n; i++) {
    if (Math.sin(i * 0.37 + p1 * 3) + Math.sin(i * 0.11 + p2) > -0.2 && width(i) > 0.5) run.push({ x: pts[i]!.x + Math.sin(i * 0.5) * 2, y: pts[i]!.y });
    else flush();
  }
  flush();
  // Crust plates riding on it, rimmed with glow.
  for (let i = 5; i < n - 3; i += 6 + Math.floor(rng() * 9)) {
    const p = pts[i]!;
    const w = width(i);
    const side = rng() < 0.5 ? -1 : 1;
    const plate = blob(rng, p.x + side * (3 + rng() * 4) * w, p.y, (2 + rng() * 3) * w, 1.5 + rng() * 1.5, 7, 0.6);
    pen.fill(plate, mix(CHAR, LAVA, 0.15), 0.8);
    pen.hair([...plate, plate[0]!], 0.6, EMBER_LIGHT, 0.45);
  }
  // Ink along the banks, broken, and hatching in the lee of the right bank.
  for (const side of [-1, 1]) {
    let seg: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const p = pts[i]!;
      seg.push({ x: p.x + side * (16 * width(i) + 4), y: p.y });
      if (seg.length > 6 + ((i * 7) % 9) || i === n) {
        if (rng() < 0.75) pen.hair(seg, 1.1, INK, 0.65);
        seg = [];
      }
    }
  }
  for (let i = 4; i < n - 2; i += 2) {
    const p = pts[i]!;
    const x = p.x + 16 * width(i) + 8;
    pen.hair([{ x, y: p.y - 3 }, { x: x + 6, y: p.y + 4 }], 0.8, INK, 0.35);
  }
  // Steam over the fan.
  for (let k = 0; k < 3; k++) glow(ctx, foot.x - 30 + k * 30, foot.y + 6 - k * 6, 18, '#ffffff', 0.5);
}

/** Cracks over dark rock, some still glowing: a jittered grid joined up, clipped to the shape. */
function crackle(ctx: CanvasRenderingContext2D, pen: Pen, clip: readonly Pt[], cx: number, cy: number, w: number, h: number, rng: Rng, hot: number): void {
  const step = 13;
  const cols = Math.ceil((w * 2) / step) + 1;
  const rows = Math.ceil((h * 2) / step) + 1;
  const at: Pt[][] = [];
  for (let j = 0; j < rows; j++) {
    const row: Pt[] = [];
    for (let i = 0; i < cols; i++) row.push({ x: cx - w + i * step + (rng() - 0.5) * step * 0.8, y: cy - h + j * step + (rng() - 0.5) * step * 0.8 });
    at.push(row);
  }
  pen.clipped(clip, () => {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p = at[j]![i]!;
        for (const q of [at[j]![i + 1], at[j + 1]?.[i]]) {
          if (!q || rng() < 0.25) continue;
          if (rng() < hot) {
            ctx.save();
            ctx.strokeStyle = rgba(EMBER, 0.35);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            trace(ctx, [p, q], false);
            ctx.stroke();
            ctx.restore();
            pen.hair([p, q], 1, EMBER_LIGHT, 0.9);
          } else pen.hair([p, q], 0.8, mix(BASALT_DARK, '#000000', 0.3), 0.7);
        }
      }
    }
  });
}

/** A field of black basalt: a sooty glaze, cracked, with a few embers. */
function basaltField(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: Rng): void {
  const shape = blob(rng, x, y, w, h * 0.7, 11, 0.45);
  wash(ctx, rng, shape, CHAR, 0.6, 2, 0.5);
  crackle(ctx, pen, shape, x, y, w, h * 0.7, rng, 0.12);
  for (let k = 0; k < 3; k++) glow(ctx, x + (rng() - 0.5) * w, y + (rng() - 0.5) * h, 10, EMBER, 0.18);
}

/**
 * A peak: a ragged silhouette, a spur from the summit splitting the lit
 * face from the shaded one, the shade hatched down the slope, gullies on
 * the lit face. 'crater' makes it the river's volcano, 'smoke' a smoking one.
 */
function mountain(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: Rng, kind: 'plain' | 'smoke' | 'crater'): void {
  const crater = kind === 'crater';
  const peak = { x: x + (rng() - 0.5) * w * 0.25, y: y - h };
  const lip = crater ? w * 0.18 : 0;
  const side = (from: Pt, to: Pt, k: number): Pt[] =>
    Array.from({ length: k + 1 }, (_, i) => {
      const t = i / k;
      const bump = i === 0 || i === k ? 0 : (rng() - 0.5) * w * 0.12;
      // Concave slopes: steep near the top, spreading at the foot.
      const e = crater ? Math.pow(t, 1.5) : Math.pow(t, 1.25);
      return { x: from.x + (to.x - from.x) * t + bump * 0.5, y: from.y + (to.y - from.y) * e + bump };
    });
  const lt = { x: peak.x - lip, y: peak.y + (crater ? 4 : 0) };
  const rt = { x: peak.x + lip, y: peak.y + (crater ? 6 : 0) };
  const left = side({ x: x - w, y }, lt, 6);
  const right = side(rt, { x: x + w, y }, 6);
  // Right slope: from the summit down, so ease the other way.
  for (let i = 1; i < right.length - 1; i++) {
    const t = i / (right.length - 1);
    right[i] = { x: rt.x + (x + w - rt.x) * t + (rng() - 0.5) * w * 0.05, y: rt.y + (y - rt.y) * (1 - Math.pow(1 - t, 1.3)) + (rng() - 0.5) * w * 0.06 };
  }
  const sil = [...left, ...right];
  const spur = [rt, { x: peak.x + w * 0.16, y: y - h * 0.6 }, { x: peak.x + w * 0.1 + (rng() - 0.5) * 6, y: y - h * 0.3 }, { x: x + w * 0.22, y }];
  const lit = [...left, ...spur];
  const shade = [...spur, ...[...right].reverse()];
  ctx.fillStyle = rgba('#2a2026', 0.18);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y + 2, w * 1.05, w * 0.12 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  const gl = ctx.createLinearGradient(x - w, y - h, x, y);
  gl.addColorStop(0, mix(STONE, PAGE, 0.62));
  gl.addColorStop(1, mix(STONE, PAGE, 0.3));
  ctx.fillStyle = gl;
  trace(ctx, lit);
  ctx.fill();
  const gs = ctx.createLinearGradient(x, y - h, x + w, y);
  gs.addColorStop(0, mix(STONE_DARK, PAGE, 0.2));
  gs.addColorStop(1, mix(STONE_DARK, PAGE, 0.05));
  ctx.fillStyle = gs;
  trace(ctx, shade);
  ctx.fill();
  pen.hatch(shade, 3, 1.15, 0.75, { color: BASALT_DARK, alpha: 0.6 });
  // Gullies down the lit face.
  for (let k = 0; k < 3; k++) {
    const t = 0.25 + k * 0.22;
    const top = left[Math.round(t * (left.length - 1))]!;
    pen.hair([{ x: top.x + 3, y: top.y + 3 }, { x: top.x + 2 + w * 0.08, y: top.y + h * 0.25 }, { x: top.x + w * 0.05, y: Math.min(y - 2, top.y + h * 0.42) }], 0.7, INK, 0.35);
  }
  pen.hair(sil, 1.2, INK, 0.8);
  pen.hair(spur, 0.8, INK, 0.45);
  if (crater) {
    glow(ctx, peak.x, peak.y + 2, 30, EMBER_LIGHT, 0.5);
    pen.fill(ellipse(peak.x, peak.y + 4, lip, 3.5, 12), mix(EMBER, '#3b1a14', 0.3), 1);
    pen.hair(ellipse(peak.x, peak.y + 4, lip, 3.5, 12), 0.9, INK, 0.8);
    // Lava spilling down the face towards the river below.
    for (const dx of [-0.3, 0.45]) {
      const run: Pt[] = [];
      for (let t = 0; t <= 1.0001; t += 0.125) run.push({ x: peak.x + dx * lip + Math.sin(t * 6 + dx * 9) * 3 + dx * t * w * 0.35, y: peak.y + 6 + t * (h - 10) });
      pen.stroke(run, 3.4, LAVA, 0.95, false);
      pen.hair(run, 1.1, EMBER_LIGHT, 0.9);
    }
  }
  if (crater || kind === 'smoke') plume(ctx, peak.x, peak.y, crater ? 1 : 0.45, rng);
}

/** A plume of smoke leaning right, warm at the vent and grey above. */
function plume(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rng: Rng): void {
  for (let k = 0; k < 7; k++) {
    const t = k / 6;
    const px = x + t * 60 * s + Math.sin(k * 1.7 + rng()) * 6 * s;
    const py = y - 12 - t * 140 * s;
    glow(ctx, px, py, (14 + t * 34) * s + 6, k < 2 ? '#8a5a54' : '#6d6672', 0.36 - t * 0.18);
  }
}

/** A charred tree: a bare trunk with a few crooked branches; `leafy` keeps a few tufts of green. */
function deadTree(pen: Pen, x: number, y: number, s: number, rng: Rng, leafy: boolean): void {
  const lean = (rng() - 0.5) * s * 0.3;
  pen.dot(x + 2, y + 1, s * 0.4, rgba('#2a2026', 0.15), 1);
  pen.stroke([{ x, y }, { x: x + lean * 0.5, y: y - s * 0.7 }, { x: x + lean, y: y - s * 1.4 }], 1.9, CHAR, 0.95, false);
  const tips: Pt[] = [];
  for (let k = 0; k < 3; k++) {
    const t = 0.45 + k * 0.2;
    const bx = x + lean * t;
    const by = y - s * 1.4 * t;
    const side = k % 2 ? 1 : -1;
    const tip = { x: bx + side * s * 0.45, y: by - s * 0.42 };
    pen.hair([{ x: bx, y: by }, { x: bx + side * s * 0.35, y: by - s * 0.25 }, tip], 1, CHAR, 0.9);
    tips.push(tip);
  }
  if (leafy) for (const t of tips) if (rng() < 0.7) pen.dot(t.x, t.y, 2.4 + rng() * 2, mix('#6f8a46', '#7a6a50', rng() * 0.5), 0.85);
  pen.hair([{ x: x - s * 0.5, y: y + 1 }, { x: x + s * 0.5, y: y + 1 }], 1, INK, 0.35);
}

/** A steam vent: a crack with a soft white puff over it. */
function vent(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number): void {
  pen.hair([{ x: x - 7, y }, { x: x - 2, y: y - 1 }, { x: x + 6, y: y + 1 }], 1.2, CHAR, 0.9);
  pen.dot(x, y - 0.5, 1.4, EMBER, 0.8);
  glow(ctx, x, y - 12, 13, '#ffffff', 0.6);
  glow(ctx, x + 4, y - 24, 10, '#ffffff', 0.4);
}

/** A scatter of cinders: little black flecks. */
function cinders(pen: Pen, x: number, y: number, rng: Rng): void {
  for (let k = 0; k < 7; k++) pen.dot(x + (rng() - 0.5) * 26, y + (rng() - 0.5) * 10, 0.8 + rng() * 1.1, CHAR, 0.7);
}

/** Two to four lumps of black rock, lit from the top left. */
function rocks(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, rng: Rng): void {
  const n = 2 + Math.floor(rng() * 3);
  ctx.fillStyle = rgba('#2a2026', 0.18);
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 1.5, 10 + n * 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < n; k++) {
    const rx = x + (k - (n - 1) / 2) * 9 + rng() * 4;
    const s = 4 + rng() * (k === 1 ? 8 : 5);
    const shape = [{ x: rx - s, y }, { x: rx - s * 0.7, y: y - s * 0.85 }, { x: rx + s * 0.1, y: y - s * 1.05 }, { x: rx + s * 0.8, y: y - s * 0.5 }, { x: rx + s, y }];
    const g = ctx.createLinearGradient(rx - s, y - s, rx + s, y);
    g.addColorStop(0, mix(BASALT_LIGHT, PAGE, 0.25));
    g.addColorStop(1, BASALT_DARK);
    ctx.fillStyle = g;
    trace(ctx, shape);
    ctx.fill();
    pen.hair(shape, 0.9, INK, 0.75);
  }
}

/** A stand of basalt columns: hexagonal pillars of different heights, lit tops, hatched fronts. */
function columns(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, rng: Rng): void {
  ctx.fillStyle = rgba('#2a2026', 0.2);
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 3, 52, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const cols: { x: number; y: number; h: number }[] = [];
  for (let row = 0; row < 2; row++) for (let k = 0; k < 5 - row; k++) cols.push({ x: x - 34 + k * 16 + row * 8, y: y - 8 + row * 8, h: 18 + rng() * 40 * (1 - Math.abs(k - 2) * 0.2) });
  cols.sort((a, b) => a.y - b.y);
  for (const c of cols) {
    const w = 8;
    const top = c.y - c.h;
    const front = [{ x: c.x - w, y: top }, { x: c.x + w, y: top }, { x: c.x + w, y: c.y }, { x: c.x - w, y: c.y }];
    const g = ctx.createLinearGradient(c.x - w, 0, c.x + w, 0);
    g.addColorStop(0, mix(BASALT_LIGHT, PAGE, 0.2));
    g.addColorStop(0.45, BASALT);
    g.addColorStop(1, BASALT_DARK);
    ctx.fillStyle = g;
    trace(ctx, front);
    ctx.fill();
    pen.hatch([{ x: c.x + 1, y: top }, { x: c.x + w, y: top }, { x: c.x + w, y: c.y }, { x: c.x + 1, y: c.y }], 2.4, Math.PI / 2, 0.6, { color: '#000000', alpha: 0.35 });
    const cap = [{ x: c.x - w, y: top }, { x: c.x - w * 0.5, y: top - 3.5 }, { x: c.x + w * 0.5, y: top - 3.5 }, { x: c.x + w, y: top }, { x: c.x + w * 0.5, y: top + 3.5 }, { x: c.x - w * 0.5, y: top + 3.5 }];
    pen.fill(cap, mix(BASALT_LIGHT, PAGE, 0.45), 1);
    inkLines(ctx, cap, 0.9, true);
    inkLines(ctx, [{ x: c.x - w, y: top }, { x: c.x - w, y: c.y }], 1, false);
    inkLines(ctx, [{ x: c.x + w, y: top }, { x: c.x + w, y: c.y }], 1, false);
  }
}

/**
 * The Volcano Shrine, painted: the smoking volcano behind, lava running
 * down its flanks from a glowing crater, and in front the shrine, a dark
 * colonnaded hall under a horned roof with its fire bowl lit.
 */
export function paintVolcanoShrine(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt): void {
  const { x, y } = at;
  const base = y + 60;
  ctx.fillStyle = rgba('#2a2026', 0.22);
  ctx.beginPath();
  ctx.ellipse(x, base + 2, 150, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // The plume, behind everything.
  for (let k = 0; k < 7; k++) {
    const t = k / 6;
    const px = x + 6 + t * 70 + Math.sin(k * 1.6) * 8;
    const py = y - 110 - t * 120;
    const r = 22 + t * 36;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rgba(k < 2 ? '#8a5a54' : '#6d6672', 0.45 - t * 0.2));
    g.addColorStop(1, rgba('#6d6672', 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // The cone: lit on the left, a glowing notch of a crater on top.
  const cone = [{ x: x - 150, y: base }, { x: x - 34, y: y - 96 }, { x: x - 14, y: y - 90 }, { x: x + 8, y: y - 98 }, { x: x + 34, y: y - 94 }, { x: x + 150, y: base }];
  const g = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
  g.addColorStop(0, mix(BASALT_LIGHT, '#ffffff', 0.2));
  g.addColorStop(0.5, BASALT);
  g.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  cone.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hatch([cone[3]!, cone[4]!, cone[5]!, { x: x + 40, y: base }], 4, 1.1, 0.6, { color: INK, alpha: 0.3 });
  const crater = ctx.createRadialGradient(x - 3, y - 94, 0, x - 3, y - 94, 34);
  crater.addColorStop(0, rgba(EMBER_LIGHT, 0.85));
  crater.addColorStop(1, rgba(EMBER, 0));
  ctx.fillStyle = crater;
  ctx.fillRect(x - 40, y - 130, 74, 70);
  // Lava running down the flanks.
  for (const [dx, sway] of [[-10, -1], [14, 1]] as const) {
    const run: Pt[] = [];
    for (let t = 0; t <= 1.0001; t += 0.1) run.push({ x: x + dx + sway * t * 60 + Math.sin(t * 7) * 5, y: y - 92 + t * 110 });
    pen.stroke(run, 4, LAVA, 0.95, false);
    pen.hair(run, 1.2, EMBER_LIGHT, 0.9);
  }
  inkLines(ctx, cone, 1.6, false);
  // The shrine in front: a plinth, the pillared hall glowing inside, the horned roof.
  const sa = x - 70;
  const sb = x + 70;
  const plinth = [{ x: sa - 10, y: base }, { x: sa - 10, y: base - 8 }, { x: sb + 10, y: base - 8 }, { x: sb + 10, y: base }];
  pen.fill(plinth, BASALT, 1);
  inkLines(ctx, plinth, 1.4, true);
  const top = base - 34;
  const glow = ctx.createLinearGradient(0, top, 0, base - 8);
  glow.addColorStop(0, '#1d1218');
  glow.addColorStop(1, mix(EMBER, '#2a1418', 0.4));
  ctx.fillStyle = glow;
  ctx.fillRect(sa, top, sb - sa, base - 8 - top);
  for (let k = 0; k <= 4; k++) {
    const px = sa + ((sb - sa) * k) / 4;
    const col = [{ x: px - 4, y: base - 8 }, { x: px - 4, y: top }, { x: px + 4, y: top }, { x: px + 4, y: base - 8 }];
    pen.fill(col, mix(BASALT, BASALT_LIGHT, 0.4), 1);
    inkLines(ctx, col, 1, true);
  }
  const eave = top - 2;
  const roof = [{ x: sa - 30, y: eave - 12 }, { x: sa - 18, y: eave }, { x: sa + 10, y: eave - 14 }, { x: sb - 10, y: eave - 14 }, { x: sb + 18, y: eave }, { x: sb + 30, y: eave - 12 }, { x: sb + 18, y: eave - 6 }, { x: sb - 6, y: eave - 22 }, { x: sa + 6, y: eave - 22 }, { x: sa - 18, y: eave - 6 }];
  const rg = ctx.createLinearGradient(0, eave - 22, 0, eave);
  rg.addColorStop(0, mix(BASALT, BASALT_LIGHT, 0.6));
  rg.addColorStop(1, BASALT_DARK);
  ctx.fillStyle = rg;
  ctx.beginPath();
  roof.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  for (let rx = sa; rx < sb; rx += 8) pen.hair([{ x: rx, y: eave - 20 }, { x: rx, y: eave - 4 }], 0.7, BASALT_DARK, 0.8);
  inkLines(ctx, roof, 1.5, true);
  // The fire bowl on the ridge, and a glint of gold in the hall: treasure inside.
  pen.fill([{ x: x - 7, y: eave - 22 }, { x: x - 3, y: eave - 34 }, { x: x + 1, y: eave - 28 }, { x: x + 3, y: eave - 38 }, { x: x + 7, y: eave - 22 }], LAVA, 1);
  pen.fill([{ x: x - 3, y: eave - 22 }, { x: x + 1, y: eave - 30 }, { x: x + 3, y: eave - 22 }], '#ffd25a', 1);
  pen.fill([{ x: x - 9, y: eave - 24 }, { x: x + 9, y: eave - 24 }, { x: x + 5, y: eave - 19 }, { x: x - 5, y: eave - 19 }], '#7a5233', 1);
  pen.dot(sa - 30, eave - 13, 1.8, GOLD);
  pen.dot(sb + 30, eave - 13, 1.8, GOLD);
  pen.dot(x, base - 14, 2.4, GOLD);
}
