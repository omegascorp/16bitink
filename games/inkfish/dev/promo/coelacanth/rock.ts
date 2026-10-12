import { halo } from '../../../src/art/glowArt';
import { Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { type Pt, pt } from './shape';
import { FOSSIL, FOSSIL_LAYER, LAYER_TOPS, layerAt, STAMP } from './story';

/**
 * The rock the fish is buried in: layers of sediment settling one on
 * another, each with its own colour, grain and a few small fossils; the
 * "EXTINCT" stamp; the cracks that spread through the fossil's layer with
 * blue light in them; and the shards it bursts into.
 */
const W = VIDEO.width;
const LAYER_FILL = ['#2e2925', '#3a322b', '#463b31', '#82775f', '#3d3530', '#2d2825', '#372f28'] as const;
const INK = '#120e0b';
const GLOW_BLUE = '#7fc4ff';

/** Each layer's top edge: gently wavy; the last one, the ground, rises into a ridge on the right. */
const WAVES = (() => {
  const rng = createRng(66);
  return LAYER_TOPS.map(() => ({ a: 8 + rng() * 10, f: 0.004 + rng() * 0.004, p: rng() * 6, b: 3 + rng() * 4, g: 0.017 + rng() * 0.01, q: rng() * 6 }));
})();

export function layerEdge(i: number, x: number, level: number): number {
  const w = WAVES[i]!;
  const ridge = i === LAYER_TOPS.length - 1 ? -70 * Math.exp(-(((x - 760) / 300) ** 2)) - 25 * Math.exp(-(((x - 180) / 200) ** 2)) : 0;
  return level + w.a * Math.sin(x * w.f + w.p) + w.b * Math.sin(x * w.g + w.q) + ridge;
}

/** The ground's height at x (world y), where the dinosaurs stand. */
export const groundAt = (x: number): number => layerEdge(LAYER_TOPS.length - 1, x, LAYER_TOPS[LAYER_TOPS.length - 1]!);

const edgePoints = (i: number, level: number, camY: number): Pt[] => Array.from({ length: 28 }, (_, k) => {
  const x = -20 + (k / 27) * (W + 40);
  return pt(x, layerEdge(i, x, level) - camY);
});

/** Grain for each layer: specks, dashes, pebbles, a few small shells and ammonites. Drawn once, world-fixed. */
function makeGrain(): HTMLCanvasElement {
  const top = LAYER_TOPS[LAYER_TOPS.length - 1]! - 120;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = 2000 - top;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(0, -top);
  const rng = createRng(1938);
  const pen = new Pen(ctx, 7, 1.2);
  for (let i = 0; i < LAYER_TOPS.length; i++) {
    const y0 = LAYER_TOPS[i]!;
    const y1 = i === 0 ? 2000 : LAYER_TOPS[i - 1]!;
    const light = i === FOSSIL_LAYER;
    const ink = light ? '#4d4436' : '#0d0a08';
    for (let k = 0; k < (y1 - y0) * 1.1; k++) {
      ctx.fillStyle = rng() < 0.5 ? ink : light ? '#a99c82' : '#5a4e42';
      ctx.globalAlpha = 0.25 + rng() * 0.35;
      ctx.fillRect(rng() * W, y0 + rng() * (y1 - y0), 1.5 + rng() * 2.5, 1.5 + rng() * 2);
    }
    ctx.globalAlpha = 1;
    // Bedding: faint lines along the layer.
    for (let k = 0; k < (y1 - y0) / 34; k++) {
      const y = y0 + 20 + rng() * (y1 - y0 - 30);
      const x = rng() * W;
      const len = 80 + rng() * 260;
      pen.hair([pt(x, y), pt(x + len / 2, y + (rng() - 0.5) * 6), pt(x + len, y + (rng() - 0.5) * 6)], 1.4, ink, 0.35);
    }
    // Pebbles.
    for (let k = 0; k < (light ? 4 : 10); k++) {
      const x = rng() * W;
      const y = y0 + 30 + rng() * (y1 - y0 - 50);
      const r = 5 + rng() * 9;
      const blob = Array.from({ length: 8 }, (_, j) => pt(x + Math.cos(j * 0.785) * r * (0.8 + rng() * 0.4), y + Math.sin(j * 0.785) * r * 0.7));
      pen.fill(blob, light ? '#6d624f' : '#4a4038', 1);
      pen.stroke([...blob, blob[0]!], 1.6, INK, 0.8, false);
    }
    // An ammonite or a shell here and there (not in the fish's layer: it has the fish).
    if (!light) {
      for (let k = 0; k < 2; k++) {
        const x = 60 + rng() * (W - 120);
        const y = y0 + 50 + rng() * Math.max(10, y1 - y0 - 90);
        const r = 14 + rng() * 10;
        const spiral = Array.from({ length: 40 }, (_, j) => {
          const a = j * 0.42;
          const rr = r * (1 - j / 46);
          return pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        });
        pen.stroke(spiral, 2, '#8a7c66', 0.7, false);
      }
    }
  }
  return canvas;
}

export interface Rock {
  /** The layers settled so far (`t`), world-fixed, seen from camera height `camY`. */
  draw(ctx: CanvasRenderingContext2D, t: number, camY: number): void;
}

export function makeRock(): Rock {
  const grain = makeGrain();
  const grainTop = LAYER_TOPS[LAYER_TOPS.length - 1]! - 120;
  return {
    draw(ctx, t, camY): void {
      for (let i = 0; i < LAYER_TOPS.length; i++) {
        const u = layerAt(i, t);
        if (u <= 0) continue;
        const floor = i === 0 ? 2000 : LAYER_TOPS[i - 1]!;
        const level = floor + (LAYER_TOPS[i]! - floor) * u;
        const top = edgePoints(i, level, camY);
        const below = i === 0 ? [pt(W + 20, 2000 - camY), pt(-20, 2000 - camY)] : edgePoints(i - 1, floor, camY).reverse().map((p) => pt(p.x, p.y + 6));
        const shape = [...top, ...below];
        ctx.save();
        ctx.beginPath();
        shape.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = LAYER_FILL[i]!;
        ctx.fill();
        ctx.clip();
        ctx.drawImage(grain, 0, grainTop - camY);
        // Lit from above: a lighter band along the top, shadow towards the bottom.
        const g = ctx.createLinearGradient(0, level - camY - 20, 0, floor - camY);
        g.addColorStop(0, 'rgba(255,240,215,0.12)');
        g.addColorStop(0.25, 'rgba(255,240,215,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = g;
        ctx.fillRect(0, level - camY - 40, W, floor - level + 60);
        ctx.restore();
        const pen = new Pen(ctx, 300 + i * 17, 1.5);
        pen.stroke(top, 4, INK, 0.9, false);
        pen.hair(top.map((p) => pt(p.x, p.y + 5)), 2, '#cdbb9a', 0.25);
      }
    },
  };
}

/** The clip of everything under the sediment's surface so far (screen), for turning the fish to stone where it's buried. */
export function buriedClip(ctx: CanvasRenderingContext2D, t: number, camY: number): void {
  let i = 0;
  let level = 2000;
  LAYER_TOPS.forEach((top, k) => {
    const u = layerAt(k, t);
    if (u <= 0) return;
    const floor = k === 0 ? 2000 : LAYER_TOPS[k - 1]!;
    i = k;
    level = floor + (top - floor) * u;
  });
  const edge = edgePoints(i, level, camY);
  ctx.beginPath();
  [...edge, pt(W + 20, 2100), pt(-20, 2100)].forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

// ---------------------------------------------------------------- cracks and shards

interface Crack {
  readonly pts: readonly Pt[];
  readonly from: number;
}

/** Jagged cracks from the fossil's outline out through its layer, each starting at its own moment. */
const CRACKS: readonly Crack[] = (() => {
  const rng = createRng(1952);
  const out: Crack[] = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + rng() * 0.3;
    const start = pt(FOSSIL.x + Math.cos(a) * 300, FOSSIL.y + Math.sin(a) * 110);
    const pts: Pt[] = [start];
    let dir = a;
    let p = start;
    for (let s = 0; s < 9; s++) {
      dir += (rng() - 0.5) * 0.9;
      const len = 26 + rng() * 34;
      p = pt(p.x + Math.cos(dir) * len, p.y + Math.sin(dir) * len * 0.8);
      pts.push(p);
    }
    out.push({ pts, from: rng() * 0.45 });
  }
  // And across the fish itself.
  for (let k = 0; k < 6; k++) {
    const x = FOSSIL.x - 300 + k * 120 + rng() * 40;
    const pts = Array.from({ length: 7 }, (_, s) => pt(x + (rng() - 0.5) * 50, FOSSIL.y - 130 + s * 44));
    out.push({ pts, from: 0.35 + rng() * 0.35 });
  }
  return out;
})();

/** Cracks grown to `u` (0 .. 1), glowing blue from within; the fossil glows through its rock. */
export function drawCracks(ctx: CanvasRenderingContext2D, u: number, camY: number, boil: number): void {
  if (u <= 0) return;
  halo(ctx, FOSSIL.x, FOSSIL.y - camY, 520, GLOW_BLUE, 0.35 * u * u);
  CRACKS.forEach((c, k) => {
    const grow = Math.max(0, Math.min(1, (u - c.from) / 0.5));
    if (grow <= 0) return;
    const n = Math.max(2, Math.ceil(grow * c.pts.length));
    const pts = c.pts.slice(0, n).map((p) => pt(p.x, p.y - camY));
    const pen = new Pen(ctx, 900 + k * 13 + boil * 977, 1.2);
    ctx.save();
    ctx.shadowColor = GLOW_BLUE;
    ctx.shadowBlur = 22 * u;
    pen.stroke(pts, 9, '#1b4f86', 0.9, false);
    ctx.restore();
    pen.stroke(pts, 3.2, '#d8efff', 0.95, false);
  });
}

interface Shard {
  readonly pts: readonly Pt[];
  readonly c: Pt;
  readonly v: Pt;
  readonly spin: number;
  readonly fill: string;
}

/** The fossil's layer broken into pieces round the fish, each flung out from it. */
const SHARDS: readonly Shard[] = (() => {
  const rng = createRng(22);
  const out: Shard[] = [];
  const fills = ['#82775f', '#6e6450', '#5d5446', '#8d8169', '#51483b'] as const;
  for (let gy = 420; gy < 1000; gy += 95) {
    for (let gx = -20; gx < W + 20; gx += 95) {
      const c = pt(gx + 48 + (rng() - 0.5) * 50, gy + 48 + (rng() - 0.5) * 50);
      const dx = c.x - FOSSIL.x;
      const dy = c.y - FOSSIL.y;
      const d = Math.hypot(dx, dy) || 1;
      // Smaller, faster pieces nearest the fish.
      const size = 40 + Math.min(1, d / 500) * 50 + rng() * 25;
      const n = 4 + Math.floor(rng() * 3);
      const pts = Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2 + rng() * 0.9;
        const r = size * (0.45 + rng() * 0.55);
        return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.8);
      });
      const speed = (1500 - Math.min(1, d / 600) * 700) * (0.7 + rng() * 0.6);
      out.push({ pts, c, v: pt((dx / d) * speed, (dy / d) * speed - 400), spin: (rng() - 0.5) * 10, fill: fills[Math.floor(rng() * fills.length)]! });
    }
  }
  return out;
})();

