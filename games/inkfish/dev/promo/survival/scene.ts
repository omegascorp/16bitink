import { C, heightAt, xAt } from '../../../src/art/fish/kit';
import { INK, PAPER } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { lerp, smooth } from '../short';
import { drawSwimmer, pointOn, type SwimLook } from '../swallowed/swimmer';
import { BOWL, LOG, PHASES, phaseAt, slotOf, type Phase, type Slot } from './layout';
import { shapeOf, spriteOf, type FishId } from './species';
import { tempF } from './props';
import { T } from './timeline';
import { leaveOf, outOf } from './verdicts';

/**
 * Every contestant in the tank as a function of time: where it waits, how it
 * glides to its next place, its little acts (the cod wobbling, the icefish on
 * its side, the eel trembling), how it swims off when it's OUT, and its face:
 * eyes wide, squeezed shut, happily curved, or darting; a sweat drop in the heat.
 */

export type Expr = 'wide' | 'squeeze' | 'happy' | 'dart' | null;

export interface FishState {
  readonly id: FishId;
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly effort: number;
  readonly alpha: number;
  readonly expr: Expr;
  readonly sweat: number;
  /** Drawn outside the tank's glass (the goldfish on its way to its bowl). */
  readonly free?: boolean;
  /** Jaw opening, 0 shut .. 1 wide (the thumbnails' shark). */
  readonly jaw?: number;
}

type Window = readonly [number, number, Expr];

const SURVIVORS: readonly FishId[] = ['cod', 'salmon', 'icefish', 'eel', 'goldfish', 'pupfish', 'mudskipper', 'rivulus'];
const SHARED: readonly Window[] = [
  [T.some - 1.4, T.some, 'wide'],
  [T.gwOut - 0.1, T.gwOut + 1.4, 'wide'],
  [T.everyone + 0.4, T.eight + 0.8, 'dart'],
];

const FACES: Readonly<Partial<Record<FishId, readonly Window[]>>> = {
  white: [[T.gw + 0.5, T.gwOut, 'wide'], [T.gwOut, T.gwOut + 6, 'squeeze']],
  mako: [[T.mako, T.makoOut, 'wide'], [T.makoOut, T.makoOut + 4, 'squeeze']],
  cod: [[T.f72, T.codOut, 'wide'], [T.codOut, T.codOut + 5, 'squeeze']],
  icefish: [[T.gone - 0.3, T.f79, 'squeeze']],
  salmon: [[T.f79, T.salmonOut, 'wide'], [T.salmonOut, T.salmonOut + 4, 'squeeze']],
  eel: [
    [T.f99, T.scrapes, 'squeeze'], [T.scrapes, T.scrapes + 2.4, 'happy'], [T.allowed, T.allowed + 2.5, 'happy'],
    [T.wholeDay, T.eelOut, 'wide'], [T.eelOut, T.eelOut + 4, 'squeeze'],
  ],
  goldfish: [
    [T.goldfish2, T.five2 + 0.6, 'happy'], [T.goldfish3, T.eightHours, 'wide'], [T.eightHours, T.gfOut + 0.6, 'squeeze'],
    [T.gfOut + 2.2, 1e9, 'happy'],
  ],
  pupfish: [[T.pet, T.pet + 2, 'happy'], [T.pupSea, T.pupSea + 2.5, 'happy'], [T.pupfish4, T.pupOut, 'wide'], [T.pupOut, T.pupOut + 4, 'squeeze']],
  rivulus: [
    [T.pet + 0.5, T.pet + 2.3, 'happy'], [T.rivFine, T.rivFine + 2.5, 'happy'], [T.tiny, T.days66, 'wide'], [T.days66, T.two + 1.5, 'happy'],
    [T.threeTimes - 2.2, T.threeTimes, 'happy'], [T.noProblem, T.noProblem + 2.5, 'happy'], [T.winner, 1e9, 'happy'],
  ],
  mudskipper: [
    [T.pet + 1, T.pet + 3, 'happy'], [T.mudFine, T.mudFine + 2.5, 'happy'], [T.cousin - 0.4, T.cousin + 0.6, 'wide'],
    [T.mudBrineFine, T.mudBrineFine + 2, 'happy'], [T.mudFresh, T.halfDead, 'wide'], [T.halfDead, T.mudOut + 4, 'squeeze'],
  ],
  giantMudskipper: [[T.mudFine4, T.mudFine4 + 3, 'happy']],
};

