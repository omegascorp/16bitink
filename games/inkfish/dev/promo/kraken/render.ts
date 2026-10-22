import { LIMBS } from '../../../src/art/squidPose';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawSnow } from '../swallower/scenery';
import { VIDEO, type Short, ramp } from '../short';
import { renderKrakenAudio } from './audio';
import { apply, freeLimb, invert, wrappedLimb } from './rig';
import {
  drawBeam, drawBlow, drawBubbles, drawChomp, drawDays, drawDaylight, drawPool, drawReadout, drawRec, drawSky, drawSub, drawSurfaceFilm, drawVignette,
  drawWater, INK_BG, PAPER_ON_INK, SPOKEN, washOf,
} from './scenery';
import { captionAt } from './script';
import { drawLimbs, drawSquidSprite, drawWideEye, enterFrame, FAR_LIMBS, makeSquidSprite, NEAR_LIMBS, type SquidSprite } from './squidDraw';
import {
  blowAt, boilAt, bubblesAt, cameraAt, chompAt, cycles, daylightAt, daysAt, diving, FOCUS, GIANT_AT, gazeAt, glintAt, jawAt, LOOP_S, metresAt, moodAt, onWhale,
  poolAt, readoutAt, SCARS, scarAt, shakeAt, skyAt, squidFrame, subAt, toScreen, type View, whaleAt, whaleFrame, wrap, wrapAt, beamAt, BEAM_REACH, SUB_LEN,
} from './story';
import { BLOWHOLE, type Pt } from './whale';
import { drawMouthInside, drawScars, drawWhaleBody, drawWhaleJawAt, makeWhaleSprite, type WhaleSprite } from './whaleArt';

/** Draws the "the Kraken is real" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
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

/** Into world px from screen px. */
function enterWorld(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(FOCUS.x - v.x * v.zoom, FOCUS.y - v.y * v.zoom);
  ctx.scale(v.zoom, v.zoom);
}

/** Every limb's path in the squid's body px: loose in the water, wrapped round the head, or between. */
function limbPaths(t: number): Pt[][] {
  const w = whaleAt(t);
  const wf = whaleFrame(w);
  const sq = squidFrame(t);
  const wrapped = wrapAt(t);
  return LIMBS.map((limb, i) => {
    const free = freeLimb(i, t, 0.85);
    if (wrapped <= 0) return free;
    const root = invert(wf, apply(sq, limb.root));
    const round = wrappedLimb(i, root, cycles(9 + i, t), 1).map((p) => invert(sq, apply(wf, p)));
    return free.map((p, k) => ({ x: p.x + (round[k]!.x - p.x) * wrapped, y: p.y + (round[k]!.y - p.y) * wrapped }));
  });
}

/** Soft shadows the near arms cast on the whale's skin as they grip it (squid body px). */
function drawLimbShadows(ctx: CanvasRenderingContext2D, paths: readonly (readonly Pt[])[], wrapped: number): void {
  if (wrapped <= 0.05) return;
  ctx.save();
  ctx.strokeStyle = `rgba(4,5,10,${(0.35 * wrapped).toFixed(3)})`;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const i of NEAR_LIMBS) {
    const path = paths[i]!;
    const half = Math.round(path.length * 0.55);
    for (const [from, to, width] of [[0, half + 1, 15], [half, path.length, 7]] as const) {
      ctx.lineWidth = width;
      ctx.beginPath();
      path.slice(from, to).forEach((p, k) => (k ? ctx.lineTo(p.x + 3, p.y + 5) : ctx.moveTo(p.x + 3, p.y + 5)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The whale and the squid, layer by layer: the far arms, the mouth, the squid's body, the jaw, the whale, its scars, the near arms, the eye. */
function drawFight(ctx: CanvasRenderingContext2D, whale: WhaleSprite, squid: SquidSprite, v: View, t: number, boil: number): void {
  const w = whaleAt(t);
  const sq = squidFrame(t);
  const paths = limbPaths(t);
  const inWhale = (fn: () => void): void => {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(-w.tilt);
    fn();
    ctx.restore();
  };
  const inSquid = (fn: () => void): void => {
    ctx.save();
    enterFrame(ctx, sq);
    fn();
    ctx.restore();
  };
  const open = jawAt(t);
  ctx.save();
  enterWorld(ctx, v);
  inSquid(() => drawLimbs(ctx, paths, FAR_LIMBS, boil));
  inWhale(() => drawMouthInside(ctx, open));
  inSquid(() => drawSquidSprite(ctx, squid, boil));
  inWhale(() => {
    drawWhaleJawAt(ctx, whale, boil, open);
    drawWhaleBody(ctx, whale, boil, w.beat, w.wag);
    drawScars(ctx, SCARS, SCARS.map((s) => scarAt(s, t)), boil, SPOKEN);
  });
  inSquid(() => {
    drawLimbShadows(ctx, paths, wrapAt(t));
    drawLimbs(ctx, paths, NEAR_LIMBS, boil);
    drawWideEye(ctx, gazeAt(t), glintAt(t), boil);
  });
  ctx.restore();
}

/** The submarine, its searchlight and its camera's viewfinder. */
function drawVisit(ctx: CanvasRenderingContext2D, v: View, t: number, boil: number): void {
  const sub = subAt(t);
  const beam = beamAt(t);
  if (!sub || !beam) return;
  drawBeam(ctx, toScreen(v, beam.from), beam.angle, BEAM_REACH * v.zoom, beam.on);
  drawSub(ctx, toScreen(v, sub), SUB_LEN * v.zoom, sub.facing, t * 40, boil);
  drawRec(ctx, toScreen(v, beam.pool), sub.rec, t);
}

export function createKraken(ctx: CanvasRenderingContext2D): Short {
  const sheet = makePaper();
  const whale = makeWhaleSprite();
  const squid = makeSquidSprite();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = cameraAt(t);
    const daylight = daylightAt(v);
    const waterline = toScreen(v, { x: 0, y: 0 }).y;
    drawWater(ctx, sheet, washOf(moodAt(t), daylight));
    drawSky(ctx, waterline);
    const w = whaleAt(t);
    drawDaylight(ctx, daylight, VIDEO.width / 2, waterline);
    drawSnow(ctx, v, t / LOOP_S, daylight);
    // The faint light on the fight: there in the fight, found on "giant squid" at the end of the dive.
    const found = diving(t) ? ramp(t, GIANT_AT - 0.3, GIANT_AT + 0.3) : 1;
    drawPool(ctx, toScreen(v, onWhale(w, { x: -40, y: 180 })), 1100 * v.zoom, poolAt(t) * found * (1 - daylight));

    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawFight(ctx, whale, squid, v, t, boil);
    drawBubbles(ctx, bubblesAt(t).map((b) => ({ ...toScreen(v, b), r: b.r * v.zoom, alpha: b.alpha })));
    const jaws = toScreen(v, onWhale(w, { x: -150, y: 215 }));
    for (const u of chompAt(t)) drawChomp(ctx, jaws, 520 * v.zoom, u);
    drawSurfaceFilm(ctx, waterline, boil, t / LOOP_S);
    const hole = toScreen(v, onWhale(w, BLOWHOLE));
    drawBlow(ctx, hole, -w.tilt - 1.1, 700 * v.zoom, blowAt(t));
    ctx.restore();

    drawVignette(ctx, 1 - 0.7 * daylight);
    drawDays(ctx, skyAt(t), daysAt(t), boil);
    drawVisit(ctx, v, t, boil);
    drawReadout(ctx, metresAt(t), readoutAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderKrakenAudio };
}
