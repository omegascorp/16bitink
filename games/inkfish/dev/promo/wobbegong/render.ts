import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderWobbegongAudio } from './audio';
import { clipOutsideMouth, drawPrey, drawPreyGlow, drawXray } from './bambooArt';
import {
  drawBar, drawClock, drawDivers, drawHeadArrow, drawName, drawPlace, drawRug, drawSize, drawSun, drawTape, INK_BG, PAPER_ON_INK, SPOKEN,
} from './overlays';
import { drawFront, makeFrontArt } from './front';
import { drawCaustics, drawReef, drawSchools, makeReef } from './reef';
import { captionAt, nameLabel, placeLabel, sizeLabel, tapeAt, TEXT, yearLabel } from './script';
import { type PreyPose, preyOutline, preySpine } from './shape';
import {
  applyCamera, arrowAt, barAt, boilAt, cameraAt, clockAt, diversAt, eyeAt, fillAt, frontToScreen, gapeAt, gradeAt, highlightAt, inAt, LOOP_S, minutesAt, morningAt, rippleAt, rugAt,
  rugDrawAt, shadowAt, shagAt, sighAt, sunAt, tailAt, topAt, toScreen, wrap, xrayAt, type Grade,
} from './story';
import { drawBulge, drawEyes, drawFringe, drawJaw, drawLip, drawRipple, drawSigh, drawWobbBody, drawWobbShadow, makeWobbArt } from './wobbArt';

/** Draws the "this shark swallowed a three-foot SHARK" short (story.ts has the choreography). */

const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const { y, size } = TEXT.caption;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, y, size * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

const rgba = (c: readonly [number, number, number], a: number): string => `rgba(${c.map((v) => Math.round(v)).join(',')},${a.toFixed(3)})`;

/** The mood's light over the whole frame: a tinted wash, a warm glow, a spot on the head, the dark closing in. */
function drawGrade(ctx: CanvasRenderingContext2D, g: Grade, spotAt: { x: number; y: number }, morning: number): void {
  const W = VIDEO.width;
  const H = VIDEO.height;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(g.tint, g.tintA);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createLinearGradient(0, 0, 0, H);
  glow.addColorStop(0, rgba(g.glow, g.glowA * 1.6));
  glow.addColorStop(0.6, rgba(g.glow, g.glowA * 0.5));
  glow.addColorStop(1, rgba(g.glow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  if (g.spot > 0.01) {
    const s = ctx.createRadialGradient(spotAt.x, spotAt.y, 40, spotAt.x, spotAt.y, 620);
    s.addColorStop(0, rgba([255, 240, 205], g.spot));
    s.addColorStop(1, rgba([255, 240, 205], 0));
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
  }
  if (morning > 0.005) {
    ctx.fillStyle = rgba([255, 246, 220], morning);
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(spotAt.x, spotAt.y, 330, (spotAt.x + W / 2) / 2, (spotAt.y + 840) / 2, 1250);
  v.addColorStop(0, 'rgba(2,6,12,0)');
  v.addColorStop(0.55, rgba([2, 6, 12], g.vignette * 0.45));
  v.addColorStop(1, rgba([2, 6, 12], g.vignette));
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function createWobbegong(ctx: CanvasRenderingContext2D): Short {
  const reef = makeReef();
  const wobb = makeWobbArt();
  const front = makeFrontArt();
  const other = makeCanvas(VIDEO.width, VIDEO.height);

  /** The overhead view: the reef, the two sharks from above, and what's drawn over them in the world. */
  const drawTop = (c: CanvasRenderingContext2D, t: number, boil: number, pose: PreyPose): void => {
    const cam = cameraAt(t);
    const grade = gradeAt(t);
    const spine = preySpine(pose);
    const shade = shadowAt(t);
    const shag = shagAt(t);
    c.save();
    c.fillStyle = '#0b1418';
    c.fillRect(0, 0, VIDEO.width, VIDEO.height);
    applyCamera(c, cam, t);
    drawReef(c, reef, cam.zoom, boil);
    drawSchools(c, t, boil);
    if (grade.dim > 0.005) {
      c.fillStyle = `rgba(6,24,36,${grade.dim.toFixed(3)})`;
      c.fillRect(-3000, -3000, 6000, 7000);
    }
    // Shadows on the reef: the wobbegong's, and the bamboo shark's (it's off the bottom a little).
    drawWobbShadow(c, wobb, shade, 0.42);
    c.save();
    c.globalAlpha = 0.28;
    c.fillStyle = '#0b0a08';
    const outline = preyOutline(spine, pose.inside);
    c.beginPath();
    outline.forEach((p, i) => (i ? c.lineTo(p.x + shade.x * 1.6, p.y + shade.y * 1.6) : c.moveTo(p.x + shade.x * 1.6, p.y + shade.y * 1.6)));
    c.closePath();
    c.fill();
    c.restore();

    drawWobbBody(c, wobb, boil);
    drawBulge(c, pose, boil);
    const ripple = rippleAt(t);
    drawRipple(c, ripple.at, ripple.strength);
    drawXray(c, spine, pose.inside, xrayAt(t), boil);
    drawJaw(c, gapeAt(t), t, shag, boil);
    c.save();
    clipOutsideMouth(c);
    drawPrey(c, spine, pose.inside, boil);
    c.restore();
    drawPreyGlow(c, spine, pose.inside, highlightAt(t), t);
    drawLip(c, boil);
    drawFringe(c, t, shag, boil);
    drawEyes(c, eyeAt(t), boil);
    drawSigh(c, sighAt(t), boil);
    drawTape(c, spine, tapeAt(t));
    drawHeadArrow(c, pose.inside, arrowAt(t), t);
    drawRug(c, rugDrawAt(t), rugAt(t), t);
    drawCaustics(c, reef, t, grade.caustics);
    c.restore();
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const grade = gradeAt(t);
    const tail = tailAt(t);
    const pose: PreyPose = { inside: inAt(t), bend: tail.bend, flip: tail.flip, wave: tail.wave };
    const top = topAt(t);

    // The low front view for the hook, the overhead one for the story, crossfading as the camera rises and comes back down.
    if (top < 1) drawFront(ctx, front, t, pose, gapeAt(t), eyeAt(t), shagAt(t), boil);
    if (top >= 1) drawTop(ctx, t, boil, pose);
    else if (top > 0) {
      drawTop(other.ctx, t, boil, pose);
      ctx.save();
      ctx.globalAlpha = top;
      ctx.drawImage(other.canvas, 0, 0);
      ctx.restore();
    }

    drawDivers(ctx, diversAt(t), t, boil);
    const focus = top > 0.5 ? toScreen(cam, { x: 100, y: -60 }) : frontToScreen(t, { x: 600, y: 860 });
    drawGrade(ctx, grade, { x: Math.min(880, Math.max(200, focus.x)), y: Math.min(1100, Math.max(500, focus.y)) }, morningAt(t));
    const sun = sunAt(t);
    drawSun(ctx, sun.arc, sun.shown, t);

    drawPlace(ctx, placeLabel(t), yearLabel(t));
    drawName(ctx, nameLabel(t), toScreen(cam, { x: -220, y: 140 }));
    drawSize(ctx, sizeLabel(t));
    drawClock(ctx, clockAt(t), minutesAt(t), boil);
    drawBar(ctx, barAt(t), fillAt(t), t, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderWobbegongAudio };
}
