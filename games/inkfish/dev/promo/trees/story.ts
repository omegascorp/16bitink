import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, curveAt, type Key, lerp, ramp } from '../short';
import { TEMPO, WORDS } from './words';

/**
 * "Sharks are older than trees": the first sharks swam about 450 million
 * years ago (shark-like scales from the Ordovician), the first trees grew
 * about 390 million years ago (Wattieza, Archaeopteris, the Cairo fossil
 * forest), and sharks survived the asteroid that ended the dinosaurs 66
 * million years ago. Told by a narrator (words.ts) over a cut-away coast,
 * land above and sea below, laid out along a timeline: a ruler of millions
 * of years runs along the frame and the camera travels along it, every beat
 * timed to the words, a function of time in seconds over a loop of LOOP_S.
 *
 *   0     today: a forest on the shore, a shark swimming past the big tree,
 *         tagged with their ages
 *   2.5   "The first sharks swam about 450 million years ago": the camera
 *         rewinds along the ruler to 450, the shark dragged back and
 *         fading to an early shark's silhouette
 *   6.1   "The first trees grew…": on to 390, where the first tree sprouts;
 *         "…sixty million years later": a bracket of 60 million years on
 *         the ruler between the two (the payoff)
 *   9.0   "Sharks survived the asteroid…": fast forward to 66, the shark
 *         inked in again; the asteroid streaks down and hits; "…wiped out
 *         the dinosaurs": they topple and fade while the shark swims on
 *   11.8  "…they're still at the top of the food chain": back to today,
 *         where the shark sucks in a mackerel
 *   13.8  "So next time you walk through a forest, remember:": a hiker
 *         walks under the trees, the shark comes round again, and the
 *         loop finishes the sentence.
 */
export const LOOP_S = 16.5;

/** The line boil steps at the game's 8 a second: 132 steps, 44 whole cycles a loop. */
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

export const TREES_WORD_AT = said('TREES.');
export const THE_AT = said('The');
export const SHARKS_AT = said('sharks');
export const SWAM_AT = said('swam');
export const FIFTY_AT = said('fifty');
export const TREES_THE_AT = said('The', 2);
export const TREES_AT = said('trees');
export const GREW_AT = said('grew');
export const SIXTY_AT = said('sixty');
export const SURVIVORS_AT = said('Sharks', 2);
export const SURVIVED_AT = said('survived');
export const ASTEROID_AT = said('asteroid');
export const WIPED_AT = said('wiped');
export const DINOS_AT = said('dinosaurs,');
export const STILL_AT = said('still');
export const TOP_AT = said('top');
export const FOOD_AT = said('food');
export const CHAIN_AT = said('chain.');
export const SO_AT = said('So');
export const WALK_AT = said('walk');
export const FOREST_AT = said('forest,');
export const REMEMBER_AT = said('remember:');

/** A value keyed through the loop that comes round smoothly: keys in [0, LOOP_S), the last running on into the first. */
function looped(keys: readonly Key[]): (t: number) => { readonly at: number; readonly rate: number } {
  const eased = keys.map((k) => ({ ...k, rate: k.rate ?? 0 }));
  const ext = [
    ...eased.slice(-2).map((k) => ({ ...k, t: k.t - LOOP_S })),
    ...eased,
    ...eased.slice(0, 2).map((k) => ({ ...k, t: k.t + LOOP_S })),
  ];
  return (t: number) => curveAt(ext, wrap(t));
}

// ---------------------------------------------------------------- the timeline

/** Screen px per million years along the ruler, and the screen's middle. */
export const PX_PER_MYR = 10;
export const MID_X = 540;
/** Where the camera sits for today: "today" (0) near the right edge, the forest across the frame. */
export const TODAY_CAM = 48;

