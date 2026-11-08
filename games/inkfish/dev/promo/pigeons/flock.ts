import type { Pt } from '../../../src/art/pen';
import { clamp01, lerp, ramp } from '../short';
import { PIGEON_FEET_Y, type PigeonPose } from './art/pigeon';
import { ALBI_AT, BURST_AT, cyc, GRABS_AT, HUGE_AT, LOOP_S, LUNGE_FROM, MOVE_AT, NERVOUS_FROM, SLIDE_TO, SO_AT, TRICK_AT, wrap } from './timing';

/** The flock: who stands where, how each bird washes, freezes, twitches and flies (see story.ts for the beats). */

export interface Slot {
  readonly x: number;
  readonly ground: number;
  readonly len: number;
  readonly face: 1 | -1;
}

/** What a bird does while the flock washes. */
export type Act = 'drink' | 'bath' | 'preen';

/** Five birds on the island: 0 is the one taken at the end (and in frame 1), 1 the one taken by the WHAM, 2 the one that twitches. */
export const SLOTS: readonly (Slot & { readonly act: Act; readonly tone: number })[] = [
  { x: 800, ground: 1250, len: 225, face: 1, act: 'preen', tone: 0 },
  { x: 770, ground: 1128, len: 205, face: 1, act: 'bath', tone: 1 },
  { x: 600, ground: 1175, len: 215, face: -1, act: 'drink', tone: 2 },
  { x: 962, ground: 1200, len: 205, face: -1, act: 'bath', tone: 0 },
  { x: 640, ground: 1350, len: 235, face: 1, act: 'preen', tone: 1 },
];

/** Where each bird makes for when the flock flies. */
const FLIGHT: readonly Pt[] = [{ x: 950, y: 640 }, { x: 0, y: 0 }, { x: 250, y: 650 }, { x: 1050, y: 900 }, { x: 214, y: 830 }];

/** The twitching bird's lifted foot, in the world. */
export function footWorld(): Pt {
  const s = SLOTS[2]!;
  return { x: s.x + 15 * (s.len / 100) * s.face, y: s.ground - 22 };
}

/** The bird in the fish's mouth at loop time u, or -1. */
export function holdsAt(u: number): number {
  if (u < 2.8) return 0;
  if (u >= LUNGE_FROM + 0.3 && u < SLIDE_TO) return 1;
  if (u >= 21.95) return 0;
  return -1;
}

/** 0 .. 1: how scared the flock is, from a burst at `t0` (loop time). */
const panicAfter = (u: number, t0: number): number => {
  const age = u - t0;
  return age < 0 ? 0 : ramp(age, 0, 0.3) * (1 - ramp(age, 1.2, 2.1));
};
const panicAt = (u: number): number =>
  Math.max(panicAfter(u, LUNGE_FROM + 0.1), panicAfter(u, BURST_AT + 0.1), panicAfter(u + LOOP_S, BURST_AT + 0.1));

/** 0 .. 1: how far the flock has flown from the burst at the seam: up and away, back down after two seconds. */
const awayAfter = (u: number, t0: number): number => {
  const age = u - t0;
  return age < 0 ? 0 : ramp(age, 0, 0.6) * (1 - ramp(age, 1.6, 2.8));
};
/** From the WHAM the flock stays up until the fish has gone, then drops back to stand still. */
const awayLunge = (u: number): number => (u < LUNGE_FROM ? 0 : ramp(u, LUNGE_FROM + 0.1, LUNGE_FROM + 0.8) * (1 - ramp(u, SLIDE_TO - 0.2, TRICK_AT - 0.1)));
/** Bird 0 is taken by the burst and bird 1 by the lunge, so each flies off only at the other's. */
const awayAt = (u: number, id: number): number => {
  const lunge = id === 1 ? 0 : awayLunge(u);
  const burst = id < 2 ? 0 : Math.max(awayAfter(u, BURST_AT + 0.1), awayAfter(u + LOOP_S, BURST_AT + 0.1));
  // The whisker's snap scatters them, all but the one left alone with its nerves.
  const scatter = id < 2 ? 0 : ramp(u, MOVE_AT + 0.3, MOVE_AT + 0.9);
  return Math.max(lunge, burst, scatter);
};

export interface PigeonState {
  readonly pose: PigeonPose;
  readonly visible: boolean;
}

function washPose(act: Act, wash: number, flutter: number, u: number, phase: number): Pick<PigeonPose, 'bow' | 'preen' | 'bath'> & { readonly wings: number } {
  const dip = wash * (0.55 + 0.45 * Math.sin(cyc(u, 8) + phase));
  if (act === 'drink') return { bow: dip, preen: 0, bath: 0, wings: 0 };
  if (act === 'preen') return { bow: 0, preen: wash * (0.8 + 0.2 * Math.sin(cyc(u, 7) + phase)), bath: 0, wings: 0 };
  return { bow: 0.5 * dip * (1 - flutter), preen: 0, bath: wash, wings: wash * flutter * 0.8 };
}

