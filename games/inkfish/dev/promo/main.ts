import { CHAIN, LOOP_S } from './chain';
import { makeSprite } from './sprites';
import { createRenderer, drawDebug } from './render';
import { CAPTION_FONT, drawCaptions, type CaptionSet } from './captions';
import { renderAudio } from './audio';
import type { Short } from './short';
import { createBiggerFish } from './bigger/render';
import { createDepth } from './depth/render';
import { createBirds } from './birds/render';
import { createLight } from './light/render';
import { createMates } from './mates/render';
import { createBlobfish } from './blobfish/render';
import { createGreenland } from './greenland/render';
import { createBarreleye } from './barreleye/render';
import { createOarfish } from './oarfish/render';
import { createCoelacanth } from './coelacanth/render';
import { createFangtooth } from './fangtooth/render';
import { createClownfish } from './clownfish/render';
import { createParrotfish } from './parrotfish/render';
import { createCusk } from './cusk/render';
import { createPuffer } from './puffer/render';
import { createGulper } from './gulper/render';
import { createFlyingFish } from './flyingfish/render';
import { createBlackdragon } from './blackdragon/render';
import { createRevenge } from './revenge/render';
import { createSpat } from './spat/render';
import { createInkCloud } from './inkcloud/render';
import { createBait } from './bait/render';
import { createFrenzy } from './frenzy/render';
import { createGape } from './gape/render';
import { createLeap } from './leap/render';
import { createWrasse } from './wrasse/render';
import { createTuna } from './tuna/render';
import { createPipefish } from './pipefish/render';
import { createLionfish } from './lionfish/render';
import { createMoray } from './moray/render';
import { createTripod } from './tripod/render';
import { createTrees } from './trees/render';
import { PAPER_ON_DARK, withCredit } from './credit';

/**
 * Dev-only promo video page, 1080x1920. Every short is a seamless loop.
 * ?short= picks one: chain (the food-chain loop, the default), bigger
 * ("there's always a bigger fish"), depth ("how deep do fish live?"), birds
 * ("some fish eat birds"), light ("there is a light, anglerfish"), or one of
 * the narrated explainers: mates (male anglerfish fuse to females), blobfish
 * (what it really looks like), greenland (the 400-year-old shark), barreleye
 * (the see-through head), oarfish (the "doomsday fish"), coelacanth (back
 * from extinction), fangtooth (the biggest teeth for its size) or clownfish
 * (Nemo's dad should have become his mom), parrotfish (white sand is fish
 * poop), cusk (the faceless fish), puffer (it can kill thirty people), gulper
 * (a mouth bigger than its body), flyingfish (the 45-second flight) or
 * blackdragon (blacker than black). revenge ("remember this perch") is a
 * gameplay highlight: level 1's growth ladder, ending on the perch that hunted you.
 * More gameplay highlights, one moment of the game each: spat, inkcloud, bait,
 * frenzy, gape and leap (their story.ts files say which).
 * Narrated with a directed voice and a quiet "InkFish · 16bit.ink" credit
 * after the payoff (credit.ts): wrasse (passes the mirror test), tuna (the
 * $3.1M bluefin), pipefish (dads get pregnant), lionfish (eat it to save the
 * reef), moray (its second jaw), tripod (stands on stilts) and trees (sharks
 * are older than trees).
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
  birds: async () => {
    await loadCaptionFont();
    return createBirds(ctx);
  },
  light: async () => {
    await loadCaptionFont();
    return createLight(ctx);
  },
  mates: async () => {
    await loadCaptionFont();
    return createMates(ctx);
  },
  blobfish: async () => {
    await loadCaptionFont();
    return createBlobfish(ctx);
  },
  greenland: async () => {
    await loadCaptionFont();
    return createGreenland(ctx);
  },
  barreleye: async () => {
    await loadCaptionFont();
    return createBarreleye(ctx);
  },
  oarfish: async () => {
    await loadCaptionFont();
    return createOarfish(ctx);
  },
  coelacanth: async () => {
    await loadCaptionFont();
    return createCoelacanth(ctx);
  },
  fangtooth: async () => {
    await loadCaptionFont();
    return createFangtooth(ctx);
  },
  clownfish: async () => {
    await loadCaptionFont();
    return createClownfish(ctx);
  },
  parrotfish: async () => {
    await loadCaptionFont();
    return createParrotfish(ctx);
  },
  cusk: async () => {
    await loadCaptionFont();
    return createCusk(ctx);
  },
  puffer: async () => {
    await loadCaptionFont();
    return createPuffer(ctx);
  },
  gulper: async () => {
    await loadCaptionFont();
    return createGulper(ctx);
  },
  flyingfish: async () => {
    await loadCaptionFont();
    return createFlyingFish(ctx);
  },
  blackdragon: async () => {
    await loadCaptionFont();
    return createBlackdragon(ctx);
  },
  revenge: async () => {
    await loadCaptionFont();
    return createRevenge(ctx);
  },
  spat: async () => {
    await loadCaptionFont();
    return createSpat(ctx);
  },
  inkcloud: async () => {
    await loadCaptionFont();
    return createInkCloud(ctx);
  },
  bait: async () => {
    await loadCaptionFont();
    return createBait(ctx);
  },
  frenzy: async () => {
    await loadCaptionFont();
    return createFrenzy(ctx);
  },
  gape: async () => {
    await loadCaptionFont();
    return createGape(ctx);
  },
  leap: async () => {
    await loadCaptionFont();
    return createLeap(ctx);
  },
  wrasse: async () => {
    await loadCaptionFont();
    return withCredit(createWrasse(ctx), ctx);
  },
  tuna: async () => {
    await loadCaptionFont();
    return withCredit(createTuna(ctx), ctx);
  },
  pipefish: async () => {
    await loadCaptionFont();
    return withCredit(createPipefish(ctx), ctx);
  },
  lionfish: async () => {
    await loadCaptionFont();
    return withCredit(createLionfish(ctx), ctx);
  },
  moray: async () => {
    await loadCaptionFont();
    return withCredit(createMoray(ctx), ctx);
  },
  tripod: async () => {
    await loadCaptionFont();
    return withCredit(createTripod(ctx), ctx, PAPER_ON_DARK);
  },
  trees: async () => {
    await loadCaptionFont();
    return withCredit(createTrees(ctx), ctx);
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
