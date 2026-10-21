import { createRng, type Rng } from '../../logic/rng';
import { MAP } from '../../scenes/map/layout';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { chamfer } from './paving';
import { ivy, LIMESTONE, wallRuin, wildRose } from './ruinsKit';

/**
 * The thresholds at the feet of chapters 9 and 10, drawn a little from the
 * front like the garden wall: a ruined stone archway, half its arch fallen,
 * between broken walls; and the night garden's wrought-iron railings with
 * the gate standing open and a lantern lit on its pier.
 */
const IRON = '#262a3e';
const LAMP = '#ffd27a';
/** Half the opening, between the piers' inner faces. */
const OPEN = 62;

/** A dressed stone pier standing on y, its courses and its shadow. */
function pier(d: Draw, x0: number, x1: number, y: number, h: number, fill: string): void {
  const { pen } = d;
  pen.fill([pt(x0, y), pt(x1, y), pt(x1 + h * 0.5, y + h * 0.55), pt(x0 + h * 0.5, y + h * 0.55)], d.ink, 0.14);
  const face = boxPts(x0, y - h, x1, y, 8);
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, fill, 0.8);
  for (let yy = y - 12; yy > y - h + 4; yy -= 12) pen.hair([pt(x0 + 1, yy), pt(x1 - 1, yy)], 0.45, d.ink, 0.45);
  pen.crescent(face, pt(-(x1 - x0) * 0.35, 0), () => pen.fill(face, STONE_DARK, 0.4));
  pen.stroke(closed(face), 1, d.ink, 0.9, false);
}

/** The ruins' threshold: low broken walls across the band, and over the groove an archway with half its arch fallen, ivy and a rose over it. */
export function ruinedArch(d: Draw, gate: Pt): void {
  const { pen } = d;
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 18;
  wallRuin(d, -30, gate.x - OPEN - 34, foot, rng);
  wallRuin(d, gate.x + OPEN + 34, MAP.width + 30, foot, rng);
  const ph = 118;
  pier(d, gate.x - OPEN - 34, gate.x - OPEN, foot, ph, LIMESTONE);
  pier(d, gate.x + OPEN, gate.x + OPEN + 34, foot, ph * 0.62, LIMESTONE);
  // The arch: voussoirs round from the left pier, broken off past the crown.
  const c = pt(gate.x, foot - ph);
  const r0 = OPEN;
  const r1 = OPEN + 32;
  const stones = 13;
  for (let k = 0; k < stones; k++) {
    const a0 = Math.PI + (k / stones) * Math.PI;
    const a1 = Math.PI + ((k + 1) / stones) * Math.PI - 0.02;
    if (k > 8) break;
    const v = chamfer([pt(c.x + Math.cos(a0) * r0, c.y + Math.sin(a0) * r0), pt(c.x + Math.cos(a0) * r1, c.y + Math.sin(a0) * r1), pt(c.x + Math.cos(a1) * r1, c.y + Math.sin(a1) * r1), pt(c.x + Math.cos(a1) * r0, c.y + Math.sin(a1) * r0)], 1.5);
    pen.fill(v.map((p) => pt(p.x + (foot - p.y) * 0.5, foot + (foot - p.y) * 0.5)), d.ink, 0.1);
    pen.fill(v, PAPER_FILL, 1);
    pen.fill(v, mix(LIMESTONE, '#bdb6a2', rng()), 0.85);
    pen.crescent(v, pt(-2, -3), () => pen.fill(v, STONE_DARK, 0.35));
    pen.hair(closed(v), 0.6, d.ink, 0.85);
  }
  ivy(d, gate.x - OPEN - 14, foot - 4, ph + 30, rng);
  for (let k = 0; k < 3; k++) {
    const a = Math.PI + 0.3 + k * 0.5;
    const p = pt(c.x + Math.cos(a) * (r1 + 4), c.y + Math.sin(a) * (r1 + 4));
    for (let i = 0; i < 4; i++) pen.dot(p.x + (rng() - 0.5) * 14, p.y + (rng() - 0.5) * 10, 2, '#e7a0b4', 0.95);
  }
  wildRose(d, pt(gate.x + OPEN + 44, foot + 8), 26, rng);
  // The fallen half lies where it dropped, at the foot of the right pier.
  for (let k = 0; k < 3; k++) {
    const p = pt(gate.x + OPEN + 60 + k * 26, foot + 26 + (k % 2) * 8);
    const s = chamfer(boxPts(p.x - 11, p.y - 7, p.x + 11, p.y + 7, 6), 2);
    pen.fill(s.map((q) => pt(q.x + 4, q.y + 5)), d.ink, 0.14);
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, LIMESTONE, 0.8);
    pen.hair(closed(s), 0.6, d.ink, 0.85);
  }
}

