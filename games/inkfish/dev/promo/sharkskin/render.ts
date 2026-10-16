import { INK, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { makeBackdrop } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER } from '../captions';
import { lerp, ramp, VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderSharkSkinAudio } from './audio';
import { drawProp, type Prop } from './kit';
import { CHEF_SHOULDER, drawChefArm, FIST_CUFF, makeChef, makeHand } from './figures';
import { makeFlag, makeGrater, makeSandpaper, makeSushi, makeWasabi } from './props';
import { CARD, drawCheck, drawCurrent, drawNote, drawRoughTrail, drawSmoothTrail, drawTailArrow, makeCard, SPOKEN } from './scene';
import {
  captionAt, cardAt, chefAt, chefIn, chefLabel, equalsSign, graterAt, japanAt, noseLabel, sandpaperAt, scaleCut, skinLabel, smoothLabel, sushiAt, tailArrowDrawn,
  tailArrowShown, tailLabel, teethLabel, toothCut, wasabiAt,
} from './script';
import { drawScaleArrows, makeDenticleCut, makeLensSkin, makeMagnifier, makeToothCut } from './skin';
import {
  arrowsAt, bodyPoint, boilAt, type Fish, handAt, LENS_ALONG, LENS_R, lensAt, liftAt, LOOP_S, pasteAt, roughTrail, rubAt, sharkAt, smoothTrail,
} from './story';

/** Draws the "shark skin is covered in tiny teeth" short (story.ts has the choreography, script.ts the notes). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 72;

/** Where the Japan beat's props stand. */
/** The chef, a little smaller than drawn, low on the left, clear of the flag; he steps in from off the left edge. */
const CHEF_AT = { x: 255, y: 735 } as const;
const CHEF_FROM_X = -170;
const CHEF_SCALE = 0.85;
/** How the root is held: tilted a little towards the chef. */
const ROOT_TILT = 0.12;
const GRATER_AT = { x: 660, y: 570 } as const;
const PASTE_AT = { x: 560, y: 622 } as const;
const SUSHI_AT = { x: 540, y: 455 } as const;

interface Art {
  readonly shark: Sprite;
  readonly lensSkin: Prop;
  readonly magnifier: Prop;
  readonly card: Prop;
  readonly scale: Prop;
  readonly tooth: Prop;
  readonly hand: Prop;
  readonly sandpaper: Prop;
  readonly flag: Prop;
  readonly chef: Prop;
  readonly grater: Prop;
  readonly wasabi: Prop;
  readonly sushi: Prop;
  /** Where the chef's arm is drawn each frame. */
  readonly scratch: HTMLCanvasElement;
}

const poseOf = (f: Fish): Pose => ({ j: 0, shape: 'shark', age: 0, x: f.x, y: f.y, length: f.len, facing: f.face, tilt: f.tilt, beat: f.beat, effort: f.effort });

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
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

/** The magnifying glass on the flank: the skin under it blown up, the scales' arrows, the rim and handle; it pops in and out about its centre. */
function drawLens(ctx: CanvasRenderingContext2D, art: Art, s: Fish, t: number, boil: number): void {
  const shown = lensAt(t);
  if (shown <= 0) return;
  const c = bodyPoint(s, LENS_ALONG, 0);
  const k = 0.55 + 0.45 * ramp(shown, 0, 1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, shown * 1.4);
  ctx.translate(c.x, c.y);
  ctx.scale(k, k);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, LENS_R, 0, Math.PI * 2);
  ctx.clip();
  drawProp(ctx, art.lensSkin, boil, 0, 0);
  drawScaleArrows(ctx, 0, 0, arrowsAt(t));
  ctx.restore();
  drawProp(ctx, art.magnifier, boil, 0, 0);
  ctx.restore();
}

/** The shark, its eyes shut happily while it's stroked the right way. */
function drawShark(ctx: CanvasRenderingContext2D, art: Art, s: Fish, boil: number): void {
  drawSwimmer(ctx, art.shark, poseOf(s), boil, { eyes: s.content > 0.5 ? 'happy' : null });
}

