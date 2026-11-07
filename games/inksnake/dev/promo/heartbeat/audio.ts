import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { BEATS, LOOP_S, PUMPS, SOUNDS, wrap } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) on top; the
 * heartbeat (low, with a little in the 100 Hz range so a phone's speaker
 * carries it), the bulb's soft mechanical push and the game's creaks quiet
 * under him. Folded into a loop and set to peak at −4 dB. His last word runs
 * up to the loop point, so the loop finishes his sentence.
 */
const TAIL_S = 2;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
const SFX_GAIN = 1.1;
const PEAK = 10 ** (-4 / 20);
const THUMP_GAIN = 0.62;
const PUMP_GAIN = 0.22;
const DUB_AT = 0.25;

/** One soft thud: a falling sine with a little more body an octave up. */
function thud(ctx: OfflineAudioContext, out: AudioNode, t: number, gain: number): void {
  for (const [from, to, level, decay] of [[74, 44, 1, 0.2], [150, 84, 0.42, 0.11]] as const) {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain * level, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + decay + 0.14);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.16);
  }
}

async function addVoice(ctx: OfflineAudioContext): Promise<void> {
  const response = await fetch(VOICE_URL);
  if (!response.ok) throw new Error(`voice.mp3: ${response.status}`);
  const voice = ctx.createBufferSource();
  voice.buffer = await ctx.decodeAudioData(await response.arrayBuffer());
  voice.connect(ctx.destination);
  voice.start(0);
}

export async function renderHeartbeatAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const b of BEATS) {
    thud(ctx, master, wrap(b.t), THUMP_GAIN * b.k);
    thud(ctx, master, wrap(b.t) + DUB_AT, THUMP_GAIN * 0.62 * b.k);
  }
  for (const t of PUMPS) thud(ctx, master, t, PUMP_GAIN);
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  await addVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('heartbeat: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
