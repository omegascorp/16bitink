import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import type { Pose } from '../chain';
import { drawBubbles, drawChomp, drawSuction } from '../goliath/effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderFrogfishAudio } from './audio';
import { clipToMouth, drawFrogBack, drawFrogFront, type FrogDraw, type FrogSprites, makeFrogSprites } from './frogArt';
import {
  drawDecorPieces, drawFarReef, drawFlash, drawGrade, drawIris, drawLids, drawPiece, drawSand, drawSpecks, drawWater, drawWhistle, INK_BG, makeReef,
  PAPER_ON_INK, SPOKEN,
} from './scenery';
import { captionAt } from './script';
import {
  boilAt, bubblesAt, type Camera, cameraAt, chompAt, chromisAt, faceAt, flashAt, type Frog, frogAt, frogFrame, FROG_LEN, frogLookAt, irisAt, K, lidsAt, LOOP_S,
  mouthAt, needleAt, onFrog, rodAt, slowClock, suctionAt, type Swimmer, toScreen, whistleAt, wrasseAt,
} from './story';

/** Draws the "this fish eats faster than you can BLINK" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
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

/** Runs `draw` in the frog's frame (fp, its body's middle at the origin). */
function inFrog(ctx: CanvasRenderingContext2D, f: Frog, cam: Camera, draw: () => void): void {
  const frame = frogFrame(f);
  const at = toScreen(cam, frame.origin);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(frame.rotation);
  ctx.scale(K * cam.zoom, K * cam.zoom);
  draw();
  ctx.restore();
}

/** Sets a clip drawn in the frog's frame, leaving the transform as it was (call inside save/restore). */
function clipInFrog(ctx: CanvasRenderingContext2D, f: Frog, cam: Camera, clip: () => void): void {
  const before = ctx.getTransform();
  const frame = frogFrame(f);
  const at = toScreen(cam, frame.origin);
  ctx.translate(at.x, at.y);
  ctx.rotate(frame.rotation);
  ctx.scale(K * cam.zoom, K * cam.zoom);
  clip();
  ctx.setTransform(before);
}

function poseOf(s: Swimmer, cam: Camera): Pose {
  const at = toScreen(cam, s);
  return { j: 0, age: 0, shape: s.shape, x: at.x, y: at.y, length: s.length * cam.zoom, facing: s.facing, tilt: s.tilt, beat: s.beat, effort: s.effort };
}

interface Cast {
  readonly frog: FrogSprites;
  readonly chromis: Sprite;
  readonly wrasse: Sprite;
  readonly needlefish: Sprite;
}

function drawFish(ctx: CanvasRenderingContext2D, cast: Cast, s: Swimmer, cam: Camera, boil: number): void {
  const sprite = s.shape === 'chromis' ? cast.chromis : s.shape === 'wrasse' ? cast.wrasse : cast.needlefish;
  drawSwimmer(ctx, sprite, poseOf(s, cam), boil, { squash: s.squash, stretch: s.stretch });
}

export function createFrogfish(ctx: CanvasRenderingContext2D): Short {
  const cast: Cast = {
    frog: makeFrogSprites(),
    chromis: makeSprite('chromis', 3),
    wrasse: makeSprite('wrasse', 3),
    needlefish: makeSprite('needlefish', 4),
  };
  const reef = makeReef();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const f = frogAt(t);
    const fish = [chromisAt(t), wrasseAt(t), needleAt(t)].filter((s): s is Swimmer => s !== null);
    const free = fish.filter((s) => !s.inMouth);
    const going = fish.filter((s) => s.inMouth);
    const prey = free[0] ?? going[0] ?? null;
    const d: FrogDraw = { look: frogLookAt(t), face: faceAt(t, prey), rod: rodAt(t), boil };

    drawWater(ctx, cam, t);
    drawFarReef(ctx, cam, t);
    drawDecorPieces(ctx, cam, reef);
    drawSand(ctx, cam, t);
    for (const p of reef.behind) drawPiece(ctx, cam, p, boil);
    drawPiece(ctx, cam, reef.rock, boil);

    // The frog, with whatever is going into its mouth between its back and front.
    inFrog(ctx, f, cam, () => drawFrogBack(ctx, cast.frog, d));
    for (const s of going) {
      ctx.save();
      clipInFrog(ctx, f, cam, () => clipToMouth(ctx, d.look));
      drawFish(ctx, cast, s, cam, boil);
      ctx.restore();
    }
    inFrog(ctx, f, cam, () => drawFrogFront(ctx, cast.frog, d));
    for (const s of free) drawFish(ctx, cast, s, cam, boil);
    for (const p of reef.front) drawPiece(ctx, cam, p, boil);

    // Water rushing in, the snap, bubbles, the whistle.
    const m = mouthAt(t);
    const mouth = toScreen(cam, m.at);
    // Twice over, offset: the streaks read stronger than the game's faint ones.
    for (const k of [0, 0.37]) drawSuction(ctx, mouth, m.heading, FROG_LEN * cam.zoom * 1.15, suctionAt(t), slowClock(t) / 3 + k);
    drawChomp(ctx, mouth, m.heading, FROG_LEN * cam.zoom, chompAt(t));
    drawBubbles(ctx, cam, bubblesAt(t));
    const whistle = whistleAt(t);
    if (whistle !== null) drawWhistle(ctx, toScreen(cam, onFrog(f, { x: 30, y: -112 })), whistle, 62 * cam.zoom);
    drawSpecks(ctx, t);

    drawGrade(ctx, t);
    drawIris(ctx, toScreen(cam, onFrog(f, { x: 120, y: -50 })), irisAt(t));
    drawFlash(ctx, flashAt(t));
    drawLids(ctx, lidsAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderFrogfishAudio };
}
