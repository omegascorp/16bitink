import { C } from '../../../src/art/fish/kit';
import { ellipse, INK, PAPER, type Pt } from '../../../src/art/pen';
import { faded } from './layer';
import { penFor } from './props';
import { EYE_R_TEX, EYE_TEX, type Fish, texScale, texToScreen } from './story';
import { drawGlow, EMBER } from './water';

/**
 * The cutaway of the head, seen through the skin like a diagram: a pale
 * window over the eye, the heater muscle beside it (glowing, with warm
 * waves rolling off it) and the brain above, all laid out in the fish's own
 * texture px, so they ride on the drawing as the camera goes in.
 */

const MUSCLE = { x: EYE_TEX.x - 11.5, y: EYE_TEX.y + 4.5, rx: 6.8, ry: 3.6, rot: -0.12 } as const;
const BRAIN = { x: EYE_TEX.x - 15.5, y: EYE_TEX.y - 6.5, rx: 6, ry: 3.6, rot: 0.15 } as const;
const WINDOW = { x: EYE_TEX.x - 9.5, y: EYE_TEX.y - 0.5, rx: 17.5, ry: 12 } as const;
const MUSCLE_RED = '#c8553c';
const BRAIN_PINK = '#e9aaa6';

/** Points round a rotated ellipse. */
const oval = (o: { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number; readonly rot: number }, n = 28): Pt[] =>
  ellipse(0, 0, o.rx, o.ry, n).map((p) => ({ x: o.x + p.x * Math.cos(o.rot) - p.y * Math.sin(o.rot), y: o.y + p.x * Math.sin(o.rot) + p.y * Math.cos(o.rot) }));

export const muscleOf = (f: Fish): Pt => texToScreen(f, MUSCLE);
export const brainOf = (f: Fish): Pt => texToScreen(f, BRAIN);

export interface Cutaway {
  /** The see-through window, 0 .. 1 (it opens as the camera comes in). */
  readonly open: number;
  readonly muscle: number;
  readonly waves: number;
  readonly brain: number;
  /** Drives the waves: 0 → 1 over the video. */
  readonly loop: number;
}

/** Puts the context in the fish's texture px for `draw`. */
function onFish(ctx: CanvasRenderingContext2D, f: Fish, draw: () => void): void {
  const k = texScale(f);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(-f.tilt);
  ctx.scale(k, k);
  ctx.translate(-C, -C);
  draw();
  ctx.restore();
}

/** Warm waves rolling out from the muscle: rings growing and fading, `count` a second. */
function drawWaves(ctx: CanvasRenderingContext2D, f: Fish, c: Cutaway): void {
  if (c.waves <= 0) return;
  const at = muscleOf(f);
  const k = texScale(f);
  ctx.save();
  ctx.strokeStyle = EMBER;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    // 1.6 rings a second: 24 in the loop.
    const u = (((c.loop * 24 + i / 3) % 1) + 1) % 1;
    const r = k * (8 + 20 * u);
    ctx.globalAlpha = c.waves * (1 - u) * Math.min(1, u * 5);
    ctx.lineWidth = Math.max(3, k * 1.1 * (1 - u));
    for (const [from, to] of [[-2.5, -0.65], [0.65, 2.5]] as const) {
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, r, r * 0.8, -f.tilt, from, to);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawCutaway(ctx: CanvasRenderingContext2D, f: Fish, c: Cutaway, boil: number): void {
  if (c.open <= 0) return;
  faded(ctx, Math.min(1, c.open), (layer) => drawInside(layer, f, boil));
  const k = texScale(f);
  drawGlow(ctx, brainOf(f), k * 9, c.open * c.brain * 0.8);
  drawGlow(ctx, muscleOf(f), k * 11, c.open * c.muscle);
  drawWaves(ctx, f, { ...c, waves: c.waves * c.open });
}

/** The window through the skin, and the brain and the heater muscle seen through it. */
function drawInside(ctx: CanvasRenderingContext2D, f: Fish, boil: number): void {
  onFish(ctx, f, () => {
    const pen = penFor(ctx, 61, boil, 0.12);
    const win = oval({ ...WINDOW, rot: 0 }, 40);
    ctx.save();
    // The window through the skin: paler, with a dashed edge.
    pen.fill(win, PAPER, 0.5);
    ctx.setLineDash([1.6, 1.2]);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    win.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // The brain, folded.
    const brain = oval(BRAIN);
    pen.fill(brain, BRAIN_PINK, 0.95);
    pen.clipped(brain, () => {
      for (let i = 0; i < 4; i++) {
        const y = BRAIN.y - 2.4 + i * 1.6;
        pen.hair(Array.from({ length: 7 }, (_, j) => ({ x: BRAIN.x - 5.5 + j * 1.8, y: y + Math.sin(j * 1.9 + i) * 0.55 })), 0.18, '#a5605c', 0.9);
      }
    });
    pen.stroke([...brain, brain[0]!], 0.32, INK, 1, false);
    // The heater muscle: fibres along it, and the stalk to the eye.
    pen.stroke([{ x: MUSCLE.x + MUSCLE.rx - 1, y: MUSCLE.y - 1.2 }, { x: EYE_TEX.x - EYE_R_TEX * 0.6, y: EYE_TEX.y + 2.2 }], 1.4, MUSCLE_RED, 1, false);
    const muscle = oval(MUSCLE);
    pen.fill(muscle, MUSCLE_RED, 0.95);
    pen.clipped(muscle, () => {
      for (let i = 0; i < 5; i++) {
        const y = MUSCLE.y - 2.6 + i * 1.3;
        pen.hair([{ x: MUSCLE.x - 7, y: y + 0.8 }, { x: MUSCLE.x, y }, { x: MUSCLE.x + 7, y: y - 0.8 }], 0.16, '#7d2c1e', 0.8);
      }
    });
    pen.stroke([...muscle, muscle[0]!], 0.32, INK, 1, false);
    ctx.restore();
  });
}
