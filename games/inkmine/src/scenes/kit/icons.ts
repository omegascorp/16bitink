import type Phaser from 'phaser';
import { bakeUi, RULE, wash, type Ctx } from './paint';

/**
 * The HUD's small pictures, engraved and washed: hearts in madder, the
 * shield's bars as heater shields in steel blue, and an emblem beside each
 * gauge (air bubbles, the cell's bolt). Each baked once at `size` px.
 */
export type IconKind = 'heart' | 'heartEmpty' | 'shield' | 'shieldEmpty' | 'air' | 'cell' | 'depth' | 'cargo';

const MADDER = '#b23a33';
const STEEL = '#5b7fae';

function heartPath(ctx: Ctx, s: number): void {
  const c = s / 2;
  ctx.beginPath();
  ctx.moveTo(c, s * 0.86);
  ctx.bezierCurveTo(s * 0.12, s * 0.5, s * 0.06, s * 0.2, s * 0.3, s * 0.14);
  ctx.bezierCurveTo(s * 0.42, s * 0.11, s * 0.48, s * 0.2, c, s * 0.28);
  ctx.bezierCurveTo(s * 0.52, s * 0.2, s * 0.58, s * 0.11, s * 0.7, s * 0.14);
  ctx.bezierCurveTo(s * 0.94, s * 0.2, s * 0.88, s * 0.5, c, s * 0.86);
  ctx.closePath();
}

function shieldPath(ctx: Ctx, s: number): void {
  ctx.beginPath();
  ctx.moveTo(s * 0.18, s * 0.16);
  ctx.quadraticCurveTo(s * 0.5, s * 0.06, s * 0.82, s * 0.16);
  ctx.lineTo(s * 0.8, s * 0.48);
  ctx.quadraticCurveTo(s * 0.74, s * 0.76, s * 0.5, s * 0.9);
  ctx.quadraticCurveTo(s * 0.26, s * 0.76, s * 0.2, s * 0.48);
  ctx.closePath();
}

function stroke(ctx: Ctx, w: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = RULE;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A sheen on a full shape: a short pale stroke up and to the left. */
function sheen(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): void {
  ctx.strokeStyle = 'rgba(255, 250, 238, 0.85)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

/** Hatching through the current path: shade on the lower right. */
function hatch(ctx: Ctx, s: number, alpha: number): void {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = RULE;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 0.5;
  for (let k = -s; k < s * 2; k += 2.2) {
    ctx.beginPath();
    ctx.moveTo(k, s);
    ctx.lineTo(k + s, 0);
    ctx.stroke();
  }
  ctx.restore();
}

const DRAW: Readonly<Record<IconKind, (ctx: Ctx, s: number) => void>> = {
  heart: (ctx, s) => {
    heartPath(ctx, s);
    wash(ctx, 0, 0, s, s, MADDER, 31, { alpha: 0.95, pool: 0.5, rim: 0.5 });
    heartPath(ctx, s);
    stroke(ctx, 1.3);
    sheen(ctx, s * 0.27, s * 0.3, s * 0.33, s * 0.24);
  },
  heartEmpty: (ctx, s) => {
    heartPath(ctx, s);
    hatch(ctx, s, 0.25);
    heartPath(ctx, s);
    stroke(ctx, 1, 0.55);
  },
  shield: (ctx, s) => {
    shieldPath(ctx, s);
    wash(ctx, 0, 0, s, s, STEEL, 47, { alpha: 0.95, pool: 0.4, rim: 0.5 });
    shieldPath(ctx, s);
    stroke(ctx, 1.2);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.14);
    ctx.lineTo(s * 0.5, s * 0.84);
    stroke(ctx, 0.6, 0.5);
    sheen(ctx, s * 0.28, s * 0.24, s * 0.3, s * 0.42);
  },
  shieldEmpty: (ctx, s) => {
    shieldPath(ctx, s);
    hatch(ctx, s, 0.2);
    shieldPath(ctx, s);
    stroke(ctx, 0.9, 0.5);
  },
  air: (ctx, s) => {
    for (const [x, y, r] of [[0.38, 0.62, 0.24], [0.68, 0.36, 0.16], [0.7, 0.72, 0.1], [0.36, 0.22, 0.08]] as const) {
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
      wash(ctx, 0, 0, s, s, '#3f8fae', Math.round(x * 100), { alpha: 0.55, rim: 0.4 });
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
      stroke(ctx, 1);
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * r * 0.6, Math.PI * 1.1, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(255,250,238,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
  cell: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.06);
    ctx.lineTo(s * 0.22, s * 0.56);
    ctx.lineTo(s * 0.48, s * 0.56);
    ctx.lineTo(s * 0.4, s * 0.94);
    ctx.lineTo(s * 0.8, s * 0.4);
    ctx.lineTo(s * 0.54, s * 0.4);
    ctx.closePath();
    wash(ctx, 0, 0, s, s, '#d49a2a', 13, { alpha: 0.95, pool: 0.5, rim: 0.5 });
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.06);
    ctx.lineTo(s * 0.22, s * 0.56);
    ctx.lineTo(s * 0.48, s * 0.56);
    ctx.lineTo(s * 0.4, s * 0.94);
    ctx.lineTo(s * 0.8, s * 0.4);
    ctx.lineTo(s * 0.54, s * 0.4);
    ctx.closePath();
    stroke(ctx, 1.2);
  },
  depth: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.12, s * 0.2);
    ctx.lineTo(s * 0.88, s * 0.2);
    stroke(ctx, 1.2);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.3);
    ctx.lineTo(s * 0.5, s * 0.86);
    ctx.moveTo(s * 0.32, s * 0.68);
    ctx.lineTo(s * 0.5, s * 0.88);
    ctx.lineTo(s * 0.68, s * 0.68);
    stroke(ctx, 1.4);
  },
  cargo: (ctx, s) => {
    ctx.beginPath();
    ctx.rect(s * 0.14, s * 0.3, s * 0.72, s * 0.56);
    wash(ctx, 0, 0, s, s, '#a8875a', 5, { alpha: 0.8, rim: 0.4 });
    ctx.beginPath();
    ctx.rect(s * 0.14, s * 0.3, s * 0.72, s * 0.56);
    stroke(ctx, 1.2);
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * 0.3);
    ctx.lineTo(s * 0.86, s * 0.86);
    ctx.moveTo(s * 0.86, s * 0.3);
    ctx.lineTo(s * 0.14, s * 0.86);
    ctx.moveTo(s * 0.08, s * 0.3);
    ctx.lineTo(s * 0.92, s * 0.3);
    stroke(ctx, 0.8, 0.8);
  },
};

/** The texture key of an icon at `size` px. */
export function iconKey(scene: Phaser.Scene, kind: IconKind, size: number): string {
  return bakeUi(scene, `ui-icon-${kind}-${size}`, size, size, (ctx) => DRAW[kind](ctx, size));
}
