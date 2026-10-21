import type { Rng } from '../../logic/rng';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { castShadow, scalloped } from './flora';

/**
 * The night garden's things as the map paints them, in world px. Most are
 * painted in daylight colours and then glazed over with the band's
 * moonlight veil; what glows (the moon, its reflection, lanterns, pale
 * flowers, fireflies) is painted after the veil, so it stays bright.
 */
const BOX = '#3f6a4a';
const BRONZE = '#a8844a';
export const LAMP = '#ffd27a';

/** A clipped box hedge along a closed outline, `w` thick: dark and dense, its leaves stippled, a shadow to the lower right. */
export function boxHedge(d: Draw, outline: readonly Pt[], w: number, rng: Rng): void {
  const ctx = d.pen.ctx;
  const path = new Path2D();
  outline.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.translate(6, 9);
  ctx.strokeStyle = 'rgba(38,49,106,0.16)';
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.translate(-6, -9);
  ctx.strokeStyle = d.ink;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = w + 2.4;
  ctx.stroke(path);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.strokeStyle = BOX;
  ctx.globalAlpha = 0.85;
  ctx.stroke(path);
  // Leaf texture: lit and dark specks along the hedge.
  const lit = new Path2D();
  const dark = new Path2D();
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const x = a.x + (b.x - a.x) * u + (rng() - 0.5) * w * 0.8;
      const y = a.y + (b.y - a.y) * u + (rng() - 0.5) * w * 0.8;
      const p = rng() < 0.45 ? lit : dark;
      p.moveTo(x + 1.6, y);
      p.arc(x, y, 1.1 + rng() * 0.9, 0, TAU);
    }
  }
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#8fbf8a';
  ctx.fill(lit);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#1f3a2a';
  ctx.fill(dark);
  ctx.restore();
}

/** A clipped topiary from above: a ball or a cone of box, its shadow long under the moon. */
export function topiary(d: Draw, c: Pt, r: number, cone: boolean, rng: Rng): void {
  const { pen } = d;
  const body = scalloped(c, r, 14, rng, 0.05);
  pen.fill(body.map((p) => pt(p.x + r * (cone ? 1.4 : 0.8), p.y + r * (cone ? 2 : 1.1))), d.ink, 0.16);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, mix(BOX, '#2f5a33', 0.3), 0.85);
  if (cone) for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    pen.hair([pt(c.x - r * 0.15, c.y - r * 0.2), pt(c.x + Math.cos(a) * r * 0.9, c.y + Math.sin(a) * r * 0.9)], 0.5, '#1f3a2a', 0.45);
  }
  pen.crescent(body, pt(-r * 0.3, -r * 0.45), () => pen.fill(body, '#1f3a2a', 0.35));
  pen.stroke(closed(body), 1, d.ink, 0.85);
}

/** The moon-dial on its stone pillar: a bronze dial with the moon's phases round its rim and a gnomon across it. */
export function moonDial(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const step = Array.from({ length: 8 }, (_, k) => pt(c.x + Math.cos((k / 8) * TAU + TAU / 16) * 40, c.y + Math.sin((k / 8) * TAU + TAU / 16) * 40));
  castShadow(d, step, 22, 0.16);
  pen.fill(step, PAPER_FILL, 1);
  pen.fill(step, STONE, 0.7);
  pen.crescent(step, pt(-4, -6), () => pen.fill(step, STONE_DARK, 0.35));
  pen.stroke(closed(step), 1, d.ink, 0.85);
  const pillar = oval(c.x, c.y, 25, 25, 24);
  castShadow(d, pillar, 30, 0.18);
  pen.fill(pillar, PAPER_FILL, 1);
  pen.fill(pillar, mix(STONE, '#ffffff', 0.2), 0.8);
  pen.stroke(closed(pillar), 1, d.ink, 0.85);
  const dial = oval(c.x, c.y, 20, 20, 30);
  pen.fill(dial, BRONZE, 0.85);
  pen.fill(dial, '#4a8a7a', 0.25);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU - Math.PI / 2;
    const p = pt(c.x + Math.cos(a) * 15, c.y + Math.sin(a) * 15);
    pen.dot(p.x, p.y, 2.3, '#f4ecc8', 0.95);
    // Each phase: the dark part of the little moon.
    const f = Math.cos((k / 8) * TAU);
    if (k !== 0) pen.fill(oval(p.x + f * 1.6, p.y, 2.3 * Math.abs(f) + 0.2, 2.3, 10), '#3a3020', 0.7);
  }
  pen.hair(closed(oval(c.x, c.y, 10.5, 10.5, 20)), 0.5, d.ink, 0.7);
  pen.fill([pt(c.x - 1.2, c.y + 9), pt(c.x - 1.2, c.y - 9), pt(c.x + 7, c.y + 9)], '#6a5030', 0.95);
  pen.hair([pt(c.x - 1.2, c.y - 9), pt(c.x + 7, c.y + 9)], 0.6, d.ink, 0.85);
  pen.stroke(closed(dial), 0.9, d.ink, 0.9);
  pen.dot(c.x - 6 + rng(), c.y - 7, 1.4, PAPER_FILL, 0.7);
}