/** The camera rewinds on "The first sharks…", landing on 450 as "fifty" is said. */
export const REWIND_FROM = THE_AT - 0.05;
export const REWIND_TO = FIFTY_AT;
/** Fast forward on "Sharks survived…", landing just as "asteroid" is said. */
export const WHOOSH_FROM = SURVIVORS_AT - 0.1;
export const WHOOSH_TO = ASTEROID_AT - 0.1;
/** Home to today on "…they're still". */
export const HOME_FROM = STILL_AT - 0.45;
export const HOME_TO = STILL_AT + 0.25;

/**
 * The camera, in millions of years ago at the middle of the screen: still
 * on today, a rewind to 450, a nudge on to 420 (450 on the left, 390 on the
 * right), a fast forward to the asteroid, and home. Drifting slowly while
 * the narrator talks, so the world never quite stops.
 */
const camera = looped([
  { t: REWIND_FROM, at: TODAY_CAM, rate: 0 },
  { t: REWIND_TO, at: 450, rate: 0 },
  { t: TREES_THE_AT, at: 447, rate: -2 },
  { t: GREW_AT, at: 420, rate: -1.5 },
  { t: WHOOSH_FROM, at: 417, rate: 0 },
  { t: WHOOSH_TO, at: 62, rate: 0 },
  { t: HOME_FROM, at: 59, rate: 0 },
  { t: HOME_TO, at: TODAY_CAM, rate: 0 },
]);
export const camAt = (t: number): number => camera(t).at;
/** How fast the camera travels, millions of years a second: positive going back in time. */
export const camRate = (t: number): number => camera(t).rate;

/** A moment of the timeline (millions of years ago) on screen, with the camera at `cam`. */
export const screenX = (myr: number, cam: number): number => MID_X + (cam - myr) * PX_PER_MYR;

// ---------------------------------------------------------------- the shark

/** One fish on screen. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  /** -1 (left) .. 1 (right): passes through 0 as it turns. */
  readonly face: number;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
  readonly jaw: number;
  /** A swallowed meal's swelling, 0 .. 1. */
  readonly lump: number;
  /** 1 the game's inked shark .. 0 an early shark's silhouette. */
  readonly ink: number;
}

/** The shark eats the mackerel as the narrator says "food chain". */
export const BITE_AT = CHAIN_AT - 0.03;
export const SUCK_S = 0.3;
/**
 * Then it patrols under the forest: turns round, swims back left beneath
 * the hiker on "walk through a forest", and turns again on "remember", to
 * swim past the big tree as the loop comes round.
 */
export const TURN_AT = BITE_AT + 0.75;
export const TURN_BACK_AT = REMEMBER_AT - 0.15;
const TURN_S = 0.5;
export const SHARK_Y = 925;
export const SHARK_LEN = 400;
/** Early sharks were smaller, and the picture lifts it clear of the bracket on the ruler. */
const EARLY_LEN = 300;
const EARLY_Y = 872;

const sharkX = looped([
  { t: 0, at: 300, rate: 200 },
  { t: 2.45, at: 720, rate: 110 },
  { t: REWIND_FROM + 0.12, at: 735, rate: 0 },
  { t: REWIND_TO - 0.2, at: 320, rate: 0 },
  { t: TREES_THE_AT, at: 380 },
  { t: WHOOSH_FROM, at: 420, rate: 20 },
  { t: WHOOSH_TO, at: 520, rate: 60 },
  { t: HOME_FROM, at: 545, rate: 10 },
  { t: BITE_AT - 0.45, at: 520, rate: -30 },
  { t: BITE_AT, at: 610, rate: 520 },
  { t: TURN_AT, at: 830, rate: 60 },
  { t: TURN_AT + TURN_S, at: 835, rate: -60 },
  { t: TURN_BACK_AT, at: 255, rate: -60 },
  { t: TURN_BACK_AT + TURN_S, at: 250, rate: 80 },
]);

/** How far it has been turned, -1 .. 1 (it faces left between its two turns). */
const faceAt = (t: number): number => 1 - 2 * ramp(t, TURN_AT, TURN_AT + TURN_S) + 2 * ramp(t, TURN_BACK_AT, TURN_BACK_AT + TURN_S);

