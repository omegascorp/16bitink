import { INK, Pen } from '../../../src/art/pen';
import { BODY_W, cycles, JAW_GAPE, JAW_LEN, JAW_SHUT, type Pt, type Worm } from './story';

/**
 * The bobbit worm, painted in the game's ink: a long segmented body with an
 * oily purple-bronze-green sheen that slides along it, a ruff of bristly
 * lobes down each side, a rounded head, five ringed antennae, and two pairs
 * of glossy dark scissor jaws, serrated on the inside, that swing open
 * sideways and cross shut. Everything is drawn in scene px; `size` scales
 * the whole worm (1 for the night close-ups).
 */

type Rgb = readonly [number, number, number];
/** The body: dark aubergine shading into old bronze along its length. */
const AUBERGINE: Rgb = [58, 30, 60];
const BRONZE: Rgb = [100, 66, 38];
/** The oil-film sheen, only where the light catches it: teal, violet, gold. */
const IRIS: readonly Rgb[] = [[64, 150, 140], [146, 96, 190], [196, 156, 82]];
const SHADE: Rgb = [12, 7, 14];
const mix = (a: Rgb, b: Rgb, u: number): Rgb => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const rgba = (c: Rgb, alpha = 1): string => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;

/** The body's colour at a point along it: aubergine to bronze, slowly. */
function sheen(along: number, t: number): Rgb {
  return mix(AUBERGINE, BRONZE, 0.5 + 0.5 * Math.sin(along * 0.16 - cycles(1, t)));
}
/** The sheen in the highlight, sliding along the body. */
function iris(along: number, t: number): Rgb {
  const h = (((along * 0.09 - cycles(2, t) / (2 * Math.PI)) % 1) + 1) % 1 * IRIS.length;
  const i = Math.floor(h);
  return mix(IRIS[i]!, IRIS[(i + 1) % IRIS.length]!, h - i);
}

const add = (p: Pt, d: Pt, s: number): Pt => ({ x: p.x + d.x * s, y: p.y + d.y * s });
const rot = (p: Pt, a: number): Pt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
/** The way the head points: up, leaning by `axis`. */
export const dirOf = (axis: number): Pt => ({ x: Math.sin(axis), y: -Math.cos(axis) });

/** The body's centre line, from `below` px under the hole up to the head: straight up out of the hole, bending to the head's lean. */
export function bodyLine(worm: Worm, hole: Pt, below: number, size: number): Pt[] {
  const rise = hole.y - worm.head.y;
  const d = dirOf(worm.axis);
  const p0 = { x: hole.x, y: hole.y + below };
  const p1 = { x: hole.x, y: hole.y - rise * 0.45 };
  const p2 = add(worm.head, d, -Math.max(60 * size, Math.abs(rise) * 0.4));
  const p3 = worm.head;
  return Array.from({ length: 41 }, (_, i) => {
    const u = i / 40;
    const a = (1 - u) ** 3;
    const b = 3 * u * (1 - u) ** 2;
    const c = 3 * u * u * (1 - u);
    const e = u ** 3;
    // A slight S along the body, so it reads as a soft animal, not a post.
    const bend = BODY_W * size * 0.16 * Math.min(1, Math.abs(rise) / (4 * BODY_W * size)) * Math.sin(u * 5.2 + 0.4) * 4 * u * (1 - u);
    return { x: a * p0.x + b * p1.x + c * p2.x + e * p3.x + bend, y: a * p0.y + b * p1.y + c * p2.y + e * p3.y };
  });
}

interface Ring {
  readonly c: Pt;
  /** Unit normal, to the body's left as it runs tail to head. */
  readonly n: Pt;
  readonly w: number;
}

