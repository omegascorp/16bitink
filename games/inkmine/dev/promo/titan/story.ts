import { BOIL } from '../../../src/art/palette';
import { BOIL_FPS } from '../sprites';
import { curveAt, ramp, smooth, window01 } from '../short';
import { crossings, keys, paced, track } from './tracks';
import { TEMPO, WORDS } from './words';

/**
 * "You could fly on Titan": in Titan's thick air and low gravity a person
 * could fly by flapping wings strapped to their arms (Robert Zubrin's
 * point). Told by the narrator (words.ts), one mood a beat, every beat
 * timed to the words, a function of time in seconds over a loop of LOOP_S:
 *
 *   0     THRILL: the prospector mid-downstroke just over the dark methane
 *         lake, the downwash rippling and splashing it; "Saturn's moon
 *         Titan" in a small inset; a big stroke up on "FLY"
 *   4.1   MISCHIEF (cut): on the pebbly shore, wings strapped to its arms,
 *         buckles cinched on "Strap"; they flare on "wings", it flaps and
 *         hops like mad on "flap hard" and wobbles off on "you're off!"
 *   7.4   CURIOUS AWE: climbing through the haze, which thickens on "air"
 *         and "THICKER" (motes drifting, "4×"); "≈ 10 kg", "=" and a toddler
 *   11.6  NERVOUS: "One catch": the picture cools to blue, frost creeps over
 *         the wings and the helmet, it shivers; "−180 °C"
 *   15    SHOCK: the camera tips down to the dark lake right below; it
 *         freezes mid-flap, eyes wide; bubbles on "Liquid natural GAS!",
 *         and it drops towards it
 *   18    RELIEF: it catches itself just over the lake, flapping hard, and on
 *         "coat" it's bundled in a puffy coat and scarf; on "because" the
 *         coat puffs away and the loop finishes the sentence.
 */
export const LOOP_S = 21;

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
/** Time folded into the loop. */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => (Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS) % BOIL;

/** When word `i` of the voiceover begins, in the sped-up voice.mp3. */
export function said(i: number): number {
  const w = WORDS[i];
  if (!w) throw new Error(`No word #${i} in the voiceover`);
  return w.start / TEMPO;
}
/** When word `i` ends. */
export const saidEnd = (i: number): number => WORDS[i]!.end / TEMPO;

export const SATURN_AT = said(1);
export const MOON_AT = said(2);
export const TITAN_AT = said(3);
export const FLY_AT = said(6);
export const FLAPPING_AT = said(9);
export const ARMS_AT = said(11);
export const STRAP_AT = said(12);
export const WINGS_AT = said(15);
export const FLAP_AT = said(16);
export const OFF_AT = said(20);
export const AIR_AT = said(22);
export const FOUR_AT = said(24);
export const THICKER_AT = said(26);
export const WEIGH_AT = said(31);
export const TODDLER_AT = said(37);
export const ONE_AT = said(38);
export const ITS_AT = said(40);
export const MINUS_AT = said(41);
export const DEGREES_AT = said(45);
export const AND_AT = said(46);
export const LAKE_AT = said(48);
export const YOU_AT = said(50);
export const LIQUID_AT = said(51);
export const GAS_AT = said(53);
export const SO_AT = said(54);
export const REALLY_AT = said(57);
export const WARM_AT = said(58);
export const COAT_AT = said(59);
export const BECAUSE_AT = said(60);

/** The one cut: from the flight over the lake to the shore, on "Strap". */
export const CUT_AT = STRAP_AT;
/** Frozen mid-flap from here until "So". */
export const FREEZE_AT = YOU_AT - 0.12;
/** The coat puffs away here, gone before the loop point. */
export const POOF_AT = 20.72;

/** One track before the cut and another after it. */
const split = (before: (t: number) => number, after: (t: number) => number) => (t: number): number =>
  (wrap(t) < CUT_AT ? before(wrap(t)) : after(wrap(t)));