export function sharkAt(t: number): Fish {
  const x = sharkX(t);
  const face = faceAt(t);
  const jaw = t < BITE_AT ? 0.85 * ramp(t, BITE_AT - 0.42, BITE_AT - 0.12) : 0.85 * (1 - ramp(t, BITE_AT, BITE_AT + 0.06));
  const fed = t >= BITE_AT ? 0.6 * ramp(t, BITE_AT, BITE_AT + 0.3) * (1 - ramp(t, TURN_AT + 0.4, TURN_BACK_AT - 0.3)) : 0;
  const early = ramp(t, REWIND_FROM + 0.2, REWIND_FROM + 1.2) - ramp(t, WHOOSH_FROM + 0.1, WHOOSH_TO);
  // Dragged back tail first in the rewind: barely beating its tail.
  const back = x.rate * Math.sign(face || 1) < -50 ? 0.15 : 1;
  const lunge = Math.sin(Math.PI * ramp(t, BITE_AT - 0.45, BITE_AT + 0.3));
  return {
    x: x.at,
    y: lerp(SHARK_Y, EARLY_Y, early) + 12 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S) - 18 * lunge,
    len: lerp(SHARK_LEN, EARLY_LEN, early),
    face,
    tilt: 0.03 * Math.sin((2 * Math.PI * 2 * t) / LOOP_S) + 0.06 * Math.sin(Math.PI * ramp(t, BITE_AT - 0.45, BITE_AT)),
    beat: (2 * Math.PI * 20 * t) / LOOP_S,
    effort: back * (0.3 + 0.6 * Math.max(ramp(Math.abs(x.rate), 80, 550), Math.sin(Math.PI * ramp(t, TURN_AT, TURN_AT + TURN_S)))),
    jaw: Math.max(0, jaw),
    lump: fed,
    ink: 1 - early,
  };
}

// ---------------------------------------------------------------- its meal

/** A mackerel swims in from the right, unaware, as the camera comes home; it spots the shark on "…at the top". */
export const SPOTS_AT = TOP_AT - 0.3;
const PREY_IN = HOME_FROM - 0.2;
const PREY_FROM = { x: 1260, y: 872 } as const;
const PREY_TO = { x: 880, y: 878 } as const;
export const PREY_LEN = 175;

export function preyAt(t: number): Fish | null {
  if (t < PREY_IN || t >= BITE_AT) return null;
  const u = clamp01((t - PREY_IN) / (BITE_AT - SUCK_S - PREY_IN));
  const glide = 1 - (1 - u) ** 1.6;
  const panic = ramp(t, SPOTS_AT, SPOTS_AT + 0.1);
  return {
    x: lerp(PREY_FROM.x, PREY_TO.x, glide),
    y: lerp(PREY_FROM.y, PREY_TO.y, glide) + 5 * Math.sin(t * 7),
    len: PREY_LEN,
    face: -1,
    tilt: -0.15 * panic,
    beat: t * 13 + 20 * panic * (t - SPOTS_AT),
    effort: 0.35 + 0.6 * panic,
    jaw: 0,
    lump: 0,
    ink: 1,
  };
}

/** How far the mackerel has been dragged into the shark's mouth, 0 .. 1 (null when it isn't). */
export function eatenAt(t: number): number | null {
  const u = (t - (BITE_AT - SUCK_S)) / SUCK_S;
  return u >= 0 && u < 1 ? u : null;
}

/** Water rushing into the open mouth, and the ink burst of the bite (0 .. 1 over its life). */
export const suctionAt = (t: number): number => Math.min(ramp(t, BITE_AT - 0.5, BITE_AT - 0.3), 1 - ramp(t, BITE_AT - 0.02, BITE_AT + 0.02));
export const chompAt = (t: number): number => (t - BITE_AT) / 0.16;

