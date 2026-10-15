import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "Alien's second jaw is REAL": a moray eel's head is too narrow to suck
 * prey in, so after it bites, a second set of jaws in its throat (the
 * pharyngeal jaws) launches forward into its mouth, grabs the prey and drags
 * it down (Mehta & Wainwright, Nature 449, 2007). Told by a narrator
 * (words.ts) at a moray's crevice in the reef, its head drawn as an X-ray so
 * the second jaw shows, every beat timed to the words, a function of time in
 * seconds over a loop of LOOP_S.
 *
 *   0     the moray is mid-lunge out of its crevice, mouth wide, the second
 *         jaw shooting up its throat into its mouth; it snaps on "REAL", under
 *         a film slate ("ALIEN, 1979") left from the end of the loop
 *   2.7   "The moray eel has one in its throat": it settles, the jaw slides
 *         back and is ringed where it rests
 *   5.0   "Its head is too narrow…": a chromis hovers at its mouth; the head's
 *         height is measured; on "suck" the water barely moves (✗), while on
 *         "like most fish" a grouper sucks another chromis straight in (✓)
 *   7.9   "So after it bites,": it cocks back and bites the chromis; "the
 *         second jaw shoots forward, grabs the prey, and drags it down": the
 *         payoff, the jaw launching to the lips, snapping shut on the prey
 *         and hauling it into the throat; a lump goes down the body
 *   13.2  "Scientists only figured this out in 2007": a camera films it in
 *         slow motion, and "2007" is stamped with the paper it came from
 *   16.0  "So if you thought the movie made it up,": it backs into its
 *         crevice, a film slate claps on "movie", and it lunges again into
 *         the loop, which finishes the sentence.
 */
export const LOOP_S = 18;

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}

export const JAW_AT = said('jaw');
export const REAL_AT = said('REAL.');
export const MORAY_AT = said('moray');
export const ONE_AT = said('one');
export const THROAT_AT = said('throat.');
export const HEAD_AT = said('head');
export const NARROW_AT = said('narrow');
export const SUCK_AT = said('suck');
export const PREY_AT = said('prey');
export const MOST_AT = said('most');
export const FISH_AT = said('fish.');
export const SO_AT = said('So');
export const AFTER_AT = said('after');
export const BITES_AT = said('bites,');
export const SECOND_AT = said('second', 2);
export const SHOOTS_AT = said('shoots');
export const GRABS_AT = said('grabs');
export const DRAGS_AT = said('drags');
export const DOWN_AT = said('down.');
export const SCIENTISTS_AT = said('Scientists');
export const FIGURED_AT = said('figured');
export const YEAR_AT = said('2007.');
export const SO_AGAIN_AT = said('So', 2);
export const THOUGHT_AT = said('thought');
export const MOVIE_AT = said('movie');
export const MADE_AT = said('made');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => number {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t)).at;
}

/** A quick snap 0 → 1 → 0 that pops at `at` and lasts `hold` s. */
export const pop = (t: number, at: number, hold: number): number => {
  const u = t - at;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.15, hold));
};

export interface Pt {
  readonly x: number;
  readonly y: number;
}

// ---------------------------------------------------------------- the moray

/** Body length on screen, px, and its half-length in the drawing's px (ANATOMY.moray.hl): the head is rigid, so points on it map simply. */
export const MORAY_LEN = 1500;
export const TEX_HL = 108;
const K = MORAY_LEN / (2 * TEX_HL);
/** Its nose at rest, just out of the crevice; it lies nose-up by TILT. */
export const REST_NOSE: Pt = { x: 775, y: 805 };
export const TILT = 0.4;
const AXIS: Pt = { x: Math.cos(TILT), y: -Math.sin(TILT) };
/** The mouth of its crevice, on the rock's face, where the body comes out. */
export const HOLE = { x: 125, y: 1080, rx: 62, ry: 150, turn: -TILT } as const;

