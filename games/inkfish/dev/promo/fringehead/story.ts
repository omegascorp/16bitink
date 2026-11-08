import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { BODY_UNITS, type FishPose, gapeOf, type Mood } from './fringehead';
import { LOOP_S, TEMPO, WORDS } from './words';

export { LOOP_S };

/**
 * "These fish fight by comparing mouth size": the sarcastic fringehead. Told
 * by a narrator (words.ts); every beat is a function of time over the loop,
 * timed from the words.
 *
 *   0     "These fish fight by comparing MOUTHS!": two fringeheads mouth to
 *         mouth, both gapes flared enormous, pressed together on plain dark
 *         water; they pull back and ram again on "MOUTHS!"
 *   2.4   "The sarcastic fringehead's jaws stretch way past its own head.": one
 *         fish alone, its jaw folded along its cheek; the jaw is traced, then
 *         flares on "stretch", and a faint outline of the head shows how far
 *         past it the gape reaches
 *   5.8   "When two males meet, they open wide… and SLAM their mouths together!":
 *         a sandy floor, a snail shell; one fish swims in, the other comes out
 *         of the shell; they face off, open slowly (red light, trembling), and
 *         SLAM (burst, flash, shake), then push
 *   10.1  "Bigger mouth, better odds.": the smaller one folds its jaw and backs
 *         into its shell; the bigger one puffs up, smug, in warm light
 *   11.8  "Honestly? We should try that.": the gag, on paper: two ink people in
 *         profile; their jaws drop into fringehead gapes and bonk (boing)
 *   13.6  "It lives in old bottles and cans, and picks fights with scuba divers.":
 *         a fringehead peeking out of an old bottle on the sand, another in a
 *         can; a diver's fins come close, the fish darts out flared, the diver
 *         recoils
 *   17.0  "So yes,": two fish swing back into the mouth-to-mouth clash: frame 1.
 */

/** The line boil steps at the game's 8 a second: 144 steps, 48 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Whole cycles a loop, as a phase in radians at time t. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

/** When a word of the voiceover begins, in the sped-up voice.mp3 (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start / TEMPO;
}
/** When a word ends. */
export function ends(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.end / TEMPO;
}

export const MOUTHS_AT = said('MOUTHS!');
export const SARCASTIC_AT = said('sarcastic');
export const JAWS_AT = said('jaws');
export const STRETCH_AT = said('stretch');
export const WAY_AT = said('way');
export const HEAD_AT = said('head.');
export const WHEN_AT = said('When');
export const TWO_AT = said('two');
export const MEET_AT = said('meet,');
export const OPEN_AT = said('open');
export const WIDE_END = ends('wide…');
export const AND_AT = said('and');
export const SLAM_AT = said('SLAM');
export const BIGGER_AT = said('Bigger');
export const BETTER_AT = said('better');
export const HONESTLY_AT = said('Honestly?');
export const WE_AT = said('We');
export const TRY_AT = said('try');
export const THAT_AT = said('that.');
export const IT_AT = said('It');
export const BOTTLES_AT = said('bottles');
export const CANS_AT = said('cans,');
export const PICKS_AT = said('picks');
export const FIGHTS_AT = said('fights');
export const SCUBA_AT = said('scuba');
export const DIVERS_AT = said('divers.');
export const SO_AT = said('So');

// ---------------------------------------------------------------- scenes

export type SceneId = 'clash' | 'solo' | 'duel' | 'gag' | 'bottle';

/** Cuts, just ahead of each sentence. */
export const SOLO_FROM = said('The') - 0.08;
export const DUEL_FROM = WHEN_AT - 0.08;
export const GAG_FROM = HONESTLY_AT - 0.1;
export const BOTTLE_FROM = IT_AT - 0.1;
export const CLASH_FROM = SO_AT - 0.1;

export function sceneAt(t: number): SceneId {
  const u = wrap(t);
  if (u < SOLO_FROM || u >= CLASH_FROM) return 'clash';
  if (u < DUEL_FROM) return 'solo';
  if (u < GAG_FROM) return 'duel';
  if (u < BOTTLE_FROM) return 'gag';
  return 'bottle';
}

/** Seconds since the current scene's cut (the clash counts from CLASH_FROM, round the loop). */
export function sinceCut(t: number): number {
  const u = wrap(t);
  const from = [CLASH_FROM - LOOP_S, SOLO_FROM, DUEL_FROM, GAG_FROM, BOTTLE_FROM, CLASH_FROM].filter((f) => f <= u).pop()!;
  return u - from;
}

