import { VIDEO, lerp } from '../short';
import { drawAdelie, onPenguin } from './art/adelie';
import { drawDiver } from './art/diver';
import { drawGrizzly } from './art/grizzly';
import { drawLeopardSeal } from './art/leopardSeal';
import { drawBubbles, drawRays, grade } from './scene';
import {
  bearAt, countPop, dropAt, driftAt, glareAt, iceAt, jawsAt, LOOP_S, offerAt, PILE, pileDiver, sadAt, zipAt,
} from './story';

/** The seven pictures of the short (story.ts has the choreography). Each paints a whole, opaque frame, mood-graded. */

const DIVER_PX_IN_MOUTH = 6.4;

export interface Backdrops {
  readonly water: HTMLCanvasElement;
  readonly ceiling: HTMLCanvasElement;
}

function backdrop(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, rays = 1): void {
  ctx.drawImage(b.water, 0, 0);
  drawRays(ctx, t / LOOP_S, rays);
}

/** Frame 1: the jaws wide round the diver's camera dome and head. */
export function drawJaws(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 0.7);
  const s = jawsAt(t);
  const k = s.seal.len / 410;
  drawLeopardSeal(ctx, s.seal, { gape: s.gape, lid: s.lid, bend: 2 }, boil, () => {
    drawDiver(ctx, s.diver.x, s.diver.y, DIVER_PX_IN_MOUTH / k, s.diver.rot, 1, { kick: s.diver.kick }, boil);
  });
  drawBubbles(ctx, t / LOOP_S);
  grade(ctx, { sat: 0.4, tint: '#6f93b5', tintA: 0.3, dark: 0.55 });
}

/** Antarctica, 2006: the pack ice overhead, the seal swimming past the small diver. */
export function drawIce(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 1.5);
  ctx.drawImage(b.ceiling, 0, 0);
  const s = iceAt(t);
  drawDiver(ctx, s.diver.x, s.diver.y, 1.2, s.diver.rot, 1, { kick: 0.2 * Math.sin(t * 3) }, boil);
  drawLeopardSeal(ctx, s.seal, { gape: 0, lid: 0.15, bend: 6 }, boil);
  drawBubbles(ctx, t / LOOP_S);
  grade(ctx, { sat: 0.25, tint: '#7fb2dc', tintA: 0.35, dark: 0.45 });
}

/** Her head was bigger than a grizzly bear's: the seal's head and a grizzly's, side by side. */
export function drawBear(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 1);
  const s = bearAt(t);
  drawLeopardSeal(ctx, s.seal, { gape: 0, lid: 0.1, bend: 0 }, boil);
  drawGrizzly(ctx, s.bear.x, s.bear.y, s.bear.len, 1, boil);
  grade(ctx, { sat: 0.1, tint: '#a9c4d8', tintA: 0.2, dark: 0.35 });
}

