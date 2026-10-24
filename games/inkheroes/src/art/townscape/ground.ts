import { createRng, type Rng } from '../../logic/rng';
import { makeDraw, oval, pt, TAU, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob, crisp, flat, glow, LIGHT, mix, rgba, SHADOW, soft } from '../sites/paintKit';
import { FLANK_LANES, flanksGround, flanksNear } from './groundFlanks';
import {
  bank, broken, bush, curve, cypress, EARTH, FAR, farTree, GRASS_DEEP, GRASS_FAR, GRASS_NEAR, IVORY, jag, LEAF_DARK, litEdge, type Puff, puffPath,
  revetment, road, rock, rockFace, ROCK, softWashes, strip, texture, tree, tuft, wood, WOOD, yAt,
} from './groundParts';
import { TOWN_CORE, TOWN_VIEW, type GroundDrawer } from './types';

/**
 * The Crown's hill-town, its ground and sky: a luminous watercolour sky
 * with painted cumulus, blue ranges and a green valley far off, then the
 * town's own hill: a ridge across the back for the walls, a rocky crag at
 * the back left for the seraph spire, a terraced slope at the back right
 * for the monastery, and in front a grassy hill with a cobbled square
 * before the hall, lanes to the plots and the main road coming in from
 * the bottom edge. Light from the upper left; shadows cool indigo;
 * distance cools and pales.
 *
 * The sky, the ranges, the valley and the hill run the whole view; the town
 * (its crag, ridge, terrace, square and lanes) is painted in the core's own
 * units (TOWN_CORE, the slots' frame of reference less its x), and the
 * countryside either side of it comes from groundFlanks.ts.
 */
const { w: W, h: H } = TOWN_VIEW;
const CX = TOWN_CORE.x;

/** The sky: deep ultramarine overhead, through a dusky violet to a warm amber haze on the horizon. */
const SKY_TOP = '#16244a';
const SKY_HIGH = '#253c6c';
const SKY_MID = '#4b5579';
const SKY_DUSK = '#86726c';
const SKY_LOW = '#c38f58';
/** The haze the distance sinks into: the horizon's amber dulled by the air. */
const HAZE = '#927e68';
const RANGE = '#424c63';
const RANGE_FAR = '#5f6880';
const VALLEY = '#4a5531';
const COBBLE = '#6a6154';
/** Cumulus: a grey-violet body, gold where the low sun catches its crowns, a dark violet belly. */
const CLOUD = '#6f6a80';
const CLOUD_LIT = '#d6ad78';
const CLOUD_HOT = '#f2d39c';
const CLOUD_BELLY = '#352f45';

// ---- Sky ----

function sky(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const g = ctx.createLinearGradient(0, 0, 0, 236);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.3, SKY_HIGH);
  g.addColorStop(0.56, SKY_MID);
  g.addColorStop(0.78, SKY_DUSK);
  g.addColorStop(0.93, SKY_LOW);
  g.addColorStop(1, mix(SKY_LOW, '#e0b070', 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 250);
  // The low sun beyond the upper left: a warm bloom in the air over that side, fading across the view.
  glow(ctx, pt(CX - 120, 150), 760, '#d9a066', 0.3);
  glow(ctx, pt(CX + 160, 200), 520, '#e2b072', 0.22);
  const across = ctx.createLinearGradient(0, 0, W, 0);
  across.addColorStop(0, rgba('#2a2240', 0));
  across.addColorStop(0.55, rgba('#2a2240', 0));
  across.addColorStop(1, rgba('#2a2240', 0.28));
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, W, 250);
  // The wash laid in with a broad brush: deeper where it pooled, warmer blooms where it dried back.
  softWashes(d, 16, (l) => {
    for (let i = 0; i < 27; i++) {
      const c = pt(rng() * W, 4 + rng() * 110);
      l.pen.fill(blob(c, 70 + rng() * 140, 12 + rng() * 22, rng, 0.3, 18), rng() < 0.6 ? '#101a3a' : '#6a6a8a', 0.1 + rng() * 0.1);
    }
  });
}

/** Puffs heaped on a ragged base, the tallest a little off centre. */
function heap(rng: Rng, cx: number, base: number, w: number, h: number): Puff[] {
  const puffs: Puff[] = [];
  const peak = 0.35 + rng() * 0.3;
  const hump = (t: number): number => Math.max(0, 1 - Math.abs(t - peak) / (t < peak ? peak : 1 - peak)) ** 0.8;
  const n = Math.max(4, Math.round(w / (h * 0.42)));
  for (let i = 0; i < n; i++) {
    const t = 0.06 + ((i + 0.3 + rng() * 0.4) / n) * 0.88;
    const r = h * (0.2 + 0.2 * hump(t)) * (0.85 + rng() * 0.35);
    puffs.push({ c: pt(cx - w / 2 + t * w, base - r * 0.6), r });
  }
  for (let i = 0; i < n; i++) {
    const t = 0.12 + rng() * 0.76;
    const k = hump(t);
    if (k < 0.25) continue;
    const r = h * (0.18 + 0.26 * k) * (0.8 + rng() * 0.35);
    puffs.push({ c: pt(cx - w / 2 + t * w, base - h * 0.2 - k * h * 0.5), r });
  }
  // Small billows breaking out of the crown, so it towers rather than sits.
  const crown = puffs.filter((p) => p.c.y < base - h * 0.35);
  for (let i = 0; i < n * 0.6 && crown.length > 0; i++) {
    const p = crown[Math.floor(rng() * crown.length)]!;
    const a = -Math.PI / 2 + (rng() - 0.6) * 1.4;
    puffs.push({ c: pt(p.c.x + Math.cos(a) * p.r * 0.6, p.c.y + Math.sin(a) * p.r * 0.6), r: p.r * (0.4 + rng() * 0.15) });
  }
  return puffs;
}

type Shift = (p: Puff) => { dx: number; dy: number; k: number };

/**
 * A towering cumulus, modelled in the low light from the upper left: a grey-violet
 * body, every billow gold on its upper left and turning violet on its lower right,
 * the belly dark and flat, the far side in shade. No outline: its edges melt into the sky.
 */