/** Rings every `step` px along a centre line, tail to head; the last ring sits on the head. */
function ringsOf(line: readonly Pt[], width: number, step: number, taper: number): Ring[] {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1]! + Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y));
  const total = cum[cum.length - 1]!;
  const count = Math.max(2, Math.round(total / step));
  const at = (s: number): { p: Pt; tg: Pt } => {
    let i = 1;
    while (i < cum.length - 1 && cum[i]! < s) i++;
    const a = line[i - 1]!;
    const b = line[i]!;
    const seg = Math.max(1e-6, cum[i]! - cum[i - 1]!);
    const u = Math.max(0, Math.min(1, (s - cum[i - 1]!) / seg));
    return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, tg: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg } };
  };
  return Array.from({ length: count + 1 }, (_, i) => {
    const s = total - (count - i) * (total / count);
    const { p, tg } = at(s);
    const len = Math.hypot(tg.x, tg.y) || 1;
    // Slightly narrower towards the head.
    const w = width * (1 - taper * Math.max(0, (i - count + 6) / 6));
    return { c: p, n: { x: tg.y / len, y: -tg.x / len }, w };
  });
}

/**
 * The segmented body along a centre line (tail first, head last): each
 * segment shaded round (dark on the left, the sheen, a wet highlight and a
 * thin rim of light on the right, where the lamp is), a fleshy bristled lobe
 * on each side of every segment, a ring between segments, hatching in the
 * shadow, and an inked outline.
 */
export function drawBody(ctx: CanvasRenderingContext2D, line: readonly Pt[], size: number, t: number, boil: number, seed = 0): void {
  const width = BODY_W * size;
  const rings = ringsOf(line, width, width * 0.11, 0.1);
  const edge = (r: Ring, k: number): Pt => add(r.c, r.n, (r.w / 2) * k);
  const lobes = new Pen(ctx, 7200 + seed * 53 + boil * 1013, 0.8 * size);
  // Lobes first, so the body's edge overlaps their roots.
  for (let i = 1; i < rings.length - 1; i++) {
    const r = rings[i]!;
    const fwd = { x: -r.n.y, y: r.n.x };
    const tint = sheen(rings.length - i, t);
    for (const side of [1, -1] as const) {
      const base = edge(r, side * 0.86);
      const tip = add(add(base, r.n, side * r.w * 0.2), fwd, -r.w * 0.03);
      const lobe = Array.from({ length: 9 }, (_, j) => {
        const a = (j / 8) * Math.PI;
        return add(add(base, fwd, Math.cos(a) * r.w * 0.075), r.n, side * Math.sin(a) * r.w * 0.2);
      });
      lobes.fill(lobe, rgba(mix(tint, SHADE, side > 0 ? 0.6 : 0.3)), 1);
      lobes.stroke(lobe, 1.6 * size, INK, 0.9, false);
      // A few bristles fanning from the lobe's tip.
      for (const b of [-1, 0, 1]) lobes.hair([tip, add(add(tip, r.n, side * r.w * 0.11), fwd, b * r.w * 0.05)], 1 * size, INK, 0.55);
    }
  }
  // The segments, shaded round.
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i]!;
    const b = rings[i + 1]!;
    const tint = sheen(rings.length - i, t);
    const glint = mix(tint, iris(rings.length - i, t), 0.4);
    const l = edge(a, 1);
    const r = edge(a, -1);
    const g = ctx.createLinearGradient(l.x, l.y, r.x, r.y);
    g.addColorStop(0, rgba(SHADE));
    g.addColorStop(0.3, rgba(mix(tint, SHADE, 0.55)));
    g.addColorStop(0.58, rgba(tint));
    g.addColorStop(0.7, rgba(glint));
    g.addColorStop(0.77, rgba(mix(glint, [250, 236, 214], 0.18)));
    g.addColorStop(0.86, rgba(tint));
    g.addColorStop(0.96, rgba(mix(tint, SHADE, 0.5)));
    g.addColorStop(1, rgba(mix(tint, [240, 220, 190], 0.25)));
    ctx.fillStyle = g;
    ctx.beginPath();
    const quad = [edge(a, 1.01), edge(b, 1.01), edge(b, -1.01), edge(a, -1.01)];
    quad.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }
  const pen = new Pen(ctx, 7100 + seed * 53 + boil * 1013, 1.1 * size);
  for (let i = 1; i < rings.length - 1; i++) {
    const r = rings[i]!;
    const fwd = { x: -r.n.y, y: r.n.x };
    // The groove between segments, bowed towards the head, darker in the shadow.
    const bow = add(r.c, fwd, -r.w * 0.07);
    pen.hair([edge(r, 1), add(bow, r.n, r.w * 0.3), add(bow, r.n, -r.w * 0.3), edge(r, -1)], 2 * size, INK, 0.6);
    pen.hair([add(edge(r, -0.35), fwd, -r.w * 0.04), add(edge(r, -0.6), fwd, -r.w * 0.03)], 1.4 * size, 'rgba(255,240,220,1)', 0.3);
    // Hatching in the shadow.
    // Hatching in the shadow, crossed where it's darkest.
    pen.hair([edge(r, 0.62), add(edge(r, 0.95), fwd, r.w * 0.1)], 1.3 * size, INK, 0.55);
    pen.hair([edge(r, 0.38), add(edge(r, 0.7), fwd, r.w * 0.11)], 1.1 * size, INK, 0.38);
    pen.hair([edge(r, 0.15), add(edge(r, 0.42), fwd, r.w * 0.11)], 0.9 * size, INK, 0.22);
    pen.hair([add(edge(r, 0.95), fwd, r.w * 0.02), add(edge(r, 0.7), fwd, r.w * 0.13)], 1.1 * size, INK, 0.4);
  }
  pen.stroke(rings.map((r) => edge(r, 1.02)), 3.6 * size);
  pen.stroke(rings.map((r) => edge(r, -1.02)), 3 * size);
}