/** The bite: it cocks back on "after", and its jaws shut on the chromis as the narrator says "bites". */
export const BITE_AT = BITES_AT + 0.02;
const BITE_OUT = 85;

/** How far its nose is out from rest along its line, px: lunging at the loop point, settling, biting, backing into its hole. */
const outAt = looped([
  { t: 0.3, at: 115, rate: 0 },
  { t: 2.2, at: 95 },
  { t: 3.3, at: 0, rate: 0 },
  { t: SUCK_AT - 0.2, at: 0, rate: 0 },
  { t: SUCK_AT + 0.15, at: 22, rate: 0 },
  { t: FISH_AT, at: 10 },
  { t: AFTER_AT + 0.05, at: -45, rate: 0 },
  { t: BITE_AT, at: BITE_OUT, rate: 0 },
  { t: BITE_AT + 0.8, at: 85, rate: 0 },
  { t: DRAGS_AT, at: 70 },
  { t: SCIENTISTS_AT + 0.3, at: 15 },
  { t: SO_AGAIN_AT, at: 0, rate: 0 },
  { t: THOUGHT_AT + 0.1, at: -100, rate: 0 },
  { t: MADE_AT + 0.05, at: -105, rate: 0 },
]);

export interface Moray {
  /** The body's centre, the nose, and nose-up tilt. */
  readonly x: number;
  readonly y: number;
  readonly nose: Pt;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** How far its lower jaw has dropped, radians about the corner of its mouth. */
  readonly gape: number;
  /** A swallowed meal's swelling, 0 .. 1, and where, 0 nose .. 1 tail base. */
  readonly lump: number;
  readonly lumpAt: number;
}

/** Breathing: a moray gapes and closes all the time, pumping water over its gills (9 breaths a loop). */
const breath = (t: number): number => 0.1 + 0.05 * Math.sin((2 * Math.PI * 9 * t) / LOOP_S);
/** The jaw thrown wide for the lunge at the loop point, over the end and the start. */
const HOOK_OPEN = { from: MADE_AT - 0.1, to: REAL_AT + 0.65 } as const;
/** Holding the chromis in its teeth, from the bite until it has dragged it in. */
const HOLD = { from: BITE_AT, to: DOWN_AT + 0.25 } as const;

function gapeAt(t: number): number {
  const base = breath(t);
  if (t >= HOLD.from && t < HOLD.to) return 0.13 + 0.03 * Math.sin(t * 19);
  const hook = t > LOOP_S / 2 ? ramp(t, HOOK_OPEN.from, HOOK_OPEN.from + 0.3) : 1 - ramp(t, HOOK_OPEN.to - 0.6, HOOK_OPEN.to);
  const suck = window01(t, SUCK_AT - 0.2, FISH_AT, 0.3);
  const bite = t < BITE_AT ? ramp(t, AFTER_AT + 0.05, BITE_AT - 0.12) : 1 - ramp(t, HOLD.to, HOLD.to + 0.4);
  const open = Math.max(0.42 * hook, 0.32 * suck, 0.5 * (t < BITE_AT ? bite : 0));
  const snapShut = t < BITE_AT && t > BITE_AT - 0.08 ? (BITE_AT - t) / 0.08 : 1;
  const after = t >= HOLD.to ? 0.13 + (base - 0.13) * ramp(t, HOLD.to, HOLD.to + 0.4) : base;
  return Math.max(after, open * snapShut);
}

