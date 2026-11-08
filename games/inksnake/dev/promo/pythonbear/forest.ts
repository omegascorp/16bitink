import { createRng } from '../../../src/logic/rng';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { cub, pt } from '../../../src/art/kit';
import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';

/**
 * Borneo's rainforest, painted once per look: misty trunks fading back into
 * the green, buttress roots, shafts of light, big leaves and ferns inked at
 * the edges, a floor of leaf litter. 'day' for the field shots, 'night' (deep
 * blue-green, moonlit edges) behind the hook, 'dusk' for the waiting.
 */
export type ForestLook = 'day' | 'night' | 'dusk';

interface Palette {
  readonly top: string;
  readonly mid: string;
  readonly floor: string;
  readonly floorDeep: string;
  readonly far: string;
  readonly trunk: string;
  readonly leaf: readonly string[];
  readonly light: string;
  readonly line: string;
  readonly beams: number;
}

const LOOKS: Readonly<Record<ForestLook, Palette>> = {
  day: {
    top: '#1f3a2a', mid: '#6f8f5e', floor: '#5a4a30', floorDeep: '#2c2418', far: '#9fb58a', trunk: '#4a3c2c',
    leaf: ['#2f5a2e', '#3f7038', '#557f3c', '#28482a'], light: '#f4e7b0', line: '#13180f', beams: 0.22,
  },
  dusk: {
    top: '#1a2426', mid: '#4e5e4a', floor: '#44382a', floorDeep: '#211b14', far: '#7d8a70', trunk: '#3a3026',
    leaf: ['#25412a', '#31542f', '#3e6034', '#1f3622'], light: '#f0c48a', line: '#0f130d', beams: 0.12,
  },
  night: {
    top: '#060d10', mid: '#1b2f2c', floor: '#1d1a14', floorDeep: '#0a0907', far: '#2c4440', trunk: '#161a16',
    leaf: ['#10241c', '#163024', '#1d3a2a', '#0c1c16'], light: '#b9d6e0', line: '#030605', beams: 0.06,
  },
};

function leafShape(at: Pt, len: number, rot: number, width = 0.32): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const to = (x: number, y: number): Pt => pt(at.x + x * c - y * s, at.y + x * s + y * c);
  return [...cub(to(0, 0), to(len * 0.3, -len * width), to(len * 0.75, -len * width * 0.8), to(len, 0), 10),
    ...cub(to(len, 0), to(len * 0.75, len * width * 0.8), to(len * 0.3, len * width), to(0, 0), 10).slice(1)];
}

/** One big leaf: a wash, lighter along the midrib, the veins and the edge in pen. */
function leaf(pen: Pen, p: Palette, at: Pt, len: number, rot: number, tone: number, lit: number): void {
  const shape = leafShape(at, len, rot);
  const base = p.leaf[tone % p.leaf.length]!;
  pen.fill(shape, base, 0.96);
  pen.clipped(shape, () => {
    const mid = pt(at.x + Math.cos(rot) * len * 0.45, at.y + Math.sin(rot) * len * 0.45);
    glaze(pen.ctx, mid.x, mid.y, len * 0.5, len * 0.14, rot, mix(base, p.light, 0.35), 0.35 + 0.3 * lit);
    glaze(pen.ctx, mid.x + Math.sin(rot) * len * 0.12, mid.y - Math.cos(rot) * len * 0.12, len * 0.4, len * 0.08, rot, p.light, 0.12 * lit);
  });
  const tip = pt(at.x + Math.cos(rot) * len, at.y + Math.sin(rot) * len);
  pen.hair([at, tip], Math.max(0.8, len * 0.012), mix(base, p.light, 0.45), 0.7);
  for (let k = 1; k < 6; k++) {
    const u = k / 6;
    const b = pt(at.x + Math.cos(rot) * len * u, at.y + Math.sin(rot) * len * u);
    for (const side of [-1, 1]) {
      const a = rot + side * 0.75;
      pen.hair([b, pt(b.x + Math.cos(a) * len * 0.2, b.y + Math.sin(a) * len * 0.2)], Math.max(0.5, len * 0.006), p.line, 0.35);
    }
  }
  pen.stroke([...shape, shape[0]!], Math.max(1, len * 0.012), p.line, 0.75, false);
}

/** A fern frond: a curved rachis with pairs of narrow leaflets. */
function frond(pen: Pen, p: Palette, at: Pt, len: number, rot: number, bend: number, tone: number): void {
  const n = 14;
  let a = rot;
  let q = at;
  for (let i = 0; i < n; i++) {
    const step = len / n;
    const next = pt(q.x + Math.cos(a) * step, q.y + Math.sin(a) * step);
    const size = len * 0.22 * (1 - i / n) + 4;
    for (const side of [-1, 1]) leaf(pen, p, q, size, a + side * 1.05, tone + (i % 2), 0.4);
    pen.hair([q, next], Math.max(1, len * 0.008), p.line, 0.6);
    q = next;
    a += bend / n;
  }
}