export interface Pt { readonly x: number; readonly y: number }

/** A zoom about a focus point (screen px), applied to the whole scene. */
export interface View { readonly focus: Pt; readonly zoom: number }

/** Nose to the front of the flared rim (screen px), less a little overlap where it presses on a rival's. */
export function reach(len: number, jaw: number, press: number, puff: number): number {
  const g = gapeOf(jaw, press, puff);
  return ((g.cx + g.rx * (1 - 0.18 * press)) * len) / BODY_UNITS;
}

const tremble = (t: number, amount: number): number => amount * (Math.sin(t * 61) * 0.6 + Math.sin(t * 97 + 1) * 0.4);

// ---------------------------------------------------------------- the clash (hook and end)

/** The rams that open and close the loop: the swing-in at the end lands here, and the second ram on "MOUTHS!". */
export const IMPACT = LOOP_S - 0.18;
export const REPEAT = MOUTHS_AT + 0.05;
const CLASH_LEN = 820;
const CLASH_Y = 770;

export interface Clash {
  /** The seam where the rims press, screen x. */
  readonly seam: number;
  readonly a: FishPose;
  readonly b: FishPose;
}

/** Clash clock: seconds since the swing-in landed (negative while swinging in). */
const clashClock = (t: number): number => {
  const u = wrap(t);
  return u >= CLASH_FROM ? u - IMPACT : u + (LOOP_S - IMPACT);
};

export function clashAt(t: number): Clash {
  const u = wrap(t);
  const c = clashClock(t);
  // Apart before the swing-in lands; pulled back for the second ram.
  const swing = c < 0 ? 420 * smooth(-c / (IMPACT - CLASH_FROM)) ** 1.2 : 0;
  const back = u < SOLO_FROM ? 110 * Math.sin(Math.PI * clamp01((u - (REPEAT - 0.5)) / 0.5)) ** 1.5 * (u < REPEAT ? 1 : 0) : 0;
  const gap = swing + back;
  // Pressed flat once in contact; a jolt as each ram lands.
  const sinceHit = Math.min(c >= 0 ? c : 99, u < SOLO_FROM && u >= REPEAT ? u - REPEAT : 99);
  // Pressed flat as the rims meet (eased over the last few px, so nothing pops).
  const press = clamp01(1 - gap / 30);
  const jolt = sinceHit < 0.5 ? Math.exp(-sinceHit * 8) : 0;
  const seam = 540 + 14 * Math.sin(cycles(5, t)) + 12 * jolt * Math.sin(sinceHit * 40);
  const jaw = c < 0 ? lerp(0.62, 1, smooth((c + (IMPACT - CLASH_FROM)) / (IMPACT - CLASH_FROM))) : 1;
  const beat = cycles(18, t);
  const puff = 0.15 + 0.25 * jolt;
  const pose = (dir: 1 | -1, size: number, tilt: number, phase: number): FishPose => ({
    x: seam - dir * (gap / 2 + reach(CLASH_LEN * size, jaw, press, puff)),
    y: CLASH_Y + dir * 6 + 6 * Math.sin(cycles(4, t) + phase),
    len: CLASH_LEN * size,
    dir,
    tilt: tilt + 0.03 * Math.sin(cycles(6, t) + phase) - 0.05 * jolt,
    jaw,
    press,
    puff,
    mood: 'angry',
    beat: beat + phase,
    wag: 4 + 4 * jolt,
  });
  return { seam, a: pose(1, 1.03, 0.08, 0), b: pose(-1, 1, 0.06, 1.7) };
}

/** Seconds since the latest ram in the clash scenes (for the burst), or null. */
/** The hook's close-up: the meeting point (CLASH_Y) zoomed in and lifted to screen y CLASH_SCREEN_Y; pushing in from wider during the swing-in. */
export const CLASH_ZOOM = 2;
export const CLASH_SCREEN_Y = 650;
export function clashZoomAt(t: number): number {
  const c = clashClock(t);
  if (c >= 0) return CLASH_ZOOM;
  return lerp(1.15, CLASH_ZOOM, smooth((c + (IMPACT - CLASH_FROM)) / (IMPACT - CLASH_FROM)) ** 0.8);
}
export const CLASH_FOCUS_Y = CLASH_Y;

