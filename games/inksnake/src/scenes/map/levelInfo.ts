import { BOSS_ENTRIES, ENEMY_ENTRIES } from '../../logic/chapters/index';
import { preyPlural, preySpec } from '../../logic/prey';
import { SNAKE_SPECS } from '../../logic/species';
import type { LevelDef } from '../../level/types';

/** How a level plays, in a few words for its card: the snake, how long to grow, and what there is to eat. */
export function playLine(level: LevelDef): string {
  const food = level.prey.map((p) => preyPlural(p.kind)).join(', ');
  const grow = level.goal?.kind === 'boss' ? 'drive the boss off' : `grow from ${level.length} to ${level.target}`;
  return `The ${SNAKE_SPECS[level.snake].name} · ${grow} · ${food}`;
}

/**
 * What a level brings that no level before it did: a new snake, new prey,
 * a new enemy, a new goal, night, one life. Empty for more of the same.
 */
export function whatsNew(level: LevelDef, earlier: readonly LevelDef[]): string[] {
  if (earlier.length === 0) return ['Your first level'];
  const out: string[] = [];
  if (!earlier.some((l) => l.snake === level.snake)) out.push(`A new snake: the ${SNAKE_SPECS[level.snake].name}`);
  const ate = new Set(earlier.flatMap((l) => l.prey.map((p) => p.kind)));
  for (const p of level.prey) if (!ate.has(p.kind)) out.push(preySpec(p.kind).size > 20 ? `${preyPlural(p.kind)} to coil` : preyPlural(p.kind));
  const met = new Set(earlier.flatMap((l) => (l.enemies ?? []).map((e) => e.kind)));
  for (const e of level.enemies ?? []) if (!met.has(e.kind)) out.push(ENEMY_ENTRIES[e.kind]?.text.name ?? e.kind);
  const first = (has: (l: LevelDef) => boolean, label: string): void => {
    if (has(level) && !earlier.some(has)) out.push(label);
  };
  first((l) => (l.cover?.length ?? 0) > 0, 'Cover to hide under');
  first((l) => l.goal?.kind === 'rush', 'The clock');
  first((l) => l.goal?.kind === 'feast', 'A feast');
  first((l) => l.dark === true, 'Night');
  first((l) => l.lives === 1, 'One life');
  if (level.boss && !earlier.some((l) => l.boss?.kind === level.boss?.kind)) out.push(BOSS_ENTRIES[level.boss.kind]?.text.card ?? 'A boss');
  return [...new Set(out)];
}
