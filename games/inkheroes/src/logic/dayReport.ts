import { isCreatureId, type CreatureId } from './creatures';
import { RESOURCES, type Purse } from './resources';

/** Where a day's gold comes from. */
export const SOURCE_KINDS = ['town', 'mines', 'estates'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export interface GoldSource {
  readonly kind: SourceKind;
  readonly label: string;
  readonly gold: number;
}

/** One town's new week: the recruits each of its dwellings gained. */
export interface TownRecruits {
  readonly town: string;
  readonly units: readonly { readonly creature: CreatureId; readonly count: number }[];
}

/** What the night brought, for the card that opens the day. */
export interface DayReport {
  /** All that came in. */
  readonly income: Purse;
  /** The gold by source, the card's bars. */
  readonly sources: readonly GoldSource[];
  /** The picked hero (`id` for their face; older saves have none); `tiles` counts today's `horses` from the Stables; `gained` is the mana back overnight. */
  readonly hero: { readonly id?: string; readonly name: string; readonly tiles: number; readonly horses: number; readonly mana: number; readonly maxMana: number; readonly gained: number };
  /** The first day of a week. */
  readonly week?: { readonly recruits: readonly TownRecruits[] };
}

/** The most rows of anything a saved report can hold. */
const MAX_ROWS = 32;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, max = 1e9): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const isLabel = (v: unknown): v is string => typeof v === 'string' && v.length <= 60;
const rows = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= MAX_ROWS;

const isPurse = (v: unknown): v is Purse => isObj(v) && RESOURCES.every((r) => isInt(v[r]));
const isSource = (v: unknown): v is GoldSource => isObj(v) && (SOURCE_KINDS as readonly unknown[]).includes(v.kind) && isLabel(v.label) && isInt(v.gold);
const isHero = (v: unknown): v is DayReport['hero'] => isObj(v) && isLabel(v.name) && [v.tiles, v.horses, v.mana, v.maxMana, v.gained].every((n) => isInt(n, 1e6));
const isUnit = (v: unknown): boolean => isObj(v) && isCreatureId(v.creature) && isInt(v.count, 1e6);
const isRecruits = (v: unknown): v is TownRecruits => isObj(v) && isLabel(v.town) && rows(v.units) && v.units.every(isUnit);
const isWeek = (v: unknown): v is NonNullable<DayReport['week']> => isObj(v) && rows(v.recruits) && v.recruits.every(isRecruits);

/** A saved report, or undefined if it isn't one (the card then shows the prompt's text). */
export function parseDayReport(raw: unknown): DayReport | undefined {
  if (!isObj(raw) || !isPurse(raw.income) || !rows(raw.sources) || !raw.sources.every(isSource) || !isHero(raw.hero)) return undefined;
  if (raw.week !== undefined && !isWeek(raw.week)) return undefined;
  return raw as unknown as DayReport;
}
