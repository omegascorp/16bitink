import type { SfxId } from '../../../src/audio/recipes';
import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This fish is blacker than black": the Pacific blackdragon's skin
 * reflects as little as 0.05% of the light that hits it (Davis et al.,
 * Current Biology 2020). Told by a narrator (words.ts) in the dark of the
 * deep, every beat timed to the words, a function of time in seconds over a
 * loop of LOOP_S.
 *
 *   0     a submersible's lamp swings down onto two fish: an ordinary one
 *         lights up pale and detailed, the blackdragon stays a black hole
 *         cut out of the light
 *   2.8   "The Pacific blackdragon's skin swallows 99.95%…": light rays hit it
 *         and vanish, while those hitting the ordinary fish bounce off; the
 *         number builds as it is said, then "light reflected: 0.05%"
 *   8.1   "Down in the deep": the lamp clicks off. "Prey glow": two little
 *         bristlemouths light up. "…light bouncing off a hunter would give it
 *         away": the ordinary fish creeps up on one, lit by its glow; the
 *         light bounces back off it, "!", and the prey flees. The other's
 *         light just vanishes into the blackdragon, which eats it.
 *   12.7  "So its skin is packed with pigment that traps the light": a
 *         magnifier on its skin, packed with pigment granules, where rays of
 *         light bounce about and die out
 *   15.7  "Shine a lamp on it, and you'll see why": the lamp clicks on and
 *         swings back down, and the loop finishes the sentence.
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

export const BLACKER_AT = said('blacker');
export const DRAGON_AT = said("blackdragon's");
export const SWALLOWS_AT = said('swallows');
export const NINETY_AT = said('ninety-nine');
export const POINT_AT = said('point');
export const NINE_AT = said('nine');
export const FIVE_AT = said('five');
export const PERCENT_AT = said('percent');
export const HITS_AT = said('hits');
export const DOWN_AT = said('Down');
export const PREY_AT = said('prey');
export const GLOW_AT = said('glow,');
export const BOUNCING_AT = said('bouncing');
export const HUNTER_AT = said('hunter');
export const AWAY_AT = said('away.');
export const SO_AT = said('So');
export const PACKED_AT = said('packed');
export const PIGMENT_AT = said('pigment');
export const TRAPS_AT = said('traps');
export const SHINE_AT = said('Shine');
export const LAMP_AT = said('lamp');

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

// ---------------------------------------------------------------- the lamp

/** The submersible's lamp, its lens at the left edge; the beam is LENS_HW wide either side there and spreads by SPREAD per px. */
export const LAMP = { x: 60, y: 840 } as const;
export const LENS_HW = 72;
export const SPREAD = 0.27;
/** It clicks off as the narrator goes "Down in the deep", and on again on "Shine". */
export const OFF_AT = DOWN_AT + 0.05;
export const ON_AT = SHINE_AT + 0.08;

/** How bright the lamp is, 0 off .. 1: snapped on with a flicker. */
export function lampOn(t: number): number {
  if (t < (OFF_AT + ON_AT) / 2) return 1 - ramp(t, OFF_AT, OFF_AT + 0.22);
  return ramp(t, ON_AT, ON_AT + 0.06) * (1 - 0.7 * window01(t, ON_AT + 0.1, ON_AT + 0.22, 0.04));
}

/**
 * Where it points, radians below the horizontal: swinging down onto the
 * fish at the loop point, resting on them while the narrator talks about
 * the light, turned up out of the way in the dark, and on "Shine" pointed
 * up into empty water, from where it swings down again.
 */
export const beamAngle = looped([
  { t: 0.55, at: 0.035 },
  { t: 4.6, at: 0.06 },
  { t: OFF_AT + 0.3, at: 0.04 },
  { t: ON_AT, at: -0.78 },
  { t: 17.1, at: -0.36, rate: 0.36 },
]);

/** The beam's axis and its sideways direction. */
export function beamAxes(angle: number): { readonly dir: { x: number; y: number }; readonly side: { x: number; y: number } } {
  return { dir: { x: Math.cos(angle), y: Math.sin(angle) }, side: { x: -Math.sin(angle), y: Math.cos(angle) } };
}

/** How much the beam lights a point, 0 .. 1: full inside it, soft at its edges, dimming with distance. */
export function beamLight(x: number, y: number, t: number): number {
  const { dir, side } = beamAxes(beamAngle(t));
  const along = (x - LAMP.x) * dir.x + (y - LAMP.y) * dir.y;
  if (along <= 0) return 0;
  const across = Math.abs((x - LAMP.x) * side.x + (y - LAMP.y) * side.y);
  const half = LENS_HW + along * SPREAD;
  const edge = 1 - ramp(across, half - 40, half + 40);
  return lampOn(t) * edge * (1 - 0.45 * clamp01(along / 1400));
}

