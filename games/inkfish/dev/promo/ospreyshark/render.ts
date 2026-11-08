import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { lerp, ramp, VIDEO, type Short } from '../short';
import { drawOspreyBack, drawOspreyFeet, drawOspreyFront } from './art/osprey';
import { drawBeach, drawCloseClouds, drawHeightLine, drawRing, drawSky, drawStamp, drawSweat, drawViewfinder, inPrint } from './art/scenery';
import { drawSharkWithFish } from './art/shark';
import { renderOspreySharkAudio } from './audio';
import { createOspreySharkKit } from './kit';
import { gripFor, RIG_MID, SPOTS } from './rig';
import { captionAt, LABEL_X, TEXT } from './script';
import {
  AT, bangAt, boilAt, ospreyTagAt, type Cam, camAt, fishAt, fishRingAt, flashAt, floridaAt, heightAt, LOOP_S, moodAt, ospreyAt, PHOTO_CAM, photoAt, sharkAt,
  shotAt, sweatAt, tailRingAt, toScreen, viewfinderAt, WIDE_BIRD, WIDE_Z, wrap,
} from './story';

/** Draws the "this bird caught a shark that caught a fish" short (story.ts has the choreography). */

/** Captions: paper ink in a dark outline, readable on sky, sea or sand; the word being said in red. */
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

/** The beach's wide px to the screen, for a camera. */
function beachTransform(ctx: CanvasRenderingContext2D, cam: Cam): void {
  const at = toScreen(cam, RIG_MID);
  const k = cam.z / WIDE_Z;
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.translate(-WIDE_BIRD.x, -WIDE_BIRD.y);
}

/** Everything seen through the camera: sky, beach (when it is in view), clouds, and the three animals. */
function drawScene(ctx: CanvasRenderingContext2D, t: number, cam: Cam, boil: number): void {
  const zw = cam.z / WIDE_Z;
  const beach = 1 - ramp(zw, 2.2, 3.4);
  drawSky(ctx, 1 - beach);
  if (beach > 0.01) {
    ctx.save();
    beachTransform(ctx, cam);
    ctx.globalAlpha = beach;
    drawBeach(ctx, (wrap(t) / LOOP_S) * 11 % 1, boil);
    ctx.restore();
  }
  drawCloseClouds(ctx, cam.f.x * cam.z * 0.35, 1 - beach);
  const osprey = ospreyAt(t);
  const shark = sharkAt(t);
  const fish = fishAt(t);
  const grip = gripFor(osprey, shark);
  ctx.save();
  ctx.translate(cam.a.x, cam.a.y);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.f.x, -cam.f.y);
  drawOspreyBack(ctx, osprey, boil);
  drawSharkWithFish(ctx, shark, t, fish, fish.swing, boil);
  drawOspreyFeet(ctx, osprey, grip, boil);
  drawOspreyFront(ctx, osprey, grip, boil);
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, t: number, cam: Cam, boil: number): void {
  const mid = VIDEO.width / 2;
  drawTextLine(ctx, 'Florida', mid, TEXT.florida.y, TEXT.florida.size, 700, floridaAt(t), UNSPOKEN);
  const tag = ospreyTagAt(t);
  if (tag > 0) {
    const bird = toScreen(cam, RIG_MID);
    drawTextLine(ctx, 'osprey', Math.min(860, bird.x - 200), TEXT.osprey.y, TEXT.osprey.size, 700, tag, UNSPOKEN);
  }
  const h = heightAt(t);
  if (h > 0) {
    const bird = toScreen(cam, { x: RIG_MID.x, y: RIG_MID.y + 420 });
    ctx.save();
    beachTransform(ctx, cam);
    const m = ctx.getTransform();
    ctx.restore();
    const sand = m.transformPoint(new DOMPoint(WIDE_BIRD.x, 1590));
    const reach = ramp(h, 0, 1);
    drawHeightLine(ctx, bird, { x: bird.x, y: lerp(bird.y, sand.y, reach) }, h);
    drawTextLine(ctx, '400 ft', LABEL_X, TEXT.feet.y, TEXT.feet.size, 700, h, UNSPOKEN);
    drawTextLine(ctx, '120 m', LABEL_X, TEXT.metres.y, TEXT.metres.size, 700, h * 0.9, UNSPOKEN);
  }
  const tail = tailRingAt(t);
  if (tail > 0) {
    const c = toScreen(cam, SPOTS.tail);
    drawRing(ctx, c, 120 * cam.z, 110 * cam.z, tail, boil);
    const bang = bangAt(t);
    if (bang.alpha > 0) {
      const size = TEXT.bang.size * bang.scale;
      const y = Math.max(270 + size * 0.72, Math.min(1250, c.y + 30 * cam.z));
      drawTextLine(ctx, '!', Math.max(110, c.x - 175 * cam.z), y, size, 700, bang.alpha, SPOKEN);
    }
  }
  const fishRing = fishRingAt(t);
  if (fishRing > 0) drawRing(ctx, toScreen(cam, SPOTS.fishMid), 118 * cam.z, 92 * cam.z, fishRing, boil);
  const sweat = sweatAt(t);
  if (sweat > 0) drawSweat(ctx, toScreen(cam, SPOTS.fishBrow), 13 * cam.z, sweat);
}

function drawMood(ctx: CanvasRenderingContext2D, t: number): void {
  const m = moodAt(t);
  const flash = flashAt(t);
  const [W, H] = [VIDEO.width, VIDEO.height];
  ctx.save();
  if (m.drain > 0.005) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = m.drain;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = m.drain * 0.5;
    ctx.fillStyle = '#b8c8e0';
    ctx.fillRect(0, 0, W, H);
  }
  if (m.warm > 0.005) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = m.warm;
    ctx.fillStyle = '#ffc070';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.3, W / 2, H * 0.42, H * 0.72);
  v.addColorStop(0, 'rgba(20,24,40,0)');
  v.addColorStop(1, `rgba(20,24,40,${0.18 + 0.4 * m.vignette})`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  if (flash > 0.005) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#fffbea';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

export function createOspreyShark(ctx: CanvasRenderingContext2D): Short {
  if (new URLSearchParams(location.search).has('kit')) return createOspreySharkKit(ctx);
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const cam = camAt(t);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (shotAt(t).name === 'photo') {
      // The print over the sky, a little dimmed; the stamp on top.
      drawSky(ctx, 1);
      drawCloseClouds(ctx, 300, 1);
      ctx.fillStyle = 'rgba(16,24,40,0.45)';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      const p = photoAt(t);
      inPrint(ctx, p.snap, () => drawScene(ctx, t, PHOTO_CAM, boil));
      drawStamp(ctx, CAPTION_FONT, p.stamp, boil);
    } else {
      drawScene(ctx, t, cam, boil);
      drawViewfinder(ctx, viewfinderAt(t), cam.a, wrap(t) > AT.in ? 1 : 0, 210);
      drawLabels(ctx, t, cam, boil);
    }
    drawMood(ctx, t);
    drawCaption(ctx, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderOspreySharkAudio };
}