// ---------------------------------------------------------------- the wings

/** The flap's phase in cycles: 0 is mid-downstroke, 0.25 the bottom, 0.75 the tips up. */
const PHASE_A = paced([
  { t: 0, rate: 1.7 }, { t: FLY_AT - 0.2, rate: 1.7 }, { t: FLY_AT + 0.3, rate: 1.4 }, { t: CUT_AT, rate: 1.7 },
], 0);
const PHASE_B = paced([
  { t: CUT_AT, rate: 0.3 }, { t: WINGS_AT, rate: 0.4 }, { t: FLAP_AT, rate: 3.4 }, { t: OFF_AT, rate: 3.4 },
  { t: OFF_AT + 0.5, rate: 2.2 }, { t: AIR_AT, rate: 1.4 }, { t: THICKER_AT, rate: 1.1 }, { t: TODDLER_AT, rate: 1.1 },
  { t: ONE_AT, rate: 1.2 }, { t: ITS_AT, rate: 1.6 }, { t: FREEZE_AT - 0.32, rate: 1.6 },
  // Frozen with the tips up, until "So".
  { t: FREEZE_AT, rate: 0, mod: 0.75, slack: 10 }, { t: SO_AT - 0.05, rate: 0 },
  { t: SO_AT + 0.25, rate: 3 }, { t: REALLY_AT, rate: 3 }, { t: COAT_AT + 0.3, rate: 2 },
  // Back where the loop began: mid-downstroke.
  { t: LOOP_S, rate: 1.7, mod: 0, slack: 14 },
], 0.6);
export const phaseAt = split(track(PHASE_A), track(PHASE_B));

/** The middle of the stroke and its half-swing, degrees on screen (180 points straight back). */
const MID = split(track(keys([[0, 205], [CUT_AT, 205]])), track(keys([
  [CUT_AT, 172, 0], [WINGS_AT, 172, 0], [WINGS_AT + 0.35, 208], [FLAP_AT, 205], [LOOP_S, 205, 0],
])));
const SWING = split(track(keys([[0, 50, 0], [FLY_AT - 0.2, 50], [FLY_AT + 0.3, 60], [CUT_AT, 52]])), track(keys([
  [CUT_AT, 4, 0], [WINGS_AT, 6], [WINGS_AT + 0.35, 26], [FLAP_AT, 40], [OFF_AT, 44], [OFF_AT + 0.4, 55], [AIR_AT, 48],
  [ONE_AT, 45], [ITS_AT + 0.5, 32], [FREEZE_AT - 0.4, 32], [FREEZE_AT, 40], [SO_AT, 40], [SO_AT + 0.3, 44], [COAT_AT, 50], [LOOP_S, 50, 0],
])));

const DEG = Math.PI / 180;
/** The far wing rides this much higher than the near one (it's seen past the body). */
export const FAR_LEAD = 22 * DEG;

/** The near wing's angle on screen, radians (before the body's tilt). */
export const wingAt = (t: number): number => (MID(t) - SWING(t) * Math.sin(2 * Math.PI * phaseAt(t))) * DEG;
/** How hard it is flapping, 0..1-ish: the swing over its usual 50°. */
export const effortAt = (t: number): number => SWING(t) / 50;

// ---------------------------------------------------------------- the flyer

/** Screen px per unit of the game's prospector drawing. */
export const SCALE = 14.5;
/** The shore's surface on screen while it stands there. */
export const GROUND_Y = 1040;
/** Its drawing's feet are this far under its origin (PROSPECTOR_GROUND). */
const FEET = 14;
const STAND_Y = GROUND_Y - FEET * SCALE;

