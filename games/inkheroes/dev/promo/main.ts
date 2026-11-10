import { BOOK_FONT, CAPTION_FONT, CAPTION_WEIGHTS } from './captions';
import { withCredit } from './credit';
import { VIDEO, type Short } from './short';
import { drawFrame, loadUnit } from './pixel';
import { createCyclops } from './cyclops/render';
import { CREDIT as CYCLOPS_CREDIT } from './cyclops/story';
import { createAmmit } from './ammit/render';
import { CREDIT as AMMIT_CREDIT } from './ammit/story';

/**
 * Dev-only promo video page for InkHeroes, 1080x1920, 30 fps. Every short is
 * a seamless narrated loop (the channel's ElevenLabs narrator with phrase
 * captions), "the real animal behind the monster", ending on the game's own
 * PixelLab battle units and a call to action with the credit
 * "InkHeroes · 16bit.ink/heroes" (credit.ts). ?short= picks cyclops (#113:
 * the dwarf elephant skull and the Cyclops) or ammit (#114: the heart, the
 * feather and Ammit); ?short=kit shows the units at video size. Plays live;
 * ?t=4.2 freezes one moment. `pnpm promo` (dev/promo/record.mjs) drives
 * window.promo frame by frame to make the video files.
 */
const canvas = document.getElementById('promo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;
const params = new URLSearchParams(location.search);

async function loadCaptionFont(): Promise<void> {
  const faces = [...CAPTION_WEIGHTS.map((w) => `${w} 92px ${CAPTION_FONT}`), `700 92px ${BOOK_FONT}`];
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  // Without the fonts the captions would quietly fall back to a system face.
  const missing = faces.filter((f) => !document.fonts.check(f));
  if (missing.length > 0) throw new Error(`caption fonts did not load: ${missing.join(', ')}`);
}

/** A test card of the units the shorts use, at video size, animated. */
async function createKit(): Promise<Short> {
  const units = await Promise.all(['ogre', 'ammit', 'spearman', 'crocodile', 'lion', 'levy'].map(loadUnit));
  return {
    loopSeconds: 3,
    draw(t: number): void {
      ctx.fillStyle = '#2b2118';
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      units.forEach((u, i) => {
        const strip = i % 2 === 0 ? u.attack : u.idle;
        drawFrame(ctx, strip, Math.floor(t * 8), { x: 280 + (i % 2) * 520, y: 420 + Math.floor(i / 2) * 560, scale: 3, ax: u.art.footX, ay: u.art.footY });
      });
    },
    audio: async () => new Blob(),
  };
}

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  kit: createKit,
  cyclops: async () => {
    await loadCaptionFont();
    return withCredit(await createCyclops(ctx), ctx, CYCLOPS_CREDIT);
  },
  ammit: async () => {
    await loadCaptionFont();
    return withCredit(await createAmmit(ctx), ctx, AMMIT_CREDIT);
  },
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
