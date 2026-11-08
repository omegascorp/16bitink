import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import type { Pt } from '../sprites';
import type { Fleck } from './marks';
import { CAY_T, cayKrait, hookKrait, HOOK } from './moves';
import { CAY, CRACK } from './reef';
import { headAngle } from './snake';
import {
  BACK_FROM, BANDED_AT, BITE_AT, CRACK_FROM, CRAWLS_AT, EELS_AT, HIDING_AT, HOLD_AT, HOURS_AT, LOOP_S, OUT_FROM, SLEEP_AT, SLIDES_AT, TWO_AT,
  VENOM_AT, WHOLE_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), what bubbles and ripples, and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** Where the words go on screen (px, centres and alphabetic baselines; sizes in px), all between y 270 and 1240. */
export const TEXT = {
  krait: { x: 540, y: 400, size: 96 },
  clock: { x: 250, y: 418, r: 62 },
  hours: { x: 620, y: 448, size: 104 },
  /** By the bite, offset from it. */
  venom: { dx: 120, dy: -110, size: 100 },
  drop: { dx: 120, dy: -40, r: 26, fall: 40 },
  /** Up and to the right of the sleeping head; each "z" rises `rise` px as it fades. */
  zs: { dx: 70, dy: -120, size: 120, rise: 260 },
} as const;


/** "banded sea krait" over the reef as it glides off, from "banded" to just after "slides". */
export const kraitLabel = (t: number): number => window01(wrap(t), BANDED_AT - 0.08, SLIDES_AT + 0.95, 0.18);
/** "venom" by the bite, from "venom" to the cut. */
export const venomLabel = (t: number): number => window01(wrap(t), VENOM_AT - 0.05, OUT_FROM + 0.02, 0.12);
/** "up to 2 hours" and the clock, from "hold" until the cay. */
export const hoursLabel = (t: number): number => window01(wrap(t), HOLD_AT - 0.12, HOURS_AT + 0.75, 0.2);
/** The clock's minute hand: two turns (two hours) between "hold" and "hours"; back at 0 while the clock is hidden. */
export const clockTurns = (t: number): number => (hoursLabel(t) > 0 ? 2 * Math.min(1, Math.max(0, (wrap(t) - HOLD_AT) / (HOURS_AT + 0.25 - HOLD_AT))) : 0);
/** The breath meter round the head: shown from the swim off until it's full again on the sand. */
export const breathShown = (t: number): number => window01(wrap(t), 10.05, CAY_T.shore + 1.45, 0.25);
/** Seconds the krait has been asleep (the "z"s), from just before "sleep". */
export const asleepFor = (t: number): number => (wrap(t) >= SLEEP_AT - 0.15 && wrap(t) < BACK_FROM ? wrap(t) - SLEEP_AT + 0.15 : 0);

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

// ---------------------------------------------------------------- bubbles and ripples

/** A steady 0..1 for (i, k). */
const hash = (i: number, k: number): number => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** The nostrils' place (board px) for a pose: just ahead of the head. */
function noseOf(pose: ReturnType<typeof hookKrait>): Pt {
  const h = pose.route.at(pose.headS);
  const a = headAngle(pose);
  return { x: h.x + Math.cos(a) * pose.width * 0.7, y: h.y + Math.sin(a) * pose.width * 0.7 };
}

/** Bubbles from the nostrils every ~0.3 s while it swims holding its breath, from `from` to `to` (on the scene's clock). */
function bubblesOf(from: number, to: number, pose: (t: number) => ReturnType<typeof hookKrait>, seed: number): Fleck[] {
  const out: Fleck[] = [];
  let i = 0;
  for (let t = from; t < to; t += 0.24 + 0.2 * hash(i, seed), i++) {
    const n = pose(t);
    const nose = noseOf(n);
    for (let k = 0; k < 1 + Math.floor(hash(i, seed + 1) * 2); k++) {
      out.push({
        at: { x: nose.x + (hash(i, seed + 2 + k) - 0.5) * 5, y: nose.y + (hash(i, seed + 5 + k) - 0.5) * 5 },
        born: t,
        life: 1.1 * (0.7 + hash(i, seed + 8 + k) * 0.5),
        r: 1.8 + hash(i, seed + 11 + k) * 1.8,
        v: { x: (hash(i, seed + 14 + k) - 0.5) * 10, y: -7 - hash(i, seed + 17 + k) * 9 },
      });
    }
  }
  return out;
}

/** The hook's bubbles (as it glides to the crack), on the hook's clock. */
export const HOOK_BUBBLES: readonly Fleck[] = bubblesOf(2.2, 5.1, hookKrait, 31);
/** The swim to the cay, the breath held, on the video's clock. */
export const CAY_BUBBLES: readonly Fleck[] = bubblesOf(9.75, CAY_T.shore - 0.1, cayKrait, 57);

