import { chord, noise, notes, tone, type Voice } from '../../../src/audio/synth';
import { synthesize } from '../../../src/audio/synth';
import type { CustomSfx } from './script';

/**
 * This short's own effects, built from the game's synth pieces (soft tones
 * and breaths of filtered noise, synth.ts), one for each mood: a deep boom
 * for the stomp, comic thuds, a quill's scratch, climbing block thumps, the
 * "hm?", the snap and the plop, a sad low "wah-wah", a fanfare. `dur` is
 * how long the action lasts, for the sounds that follow one.
 */
type Recipe = (v: Voice, dur: number) => void;

const RECIPES: Readonly<Record<CustomSfx, Recipe>> = {
  // The heavy deer hitting the ground: a deep boom, a thump in the chest and grit.
  boom: (v) => {
    synthesize('blast', v);
    tone(v, { from: 62, to: 34, dur: 0.9, gain: 0.5, attack: 0.004 });
    noise(v, { dur: 0.35, gain: 0.35, filter: 'lowpass', from: 900, to: 120, attack: 0.003 });
    noise(v, { dur: 0.5, gain: 0.1, filter: 'bandpass', from: 1800, to: 600, q: 1.2, delay: 0.05 });
  },
  // One of its strides: a low padded thump.
  stomp: (v) => {
    tone(v, { from: 80, to: 46, dur: 0.3, gain: 0.32, attack: 0.005 });
    noise(v, { dur: 0.22, gain: 0.25, filter: 'lowpass', from: 420, to: 140, attack: 0.005 });
  },
  // Your trudging boot: a dull comic thud with a little squelch of effort.
  thud: (v) => {
    synthesize('land', v);
    tone(v, { from: 120, to: 70, dur: 0.18, gain: 0.22, attack: 0.004 });
  },
  // Another you landing on your back: a soft thud and a falling "oof".
  oof: (v) => {
    synthesize('hurt', v);
    tone(v, { type: 'triangle', from: 260, to: 150, dur: 0.32, gain: 0.16, attack: 0.02, delay: 0.03, vibrato: { depth: 6, rate: 9 } });
  },
  // A light pluck: the joke landing.
  pluck: (v) => notes(v, [784, 1046.5], 0.07, { dur: 0.3, gain: 0.06, attack: 0.004 }),
  // The quill on old paper: dry scratches in a hand's rhythm, as long as the stroke.
  scratch: (v, dur) => {
    const n = Math.max(3, Math.round(dur / 0.07));
    for (let k = 0; k < n; k++) {
      noise(v, { dur: 0.06, gain: 0.07 + 0.03 * (k % 3), filter: 'bandpass', from: 3200 + 900 * (k % 4), q: 2.2, attack: 0.008, delay: (k * dur) / n });
    }
  },
  // A block landing: a wooden thump (pitched up block by block, so the stack climbs).
  block: (v) => {
    tone(v, { from: 150, to: 92, dur: 0.22, gain: 0.3, attack: 0.004 });
    tone(v, { type: 'triangle', from: 300, dur: 0.12, gain: 0.08, attack: 0.003 });
    noise(v, { dur: 0.12, gain: 0.16, filter: 'bandpass', from: 800, q: 1.4, attack: 0.003 });
  },
  // Only four?: a quizzical two-note "hm?" rising, over a low bump.
  hm: (v) => {
    synthesize('dull', v);
    tone(v, { type: 'triangle', from: 220, to: 230, dur: 0.22, gain: 0.14, attack: 0.03, delay: 0.05 });
    tone(v, { type: 'triangle', from: 247, to: 330, dur: 0.34, gain: 0.14, attack: 0.03, delay: 0.25, vibrato: { depth: 4, rate: 6 } });
  },
  // Legs taking strain: a slow wavering creak.
  creak: (v, dur) => {
    noise(v, { dur, gain: 0.12, filter: 'bandpass', from: 520, to: 700, q: 6, attack: dur * 0.4 });
    tone(v, { type: 'triangle', from: 96, to: 88, dur, gain: 0.05, attack: dur * 0.4, vibrato: { depth: 6, rate: 13 } });
  },
  // "snap": a dry crack and a little rattle (a comic snap, not bones).
  snap: (v) => {
    noise(v, { dur: 0.07, gain: 0.5, filter: 'highpass', from: 2400, attack: 0.001 });
    noise(v, { dur: 0.16, gain: 0.3, filter: 'bandpass', from: 1500, to: 700, q: 1.6, attack: 0.002, delay: 0.02 });
    synthesize('crumbleHard', { ...v, pitch: v.pitch * 1.3 });
  },
  // Belly onto the ground: a soft round thump with a bounce.
  plop: (v) => {
    tone(v, { from: 110, to: 52, dur: 0.35, gain: 0.34, attack: 0.006 });
    noise(v, { dur: 0.3, gain: 0.25, filter: 'lowpass', from: 500, to: 140, attack: 0.006 });
    tone(v, { from: 90, to: 60, dur: 0.16, gain: 0.12, attack: 0.006, delay: 0.24 });
  },
  // Stunned: a little twitter of birds round its head.
  dizzy: (v) => {
    for (let k = 0; k < 4; k++) tone(v, { from: 1760 + 220 * (k % 2), to: 1320, dur: 0.12, gain: 0.04, attack: 0.01, delay: k * 0.17 });
  },
  // The elephant pushing up: a low rising strain.
  strain: (v, dur) => tone(v, { type: 'triangle', from: 70, to: 110, dur, gain: 0.12, attack: dur * 0.5 }),
  // Can't: a soft, sad muted "wah-wah", falling.
  wah: (v) => {
    const steps = [[0, 233, 0.32], [0.34, 220, 0.32], [0.68, 207.7, 0.32], [1.02, 196, 0.9]] as const;
    for (const [d, f, len] of steps) {
      tone(v, { type: 'triangle', from: f, to: f * 0.97, dur: len, gain: 0.12, attack: 0.05, delay: d, vibrato: len > 0.5 ? { depth: 5, rate: 5 } : undefined });
      tone(v, { from: f / 2, dur: len, gain: 0.06, attack: 0.05, delay: d });
    }
  },
  // A rush of air rising: the copy growing, a foot lifting, the beast rearing.
  whoosh: (v, dur) => noise(v, { dur, gain: 0.18, filter: 'bandpass', from: 220, to: 900, q: 0.9, attack: dur * 0.7 }),
  // "animals!": the game's mended chord over a low swell, bright on top.
  triumph: (v) => {
    synthesize('mended', v);
    chord(v, [130.81, 196], { dur: 1.6, gain: 0.12, attack: 0.25 });
    notes(v, [523.25, 659.25, 783.99, 1046.5], 0.09, { dur: 0.7, gain: 0.04, attack: 0.01 });
  },
};

export function playCustom(id: CustomSfx, v: Voice, dur = 0.3): void {
  RECIPES[id](v, dur);
}
