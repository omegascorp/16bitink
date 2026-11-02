import { drawSpokenLine, PAPER_ON_DARK } from '../captions';
import { type Short } from '../short';
import { boilAt, type Pt } from '../sprites';
import { drawClock, drawFlash, drawGrade, drawNote } from '../krait/marks';
import { renderPythonAudio } from './audio';
import { drawProfileHook } from './profileArt';
import { type Cast, makeCast } from './cast';
import { CROC_LEN } from './croc';
import {
  drawBar, drawBig, drawBoard, drawGlints, drawQuestion, drawRings, drawSky, drawSpray, drawSuitcase,
} from './marks';
import {
  bellyCamera, CROC_AT, daysCamera, duskCamera, duskPython, faceCamera, faceCroc, facePython, lakeCamera, lakeCroc,
  lakePython, restPython, shaken, struggle,
} from './moves';
import {
  captionAt, clockShown, clockTurns, crocBar, dayNumber, daySky, daySkyShown, daysShown, placeLabel, pythonBar, questionShown, skyShown, suitcaseShown,
  sunPhase, TEXT, yearLabel,
} from './script';
import { type Camera, CROC_K, drawPython, toScreen } from './snake';
import { gradeAt, LOOP_S, sceneAt, SUITCASE_AT, wrap } from './story';

/** Draws the "this snake swallowed a whole crocodile" short (story.ts has the beats). */

/** The python's yellow lip, for the word being said. */
const HOT = '#f2cf55';

function drawCroc(ctx: CanvasRenderingContext2D, cast: Cast, cam: Camera, at: Pt, angle: number, pose: 'swim0' | 'swim1' | 'face', boil: number): void {
  const c = toScreen(cam, at);
  const s = CROC_K * cam.zoom;
  const sprite = cast.croc[pose];
  const n = sprite.frames.length;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.drawImage(sprite.frames[((boil % n) + n) % n]!, -sprite.frame / 2, -sprite.frame / 2, sprite.frame, sprite.frame);
  ctx.restore();
}

