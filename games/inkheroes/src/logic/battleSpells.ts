import { alive, stackById, targetable, update, winnerOf } from './battleCore';
import type { BattleEvent, BattleHero, BattleState, Side, Stack, Step } from './battleTypes';
import { creature } from './creatures';
import { heal, raise } from './damage';
import { putEffect, wound } from './battleTraits';
import { skillValue } from './skills';
import { extraRounds, spellShare, tiwazCapBonus } from './specialty';
import { BAD_EFFECTS, SPELLS, TIWAZ, type SpellId } from './spells';
import type { Effect } from './battleTypes';

/** Why a hero can't cast `spell` on `target` now, or null when it can. */
export function cantCast(state: BattleState, side: Side, spell: SpellId, target: Stack | null): string | null {
  const hero = state.heroes[side];
  const def = SPELLS[spell];
  if (!hero) return 'No hero';
  if (state.cast[side]) return 'Already cast this round';
  if (!hero.spells.includes(spell)) return 'Spell not known';
  if (hero.mana < def.mana) return 'Not enough mana';
  if ((hero.ankhs ?? 0) < (def.ankhs ?? 0)) return 'Needs an Ankh';
  if (!target) return null;
  if (!alive(target) || !targetable(target)) return 'Nothing there';
  if (def.target !== 'any' && (def.target === 'enemy') !== (target.side !== side)) return def.target === 'enemy' ? 'Cast it on an enemy' : 'Cast it on your own unit';
  if (spell === 'dispel' && target.effects.length === 0) return 'No spells on it to lift';
  if (creature(target.creature).undead && (spell === 'bless' || spell === 'bloodlust' || spell === 'curse')) return 'The undead are immune';
  if (spell === 'rebirth') {
    if (creature(target.creature).undead) return 'The undead can’t be raised';
    if (target.count >= target.startCount && target.topHp >= creature(target.creature).hp) return 'No fallen to raise';
  }
  return null;
}

/** Damage or healing the hero's spell does (Spell Power and Sorcery). */
export function spellAmount(state: BattleState, side: Side, spell: SpellId): number {
  const hero = state.heroes[side];
  const def = SPELLS[spell];
  if (!hero || def.perPower === undefined) return 0;
  const raw = def.perPower * hero.power + (def.base ?? 0);
  // A spell specialist's bonus adds to Sorcery's (Healing heals more, the Thunderbolt strikes harder).
  const share = spellShare(hero.specialty, spell);
  return def.target === 'enemy' ? Math.floor(raw * (1 + skillValue(hero.skills, 'sorcery') + share)) : Math.floor(raw * (1 + share));
}

/** What a spell puts on its target: a ward its fill, Tiwaz its Attack and cap, Thurisaz its lightning, the rest their rounds. */
function effectOf(kind: Effect['kind'], rounds: number, amount: number, hero: BattleHero): Effect {
  if (kind === 'ward') return { kind, rounds: 1, left: amount };
  if (kind === 'tiwaz') return { kind, rounds: 1, bonus: TIWAZ.base, cap: TIWAZ.cap + tiwazCapBonus(hero.specialty) };
  if (kind === 'thurisaz') return { kind, rounds: 1, dose: amount };
  return { kind, rounds };
}

/** The hero casts: it costs mana and the round's cast, but not the active unit's turn. */
export function castSpell(state: BattleState, side: Side, spell: SpellId, targetId: number): Step {
  const target = stackById(state, targetId);
  const why = cantCast(state, side, spell, target);
  if (why) throw new Error(why);
  const hero = state.heroes[side]!;
  const def = SPELLS[spell];
  const paid = (h: BattleHero): BattleHero => ({ ...h, mana: h.mana - def.mana, ...(def.ankhs ? { ankhs: (h.ankhs ?? 0) - def.ankhs } : {}) });
  const heroes = state.heroes.map((h, i) => (i === side && h ? paid(h) : h)) as unknown as BattleState['heroes'];
  const cast = state.cast.map((c, i) => (i === side ? true : c)) as unknown as BattleState['cast'];
  let s: BattleState = { ...state, heroes, cast };
  let amount = spellAmount(state, side, spell);
  let kills = 0;
  const after: BattleEvent[] = [];
  if (def.target === 'enemy' && amount > 0) {
    const w = wound(s, targetId, amount, after);
    kills = w.kills;
    s = w.state;
  } else if (spell === 'rebirth') {
    const raised = raise(target, amount);
    amount = (raised.count - target.count) * creature(target.creature).hp + raised.topHp - target.topHp;
    s = update(s, targetId, () => raised);
  } else if (spell === 'cure') {
    s = update(s, targetId, (x) => ({ ...heal(x, amount), effects: x.effects.filter((e) => !BAD_EFFECTS.includes(e.kind)) }));
  } else if (spell === 'dispel') {
    s = update(s, targetId, (x) => ({ ...x, effects: [] }));
  }
  if (def.effect) {
    // A ward holds until it has soaked its fill; Tiwaz and Thurisaz the battle; the rest last Spell Power rounds.
    const rounds = Math.max(1, hero.power) + extraRounds(hero.specialty, spell);
    s = putEffect(s, targetId, effectOf(def.effect, rounds, amount, hero));
  }
  const events: BattleEvent[] = [{ type: 'spell', side, spell, target: targetId, amount, kills }, ...after];
  const won = winnerOf(s);
  if (won !== null) {
    events.push({ type: 'end', winner: won });
    return { state: { ...s, active: null, winner: won }, events };
  }
  return { state: s, events };
}