function exprOf(id: FishId, t: number): Expr {
  const own = FACES[id] ?? [];
  const hit = (ws: readonly Window[]): Expr | undefined => [...ws].reverse().find(([a, b]) => t >= a && t < b)?.[2];
  return hit(own) ?? (SURVIVORS.includes(id) ? hit(SHARED) : undefined) ?? null;
}

const PHASE_GLIDE_S = 1.4;
const ph = (id: FishId): number => (id.length * 1.7 + id.charCodeAt(0) * 0.31) % 6.28;

/** The slot a fish glides to at t, blended from the last layout's while the glide lasts. */
function placeOf(id: FishId, t: number): Slot | undefined {
  const phase = phaseAt(t);
  const now = slotOf(id, phase);
  if (!now) return undefined;
  if (phase === 'final' || phase === 'podium') return now;
  const k = PHASES.findIndex((p) => p.phase === phase);
  const prev = k > 0 ? slotOf(id, PHASES[k - 1]!.phase as Phase) : undefined;
  const u = smooth((t - PHASES[k]!.at) / PHASE_GLIDE_S);
  if (!prev || u >= 1) return now;
  return { x: lerp(prev.x, now.x, u), y: lerp(prev.y, now.y, u), len: lerp(prev.len, now.len, u), facing: u < 0.5 ? prev.facing : now.facing };
}

interface Body { x: number; y: number; len: number; facing: 1 | -1; tilt: number; effort: number; alpha: number; free?: boolean }

/** How still everyone hangs: round 1 is "stop swimming", round 4 lies on the mud. */
function stillness(t: number): number {
  if (t >= T.stop + 0.5 && t < T.round2 - 3) return 0.85;
  if (phaseAt(t) === 'dry') return 0.8;
  return 0;
}

/** Each fish's little act on top of its slot. */
function act(id: FishId, t: number, b: Body): Body {
  switch (id) {
    case 'white': {
      const u = smooth((t - T.andThen) / 2.2);
      return { ...b, x: lerp(b.x, 940, u), y: lerp(b.y, 520, u), effort: b.effort * (1 - u) };
    }
    case 'cod': {
      const wob = smooth((t - T.f72) / 0.8) * (1 - smooth((t - T.codOut + 0.5) / 0.3));
      const tip = smooth((t - T.codOut + 0.6) / 0.5);
      return { ...b, tilt: 0.18 * wob * Math.sin(t * 7) + 0.6 * tip, y: b.y + 40 * tip };
    }
    case 'icefish': {
      const side = smooth((t - T.gone + 0.4) / 0.4);
      return { ...b, tilt: -0.3 * side, y: lerp(b.y, 860, side), alpha: 1 - 0.35 * side, effort: b.effort * (1 - side) };
    }
    case 'salmon': {
      const wob = smooth((t - T.f79) / 0.6);
      return { ...b, tilt: 0.16 * wob * Math.sin(t * 6.5) };
    }
    case 'eel': {
      const shake = t >= T.f99 && t < T.scrapes ? 1 : 0;
      if (phaseAt(t) === 'dry') {
        const go = smooth((t - T.eelSlither) / (T.wholeDay - T.eelSlither));
        const moving = t > T.eelSlither && t < T.wholeDay ? 1 : 0;
        return { ...b, x: lerp(880, b.x, go), effort: 0.2 + 0.8 * moving };
      }
      return { ...b, x: b.x + shake * Math.sin(t * 55) * 3, y: b.y + shake * Math.cos(t * 47) * 2 };
    }
    case 'goldfish': {
      if (t >= T.goldfish2 && t < T.five2) return { ...b, effort: 0.9 };
      if (t < T.gfOut + 0.6) return b;
      // Into its bowl on the stage, shrinking to fit, then pottering about in it.
      const u = smooth((t - T.gfOut - 0.6) / 1.6);
      const arc = Math.sin(Math.PI * u) * 160;
      const home = { x: BOWL.x + Math.sin(t * 0.9) * 26, y: BOWL.y + 8 + Math.sin(t * 1.7) * 8 };
      return { ...b, x: lerp(b.x, home.x, u), y: lerp(b.y, home.y, u) - arc, len: lerp(b.len, 70, u), facing: u > 0.1 ? -1 : b.facing, free: u > 0.02 };
    }
    case 'mudskipper': {
      if (phaseAt(t) !== 'dry') return b;
      // It hops off right when its big cousin is sent in.
      const u = t - T.cousin - 0.3;
      if (u <= 0) return b;
      return { ...b, x: b.x + u * 520, y: b.y - Math.abs(Math.sin(u * 7)) * 40, facing: 1, effort: 0.6 };
    }
    case 'giantMudskipper': {
      // Hops in from the right onto the log.
      const u = smooth((t - T.giant + 0.6) / 1.3);
      return { ...b, x: lerp(1900, b.x, u), y: b.y - Math.abs(Math.sin(u * Math.PI * 2)) * 70 * (1 - u), alpha: t < T.giant - 0.6 ? 0 : 1 };
    }
    case 'rivulus': {
      if (phaseAt(t) !== 'dry') return b;
      // It slips away as the water goes, and is found later inside the log.
      const hide = smooth((t - T.drain - 0.4) / 1.2);
      const show = smooth((t - T.tiny + 0.4) / 0.6);
      return { ...b, alpha: Math.max(1 - hide, show), effort: 0.1 };
    }
    default:
      return b;
  }
}

