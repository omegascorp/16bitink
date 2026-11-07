import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import type { SfxId } from '../../../src/audio/recipes';
import { noise, noiseBuffer, synthesize, tone, type Voice } from '../../../src/audio/synth';
import { ramp } from '../short';
import { said } from './words';
import { BLOCKS_AT, CHARGE_AT, DIG_FROM, EYE_OPEN_AT, EYE_TWITCH_AT, HIT_AT, LOOP_S, WAKE_AT } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, from the loop's start, straight to
 * the output) on top, and quiet under him the game's own effects
 * (mineSounds.ts: the drill's grind and crumble, the Leviathan's long low
 * swell, lower as it wakes) and a few built from the same synth pieces: the
 * chest thump of each block, the charge's rising rumble, the impact. The
 * water's hush drops out for the held breath before "Its eye opens!". The
 * rumble runs past the loop's end and folds back onto the start, up to the
 * impact, so the seam is inside one sound.
 */
const TAIL_S = 3;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The take peaks high: the voice sets the mix's peak. */
const VOICE_GAIN = 0.8;
/**
 * Each phrase's lift (dB), from its first word: the take's quiet lines sit up
 * to 10 dB under its loud ones, so this rides them back to within about 5 dB.
 */
const LIFTS: readonly (readonly [number, number])[] = [[0, 0], [5, 3], [8, 5], [13, 3], [19, 3], [21, 2], [23, 0], [30, 0], [34, 3]];
/** The effects' master level, well under the voice. */
const SFX_GAIN = 0.62;
const WATER_GAIN = 0.1;
/** The impact, kept below the voice it lands under. */
const IMPACT_GAIN = 0.55;
const WATER_SWELLS = 3;
/** The mix's peak: AAC adds a little, so this lands near -4 dB in the video. */
const PEAK = 10 ** (-4.0 / 20);
/** The hush drops away after the last block, back as the eye opens. */
const SILENT_FROM = BLOCKS_AT[4]! + 0.12;
const SILENT_TO = EYE_OPEN_AT + 0.1;

/** Each block a thump in the chest, heavier as the noise climbs. */
function thump(v: Voice, k: number): void {
  tone(v, { from: 96, to: 48, dur: 0.42, gain: 0.26 + 0.12 * k, attack: 0.006 });
  noise(v, { dur: 0.2, gain: 0.2, filter: 'lowpass', from: 700, to: 150, attack: 0.004 });
}

/** The impact: the game's blast low, a body-blow and grit, then the suit's hurt. */
function impact(v: Voice): void {
  synthesize('blast', { ...v, pitch: 0.55 });
  tone(v, { from: 74, to: 30, dur: 1.2, gain: 0.8, attack: 0.004 });
  noise(v, { dur: 0.5, gain: 0.7, filter: 'lowpass', from: 1500, to: 120, attack: 0.002 });
  noise(v, { dur: 0.24, gain: 0.22, filter: 'bandpass', from: 2400, to: 700, q: 1.1, attack: 0.002, delay: 0.02 });
  synthesize('hurt', { ...v, t: v.t + 0.05 });
}

/** The charge's level over its length: in fast, climbing all the way, cut off by the impact. */
const RUMBLE: readonly (readonly [number, number])[] = [[0, 0], [0.4, 0.5], [1.2, 0.62], [2.2, 0.7], [3.2, 0.85], [LOOP_S + HIT_AT - CHARGE_AT, 1]];

/**
 * The charge: rushing water and a sub rising together, then cut dead. The
 * synth's envelopes fade from their peak, so this one carries its own level.
 */
