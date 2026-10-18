import { halo } from '../../../src/art/glowArt';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderDragonAudio } from './audio';
import { drawFloatSprite, drawTentacle, makeFloatFrames } from './manowar';
import { CHALK, drawDim, drawRed, drawSea, drawSpecks, drawSurface, drawVignette, INK_BG, PAPER_ON_INK, SPOKEN } from './scenery';
import { captionAt } from './script';
import { BUNCHES, fanOf } from './shape';
import { CAPSULE_LEN, drawBellyBubble, drawCapsule, drawEyes, drawMouth, drawSlugBody, drawTipGlow, GLOW, makeSlugSprites, type SlugSprites } from './slug';
import {
  boilAt, bubbleAt, type Camera, cameraAt, dangerAt, dragonLabelAt, eyesAt, fanPoseAt, floatAt, gripAt, insideAt, jawAt, labelTurnAt, litAt, LOOP_S, onSlug, OTHERS,
  otherTentacleAt, pluckedAt, type Pt, redFlashAt, reelAt, shakeAt, type Slug, SLUG_K, slugAt, sparksAt, tentacleAt, thumbAt, tipAt, toScreen, xrayAt,
} from './story';
import { drawThumb, makeThumb } from './thumb';

/** Draws the "this tiny slug eats the man o' war" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px Caveat`;
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

/** Runs `draw` in the slug's frame: slug px, origin at its middle. */
function inSlugFrame(ctx: CanvasRenderingContext2D, s: Slug, cam: Camera, draw: () => void): void {
  const at = toScreen(cam, s);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(s.tilt);
  ctx.scale(SLUG_K * cam.zoom * s.sx, SLUG_K * cam.zoom * s.sy);
  draw();
  ctx.restore();
}

function drawSlug(ctx: CanvasRenderingContext2D, sprites: SlugSprites, s: Slug, cam: Camera, t: number, boil: number): void {
  const xray = xrayAt(t);
  const bubble = bubbleAt(t);
  inSlugFrame(ctx, s, cam, () => {
    drawSlugBody(ctx, sprites, { boil, fanPose: (i) => fanPoseAt(t, i), xray, jaw: jawAt(t), eyes: eyesAt(t) });
    if (bubble?.inside) drawBellyBubble(ctx, bubble);
    for (const c of insideAt(t)) {
      // Seen through the body only while it is see-through; lit ones glow through anyway.
      drawCapsule(ctx, { ...c, alpha: c.alpha * Math.max(xray, c.glow) }, CAPSULE_LEN, t * 2 + c.x);
    }
    drawEyes(ctx, eyesAt(t));
    drawMouth(ctx, jawAt(t));
  });
}

/** The lit fingertips, the capsules on their way to them, and the danger beat's sparks. */
function drawGlows(ctx: CanvasRenderingContext2D, s: Slug, cam: Camera, t: number): void {
  const hot = dangerAt(t);
  const tips: Pt[] = [];
  for (let i = 0; i < BUNCHES; i++) {
    for (let j = 0; j < fanOf(i).fingers; j++) {
      const k = litAt(t, i, j);
      if (k <= 0) continue;
      const at = toScreen(cam, tipAt(t, i, j));
      tips.push(at);
      const flicker = 0.85 + 0.15 * Math.sin(t * 13 + i * 3 + j * 1.7);
      drawTipGlow(ctx, at, k * flicker, 20 * cam.zoom, hot);
    }
  }
  for (const c of insideAt(t)) {
    if (c.glow <= 0) continue;
    const at = toScreen(cam, onSlug(s, c));
    halo(ctx, at.x, at.y, 46 * cam.zoom, GLOW, 0.8 * c.glow * c.alpha);
  }
  const spark = sparksAt(t);
  if (spark !== null && tips.length > 4) drawSparks(ctx, tips, spark, t);
}

/** Jagged electric arcs jumping from fingertip to fingertip. */
function drawSparks(ctx: CanvasRenderingContext2D, tips: readonly Pt[], u: number, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const step = Math.floor(t * 20);
  const arcs = 7;
  for (let k = 0; k < arcs; k++) {
    const a = tips[(k * 7 + step * 3) % tips.length]!;
    const b = tips[(k * 7 + step * 3 + 5 + k) % tips.length]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < 20 || d > 420) continue;
    ctx.globalAlpha = (1 - u) * 0.9;
    for (const [w, colour] of [[7, 'rgba(127,233,255,0.5)'], [2.5, '#f4feff']] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        const off = 22 * Math.sin(step * 1.7 + k * 3.1 + i * 2.3);
        ctx.lineTo(a.x + (b.x - a.x) * f - ((b.y - a.y) / d) * off, a.y + (b.y - a.y) * f + ((b.x - a.x) / d) * off);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** "blue dragon" under the slug, turning upside down on "upside down". */
function drawDragonLabel(ctx: CanvasRenderingContext2D, s: Slug, cam: Camera, t: number): void {
  const alpha = dragonLabelAt(t);
  if (alpha <= 0) return;
  const at = toScreen(cam, s);
  const y = Math.min(1080, at.y + 230 * cam.zoom + 40);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(at.x, y - 70);
  ctx.lineTo(at.x, at.y + 140 * cam.zoom);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(at.x, y - 28);
  ctx.rotate(labelTurnAt(t));
  drawTextLine(ctx, 'blue dragon', 0, 28, 92, 700, alpha, PAPER_ON_INK);
  ctx.restore();
}

export function createDragon(ctx: CanvasRenderingContext2D): Short {
  const slug = makeSlugSprites();
  const float = makeFloatFrames();
  const thumb = makeThumb();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const jolt = shakeAt(t);
    const cam0 = cameraAt(t);
    const cam: Camera = { ...cam0, x: cam0.x - jolt.x / cam0.zoom, y: cam0.y - jolt.y / cam0.zoom };
    const s = slugAt(t);

    drawSea(ctx, cam, t);
    drawSpecks(ctx, cam, t);
    OTHERS.forEach((o, k) => drawTentacle(ctx, cam, otherTentacleAt(t, k), { width: 5.5 * o.w, alpha: 0.3 + 0.25 * o.w, bead: 0.6 }, boil));
    drawFloatSprite(ctx, float, floatAt(t), cam, boil);
    drawSurface(ctx, cam, t);

    // The bitten tentacle: its lower part reeled into the jaws while it eats.
    const ten = tentacleAt(t);
    const held = gripAt(t);
    drawTentacle(ctx, cam, ten.upper, { width: 10, alpha: 1, bead: 0.7 }, boil);
    drawTentacle(ctx, cam, ten.lower, { width: 10, alpha: 1, bead: 0.7, reel: reelAt(t), swallow: 30 * held }, boil);

    drawDim(ctx, 0.5 * xrayAt(t));
    drawSlug(ctx, slug, s, cam, t, boil);

    // Stingers flying off the tentacle into the mouth, and the gulp of air on its way in.
    for (const c of pluckedAt(t)) drawCapsule(ctx, { ...c, ...toScreen(cam, c) }, 1.3 * CAPSULE_LEN * SLUG_K * cam.zoom, t * 3);
    const b = bubbleAt(t);
    if (b && !b.inside) drawBellyBubble(ctx, { ...b, ...toScreen(cam, b), r: b.r * cam.zoom });
    drawGlows(ctx, s, cam, t);

    const th = thumbAt(t);
    if (th) drawThumb(ctx, thumb, th, cam, boil);

    drawVignette(ctx, t);
    drawRed(ctx, dangerAt(t), redFlashAt(t));
    drawDragonLabel(ctx, s, cam, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderDragonAudio };
}
