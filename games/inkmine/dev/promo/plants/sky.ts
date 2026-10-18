import { createRng, type Rng } from '../../../src/logic/rng';
import { makeDraw, oval } from '../../../src/art/kit';
import { rgba, soft } from '../../../src/art/paint';
import { makeCanvas } from '../../../src/art/pen';
import { SUN } from './story';

/**
 * The sky over the black forest, painted once: a night wash going maroon
 * towards the horizon, the galaxy's band across it, specks of stars left
 * as paper, and the red dwarf, huge and low, unmoving (the planet is
 * tidally locked): a dim red disc darkening to its limb, its surface
 * mottled, big dark starspots (red dwarfs have them), a soft halo round it.
 */
export const SKY_BOX = { x: -220, y: -220, w: 1520, h: 2400 } as const;

export const SUN_COLOURS = { core: '#d8502e', mid: '#b3301f', limb: '#741812', halo: '#c2381f' } as const;

function blot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function wash(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const g = ctx.createLinearGradient(0, -220, 0, 1100);
  g.addColorStop(0, '#05040b');
  g.addColorStop(0.3, '#0b0814');
  g.addColorStop(0.62, '#1d0a14');
  g.addColorStop(0.86, '#3e1015');
  g.addColorStop(1, '#2a0a10');
  ctx.fillStyle = g;
  ctx.fillRect(SKY_BOX.x, SKY_BOX.y, SKY_BOX.w, SKY_BOX.h);
  // The sun's red light filling the low sky, and uneven pigment through the night.
  blot(ctx, SUN.x, SUN.y + 80, 1000, '#8a2116', 0.5);
  for (let i = 0; i < 30; i++) blot(ctx, SKY_BOX.x + rng() * SKY_BOX.w, -200 + rng() * 1000, 80 + rng() * 220, rng() < 0.6 ? '#030208' : '#2a1638', 0.25);
}

/** The galaxy: a long soft band of pale violet light with a dark dust lane, thick with faint stars. */
function galaxy(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const a = { x: -220, y: 560 };
  const b = { x: 1300, y: 40 };
  const along = (s: number, off: number): { x: number; y: number } => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy);
    return { x: a.x + dx * s - (dy / l) * off, y: a.y + dy * s + (dx / l) * off };
  };
  for (let i = 0; i < 90; i++) {
    const p = along(rng(), (rng() - 0.5) * 140);
    blot(ctx, p.x, p.y, 60 + rng() * 120, rng() < 0.7 ? '#b9a8d8' : '#e8c8b8', 0.05 + rng() * 0.04);
  }
  for (let i = 0; i < 40; i++) {
    const p = along(rng(), 10 + (rng() - 0.5) * 50);
    blot(ctx, p.x, p.y, 30 + rng() * 60, '#05030a', 0.25);
  }
  ctx.fillStyle = '#fff4e6';
  for (let i = 0; i < 1400; i++) {
    const g = (rng() + rng() + rng() - 1.5) * 150;
    const p = along(rng(), g);
    ctx.globalAlpha = 0.15 + rng() * 0.45 * (1 - Math.abs(g) / 230);
    ctx.fillRect(p.x, p.y, 1.2 + rng(), 1.2 + rng());
  }
  ctx.globalAlpha = 1;
}

function stars(ctx: CanvasRenderingContext2D, rng: Rng): void {
  for (let i = 0; i < 420; i++) {
    const x = SKY_BOX.x + rng() * SKY_BOX.w;
    const y = SKY_BOX.y + rng() * rng() * 1250;
    if (Math.hypot(x - SUN.x, y - SUN.y) < SUN.r * 1.15) continue;
    const r = 0.7 + rng() * rng() * 2.4;
    ctx.globalAlpha = 0.35 + rng() * 0.55;
    ctx.fillStyle = rng() < 0.7 ? '#fff6ea' : '#ffd2b8';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The red dwarf, painted: limb-darkened, mottled, starspotted, a halo round it and a fine pen rim. */
function sun(ctx: CanvasRenderingContext2D, rng: Rng): void {
  const { x, y, r } = SUN;
  blot(ctx, x, y, r * 1.9, SUN_COLOURS.halo, 0.35);
  blot(ctx, x, y, r * 1.3, '#e0603a', 0.25);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x - r * 0.12, y - r * 0.15, r * 0.05, x, y, r);
  g.addColorStop(0, SUN_COLOURS.core);
  g.addColorStop(0.65, SUN_COLOURS.mid);
  g.addColorStop(1, SUN_COLOURS.limb);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Granulation: the surface boiling in cells, washed in.
  for (let i = 0; i < 260; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    blot(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 12 + rng() * 34, rng() < 0.5 ? '#8a1f14' : '#f07446', 0.12 + rng() * 0.1);
  }
  // Starspots: dark, ragged, in a group.
  for (const [sx, sy, sr] of [[-0.35, 0.18, 46], [-0.18, 0.32, 30], [0.4, -0.3, 26], [0.22, 0.45, 18]] as const) {
    for (let k = 0; k < 7; k++) blot(ctx, x + sx * r + (rng() - 0.5) * sr, y + sy * r + (rng() - 0.5) * sr * 0.6, sr * (0.5 + rng() * 0.5), '#3e0b0a', 0.35);
  }
  ctx.restore();
  // The pen: a fine rim and a little hatching on the dim lower-right limb.
  const d = makeDraw(ctx, 5150, 0, 0, '#3a0b0c');
  const rim = oval(x, y, r, r, 96);
  d.pen.crescent(rim, { x: -r * 0.12, y: -r * 0.14 }, () => d.pen.hatch(rim, 7, 0.9, 1.1, { color: '#3a0b0c', alpha: 0.22 }));
  soft(ctx, 1.5, () => d.pen.stroke([...rim, rim[0]!], 2.4, '#4a0d0c', 0.55, false));
}

/** The sky, baked once (it doesn't boil: it's the far wash); drawn with its top-left at SKY_BOX.x, SKY_BOX.y. */
export function bakeSky(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(SKY_BOX.w, SKY_BOX.h);
  ctx.translate(-SKY_BOX.x, -SKY_BOX.y);
  const rng = createRng(2007);
  wash(ctx, rng);
  galaxy(ctx, rng);
  stars(ctx, rng);
  sun(ctx, rng);
  return canvas;
}

/** A soft red glow, baked once, laid over the sky at the sun to make it breathe and throb. */
export function bakeGlow(): HTMLCanvasElement {
  const r = SUN.r * 2;
  const { canvas, ctx } = makeCanvas(r * 2, r * 2);
  const g = ctx.createRadialGradient(r, r, SUN.r * 0.2, r, r, r);
  g.addColorStop(0, 'rgba(255, 120, 70, 0.55)');
  g.addColorStop(0.45, 'rgba(230, 70, 40, 0.3)');
  g.addColorStop(1, 'rgba(180, 40, 30, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, r * 2, r * 2);
  return canvas;
}
