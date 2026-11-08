import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix, rgba } from '../wash';
import { castShadow, ellipseAt, glaze } from './preyKit';
import { CRITTER_POSES, type CritterPose } from './poses';

/**
 * The egg: a hen's egg lying in the grass, seen from above, about 20 × 16:
 * a warm cream-brown shell, blunt at one end, rounded by light from the
 * upper left into a deeper tan at its far rim, softly speckled, with a
 * glossy window highlight, a bounce light along its shadowed edge and a
 * soft shadow under it.
 */
const SHELL = {
  base: '#e9c595',
  warm: '#d29e64',
  deep: '#a8794c',
  speck: '#93643d',
} as const;

const RX = 10;
const RY = 8;

/** The shell's outline: an ellipse swollen towards its blunt end (−x). */
function outline(n = 36): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    return pt(RX * c, RY * Math.sin(t) * (1 - 0.1 * c));
  });
}

/** Round form shading: a pale bloom towards the light, the colour pooling deep at the far rim. */
function roundShade(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(-RX * 0.35, -RY * 0.4, RX * 0.1, -RX * 0.1, -RY * 0.12, RX * 1.25);
    g.addColorStop(0, rgba(PAPER_FILL, 0.55));
    g.addColorStop(0.4, rgba(PAPER_FILL, 0));
    g.addColorStop(0.72, rgba(SHELL.warm, 0.35));
    g.addColorStop(1, rgba(SHELL.deep, 0.75));
    ctx.fillStyle = g;
    ctx.fillRect(-RX * 1.6, -RX * 1.6, RX * 3.2, RX * 3.2);
  });
}

/**
 * Soft speckles: fine warm dots, fixed so they hold still while the line
 * boils, fewer where the light falls, and a few faint blurry freckles.
 */
function speckle(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(8821);
  pen.clipped(shape, () => {
    ctx.fillStyle = SHELL.speck;
    for (let i = 0; i < 70; i++) {
      const x = (rng() * 2 - 1) * RX;
      const y = (rng() * 2 - 1) * RY;
      const lit = Math.max(0, 0.5 - (x / RX) * 0.4 - (y / RY) * 0.6);
      if (rng() < lit) continue;
      ctx.globalAlpha = 0.35 + rng() * 0.45;
      ctx.beginPath();
      ctx.arc(x, y, 0.12 + rng() * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const [x, y, r] of [[-4, 2.5, 1.1], [3.5, -2.8, 0.9], [1, 4.4, 1], [-6, -2, 0.8], [6, 2, 0.9], [-1, -1, 0.7]] as const) {
      glaze(d, x, y, r, r * 0.8, 0, SHELL.speck, 0.22);
    }
  });
}

/** The glossy window highlight, a crisp glint and a curved rim light at the upper left. */
function gloss(d: Draw): void {
  const { pen } = d;
  pen.fill(ellipseAt(-RX * 0.38, -RY * 0.42, RX * 0.3, RY * 0.17, -0.45, 16), PAPER_FILL, 0.55);
  pen.dot(-RX * 0.42, -RY * 0.46, 0.75, PAPER_FILL, 0.95);
  pen.dot(-RX * 0.12, -RY * 0.6, 0.45, PAPER_FILL, 0.7);
  pen.hair(bezier(pt(-RX * 0.78, -RY * 0.05), pt(-RX * 0.72, -RY * 0.68), pt(-RX * 0.2, -RY * 0.8), 8), 0.55, PAPER_FILL, 0.6);
}

function drawEgg(d: Draw): void {
  const { pen } = d;
  const shape = outline();
  castShadow(d, shape.map((p) => pt(p.x * 1.02, p.y * 1.04)), pt(1.4, 2.1), 0.2);
  castShadow(d, shape.map((p) => pt(p.x * 0.9, p.y * 0.9)), pt(0.8, 1.2), 0.12);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.ctx.translate(0.4, 0.3);
    pen.fill(shape, SHELL.base, 0.95);
    pen.ctx.translate(-0.4, -0.3);
  });
  glaze(d, 0.5, 0.5, RX * 0.7, RY * 0.6, 0, SHELL.warm, 0.25);
  roundShade(d, shape);
  speckle(d, shape);
  shade(d, shape, 0.16);
  // Light bounced up from the ground, just inside the shadowed rim.
  const rim = outline(36).map((p) => pt(p.x * 0.86 + 0.3, p.y * 0.84 + 0.3));
  pen.hair(rim.slice(2, 14), 0.6, mix(SHELL.base, PAPER_FILL, 0.4), 0.45);
  gloss(d);
  pen.stroke(closed(shape), 0.5, d.ink, 0.88);
}

export const EGG: SpriteArt<CritterPose<'egg'>> = {
  frame: 28,
  res: 3,
  poses: CRITTER_POSES.egg,
  draw: (d) => drawEgg(d),
};
