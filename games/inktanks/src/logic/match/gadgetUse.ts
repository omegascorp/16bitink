import { botSees } from '../bots/awareness';
import { hitTank } from './combat';
import { dropPoint, GADGET, pruneGadgets } from './gadgets';
import type { Match } from './match';
import type { Tank } from './types';

/**
 * Using the gadget slot and what gadgets on the ground do each step
 * (design doc, Tactics §3). Mines: arm after 1 s, go off when an enemy rolls
 * within 28 px of one (90 damage, 40 px splash at half, a broken track at
 * ×0.5 speed for 3 s); only bots that watched one laid steer round it.
 * Oil: enemies in it slide (movement.ts). Smoke blocks sight (perception.ts).
 */

/** Uses a charge of the tank's gadget, if it has one ready. Returns whether it did. */
export function useGadget(m: Match, t: Tank): boolean {
  const kind = t.gadget;
  if (!kind || !t.alive || t.role !== 'tank' || t.gadgetCharges <= 0 || m.t < t.gadgetT) return false;
  t.gadgetCharges--;
  t.gadgetT = m.t + GADGET.cooldown;
  t.gadgetsUsed++;
  const at = dropPoint(kind, t);
  const id = m.nextId++;
  const g = m.gadgets;
  if (kind === 'mines') {
    // The bots that see you lay it know it's there.
    const known = new Set<number>();
    for (const [bid, b] of m.brains) {
      const o = m.tank(bid);
      if (o?.alive && o.team !== t.team && botSees(m, b, o, t)) known.add(bid);
    }
    g.mines.push({ id, x: at.x, y: at.y, team: t.team, owner: t.id, armAt: m.t + GADGET.mine.arm, known, alive: true });
  } else if (kind === 'oil') {
    g.oils.push({ id, x: at.x, y: at.y, r: GADGET.oil.r, team: t.team, at: m.t, until: m.t + GADGET.oil.life });
  } else {
    g.smokes.push({ id, x: at.x, y: at.y, r: GADGET.smoke.r, team: t.team, at: m.t, until: m.t + GADGET.smoke.life });
  }
  m.emit({ kind: 'gadget', tank: t.id, gadget: kind, x: at.x, y: at.y });
  return true;
}

const triggers = (t: Tank): boolean => t.alive && t.role !== 'bossTurret' && t.role !== 'crew';

/** Armed mines under an enemy go off; old slicks and clouds go. */
export function stepGadgets(m: Match): void {
  const g = m.gadgets;
  const reach = GADGET.mine.trigger;
  for (const mine of g.mines) {
    if (!mine.alive || m.t < mine.armAt) continue;
    const victim = m.tanks.find((t) => triggers(t) && t.team !== mine.team && (t.x - mine.x) ** 2 + (t.y - mine.y) ** 2 <= reach * reach);
    if (victim) explodeMine(m, mine.x, mine.y, mine.team, mine.owner, victim);
    if (victim) mine.alive = false;
  }
  pruneGadgets(g, m.t);
}

function explodeMine(m: Match, x: number, y: number, team: number, owner: number, victim: Tank): void {
  const c = GADGET.mine;
  m.emit({ kind: 'mine', x, y, target: victim.id });
  m.emit({ kind: 'explode', x, y, r: c.splash });
  const from = m.tank(owner) ? owner : null;
  victim.trackBrokenUntil = m.t + c.slowFor;
  hitTank(m, victim, c.damage, 'cannon', from, true);
  for (const t of m.tanks) {
    if (t === victim || !triggers(t) || t.team === team) continue;
    const r = c.splash + t.stats.radius;
    if ((t.x - x) ** 2 + (t.y - y) ** 2 <= r * r) hitTank(m, t, c.damage * 0.5, 'cannon', from, true);
  }
}