export function morayAt(t: number): Moray {
  const out = outAt(t);
  const tilt = TILT + 0.015 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S);
  const axis = { x: Math.cos(tilt), y: -Math.sin(tilt) };
  const nose = { x: REST_NOSE.x + AXIS.x * out, y: REST_NOSE.y + AXIS.y * out + 5 * Math.sin((2 * Math.PI * 4 * t) / LOOP_S) };
  const speed = Math.abs(outAt(t + 0.02) - outAt(t - 0.02)) / 0.04;
  const swallowed = ramp(t, DOWN_AT + 0.4, DOWN_AT + 0.8) * (1 - ramp(t, YEAR_AT - 0.3, YEAR_AT + 0.6));
  return {
    x: nose.x - (axis.x * MORAY_LEN) / 2,
    y: nose.y - (axis.y * MORAY_LEN) / 2,
    nose,
    tilt,
    beat: (2 * Math.PI * 6 * t) / LOOP_S + 0.004 * out,
    effort: 0.25 + 0.5 * clamp01(speed / 600),
    gape: gapeAt(t),
    lump: 0.8 * swallowed,
    lumpAt: lerp(0.33, 0.5, ramp(t, DOWN_AT + 0.4, YEAR_AT + 0.6)),
  };
}

/**
 * A point on its (rigid) head on screen: `along` 0 nose .. 1 tail base, and
 * `side` in the drawing's px from the centre line (down +), turned with the fish.
 */
export function headPoint(m: Moray, along: number, side: number): Pt {
  const lx = MORAY_LEN * (0.5 - along);
  const ly = side * K;
  const c = Math.cos(m.tilt);
  const s = Math.sin(m.tilt);
  return { x: m.x + lx * c + ly * s, y: m.y - lx * s + ly * c };
}

// ---------------------------------------------------------------- the second jaw

/** Where the second jaw's tip sits, `along` the moray: at rest in the throat, and launched to just behind the lips. */
export const JAW_REST = 0.22;
export const JAW_LAUNCHED = 0.035;

export interface SecondJaw {
  /** 0 at rest in the throat .. 1 launched into the mouth. */
  readonly reach: number;
  /** 0 shut .. 1 wide open. */
  readonly open: number;
}

/** It shoots forward (fast, eased at the end) from `from`, arriving `dur` later. */
const shoot = (t: number, from: number, dur: number): number => 1 - (1 - clamp01((t - from) / dur)) ** 3;

/** The hook's launch, over the loop point: off on "made it up", home on "REAL", back by "The". */
const HOOK_LAUNCH = MADE_AT + 0.35;
const HOOK_LAUNCH_S = 0.65;
/** The real thing: launched on "shoots", shut on "grabs", hauled back on "drags it down". */
export const LAUNCH_AT = SHOOTS_AT - 0.02;
const LAUNCH_S = 0.3;
export const GRAB_AT = GRABS_AT + 0.02;
const DRAG_S = 0.85;
/** A slow-motion replay for the camera, after the meal has gone down. */
const REPLAY = { from: FIGURED_AT - 0.1, peak: YEAR_AT - 0.05, to: SO_AGAIN_AT - 0.25 } as const;

export function secondJawAt(t: number): SecondJaw {
  if (t >= MADE_AT) {
    // The hook, launched at the end of the loop and home at its start.
    return { reach: shoot(t, HOOK_LAUNCH, HOOK_LAUNCH_S), open: ramp(t, HOOK_LAUNCH - 0.15, HOOK_LAUNCH + 0.1) };
  }
  if (t < MORAY_AT + 0.3) {
    // …snapping shut on "REAL", then sliding back into the throat.
    const reach = Math.min(shoot(t + LOOP_S, HOOK_LAUNCH, HOOK_LAUNCH_S), 1 - ramp(t, REAL_AT + 0.3, MORAY_AT + 0.3));
    return { reach, open: 1 - ramp(t, REAL_AT - 0.04, REAL_AT + 0.02) };
  }
  if (t < SECOND_AT) {
    // At rest; on "one in its throat" it flexes there.
    return { reach: 0, open: 0.5 * window01(t, ONE_AT, THROAT_AT + 0.4, 0.2) * (0.5 - 0.5 * Math.cos((t - ONE_AT) * 14)) };
  }
  if (t < REPLAY.from) {
    // The real thing: out on "shoots", shut on "grabs", back on "drags it down".
    const reach = Math.min(shoot(t, LAUNCH_AT, LAUNCH_S), 1 - ramp(t, DRAGS_AT, DRAGS_AT + DRAG_S));
    const open = Math.min(ramp(t, LAUNCH_AT - 0.15, LAUNCH_AT + 0.05), 1 - ramp(t, GRAB_AT - 0.04, GRAB_AT + 0.02));
    return { reach, open };
  }
  // The camera's replay: slow, open on the way out, shutting at the end.
  const reach = 0.75 * (t < REPLAY.peak ? ramp(t, REPLAY.from, REPLAY.peak) : 1 - ramp(t, REPLAY.peak + 0.2, REPLAY.to));
  return { reach, open: 0.8 * window01(t, REPLAY.from + 0.2, REPLAY.peak + 0.25, 0.2) };
}

