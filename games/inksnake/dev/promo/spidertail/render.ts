import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { drawSpokenLine, drawTextLine, PAPER_ON_DARK } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderSpidertailAudio } from './audio';
import { beakTip, drawBird } from './birdArt';
import { inkTube, LINE, paintTube, type Spine, spineOf, through, tubeShape } from './bodyArt';
import { drawSadFace } from './faceArt';
import { chips, feathers, flashOver, flock, motes, sparkles, tumbleweed } from './fx';
import { drawHeadBack, drawHeadFront, headMask } from './headArt';
import { drawLure, drawStub } from './lureArt';
import { drawRock, hidingPebbles, LOW, rockImage, TOP } from './rock';
import { drawBackdrop, drawGrade } from './scene';
import { captionAt, STAMP } from './script';
import {
  birdAt, BITE_AT, BURST_AT, CAM_Y, type Camera, camouflage, cameraAt, CUT_SAD, flash, headAt, type HeadPose, headPoint, LOOP_S, lureAt, shakeAt, shotAt, stamp, tiltAt, wrap,
} from './story';

/** Draws the "this snake's tail is a fake spider" short (story.ts has the beats). */

const HOT_ON_DARK = '#f2cf55';

/** The bulb's centre on the rock in the world of frame 1, and where the coil's fat body takes over from the moving tail. */
export const LURE_AT = { x: 332, y: 936 } as const;
const LURE_SIZE = 0.84;
const P = (x: number, y: number): Pt => ({ x, y });

/** Frame 1's snake, tail first: along the front of the rock, round the bottom coil, up onto the top one. */
const TAIL: readonly Pt[] = [P(392, 950), P(490, 985), P(610, 1006)];
const COIL: readonly Pt[] = [P(610, 1006), P(760, 1010), P(930, 985), P(1060, 900), P(1040, 790), P(880, 760), P(720, 800), P(700, 880), P(850, 905), P(1000, 850), P(1096, 760), P(1098, 690)];
const coilRadius = (u: number): number => 54 + 40 * Math.sin(Math.PI * Math.min(1, u * 0.84 + 0.04)) ** 0.8;
const tailRadius = (u: number): number => 13 + (coilRadius(0) - 13) * u ** 1.4;
/** The tail up to where the coil takes over, heading the way the coil does there. */
function tailSpine(tip: Pt): Spine {
  const all = through([tip, ...TAIL.slice(1), COIL[1]!]);
  const join = COIL[0]!;
  const end = all.reduce((best, p, i) => (Math.hypot(p.x - join.x, p.y - join.y) < Math.hypot(all[best]!.x - join.x, all[best]!.y - join.y) ? i : best), 0);
  const pts = all.slice(0, end + 1);
  return { pts, r: pts.map((_, i) => tailRadius(i / end)) };
}
const HIDE_ELEVATION = 0.42;
const LOW_COIL = spineOf(COIL, coilRadius);

/** Paints a piece of snake on its own layer, with a copy that melts into the rock for when it hides. */
interface Layer {
  readonly colour: HTMLCanvasElement;
  readonly hidden: HTMLCanvasElement;
}

function bakeLayer(sp: Spine, rock: HTMLCanvasElement, area: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }, elevation: number, pebble: number): Layer {
  const { canvas: colour, ctx } = makeCanvas(area.w, area.h);
  ctx.translate(-area.x0, -area.y0);
  // In pieces, inked as it goes, so that each turn of the coil lies over the last and shades it.
  const d = makeDraw(ctx, 31, 0, 0, LINE);
  const last = sp.pts.length - 1;
  const pieces = 5;
  let phase = 0.1;
  for (let i = 0; i < pieces; i++) {
    const a = Math.round((i / pieces) * last);
    const b = Math.round(((i + 1) / pieces) * last);
    phase = paintTube(ctx, sp, a, b, { seed: 14 + i, elevation, phase });
    inkTube(d, sp, a, b);
  }
  const { canvas: hidden, ctx: h } = makeCanvas(area.w, area.h);
  h.drawImage(colour, 0, 0);
  h.globalCompositeOperation = 'source-atop';
  h.drawImage(rock, 0, 0);
  h.globalCompositeOperation = 'source-over';
  h.translate(-area.x0, -area.y0);
  hidingPebbles(h, 73, { x0: 640, y0: 640, w: 480, h: 400 }, pebble);
  return { colour, hidden };
}

let lowLayer: Layer | null = null;
let topLayer: Layer | null = null;

const TOP_SPINE: readonly Pt[] = [P(560, 840), P(700, 930), P(830, 860), P(900, 700), P(800, 520), P(600, 470), P(420, 530), P(340, 690), P(420, 880), P(620, 980), P(840, 1000), P(1000, 860), P(1030, 640), P(920, 420), P(690, 340), P(440, 390)];
const TOP_LURE = { x: 470, y: 806 } as const;
const topCoil = spineOf(TOP_SPINE, (u) => 15 + 66 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.02)) ** 0.7);