/** Swimming off left after an OUT: turning, then speeding away (the tank's glass clips it). */
function exitOf(b: Body, u: number): Body {
  return { ...b, facing: -1, x: b.x - 220 * u - 700 * u * u, effort: 0.9, tilt: 0 };
}

function bodyAt(id: FishId, t: number): Body | null {
  const slot = placeOf(id, t);
  if (!slot) return null;
  const still = stillness(t);
  const p = ph(id);
  const drift = 1 - still;
  const base: Body = {
    x: slot.x + Math.sin(t * 0.37 + p) * 18 * drift,
    y: slot.y + Math.sin(t * 0.83 + p) * 7 * (1 - 0.6 * still),
    len: slot.len, facing: slot.facing, tilt: 0, effort: 0.45 * drift + 0.05, alpha: 1,
  };
  return act(id, t, base);
}

export function fishAt(id: FishId, t: number): FishState | null {
  const v = outOf(id);
  const gone = v && v.fish !== 'goldfish' ? leaveOf(v) : Infinity;
  let b: Body | null;
  if (t >= gone) {
    const u = t - gone;
    if (u > 3.5) return null;
    const from = bodyAt(id, gone);
    if (!from) return null;
    b = exitOf(from, u);
  } else b = bodyAt(id, t);
  if (!b || b.alpha <= 0) return null;
  const hot = Math.max(0, Math.min(1, (tempF(t) - 68) / 20));
  return { id, ...b, expr: exprOf(id, t), sweat: hot };
}

/** Where a fish was at t (for stamps that stay where the verdict landed). */
export const spotOf = (id: FishId, t: number): { readonly x: number; readonly y: number; readonly len: number } | null => {
  const b = bodyAt(id, t);
  return b ? { x: b.x, y: b.y, len: b.len } : null;
};

export const poseOf = (s: FishState, t: number): Pose => ({
  j: 0, age: 0, shape: shapeOf(s.id), x: s.x, y: s.y, length: s.len, facing: s.facing, tilt: s.tilt,
  beat: t * (4 + 6 * s.effort) + ph(s.id), effort: s.effort,
});

