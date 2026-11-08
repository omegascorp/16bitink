import type { Pt } from '../../../src/art/pen';
import { clamp01, lerp, ramp } from '../short';
import { headOnPath } from './art/catfishSide';
import type { TopPose } from './art/catfishTop';
import { footWorld, holdsAt } from './flock';
import { cyc, GRABS_AT, LOOP_S, LUNGE_FROM, MOVE_AT, NERVOUS_FROM, SLIDE_FROM, SLIDE_TO, TRICK_AT, wrap } from './timing';

/** The catfish through the loop: side-on out of the water, gliding unseen along the channel, or curled in to the shore. */

/** Where the catfish is: a head placed in the world, whichever way it is drawn. */
export interface FishPose {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly rot: number;
  readonly face: 1 | -1;
  /** Tail-beat phase, radians. */
  readonly beat: number;
  /** side: how far it has slid back along its path into the river (the body's own units). */
  readonly back: number;
  /** side: the head's sway off the path, in frame 1's pixels. */
  readonly lead: Pt;
}

export const FISH_LEN = 960;
/** Where the mouth lies in the world in frame 1; the body's path hangs off this point. */
export const SIDE_ANCHOR: Pt = { x: 666, y: 1082 };
/** How far back along the path the fish has gone when it rises out of the river, and when it has left with its lunch. */
const BACK_DEEP = 620;
const BACK_GONE = 700;
const GAPE_HOOK = 0.56;

const STALK_FROM = TRICK_AT - 0.15;
const FAR_POSE: FishPose = { x: SIDE_ANCHOR.x, y: SIDE_ANCHOR.y, len: FISH_LEN, rot: 0, face: 1, beat: 0, back: 0, lead: { x: 0, y: 0 } };

export interface FishState {
  readonly mode: 'side' | 'top' | 'none';
  /** side: x, y the mouth's middle, len the size. top: mirrors `top`. */
  readonly pose: FishPose;
  readonly gape: number;
  /** Under the water: 0 clear .. 1 gone. */
  readonly sub: number;
  readonly whisker: number;
  readonly wag: number;
  /** The index of the pigeon in its mouth, or -1. */
  readonly holds: number;
  /** Seen from above: the bent body and where the long whiskers reach. */
  readonly top?: TopPose;
  readonly tips?: readonly [Pt, Pt];
  /** How far water is pouring off it, 0 .. 1. */
  readonly pour: number;
  /** How far the river has closed over the part of it in the water, 0 .. 1. */
  readonly drown: number;
  /** 0 .. 1: the wet furrow it leaves as it slides back. */
  readonly furrow: number;
}

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
const ease = (u: number): number => 1 - (1 - clamp01(u)) ** 3;

/** How far back along its path, how far off it, how turned, how far under, how wide it gapes. */
interface Track {
  readonly back: number;
  readonly lead: Pt;
  readonly rot: number;
  readonly sub: number;
  readonly gape: number;
  readonly pour: number;
  readonly drown?: number;
  readonly furrow?: number;
}

function hookTrack(t: number): Track {
  const wobble = Math.sin(cyc(t, 20));
  return { back: 0, lead: { x: 8 * wobble, y: 8 * Math.sin(cyc(t, 20) + 1) }, rot: 0.01 * wobble, sub: 0, gape: GAPE_HOOK + 0.09 * wobble, pour: 1 };
}

/** The lunge: up out of the channel and onto the gravel, then a shake with the bird. */
function lungeTrack(u: number): Track {
  const p = ease((u - LUNGE_FROM) / 0.4);
  const shake = ramp(u, 9.5, 9.8) * (1 - ramp(u, 11.6, 11.95));
  const side = Math.sin(cyc(u, 28));
  return {
    back: lerp(BACK_DEEP, 0, p),
    lead: { x: 56 * shake * side, y: 0 },
    rot: 0.05 * shake * side,
    sub: 0.9 * (1 - ramp(u, LUNGE_FROM, LUNGE_FROM + 0.2)),
    gape: lerp(0.3, 0.76, p) - 0.14 * ramp(u, 10.2, 10.8) + 0.07 * Math.sin(cyc(u, 14)) * ramp(u, 10, 10.6),
    pour: 1 - 0.5 * ramp(u, 10.4, 11.6),
  };
}

function slideTrack(u: number): Track {
  const end = lungeTrack(SLIDE_FROM);
  const p = clamp01((u - SLIDE_FROM) / (SLIDE_TO - SLIDE_FROM)) ** 0.95;
  return {
    back: lerp(0, BACK_GONE, p),
    // Off the gravel and out over the channel, so the river closes over all of it.
    lead: { x: 0, y: -340 * ramp(u, 13.0, 13.7) },
    rot: lerp(end.rot, 0, p) + 0.02 * Math.sin(cyc(u, 34)),
    sub: ramp(u, 13.35, 13.95),
    gape: lerp(end.gape, 0.42, clamp01((u - SLIDE_FROM) / 0.6)),
    pour: end.pour,
    drown: ramp(u, 13.2, 13.8),
    furrow: ramp(u, SLIDE_FROM, SLIDE_FROM + 0.5) * (1 - ramp(u, 13.9, 14.8)),
  };
}