function rumble(v: Voice): void {
  const end = RUMBLE[RUMBLE.length - 1]![0];
  const level = v.ctx.createGain();
  RUMBLE.forEach(([at, gain], i) => (i === 0 ? level.gain.setValueAtTime(gain, v.t) : level.gain.linearRampToValueAtTime(gain, v.t + at)));
  level.gain.linearRampToValueAtTime(0, v.t + end + 0.03);
  level.connect(v.out);
  const water = v.ctx.createBufferSource();
  water.buffer = noiseBuffer(v.ctx);
  water.loop = true;
  const low = v.ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.setValueAtTime(130, v.t);
  low.frequency.exponentialRampToValueAtTime(520, v.t + end);
  const waterGain = v.ctx.createGain();
  waterGain.gain.value = 0.6;
  water.connect(low).connect(waterGain).connect(level);
  const sub = v.ctx.createOscillator();
  sub.frequency.setValueAtTime(40, v.t);
  sub.frequency.exponentialRampToValueAtTime(66, v.t + end);
  const subGain = v.ctx.createGain();
  subGain.gain.value = 0.2;
  sub.connect(subGain).connect(level);
  water.start(v.t);
  sub.start(v.t);
  water.stop(v.t + end + 0.1);
  sub.stop(v.t + end + 0.1);
}

async function addVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.setValueAtTime(VOICE_GAIN, 0);
  for (const [word, db] of LIFTS) {
    // Moved in the pause before the phrase, so no word swells.
    level.gain.setTargetAtTime(VOICE_GAIN * 10 ** (db / 20), Math.max(0, said(word) - 0.18), 0.04);
  }
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderLeviathanAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  const at = (t: number): Voice => {
    const level = ctx.createGain();
    level.gain.value = 1;
    level.connect(master);
    // The offline context has every node factory the synth uses.
    return { ctx: ctx as unknown as AudioContext, out: level, t, pitch: 1 };
  };
  const fx = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): void => play(id, t, pitch, gain, pan);

  // The dig: the grind ticking away, each block a crumble and a thump, the notch on the bar a step higher.
  const lastBlock = BLOCKS_AT[BLOCKS_AT.length - 1]!;
  for (let t = DIG_FROM; t < lastBlock; t += 0.2) fx('grindHard', t, 0.92 + ((t * 7) % 1) * 0.12, 0.62, 0.22);
  BLOCKS_AT.forEach((b, k) => {
    fx('crumbleHard', b, 0.86 + k * 0.05, 1.2 + k * 0.14, 0.2);
    thump(at(b), k / 4);
    fx('tick', b + 0.03, 0.8 + k * 0.28, 0.7, -0.4);
  });

  // The silence, then the eye: a twitch of skin, and the game's swell, as low as it goes for waking.
  fx('land', EYE_TWITCH_AT, 0.45, 0.35);
  fx('swell', EYE_OPEN_AT - 0.04, 0.25, 4.4);
  tone(at(EYE_OPEN_AT), { from: 41, to: 49, dur: 2.2, gain: 0.34, attack: 0.5 });
  // The lights: the stir's swell a little higher, a shimmer running down the flank.
  fx('swell', WAKE_AT, 0.4, 3);
  noise(at(WAKE_AT), { dur: 0.8, gain: 0.05, filter: 'bandpass', from: 2600, to: 5200, q: 3, attack: 0.5 });

  // The charge, the jet firing up as the prospector runs, the impact past the loop point.
  rumble(at(LOOP_S + HIT_AT - RUMBLE[RUMBLE.length - 1]![0]));
  fx('swell', CHARGE_AT, 0.25, 4);
  fx('swell', CHARGE_AT + 1.3, 0.25, 4);
  fx('jetStart', CHARGE_AT + 0.05, 0.8, 1.2, 0.3);
  const blow = at(LOOP_S + HIT_AT);
  const blowLevel = ctx.createGain();
  blowLevel.gain.value = IMPACT_GAIN;
  blowLevel.connect(blow.out);
  impact({ ...blow, out: blowLevel });

  await addVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const water = surf(loop[0]!.length, WATER_SWELLS);
  /** The water's level at a sample: gone for the silence. */
  const hush = (i: number): number => {
    const t = i / RATE;
    return 1 - Math.min(ramp(t, SILENT_FROM - 0.1, SILENT_FROM), 1 - ramp(t, SILENT_TO, SILENT_TO + 0.4));
  };
  const mixed = loop.map((ch, c) => ch.map((v, i) => v + WATER_GAIN * hush(i) * water[c]![i]!));
  const peak = Math.max(...mixed.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  return rotatedWav(mixed.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
