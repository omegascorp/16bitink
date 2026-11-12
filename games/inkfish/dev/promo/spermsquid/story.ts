import { BOIL_FPS } from '../../../src/art/textures';
import type { Mood } from '../kraken/story';
import { type Frame } from '../kraken/rig';
import { JAW, JAW_PIVOT, jawAt as jawPoint, openJaw, type Pt } from '../kraken/whale';
import { clamp01, lerp, ramp, window01 } from '../short';
import { LOOP_S, TEMPO, WORDS } from './words';

/**
 * "This whale swallows giant squid without chewing", beat by beat, every
 * value a pure function of loop time (render.ts draws it):
 *
 * 1. swallow: frame 1 is the hook itself, the sperm whale's head filling the
 *    frame, its narrow lower jaw dropped open, a giant squid sliding in
 *    mantle first, its arms and two long tentacles writhing out of the mouth;
 *    on "without chewing!" it's gulped and the jaw snaps shut.
 * 2. dive: the whole whale heading down into the dark, "1,000 ft / 300 m".
 * 3. bus: a giant squid stretched out over a school bus as long as it, "40 ft / 12 m".
 * 4. teeth: close on the mouth, teeth only in the lower jaw (sockets above);
 *    "It just… swallows." a tentacle tip slurped in, the jaw snaps shut.
 * 5. fight: the squid's arms wrap the whale's head, it lets go, and the
 *    whale comes up covered in small round sucker scars.
 * 6. film: a camera's light sweeping empty dark water, REC.
 * 7. eye: the whale's eye in the dark, "the only witness is", cut to frame 1.
 */

export { LOOP_S };

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** When the nth `text` is said, in voice.mp3 (loop) seconds. */
export function said(text: string, nth = 1): number {
  const hits = WORDS.filter((w) => w.text === text);
  const w = hits[nth - 1];
  if (!w) throw new Error(`no word "${text}" #${nth}`);
  return w.start / TEMPO;
}

export const AT = {
  whale: said('whale'),
  eats: said('eats'),
  giant: said('GIANT'),
  squid: said('squid…'),
  without: said('without'),
  chewing: said('chewing!'),
  it: said('It'),
  dives: said('dives'),
  thousand: said('thousand'),
  feet: said('feet'),
  dark: said('dark,'),
  where: said('where'),
  squid2: said('squid'),
  long: said('long'),
  bus: said('BUS'),
  waiting: said('waiting.'),
  teeth: said('Teeth?'),
  only: said('Only'),
  bottom: said('bottom'),
  jaw: said('jaw.'),
  it2: said('It', 2),
  just: said('just…'),
  swallows: said('swallows.'),
  but: said('But'),
  fight: said('fight'),
  back: said('back:'),
  whales: said('whales'),
  come: said('come'),
  covered: said('covered'),
  sucker: said('sucker'),
  scars: said('SCARS!'),
  and: said('And'),
  nobody: said('nobody'),
  ever: said('ever'),
  filmed: said('filmed'),
  itDot: said('it.'),
  so: said('So'),
  only2: said('only'),
  witness: said('witness'),
  is: said('is'),
} as const;

// ---------------------------------------------------------------- scenes

export type SceneName = 'swallow' | 'dive' | 'bus' | 'teeth' | 'fight' | 'film' | 'eye';

/** Each scene's first moment (hard cuts, a little before the word that calls for it). */
export const CUTS: readonly { readonly name: SceneName; readonly from: number }[] = [
  { name: 'swallow', from: 0 },
  { name: 'dive', from: AT.it - 0.12 },
  { name: 'bus', from: AT.where - 0.15 },
  { name: 'teeth', from: AT.teeth - 0.2 },
  { name: 'fight', from: AT.but - 0.12 },
  { name: 'film', from: AT.and - 0.15 },
  { name: 'eye', from: AT.so - 0.08 },
];

export interface Scene {
  readonly name: SceneName;
  /** Loop seconds. */
  readonly u: number;
  /** Seconds since the scene's cut. */
  readonly s: number;
}

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  let i = 0;
  while (i + 1 < CUTS.length && u >= CUTS[i + 1]!.from) i++;
  return { name: CUTS[i]!.name, u, s: u - CUTS[i]!.from };
}

export const sceneFrom = (name: SceneName): number => CUTS.find((c) => c.name === name)!.from;
export const sceneTo = (name: SceneName): number => {
  const i = CUTS.findIndex((c) => c.name === name);
  return i + 1 < CUTS.length ? CUTS[i + 1]!.from : LOOP_S;
};

