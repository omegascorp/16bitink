import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import type { Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderCuskAudio } from './audio';
import { type Beam, drawBeamGlow, drawShade, type Hole, makeShade } from './light';
import {
  bump, drawArrow, drawCaption, drawNote, drawQuestion, drawReadout, drawRing, drawRuler, drawStamp, EYE, EYE_R, fishPoint, MOUTH, type OnScreen,
} from './marks';
import { drawDredge, drawLine, drawNet, knotOf } from './net';
import { CHALK, drawDrop, drawSeafloor, drawSkyAndSea, drawSnow, drawSplash, drawWaterline, type Pt, surfaceY, toScreen } from './scene';
import { drawChallenger, drawInvestigator } from './ships';
import {
  boilAt, type Camera, cameraAt, challengerAt, challengerNameAt, darkAt, DREDGE_TOP, dredgeAt, dropsAt, eyeLabelAt, FISH_LEN, fishAt, FLOOR_Y, foundAt,
  glowAt, investigatorNameAt, LAMP, lampAimAt, lampAt, lensAt, LOOP_S, metresAt, mouthArrowAt, mouthLabelAt, netAt, questionAt, questionPop,
  readoutAt, rulerAt, SEVENTIES_AT, seventiesAt, SHEAVE, skinLabelAt, SPLASHES, thumpAt, wrap, YEAR_AT, yearAt,
} from './story';

/** Draws the "this fish has no face" short (story.ts has the choreography). */

/**
 * The ships' stamps, clear of the ships, the lines and the fish: Challenger's
 * in the open water on the left of the whole column; Investigator's up on the
 * right, where the sky is clear as the camera rides up with the net.
 */
const CHALLENGER_STAMP: Pt = { x: 320, y: 600 };
const INVESTIGATOR_STAMP: Pt = { x: 850, y: 430 };
const RULER_X = 985;
const LENS_R = 0.17;

const cuskPose = (f: OnScreen, beat: number, effort: number): Pose => ({
  j: 0, shape: 'facelesscusk', age: 0, x: f.x, y: f.y, length: f.len, facing: 1, tilt: f.tilt, beat, effort,
});

/** The camera's drift, for the snow: how far it has scrolled (screen px) and how fast. */
const SNOW_K = 1;
const scrollAt = (t: number): number => cameraAt(t).y * SNOW_K;
const scrollRate = (t: number): number => (scrollAt(t + 1 / 120) - scrollAt(t - 1 / 120)) * 60;

