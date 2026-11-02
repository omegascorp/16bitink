import type { Seg } from '../logic/geom';
import type { Room } from '../logic/level';
import { createRng } from '../logic/rng';
import { GRASS_H, GRASS_TILE_W } from './board';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { SAND, SAND_DARK, SAND_LIGHT } from './tomb';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's walls: big wind-worn sandstone blocks (no moss, no
 * vines), a painted band of made-up hieroglyphs along the top of each tall
 * room, cracks, and sand drifted into the floor corners. Also the cracked
 * bars a blast breaks, which show a web of cracks unlike any plain wall.
 */

const OCHRE = '#b0662f';
const NILE = '#3f7a8c';

/** The tomb's dressed sandstone, in courses, over the rooms (the caller clips to them). */
export function paintTombStone(ctx: CanvasRenderingContext2D, pen: Pen, bottom: number, right: number): void {
  const rng = createRng(23);
  let y = 300;
  while (y < bottom + 30) {
    const bh = 40 + Math.floor(rng() * 3) * 8;
    let x = -40 - rng() * 70;
    while (x < right + 60) {
      const bw = 70 + rng() * 80;
      const t = rng();
      const base = mix(SAND, SAND_DARK, t < 0.15 ? 0.45 : t * 0.25);
      const g = ctx.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, mix(base, '#fff7e0', 0.25));
      g.addColorStop(1, mix(base, SAND_DARK, 0.45));
      ctx.fillStyle = g;
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      // Wind-worn: a soft lit top, a sand-dusted bottom, ink joints.
      ctx.fillStyle = rgba('#fff7e0', 0.4);
      ctx.fillRect(x + 4, y + 3, bw - 8, 2);
      ctx.fillStyle = rgba('#7a5a32', 0.2);
      ctx.fillRect(x + 3, y + bh - 6, bw - 6, 4);
      pen.hair([{ x: x + 2, y: y + bh - 1 }, { x: x + bw - 2, y: y + bh - 0.5 }], 1, INK, 0.4);
      pen.hair([{ x: x + bw - 1, y: y + 2 }, { x: x + bw - 1.5, y: y + bh - 2 }], 1, INK, 0.4);
      // Cracks: a forked line now and then.
      if (rng() < 0.2) {
        const cx = x + bw * (0.2 + rng() * 0.6);
        const mid = { x: cx + (rng() - 0.5) * 8, y: y + bh * 0.5 };
        pen.hair([{ x: cx, y: y + 3 }, mid, { x: cx + (rng() - 0.5) * 10, y: y + bh - 3 }], 0.8, INK, 0.5);
        pen.hair([mid, { x: mid.x + 6 + rng() * 6, y: mid.y + 5 }], 0.7, INK, 0.4);
      }
      // Pits in the stone, and a fine sand stipple low on the block.
      for (let k = 0; k < 4; k++) pen.dot(x + 6 + rng() * (bw - 12), y + 6 + rng() * (bh - 12), 0.6 + rng() * 0.8, rgba(SAND_DARK, 0.8));
      for (let k = 0; k < 5; k++) pen.dot(x + 4 + rng() * (bw - 8), y + bh - 4 - rng() * 6, 0.5, rgba('#8a6a3a', 0.45));
      x += bw;
    }
    y += bh;
  }
}

