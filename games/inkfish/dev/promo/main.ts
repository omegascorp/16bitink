import { CHAIN, LOOP_S } from './chain';
import { makeSprite } from './sprites';
import { createRenderer, drawDebug } from './render';
import { CAPTION_FONT, drawCaptions, type CaptionSet } from './captions';
import { renderAudio } from './audio';
import type { Short } from './short';
import { createBiggerFish } from './bigger/render';
import { createDepth } from './depth/render';

/**
 * Dev-only promo video page, 1080x1920. Every short is a seamless loop.
 * ?short= picks one: chain (the food-chain loop, the default), bigger
 * ("there's always a bigger fish") or depth ("how deep do fish live?").
 * Plays live; ?t=4.2 freezes one moment. For the chain, ?captions adds the
 * ad text, ?hook=some+words a viral-style hook line instead, and ?debug
 * shows the chain maths. `pnpm promo` (dev/promo/record.mjs) drives
 * window.promo frame by frame to make the video files.
 */
const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';
const params = new URLSearchParams(location.search);

async function loadCaptionFont(): Promise<void> {
  await Promise.all([700, 500].map((w) => document.fonts.load(`${w} 92px ${CAPTION_FONT}`)));
  // Without the font the captions would quietly fall back to a system face.
  if (![700, 500].every((w) => document.fonts.check(`${w} 92px ${CAPTION_FONT}`))) throw new Error(`${CAPTION_FONT} font did not load`);
}

async function createChain(): Promise<Short> {
  const debug = params.has('debug');
  const hook = params.get('hook');
  const captions: CaptionSet | null = hook ? { kind: 'hook', text: hook } : params.has('captions') ? { kind: 'ad' } : null;
  if (captions) await loadCaptionFont();
  const sprites = new Map(CHAIN.map((shape) => [shape, makeSprite(shape)] as const));
  const renderer = createRenderer(ctx, sprites);
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      renderer.draw(seconds);
      if (captions) drawCaptions(ctx, captions);
      if (debug) drawDebug(ctx, seconds);
    },
    audio: renderAudio,
  };
}

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  chain: createChain,
  bigger: async () => {
    await loadCaptionFont();
    return createBiggerFish(ctx);
  },
  depth: async () => {
    await loadCaptionFont();
    return createDepth(ctx);
  },
};

const name = params.get('short') ?? 'chain';
const make = SHORTS[name];
if (!make) throw new Error(`Unknown short "${name}": use one of ${Object.keys(SHORTS).join(', ')}`);
const short = await make();

/** The soundtrack as base64 WAV, for the recorder, starting `start` seconds into the loop. */
async function audioBase64(start = 0): Promise<string> {
  const bytes = new Uint8Array(await (await short.audio(start)).arrayBuffer());
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
window.promo = { loopSeconds: short.loopSeconds, draw: (s) => short.draw(s), audioBase64 };

const frozen = params.get('t');
if (frozen !== null) short.draw(Number(frozen));
else if (!params.has('record')) {
  const start = performance.now();
  const tick = (now: number): void => {
    short.draw(((now - start) / 1000) % short.loopSeconds);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