/** Ripples: a splash where it leaves the water, and rings round its head through the shallows. */
export const CAY_RIPPLES: readonly Fleck[] = (() => {
  const out: Fleck[] = [];
  for (let t = 11.1; t < CAY_T.shore + 0.4; t += 0.26) {
    const h = noseOf(cayKrait(t));
    const fromCay = Math.hypot(h.x - CAY.x, h.y - CAY.y);
    if (fromCay < CAY.r + 40 && fromCay > CAY.r - 4) out.push({ at: h, born: t, life: 0.9, r: 24, v: { x: 0, y: 0 } });
  }
  const shore = noseOf(cayKrait(CAY_T.shore));
  for (let i = 0; i < 3; i++) out.push({ at: shore, born: CAY_T.shore + i * 0.12, life: 0.9, r: 34, v: { x: 0, y: 0 } });
  return out;
})();

/** The crack's mouth, where the dark opening is drawn over the head (board px). */
export const CRACK_MOUTH: Pt = CRACK;

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: wrap(t), pitch, gain, pan });

/** A gulp at each step of the jaw-walk, from `from` every `step` s until `to`. */
const steps = (from: number, to: number, step: number, pitch: number, gain: number): SoundCue[] => {
  const out: SoundCue[] = [];
  for (let t = from + step; t < to; t += step) out.push(cue('gulp', t, pitch, gain, 0.05));
  return out;
};

/**
 * Quiet under the voice, matching each line's mood. Excited hook: the jaws'
 * wet gulps as they walk over the moray, a big swallow on "WHOLE!". Curious:
 * the slither over the reef, a soft bump at the crack and a whoosh into its
 * dark. Nervous: a low growl, slow ticks like a heartbeat, a rustle as the
 * eyes open. Dramatic: the strike's hiss, the nip, the sting of the venom,
 * then the long swallow and its gulps. Surprised: bubbles and a bright
 * rising "ding" on "TWO", the clock ticking. Chuckles: out of the water with
 * a plop, the slither up the sand, a coil's creak, a gentle settling note
 * for "sleep". "So yes,": the slither, the strike, the first gulp.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook (the jaw-walk's steps from the grab, so they carry on round the loop's seam).
  ...steps(HOOK.grab + LOOP_S, LOOP_S + HOOK.gone - 0.1, HOOK.step, 0.8, 0.2),
  cue('swallow', WHOLE_AT - 0.05, 0.85, 0.42),
  cue('gulp', WHOLE_AT + 0.35, 0.6, 0.3),
  // Curious: off over the reef to the crack.
  cue('steps', 2.5, 0.9, 0.2, -0.2),
  cue('steps', 3.3, 1.0, 0.18, 0.1),
  cue('steps', 4.1, 0.95, 0.18, -0.1),
  cue('bump', 4.95, 0.8, 0.2),
  cue('dive', 5.15, 0.55, 0.16),
  // Nervous: inside the crack.
  cue('growl', CRACK_FROM + 0.1, 0.5, 0.2),
  cue('tick', 5.95, 0.55, 0.3),
  cue('tick', 6.4, 0.55, 0.3),
  cue('appear', HIDING_AT - 0.02, 0.6, 0.5),
  cue('tick', 6.85, 0.55, 0.3),
  cue('tick', EELS_AT + 0.55, 0.55, 0.32),
  cue('growl', 7.0, 0.45, 0.16),
  // Dramatic: the bite, the venom, down it goes.
  cue('strike', BITE_AT - 0.06, 1.0, 0.5),
  cue('nip', BITE_AT + 0.02, 0.8, 0.3),
  cue('hurt', VENOM_AT + 0.05, 0.7, 0.16),
  cue('swallow', CAY_T.down - 0.05, 0.8, 0.4),
  ...steps(CAY_T.down, CAY_T.gone, CAY_T.step, 0.7, 0.2),
  cue('gulp', CAY_T.gone - 0.02, 0.55, 0.34),
  // Surprised: bubbles, the clock, the "ding" on TWO.
  cue('plop', 10.25, 1.3, 0.12, 0.2),
  cue('plop', 10.85, 1.5, 0.1, -0.2),
  cue('plop', 11.45, 1.4, 0.1, 0.1),
  ...Array.from({ length: 7 }, (_, i) => cue('tick', HOLD_AT + 0.1 + i * 0.25, 1.6, 0.1, 0.25)),
  cue('grown', TWO_AT - 0.03, 1.0, 0.34),
  // Chuckles: up onto the sand, a coil, asleep.
  cue('plop', CAY_T.shore, 0.75, 0.24),
  cue('steps', CRAWLS_AT - 0.05, 0.85, 0.22, 0.1),
  cue('steps', CRAWLS_AT + 0.6, 0.8, 0.2, -0.1),
  cue('squeeze', 14.15, 1.25, 0.12),
  cue('lose', SLEEP_AT, 0.85, 0.14),
  // "So yes,": the next one.
  cue('steps', BACK_FROM + 0.1, 1.0, 0.14),
  cue('strike', LOOP_S + HOOK.strike, 1.05, 0.48),
  cue('gulp', LOOP_S + HOOK.grab + 0.02, 0.75, 0.24),
];
