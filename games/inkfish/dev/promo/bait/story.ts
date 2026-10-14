import { pitchForSize, type SfxId } from '../../../src/audio/recipes';
import { FRENZY_GAIN, frenzyMultiplier, initialFrenzy } from '../../../src/logic/frenzy';
import { scoreFor } from '../../../src/logic/sizing';
import { TUNING } from '../../../src/scenes/game/tuning';
import { mouthOf, NOSE, type Pose } from '../chain';
import { suckedIn } from '../effects';
import { clamp01, curveAt, lerp, ramp, smooth, window01, type Key } from '../short';
import { asPose, facingAt, fishAt, seamTime, tiltFrom } from '../gameplay/fish';
import { zoomLoopPath, type PathKey } from '../gameplay/zoomPath';

/**
 * "Free food? It's a trap!": the game's fishing hooks, as a highlight. A hook
 * with a live worm drops right in front of you (the game drops them near the
 * player, after a dotted line warns where). A greedy perch charges in; you
 * lean in too, mouth opening... then hold back. The perch bites, the barb
 * catches it, and the line hauls it straight up and out of the sea, as the
 * game does with any fish that touches a lowered, baited hook. You look up.
 * Then, under "never trust free food", you happily eat two minnows that
 * aren't on any hook. Then the next dotted line, the next worm, the next perch.
 *
 *   0     the worm wriggles on the hook just dropped; the perch dashes up, you creep in. "free food?"
 *   2.75  you think better of it: mouth shut, you back off
 *   3.1   the perch lunges
 *   3.6   it bites: the barb catches it, the worm is gone, "!"; the line snaps taut
 *   3.7   hauled straight up, thrashing, out of the frame by 4.8
 *   3.8   you look up after it; "it's a trap!" once the perch is above the words
 *   5.6   you turn away; two minnows swim up. "never trust free food"
 *   7.2   gulp: "+100"; 7.75 gulp: "+120", the frenzy chime (as the game scores them)
 *   8.6   a new dotted line grows down (the game's 1.5 s warning); you turn back
 *   10.1  the hook drops with a fresh worm; the next perch dashes in...
 *   10.5  ...which is where the loop began.
 *
 * Positions are screen px (the camera holds still). The hook, line and worm
 * are the game's, drawn RIG times their in-game size.
 */
export const LOOP_S = 10.5;

/** Seam time: a moment near the loop point as seconds from it (negative just before). */
export const seam = (t: number): number => seamTime(t, LOOP_S);

// ---------------------------------------------------------------- the hook

/** Screen px per game px for the hook, its line and the worm. */
export const RIG = 3.4;
/** The line comes down at this x from above the frame; the hook's eye hangs at REST_EYE_Y. */
export const HOOK_X = 600;
export const LINE_TOP_Y = -140;
export const REST_EYE_Y = 585;
/** The game's barb point from the hook's eye (hazards.ts hookTip), game px. */
const BARB = { x: -10, y: 56 } as const;

/** The game's timings (hazards.ts, tuning.ts): the dotted warning line, the 280 ms drop. In seam time. */
export const WARN_S = TUNING.hookWarnMs / 1000;
export const DROP_S = 0.28;
export const DROP_AT = -0.4;
export const WARN_AT = DROP_AT - WARN_S;
export const LAND_AT = DROP_AT + DROP_S;
/** The perch touches the barb: hooked. The hook has held about as long as the game's 3.2 s by then. */
export const BITE_AT = 3.6;
export const HOLD_S = BITE_AT - LAND_AT;
/** The hard jerk as the line takes the weight, then the haul, speeding up (game px/ms 0.45 → 1 in the game). */
const JERK_S = 0.12;
const JERK_PX = 90;
const HAUL = { from: 350, to: 2700, over: 0.8 } as const;
/** Gone off the top by now. */
export const OUT_AT = BITE_AT + 1.2;

export type RigPhase = 'none' | 'warn' | 'drop' | 'hold' | 'reel';

export interface Rig {
  readonly phase: RigPhase;
  /** The hook's eye, where the line ties on. */
  readonly eye: { readonly x: number; readonly y: number };
  /** How far the dotted warning line has grown, 0 .. 1 (warn only). */
  readonly reach: number;
  /** The worm's clock, s: it wriggles from the moment the hook appears. */
  readonly wormAge: number;
  /** Whether the worm is still on the barb (the biter takes it). */
  readonly worm: boolean;
  /** The line's sideways twang as it snaps taut, px at its middle. */
  readonly twang: number;
}

