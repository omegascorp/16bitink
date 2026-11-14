import { wantsSwap } from '../loot';
import { GADGET } from '../match/gadgets';
import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import type { Pt } from '../vec';
import { set, type Brain } from './brain';
import { losClear } from './perception';

/**
 * The sim's stand-in in the player's seat ("a decent casual player"), with
 * the Tactics tools: it opens on enemies that haven't seen it, fights from a
 * bush or low cover near the fight, and uses its gadget (a mine when chased,
 * smoke when low, oil on a close chaser).
 */
const LOOT_RANGE = 420;
/** Looks this far for a bush or low cover to fight from. */
const COVER_SEEK = 200;
/** No second gadget within this many seconds. */
const GADGET_GAP = 3;

/** Crates, kits, intel and better parts close by. */
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
    else if (p.kind === 'gadget') v = t.gadget && t.gadgetCharges < GADGET.max ? 5 : 0;
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

/** A bush, or the near side of low cover, close by and in range of the target. */
export function coverSpotNear(m: Match, t: Tank, target: Tank): Pt | null {
  const range = t.stats.gun.range * 0.95;
  const ids = m.grid.query({ x0: t.x - COVER_SEEK, y0: t.y - COVER_SEEK, x1: t.x + COVER_SEEK, y1: t.y + COVER_SEEK });
  let best: Pt | null = null;
  let bestD = Infinity;
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || !(s.def.cover || s.def.low)) continue;
    let p: Pt = { x: s.def.x, y: s.def.y };
    if (s.def.low) {
      // Behind it, seen from the target.
      const dx = s.def.x - target.x;
      const dy = s.def.y - target.y;
      const d = Math.hypot(dx, dy) || 1;
      const back = t.stats.radius + 22;
      p = { x: s.def.x + (dx / d) * back, y: s.def.y + (dy / d) * back };
    }
    const toTarget = Math.hypot(target.x - p.x, target.y - p.y);
    const toMe = Math.hypot(p.x - t.x, p.y - t.y);
    if (toTarget > range || toTarget < 120 || toMe > COVER_SEEK || toMe >= bestD || !m.navPassable(p.x, p.y)) continue;
    // A firing spot: the shot from there reaches the target (over the sandbags, through the bush).
    if (losClear(m, p.x, p.y, target.x, target.y)) {
      bestD = toMe;
      best = p;
    }
  }
  return best;
}

/** When the stand-in uses its gadget: a mine when chased, smoke when low, oil on a close chaser. */
function wantsGadget(m: Match, t: Tank, seen: readonly Tank[]): boolean {
  if (!t.gadget || t.gadgetCharges <= 0 || m.t - t.gadgetT < GADGET_GAP) return false;
  const alertNear = seen.filter((o) => o.role === 'tank' && m.brains.get(o.id)?.aware === 'alert' && Math.hypot(o.x - t.x, o.y - t.y) < 280);
  if (alertNear.length === 0) return false;
  const share = t.hp / t.stats.maxHp;
  if (t.gadget === 'smoke') return share < 0.35;
  if (t.gadget === 'oil') return alertNear.some((o) => Math.hypot(o.x - t.x, o.y - t.y) < 200);
  // A mine where a chaser will roll: it's coming at me, or I'm hurt and backing off.
  const mineNear = m.gadgets.mines.some((x) => x.alive && Math.hypot(x.x - t.x, x.y - t.y) < 120);
  const chased = alertNear.some((o) => Math.cos(o.heading - Math.atan2(t.y - o.y, t.x - o.x)) > 0.6 && o.speed > 20);
  return !mineNear && (chased || share < 0.6);
}

export function thinkPlayer(m: Match, b: Brain, t: Tank, target: Tank | null, winnable: number, attacked: boolean, seen: readonly Tank[]): void {
  const h = b.hint;
  b.useGadget = wantsGadget(m, t, seen);
  b.coverSpot = null;
  const priority = target !== null && h?.target === target.id;
  const close = target !== null && Math.hypot(target.x - t.x, target.y - t.y) < 260;
  // An enemy that hasn't seen it is worth opening on (×2), unless the level wants it sneaking.
  const calm = target !== null && target.role === 'tank' && m.brains.get(target.id)?.aware !== 'alert';
  const unaware = calm && b.los;
  // A calm enemy behind a building isn't a fight yet: it doesn't know you're there, so get on with the job.
  const hiddenCalm = calm && !b.los && !attacked && !priority;
  const engage = h?.sneak ? attacked || priority : !hiddenCalm && (winnable >= 0.75 || attacked || priority || close || unaware);
  if (hiddenCalm) {
    // Not aiming at it: the turret stays free for the objective (a cage, a target).
    b.target = null;
    b.snap = null;
    b.los = b.shootAt ? losClear(m, t.x, t.y, b.shootAt.x, b.shootAt.y, b.shootAt.id) : false;
  }
  // Running: shoot what's in sight on the way, but keep driving.
  if (target && engage && h?.run && h.goal) return set(b, 'goal', { x: h.goal.x, y: h.goal.y });
  if (target && engage) {
    if (!h?.stay && target.role === 'tank') b.coverSpot = coverSpotNear(m, t, target);
    return set(b, 'fight', null);
  }
  const loot = h?.urgent ? null : lootPick(m, t, target ? LOOT_RANGE * 0.5 : LOOT_RANGE);
  if (loot) {
    b.goalPickup = loot.id;
    b.wantSwap = Math.hypot(loot.x - t.x, loot.y - t.y) < t.stats.radius + 14;
    return set(b, 'loot', loot);
  }
  if (h?.goal) return set(b, 'goal', { x: h.goal.x, y: h.goal.y });
  set(b, 'idle', null);
}
