import { CAPTION_FONT, PAPER_ON_DARK } from './captions';
import { withCredit } from './credit';
import { boilAt, crabSprite, critterSprite, drawSprite, shellSprite } from './sprites';
import { VIDEO, type Short } from './short';
import { PAPER } from '../../src/art/palette';
import { createChain } from './chain/render';
import { createCrabs } from './crabs/render';
import { createCoconut } from './coconut/render';
import { createOctopus } from './octopus/render';
import { createRedCrab } from './redcrab/render';
import { createSnowCrab } from './snowcrab/render';
import { createRaccoon } from './raccoon/render';

/**
 * Dev-only promo video page for InkCrab, 1080x1920. Every short is a
 * seamless loop, narrated (an ElevenLabs voice with word-by-word captions)
 * with a quiet "InkCrab · 16bit.ink" credit after the payoff (credit.ts).
 * ?short= picks one: chain (hermit crabs queue to swap shells), crabs
 * (evolution keeps making crabs), coconut (the coconut crab), octopus
 * (three hearts), redcrab (Christmas Island's march to the sea), snowcrab
 * (ten billion vanished) or raccoon (it isn't washing its food). ?short=kit
 * shows the shared sprites. Plays live; ?t=4.2 freezes one moment.
 * `pnpm promo` (dev/promo/record.mjs) drives window.promo frame by frame to
 * make the video files.
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

/** A test card of the shared sprites: the hermit crab in its shell, a shell alone, and a critter. */
function createKit(): Short {
  const back = crabSprite('back');
  const front = crabSprite('front');
  const whelk = shellSprite('whelk');
  const conch = shellSprite('conch');
  const octopus = critterSprite('octopus');
  const raccoon = critterSprite('raccoon', 6, true);
  return {
    loopSeconds: 3,
    draw(t: number): void {
      const b = boilAt(t);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      drawSprite(ctx, back, b, { x: 300, y: 600, scale: 2 });
      drawSprite(ctx, whelk, b, { x: 300, y: 600, scale: 2 });
      drawSprite(ctx, front, b, { x: 300, y: 600, scale: 2 });
      drawSprite(ctx, conch, b, { x: 780, y: 600, scale: 2.5 });
      drawSprite(ctx, octopus, b, { x: 300, y: 1050, scale: 3 });
      drawSprite(ctx, raccoon, b, { x: 780, y: 1050, scale: 3, facing: -1 });
    },
    audio: async () => new Blob(),
  };
}

/** Each narrated short, built after the font loads, with the credit drawn over it (paper on dark for night scenes). */
const narrated = (create: (c: CanvasRenderingContext2D) => Short, dark = false) => async (): Promise<Short> => {
  await loadCaptionFont();
  return withCredit(create(ctx), ctx, dark ? PAPER_ON_DARK : undefined);
};

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  kit: async () => createKit(),
  chain: narrated(createChain),
  crabs: narrated(createCrabs),
  coconut: narrated(createCoconut),
  octopus: narrated(createOctopus),
  redcrab: narrated(createRedCrab),
  snowcrab: narrated(createSnowCrab),
  raccoon: narrated(createRaccoon, true),
};

const name = params.get('short') ?? 'kit';
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
