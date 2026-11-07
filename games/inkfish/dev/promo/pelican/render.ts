import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { drawCapybara } from './art/capybara';
import { drawPelican } from './art/pelican';
import { drawFlag, drawGround, drawJug, drawRipples, drawShade, drawSky, drawTufts } from './art/zoo';
import { renderPelicanAudio } from './audio';
import { createPelicanKit } from './kit';
import { type CapybaraPose, crownAt, pouchDepth } from './rig';
import { captionAt, TEXT } from './script';
import { bangAt, boilAt, camAt, capybarasAt, castAt, flashAt, galAt, LOOP_S, moodAt, pelicanAt, wrap, zooAt, type Cam } from './story';

/** Draws the "this pelican tried to swallow a capybara" short (story.ts has the choreography). */

export const RED = '#d02a1f';
/** Captions: paper ink in a dark outline, readable on sky, grass or fur; the word being said in red. */
const CAPTION_INK: TextInk = { fill: PAPER, halo: '#1a1410' };
const SPOKEN: TextInk = { fill: '#ff4a36', halo: '#1a1410' };
/** Labels on the picture: ink on a paper halo. */
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_MAX_W = 980;
const BOIL_FRAMES = 3;

/** The spoken phrase, the word being said in red. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const size = TEXT.caption.size;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, size * k, 700, 1, i === now.word ? SPOKEN : CAPTION_INK);
    x += (natural[i]! + space) * k;
  });
}

const toScreen = (cam: Cam, p: { readonly x: number; readonly y: number }): { x: number; y: number } => ({
  x: (p.x - cam.cx) * cam.zoom + VIDEO.width / 2,
  y: (p.y - cam.cy) * cam.zoom + VIDEO.height / 2,
});

function drawLabels(ctx: CanvasRenderingContext2D, t: number, cam: Cam, boil: number): void {
  const mid = VIDEO.width / 2;
  const gal = galAt(t);
  drawTextLine(ctx, '3 gal', mid, TEXT.gallons.y, TEXT.gallons.size, 700, gal, UNSPOKEN);
  drawTextLine(ctx, '11 L', mid, TEXT.litres.y, TEXT.litres.size, 700, gal * 0.9, UNSPOKEN);
  const zoo = zooAt(t);
  if (zoo > 0) {
    const text = 'A zoo in Japan';
    ctx.save();
    ctx.font = `700 ${TEXT.zoo.size}px ${CAPTION_FONT}`;
    const w = ctx.measureText(text).width;
    ctx.restore();
    const flagW = 120;
    const x0 = mid - (w + 30 + flagW) / 2;
    drawTextLine(ctx, text, x0 + w / 2, TEXT.zoo.y, TEXT.zoo.size, 700, zoo, UNSPOKEN);
    ctx.save();
    ctx.globalAlpha = zoo;
    drawFlag(ctx, x0 + w + 30, TEXT.zoo.y - 86, flagW, t * 4, boil);
    ctx.restore();
  }
  const bang = bangAt(t);
  if (bang.alpha > 0) {
    const crown = toScreen(cam, crownAt(pelicanAt(t).pose));
    const size = TEXT.bang.size * bang.scale;
    const y = Math.max(270 + size * 0.72, Math.min(1250, crown.y - 40));
    drawTextLine(ctx, '!', Math.max(120, Math.min(960, crown.x + 30)), y, size, 700, bang.alpha, SPOKEN);
  }
}

function drawMood(ctx: CanvasRenderingContext2D, t: number): void {
  const m = moodAt(t);
  const flash = flashAt(t);
  ctx.save();
  if (m.drain > 0.005) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = m.drain;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = m.drain * 0.5;
    ctx.fillStyle = '#b8c8e0';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  if (m.warm > 0.005) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = m.warm;
    ctx.fillStyle = '#ffc070';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(VIDEO.width / 2, VIDEO.height * 0.45, VIDEO.height * 0.35, VIDEO.width / 2, VIDEO.height * 0.45, VIDEO.height * 0.75);
  v.addColorStop(0, 'rgba(40,30,20,0)');
  v.addColorStop(1, 'rgba(40,30,20,0.22)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  if (flash > 0.005) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fffbea';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, t: number, cam: Cam, boil: number): void {
  const { pose, holds, jugs } = pelicanAt(t);
  const capys = capybarasAt(t);
  const cast = castAt(t);
  const capy = (c: CapybaraPose): void => drawCapybara(ctx, c, boil);
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, VIDEO.width / 2 - cam.cx * cam.zoom, VIDEO.height / 2 - cam.cy * cam.zoom);
  drawGround(ctx, cam.focus);
  drawRipples(ctx, (wrap(t) / LOOP_S) * 6 % 1);
  drawShade(ctx);
  const half = VIDEO.width / 2 / cam.zoom;
  drawTufts(ctx, cam.cx - half, cam.cx + half, boil);
  if (cast.mother) capy(capys.mother);
  if (cast.b && holds !== 'B') capy(capys.b);
  drawPelican(ctx, pose, boil, {
    inGape: holds ? () => capy(holds === 'A' ? capys.a : capys.b) : undefined,
    inPouch: jugs.some((j) => j > 0)
      ? (c) => {
        const h = pose.head;
        jugs.forEach((j, i) => {
          if (j <= 0) return;
          const pop = j < 1 ? j * (1 + 0.25 * Math.sin(Math.PI * j)) : 1;
          const x = 78 + i * 62;
          drawJug(c, x, pouchDepth(h, x) - 6 - (1 - j) * 60, 58 * pop, -(h.a + h.gape) + (i - 1) * 0.1, boil);
        });
      }
      : undefined,
  });
  if (holds !== 'A') capy(capys.a);
  ctx.restore();
}

export function createPelican(ctx: CanvasRenderingContext2D): Short {
  if (new URLSearchParams(location.search).has('kit')) return createPelicanKit(ctx);
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const cam = camAt(t);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawSky(ctx, VIDEO.width, VIDEO.height, (560 - cam.cy) * cam.zoom + VIDEO.height / 2);
    drawWorld(ctx, t, cam, boil);
    drawMood(ctx, t);
    drawLabels(ctx, t, cam, boil);
    drawCaption(ctx, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderPelicanAudio };
}
