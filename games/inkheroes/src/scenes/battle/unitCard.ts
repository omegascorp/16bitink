import type { StatName } from '../../art/pixel/ui';
import type { BattleState, Stack } from '../../logic/battleTypes';
import { creature } from '../../logic/creatures';
import { attackOf, defenseOf, speedOf } from '../../logic/damage';
import { SPELLS } from '../../logic/spells';

/** One row of a unit's stats: its icon, its name and its value. */
export interface StatRow {
  readonly stat: StatName;
  readonly label: string;
  readonly value: string;
}

/** What a unit's info card shows (as Heroes 3's creature window). */
export interface UnitInfo {
  readonly name: string;
  readonly creature: string;
  readonly count: number;
  readonly side: number;
  readonly rows: readonly StatRow[];
  /** Its abilities and the spells on it, a line each. */
  readonly notes: readonly string[];
}

/** "5", or "5 (7)" when the battle has changed the creature's own number (as Heroes 3 shows it). */
function stat(now: number, base: number): string {
  return now === base ? `${base}` : `${base} (${now})`;
}

/** What a stack's traits mean, in a few words each. */
function traits(s: Stack): string[] {
  const c = creature(s.creature);
  const out: string[] = [];
  if (c.flies) out.push('Flies');
  if (c.shots) out.push('Shoots');
  if (c.undead) out.push('Undead');
  if (c.noRetaliation) out.push('Strikes are never answered');
  if ((c.retaliations ?? 1) > 1) out.push(`Answers ${c.retaliations} strikes a round`);
  if (c.charge) out.push('Charges: +5% damage a hex moved');
  if (s.defending) out.push('Defending');
  return out;
}

/** A stack's info card: its stats with the battle's changes, its abilities and the spells on it. */
export function unitInfo(state: BattleState, s: Stack): UnitInfo {
  const c = creature(s.creature);
  const rows: StatRow[] = [
    { stat: 'attack', label: 'Attack', value: stat(attackOf(state, s, !c.shots), c.attack) },
    { stat: 'defense', label: 'Defense', value: stat(defenseOf(state, s), c.defense) },
    ...(c.shots ? [{ stat: 'shots' as const, label: 'Shots', value: `${s.shots} of ${c.shots}` }] : []),
    { stat: 'damage', label: 'Damage', value: c.minDmg === c.maxDmg ? `${c.minDmg}` : `${c.minDmg}–${c.maxDmg}` },
    { stat: 'health', label: 'Health', value: `${c.hp}` },
    { stat: 'left', label: 'Health left', value: `${s.topHp}` },
    { stat: 'speed', label: 'Speed', value: stat(speedOf(s), c.speed) },
  ];
  const spells = s.effects.map((e) => {
    const spell = Object.values(SPELLS).find((d) => d.effect === e.kind);
    return `${spell?.name ?? e.kind}: ${e.rounds} round${e.rounds === 1 ? '' : 's'}`;
  });
  return { name: s.count === 1 ? c.name : c.plural, creature: s.creature, count: s.count, side: s.side, rows, notes: [...traits(s), ...spells] };
}
