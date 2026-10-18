import { makeCanvas, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { budTip, drawAxolotl, type AxoLook } from './axolotl';
import { drawBlocky, drawBlockyPoof } from './blocky';
import { bedAt, drawShadow, makeCanal } from './canal';
import { drawHearts, drawPulse, drawSkyClock, drawSparkles, drawVignette, gradeAll, gradeBackdrop } from './props';
import { drawTwinkle } from './ink';
import { grownLeg, NEAR_FRONT, toeTip } from './legs';
import { drawHmph, drawPuppy } from './puppy';
import { renderAxolotlAudio } from './audio';
import { captionAt } from './script';
import {
  AXO_K, type Axolotl, axolotlAt, beatAt, BLOCKY_LEN, blockyAt, boatDriftAt, boilAt, bonesAt, brainAt, budGlowAt, type Camera, cameraAt, cityAt, CUTER_AT,
  ghostLegAt, gradeAt, PULSE_S, toeAt, heartAt, heartsAt, hmphAt, legGrowAt, legXrayAt, LOOP_S, musclesAt, nightAt, puppyAt, skyClockAt, sparkleAt, toesAt, toScreen, xrayAt,
} from './story';
import { drawAboveWater } from './xochimilco';

/** Draws the "this animal can grow back its own legs" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
const HALO = '#0b1a12';
const PAPER_ON_CANAL: TextInk = { fill: '#f4eddc', halo: HALO };
/** World px per puppy unit (its bubble is 62 units across the radius). */
const PUPPY_K = 4;

/** The spoken line, word by word, the word being said in yellow. */
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
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: HALO } : PAPER_ON_CANAL;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

function lookAt(t: number, a: Axolotl): AxoLook {
  return {
    smile: a.smile,
    squint: a.squint,
    droop: a.droop,
    smug: a.smug,
    wave: a.wave,
    wiggle: a.wiggle,
    gills: a.gills,
    leg: { grow: legGrowAt(t), toes: toesAt(t), glow: budGlowAt(t), ghost: ghostLegAt(t) },
    insides: { xray: xrayAt(t), legXray: legXrayAt(t), bones: bonesAt(t), muscles: musclesAt(t), heart: heartAt(t), brain: brainAt(t), beat: beatAt(t) },
  };
}

/** A point in the axolotl's own units, on screen. */
function axoToScreen(cam: Camera, a: Axolotl, p: Pt): Pt {
  const at = toScreen(cam, a);
  const k = AXO_K * cam.zoom * a.scale;
  const c = Math.cos(a.tilt);
  const s = Math.sin(a.tilt);
  return { x: at.x + (p.x * c - p.y * s) * k, y: at.y + (p.x * s + p.y * c) * k };
}

export function createAxolotl(ctx: CanvasRenderingContext2D): Short {
  const canal = makeCanal();
  // The fading axolotl is drawn whole on its own layer, then laid down see-through, so its legs don't show through its body.
  const layer = makeCanvas(VIDEO.width, VIDEO.height);

  const drawTheAxolotl = (target: CanvasRenderingContext2D, cam: Camera, a: Axolotl, look: AxoLook, boil: number): void => {
    const at = toScreen(cam, a);
    const px = AXO_K * cam.zoom * a.scale;
    target.save();
    target.translate(at.x, at.y);
    target.rotate(a.tilt);
    target.scale(px, px);
    drawAxolotl(target, look, px, boil);
    target.restore();
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const grade = gradeAt(t);

    canal.drawWater(ctx, cam, t);
    drawAboveWater(ctx, cam, boil, cityAt(t), boatDriftAt(t));
    canal.drawWeeds(ctx, cam, boil, t, 0);
    canal.drawBed(ctx, cam, boil);
    gradeBackdrop(ctx, grade);

    const a = axolotlAt(t);
    const look = lookAt(t, a);
    if (a.alpha > 0.005 && a.scale > 0.01) {
      drawShadow(ctx, toScreen(cam, { x: a.x - 20, y: bedAt(a.x) + 6 }), 520 * cam.zoom * a.scale, a.alpha);
      if (a.alpha > 0.995) drawTheAxolotl(ctx, cam, a, look, boil);
      else {
        layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
        drawTheAxolotl(layer.ctx, cam, a, look, boil);
        ctx.save();
        ctx.globalAlpha = a.alpha;
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }
    }

    const b = blockyAt(t);
    if (b) {
      const at = toScreen(cam, { x: b.x, y: b.y + b.hop });
      const px = (BLOCKY_LEN / 100) * cam.zoom;
      const shrink = b.scale * (1 - b.poof);
      ctx.save();
      ctx.translate(at.x, at.y);
      if (shrink > 0.02) {
        ctx.save();
        ctx.rotate(b.tilt);
        ctx.scale(px * shrink, px * shrink);
        drawBlocky(ctx, px * shrink, boil);
        ctx.restore();
      }
      ctx.scale(px, px);
      drawBlockyPoof(ctx, b.poof, px, boil);
      ctx.restore();
    }

    canal.drawWeeds(ctx, cam, boil, t, 1);

    const p = puppyAt(t);
    if (p) {
      const at = toScreen(cam, p);
      const px = PUPPY_K * cam.zoom * p.scale;
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(p.tilt);
      ctx.scale(px, px);
      drawPuppy(ctx, p.huff, px, boil);
      drawHmph(ctx, hmphAt(t), px, boil);
      ctx.restore();
    }

    if (a.alpha > 0.005) {
      const tip = axoToScreen(cam, a, budTip(look.leg.grow));
      drawSparkles(ctx, tip, 70 * cam.zoom * a.scale, sparkleAt(t) * a.alpha, t);
      drawPulse(ctx, tip, 120 * cam.zoom * a.scale, (t / PULSE_S) % 1, 0.7 * sparkleAt(t) * a.alpha);
      // A twinkle on each toe as it pops out.
      look.leg.toes.forEach((s, i) => {
        const d = t - toeAt(i);
        if (d > 0 && d < 0.5 && s > 0) drawTwinkle(ctx, axoToScreen(cam, a, toeTip(grownLeg(NEAR_FRONT, look.leg.grow), i, s)), 34, 1 - d / 0.5, '#fff1b0', d * 3);
      });
      drawHearts(ctx, axoToScreen(cam, a, { x: 95, y: -60 }), heartsAt(t), t - CUTER_AT, boil);
    }

    gradeAll(ctx, grade, nightAt(t));
    drawVignette(ctx);
    const clock = skyClockAt(t);
    drawSkyClock(ctx, clock.angle, clock.alpha, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderAxolotlAudio };
}
