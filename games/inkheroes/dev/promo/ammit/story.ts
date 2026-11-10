import { cue, type SoundCue } from '../audioKit';
import { phrases } from '../captions';
import { attackFrame, attackLength } from '../pixel';
import { clamp01, ramp, window01 } from '../short';
import { endOf, startOf, TEMPO, WORDS } from './words';
import { UNIT_ART } from '../../../src/art/pixel/manifest';

/**
 * #114 "This Monster Ate Your Heart If It Was Too Heavy": narrated, a pure
 * function of time, every beat timed from the words. The facts (Book of the
 * Dead, spell 125): the dead's heart was weighed against the feather of Ma'at;
 * a heart heavier with wrongdoing was eaten by Ammit, "the Devourer", a
 * female monster with a crocodile's head, a lion's (or leopard's) forepart
 * and a hippo's hindquarters, and the dead never reached the afterlife. She
 * is not a judge and was not worshipped; the short says neither. In
 * InkHeroes she guards the Delta, chapter 2 (paid); chapter 1 is free.
 *
 *   0     frame 1: her open crocodile jaws over a heart on the scale (hook)
 *   2.0   "THIS ate it!": the jaws lunge and snap shut, the heart is gone
 *   3.3   "Meet Ammit:": the game's Ammit in a dim tomb
 *   4.5   "a crocodile's head, a lion's body… and a hippo's backside.": the
 *         game's crocodile, lion and a hippo, each named as it is said
 *   8.8   "Three animals the Egyptians feared, in ONE monster.": the three
 *         side by side, then they dissolve into her, each part labelled
 *   12.3  "When you died, your heart was weighed against a feather.": the
 *         scale; the heart drops on one pan, the feather on the other
 *   15.2  "Heavier?": the heart's side sinks
 *   15.8  "Ammit gobbled it up, and you never reached the afterlife…": she
 *         lunges in and gulps it (her attack strip); the tomb goes dark
 *   18.9  "So travel light, because": Ammit in an InkHeroes battle, the call
 *         to action (chapter 1 free)
 *   20.4  the jaws over the heart dissolve back in for frame 1
 */
export const LOOP_S = 21;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word indices (into WORDS) for the beats. */
export const W = {
  heavy: 5, THIS: 6, ate: 7, it: 8, meet: 9, ammit: 10, a: 11, croc: 12, a2: 14, lion: 15, and: 17, hippo: 19, backside: 20,
  three: 21, egyptians: 24, in: 26, one: 27, monster: 28, when: 29, died: 31, your: 32, heart: 33, weighed: 35, feather: 38,
  heavier: 39, ammit2: 40, gobbled: 41, up: 43, and2: 44, never: 46, afterlife: 49, so: 50, light: 52, because: 53,
} as const;

export const at = (i: number): number => startOf(i);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  meet: at(W.meet) - 0.12,
  croc: at(W.a) - 0.12,
  lion: at(W.a2) - 0.12,
  hippo: at(W.and) - 0.12,
  three: at(W.three) - 0.12,
  weigh: at(W.when) - 0.12,
  battle: at(W.so) - 0.2,
} as const;

/** The hook dissolves back in over the battle in the last of the loop. */
export const RETURN_AT = LOOP_S - 0.6;

export type Scene = 'hook' | 'meet' | 'croc' | 'lion' | 'hippo' | 'three' | 'weigh' | 'battle';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.meet) return 'hook';
  if (u < CUT.croc) return 'meet';
  if (u < CUT.lion) return 'croc';
  if (u < CUT.hippo) return 'lion';
  if (u < CUT.three) return 'hippo';
  if (u < CUT.weigh) return 'three';
  if (u < CUT.battle) return 'weigh';
  return 'battle';
};

/** How much of the hook shows: all of it in its own shot, then in dither steps over the battle at the end. */
export const returnAt = (t: number): number => {
  const u = wrap(t);
  if (sceneAt(u) !== 'battle') return sceneAt(u) === 'hook' ? 1 : 0;
  return clamp01((u - RETURN_AT) / (LOOP_S - RETURN_AT - 0.05));
};

const pulse = (u: number, from: number, up: number, down: number): number =>
  u < from ? 0 : u < from + up ? Math.sin(((u - from) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - from - up) / down) ** 2;

// ---------------------------------------------------------------- the hook

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= RETURN_AT ? u - LOOP_S : u;
};