function trunk(pen: Pen, p: Palette, x: number, w: number, ground: number, haze: number, rng: () => number): void {
  const colour = mix(p.trunk, p.far, haze);
  const shape: Pt[] = [
    pt(x - w * 0.5, -20), pt(x + w * 0.5, -20), pt(x + w * 0.55, ground - w * 1.2),
    ...cub(pt(x + w * 0.55, ground - w * 1.2), pt(x + w * 0.8, ground - w * 0.3), pt(x + w * 1.6, ground - 10), pt(x + w * 2.1, ground + 6), 8).slice(1),
    ...cub(pt(x - w * 2.1, ground + 6), pt(x - w * 1.6, ground - 10), pt(x - w * 0.8, ground - w * 0.3), pt(x - w * 0.55, ground - w * 1.2), 8),
  ];
  pen.fill(shape, colour, 1);
  pen.clipped(shape, () => {
    glaze(pen.ctx, x - w * 0.25, ground * 0.5, w * 0.35, ground * 0.6, 0, mix(colour, p.light, 0.3), 0.4);
    glaze(pen.ctx, x + w * 0.4, ground * 0.5, w * 0.3, ground * 0.6, 0, p.line, 0.3 * (1 - haze));
    for (let i = 0; i < 18; i++) {
      const y = rng() * ground;
      pen.hair([pt(x - w * 0.3 + rng() * w * 0.6, y), pt(x - w * 0.3 + rng() * w * 0.6, y + 20 + rng() * 60)], 1, p.line, 0.25 * (1 - haze));
    }
  });
  if (haze < 0.5) pen.stroke([...shape.slice(2), shape[0]!], 1.6, p.line, 0.6 * (1 - haze), false);
}

/** The forest, `w` × `h` px, the floor from `ground` down; `seed` varies the planting. */
export function paintForest(w: number, h: number, ground: number, look: ForestLook, seed: number, boil = 0): HTMLCanvasElement {
  const p = LOOKS[look];
  const { canvas, ctx } = makeCanvas(w, h);
  const pen = new Pen(ctx, seed * 10 + boil, 0.6);
  const rng = createRng(seed);
  const sky = ctx.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, p.top);
  sky.addColorStop(0.55, mix(p.top, p.mid, 0.7));
  sky.addColorStop(1, p.mid);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, ground + 40);
  // Far trunks in the haze, then nearer ones.
  for (let i = 0; i < 9; i++) trunk(pen, p, rng() * w, 16 + rng() * 20, ground - 30, 0.65 + rng() * 0.2, rng);
  ctx.fillStyle = rgba(p.far, 0.18);
  ctx.fillRect(0, 0, w, ground);
  for (let i = 0; i < 4; i++) trunk(pen, p, (i + 0.3 + rng() * 0.4) * (w / 4), 46 + rng() * 40, ground, 0.15 + rng() * 0.2, rng);
  // The canopy's leaves hanging in at the top.
  for (let i = 0; i < 26; i++) leaf(pen, p, pt(rng() * w, -30 + rng() * 160), 90 + rng() * 120, Math.PI * (0.3 + rng() * 0.4), i, 0.3);
  // Shafts of light.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const x = rng() * w;
    const g = ctx.createLinearGradient(x, 0, x + 300, ground);
    g.addColorStop(0, rgba(p.light, p.beams));
    g.addColorStop(1, rgba(p.light, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 420, ground + 60);
    ctx.lineTo(x + 240, ground + 60);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // The floor: litter and dark soil.
  const floor = ctx.createLinearGradient(0, ground, 0, h);
  floor.addColorStop(0, p.floor);
  floor.addColorStop(1, p.floorDeep);
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, ground + 10);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, ground + Math.sin(x * 0.013 + seed) * 8);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 520; i++) {
    const y = ground + rng() * (h - ground);
    const k = (y - ground) / (h - ground);
    const tone = mix(p.floor, i % 3 === 0 ? '#8a5a2c' : p.floorDeep, 0.3 + rng() * 0.4);
    const shape = leafShape(pt(rng() * w, y), 14 + 30 * k + rng() * 20, rng() * Math.PI * 2, 0.36);
    pen.fill(shape, tone, 0.55 + 0.3 * rng());
    pen.hair(shape.slice(0, 11), 0.8, p.line, 0.25);
  }
  // Ferns and big leaves at the back of the floor and in at the sides.
  for (let i = 0; i < 7; i++) frond(pen, p, pt(rng() * w, ground + 10), 140 + rng() * 120, -Math.PI / 2 + (rng() - 0.5) * 1.6, (rng() - 0.5) * 1.4, i);
  for (const side of [0, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = side ? w + 20 : -20;
      const y = ground - 200 + rng() * 500;
      leaf(pen, p, pt(x, y), 160 + rng() * 140, side ? Math.PI + (rng() - 0.5) * 0.9 : (rng() - 0.5) * 0.9, i + side, 0.6);
    }
  }
  return canvas;
}
