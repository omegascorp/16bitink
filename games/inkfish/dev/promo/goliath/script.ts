import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  AND_AT, BIGGER_AT, BITE_AT, BLACKTIP_AT, DOOR_AT, FISHERMAN_AT, FLORIDA_AT, FOUR_FOOT_AT, GOLIATH_AT, HUGE_AT, LOOP_S, MOUTH_AT, OPENS_AT, REELING_AT, REWINDS, RIP,
  RISES_AT, SHARK_AT, SHUT, SO_AT, THERES_AT, WHEN_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Florida, 2014" at the top, from "Florida" until the angler is on screen. */
export const placeLabel = (t: number): number => window01(wrap(t), FLORIDA_AT - 0.05, FISHERMAN_AT + 0.9, 0.2);
/** The "4 ft" bar under the shark, from "four-foot" to "when". */
export const sizeBar = (t: number): number => window01(wrap(t), FOUR_FOOT_AT - 0.05, WHEN_AT + 0.15, 0.15);
/** The door: popping up on "door", gone as the mouth opens and we close in. */
export function doorAt(t: number): number {
  const u = wrap(t);
  if (u < DOOR_AT - 0.05 || u > MOUTH_AT + 0.2) return 0;
  const since = u - DOOR_AT + 0.05;
  const pop = since < 0.14 ? (since / 0.14) * 1.12 : 1 + 0.12 * Math.max(0, 1 - (since - 0.14) / 0.1);
  return pop * (1 - ramp(u, OPENS_AT, MOUTH_AT + 0.2));
}

// ---------------------------------------------------------------- captions

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
    // The first line is up from the loop's first frame.
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

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The reel's ratchet as the fisherman winds. */
const REEL: readonly SoundCue[] = Array.from({ length: 8 }, (_, i) => cue('click', REELING_AT - 0.1 + i * 0.12, 1.5, 0.1, 0.35));

/**
 * Quiet under the voice: it does the talking. Surprise in the hook (water
 * rushing in, the shark thrashing, a big chomp on "bite!"), a tape-rewind
 * whoosh, the curious surface (a splash, the reel's ratchet, a tick for the
 * size bar), a low rumble and a slow lunge for the nervous rise, a "!" for
 * the grouper and a light pop for the door, then the biggest moment: the
 * suck, the GULP and its boom, the hook pinging free, a burp of bubbles for
 * the chuckle, and the rewind round to the start.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: in the mouth, thrashing, the bite.
  cue('suck', 0.05, 0.55, 0.22, 0.1),
  cue('rustle', 0.5, 0.8, 0.16, 0.3),
  cue('lunge', SHARK_AT, 0.5, 0.18, 0.1),
  cue('rustle', 1.6, 0.9, 0.14, 0.3),
  cue('eatBig', BITE_AT, 0.6, 0.5),
  cue('boom', BITE_AT + 0.02, 0.45, 0.16),
  cue('drop', BITE_AT + 0.3, 0.7, 0.12, -0.1),
  // Rewind to the boat.
  cue('dash', REWINDS[0].from, 1.6, 0.2, -0.3),
  cue('rustle', REWINDS[0].from + 0.1, 1.8, 0.14, -0.3),
  cue('dash', 4.2, 1.3, 0.14, 0.3),
  // The surface: a splash at the boat, the reel, the size bar.
  cue('splash', FISHERMAN_AT - 0.2, 0.9, 0.12, 0.3),
  ...REEL,
  cue('lash', FOUR_FOOT_AT - 0.1, 1.1, 0.1, 0.2),
  cue('click', FOUR_FOOT_AT + 0.05, 1.0, 0.18, 0.2),
  cue('rustle', BLACKTIP_AT + 0.2, 0.9, 0.12, 0.3),
  // Something huge: a low rumble and a slow lunge from below.
  cue('boom', HUGE_AT - 0.1, 0.3, 0.2),
  cue('lunge', RISES_AT, 0.32, 0.28, -0.1),
  cue('boom', RISES_AT + 0.6, 0.26, 0.14),
  cue('rustle', RISES_AT + 0.3, 1.0, 0.12, 0.4),
  // The grouper out of the dark, and the door.
  cue('spotted', GOLIATH_AT, 0.7, 0.16),
  cue('click', DOOR_AT, 1.25, 0.22, 0.3),
  cue('drop', DOOR_AT + 0.02, 1.5, 0.12, 0.3),
  // The gulp.
  cue('lunge', OPENS_AT, 0.45, 0.24),
  cue('suck', AND_AT, 0.6, 0.3, 0.1),
  cue('eatBig', SHUT, 0.5, 0.38),
  cue('boom', SHUT + 0.02, 0.38, 0.2),
  cue('smash', SHUT + 0.03, 0.6, 0.08),
  cue('drop', SHUT + 0.25, 0.55, 0.2),
  cue('eat', SHUT + 0.42, 0.55, 0.22),
  cue('eat', SHUT + 0.82, 0.6, 0.16),
  // The hook tears free; a satisfied burp.
  cue('free', RIP, 1.3, 0.14, 0.2),
  cue('lash', RIP + 0.05, 1.4, 0.12, 0.2),
  cue('drop', BIGGER_AT - 0.05, 0.8, 0.18),
  cue('drop', BIGGER_AT + 0.2, 1.0, 0.12),
  cue('rustle', THERES_AT + 0.4, 0.7, 0.08, -0.2),
  // Rewind round to the start.
  cue('dash', REWINDS[1].from, 1.6, 0.2, -0.3),
  cue('rustle', REWINDS[1].from + 0.1, 1.8, 0.12, -0.3),
  cue('suck', SO_AT + 1.0, 0.55, 0.18, 0.1),
];