/** One bird at loop time t: washing, still, twitching, or scared. */
export function pigeonAt(id: number, t: number): PigeonState {
  const u = wrap(t);
  const s = SLOTS[id]!;
  const k = s.len / 100;
  const phase = id * 1.7;
  const scare = panicAt(u);
  const away = awayAt(u, id);
  const wash = ramp(u, ALBI_AT, ALBI_AT + 0.5) * (1 - ramp(u, NERVOUS_FROM + 0.5, NERVOUS_FROM + 1)) * (1 - scare);
  const freeze = ramp(u, TRICK_AT - 0.1, TRICK_AT + 0.3) * (1 - ramp(u, MOVE_AT + 0.3, MOVE_AT + 0.5));
  const flutter = Math.max(0, Math.sin(cyc(u, 17) + phase)) ** 2;
  const hop = scare * (36 + 24 * Math.sin(cyc(u, 23) + phase)) * (id === 0 || id === 1 ? 0.8 : 1) * (1 - away);
  const bob = (1 - freeze) * (wash * 5 * Math.sin(cyc(u, 12) + phase) + (1 - wash) * 1.5 * Math.sin(cyc(u, 6) + phase));
  // The bird that senses the shape in the water turns its eye, then its head.
  const senses = id === 2 ? ramp(u, HUGE_AT, HUGE_AT + 0.3) * (1 - ramp(u, LUNGE_FROM, LUNGE_FROM + 0.3)) : 0;
  const eyes = freeze * 0.9 * Math.sin(cyc(u, 2 + (id % 3)) + phase);
  const nervousPigeon = id === 0 ? ramp(u, SO_AT, SO_AT + 0.4) * (1 - ramp(u, BURST_AT, BURST_AT + 0.2)) : 0;
  const shiver = nervousPigeon * 2.4 * Math.sin(cyc(u, 41));
  const foot = id === 2 ? twitch(u) : 0;
  const act = washPose(s.act, wash, flutter, u, phase);
  const home = { x: s.x + shiver * s.face, y: s.ground - PIGEON_FEET_Y * 0.5 * k - hop - bob };
  // The burst at the seam throws them right out of the close-up.
  const flee = id >= 2 && awayLunge(u) < 0.01 ? 1.6 : 1;
  const far = { x: s.x + (FLIGHT[id]!.x - s.x) * flee * flee, y: s.ground + (FLIGHT[id]!.y - s.ground) * flee };
  const drift = 26 * Math.sin(cyc(u, 8) + phase);
  const flying = clamp01(away * 2.5);
  const pose: PigeonPose = {
    x: lerp(home.x, far.x + drift, away),
    y: lerp(home.y, far.y - drift * 0.5, away) - 90 * Math.sin(Math.PI * away),
    len: s.len * (1 - 0.3 * away),
    face: s.face,
    wings: Math.max(scare, act.wings, flying),
    flap: cyc(u, 31) + phase,
    bow: act.bow,
    preen: act.preen,
    bath: act.bath,
    look: 1 - 2 * Math.max(senses, nervousPigeon * (0.75 + 0.25 * Math.sin(cyc(u, 4)))) + eyes * 0.6,
    foot,
    alarm: Math.max(scare, senses, nervousPigeon * 0.8, foot > 0.2 ? 0.8 : 0),
    dangle: flying,
    rot: -0.34 * flying,
    tone: s.tone,
  };
  return { pose, visible: visibleAt(id, u) };
}

/** The bird that is eaten is gone for the rest of the loop; the one in the mouth is drawn by the fish. */
function visibleAt(id: number, u: number): boolean {
  if (id === 1) return u >= 3.0 && u < LUNGE_FROM + 0.3;
  if (id === 0) return u >= 2.8 && u < 21.95;
  return true;
}

/** The foot twitches, a little at first, then sharply on MOVE. */
function twitch(u: number): number {
  const build = ramp(u, GRABS_AT - 0.2, MOVE_AT) * (1 - ramp(u, MOVE_AT + 0.3, MOVE_AT + 0.6));
  const jerk = Math.max(0, Math.sin(cyc(u, 31))) ** 3;
  return clamp01(build * (0.25 + 0.75 * jerk) + 0.6 * ramp(u, MOVE_AT - 0.1, MOVE_AT + 0.05) * (1 - ramp(u, MOVE_AT + 0.2, MOVE_AT + 0.4)));
}