// ---------------------------------------------------------------- the head

/** One blade's outline in its own frame: base at the origin, pointing up, hooking in towards -x. */
interface Blade {
  readonly outer: readonly Pt[];
  readonly inner: readonly Pt[];
}

function bladeShape(len: number, wide: number, curl: number, teeth: number): Blade {
  const N = 48;
  // The spine: from the hinge, curling steadily inwards (towards -x), a little tighter at the tip.
  const spine: Pt[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    const phi = -curl * (0.8 * u + 0.2 * u * u);
    const p = spine[i]!;
    spine.push({ x: p.x + (Math.sin(phi) * len) / N, y: p.y - (Math.cos(phi) * len) / N });
  }
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const p = spine[i]!;
    const q = spine[Math.min(N, i + 1)]!;
    const r = spine[Math.max(0, i - 1)]!;
    const tg = { x: q.x - r.x, y: q.y - r.y };
    const l = Math.hypot(tg.x, tg.y) || 1;
    // Normal pointing out of the curl (+x side at the hinge).
    const n = { x: -tg.y / l, y: tg.x / l };
    const w = wide * (0.7 + 1.1 * u * (1 - u)) * (1 - u) ** 0.75;
    outer.push(add(p, n, w * 0.55));
    // Serrations along the cutting edge, inside the curl.
    const tooth = u > 0.2 && u < 0.92 && i % 2 === 1 ? wide * teeth : 0;
    inner.push(add(p, n, -w * 0.45 - tooth));
  }
  return { outer, inner };
}

const BIG = bladeShape(JAW_LEN, 46, 4.2, 0.2);
const SMALL = bladeShape(JAW_LEN * 0.4, 34, 4.0, 0.2);