const X = split(track(keys([[0, 600, 6], [FLY_AT, 612], [FLY_AT + 0.7, 640], [CUT_AT, 650]])), track(keys([
  [CUT_AT, 600, 0], [OFF_AT, 600, 0], [OFF_AT + 1.2, 590], [WEIGH_AT - 0.3, 590, 0], [WEIGH_AT + 0.5, 470, 0], [ONE_AT, 470, 0],
  [ONE_AT + 0.7, 570, 0], [AND_AT, 570, 0], [GAS_AT, 560], [SO_AT, 585], [LOOP_S, 600, 6],
])));
const Y = split(track(keys([[0, 700, -14], [FLY_AT - 0.1, 676], [FLY_AT + 0.6, 615], [CUT_AT, 600]])), track(keys([
  [CUT_AT, STAND_Y, 0], [OFF_AT - 0.05, STAND_Y, 0], [OFF_AT + 0.9, 630, -60], [AIR_AT + 0.6, 640], [TODDLER_AT, 680],
  [ONE_AT + 0.7, 660], [AND_AT, 650], [FREEZE_AT, 640, 0], [GAS_AT, 646, 30], [SO_AT + 0.1, 775, 0], [COAT_AT, 725], [LOOP_S, 700, -14],
])));
/** Its tilt, radians (negative is nose up). */
const TILT = split(track(keys([[0, -0.1, 0], [FLY_AT, -0.12], [FLY_AT + 0.5, -0.2], [CUT_AT, -0.12]])), track(keys([
  [CUT_AT, 0, 0], [OFF_AT, 0, 0], [OFF_AT + 0.8, -0.14], [AIR_AT + 0.6, -0.1], [FREEZE_AT, -0.08, 0], [GAS_AT, -0.02],
  [SO_AT, 0.14], [SO_AT + 0.6, -0.04], [LOOP_S, -0.1, 0],
])));

/** The shiver: on as the frost bites, stopped dead by the freeze. */
export const shiverAt = (t: number): number => ramp(t, ITS_AT, MINUS_AT + 0.4) * (1 - ramp(t, FREEZE_AT - 0.1, FREEZE_AT));
/** Wobbly after lift-off, and rocking as it flaps and hops on the shore. */
const wobbleAt = (t: number): number =>
  0.15 * Math.sin(2 * Math.PI * 2.3 * (t - OFF_AT)) * window01(t, OFF_AT - 0.1, OFF_AT + 1.7, 0.35)
  + 0.06 * Math.sin(2 * Math.PI * 3.4 * t) * window01(t, FLAP_AT, OFF_AT, 0.2);
/** How high each flap hops it off the pebbles on "flap hard". */
const HOP_PX = 34;
const hopAt = (t: number): number => HOP_PX * window01(t, FLAP_AT, OFF_AT + 0.1, 0.12) * (0.5 - 0.5 * Math.cos(2 * Math.PI * phaseAt(t)));

export type Legs = 'fly' | 'stand';
export type Face = 'calm' | 'shock';

export interface Flyer {
  /** Where its drawing's origin is on screen. */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** The near and far wings' angles on screen (tilt included), radians. */
  readonly near: number;
  readonly far: number;
  readonly legs: Legs;
  readonly face: Face;
}

export function flyerAt(seconds: number): Flyer {
  const t = wrap(seconds);
  const p = phaseAt(t);
  const flying = t < CUT_AT || t > OFF_AT;
  // The body rises through each downstroke.
  const bob = flying ? -12 * effortAt(t) * Math.sin(2 * Math.PI * p) : 0;
  const shiver = shiverAt(t);
  const tilt = TILT(t) + wobbleAt(t) + 0.015 * shiver * Math.sin(2 * Math.PI * 9 * t);
  const near = wingAt(t) + tilt;
  return {
    x: X(t) + 6 * shiver * Math.sin(2 * Math.PI * 13 * t),
    y: Y(t) + bob - hopAt(t) + 4 * shiver * Math.sin(2 * Math.PI * 17 * t + 1),
    tilt,
    near,
    far: near + FAR_LEAD,
    legs: t >= CUT_AT && t < OFF_AT + 0.1 ? 'stand' : 'fly',
    face: t >= FREEZE_AT && t < SO_AT + 0.3 ? 'shock' : 'calm',
  };
}

