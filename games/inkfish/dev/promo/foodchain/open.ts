import { FRAME } from '../descent/frame';
import { drawCallout } from '../descent/hud';
import { clamp01, smooth, window01 } from '../short';
import { drawAnimal } from './cast';
import type { Climb } from './climb';
import { drawPod, drawWhalePass } from './giants';
import { countUp, drawWeightTag } from './hud';
import { drawKrillMagnifier } from './inserts';
import type { ClimbScene } from './scene';
import { SPECIES, type Kind } from './species';
import { sectionStart, T } from './timeline';
import { pulledBack, type ChainView } from './view';
import { darkOf, type Water } from './water';

/**
 * The cold open (0:00–0:28): four gulps a couple of seconds apart, each
 * predator's mouth arriving on the word "eats"; the orca alone at the top;
 * the blue whale sweeping through a cloud of krill (a paperclip beside one);
 * orcas circling it; then a white flash and a dive into one drop of sunlit
 * water, down to the diatom the climb starts on.
 */

const W = FRAME.width;
const H = FRAME.height;

export interface OpenScene {
  readonly climb: Climb;
  readonly view: ChainView;
  readonly water: Water;
}

const TONE: Partial<Record<Kind, number>> = { copepod: 0.12, anchovy: 0.38, mackerel: 0.5, tuna: 0.68, orca: 0.86 };

function toneAt(climb: Climb, t: number): number {
  const h = climb.heroAt(t);
  const l = climb.links[h]!;
  const now = TONE[l.kind] ?? 0.5;
  if (h === 0 || t >= l.zoomTo) return now;
  const before = TONE[climb.links[h - 1]!.kind] ?? 0.5;
  return before + (now - before) * smooth((t - l.zoomFrom) / (l.zoomTo - l.zoomFrom));
}

/** The tag rolls up through each zoom (no jumps shouted yet: that's the climb's job). */
function gramsAt(climb: Climb, t: number): number {
  const h = climb.heroAt(t);
  const l = climb.links[h]!;
  const g = SPECIES[l.kind].grams;
  if (h === 0) return g;
  return countUp(SPECIES[climb.links[h - 1]!.kind].grams, g, t, l.zoomFrom, l.zoomFrom + 1.2);
}

export function drawOpen(ctx: CanvasRenderingContext2D, t: number, open: OpenScene, climb: ClimbScene): void {
  if (t < T.biggestEver) {
    // The four gulps, then the slow pull-back on the orca alone.
    const cam = pulledBack(open.climb.camera(t), 1 + 1.8 * smooth((t - T.isnt) / 2.2));
    const tone = toneAt(open.climb, t);
    open.water.draw(ctx, tone, cam.centre.x / cam.width, Math.log2(cam.width), t);
    open.view.draw(ctx, t, cam);
    // Frame 1: the copepod is a speck beside the mouth, so ring it.
    const cop = open.view.lookOf(0, t, cam);
    const ring = 1 - smooth((t - open.climb.links[1]!.gulp + 0.15) / 0.2);
    drawCallout(ctx, cop.x, cop.y, 34, 'copepod', undefined, ring, 1, 0);
    drawWeightTag(ctx, { grams: gramsAt(open.climb, t), jump: '', pop: 0, alpha: 1 - smooth((t - T.biggerFish) / 0.5) }, darkOf(tone));
    return;
  }
  if (t < T.hunts) {
    drawWhalePass(ctx, t, open.water, T.biggestEver, T.paperclip - 1.2, 2700, H * 0.47);
    drawKrillMagnifier(ctx, W - 330, 330, 190, t, window01(t, T.paperclip - 0.1, T.hunts, 0.25));
    return;
  }
  if (t < T.grainOfSalt) {
    drawPod(ctx, t, open.water, T.hunts, Infinity, 0);
    return;
  }
  drawDive(ctx, t, climb);
}

/** A white flash on "grain of salt", then down into one drop: the diatom grows from a speck to the climb's first frame. */
function drawDive(ctx: CanvasRenderingContext2D, t: number, climb: ClimbScene): void {
  const start = sectionStart(1);
  const u = clamp01((t - T.grainOfSalt) / (start - T.grainOfSalt));
  climb.water.draw(ctx, 0.02, 0, -6 * (1 - u), t);
  // The diatom grows (exponentially, so the speed looks even) to its size when the climb takes over.
  const end = W / climb.climb.links[0]!.frame;
  const size = end * 2 ** (-7 * (1 - smooth(u)));
  drawAnimal(ctx, 'diatom', { x: W / 2, y: H / 2, length: size, facing: 1 }, t, { spin: t * 0.25 });
  const flash = 1 - smooth((t - T.grainOfSalt - 0.1) / 0.6);
  if (flash > 0) {
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fbf7ec';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
