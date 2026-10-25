import { CAPTION_FONT, PAPER_ON_DARK } from './captions';
import { withCredit } from './credit';
import { bakeSprite, bakeStrip, boilAt, drawBody, drawBodyShadow, drawSprite, taper, type Pt } from './sprites';
import { VIDEO, type Short } from './short';
import { CONGER_ART } from '../../src/art/chapters/reefCrittersConger';
import { GOBY_ART } from '../../src/art/chapters/reefCrittersGoby';
import { MORAY_ART } from '../../src/art/chapters/reefCrittersMoray';
import { KRAIT_ART } from '../../src/art/chapters/reefSnake';
import { PAPER } from '../../src/art/palette';
import { createKrait } from './krait/render';

/**
 * Dev-only promo video page for InkSnake, 1080x1920. Every short is a
 * seamless loop, narrated (an ElevenLabs voice with word-by-word captions)
 * with a quiet "InkSnake · 16bit.ink" credit after the payoff (credit.ts),
 * drawn with the game's own art. ?short= picks krait (the banded sea krait
 * swallows eels whole, chapter 6's reef). ?short=kit shows the shared
 * sprites. Plays live; ?t=4.2 freezes one moment. `pnpm promo`
 * (dev/promo/record.mjs) drives window.promo frame by frame to make the
 * video files.
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

/** A test card of the game's drawings at video size: the krait (body strip and head), the moray, the conger and a goby. */
function createKit(): Short {
  const art = KRAIT_ART!;
  const strip = bakeStrip(art, 6);
  const head = bakeSprite(art.head, 'shut', 6, 300);
  const open = bakeSprite(art.head, 'open', 6, 310);
  const moray = bakeSprite(MORAY_ART, 'swim0', 6, 900);
  const out = bakeSprite(MORAY_ART, 'out0', 6, 900);
  const conger = bakeSprite(CONGER_ART, 'swim1', 6, 910);
  const goby = bakeSprite(GOBY_ART, 'idle', 8, 920);
  const scale = 7;
  const width = 15 * scale;
  const spine: Pt[] = Array.from({ length: 160 }, (_, i) => ({ x: 900 - i * 5, y: 520 + Math.sin(i * 0.05) * 110 }));
  const body = { spine, widths: spine.map((_, i) => width * taper(i / (spine.length - 1))), along: width / 24 };
  return {
    loopSeconds: 3,
    draw(t: number): void {
      const b = boilAt(t);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      drawBodyShadow(ctx, body, width);
      drawBody(ctx, strip, b, body);
      const k = width / 24;
      const a = spine[0]!;
      const c = spine[6]!;
      drawSprite(ctx, head, b, { x: a.x, y: a.y, scale: k, rotation: Math.atan2(a.y - c.y, a.x - c.x) });
      drawSprite(ctx, open, b, { x: 300, y: 900, scale: k * 1.4 });
      drawSprite(ctx, moray, b, { x: 760, y: 950, scale: 6 });
      drawSprite(ctx, out, b, { x: 300, y: 1300, scale: 6 });
      drawSprite(ctx, conger, b, { x: 760, y: 1320, scale: 7 });
      drawSprite(ctx, goby, b, { x: 540, y: 1650, scale: 8 });
    },
    audio: async () => new Blob(),
  };
}

/** Each narrated short, built after the font loads, with the credit drawn over it (paper on dark for underwater scenes). */
const narrated = (create: (c: CanvasRenderingContext2D) => Short, dark = false) => async (): Promise<Short> => {
  await loadCaptionFont();
  return withCredit(create(ctx), ctx, dark ? PAPER_ON_DARK : undefined);
};

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  kit: async () => createKit(),
  krait: narrated(createKrait, true),
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