/** The mackerel's "!": it sees the shark on "…at the top", and stares until it's sucked in. */
export function alarmAt(t: number): number {
  const u = t - SPOTS_AT;
  const hold = BITE_AT - SUCK_S - SPOTS_AT;
  return u < 0 || u > hold ? 0 : Math.min(1.15 * ramp(u, 0, 0.12), 1 - ramp(u, hold - 0.12, hold));
}

// ---------------------------------------------------------------- the land

/** The first tree, on the ruler at 390: it sprouts on "grew" (and stays, out of sight, until the next loop's "grew"). */
export const FIRST_TREE = 390;
export const treeGrowth = (t: number): number => ramp(t, GREW_AT - 0.1, GREW_AT + 0.9);

/** Two dinosaurs just before 66 million years ago, where the asteroid lands. */
export const IMPACT_MYR = 66;
export const DINOS: readonly { readonly kind: 'sauropod' | 'rex'; readonly myr: number }[] = [
  { kind: 'sauropod', myr: 97 },
  { kind: 'rex', myr: 73 },
];

/**
 * When the rewind has carried the dinosaurs off the right of the screen:
 * they stand up again there, out of sight, ready for the fast forward.
 */
export const DINOS_BACK_AT = (() => {
  for (let t = REWIND_FROM; t < REWIND_TO; t += 0.01) if (camAt(t) > 200) return t;
  return REWIND_TO;
})();

/** The dinosaurs' end, 0 standing .. 1 gone: they slump and fade on "wiped out the dinosaurs". */
export function dinoFall(t: number): number {
  if (t < DINOS_BACK_AT) return 1;
  if (t < WIPED_AT) return 0;
  return ramp(t, WIPED_AT + 0.05, DINOS_AT + 0.55);
}

/** The asteroid streaks down on "asteroid" and hits just after. */
export const STREAK_FROM = ASTEROID_AT - 0.05;
export const IMPACT_AT = ASTEROID_AT + 0.36;
/** Its progress from the sky to the ground, 0 .. 1 (null outside the fall). */
export function asteroidAt(t: number): number | null {
  const u = (t - STREAK_FROM) / (IMPACT_AT - STREAK_FROM);
  return u >= 0 && u < 1 ? u ** 1.4 : null;
}
/** Seconds since the impact (null before it, and once its cloud is gone, before the camera heads home). */
export const IMPACT_S = 1.9;
export function sinceImpact(t: number): number | null {
  const s = t - IMPACT_AT;
  return s >= 0 && s < IMPACT_S ? s : null;
}
/** A jolt of the picture on the impact (and a small one on the bite), px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const jolt = (since: number, len: number, amp: number): { x: number; y: number } => {
    if (since < 0 || since > len) return { x: 0, y: 0 };
    const fade = (1 - since / len) ** 2;
    return { x: amp * fade * Math.sin(since * 90), y: amp * 0.8 * fade * Math.cos(since * 71) };
  };
  const a = jolt(t - IMPACT_AT, 0.7, 22);
  const b = jolt(t - BITE_AT, 0.25, 9);
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * The hiker at today's forest, walking left under the trees: in from the
 * right edge once the camera is home, under the big tree as the loop comes
 * round, and carried off with today when the camera rewinds (null after).
 */
const HIKER_FROM = HOME_TO - 0.1;
const HIKER_UNTIL = REWIND_FROM + 1.1;
const HIKER_SPEED = 110;
export const HIKER_STEPS = 36;
export function hikerAt(t: number): { readonly x: number; readonly step: number } | null {
  const walked = wrap(t - HIKER_FROM);
  if (walked > wrap(HIKER_UNTIL - HIKER_FROM)) return null;
  const today = 1140 - HIKER_SPEED * walked;
  return { x: today + (camAt(t) - TODAY_CAM) * PX_PER_MYR, step: (2 * Math.PI * HIKER_STEPS * t) / LOOP_S };
}