// ---------------------------------------------------------------- the fish

/** A fish on screen. `face` runs -1 (left) .. 1 (right), through 0 as it turns. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
  /** A swallowed meal's swelling, 0 .. 1. */
  readonly lump: number;
}

/** The blackdragon hangs low across the middle, facing the lamp; it lunges for the prey by its head. */
export const DRAGON = { x: 600, y: 950, len: 680 } as const;
/** It gulps the prey as the narrator finishes "…give it away", just before "So". */
export const BITE_AT = SO_AT - 0.12;
export const SUCK_S = 0.28;

const lungeAt = (t: number): number => (t < BITE_AT ? ramp(t, BITE_AT - 0.45, BITE_AT) : 1 - ramp(t, BITE_AT + 0.2, BITE_AT + 1.3));

export function dragonAt(t: number): Fish {
  const lunge = lungeAt(t);
  const jaw = t < BITE_AT ? 0.7 * ramp(t, BITE_AT - 0.4, BITE_AT - 0.12) : 0.7 * (1 - ramp(t, BITE_AT, BITE_AT + 0.07));
  const fed = t >= BITE_AT ? 0.45 * ramp(t, BITE_AT, BITE_AT + 0.3) * (1 - ramp(t, 14.6, 15.6)) : 0;
  return {
    x: DRAGON.x - 75 * lunge,
    y: DRAGON.y - 22 * lunge + 6 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S),
    len: DRAGON.len,
    face: -1,
    tilt: 0.12 * lunge,
    beat: (2 * Math.PI * 12 * t) / LOOP_S,
    effort: 0.35 + 0.5 * lunge,
    jaw: Math.max(0, jaw),
    lump: fed,
  };
}

/** The ordinary fish (a sabertooth): above the blackdragon, then the hunter that gives itself away. */
export const HUNTER = { x: 770, y: 690, len: 340 } as const;
const CREEP_FROM = BOUNCING_AT - 0.9;
const CREEP_TO = AWAY_AT - 0.05;
const TURN_AT = AWAY_AT + 0.45;
const HOME_AT = SO_AT + 0.8;
const TURN_BACK_AT = 14.4;

const hunterX = looped([
  { t: 0.5, at: HUNTER.x },
  { t: CREEP_FROM, at: HUNTER.x },
  { t: CREEP_TO, at: 600 },
  { t: TURN_AT, at: 594 },
  { t: HOME_AT, at: HUNTER.x },
]);
const hunterY = looped([
  { t: 0.5, at: HUNTER.y },
  { t: CREEP_FROM, at: HUNTER.y },
  { t: CREEP_TO, at: 672 },
  { t: TURN_AT, at: 675 },
  { t: HOME_AT, at: HUNTER.y },
]);

export function hunterAt(t: number): Fish {
  const face = -1 + 2 * ramp(t, TURN_AT, TURN_AT + 0.4) - 2 * ramp(t, TURN_BACK_AT, TURN_BACK_AT + 0.45);
  const moving = window01(t, CREEP_FROM, CREEP_TO, 0.5) + window01(t, TURN_AT, HOME_AT, 0.4);
  return {
    x: hunterX(t),
    y: hunterY(t) + 7 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S + 1),
    len: HUNTER.len,
    face,
    tilt: 0.03 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S),
    beat: (2 * Math.PI * 24 * t) / LOOP_S,
    effort: 0.3 + 0.4 * Math.min(1, moving),
    jaw: 0,
    lump: 0,
  };
}

/** Bristlemouths: one up by the hunter, one by the blackdragon's head. They arrive unseen in the dark. */
export type PreyId = 'near' | 'meal';
export const PREY_HOME: Readonly<Record<PreyId, { readonly x: number; readonly y: number; readonly len: number }>> = {
  near: { x: 300, y: 650, len: 170 },
  meal: { x: 228, y: 842, len: 150 },
};
const ARRIVE_AT = OFF_AT + 0.4;
const FLEE_AT = AWAY_AT + 0.22;
const FLEE_S = 0.6;
const GONE = { x: -260, y: 450 } as const;

