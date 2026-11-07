import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt, drawSprite } from '../sprites';
import { renderPythonBearAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { drawCta } from './cta';
import { drawJungle, drawSignal, drawWait } from './field';
import { drawFree } from './free';
import { drawHook } from './hook';
import { drawPythonBody, drawPythonHead, spineOf } from './python';
import { captionAt, HOOK_LINES, hookAlpha, hookWord, irisAt, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import { drawVet } from './vet';
import type { Word } from './words';

/** Draws "This python swallowed a whole BEAR!" (story.ts has the beats). */

const MAX_W = 980;
/** The python's amber eye, for the word being said. */
const HOT = '#f6c35c';
const DIM = 0.55;
/** Where the jaws open out of the forest into frame 1: the middle of the lips' ring. */
const IRIS_AT = { x: 610, y: 880 } as const;
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

/** The hook opening out of the free shot in a widening circle, its edge inked. */
function drawIris(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const k = irisAt(t);
  if (k <= 0) return;
  if (k >= 1) return drawHook(ctx, cast, t, boil);
  const r = IRIS_R * k * k;
  ctx.save();
  ctx.beginPath();
  ctx.arc(IRIS_AT.x, IRIS_AT.y, r, 0, Math.PI * 2);
  ctx.clip();
  drawHook(ctx, cast, t, boil);
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
  if (scene === 'hook') drawHook(ctx, cast, t, boil);
  else if (scene === 'jungle') drawJungle(ctx, cast, t, boil);
  else if (scene === 'signal') drawSignal(ctx, cast, t, boil);
  else if (scene === 'wait') drawWait(ctx, cast, t, boil);
  else if (scene === 'vet') drawVet(ctx, cast, t, boil);
  else {
    drawFree(ctx, cast, t, boil);
    drawCta(ctx, t);
    drawIris(ctx, cast, t, boil);
  }
  drawWords(ctx, t);
}

/** A test card of the new animals at video size (?short=pythonbear&kit). */
function drawKit(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const b = boilAt(t);
  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  drawSprite(ctx, cast.bear, b, { x: 300, y: 380, scale: 1.6 });
  drawSprite(ctx, cast.researcher, b, { x: 800, y: 420, scale: 1.25 });
  const spine = spineOf([{ x: 860, y: 900 }, { x: 600, y: 940 }, { x: 300, y: 880 }, { x: 60, y: 940 }], 4);
  const lay = { spine, widths: spine.map(() => 90), base: 90, headRight: true };
  drawPythonBody(ctx, cast.python, b, lay);
  drawPythonHead(ctx, cast.python, b, lay, 'shut');
  drawSprite(ctx, cast.python.head.shut, b, { x: 520, y: 1150, scale: 9 });
  drawSprite(ctx, cast.rump, b, { x: 330, y: 1560, scale: 1.4 });
  drawSprite(ctx, cast.leg.near, b, { x: 240, y: 1640, scale: 1.4 });
  drawSprite(ctx, cast.python.head.gape, b, { x: 800, y: 1500, scale: 6 });
}

export function createPythonBear(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const kit = new URLSearchParams(location.search).has('kit');
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    if (kit) drawKit(ctx, cast, t);
    else drawFrame(ctx, cast, t);
    ctx.restore();
  };
  return { loopSeconds: LOOP_S, draw, audio: renderPythonBearAudio };
}