/** A round pool in its stone kerb: dark still water, lily pads with white flowers. */
export function pool(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const kerb = oval(c.x, c.y, r + 12, (r + 12) * 0.9, 48);
  castShadow(d, kerb, 10, 0.14);
  pen.fill(kerb, PAPER_FILL, 1);
  pen.fill(kerb, STONE, 0.72);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    pen.hair([pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.9), pt(c.x + Math.cos(a) * (r + 12), c.y + Math.sin(a) * (r + 12) * 0.9)], 0.45, d.ink, 0.5);
  }
  const water = oval(c.x, c.y, r, r * 0.9, 44);
  pen.fill(water, '#2c4060', 0.85);
  pen.crescent(water, pt(6, 8), () => pen.fill(water, '#101a30', 0.4));
  pen.stroke(closed(kerb), 1, d.ink, 0.85);
  pen.stroke(closed(water), 1, d.ink, 0.85);
  for (let k = 0; k < 5; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * r * 0.7, c.y + Math.sin(a) * r * 0.62);
    const pad = oval(p.x, p.y, 9, 8, 14);
    pen.fill(pad, '#4f7a5a', 0.8);
    pen.fill([p, pt(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 8 - 2), pt(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 8 + 2)], '#2c4060', 1);
    pen.hair(closed(pad), 0.4, d.ink, 0.6);
  }
}

/** The moon in the pool, painted after the veil: a pale disc broken by ripples, a few glints. */
export function moonInWater(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, r * 2.2);
  g.addColorStop(0, 'rgba(244,240,220,0.35)');
  g.addColorStop(1, 'rgba(244,240,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, r * 2.2, r * 1.6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  pen.fill(oval(c.x, c.y, r, r * 0.92, 24), '#f4f0dc', 0.45);
  for (let k = -3; k <= 3; k++) {
    const y = c.y + k * r * 0.28;
    const w = Math.sqrt(Math.max(0, 1 - (k / 3.4) ** 2)) * r;
    pen.hair([pt(c.x - w, y), pt(c.x + w * 0.9, y + 0.5)], 2.4, '#f4f0dc', 0.85);
  }
  pen.hair([pt(c.x - r * 1.5, c.y + r * 1.2), pt(c.x - r * 0.6, c.y + r * 1.2)], 0.8, '#f4f0dc', 0.5);
}

/** A garden lantern on a low iron post, lit: its warm glow pooled on the ground round it. */
export function pathLantern(d: Draw, c: Pt): void {
  const { pen } = d;
  const ctx = pen.ctx;
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 92);
  g.addColorStop(0, 'rgba(255,214,130,0.55)');
  g.addColorStop(0.3, 'rgba(255,200,110,0.16)');
  g.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 92, 0, TAU);
  ctx.fill();
  ctx.restore();
  const cap = [pt(c.x - 7, c.y - 4), pt(c.x, c.y - 10), pt(c.x + 7, c.y - 4), pt(c.x, c.y + 2)];
  pen.fill(oval(c.x, c.y + 1, 5.5, 5.5, 12), LAMP, 0.95);
  pen.dot(c.x, c.y + 1, 2.6, '#fff8e0', 1);
  pen.fill(cap, '#262a3e', 0.95);
  pen.hair(closed(oval(c.x, c.y + 1, 5.5, 5.5, 12)), 0.8, '#262a3e', 0.95);
}