/** How far the hook has been hauled up, `s` seconds after the bite. */
export function haulLift(s: number): number {
  if (s <= 0) return 0;
  const jerk = JERK_PX * (1 - (1 - Math.min(1, s / JERK_S)) ** 2);
  const h = Math.max(0, s - JERK_S);
  const a = (HAUL.to - HAUL.from) / HAUL.over;
  const pull = h < HAUL.over ? HAUL.from * h + 0.5 * a * h * h : HAUL.from * HAUL.over + 0.5 * a * HAUL.over ** 2 + HAUL.to * (h - HAUL.over);
  return jerk + pull;
}

const holdY = (u: number): number => REST_EYE_Y + Math.sin((u - LAND_AT) / 0.3) * 8 * RIG;

export function rigAt(t: number): Rig {
  const u = seam(t);
  const none: Rig = { phase: 'none', eye: { x: HOOK_X, y: LINE_TOP_Y }, reach: 0, wormAge: 0, worm: false, twang: 0 };
  if (u < WARN_AT || u >= OUT_AT) return none;
  const wormAge = u - WARN_AT;
  if (u < DROP_AT) return { ...none, phase: 'warn', reach: clamp01((u - WARN_AT) / WARN_S), wormAge };
  if (u < LAND_AT) {
    const y = lerp(LINE_TOP_Y - 80 * RIG, REST_EYE_Y, (u - DROP_AT) / DROP_S);
    return { ...none, phase: 'drop', eye: { x: HOOK_X, y }, wormAge, worm: true };
  }
  if (u < BITE_AT) return { ...none, phase: 'hold', eye: { x: HOOK_X, y: holdY(u) }, wormAge, worm: true };
  const s = u - BITE_AT;
  const twang = 22 * Math.exp(-s / 0.12) * Math.sin(2 * Math.PI * 13 * s);
  return { ...none, phase: 'reel', eye: { x: HOOK_X, y: holdY(BITE_AT) - haulLift(s) }, wormAge, twang };
}

/** The barb's point, where a fish gets caught (screen px). */
export function barbAt(t: number): { readonly x: number; readonly y: number } {
  const { eye } = rigAt(t);
  return { x: eye.x + BARB.x * RIG, y: eye.y + BARB.y * RIG };
}

// ---------------------------------------------------------------- the perch

export const PERCH_LEN = 240;
/** The perch is in the picture from its dash in until it is hauled out of the top. */
export const PERCH_FROM = -0.7;
const LUNGE_AT = 3.1;
const PERCH_BEAT_HZ = 4;

/** Where the perch must be at the bite: mouth on the barb, level, facing left. */
const BITE_CENTRE = (() => {
  const b = barbAt(BITE_AT);
  return { x: b.x + NOSE * PERCH_LEN, y: b.y };
})();

/** In seam time: a dash in from the right, hovering beside the worm, cocking back, the lunge. */
const PERCH_KEYS: readonly PathKey[] = [
  { t: PERCH_FROM, x: 1340, y: 705, vx: -1300, vy: 60 },
  { t: 0, x: 925, y: 752, vx: -380, vy: 20 },
  { t: 0.7, x: 850, y: 764, vx: -40, vy: 10 },
  { t: 1.5, x: 830, y: 774 },
  { t: 2.5, x: 820, y: 764 },
  { t: LUNGE_AT, x: 880, y: 770, vx: 0, vy: 0 },
  { t: BITE_AT, ...BITE_CENTRE, vx: -380, vy: 0 },
];
const axis = (at: 'x' | 'y', rate: 'vx' | 'vy'): Key[] => PERCH_KEYS.map((k) => ({ t: k.t, at: k[at], ...(k[rate] === undefined ? {} : { rate: k[rate] }) }));
const PERCH_X = axis('x', 'vx');
const PERCH_Y = axis('y', 'vy');

function swimmingPerch(u: number): Pose {
  const x = curveAt(PERCH_X, u);
  const y = curveAt(PERCH_Y, u);
  const f = fishAt('perch', { x: x.at, y: y.at, vx: x.rate, vy: y.rate }, PERCH_LEN, -1, PERCH_BEAT_HZ, u);
  return asPose(f);
}