function cloud(d: Draw, rng: Rng, cx: number, base: number, w: number, h: number): void {
  const ctx = d.pen.ctx;
  const puffs = heap(rng, cx, base, w, h);
  const bottom: Pt[] = [];
  for (let x = cx - w * 0.7; x <= cx + w * 0.7; x += 6) bottom.push(pt(x, base + Math.sin(x * 0.09 + cx) * 1.6 + (rng() - 0.5) * 1.2));
  const clipToBase = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - w, base - h * 3);
    ctx.lineTo(cx + w, base - h * 3);
    bottom.slice().reverse().forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.clip();
  };
  const none: Shift = () => ({ dx: 0, dy: 0, k: 1 });
  const layer = (blur: number, o: Shift, color: string, alpha: number): void => soft(ctx, blur, () => {
    puffPath(ctx, puffs, o);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
  });
  ctx.save();
  // A veil of vapour round it, so its edges melt into the sky, then the body.
  layer(h * 0.14, () => ({ dx: 0, dy: 0, k: 1.08 }), mix(CLOUD, SKY_MID, 0.4), 0.32);
  clipToBase();
  layer(Math.max(0.9, h * 0.025), none, CLOUD, 0.96);
  puffPath(ctx, puffs, none);
  ctx.clip();
  // Lit high, dark in the belly; the far (right) side turned away into shade.
  const belly = ctx.createLinearGradient(0, base - h * 1.1, 0, base);
  belly.addColorStop(0, rgba(CLOUD_LIT, 0.28));
  belly.addColorStop(0.35, rgba(CLOUD, 0));
  belly.addColorStop(0.7, rgba(CLOUD_BELLY, 0.5));
  belly.addColorStop(1, rgba(CLOUD_BELLY, 0.9));
  ctx.fillStyle = belly;
  ctx.fillRect(cx - w, base - h * 2, w * 2, h * 2.2);
  const side = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  side.addColorStop(0, rgba(CLOUD_BELLY, 0));
  side.addColorStop(0.55, rgba(CLOUD_BELLY, 0));
  side.addColorStop(1, rgba(CLOUD_BELLY, 0.42));
  ctx.fillStyle = side;
  ctx.fillRect(cx - w, base - h * 2, w * 2, h * 2.2);
  // Each billow rounded: violet shade low on its right, gold high on its left, a hot rim at its very crown.
  // The whole heap lit along its upper left: gold laid over it, then the heap again, shifted
  // away from the sun, in its own grey, so only the rim facing the light keeps the gold.
  layer(h * 0.03, none, CLOUD_LIT, 0.55);
  layer(h * 0.1, () => ({ dx: h * 0.1, dy: h * 0.16, k: 1 }), CLOUD, 0.85);
  // Each billow rounded: a violet crease low on its right; the billows that stand clear on the crown catch the sun.
  layer(h * 0.08, (p) => ({ dx: p.r * 0.3, dy: p.r * 0.4, k: 0.85 }), CLOUD_BELLY, 0.3);
  const exposed = puffs.filter((p) => !puffs.some((o) => o !== p && o.r >= p.r * 0.6 && Math.hypot(p.c.x - p.r * 0.45 - o.c.x, p.c.y - p.r * 0.6 - o.c.y) < o.r * 0.95));
  soft(ctx, h * 0.05, () => {
    puffPath(ctx, exposed, (p) => ({ dx: -p.r * 0.3, dy: -p.r * 0.4, k: 0.55 }));
    ctx.fillStyle = rgba(CLOUD_LIT, 0.45);
    ctx.fill();
  });
  soft(ctx, h * 0.025, () => {
    puffPath(ctx, exposed, (p) => ({ dx: -p.r * 0.45, dy: -p.r * 0.58, k: 0.32 }));
    ctx.fillStyle = rgba(CLOUD_HOT, 0.5);
    ctx.fill();
  });
  ctx.restore();
}

function clouds(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  // Long streaks of stratus high up, dark, their upper edges caught gold.
  for (let i = 0; i < 10; i++) {
    const c = pt(60 + rng() * (W - 120), 20 + rng() * 46);
    const rx = 60 + rng() * 90;
    const ry = 2.5 + rng() * 3;
    const streak = blob(c, rx, ry, rng, 0.25, 16);
    soft(ctx, 2.5, () => d.pen.fill(streak, mix(CLOUD, SKY_HIGH, 0.35), 0.55));
    soft(ctx, 1.4, () => d.pen.fill(blob(pt(c.x - rx * 0.1, c.y - ry * 0.45), rx * 0.75, ry * 0.4, rng, 0.25, 14), CLOUD_LIT, 0.32));
  }
  // Over the town, as it was first composed...
  cloud(d, rng, CX + 255, 140, 300, 98);
  cloud(d, rng, CX + 575, 78, 170, 50);
  cloud(d, rng, CX + 905, 130, 330, 110);
  cloud(d, rng, CX + 1135, 64, 140, 42);
  cloud(d, rng, CX + 50, 60, 140, 38);
  cloud(d, rng, CX + 740, 172, 120, 28);
  // ...and drifting on over the country either side: a big heap at each end, smaller ones between.
  cloud(d, rng, 175, 128, 270, 88);
  cloud(d, rng, 34, 46, 100, 30);
  cloud(d, rng, 1790, 138, 280, 92);
  cloud(d, rng, 1935, 58, 130, 36);
  cloud(d, rng, 1690, 40, 90, 26);
}

// ---- Far country ----

interface Peak {
  readonly x: number;
  readonly h: number;
  readonly w: number;
}

