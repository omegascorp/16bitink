import type { FishShape } from '../../../src/art/fishArt';
import { PAPER, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawMarks, makeMarks } from '../backdrop';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER } from '../captions';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderGrouperAudio } from './audio';
import { drawDogInset, makeDog } from './dog';
import { drawArrow, drawBubble, drawCallout, drawRing, drawShakeLines, drawStruck, SPOKEN } from './marks';
import { mid, ENTRANCE, SPOT } from './place';
import { crackPath, drawWeed, holePath, makeReef, rockPath, waterPath } from './reef';
import {
  arrowAt, arrowDrawn, bubbleAt, captionAt, coralLabel, crackLabel, dogAt, dumbAt, grouperLabel, headstandLabel, lunchLabel, morayLabel, pointingLabel,
  preyLabel, shakeLines, spotLabel, spotRing, spotRingDrawn, strikeAt,
} from './script';
import {
  alarmAt, boilAt, chompAt, chromisAt, eatenAt, type Fish, grouperAt, LOOP_S, morayAt, noseOf, shakeAt, suctionAt,
} from './story';

/** Draws the "fish can point" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 64;
/** The insides of the hole and the crack: whatever is in there is seen darkly. */
const SHADE = 'rgba(20,16,18,0.55)';
const DOG_AT = { x: 250, y: 450, r: 150 } as const;

/** A fish as drawSwimmer wants it, facing squarely one way. */
const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: f.x, y: f.y, length: f.len, facing: f.face < 0 ? -1 : 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** Draws a fish turned by its `face` (squeezed edge-on through a turn). */
function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook = {}): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, { ...poseOf(shape, f), x: 0, y: 0, facing: 1 }, boil, look);
  ctx.restore();
}

/** A point `along` body lengths ahead of a fish's middle, on its axis. */
const ahead = (f: Fish, along: number): Pt => ({ x: f.x + Math.sign(f.face) * Math.cos(f.tilt) * along * f.len, y: f.y - Math.sin(f.tilt) * along * f.len });

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

interface Assets {
  readonly reef: readonly HTMLCanvasElement[];
  readonly dog: readonly HTMLCanvasElement[];
  readonly layer: CanvasRenderingContext2D;
  readonly grouper: Sprite;
  readonly moray: Sprite;
  readonly chromis: Sprite;
  readonly water: Path2D;
  readonly rock: Path2D;
  readonly hole: Path2D;
  readonly crack: Path2D;
}

function makeAssets(): Assets {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  return {
    reef: makeReef(),
    dog: makeDog(),
    layer: canvas.getContext('2d')!,
    // The predator's darker ink: the hero fish has the most contrast in frame.
    grouper: makeSprite('grouper', 5, 'heavy'),
    moray: makeSprite('moray', 5),
    chromis: makeSprite('chromis', 2),
    water: waterPath(),
    rock: rockPath(),
    hole: holePath(),
    crack: crackPath(),
  };
}

