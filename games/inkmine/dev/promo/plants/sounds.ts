import { chord, noise, notes, tone, type Voice } from '../../../src/audio/synth';

/**
 * This short's own effects, built from the game's synth parts (soft tones
 * and breaths of filtered noise, as every InkMine sound is), one for each
 * mood the game's set has no sound for.
 */
export const CUSTOM_IDS = ['hit', 'whoosh', 'rise', 'twinkle', 'shimmer', 'sting', 'pop', 'boing', 'stamp', 'wah', 'hush'] as const;
export type CustomId = (typeof CUSTOM_IDS)[number];

export const isCustom = (id: string): id is CustomId => (CUSTOM_IDS as readonly string[]).includes(id);

export const CUSTOM: Readonly<Record<CustomId, (v: Voice) => void>> = {
  // "BLACK": a deep sub drop under a dark thump.
  hit: (v) => {
    tone(v, { from: 58, to: 34, dur: 1.8, gain: 0.5, attack: 0.006 });
    tone(v, { type: 'triangle', from: 116, to: 70, dur: 0.6, gain: 0.12, attack: 0.006 });
    noise(v, { dur: 0.9, gain: 0.3, filter: 'lowpass', from: 420, to: 60, attack: 0.004 });
  },
  // Pulled out to the stars: air rushing away, falling.
  whoosh: (v) => {
    noise(v, { dur: 1.3, gain: 0.3, filter: 'bandpass', from: 2400, to: 220, q: 0.9, attack: 0.35 });
    tone(v, { from: 220, to: 70, dur: 1.2, gain: 0.06, attack: 0.3 });
  },
  // Pushed into a star: air rising.
  rise: (v) => noise(v, { dur: 0.9, gain: 0.22, filter: 'bandpass', from: 250, to: 2200, q: 0.9, attack: 0.6 }),
  // A star flaring: a tiny high glint.
  twinkle: (v) => {
    tone(v, { from: 2093, dur: 0.7, gain: 0.05, attack: 0.004 });
    tone(v, { from: 3136, dur: 0.4, gain: 0.018, attack: 0.004, delay: 0.02 });
  },
  // A colour sinking into the leaf: a glassy shimmer that swells and dies, falling a little.
  shimmer: (v) => {
    tone(v, { from: 1318.5, to: 1174.7, dur: 1.3, gain: 0.04, attack: 0.25, vibrato: { depth: 6, rate: 6 } });
    tone(v, { from: 1975.5, to: 1760, dur: 1.1, gain: 0.02, attack: 0.3, delay: 0.05 });
  },
  // The page: a bright, quick upward sting.
  sting: (v) => {
    notes(v, [783.99, 1174.66, 1567.98], 0.045, { type: 'triangle', dur: 0.9, gain: 0.09, attack: 0.004 });
    noise(v, { dur: 0.25, gain: 0.08, filter: 'highpass', from: 4000, attack: 0.004 });
  },
  // Something popping onto the page.
  pop: (v) => tone(v, { from: 420, to: 880, dur: 0.14, gain: 0.12, attack: 0.004 }),
  // The green light bouncing back: a sprung, wobbling boing.
  boing: (v) => {
    tone(v, { from: 150, to: 430, dur: 0.6, gain: 0.26, attack: 0.006, vibrato: { depth: 60, rate: 14 } });
    tone(v, { type: 'triangle', from: 300, to: 860, dur: 0.4, gain: 0.05, attack: 0.006, vibrato: { depth: 110, rate: 14 } });
  },
  // The stamp: a hard wooden thud.
  stamp: (v) => {
    tone(v, { from: 95, to: 42, dur: 0.4, gain: 0.6, attack: 0.002 });
    noise(v, { dur: 0.16, gain: 0.55, filter: 'lowpass', from: 1400, to: 200, attack: 0.002 });
    noise(v, { dur: 0.05, gain: 0.25, filter: 'bandpass', from: 2600, q: 1.5, attack: 0.001 });
  },
  // The leaf deflating in offence: a falling, wobbly wah.
  wah: (v) => {
    tone(v, { type: 'triangle', from: 247, to: 156, dur: 0.85, gain: 0.12, attack: 0.04, vibrato: { depth: 7, rate: 6 } });
    tone(v, { from: 123.5, to: 78, dur: 0.85, gain: 0.06, attack: 0.04 });
  },
  // Back under the red sun: a hush of wind, and a low, dark chord.
  hush: (v) => {
    noise(v, { dur: 2.6, gain: 0.1, filter: 'lowpass', from: 380, to: 900, attack: 1.3 });
    chord(v, [73.42, 110, 146.83], { dur: 3, gain: 0.08, attack: 1.4 });
  },
};