/** The bottom of every downstroke (the downwash hits), and its strength. */
export interface Stroke {
  readonly t: number;
  readonly effort: number;
}
const strokesAt = (level: number): readonly Stroke[] =>
  [...crossings(phaseAt, 0, CUT_AT, level), ...crossings(phaseAt, CUT_AT + 0.004, LOOP_S, level)].map((t) => ({ t, effort: effortAt(t) }));
export const STROKES = strokesAt(0.25);
/** Each downstroke's start (the tips at the top), for its whoosh. */
export const BEATS = strokesAt(0.8);

// ---------------------------------------------------------------- the camera and the lake

/** The lake's horizon on screen: level over the lake, the far shore from the beach, off below while climbing, high when it tips down. */
export const horizonAt = split(track(keys([[0, 1060, 30], [FLY_AT, 1110], [FLY_AT + 0.7, 1230], [CUT_AT, 1290]])), track(keys([
  [CUT_AT, 860, 0], [OFF_AT, 860, 0], [OFF_AT + 1.7, 2080, 0], [AND_AT, 2080, 0], [LAKE_AT + 0.4, 500, 0], [GAS_AT, 520],
  [SO_AT + 0.1, 760], [COAT_AT, 1010], [LOOP_S, 1060, 30],
])));
/** Where the water under it is, below the horizon, px. */
export const nadirAt = split(track(keys([[0, 70, 12], [CUT_AT, 240]])), track(keys([
  [CUT_AT, 240], [AND_AT, 900, 0], [LAKE_AT + 0.4, 840, 0], [GAS_AT, 820], [SO_AT + 0.1, 330], [COAT_AT, 100], [LOOP_S, 70, 12],
])));
/** How round the ripples look: flat seen level, rounder looking down. */
export const flatAt = (t: number): number => 0.2 + 0.32 * window01(wrap(t), AND_AT, SO_AT + 0.6, 0.6);
/** The beach under it, from the cut until it climbs out of sight. */
export const shoreAt = (t: number): boolean => wrap(t) >= CUT_AT && wrap(t) < AND_AT;
export const SHORE_BELOW = GROUND_Y - 860;
/** How hard the downwash hits the water for a stroke at t (it's low over the lake). */
export const washAt = (t: number): number => {
  const w = wrap(t);
  return w < CUT_AT ? 1 - ramp(w, FLY_AT, FLY_AT + 1.2) : ramp(w, SO_AT, SO_AT + 0.9);
};

/** How far the haze has scrolled past (px): fast as it climbs, back up as the camera tips down and it drops. */
export const HAZE_PERIOD = 1600;
const HAZE_A = paced([{ t: 0, rate: 50 }, { t: CUT_AT, rate: 60 }], 0, HAZE_PERIOD);
const HAZE_B = paced([
  { t: CUT_AT, rate: 0 }, { t: OFF_AT, rate: 0 }, { t: OFF_AT + 0.6, rate: 900 }, { t: AIR_AT + 1, rate: 420 }, { t: TODDLER_AT, rate: 140 },
  { t: AND_AT, rate: 60 }, { t: LAKE_AT + 0.3, rate: -260 }, { t: GAS_AT, rate: -60 }, { t: SO_AT, rate: -240 },
  { t: COAT_AT, rate: 40 }, { t: LOOP_S, rate: 50 },
], 0, HAZE_PERIOD);
const HAZE_END = curveAt(HAZE_B, LOOP_S).at;
/** The scroll, lined up so the end of the loop meets its start. */
export const hazeAt = split(track(HAZE_A), (t) => curveAt(HAZE_B, t).at - HAZE_END);

/** How thick the haze looks (motes, bands): up on "air", thicker on "THICKER". */
export const thickAt = split(() => 0.35, track(keys([
  [CUT_AT, 0.35, 0], [AIR_AT - 0.1, 0.35, 0], [AIR_AT + 0.4, 0.75], [THICKER_AT, 0.8], [THICKER_AT + 0.35, 1, 0], [ONE_AT, 0.85],
  [AND_AT, 0.5], [SO_AT, 0.4], [LOOP_S, 0.35, 0],
])));