/** A soft shadow on the skin under the hand, sharper and darker as it comes down to touch. */
function drawHandShadow(ctx: CanvasRenderingContext2D, s: Fish, along: number, lift: number, alpha: number): void {
  const near = 1 - Math.min(1, lift * 3);
  if (near <= 0) return;
  const at = bodyPoint(s, along, -0.35);
  ctx.save();
  ctx.globalAlpha = 0.28 * near * alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y + 8, 95 - 25 * near, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** "Every scale is built like a tooth": the card, the cut-away scale = the tooth. */
function drawCutaways(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const card = cardAt(t);
  if (card <= 0) return;
  const pop = (u: number): number => 0.7 + 0.3 * ramp(u, 0, 1);
  drawProp(ctx, art.card, boil, CARD.x, CARD.y, { alpha: card, scale: 0.92 + 0.08 * card });
  const base = CARD.y + 95;
  drawProp(ctx, art.scale, boil, 320, base, { alpha: scaleCut(t), scale: 1.05 * pop(scaleCut(t)) });
  drawProp(ctx, art.tooth, boil, 770, base, { alpha: toothCut(t), scale: 0.95 * pop(toothCut(t)) });
  drawTextLine(ctx, '=', 548, CARD.y + 20, 150, 700, equalsSign(t));
  drawTextLine(ctx, 'scale', 320, CARD.y + 158, LABEL_SIZE, 700, scaleCut(t), SPOKEN);
  drawTextLine(ctx, 'tooth', 770, CARD.y + 158, LABEL_SIZE, 700, toothCut(t), SPOKEN);
}

/** "In Japan, some chefs grate wasabi on shark skin": the flag, the chef rubbing the root round on the paddle, the paste piling up. */
function drawJapan(ctx: CanvasRenderingContext2D, art: Art, t: number, boil: number): void {
  const japan = japanAt(t);
  if (japan <= 0) return;
  drawProp(ctx, art.flag, boil, 170, 345, { alpha: japan, rot: -0.06 });
  drawTextLine(ctx, 'Japan', 350, 372, 92, 700, japan, SPOKEN);
  const chef = chefAt(t);
  const step = chefIn(t);
  // A little bob in his walk as he comes in.
  const chefAt2 = { x: lerp(CHEF_FROM_X, CHEF_AT.x, step), y: CHEF_AT.y - 8 * Math.abs(Math.sin(step * Math.PI * 3)) * (1 - step) };
  drawProp(ctx, art.chef, boil, chefAt2.x, chefAt2.y, { alpha: chef, scale: CHEF_SCALE });
  drawNote(ctx, 'chef', { x: CHEF_AT.x, y: CHEF_AT.y + 62 }, null, chefLabel(t), LABEL_SIZE);
  const grater = graterAt(t);
  drawProp(ctx, art.grater, boil, GRATER_AT.x, GRATER_AT.y, { alpha: grater, rot: -0.05 });
  const paste = pasteAt(t) * grater;
  if (paste > 0) drawPaste(ctx, paste);
  const root = wasabiAt(t);
  if (root > 0) {
    const rub = rubAt(t);
    const tip = { x: GRATER_AT.x - 40 + rub.x, y: GRATER_AT.y + rub.y };
    const c = Math.cos(ROOT_TILT);
    const s = Math.sin(ROOT_TILT);
    const wrist = { x: tip.x + FIST_CUFF.x * c - FIST_CUFF.y * s + 6, y: tip.y + FIST_CUFF.x * s + FIST_CUFF.y * c };
    const shoulder = { x: chefAt2.x + CHEF_SCALE * CHEF_SHOULDER.x, y: chefAt2.y + CHEF_SCALE * CHEF_SHOULDER.y };
    drawArm(ctx, art.scratch, shoulder, wrist, boil, root * chef);
    drawProp(ctx, art.wasabi, boil, tip.x, tip.y, { alpha: root, rot: ROOT_TILT });
    drawNote(ctx, 'wasabi', { x: 820, y: 400 }, { x: tip.x + 30, y: tip.y - 190 }, root, LABEL_SIZE);
  }
  drawNote(ctx, 'shark skin', { x: 720, y: 740 }, { x: GRATER_AT.x + 80, y: GRATER_AT.y + 40 }, skinLabel(t), LABEL_SIZE);
}

/** The chef's reaching arm, inked live on a scratch canvas (it follows the root round) and laid on faded with the rest of him. */
function drawArm(ctx: CanvasRenderingContext2D, scratch: HTMLCanvasElement, shoulder: { x: number; y: number }, wrist: { x: number; y: number }, boil: number, alpha: number): void {
  if (alpha <= 0) return;
  const sctx = scratch.getContext('2d')!;
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  drawChefArm(new Pen(sctx, 811 + boil * 977, 1.3), shoulder, wrist, 26);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

/** The grated wasabi, a soft green mound growing on the paddle. */
function drawPaste(ctx: CanvasRenderingContext2D, u: number): void {
  const rx = 12 + 46 * u;
  const ry = 8 + 22 * u;
  ctx.save();
  ctx.fillStyle = '#9fcb6c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  // A soft heap: rounded on top, flat where it sits, a little peak where the last of it fell.
  ctx.beginPath();
  ctx.moveTo(PASTE_AT.x - rx, PASTE_AT.y);
  ctx.quadraticCurveTo(PASTE_AT.x - rx * 0.7, PASTE_AT.y - ry * 1.1, PASTE_AT.x - rx * 0.1, PASTE_AT.y - ry * 1.15);
  ctx.quadraticCurveTo(PASTE_AT.x + rx * 0.05, PASTE_AT.y - ry * 1.5, PASTE_AT.x + rx * 0.15, PASTE_AT.y - ry * 1.1);
  ctx.quadraticCurveTo(PASTE_AT.x + rx * 0.8, PASTE_AT.y - ry * 1.0, PASTE_AT.x + rx, PASTE_AT.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5f8f3a';
  for (let k = 0; k < 6; k++) {
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(PASTE_AT.x + Math.cos(k * 2.3) * rx * 0.55, PASTE_AT.y - ry * (0.25 + 0.5 * Math.abs(Math.sin(k * 1.7))), 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The labels on the shark and the notes over it. */
function drawNotes(ctx: CanvasRenderingContext2D, s: Fish, t: number): void {
  drawNote(ctx, 'tiny teeth', { x: 300, y: 640 }, null, teethLabel(t), 100);
  const tail = bodyPoint(s, 1, 0.4);
  drawNote(ctx, 'tail', { x: Math.min(tail.x, 960), y: 1080 }, null, tailLabel(t), LABEL_SIZE);
  const nose = bodyPoint(s, 0, 0.4);
  drawNote(ctx, 'nose', { x: Math.max(nose.x, 120), y: 1080 }, null, noseLabel(t), LABEL_SIZE);
  const smooth = smoothLabel(t);
  drawTextLine(ctx, 'smooth', 300, 520, 110, 700, smooth, SPOKEN);
  drawCheck(ctx, 470, 482, 70, smooth);
}

export function createSharkSkin(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(70,150,210,0.12)', bottom: 'rgba(30,90,160,0.34)' });
  const art: Art = {
    shark: makeSprite('shark', 5, 'heavy'),
    lensSkin: makeLensSkin(),
    magnifier: makeMagnifier(),
    card: makeCard(),
    scale: makeDenticleCut(),
    tooth: makeToothCut(),
    hand: makeHand(),
    sandpaper: makeSandpaper(),
    flag: makeFlag(),
    chef: makeChef(),
    grater: makeGrater(),
    wasabi: makeWasabi(),
    sushi: makeSushi(),
    scratch: Object.assign(document.createElement('canvas'), { width: VIDEO.width, height: VIDEO.height }),
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const s = sharkAt(t);
    ctx.drawImage(backdrop, 0, 0);
    drawCurrent(ctx, t, LOOP_S);
    drawShark(ctx, art, s, boil);
    drawSmoothTrail(ctx, s, smoothTrail(t));
    drawRoughTrail(ctx, s, roughTrail(t), t);
    drawLens(ctx, art, s, t, boil);
    drawTailArrow(ctx, s, tailArrowDrawn(t), tailArrowShown(t));
    drawCutaways(ctx, art, t, boil);
    const paper = sandpaperAt(t);
    drawProp(ctx, art.sandpaper, boil, 790, 470, { alpha: paper, rot: 0.07, scale: 1.25 - 0.25 * ramp(paper, 0, 1) });
    drawTextLine(ctx, 'sandpaper', 790, 492, 76, 700, paper, { fill: INK, halo: '#e8d3a6' });
    const hand = handAt(t);
    if (hand) {
      drawHandShadow(ctx, s, hand.along, liftAt(t), hand.alpha);
      drawProp(ctx, art.hand, boil, hand.x, hand.y, { flip: hand.face, alpha: hand.alpha });
    }
    drawJapan(ctx, art, t, boil);
    const sushi = sushiAt(t);
    drawProp(ctx, art.sushi, boil, SUSHI_AT.x - 60 * (1 - sushi), SUSHI_AT.y, { alpha: sushi });
    drawNote(ctx, 'sushi', { x: SUSHI_AT.x, y: SUSHI_AT.y - 120 }, null, sushi, 88);
    drawNotes(ctx, s, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSharkSkinAudio };
}