/** A mountain range: ridge line (asymmetric peaks, broken by shoulders and crags), and for each x which peak rises there. */
function rangeOf(peaks: readonly Peak[], base: number, rng: Rng, rough: number): { ridge: Pt[]; owner: number[] } {
  const skew = peaks.map(() => 0.7 + rng() * 0.6);
  const ph = [rng() * TAU, rng() * TAU, rng() * TAU];
  const ridge: Pt[] = [];
  const owner: number[] = [];
  for (let x = -10; x <= W + 10; x += 4) {
    let y = 0;
    let who = 0;
    peaks.forEach((p, i) => {
      const side = x < p.x ? p.w * skew[i]! : p.w / skew[i]!;
      const v = p.h * Math.max(0, 1 - Math.abs(x - p.x) / side) ** 1.35;
      if (v > y) [y, who] = [v, i];
    });
    const crags = 4 * Math.sin(x * 0.07 + ph[0]!) + 2.2 * Math.sin(x * 0.19 + ph[1]!) + 1.1 * Math.sin(x * 0.43 + ph[2]!);
    const lift = y / 100;
    ridge.push(pt(x, base - y - crags * lift - Math.abs(crags) * 0.3 * lift + (rng() - 0.5) * rough));
    owner.push(who);
  }
  return { ridge, owner };
}

/** One range of blue mountains: its lit flanks, the shaded ones hatched, gullies, snow on the high peaks. */
function range(d: Draw, rng: Rng, peaks: readonly Peak[], base: number, color: string, ink: number, snowAt: number): void {
  const ctx = d.pen.ctx;
  const { ridge, owner } = rangeOf(peaks, base, rng, 1.6);
  const body = [...ridge, pt(W + 10, base + 30), pt(-10, base + 30)];
  d.pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, base - 120, 0, base + 10);
    g.addColorStop(0, mix(color, LIGHT, 0.16));
    g.addColorStop(0.55, color);
    g.addColorStop(1, mix(color, HAZE, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(-10, base - 140, W + 20, 180);
    peaks.forEach((p, i) => {
      const flank = ridge.filter((q, k) => owner[k] === i && q.x >= p.x);
      if (flank.length < 2) return;
      const top = flank[0]!;
      const end = flank[flank.length - 1]!;
      const spurFoot = pt(Math.min(end.x, p.x + p.w * 0.3), base + 10);
      const spur = [top, pt(p.x + p.w * 0.06, top.y + p.h * 0.35), pt(p.x + p.w * 0.16, top.y + p.h * 0.7), spurFoot];
      const face = [...flank, ...spur.slice(1).reverse()];
      soft(ctx, 1, () => d.pen.fill(face, mix(color, '#1c1a2c', 0.45), 0.5));
      d.pen.hatch(face, 2.4, 1.1, 0.38, { color: d.ink, alpha: ink * 0.3 });
      d.pen.hair(spur, 0.45, d.ink, ink * 0.7);
      // The lit flank catches the low sun along its upper slopes.
      const lit = [top, ...ridge.filter((q, k) => owner[k] === i && q.x < p.x).reverse(), pt(p.x - p.w * 0.5, top.y + p.h * 0.6), pt(p.x - p.w * 0.04, top.y + p.h * 0.3)];
      if (lit.length > 3) soft(ctx, 3, () => d.pen.fill(lit, mix(color, LIGHT, 0.4), 0.22));
      // Gullies down the lit flank.
      for (let k = 0; k < 3; k++) {
        const t = 0.2 + k * 0.22 + rng() * 0.1;
        const a = pt(p.x - p.w * t * 0.7, base - p.h * (1 - t) ** 1.3);
        d.pen.hair([a, pt(a.x + 3, a.y + p.h * 0.15), pt(a.x + 2, a.y + p.h * 0.28)], 0.4, mix(color, SHADOW, 0.5), ink * 0.9);
      }
      if (p.h > snowAt) {
        const s = p.h * 0.2;
        const cap = [pt(top.x - s * 0.9, top.y + s * 0.9), pt(top.x - s * 0.4, top.y + s * 0.5), top, pt(top.x + s * 0.7, top.y + s * 0.8), pt(top.x + s * 0.3, top.y + s * 1.1), pt(top.x, top.y + s * 0.7), pt(top.x - s * 0.4, top.y + s * 1.2)];
        d.pen.fill(cap, mix(IVORY, CLOUD_LIT, 0.35), 0.62);
        d.pen.fill([top, pt(top.x + s * 0.7, top.y + s * 0.8), pt(top.x + s * 0.3, top.y + s * 1.1), pt(top.x, top.y + s * 0.7)], mix(color, '#8a90b0', 0.3), 0.75);
      }
    });
    // Haze settling in the valleys.
    const haze = ctx.createLinearGradient(0, base - 50, 0, base + 6);
    haze.addColorStop(0, rgba(HAZE, 0));
    haze.addColorStop(1, rgba(HAZE, 0.75));
    ctx.fillStyle = haze;
    ctx.fillRect(-10, base - 50, W + 20, 70);
  });
  d.pen.stroke(ridge, 0.5, d.ink, ink, false);
}

/** The core's peaks where they stood, more either side of them. */
const atCore = (peaks: readonly Peak[]): Peak[] => peaks.map((p) => ({ ...p, x: p.x + CX }));

function mountains(d: Draw, rng: Rng): void {
  range(d, rng, [
    { x: 70, h: 72, w: 130 }, { x: 290, h: 56, w: 110 },
    ...atCore([{ x: 110, h: 64, w: 120 }, { x: 380, h: 78, w: 130 }, { x: 590, h: 58, w: 110 }, { x: 860, h: 82, w: 140 }, { x: 1080, h: 60, w: 110 }]),
    { x: 1730, h: 74, w: 130 }, { x: 1940, h: 64, w: 120 },
  ], 214, RANGE_FAR, 0.16, 70);
  range(d, rng, [
    { x: 40, h: 64, w: 110 }, { x: 160, h: 96, w: 140 }, { x: 300, h: 66, w: 110 },
    ...atCore([{ x: 20, h: 60, w: 110 }, { x: 175, h: 92, w: 130 }, { x: 315, h: 50, w: 90 }, { x: 485, h: 100, w: 140 }, { x: 650, h: 64, w: 110 },
      { x: 790, h: 108, w: 150 }, { x: 960, h: 60, w: 110 }, { x: 1120, h: 90, w: 130 }]),
    { x: 1700, h: 62, w: 100 }, { x: 1850, h: 104, w: 150 }, { x: 1990, h: 70, w: 110 },
  ], 230, RANGE, 0.32, 86);
}

