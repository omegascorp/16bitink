import { slotOf, withPart, type HullFamily } from '../parts';
import { tankStats } from '../stats';
import { mergeIntel, sumIntel } from '../intel';
import type { Match } from './match';
import type { Tank, TankInput } from './types';

/** Hold swap this long to fit the part underneath. */
export const SWAP_HOLD = 0.5;
export const REPAIR_TIME = 2;
export const REPAIR_SHARE = 0.4;
const REACH = 14;

export function repair(m: Match, t: Tank, input: TankInput, dt: number): void {
  if (t.repairT > 0) {
    const step = Math.min(dt, t.repairT);
    t.hp = Math.min(t.stats.maxHp, t.hp + (t.stats.maxHp * REPAIR_SHARE * step) / REPAIR_TIME);
    t.repairT -= step;
    return;
  }
  if (input.repair && t.kits > 0 && t.hp < t.stats.maxHp) {
    t.kits--;
    t.usedKit = true;
    t.repairT = REPAIR_TIME;
  }
}

/** Fits a part, keeping the HP share; the old part drops where the tank stands. */
export function swapIn(m: Match, t: Tank, pickupId: number): void {
  const p = m.pickups.find((x) => x.id === pickupId);
  if (!p || p.taken || p.kind !== 'part') return;
  const slot = slotOf(p.part.family);
  const old = t.loadout[slot];
  const share = t.hp / t.stats.maxHp;
  t.loadout = withPart(t.loadout, p.part);
  const stats = tankStats(t.loadout, t.research);
  t.stats = { ...stats, maxHp: stats.maxHp * t.hpMult };
  t.hp = Math.max(1, share * t.stats.maxHp);
  if (slot === 'gun') {
    t.reload = t.stats.gun.reload;
    t.burst = 0;
  }
  if (slot === 'hull' && !t.hullsUsed.includes(p.part.family as HullFamily)) t.hullsUsed.push(p.part.family as HullFamily);
  t.picks.push(p.part);
  p.taken = true;
  // The old part drops out of reach behind, so holding swap doesn't swap it straight back.
  const back = t.stats.radius + REACH + 12;
  m.addPickup({ kind: 'part', part: old }, t.x - Math.cos(t.heading) * back, t.y - Math.sin(t.heading) * back);
  m.emit({ kind: 'swap', tank: t.id, part: p.part, dropped: old });
}

export function touchPickups(m: Match, t: Tank, input: TankInput, dt: number, wantsSwap: boolean): void {
  if (t.role !== 'tank') return;
  const reach = t.stats.radius + REACH;
  let onPart: number | null = null;
  for (const p of m.pickups) {
    if (p.taken) continue;
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    if (dx * dx + dy * dy > reach * reach) continue;
    switch (p.kind) {
      case 'crate':
        p.taken = true;
        m.emit({ kind: 'crate', x: p.x, y: p.y });
        if (p.content.kind === 'kit') m.addPickup({ kind: 'kit' }, p.x, p.y);
        else m.addPickup({ kind: 'part', part: p.content.part }, p.x, p.y);
        break;
      case 'kit':
        if (t.kits < t.maxKits) {
          p.taken = true;
          t.kits++;
          m.emit({ kind: 'pickup', tank: t.id, what: 'kit', amount: 1 });
        }
        break;
      case 'intel':
        if (t.team === 0) {
          p.taken = true;
          m.intel = mergeIntel(m.intel, p.bag);
          m.emit({ kind: 'pickup', tank: t.id, what: 'intel', amount: sumIntel(p.bag) });
        }
        break;
      case 'proto':
        if (t.isPlayer) {
          p.taken = true;
          t.carrying = true;
          m.emit({ kind: 'pickup', tank: t.id, what: 'proto', amount: 1 });
        }
        break;
      case 'part':
        if (onPart === null) onPart = p.id;
        break;
    }
  }
  t.onPart = onPart;
  const holding = t.isPlayer && !m.cfg.playerBot ? input.swap : wantsSwap;
  if (onPart === null || !holding) {
    t.swapT = 0;
    return;
  }
  t.swapT += dt;
  if (t.swapT >= SWAP_HOLD) {
    t.swapT = 0;
    swapIn(m, t, onPart);
  }
}
