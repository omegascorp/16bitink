import { CAPTION_FONT } from './captions';
import type { Short } from './short';
import { createBitecompKit } from './bitecomp/kit';
import { createBitecomp } from './bitecomp/render';
import { createDescent } from './descent/render';
import { createKit } from './foodchain/kit';
import { createFoodchain } from './foodchain/render';
import { createSeamonstersKit } from './seamonsters/kit';
import { createSeamonsters } from './seamonsters/render';
import { createSwallowedKit } from './swallowed/kit';
import { createSwallowed } from './swallowed/render';
import { createSwallowyou } from './swallowyou/render';
import { createSurvivalArt } from './survival/art/sheet';
import { createSurvivalKit } from './survival/kit';
import { createSurvival } from './survival/render';

/**
 * Dev-only page for the long-form videos, 1920x1080. Unlike the shorts they
 * don't loop: `loopSeconds` is the video's length, and drawing runs from 0
 * to it once. ?video= picks one: descent ("fish get weirder the deeper you
 * go… until they can't", the default), foodchain ("fish eat fish size
 * comparison… but every animal is real"), foodchain-kit (its drawings) or
 * swallowyou ("every ocean animal that could swallow you… only one actually could"),
 * seamonsters ("sea monsters size comparison… but every one is real") or
 * seamonsters-kit (its new drawings), bitecomp ("bite force comparison… but
 * every number is real") or bitecomp-kit (its heads), swallowed ("swallowed whole
 * size comparison… but every meal is real") or swallowed-kit (its swallows), survival ("100 fish enter a survival tournament… only one can win") or survival-kit (its cast and faces). Plays live; ?t=95 freezes one moment.
 * `pnpm promo -- --only long` (dev/promo/record.mjs) records it frame by frame.
 */
const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingQuality = 'high';
const params = new URLSearchParams(location.search);

async function loadCaptionFont(): Promise<void> {
  await Promise.all([700, 500].map((w) => document.fonts.load(`${w} 92px ${CAPTION_FONT}`)));
  if (![700, 500].every((w) => document.fonts.check(`${w} 92px ${CAPTION_FONT}`))) throw new Error(`${CAPTION_FONT} font did not load`);
}

const VIDEOS: Readonly<Record<string, () => Promise<Short>>> = {
  descent: async () => {
    await loadCaptionFont();
    return createDescent(ctx);
  },
  foodchain: async () => {
    await loadCaptionFont();
    return createFoodchain(ctx);
  },
  'foodchain-kit': async () => {
    await loadCaptionFont();
    return createKit(ctx, params.get('only'));
  },
  swallowyou: async () => {
    await loadCaptionFont();
    return createSwallowyou(ctx);
  },
  seamonsters: async () => {
    await loadCaptionFont();
    return createSeamonsters(ctx);
  },
  'seamonsters-kit': async () => {
    await loadCaptionFont();
    return createSeamonstersKit(ctx, params.get('only'));
  },
  bitecomp: async () => {
    await loadCaptionFont();
    return createBitecomp(ctx);
  },
  'bitecomp-kit': async () => {
    await loadCaptionFont();
    return createBitecompKit(ctx, params.get('only'));
  },
  swallowed: async () => {
    await loadCaptionFont();
    return createSwallowed(ctx);
  },
  'swallowed-kit': async () => {
    await loadCaptionFont();
    return createSwallowedKit(ctx, params.get('only'));
  },
  'survival-art': async () => createSurvivalArt(ctx, params.get('only')),
  survival: async () => {
    await loadCaptionFont();
    return createSurvival(ctx);
  },
  'survival-kit': async () => {
    await loadCaptionFont();
    return createSurvivalKit(ctx, params.get('only'));
  },
};

const name = params.get('video') ?? 'descent';
const make = VIDEOS[name];
if (!make) throw new Error(`Unknown video "${name}": use one of ${Object.keys(VIDEOS).join(', ')}`);
const video = await make();

async function audioBase64(start = 0): Promise<string> {
  const bytes = new Uint8Array(await (await video.audio(start)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

window.promo = { loopSeconds: video.loopSeconds, draw: (s) => video.draw(s), audioBase64 };

const frozen = params.get('t');
if (frozen !== null) video.draw(Number(frozen));
else if (!params.has('record')) {
  const start = performance.now() - Number(params.get('from') ?? 0) * 1000;
  const tick = (now: number): void => {
    video.draw(Math.min((now - start) / 1000, video.loopSeconds - 1e-6));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
