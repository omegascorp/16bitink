import { noise, tone, type Voice } from '../../../src/audio/synth';
import { foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS, SYNTHS, type SynthCue } from './cues';
import { LOOP_S } from './story';

/**
 * The short's soundtrack: the narrator (voice.mp3, from the loop's start,
 * straight to the output at VOICE_GAIN), the game's effects and a few
 * tones and breaths of our own quiet under it (cues.ts: one mood a beat),
 * and a faint wind through the haze. Everything past the loop's end folds
 * back onto its start, so the sound loops with the picture.
 */
const TAIL_S = 3;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** Mark's take peaks near -2.5 dB: this brings the video's peak to about -4 dB. */
const VOICE_GAIN = 0.8;
/** The effects' master level (their synth levels are quiet). */
const SFX_GAIN = 2.2;
const WIND_GAIN = 0.55;
const WIND_SWELLS = 6;

function playSynth(ctx: OfflineAudioContext, out: AudioNode, cue: SynthCue): void {
  // The offline context has every node factory the synth uses.
  const v: Voice = { ctx: ctx as unknown as AudioContext, out, t: cue.t, pitch: 1 };
  if (cue.kind === 'tone') tone(v, { from: cue.from, to: cue.to, dur: cue.dur, gain: cue.gain, type: cue.type, attack: cue.attack, vibrato: cue.vibrato });
  else noise(v, { filter: cue.filter, from: cue.from, to: cue.to, dur: cue.dur, gain: cue.gain, q: cue.q, attack: cue.attack });
}

async function addVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = VOICE_GAIN;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderTitanAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  for (const cue of SYNTHS) playSynth(ctx, master, cue);
  await addVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const wind = surf(loop[0]!.length, WIND_SWELLS);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => v + WIND_GAIN * wind[c]![i]!)), LOOP_S, start);
}