const AMMIT = UNIT_ART.ammit!;
/** Her strip's widest gape, held in the hook; the frames after it close the jaws. */
export const GAPE_FRAME = 4;
export const SNAP_AT = at(W.ate) - 0.05;

export interface HookPose {
  /** Her attack-strip frame: the gape, then the snap. */
  readonly frame: number;
  /** The jaws hovering, then the lunge on "THIS", video px. */
  readonly dx: number;
  readonly dy: number;
  /** How much of the heart is still there (0 once eaten). */
  readonly heart: number;
  /** The jolt on the snap, video px. */
  readonly shake: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const lunge = ramp(u, at(W.THIS) - 0.1, at(W.THIS) + 0.2);
  const hover = Math.round(6 * Math.sin((u + 0.6) * 2.4));
  const snap = u < SNAP_AT ? GAPE_FRAME : Math.min(AMMIT.frames.attack - 1, GAPE_FRAME + 1 + Math.floor((u - SNAP_AT) / 0.07));
  return {
    frame: snap,
    dx: Math.round(36 * lunge),
    dy: hover + Math.round(40 * lunge),
    heart: 1 - ramp(u, SNAP_AT + 0.05, SNAP_AT + 0.3),
    shake: Math.round(12 * pulse(u, SNAP_AT + 0.07, 0.04, 0.3)),
  };
}

// ---------------------------------------------------------------- meet her, and her three animals

export const nameLabel = (t: number): number => window01(wrap(t), at(W.ammit) - 0.08, CUT.croc, 0.15);
/** Each animal on its own, dissolving in as it is named. */
export const animalIn = (t: number, from: number): number => ramp(wrap(t), from - 0.02, from + 0.3);
/** The three side by side, from "Three", and dissolving into her on "ONE". */
export const mergeAt = (t: number): number => ramp(wrap(t), at(W.in), at(W.one) + 0.25);
export const partLabels = (t: number): number => window01(wrap(t), at(W.one) + 0.1, CUT.weigh, 0.2);

// ---------------------------------------------------------------- the weighing

/** The heart dropping onto its pan on "heart", the feather onto the other on "feather" (0 above, 1 landed). */
export const heartDrop = (t: number): number => clamp01((wrap(t) - at(W.heart) + 0.05) / 0.35) ** 2;
export const featherDrop = (t: number): number => ramp(wrap(t), at(W.feather) - 0.1, at(W.feather) + 0.45);
/** The beam's tilt (radians, negative: the heart's side down) from "Heavier?", with a small overshoot. */
export function tiltAt(t: number): number {
  const u = wrap(t);
  const k = ramp(u, at(W.heavier) - 0.05, at(W.heavier) + 0.35);
  const wobble = 0.03 * pulse(u, at(W.heavier) + 0.3, 0.08, 0.4);
  // Once the heart is eaten the beam swings back level.
  const back = ramp(u, STRIKE_AT + 0.1, STRIKE_AT + 0.7);
  return -(0.2 * k + wobble) * (1 - back);
}
/** She walks in from the right after "Heavier?", then bites so the blow lands on "gobbled". */
export const WALK_FROM = at(W.ammit2) - 0.25;
export const BITE_AT = at(W.gobbled) - AMMIT.strike * 0.085 + 0.06;
export const STRIKE_AT = BITE_AT + AMMIT.strike * 0.085;
export const walkIn = (t: number): number => ramp(wrap(t), WALK_FROM, BITE_AT);
export const biteFrame = (t: number): number => attackFrame(wrap(t) - BITE_AT, AMMIT.frames.attack, AMMIT.strike);
/** The heart on the scale until she bites. */
export const heartLeft = (t: number): number => 1 - ramp(wrap(t), STRIKE_AT, STRIKE_AT + 0.15);
/** The tomb going dark on "never reached the afterlife…". */
export const dimAt = (t: number): number => ramp(wrap(t), at(W.never) - 0.1, at(W.afterlife) + 0.3);

// ---------------------------------------------------------------- the battle

export const BATTLE_BITES = [CUT.battle + 0.25, CUT.battle + 1.25] as const;
export const battleFrame = (t: number): { readonly kind: 'idle' | 'attack'; readonly frame: number } => {
  const u = wrap(t);
  const len = attackLength(AMMIT.frames.attack, AMMIT.strike);
  const from = [...BATTLE_BITES].reverse().find((s) => u >= s && u < s + len);
  if (from !== undefined) return { kind: 'attack', frame: attackFrame(u - from, AMMIT.frames.attack, AMMIT.strike) };
  return { kind: 'idle', frame: Math.floor(u * 5) % AMMIT.frames.idle };
};
export const battleHit = (t: number): number => Math.max(...BATTLE_BITES.map((s) => pulse(wrap(t), s + AMMIT.strike * 0.085, 0.04, 0.3)));
export const chapterLabel = (t: number): number => window01(wrap(t), CUT.battle + 0.1, LOOP_S - 0.6, 0.2);

