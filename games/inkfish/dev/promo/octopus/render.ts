import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { makePaper } from '../backdrop';
import { VIDEO, type Short } from '../short';
import { renderOctopusAudio } from './audio';
import { drawBeakScene } from './beak';
import { makeDogfish } from './dogfish';
import { drawEyeScene } from './eye';
import { drawKeeperScene } from './keeper';
import { CAPTION_SIZE, CAPTION_Y, captionAt, dogfishLabels } from './script';
import { countAlpha, countSpot, drawSea, seaAt, seaZoom, WRAP_ORDER, wrapOf } from './sea';
import { boilAt, EATING_AT, flashAt, hookClock, LOOP_S, punchAt, sceneAt, shakeAt } from './story';
import { drawTank, toScreen } from './tank';
import { GRAB, lookAt, lungeAt } from './tankStory';
import { bubbleBurst, drawBubbles, drawBurst, drawGrade, INK_BG } from './water';

/** Draws the "this octopus eats sharks" short (story.ts has the beats). */

/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };

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

/** The count, 1 to 8, written beside each arm as it wraps, popping in. */
function drawCount(ctx: CanvasRenderingContext2D, s: ReturnType<typeof seaAt>, t: number): void {
  const alpha = countAlpha(t);
  WRAP_ORDER.forEach((i, k) => {
    const u = wrapOf(i, t);
    if (u <= 0.15) return;
    const pop = Math.min(1, (u - 0.15) / 0.3);
    const size = 92 * (pop < 1 ? 0.6 + 0.55 * pop : 1);
    const at = countSpot(s, i);
    drawTextLine(ctx, String(k + 1), at.x, at.y, size, 700, alpha * pop, { fill: k === 7 ? SPOKEN : '#f4eddc', halo: INK_BG });
  });
}

export function createOctopus(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();
  const dogfish = makeDogfish();

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t);
    const { scene } = sceneAt(t);
    const jolt = shakeAt(t);
    const punch = punchAt(t) * (scene === 'sea' ? seaZoom(hookClock(t)) : 1);
    ctx.save();
    ctx.translate(VIDEO.width / 2 + jolt.x, 800 + jolt.y);
    ctx.scale(punch, punch);
    ctx.translate(-VIDEO.width / 2, -800);
    if (scene === 'sea' || scene === 'count') {
      const h = hookClock(t);
      const count = scene === 'count';
      const s = seaAt(t, h, count);
      drawSea(ctx, paper, dogfish, s, t, h, boil, count);
      if (count) drawCount(ctx, s, t);
    } else if (scene === 'tank' || scene === 'lunge') {
      const s = scene === 'tank' ? lookAt(t) : lungeAt(t);
      drawTank(ctx, dogfish, s, t, boil);
      if (scene === 'lunge') {
        // The strike: action lines and a burst of bubbles where it lands.
        const g = toScreen(s.cam, GRAB);
        drawBubbles(ctx, bubbleBurst(g, t - (EATING_AT + 0.05), 16, 909, 260, 14));
        drawBurst(ctx, g, (t - (EATING_AT + 0.05)) / 0.35, 230, 420, '#f3e3c8', 11);
        drawGrade(ctx, '#1a0608', 0.18);
      }
    } else if (scene === 'eye') {
      drawEyeScene(ctx, paper, dogfish, t, boil);
    } else if (scene === 'keeper') {
      drawKeeperScene(ctx, paper, dogfish, t, boil);
    } else {
      drawBeakScene(ctx, paper, t, boil);
    }
    ctx.restore();
    // The label on the close dogfish.
    dogfishLabels(t).forEach((l, i) => drawTextLine(ctx, l.text, l.x, l.y, l.size, 700, l.alpha, i === 0 ? PAPER_ON_INK : { fill: SPOKEN, halo: INK_BG }));
    drawGrade(ctx, '#ffffff', flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOctopusAudio };
}
