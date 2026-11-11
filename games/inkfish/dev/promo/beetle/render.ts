import { PAPER, type Pt } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { drawBeetle, type BeetlePose } from './art/beetle';
import { drawFrog, POND_FROG, VENT } from './art/frog';
import { FOUR_KINDS } from './art/kinds';
import { drawDark, drawGullet, drawIris, drawKeyLight, drawPond, drawPop, drawRimGlow, drawStopwatch, drawXrayBack, drawXrayFrog, gutPoint } from './art/scenery';
import { renderBeetleAudio } from './audio';
import { createBeetleKit } from './kit';
import { captionAt, TEXT, WATCH_TEXT_Y } from './script';
import {
  AT, boilAt, type Cam, FOUR_SLOTS, fourBeetleAt, fourBlinkAt, fourFrogAt, glimmerAt, gulletBeetleAt, gutAt, hookBeetleAt, hookCamAt, hookFrogAt,
  huhAt, kickAt, kickBeetleAt, lightAt, LOOP_S, oddsBeetleAt, outBeetleAt, ratioAt, sceneAt, shakeAt, slideAt, stomachAt, stomachLabelAt, throatLabelAt,
  watchAt, watchMinutesAt, wholeAt, wrap, xCamAt, xFrogAt, xrayAt,
} from './story';

/** Draws the "this beetle got swallowed alive… and walked out" short (story.ts has the choreography). */

const W = VIDEO.width;
const H = VIDEO.height;
const BOIL_FRAMES = 3;
const DARK_HALO = '#0b0d08';
const CAPTION_INK: TextInk = { fill: PAPER, halo: DARK_HALO };
const SPOKEN: TextInk = { fill: '#f5c84a', halo: DARK_HALO };
const CAPTION_MAX_W = 980;

/** The spoken phrase, the word being said in yellow. */
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
  let x = W / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, size * k, 700, 1, i === now.word ? SPOKEN : CAPTION_INK);
    x += (natural[i]! + space) * k;
  });
}

const toScreen = (cam: Cam, p: Pt): Pt => ({ x: (p.x - cam.cx) * cam.zoom + W / 2, y: (p.y - cam.cy) * cam.zoom + H / 2 });

function inWorld(ctx: CanvasRenderingContext2D, cam: Cam, shake: Pt, paint: () => void): void {
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, W / 2 - cam.cx * cam.zoom + shake.x, H / 2 - cam.cy * cam.zoom + shake.y);
  paint();
  ctx.restore();
}

// ---------------------------------------------------------------- the scenes

function drawHook(ctx: CanvasRenderingContext2D, s: number, t: number, boil: number): void {
  const cam = hookCamAt(s);
  const shake = shakeAt(t);
  drawPond(ctx, toScreen(cam, { x: 0, y: 0 }).y + shake.y, cam.cx * cam.zoom * 0.3);
  const frog = hookFrogAt(s);
  const beetle = hookBeetleAt(s, wrap(t));
  inWorld(ctx, cam, shake, () => drawFrog(ctx, POND_FROG, frog, boil, beetle ? () => drawBeetle(ctx, beetle, boil) : undefined));
  drawKeyLight(ctx);
}

function drawInside(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shake = shakeAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawGullet(ctx, slideAt(t), stomachAt(t), lightAt(t));
  drawBeetle(ctx, gulletBeetleAt(t), boil);
  drawIris(ctx, lightAt(t));
  ctx.restore();
  const label = (text: string, a: number): void => drawTextLine(ctx, text, W / 2, TEXT.label.y, TEXT.label.size, 700, a, { fill: '#f6d6c4', halo: '#1a0406' });
  label('throat', throatLabelAt(t));
  label('stomach', stomachLabelAt(t));
}

