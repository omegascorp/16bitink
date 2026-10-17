import { recipeOf, salvageOf } from './blueprints';
import type { Profile } from './economy';
import type { Hold } from './hold';
import { isTool, TOOL_KINDS } from './tools';

/**
 * What a broken part teaches, whatever it is: a gear piece at its mark
 * (blueprints.ts), or a tool (tools.ts; the Aster's pulse). One place for
 * a design's name and its salvage, so a wreck needn't care which.
 */
export const isDesign = (id: string): boolean => recipeOf(id) !== undefined || isTool(id);

/** A design learnt (by studying a broken part): a gear mark or a tool, listed once, if it's a real one. */
export function findBlueprint(p: Profile, id: string): Profile {
  return isDesign(id) && !p.found.includes(id) ? { ...p, found: [...p.found, id] } : p;
}

/**
 * The designs of broken parts a world save lists as taken, learnt if they
 * somehow aren't: a part studied when its design couldn't yet be recorded
 * (Oct 17, 2026: the Aster's resonator) is gone from the world for good.
 */
export function learnTaken(p: Profile, items: readonly { readonly id: string; readonly blueprint?: string }[], taken: readonly string[]): Profile {
  return items.filter((it) => it.blueprint && taken.includes(it.id)).reduce((q, it) => findBlueprint(q, it.blueprint!), p);
}

/** "Drill Mk 2", or a tool's name; null for no design. */
export function designName(id: string): string | null {
  const r = recipeOf(id);
  if (r) return `${r.piece[0]!.toUpperCase()}${r.piece.slice(1)} Mk ${r.mk}`;
  return isTool(id) ? TOOL_KINDS[id].name : null;
}

/** What taking a broken one apart gives back: half of what it takes to print, at least one of each. */
export function designSalvage(id: string): Hold {
  if (recipeOf(id)) return salvageOf(id);
  if (!isTool(id)) return {};
  return Object.fromEntries(Object.entries(TOOL_KINDS[id].recipe).map(([ore, n]) => [ore, Math.max(1, Math.floor((n ?? 0) / 2))]));
}
