import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderWreckfishAudio } from './audio';
import { type Cast, drawMurky, makeCast } from './cast';
import { drawDescent, drawReadout, makeRov } from './descent';
import { drawAlarm, drawBoing, drawChomp, drawShiver, drawSuction } from './effects';
import { drawEye } from './eye';
import { drawDeepWater, drawFalloff, drawGrade, drawRock, INK_BG, makeRock, PAPER_ON_INK, SPOKEN } from './scene';
import { captionAt, TEXT } from './script';
import { makeSheet } from './sea';
import {
  ALARMED, alarmAt, boilAt, boingsAt, bumpAt, cameraAt, chompsAt, frozenAt, gazeAt, gradeAt, jawDrawnAt, LOOP_S, murkAt, NOSERS, noserAt, popAt, poseOn, type SceneId,
  sceneAt, shakeAt, shark0At, sharkDepthAt, suctionAt, swordAt, toScreen, type View, wrap, wreckAt,
} from './story';
import { clipBeyondLips, clipToMouth, drawSwimmer, mouthOf, type SwimLook } from './swimmer';

/** Draws the "this fish swallowed a whole shark" short (story.ts has the choreography). */

/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${TEXT.caption.size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, TEXT.caption.size * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** Shark k: 0 the one that gets eaten, 1.. the others nosing the swordfish. */
const sharkFish = (k: number, t: number): ReturnType<typeof shark0At> => (k === 0 ? shark0At(t) : noserAt(k - 1, t));

/** A nosing shark, popped in to `pop` of its size. */
function drawNoser(ctx: CanvasRenderingContext2D, cast: Cast, v: View, i: number, t: number, boil: number): void {
  const pop = popAt(i + 1, t);
  if (pop <= 0.01) return;
  const f = noserAt(i, t);
  const pose = poseOn(v, { ...f, length: f.length * pop }, 'shark');
  drawMurky(ctx, cast, cast.shark, pose, boil, { alpha: Math.min(1, pop * 2) }, NOSERS[i]!.far);
}

/** The shark darkening as it goes into the mouth: shade fading out from the lips along the wreckfish's heading. */
function drawThroatShade(ctx: CanvasRenderingContext2D, w: ReturnType<typeof poseOn>, jaw: number, sharkLength: number): void {
  const m = mouthOf(w, jaw);
  const d = { x: Math.cos(w.tilt), y: -Math.sin(w.tilt) };
  const back = { x: m.x - d.x * m.gap * 0.4, y: m.y - d.y * m.gap * 0.4 };
  const out = { x: m.x + d.x * sharkLength * 0.22, y: m.y + d.y * sharkLength * 0.22 };
  const g = ctx.createLinearGradient(back.x, back.y, out.x, out.y);
  g.addColorStop(0, 'rgba(18,8,10,0.92)');
  g.addColorStop(0.45, 'rgba(18,8,10,0.45)');
  g.addColorStop(1, 'rgba(18,8,10,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

function drawDeep(ctx: CanvasRenderingContext2D, cast: Cast, sheet: HTMLCanvasElement, rock: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const v = cameraAt(t);
  drawDeepWater(ctx, sheet, v, t);
  const jolt = shakeAt(t);
  ctx.save();
  ctx.translate(jolt.x, jolt.y);
  drawRock(ctx, rock, v, boil);

  // The sharks far back in the dark, the swordfish, the near sharks.
  NOSERS.forEach((n, i) => n.far > 0.3 && drawNoser(ctx, cast, v, i, t, boil));
  const sword = swordAt(t);
  drawSwimmer(ctx, cast.sword, poseOn(v, { ...sword, facing: 1, beat: 0, effort: 0 }, 'swordfish'), boil);
  NOSERS.forEach((n, i) => n.far <= 0.3 && drawNoser(ctx, cast, v, i, t, boil));

  // The wreckfish, and shark 0: in its mouth (clipped to the gape) or swimming free.
  const murk = murkAt(t);
  const bump = bumpAt(t);
  const w = poseOn(v, wreckAt(t), 'grouper');
  const look: SwimLook = { jaw: jawDrawnAt(t), squash: 1 - 0.08 * bump, stretch: 1 + 0.05 * bump };
  const shark = poseOn(v, shark0At(t), 'shark');
  const pop0 = popAt(0, t);
  const s0 = { ...shark, length: shark.length * pop0 };
  if (sharkDepthAt(t) > -1) {
    drawSwimmer(ctx, cast.wreck, w, boil, { ...look, part: 'mouth' });
    // Inside the mouth only a dim shape of the shark, deep in the throat's shadow; past the lips, all of it.
    ctx.save();
    clipToMouth(ctx, cast.wreck, w, look);
    drawSwimmer(ctx, cast.eaten, s0, boil, { alpha: 0.16 });
    ctx.restore();
    // The shark in its own layer, shaded towards the lips, then only the part past them.
    const layer = cast.layer;
    layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
    drawSwimmer(layer, cast.eaten, s0, boil);
    drawThroatShade(layer, w, look.jaw ?? 0, s0.length);
    ctx.save();
    clipBeyondLips(ctx, cast.wreck, w, look);
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
    drawSwimmer(ctx, cast.wreck, w, boil, { ...look, part: 'body' });
  } else {
    drawMurky(ctx, cast, cast.wreck, w, boil, look, murk);
    if (pop0 > 0.01) drawSwimmer(ctx, cast.eaten, s0, boil, { alpha: Math.min(1, pop0 * 2) });
  }
  drawEye(ctx, w, look, gazeAt(t), murk < 0.995 ? Math.min(1, 4 * (1 - murk)) : 0);

  // Chalk: the suction, the snap, the boing, the shiver.
  const m = mouthOf(w, look.jaw ?? 0);
  drawSuction(ctx, m, -w.tilt, w.length, suctionAt(t), t / 3);
  for (const u of chompsAt(t)) drawChomp(ctx, m, -w.tilt, w.length * 0.8, u);
  for (const u of boingsAt(t)) drawBoing(ctx, { x: m.x + 30 * v.zoom, y: m.y + 60 * v.zoom }, 230 * v.zoom, u);
  drawShiver(ctx, { x: shark.x, y: shark.y }, shark.length, frozenAt(t), t);
  ctx.restore();

  drawFalloff(ctx);
  drawGrade(ctx, gradeAt(t));

  // The "!"s over the sharks as the wreckfish shows up.
  const alarm = alarmAt(t);
  if (alarm > 0) {
    for (const k of ALARMED) {
      const f = sharkFish(k, t);
      const p = toScreen(v, f);
      const y = Math.min(TEXT.alarm.bottom, Math.max(TEXT.alarm.top, p.y - 0.28 * f.length * v.zoom));
      drawAlarm(ctx, { x: p.x + jolt.x, y: y + jolt.y }, TEXT.alarm.size, alarm);
    }
  }
}

export function createWreckfish(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const cast = makeCast();
  const rock = makeRock();
  const rov = makeRov();
  const other = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'deep') drawDeep(c, cast, sheet, rock, t, boil);
    else drawDescent(c, sheet, rov, t, boil);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const now = sceneAt(t);
    drawScene(ctx, now.a, t, boil);
    if (now.b && now.mix > 0) {
      drawScene(other.ctx, now.b, t, boil);
      ctx.save();
      ctx.globalAlpha = now.mix;
      ctx.drawImage(other.canvas, 0, 0);
      ctx.restore();
    }
    drawReadout(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderWreckfishAudio };
}
