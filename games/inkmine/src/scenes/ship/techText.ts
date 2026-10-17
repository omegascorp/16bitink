import { PLANETS } from '../../level/planets';
import type { Piece } from '../../logic/gear';
import { countOf, holdEntries, type Hold } from '../../logic/hold';
import { ORES } from '../../logic/ore';
import { REPAIRS } from '../../logic/repairs';
import { MODULES } from '../../logic/ship';
import type { Tech } from '../../logic/tech';
import { TOOL_KINDS } from '../../logic/tools';

export const PIECE_NAMES: Readonly<Record<Piece, string>> = { drill: 'Drill', cell: 'Cell', pack: 'Pack', suit: 'Suit', helmet: 'Helmet', jetpack: 'Jetpack' };

export function techName(t: Tech): string {
  if (t.kind === 'gear') return PIECE_NAMES[t.piece];
  if (t.kind === 'module') return MODULES[t.key].name;
  if (t.kind === 'tool') return TOOL_KINDS[t.id].name;
  return REPAIRS[t.id].name;
}

/** Where each blueprint is learnt: which planet's world has a broken one to study. */
function blueprintSources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const planet of PLANETS) for (const it of planet.world.items) if (it.blueprint) out.set(it.blueprint, `study a broken one; there's one somewhere on ${planet.name}`);
  return out;
}
export const SOURCES = blueprintSources();

/** A recipe with what's on hand ticked off: "graphite 3/4 · native copper 6/6 ✓". */
export function recipeLine(need: Hold, have: Hold): string {
  return holdEntries(need).map(([ore, n]) => {
    const got = Math.min(countOf(have, ore), n);
    return `${ORES[ore].name} ${got}/${n}${got >= n ? ' ✓' : ''}`;
  }).join(' · ');
}