const atX = (p: Pt): Pt => pt(p.x + CX, p.y);

/** The valley between the ranges and the town: fields and hedges, a river, then wooded hills nearer in. */
function valley(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const back = curve([pt(-10, 222), pt(150, 230), pt(300, 220), ...[pt(-10, 228), pt(160, 220), pt(380, 228), pt(560, 218), pt(760, 228), pt(980, 214), pt(1190, 222)].map(atX), pt(1780, 216), pt(1900, 226), pt(W + 10, 218)], 8);
  const body = [...back, pt(W + 10, 300), pt(-10, 300)];
  d.pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, 212, 0, 262);
    g.addColorStop(0, mix(VALLEY, HAZE, 0.55));
    g.addColorStop(1, mix(VALLEY, '#6b6a38', 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(-10, 205, W + 20, 100);
    for (let i = 0; i < 52; i++) {
      const x = rng() * W;
      const y = 226 + rng() * 26;
      const fw = 26 + rng() * 50;
      const field = [pt(x, y), pt(x + fw, y - 2), pt(x + fw + 7, y + 5), pt(x + 5, y + 7)];
      d.pen.fill(field, rng() < 0.45 ? '#8c7a46' : rng() < 0.5 ? '#4c5e32' : '#6a6c3c', 0.42);
      d.pen.hair([pt(x + 5, y + 7), pt(x + fw + 7, y + 5)], 0.4, mix(WOOD, FAR, 0.3), 0.4);
    }
    // A river winding across the valley floor, catching the sky.
    const bends = [pt(-10, 240), pt(140, 234), pt(300, 244), pt(480, 236), pt(700, 246), pt(900, 234), pt(1190, 240)].map(atX);
    const river = strip(curve([pt(-10, 236), pt(160, 244), pt(290, 236), ...bends, pt(1780, 232), pt(W + 10, 242)], 8), (u) => 3.2 + 1.6 * Math.sin(u * 19));
    d.pen.fill(river.shape, mix(SKY_LOW, HAZE, 0.35), 0.85);
    d.pen.hair(river.right, 0.45, mix(FAR, SHADOW, 0.4), 0.45);
    // The shadow of a cloud drifting over the fields.
    soft(ctx, 10, () => {
      d.pen.fill(oval(CX + 880, 240, 120, 12, 20), mix(VALLEY, SHADOW, 0.6), 0.3);
      d.pen.fill(oval(CX + 250, 236, 90, 9, 20), mix(VALLEY, SHADOW, 0.6), 0.26);
      d.pen.fill(oval(140, 238, 100, 10, 20), mix(VALLEY, SHADOW, 0.6), 0.26);
    });
  });
  d.pen.stroke(back, 0.45, d.ink, 0.3, false);
  // Woods along the nearer swells.
  wood(d, rng, CX + 80, CX + 330, 246, 5, mix(WOOD, HAZE, 0.3));
  wood(d, rng, CX + 420, CX + 560, 240, 4, mix(WOOD, FAR, 0.35));
  wood(d, rng, CX + 690, CX + 990, 242, 6, mix(WOOD, FAR, 0.3));
  wood(d, rng, 60, 260, 244, 5, mix(WOOD, FAR, 0.32));
  wood(d, rng, 1640, 1800, 238, 4, mix(WOOD, FAR, 0.35));
  for (let i = 0; i < 50; i++) {
    const p = back[Math.floor(rng() * (back.length - 1))]!;
    farTree(d, rng, p.x + (rng() - 0.5) * 6, p.y + 4 + rng() * 20, 2 + rng() * 1.5, mix(WOOD, FAR, 0.45), 0.25);
  }
}

// ---- The town's hill ----

/** The hill's back edge across the town, core units: behind the crag, the ridge under the walls, then rising to the right. */
const HILL_CORE = [pt(-10, 246), pt(120, 244), pt(250, 250), pt(420, 240), pt(600, 236), pt(800, 240), pt(900, 238), pt(980, 226), pt(1080, 214), pt(1190, 198)];
const HILL_EDGE = curve(HILL_CORE, 6);
/** The same edge across the whole view: level meadow off to the left, and on the right a rise for the windmill before it falls away. */
const HILL_VIEW = curve([pt(-10, 240), pt(130, 246), pt(290, 250), ...HILL_CORE.map(atX), pt(1680, 186), pt(1750, 181), pt(1830, 192), pt(1920, 212), pt(W + 10, 226)], 6);