// ---------------------------------------------------------------- the words

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 3, 3, 2, 3, 3, 4, 2, 3, 3, 3, 4, 3, 1, 4, 3, 3, 3, 1];
export const PHRASES = phrases(WORDS, TEMPO, LINE_WORDS, 2, LOOP_S);

export const TEXT = {
  hook: { y: 360, gap: 118, size: 104 },
  line: { y: 390, size: 100 },
} as const;

// ---------------------------------------------------------------- the call to action

export const CTA = { from: CUT.battle + 0.05, to: LOOP_S - 0.6, big: 'Chapter 1 free' } as const;
/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkHeroes · 16bit.ink/heroes', from: CTA.from } as const;

// ---------------------------------------------------------------- the sound

/** Quiet under the voice, one mood per beat. */
export const SOUNDS: readonly SoundCue[] = [
  cue('day', 0.04, 0.45, 0.35),
  cue('spell', at(W.heavy), 0.5, 0.3),
  cue('hit', at(W.THIS) - 0.03, 0.5, 0.7),
  cue('swing', SNAP_AT, 0.6, 0.45),
  cue('hit', SNAP_AT + 0.08, 0.35, 0.9),
  cue('death', at(W.it), 0.55, 0.35),
  cue('flag', at(W.ammit), 0.7, 0.45),
  cue('card', at(W.croc), 0.8, 0.4),
  cue('card', at(W.lion), 1, 0.4),
  cue('card', at(W.hippo), 1.2, 0.4),
  cue('step', at(W.backside), 0.4, 0.6),
  cue('hire', at(W.three), 0.8, 0.35),
  cue('spell', at(W.in), 0.7, 0.45),
  cue('hit', at(W.one) - 0.02, 0.45, 0.6),
  cue('death', at(W.died), 0.8, 0.35),
  cue('pickup', at(W.heart) + 0.3, 0.6, 0.45),
  cue('card', at(W.feather) + 0.2, 1.5, 0.35),
  cue('swing', at(W.heavier), 0.3, 0.5),
  cue('hit', at(W.heavier) + 0.3, 0.6, 0.5),
  cue('step', WALK_FROM + 0.05, 0.45, 0.45, 0.4),
  cue('step', WALK_FROM + 0.35, 0.45, 0.45, 0.3),
  cue('swing', BITE_AT + 0.05, 0.6, 0.45),
  cue('hit', STRIKE_AT, 0.35, 0.9),
  cue('lose', at(W.never), 0.8, 0.35),
  ...BATTLE_BITES.flatMap((s) => [cue('swing', s + 0.05, 0.7, 0.35), cue('hit', s + AMMIT.strike * 0.085, 0.45, 0.55, 0.3)]),
  cue('win', CTA.from + 0.05, 1, 0.3),
  cue('spell', RETURN_AT, 0.5, 0.25),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const showsHook = returnAt(t) > 0;
  const battleShows = sceneAt(t) === 'battle' && returnAt(t) < 1;
  const judging = sceneAt(t) === 'weigh';
  return {
    return: returnAt(t), hookClock: showsHook ? hookClock(t) : 0, frame: showsHook ? h.frame : 0, dx: showsHook ? h.dx : 0, dy: showsHook ? h.dy : 0,
    heart: showsHook ? h.heart : 0, shake: showsHook ? h.shake : 0,
    hook: PHRASES.hookAlpha(wrap(t)), cta: window01(wrap(t), CTA.from, CTA.to, 0.2),
    name: nameLabel(t), merge: sceneAt(t) === 'three' ? mergeAt(t) : 0, labels: partLabels(t),
    drop: judging ? heartDrop(t) : 0, feather: judging ? featherDrop(t) : 0, tilt: judging ? tiltAt(t) : 0, walk: judging ? walkIn(t) : 0,
    dim: judging ? dimAt(t) : 0, battle: battleShows ? 1 : 0, battleFrame: battleShows ? battleFrame(t).frame : 0, chapter: battleShows ? chapterLabel(t) : 0,
  };
}
