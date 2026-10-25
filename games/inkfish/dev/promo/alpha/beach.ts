import { drawCritter } from '../../../src/art/critterArt';
import { INK, makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import { clamp01, ramp, VIDEO } from '../short';
import { glow, wash } from './sea';
import { cycles, KNOWS_AT, NOBODY_AT, ORCA_END, wrap } from './story';
import { drawTag } from './tag';

/**
 * "Nobody knows.": the tag washed up on a sunny beach. A crab sidles up and
 * pokes it, a wave runs up and nudges it, the crab hops back: a shrug.
 */

const HORIZON = 430;
const SHORE = 690;
const TAG = { x: 500, y: 900 } as const;
const CRAB_RES = 3;
const CRAB_SIDE = 256 * CRAB_RES;

let crabs: HTMLCanvasElement[] | null = null;
function makeCrabs(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(CRAB_SIDE, CRAB_SIDE);
    ctx.scale(CRAB_RES, CRAB_RES);
    drawCritter(ctx, 'shorecrab', 'light', f, 811 + f * 97);
    return canvas;
  });
}

const GRAINS = (() => {
  const rng = createRng(25);
  return Array.from({ length: 380 }, () => ({ x: rng() * VIDEO.width, y: SHORE + rng() * (VIDEO.height - SHORE), r: 0.8 + rng() * 2, dark: rng() < 0.6 }));
})();

/** How far up the beach the wash has run, 0 .. 1 (two waves: one as the scene opens, one on "knows"). */
function washAt(u: number): number {
  const wave = (at: number): number => {
    const s = u - at;
    if (s < 0 || s > 1.4) return 0;
    return s < 0.45 ? Math.sin((Math.PI / 2) * (s / 0.45)) : Math.max(0, 1 - (s - 0.45) / 0.95);
  };
  return Math.max(0.55 * wave(ORCA_END - 0.1), wave(KNOWS_AT - 0.15));
}

function drawShoreline(ctx: CanvasRenderingContext2D, y: number, t: number, alpha: number): void {
  // Thin water over the sand, then the foam's scalloped edge.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, SHORE - 20);
  for (let x = 0; x <= VIDEO.width; x += 30) ctx.lineTo(x, y + 10 * Math.sin(x / 70 + cycles(7, t)));
  ctx.lineTo(VIDEO.width, SHORE - 20);
  ctx.closePath();
  ctx.fillStyle = `rgba(70,175,190,${0.45 * alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.95 * alpha})`;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = 0; x <= VIDEO.width; x += 30) ctx.lineTo(x, y + 10 * Math.sin(x / 70 + cycles(7, t)));
  ctx.stroke();
  ctx.strokeStyle = `rgba(27,26,31,${0.5 * alpha})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

export function drawBeach(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(sheet, 0, 0);
  // Sky and sun.
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, 'rgba(80,160,220,0.85)');
  sky.addColorStop(1, 'rgba(205,232,240,0.8)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, HORIZON);
  glow(ctx, 230, 250, 340, '255,236,170', 0.6);
  ctx.save();
  ctx.fillStyle = '#fff6d6';
  ctx.strokeStyle = 'rgba(214,150,60,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(230, 250, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // The sea, waves rolling in.
  const sea = ctx.createLinearGradient(0, HORIZON, 0, SHORE);
  sea.addColorStop(0, 'rgba(30,110,160,0.9)');
  sea.addColorStop(1, 'rgba(60,180,190,0.85)');
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, VIDEO.width, SHORE - HORIZON);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const y = HORIZON + 40 + i * 50 + 6 * Math.sin(cycles(5, t) + i);
    ctx.lineWidth = 2 + i;
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 40) ctx.lineTo(x, y + 5 * Math.sin(x / 60 + i * 2 + cycles(6, t)));
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON);
  ctx.lineTo(VIDEO.width, HORIZON);
  ctx.stroke();
  // Sand: wet and dark near the water, dry and pale below, grains stippled.
  const sand = ctx.createLinearGradient(0, SHORE, 0, VIDEO.height);
  sand.addColorStop(0, 'rgba(178,146,96,0.95)');
  sand.addColorStop(0.2, 'rgba(222,192,140,0.92)');
  sand.addColorStop(1, 'rgba(236,212,166,0.9)');
  ctx.fillStyle = sand;
  ctx.fillRect(0, SHORE, VIDEO.width, VIDEO.height - SHORE);
  ctx.save();
  for (const g of GRAINS) {
    ctx.fillStyle = g.dark ? 'rgba(120,90,50,0.45)' : 'rgba(255,250,235,0.7)';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const wash01 = washAt(u);
  drawShoreline(ctx, SHORE + 40 + wash01 * 190, t, 1);
  // The tag, nudged by the crab and the wave.
  const poke = Math.max(0, Math.sin(Math.PI * clamp01((u - NOBODY_AT - 0.1) / 0.3)));
  const nudge = ramp(u, KNOWS_AT, KNOWS_AT + 0.4);
  const tagAngle = -0.25 + 0.25 * poke + 0.35 * nudge;
  const tagX = TAG.x - 18 * nudge;
  // Its shadow on the sand.
  ctx.save();
  ctx.fillStyle = 'rgba(90,60,30,0.3)';
  ctx.beginPath();
  ctx.ellipse(tagX + 70, TAG.y + 22, 90, 16, tagAngle * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTag(ctx, tagX, TAG.y, 190, tagAngle);
  // The crab: sidling in from the right, a poke, then a hop back.
  crabs ??= makeCrabs();
  const walk = ramp(u, ORCA_END + 0.1, NOBODY_AT + 0.05);
  const hop = Math.max(0, Math.sin(Math.PI * clamp01((u - KNOWS_AT - 0.05) / 0.35)));
  const crabX = 1180 - 375 * walk - 26 * poke + 60 * ramp(u, KNOWS_AT + 0.05, KNOWS_AT + 0.4);
  const crabY = 915 - 50 * hop;
  const size = 300;
  ctx.save();
  ctx.translate(crabX, crabY);
  ctx.scale((-size / CRAB_SIDE) * 1.35, (size / CRAB_SIDE) * 1.35);
  ctx.drawImage(crabs[(boil + (walk > 0 && walk < 1 ? Math.floor(u * 10) : 0)) % crabs.length]!, -CRAB_SIDE / 2, -CRAB_SIDE / 2);
  ctx.restore();
  // Little marks over it as it hops: a shrug.
  if (hop > 0.05) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.globalAlpha = hop;
    for (const [dx, a] of [[-60, -0.5], [0, 0], [60, 0.5]] as const) {
      ctx.beginPath();
      ctx.moveTo(crabX + dx + Math.sin(a) * 70, crabY - 70 - Math.cos(a) * 30);
      ctx.lineTo(crabX + dx + Math.sin(a) * 95, crabY - 90 - Math.cos(a) * 50);
      ctx.stroke();
    }
    ctx.restore();
  }
  wash(ctx, 'soft-light', '#ffd27a', 0.3);
}
