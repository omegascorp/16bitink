import { MAP, type MapRegion } from '../../scenes/map/layout';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { boxPts } from './band';
import type { Barn } from './barnBand';
import { FACE } from './barnWalls';
import { Blobs, type Geo, hash, PATH_HALF, smoothstep, type Span, Ticks, touches } from './common';
import { raggedEdge } from './ground';

/**
 * The barn band's ground: the farmyard's beaten earth with its puddles
 * and wisps of straw, the barn's own floor with boards laid down the
 * middle, setts cobbling the way from the gate to the doors, and the
 * cattle grid in the gateway. Marks are seeded per world cell, so every
 * chunk agrees about them.
 */
const EARTH = '#b9a37e';
const FLOOR = '#a89070';
const BOARD = '#b08e66';

/** The ragged verge where the yard gives way to grass: close round the barn's sides, wide across the yard before and behind it. */
export function verge(b: Barn, y: number, side: 1 | -1): number {
  const wide = side < 0 ? 110 : MAP.width - 110;
  const near = side < 0 ? b.x0 - 100 : b.x1 + 100;
  const t = Math.max(smoothstep((y - b.y1 + 20) / 140), smoothstep((b.y0 - 30 - y) / 140));
  return near + (wide - near) * t - side * (Math.sin(y / 61) * 10 + Math.sin(y / 23 + 1) * 4);
}

