import { CHAIN, LOOP_S } from './chain';
import { makeSprite } from './sprites';
import { createRenderer, drawDebug } from './render';
import { CAPTION_FONT, drawCaptions, type CaptionSet } from './captions';
import { renderAudio } from './audio';

/**
 * Dev-only promo video page: the food-chain loop at 1080x1920.
 * Plays live; ?t=4.2 freezes one moment; ?captions adds the ad text,
 * ?hook=some+words a viral-style hook line instead;
 * ?debug shows the chain maths. `pnpm promo` (dev/promo/record.mjs) drives
 * window.promo frame by frame to make the video files.
 */
const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const hook = params.get('hook');
const captions: CaptionSet | null = hook ? { kind: 'hook', text: hook } : params.has('captions') ? { kind: 'ad' } : null;

if (captions) {
  await Promise.all([700, 500].map((w) => document.fonts.load(`${w} 92px ${CAPTION_FONT}`)));
  // Without the font the captions would quietly fall back to a system face.
  if (![700, 500].every((w) => document.fonts.check(`${w} 92px ${CAPTION_FONT}`))) throw new Error(`${CAPTION_FONT} font did not load`);
}
const sprites = new Map(CHAIN.map((shape) => [shape, makeSprite(shape)] as const));
const renderer = createRenderer(ctx, sprites);

function draw(seconds: number): void {
  renderer.draw(seconds);
  if (captions) drawCaptions(ctx, captions);
  if (debug) drawDebug(ctx, seconds);
}

/** The soundtrack as base64 WAV, for the recorder, starting `start` seconds into the loop. */
async function audioBase64(start = 0): Promise<string> {
  const bytes = new Uint8Array(await (await renderAudio(start)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

declare global {
  interface Window {
    promo: {
      readonly loopSeconds: number;
      draw(seconds: number): void;
      audioBase64(start?: number): Promise<string>;
    };
  }
}
window.promo = { loopSeconds: LOOP_S, draw, audioBase64 };

const frozen = params.get('t');
if (frozen !== null) draw(Number(frozen));
else if (!params.has('record')) {
  const start = performance.now();
  const tick = (now: number): void => {
    draw(((now - start) / 1000) % LOOP_S);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