/** Where its mouth was at the bite, against the barb: the hooked perch hangs from that point. */
const BITE_GAP = (() => {
  const m = mouthOf(swimmingPerch(BITE_AT));
  const b = barbAt(BITE_AT);
  return { x: m.x - b.x, y: m.y - b.y };
})();

/** On the hook: hanging head-up by the lip, thrashing (the game's hooked fish: turned -90°, ±0.3 rad at 22 rad/s). */
function hookedPerch(u: number): Pose {
  const s = u - BITE_AT;
  const whip = ramp(s, 0, 0.16);
  const thrash = 0.3 * Math.sin(22 * s) * whip;
  const tilt = lerp(swimmingPerch(BITE_AT).tilt, Math.PI / 2, whip) + thrash;
  const b = barbAt(u);
  const mouth = { x: b.x + BITE_GAP.x * (1 - whip), y: b.y + BITE_GAP.y * (1 - whip) };
  return {
    j: 0, age: 0, shape: 'perch', length: PERCH_LEN, facing: -1, tilt,
    x: mouth.x + Math.cos(tilt) * NOSE * PERCH_LEN, y: mouth.y + Math.sin(tilt) * NOSE * PERCH_LEN,
    // The tail beats on at the swim's pace, then faster as it fights.
    beat: 2 * Math.PI * (PERCH_BEAT_HZ * u + 3 * s), effort: 1,
  };
}

export type PerchState =
  | { readonly kind: 'gone' }
  | { readonly kind: 'swimming'; readonly pose: Pose }
  | { readonly kind: 'hooked'; readonly pose: Pose };

export function perchAt(t: number): PerchState {
  const u = seam(t);
  if (u < PERCH_FROM || u >= OUT_AT) return { kind: 'gone' };
  if (u < BITE_AT) return { kind: 'swimming', pose: swimmingPerch(u) };
  return { kind: 'hooked', pose: hookedPerch(u) };
}

/** The perch's jaw: a greedy little gape while it hovers, wide for the lunge, snapped shut on the bite, gasping on the line. */
export function perchJaw(t: number): number {
  const u = seam(t);
  if (u < PERCH_FROM || u >= OUT_AT) return 0;
  if (u < LUNGE_AT) return 0.18 * ramp(u, -0.2, 0.6) * (0.75 + 0.25 * Math.sin(2 * Math.PI * u));
  if (u < BITE_AT - 0.06) return lerp(0.18 * (0.75 + 0.25 * Math.sin(2 * Math.PI * LUNGE_AT)), 1, ramp(u, LUNGE_AT, LUNGE_AT + 0.3));
  if (u < BITE_AT) return 1 - ramp(u, BITE_AT - 0.06, BITE_AT);
  return 0.25 * Math.max(0, Math.sin(2 * Math.PI * 3 * (u - BITE_AT))) * ramp(u, BITE_AT + 0.15, BITE_AT + 0.3);
}

/** The "!" over the perch as the barb bites: 0 hidden .. 1, overshooting as it pops. */
export function perchAlarm(t: number): number {
  return pop(seam(t) - BITE_AT, 0.9);
}

// ---------------------------------------------------------------- you

export const INKLING_LEN = 210;
const INKLING_BEAT_HZ = 2;
export const HESITATE_AT = 2.75;
const LOOK_UP = { from: 3.75, to: 5.6 } as const;

/** Creeping in on the worm, backing off, watching the perch go, wandering off, and drawn back to the next worm. */
const INKLING_KEYS: readonly PathKey[] = [
  { t: 0, x: 385, y: 770 },
  { t: 1.3, x: 402, y: 764 },
  { t: 2.5, x: 420, y: 758 },
  { t: HESITATE_AT + 0.1, x: 414, y: 761 },
  { t: 3.4, x: 352, y: 781 },
  { t: 4.3, x: 326, y: 795 },
  { t: 5.5, x: 345, y: 800 },
  { t: 6.5, x: 338, y: 798 },
  { t: 7.2, x: 318, y: 790 },
  { t: 7.75, x: 295, y: 798 },
  { t: 8.65, x: 270, y: 812 },
  { t: 9.8, x: 300, y: 790 },
];
const inklingPath = zoomLoopPath(INKLING_KEYS, LOOP_S, 1);
const INKLING_TURNS = [[0, 1], [5.6, -1], [8.85, 1]] as const;

