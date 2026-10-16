import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER } from '../captions';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderEelsAudio } from './audio';
import { makeFreud, makeJarBack, makeJarFront, makeMicroscope, makeRoom } from './lab';
import { makeMap } from './map';
import { type Art, drawDeepScene, drawLabScene, drawMapScene, SPOKEN } from './scenes';
import { captionAt } from './script';
import { makeDeep } from './sea';
import { boilAt, deepAt, labAt, LOOP_S, mapAt, wrap } from './story';

/** Draws the "nobody has ever seen eels mate" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in red. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  // The loop starts a hair before the first word: it is already the one being said.
  const spoken = Math.max(0, now.word);
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= spoken ? 1 : 0.55, i === spoken ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

function makeArt(): Art {
  return {
    deep: makeDeep(),
    room: makeRoom(),
    freud: makeFreud(),
    scope: makeMicroscope(),
    jarBack: makeJarBack(),
    jarFront: makeJarFront(),
    map: makeMap(),
    eel: makeSprite('eel', 4),
    jarEel: makeSprite('eel', 2),
    mapEel: makeSprite('eel', 1),
  };
}

export function createEels(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const art = makeArt();
  // Each scene is drawn whole into this layer, then laid on the page at its fade.
  const layer = document.createElement('canvas');
  layer.width = VIDEO.width;
  layer.height = VIDEO.height;
  const lctx = layer.getContext('2d')!;

  const lay = (alpha: number, draw: (c: CanvasRenderingContext2D) => void): void => {
    if (alpha <= 0) return;
    lctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
    draw(lctx);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.drawImage(paper, 0, 0);
    lay(deepAt(t), (c) => drawDeepScene(c, art, t, boil));
    lay(labAt(t), (c) => drawLabScene(c, art, t, boil));
    lay(mapAt(t), (c) => drawMapScene(c, art, t, boil));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderEelsAudio };
}