// ---------------------------------------------------------------- placing the whale

/** Whale local px (kraken/whale.ts: facing right, snout at 0) to screen px: turned by `rot`, scaled by `zoom`, about (x, y). */
export interface Place {
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly zoom: number;
}

export const placeOf = (p: Place): Frame => ({ x: p.x, y: p.y, angle: p.rot, scale: p.zoom });

/** A placement that puts whale-local point `local` at screen point `screen`. */
export function placeAt(local: Pt, screen: Pt, rot: number, zoom: number): Place {
  const c = Math.cos(rot) * zoom;
  const s = Math.sin(rot) * zoom;
  return { x: screen.x - (local.x * c - local.y * s), y: screen.y - (local.x * s + local.y * c), rot, zoom };
}

export function toScreen(p: Place, local: Pt): Pt {
  const c = Math.cos(p.rot) * p.zoom;
  const s = Math.sin(p.rot) * p.zoom;
  return { x: p.x + local.x * c - local.y * s, y: p.y + local.x * s + local.y * c };
}

// ---------------------------------------------------------------- 1. swallow

/** The squid's scale in the hook, squid body px to whale local px. */
export const HOOK_SQUID_SCALE = 2.75;
/** How far it slides in along its own axis, whale local px, by the time the jaw shuts. */
export const SWALLOW_DEPTH = 1150;
/** The jaw in the hook, radians open. */
export const HOOK_OPEN = 0.8;
/** Where its arms leave its head, squid body px. */
const CROWN_X = 110;

export interface Swallow {
  /** The jaw, radians open. */
  readonly open: number;
  /** 0 the squid's head at the lips .. 1 all of it inside. */
  readonly p: number;
  /** How hard its arms writhe, 0 .. 1. */
  readonly writhe: number;
  /** The gulp's bounce, 0 .. 1 .. 0. */
  readonly gulp: number;
}

export function swallowAt(t: number): Swallow {
  const u = wrap(t);
  const shut = ramp(u, AT.chewing - 0.12, AT.chewing + 0.1);
  const p = 0.04 + 0.1 * ramp(u, 0, AT.without) + 0.86 * ramp(u, AT.without - 0.05, AT.chewing + 0.08);
  return {
    open: HOOK_OPEN * (1 - shut),
    p: Math.min(1, p),
    writhe: 1 - 0.6 * ramp(u, AT.without, AT.chewing),
    gulp: window01(u, AT.chewing - 0.02, AT.chewing + 0.55, 0.22),
  };
}

/** The hook's camera: the head ~85% of the frame width, pushing in a touch, a bounce on the gulp. */
export function hookPlaceAt(t: number): Place {
  const u = wrap(t);
  const g = swallowAt(t).gulp;
  const zoom = lerp(0.95, 1.0, ramp(u, 0, AT.chewing)) + 0.03 * g;
  return placeAt({ x: -440, y: 60 }, { x: 460, y: 600 + 14 * g }, 0.04, zoom);
}

/** The palate's front edge (the lips of the upper jaw), whale local px. */
const LIP: Pt = { x: -120, y: 190 };

/** The squid's body frame in whale local px: its axis along the open mouth, sliding in mantle first by `p`. */
export function hookSquidFrame(sw: Swallow): Frame {
  const tip = openJaw(JAW.tip, sw.open);
  const angle = 0.08 + 0.55 * sw.open;
  const start = { x: lerp(LIP.x, tip.x, 0.55) + 70, y: lerp(LIP.y, tip.y, 0.5) + 10 };
  const crown = { x: start.x - Math.cos(angle) * sw.p * SWALLOW_DEPTH, y: start.y - Math.sin(angle) * sw.p * SWALLOW_DEPTH };
  const k = CROWN_X * HOOK_SQUID_SCALE;
  return { x: crown.x - Math.cos(angle) * k, y: crown.y - Math.sin(angle) * k, angle, scale: HOOK_SQUID_SCALE };
}

/** The region under the opened jaw (whale local px), where nothing of the swallowed squid may show. */
export function underJaw(open: number): Pt[] {
  const edge = Array.from({ length: 13 }, (_, i) => openJaw(jawPoint(i / 12).upper, open));
  const tip = edge[edge.length - 1]!;
  return [JAW_PIVOT, ...edge, { x: tip.x - 30, y: tip.y + 3000 }, { x: JAW_PIVOT.x - 3000, y: tip.y + 3000 }, { x: JAW_PIVOT.x - 3000, y: JAW_PIVOT.y - 30 }];
}