/** The full moon over the garden: a pale disc with its seas washed in, a halo round it. */
export function fullMoon(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, r * 0.8, c.x, c.y, r * 3.2);
  g.addColorStop(0, 'rgba(244,240,220,0.4)');
  g.addColorStop(1, 'rgba(244,240,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 3.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  const disc = oval(c.x, c.y, r, r, 48);
  pen.fill(disc, '#f6f2de', 1);
  for (const [dx, dy, rx, ry] of [[-0.3, -0.2, 0.3, 0.22], [0.15, -0.35, 0.18, 0.14], [0.25, 0.2, 0.26, 0.2], [-0.15, 0.35, 0.15, 0.12]] as const) pen.fill(oval(c.x + dx * r, c.y + dy * r, rx * r, ry * r, 16), '#c9c4ac', 0.45);
  pen.crescent(disc, pt(-r * 0.12, -r * 0.16), () => pen.fill(disc, '#b8b49c', 0.35));
  pen.stroke(closed(disc), 1, '#26316a', 0.5);
}

/** A star: a bright point with four fine rays. */
export function nightStar(d: Draw, c: Pt, s: number): void {
  const { pen } = d;
  pen.dot(c.x, c.y, s * 0.35, '#fffbe8', 0.95);
  pen.hair([pt(c.x - s, c.y), pt(c.x + s, c.y)], 0.6, '#fffbe8', 0.75);
  pen.hair([pt(c.x, c.y - s), pt(c.x, c.y + s)], 0.6, '#fffbe8', 0.75);
}

/** A stone balustrade across x0..x1 standing on y, drawn a little from the front: plinth, vase balusters, coping, piers with urns. */
export function balustrade(d: Draw, x0: number, x1: number, y: number, rng: Rng): void {
  const { pen } = d;
  const H = 34;
  const pale = mix(STONE, '#ffffff', 0.35);
  pen.fill([pt(x0, y), pt(x1, y), pt(x1 + 20, y + 22), pt(x0 + 20, y + 22)], d.ink, 0.13);
  const plinth = [pt(x0, y - 6), pt(x1, y - 6), pt(x1, y), pt(x0, y)];
  pen.fill(plinth, PAPER_FILL, 1);
  pen.fill(plinth, pale, 0.8);
  pen.stroke(closed(plinth), 0.8, d.ink, 0.85, false);
  for (let x = x0 + 8; x < x1 - 6; x += 11) {
    const v = [pt(x - 2.4, y - 6), pt(x - 4.2, y - 14), pt(x - 2, y - 22), pt(x - 2.6, y - H + 6), pt(x + 2.6, y - H + 6), pt(x + 2, y - 22), pt(x + 4.2, y - 14), pt(x + 2.4, y - 6)];
    pen.fill(v, PAPER_FILL, 1);
    pen.fill(v, pale, 0.85);
    pen.fill(v.slice(4), STONE_DARK, 0.3);
    pen.hair(closed(v), 0.45, d.ink, 0.75);
  }
  const coping = [pt(x0 - 2, y - H - 2), pt(x1 + 2, y - H - 2), pt(x1 + 2, y - H + 6), pt(x0 - 2, y - H + 6)];
  pen.fill(coping, PAPER_FILL, 1);
  pen.fill(coping, pale, 0.9);
  pen.fill([pt(x0 - 2, y - H + 2), pt(x1 + 2, y - H + 2), pt(x1 + 2, y - H + 6), pt(x0 - 2, y - H + 6)], STONE_DARK, 0.3);
  pen.stroke(closed(coping), 0.9, d.ink, 0.9, false);
  for (const x of [x0, x1]) urnOnPier(d, pt(x, y), rng);
}

