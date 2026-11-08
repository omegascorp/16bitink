import { drawAlvin, onAlvin } from './art/alvin';
import { crewPorts } from './art/crewPort';
import { type Pt, blob, hash, ink, LINE } from './art/draw';
import { drawSwordfish, PIN_X } from './art/swordfish';
import type { Stuck } from './poses';

/**
 * The picture the hook, the wrench and the rise share: Alvin, with a swordfish's
 * sword wedged in the crevice between two sections of the fairing. The hull is
 * never pierced: the blade jams into the gap between the panels, scuffing and
 * splitting the fibreglass, with bubbles, silt and a small flash of the hit.
 */

const placedSub = (s: Stuck, c: Pt) => ({ x: c.x, y: c.y, len: s.subLen, rot: s.subRot, flip: s.flip });

/** The sub's centre, so its seam lands on `s.tip`. */
export function subCentre(s: Stuck): Pt {
  const at = onAlvin({ x: 0, y: 0, len: s.subLen, rot: s.subRot, flip: s.flip }, s.pin);
  return { x: s.tip.x - at.x, y: s.tip.y - at.y };
}

const jagged = (from: Pt, to: Pt, n: number, amp: number, seed: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1);
    return { x: from.x + (to.x - from.x) * u + (hash(i + seed) - 0.5) * amp, y: from.y + (to.y - from.y) * u + (hash(i * 3 + seed) - 0.5) * amp * 0.4 };
  });

function poly(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fill: string): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Two fairing panels forced apart along the seam: a dark gap, splintered pale fibreglass on both lips, a scuff where the blade skidded in. */
function drawSplit(ctx: CanvasRenderingContext2D, s: Stuck, scale: number): void {
  if (s.crack <= 0.01) return;
  const k = scale * s.crack;
  ctx.save();
  ctx.translate(s.tip.x, s.tip.y);
  ctx.rotate(s.subRot);
  // The panels sprung apart: a soft shadow, then the dark gap, wider at the blade.
  blob(ctx, 0, 0, 170 * k, 230 * k, 0, '22,34,50', 0.5);
  const gap: Pt[] = [{ x: -3 * k, y: -240 * k }, { x: -30 * k, y: -60 * k }, { x: -36 * k, y: 30 * k }, { x: -6 * k, y: 260 * k }, { x: 6 * k, y: 260 * k }, { x: 36 * k, y: 40 * k }, { x: 28 * k, y: -60 * k }, { x: 3 * k, y: -240 * k }];
  poly(ctx, gap, '#0a0f16');
  // Each lip: lifted, a torn cream edge with the glass fibres showing.
  for (const side of [-1, 1]) {
    const edge = jagged({ x: side * 8 * k, y: -230 * k }, { x: side * 8 * k, y: 250 * k }, 17, 14 * k, side < 0 ? 5 : 31).map((p) => ({ x: p.x + side * 30 * k * Math.exp(-(((p.y + 10 * k) / (120 * k)) ** 2)), y: p.y }));
    const back = [...edge].reverse().map((p, i) => ({ x: p.x + side * (20 + 24 * hash(i + 60)) * k * Math.exp(-(((p.y) / (170 * k)) ** 2)), y: p.y }));
    poly(ctx, [...edge, ...back], '#f6efdd');
    ink(ctx, edge, 3, '#b39c74', 0.9);
    for (let i = 0; i < edge.length - 1; i += 2) {
      const p = edge[i]!;
      ink(ctx, [p, { x: p.x - side * (6 + 13 * hash(i + 70)) * k, y: p.y + (hash(i + 90) - 0.5) * 8 * k }], 2.2, '#e8d9b4', 0.95);
    }
  }
  // Grey scuffs along the skid, all one way: not a star.
  for (let i = 0; i < 9; i++) {
    const [x, y] = [-120 * k + hash(i + 11) * 80 * k, -60 * k - hash(i + 16) * 130 * k];
    ink(ctx, [{ x, y }, { x: x + (60 + hash(i + 2) * 70) * k, y: y + (34 + hash(i + 5) * 30) * k }], 3 + 3 * hash(i), '#5e6b78', 0.3);
  }
  ctx.restore();
}

