import { alive, answers, canShoot, targetable } from './battle';
import { cantCast, spellAmount } from './battleSpells';
import type { Action, BattleState, Side, Stack } from './battleTypes';
import { creature, strengthOf } from './creatures';
import { damageRange, speedOf } from './damage';
import { shotDistance } from './footprint';
import { SPELLS, BAD_EFFECTS, isRune, TIWAZ, type EffectKind, type SpellId } from './spells';

/**
 * The hero's spell in a battle the AI plays (any AI side, and the player's
 * Auto): once a round, the spell worth most, valued in the same health the
 * stacks' blows are (docs/inkheroes-design.md, Lykaon's rule 5). Thunderbolt
 * on the stack worth most to kill, Slow on the fastest foe, a buff on the
 * strongest stack, Healing on a hurt one.
 */

/** A spell the hero could cast now, and what it is worth. */
export interface Cast {
  readonly action: Extract<Action, { type: 'cast' }>;
  readonly value: number;
}

/** A side this many times stronger on the field has the fight won: it keeps its mana for the next. */
const WON = 4;
/** Of the rounds a timed spell lasts, this many count (a stack doesn't strike every one of them). */
const MAX_ROUNDS = 3;
const STRIKES = 0.7;
/** Haste and Slow are worth this share of the blows they hasten or delay. */
const SPEED_SHARE = 0.3;

const average = (r: { min: number; max: number }): number => (r.min + r.max) / 2;

/** The HP a blow would really take off, weighted by the stack's level (as battleAi's `worth`). */
function worth(target: Stack, damage: number): number {
  const c = creature(target.creature);
  const total = (target.count - 1) * c.hp + target.topHp;
  return Math.min(total, damage) * (1 + c.level * 0.15);
}

/** What `a`'s blow on `d` is worth on average (shot from where it stands when it can shoot). */
function blow(state: BattleState, a: Stack, d: Stack): number {
  const ranged = canShoot(state, a);
  return worth(d, average(damageRange(state, a, d, { ranged, distance: ranged ? shotDistance(a, d) : 1, moved: 0 })));
}

const withEffect = (s: Stack, kind: EffectKind): Stack => ({ ...s, effects: [...s.effects.filter((e) => e.kind !== kind), { kind, rounds: 1 }] });
const has = (s: Stack, kind: EffectKind): boolean => s.effects.some((e) => e.kind === kind);
/** Whether a rune is carved on `s` already: a new one would only replace it. */
const runed = (s: Stack): boolean => s.effects.some((e) => isRune(e.kind));
/** A rune lasts the battle: its worth counts this many of the stack's strikes. */
const RUNE_ROUNDS = 4;

/** The best blow `a` has on any of `foes`. */
const bestBlow = (state: BattleState, a: Stack, foes: readonly Stack[]): number => Math.max(0, ...foes.map((e) => blow(state, a, e)));