export function clashHitAge(t: number): number | null {
  const u = wrap(t);
  if (sceneAt(t) !== 'clash') return null;
  const c = clashClock(t);
  const ages = [c >= 0 ? c : -1, u < SOLO_FROM ? u - REPEAT : -1].filter((a) => a >= 0);
  return ages.length ? Math.min(...ages) : null;
}

// ---------------------------------------------------------------- the solo fish

export interface Solo {
  readonly fish: FishPose;
  readonly view: View;
  /** The traced jaw line (0 .. 1 drawn), the head's outline, the name label. */
  readonly trace: number;
  readonly outline: number;
  readonly label: number;
}

export function soloAt(t: number): Solo {
  const u = wrap(t);
  const s = u - SOLO_FROM;
  const jaw = ramp(u, STRETCH_AT, STRETCH_AT + 0.5);
  const fish: FishPose = {
    x: 740 - 50 * (1 - smooth(s / 0.6)) + 10 * jaw,
    y: 820 + 8 * Math.sin(cycles(3, t)),
    len: 1000,
    dir: 1,
    tilt: 0.02 * Math.sin(cycles(4, t)),
    jaw: jaw * (1 + 0.03 * Math.sin(u * 9) * jaw),
    press: 0,
    puff: 0.25 * jaw,
    mood: jaw > 0.3 ? 'angry' : 'calm',
    beat: cycles(16, t),
    wag: 3,
  };
  return {
    fish,
    view: { focus: { x: 700, y: 820 }, zoom: 1 + 0.08 * smooth(s / (DUEL_FROM - SOLO_FROM)) },
    trace: ramp(u, JAWS_AT - 0.05, JAWS_AT + 0.35) * (1 - ramp(u, STRETCH_AT + 0.2, STRETCH_AT + 0.5)),
    outline: ramp(u, WAY_AT - 0.1, WAY_AT + 0.3),
    label: window01(u, SARCASTIC_AT - 0.1, WAY_AT + 0.1, 0.18),
  };
}

// ---------------------------------------------------------------- the duel

export const FLOOR_Y = 1110;
/** The snail shell the smaller fish lives in: its opening (screen px). */
export const SHELL_MOUTH = { x: 846, y: 1010 } as const;
/** The shell is drawn this much bigger than its art, about its opening. */
export const SHELL_SCALE = 1.35;
export const SLAM_HIT = SLAM_AT + 0.06;
const A_LEN = 600;
const B_LEN = 430;
const FACE_Y = 800;

export interface Duel {
  readonly a: FishPose;
  readonly b: FishPose;
  readonly view: View;
  /** Tension (red light, trembling), 0 .. 1; warm light for the smug beat. */
  readonly tension: number;
  readonly warm: number;
  /** The seam while pressed, or null. */
  readonly seam: number | null;
  /** How far the smaller fish has backed into its shell (0 out .. 1 only its head showing). */
  readonly home: number;
}

/** Where the smaller fish's nose sits in its shell, peeking out. */
const B_HOME = { x: SHELL_MOUTH.x - 74, y: SHELL_MOUTH.y + 4 };

