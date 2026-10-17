/**
 * What a resource is still wanted for, for the cargo card aboard: the
 * repairs not yet done, the Lamplighters' trade while they wait for it,
 * the next mark of each gear piece whose blueprint is found, the tools not
 * yet printed and the next level of each module.
 */
import { nextMark } from './blueprints';
import type { Profile } from './economy';
import { PIECES } from './gear';
import { countOf, type Hold } from './hold';
import type { OreKey } from './ore';
import { REPAIR_IDS, REPAIRS } from './repairs';
import { MODULE_KEYS, nextRecipe } from './ship';
import { hasBeat, TRADE } from './story';
import type { Tech } from './tech';
import { canPrintTool, TOOL_KINDS, TOOLS } from './tools';

export type OreNeed =
  | { readonly kind: 'tech'; readonly tech: Tech; readonly n: number; readonly mk?: number }
  | { readonly kind: 'trade'; readonly n: number };

/** Each place `ore` is still wanted, repairs first, with how many pieces each takes. */
export function oreNeeds(p: Profile, ore: OreKey): readonly OreNeed[] {
  const of = (h: Hold | null): number => (h ? countOf(h, ore) : 0);
  const repairs = REPAIR_IDS.filter((id) => !p.repaired.includes(id))
    .map((id): OreNeed => ({ kind: 'tech', tech: { kind: 'repair', id }, n: of(REPAIRS[id].needs) }));
  const trade: OreNeed[] = hasBeat(p, 'met') && !hasBeat(p, 'paid') ? [{ kind: 'trade', n: of(TRADE) }] : [];
  const gear = PIECES.flatMap((piece): OreNeed[] => {
    const r = nextMark(piece, p.found, p.gear);
    return r && p.found.includes(r.id) ? [{ kind: 'tech', tech: { kind: 'gear', piece }, mk: r.mk, n: of(r.materials) }] : [];
  });
  const tools = TOOLS.filter((t) => !['have', 'nothing'].includes(canPrintTool(p, t)))
    .map((id): OreNeed => ({ kind: 'tech', tech: { kind: 'tool', id }, n: of(TOOL_KINDS[id].recipe) }));
  const modules = MODULE_KEYS.map((key): OreNeed => ({ kind: 'tech', tech: { kind: 'module', key }, n: of(nextRecipe(p.ship, key)) }));
  return [...repairs, ...trade, ...gear, ...tools, ...modules].filter((need) => need.n > 0);
}