/** A run of iron railings x0..x1 on a low stone kerb at y: spear-topped bars between two rails. */
function railings(d: Draw, x0: number, x1: number, y: number, h: number): void {
  const { pen } = d;
  const kerb = boxPts(x0, y - 6, x1, y + 4, 16);
  pen.fill([pt(x0, y), pt(x1, y), pt(x1 + h * 0.5, y + h * 0.5), pt(x0 + h * 0.5, y + h * 0.5)], d.ink, 0.1);
  pen.fill(kerb, PAPER_FILL, 1);
  pen.fill(kerb, '#9aa0b0', 0.7);
  pen.stroke(closed(kerb), 0.8, d.ink, 0.85, false);
  const ctx = pen.ctx;
  ctx.save();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  for (let x = x0 + 4; x < x1; x += 10) {
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y - h);
  }
  for (const yy of [y - 12, y - h + 8]) {
    ctx.moveTo(x0, yy);
    ctx.lineTo(x1, yy);
  }
  ctx.stroke();
  ctx.fillStyle = IRON;
  ctx.beginPath();
  for (let x = x0 + 4; x < x1; x += 10) {
    ctx.moveTo(x - 2.6, y - h);
    ctx.lineTo(x, y - h - 7);
    ctx.lineTo(x + 2.6, y - h);
  }
  ctx.fill();
  ctx.restore();
}

/** One gate leaf of bars and scrolls between x0 and x1, standing on y. */
function leaf(d: Draw, x0: number, x1: number, y: number, h: number, rng: Rng): void {
  const { pen } = d;
  railings(d, x0, x1, y, h);
  for (let k = 0; k < 2; k++) {
    const c = pt(x0 + ((k + 0.5) * (x1 - x0)) / 2, y - h * 0.55);
    pen.hair(Array.from({ length: 16 }, (_, i) => pt(c.x + Math.cos(i * 0.7 + rng()) * i * 0.6, c.y + Math.sin(i * 0.7) * i * 0.6)), 1.1, IRON, 0.95);
  }
  pen.stroke([pt(x0, y - 4), pt(x0, y - h - 8)], 3, IRON, 1, false);
  pen.stroke([pt(x1, y - 4), pt(x1, y - h - 8)], 3, IRON, 1, false);
}

/** A lantern on top of a pier: its iron cage, the lit glass, and the warm glow it throws. */
export function lantern(d: Draw, c: Pt, s: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, s * 7);
  g.addColorStop(0, 'rgba(255,214,130,0.55)');
  g.addColorStop(0.35, 'rgba(255,200,110,0.18)');
  g.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, s * 7, 0, TAU);
  ctx.fill();
  ctx.restore();
  const glass = boxPts(c.x - s * 0.55, c.y - s * 0.7, c.x + s * 0.55, c.y + s * 0.7, 3);
  pen.fill(glass, LAMP, 0.95);
  pen.fill(oval(c.x, c.y, s * 0.3, s * 0.45, 10), '#fff6d8', 0.95);
  pen.stroke(closed(glass), 1, IRON, 1, false);
  pen.hair([pt(c.x, c.y - s * 0.7), pt(c.x, c.y + s * 0.7)], 0.6, IRON, 0.9);
  pen.fill([pt(c.x - s * 0.8, c.y - s * 0.7), pt(c.x, c.y - s * 1.3), pt(c.x + s * 0.8, c.y - s * 0.7)], IRON, 1);
}

/** The night garden's threshold: iron railings across the band, the gate's two leaves swung open, a lantern lit on the right-hand pier. */
export function ironGate(d: Draw, gate: Pt): void {
  const rng = createRng(d.pen.rng() * 1e9);
  const foot = gate.y + 16;
  const h = 46;
  railings(d, -30, gate.x - OPEN - 24, foot, h);
  railings(d, gate.x + OPEN + 24, MAP.width + 30, foot, h);
  leaf(d, gate.x - OPEN * 2 - 20, gate.x - OPEN - 26, foot + 14, h + 4, rng);
  leaf(d, gate.x + OPEN + 26, gate.x + OPEN * 2 + 20, foot + 14, h + 4, rng);
  const stone = mix('#9aa0b0', '#26316a', 0.15);
  pier(d, gate.x - OPEN - 24, gate.x - OPEN, foot, 70, stone);
  pier(d, gate.x + OPEN, gate.x + OPEN + 24, foot, 70, stone);
  for (const x of [gate.x - OPEN - 12, gate.x + OPEN + 12]) {
    const cap = boxPts(x - 16, foot - 78, x + 16, foot - 70, 6);
    d.pen.fill(cap, PAPER_FILL, 1);
    d.pen.fill(cap, stone, 0.85);
    d.pen.stroke(closed(cap), 0.9, d.ink, 0.9, false);
  }
  d.pen.dot(gate.x - OPEN - 12, foot - 84, 7, stone, 1);
  d.pen.circle(gate.x - OPEN - 12, foot - 84, 7, 0.8, d.ink);
  lantern(d, pt(gate.x + OPEN + 12, foot - 92), 11);
}