/** The eye's centre on screen and its radius, from the drawing's anatomy (so it follows whatever art lands). */
function eyeOf(s: FishState, pose: Pose, look: SwimLook): { readonly x: number; readonly y: number; readonly r: number } {
  const sprite = spriteOf(s.id);
  const a = sprite.anatomy;
  const at = pointOn(sprite, pose, look, { x: xAt(a, a.eye.t), y: C - heightAt(a, a.eye.t) * 0.3 });
  return { ...at, r: Math.max(3.5, a.eye.r * 1.15 * (s.len / (2 * a.hl))) };
}

/** Eyes popped wide (or darting about): a big white with a small pupil. */
function drawWideEye(ctx: CanvasRenderingContext2D, eye: { x: number; y: number; r: number }, facing: 1 | -1, t: number, dart: boolean): void {
  const R = Math.max(8, eye.r * 1.75);
  const look = dart ? Math.sin(t * 3.1) * 0.45 + Math.sin(t * 7.3) * 0.2 : 0.25 * facing;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.6, R * 0.16);
  ctx.beginPath();
  ctx.arc(eye.x, eye.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(eye.x + look * R * 0.5, eye.y - R * 0.05, R * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(eye.x + look * R * 0.5 - R * 0.14, eye.y - R * 0.2, R * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A sweat drop sliding down off the top of the head, over and over (placed by the body, so turret-eyed fish get one too). */
function drawSweat(ctx: CanvasRenderingContext2D, s: FishState, pose: Pose, look: SwimLook, t: number): void {
  const sprite = spriteOf(s.id);
  const a = sprite.anatomy;
  const k = s.len / (2 * a.hl);
  const head = pointOn(sprite, pose, look, { x: xAt(a, 0.18), y: C - heightAt(a, 0.18) * 1.05 });
  const size = Math.max(15, a.hh * 0.42 * k) * (0.6 + 0.4 * s.sweat);
  const cycle = (t * 0.75 + ph(s.id)) % 1;
  const x = head.x;
  const y = head.y - size * 1.3 + cycle * s.len * 0.1;
  ctx.save();
  ctx.globalAlpha = s.sweat * (1 - smooth((cycle - 0.7) / 0.3)) * s.alpha;
  ctx.fillStyle = '#8fdcff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.75, y + size * 0.1, x, y + size * 0.6);
  ctx.quadraticCurveTo(x - size * 0.75, y + size * 0.1, x, y - size);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A fish with its face on. */
export function drawFishState(ctx: CanvasRenderingContext2D, s: FishState, t: number, boil: number): void {
  const pose = poseOf(s, t);
  const closed = s.expr === 'squeeze' || s.expr === 'happy' ? s.expr : null;
  const look: SwimLook = { alpha: s.alpha, eyes: closed, jaw: s.jaw ?? 0 };
  drawSwimmer(ctx, spriteOf(s.id), pose, boil, look);
  // A drawing whose eyes aren't the engine's (the mudskippers' turrets) keeps its own eyes.
  const own = spriteOf(s.id).anatomy.eye;
  if ((s.expr === 'wide' || s.expr === 'dart') && !own.buried && own.r > 0) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    drawWideEye(ctx, eyeOf(s, pose, look), s.facing, t, s.expr === 'dart');
    ctx.restore();
  }
  if (s.sweat > 0) drawSweat(ctx, s, pose, look, t);
}

/** Any fish posed by hand (the line-up, the cut-ins, the thumbnails), with an optional face. */
export function drawPosed(
  ctx: CanvasRenderingContext2D, id: FishId, x: number, y: number, len: number, facing: 1 | -1, t: number, boil: number,
  more: { readonly tilt?: number; readonly effort?: number; readonly expr?: Expr; readonly alpha?: number; readonly jaw?: number } = {},
): void {
  const s: FishState = { id, x, y, len, facing, tilt: more.tilt ?? 0, effort: more.effort ?? 0.4, alpha: more.alpha ?? 1, expr: more.expr ?? null, sweat: 0, jaw: more.jaw };
  drawFishState(ctx, s, t, boil);
}

export { LOG };