export function createGrouper(ctx: CanvasRenderingContext2D): Short {
  const marks = makeMarks(26, 2006);
  // Built on the first frame, so the page is ready for the recorder as soon as it loads.
  let assets: Assets | null = null;

  /** The moray and the chromis: in the water, or darkly in the hole or the crack, never through the rock. */
  const drawHidden = (a: Assets, t: number, boil: number): void => {
    const { layer } = a;
    layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
    drawFishAt(layer, a.moray, 'moray', morayAt(t), boil);
    const c = chromisAt(t);
    if (c && eatenAt(t) === null) drawFishAt(layer, a.chromis, 'chromis', c, boil);
    const insides: readonly (readonly Path2D[])[] = [[a.rock, a.hole], [a.crack]];
    ctx.save();
    ctx.clip(a.water, 'evenodd');
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
    for (const clips of insides) {
      ctx.save();
      for (const clip of clips) ctx.clip(clip);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.fillStyle = SHADE;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.restore();
    }
  };

  /** The grouper, and the chromis it sucks in on "lunch". */
  const drawGrouper = (a: Assets, g: Fish, t: number, boil: number): void => {
    const look: SwimLook = { jaw: g.jaw, ...(g.lump > 0 ? { lump: { size: g.lump, at: 0.35 } } : {}) };
    const c = chromisAt(t);
    const eaten = eatenAt(t);
    const pose = poseOf('grouper', g);
    if (eaten !== null && c && Math.abs(g.face) >= 1) {
      drawSwimmer(ctx, a.grouper, pose, boil, { ...look, part: 'mouth' });
      const [p, shape] = suckedIn(poseOf('chromis', c), pose, eaten);
      drawSwimmer(ctx, a.chromis, p, boil, shape);
      drawSwimmer(ctx, a.grouper, pose, boil, { ...look, part: 'body' });
    } else {
      drawFishAt(ctx, a.grouper, 'grouper', g, boil, look);
    }
    if (Math.abs(g.face) >= 1) {
      drawSuction(ctx, pose, suctionAt(t), t / 3);
      drawChomp(ctx, pose, chompAt(t));
    }
  };

  /** The notes over the reef. */
  const drawNotes = (a: Assets, g: Fish, t: number, boil: number): void => {
    const nose = noseOf(g);
    drawArrow(ctx, { x: nose.x + 4, y: nose.y + 22 }, { x: SPOT.x, y: SPOT.y - 34 }, arrowDrawn(t), arrowAt(t));
    drawRing(ctx, SPOT, 78, 46, spotRingDrawn(t), spotRing(t));
    drawCallout(ctx, 'hiding spot', { x: 600, y: 1112 }, { x: 764, y: 1060 }, spotLabel(t), 60);
    // Beside the arrow's shaft, on its left.
    drawCallout(ctx, 'pointing', { x: (nose.x + SPOT.x) / 2 - 140, y: (nose.y + SPOT.y) / 2 + 28 }, null, pointingLabel(t), 76, SPOKEN);
    drawCallout(ctx, 'headstand!', { x: 480, y: 600 }, null, headstandLabel(t), 76, SPOKEN);
    const c = chromisAt(t);
    if (c) drawCallout(ctx, 'prey', { x: c.x, y: c.y - 62 }, null, preyLabel(t), LABEL_SIZE);
    drawCallout(ctx, 'coral', { x: 470, y: 1096 }, { x: 452, y: 1000 }, coralLabel(t), LABEL_SIZE);
    drawCallout(ctx, 'grouper', { x: g.x, y: g.y - 150 }, null, grouperLabel(t), 72);
    drawCallout(ctx, 'moray eel', { x: 400, y: 1084 }, { x: 330, y: 925 }, morayLabel(t), LABEL_SIZE);
    const entrance = mid(ENTRANCE);
    drawCallout(ctx, 'crack', { x: 545, y: 1096 }, { x: entrance.x - 20, y: entrance.y + 20 }, crackLabel(t), LABEL_SIZE);
    drawCallout(ctx, 'lunch!', { x: 700, y: 560 }, null, lunchLabel(t), 80, SPOKEN);
    drawShakeLines(ctx, ahead(g, 0.3), g.len, shakeLines(t), shakeAt(t));
    drawBubble(ctx, { x: 470, y: 540 }, ahead(g, 0.42), "let's hunt", bubbleAt(t));
    drawDogInset(ctx, a.dog, boil, DOG_AT, DOG_AT.r, dogAt(t));
    drawStruck(ctx, 'dumb?', { x: 540, y: 440 }, 130, dumbAt(t), strikeAt(t));
  };

  const draw = (seconds: number): void => {
    assets ??= makeAssets();
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.drawImage(assets.reef[boil]!, 0, 0);
    drawMarks(ctx, marks, t / LOOP_S);
    drawWeed(ctx, t);
    drawHidden(assets, t, boil);
    const g = grouperAt(t);
    drawGrouper(assets, g, t, boil);
    const pop = alarmAt(t);
    const c = chromisAt(t);
    if (pop > 0 && c) drawExclaim(ctx, c.x - 6, c.y - 78, 92 * pop, -0.12);
    drawNotes(assets, g, t, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGrouperAudio };
}
