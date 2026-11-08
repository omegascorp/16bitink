import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W, type SpriteArt } from '../types';
import { rgba } from '../wash';
import { COBRA_PAINT } from './jungleSnakeCobra';
import { COBRA_HEAD_SPEC } from './jungleSnakeCobraHead';
import { headOutline, NECK } from './jungleSnakeHead';

/**
 * The king cobra's hood, seen from above and behind as it rears: the neck's
 * ribs swung out into a long, narrow shield (a king cobra's hood is narrow,
 * with no spectacle), the skin stretched so the olive scales stand apart
 * with dark skin between them, the pale chevron bands of the back pulled
 * wide across it, light on its near side, its far side in hatched shade.
 * Drawn in the head's own frame (same centre and scale, facing +x) over the
 * head sprite, with the head cut out of it, so the head lies in front.
 * Poses: how far it's spread ('rise', 'half', 'spread').
 */
export type HoodPose = 'rise' | 'half' | 'spread';

export const HOOD_FRAME = 150;
const SPREAD: Record<HoodPose, number> = { rise: 0.3, half: 0.65, spread: 1 };
const C = COBRA_PAINT;
/** The hood runs from just behind the crown to where it narrows into the neck again. */
const FRONT = -9;
const BACK = -68;
/** Where the head is cut out of it (the head lies over it in front of this). */
const CUT = -18;

/** Its half-width at x, spread k. */
function halfAt(x: number, k: number): number {
  const u = (x - FRONT) / (BACK - FRONT);
  if (u < 0 || u > 1) return NECK;
  const widest = NECK + 1.5 + 14.5 * k;
  // A long oval: rounding out fast behind the head, widest a third of the way back, tapering slowly into the neck.
  const ease = (t: number): number => t * t * (3 - 2 * t);
  const shape = u < 0.3 ? Math.sin((u / 0.3) * (Math.PI / 2)) ** 0.7 : 1 - ease(Math.min(1, (u - 0.3) / 0.6));
  return NECK + (widest - NECK) * shape;
}

/** The hood's outline (closed), front to back along the upper side then back along the lower. */
function outline(k: number): Pt[] {
  const n = 40;
  const top: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = FRONT + ((BACK - FRONT) * i) / n;
    top.push(pt(x, -halfAt(x, k)));
  }
  return [...top, ...top.map((p) => pt(p.x, -p.y)).reverse()];
}

/** A band across the hood at x (its midline), the chevron's point to the head, pulled as wide as the hood there. */
function band(x: number, k: number, w: number): Pt[] {
  const spine: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const v = -1.08 + (2.16 * i) / 20;
    const sweep = 5 + 4 * k;
    const xx = x - Math.abs(v) * sweep;
    spine.push(pt(xx, v * halfAt(xx, k)));
  }
  return ribbon(spine, (u) => w * (0.9 + 0.5 * Math.abs(u - 0.5))).shape;
}