export function preyAt(id: PreyId, t: number): Fish | null {
  if (t < ARRIVE_AT) return null;
  const home = PREY_HOME[id];
  const hover = 5 * Math.sin(t * 2.3 + (id === 'near' ? 0 : 2));
  if (id === 'meal') {
    if (t >= BITE_AT) return null;
    return { x: home.x + 10 * ramp(t, ARRIVE_AT, BITE_AT), y: home.y + hover, len: home.len, face: 1, tilt: 0.05, beat: t * 11, effort: 0.35, jaw: 0, lump: 0 };
  }
  const u = clamp01((t - FLEE_AT) / FLEE_S);
  if (u >= 1) return null;
  const dash = u ** 1.7;
  return {
    x: lerp(home.x, GONE.x, dash),
    y: lerp(home.y + hover, GONE.y, dash),
    len: home.len,
    face: 1 - 2 * ramp(t, AWAY_AT + 0.08, FLEE_AT + 0.05),
    tilt: -0.3 * ramp(t, FLEE_AT - 0.05, FLEE_AT + 0.1),
    beat: t * 11 + 30 * dash,
    effort: 0.35 + 0.65 * ramp(t, AWAY_AT, FLEE_AT),
    jaw: 0,
    lump: 0,
  };
}

/** How brightly a bristlemouth glows: they light up on "prey glow". */
export function preyGlow(id: PreyId, t: number): number {
  const lag = id === 'near' ? 0 : 0.18;
  return preyAt(id, t) ? ramp(t, PREY_AT - 0.05 + lag, GLOW_AT + 0.3 + lag) : 0;
}

/** How far the second bristlemouth has been dragged into the blackdragon's mouth, 0 .. 1 (null when it isn't). */
export function eatenAt(t: number): number | null {
  const u = (t - (BITE_AT - SUCK_S)) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

/** The snap of the bite, 0 .. 1 over its life. */
export const snapAt = (t: number): number => (t - BITE_AT) / 0.35;

/** The "!" over the first bristlemouth as the narrator says "away". */
export function alarmAt(t: number): number {
  const u = t - (AWAY_AT - 0.05);
  const hold = 0.85;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.15, hold));
}

// ---------------------------------------------------------------- rays of light

/** Who a ray goes from and to: points along a fish's body, 0 nose .. 1 tail, and `side` -1 back .. 1 belly. */
export type RayEnd = { readonly kind: 'lamp' } | { readonly kind: 'fish'; readonly who: 'dragon' | 'hunter' | PreyId; readonly along: number; readonly side: number };

export interface Ray {
  readonly from: RayEnd;
  readonly to: RayEnd;
  readonly at: number;
  /** Seconds to reach its target. */
  readonly travel: number;
  /** Off the hunter it bounces back (to `back`), into the blackdragon it vanishes. */
  readonly back: RayEnd | null;
  readonly colour: 'lamp' | 'glow';
}

const lamp: RayEnd = { kind: 'lamp' };
const onFish = (who: 'dragon' | 'hunter' | PreyId, along: number, side = 0): RayEnd => ({ kind: 'fish', who, along, side });

/**
 * From "swallows" until the lamp goes off, a ray every 0.28 s: two in three
 * into the blackdragon, where they vanish; one in three onto the ordinary
 * fish, which bounces it back. Then on "bouncing", the bristlemouths' own
 * light: off the hunter and back to the prey's eye, and into the
 * blackdragon, gone.
 */
export const RAYS: readonly Ray[] = (() => {
  const rays: Ray[] = [];
  const dragonSpots = [0.12, 0.42, 0.7, 0.28, 0.56, 0.86];
  let k = 0;
  for (let at = SWALLOWS_AT - 0.1; at < OFF_AT - 0.95; at += 0.28, k++) {
    if (k % 3 === 2) rays.push({ from: lamp, to: onFish('hunter', 0.25 + 0.1 * ((k / 3) % 3), 0.5), at, travel: 0.42, back: lamp, colour: 'lamp' });
    else rays.push({ from: lamp, to: onFish('dragon', dragonSpots[k % dragonSpots.length]!, 0.2), at, travel: 0.42, back: null, colour: 'lamp' });
  }
  for (let i = 0; i < 3; i++) {
    const at = BOUNCING_AT - 0.25 + i * 0.32;
    rays.push({ from: onFish('near', 0.15, 0.3), to: onFish('hunter', 0.05 + i * 0.09, 0.1 * i), at, travel: 0.32, back: onFish('near', 0.12, -0.3), colour: 'glow' });
    rays.push({ from: onFish('meal', 0.2, 0.3), to: onFish('dragon', 0.06 + i * 0.07, -0.4), at: at + 0.12, travel: 0.32, back: null, colour: 'glow' });
  }
  return rays;
})();

// ---------------------------------------------------------------- notes and readouts

/** The readout at the top, from "swallows" until the lamp goes off. */
export const readoutAt = (t: number): number => window01(t, SWALLOWS_AT - 0.05, OFF_AT + 0.35, 0.25);

