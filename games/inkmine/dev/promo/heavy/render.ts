import { makeCanvas } from '../../../src/art/pen';
import { drawSpokenLine, PAPER_ON_DARK, SPOKEN } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderHeavyAudio } from './audio';
import { drawBackdrop, makeBackdrops } from './backdrop';
import { makeBeastScene } from './beastScene';
import { makeBlockScene } from './blockScene';
import { makeElephantScene, makeThinScene } from './fallScenes';
import { makePageScene } from './pageScene';
import { makeStackScene } from './stackScene';
import { captionAt } from './script';
import { boilAt, earthAt, LOOP_S, sceneAt, shakeAt, wrap, type Scene } from './story';

/** Draws the heavy-planet short (story.ts has the choreography): the backdrop, the scene or two up now, the caption. */
type SceneDraw = (ctx: CanvasRenderingContext2D, t: number, boil: number) => void;

/** The spoken line, split into two rows when one would have to shrink. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${SPOKEN.size}px Caveat`;
  const width = ctx.measureText(words.join(' ')).width;
  ctx.restore();
  if (width <= SPOKEN.maxWidth || words.length < 3) {
    drawSpokenLine(ctx, words, now.word, PAPER_ON_DARK);
    return;
  }
  const split = Math.ceil(words.length / 2);
  drawSpokenLine(ctx, words.slice(0, split), now.word, PAPER_ON_DARK, undefined, SPOKEN.y - 92);
  drawSpokenLine(ctx, words.slice(split), now.word - split, PAPER_ON_DARK, undefined, SPOKEN.y + 4);
}

export function createHeavy(ctx: CanvasRenderingContext2D): Short {
  const backdrops = makeBackdrops();
  const scenes: Partial<Record<Scene, SceneDraw>> = {
    beast: makeBeastScene(),
    stack: makeStackScene(),
    page: makePageScene(),
    blocks: makeBlockScene(),
    thin: makeThinScene(),
    elephant: makeElephantScene(),
  };
  // A scene fading in or out is drawn on its own layer first, so its overlapping parts fade as one.
  const layer = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const shake = shakeAt(t);
    drawBackdrop(ctx, backdrops, boil, earthAt(t), shake);
    for (const [name, sceneDraw] of Object.entries(scenes) as [Scene, SceneDraw][]) {
      const alpha = sceneAt(name, t);
      if (alpha <= 0) continue;
      const target = alpha >= 0.999 ? ctx : layer.ctx;
      if (target === layer.ctx) layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      target.save();
      target.translate(shake.x, shake.y);
      sceneDraw(target, t, boil);
      target.restore();
      if (target === layer.ctx) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderHeavyAudio };
}
