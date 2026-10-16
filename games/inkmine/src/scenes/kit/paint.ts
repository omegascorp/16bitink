import type Phaser from 'phaser';
import { createRng, type Rng } from '../../logic/rng';

/**
 * Painting for the interface: paper, watercolour washes and ruled ink,
 * drawn once onto canvases and kept as textures, so a panel looks like a
 * printed plate in a field journal rather than a sketched box. Everything
 * is seeded, so a panel looks the same each time it's drawn.
 */

/** Texture pixels per layout px: crisp on a retina screen at full interface scale. */
export const RES = 2;

export const PAPER_LIGHT = '#fbf7ec';
export const PAPER_DEEP = '#efe6cf';
/** Ruled ink: iron-gall blue-black. */
export const RULE = '#1f2a55';
/** Fibres and foxing in the paper. */
const FIBRE = 'rgba(110, 90, 55, 1)';

export type Ctx = CanvasRenderingContext2D;

/** Draws onto a new canvas texture `key` (w × h layout px), unless it's already baked. Returns the key. */
export function bakeUi(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w * RES));
  canvas.height = Math.max(1, Math.ceil(h * RES));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.scale(RES, RES);
  draw(ctx);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** An image of a baked texture with its top-left at (x, y), at layout scale. */
export function uiImage(scene: Phaser.Scene, x: number, y: number, key: string): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setOrigin(0).setScale(1 / RES);
}

/** A rounded rectangle path. */
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** A rectangle with its corners cut in as quarter circles: a certificate's inner border. */
export function notched(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.arc(x + w, y + h, r, -Math.PI / 2, Math.PI, true);
  ctx.lineTo(x + r, y + h);
  ctx.arc(x, y + h, r, 0, -Math.PI / 2, true);
  ctx.lineTo(x, y + r);
  ctx.arc(x, y, r, Math.PI / 2, 0, true);
  ctx.closePath();
}

/** A small filled lozenge, the printer's ornament. */
export function lozenge(ctx: Ctx, x: number, y: number, r: number, color = RULE): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.7, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.7, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Soft blotches of `color`, the uneven drying of a wash. */
function blotches(ctx: Ctx, rng: Rng, x: number, y: number, w: number, h: number, color: string, n: number, alpha: number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + rng() * w;
    const cy = y + rng() * h;
    const r = (0.25 + rng() * 0.5) * Math.max(w, h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * (0.5 + rng() * 0.5);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
}

/** Pigment settling into the paper's tooth: fine specks. */
export function granulate(ctx: Ctx, rng: Rng, x: number, y: number, w: number, h: number, color: string, density: number, alpha: number): void {
  ctx.fillStyle = color;
  const n = Math.floor(w * h * density);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + rng() * 0.6);
    ctx.fillRect(x + rng() * w, y + rng() * h, 0.6 + rng() * 0.7, 0.6 + rng() * 0.7);
  }
  ctx.globalAlpha = 1;
}

/**
 * Laid paper, filling whatever path is current (call after building it):
 * lighter at the top, foxed a little at the edges, with fibres and a few
 * soft stains.
 */
export function paper(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, tone: { light: string; deep: string } = { light: PAPER_LIGHT, deep: PAPER_DEEP }): void {
  const rng = createRng(seed);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w * 0.3, y + h);
  g.addColorStop(0, tone.light);
  g.addColorStop(1, tone.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  blotches(ctx, rng, x, y, w, h, 'rgba(196, 170, 120, 0.5)', 3, 0.12);
  blotches(ctx, rng, x, y, w, h, 'rgba(255, 255, 250, 0.9)', 2, 0.18);
  // Foxing at the edges: a vignette that's stronger at the corners.
  const v = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(150, 120, 70, 0)');
  v.addColorStop(1, 'rgba(150, 120, 70, 0.16)');
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
  fibres(ctx, rng, x, y, w, h);
  ctx.restore();
}

/** Paper's fibres and specks: short faint curls laid mostly one way. Seamless enough to tile. */
export function fibres(ctx: Ctx, rng: Rng, x: number, y: number, w: number, h: number): void {
  ctx.strokeStyle = FIBRE;
  ctx.lineCap = 'round';
  const n = Math.floor((w * h) / 260);
  for (let i = 0; i < n; i++) {
    const fx = x + rng() * w;
    const fy = y + rng() * h;
    const a = (rng() - 0.5) * 0.9;
    const len = 3 + rng() * 7;
    ctx.globalAlpha = 0.05 + rng() * 0.07;
    ctx.lineWidth = 0.35 + rng() * 0.35;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx + Math.cos(a) * len * 0.5, fy + Math.sin(a) * len * 0.5 + (rng() - 0.5) * 2, fx + Math.cos(a) * len, fy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  granulate(ctx, rng, x, y, w, h, '#8a7550', 0.02, 0.18);
}

/**
 * A watercolour wash of `color` through whatever path is current: deeper
 * where it pooled (toward `pool`, 0 top .. 1 bottom), uneven, granulated,
 * with the darker rim a wash dries to.
 */
export function wash(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number, opts: { alpha?: number; pool?: number; rim?: number } = {}): void {
  const rng = createRng(seed);
  const alpha = opts.alpha ?? 0.85;
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  const pool = opts.pool ?? 1;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(Math.min(1, Math.max(0, pool)), 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,30,0.18)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  blotches(ctx, rng, x, y, w, h, color, 4, alpha * 0.45);
  blotches(ctx, rng, x, y, w, h, 'rgba(255,255,255,0.8)', 2, 0.12);
  granulate(ctx, rng, x, y, w, h, 'rgba(10, 10, 30, 1)', 0.05, 0.12);
  ctx.restore();
  // The wet edge: pigment drawn to the rim as it dried.
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = opts.rim ?? 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
}

/** Strokes the current path as a ruled ink line. */
export function rule(ctx: Ctx, width: number, color = RULE, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A soft cast shadow under a shape (the path is current): the sheet lifts off the page. */
export function castShadow(ctx: Ctx, blur: number, dy: number, alpha = 0.28): void {
  ctx.save();
  ctx.shadowColor = `rgba(45, 35, 20, ${alpha})`;
  ctx.shadowBlur = blur * RES;
  ctx.shadowOffsetY = dy * RES;
  ctx.fillStyle = 'rgba(245, 238, 222, 1)';
  ctx.fill();
  ctx.restore();
}
