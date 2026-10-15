import { INK } from '../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import { drawChomp, drawExclaim } from '../effects';
import { onScreen as onScreenAt } from '../gameplay/fish';
import { drawCredit, drawFloatText, SCORE_INK } from '../gameplay/hud';
import { drawZoomMarks, type MarkField } from '../gameplay/marks';
import { makeBackdrop } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderInkCloudAudio } from './audio';
import { drawInkButton } from './button';
import { drawInkCloud } from './cloud';
import {
  CAPTIONS, captionAlpha, CHOMP_AT, CLOUD_AT, cloudSince, inkButton, inklingAlarm, inklingEyes, inklingFish, inklingJaw, LOOP_S, lostYou, pikeAlarm,
  pikeFish, pikeJaw, pikePuzzled, shake, SHIFT, SNAP_AT, SNAP2_AT, squirt, turnSquash, viewAt, type View, type WorldFish,
} from './story';

/** Draws the "throws smoke bomb" short (story.ts has the choreography). */

/** The screen point the camera centres on: between the captions above and the ink button and credit below. */
const FOCUS = { x: VIDEO.width / 2, y: 800 } as const;

/** The marks never zoom; the scene slides SHIFT px a loop, a whole number of the marks' tiles. */
const FIELD: MarkField = { focus: FOCUS, scale: 1, loopS: LOOP_S };
const onScreen = (f: WorldFish, v: View): Pose => onScreenAt(f, v, FOCUS);

/** Speed lines trailing a fast fish, as dashes leave in comics: short ink strokes behind the tail, flickering with the line boil. */
function drawWake(ctx: CanvasRenderingContext2D, p: Pose, boil: number): void {
  const speed = p.effort * 2.2 * p.length;
  const strength = Math.max(0, Math.min(1, (speed - 180) / 320));
  if (strength <= 0) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.35 * strength;
  const back = -p.facing;
  [-0.16, 0.02, 0.18].forEach((side, i) => {
    const jitter = ((boil * 7 + i * 3) % 5) / 5;
    const from = p.x + back * p.length * (0.5 + 0.05 * jitter);
    const len = p.length * (0.18 + 0.2 * strength) * (0.8 + 0.4 * ((i + boil) % 3) / 2);
    const y = p.y + side * p.length * 0.5;
    ctx.beginPath();
    ctx.moveTo(from, y);
    ctx.lineTo(from + back * len, y);
    ctx.stroke();
  });
  ctx.restore();
}

/** A "!" over a fish's head. */
function exclaimOver(ctx: CanvasRenderingContext2D, p: Pose, size: number, popped: number): void {
  if (popped <= 0) return;
  drawExclaim(ctx, p.x + p.facing * p.length * 0.1, p.y - p.length * 0.42 - size * 0.35, size * popped, p.facing * 0.12);
}

/** The pike's hand-lettered "?" over its head, rocking a little as it wonders. */
function puzzledOver(ctx: CanvasRenderingContext2D, p: Pose, popped: number, t: number): void {
  if (popped <= 0) return;
  const size = 170 * popped;
  ctx.save();
  ctx.translate(p.x + p.facing * p.length * 0.22, p.y - p.length * 0.17);
  ctx.rotate(0.12 * Math.sin(2 * Math.PI * 1.5 * t));
  drawTextLine(ctx, '?', 0, 0, size, 700, Math.min(1, popped));
  ctx.restore();
}

export function createInkCloud(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(60,110,160,0.05)', bottom: 'rgba(30,64,110,0.3)' });
  const inkling = makeSprite('inkling');
  const pike = makeSprite('pike', 8, 'heavy');
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = VIDEO.width;
  layerCanvas.height = VIDEO.height;
  const layer = layerCanvas.getContext('2d')!;
  if (SHIFT % 1500 !== 0) throw new Error('the scene must slide a whole number of mark tiles a loop');

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = Math.floor(t * BOIL_FPS + 1e-6);
    const v = viewAt(t);
    ctx.drawImage(backdrop, 0, 0);
    drawZoomMarks(ctx, FIELD, v, 0, t);
    const jolt = shake(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    const hunter = onScreen(pikeFish(t), v);
    const you = onScreen(inklingFish(t), v);
    drawWake(ctx, hunter, boil);
    drawWake(ctx, you, boil);
    drawSwimmer(ctx, pike, hunter, boil, { jaw: pikeJaw(t), stretch: turnSquash(t), mouth: { teeth: true } });
    const jet = squirt(t);
    drawSwimmer(ctx, inkling, you, boil, { jaw: inklingJaw(t), eyes: inklingEyes(t), stretch: 1 + 0.14 * jet, squash: 1 - 0.12 * jet });

    const cloud = onScreen({ ...inklingFish(t), x: CLOUD_AT.x, y: CLOUD_AT.y }, v);
    drawInkCloud(ctx, layer, cloud.x, cloud.y, v.zoom, cloudSince(t), boil % BOIL_FRAMES);

    drawChomp(ctx, hunter, (t - SNAP_AT) / 0.12);
    drawChomp(ctx, hunter, (t - SNAP2_AT) / 0.12);
    drawChomp(ctx, hunter, (t - CHOMP_AT) / 0.14);
    puzzledOver(ctx, hunter, pikePuzzled(t), t);
    exclaimOver(ctx, hunter, 150, pikeAlarm(t));
    exclaimOver(ctx, you, 110, inklingAlarm(t));
    ctx.restore();

    const lost = lostYou(t);
    if (lost) drawFloatText(ctx, 'Lost you!', cloud.x, cloud.y - 40 - 90 * lost.rise, 88, lost.alpha, SCORE_INK);
    for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
    drawInkButton(ctx, inkButton(t));
    drawCredit(ctx);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderInkCloudAudio };
}