function drawKick(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shake = shakeAt(t);
  const b = kickBeetleAt(t);
  const glim = glimmerAt(t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  drawDark(ctx, kickAt(t), glim);
  drawRimGlow(ctx, b, 300, glim);
  drawBeetle(ctx, b, boil);
  // Still dim in here: only the shine on its shell and the kicks read.
  ctx.fillStyle = `rgba(3,1,2,${0.3 + 0.5 * (1 - glim)})`;
  ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.restore();
}

function drawBackDoor(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const cam = xCamAt(t);
  const mix = xrayAt(t);
  if (mix < 0.999) {
    drawPond(ctx, toScreen(cam, { x: 0, y: 0 }).y, cam.cx * cam.zoom * 0.3);
    const out = outBeetleAt(t);
    inWorld(ctx, cam, { x: 0, y: 0 }, () => {
      if (out) drawBeetle(ctx, out, boil);
      drawFrog(ctx, POND_FROG, xFrogAt(t), boil);
      drawPop(ctx, { x: VENT.x - 6, y: VENT.y }, (wrap(t) - AT.back) / 0.5);
    });
    drawKeyLight(ctx);
  }
  if (mix > 0.001) {
    ctx.save();
    ctx.globalAlpha = mix;
    drawXrayBack(ctx, wrap(t));
    inWorld(ctx, cam, { x: 0, y: 0 }, () => {
      const u = gutAt(t);
      drawXrayFrog(ctx, u, wholeAt(t), boil);
      const at = gutPoint(u);
      const step = u * 140;
      const b: BeetlePose = { x: at.p.x, y: at.p.y, k: 1.25, a: at.a, step, flail: 0, kick: 0, tilt: 1, dim: 0, glow: 1, wiggle: 0, t: wrap(t) };
      drawBeetle(ctx, b, boil);
    });
    ctx.restore();
  }
  // The flash back to colour.
  const flash = Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - mix)));
  if (mix > 0 && mix < 1) {
    ctx.fillStyle = `rgba(255,250,230,${0.5 * flash})`;
    ctx.fillRect(0, 0, W, H);
  }
  const huh = huhAt(t);
  if (huh.alpha > 0) {
    const head = toScreen(cam, { x: 96, y: -196 });
    const size = TEXT.huh.size * huh.scale;
    drawTextLine(ctx, '?', head.x, Math.min(1250, Math.max(270 + size * 0.75, head.y)), size, 700, huh.alpha, SPOKEN);
  }
}

function drawOdds(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawPond(ctx, 1500, 0, 0.55);
  for (let i = 0; i < 10; i++) {
    const b = oddsBeetleAt(i, t);
    if (!b) continue;
    drawBeetle(ctx, b, boil);
  }
  drawTextLine(ctx, '9 / 10', W / 2, TEXT.ratio.y, TEXT.ratio.size, 700, ratioAt(t), SPOKEN);
  const watch = watchAt(t);
  if (watch > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, watch * 1.5);
    const pop = 0.6 + 0.4 * watch + 0.08 * Math.sin(Math.PI * watch);
    ctx.translate(W / 2, TEXT.watch.y);
    ctx.scale(pop, pop);
    drawStopwatch(ctx, 0, 0, TEXT.watch.r, watchMinutesAt(t), boil);
    ctx.restore();
    drawTextLine(ctx, '6 min', W / 2, WATCH_TEXT_Y, TEXT.watch.size, 700, watch, { fill: '#1b1a1f', halo: '#fffdf4' });
  }
}

function drawFour(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  drawPond(ctx, 1110, 0, 0.3);
  const blink = fourBlinkAt(t);
  const beetle = fourBeetleAt(t);
  FOUR_SLOTS.forEach((slot, i) => {
    const pop = fourFrogAt(i, t);
    if (pop <= 0) return;
    const k = slot.k * (0.7 + 0.3 * pop + 0.06 * Math.sin(Math.PI * pop));
    ctx.save();
    ctx.globalAlpha = Math.min(1, pop * 2);
    // A patch of moss under each.
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.scale(1, 0.22);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 260);
    g.addColorStop(0, 'rgba(70,96,40,0.9)');
    g.addColorStop(1, 'rgba(30,44,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-260, -260, 520, 520);
    ctx.restore();
    if (beetle) {
      ctx.save();
      ctx.translate(slot.x, slot.y);
      ctx.scale(k, k);
      drawBeetle(ctx, beetle, boil);
      ctx.restore();
    }
    drawFrog(ctx, FOUR_KINDS[i]!, { x: slot.x, y: slot.y, k, face: 1, gape: 0, tongue: null, press: 0, look: beetle ? -0.6 : 0.2, blink, gulp: 0 }, boil);
    ctx.restore();
  });
}

export function createBeetle(ctx: CanvasRenderingContext2D): Short {
  if (new URLSearchParams(location.search).has('kit')) return createBeetleKit(ctx);
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const scene = sceneAt(t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (scene.name === 'hook') drawHook(ctx, scene.s, t, boil);
    else if (scene.name === 'gullet') drawInside(ctx, t, boil);
    else if (scene.name === 'kick') drawKick(ctx, t, boil);
    else if (scene.name === 'xray') drawBackDoor(ctx, t, boil);
    else if (scene.name === 'odds') drawOdds(ctx, t, boil);
    else drawFour(ctx, t, boil);
    drawCaption(ctx, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderBeetleAudio };
}