/** The stretched scales: rows fanning out with the hood, each scale an olive oval with dark skin round it. */
function scales(d: Draw, k: number, clip: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const rng = createRng(31100);
  pen.clipped(clip, () => {
    const rows = 17;
    for (let x = FRONT + 1; x > BACK - 2; x -= 2.6) {
      const h = halfAt(x, k);
      const shift = Math.round((x - FRONT) / 2.6) % 2 ? 0.5 : 0;
      for (let r = 0; r < rows; r++) {
        const v = -1 + (2 * (r + shift + 0.5)) / (rows + 0.5);
        const y = v * h;
        const gap = h / NECK;
        const rx = 1.2 * Math.min(1.25, 0.75 + 0.25 * gap);
        const ry = Math.min(1.25, h / rows) * 0.95;
        const lit = 1 - (v + 1) / 2;
        ctx.save();
        ctx.translate(x + (rng() - 0.5) * 0.3, y);
        ctx.fillStyle = rgba(lit > 0.55 ? C.olive : C.ground, 0.55 + 0.25 * rng());
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 0.28;
        ctx.strokeStyle = rgba(C.edge, 0.5 + 0.3 * (1 - lit));
        ctx.stroke();
        if (lit > 0.6 && rng() > 0.3) {
          ctx.fillStyle = rgba(PAPER_FILL, 0.32 * lit);
          ctx.beginPath();
          ctx.ellipse(-rx * 0.25, -ry * 0.35, rx * 0.45, ry * 0.25, 0, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  });
}

function drawHood(d: Draw, pose: HoodPose): void {
  const k = SPREAD[pose];
  const { pen } = d;
  const { ctx } = pen;
  const shape = outline(k);
  const w = halfAt(-26, k);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    // The skin stretched between the scales shows dark, warmer where it's lit.
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, '#6a6440');
    g.addColorStop(0.35, '#3f3b22');
    g.addColorStop(0.75, '#25221a');
    g.addColorStop(1, '#17150c');
    ctx.fillStyle = g;
    ctx.fillRect(BACK - 4, -w - 4, FRONT - BACK + 12, w * 2 + 8);
    glaze(ctx, -24, -w * 0.45, 16, w * 0.4, 0, '#8a814e', 0.4);
    glaze(ctx, -46, w * 0.5, 18, w * 0.35, 0, C.shadow, 0.35);
  });
  scales(d, k, shape);
  pen.clipped(shape, () => {
    for (const [x, wd] of [[-19, 2.6], [-35, 2.8], [-51, 2.4]] as const) {
      const b = band(x, k, wd);
      pen.fill(b.map((p) => pt(p.x + 1.2, p.y)), C.edge, 0.3);
      pen.fill(b, C.band, 0.78);
      pen.clipped(b, () => {
        const shade = ctx.createLinearGradient(0, -w, 0, w);
        shade.addColorStop(0, rgba('#fff3c4', 0.3));
        shade.addColorStop(0.45, rgba(C.band, 0));
        shade.addColorStop(1, rgba(C.deep, 0.6));
        ctx.fillStyle = shade;
        ctx.fillRect(BACK, -w - 2, FRONT - BACK, w * 2 + 4);
      });
    }
    // The spine's ridge down the middle, lit on its near side.
    pen.hair([pt(FRONT, -0.6), pt(BACK, -0.6)], 0.6, PAPER_FILL, 0.3);
    pen.hair([pt(FRONT, 0.6), pt(BACK, 0.6)], 0.6, C.shadow, 0.4);
    // The far side turned from the light, hatched; a sheen across the near side.
    pen.crescent(shape, pt(-4, -w * 0.35), () => pen.hatch(shape, 1.6, 0.95, 0.34, { color: d.ink, alpha: 0.4 }));
    pen.crescent(shape, pt(-2, -w * 0.2), () => pen.fill(shape, C.shadow, 0.25));
    glaze(ctx, -30, -w * 0.62, 20, 2.2, 0, PAPER_FILL, 0.22 + 0.1 * k);
  });
  // The hood's rim: fine on the lit side, heavier where it turns away.
  const half = Math.floor(shape.length / 2);
  pen.stroke(shape.slice(0, half + 1), 1.15, d.ink, 0.95, false);
  pen.stroke(shape.slice(half), 1.8, d.ink, 1, false);
  pen.hair(closed(shape), 0.4, d.ink, 0.4);
  // The head lies in front of it: cut its shape out, and the shadow it throws on the hood just behind.
  const head = headOutline(COBRA_HEAD_SPEC);
  ctx.save();
  ctx.beginPath();
  ctx.rect(CUT, -SNAKE_W * 2, 60, SNAKE_W * 4);
  ctx.clip();
  pen.clipped(shape, () => pen.fill(head.map((p) => pt(p.x - 1.6, p.y + 1.4)), C.shadow, 0.45));
  ctx.globalCompositeOperation = 'destination-out';
  pen.fill(head, '#000000', 1);
  ctx.restore();
  // Its back melts into the neck, where the body under it carries on.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(BACK + 3, 0, BACK + 11, 0);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(-HOOD_FRAME / 2, -HOOD_FRAME / 2, BACK + 11 + HOOD_FRAME / 2, HOOD_FRAME);
  ctx.restore();
}

export const COBRA_HOOD: SpriteArt<HoodPose> = {
  frame: HOOD_FRAME,
  res: 3,
  poses: ['rise', 'half', 'spread'],
  draw: drawHood,
};
