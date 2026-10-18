import { synthesize } from '../../../src/audio/synth';
import { foldLoop, offlineMix, RATE, rotatedWav, surf } from '../audioKit';
import { droneBed, droneAt } from './bed';
import { SOUNDS, type SoundCue } from './script';
import { CUSTOM, isCustom } from './sounds';
import { LOOP_S } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, from the loop's start) straight
 * to the output at VOICE_GAIN, the effects quiet under it (script.ts lists
 * them), the red sun's drone (bed.ts) and a faint wind under the forest,
 * everything past the loop point folded back onto its start.
 */
const TAIL_S = 3;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The narrator's level: the take peaks at −2.6 dB on its own, so the video peaks near −4 dB. */
const VOICE_GAIN = 0.9;
/** The effects' master level (their synth levels are quiet). */
const SFX_GAIN = 2.2;
const WIND_GAIN = 0.18;
/** The whole mix. */
const OUT_GAIN = 1;

function playCue(ctx: OfflineAudioContext, master: GainNode, c: SoundCue): void {
  const level = ctx.createGain();
  level.gain.value = c.gain;
  const panner = ctx.createStereoPanner();
  panner.pan.value = c.pan;
  level.connect(panner).connect(master);
  // The offline context has every node factory the synth uses.
  const voice = { ctx: ctx as unknown as AudioContext, out: level, t: c.t, pitch: c.pitch };
  if (isCustom(c.id)) CUSTOM[c.id](voice);
  else synthesize(c.id, voice);
}

async function addVoiceAt(ctx: OfflineAudioContext, gain: number): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`${VOICE_URL}: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  const level = ctx.createGain();
  level.gain.value = gain;
  voice.connect(level).connect(ctx.destination);
  voice.start(0);
}

export async function renderPlantsAudio(start = 0): Promise<Blob> {
  const { ctx, master } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const c of SOUNDS) playCue(ctx, master, c);
  await addVoiceAt(ctx, VOICE_GAIN);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const frames = loop[0]!.length;
  const drone = droneBed(frames);
  const wind = surf(frames, 3);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => {
    const t = i / RATE;
    return OUT_GAIN * (v + drone[c]![i]! + WIND_GAIN * droneAt(t) * wind[c]![i]!);
  })), LOOP_S, start);
}