export function inklingAt(t: number): Pose {
  const p = inklingPath(t);
  const f = fishAt('inkling', p, INKLING_LEN, facingAt(INKLING_TURNS, t), INKLING_BEAT_HZ, t);
  // A glance up the line before backing off, then a long look up after the perch.
  const glance = 0.22 * window01(t, 2.45, 3.05, 0.2);
  const look = 0.5 * window01(t, LOOK_UP.from, LOOK_UP.to, 0.35);
  return { ...asPose(f), tilt: tiltFrom(p, INKLING_LEN) + glance + look };
}

/** Your jaw: falling open as you lean in on the worm (from just before the loop point), shut tight as you think better of it; open for each minnow. */
export function inklingJaw(t: number): number {
  const u = seam(t);
  if (u >= -0.6 && u < HESITATE_AT + 0.1) return 0.5 * ramp(u, -0.6, 2.3) * (1 - ramp(u, HESITATE_AT, HESITATE_AT + 0.1));
  let open = 0;
  for (const s of SNACKS) {
    if (t > s.at - 0.25 && t < s.at + 0.05) open = Math.max(open, t < s.at ? 0.75 * ramp(t, s.at - 0.25, s.at - SUCK) : 0.75 * (1 - ramp(t, s.at, s.at + 0.05)));
  }
  return open;
}

// ---------------------------------------------------------------- the minnows

/** Free-swimming minnows, the tide pool's everyday prey: food that isn't on a hook. */
export const MINNOW_LEN = 150;
/** Prey are dragged into your mouth over this long before each gulp. */
const SUCK = 0.18;

interface Snack {
  /** When you gulp it. */
  readonly at: number;
  /** Its size in the game (radius, game px), which sets the score and the gulp's pitch. */
  readonly size: number;
  /** Swims in over [enter, enter + 0.9] from this far off (px). */
  readonly enter: number;
  readonly from: { readonly x: number; readonly y: number };
}

export const SNACKS: readonly Snack[] = [
  { at: 7.2, size: 10, enter: 5.95, from: { x: -480, y: 80 } },
  { at: 7.75, size: 12, enter: 6.3, from: { x: -470, y: -110 } },
];

/** What each minnow scores and sounds like, by the game's rules (GameScene.feed): the second, so soon after the first, tips the frenzy meter to ×2. */
export const MEALS = (() => {
  let frenzy = initialFrenzy;
  let last = -Infinity;
  return SNACKS.map((s) => {
    const meter = Math.max(0, frenzy.meter - 0.06 * (s.at - last));
    const mult = frenzyMultiplier({ meter });
    frenzy = { meter: Math.min(1, meter + FRENZY_GAIN) };
    last = s.at;
    const combo = frenzyMultiplier(frenzy);
    const gained = scoreFor(s.size, mult);
    return { at: s.at, text: mult > 1 ? `+${gained} ×${mult}` : `+${gained}`, sfx: combo > mult ? 'frenzy' as const : 'eat' as const, pitch: combo > mult ? 0.9 + combo * 0.1 : pitchForSize(s.size) };
  });
})();

/** Where a minnow waits: just in front of your mouth as the suction starts. */
const WAIT_AT = SNACKS.map((s) => {
  const you = inklingAt(s.at - SUCK);
  const m = mouthOf(you);
  return { x: m.x + you.facing * 0.1 * you.length, y: m.y };
});

export type SnackState =
  | { readonly kind: 'swimming'; readonly pose: Pose; readonly alpha: number }
  | { readonly kind: 'swallowed'; readonly pose: Pose; readonly stretch: number; readonly squash: number };

export function snacksAt(t: number): SnackState[] {
  const out: SnackState[] = [];
  SNACKS.forEach((s, i) => {
    if (t < s.enter || t >= s.at) return;
    const wait = WAIT_AT[i]!;
    const arrive = smooth((t - s.enter) / 0.9);
    // Swims in fast and eases to a stop, then idles, nosing about.
    const idle = { x: 8 * Math.sin(5 * t + i), y: 6 * Math.sin(3.7 * t + 2 * i) };
    const pose: Pose = {
      j: 0, age: 0, shape: 'minnow', length: MINNOW_LEN, facing: s.from.x < 0 ? 1 : -1,
      x: wait.x + s.from.x * (1 - arrive) + idle.x * arrive, y: wait.y + s.from.y * (1 - arrive) + idle.y * arrive,
      tilt: 0.25 * Math.sin(2 * t + i) * arrive, beat: 2 * Math.PI * 4 * t, effort: 1 - 0.6 * arrive,
    };
    if (t < s.at - SUCK) {
      out.push({ kind: 'swimming', pose, alpha: clamp01((t - s.enter) / 0.1) });
      return;
    }
    const [inMouth, look] = suckedIn(pose, inklingAt(t), (t - (s.at - SUCK)) / SUCK);
    out.push({ kind: 'swallowed', pose: inMouth, ...look });
  });
  return out;
}

