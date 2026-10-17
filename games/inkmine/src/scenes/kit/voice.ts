import type Phaser from 'phaser';
import { createRng } from '../../logic/rng';
import { bakeUi } from './paint';

/**
 * Speech you can't understand (spec, "Learning the language"): not writing,
 * but the suit's recording of the voice, inked as a sound trace. Each word
 * is one burst on the line, swelling and fading, with a quiet stretch
 * between words. A Lamplighter's voice is slow and low, so the waves are
 * long. Seeded, so the same line always sounds the same. Their writing (the
 * knots, kit/knots.ts) is for what they write, not what they say.
 */
const VOICE_INK = '#141a33';
/** Layout units per word, and the gap of quiet after it. */
const WORD = 34;
const GAP = 8;
const H = 40;
/** Drawn this much bigger than its layout units, as the knots are. */
const SIZE = 1.6;

/** A recorded line of `words` words, `seed`ed; returns its texture key. */
export function voiceLine(scene: Phaser.Scene, words: number, seed: number): string {
  const w = words * (WORD + GAP) + 12;
  return bakeUi(scene, `ui-voice-${words}-${seed}`, w * SIZE, H * SIZE, (ctx) => {
    ctx.scale(SIZE, SIZE);
    const rng = createRng(seed);
    const mid = H / 2;
    ctx.strokeStyle = VOICE_INK;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // The quiet line the trace runs along, faint, as on the suit's recorder.
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(2, mid);
    ctx.lineTo(w - 2, mid);
    ctx.stroke();
    // One continuous stroke: a burst per word, flat (with a little hiss) between.
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4, mid);
    let x = 6;
    for (let k = 0; k < words; k++) {
      const amp = 6 + rng() * 9;
      const cycles = 1.5 + rng() * 1.5;
      const phase = rng() * Math.PI;
      for (let t = 0; t <= 1.0001; t += 0.02) {
        // Swells in and fades out over the word; long, low waves.
        const env = Math.sin(Math.PI * t) ** 1.4;
        const y = mid - env * amp * Math.sin(phase + t * cycles * Math.PI * 2);
        ctx.lineTo(x + t * WORD, y);
      }
      x += WORD;
      ctx.lineTo(x + GAP * 0.5, mid + (rng() - 0.5) * 1.2);
      ctx.lineTo(x + GAP, mid);
      x += GAP;
    }
    ctx.lineTo(w - 4, mid);
    ctx.stroke();
  });
}
