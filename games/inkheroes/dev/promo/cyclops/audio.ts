import { renderNarrated } from '../audioKit';
import { LOOP_S, SOUNDS } from './story';

/**
 * The soundtrack: the narrator (voice.mp3, starting with the loop) straight
 * to the output, InkHeroes's own effects quiet under him, one mood per beat
 * (story.ts SOUNDS), folded into the loop and set to peak at −4 dB.
 */
const VOICE_URL = new URL('./voice.mp3', import.meta.url).href;
/** The effects' level under the voice. */
const SFX_GAIN = 0.9;

export const renderCyclopsAudio = (start = 0): Promise<Blob> =>
  renderNarrated({ name: 'cyclops', loopS: LOOP_S, voiceUrl: VOICE_URL, sounds: SOUNDS, sfxGain: SFX_GAIN, start });
