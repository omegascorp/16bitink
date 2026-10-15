import { heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeBackdrop, makeMarks } from '../backdrop';
import { NOSE, type Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER } from '../captions';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderMorayAudio } from './audio';
import { drawCallout, drawCamera, drawMark, drawMeasure, drawRing, drawSlate, drawStamp, drawViewfinder, SPOKEN } from './marks';
import { composeMoray, drawFishOn, jawTip, texMatrix } from './moray';
import { drawWeed, holePath, makeReef, OUTSIDE_ROCK } from './scenery';
import { grouperAt, grouperPull, morayPull, snackAt, snackEatenAt } from './grouper';
import {
  arrowGrow, cameraAt, clapAt, crossAt, downArrow, jawLabel, measureAt, mostLabel, nameLabel, narrowLabel, paperLabel, recBlink, shakeAt, slateAt,
  stampAt, stampSlam, throatRing, tickAt,
} from './notes';
import {
  BITE_AT, boilAt, captionAt, chromisAlarm, chromisAt, type Fish, GRAB_AT, GULP_AT, headPoint, LOOP_S, type Moray, morayAt, secondJawAt, snapAt,
  THROAT_AT,
} from './story';

/** Draws the "Alien's second jaw is REAL" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 62;
const MEASURE_ALONG = 0.1;
const SLATE_AT = { x: 300, y: 450 } as const;

/** The spoken line, word by word, the word being said in orange. */
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
  // The loop starts a hair before the first word: it is already the one being said.
  const spoken = Math.max(0, now.word);
  words.forEach((w, i) => {
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= spoken ? 1 : 0.55, i === spoken ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

/** A ghost of a fish for the X-ray: its shape filled pale, as bone-white shadow. */
function ghostOf(sprite: Sprite): Sprite {
  const frames = sprite.frames.map((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(frame, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(214,232,255,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
  return { ...sprite, frames };
}

/** A stand-in pose whose mouth (chain.ts's mouthOf) is the moray's, `len` setting the size of the effects drawn at it. */
const mouthPose = (m: Moray, len: number): Pose => ({
  j: 0, shape: 'moray', age: 0, x: m.nose.x - NOSE * len * Math.cos(m.tilt), y: m.nose.y + 14 + NOSE * len * Math.sin(m.tilt), length: len, facing: 1, tilt: m.tilt, beat: 0, effort: 0,
});

const fishPose = (shape: 'grouper' | 'chromis', f: Fish): Pose => ({
  j: 0, shape, age: 0, x: f.x, y: f.y, length: f.len, facing: f.face < 0 ? -1 : 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

interface Assets {
  readonly backdrop: HTMLCanvasElement;
  readonly reef: HTMLCanvasElement;
  readonly layers: { readonly body: CanvasRenderingContext2D; readonly out: CanvasRenderingContext2D };
  readonly moray: Sprite;
  readonly chromis: Sprite;
  readonly ghost: Sprite;
  readonly grouper: Sprite;
}

function makeAssets(): Assets {
  const layer = (): CanvasRenderingContext2D => {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.width;
    canvas.height = VIDEO.height;
    return canvas.getContext('2d')!;
  };
  const chromis = makeSprite('chromis', 3);
  return {
    backdrop: makeBackdrop({ top: 'rgba(70,165,205,0.08)', bottom: 'rgba(40,125,170,0.3)' }),
    reef: makeReef(),
    layers: { body: layer(), out: layer() },
    // Unwaved: it lunges straight out of its hole, and the X-ray's bones follow a straight head.
    moray: makeSprite('moray', 7, 'light', { ...ANATOMY.moray, wave: 0 }),
    chromis,
    ghost: ghostOf(chromis),
    grouper: makeSprite('grouper', 4),
  };
}

export function createMoray(ctx: CanvasRenderingContext2D): Short {
  const marks = makeMarks(30, 413);
  const headH = heightAt(ANATOMY.moray, MEASURE_ALONG);
  // Built on the first frame, so the page is ready for the recorder as soon as it loads.
  let assets: Assets | null = null;

  /** The grouper, and the snack it sucks in on "most fish". */
  const drawGrouper = ({ chromis, grouper }: Assets, t: number, boil: number): void => {
    const g = grouperAt(t);
    const snack = snackAt(t);
    const eaten = snackEatenAt(t);
    if (snack && eaten === null) drawFishOn(ctx, chromis, snack, boil);
    if (!g) return;
    const look = { jaw: g.jaw, ...(g.lump > 0 ? { lump: { size: g.lump, at: 0.35 } } : {}) };
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.scale(g.face, 1);
    const local: Pose = { ...fishPose('grouper', g), x: 0, y: 0, facing: 1 };
    if (eaten !== null && snack) {
      const pose = fishPose('grouper', g);
      ctx.restore();
      drawSwimmer(ctx, grouper, pose, boil, { ...look, part: 'mouth' });
      const [prey, shape] = suckedIn(fishPose('chromis', snack), pose, eaten);
      drawSwimmer(ctx, chromis, prey, boil, shape);
      drawSwimmer(ctx, grouper, pose, boil, { ...look, part: 'body' });
    } else {
      drawSwimmer(ctx, grouper, local, boil, look);
      ctx.restore();
    }
    if (Math.abs(g.face) > 0.99) {
      const pose = fishPose('grouper', g);
      drawSuction(ctx, pose, grouperPull(t), t / 3);
      drawChomp(ctx, pose, (t - GULP_AT) / 0.16);
    }
  };

  const draw = (seconds: number): void => {
    assets ??= makeAssets();
    const { backdrop, reef, layers, moray, chromis, ghost } = assets;
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const m = morayAt(t);
    const jaw = secondJawAt(t);
    const prey = chromisAt(t);
    const held = prey !== null && t >= BITE_AT;

    ctx.drawImage(backdrop, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    ctx.drawImage(reef, 0, 0);
    drawWeed(ctx, t);
    drawGrouper(assets, t, boil);

    // The moray: out in the water, and darker in the mouth of its crevice.
    composeMoray(layers, moray, m, jaw, boil, held ? { sprite: chromis, ghost, fish: prey } : null, arrowGrow(t) * downArrow(t));
    ctx.save();
    ctx.clip(OUTSIDE_ROCK, 'evenodd');
    ctx.drawImage(layers.out.canvas, 0, 0);
    ctx.restore();
    ctx.save();
    holePath(ctx);
    ctx.clip();
    ctx.drawImage(layers.out.canvas, 0, 0);
    ctx.fillStyle = 'rgba(20,16,18,0.55)';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
    if (prey && !held) drawFishOn(ctx, chromis, prey, boil);
    const pull = morayPull(t);
    if (pull > 0) drawSuction(ctx, mouthPose(m, 520), pull, t / 3);
    const alarm = chromisAlarm(t);
    if (alarm > 0 && prey) drawExclaim(ctx, prey.x + 10, prey.y - 105, 110 * alarm, 0.12);
    for (const at of [BITE_AT, GRAB_AT]) {
      const u = snapAt(t, at) * 1.6;
      if (u >= 0 && u <= 1) drawChomp(ctx, mouthPose(m, 900), u);
    }
    ctx.restore();

    // Notes.
    const S = texMatrix(m);
    const tip = S.transformPoint(jawTip(jaw));
    drawRing(ctx, { x: tip.x - 40, y: tip.y }, 110, 70, (t - THROAT_AT + 0.1) / 0.4, throatRing(t));
    drawCallout(ctx, 'second jaw', { x: 560, y: 600 }, { x: tip.x - 25, y: tip.y - 8 }, jawLabel(t), LABEL_SIZE);
    drawCallout(ctx, 'moray eel', { x: 820, y: 1020 }, null, nameLabel(t), 72);
    drawMeasure(ctx, headPoint(m, MEASURE_ALONG, -headH * 1.18), headPoint(m, MEASURE_ALONG, headH * 1.05), measureAt(t));
    drawCallout(ctx, 'narrow head', { x: 770, y: 1020 }, null, narrowLabel(t), LABEL_SIZE);
    drawMark(ctx, 'cross', { x: 980, y: 995 }, 80, crossAt(t));
    drawMark(ctx, 'tick', { x: 470, y: 330 }, 80, tickAt(t));
    drawCallout(ctx, 'most fish: suck it in', { x: 720, y: 345 }, null, mostLabel(t), 56);
    drawSlate(ctx, SLATE_AT, slateAt(t), clapAt(t));
    const cam = cameraAt(t);
    drawViewfinder(ctx, 370, 610, 980, 1000, cam, recBlink(t));
    drawCamera(ctx, { x: 840, y: 470 }, cam, t * 9);
    drawStamp(ctx, { x: 330, y: 440 }, '2007', stampAt(t), stampSlam(t));
    drawCallout(ctx, 'Mehta & Wainwright, Nature', { x: 360, y: 560 }, null, paperLabel(t), 46);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderMorayAudio };
}
