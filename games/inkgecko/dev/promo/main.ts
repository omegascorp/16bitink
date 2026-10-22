import { CAPTION_FONT } from './captions';
import { withCredit } from './credit';
import { applyView, type View } from './play/stage';
import { VIDEO, type Short } from './short';
import { boilAt, drawSprite, makeKit } from './sprites';
import { PAPER } from '../../src/art/palette';
import { COLOURS } from '../../src/logic/colours';
import { createHedgehog } from './hedgehog/render';
import { createChain } from './chain/render';

/**
 * Dev-only promo video page for InkGecko, 1080x1920. Every short is a
 * seamless loop of real gameplay (the game's own Board, played by a
 * scripted gecko, play/director.ts), drawn with the game's own art and
 * scored with its own sound effects, no voice, with "InkGecko · 16bit.ink"
 * in every frame (credit.ts). ?short= picks hedgehog (a last-second save at
 * the well) or chain (one shot, a six-link chain reaction); ?short=kit
 * shows the shared sprites. Plays live; ?t=4.2 freezes one moment.
 * `pnpm promo` (dev/promo/record.mjs) drives window.promo frame by frame
 * to make the video files.
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

/** A test card of the game's drawings at video size: every marble colour, the gecko, the well and the Hedgehog. */
function createKit(): Short {
  const kit = makeKit();
  const view: View = { cx: 640, cy: 400, z: 2.4 };
  return {
    loopSeconds: 1.2,
    draw(t: number): void {
      const f = boilAt(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      applyView(ctx, view);
      COLOURS.forEach((c, i) => drawSprite(ctx, kit.marble[c][f]!, 520 + i * 40, 300, 1));
      drawSprite(ctx, kit.geckoSkin.idle[f]!, 640, 400);
      drawSprite(ctx, kit.geckoLines.idle[f]!, 640, 400);
      drawSprite(ctx, kit.well[f]!, 800, 400);
      drawSprite(ctx, kit.hedgehog[0]![f]!, 640, 520);
      drawSprite(ctx, kit.mark('hedgehog'), 520, 520);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    audio: async () => new Blob(),
  };
}

/** Each gameplay short, built after the font loads, with the credit in every frame. */
const gameplay = (create: (c: CanvasRenderingContext2D) => Short) => async (): Promise<Short> => {
  await loadCaptionFont();
  return withCredit(create(ctx), ctx);
};

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  kit: async () => createKit(),
  hedgehog: gameplay(createHedgehog),
  chain: gameplay(createChain),
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
