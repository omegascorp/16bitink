import type { FishShape } from '../../../src/art/fishArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Pose } from '../chain';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { drawChomp, drawExclaim, drawSuction, suckedIn } from '../effects';
import { ramp, VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { renderTreesAudio } from './audio';
import { makeBroadleaf, makeConifer, makeFirstTree, makeRex, makeSauropod, makeTuft, type Prop } from './plants';
import {
  apexLabel, bracketDrawn, bracketShown, captionAt, dinosLabel, firstSharksLabel, firstTreesLabel, hookTags, momentLit, nowAt, readoutAt, survivedLabel, windingAt,
  yearAt, yearText,
} from './script';
import { drawAsteroid, drawBracket, drawCallout, drawCheck, drawFlash, drawHiker, drawImpactCloud, drawShockwave, drawWinding } from './sky';
import {
  alarmAt, asteroidAt, boilAt, camAt, camRate, chompAt, DINOS, dinoFall, eatenAt, FIRST_TREE, type Fish, hikerAt, IMPACT_MYR, LOOP_S, MID_X, preyAt, PX_PER_MYR,
  screenX, shakeAt, sharkAt, sinceImpact, suctionAt, treeGrowth,
} from './story';
import { drawLand, drawProp, drawRuler, drawSeaMarks, edgeAt, makeBackdrop, MARK, PLANTS, type Plant, SHORE_Y } from './world';

/** Draws the "sharks are older than trees" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: MARK, halo: PAPER };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const READOUT_Y = 330;
const LABEL_SIZE = 58;
/** Plants stand this far down the bank from its top edge. */
const ROOTS = 14;
const HIKER_SCALE = 1.45;
/** An early shark's silhouette: slate ink. */
const EARLY_INK = '#3b4350';

/** A fish as drawSwimmer wants it, facing squarely one way. */
const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: f.x, y: f.y, length: f.len, facing: f.face < 0 ? -1 : 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/** Draws a fish part-way through a turn: squeezed edge-on about its middle. */
function drawTurning(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook): void {
  if (Math.abs(f.face) < 0.01) return;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, { ...poseOf(shape, f), x: 0, y: 0, facing: 1 }, boil, look);
  ctx.restore();
}