/** A blade placed on the worm: `side` 1 the right one, -1 the left (mirrored). */
function placeBlade(b: Blade, worm: Worm, size: number, side: 1 | -1, inset: number, spread: number): { outer: Pt[]; inner: Pt[] } {
  const angle = (JAW_SHUT + (JAW_GAPE - JAW_SHUT) * worm.jaw) * spread;
  const a = worm.axis + side * angle;
  const hinge = add(worm.head, rot({ x: side * inset, y: -BODY_W * 0.12 }, worm.axis), size);
  const place = (p: Pt): Pt => {
    const r = rot({ x: side * p.x, y: p.y }, a);
    return { x: hinge.x + r.x * size, y: hinge.y + r.y * size };
  };
  return { outer: b.outer.map(place), inner: b.inner.map(place) };
}

/** Where the big blades' tips are (scene px). */
export function jawTips(worm: Worm, size = 1): { readonly left: Pt; readonly right: Pt } {
  const r = placeBlade(BIG, worm, size, 1, BODY_W * 0.3, 1);
  const l = placeBlade(BIG, worm, size, -1, BODY_W * 0.3, 1);
  return { left: l.outer[l.outer.length - 1]!, right: r.outer[r.outer.length - 1]! };
}

/** The big claws' outermost reach left and right, and their highest point (scene px). */
export function jawExtent(worm: Worm, size = 1): { readonly left: number; readonly right: number; readonly top: number } {
  const r = placeBlade(BIG, worm, size, 1, BODY_W * 0.3, 1).outer;
  const l = placeBlade(BIG, worm, size, -1, BODY_W * 0.3, 1).outer;
  return { left: Math.min(...l.map((p) => p.x)), right: Math.max(...r.map((p) => p.x)), top: Math.min(...[...l, ...r].map((p) => p.y)) };
}

function drawBlade(ctx: CanvasRenderingContext2D, blade: { outer: Pt[]; inner: Pt[] }, pen: Pen, size: number, dark: number): void {
  const shape = [...blade.outer, ...[...blade.inner].reverse()];
  const base = blade.outer[0]!;
  const tip = blade.outer[blade.outer.length - 1]!;
  const g = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
  g.addColorStop(0, `rgba(${Math.round(52 * dark)},${Math.round(28 * dark)},${Math.round(20 * dark)},1)`);
  g.addColorStop(0.5, `rgba(${Math.round(26 * dark)},${Math.round(15 * dark)},${Math.round(13 * dark)},1)`);
  g.addColorStop(1, '#0b0808');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.clip();
  // A glossy glint along the back of the blade.
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(214,170,120,0.35)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * size;
  ctx.beginPath();
  blade.outer.slice(2, -4).forEach((p, i) => {
    const q = blade.inner[i + 2]!;
    const x = p.x + (q.x - p.x) * 0.22;
    const y = p.y + (q.y - p.y) * 0.22;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,215,0.55)';
  ctx.lineWidth = 3 * size;
  ctx.stroke();
  ctx.restore();
  // Hatching across the cutting half.
  for (let i = 3; i < blade.inner.length - 4; i += 2) {
    const p = blade.inner[i]!;
    const q = blade.outer[i]!;
    pen.hair([p, { x: p.x + (q.x - p.x) * 0.45, y: p.y + (q.y - p.y) * 0.45 }], 1.4 * size, INK, 0.6);
  }
  pen.stroke(blade.outer, 3.6 * size);
  pen.stroke(blade.inner, 2.8 * size);
}

/** The five ringed antennae, fanning up from the head. */
function drawAntennae(ctx: CanvasRenderingContext2D, worm: Worm, size: number, t: number, pen: Pen): void {
  const spread = [-0.62, -0.3, 0, 0.3, 0.62];
  const lens = [0.78, 0.92, 1.05, 0.92, 0.78];
  const base0 = add(worm.head, dirOf(worm.axis), BODY_W * 0.12 * size);
  spread.forEach((s, i) => {
    const twitch = worm.twitch * (0.18 * Math.sin(cycles(97 + i * 7, t) + i) + 0.08 * Math.sin(cycles(41, t) + i * 2));
    const a = worm.axis + s * (0.75 + 0.25 * worm.jaw) + 0.06 * Math.sin(cycles(3, t) + i * 1.3) + twitch;
    const len = 250 * lens[i]! * size * (worm.reach ?? 1);
    const from = add(base0, rot({ x: (i - 2) * BODY_W * 0.12, y: 0 }, worm.axis), size);
    const d = dirOf(a);
    const curl = { x: d.y, y: -d.x };
    const pts = Array.from({ length: 13 }, (_, j) => {
      const u = j / 12;
      return add(add(from, d, len * u), curl, (s >= 0 ? -1 : 1) * len * 0.12 * u * u);
    });
    // A pale stalk, banded dark like a jointed feeler.
    ctx.save();
    ctx.lineCap = 'round';
    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j]!;
      const q = pts[j + 1]!;
      ctx.strokeStyle = j % 2 === 0 ? 'rgba(226,206,186,0.95)' : 'rgba(70,40,62,0.95)';
      ctx.lineWidth = Math.max(1.5, (9 - j * 0.55) * size);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.restore();
    pen.hair(pts, 1.6 * size, INK, 0.75);
  });
}