/** What spell `spell` on `t` is worth to side `side`. */
function valueOf(state: BattleState, side: Side, spell: SpellId, t: Stack, mine: readonly Stack[], foes: readonly Stack[]): number {
  const def = SPELLS[spell];
  const rounds = Math.min(MAX_ROUNDS, Math.max(1, state.heroes[side]?.power ?? 1)) * STRIKES;
  const amount = spellAmount(state, side, spell);
  if (def.target === 'enemy' && amount > 0) return worth(t, amount);
  const gain = (kind: EffectKind, from: (s: Stack) => number): number => (has(t, kind) ? 0 : Math.max(0, from(withEffect(t, kind)) - from(t)) * rounds);
  switch (spell) {
    case 'bless':
    case 'bloodlust':
      return gain(spell, (s) => bestBlow(state, s, foes));
    case 'stoneSkin':
      // The blows of the foe that hurts it most, softened.
      return has(t, 'stoneSkin') ? 0 : Math.max(0, ...foes.map((f) => blow(state, f, t) - blow(state, f, withEffect(t, 'stoneSkin')))) * rounds;
    case 'curse':
      return has(t, 'curse') ? 0 : Math.max(0, ...mine.map((m) => blow(state, t, m) - blow(state, withEffect(t, 'curse'), m))) * rounds;
    case 'haste':
      return has(t, 'haste') || creature(t.creature).shots ? 0 : bestBlow(state, t, foes) * SPEED_SHARE * rounds;
    case 'slow': {
      // On the fastest foe on foot or wing (a shooter's blows don't wait on its legs).
      const walkers = foes.filter((f) => !canShoot(state, f));
      const fastest = Math.max(0, ...walkers.map(speedOf));
      if (has(t, 'slow') || canShoot(state, t) || speedOf(t) < fastest) return 0;
      return Math.max(0, ...mine.map((m) => blow(state, t, m))) * SPEED_SHARE * rounds;
    }
    case 'cure': {
      const c = creature(t.creature);
      const healed = Math.min(amount, c.hp - t.topHp) * (1 + c.level * 0.15);
      const cursed = t.effects.some((e) => BAD_EFFECTS.includes(e.kind)) ? bestBlow(state, t, foes) * SPEED_SHARE : 0;
      return healed + cursed;
    }
    case 'ward':
      return has(t, 'ward') ? 0 : Math.min(amount, Math.max(0, ...foes.map((f) => average(damageRange(state, f, t, { ranged: canShoot(state, f), distance: 1, moved: 0 }))))) * STRIKES;
    case 'tiwaz':
      // +2 Attack for the battle, more as it bleeds: its best blow, raised.
      return runed(t) ? 0 : Math.max(0, bestBlow(state, { ...t, effects: [...t.effects, { kind: 'tiwaz', rounds: 1, bonus: TIWAZ.base + 1 }] }, foes) - bestBlow(state, t, foes)) * RUNE_ROUNDS * STRIKES;
    case 'isa': {
      // The answers it can't give: what it would strike back at the best of ours that strikes it.
      if (runed(t) || !mine.some((m) => !creature(m.creature).machine && answers(m, t))) return 0;
      return Math.max(0, ...mine.map((m) => blow(state, t, m))) * rounds * 0.5;
    }
    case 'thurisaz': {
      // Lightning on each foe that strikes it hand to hand: the strongest walker or flier, a few times.
      const strikers = foes.filter((f) => !canShoot(state, f));
      if (runed(t) || !strikers.length) return 0;
      return Math.max(0, ...strikers.map((f) => worth(f, amount))) * RUNE_ROUNDS * STRIKES * 0.5;
    }
    case 'rebirth': {
      const c = creature(t.creature);
      const fallen = (t.startCount - t.count) * c.hp + (c.hp - t.topHp);
      return Math.min(amount, fallen) * (1 + c.level * 0.15);
    }
    default:
      return 0;
  }
}

const fieldStrength = (stacks: readonly Stack[]): number => stacks.reduce((n, s) => n + strengthOf(s.creature, s.count), 0);

/** The best spell side `side`'s hero can cast now, if any is worth anything. */
export function bestCast(state: BattleState, side: Side): Cast | null {
  const hero = state.heroes[side];
  if (!hero || state.cast[side] || !hero.spells.length) return null;
  const onField = state.stacks.filter((s) => alive(s) && targetable(s));
  const mine = onField.filter((s) => s.side === side);
  const foes = onField.filter((s) => s.side !== side);
  if (!foes.length || !mine.length || fieldStrength(mine) > fieldStrength(foes) * WON) return null;
  let best: Cast | null = null;
  for (const spell of hero.spells) {
    if (cantCast(state, side, spell, null)) continue;
    const def = SPELLS[spell];
    const targets = def.target === 'enemy' ? foes : def.target === 'friend' ? mine : [];
    for (const t of targets) {
      if (cantCast(state, side, spell, t)) continue;
      const value = valueOf(state, side, spell, t, mine, foes);
      if (value > 0 && (!best || value > best.value)) best = { action: { type: 'cast', spell, target: t.id }, value };
    }
  }
  return best;
}

/** Whether `me` is the last of its side still to act this round (the hero's last chance to cast in it). */
export function lastToAct(state: BattleState, me: Stack): boolean {
  return !state.stacks.some((s) => s.id !== me.id && s.side === me.side && alive(s) && !s.acted && !creature(s.creature).machine);
}
