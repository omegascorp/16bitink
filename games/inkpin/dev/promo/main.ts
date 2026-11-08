import { Driver } from './driver';
import { renderAudio } from './audio';
import { CAPTION_FONT } from './captions';
import { drawOverlay, drawWipeBand, overlayAt, wipeEdgeAt } from './overlay';
import { cycleOf, FPS, LOOP_FRAMES, LOOP_S } from './plan';
import { VIDEO, type Short } from './short';
import { PAPER } from '../../src/art/palette';

/**
 * Dev-only promo video page for InkPin, 1080x1920: "Which Pin Would You Pull
 * First?". The picture is the game itself: its real GameScene runs level 4
 * (The Guard) with the page's clock stepped by hand, so every frame is exact,
 * and the pulls are the scene's own taps (driver.ts). Over it go the numbers
 * on the pins, the hand, the ✗ and ✓, the ink wipe, the credit and the call
 * to action (overlay.ts), scored with the game's own sound effects (audio.ts),
 * no voice. A seamless loop. Plays live; ?t=4.2 freezes one moment.
 * `pnpm promo` (dev/promo/record.mjs) drives window.promo frame by frame.
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

async function createShort(): Promise<Short> {
  await loadCaptionFont();
  const driver = await Driver.create();
  let cues: typeof driver.cues | null = null;
  return {
    loopSeconds: LOOP_S,
    draw(seconds: number): void {
      const c = cycleOf(seconds);
      driver.advanceTo(Math.round(c * FPS) % LOOP_FRAMES);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      ctx.drawImage(driver.live, 0, 0);
      const wipe = overlayAt(c).wipe;
      if (wipe !== null && driver.hasOld) {
        // The old board is still there to the right of the ink brush.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(VIDEO.width + 10, 0);
        for (let y = 0; y <= VIDEO.height; y += 24) ctx.lineTo(wipeEdgeAt(wipe, y) + 330, y);
        ctx.lineTo(VIDEO.width + 10, VIDEO.height);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(driver.old, 0, 0);
        ctx.restore();
        drawWipeBand(ctx, wipe);
      }
      drawOverlay(ctx, c, driver.boar());
    },
    async audio(start: number): Promise<Blob> {
      if (!cues) {
        // A pass through the whole cycle gathers what the game's scene makes sound for.
        driver.cues.length = 0;
        for (let i = 0; i < LOOP_FRAMES; i++) driver.advanceTo(driver.frame + 1);
        cues = [...driver.cues];
      }
      const voice = await (await fetch(new URL('./whichpin/voice.mp3', import.meta.url))).arrayBuffer();
      return renderAudio(cues, start, voice);
    },
  };
}

const short = await createShort();

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
  let frame = -1;
  const tick = (now: number): void => {
    const f = Math.floor(((now - start) / 1000) * FPS);
    if (f !== frame) {
      frame = f;
      short.draw((f / FPS) % short.loopSeconds);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
