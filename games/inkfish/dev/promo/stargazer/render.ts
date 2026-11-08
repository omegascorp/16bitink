import { BOIL_FRAMES } from '../../../src/art/textures';
import { pathOf } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawChomp } from '../goliath/effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderStargazerAudio } from './audio';
import { belowUpperLip, drawChin, drawFaceBack, FACE, type FaceLook, spineTip } from './face';
import { drawArcs, drawArrow, drawCard, drawGlints, drawHand, drawRings, drawStamp, drawStars, drawVolts } from './overlays';
import { drawFarSand, drawFlash, drawGrade, drawSand, drawSpecks, drawSpray, drawWater, INK_BG, PAPER_ON_INK, SPOKEN } from './scenery';
import {
  arrowAt, arrowDrawn, captionAt, cardAt, glintAt, handAt, ringsAt, ringsDrawn, shockAt, spinesAt, stampAt, stampScale, starsAt, TEXT, voltsAt, zapAt,
} from './script';
import {
  boilAt, type Camera, cameraAt, dustAt, flashAt, gapeAt, headAt, lidsAt, lookAt, LOOP_S, preyAt, type Prey, type Pt, riseAt, shakeAt, SNAP_T,
  STRIKE_SNAP, STRIKE_T, toScreen, wrap,
} from './story';

/** Draws the "this fish eats anything that swims over it" short (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;

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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** Runs `draw` in the head's frame (head px, the face's middle at the origin). */
function inHead(ctx: CanvasRenderingContext2D, cam: Camera, head: Pt, draw: () => void): void {
  const at = toScreen(cam, head);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(cam.zoom, cam.zoom);
  draw();
  ctx.restore();
}

function drawPrey(ctx: CanvasRenderingContext2D, sprite: Sprite, p: Prey, cam: Camera, boil: number, alpha: number): void {
  const at = toScreen(cam, p);
  drawSwimmer(ctx, sprite, {
    j: 0, age: 0, shape: 'sardine', x: at.x, y: at.y, length: p.length * cam.zoom, facing: p.facing, tilt: p.tilt, beat: p.beat, effort: p.effort,
  }, boil, { alpha: alpha * (1 - 0.55 * p.deep), eyes: p.deep > 0.3 ? 'squeeze' : null });
}

/** The snap's chalk burst, 0 .. 1 over its life (or < 0 when off). */
function chompAt(t: number): number {
  const u = wrap(t);
  for (const at of [SNAP_T, STRIKE_SNAP]) if (u >= at && u < at + 0.35) return (u - at) / 0.35;
  return -1;
}

export function createStargazer(ctx: CanvasRenderingContext2D): Short {
  const sardine = makeSprite('sardine', 4);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const base = cameraAt(t);
    const shake = shakeAt(t);
    const cam: Camera = { x: base.x - shake.x / base.zoom, y: base.y - shake.y / base.zoom, zoom: base.zoom };
    const head = headAt(t);
    const rise = riseAt(t);
    const look: FaceLook = { gape: gapeAt(t), look: lookAt(t), lids: lidsAt(t), dust: dustAt(t), spines: spinesAt(t), boil };
    const toHead = (p: Pt): Pt => toScreen(cam, { x: head.x + p.x, y: head.y + p.y });
    const prey = preyAt(t);

    drawWater(ctx, cam, t);
    drawSpecks(ctx, t);
    drawFarSand(ctx, cam, t);

    // The stargazer, with anything in its mouth between its back and its chin.
    inHead(ctx, cam, head, () => drawFaceBack(ctx, look));
    for (const p of prey.filter((q) => q.mouth > 0)) {
      ctx.save();
      // The clip is drawn in the head's frame, then the transform goes back for the fish.
      const before = ctx.getTransform();
      const at = toScreen(cam, head);
      ctx.translate(at.x, at.y);
      ctx.scale(cam.zoom, cam.zoom);
      pathOf(ctx, belowUpperLip(look.gape));
      ctx.clip();
      ctx.setTransform(before);
      drawPrey(ctx, sardine, p, cam, boil, 1);
      ctx.restore();
    }
    inHead(ctx, cam, head, () => drawChin(ctx, look));

    drawSand(ctx, cam, t, rise);
    drawSpray(ctx, cam, t);
    for (const p of prey.filter((q) => q.mouth < 1)) drawPrey(ctx, sardine, p, cam, boil, 1 - p.mouth);

    // The snap.
    drawChomp(ctx, toHead({ x: 0, y: FACE.lipMid - 10 }), -Math.PI / 2, 1100 * cam.zoom, chompAt(t));

    // The chalk and the jokes.
    drawStars(ctx, toHead({ x: 0, y: FACE.crown }), cam.zoom, starsAt(t), t);
    const eyes = [toHead({ x: -FACE.eyeX, y: FACE.eyeY }), toHead({ x: FACE.eyeX, y: FACE.eyeY })];
    drawRings(ctx, eyes, FACE.eyeR * 1.7 * cam.zoom, ringsDrawn(t), ringsAt(t));
    drawArrow(ctx, toHead({ x: 0, y: FACE.lipMid + 30 }), cam.zoom, arrowDrawn(t), arrowAt(t));
    const reach = handAt(t);
    const shock = shockAt(t);
    const jitter = shock > 0 ? 9 * Math.sin(t * 90) : 0;
    const finger = toHead({ x: 265 + (1 - reach) * 900 + jitter, y: -290 + (1 - reach) * 200 + jitter * 0.6 });
    drawArcs(ctx, toHead, cam.zoom, zapAt(t), t, reach > 0.7 ? finger : null);
    if (reach > -0.05 && finger.x < VIDEO.width + 40) drawHand(ctx, finger, 130 * cam.zoom, boil, shock);
    drawGlints(ctx, [toHead(spineTip(1, look.spines)), toHead(spineTip(-1, look.spines))], 70 * cam.zoom, glintAt(t), t);

    drawGrade(ctx, cam, t);
    drawFlash(ctx, flashAt(t));
    drawVolts(ctx, voltsAt(t), t);
    drawCard(ctx, cardAt(t), boil, t);
    drawStamp(ctx, stampAt(t), stampScale(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderStargazerAudio };
}
