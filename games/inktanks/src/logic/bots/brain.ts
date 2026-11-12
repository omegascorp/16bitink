import { insideCircle } from '../storm';
import { wantsSwap } from '../loot';
import type { Match } from '../match/match';
import { objectiveHint, type Hint } from '../match/objective';
import { CLAN_TASTE } from '../match/names';
import type { Tank } from '../match/types';
import { nearestPassable } from '../nav/grid';
import type { Rng } from '../rng';
import type { Pt } from '../vec';
import { canSee, enemies, heard, losClear, odds } from './perception';
import type { Difficulty, Personality } from './personality';

/**
 * A bot's mind. States: loot → rotate → fight → flee and repair, plus a
 * mission goal when the level gives one. It decides every `reaction`
 * seconds; between decisions `control` turns the decision into inputs.
 */
export type BotState = 'loot' | 'rotate' | 'fight' | 'flee' | 'goal' | 'wander' | 'sit';

export interface Brain {
  readonly tankId: number;
  readonly pers: Personality;
  readonly diff: Difficulty;
  readonly rng: Rng;
  state: BotState;
  target: number | null;
  goal: Pt | null;
  goalPickup: number | null;
  shootAt: { x: number; y: number; id: string } | null;
  los: boolean;
  thinkT: number;
  aimNoise: number;
  strafe: 1 | -1;
  strafeT: number;
  lastPos: Pt;
  stuckT: number;
  detourT: number;
  detourAngle: number;
  sitT: number;
  /** Where a defender or wave bot heads (a raid target, a hold zone). */
  home: Pt | null;
  wantSwap: boolean;
  useKit: boolean;
  hint: Hint | null;
  /** The target as seen at the last decision: aim works from this, so it lags a strafing target. */
  snap: { x: number; y: number; vx: number; vy: number; t: number } | null;
}

export function createBrain(t: Tank, pers: Personality, diff: Difficulty, rng: Rng): Brain {
  return {
    tankId: t.id, pers, diff, rng, state: 'wander', target: null, goal: null, goalPickup: null, shootAt: null, los: false,
    thinkT: rng.range(0, diff.reaction), aimNoise: 0, strafe: rng.chance(0.5) ? 1 : -1, strafeT: 0,
    lastPos: { x: t.x, y: t.y }, stuckT: 0, detourT: 0, detourAngle: 0, sitT: 0, home: null, wantSwap: false, useKit: false, hint: null, snap: null,
  };
}

function gauss(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 1.15;
}

function pickTarget(m: Match, b: Brain, t: Tank, seen: Tank[]): Tank | null {
  if (b.hint?.target != null) {
    const pri = m.tank(b.hint.target);
    if (pri?.alive && seen.includes(pri)) return pri;
  }
  let best: Tank | null = null;
  let bestScore = -Infinity;
  for (const o of seen) {
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    let s = odds(t, o) * 2 - d / 250;
    if (b.diff.focus) s += (1 - o.hp / o.stats.maxHp) * 2;
    if (o.id === t.lastHitBy && m.t - t.lastHitAt < 4) s += 2;
    if (o.role === 'truck') s += 3;
    if (o.id === b.target) s += 1;
    if (s > bestScore) {
      bestScore = s;
      best = o;
    }
  }
  return best;
}

function lootPick(m: Match, b: Brain, t: Tank): { id: number; x: number; y: number } | null {
  const range = b.pers.lootRange;
  const storm = m.stormNow;
  let best: { id: number; x: number; y: number } | null = null;
  let bestScore = 0;
  for (const p of m.pickups) {
    if (p.taken) continue;
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d > range * (p.kind === 'part' && p.supply ? 1.6 : 1)) continue;
    if (storm.dps > 0 && !insideCircle(storm.circle, p.x, p.y)) continue;
    let v = 0;
    if (p.kind === 'crate') v = 6;
    else if (p.kind === 'kit') v = t.kits < t.maxKits ? 7 : 0;
    else if (p.kind === 'intel') v = t.team === 0 ? 6 + Object.values(p.bag).reduce((s: number, n) => s + (n ?? 0), 0) : 0;
    else if (p.kind === 'part') v = wantsSwap(t.loadout, p.part, t.lastHitDrive, CLAN_TASTE[t.clan]) ? p.part.mk * 5 + (p.supply ? 15 * b.diff.greed : 0) : 0;
    v *= b.pers.lootBias;
    const score = v / (1 + d / 220);
    if (score > bestScore) {
      bestScore = score;
      best = { id: p.id, x: p.x, y: p.y };
    }
  }
  return best;
}

