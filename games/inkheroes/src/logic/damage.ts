import type { BattleState, Stack } from './battleTypes';
import { creature } from './creatures';
import { roll } from './rng';
import { skillValue } from './skills';

/** Beyond this many hexes shots do half damage (H3: 10, on a bigger field). */
export const RANGE_PENALTY_DISTANCE = 7;

export interface StrikeCtx {
  readonly ranged: boolean;
  /** Hexes between shooter and target (ranged only). */
  readonly distance: number;
  /** Hexes walked before a melee strike (for the Lancer's charge). */
  readonly moved: number;
}

const has = (s: Stack, kind: string): boolean => s.effects.some((e) => e.kind === kind);

export function attackOf(state: BattleState, s: Stack, melee: boolean): number {
  const hero = state.heroes[s.side];
  return creature(s.creature).attack + (hero?.attack ?? 0) + (melee && has(s, 'bloodlust') ? 3 : 0);
}

export function defenseOf(state: BattleState, s: Stack): number {
  const base = creature(s.creature).defense + (state.heroes[s.side]?.defense ?? 0) + (has(s, 'stoneSkin') ? 3 : 0);
  return s.defending ? base + Math.max(1, Math.floor(base * 0.2)) : base;
}

export function speedOf(s: Stack): number {
  const base = creature(s.creature).speed + (has(s, 'haste') ? 3 : 0);
  return has(s, 'slow') ? Math.floor(base * 0.75) : base;
}

/**
 * H3's multiplier on base damage: Attack over Defense +5% a point (to +300%),
 * Defense over Attack −2.5% a point (to −70%); bonuses add, penalties multiply.
 */
export function damageFactor(state: BattleState, a: Stack, d: Stack, ctx: StrikeCtx, lucky = false): number {
  const att = attackOf(state, a, !ctx.ranged);
  const def = defenseOf(state, d);
  const skills = state.heroes[a.side]?.skills ?? {};
  let raise = 1;
  if (att > def) raise += Math.min(3, 0.05 * (att - def));
  raise += ctx.ranged ? skillValue(skills, 'archery') : skillValue(skills, 'offense');
  if (!ctx.ranged && creature(a.creature).charge) raise += 0.05 * ctx.moved;
  if (lucky) raise += 1;
  let lower = 1;
  if (def > att) lower *= 1 - Math.min(0.7, 0.025 * (def - att));
  lower *= 1 - skillValue(state.heroes[d.side]?.skills ?? {}, 'armorer');
  if (ctx.ranged && ctx.distance > RANGE_PENALTY_DISTANCE) lower *= 0.5;
  if (!ctx.ranged && creature(a.creature).shots) lower *= 0.5;
  return raise * lower;
}

/** The least and most a strike can deal (before luck), for the attack preview. */
export function damageRange(state: BattleState, a: Stack, d: Stack, ctx: StrikeCtx): { min: number; max: number } {
  const c = creature(a.creature);
  const f = damageFactor(state, a, d, ctx);
  const lo = has(a, 'bless') ? c.maxDmg : c.minDmg;
  return { min: Math.max(1, Math.floor(lo * a.count * f)), max: Math.max(1, Math.floor(c.maxDmg * a.count * f)) };
}

/** Rolls a strike's damage (and luck) from the battle's seed. */
export function rollDamage(state: BattleState, a: Stack, d: Stack, ctx: StrikeCtx, seed: number): { damage: number; lucky: boolean; seed: number } {
  const c = creature(a.creature);
  const luckPts = Math.max(0, state.heroes[a.side]?.luck ?? 0);
  const l = roll(seed);
  const lucky = l.value < luckPts / 24;
  let s = l.seed;
  let base = 0;
  // H3 rolls each creature's damage (for stacks up to 10) and averages ten rolls beyond that.
  const rolls = Math.min(a.count, 10);
  for (let i = 0; i < rolls; i++) {
    const r = roll(s);
    s = r.seed;
    base += has(a, 'bless') ? c.maxDmg : c.minDmg + Math.floor(r.value * (c.maxDmg - c.minDmg + 1));
  }
  base = (base / rolls) * a.count;
  return { damage: Math.max(1, Math.floor(base * damageFactor(state, a, d, ctx, lucky))), lucky, seed: s };
}

/** A stack after taking `damage`: the top creature first, then whole ones. */
export function hurt(s: Stack, damage: number): { stack: Stack; kills: number } {
  const hp = creature(s.creature).hp;
  const total = (s.count - 1) * hp + s.topHp - damage;
  if (total <= 0) return { stack: { ...s, count: 0, topHp: 0 }, kills: s.count };
  const count = Math.ceil(total / hp);
  return { stack: { ...s, count, topHp: total - (count - 1) * hp }, kills: s.count - count };
}

/** Creatures a strike of `damage` would kill. */
export const killsBy = (s: Stack, damage: number): number => hurt(s, damage).kills;

/** A stack after healing `amount` on its top creature (never past full; nobody comes back). */
export function heal(s: Stack, amount: number): Stack {
  return { ...s, topHp: Math.min(creature(s.creature).hp, s.topHp + amount) };
}