/** The near lip of the split, over the blade: the fibreglass closing round it, so the sword goes in rather than stopping on top. */
function drawLip(ctx: CanvasRenderingContext2D, s: Stuck, scale: number): void {
  if (s.crack <= 0.01 || s.off > 0) return;
  const k = scale * s.crack;
  ctx.save();
  ctx.translate(s.tip.x, s.tip.y);
  ctx.rotate(s.a);
  const outer = jagged({ x: -6 * k, y: -66 * k }, { x: -6 * k, y: 66 * k }, 11, 13 * k, 77).map((p, i) => ({ x: p.x + 40 * k * Math.sin((i / 10) * Math.PI), y: p.y }));
  const inner = jagged({ x: -6 * k, y: 66 * k }, { x: -6 * k, y: -66 * k }, 11, 9 * k, 91).map((p, i) => ({ x: p.x - 24 * k * Math.sin((i / 10) * Math.PI), y: p.y }));
  poly(ctx, [...inner, ...outer], '#0a0f16');
  const lip = inner.map((p, i) => ({ x: p.x + (16 + 12 * hash(i + 40)) * k, y: p.y }));
  poly(ctx, [...lip, ...[...outer].reverse().map((p) => ({ x: p.x + 8 * k, y: p.y }))], '#f6efdd');
  ink(ctx, lip, 3, '#b39c74', 0.95);
  lip.forEach((p, i) => { if (i % 2 === 0) ink(ctx, [p, { x: p.x - (5 + 11 * hash(i + 50)) * k, y: p.y + (hash(i + 60) - 0.5) * 7 * k }], 2.2, '#e8d9b4', 0.95); });
  ctx.restore();
}

/** Over the blade: bubbles and silt bursting out of the gap, chips of fibreglass, the small flash of the hit. */
function drawBurst(ctx: CanvasRenderingContext2D, s: Stuck, scale: number): void {
  if (s.burst <= 0.01) return;
  const age = s.age;
  ctx.save();
  ctx.translate(s.tip.x, s.tip.y);
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + hash(i + 200) * 2.2;
    const d = (70 + 170 * Math.min(1, age * 1.4 + 0.3) * (0.5 + hash(i + 210) * 0.8)) * scale;
    blob(ctx, Math.cos(a) * d, Math.sin(a) * d, (130 + 90 * hash(i + 220)) * scale, (90 + 60 * hash(i + 230)) * scale, a, '206,194,160', 0.2 * s.burst);
  }
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI + hash(i + 120) * Math.PI;
    const speed = 120 + 300 * hash(i + 130);
    const rise = (age * 0.6 + hash(i + 170) * 0.4) * speed * scale;
    const [x, y] = [Math.cos(a) * rise * 0.8 + 8 * Math.sin(age * 4 + i), Math.sin(a) * rise * 0.8 - age * 110 * scale];
    const r = (5 + 15 * hash(i + 140) ** 2) * scale;
    ctx.fillStyle = 'rgba(214,240,250,0.2)';
    ctx.strokeStyle = `rgba(236,250,255,${0.9 * s.burst})`;
    ctx.lineWidth = Math.max(1.4, 2.4 * scale);
    ctx.globalAlpha = s.burst;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - r * 0.34, y - r * 0.36, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = s.burst;
  ctx.fillStyle = '#f7f1e2';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.9 + hash(i + 300) * Math.PI * 0.8;
    const d = (70 + 240 * Math.min(1.2, age + 0.25) * hash(i + 310)) * scale;
    const r = (7 + 9 * hash(i + 320)) * scale;
    ctx.save();
    ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
    ctx.rotate(i + age * 3);
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.3);
    ctx.lineTo(r * 0.4, -r * 0.6);
    ctx.lineTo(r, r * 0.3);
    ctx.lineTo(-r * 0.3, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  if (s.spark > 0.01) blob(ctx, s.tip.x, s.tip.y, 260 * scale, 260 * scale, 0, '255,250,226', 0.95 * s.spark);
}

function drawTrail(ctx: CanvasRenderingContext2D, tip: Pt, a: number, off: number): void {
  if (off < 40) return;
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(a);
  for (const y of [-120, -40, 50, 140]) blob(ctx, -off - 460, y, 460, 26, 0, '226,242,255', 0.16);
  ctx.restore();
}

/** Draws the sub, the split panels and the fish. `prop` turns the propeller. */
export function drawStuck(ctx: CanvasRenderingContext2D, s: Stuck, boil: number, prop = 0): void {
  const c = subCentre(s);
  const scale = s.fishLen / 1500;
  drawAlvin(ctx, placedSub(s, c), { lit: s.lit, beams: 0.35, prop, port: crewPorts(s.faces) }, boil);
  drawSplit(ctx, s, scale);
  const dir = { x: Math.cos(s.a), y: Math.sin(s.a) };
  const held = s.off < 1;
  const tip = { x: s.tip.x - dir.x * s.off, y: s.tip.y - dir.y * s.off };
  drawTrail(ctx, s.tip, s.a, s.off);
  // Where the fish's shadow falls on the hull, so it sits on the sub rather than on the picture.
  if (held) blob(ctx, s.tip.x + 30 * scale, s.tip.y + 60 * scale, 300 * scale, 150 * scale, s.a, '16,28,46', 0.35);
  drawSwordfish(ctx, { tip, len: s.fishLen, a: s.a, yaw: s.yaw, roll: s.roll, persp: s.persp, cut: held ? PIN_X : undefined }, { bend: s.bend, tail: s.tail, wide: s.wide, cross: s.cross, lid: s.lid }, boil);
  drawLip(ctx, s, scale);
  drawBurst(ctx, s, scale);
}


