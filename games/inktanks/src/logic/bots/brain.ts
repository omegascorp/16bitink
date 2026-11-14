import type { ResolvedEnemy } from '../level/load';
import type { BotRole } from '../level/types';
import { wantsSwap } from '../loot';
import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import type { Hint } from '../objectives/types';
import type { Rng } from '../rng';
import type { Pt } from '../vec';
import { raiseAlarm, RAISES_ALARM } from './alarm';
import { GUARD_LEASH, ROLE_SIGHT, SHOOT_BACK, type Difficulty } from './difficulty';
import { canSee, enemies, losClear, odds, VISION } from './perception';

/**
 * A bot's mind. Its role (set by the level) decides what it does when
 * there's no fight: a guard sits at its post, a patrol drives its route, a
 * wave or hunter heads for the objective or you, a convoy or runner makes
 * for its exit. Fighting, kiting and backing off to repair are shared. It
 * decides every `reaction` seconds; `control` turns that into inputs.
 */
export type BotState = 'idle' | 'route' | 'goal' | 'fight' | 'flee' | 'loot';

export interface Brain {
  readonly tankId: number;
  /** 'player': the sim's stand-in in the player's seat. */
  readonly role: BotRole | 'player';
  readonly diff: Difficulty;
  readonly rng: Rng;
  readonly post: Pt;
  readonly leash: number;
  readonly sight: number;
  readonly route: readonly Pt[] | null;
  routeI: number;
  routeDir: 1 | -1;
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
  /** Holding fire this decision (Difficulty.hesitate). */
  holdFire: boolean;
  /** Enemies in sight at the last decision. */
  seenCount: number;
  /** Called by the alarm: where to look, until when. */
  alert: { x: number; y: number; until: number } | null;
  wantSwap: boolean;
  useKit: boolean;
  hint: Hint | null;
  /** The target as seen at the last decision: aim works from this, so it lags a strafing target. */
  snap: { x: number; y: number; vx: number; vy: number; t: number } | null;
}

export function createBrain(t: Tank, e: ResolvedEnemy | null, diff: Difficulty, rng: Rng, route: readonly Pt[] | null = null): Brain {
  const role = e?.role ?? 'player';
  return {
    tankId: t.id, role, diff, rng, post: { x: t.x, y: t.y }, leash: e?.leash ?? GUARD_LEASH,
    sight: e?.sight ?? (role === 'player' ? VISION : ROLE_SIGHT[role]), route, routeI: 1, routeDir: 1,
    state: 'idle', target: null, goal: null, goalPickup: null, shootAt: null, los: false,
    thinkT: rng.range(0, diff.reaction), aimNoise: 0, strafe: rng.chance(0.5) ? 1 : -1, strafeT: 0,
    lastPos: { x: t.x, y: t.y }, stuckT: 0, detourT: 0, detourAngle: 0, holdFire: false, seenCount: 0, alert: null, wantSwap: false, useKit: false, hint: null, snap: null,
  };
}

function gauss(rng: Rng): number {
  return (rng.next() + rng.next() + rng.next() - 1.5) * 1.15;
}

function pickTarget(m: Match, b: Brain, t: Tank, seen: readonly Tank[]): Tank | null {
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

/** The player stand-in's loot: crates, kits, intel and better parts close by. */
function lootPick(m: Match, t: Tank, range: number): { id: number; x: number; y: number } | null {
  let best: { id: number; x: number; y: number } | null = null;
  let bestScore = 0;
  for (const p of m.pickups) {
    if (p.taken) continue;
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d > range) continue;
    let v = 0;
    if (p.kind === 'crate') v = 6;
    else if (p.kind === 'kit') v = t.kits < t.maxKits ? 7 : 0;
    else if (p.kind === 'intel') v = 6 + Object.values(p.bag).reduce((s: number, n) => s + (n ?? 0), 0);
    else if (p.kind === 'part') v = wantsSwap(t.loadout, p.part, t.lastHitDrive) ? p.part.mk * 5 : 0;
    const score = v / (1 + d / 220);
    if (score > bestScore) {
      bestScore = score;
      best = { id: p.id, x: p.x, y: p.y };
    }
  }
  return best;
}

const LOOT_RANGE = 420;

