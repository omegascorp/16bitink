import { alive, stackById, update, winnerOf } from './battleCore';
import type { BattleEvent, BattleState, Side, Stack, Step } from './battleTypes';
import { creature } from './creatures';
import { heal, hurt } from './damage';
import { skillValue } from './skills';
import { BAD_EFFECTS, SPELLS, type SpellId } from './spells';

/** Why a hero can't cast `spell` on `target` now, or null when it can. */
export function cantCast(state: BattleState, side: Side, spell: SpellId, target: Stack | null): string | null {
  const hero = state.heroes[side];
  const def = SPELLS[spell];
  if (!hero) return 'No hero';
  if (state.cast[side]) return 'Already cast this round';
  if (!hero.spells.includes(spell)) return 'Spell not known';
  if (hero.mana < def.mana) return 'Not enough mana';
  if (!target) return null;
  if (!alive(target)) return 'Nothing there';
  if ((def.target === 'enemy') !== (target.side !== side)) return def.target === 'enemy' ? 'Cast it on an enemy' : 'Cast it on your own unit';
  if (creature(target.creature).undead && (spell === 'bless' || spell === 'bloodlust')) return 'The undead are immune';
  return null;
}

/** Damage or healing the hero's spell does (Spell Power and Sorcery). */
export function spellAmount(state: BattleState, side: Side, spell: SpellId): number {
  const hero = state.heroes[side];
  const def = SPELLS[spell];
  if (!hero || def.perPower === undefined) return 0;
  const raw = def.perPower * hero.power + (def.base ?? 0);
  return def.target === 'enemy' ? Math.floor(raw * (1 + skillValue(hero.skills, 'sorcery'))) : raw;
}

/** The hero casts: it costs mana and the round's cast, but not the active unit's turn. */
export function castSpell(state: BattleState, side: Side, spell: SpellId, targetId: number): Step {
  const target = stackById(state, targetId);
  const why = cantCast(state, side, spell, target);
  if (why) throw new Error(why);
  const hero = state.heroes[side]!;
  const def = SPELLS[spell];
  const heroes = state.heroes.map((h, i) => (i === side && h ? { ...h, mana: h.mana - def.mana } : h)) as unknown as BattleState['heroes'];
  const cast = state.cast.map((c, i) => (i === side ? true : c)) as unknown as BattleState['cast'];
  let s: BattleState = { ...state, heroes, cast };
  const amount = spellAmount(state, side, spell);
  let kills = 0;
  if (def.target === 'enemy' && amount > 0) {
    const r = hurt(target, amount);
    kills = r.kills;
    s = update(s, targetId, () => r.stack);
  } else if (spell === 'cure') {
    s = update(s, targetId, (x) => ({ ...heal(x, amount), effects: x.effects.filter((e) => !BAD_EFFECTS.includes(e.kind)) }));
  }
  if (def.effect) {
    const kind = def.effect;
    const rounds = Math.max(1, hero.power);
    s = update(s, targetId, (x) => ({ ...x, effects: [...x.effects.filter((e) => e.kind !== kind), { kind, rounds }] }));
  }
  const events: BattleEvent[] = [{ type: 'spell', side, spell, target: targetId, amount, kills }];
  const won = winnerOf(s);
  if (won !== null) {
    events.push({ type: 'end', winner: won });
    return { state: { ...s, active: null, winner: won }, events };
  }
  return { state: s, events };
}
