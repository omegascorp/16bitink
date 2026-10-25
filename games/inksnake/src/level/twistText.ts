import { BOSS_ENTRIES, ENEMY_ENTRIES } from '../logic/chapters/index';
import { preyPlural, preySpec } from '../logic/prey';
import type { LevelDef } from './types';

/** How a level's twist is told: a few words on its card, a hint as it starts, and a tip after a loss. */
export interface TwistText {
  readonly card: string;
  readonly hint: string;
  readonly tip: string;
}

/** The twists a level has, worded three ways (its goal first, then its boss and enemies, then the rest). */
export function twistTexts(level: LevelDef): TwistText[] {
  const out: TwistText[] = [];
  const g = level.goal;
  if (g?.kind === 'rush') out.push({ card: `Grow within ${g.seconds} seconds`, hint: `${g.seconds} seconds to grow!`, tip: 'On the clock, don\'t chase one meal round the board: turn to the nearest one.' });
  if (g?.kind === 'feast') {
    const name = g.count === 1 ? preySpec(g.food).name : preyPlural(g.food);
    out.push({ card: `Also eat ${g.count} ${name}`, hint: `Eat ${g.count} ${name}, and grow`, tip: `Only the ringed ${preyPlural(g.food)} count: go for those first.` });
  }
  const boss = level.boss ? BOSS_ENTRIES[level.boss.kind] : undefined;
  if (boss) out.push({ card: boss.text.card, hint: boss.text.hint, tip: boss.text.tip });
  const kinds = [...new Set((level.enemies ?? []).map((e) => e.kind))];
  for (const k of kinds) {
    const t = ENEMY_ENTRIES[k]?.text;
    if (t) out.push({ card: t.card, hint: t.hint, tip: t.tip });
  }
  if (level.lives === 1) out.push({ card: 'One life', hint: 'One life: careful!', tip: 'With one life, leave yourself room: wide turns, and never cut across your own body.' });
  if (level.dark) out.push({ card: 'Night', hint: 'Night falls', tip: 'At night, keep to the open middle: things in the dark come at you slowly.' });
  return out;
}
