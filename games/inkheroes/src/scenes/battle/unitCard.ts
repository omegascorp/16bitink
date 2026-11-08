import type { StatName } from '../../art/pixel/ui';
import type { BattleState, Stack } from '../../logic/battleTypes';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';
import { creature, lineOf, lineUnits, tierOf, type CreatureId } from '../../logic/creatures';
import { describeAmount } from '../../logic/resources';
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

/** What a creature's traits mean, in a few words each. */
function traitsOf(id: CreatureId): string[] {
  const c = creature(id);
  const out: string[] = [];
  if (c.machine) out.push('War machine: never moves, acts by itself');
  if (c.flies) out.push('Flies');
  if (c.machine === 'catapult') out.push(`Brings down walls, towers and gates, ${c.stones!.throws === 1 ? '1 stone' : `${c.stones!.throws} stones`} a round; it can’t be hit`);
  if (c.shots) out.push('Shoots');
  if (c.undead) out.push('Undead');
  if (c.noRetaliation) out.push('Strikes are never answered');
  if ((c.retaliations ?? 1) > 1) out.push(`Answers ${c.retaliations} strikes a round`);
  if (c.charge) out.push('Charges: +5% damage a hex moved');
  if (c.swoop) out.push('Swoops back after striking');
  if (c.cleave) out.push('Strikes all around it');
  if (c.regen) out.push(`Regrows ${c.regen} health a round`);
  if (c.petrify) out.push('May turn its target to stone');
  return out;
}

/** What a stack's traits mean, and whether it's defending. */
function traits(s: Stack): string[] {
  return [...traitsOf(s.creature), ...(s.defending ? ['Defending'] : [])];
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

/** A company's info card out of battle (in a town or an army): its own stats, its level and abilities. */
export function armyUnitInfo(id: CreatureId, count: number): UnitInfo {
  const c = creature(id);
  const rows: StatRow[] = [
    { stat: 'attack', label: 'Attack', value: `${c.attack}` },
    { stat: 'defense', label: 'Defense', value: `${c.defense}` },
    ...(c.shots ? [{ stat: 'shots' as const, label: 'Shots', value: `${c.shots}` }] : []),
    { stat: 'damage', label: 'Damage', value: c.minDmg === c.maxDmg ? `${c.minDmg}` : `${c.minDmg}–${c.maxDmg}` },
    { stat: 'health', label: 'Health', value: `${c.hp}` },
    { stat: 'speed', label: 'Speed', value: `${c.speed}` },
  ];
  return { name: count === 1 ? c.name : c.plural, creature: id, count, side: 0, rows, notes: [`Level ${tierOf(id)} of 3`, ...traitsOf(id)] };
}

/** The traits a creature shows as abilities, a line each (the card's notes without its level). */
export const traitList = (id: CreatureId): string[] => traitsOf(id);

/** What a row compares: a unit stat, or what one costs. */
export type CompareStat = StatName | 'cost';

/** One stat of an upgrade: before and after as shown, whether it changed, and whether the change is for the better. */
export interface UpgradeRow {
  readonly stat: CompareStat;
  readonly label: string;
  readonly before: string;
  readonly after: string;
  readonly changed: boolean;
  readonly better: boolean;
}

const damageText = (id: CreatureId): string => {
  const c = creature(id);
  return c.minDmg === c.maxDmg ? `${c.minDmg}` : `${c.minDmg}\u2013${c.maxDmg}`;
};

function numberRow(stat: StatName, label: string, a: number, b: number): UpgradeRow {
  return { stat, label, before: `${a}`, after: `${b}`, changed: a !== b, better: b > a };
}

/** A dearer unit is not better: only a cheaper one (no resource dearer, some cheaper) is. */
function costRow(a: CreatureId, b: CreatureId): UpgradeRow {
  const ca = creature(a).cost;
  const cb = creature(b).cost;
  const keys = [...new Set([...Object.keys(ca), ...Object.keys(cb)])] as (keyof typeof ca)[];
  const less = keys.some((k) => (cb[k] ?? 0) < (ca[k] ?? 0));
  const more = keys.some((k) => (cb[k] ?? 0) > (ca[k] ?? 0));
  return { stat: 'cost', label: 'Cost', before: describeAmount(ca), after: describeAmount(cb), changed: less || more, better: less && !more };
}

/** The stats of `from` against `to` (a unit and the one it grows into), with what improved. Shots only when either shoots. */
export function upgradeInfo(from: CreatureId, to: CreatureId): UpgradeRow[] {
  const a = creature(from);
  const b = creature(to);
  const sa = a.shots ?? 0;
  const sb = b.shots ?? 0;
  const shots: UpgradeRow[] = sa || sb ? [{ stat: 'shots', label: 'Shots', before: sa ? `${sa}` : '\u2013', after: sb ? `${sb}` : '\u2013', changed: sa !== sb, better: sb > sa }] : [];
  return [
    numberRow('attack', 'Attack', a.attack, b.attack),
    numberRow('defense', 'Defense', a.defense, b.defense),
    ...shots,
    { stat: 'damage', label: 'Damage', before: damageText(from), after: damageText(to), changed: damageText(from) !== damageText(to), better: b.minDmg + b.maxDmg > a.minDmg + a.maxDmg },
    numberRow('health', 'Health', a.hp, b.hp),
    numberRow('speed', 'Speed', a.speed, b.speed),
    costRow(from, to),
  ];
}

/** The abilities `to` has that `from` has not. */
export function newTraits(from: CreatureId, to: CreatureId): string[] {
  const had = new Set(traitsOf(from));
  return traitsOf(to).filter((t) => !had.has(t));
}

/** The level of a line below `id`, or null for a base unit. */
export function previousUnit(id: CreatureId): CreatureId | null {
  const t = tierOf(id);
  return t > 1 ? lineUnits(lineOf(id))[t - 2] ?? null : null;
}

/** What a dwelling's card shows: the unit it hires, and (for an upgrade) the unit it replaces. */
export interface DwellingPreview {
  readonly kind: 'base' | 'upgrade';
  readonly from: CreatureId | null;
  readonly to: CreatureId;
  readonly rows: readonly UpgradeRow[];
  /** Abilities of the unit (a base unit) or those it gains (an upgrade). */
  readonly notes: readonly string[];
  readonly growth: number;
  /** One unit's cost, as words. */
  readonly cost: string;
}

/** The preview for a building that hires a unit; null for any other building. */
export function dwellingPreview(id: BuildingId): DwellingPreview | null {
  const to = BUILDINGS[id].dwelling;
  if (!to) return null;
  const from = previousUnit(to);
  const growth = creature(lineOf(to)).growth;
  const cost = describeAmount(creature(to).cost);
  if (!from) return { kind: 'base', from: null, to, rows: upgradeInfo(to, to).filter((r) => r.stat !== 'cost'), notes: traitsOf(to), growth, cost };
  return { kind: 'upgrade', from, to, rows: upgradeInfo(from, to), notes: newTraits(from, to), growth, cost };
}
