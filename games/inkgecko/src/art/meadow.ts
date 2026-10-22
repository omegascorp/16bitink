import { createRng, type Rng } from '../logic/rng';
import { blob, edgeWash, groundWash, polar, SHADOW, wash } from './groundKit';
import { fits, type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { type Draw, normals, pt, TAU } from './kit';
import { type Bloom, bloom, BLOOM_SIZE, butterfly } from './meadowFlora';
import { bench, fencePost, molehill, stile } from './meadowThings';
import { PAPER_FILL } from './palette';
import { type Pt, withScratch } from './pen';
import { mix, rgba } from './wash';

/**
 * Chapter 7's page, "The Wild Meadow", in high summer from above: short
 * sunny grass in the middle where play happens, unmown grass in soft
 * wind-combed swathes towards the edges, the grooves running along mown
 * paths, drifts of wildflowers with butterflies resting on them, a mown
 * circle with a bench, an old stile and fence posts, a molehill or two.
 * Big things keep clear of `keep`. Board coordinates.
 */
const SWARD = '#c6cf8c';
const SWARD_DEEP = '#93ad5e';
const HAY = '#d6c47e';
const TALL = '#6f9446';
const TALL_DEEP = '#4a6c38';
const TALL_LIT = '#b5c978';
const SEED = '#b39a5e';
const MOWN = '#d2dba0';
/** Half the mown path either side of a groove's centre line (the groove is 40 wide). */
const PATH_HALF = 36;
/** The mown circle's radius, and the bench's length. */
const CIRCLE_R = 70;
const BENCH_LEN = 74;

/** How tall the grass stands at a spot, 0 (mown short) to 1 (unmown). */
type Tallness = (x: number, y: number) => number;

/** A smooth wandering field in -1..1: a few sines at odd angles and random phases. */
function noiseOf(rng: Rng, scale: number): (x: number, y: number) => number {
  const waves = Array.from({ length: 4 }, (_, k) => ({ a: rng() * TAU, f: (1 + k * 0.7) / scale, p: rng() * TAU, w: 1 / (1 + k) }));
  const sum = waves.reduce((s, v) => s + v.w, 0);
  return (x, y) => waves.reduce((s, v) => s + v.w * Math.sin((x * Math.cos(v.a) + y * Math.sin(v.a)) * v.f + v.p), 0) / sum;
}

/** Tall at the edges and corners, short in an oval round the middle, wavering in swathes. */
function tallnessOf(w: number, h: number, rng: Rng): Tallness {
  const n = noiseOf(rng, 140);
  return (x, y) => {
    const e = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
    const t = Math.max(0, Math.min(1, (e - 0.55) / 0.45 + n(x, y) * 0.35));
    return t * t * (3 - 2 * t);
  };
}

/** The sward: a sunny wash, darker pooled at the edges, blooms where it dried unevenly, fine short blades flecked in. */
function sward(d: Draw, w: number, h: number, tall: Tallness, rng: Rng): void {
  const { ctx } = d.pen;
  groundWash(d, w, h, SWARD, 0.48);
  edgeWash(d, w, h, TALL, 0.32, 300);
  for (let k = 0; k < 70; k++) {
    const p = pt(rng() * w, rng() * h);
    const t = tall(p.x, p.y);
    const colour = rng() < 0.35 ? HAY : rng() < 0.6 ? TALL : PAPER_FILL;
    d.pen.fill(blob(p, 40 + rng() * 80, 25 + rng() * 45, rng, 0.28, 18, rng() * TAU), colour, 0.05 + 0.1 * t);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.6;
  for (const [colour, a] of [[SWARD_DEEP, 0.35], ['#a9bf6c', 0.35]] as const) {
    ctx.strokeStyle = rgba(colour, a);
    ctx.beginPath();
    for (let k = 0; k < 3200; k++) {
      const x = rng() * w;
      const y = rng() * h;
      const l = 1.5 + rng() * 2.5;
      const ang = -Math.PI / 2 + (rng() - 0.5) * 1.6;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Unmown grass combed by the wind: swathes of wash, then thousands of
 * leaning blades in shadow, mid and lit greens, with seed heads at their tips.
 */
function tallGrass(d: Draw, w: number, h: number, tall: Tallness, rng: Rng): void {
  const { ctx } = d.pen;
  const wind = noiseOf(rng, 220);
  for (let k = 0; k < 110; k++) {
    const p = pt(rng() * w, rng() * h);
    const t = tall(p.x, p.y);
    if (t < 0.15) continue;
    wash(d, blob(p, 26 + rng() * 40, 14 + rng() * 22, rng, 0.3, 16, wind(p.x, p.y) * 1.2 - 0.6), rng() < 0.3 ? HAY : TALL, 0.06 + 0.1 * t, 0.25);
  }
  const lean = (x: number, y: number): number => -2.2 + wind(x, y) * 1.1;
  const passes: readonly (readonly [string, number, number, number])[] = [
    // colour, alpha, width, shift towards the shadow
    [TALL_DEEP, 0.45, 1.1, 1.4],
    [TALL, 0.55, 0.9, 0],
    ['#88a94f', 0.5, 0.8, 0],
    [TALL_LIT, 0.55, 0.7, -0.6],
  ];
  const seeds: Pt[] = [];
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, alpha, width, shift] of passes) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < 4200; k++) {
      const x = rng() * w;
      const y = rng() * h;
      const t = tall(x, y);
      if (rng() > t * 1.15) continue;
      const a = lean(x, y) + (rng() - 0.5) * 0.7;
      const l = 6 + 14 * t + rng() * 6;
      const sx = x + SHADOW.x * shift;
      const sy = y + SHADOW.y * shift;
      const bend = (rng() - 0.5) * l * 0.35;
      const mx = sx + Math.cos(a) * l * 0.5 - Math.sin(a) * bend;
      const my = sy + Math.sin(a) * l * 0.5 + Math.cos(a) * bend;
      const ex = sx + Math.cos(a) * l;
      const ey = sy + Math.sin(a) * l;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      if (shift === 0 && rng() < 0.12 * t) seeds.push(pt(ex, ey));
    }
    ctx.stroke();
  }
  // Seed heads: little tan dabs at the blades' tips.
  ctx.fillStyle = rgba(SEED, 0.7);
  ctx.beginPath();
  for (const s of seeds) {
    ctx.moveTo(s.x + 1.6, s.y);
    ctx.ellipse(s.x, s.y, 1.6, 0.9, lean(s.x, s.y), 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** The mown ground as one path: a band along every groove and the circle. */
function mownPath(grooves: readonly (readonly Pt[])[], circle: Taken | null, dx = 0, dy = 0): (c: CanvasRenderingContext2D, width: number) => void {
  return (c, width) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = width;
    c.beginPath();
    for (const g of grooves) g.forEach((q, i) => (i === 0 ? c.moveTo(q.x + dx, q.y + dy) : c.lineTo(q.x + dx, q.y + dy)));
    c.stroke();
    if (circle) {
      c.beginPath();
      c.ellipse(circle.x + dx, circle.y + dy, circle.r + (width - PATH_HALF * 2) / 2, circle.r + (width - PATH_HALF * 2) / 2, 0, 0, TAU);
      c.fill();
    }
  };
}

/**
 * The mown paths the grooves run along, and the mown circle: short pale
 * grass with the mower's passes, the unmown grass's shade falling into them
 * on the side nearer the light (only out where the grass stands tall), and
 * blades leaning over their edges.
 */
function mown(d: Draw, w: number, h: number, grooves: readonly (readonly Pt[])[], circle: Taken | null, tall: Tallness, room: Room, rng: Rng): void {
  const { ctx } = d.pen;
  const paint = mownPath(grooves, circle);
  ctx.save();
  ctx.fillStyle = rgba(MOWN, 0.88);
  ctx.strokeStyle = rgba(MOWN, 0.88);
  paint(ctx, PATH_HALF * 2);
  ctx.fillStyle = rgba(PAPER_FILL, 0.16);
  ctx.strokeStyle = rgba(PAPER_FILL, 0.16);
  paint(ctx, PATH_HALF * 0.9);
  ctx.restore();
  // Shade from the tall grass on the light side, faded out towards the middle of the board.
  withScratch(ctx.canvas.width, ctx.canvas.height, (oc, canvas) => {
    oc.setTransform(ctx.getTransform());
    oc.fillStyle = TALL_DEEP;
    oc.strokeStyle = TALL_DEEP;
    paint(oc, PATH_HALF * 2);
    oc.globalCompositeOperation = 'destination-out';
    oc.fillStyle = '#000';
    oc.strokeStyle = '#000';
    mownPath(grooves, circle, SHADOW.x * 9, SHADOW.y * 9)(oc, PATH_HALF * 2);
    oc.globalCompositeOperation = 'destination-in';
    oc.save();
    oc.translate(w / 2, h / 2);
    oc.scale(1, h / w);
    const g = oc.createRadialGradient(0, 0, w * 0.3, 0, 0, w * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    oc.fillStyle = g;
    oc.fillRect(-w, -w, w * 2, w * 2);
    oc.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.28;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
  // Clippings and short blades in the mown grass.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = rgba(SWARD_DEEP, 0.4);
  ctx.beginPath();
  for (const g of grooves) {
    for (let i = 0; i < g.length; i += 1) {
      const p = polar(g[i]!, rng() * TAU, PATH_HALF * Math.sqrt(rng()));
      const a = rng() * TAU;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * 2, p.y + Math.sin(a) * 2);
    }
  }
  ctx.stroke();
  ctx.restore();
  // Blades of the long grass leaning over the edges.
  const fringe = (base: Pt, toward: number): void => {
    const t = tall(base.x, base.y);
    if (rng() > t * 0.9 + 0.08) return;
    const n = 2 + Math.floor(rng() * 3 * (0.4 + t));
    for (let k = 0; k < n; k++) {
      const b = polar(base, rng() * TAU, rng() * 3);
      const a = toward + (rng() - 0.5) * 1.2;
      const l = 4 + rng() * (4 + 8 * t);
      d.pen.hair([b, polar(polar(b, a, l * 0.5), a + 1.4, l * 0.12), polar(b, a, l)], 0.8 + rng() * 0.4, mix(TALL, rng() < 0.3 ? HAY : TALL_DEEP, rng() * 0.6), 0.75);
    }
  };
  for (const g of grooves) {
    const nrm = normals(g);
    for (let i = 0; i < g.length; i += 3) {
      for (const s of [1, -1]) {
        const base = pt(g[i]!.x + nrm[i]!.x * s * (PATH_HALF + 2), g[i]!.y + nrm[i]!.y * s * (PATH_HALF + 2));
        if (room(base.x, base.y) < -18) continue;
        fringe(base, Math.atan2(-nrm[i]!.y * s, -nrm[i]!.x * s));
      }
    }
  }
  if (circle) {
    for (let k = 0; k < 90; k++) {
      const a = (k / 90) * TAU + rng() * 0.05;
      fringe(polar(circle, a, circle.r + 2), a + Math.PI);
    }
  }
}

/** The mown circle and its bench, somewhere out in the tall grass with room for both. */
function circleSpot(w: number, h: number, tall: Tallness, room: Room, rng: Rng): Taken | null {
  for (let k = 0; k < 80; k++) {
    const p = spotFor(rng, room, [60, 60, w - 60, h - 60], CIRCLE_R, [], 0, 1);
    if (p && tall(p.x, p.y) > 0.5) return { x: p.x, y: p.y, r: CIRCLE_R };
  }
  return null;
}

/** A drift of one kind of flower, gathered round c, kept off the mown paths and things already placed. */
function drift(c: Pt, kind: Bloom, room: Room, taken: readonly Taken[], rng: Rng, out: [Pt, Bloom, number][]): void {
  const count = 5 + Math.floor(rng() * (kind === 'umbel' || kind === 'poppy' ? 7 : 18));
  const spread = 22 + rng() * 40;
  const turn = rng() * TAU;
  for (let k = 0; k < count; k++) {
    const r = spread * Math.sqrt(-2 * Math.log(1 - rng() * 0.95)) * 0.5;
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * r * 1.4 * Math.cos(turn) - Math.sin(a) * r * Math.sin(turn), c.y + Math.cos(a) * r * 1.4 * Math.sin(turn) + Math.sin(a) * r * Math.cos(turn));
    if (room(p.x, p.y) < -6 || taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + 4)) continue;
    if (out.some(([q]) => Math.hypot(q.x - p.x, q.y - p.y) < BLOOM_SIZE[kind] * 1.6)) continue;
    out.push([p, kind, BLOOM_SIZE[kind] * (0.8 + rng() * 0.4)]);
  }
}

/** How often each flower makes a drift: poppies are the rarest (their red is near the red marbles'). */
const DRIFT_WEIGHTS: readonly (readonly [Bloom, number])[] = [
  ['daisy', 3],
  ['buttercup', 3],
  ['clover', 2],
  ['knapweed', 2],
  ['cornflower', 2],
  ['umbel', 1.3],
  ['poppy', 0.9],
];
const DRIFT_TOTAL = DRIFT_WEIGHTS.reduce((s, [, w]) => s + w, 0);

function pickBloom(rng: Rng): Bloom {
  let r = rng() * DRIFT_TOTAL;
  for (const [kind, w] of DRIFT_WEIGHTS) if ((r -= w) < 0) return kind;
  return 'daisy';
}

/** Drifts of wildflowers, thickest at the edges, a few singles in the short grass, and butterflies resting on some. */
function flowers(d: Draw, w: number, h: number, tall: Tallness, room: Room, taken: readonly Taken[], rng: Rng): void {
  const all: [Pt, Bloom, number][] = [];
  for (let k = 0; k < 260 && all.length < 760; k++) {
    const c = pt(rng() * w, rng() * h);
    if (tall(c.x, c.y) < 0.3 + rng() * 0.4) continue;
    drift(c, pickBloom(rng), room, taken, rng, all);
  }
  const low: readonly Bloom[] = ['daisy', 'clover', 'buttercup'];
  for (let k = 0; k < 120; k++) {
    const p = pt(rng() * w, rng() * h);
    const t = tall(p.x, p.y);
    if (t > 0.4 || rng() < 0.6 || room(p.x, p.y) < -6) continue;
    const kind = low[Math.floor(rng() * low.length)]!;
    all.push([p, kind, BLOOM_SIZE[kind] * 0.7]);
  }
  all.sort((a, b) => a[0].y - b[0].y);
  for (const [p, kind, s] of all) bloom(d, kind, p, s, rng);
  const perches = all.filter(([p, kind]) => kind !== 'umbel' && tall(p.x, p.y) > 0.55);
  for (let k = 0; k < 4 && perches.length > 0; k++) {
    const [p] = perches.splice(Math.floor(rng() * perches.length), 1)[0]!;
    butterfly(d, p, rng() * TAU, 18 + rng() * 6, rng);
  }
}

/** A stile in an old fence line near the edge, two lone posts, a molehill or two. */
function things(d: Draw, w: number, h: number, tall: Tallness, room: Room, taken: Taken[], rng: Rng): void {
  for (let k = 0; k < 80; k++) {
    const c = pt(60 + rng() * (w - 120), 50 + rng() * (h - 100));
    if (tall(c.x, c.y) < 0.6) continue;
    // Along whichever side of the board it is nearer.
    const horizontal = Math.min(c.y, h - c.y) / h < Math.min(c.x, w - c.x) / w;
    const ang = (horizontal ? 0 : Math.PI / 2) + (rng() - 0.5) * 0.4;
    const u = pt(Math.cos(ang), Math.sin(ang));
    const len = 170;
    const foot = Array.from({ length: 7 }, (_, i) => pt(c.x + u.x * len * (i / 6 - 0.5), c.y + u.y * len * (i / 6 - 0.5)));
    if (!fits(room, foot, 14) || taken.some((t) => Math.hypot(t.x - c.x, t.y - c.y) < t.r + len / 2 + 10)) continue;
    stile(d, c, u, len, rng);
    taken.push({ x: c.x, y: c.y, r: len / 2 });
    break;
  }
  for (let k = 0, made = 0; k < 40 && made < 2; k++) {
    const p = spotFor(rng, room, [30, 30, w - 30, h - 30], 12, taken, 30, 1);
    if (!p || tall(p.x, p.y) < 0.55) continue;
    fencePost(d, p, 8 + rng() * 1.5, rng);
    taken.push({ x: p.x, y: p.y, r: 40 });
    made++;
  }
  for (let k = 0, made = 0; k < 40 && made < 2; k++) {
    const p = spotFor(rng, room, [40, 40, w - 40, h - 40], 20, taken, 30, 1);
    if (!p || tall(p.x, p.y) < 0.2) continue;
    molehill(d, p, 13 + rng() * 5, rng);
    taken.push({ x: p.x, y: p.y, r: 24 });
    made++;
  }
}

/** The meadow page: see the module comment. */
export function paintMeadow(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(7140);
  const room = roomOf(keep, w, h);
  const tall = tallnessOf(w, h, rng);
  const circle = circleSpot(w, h, tall, room, rng);
  sward(d, w, h, tall, rng);
  tallGrass(d, w, h, tall, rng);
  mown(d, w, h, keep.grooves, circle, tall, room, rng);
  const taken: Taken[] = [];
  if (circle) {
    // The bench at the circle's upper rim, facing in, its back to the long grass.
    const facing = pt(0.25, 1);
    const l = Math.hypot(facing.x, facing.y);
    const u = pt(facing.x / l, facing.y / l);
    bench(d, pt(circle.x - u.x * (circle.r - 26), circle.y - u.y * (circle.r - 26)), u, BENCH_LEN, rng);
    taken.push(circle);
  }
  things(d, w, h, tall, room, taken, rng);
  flowers(d, w, h, tall, room, taken, rng);
}