export function duelAt(t: number): Duel {
  const u = wrap(t);
  const opening = ramp(u, OPEN_AT - 0.05, WIDE_END + 0.05);
  const tension = Math.max(ramp(u, WHEN_AT + 0.3, OPEN_AT + 0.2) * 0.4, ramp(u, OPEN_AT, WIDE_END)) * (1 - ramp(u, SLAM_HIT + 0.2, BIGGER_AT));
  const windup = ramp(u, AND_AT - 0.05, SLAM_AT - 0.06) * (1 - ramp(u, SLAM_AT - 0.06, SLAM_HIT));
  const rush = ramp(u, SLAM_AT - 0.08, SLAM_HIT);
  const pressed = u >= SLAM_HIT && u < BIGGER_AT + 0.15;
  // The rims press flat as they meet and spring back as the loser folds.
  const pressAmt = ramp(u, SLAM_HIT - 0.06, SLAM_HIT) * (1 - ramp(u, BIGGER_AT, BIGGER_AT + 0.15));
  // The rims meet here; the bigger fish pushes the seam towards the shell.
  const seam = 600 + 46 * ramp(u, SLAM_HIT + 0.3, BIGGER_AT) + 10 * Math.sin(u * 7.3) * pressAmt;
  const sinceSlam = u - SLAM_HIT;
  const jolt = sinceSlam >= 0 && sinceSlam < 0.6 ? Math.exp(-sinceSlam * 7) : 0;
  const shake = tremble(u, 3 * tension);

  // The bigger fish swims in from the left.
  const inA = smooth((u - DUEL_FROM) / (TWO_AT + 0.25 - DUEL_FROM));
  const faceA = 300 - 30 * windup;
  const hitA = seam - reach(A_LEN, 1, pressAmt, 0.1 + 0.3 * jolt);
  const smug = ramp(u, BIGGER_AT + 0.35, BETTER_AT + 0.1);
  const ax = u < SLAM_AT - 0.08 ? lerp(-160, faceA, inA) : lerp(faceA, hitA, rush) + 30 * smug;
  const a: FishPose = {
    x: ax + shake,
    y: FACE_Y + 6 * Math.sin(cycles(4, t)) - 30 * smug + 6 * Math.sin(u * 5) * smug,
    len: A_LEN * (1 + 0.06 * smug),
    dir: 1,
    tilt: 0.06 * (1 - inA) + 0.06 * smug - 0.05 * jolt,
    jaw: Math.max(opening, pressed ? 1 : 0, u >= SLAM_AT ? 1 : 0) * (1 + 0.04 * Math.sin(u * 12) * tension),
    press: pressAmt,
    puff: 0.1 + 0.3 * jolt + 0.9 * smug,
    mood: smug > 0.2 ? 'smug' : 'angry',
    beat: cycles(18, t),
    wag: 4 + 3 * rush,
  };

  // The smaller fish comes out of its shell, faces off, loses, and backs home.
  const outB = smooth((u - DUEL_FROM) / (MEET_AT + 0.3 - DUEL_FROM));
  const faceB = { x: 705 + 30 * windup, y: FACE_Y + 12 };
  const hitB = seam + reach(B_LEN, 1, pressAmt, 0.2 * jolt);
  const fold = ramp(u, BIGGER_AT, BIGGER_AT + 0.35);
  const home = ramp(u, BIGGER_AT + 0.2, BETTER_AT + 0.25);
  let bx: number;
  let by: number;
  if (u < SLAM_AT - 0.08) {
    // Already out in front of its shell, edging forwards to meet the intruder.
    bx = faceB.x + 70 * (1 - outB);
    by = faceB.y;
  } else if (u < BIGGER_AT + 0.2) {
    bx = lerp(faceB.x, hitB, rush);
    by = faceB.y;
  } else {
    bx = lerp(hitB, B_HOME.x, home);
    by = lerp(faceB.y, B_HOME.y, home);
  }
  const rise = Math.atan2(B_HOME.y - faceB.y, B_HOME.x - faceB.x) * 0.45;
  const climb = u < SLAM_AT ? 0.06 * Math.sin(Math.PI * outB) : 0.8 * rise * Math.sin(Math.PI * home);
  const b: FishPose = {
    x: bx - shake,
    y: by + 5 * Math.sin(cycles(5, t) + 1),
    len: B_LEN,
    dir: -1,
    tilt: climb - 0.05 * jolt,
    jaw: Math.max(opening * (1 - fold), (pressed ? 1 : 0) * (1 - fold), u >= SLAM_AT && u < BIGGER_AT ? 1 : 0) * (1 - fold),
    press: pressAmt,
    puff: 0.2 * jolt,
    mood: (fold > 0.1 ? 'worried' : 'angry') as Mood,
    beat: cycles(20, t) + 1,
    wag: 4 + 5 * home * (1 - home) * 4,
  };

  const s = u - DUEL_FROM;
  const push = 0.13 * ramp(u, OPEN_AT - 0.2, SLAM_AT) * (1 - ramp(u, SLAM_HIT + 0.5, BIGGER_AT + 0.2));
  return {
    a,
    b,
    view: { focus: { x: 560, y: 900 }, zoom: 1 + 0.05 * (1 - smooth(s / 0.5)) + push },
    tension,
    warm: ramp(u, BIGGER_AT + 0.2, BETTER_AT),
    seam: pressAmt > 0.5 ? seam : null,
    home,
  };
}

// ---------------------------------------------------------------- the gag