/** The yard's beaten earth from `top` down to the gate, puddles in it; where it fades, the wash thinning to paper towards the top. */
export function paintYard(ctx: CanvasRenderingContext2D, span: Span, b: Barn, region: MapRegion, top: number, fades: boolean): void {
  const bottom = region.gate.y + 22;
  if (span.y1 < top - 30 || span.y0 > bottom + 10) return;
  const ya = Math.max(span.y0 - 10, top - 20);
  const yb = Math.min(span.y1 + 10, bottom);
  const yard = new Path2D();
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let y = Math.floor(ya / 10) * 10; y <= yb + 10; y += 10) {
    left.push(pt(verge(b, y, -1), y));
    right.push(pt(verge(b, y, 1), y));
  }
  yard.moveTo(left[0]!.x, Math.max(ya, top));
  for (let x = left[0]!.x; x <= right[0]!.x; x += 10) yard.lineTo(x, ya <= top ? raggedEdge(x, top, 5) : ya);
  for (const p of right) yard.lineTo(p.x, Math.min(p.y, bottom));
  for (const p of [...left].reverse()) yard.lineTo(p.x, Math.min(p.y, bottom));
  yard.closePath();
  ctx.save();
  ctx.fillStyle = rgba(PAPER_FILL, 0.45);
  ctx.fill(yard);
  ctx.fillStyle = rgba(EARTH, 0.32);
  ctx.fill(yard);
  ctx.clip(yard);
  const damp = new Blobs();
  const pale = new Blobs();
  const grit = new Blobs();
  const wisps = new Ticks();
  const puddles: Pt[] = [];
  for (let cy = Math.floor((ya - 140) / 140); cy * 140 < yb + 140; cy++) {
    for (let cx = 0; cx * 140 < MAP.width + 140; cx++) {
      const x = (cx + hash(cx, cy, 901)) * 140;
      const y = (cy + hash(cx, cy, 902)) * 140;
      (hash(cx, cy, 903) < 0.5 ? damp : pale).blot(x, y, 50 + hash(cx, cy, 904) * 70, 20 + hash(cx, cy, 905) * 30, (hash(cx, cy, 906) - 0.5) * 0.5, cx * 41 + cy * 7);
      if (hash(cx, cy, 907) < 0.13) puddles.push(pt(x, y));
    }
  }
  damp.fill(ctx, '#6a5a40', 0.1);
  pale.fill(ctx, PAPER_FILL, 0.18);
  for (let cy = Math.floor(ya / 8); cy * 8 < yb; cy++) {
    for (let k = 0; k < 40; k++) {
      const x = hash(cy, k, 911) * MAP.width;
      const y = (cy + hash(cy, k, 912)) * 8;
      grit.add(x, y, 0.5 + hash(cy, k, 913) * 0.9);
      if (k < 3) {
        const a = hash(cy, k, 914) * Math.PI;
        wisps.add(x, y, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
      }
    }
  }
  grit.fill(ctx, '#5a4a38', 0.3);
  wisps.stroke(ctx, '#c9a95a', 0.8, 0.55);
  for (const p of puddles) {
    const rx = 26 + hash(p.x, p.y, 915) * 26;
    const ry = rx * 0.45;
    ctx.fillStyle = rgba('#5a4a38', 0.18);
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 2, rx + 3, ry + 2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba('#93acb4', 0.55);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(PAPER_FILL, 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(p.x - rx * 0.5, p.y - ry * 0.2);
    ctx.lineTo(p.x + rx * 0.1, p.y - ry * 0.35);
    ctx.stroke();
  }
  ctx.restore();
  if (fades && span.y0 < region.top + 200) {
    const g = ctx.createLinearGradient(0, region.top + 200, 0, region.top);
    g.addColorStop(0, rgba(PAPER_FILL, 0));
    g.addColorStop(0.6, rgba(PAPER_FILL, 0.5));
    g.addColorStop(1, rgba(PAPER_FILL, 0.75));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(-50, region.top, MAP.width + 100, 200);
    ctx.restore();
  }
}

/** The barn's floor: beaten earth strewn with straw, and oak boards laid across the groove's way from door to door. */
export function paintBarnFloor(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, b: Barn): void {
  const y0 = Math.max(span.y0 - 4, b.y0);
  const y1 = Math.min(span.y1 + 4, b.y1);
  if (y1 <= y0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  ctx.clip();
  ctx.fillStyle = rgba(PAPER_FILL, 0.8);
  ctx.fillRect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  ctx.fillStyle = rgba(FLOOR, 0.45);
  ctx.fillRect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  // Dimmer away from the doors, daylight spilling in through each doorway.
  const dim = ctx.createLinearGradient(b.x0, 0, b.x1, 0);
  dim.addColorStop(0, rgba('#4a3a2a', 0.14));
  dim.addColorStop(0.3, rgba('#4a3a2a', 0.04));
  dim.addColorStop(0.7, rgba('#4a3a2a', 0.04));
  dim.addColorStop(1, rgba('#4a3a2a', 0.14));
  ctx.fillStyle = dim;
  ctx.fillRect(b.x0, y0, b.x1 - b.x0, y1 - y0);
  for (const [x, y, dir] of [[b.frontX, b.y1, -1], [b.backX, b.y0, 1]] as const) {
    const light = new Path2D();
    light.moveTo(x - b.open, y);
    light.lineTo(x + b.open, y);
    light.lineTo(x + b.open * 2.2 + 40, y + dir * 260);
    light.lineTo(x - b.open * 1.2 + 40, y + dir * 260);
    light.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + dir * 260);
    g.addColorStop(0, rgba('#fff0c0', 0.32));
    g.addColorStop(1, rgba('#fff0c0', 0));
    ctx.fillStyle = g;
    ctx.fill(light);
  }
  const damp = new Blobs();
  for (let cy = Math.floor((y0 - 110) / 110); cy * 110 < y1 + 110; cy++) {
    for (let cx = 2; cx * 110 < b.x1 + 110; cx++) {
      damp.blot((cx + hash(cx, cy, 921)) * 110, (cy + hash(cx, cy, 922)) * 110, 50 + hash(cx, cy, 923) * 50, 22 + hash(cx, cy, 924) * 20, 0.2, cx * 13 + cy * 101);
    }
  }
  damp.fill(ctx, '#6a5a40', 0.08);
  const straw = new Ticks();
  const pale = new Ticks();
  for (let cy = Math.floor(y0 / 7); cy * 7 < y1; cy++) {
    for (let cx = Math.floor(b.x0 / 7); cx * 7 < b.x1; cx++) {
      const v = hash(cx, cy, 925);
      if (v > 0.3) continue;
      const x = (cx + hash(cx, cy, 926)) * 7;
      const y = (cy + hash(cx, cy, 927)) * 7;
      const a = hash(cx, cy, 928) * Math.PI;
      const l = 4 + hash(cx, cy, 929) * 5;
      (v < 0.2 ? straw : pale).add(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
  }
  straw.stroke(ctx, '#b8963e', 0.7, 0.55);
  pale.stroke(ctx, '#f0dca0', 0.8, 0.6);
  // The boards: planks across the way, every one a little different, gaps between.
  const { pts, nrm } = geo;
  const i0 = geo.index(b.y1 + 2);
  const i1 = geo.index(b.y0 - 2);
  const half = PATH_HALF + 18;
  const at = (i: number, o: number): Pt => pt(pts[i]!.x + nrm[i]!.x * o, pts[i]!.y + nrm[i]!.y * o);
  const tones = [new Path2D(), new Path2D(), new Path2D()];
  const gaps = new Path2D();
  let acc = 0;
  let prev = i0;
  for (let i = i0 + 1; i <= i1; i++) {
    acc += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    if (acc < 15 && i < i1) continue;
    const a = prev;
    prev = i;
    acc = 0;
    if (Math.max(pts[a]!.y, pts[i]!.y) < y0 - half - 20 || Math.min(pts[a]!.y, pts[i]!.y) > y1 + half + 20) continue;
    const q = [at(a, -half), at(i, -half), at(i, half), at(a, half)];
    const p = tones[Math.floor(hash(a, 3, 931) * 3)]!;
    p.moveTo(q[0]!.x, q[0]!.y);
    for (const v of q.slice(1)) p.lineTo(v.x, v.y);
    p.closePath();
    gaps.moveTo(q[0]!.x, q[0]!.y);
    gaps.lineTo(q[3]!.x, q[3]!.y);
    // A butt joint somewhere across most planks.
    const o = (hash(a, 4, 932) - 0.5) * half * 1.6;
    gaps.moveTo(at(a, o).x, at(a, o).y);
    gaps.lineTo(at(i, o).x, at(i, o).y);
  }
  tones.forEach((p, k) => {
    ctx.fillStyle = rgba(PAPER_FILL, 1);
    ctx.fill(p);
    ctx.fillStyle = rgba(mix(BOARD, k === 0 ? '#7a5a3a' : k === 1 ? '#d8c0a0' : BOARD, 0.3), 0.62);
    ctx.fill(p);
  });
  ctx.strokeStyle = rgba('#26316a', 0.45);
  ctx.lineWidth = 0.8;
  ctx.stroke(gaps);
  ctx.strokeStyle = rgba('#26316a', 0.65);
  ctx.lineWidth = 1.1;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    for (let i = i0; i <= i1; i += 2) (i === i0 ? ctx.moveTo(at(i, s * half).x, at(i, s * half).y) : ctx.lineTo(at(i, s * half).x, at(i, s * half).y));
    ctx.stroke();
  }
  ctx.restore();
}

/** Setts cobbling the yard along the groove from the gate to the barn's doors, and an apron before them. */
export function paintCobbles(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, b: Barn, region: MapRegion, yardTop: number): void {
  const reach = PATH_HALF + 24;
  const apron = (x: number, y: number): boolean => y > b.y1 + FACE - 6 && y < b.y1 + FACE + 80 && Math.abs(x - b.frontX) < b.open * 2 + 30 - (y - b.y1 - FACE) * 0.6;
  const inYard = (y: number): boolean => (y > b.y1 + FACE - 6 && y < region.gate.y - 6) || (y > yardTop + 10 && y < b.y0 - 12);
  const ya = Math.max(span.y0 - 10, yardTop);
  const yb = Math.min(span.y1 + 10, region.gate.y);
  if (yb <= ya) return;
  const joint = new Blobs();
  const setts = [new Blobs(), new Blobs(), new Blobs()];
  const lit = new Blobs();
  for (let r = Math.floor(ya / 9); r * 9 < yb; r++) {
    const y = r * 9;
    if (!inYard(y)) continue;
    const gx = geo.grooveX(y);
    for (let c = Math.floor((gx - 220) / 11); c * 11 < gx + 220; c++) {
      const x = c * 11 + (r % 2) * 5.5 + (hash(c, r, 941) - 0.5) * 2;
      const yy = y + (hash(c, r, 942) - 0.5) * 1.6;
      const edge = apron(x, yy) ? 0 : geo.dist(x, yy, reach + 20) - reach + (hash(c, r, 943) - 0.5) * 14;
      if (edge > 0) continue;
      const rx = 4.4 + hash(c, r, 944) * 0.8;
      const ry = 3.4 + hash(c, r, 945) * 0.6;
      joint.add(x, yy, rx + 1.4, ry + 1.4);
      setts[Math.floor(hash(c, r, 946) * 3)]!.add(x, yy, rx, ry, (hash(c, r, 947) - 0.5) * 0.4);
      lit.add(x - 1.3, yy - 1.2, rx * 0.45, ry * 0.4);
    }
  }
  joint.fill(ctx, mix(STONE_DARK, '#26316a', 0.3), 0.4);
  setts.forEach((s, k) => s.fill(ctx, mix(STONE, k === 0 ? '#a8a294' : k === 1 ? '#d8cdb4' : '#b8a890', 0.5), 0.92));
  lit.fill(ctx, PAPER_FILL, 0.45);
}

/** The cattle grid in the gateway: a pit with round steel bars across it, a kerb at each end. */
export function paintCattleGrid(d: Draw, span: Span, gate: Pt): void {
  if (!touches(span, gate.y, 60)) return;
  const { pen } = d;
  const x0 = gate.x - 54;
  const x1 = gate.x + 54;
  const y0 = gate.y - 8;
  const y1 = gate.y + 34;
  const pit = boxPts(x0, y0, x1, y1, 10);
  pen.fill(pit, PAPER_FILL, 1);
  pen.fill(pit, '#2c2c34', 0.72);
  for (let y = y0 + 4; y < y1 - 2; y += 6) {
    pen.stroke([pt(x0, y + 1.6), pt(x1, y + 1.6)], 2, d.ink, 0.35, false);
    pen.stroke([pt(x0, y), pt(x1, y)], 2.6, '#9aa2a8', 0.95, false);
    pen.hair([pt(x0 + 2, y - 0.8), pt(x1 - 2, y - 0.8)], 0.6, PAPER_FILL, 0.7);
  }
  for (const y of [y0 - 3, y1 + 3]) {
    const kerb = boxPts(x0 - 4, y - 3, x1 + 4, y + 3, 10);
    pen.fill(kerb, PAPER_FILL, 1);
    pen.fill(kerb, STONE, 0.7);
    pen.stroke(closed(kerb), 0.8, d.ink, 0.85, false);
  }
  pen.stroke(closed(pit), 1, d.ink, 0.85, false);
}