/** The rounded head capping the body, darker, with a wet gleam. */
function drawCap(ctx: CanvasRenderingContext2D, worm: Worm, size: number, t: number, pen: Pen): void {
  const w = BODY_W * 0.88 * size;
  const d = dirOf(worm.axis);
  const across = { x: -d.y, y: d.x };
  const pts = Array.from({ length: 17 }, (_, i) => {
    const a = (i / 16) * Math.PI;
    return add(add(worm.head, across, (Math.cos(a) * w) / 2), d, Math.sin(a) * w * 0.4 - w * 0.12);
  });
  ctx.save();
  ctx.fillStyle = rgba(mix(sheen(1, t), [40, 18, 44], 0.35));
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  for (const k of [-1, 1]) {
    const back = add(add(worm.head, across, (k * w) / 2), d, -w * 0.2);
    ctx.lineTo(back.x, back.y);
  }
  ctx.closePath();
  ctx.fill();
  // A wet gleam on the lamp's side.
  const gleam = add(add(worm.head, across, -w * 0.18), d, w * 0.12);
  const g = ctx.createRadialGradient(gleam.x, gleam.y, 0, gleam.x, gleam.y, w * 0.32);
  g.addColorStop(0, 'rgba(255,236,210,0.55)');
  g.addColorStop(1, 'rgba(255,236,210,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  pen.stroke(pts, 3.2 * size);
}

/** The head: antennae behind, the cap, then the small jaws and the big ones in front ('back' and 'front' split it round a fish). */
export function drawHead(ctx: CanvasRenderingContext2D, worm: Worm, size: number, t: number, boil: number, part: 'all' | 'back' | 'front' = 'all', seed = 0): void {
  if (part !== 'front') {
    drawAntennae(ctx, worm, size, t, new Pen(ctx, 7400 + seed * 53 + boil * 1013, 0.8 * size));
    drawCap(ctx, worm, size, t, new Pen(ctx, 7300 + seed * 53 + boil * 1013, 1 * size));
  }
  if (part === 'back') return;
  for (const side of [-1, 1] as const) drawBlade(ctx, placeBlade(SMALL, worm, size, side, BODY_W * 0.13, 0.88), new Pen(ctx, 7500 + side + boil * 1013, size), size, 0.75);
  for (const side of [-1, 1] as const) drawBlade(ctx, placeBlade(BIG, worm, size, side, BODY_W * 0.3, 1), new Pen(ctx, 7600 + side + boil * 1013, size), size, 1);
}

/** The worm standing out of a hole, up to its jaws: the body (clipped by the caller to above the sand), the antennae and the cap. */
export function drawWormBack(ctx: CanvasRenderingContext2D, worm: Worm, hole: Pt, size: number, t: number, boil: number): void {
  drawBody(ctx, bodyLine(worm, hole, 120 * size, size), size, t, boil);
  drawHead(ctx, worm, size, t, boil, 'back');
}
