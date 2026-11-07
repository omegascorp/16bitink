import { drawSpokenLine, drawTextLine, PAPER_ON_DARK, SPOKEN } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderLeviathanAudio } from './audio';
import { captionAt } from './captions';
import { makeCaveScene } from './caveScene';
import { makeChaseScene } from './chaseScene';
import { drawCta } from './cta';
import { makeEyeScene } from './eyeScene';
import { makeFigures } from './figures';
import { makeSlamScene } from './slamScene';
import { arrowAt, boilAt, ctaAt, darkAt, hookAt, LOOP_S, sceneAt, shakeAt, wrap, type Scene } from './story';

/** The credit for this short only: it names the game's own page. */
export const LEVIATHAN_CREDIT = 'InkMine · 16bit.ink/mine';

/** The word being said, in a red that holds up on the dark water. */
const HOT = '#ff7a55';
/** In the chase the spoken line sits up where the hook does: the CTA has the lower lines. */
const CHASE_CAPTION_Y = 420;

type SceneDraw = (ctx: CanvasRenderingContext2D, t: number, boil: number) => void;

/** Draws the Leviathan short (story.ts has the choreography): the scene up now, the hook, the CTA. */
export function createLeviathan(ctx: CanvasRenderingContext2D): Short {
  const figures = makeFigures();
  const cave = makeCaveScene(figures);
  const scenes: Readonly<Record<Scene, SceneDraw>> = {
    chase: makeChaseScene(figures),
    slam: makeSlamScene(figures),
    cave,
    eye: makeEyeScene(figures),
    wake: cave,
  };
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    const shake = shakeAt(t);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    scenes[sceneAt(t)](ctx, t, boil);
    ctx.restore();
    const dark = darkAt(t);
    if (dark > 0) {
      ctx.save();
      ctx.globalAlpha = dark;
      ctx.fillStyle = '#070512';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.restore();
    }
    const hook = hookAt(t);
    drawTextLine(ctx, 'NEVER DRILL', 540, 385, 156, 700, hook, PAPER_ON_DARK);
    drawTextLine(ctx, 'NEAR THIS THING', 540, 505, 126, 700, hook, PAPER_ON_DARK);
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT, sceneAt(t) === 'chase' ? CHASE_CAPTION_Y : SPOKEN.y);
    drawCta(ctx, ctaAt(t), arrowAt(t), boil);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderLeviathanAudio };
}
