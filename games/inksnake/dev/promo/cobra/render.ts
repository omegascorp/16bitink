import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt, drawSprite } from '../sprites';
import { spineOf } from '../pythonbear/python';
import { renderCobraAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { COBRA } from './cobraArt';
import { drawCta } from './cta';
import { drawFace } from './face';
import { drawFlat } from './flat';
import { drawSwallow } from './hook';
import { drawHeadOn, drawLaid } from './lay';
import { drawMonitor } from './monitor';
import { drawRest } from './rest';
import { captionAt, HOOK_LINES, hookAlpha, hookWord, irisAt, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import type { Word } from './words';

/** Draws "This snake EATS other snakes!" (story.ts has the beats). */

const MAX_W = 980;
/** The cobra's bronze eye, for the word being said. */
const HOT = '#ffd27a';
const DIM = 0.55;
/** Where the jaws open out of the mud into frame 1: the middle of the mouth. */
const IRIS_AT = { x: 470, y: 985 } as const;
const IRIS_R = 1500;

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
  readonly ink: TextInk;
}

/** One line, word by word, shrunk to fit. */
function drawLine(ctx: CanvasRenderingContext2D, s: Spoken): void {
  ctx.save();
  ctx.font = `700 ${s.size}px Caveat`;
  const space = ctx.measureText(' ').width;
  const widths = s.words.map((w) => ctx.measureText(w.text).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (s.words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  s.words.forEach((w, i) => {
    const ink = i === s.now ? { fill: HOT, halo: s.ink.halo } : s.ink;
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, s.alpha * (i <= s.now ? 1 : s.unsaid), ink);
    x += (widths[i]! + space) * k;
  });
}

/** The hook's two lines in full from frame 1 (the word being said lit); then each line as it is said. */
function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook, ink: PAPER_ON_DARK });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (c) drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1, ink: PAPER_ON_DARK });
}

/** Frame 1 opening out of the last shot in a widening circle, its edge inked. */
function drawIris(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = irisAt(t);
  if (k <= 0) return;
  if (k >= 1) return drawSwallow(ctx, cast, t, boil);
  const r = IRIS_R * k * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(IRIS_AT.x, IRIS_AT.y, r, 0, Math.PI * 2);
  ctx.clip();
  drawSwallow(ctx, cast, t, boil);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#0b1a2a';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(IRIS_AT.x, IRIS_AT.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const scene = sceneAt(t);
  if (scene === 'hook' || scene === 'swallow') drawSwallow(ctx, cast, t, boil);
  else if (scene === 'flat') drawFlat(ctx, cast, t, boil);
  else if (scene === 'face') drawFace(ctx, cast, t, boil);
  else {
    drawRest(ctx, cast, t, boil);
    drawCta(ctx, t);
    drawIris(ctx, cast, t, boil);
  }
  drawWords(ctx, t);
}

/** A test card of the new animals at video size (?short=cobra&kit). */
function drawKit(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const b = boilAt(t);
  ctx.drawImage(cast.late, 0, 0);
  const spine = spineOf([{ x: 900, y: 520 }, { x: 640, y: 560 }, { x: 340, y: 500 }, { x: 60, y: 560 }], 4);
  const lay = { spine, widths: spine.map(() => 100), base: 100, headRight: true };
  drawLaid(ctx, cast.cobra, b, lay, COBRA.line);
  drawHeadOn(ctx, cast.cobraHead.shut, b, lay);
  drawSprite(ctx, cast.cobraHead.shut, b, { x: 330, y: 820, scale: 7 });
  drawSprite(ctx, cast.cobraHead.strike, b, { x: 780, y: 820, scale: 5 });
  drawMonitor(ctx, { x: 560, y: 1500 }, 3.6, 1, { gait: t * 0.8, lift: 0.1, tongue: 0.8, sway: t }, b);
  const ps = spineOf([{ x: 900, y: 1700 }, { x: 600, y: 1740 }, { x: 300, y: 1690 }, { x: 40, y: 1740 }], 4);
  const pl = { spine: ps, widths: ps.map(() => 90), base: 90, headRight: true };
  drawLaid(ctx, cast.python, b, pl, '#1a130c');
  drawHeadOn(ctx, cast.pythonHead, b, pl);
}

export function createCobra(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const kit = new URLSearchParams(location.search).has('kit');
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    if (kit) drawKit(ctx, cast, t);
    else drawFrame(ctx, cast, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderCobraAudio };
}