/** The number, built up as it is said: "99", "99.", "99.9", "99.95", "99.95%". */
export function numberAt(t: number): string {
  const parts: readonly [number, string][] = [[NINETY_AT, '99'], [POINT_AT, '.'], [NINE_AT, '9'], [FIVE_AT, '5'], [PERCENT_AT, '%']];
  return parts.filter(([at]) => t >= at - 0.03).map(([, s]) => s).join('');
}

/** "light reflected: 0.05%", on "hits it". */
export const reflectedAt = (t: number): number => readoutAt(t) * ramp(t, HITS_AT - 0.05, HITS_AT + 0.25);

/** "ordinary fish" over the sabertooth while the lamp is on it at the loop point (from the end round to the start). */
export const ordinaryLabel = (t: number): number => (t < LOOP_S / 2 ? 1 - ramp(t, 2.2, 2.55) : ramp(t, 16.5, 16.85));
/** "Pacific blackdragon", under it, from its name until the lamp goes off. */
export const nameLabel = (t: number): number => window01(t, DRAGON_AT - 0.1, OFF_AT + 0.3, 0.25);
/** "hunter" over the sabertooth on "hunter". */
export const hunterLabel = (t: number): number => window01(t, HUNTER_AT - 0.05, AWAY_AT + 0.45, 0.2);
/** "prey" by the bristlemouths, on "prey glow". */
export const preyLabel = (t: number): number => window01(t, PREY_AT - 0.05, BOUNCING_AT - 0.1, 0.2);

// ---------------------------------------------------------------- the magnifier

/** The spot on its skin the magnifier looks at (along its body), and where the lens settles. */
export const SKIN_SPOT = 0.52;
export const LENS = { x: 330, y: 480, r: 180 } as const;

/** How open the lens is, 0 .. 1: grown out of its skin after "So", back into it on "Shine". */
export function lensAt(t: number): number {
  if (t < SO_AT) return 0;
  return Math.min(ramp(t, SO_AT + 0.1, SO_AT + 0.55), 1 - ramp(t, SHINE_AT - 0.25, SHINE_AT + 0.15));
}

/** How many of the pigment granules are in, 0 .. 1: packed in on "packed". */
export const granulesAt = (t: number): number => ramp(t, PACKED_AT - 0.15, PACKED_AT + 0.4);
/** "pigment granules", on "pigment". */
export const pigmentLabel = (t: number): number => window01(t, PIGMENT_AT - 0.05, SHINE_AT - 0.1, 0.2);

/** Rays of light into the skin, bouncing between granules and dying out, from "traps": each one's progress, 0 .. 1. */
export const LENS_RAYS = [0, 0.28, 0.56] as const;
const LENS_RAY_S = 1.1;
export const lensRayAt = (i: number, t: number): number => (t - (TRAPS_AT - 0.35 + LENS_RAYS[i]!)) / LENS_RAY_S;

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
    from: g[0]!.start / TEMPO,
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

/** Quiet under the voice: it does the talking. */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'suck', t: SWALLOWS_AT, pitch: 0.7, gain: 0.12, pan: 0 },
  { id: 'click', t: PERCENT_AT, pitch: 1.0, gain: 0.3, pan: 0 },
  { id: 'click', t: OFF_AT, pitch: 0.7, gain: 0.5, pan: -0.6 },
  { id: 'drop', t: PREY_AT + 0.05, pitch: 1.8, gain: 0.14, pan: -0.4 },
  { id: 'drop', t: PREY_AT + 0.23, pitch: 2.0, gain: 0.12, pan: -0.6 },
  { id: 'spotted', t: AWAY_AT, pitch: 1.1, gain: 0.22, pan: -0.3 },
  { id: 'dash', t: FLEE_AT, pitch: 1.4, gain: 0.12, pan: -0.5 },
  { id: 'lunge', t: BITE_AT - 0.45, pitch: 0.8, gain: 0.25, pan: -0.5 },
  { id: 'suck', t: BITE_AT - SUCK_S - 0.05, pitch: 1.0, gain: 0.14, pan: -0.5 },
  { id: 'eat', t: BITE_AT, pitch: 0.9, gain: 0.4, pan: -0.5 },
  { id: 'click', t: PACKED_AT, pitch: 1.4, gain: 0.18, pan: -0.3 },
  { id: 'click', t: PACKED_AT + 0.18, pitch: 1.5, gain: 0.16, pan: -0.2 },
  { id: 'click', t: PACKED_AT + 0.36, pitch: 1.6, gain: 0.14, pan: -0.1 },
  { id: 'click', t: ON_AT, pitch: 0.75, gain: 0.5, pan: -0.6 },
  { id: 'dash', t: ON_AT + 0.5, pitch: 0.55, gain: 0.08, pan: -0.3 },
];
