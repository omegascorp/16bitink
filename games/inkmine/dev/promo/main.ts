import { CAPTION_FONT, PAPER_ON_DARK } from './captions';
import { withCredit } from './credit';
import { bakeSprite, boilAt, drawSprite } from './sprites';
import { VIDEO, type Short } from './short';
import { drawGrazer, GRAZER_ART } from '../../src/art/creatures/grazer';
import { PAPER } from '../../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../../src/art/prospector';
import { PROSPECTOR_FINISH } from '../../src/art/textures';
import { evenLoadout, prospectorLook } from '../../src/logic/gear';
import { createTitan } from './titan/render';
import { createPlants } from './plants/render';
import { createHeavy } from './heavy/render';

/**
 * Dev-only promo video page for InkMine, 1080x1920. Every short is a
 * seamless loop, narrated (an ElevenLabs voice with word-by-word captions)
 * with a quiet "InkMine · 16bit.ink" credit after the payoff (credit.ts).
 * The shorts are about life on other worlds, each built on real science:
 * ?short= picks titan (you could fly on Titan by flapping your arms),
 * plants (plants round red dwarfs could be black) or heavy (what heavy
 * gravity does to animals). ?short=kit shows the shared sprites. Plays
 * live; ?t=4.2 freezes one moment. `pnpm promo` (dev/promo/record.mjs)
 * drives window.promo frame by frame to make the video files.
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

/** A test card of the game's drawings at video size: the prospector flying and walking, and Mycel's grazer. */
function createKit(): Short {
  const prospector = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 + PROSPECTOR_GROUND };
  const look = prospectorLook(evenLoadout(2));
  const flying = bakeSprite(prospector, 8, 100, (d) => drawProspector(d, 'fly', look), PROSPECTOR_FINISH);
  const walking = bakeSprite(prospector, 8, 110, (d) => drawProspector(d, 'walk', look), PROSPECTOR_FINISH);
  const grazer = bakeSprite(GRAZER_ART, 8, 940, (d) => drawGrazer(d, 'walk'));
  return {
    loopSeconds: 3,
    draw(t: number): void {
      const b = boilAt(t);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      drawSprite(ctx, flying, b, { x: 300, y: 650, scale: 6 });
      drawSprite(ctx, walking, b, { x: 780, y: 650, scale: 6, facing: -1 });
      drawSprite(ctx, grazer, b, { x: 540, y: 1150, scale: 8 });
    },
    audio: async () => new Blob(),
  };
}

/** Each narrated short, built after the font loads, with the credit drawn over it (paper on dark for night and space scenes). */
const narrated = (create: (c: CanvasRenderingContext2D) => Short, dark = false) => async (): Promise<Short> => {
  await loadCaptionFont();
  return withCredit(create(ctx), ctx, dark ? PAPER_ON_DARK : undefined);
};

const SHORTS: Readonly<Record<string, () => Promise<Short>>> = {
  kit: async () => createKit(),
  titan: narrated(createTitan, true),
  plants: narrated(createPlants, true),
  heavy: narrated(createHeavy, true),
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
