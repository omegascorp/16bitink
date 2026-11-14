import type { Pt } from '../vec';
import type { GadgetKind } from './types';

/**
 * The gadget slot's numbers and what's on the ground (design doc, Tactics §3).
 * This file is state and cheap queries only; laying and triggering are in
 * gadgetUse.ts (it needs perception and combat, which read smoke from here).
 */
export const GADGET = {
  /** Charges a level starts with, and the most a crate can top you up to. */
  charges: 2,
  max: 4,
  /** One press, one use. */
  cooldown: 0.6,
  mine: { arm: 1, trigger: 28, damage: 90, splash: 40, slow: 0.5, slowFor: 3 },
  oil: { r: 60, life: 8, speed: 0.4, turn: 0.35 },
  smoke: { r: 90, life: 6 },
} as const;

export const GADGET_NAME: Readonly<Record<GadgetKind, string>> = { mines: 'Mines', oil: 'Oil slick', smoke: 'Smoke' };
export const GADGET_TEXT: Readonly<Record<GadgetKind, string>> = {
  mines: 'Arms in 1 s; an enemy rolling over it takes 90 damage and a broken track.',
  oil: 'A 60 px slick for 8 s: enemies slide at 40% speed and can’t turn well.',
  smoke: 'A 90 px cloud for 6 s that blocks sight both ways.',
};

export interface Mine {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly team: number;
  readonly owner: number;
  readonly armAt: number;
  /** Enemy bots that watched it being laid: only they steer round it. */
  readonly known: ReadonlySet<number>;
  alive: boolean;
}

export interface Patch {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly team: number;
  readonly at: number;
  readonly until: number;
}

export interface Gadgets {
  mines: Mine[];
  oils: Patch[];
  smokes: Patch[];
}

export const newGadgets = (): Gadgets => ({ mines: [], oils: [], smokes: [] });

/** Drops what's expired or gone off. */
export function pruneGadgets(g: Gadgets, now: number): void {
  if (g.mines.some((x) => !x.alive)) g.mines = g.mines.filter((x) => x.alive);
  if (g.oils.some((p) => p.until <= now)) g.oils = g.oils.filter((p) => p.until > now);
  if (g.smokes.some((p) => p.until <= now)) g.smokes = g.smokes.filter((p) => p.until > now);
}

const inside = (p: Patch, x: number, y: number): boolean => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;

export function inSmoke(g: Gadgets, x: number, y: number, now: number): boolean {
  for (const p of g.smokes) if (p.until > now && inside(p, x, y)) return true;
  return false;
}

/** Whether a sight line a→b crosses a smoke cloud (inside counts: it blocks both ways). */
export function smokeBlocks(g: Gadgets, ax: number, ay: number, bx: number, by: number, now: number): boolean {
  for (const p of g.smokes) {
    if (p.until <= now) continue;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2));
    const cx = ax + dx * k;
    const cy = ay + dy * k;
    if ((cx - p.x) ** 2 + (cy - p.y) ** 2 <= p.r * p.r) return true;
  }
  return false;
}

/** The slick a tank of `team` slides in (someone else's), or null. */
export function oilUnder(g: Gadgets, team: number, x: number, y: number, now: number): Patch | null {
  for (const p of g.oils) if (p.team !== team && p.until > now && inside(p, x, y)) return p;
  return null;
}

/** Armed or not, the mines a bot knows of (it watched them laid). */
export function knownMines(g: Gadgets, botId: number): Mine[] {
  return g.mines.filter((x) => x.alive && x.known.has(botId));
}

/** Where a dropped gadget lands: just behind the tank (mines, oil) or on it (smoke). */
export function dropPoint(kind: GadgetKind, t: { x: number; y: number; heading: number; stats: { radius: number } }): Pt {
  if (kind === 'smoke') return { x: t.x, y: t.y };
  const back = t.stats.radius + 8;
  return { x: t.x - Math.cos(t.heading) * back, y: t.y - Math.sin(t.heading) * back };
}