export function think(m: Match, b: Brain, t: Tank): void {
  const attacked = m.t - t.lastHitAt < 3;
  const alerted = b.alert !== null && m.t < b.alert.until;
  const range = alerted || attacked || b.state === 'fight' ? VISION : b.sight;
  // Enemies don't aim at freed crews (they're hit by misses and splash); only the player shoots boss turrets.
  const seen = enemies(m, t).filter((o) => (o.role !== 'bossTurret' || b.role === 'player') && o.role !== 'crew').filter((o) => canSee(m, t, o, range));
  b.hint = b.role === 'player' ? m.objective.playerHint(t) : b.role === 'wave' || b.role === 'hunter' ? m.objective.foeHint(t) : null;
  b.shootAt = b.hint?.shootAt ?? null;
  const nearest = seen.reduce((d, o) => Math.min(d, Math.hypot(o.x - t.x, o.y - t.y)), Infinity);
  b.useKit = t.kits > 0 && t.repairT <= 0 && (t.hp < t.stats.maxHp * 0.25 || (t.hp < t.stats.maxHp * 0.5 && nearest > 300));
  b.aimNoise = gauss(b.rng) * b.diff.aimError;
  b.holdFire = b.rng.chance(b.diff.hesitate);
  b.seenCount = seen.filter((o) => o.role === 'tank').length;
  b.wantSwap = false;
  const shootsBack = b.role === 'convoy' || b.role === 'runner';
  const target = shootsBack && m.t - t.lastHitAt > SHOOT_BACK ? null : pickTarget(m, b, t, seen);
  b.target = target?.id ?? null;
  b.snap = target ? { x: target.x, y: target.y, vx: Math.cos(target.heading) * target.speed, vy: Math.sin(target.heading) * target.speed, t: m.t } : null;
  b.los = target ? losClear(m, t.x, t.y, target.x, target.y) : b.shootAt ? losClear(m, t.x, t.y, b.shootAt.x, b.shootAt.y, b.shootAt.id) : false;
  if (RAISES_ALARM.has(b.role)) {
    const spotted = seen.find((o) => o.team === 0);
    const hitBy = attacked && t.lastHitBy !== null ? m.tank(t.lastHitBy) : null;
    if (spotted) raiseAlarm(m, t, spotted);
    else if (hitBy && hitBy.team === 0) raiseAlarm(m, t, hitBy);
  }
  const winnable = target ? odds(t, target) : 0;
  const flees = t.role === 'tank' && b.role !== 'turret' && !shootsBack;
  // Back off to repair when losing, if there's a kit to use (running with none just loses the fight).
  const canRepair = t.kits > 0 || t.repairT > 0;
  if (target && flees && canRepair && t.hp < t.stats.maxHp * b.diff.fleeHp && winnable < 1.2) return set(b, 'flee', null);
  if (b.role === 'player') return thinkPlayer(m, b, t, target, winnable, attacked);
  thinkRole(m, b, t, target, alerted);
}

function thinkRole(m: Match, b: Brain, t: Tank, target: Tank | null, alerted: boolean): void {
  const alertAt = alerted ? b.alert : null;
  switch (b.role) {
    case 'turret':
      return set(b, target ? 'fight' : 'idle', null);
    case 'convoy':
    case 'runner':
      return set(b, 'route', null);
    case 'guard': {
      const home = alertAt ?? b.post;
      // A guard fights near home; past its leash it gives up and goes back.
      b.hint = { goal: home, goalRadius: b.leash / 1.6, stay: true };
      if (target) return set(b, 'fight', null);
      const far = Math.hypot(home.x - t.x, home.y - t.y) > (alertAt ? 80 : 50);
      return far ? set(b, 'goal', home) : set(b, 'idle', null);
    }
    case 'patrol':
      if (target) return set(b, 'fight', null);
      if (alertAt && Math.hypot(alertAt.x - t.x, alertAt.y - t.y) > 80) return set(b, 'goal', alertAt);
      return set(b, 'route', null);
    case 'wave':
    case 'hunter': {
      if (target) return set(b, 'fight', null);
      const p = m.player;
      const goal = b.hint?.goal ?? (p?.alive ? p : null);
      return goal ? set(b, 'goal', { x: goal.x, y: goal.y }) : set(b, 'idle', null);
    }
    case 'player':
      return;
  }
}

function thinkPlayer(m: Match, b: Brain, t: Tank, target: Tank | null, winnable: number, attacked: boolean): void {
  const h = b.hint;
  const priority = target !== null && h?.target === target.id;
  const close = target !== null && Math.hypot(target.x - t.x, target.y - t.y) < 260;
  const engage = h?.sneak ? attacked || priority : winnable >= 0.75 || attacked || priority || close;
  // Running: shoot what's in sight on the way, but keep driving.
  if (target && engage && h?.run && h.goal) return set(b, 'goal', { x: h.goal.x, y: h.goal.y });
  if (target && engage) return set(b, 'fight', null);
  const loot = h?.urgent ? null : lootPick(m, t, target ? LOOT_RANGE * 0.5 : LOOT_RANGE);
  if (loot) {
    b.goalPickup = loot.id;
    b.wantSwap = Math.hypot(loot.x - t.x, loot.y - t.y) < t.stats.radius + 14;
    return set(b, 'loot', loot);
  }
  if (h?.goal) return set(b, 'goal', { x: h.goal.x, y: h.goal.y });
  set(b, 'idle', null);
}

function set(b: Brain, state: BotState, goal: Pt | null): void {
  b.state = state;
  b.goal = goal;
  if (state !== 'loot') b.goalPickup = null;
}
