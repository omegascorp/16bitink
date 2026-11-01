import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { prepareAdelie } from './art/adelie';
import { prepareDiver } from './art/diver';
import { prepareGrizzly } from './art/grizzly';
import { prepareLeopardSeal } from './art/leopardSeal';
import { renderLeopardAudio } from './audio';
import { makeCeiling, makeIce, RED } from './scene';
import { type Backdrops, SCENE_DRAW } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, counterAt, countAt, countPop, flashAt, LOOP_S, pengTextAt, placeAt, SCENE_IDS, sceneAlpha, tagAt, wrap, yearAt, decay, PENGUIN_AT } from './story';

/** Draws the "leopard seal and the photographer" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const COLD: TextInk = { fill: '#eaf7ff', halo: '#0b2c52' };
const WARM: TextInk = { fill: '#fff1b8', halo: '#7a2a10' };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;
const cx = VIDEO.width / 2;

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
  let x = cx - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}

/** The words and numbers that come with the pictures. */
function drawTexts(ctx: CanvasRenderingContext2D, t: number): void {
  drawTextLine(ctx, 'Antarctica', cx, TEXT.place.y, TEXT.place.size, 700, placeAt(t), COLD);
  drawTextLine(ctx, '2006', cx, TEXT.year.y, TEXT.year.size * (1 + 0.1 * decay(t, 4.9, 0.3)), 700, yearAt(t), COLD);
  drawTextLine(ctx, 'GRIZZLY', 400, TEXT.tag.y, TEXT.tag.size, 700, tagAt(t), WARM);
  const pop = decay(t, PENGUIN_AT, 0.25);
  drawTextLine(ctx, 'PENGUIN!', cx, TEXT.penguin.y - 30 * pop, TEXT.penguin.size * (1 + 0.25 * pop), 700, pengTextAt(t), WARM);
  const n = countAt(t);
  if (n > 0) {
    const c = counterAt(t);
    drawTextLine(ctx, String(n), cx, TEXT.count.y, TEXT.count.size * (1 + 0.3 * countPop(t)), 700, c, WARM);
    drawTextLine(ctx, n === 1 ? 'day' : 'days', cx, TEXT.days.y, TEXT.days.size, 700, c, WARM);
  }
}

export function createLeopard(ctx: CanvasRenderingContext2D): Short {
  const backdrops: Backdrops = { water: makeIce(), ceiling: makeCeiling() };
  void prepareGreatWhite();
  prepareLeopardSeal();
  prepareAdelie();
  prepareDiver();
  prepareGrizzly();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#0b2a4c';
    w.fillRect(0, 0, VIDEO.width, VIDEO.height);
    for (const id of SCENE_IDS) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      SCENE_DRAW[id](layer.ctx, backdrops, t, boil);
      w.save();
      w.globalAlpha = alpha;
      w.drawImage(layer.canvas, 0, 0);
      w.restore();
    }
    drawTexts(w, t);
    const cam = cameraAt(t);
    ctx.fillStyle = '#0b2a4c';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(cx + cam.dx, 800 + cam.dy);
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cx, -800);
    ctx.drawImage(world.canvas, 0, 0);
    ctx.restore();
    const flash = flashAt(t);
    if (flash > 0.005) {
      ctx.save();
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.restore();
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderLeopardAudio };
}