function sideTrack(u: number): Track {
  if (u < 1.7) return hookTrack(u);
  if (u < 3.0) {
    // The fish backs off the gravel with its lunch and slips under.
    const p = ease((u - 1.7) / 1.3);
    const h = hookTrack(1.7);
    return { back: lerp(0, BACK_DEEP, p), lead: h.lead, rot: h.rot, sub: ramp(u, 2.1, 2.7), gape: lerp(h.gape, 0.15, p), pour: 1 - p };
  }
  if (u < SLIDE_FROM) return lungeTrack(u);
  if (u < LOOP_S * 0.7) return slideTrack(u);
  const p = ease((u - 21.65) / 0.72);
  const h = hookTrack(u);
  return { back: lerp(BACK_DEEP, 0, p), lead: h.lead, rot: h.rot, sub: 1 - ramp(u, 21.65, 21.95), gape: lerp(0.1, h.gape, ramp(u, 21.8, 22.3)), pour: ramp(u, 21.8, 22.2) };
}

const SIDE_OFF_AT = 3.0;
const isSide = (u: number): boolean => u < SIDE_OFF_AT || (u >= LUNGE_FROM && u < SLIDE_TO) || u >= 21.65;

function sideState(u: number, base: Pick<FishState, 'whisker' | 'wag'>, beat: number): FishState {
  const k = sideTrack(u);
  const head = headOnPath(SIDE_ANCHOR, k.back);
  const pose = { x: head.at.x + (k.lead.x * head.size) / 2.6, y: head.at.y + (k.lead.y * head.size) / 2.6, len: FISH_LEN * head.size, rot: head.rot + k.rot, face: 1 as const, beat, back: k.back, lead: k.lead };
  return { ...base, mode: k.sub > 0.995 ? 'none' : 'side', pose, gape: k.gape, sub: k.sub, holds: holdsAt(u), pour: k.pour, drown: k.drown ?? 0, furrow: k.furrow ?? 0 };
}

/** Gliding along the channel behind the island, nose first: "something huge sliding up behind them". */
function creepState(u: number, base: Pick<FishState, 'whisker' | 'wag'>, beat: number): FishState {
  const x = lerp(-40, 700, clamp01((u - NERVOUS_FROM) / 2.9));
  const top: TopPose = { x, y: 880 + 8 * Math.sin(cyc(u, 3)), len: 900, heading: 0.02, curl: 0.16 * Math.sin(cyc(u, 4)), beat };
  const wriggle = 26 * Math.sin(cyc(u, 9));
  const tips: readonly [Pt, Pt] = [{ x: x + 240, y: top.y - 74 + wriggle }, { x: x + 250, y: top.y + 78 - wriggle }];
  return { ...base, mode: 'top', pose: { ...FAR_POSE, x, y: top.y, beat }, gape: 0, sub: 0, holds: -1, top, tips, pour: 0, drown: 0, furrow: 0 };
}

/** Curled in to the shore among the statues, whiskers feeling past their feet; then snapping at the foot, then gone. */
function stalkState(u: number, base: Pick<FishState, 'whisker' | 'wag'>, beat: number): FishState {
  const near = ease((u - STALK_FROM) / 1.1);
  const snap = ease((u - MOVE_AT + 0.05) / 0.12) * (1 - ramp(u, MOVE_AT + 0.35, MOVE_AT + 0.75));
  const away = ramp(u, MOVE_AT + 0.4, MOVE_AT + 1.0);
  const reach = 1 - away;
  const nose = lerpPt(lerpPt({ x: 200, y: 870 }, { x: 560, y: 1000 }, near * reach), { x: 575, y: 1012 }, snap);
  const top: TopPose = { x: nose.x, y: nose.y, len: 900, heading: lerp(0.05, 1.0, near * reach), curl: lerp(0, -1.0, near * reach), beat };
  const sweep = Math.sin(cyc(u, 4));
  const foot = footWorld();
  const a0 = { x: 440 + 44 * sweep, y: lerp(900, 1290, near * reach) };
  const b0 = { x: 800 - 46 * sweep, y: lerp(920, 1190, near * reach) };
  const ready = ramp(u, GRABS_AT - 0.4, GRABS_AT);
  const a1 = lerpPt(a0, { x: foot.x + 74, y: foot.y + 34 }, ready);
  // With the head turned to the south its first whisker is the one on the screen's right.
  const tips: readonly [Pt, Pt] = [lerpPt(b0, { x: foot.x + 170, y: foot.y + 30 }, snap), lerpPt(a1, { x: foot.x + 4, y: foot.y + 4 }, snap)];
  return { ...base, mode: away > 0.99 ? 'none' : 'top', pose: { ...FAR_POSE, x: nose.x, y: nose.y, beat }, gape: 0, sub: away, holds: -1, top, tips, pour: 0, drown: 0, furrow: 0 };
}

export function fishAt(t: number): FishState {
  const u = wrap(t);
  const beat = cyc(u, 9) + 1.3;
  const base = { whisker: Math.sin(cyc(u, 6)), wag: 1.5 };
  if (isSide(u)) return sideState(u, base, beat);
  if (u >= NERVOUS_FROM && u < LUNGE_FROM) return creepState(u, base, beat);
  if (u >= STALK_FROM && u < MOVE_AT + 1.05) return stalkState(u, base, beat);
  return { ...base, mode: 'none', pose: { ...FAR_POSE, beat }, gape: 0, sub: 1, holds: -1, pour: 0, drown: 0, furrow: 0 };
}


/** The shadow's opacity while it is seen from above. */
export function shadowAlpha(t: number): number {
  const u = wrap(t);
  const creep = ramp(u, NERVOUS_FROM + 0.1, NERVOUS_FROM + 0.7) * (1 - ramp(u, LUNGE_FROM - 0.08, LUNGE_FROM));
  const stalk = ramp(u, STALK_FROM, STALK_FROM + 0.5) * (1 - ramp(u, MOVE_AT + 0.4, MOVE_AT + 1));
  return Math.max(creep, stalk);
}
