import { C, FISH_TEX, xAt, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { ellipse, INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { PAPER_ON_INK } from './scenery';
import type { FishNow, HandNow, HarpoonNow, Puff } from './story';

/**
 * Everything else on screen, in snail px under the camera unless noted:
 * the fish (the game's own drawings, with eyes that pop wide or droop
 * shut), speed lines, the insulin cloud, the comic "…", the harpoon tooth
 * and its glint, the cartoon hand; and in screen px, the "z"s and the
 * rows of little people.
 */

// ---------------------------------------------------------------- fish

const LID: Readonly<Record<FishNow['shape'], string>> = { clownfish: '#ec9152', chromis: '#5c9fae', wrasse: '#6aa88e' };

function poseOf(f: FishNow): Pose {
  return { j: 0, age: 0, shape: f.shape, x: f.x, y: f.y, length: f.length, facing: f.facing, tilt: f.tilt, beat: f.beat, effort: f.effort };
}

/** Eyes over the game's drawing: popped wide with a tiny pupil, or lidded down to shut. */
function drawFishEye(ctx: CanvasRenderingContext2D, f: FishNow, boil: number): void {
  if (f.wide <= 0.02 && f.lid <= 0.02) return;
  const a = ANATOMY[f.shape];
  const k = f.length / (2 * a.hl);
  const ex = (xAt(a, a.eye.t) - FISH_TEX / 2) * k;
  const ey = (C - heightAt(a, a.eye.t) * 0.3 - FISH_TEX / 2) * k;
  const r = a.eye.r * k;
  const pen = new Pen(ctx, 61 + boil * 977, 0.3);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);
  ctx.rotate(-f.tilt);
  ctx.translate(ex, ey);
  if (f.wide > 0.02) {
    const R = r * (1 + 0.55 * f.wide);
    pen.fill(ellipse(0, 0, R, R, 20), '#fffaf0', 1);
    // Looking back over its shoulder, at what's got it.
    pen.fill(ellipse(-R * 0.35, R * 0.05, r * 0.42, r * 0.42, 12), INK, 1);
    pen.closed(ellipse(0, 0, R, R, 20), Math.max(1, r * 0.2));
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
    ctx.clip();
    const edge = -r * 1.12 + 2.24 * r * f.lid;
    pen.fill([{ x: -r * 2, y: -r * 2 }, { x: r * 2, y: -r * 2 }, { x: r * 2, y: edge }, { x: -r * 2, y: edge }], LID[f.shape], 1);
    pen.stroke([{ x: -r * 1.2, y: edge - r * 0.1 }, { x: 0, y: edge + r * 0.15 }, { x: r * 1.2, y: edge - r * 0.1 }], Math.max(1, r * 0.24));
  }
  ctx.restore();
}

export function drawFish(ctx: CanvasRenderingContext2D, sprite: Sprite, f: FishNow, boil: number, alpha = 1): void {
  if (alpha <= 0.01) return;
  if (f.speed > 0) drawSpeedLines(ctx, f);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawSwimmer(ctx, sprite, poseOf(f), boil, {});
  drawFishEye(ctx, f, boil);
  ctx.restore();
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, f: FishNow): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  [-0.3, -0.05, 0.22, 0.4].forEach((dy, i) => {
    const y = f.y + dy * f.length * 0.6;
    const x0 = f.x - f.facing * f.length * (0.55 + 0.08 * (i % 2));
    ctx.globalAlpha = 0.55 * f.speed;
    ctx.lineWidth = 4 - i * 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 - f.facing * f.length * (0.9 + 0.3 * ((i + 1) % 2)), y);
    ctx.stroke();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the insulin cloud

export function drawCloud(ctx: CanvasRenderingContext2D, puffs: readonly Puff[]): void {
  if (!puffs.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const p of puffs) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(214,244,170,${p.alpha.toFixed(3)})`);
    g.addColorStop(0.55, `rgba(190,226,200,${(p.alpha * 0.5).toFixed(3)})`);
    g.addColorStop(1, 'rgba(190,226,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  // Ink curls drifting in it, like the game's current marks.
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#eaffd8';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  puffs.forEach((p, i) => {
    if (i % 9 !== 4) return;
    ctx.globalAlpha = Math.min(0.75, p.alpha * 4.5);
    const w = p.r * 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x - w, p.y);
    ctx.bezierCurveTo(p.x - w * 0.5, p.y - w * 0.45, p.x, p.y + w * 0.45, p.x + w * 0.5, p.y);
    ctx.stroke();
  });
  ctx.globalCompositeOperation = 'screen';
  // Glints in it: little four-point stars.
  ctx.fillStyle = '#fffbe0';
  for (const p of puffs) {
    if (p.sparkle < 0.05) continue;
    const s = 7 + 9 * p.sparkle;
    const x = p.x + p.r * 0.3;
    const y = p.y - p.r * 0.2;
    ctx.globalAlpha = Math.min(1, p.sparkle * 1.4);
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
  ctx.restore();
}

/** The "z"s, in screen px (positions already through the camera). */
export function drawZeds(ctx: CanvasRenderingContext2D, zeds: readonly { readonly x: number; readonly y: number; readonly size: number; readonly alpha: number; readonly turn: number }[]): void {
  for (const z of zeds) {
    if (z.alpha <= 0.01) continue;
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(z.turn);
    drawTextLine(ctx, 'z', 0, 0, z.size, 700, z.alpha, PAPER_ON_INK);
    ctx.restore();
  }
}

/** The comic "…" over the snail: three fat ink dots with paper halos. */
export function drawDots(ctx: CanvasRenderingContext2D, at: Pt, pops: readonly number[]): void {
  pops.forEach((s, i) => {
    if (s <= 0.01) return;
    const x = at.x + i * 40;
    ctx.save();
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(x, at.y, 15 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, at.y, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ---------------------------------------------------------------- the harpoon

/** The harpoon tooth: a thin hollow ivory dart with a barb, shot out of the mouth, and a glint at its tip. */
export function drawHarpoon(ctx: CanvasRenderingContext2D, h: HarpoonNow, boil: number): void {
  if (h.len < 2) return;
  const pen = new Pen(ctx, 905 + boil * 977, 0.3);
  ctx.save();
  ctx.translate(h.from.x, h.from.y);
  ctx.rotate(h.heading);
  const L = h.len;
  const w = Math.min(7, L * 0.08);
  const dart = [{ x: 0, y: -w }, { x: L * 0.8, y: -w * 0.55 }, { x: L, y: 0 }, { x: L * 0.8, y: w * 0.55 }, { x: 0, y: w }];
  pen.fill(dart, '#efe5cc', 1);
  pen.closed(dart, 1.5);
  pen.hair([{ x: 4, y: 0 }, { x: L * 0.86, y: 0 }], 0.8, '#7a5a3a', 0.8);
  // The barb.
  const barb = [{ x: L * 0.84, y: -w * 0.5 }, { x: L * 0.7, y: -w * 2.4 }, { x: L * 0.76, y: -w * 0.5 }];
  pen.fill(barb, '#efe5cc', 1);
  pen.stroke(barb, 1.2);
  ctx.restore();
  if (h.glint > 0.02) {
    const tip = { x: h.from.x + Math.cos(h.heading) * L, y: h.from.y + Math.sin(h.heading) * L };
    const s = 46 * h.glint;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, s * 1.4);
    g.addColorStop(0, `rgba(255,255,240,${(0.85 * h.glint).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(tip.x - s * 1.4, tip.y - s * 1.4, s * 2.8, s * 2.8);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = h.glint;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y - s);
    ctx.quadraticCurveTo(tip.x, tip.y, tip.x + s * 0.6, tip.y);
    ctx.quadraticCurveTo(tip.x, tip.y, tip.x, tip.y + s);
    ctx.quadraticCurveTo(tip.x, tip.y, tip.x - s * 0.6, tip.y);
    ctx.quadraticCurveTo(tip.x, tip.y, tip.x, tip.y - s);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the people (screen px)

/** Rows of little figures, screen px: where each row's baseline sits, and the spacing. */
export const PEOPLE_LAYOUT = { rows: [430, 530, 630], x0: 122, dx: 76, height: 70 } as const;

export function drawPeople(ctx: CanvasRenderingContext2D, pops: readonly (readonly number[])[]): void {
  ctx.save();
  pops.forEach((row, r) => {
    row.forEach((s, j) => {
      if (s <= 0.01) return;
      const x = PEOPLE_LAYOUT.x0 + j * PEOPLE_LAYOUT.dx;
      const y = PEOPLE_LAYOUT.rows[r]!;
      const k = 0.6 + 0.4 * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.globalAlpha = s;
      for (const [colour, grow] of [[INK, 4], ['#f1e7d4', 0]] as const) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(0, -54, 11 + grow, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-14 - grow, 0 + grow);
        ctx.lineTo(-12 - grow, -30 - grow);
        ctx.quadraticCurveTo(0, -42 - grow, 12 + grow, -30 - grow);
        ctx.lineTo(14 + grow, 0 + grow);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- the hand

const SKIN = '#efc39f';
const SKIN_DEEP = '#c88d6a';
const SLEEVE = '#4f72aa';

/** A tube between two points, `w` wide, with round ends. */
function capsule(a: Pt, b: Pt, w: number): Pt[] {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const n = 8;
  const capB = Array.from({ length: n + 1 }, (_, i) => {
    const t = ang - Math.PI / 2 + (i / n) * Math.PI;
    return { x: b.x + Math.cos(t) * w / 2, y: b.y + Math.sin(t) * w / 2 };
  });
  const capA = Array.from({ length: n + 1 }, (_, i) => {
    const t = ang + Math.PI / 2 + (i / n) * Math.PI;
    return { x: a.x + Math.cos(t) * w / 2, y: a.y + Math.sin(t) * w / 2 };
  });
  return d > 0 ? [...capB, ...capA] : capB;
}

/** A cartoon hand, the index finger out, reaching down along `angle` to its fingertip, a shirt sleeve behind. */
export function drawHand(ctx: CanvasRenderingContext2D, h: HandNow, boil: number): void {
  const pen = new Pen(ctx, 951 + boil * 977, 0.5);
  ctx.save();
  ctx.translate(h.tip.x, h.tip.y);
  ctx.rotate(h.angle);
  // Mirrored so the curled fingers hang below, the thumb on top.
  ctx.scale(1, -1);
  ctx.translate(-150, 20);
  ctx.rotate(h.wobble);
  ctx.translate(150, -20);
  const arm = [{ x: -185, y: -32 }, { x: -1000, y: -40 }, { x: -1000, y: 72 }, { x: -185, y: 64 }];
  pen.fill(arm, SKIN, 1);
  pen.stroke([arm[0]!, arm[1]!], 2.4);
  pen.stroke([arm[2]!, arm[3]!], 2.4);
  const sleeve = [{ x: -300, y: -50 }, { x: -1000, y: -58 }, { x: -1000, y: 90 }, { x: -300, y: 82 }, { x: -290, y: 16 }];
  pen.fill(sleeve, SLEEVE, 1);
  pen.hatch(sleeve, 8, 0.8, 0.6, { alpha: 0.25 });
  pen.closed(sleeve, 2.4);
  const knuckles = [{ x: -98, y: 30, r: 17 }, { x: -104, y: 54, r: 16 }, { x: -116, y: 74, r: 15 }];
  const palm = ellipse(-148, 22, 62, 50, 26);
  pen.fill(palm, SKIN, 1);
  for (const k of knuckles) pen.fill(ellipse(k.x, k.y, k.r, k.r * 0.85, 14), SKIN, 1);
  const finger = capsule({ x: -104, y: 0 }, { x: -12, y: 0 }, 27);
  pen.fill(finger, SKIN, 1);
  const thumb = capsule({ x: -160, y: -24 }, { x: -96, y: -30 }, 27);
  pen.fill(thumb, SKIN, 1);
  // Shading on the underside.
  pen.clipped(palm, () => pen.hatch(palm, 7, 0.7, 0.6, { onlyBelow: 30, alpha: 0.3, color: SKIN_DEEP }));
  pen.closed(palm, 2.2);
  for (const k of knuckles) pen.closed(ellipse(k.x, k.y, k.r, k.r * 0.85, 14), 2);
  pen.closed(thumb, 2.2);
  pen.closed(finger, 2.2);
  // A fingernail and a knuckle crease.
  pen.fill(ellipse(-24, -6, 11, 6, 12), '#f8ddd0', 1);
  pen.closed(ellipse(-24, -6, 11, 6, 12), 1.1);
  pen.hair([{ x: -64, y: -8 }, { x: -60, y: 0 }, { x: -64, y: 8 }], 1, INK, 0.6);
  ctx.restore();
  if (h.whoosh > 0.02) {
    // Motion lines, trailing back towards the shell.
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6 * h.whoosh;
    for (const [side, len] of [[-50, 160], [0, 220], [50, 140]] as const) {
      const ax = Math.cos(h.angle);
      const ay = Math.sin(h.angle);
      const x0 = h.tip.x + ax * 40 - ay * side;
      const y0 = h.tip.y + ay * 40 + ax * side;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + ax * len, y0 + ay * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}