export interface Gag {
  /** Each person's jaw drop (0 shut .. 1 gaping) and lean towards the other (radians). */
  readonly jaw: number;
  readonly lean: number;
  /** The "?" over the left head. */
  readonly ask: number;
  /** Seconds since the mouths bonked (or negative). */
  readonly bonk: number;
}

export function gagAt(t: number): Gag {
  const u = wrap(t);
  const bonkAt = THAT_AT + 0.05;
  const since = u - bonkAt;
  const jaw = ramp(u, TRY_AT - 0.12, TRY_AT + 0.2);
  const lean = 0.06 * ramp(u, TRY_AT + 0.05, bonkAt) - (since > 0 ? 0.07 * Math.exp(-since * 5) * Math.sin(since * 20) : 0) - 0.02 * window01(u, HONESTLY_AT, WE_AT, 0.15);
  return { jaw, lean, ask: window01(u, HONESTLY_AT, WE_AT + 0.1, 0.12), bonk: since };
}

// ---------------------------------------------------------------- the bottle

/** The old bottle on the sand: its neck's opening (screen px). */
export const BOTTLE_MOUTH = { x: 712, y: 978 } as const;
export const CAN_MOUTH = { x: 780, y: 1068 } as const;
export const DART_AT = FIGHTS_AT;
export const RECOIL_AT = DIVERS_AT - 0.12;

export interface Bottle {
  readonly fish: FishPose;
  /** A second little fringehead in the can: how far its head is out. */
  readonly canPeek: number;
  readonly glint: number;
  /** The diver: how far in (0 out of frame .. 1 fins by the bottle) and the recoil (0 .. 1). */
  readonly diverIn: number;
  readonly recoil: number;
  readonly view: View;
}

export function bottleAt(t: number): Bottle {
  const u = wrap(t);
  const dart = ramp(u, DART_AT - 0.04, DART_AT + 0.14);
  const back = ramp(u, DIVERS_AT + 0.2, SO_AT - 0.05);
  const out = dart * (1 - back);
  const peek = smooth((u - BOTTLE_FROM) / 0.5);
  const fish: FishPose = {
    x: BOTTLE_MOUTH.x - 12 + 18 * peek + 104 * out + tremble(u, 1.2 * (1 - out)),
    y: BOTTLE_MOUTH.y - 44 * out + 3 * Math.sin(cycles(5, t)),
    len: 250,
    dir: 1,
    tilt: 0.26 * out,
    jaw: Math.max(out, 0.12 * window01(u, BOTTLES_AT, CANS_AT, 0.1)),
    press: 0,
    puff: 0.3 * out,
    mood: out > 0.1 ? 'angry' : 'calm',
    beat: cycles(22, t),
    wag: 2 + 6 * out,
  };
  return {
    fish,
    canPeek: ramp(u, CANS_AT - 0.1, CANS_AT + 0.3),
    glint: window01(u, BOTTLES_AT - 0.05, BOTTLES_AT + 0.5, 0.12),
    diverIn: ramp(u, PICKS_AT - 0.45, FIGHTS_AT - 0.1),
    recoil: ramp(u, RECOIL_AT, RECOIL_AT + 0.25),
    view: { focus: { x: 640, y: 980 }, zoom: 1.4 - 0.42 * ramp(u, CANS_AT + 0.1, PICKS_AT + 0.1) + 0.04 * ramp(u, FIGHTS_AT - 0.1, DIVERS_AT) },
  };
}

// ---------------------------------------------------------------- camera shake and flashes

/** A jolt of the whole frame at each hit. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  let x = 0;
  let y = 0;
  const hits = [
    { at: IMPACT, amp: 18 }, { at: IMPACT - LOOP_S, amp: 18 }, { at: REPEAT, amp: 14 }, { at: SLAM_HIT, amp: 30 },
    { at: THAT_AT + 0.05, amp: 8 }, { at: DART_AT + 0.1, amp: 6 }, { at: RECOIL_AT, amp: 8 },
  ];
  for (const j of hits) {
    const s = u - j.at;
    if (s < 0 || s > 0.4) continue;
    const amp = j.amp * (1 - s / 0.4) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

/** The SLAM's white flash. */
export const flashAt = (t: number): number => {
  const s = wrap(t) - SLAM_HIT;
  return s >= 0 && s < 0.18 ? 0.45 * (1 - s / 0.18) : 0;
};