/** The jolt of a gulp, for squash and stretch: 0 .. 1. */
export function gulpSnap(t: number): number {
  for (const s of SNACKS) if (t > s.at - 0.02 && t < s.at + 0.12) return Math.sin((Math.PI * (t - s.at + 0.02)) / 0.14) * 0.6;
  return 0;
}

/** You flinch as the perch is hooked. */
export function inklingEyes(t: number): 'squeeze' | null {
  return t >= BITE_AT && t < BITE_AT + 0.22 ? 'squeeze' : null;
}

// ---------------------------------------------------------------- effects

/** An inked "!" popping up: 0 hidden .. 1, overshooting as it pops, then gone after `hold` s. */
function pop(since: number, hold: number): number {
  if (since < 0 || since > hold) return 0;
  const grow = since < 0.12 ? (since / 0.12) * 1.25 : 1 + 0.25 * Math.max(0, 1 - (since - 0.12) / 0.06);
  return grow * (1 - ramp(since, hold - 0.15, hold));
}

/** The jolt as the barb bites, and as the line takes the weight. */
export function shake(t: number): { readonly x: number; readonly y: number } {
  let x = 0;
  let y = 0;
  for (const j of [{ at: BITE_AT, amp: 12 }, { at: BITE_AT + JERK_S, amp: 7 }]) {
    const s = t - j.at;
    if (s < 0 || s > 0.3) continue;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    x += amp * Math.sin(s * 120);
    y += amp * 0.7 * Math.cos(s * 150);
  }
  return { x, y };
}

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] seconds, fading at both ends; may run past the loop's ends, wrapping round. */
  readonly from: number;
  readonly to: number;
}

const MORAL = { from: 6.65, to: 9.4 };
/** "it's a trap!" waits until the hauled perch is wholly above the words, so they never overlap. */
export const CAPTIONS: readonly Caption[] = [
  { text: 'free food?', y: 400, size: 132, from: -0.55, to: 2.7 },
  { text: 'it’s a trap!', y: 400, size: 132, from: 4.3, to: 6.45 },
  { text: 'never trust', y: 350, size: 112, ...MORAL },
  { text: 'free food', y: 462, size: 112, ...MORAL },
];

const CAPTION_FADE = 0.2;

/** How visible a caption is at time t, 0 .. 1, counting its copies a loop before and after (so it can span the seam). */
export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, CAPTION_FADE)));
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

/** Seam time to loop time, for cues just before the loop point. */
const atLoop = (u: number): number => ((u % LOOP_S) + LOOP_S) % LOOP_S;

export const SOUNDS: readonly SoundCue[] = [
  // The perch charges, lunges and bites; the barb catches it and the reel ratchets (the game's 'hooked').
  { id: 'lunge', t: LUNGE_AT, pitch: 1.25, gain: 0.55, pan: 0.25 },
  { id: 'eat', t: BITE_AT, pitch: 1.2, gain: 0.55, pan: 0.1 },
  { id: 'hooked', t: BITE_AT, pitch: 1, gain: 1, pan: 0.1 },
  { id: 'spotted', t: BITE_AT + 0.05, pitch: 1.25, gain: 0.35, pan: 0.1 },
  // Yanked up: a rush of water, then it breaks the surface far above.
  { id: 'dash', t: BITE_AT + JERK_S, pitch: 0.7, gain: 0.55, pan: 0.1 },
  { id: 'splash', t: BITE_AT + 1.0, pitch: 1.3, gain: 0.3, pan: 0.1 },
  // Two minnows, scored as the game scores them: a plip, then the frenzy chime.
  ...MEALS.map((m): SoundCue => ({ id: m.sfx, t: m.at, pitch: m.pitch, gain: 0.7, pan: -0.3 })),
  // The next hook plunges in, and the next perch rushes over.
  { id: 'splash', t: atLoop(DROP_AT), pitch: 1.6, gain: 0.18, pan: 0.1 },
  { id: 'dash', t: atLoop(PERCH_FROM + 0.05), pitch: 1.1, gain: 0.45, pan: 0.4 },
];