/** The camera's move, as a transform on the world. */
function camera(ctx: CanvasRenderingContext2D, cam: Camera, shake: { readonly x: number; readonly y: number }): void {
  ctx.translate(VIDEO.width / 2 + shake.x, CAM_Y + shake.y);
  ctx.scale(cam.k, cam.k);
  ctx.translate(-cam.cx, -cam.cy);
}

function layer(ctx: CanvasRenderingContext2D, l: Layer, hide: number, area: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }): void {
  ctx.drawImage(l.colour, area.x0, area.y0);
  if (hide <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = hide;
  ctx.drawImage(l.hidden, area.x0, area.y0);
  ctx.restore();
}

/** The neck from the top of the coil to the back of the head. */
function neckSpine(h: HeadPose): Spine {
  const end = headPoint(h, -30, -30);
  const behind = headPoint(h, -130, -36);
  const start = COIL[COIL.length - 1]!;
  const before = COIL[COIL.length - 2]!;
  return spineOf([before, start, behind, end], (u) => 58 - 18 * u);
}

function hidden(ctx: CanvasRenderingContext2D, outline: readonly Pt[], amount: number, rock: HTMLCanvasElement, area: { readonly x0: number; readonly y0: number; readonly w: number; readonly h: number }): void {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = amount;
  ctx.drawImage(rock, area.x0, area.y0, area.w, area.h);
  ctx.restore();
}

/** The world of frame 1: rock, snake, lure, bird. */
function lowWorld(ctx: CanvasRenderingContext2D, t: number, boil: number, noon: boolean): void {
  const draw = (seed: number) => makeDraw(ctx, seed * 13 + boil * 1009, boil, 0, LINE);
  const u = wrap(t);
  const rock = rockImage(noon ? 'noon' : 'dawn');
  drawRock(ctx, noon ? 'noon' : 'dawn');
  lowLayer ??= bakeLayer(LOW_COIL, rockImage('dawn'), LOW, HIDE_ELEVATION, 13);
  const hide = camouflage(t);
  layer(ctx, lowLayer, hide, LOW);
  const lure = lureAt(t);
  const head = headAt(t);
  // The tail, pulled when a bird tugs at it.
  const tip = P(TAIL[0]!.x - lure.pull, TAIL[0]!.y - lure.pull * 0.12);
  const tail = tailSpine(tip);
  const end = tail.pts.length - 1;
  paintTube(ctx, tail, 0, end, { seed: 22, elevation: HIDE_ELEVATION, phase: 0.1, shadow: true });
  inkTube(draw(4), tail, 0, end);
  hidden(ctx, tubeShape(tail, 0, end), hide, rock, LOW);
  if (lure.grow > 0.03) {
    const l = { x: LURE_AT.x - lure.pull, y: LURE_AT.y - lure.pull * 0.12, size: lure.grow * LURE_SIZE, squash: 0.56, twitch: lure.twitch, jolt: lure.jolt, phase: (2 * Math.PI * 73 * wrap(t)) / LOOP_S, hang: 0, tail: 0.06 };
    drawLure(draw(5), l);
  } else drawStub(draw(5), tip.x - 4, tip.y - 2, 15, 0.3);
  // The neck and the head; when the head is out, the bird lies between its jaws.
  const neck = neckSpine(head);
  const neckEnd = neck.pts.length - 1;
  const from = Math.round(neckEnd * 0.12);
  paintTube(ctx, neck, from, neckEnd, { seed: 33, elevation: 0.5, phase: 0.4, shadow: true });
  inkTube(draw(6), neck, from, neckEnd);
  hidden(ctx, tubeShape(neck, from, neckEnd), hide, rock, LOW);
  const bird = birdAt(t);
  const attacking = u >= BURST_AT - 0.01 && shotAt(t) === 'low';
  drawHeadBack(draw(7), head);
  if (bird && attacking) drawBird(draw(9), bird);
  drawHeadFront(draw(8), head);
  hidden(ctx, headMask(head), hide, rock, LOW);
  if (bird && !attacking) drawBird(draw(9), bird);
  if (bird?.carry) {
    const b = beakTip(bird);
    drawLure(draw(10), { x: b.x + 6 * bird.face, y: b.y + 30, size: 0.56, squash: 0.8, twitch: 1.2, jolt: 0.2, phase: u * 9, hang: 1, tail: -Math.PI / 2 });
  }
  const fx = draw(11);
  chips(fx, t);
  if (bird && u < CUT_SAD) feathers(fx, t, P(headPoint(head, 300, 0).x, headPoint(head, 300, 0).y));
  motes(fx, t);
}

/** The bird's eye: only the stone, the lure on it, and, if you look hard, a snake. */
function topWorld(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const draw = (seed: number) => makeDraw(ctx, seed * 13 + boil * 1009, boil, 0, LINE);
  drawRock(ctx, 'top');
  topLayer ??= bakeLayer(topCoil, rockImage('top'), TOP, 1.3, 15);
  layer(ctx, topLayer, 0.74, TOP);
  const lure = lureAt(t);
  drawLure(draw(5), { ...TOP_LURE, size: 0.84, squash: 1, twitch: lure.twitch * 1.5, jolt: lure.jolt, phase: (2 * Math.PI * 73 * wrap(t)) / LOOP_S, hang: 0, tail: 0.5 });
}

/** The sad close-up: the face, and the tail brought round beside it. */
const SAD_TAIL: readonly Pt[] = [P(214, 900), P(262, 980), P(372, 1040), P(560, 1060), P(760, 1056), P(1000, 1010), P(1240, 900)];
const sadTail = spineOf(SAD_TAIL, (u) => 15 + 78 * u ** 1.1);
const SAD_NECK = spineOf([P(860, 1160), P(780, 1010), P(690, 900), P(640, 720), P(640, 620)], (u) => 96 - 26 * u);

function sadWorld(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const draw = (seed: number) => makeDraw(ctx, seed * 13 + boil * 1009, boil, 0, LINE);
  drawRock(ctx, 'dawn');
  tumbleweed(draw(7), t);
  const end = sadTail.pts.length - 1;
  paintTube(ctx, SAD_NECK, 0, SAD_NECK.pts.length - 1, { seed: 44, elevation: 0.6, phase: 0.2 });
  paintTube(ctx, sadTail, 0, end, { seed: 45, elevation: HIDE_ELEVATION, phase: 0.1 });
  inkTube(draw(3), sadTail, 0, end);
  const lure = lureAt(t);
  const tipAngle = -2.3;
  drawStub(draw(4), SAD_TAIL[0]!.x - 3, SAD_TAIL[0]!.y - 4, 16, tipAngle);
  if (lure.grow > 0.02) drawLure(draw(5), { x: 196, y: 866, size: lure.grow * 0.8, squash: 0.62, twitch: 0.5, jolt: 0, phase: wrap(t) * 12, hang: 0, tail: 1.0 });
  const head = headAt(t);
  drawSadFace(draw(6), 640, 630, 1.2, head.lid, head.sorrow, 0.5 - 0.42 * head.sorrow);
  const fx = draw(7);
  sparkles(fx, t, P(196, 866));
}

/** What the mood's light should stay clear of, on the screen. */
const focusOf = (t: number): Pt => {
  const shot = shotAt(t);
  return shot === 'top' ? P(430, 800) : shot === 'sad' ? P(560, 700) : wrap(t) >= BURST_AT && shot === 'low' ? P(520, 720) : P(520, 760);
};

export function drawWorld(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const shot = shotAt(t);
  const cam = cameraAt(t);
  const shake = shakeAt(t);
  if (shot !== 'top') {
    ctx.save();
    ctx.translate(shake.x * 0.4, shake.y * 0.4);
    drawBackdrop(ctx, t, shot === 'other' ? 'noon' : 'dawn', tiltAt(t));
    ctx.restore();
    if (shot === 'lands') flock(makeDraw(ctx, 3, boil, 0, LINE), t);
  }
  ctx.save();
  camera(ctx, cam, shake);
  if (shot === 'top') topWorld(ctx, t, boil);
  else if (shot === 'sad') sadWorld(ctx, t, boil);
  else if (shot === 'lands') landsWorld(ctx, t, boil);
  else lowWorld(ctx, t, boil, shot === 'other');
  ctx.restore();
  drawGrade(ctx, t, focusOf(t));
  flashOver(ctx, flash(t) + 0.55 * Math.max(0, 1 - Math.abs(wrap(t) - BITE_AT - 0.04) / 0.05));
}

/** The bare rock, nothing on it but a tired bird, and far away the others still flying. */
function landsWorld(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const draw = (seed: number) => makeDraw(ctx, seed * 13 + boil * 1009, boil, 0, LINE);
  drawRock(ctx, 'dawn');
  const bird = birdAt(t);
  if (bird) drawBird(draw(9), bird);
}

function drawStamp(ctx: CanvasRenderingContext2D, t: number): void {
  const a = stamp(t);
  if (a <= 0.01) return;
  const pop = 1 + 0.25 * (1 - a) ** 2;
  ctx.save();
  ctx.translate(STAMP.x, STAMP.y);
  ctx.scale(pop, pop);
  drawTextLine(ctx, STAMP.text, 0, 0, STAMP.size, 700, a, PAPER_ON_DARK);
  ctx.restore();
}

export function createSpidertail(ctx: CanvasRenderingContext2D): Short {
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    drawWorld(ctx, t, boilAt(t));
    ctx.restore();
    drawStamp(ctx, t);
    const now = captionAt(t);
    if (now) {
      drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT_ON_DARK);
    }
  };
  return { loopSeconds: LOOP_S, draw, audio: renderSpidertailAudio };
}

