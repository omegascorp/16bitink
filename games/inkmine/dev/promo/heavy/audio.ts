import { SFX_IDS, type SfxId } from '../../../src/audio/recipes';
import { foldLoop, offlineMix, rotatedWav, surf } from '../audioKit';
import { SOUNDS, type CustomSfx, type SoundCue } from './script';
import { playCustom } from './sfx';
import { LOOP_S } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, from the loop's start, straight
 * to the output at VOICE_GAIN), the effects quiet under him (script.ts
 * lists them, beat by beat), and a low wind across the heavy world. The
 * voice's last word ("Because") runs up to the loop point, and everything
 * past it is folded back onto the start, so the slam's boom carries into
 * the first frame.
 */
const TAIL_S = 2.5;
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** Mark's takes are loud: this keeps the video's peak near -4 dB. */
const VOICE_GAIN = 0.86;
/** The effects' master level (their synth levels are quiet). */
const SFX_GAIN = 2.4;
const WIND_GAIN = 0.35;
const WIND_SWELLS = 4;
const OUT_GAIN = 1;

const isGameSfx = (id: SoundCue['id']): id is SfxId => (SFX_IDS as readonly string[]).includes(id);

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

export async function renderHeavyAudio(start = 0): Promise<Blob> {
  const { ctx, master, play } = offlineMix(LOOP_S + TAIL_S, SFX_GAIN);
  for (const c of SOUNDS) {
    if (isGameSfx(c.id)) {
      play(c.id, c.t, c.pitch, c.gain, c.pan);
      continue;
    }
    const level = ctx.createGain();
    level.gain.value = c.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan;
    level.connect(pan).connect(master);
    // The offline context has every node factory the synth uses.
    playCustom(c.id as CustomSfx, { ctx: ctx as unknown as AudioContext, out: level, t: c.t, pitch: c.pitch }, c.dur);
  }
  await addVoice(ctx);
  const loop = foldLoop(await ctx.startRendering(), LOOP_S);
  const wind = surf(loop[0]!.length, WIND_SWELLS);
  return rotatedWav(loop.map((ch, c) => ch.map((v, i) => OUT_GAIN * (v + WIND_GAIN * wind[c]![i]!))), LOOP_S, start);
}