/** A square pier with a stone urn of trailing white flowers on it. */
export function urnOnPier(d: Draw, base: Pt, rng: Rng): void {
  const { pen } = d;
  const pale = mix(STONE, '#ffffff', 0.35);
  const face = [pt(base.x - 12, base.y - 44), pt(base.x + 12, base.y - 44), pt(base.x + 12, base.y + 2), pt(base.x - 12, base.y + 2)];
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, pale, 0.85);
  pen.crescent(face, pt(-8, 0), () => pen.fill(face, STONE_DARK, 0.35));
  pen.stroke(closed(face), 0.9, d.ink, 0.9, false);
  const bowl = [pt(base.x - 15, base.y - 62), pt(base.x + 15, base.y - 62), pt(base.x + 9, base.y - 50), pt(base.x + 4, base.y - 46), pt(base.x - 4, base.y - 46), pt(base.x - 9, base.y - 50)];
  pen.fill(bowl, PAPER_FILL, 1);
  pen.fill(bowl, pale, 0.9);
  pen.crescent(bowl, pt(-6, 0), () => pen.fill(bowl, STONE_DARK, 0.35));
  pen.stroke(closed(bowl), 0.9, d.ink, 0.9);
  for (let k = 0; k < 12; k++) {
    const p = pt(base.x + (rng() - 0.5) * 34, base.y - 64 - rng() * 8 + (Math.abs(rng() - 0.5) > 0.35 ? 14 : 0));
    pen.dot(p.x, p.y, 2.6, k % 3 ? '#3f6a4a' : '#5f8a5a', 0.95);
  }
}

/** A tall clipped yew column, drawn a little from the front: dark and dense, rounded at the top, its long shadow down the gravel. */
export function yewColumn(d: Draw, base: Pt, w: number, h: number, rng: Rng): void {
  const { pen } = d;
  pen.fill([pt(base.x - w / 2, base.y), pt(base.x + w / 2, base.y), pt(base.x + w / 2 + h * 0.6, base.y + h * 0.7), pt(base.x - w / 2 + h * 0.6, base.y + h * 0.74)], d.ink, 0.16);
  const body: Pt[] = [];
  for (let k = 0; k <= 10; k++) body.push(pt(base.x - w / 2 - Math.sin((k / 10) * Math.PI) * 2, base.y - (k / 10) * (h - w / 2)));
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI + (k / 10) * Math.PI;
    body.push(pt(base.x + Math.cos(a) * w / 2, base.y - h + w / 2 + Math.sin(a) * w / 2));
  }
  for (let k = 10; k >= 0; k--) body.push(pt(base.x + w / 2 + Math.sin((k / 10) * Math.PI) * 2, base.y - (k / 10) * (h - w / 2)));
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, '#2f5440', 0.9);
  pen.clipped(body, () => {
    for (let k = 0; k < h * 0.8; k++) pen.dot(base.x + (rng() - 0.5) * w, base.y - rng() * h, 1.2 + rng(), rng() < 0.4 ? '#6f9a7a' : '#1a3020', 0.45);
  });
  pen.crescent(body, pt(-w * 0.35, 0), () => pen.fill(body, '#14261a', 0.45));
  pen.stroke(closed(body), 1, d.ink, 0.85);
}

/** A few pale moths fluttering round a light. */
export function moths(d: Draw, c: Pt, rng: Rng): void {
  for (let k = 0; k < 3; k++) {
    const a = rng() * TAU;
    const p = pt(c.x + Math.cos(a) * (12 + rng() * 14), c.y + Math.sin(a) * (10 + rng() * 12));
    const t = rng() * TAU;
    for (const s of [-1, 1]) d.pen.fill(oval(p.x + Math.cos(t + s * 1.2) * 2.4, p.y + Math.sin(t + s * 1.2) * 2.4, 2.6, 1.6, 8), '#f4f0e0', 0.85);
  }
}