function hill(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const body = [...HILL_VIEW, pt(W + 10, H + 10), pt(-10, H + 10)];
  d.pen.fill(body, PAPER_FILL, 1);
  d.pen.clipped(body, () => {
    const g = ctx.createLinearGradient(0, 200, 0, H);
    g.addColorStop(0, mix(GRASS_FAR, LIGHT, 0.06));
    g.addColorStop(0.3, GRASS_FAR);
    g.addColorStop(0.7, GRASS_NEAR);
    g.addColorStop(1, mix(GRASS_NEAR, GRASS_DEEP, 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(-10, 170, W + 20, H);
    // The wash pooled and bloomed unevenly, warmer on the near ground.
    softWashes(d, 9, (l) => {
      for (let i = 0; i < 136; i++) {
        const c = pt(rng() * W, 250 + rng() * 230);
        const near = (c.y - 250) / 220;
        const r = rng();
        const tint = r < 0.25 ? '#7d6c34' : r < 0.55 ? mix(GRASS_NEAR, LIGHT, 0.25) : GRASS_DEEP;
        l.pen.fill(blob(c, 30 + rng() * 70, 8 + rng() * 16, rng, 0.3, 16), tint, (0.1 + rng() * 0.12) * (0.6 + near * 0.6));
      }
      // Broad patches where the sun breaks through onto the grass.
      for (let i = 0; i < 18; i++) {
        const c = pt(rng() * W, 255 + rng() * 150);
        l.pen.fill(blob(c, 60 + rng() * 120, 10 + rng() * 18, rng, 0.35, 18), '#6a7a32', 0.16 + rng() * 0.12);
      }
    });
    texture(d, rng, body, 8800, 1, ['#1c2e14', '#6f7a34', '#7a6a38', GRASS_DEEP]);
    // Shadows of the clouds passing over the hill.
    soft(ctx, 16, () => {
      d.pen.fill(blob(pt(CX + 860, 330), 170, 26, rng, 0.3, 18), SHADOW, 0.18);
      d.pen.fill(blob(pt(CX + 250, 420), 150, 22, rng, 0.3, 18), SHADOW, 0.14);
      d.pen.fill(blob(pt(120, 300), 130, 20, rng, 0.3, 18), SHADOW, 0.16);
      d.pen.fill(blob(pt(1820, 360), 150, 22, rng, 0.3, 18), SHADOW, 0.18);
    });
    // The light rakes across from the left; the near corners darken.
    const lit = ctx.createLinearGradient(0, 0, W, 0);
    lit.addColorStop(0, rgba(LIGHT, 0.12));
    lit.addColorStop(0.45, rgba(LIGHT, 0));
    lit.addColorStop(1, rgba(SHADOW, 0.22));
    ctx.fillStyle = lit;
    ctx.fillRect(-10, 170, W + 20, H);
    const near = ctx.createLinearGradient(0, 400, 0, H);
    near.addColorStop(0, rgba(SHADOW, 0));
    near.addColorStop(1, rgba(SHADOW, 0.3));
    ctx.fillStyle = near;
    ctx.fillRect(-10, 380, W + 20, 100);
    // The low sun warms the brow of the hill where it meets the haze.
    const brow = ctx.createLinearGradient(0, 180, 0, 290);
    brow.addColorStop(0, rgba('#c79a58', 0.12));
    brow.addColorStop(1, rgba('#c79a58', 0));
    ctx.fillStyle = brow;
    ctx.fillRect(-10, 170, W + 20, 130);
  });
  d.pen.stroke(HILL_VIEW, 0.65, d.ink, 0.6, false);
}

/** The ridge the walls stand on: its turf lit along the top, then a bank falling to the town, earth and rock showing through. */
function ridge(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const brow = curve([pt(230, 276), pt(400, 282), pt(600, 284), pt(800, 280), pt(940, 270)], 6);
  const foot = curve([pt(940, 270), pt(820, 304), pt(600, 312), pt(380, 308), pt(230, 276)], 6);
  const bank = [...brow, ...foot.slice(1)];
  const top = [...HILL_EDGE.filter((p) => p.x > 230 && p.x < 940), ...brow.slice().reverse()];
  d.pen.clipped(top, () => {
    ctx.fillStyle = rgba(LIGHT, 0.12);
    ctx.fillRect(220, 220, 740, 70);
  });
  d.pen.clipped(bank, () => {
    const g = ctx.createLinearGradient(0, 278, 0, 312);
    g.addColorStop(0, rgba(mix(GRASS_NEAR, SHADOW, 0.4), 0.25));
    g.addColorStop(1, rgba(mix(GRASS_NEAR, SHADOW, 0.5), 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(220, 268, 740, 50);
    d.pen.hatch(bank, 2.8, 1.15, 0.38, { color: d.ink, alpha: 0.13 });
    // Earth breaking through the turf.
    soft(ctx, 1.5, () => {
      for (let i = 0; i < 7; i++) {
        const x = 280 + rng() * 620;
        d.pen.fill(blob(pt(x, 296 + rng() * 6), 14 + rng() * 12, 3, rng, 0.3, 12), EARTH, 0.45);
      }
    });
  });
  broken(d, rng, brow, 0.5, d.ink, 0.4, 0.6);
  for (let i = 0; i < 6; i++) {
    const x = 290 + rng() * 600;
    rock(d, rng, pt(x, 298 + rng() * 8), 5 + rng() * 5, 2.5 + rng() * 2);
  }
}

// ---- The crag ----

/**
 * The crag at the back left: a turf-topped plateau for the seraph spire, a
 * rock face falling to the town, a jagged spur behind it that steps down
 * to the left in broken outcrops and sinks into the meadow beyond the town.
 */
function crag(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  // The spur behind the plateau, in the half-light: its pinnacle over the town's edge, its shoulders falling away left.
  const spurEdge = curve([
    pt(-150, 300), pt(-138, 288), pt(-122, 284), pt(-110, 268), pt(-94, 264), pt(-82, 248), pt(-66, 242), pt(-52, 220), pt(-40, 208), pt(-28, 178), pt(-18, 160),
    pt(-10, 146), pt(2, 140), pt(10, 152), pt(17, 148), pt(26, 172), pt(34, 178), pt(42, 206), pt(52, 230), pt(60, 252),
  ], 3);
  const spurFoot = curve([pt(60, 312), pt(-30, 322), pt(-66, 326), pt(-100, 320), pt(-130, 310), pt(-150, 300)], 5);
  const spur = [...spurEdge, ...spurFoot];
  flat(d, spur, mix(ROCK, FAR, 0.3), { tone: 0.32, line: 0, from: pt(-120, 230), to: pt(60, 170) });
  d.pen.clipped(spur, () => {
    rockFace(d, rng, -154, 64, (x) => yAt(spurEdge, x), () => 326);
    d.pen.stipple(spur, 1500, () => 0.5, 0.4, mix(ROCK, SHADOW, 0.5));
    stains(d, rng, -150, 60, 150, 320);
    // Turf caught on the lower shoulders, and the foot sinking into shade and grass.
    soft(ctx, 3, () => d.pen.fill(spurFoot.map((p) => pt(p.x, p.y - 8)).concat(spurFoot.slice().reverse().map((p) => pt(p.x, p.y + 4))), SHADOW, 0.18));
    for (const [x, y] of [[-130, 290], [-102, 268], [-74, 244], [-46, 212]] as const) {
      d.pen.fill(blob(pt(x, y + 2), 9, 2.4, rng, 0.3, 10), GRASS_FAR, 0.85);
      for (let k = 0; k < 3; k++) tuft(d, rng, pt(x - 6 + rng() * 12, y + 3), 3, 0.6);
    }
  });
  d.pen.stroke(spurEdge, 0.8, d.ink, 0.8, false);
  broken(d, rng, spurFoot.filter((p) => p.x < -60), 0.9, d.ink, 0.7, 0.8);
  for (const p of spurFoot) if (p.x < -60 && rng() < 0.6) tuft(d, rng, pt(p.x, p.y + 1), 3.4, 0.7);
  // The face under the plateau, high at the left and sinking into the turf at the right; its left end turns back into the spur.
  const lip = curve([pt(24, 252), pt(60, 262), pt(120, 268), pt(176, 266), pt(214, 260), pt(240, 262)], 4);
  const footLine = curve([pt(274, 296), pt(236, 316), pt(180, 326), pt(120, 330), pt(60, 328), pt(10, 334), pt(-30, 334), pt(-58, 330)], 6);
  const side = curve([pt(-58, 330), pt(-44, 300), pt(-14, 270), pt(24, 252)], 4);
  const face = [...lip, ...footLine, ...side.slice(1, -1)];
  flat(d, face, ROCK, { tone: 0.18, line: 0, from: pt(20, 250), to: pt(270, 300) });
  d.pen.clipped(face, () => {
    rockFace(d, rng, -62, 280, (x) => (x > 240 ? 262 + (x - 240) * 0.9 : x < 24 ? yAt(side, x) : yAt(lip, x)), (x) => yAt(footLine.slice().reverse(), x));
    d.pen.stipple(face, 2200, () => 0.5, 0.42, mix(ROCK, SHADOW, 0.5));
    stains(d, rng, -60, 280, 262, 330);
    // The face turns from the light as it rounds to the right; shade gathers under the turf and at the foot.
    const turn = ctx.createLinearGradient(40, 0, 270, 0);
    turn.addColorStop(0, rgba(LIGHT, 0.14));
    turn.addColorStop(0.5, rgba(LIGHT, 0));
    turn.addColorStop(1, rgba(SHADOW, 0.34));
    ctx.fillStyle = turn;
    ctx.fillRect(-62, 240, 342, 100);
    soft(ctx, 4, () => {
      d.pen.fill([...lip, pt(240, 274), pt(24, 266)], SHADOW, 0.42);
      d.pen.fill([pt(-62, 318), pt(280, 300), pt(280, 340), pt(-62, 342)], SHADOW, 0.24);
    });
    for (let i = 0; i < 8; i++) {
      const c = pt(-30 + rng() * 270, 290 + rng() * 32);
      d.pen.fill(blob(c, 4 + rng() * 5, 1.6 + rng(), rng, 0.3, 10), GRASS_FAR, 0.85);
      for (let k = 0; k < 3; k++) tuft(d, rng, pt(c.x - 4 + rng() * 8, c.y + 1), 3.2, 0.65);
    }
  });
  d.pen.stroke(side, 0.75, d.ink, 0.8, false);
  d.pen.stroke(footLine.slice().reverse(), 0.9, d.ink, 0.85, false);
  stair(d, rng);
  // The plateau: a turf cap where the spire stands, its edge hanging ragged over the lip.
  const back = curve([pt(24, 252), pt(36, 241), pt(70, 235), pt(124, 233), pt(176, 234), pt(216, 240), pt(240, 262)], 4);
  const cap = [...back, ...lip.slice().reverse().slice(1, -1)];
  flat(d, cap, mix(GRASS_FAR, LIGHT, 0.06), { tone: 0, line: 0, from: pt(40, 232), to: pt(220, 268) });
  d.pen.clipped(cap, () => {
    texture(d, rng, cap, 220);
    for (let i = 0; i < 46; i++) tuft(d, rng, pt(30 + rng() * 200, 236 + rng() * 32), 3, 0.35);
  });
  d.pen.stroke(back, 0.55, d.ink, 0.5, false);
  for (const x of [52, 98, 188]) rock(d, rng, pt(x + rng() * 10, yAt(lip, x) + 1), 5 + rng() * 3, 3);
  for (const p of lip) d.pen.hair([pt(p.x, p.y - 1), pt(p.x + (rng() - 0.5) * 2.5, p.y + 1.5 + rng() * 4)], 0.55, mix(GRASS_DEEP, SHADOW, 0.3), 0.75);
  d.pen.stroke(lip, 0.7, d.ink, 0.75, false);
  // Fallen stones at its foot.
  for (let i = 0; i < 7; i++) rock(d, rng, pt(-40 + rng() * 280, 334 + rng() * 6), 4 + rng() * 5, 2.4 + rng() * 2);
}

/** Weather on a rock face: umber seeps, grey-green lichen and moss in the hollows, in soft patches. */
function stains(d: Draw, rng: Rng, x0: number, x1: number, y0: number, y1: number): void {
  softWashes(d, 3, (l) => {
    for (let i = 0; i < (x1 - x0) / 7; i++) {
      const c = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
      const r = rng();
      const tint = r < 0.4 ? '#4a3a2a' : r < 0.7 ? '#4c5530' : '#9a8e76';
      l.pen.fill(blob(c, 4 + rng() * 12, 3 + rng() * 8, rng, 0.35, 10), tint, 0.18 + rng() * 0.2);
    }
  });
}

/** Steps cut slantwise up the crag's flank to the plateau, each tread lit, each riser in shade. */
function stair(d: Draw, rng: Rng): void {
  const from = pt(270, 304);
  const to = pt(222, 262);
  const n = 11;
  const cut = [pt(from.x + 9, from.y + 3), pt(to.x + 9, to.y), pt(to.x - 9, to.y - 1), pt(from.x - 9, from.y + 2)];
  soft(d.pen.ctx, 1.5, () => d.pen.fill(cut.map((p) => pt(p.x + 3, p.y + 3)), SHADOW, 0.4));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = pt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    const tread = crisp([pt(c.x - 8, c.y - 2.6), pt(c.x + 8, c.y - 2.6), pt(c.x + 8.5, c.y), pt(c.x - 7.5, c.y)], 2);
    flat(d, tread, mix(ROCK, LIGHT, 0.22), { tone: -0.05, line: 0.4 });
    d.pen.fill([pt(c.x - 7.5, c.y), pt(c.x + 8.5, c.y), pt(c.x + 8.5, c.y + 1.8), pt(c.x - 7.5, c.y + 1.8)], mix(ROCK, SHADOW, 0.5), 0.75);
    if (rng() < 0.35) tuft(d, rng, pt(c.x + 9.5, c.y + 1), 2.6, 0.6);
  }
  d.pen.hair(cut.slice(0, 2), 0.6, d.ink, 0.6);
}

/** The terrace's lip, core units: under the monastery, then on along the slope beyond the town (a vineyard's, there) to the road. */
const TERRACE_FRONT = curve([pt(935, 266), pt(1000, 272), pt(1100, 274), pt(1190, 272), pt(1270, 276), pt(1350, 284), pt(1430, 296), pt(1466, 303)], 6);

/** The slope at the back right, terraced flat for the monastery, a dry-stone revetment along its lip. */
function terrace(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const front = TERRACE_FRONT;
  const end = front[front.length - 1]!;
  const shelfBack = HILL_VIEW.map((p) => pt(p.x - CX, p.y)).filter((p) => p.x > 935 && p.x < end.x);
  const shelf = [...shelfBack, end, ...front.slice().reverse()];
  d.pen.clipped(shelf, () => {
    const g = ctx.createLinearGradient(930, 0, end.x, 0);
    g.addColorStop(0, rgba(LIGHT, 0.13));
    g.addColorStop(0.6, rgba(LIGHT, 0.09));
    g.addColorStop(1, rgba(LIGHT, 0));
    ctx.fillStyle = g;
    ctx.fillRect(920, 170, end.x - 910, 140);
  });
  bank(d, front, curve([pt(end.x + 2, 309), pt(1400, 318), pt(1290, 308), pt(1190, 300), pt(1080, 304), pt(990, 298), pt(935, 266)], 6));
  revetment(d, rng, front);
}

// ---- Roads, lanes and the square ----

/** The square in front of the hall: packed courses of setts, each rounded and lit on top, a dressed kerb round it, worn dusty down the middle. */
function square(d: Draw, rng: Rng): void {
  const ctx = d.pen.ctx;
  const shape = curve([pt(560, 375), pt(650, 372), pt(742, 375), pt(772, 386), pt(786, 418), pt(770, 444), pt(650, 449), pt(530, 444), pt(514, 418), pt(530, 386), pt(560, 375)], 4);
  soft(ctx, 1.5, () => d.pen.fill(shape.map((p) => pt(p.x + 1.5, p.y + 2)), SHADOW, 0.35));
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.clipped(shape, () => {
    ctx.fillStyle = rgba('#3a332b', 0.97);
    ctx.fillRect(500, 360, 300, 100);
    let row = 0;
    for (let y = 371; y < 452; row++) {
      const near = (y - 370) / 80;
      const rh = 3.4 + near * 1.3;
      const cw = 6 + near * 2.8;
      for (let x = 505 - (row % 2) * cw * 0.5 - rng() * 2; x < 800; x += cw * (0.96 + rng() * 0.1)) {
        const c = pt(x + cw / 2, y + rh / 2);
        const stone = blob(c, cw * 0.47, rh * 0.44, rng, 0.14, 10);
        const tone = rng();
        d.pen.fill(stone, tone < 0.25 ? mix(COBBLE, LIGHT, 0.18) : tone < 0.75 ? COBBLE : mix(COBBLE, '#4f463c', 0.5), 0.95);
        d.pen.fill(blob(pt(c.x - cw * 0.12, c.y - rh * 0.14), cw * 0.24, rh * 0.18, rng, 0.2, 7), mix(COBBLE, LIGHT, 0.55), 0.45);
        d.pen.hair(stone.slice(0, 6), 0.4, mix(SHADOW, COBBLE, 0.2), 0.6);
      }
      y += rh;
    }
    // Worn and dusty where feet and wheels cross it; the light on its far side, shade on the near right.
    soft(ctx, 9, () => {
      d.pen.fill(oval(626, 424, 46, 16, 20), EARTH, 0.35);
      d.pen.fill(oval(616, 388, 90, 9, 20), LIGHT, 0.16);
      d.pen.fill(oval(756, 430, 46, 14, 20), SHADOW, 0.28);
      d.pen.fill(oval(536, 430, 30, 12, 20), SHADOW, 0.14);
    });
  });
  // The kerb: a band of dressed stones round the edge, jointed, lit along its top.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = mix(COBBLE, LIGHT, 0.08);
  ctx.lineWidth = 4.2;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i + 1 < shape.length; i += 2) {
    const a = shape[i]!;
    const b = shape[Math.min(shape.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = pt(-(b.y - a.y) / l, (b.x - a.x) / l);
    d.pen.hair([pt(a.x - n.x * 2.1, a.y - n.y * 2.1), pt(a.x + n.x * 2.1, a.y + n.y * 2.1)], 0.4, d.ink, 0.6);
  }
  d.pen.hair(shape.filter((p) => p.y < 400).map((p) => pt(p.x, p.y - 1)), 0.6, litEdge(COBBLE, 0.4), 0.5);
  // The near edge stands a step above the grass.
  const lip = shape.filter((p) => p.y > 404);
  soft(ctx, 1, () => d.pen.fill([...lip.map((p) => pt(p.x, p.y + 2)), ...lip.slice().reverse().map((p) => pt(p.x, p.y + 4.2))], mix(COBBLE, SHADOW, 0.6), 0.8));
  broken(d, rng, lip.map((p) => pt(p.x, p.y + 4.2)), 0.6, d.ink, 0.6, 0.85);
  broken(d, rng, shape.map((p) => pt(p.x, p.y - 2.1)), 0.45, d.ink, 0.4, 0.6);
  for (const p of lip) if (rng() < 0.5) tuft(d, rng, pt(p.x, p.y + 5), 3, 0.6);
}

/** A width that follows a spine's x rather than its length (so a lane keeps its width in town however far it runs on). */
const byX = (spine: readonly Pt[], w: (x: number) => number) => (u: number): number => w(spine[Math.round(u * (spine.length - 1))]!.x);
const toCore = (p: Pt): Pt => pt(p.x - CX, p.y);

function roads(d: Draw, rng: Rng): void {
  // Lanes first (the square and the main road lie over their ends), each running on out of town into the country.
  const west = curve([pt(530, 412), pt(420, 404), pt(320, 400), pt(200, 404), pt(90, 400), pt(-10, 406), ...FLANK_LANES.left.map(toCore)], 5);
  road(d, rng, west, byX(west, (x) => (x > -10 ? 28 - (5 * (530 - x)) / 540 : 23 - (7 * Math.min(400, -10 - x)) / 400)), false);
  const east = curve([pt(780, 412), pt(880, 404), pt(980, 408), pt(1080, 400), pt(1190, 404), ...FLANK_LANES.right.map(toCore)], 5);
  road(d, rng, east, byX(east, (x) => (x < 1190 ? 27 - (4 * (x - 780)) / 410 : 23 - (12 * Math.min(420, x - 1190)) / 420)), false);
  // Up the hill to the gate under the walls.
  road(d, rng, curve([pt(612, 382), pt(594, 346), pt(598, 306), pt(602, 278)], 5), (u) => 26 - u * 8, true);
  // To the griffin tower and the crag's stair.
  road(d, rng, curve([pt(545, 388), pt(470, 366), pt(380, 346), pt(300, 340), pt(252, 330)], 5), (u) => 18 - u * 4, false);
  // To the guild and on up the slope to the monastery.
  road(d, rng, curve([pt(760, 386), pt(840, 356), pt(905, 344), pt(948, 314), pt(985, 282), pt(1030, 270)], 5), (u) => 18 - u * 6, false);
  square(d, rng);
  // The main road in from the bottom edge, widest where it's nearest.
  road(d, rng, curve([pt(596, H + 14), pt(598, 462), pt(616, 442)], 4), (u) => 92 - u * 40, true);
}

// ---- Grass, flowers, trees ----

/** Grass and flowers scattered between x0 and x1, as thick on the ground as they are across the town. */
function meadow(d: Draw, rng: Rng, x0: number, x1: number): void {
  const span = x1 - x0;
  for (let i = 0; i < span * 0.6; i++) {
    const y = 250 + rng() ** 0.7 * 222;
    const near = (y - 250) / 220;
    tuft(d, rng, pt(x0 + rng() * span, y), 2 + near * 3.5, 0.3 + near * 0.3);
  }
  const blooms = ['#d6c9a4', '#c4983a', '#7d6c9c', '#9c4436'];
  for (let i = 0; i < span * 0.1; i++) {
    const y = 280 + rng() * 190;
    const c = blooms[Math.floor(rng() * blooms.length)]!;
    const x = x0 + rng() * span;
    for (let k = 0; k < 3; k++) d.pen.dot(x + (rng() - 0.5) * 8, y + (rng() - 0.5) * 3, 0.45 + ((y - 280) / 190) * 0.5, c, 0.75);
  }
}

function margins(d: Draw, rng: Rng): void {
  // Small trees on the far shoulders of the hill.
  for (const [x, y] of [[262, 252], [278, 255], [890, 244], [1000, 228], [1018, 224]] as const) farTree(d, rng, x, y, 5, mix(LEAF_DARK, FAR, 0.15), 0.6);
  // Far right: cypresses up the slope, a broad tree and a bush at the edge.
  cypress(d, rng, pt(1158, 230), 70);
  cypress(d, rng, pt(1176, 236), 56);
  tree(d, rng, pt(1196, 340), 0.95, 0.7);
  tree(d, rng, pt(1172, 470), 1.9, 0.3);
  // Far left: trees at the crag's foot and the near corner.
  tree(d, rng, pt(-6, 372), 1.6, 0.2);
  tree(d, rng, pt(18, 470), 1.9, 0.6);
  // Bushes dotting the hill between the plots.
  for (const [x, y, s] of [[214, 356], [544, 334], [740, 334], [992, 334], [372, 442], [706, 470], [872, 444], [1004, 446]].map(([x, y]) => [x!, y!, 0.6 + rng() * 0.25] as const)) bush(d, rng, pt(x, y), s);
}

/** Paper grain over the whole painting: the tooth of cold-pressed paper catching the wash. */
function grain(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const m = ctx.getTransform();
  const x0 = Math.max(0, Math.round(m.e));
  const y0 = Math.max(0, Math.round(m.f));
  const w = Math.min(ctx.canvas.width - x0, Math.round(W * m.a));
  const h = Math.min(ctx.canvas.height - y0, Math.round(H * m.d));
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(x0, y0, w, h);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const k = (rng() - 0.5) * 10;
    px[i] = px[i]! + k;
    px[i + 1] = px[i + 1]! + k;
    px[i + 2] = px[i + 2]! + k * 0.8;
  }
  ctx.putImageData(img, x0, y0);
}

export const drawTownGround: GroundDrawer = (ctx, seed) => {
  const rng = createRng(seed * 31 + 7);
  const d = makeDraw(ctx, seed, 0, 0);
  const inCore = (paint: () => void): void => {
    ctx.save();
    ctx.translate(CX, 0);
    paint();
    ctx.restore();
  };
  ctx.save();
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, W, H);
  // Far off, the whole width.
  sky(d, rng);
  clouds(d, rng);
  mountains(d, rng);
  valley(d, rng);
  hill(d, rng);
  // The town's ground, then the country's beside it, then the lanes out over both.
  inCore(() => {
    terrace(d, rng);
    ridge(d, rng);
    crag(d, rng);
    meadow(d, rng, -CX, W - CX);
  });
  flanksGround(d, rng, HILL_VIEW, TERRACE_FRONT.map(atX));
  inCore(() => {
    roads(d, rng);
    margins(d, rng);
  });
  flanksNear(d, rng);
  ctx.restore();
  grain(ctx, rng);
};