/** The jaw tip's place along the moray. */
export const jawAlong = (j: SecondJaw): number => lerp(JAW_REST, JAW_LAUNCHED, j.reach);

/** Snaps of the jaws: the second jaw on "REAL" and "grabs", the moray's own bite. */
export const SNAPS = [REAL_AT, BITE_AT, GRAB_AT] as const;
export const snapAt = (t: number, at: number): number => (t - at) / 0.3;

// ---------------------------------------------------------------- the prey

/** A fish on screen. `face` runs -1 (left) .. 1 (right), through 0 as it turns. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  /** 0 .. 1: how strongly its X-ray ghost shows where it is inside the moray. */
  readonly ghost: number;
}

/** The chromis the moray eats: it faces the moray, so it goes in head first. */
export const CHROMIS_LEN = 150;
/** Its head is this far (drawing px) behind the moray's nose when bitten. */
const HELD_DEPTH = 9;
const CHROMIS_TEX = CHROMIS_LEN / K;
const ARRIVE = { from: HEAD_AT - 0.5, to: NARROW_AT + 0.2 } as const;

/** Its place in the moray's mouth (`along` of its centre) while held, dragged and swallowed. */
function heldAlong(t: number): number {
  const half = CHROMIS_TEX / 2 / (2 * TEX_HL);
  const bitten = HELD_DEPTH / (2 * TEX_HL) - half;
  if (t < GRAB_AT) return bitten;
  const jaw = jawAlong(secondJawAt(Math.min(t, DRAGS_AT + DRAG_S))) - half + 1.4 / (2 * TEX_HL);
  const deeper = 0.12 * ramp(t, DRAGS_AT + DRAG_S, DRAGS_AT + DRAG_S + 0.7);
  return Math.max(bitten, jaw) + deeper;
}

/** Where it hovers: just where the moray's jaws will close on it. */
const hoverAt = (): Pt => headPoint(morayAt(BITE_AT), heldAlong(BITE_AT), 2);

export function chromisAt(t: number): Fish | null {
  if (t < ARRIVE.from || t > DOWN_AT + 1.4) return null;
  if (t >= BITE_AT) {
    const m = morayAt(t);
    const p = headPoint(m, heldAlong(t), 2);
    const going = ramp(t, DRAGS_AT, DOWN_AT + 0.5);
    return { x: p.x, y: p.y, len: CHROMIS_LEN, face: -1, tilt: -m.tilt, beat: t * 26, effort: 1 - 0.7 * going, ghost: 1 - ramp(t, DOWN_AT + 0.5, DOWN_AT + 1.3) };
  }
  const home = hoverAt();
  const swim = ramp(t, ARRIVE.from, ARRIVE.to);
  // Tugged an inch towards the mouth by the moray's feeble suction, then wriggling back.
  const tug = 22 * window01(t, SUCK_AT, PREY_AT + 0.6, 0.3);
  const wobble = 6 * Math.sin(t * 2.6);
  // It startles as the moray cocks back, and is held still in its line as the jaws close.
  const startle = ramp(t, AFTER_AT, AFTER_AT + 0.15);
  const still = 1 - ramp(t, AFTER_AT, BITE_AT - 0.1);
  return {
    x: lerp(1200, home.x, swim) - tug + 12 * window01(t, AFTER_AT, BITE_AT, 0.15),
    y: home.y + (wobble + 4 * Math.sin(t * 2.1)) * still,
    len: CHROMIS_LEN,
    face: -1,
    tilt: lerp(-TILT, 0.04 * Math.sin(t * 1.7), still),
    beat: t * 11 + 8 * startle,
    effort: 0.35 + 0.4 * window01(t, SUCK_AT, PREY_AT + 0.6, 0.2) + 0.4 * startle,
    ghost: 1,
  };
}