// ---------------------------------------------------------------- 2. dive

export function divePlaceAt(t: number): Place {
  const s = wrap(t) - sceneFrom('dive');
  return placeAt({ x: -1300, y: 0 }, { x: 500 + 30 * s, y: 860 + 40 * s }, 1.05, 0.5);
}
/** Light from above, fading as it sinks. */
export const diveLightAt = (t: number): number => 0.55 * (1 - ramp(wrap(t), sceneFrom('dive'), AT.dark + 0.1));
export const readoutAt = (t: number): number => window01(wrap(t), AT.thousand - 0.25, sceneTo('dive') + 0.01, 0.15);
/** Counts up on "thousand" and settles on 1,000 before the word ends. */
export const feetAt = (t: number): number => Math.round((1000 * ramp(wrap(t), AT.thousand - 0.25, AT.thousand + 0.2)) / 10) * 10;
/** Metres, to the nearest ten (1,000 ft is about 300 m). */
export const metresOf = (feet: number): number => Math.round((feet * 0.3) / 10) * 10;

// ---------------------------------------------------------------- 3. bus

/** The bus and the squid stretched over it, both this long on screen (40 ft, 12 m). */
export const BUS = { x0: 40, x1: 1040, top: 790, h: 250 } as const;
export const SQUID_ROW_Y = 405;
/** The "40 ft" bar between them. */
export const BAR_Y = 575;
/** Squid body px to screen px in the bus scene, and its tentacles' length (body px) so mantle tip to club tip spans the bus. */
export const BUS_SQUID_SCALE = 1.6;
export const BUS_TENTACLE = (BUS.x1 - BUS.x0) / BUS_SQUID_SCALE - (CROWN_X + 124);

export const busSquidInAt = (t: number): number => ramp(wrap(t), AT.squid2 - 0.3, AT.squid2 + 0.2);
export const busInAt = (t: number): number => ramp(wrap(t), AT.bus - 0.4, AT.bus + 0.05);
export const busLabelAt = (t: number): number => ramp(wrap(t), AT.bus - 0.05, AT.bus + 0.2);

// ---------------------------------------------------------------- 4. teeth

export function teethOpenAt(t: number): number {
  const u = wrap(t);
  return 0.5 * ramp(u, AT.teeth - 0.12, AT.teeth + 0.12) * (1 - ramp(u, AT.swallows - 0.02, AT.swallows + 0.1));
}
/** A glint running along the lower teeth on "bottom jaw", tooth i of n. */
/** A soft band of light sliding along the lower teeth on "bottom jaw": how much of it is on the tooth at s (along the jaw). */
export function toothShineAt(t: number, s: number): number {
  const u = wrap(t);
  const band = lerp(-0.1, 1.15, ramp(u, AT.bottom - 0.15, AT.jaw + 0.45));
  return window01(u, AT.bottom - 0.15, AT.jaw + 0.55, 0.15) * Math.exp(-(((s - band) / 0.12) ** 2));
}
/** The last tentacle tip in the mouth, slurped in: 0 at the lips .. 1 gone. */
export const slurpAt = (t: number): number => ramp(wrap(t), AT.swallows - 0.4, AT.swallows + 0.02);
/** The gulp: a bulge running back along the lower jaw and throat, 0 .. 1 while it travels. */
export const gulpTravelAt = (t: number): number => (wrap(t) - (AT.swallows + 0.08)) / 0.72;
export const gulpBulge = (g: number): number => (g <= 0 || g >= 1 ? 0 : Math.sin(Math.PI * g));
export function teethPlaceAt(t: number): Place {
  const u = wrap(t);
  const snap = window01(u, AT.swallows + 0.04, AT.swallows + 0.5, 0.15);
  const pull = ramp(u, AT.swallows - 0.05, AT.swallows + 0.4);
  const zoom = lerp(lerp(1.55, 1.7, ramp(u, sceneFrom('teeth'), AT.jaw)), 1.2, pull) - 0.06 * snap;
  return placeAt({ x: lerp(-390, -640, pull), y: lerp(250, 230, pull) }, { x: 540, y: 720 - 12 * snap }, -0.04, zoom);
}

// ---------------------------------------------------------------- 5. fight

