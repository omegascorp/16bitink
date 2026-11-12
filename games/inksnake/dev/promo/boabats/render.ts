import { drawTextLine, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt, drawSprite } from '../sprites';
import { drawAlone } from './alone';
import { renderBoaBatsAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { drawCta } from './cta';
import { drawHook } from './hook';
import { drawPassage } from './passage';
import { captionAt, HOOK_LINES, hookAlpha, hookMix, hookWord, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import type { Word } from './words';

const MAX_W = 980;
const HOT = '#ffd27a';
const DIM = 0.55;

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
  readonly ink: TextInk;
}

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

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(t);
  const scene = sceneAt(t);
  if (scene === 'hook') drawHook(ctx, cast, t, boil);
  else {
    if (scene === 'alone') drawAlone(ctx, cast, t, boil);
    else drawPassage(ctx, cast, t, boil, scene);
    const mix = hookMix(t);
    if (mix > 0) {
      const v = cast.veil.getContext('2d')!;
      v.clearRect(0, 0, VIDEO.width, VIDEO.height);
      drawHook(v, cast, t, boil);
      ctx.save();
      ctx.globalAlpha = mix;
      ctx.drawImage(cast.veil, 0, 0);
      ctx.restore();
    }
    drawCta(ctx, cast.game, t, boil);
  }
  drawWords(ctx, t);
}

/** ?kit: the boa's parts and the bat, side by side, for checking the art. */
function drawKit(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const b = boilAt(t);
  ctx.drawImage(cast.passageBg, -120, -120);
  drawSprite(ctx, cast.boa.upper.open, b, { x: 330, y: 380, scale: 5 });
  drawSprite(ctx, cast.boa.lower, b, { x: 330, y: 420, scale: 5 });
  drawSprite(ctx, cast.boa.front, b, { x: 830, y: 400, scale: 8 });
  drawSprite(ctx, cast.bats.big.fly1, b, { x: 540, y: 1000, scale: 12, rotation: -Math.PI / 2 });
  drawSprite(ctx, cast.bats.big.swoop, b, { x: 300, y: 1550, scale: 7, rotation: -Math.PI / 2 });
  drawSprite(ctx, cast.bats.mid.fly0, b, { x: 780, y: 1550, scale: 7, rotation: -Math.PI / 2 });
}

export function createBoaBats(ctx: CanvasRenderingContext2D): Short {
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
  return { loopSeconds: LOOP_S, draw, audio: renderBoaBatsAudio };
}