/** The chromis's "!" as the moray cocks back. */
export const chromisAlarm = (t: number): number => pop(t, AFTER_AT - 0.02, BITE_AT - AFTER_AT - 0.04);

/** The grouper gulps its chromis just after "most fish", sucking it in over SUCK_S (grouper.ts). */
export const GULP_AT = FISH_AT + 0.1;
export const SUCK_S = 0.3;

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
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

/** A sharp snap of jaws: a high crack over a low thud. */
const snapSound = (t: number, gain: number, pan: number): SoundCue[] => [
  { id: 'eat', t, pitch: 1.6, gain: 0.35 * gain, pan },
  { id: 'click', t, pitch: 0.6, gain: 0.7 * gain, pan },
  { id: 'hurt', t: t + 0.01, pitch: 0.55, gain: 0.25 * gain, pan },
];

/** Quiet under the voice: tense and low, sharp on each jaw. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'dash', t: HOOK_LAUNCH - 0.05, pitch: 0.6, gain: 0.14, pan: 0.2 },
  ...snapSound(REAL_AT, 1, 0.2),
  { id: 'click', t: THROAT_AT, pitch: 1.3, gain: 0.2, pan: 0.1 },
  { id: 'suck', t: SUCK_AT - 0.1, pitch: 1.4, gain: 0.1, pan: 0.3 },
  { id: 'suck', t: GULP_AT - SUCK_S - 0.3, pitch: 0.9, gain: 0.16, pan: 0.3 },
  { id: 'eat', t: GULP_AT, pitch: 0.8, gain: 0.35, pan: 0.3 },
  { id: 'drop', t: GULP_AT + 0.08, pitch: 1.4, gain: 0.15, pan: 0.3 },
  { id: 'spotted', t: AFTER_AT, pitch: 0.8, gain: 0.14, pan: 0.4 },
  { id: 'lunge', t: BITE_AT - 0.3, pitch: 0.7, gain: 0.3, pan: 0.2 },
  ...snapSound(BITE_AT, 1, 0.2),
  { id: 'dash', t: LAUNCH_AT - 0.04, pitch: 0.7, gain: 0.18, pan: 0.1 },
  ...snapSound(GRAB_AT, 1.1, 0.1),
  { id: 'lunge', t: DRAGS_AT, pitch: 0.5, gain: 0.25, pan: 0 },
  { id: 'eat', t: DRAGS_AT + DRAG_S, pitch: 0.55, gain: 0.3, pan: -0.1 },
  { id: 'click', t: SCIENTISTS_AT + 0.1, pitch: 1.1, gain: 0.3, pan: 0.5 },
  { id: 'clang', t: YEAR_AT, pitch: 1.2, gain: 0.22, pan: -0.2 },
  { id: 'boom', t: YEAR_AT, pitch: 1.6, gain: 0.12, pan: -0.2 },
  { id: 'rustle', t: SO_AGAIN_AT + 0.1, pitch: 0.5, gain: 0.12, pan: -0.4 },
  { id: 'click', t: MOVIE_AT, pitch: 0.45, gain: 0.8, pan: -0.4 },
  { id: 'smash', t: MOVIE_AT, pitch: 0.5, gain: 0.08, pan: -0.4 },
];
