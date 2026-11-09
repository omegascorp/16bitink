import { alive, stackById, update } from './battleCore';
import type { BattleEvent, BattleState, Effect, Stack } from './battleTypes';
import { creature } from './creatures';
import { hurt } from './damage';
import { roll } from './rng';

/**
 * The traits that put something on a stack or come between it and a blow
 * (Egypt's and its neutrals', docs/inkheroes-design.md): a curse, poison, a
 * ward that soaks damage, and the Bennu's rebirth. battle.ts and
 * battleSpells.ts route their damage through `wound`.
 */

/** Rounds a mummy's curse lasts (the spell lasts Spell Power rounds). */
export const CURSE_ROUNDS = 3;
/** Turns a scorpion's poison eats at its target. */
export const POISON_TURNS = 3;

/** Living, and not undead: what a curse or poison can take hold of. */
const mortal = (s: Stack): boolean => alive(s) && !creature(s.creature).undead;

/** Effects that put each other out: a stack can't be both blessed and cursed. */
const OPPOSITE: Readonly<Partial<Record<Effect['kind'], Effect['kind']>>> = { bless: 'curse', curse: 'bless' };

/** Puts `effect` on stack `id`, in place of one of its kind (and of its opposite). */
export function putEffect(s: BattleState, id: number, effect: Effect): BattleState {
  const out = OPPOSITE[effect.kind];
  return update(s, id, (x) => ({ ...x, effects: [...x.effects.filter((e) => e.kind !== effect.kind && e.kind !== out), effect] }));
}

/** After `att`'s strike landed on stack `d`, dealing `dealt`: a curser may curse it, a poisoner poisons it (never the undead). */
export function afflict(s: BattleState, att: Stack, d: number, dealt: number, events: BattleEvent[]): BattleState {
  const c = creature(att.creature);
  // A blow the ward soaked whole afflicts nothing.
  if (dealt <= 0 || (!c.curse && !c.poison) || !mortal(stackById(s, d))) return s;
  let next = s;
  if (c.curse) {
    const r = roll(next.seed);
    next = { ...next, seed: r.seed };
    if (r.value < c.curse) {
      events.push({ type: 'afflict', stack: d, effect: 'curse' });
      next = putEffect(next, d, { kind: 'curse', rounds: CURSE_ROUNDS });
    }
  }
  if (c.poison) {
    // A fresh poison replaces the old: its ticks are a share of this blow.
    events.push({ type: 'afflict', stack: d, effect: 'poison' });
    next = putEffect(next, d, { kind: 'poison', rounds: POISON_TURNS, dose: poisonDose(dealt, c.poison) });
  }
  return next;
}

/** What a blow, a spell or the moat did to a stack. */
export interface Wound {
  readonly state: BattleState;
  /** What got through the ward. */
  readonly damage: number;
  readonly kills: number;
  readonly soaked: number;
}

/** The part of `damage` on `st` that gets through its ward (for previews). */
export function pastWard(st: Stack, damage: number): number {
  const ward = st.effects.find((e) => e.kind === 'ward');
  return Math.max(0, damage - (ward?.left ?? 0));
}

/** `damage` on stack `id`: a ward soaks what it can first, and a Bennu wiped out for the first time rises again. */
export function wound(s: BattleState, id: number, damage: number, events: BattleEvent[]): Wound {
  const st = stackById(s, id);
  const ward = st.effects.find((e) => e.kind === 'ward');
  const left = ward?.left ?? 0;
  const soaked = Math.min(left, damage);
  const effects = !ward ? st.effects : soaked >= left ? st.effects.filter((e) => e !== ward) : st.effects.map((e) => (e === ward ? { ...e, left: left - soaked } : e));
  const { stack, kills } = hurt({ ...st, effects }, damage - soaked);
  return { state: update(s, id, () => rise(st, stack, events)), damage: damage - soaked, kills, soaked };
}

/** A rebirther wiped out for the first time this battle rises with half the creatures it had (at least 1), or all of them. */
function rise(before: Stack, after: Stack, events: BattleEvent[]): Stack {
  const c = creature(before.creature);
  if (alive(after) || !c.rebirth || before.reborn) return after;
  const count = c.rebirth === 'all' ? before.count : Math.max(1, Math.floor(before.count / 2));
  events.push({ type: 'rebirth', stack: before.id, count });
  return { ...after, count, topHp: c.hp, effects: [], reborn: true };
}

/** What each tick of a poison takes: its share of the blow that gave it, at least 1. */
export const poisonDose = (dealt: number, share: number): number => Math.max(1, Math.floor(dealt * share));

/** A poisoned stack loses its dose as its turn starts, for its next three turns. */
export function poisonTick(s: BattleState, st: Stack, events: BattleEvent[]): BattleState {
  const poison = st.effects.find((e) => e.kind === 'poison');
  if (!poison || st.waited) return s;
  const damage = poison.dose ?? 1;
  const counted = update(s, st.id, (x) => ({ ...x, effects: poison.rounds > 1 ? x.effects.map((e) => (e === poison ? { ...e, rounds: e.rounds - 1 } : e)) : x.effects.filter((e) => e !== poison) }));
  // The poison shows first, then a rebirth it may bring about.
  const after: BattleEvent[] = [];
  const w = wound(counted, st.id, damage, after);
  events.push({ type: 'poison', stack: st.id, damage: w.damage, kills: w.kills }, ...after);
  return w.state;
}