/** The hook, side on at ground level (profileArt.ts). */
function drawHook(ctx: CanvasRenderingContext2D, t: number): void {
  drawProfileHook(ctx, t);
  drawGrade(ctx, gradeAt(t), null, 0);
  // A soft dark band behind the caption, which lies over the python's body.
  const y = 1200 - 30;
  const band = ctx.createLinearGradient(0, y - 90, 0, y + 90);
  band.addColorStop(0, 'rgba(14,10,8,0)');
  band.addColorStop(0.5, 'rgba(14,10,8,0.5)');
  band.addColorStop(1, 'rgba(14,10,8,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y - 90, 1080, 180);
}

function drawTag(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(lakeCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 1);
  drawRings(ctx, cam, CROC_AT, t, 10, 30);
  const c = lakeCroc(t);
  drawCroc(ctx, cast, cam, c.at, c.angle, c.pose, boil);
  drawGrade(ctx, gradeAt(t), null, 0);
  drawNote(ctx, 'Lake Moondarra', TEXT.lake.x, TEXT.lake.y, TEXT.lake.size, placeLabel(t));
  drawNote(ctx, 'Australia', TEXT.australia.x, TEXT.australia.y, TEXT.australia.size, placeLabel(t));
  drawNote(ctx, '2014', TEXT.year.x, TEXT.year.y, TEXT.year.size, yearLabel(t));
}

/** A length bar (two screen points) with its two-line label `dx` px to the side. */
function drawLength(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, dx: number, top: string, bottom: string, show: number): void {
  if (show <= 0) return;
  drawBar(ctx, a, b, show);
  const mid = (a.y + b.y) / 2;
  drawNote(ctx, top, a.x + dx, mid - 10, TEXT.pythonLen.size, show);
  drawNote(ctx, bottom, a.x + dx, mid + 84, TEXT.pythonLen.size * 0.9, show);
}

function drawLake(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(lakeCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 1);
  const croc = lakeCroc(t);
  const py = lakePython(t);
  const k = struggle(t);
  if (k < 0.01) drawRings(ctx, cam, CROC_AT, t, 10, 30);
  drawCroc(ctx, cast, cam, croc.at, croc.angle, croc.pose, boil);
  drawPython(ctx, cast, cam, py, boil);
  drawSpray(ctx, cam, CROC_AT, t, k);
  // The bite's flash.
  drawFlash(ctx, toScreen(cam, py.route.at(py.headS)), (t - 5.52) / 0.4);
  drawGrade(ctx, gradeAt(t), null, 0);
  // Length bars: the python's (head to tail, right of it) and the croc's (snout to tail, left of it), the labels in the gap between.
  const head = py.route.at(py.headS);
  const tail = py.route.at(py.headS - py.length);
  const pa = toScreen(cam, head);
  const pb = toScreen(cam, tail);
  const half = (CROC_LEN * CROC_K) / 2;
  const sn = toScreen(cam, { x: croc.at.x, y: CROC_AT.y - half });
  const tl = toScreen(cam, { x: croc.at.x, y: CROC_AT.y + half });
  const gap = 60 * cam.zoom / 3.3;
  drawLength(ctx, { x: pa.x + gap, y: pa.y }, { x: pb.x + gap, y: pb.y }, gap + 100, '10 ft', '3 m', pythonBar(t));
  drawLength(ctx, { x: sn.x - gap, y: sn.y }, { x: tl.x - gap, y: tl.y }, -(gap + 95), '3 ft', '1 m', crocBar(t));
  drawClock(ctx, TEXT.clock.x, TEXT.clock.y, TEXT.clock.r, clockTurns(t), clockShown(t));
}

function drawDusk(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(duskCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 0.7);
  drawPython(ctx, cast, cam, duskPython(t), boil);
  drawGrade(ctx, gradeAt(t), null, 0);
  drawClock(ctx, TEXT.clock.x, TEXT.clock.y, TEXT.clock.r, clockTurns(t), clockShown(t));
  drawSky(ctx, sunPhase(t), 0, skyShown(t), TEXT.sky.y);
}

function drawBelly(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(bellyCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 0.7);
  drawPython(ctx, cast, cam, restPython(t), boil);
  drawGrade(ctx, gradeAt(t), null, 0);
  const show = suitcaseShown(t);
  drawSuitcase(ctx, TEXT.suitcase.x, TEXT.suitcase.y, TEXT.suitcase.w, 0.1 * Math.sin((t - SUITCASE_AT) * 9) * Math.max(0, 1 - (t - SUITCASE_AT)), show);
}

function drawDays(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(daysCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 0.5);
  drawPython(ctx, cast, cam, restPython(t), boil);
  drawGrade(ctx, gradeAt(t), null, 0);
  const sky = daySky(t);
  drawSky(ctx, sky.phase, sky.night, daySkyShown(t), TEXT.sky.y);
  const n = dayNumber(t);
  const shown = daysShown(t);
  drawBig(ctx, String(n), TEXT.days.x, TEXT.days.y, TEXT.days.size, n > 0 ? shown : 0);
  drawNote(ctx, n === 1 ? 'day' : 'days', TEXT.daysWord.x, TEXT.daysWord.y, TEXT.daysWord.size, n > 0 ? shown : 0);
}

function drawFace(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = shaken(faceCamera(t), t);
  drawBoard(ctx, cast.board, cam);
  drawGlints(ctx, cam, t, 0.8);
  const croc = faceCroc(t);
  drawCroc(ctx, cast, cam, croc.at, croc.angle, 'face', boil);
  drawPython(ctx, cast, cam, facePython(t), boil);
  drawGrade(ctx, gradeAt(t), null, 0);
  drawQuestion(ctx, TEXT.question.x, TEXT.question.y, TEXT.question.size, questionShown(t), t);
}

export function createPython(ctx: CanvasRenderingContext2D): Short {
  const cast = makeCast();
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    ctx.save();
    const scene = sceneAt(t);
    if (scene === 'hook') drawHook(ctx, t);
    else if (scene === 'tag') drawTag(ctx, cast, t, boil);
    else if (scene === 'lake') drawLake(ctx, cast, t, boil);
    else if (scene === 'dusk') drawDusk(ctx, cast, t, boil);
    else if (scene === 'belly') drawBelly(ctx, cast, t, boil);
    else if (scene === 'days') drawDays(ctx, cast, t, boil);
    else drawFace(ctx, cast, t, boil);
    ctx.restore();
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderPythonAudio };
}