/** The pieces flying `tau` seconds after the burst. */
export function drawShards(ctx: CanvasRenderingContext2D, tau: number, camY: number): void {
  if (tau < 0) return;
  ctx.save();
  // Where the layer was: a hollow full of blue light.
  ctx.globalAlpha = Math.min(1, tau / 0.05);
  const hollow = ctx.createRadialGradient(FOSSIL.x, FOSSIL.y - camY, 40, FOSSIL.x, FOSSIL.y - camY, 620);
  hollow.addColorStop(0, '#2c6aa8');
  hollow.addColorStop(0.6, '#0b1a33');
  hollow.addColorStop(1, '#05070c');
  ctx.fillStyle = hollow;
  ctx.beginPath();
  ctx.ellipse(FOSSIL.x, FOSSIL.y - camY, 560 + 900 * tau, 290 + 500 * tau, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const s of SHARDS) {
    const ox = s.v.x * tau;
    const oy = s.v.y * tau + 1800 * tau * tau;
    const a = s.spin * tau;
    const [cos, sin] = [Math.cos(a), Math.sin(a)];
    ctx.beginPath();
    s.pts.forEach((p, k) => {
      const x = s.c.x + (p.x - s.c.x) * cos - (p.y - s.c.y) * sin + ox;
      const y = s.c.y + (p.x - s.c.x) * sin + (p.y - s.c.y) * cos + oy - camY;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = s.fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the stamp

const STAMP_RED = '#c8402f';

/** "EXTINCT" in a rubber stamp's red box, worn in places. */
export function makeStamp(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 220;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = STAMP_RED;
  ctx.fillStyle = STAMP_RED;
  ctx.lineWidth = 12;
  ctx.strokeRect(14, 14, 652, 192);
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 616, 156);
  ctx.font = '900 132px Impact, "Arial Black", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  (ctx as unknown as { letterSpacing: string }).letterSpacing = '10px';
  ctx.fillText('EXTINCT', 345, 116);
  // Worn: specks where the ink didn't take.
  const rng = createRng(1);
  ctx.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 900; k++) {
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    ctx.beginPath();
    ctx.arc(rng() * 680, rng() * 220, 0.8 + rng() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** The stamp's cracks, as it breaks with the rock (stamp px, from its middle). */
const STAMP_CRACKS: readonly (readonly Pt[])[] = (() => {
  const rng = createRng(3);
  return Array.from({ length: 5 }, (_, k) => {
    const x0 = -300 + k * 150 + rng() * 40;
    return Array.from({ length: 6 }, (_, s) => pt(x0 + (rng() - 0.5) * 60, -110 + s * 44));
  });
})();

export function drawStamp(ctx: CanvasRenderingContext2D, stamp: HTMLCanvasElement, s: { alpha: number; scale: number; crack: number }, camY: number, boil: number): void {
  if (s.alpha <= 0) return;
  ctx.save();
  ctx.translate(STAMP.x, STAMP.y - camY);
  ctx.rotate(STAMP.angle);
  ctx.scale(s.scale * STAMP.scale, s.scale * STAMP.scale);
  ctx.globalAlpha = s.alpha * 0.92;
  ctx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
  if (s.crack > 0) {
    STAMP_CRACKS.forEach((c, k) => {
      const n = Math.max(2, Math.ceil(c.length * Math.min(1, s.crack * 1.6 - k * 0.12)));
      if (s.crack * 1.6 - k * 0.12 <= 0) return;
      new Pen(ctx, 40 + k + boil * 977, 1).stroke(c.slice(0, n), 5, '#0a0d14', 1, false);
    });
  }
  ctx.restore();
}