/** The seal swims up with a penguin across her jaws, held out to the camera. */
export function drawOffer(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 2);
  const s = offerAt(t);
  drawDiver(ctx, s.diver.x, s.diver.y, 1.5, s.diver.rot, 1, { kick: 0.15 * Math.sin(t * 4) }, boil);
  drawLeopardSeal(ctx, s.seal, { gape: s.gape, lid: 0, bend: 5 }, boil, () => {
    drawAdelie(ctx, { x: 178, y: 18, len: 100 * (1 + 0.15 * s.pop), rot: -1.5, face: 1 }, { flap: 0.15, sleepy: 0.7 }, boil);
  });
  drawBubbles(ctx, t / LOOP_S);
  grade(ctx, { sat: 0, tint: '#ffffff', tintA: 0, dark: 0.15, glow: '#ffe7a0', glowA: 0.2 });
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, age: number): void {
  if (age < 0 || age > 0.5) return;
  const u = age / 0.5;
  ctx.save();
  ctx.strokeStyle = `rgba(240,252,255,${(0.7 * (1 - u)).toFixed(3)})`;
  ctx.lineWidth = 6 * (1 - u) + 1;
  ctx.beginPath();
  ctx.ellipse(x, y, 40 + 150 * u, 14 + 50 * u, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Then another, and another: penguins plop down in a heap in front of the diver. */
export function drawPile(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 1.6);
  const d = pileDiver(t);
  drawDiver(ctx, d.x, d.y, 1.9, d.rot, -1, { kick: d.kick }, boil);
  const order = [...PILE].sort((p, q) => p.y - q.y);
  for (const p of order) {
    const drop = dropAt(t, p.at);
    if (!drop.here) continue;
    const bob = 6 * Math.sin(t * 2 + p.x);
    ring(ctx, p.x, p.y + 40, t - p.at - 0.4);
    ctx.save();
    ctx.translate(p.x, p.y + drop.dy + bob);
    ctx.scale(1 + 0.12 * drop.squash, 1 - 0.14 * drop.squash);
    ctx.translate(-p.x, -(p.y + drop.dy + bob));
    drawAdelie(ctx, { x: p.x, y: p.y + drop.dy + bob, len: p.len, rot: p.rot, face: p.face }, { flap: 0.5 + 0.4 * Math.sin(t * 5 + p.x), sleepy: drop.squash > 0.2 ? 0.5 : 0 }, boil);
    ctx.restore();
  }
  drawBubbles(ctx, t / LOOP_S);
  const pop = countPop(t);
  grade(ctx, { sat: 0, tint: '#ffffff', tintA: 0, dark: 0.12, glow: '#fff3c0', glowA: 0.07 + 0.1 * pop });
}

/** "He says she thought he was a…": the seal's flat, unimpressed stare. */
export function drawGlare(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 0.5);
  const s = glareAt(t);
  drawLeopardSeal(ctx, s, { gape: 0, lid: s.lid, slant: s.slant, bend: 0 }, boil);
  grade(ctx, { sat: 0.55, tint: '#9fb3a8', tintA: 0.4, dark: 0.5 });
}

/** "…useless hunter": a penguin zips past the clumsy diver; "who'd starve": the diver sinks, the seal looks on. */
export function drawDrift(ctx: CanvasRenderingContext2D, b: Backdrops, t: number, boil: number): void {
  backdrop(ctx, b, t, 1);
  const s = driftAt(t);
  const z = zipAt(t);
  if (z.on) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,252,255,0.6)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 7 - i;
      ctx.beginPath();
      ctx.moveTo(z.x + 90 + i * 50, z.y - 24 + i * 16);
      ctx.lineTo(z.x + 240 + i * 90, z.y - 24 + i * 16);
      ctx.stroke();
    }
    ctx.restore();
    drawAdelie(ctx, { x: z.x, y: z.y, len: 230, rot: 0.05, face: -1 }, { flap: 0.1 }, boil);
  }
  drawDiver(ctx, s.diver.x, s.diver.y, 1.7, s.diver.rot, 1, { kick: s.diver.kick }, boil);
  if (s.sealIn > 0.01) {
    drawLeopardSeal(ctx, s.seal, { gape: 0, lid: 0.3 * s.sad, slant: -0.7 * s.sad, bend: 2, sad: 0.4 }, boil);
    // A penguin left floating in front of her nose, limp.
    const p = { x: 520, y: 1010 + 12 * Math.sin(t * 1.4), len: 220, rot: 0.9, face: 1 as const };
    drawAdelie(ctx, p, { flap: 0, sleepy: 0.9 }, boil);
    void onPenguin;
  }
  drawBubbles(ctx, t / LOOP_S);
  const sad = sadAt(t);
  grade(ctx, { sat: 0.7 * sad, tint: '#4d78b0', tintA: 0.55 * sad, dark: 0.25 + 0.5 * sad });
}

export const SCENE_DRAW = { jaws: drawJaws, ice: drawIce, bear: drawBear, offer: drawOffer, pile: drawPile, glare: drawGlare, drift: drawDrift } as const;
void VIDEO;
