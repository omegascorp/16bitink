import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderSeastarAudio } from './audio';
import { drawBubbles, drawPaper, drawRewind, drawSlurp, drawSparkle, drawStrain } from './effects';
import { applyCam, type Cam, type Pt, pt } from './geom';
import { aboveFrontLip, drawBackHalf, drawFrontValve, gapeMiddle, onFront } from './mussel';
import { drawCaustics, drawFronds, drawLedge, makeBackWater } from './pool';
import { musselsAt, starAt, stomachReach, underStar } from './scene';
import { captionAt, TEXT } from './script';
import { armPoint, drawStar, drawTubeFeet, frontArms, frontMask, type StarPose } from './star';
import { drawStomach } from './stomach';
import {
  boilAt, camAt, cycles, glowAt, gradeAt, IT2_AT, LOOP_S, panAt, paperAt, SLURPS_AT, sparkleAt, STOMACH3_AT, strainAt, takeoutAt, throbAt, wrap,
} from './story';
import { drawTakeout } from './takeout';

/** Draws the "this starfish eats with its stomach outside its body" short (story.ts has the beats). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const INK_BG = '#050914';
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

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

/** The mood's colour over the frame and the dark at its edges. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const g = gradeAt(t);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = g.washA * 2;
  ctx.fillStyle = `rgb(${g.wash.map(Math.round).join(',')})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const v = ctx.createRadialGradient(VIDEO.width / 2, 820, 360, VIDEO.width / 2, 860, 1250);
  v.addColorStop(0, 'rgba(1,5,8,0)');
  v.addColorStop(1, `rgba(1,5,8,${g.vignette.toFixed(3)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** The far water, a touch of the camera's zoom on it so it isn't pinned to the glass. */
function drawBack(ctx: CanvasRenderingContext2D, back: HTMLCanvasElement, cam: Cam, t: number, boil: number): void {
  const z = 1 + (cam.zoom - 1) * 0.2;
  ctx.save();
  ctx.translate(VIDEO.width / 2, 860);
  ctx.scale(z, z);
  ctx.translate(-VIDEO.width / 2 - (cam.focus.x - 540) * 0.2, -860);
  ctx.drawImage(back, 0, 0);
  drawFronds(ctx, t, boil);
  ctx.restore();
}

/** Where the front arms' tube feet hold the front valve of the mussel under the star (null while it glides). */
function feetTo(t: number, pose: StarPose): (arm: number, j: number) => Pt | null {
  const m = underStar(t);
  if (pose.lift > 0.35 || Math.abs(m.x) > 40) return () => null;
  return (arm, j) => onFront(m.x, m.gape, arm === 2 ? 0.8 + j * 0.022 : 0.2 - j * 0.022, 0.5 + (j % 3) * 0.15);
}

export function createSeastar(ctx: CanvasRenderingContext2D): Short {
  const back = makeBackWater(makePaper());
  const starLayer = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = camAt(t);
    const pose = starAt(t);
    const mussels = musselsAt(t);
    const under = underStar(t);
    const reach = stomachReach(t);
    const visible = mussels.filter((m) => Math.abs(m.x) < 1100);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBack(ctx, back, cam, t, boil);

    // The star, painted once to its own layer.
    const sc = starLayer.ctx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.clearRect(0, 0, VIDEO.width, VIDEO.height);
    sc.save();
    applyCam(sc, cam);
    drawStar(sc, pose, boil);
    sc.restore();

    ctx.save();
    applyCam(ctx, cam);
    drawLedge(ctx, panAt(t), t, boil);
    ctx.restore();
    // Behind the mussels: the whole star.
    ctx.drawImage(starLayer.canvas, 0, 0);

    ctx.save();
    applyCam(ctx, cam);
    for (const m of visible) drawBackHalf(ctx, m.x, m.gape, m.meat, 500 + boil * 11);
    for (const m of visible) drawFrontValve(ctx, m.x, m.gape, 500 + boil * 11);
    ctx.restore();

    // In front of the mussel: the front arms and the body.
    ctx.save();
    applyCam(ctx, cam);
    ctx.beginPath();
    for (const shape of frontMask(pose)) {
      shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clip('nonzero');
    ctx.drawImage(starLayer.canvas, 0, 0);
    ctx.restore();

    // The stomach, out of the mouth on the disc's underside and down into the gape: in front of the
    // star, behind its front arms and the mussel's front valve.
    if (reach.extent > 0.01) {
      ctx.save();
      applyCam(ctx, cam);
      ctx.beginPath();
      aboveFrontLip(under.x, under.gape).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      ctx.beginPath();
      ctx.rect(-4000, -4000, 9000, 9000);
      for (const arm of frontArms(pose)) {
        arm.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
      }
      ctx.clip('evenodd');
      drawStomach(ctx, { mouth: reach.mouth, floor: reach.floor, extent: reach.extent, throb: throbAt(t), glow: glowAt(t), phase: cycles(11, t) }, boil);
      ctx.restore();
    }

    ctx.save();
    applyCam(ctx, cam);
    drawTubeFeet(ctx, pose, feetTo(t, pose), boil);
    const strain = strainAt(t);
    drawStrain(ctx, armPoint(pose, 2, 0.55), strain, t, boil, -0.4);
    drawStrain(ctx, armPoint(pose, 3, 0.55), strain, t, boil, Math.PI + 0.4);
    const gm = gapeMiddle(under.x, under.gape);
    drawBubbles(ctx, pt(gm.x, gm.y - 20), t, IT2_AT, glowAt(t));
    const slurp = Math.max(0, Math.min(1, (t - SLURPS_AT + 0.1) / 0.2)) * Math.max(0, Math.min(1, (STOMACH3_AT + 0.3 - t) / 0.25));
    drawSlurp(ctx, reach.mouth, slurp, boil);
    // The sparkle sits on the emptied shell, wherever the glide takes it.
    const sparkle = sparkleAt(t);
    const eaten = mussels[1]!;
    const em = gapeMiddle(eaten.x, eaten.gape);
    drawSparkle(ctx, pt(em.x + 70, em.y + 10), 30 + 10 * Math.sin(t * 9), sparkle);
    drawSparkle(ctx, pt(em.x - 90, em.y + 26), 20 + 8 * Math.cos(t * 11), sparkle * 0.8);
    const paper = paperAt(t);
    if (paper.alpha > 0.01) {
      ctx.save();
      const clip = aboveFrontLip(under.x, under.gape);
      ctx.beginPath();
      clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      drawPaper(ctx, gm, paper.slide, paper.alpha, boil);
      ctx.restore();
    }
    ctx.restore();

    drawCaustics(ctx, t, 1);
    drawGrade(ctx, t);
    drawTakeout(ctx, takeoutAt(t), t, boil);
    drawRewind(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSeastarAudio };
}
