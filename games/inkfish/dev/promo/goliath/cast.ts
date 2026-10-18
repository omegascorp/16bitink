import { bodyProportions } from '../../../src/art/fishArt';
import { C, topAt, xAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { VIDEO } from '../short';
import { toScreen, type View, type WorldFish } from './story';
import { drawSwimmer, type SwimLook } from './swimmer';

/**
 * The two fish, as the game draws them: the goliath grouper (the boss "as
 * big as a door") and the reef shark, given the blacktip's black fin tips.
 */

const SHARK = ANATOMY.shark;
const TIP_INK = '#17191d';

/** A point along the shark's tall first dorsal at `f` (0 front .. 1 back of its base), on its outer edge, as the game draws it. */
function dorsalEdge(a: Anatomy, f: number): { x: number; y: number } {
  const fin = a.dorsal!;
  const t = fin.from + (fin.to - fin.from) * f;
  const prof = f < 0.3 ? f / 0.3 : Math.pow(1 - (f - 0.3) / 0.7, 0.8);
  const height = a.hh * fin.height * Math.max(0.12, prof);
  return { x: xAt(a, t) - height * 0.8, y: topAt(a, t) - height };
}

/** The reef shark with black tips on its dorsal fin and the lower lobe of its tail: a blacktip. */
export const BLACKTIP: Anatomy = {
  ...SHARK,
  extras: (k: Kit) => {
    SHARK.extras?.(k);
    // The top third of the dorsal: from the tip a third of the way down its leading and trailing edges.
    const tip = dorsalEdge(SHARK, 0.3);
    const front = { x: xAt(SHARK, SHARK.dorsal!.from), y: topAt(SHARK, SHARK.dorsal!.from) + 2 };
    const back = dorsalEdge(SHARK, 0.85);
    const down = (p: { x: number; y: number }): { x: number; y: number } => ({ x: tip.x + (p.x - tip.x) * 0.36, y: tip.y + (p.y - tip.y) * 0.36 });
    k.pen.fill([tip, down(front), down(back)], TIP_INK, 0.9);
    // The tail's lower lobe (the engine's 'shark' tail).
    const x0 = xAt(SHARK, 1) + 3;
    const L = SHARK.hh * SHARK.tailSize;
    const S = L * 0.85;
    const lobe = { x: x0 - L * 0.42, y: C + S * 0.62 };
    k.pen.fill([lobe, { x: lobe.x + 7, y: lobe.y - 6 }, { x: lobe.x + 2, y: lobe.y - 9 }, { x: lobe.x - 4, y: lobe.y - 4 }], TIP_INK, 0.85);
  },
};

export interface Cast {
  readonly grouper: Sprite;
  readonly shark: Sprite;
  /** A scratch layer the size of the video, for drawing a fish out of the dark. */
  readonly layer: CanvasRenderingContext2D;
}

export function makeCast(): Cast {
  const layer = document.createElement('canvas');
  layer.width = VIDEO.width;
  layer.height = VIDEO.height;
  return { grouper: makeSprite('grouper', 6, 'heavy'), shark: makeSprite('shark', 5, 'light', BLACKTIP), layer: layer.getContext('2d')! };
}

/** A world fish where the camera shows it. */
export function poseOf(f: WorldFish, v: View): Pose {
  const c = toScreen(v, f);
  return { j: 0, age: 0, shape: f.shape, x: c.x, y: c.y, length: f.length * v.zoom, facing: f.facing, tilt: f.tilt, beat: f.beat, effort: f.effort };
}

/** The grouper's skin over its eye, for closed eyes. */
export const GROUPER_LID = '#8f7d58';

/** A fish drawn out of the dark: its drawing darkened by `murk` (0 plain .. 1 hidden) in the cast's layer, like the murky water it's in. */
export function drawMurky(ctx: CanvasRenderingContext2D, cast: Cast, sprite: Sprite, pose: Pose, boil: number, look: SwimLook, murk: number): void {
  if (murk <= 0.005) {
    drawSwimmer(ctx, sprite, pose, boil, look);
    return;
  }
  if (murk >= 0.995) return;
  const layer = cast.layer;
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(layer, sprite, pose, boil, look);
  layer.save();
  layer.globalCompositeOperation = 'source-atop';
  // A shade lighter than the deep water round it, so the shape shows before its markings do.
  layer.fillStyle = `rgba(12,30,30,${(0.95 * murk).toFixed(3)})`;
  layer.fillRect(0, 0, VIDEO.width, VIDEO.height);
  layer.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, 5 * (1 - murk));
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** The shark's length on screen from nose to tail tip, along its heading: where its size bar runs. */
export function sharkSpan(pose: Pose): { readonly nose: { x: number; y: number }; readonly tail: { x: number; y: number } } {
  const { hl } = bodyProportions('shark');
  // The tail fin reaches about a third of a body past the tail stalk.
  const tailReach = 0.5 + (SHARK.hh * SHARK.tailSize * 1.0) / (2 * hl);
  const d = { x: pose.facing * Math.cos(pose.tilt), y: -Math.sin(pose.tilt) };
  return {
    nose: { x: pose.x + d.x * 0.5 * pose.length, y: pose.y + d.y * 0.5 * pose.length },
    tail: { x: pose.x - d.x * tailReach * pose.length, y: pose.y - d.y * tailReach * pose.length },
  };
}
