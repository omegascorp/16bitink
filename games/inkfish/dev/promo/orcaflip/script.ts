import type { SfxId } from '../../../src/audio/recipes';
import {
  ANYONE_AT, AGAIN2_AT, AGAIN_AT, BELLY_AT, BIGGEST_AT, BUT_AT, CAMERA_AT, CAUGHT_AT, CHECK_AT, DOWN_AT, EARTH_AT, FLIP_AT, HIT_AT, HITS, IMPACT, KID_AT, LIVER_AT, LOOP_S, LONG_AT,
  MEXICO_AT, OFF_AT, ORCAS_AT, SCIENTISTS_AT, SINKS_AT, SKY_AT, SPEED_AT, SUSPECT_AT, THEY_AT, THE_AT, TWENTY_AT, UNTIL_AT, WHALE_AT, WHY_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  adult: { y: 400, size: 84 },
  size: { y: 640, size: 190 },
  bar: { y: 745, size: 0 },
  liver: { y: 470, size: 190 },
  rec: { y: 350, size: 70 },
  gulf: { y: 520, size: 120 },
  caption: { y: 1200, size: 96 },
} as const;

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/**
 * Quiet under the voice, one mood a beat: a smash and a splash with a bright
 * ding for the hook (excited), a low sting then a rising chirp and a squawk
 * for the kid (surprised, a laugh), a dash and a smash on every hit
 * (dramatic), almost nothing for the hang (nervous), rising clicks and a
 * warm glow for the x-ray (curious), a sliding drop and a squawk for the sink
 * (cheeky), and camera clicks, a whoosh and the slam at the seam (mischievous).
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the slam just before frame 1, its splash, a ding as the title lands.
  cue('smash', LOOP_S + IMPACT, 1.0, 0.15),
  cue('splash', LOOP_S + IMPACT + 0.02, 0.9, 0.1, -0.2),
  cue('powerup', ORCAS_AT, 1.4, 0.08),
  cue('lunge', FLIP_AT - 0.05, 0.8, 0.1, 0.3),
  cue('powerup', WHALE_AT, 1.7, 0.09),
  cue('clang', DOWN_AT - 0.05, 0.7, 0.1),
  // The kid: surprise, then the joke.
  cue('spotted', THE_AT, 1.0, 0.1),
  cue('boom', BIGGEST_AT, 0.4, 0.1),
  cue('rustle', EARTH_AT - 0.2, 0.4, 0.05),
  cue('powerup', KID_AT - 0.05, 1.9, 0.09),
  cue('squawk', KID_AT + 0.25, 1.6, 0.07, 0.2),
  cue('click', TWENTY_AT, 1.4, 0.08, -0.2),
  cue('click', LONG_AT - 0.1, 1.7, 0.08, 0.2),
  // The hits: a dash in, a smash and a boom, a lash as it spins.
  cue('dash', THEY_AT + 0.05, 0.8, 0.09, -0.3),
  ...HITS.flatMap((h, i) => [
    cue('dash', h - 0.3, 0.9 + 0.1 * i, 0.1, i === 1 ? 0.3 : -0.3),
    cue('smash', h, 0.8 + 0.12 * i, 0.17),
    cue('boom', h + 0.01, 0.5, 0.12),
    cue('lash', h + 0.2, 0.7 + 0.1 * i, 0.08, 0.2),
  ]),
  cue('click', SPEED_AT, 1.2, 0.05),
  // The hang: nearly silent, one slow note.
  cue('rustle', UNTIL_AT, 0.35, 0.04),
  cue('drop', BELLY_AT, 0.3, 0.05),
  cue('powerup', SKY_AT, 0.4, 0.035),
  // The x-ray: a curious climb, the cut, a warm glow on "liver".
  cue('click', WHY_AT, 1.3, 0.08, -0.2),
  cue('dash', WHY_AT + 0.1, 1.2, 0.07, 0.3),
  cue('powerup', SCIENTISTS_AT - 0.05, 1.5, 0.09),
  cue('click', SUSPECT_AT, 1.5, 0.08, 0.2),
  cue('suck', LIVER_AT - 0.35, 0.9, 0.07),
  cue('powerup', LIVER_AT - 0.05, 0.9, 0.1),
  cue('spotted', LIVER_AT + 0.08, 1.2, 0.07),
  // The sink: cheeky, a long slide down and a squawk of dismay.
  cue('drop', BUT_AT + 0.1, 0.6, 0.1),
  cue('suck', SINKS_AT - 0.1, 0.7, 0.09, 0.2),
  cue('squawk', ANYONE_AT, 1.5, 0.07, 0.3),
  cue('lash', CHECK_AT - 0.3, 0.5, 0.06),
  cue('hurt', CHECK_AT + 0.05, 1.3, 0.07, -0.2),
  // Caught on camera: clicks, a rising whoosh, the lunge that lands on frame 1.
  cue('click', CAUGHT_AT, 1.8, 0.09, -0.2),
  cue('click', CAMERA_AT, 1.4, 0.09, 0.2),
  cue('rustle', OFF_AT, 0.5, 0.05),
  cue('dash', MEXICO_AT - 0.1, 0.9, 0.1, -0.2),
  cue('lunge', LOOP_S + IMPACT - 0.3, 1.1, 0.12, 0.2),
];