/** The X-ray inside the lens: the fish in negative, bluish, its buried eye glowing through the skin. */
function drawXray(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, sprite: Sprite, pose: Pose, f: OnScreen, lens: Pt, r: number, amount: number, boil: number): void {
  if (amount <= 0.01) return;
  const l = layer.getContext('2d')!;
  l.clearRect(0, 0, layer.width, layer.height);
  drawSwimmer(l, sprite, pose, boil);
  ctx.save();
  ctx.beginPath();
  ctx.arc(lens.x, lens.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = amount;
  ctx.fillStyle = '#06182c';
  ctx.fillRect(lens.x - r, lens.y - r, 2 * r, 2 * r);
  ctx.filter = 'invert(1) grayscale(1) sepia(1) hue-rotate(160deg) saturate(2.2) brightness(1.15)';
  ctx.globalAlpha = 0.8 * amount;
  ctx.drawImage(layer, lens.x - r, lens.y - r, 2 * r, 2 * r, lens.x - r, lens.y - r, 2 * r, 2 * r);
  ctx.filter = 'none';
  // The tiny eye, deep under the skin.
  const eye = fishPoint(f, EYE);
  const er = EYE_R * f.len;
  const glow = ctx.createRadialGradient(eye.x, eye.y, 0, eye.x, eye.y, er * 3.2);
  glow.addColorStop(0, 'rgba(160,240,255,0.75)');
  glow.addColorStop(1, 'rgba(160,240,255,0)');
  ctx.globalAlpha = amount;
  ctx.fillStyle = glow;
  ctx.fillRect(eye.x - er * 4, eye.y - er * 4, er * 8, er * 8);
  ctx.strokeStyle = '#d8fbff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, er, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#d8fbff';
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, er * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The lens's rim: a chalk ring with four ticks, like a scope. */
function drawLensRim(ctx: CanvasRenderingContext2D, at: Pt, r: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    ctx.lineTo(at.x + Math.cos(a) * (r + 22), at.y + Math.sin(a) * (r + 22));
    ctx.stroke();
  }
  ctx.restore();
}

function drawNotes(ctx: CanvasRenderingContext2D, t: number, cam: Camera, f: OnScreen, lensAtPt: Pt, r: number): void {
  drawQuestion(ctx, f, questionAt(t), questionPop(t));
  drawReadout(ctx, metresAt(t), readoutAt(t));
  // The eye and the skin over it.
  const eye = fishPoint(f, EYE);
  drawNote(ctx, 'tiny eye', { x: eye.x - 30, y: lensAtPt.y - r - 150 }, { x: eye.x, y: eye.y - EYE_R * f.len * 1.6 }, 80, eyeLabelAt(t), undefined, -90);
  drawNote(ctx, 'under the skin', { x: eye.x + 110, y: lensAtPt.y - r - 86 }, null, 62, skinLabelAt(t));
  // The mouth, underneath.
  const mouth = fishPoint(f, MOUTH);
  const shown = mouthLabelAt(t);
  drawArrow(ctx, { x: mouth.x + 40, y: 1000 }, { x: mouth.x + 4, y: mouth.y + 34 }, 70, mouthArrowAt(t), shown);
  drawNote(ctx, 'mouth', { x: mouth.x + 60, y: 1085 }, null, 84, shown);
  // The whole column: the ruler, and the tiny fish 4 km down.
  drawRuler(ctx, RULER_X, surfaceY(cam), toScreen(cam, 0, FLOOR_Y).y, rulerAt(t));
  const found = foundAt(t);
  if (found > 0) {
    drawRing(ctx, f, f.len * (0.7 + 0.15 * bump(t, SEVENTIES_AT - 0.4, 0.6)), f.len * 0.3, found);
    drawNote(ctx, 'Typhlonus nasus', { x: f.x, y: f.y - f.len * 0.42 }, null, 54, found);
  }
  // The ships' names and years.
  drawStamp(ctx, CHALLENGER_STAMP, 'HMS Challenger', '1870s', challengerNameAt(t), seventiesAt(t), thumpAt(t, SEVENTIES_AT));
  drawStamp(ctx, INVESTIGATOR_STAMP, 'RV Investigator', '2017', investigatorNameAt(t), yearAt(t), thumpAt(t, YEAR_AT));
}

export function createCusk(ctx: CanvasRenderingContext2D): Short {
  const sprite = makeSprite('facelesscusk', 8);
  const shade = makeShade();
  const layer = makeShade();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const fish = fishAt(t);
    const at = toScreen(cam, fish.x, fish.y);
    const f: OnScreen = { x: at.x, y: at.y, len: FISH_LEN * cam.zoom, tilt: fish.tilt };
    const pose = cuskPose(f, fish.beat, fish.effort);
    const surface = surfaceY(cam);
    const net = netAt(t);
    const netAtPt = toScreen(cam, net.x, net.y);
    const ch = challengerAt(t);
    const inv = 1 - ch;
    const aim = lampAimAt(t);

    drawSkyAndSea(ctx, cam, t);
    drawSnow(ctx, scrollAt(t), scrollRate(t), surface, t);
    drawSeafloor(ctx, cam);
    drawChallenger(ctx, cam, ch);
    drawInvestigator(ctx, cam, inv, aim, lampAt(t));

    const dredge = dredgeAt(t);
    if (dredge) {
      const d = toScreen(cam, dredge.x, dredge.y);
      drawLine(ctx, toScreen(cam, DREDGE_TOP.x, DREDGE_TOP.y), d, 3.5, 0.9 * ch, 30);
      drawDredge(ctx, d, 60 * cam.zoom * 2, ch);
    }

    const netLen = FISH_LEN * cam.zoom;
    drawLine(ctx, toScreen(cam, SHEAVE.x, SHEAVE.y), knotOf(netAtPt, netLen, net.angle), Math.max(2, 3 * cam.zoom), 0.85 * inv);
    drawNet(ctx, netAtPt, netLen, net.angle, false, boil, inv);
    drawSwimmer(ctx, sprite, pose, boil);
    drawNet(ctx, netAtPt, netLen, net.angle, true, boil, inv);

    drawWaterline(ctx, cam, t);
    for (const d of dropsAt(t)) drawDrop(ctx, toScreen(cam, d.x, d.y), d.ring, cam.zoom);
    for (const s of SPLASHES) drawSplash(ctx, toScreen(cam, 0, 0).x, surface, s.size * netLen, (t - s.at) / s.s);

    // Light: the night over everything, the lamp's beam, the glow round the fish, the lens.
    const lens = lensAt(t);
    const lensPt = fishPoint(f, { x: EYE.x + (MOUTH.x - EYE.x) * lens.slide, y: EYE.y + (MOUTH.y - EYE.y) * lens.slide });
    const lensR = LENS_R * f.len;
    const glass = toScreen(cam, LAMP.x + Math.cos(aim) * 28, LAMP.y + Math.sin(aim) * 28);
    const beam: Beam = { from: glass, aim, reach: 1150 * cam.zoom, strength: lampAt(t) };
    const holes: Hole[] = [
      { at: f, r: f.len * 0.8, strength: glowAt(t), hard: false },
      { at: lensPt, r: lensR, strength: lens.alpha, hard: true },
    ];
    drawShade(ctx, shade, darkAt(t), beam, holes);
    drawBeamGlow(ctx, beam);
    drawXray(ctx, layer, sprite, pose, f, lensPt, lensR, lens.alpha * lens.xray, boil);
    drawLensRim(ctx, lensPt, lensR, lens.alpha);

    drawNotes(ctx, t, cam, f, lensPt, lensR);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderCuskAudio };
}