/** The fish's drawing filled solid in one colour: the early shark is a shadow of the one we know. */
function silhouette(sprite: Sprite, colour: string): Sprite {
  const frames = sprite.frames.map((frame) => {
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(frame, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
  return { ...sprite, frames };
}

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

/** "450 million years ago" across the top, with the tape-deck arrows while the years roll. */
function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const shown = readoutAt(t);
  if (shown <= 0) return;
  const text = yearText(yearAt(t));
  drawTextLine(ctx, text, VIDEO.width / 2, READOUT_Y, 92, 700, shown);
  ctx.save();
  ctx.font = `700 92px ${CAPTION_FONT}`;
  const half = ctx.measureText(text).width / 2;
  ctx.restore();
  drawWinding(ctx, VIDEO.width / 2 - half - 70, READOUT_Y - 30, windingAt(t), shown);
}

/** "older ✓" over the shark in the hook. */
function drawOlder(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, alpha: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, 'older', at.x - 30, at.y, LABEL_SIZE + 6, 700, alpha, SPOKEN);
  drawCheck(ctx, at.x + 65, at.y - 18, 46, alpha);
}

export function createTrees(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  const shark = makeSprite('shark', 4, 'heavy');
  const early = silhouette(shark, EARLY_INK);
  const mackerel = makeSprite('mackerel', 2);
  const first = makeFirstTree(390);
  const broad = [makeBroadleaf(11), makeBroadleaf(12), makeBroadleaf(13)];
  const conifer = [makeConifer(21), makeConifer(22), makeConifer(23)];
  const tuft = [makeTuft(31), makeTuft(32), makeTuft(33)];
  const dinos = { sauropod: makeSauropod(41), rex: makeRex(42) };
  const propOf = (p: Plant): Prop =>
    p.kind === 'first' ? first : p.kind === 'broad' ? broad[p.variant]! : p.kind === 'conifer' ? conifer[p.variant]! : tuft[p.variant]!;

  const drawShark = (s: Fish, t: number, boil: number): void => {
    const pose = poseOf('shark', s);
    const look: SwimLook = { jaw: s.jaw, ...(s.lump > 0 ? { lump: { size: s.lump, at: 0.35 } } : {}) };
    if (Math.abs(s.face) < 1) {
      drawTurning(ctx, shark, 'shark', s, boil, look);
      return;
    }
    if (s.ink < 1) drawSwimmer(ctx, early, pose, boil, { ...look, alpha: 1 - s.ink });
    if (s.ink <= 0) return;
    const prey = preyAt(t);
    const eaten = eatenAt(t);
    if (eaten !== null && prey) {
      drawSwimmer(ctx, shark, pose, boil, { ...look, alpha: s.ink, part: 'mouth' });
      const [p, shape] = suckedIn(poseOf('mackerel', prey), pose, eaten);
      drawSwimmer(ctx, mackerel, p, boil, shape);
      drawSwimmer(ctx, shark, pose, boil, { ...look, alpha: s.ink, part: 'body' });
    } else {
      drawSwimmer(ctx, shark, pose, boil, { ...look, alpha: s.ink });
    }
    drawSuction(ctx, pose, suctionAt(t), t / 3);
    drawChomp(ctx, pose, chompAt(t));
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = camAt(t);
    const jolt = shakeAt(t);
    ctx.drawImage(backdrop, 0, 0);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);

    // The sky: the asteroid falling, and its cloud rising from behind the land.
    const impact = { x: screenX(IMPACT_MYR, cam), y: edgeAt(IMPACT_MYR) - 6 };
    const since = sinceImpact(t);
    if (since !== null) drawImpactCloud(ctx, impact, since);
    const falling = asteroidAt(t);
    if (falling !== null) drawAsteroid(ctx, impact, falling);

    // The land, and everything standing on it.
    drawLand(ctx, cam, t);
    if (since !== null) drawShockwave(ctx, impact, since);
    for (const p of PLANTS) {
      const x = screenX(p.myr, cam);
      if (x < -200 || x > VIDEO.width + 200) continue;
      drawProp(ctx, propOf(p), boil, x, edgeAt(p.myr) + ROOTS + p.dy, p.scale, { grow: p.kind === 'first' ? treeGrowth(t) : 1 });
    }
    // The dinosaurs slump over and sink away into the land as they fade.
    const fall = dinoFall(t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-50, 0, VIDEO.width + 100, SHORE_Y - 6);
    ctx.clip();
    for (const d of DINOS) {
      const x = screenX(d.myr, cam);
      if (fall >= 1 || x < -250 || x > VIDEO.width + 250) continue;
      drawProp(ctx, dinos[d.kind], boil, x, edgeAt(d.myr) + ROOTS + 4 + 90 * fall ** 1.5, 1, { tilt: -0.55 * fall, alpha: 1 - ramp(fall, 0.45, 1) });
    }
    ctx.restore();
    const hiker = hikerAt(t);
    if (hiker) drawHiker(ctx, hiker.x, edgeAt(cam - (hiker.x - MID_X) / PX_PER_MYR) + ROOTS + 8, hiker.step, HIKER_SCALE);

    // The sea.
    drawSeaMarks(ctx, cam, camRate(t), t);
    const prey = preyAt(t);
    if (prey && eatenAt(t) === null) drawSwimmer(ctx, mackerel, poseOf('mackerel', prey), boil);
    const s = sharkAt(t);
    drawShark(s, t, boil);
    const pop = alarmAt(t);
    if (pop > 0 && prey) drawExclaim(ctx, prey.x + 10, prey.y - 95, 100 * pop, 0.12);

    drawRuler(ctx, cam, nowAt(t), (m) => momentLit(m, t));
    drawBracket(ctx, screenX(450, cam), screenX(FIRST_TREE, cam), bracketDrawn(t), '60 million years', bracketShown(t));
    ctx.restore();

    // Notes.
    const write = (text: string, at: { x: number; y: number }, to: { x: number; y: number } | null, alpha: number, colours: TextInk = INK_ON_PAPER): void =>
      drawCallout(ctx, text, at, to, alpha, LABEL_SIZE, colours);
    const tagX = (x: number): number => Math.max(300, Math.min(780, x));
    // Over the shark, clear of its dorsal fin.
    const over = { x: tagX(s.x), y: s.y - 0.29 * s.len - 20 };
    drawOlder(ctx, over, hookTags(t));
    write('first sharks', over, null, firstSharksLabel(t), SPOKEN);
    write('survived!', over, null, survivedLabel(t), SPOKEN);
    write('apex predator', over, null, apexLabel(t), SPOKEN);
    // The hook as a comparison, up where the readout goes later.
    drawTextLine(ctx, 'sharks: 450 million years', VIDEO.width / 2, 300, 72, 700, hookTags(t), SPOKEN);
    drawTextLine(ctx, 'trees: 390 million years', VIDEO.width / 2, 376, 72, 700, hookTags(t));
    const firstTree = screenX(FIRST_TREE, cam);
    write('first trees', { x: firstTree - 250, y: 480 }, { x: firstTree - 70, y: 540 }, firstTreesLabel(t), SPOKEN);
    write('dinosaurs', { x: (screenX(DINOS[0]!.myr, cam) + screenX(DINOS[1]!.myr, cam)) / 2, y: 440 }, null, dinosLabel(t));
    drawReadout(ctx, t);
    if (since !== null) drawFlash(ctx, since);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderTreesAudio };
}