/** True when (x, y) lies inside the room's outline. */
export function inside(room: Room, x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = room.length - 1; i < room.length; j = i++) {
    const [xi, yi] = room[i]!;
    const [xj, yj] = room[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** A painted band of hieroglyphs along the top of each tall room (made up for this tomb, not a real script). */
export function paintTombFrieze(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[]): void {
  for (const room of rooms) {
    const ys = room.map(([, y]) => y);
    const top = Math.min(...ys);
    if (Math.max(...ys) - top < 400) continue;
    const xs = room.filter(([, y]) => y === top).map(([x]) => x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = top + 40;
    const h = 30;
    ctx.fillStyle = rgba(mix(SAND, OCHRE, 0.3), 0.45);
    ctx.fillRect(x0, y0, x1 - x0, h);
    for (const yy of [y0, y0 + h]) {
      pen.hair([{ x: x0, y: yy }, { x: x1, y: yy }], 1.2, INK, 0.5);
      pen.hair([{ x: x0, y: yy + (yy === y0 ? 3 : -3) }, { x: x1, y: yy + (yy === y0 ? 3 : -3) }], 1.6, NILE, 0.45);
    }
    let k = 0;
    for (let x = x0 + 20; x < x1 - 14; x += 30, k++) hieroglyph(pen, x, y0 + h / 2, k % 5);
  }
}

function hieroglyph(pen: Pen, x: number, y: number, kind: number): void {
  const c = mix(OCHRE, INK, 0.45);
  if (kind === 0) {
    // A bird.
    pen.fill(ellipse(x, y + 1, 5, 3.4, 12), rgba(c, 0.85), 1);
    pen.dot(x + 5, y - 3, 2, c, 0.9);
    pen.hair([{ x: x + 6.5, y: y - 3 }, { x: x + 9, y: y - 2 }], 1, c, 0.9);
    pen.hair([{ x: x - 4, y: y + 1 }, { x: x - 9, y: y + 4 }], 1.1, c, 0.9);
    pen.hair([{ x: x, y: y + 4 }, { x: x - 1, y: y + 8 }], 0.9, c, 0.9);
  } else if (kind === 1) {
    // Water: three ripples.
    for (const dy of [-4, 0, 4]) pen.hair([{ x: x - 8, y: y + dy }, { x: x - 4, y: y + dy - 2 }, { x: x, y: y + dy }, { x: x + 4, y: y + dy - 2 }, { x: x + 8, y: y + dy }], 1, mix(NILE, INK, 0.3), 0.9);
  } else if (kind === 2) {
    // A reed.
    pen.hair([{ x, y: y + 9 }, { x, y: y - 6 }], 1.2, c, 0.9);
    pen.fill(ellipse(x + 2, y - 7, 2.4, 4, 10), c, 0.85);
  } else if (kind === 3) {
    // A looped cross, made up.
    pen.circle(x, y - 5, 3.2, 1.2, c);
    pen.hair([{ x, y: y - 1.5 }, { x, y: y + 9 }], 1.3, c, 0.9);
    pen.hair([{ x: x - 6, y: y + 1 }, { x: x + 6, y: y + 1 }], 1.3, c, 0.9);
  } else {
    // A hand and a serpent's wave.
    pen.hair([{ x: x - 9, y: y + 5 }, { x: x - 5, y: y - 2 }, { x: x - 1, y: y + 5 }, { x: x + 3, y: y - 2 }, { x: x + 7, y: y + 4 }, { x: x + 9, y: y + 2 }], 1.2, c, 0.9);
    pen.dot(x + 9, y + 1.6, 1.3, c, 0.9);
  }
}

/**
 * Sand drifted into the corners where a floor meets a wall rising from it:
 * low, so it never looks like a step (at most 7 px).
 */
export function paintSandDrifts(ctx: CanvasRenderingContext2D, pen: Pen, rooms: readonly Room[]): void {
  const rng = createRng(31);
  for (const room of rooms) {
    const n = room.length;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = room[i]!;
      const [bx, by] = room[(i + 1) % n]!;
      if (ay !== by || Math.abs(bx - ax) < 30) continue;
      // A floor: the room lies above it.
      if (!inside(room, (ax + bx) / 2, ay - 4)) continue;
      const ends: [number, number, number][] = [
        [ax, room[(i - 1 + n) % n]![1], Math.sign(bx - ax)],
        [bx, room[(i + 2) % n]![1], Math.sign(ax - bx)],
      ];
      for (const [x, ny, dir] of ends) {
        if (ny >= ay) continue; // no wall rising here: the floor drops away
        const len = Math.min(Math.abs(bx - ax) * 0.4, 34 + rng() * 26);
        const hgt = 4 + rng() * 3;
        const pts: Pt[] = [];
        for (let k = 0; k <= 12; k++) {
          const u = k / 12;
          pts.push({ x: x + dir * u * len, y: ay - hgt * Math.pow(1 - u, 1.6) });
        }
        pts.push({ x: x + dir * len, y: ay + 1 }, { x, y: ay + 1 });
        const g = ctx.createLinearGradient(0, ay - hgt, 0, ay);
        g.addColorStop(0, mix(SAND_LIGHT, SAND, 0.3));
        g.addColorStop(1, mix(SAND, SAND_DARK, 0.4));
        ctx.fillStyle = g;
        ctx.beginPath();
        pts.forEach((q, k) => (k === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
        ctx.closePath();
        ctx.fill();
        pen.hair(pts.slice(0, 13), 0.8, mix(SAND_DARK, INK, 0.4), 0.55);
        for (let k = 0; k < 6; k++) pen.dot(x + dir * rng() * len * 0.8, ay - rng() * hgt * 0.6, 0.45, rgba('#8a6a3a', 0.6));
      }
    }
  }
}

/**
 * A cracked bar's cracks: a jagged split running its length with forks off
 * it, chipped edges and a darker, sootier stone, so it never reads as a
 * plain wall. Drawn over the bar.
 */
export function paintCrackedBar(ctx: CanvasRenderingContext2D, pen: Pen, s: Seg, seed: number): void {
  const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
  if (len < 1) return;
  const ux = (s.bx - s.ax) / len;
  const uy = (s.by - s.ay) / len;
  const nx = -uy;
  const ny = ux;
  const at = (u: number, v: number): Pt => ({ x: s.ax + ux * u + nx * v, y: s.ay + uy * u + ny * v });
  const rng = createRng(seed);
  // A darker stain over it: the weak stone.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#6a4a2c', 0.4);
  ctx.lineWidth = s.t * 2 - 2;
  ctx.beginPath();
  ctx.moveTo(s.ax, s.ay);
  ctx.lineTo(s.bx, s.by);
  ctx.stroke();
  ctx.restore();
  // The main split, zigzagging down the bar's middle, and forks reaching to its edges.
  const spine: Pt[] = [];
  for (let u = -s.t * 0.4; u <= len + s.t * 0.4; u += 5 + rng() * 4) spine.push(at(u, (rng() - 0.5) * s.t * 0.9));
  pen.hair(spine, 1.9, INK, 0.95);
  for (let u = 8; u < len - 4; u += 12 + rng() * 10) {
    const side = rng() < 0.5 ? -1 : 1;
    const mid = at(u + 2, side * s.t * 0.45);
    pen.hair([at(u, (rng() - 0.5) * s.t * 0.4), mid, at(u + 5 + rng() * 4, side * s.t * 0.95)], 1, INK, 0.8);
    // A chip knocked out of the edge where the fork reaches it.
    if (rng() < 0.5) pen.fill([at(u + 3, side * s.t * 1.05), at(u + 6, side * s.t * 0.6), at(u + 9, side * s.t * 1.05)], '#3a2a1c', 0.75);
  }
}

/** The desert's ground strip along the ground line (in place of the jungle's grass): a low sand drift with ripples and a few pebbles. Tiles across. */
export function paintDuneTile(): HTMLCanvasElement {
  const W = GRASS_TILE_W;
  const H = GRASS_H;
  const { canvas, ctx } = makeCanvas(W * ART_RES, H * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  const pen = new Pen(ctx, 45, 0.5);
  const mid = H / 2;
  const top = (x: number): number => mid - 3 - Math.sin((x / W) * Math.PI * 2) * 3 - Math.sin((x / W) * Math.PI * 6) * 1.2;
  const g = ctx.createLinearGradient(0, mid - 8, 0, mid + 10);
  g.addColorStop(0, rgba(SAND_LIGHT, 0.98));
  g.addColorStop(1, rgba(mix(SAND, SAND_DARK, 0.6), 0.92));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, mid + 10);
  for (let x = 0; x <= W; x += 4) ctx.lineTo(x, top(x));
  ctx.lineTo(W, mid + 10);
  ctx.closePath();
  ctx.fill();
  const crest: Pt[] = [];
  for (let x = 0; x <= W; x += 8) crest.push({ x, y: top(x) });
  pen.hair(crest, 1, mix(SAND_DARK, INK, 0.35), 0.7);
  // Wind ripples, and a few pebbles.
  const rng = createRng(37);
  for (let i = 0; i < 9; i++) {
    const x = 10 + rng() * (W - 40);
    const y = mid + 1 + rng() * 6;
    pen.hair([{ x, y }, { x: x + 8, y: y - 1.2 }, { x: x + 18, y }], 0.7, SAND_DARK, 0.7);
  }
  for (let i = 0; i < 6; i++) pen.dot(8 + rng() * (W - 16), mid + 2 + rng() * 6, 0.8 + rng(), mix(SAND_DARK, INK, 0.3), 0.8);
  ctx.strokeStyle = rgba(INK, 0.7);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, mid + 9);
  ctx.lineTo(W, mid + 9);
  ctx.stroke();
  return canvas;
}
