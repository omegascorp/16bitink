import { foldLoop, offlineMix, rotatedWav } from '../audioKit';
import { BEATS, LOOP_S, SOUNDS, wrap } from './story';

/**
 * The soundtrack: a synthesized heartbeat that drives the short (low, felt
 * more than heard, with a little in the 100 Hz range so a phone's speaker
 * carries it), the game's coil creaks, silence on the stop, a gulp. No voice,
 * no music. Folded into a loop and set to peak at −4 dB.
 */
const TAIL_S = 2;
const SFX_GAIN = 2;
const PEAK = 10 ** (-4 / 20);
const THUMP_GAIN = 1.5;
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

export async function renderHeartbeatAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const b of BEATS) {
    const at = wrap(b.t);
    thud(ctx, master, at, THUMP_GAIN * b.k);
    thud(ctx, master, at + DUB_AT, THUMP_GAIN * 0.62 * b.k);
  }
  for (const cue of SOUNDS) play(cue.id, cue.t, cue.pitch, cue.gain, cue.pan);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const peak = Math.max(...loop.map((ch) => ch.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  if (peak <= 0) throw new Error('heartbeat: silent soundtrack');
  return rotatedWav(loop.map((ch) => ch.map((v) => (v * PEAK) / peak)), LOOP_S, start);
}