// ---------------------------------------------------------------- moods

/** The cold: blue creeps in on "One catch", gone again once the coat's on. */
export const coldAt = (t: number): number => ramp(t, ONE_AT, DEGREES_AT) * (1 - ramp(t, WARM_AT - 0.2, COAT_AT + 0.7));
/** Frost over the wings and the helmet: from "it's", melting off under the coat. */
export const frostAt = (t: number): number => ramp(t, ITS_AT, DEGREES_AT + 0.5) * (1 - ramp(t, COAT_AT, COAT_AT + 0.6));
/** Dread: the frame darkens as the lake opens up below. */
export const dreadAt = (t: number): number => window01(t, AND_AT, SO_AT + 0.5, 0.5);
/** A bright lift: on "FLY" and "you're off!". */
export const liftAt = (t: number): number => Math.max(window01(t, FLY_AT - 0.05, FLY_AT + 0.9, 0.3), window01(t, OFF_AT - 0.05, OFF_AT + 0.8, 0.25));
/** Warm relief: the coat's glow. */
export const reliefAt = (t: number): number => window01(t, COAT_AT - 0.05, POOF_AT, 0.25);

// ---------------------------------------------------------------- the coat

/** How much of the coat shows, and its pop (scale over 1) as it lands on "coat". */
export const coatAt = (t: number): { readonly show: number; readonly scale: number } => {
  const u = (wrap(t) - (COAT_AT - 0.04)) / 0.32;
  if (u <= 0 || wrap(t) >= POOF_AT) return { show: 0, scale: 1 };
  return { show: 1, scale: u < 1 ? 0.7 + 0.3 * smooth(u * 1.6) + 0.16 * Math.sin(Math.PI * u) : 1 };
};
/** The puff of ink it vanishes in, 0..1 of its life. */
export const poofAt = (t: number): number => (wrap(t) - POOF_AT) / 0.26;
/** The pop of ink it arrives in. */
export const coatPuffAt = (t: number): number => (wrap(t) - (COAT_AT - 0.06)) / 0.4;

// ---------------------------------------------------------------- notes on screen

/** "Saturn's moon Titan": a small inset of the moon, from space. */
export const insetAt = (t: number): number => window01(t, SATURN_AT - 0.06, FLY_AT + 0.35, 0.25);
/** The burst of speed lines on "FLY". */
export const flyBurstAt = (t: number): number => (wrap(t) - (FLY_AT - 0.04)) / 0.6;
/** The buckles cinched on "Strap": a glint on each, one after the other. */
export const buckleAt = (i: number, t: number): number => (wrap(t) - (STRAP_AT + 0.05 + 0.3 * i)) / 0.4;
/** Pebbles kicked up on "you're off!". */
export const kickAt = (t: number): number => (wrap(t) - (OFF_AT - 0.05)) / 1.1;
export const fourAt = (t: number): number => window01(t, FOUR_AT - 0.05, WEIGH_AT - 0.1, 0.2);
export const weightAt = (t: number): number => window01(t, WEIGH_AT - 0.05, ONE_AT + 0.15, 0.2);
export const toddlerAt = (t: number): number => window01(t, TODDLER_AT - 0.12, ONE_AT + 0.25, 0.18);
/** "−180 °C", from "minus" to the lake. */
export const degreesAt = (t: number): number => window01(t, MINUS_AT - 0.05, AND_AT + 0.2, 0.2);
/** The "!" over its helmet as it freezes. */
export const shockMarkAt = (t: number): number => window01(t, FREEZE_AT, GAS_AT + 0.5, 0.1);
/** Bubbles of the gas boiling up through the lake. */
export const bubblesAt = (t: number): number => window01(t, LIQUID_AT - 0.25, SO_AT + 0.4, 0.3);