function intoCircle(m: Match, t: Tank): Pt {
  const c = m.stormNow.next;
  const dx = t.x - c.x;
  const dy = t.y - c.y;
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(d, c.r * 0.5) / d;
  const p = { x: c.x + dx * k, y: c.y + dy * k };
  return nearestPassable(m.nav, p.x, p.y, 16) ?? p;
}

function wanderPoint(m: Match, b: Brain): Pt {
  const c = m.stormNow.next;
  const a = b.rng.range(0, Math.PI * 2);
  const d = Math.sqrt(b.rng.next()) * c.r * 0.7;
  return nearestPassable(m.nav, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 16) ?? { x: c.x, y: c.y };
}

export function think(m: Match, b: Brain, t: Tank): void {
  const storm = m.stormNow;
  const foes = enemies(m, t);
  const seen = foes.filter((o) => canSee(m, t, o));
  const nearest = seen.reduce((d, o) => Math.min(d, Math.hypot(o.x - t.x, o.y - t.y)), Infinity);
  b.hint = objectiveHint(m, t);
  b.shootAt = b.hint?.shootAt ?? null;
  b.useKit = t.kits > 0 && t.repairT <= 0 && (t.hp < t.stats.maxHp * 0.25 || (t.hp < t.stats.maxHp * 0.5 && nearest > 300));
  b.aimNoise = gauss(b.rng) * b.diff.aimError;
  const target = pickTarget(m, b, t, seen);
  b.target = target?.id ?? null;
  b.snap = target ? { x: target.x, y: target.y, vx: Math.cos(target.heading) * target.speed, vy: Math.sin(target.heading) * target.speed, t: m.t } : null;
  b.los = target ? losClear(m, t.x, t.y, target.x, target.y) : b.shootAt ? losClear(m, t.x, t.y, b.shootAt.x, b.shootAt.y, b.shootAt.id) : false;
  b.wantSwap = false;
  const hp = t.hp / t.stats.maxHp;
  const outside = storm.dps > 0 && !insideCircle(storm.circle, t.x, t.y);
  const outsideNext = !insideCircle({ ...storm.next, r: storm.next.r * 0.85 }, t.x, t.y);
  const winnable = target ? odds(t, target) : 0;
  const attacked = m.t - t.lastHitAt < 3;
  // The storm outranks everything but a close, winnable fight.
  if (outside && !(target && winnable > 1.5 && nearest < 200)) return set(b, 'rotate', intoCircle(m, t));
  if (target && hp < b.pers.fleeHp && winnable < 1.2 && t.role === 'tank') return set(b, 'flee', null);
  const priority = target && b.hint?.target === target.id;
  // The opening is for looting: nobody starts a fight, but one that comes to you is fought or fled.
  // An attacked bot that can't win breaks off then; later it fights back.
  const calm = m.t < m.calmUntil;
  if (target && calm && attacked && winnable < 0.8 && !priority && t.role === 'tank') return set(b, 'flee', null);
  if (target && ((!calm && winnable >= b.pers.engage) || attacked || priority)) return set(b, 'fight', null);
  if (b.hint?.goal) return set(b, 'goal', b.hint.goal);
  if (outsideNext && (storm.shrinking || storm.timer < b.pers.rotateLead)) return set(b, 'rotate', intoCircle(m, t));
  const loot = lootPick(m, b, t);
  if (loot) {
    b.goalPickup = loot.id;
    b.wantSwap = Math.hypot(loot.x - t.x, loot.y - t.y) < t.stats.radius + 14;
    return set(b, 'loot', loot);
  }
  if (b.home) return set(b, 'goal', b.home);
  if (b.pers.roams) {
    const loud = foes.find((o) => heard(m, t, o));
    if (loud) return set(b, 'wander', { x: loud.x, y: loud.y });
  }
  if (b.pers.sits && !outsideNext) {
    b.sitT += b.diff.reaction;
    if (b.sitT < 10) return set(b, 'sit', null);
    b.sitT = -5;
  }
  const reached = b.goal && Math.hypot(b.goal.x - t.x, b.goal.y - t.y) < 60;
  set(b, 'wander', b.state === 'wander' && b.goal && !reached ? b.goal : wanderPoint(m, b));
}

function set(b: Brain, state: BotState, goal: Pt | null): void {
  b.state = state;
  b.goal = goal;
  if (state !== 'loot') b.goalPickup = null;
}