/** The arms wrapping round the head (0 loose .. 1 wrapped). */
export const wrapAt = (t: number): number => ramp(wrap(t), AT.fight - 0.15, AT.back + 0.2) * (1 - ramp(wrap(t), AT.whales - 0.3, AT.whales + 0.1));
/** The squid there (it lets go and sinks away as the whale comes up). */
export const fightSquidAt = (t: number): number => 1 - ramp(wrap(t), AT.whales - 0.2, AT.come + 0.15);
export const fightJawAt = (t: number): number => 0.32 * (1 - ramp(wrap(t), AT.whales - 0.1, AT.covered));
/** Light from above as it comes up. */
export const fightLightAt = (t: number): number => 0.4 * ramp(wrap(t), AT.whales - 0.1, AT.sucker);
export function fightPlaceAt(t: number): Place {
  const u = wrap(t);
  const close = ramp(u, AT.whales - 0.1, AT.sucker + 0.1);
  const zoom = lerp(0.86, 1.55, close);
  const local = { x: lerp(-480, -390, close), y: lerp(40, -30, close) };
  return placeAt(local, { x: lerp(300, 540, close), y: lerp(720, 720, close) - 60 * close }, lerp(-0.22, -0.08, close), zoom);
}
/** A scar ordered `order` (0 .. 1): 0 not yet, up to 1.3 as it pops in, settling at 1. */
export function scarLookAt(order: number, t: number): number {
  const at = lerp(AT.sucker - 0.1, AT.scars + 0.3, order);
  const s = (wrap(t) - at) / 0.18;
  if (s <= 0 || sceneAt(t).name !== 'fight') return 0;
  return s >= 1.6 ? 1 : s < 1 ? s * 1.3 : 1.3 - 0.3 * ((s - 1) / 0.6);
}

// ---------------------------------------------------------------- 6. film, 7. eye

/** The camera's light from the top left, sweeping across empty water. */
export function beamAt(t: number): { readonly on: number; readonly angle: number; readonly rec: number } {
  const u = wrap(t);
  const on = ramp(u, AT.nobody - 0.25, AT.nobody + 0.05);
  const angle = 0.55 + 0.55 * Math.sin(((u - AT.nobody) / 1.4) * Math.PI - 0.6);
  return { on, angle, rec: ramp(u, AT.ever - 0.1, AT.ever + 0.1) };
}
export function eyePlaceAt(t: number): Place {
  const u = wrap(t);
  const zoom = lerp(3.3, 3.8, clamp01((u - sceneFrom('eye')) / (LOOP_S - sceneFrom('eye'))));
  return placeAt({ x: -700, y: 105 }, { x: 560, y: 760 }, -0.05, zoom);
}
/** The eye's lid opening as the scene starts, and the catchlight brightening on "witness". */
export const lidAt = (t: number): number => ramp(wrap(t), sceneFrom('eye') + 0.05, AT.only2);
export const eyeGlintAt = (t: number): number => ramp(wrap(t), AT.witness - 0.15, AT.witness + 0.15);

// ---------------------------------------------------------------- the whole frame

/** The water's mood a beat, kraken/scenery.ts colours (epic deep blue-black where all are 0). */
export function moodAt(t: number): Mood {
  const u = wrap(t);
  return {
    curious: 0,
    tense: window01(u, sceneFrom('bus'), sceneTo('bus'), 0.2),
    surprised: Math.max(window01(u, AT.without - 0.1, sceneTo('swallow'), 0.25), window01(u, sceneFrom('fight'), AT.whales, 0.2)),
    sarcastic: window01(u, sceneFrom('teeth'), sceneTo('teeth'), 0.2),
    mischievous: u >= sceneFrom('film') ? ramp(u, sceneFrom('film'), sceneFrom('film') + 0.3) : 0,
  };
}

/** Light from above (0 .. 1) for the water's wash. */
export function daylightAt(t: number): number {
  const sc = sceneAt(t);
  if (sc.name === 'dive') return diveLightAt(t);
  if (sc.name === 'fight') return fightLightAt(t);
  return 0;
}

/** A jolt on the gulps and the bus's arrival, screen px. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  const jolt = (at: number, size: number): number => {
    const s = u - at;
    return s < 0 || s > 0.4 ? 0 : size * Math.exp(-s * 9) * Math.sin(s * 70);
  };
  const a = jolt(AT.chewing + 0.06, 16) + jolt(AT.swallows + 0.06, 12) + jolt(AT.bus + 0.02, 7) + jolt(AT.back, 9);
  return { x: a * 0.6, y: a };
}
