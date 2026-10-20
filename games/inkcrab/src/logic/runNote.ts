import type { Beach } from './sim';

/**
 * How far a run got, in a few words for the site's stats, so the levels
 * players give up on show where they stopped: "size 3/4 full, finds 1/3".
 * "full" means its shell is full and it needs the next one.
 */
export function runNote(beach: Beach): string {
  const c = beach.crab;
  const m = beach.mission;
  const p = beach.progress;
  const parts = [`size ${c.growth.size}/${beach.goal ?? '?'}${beach.capped && !p.grown ? ' full' : ''}`];
  if (m.finds) parts.push(`finds ${p.finds}/${m.finds}`);
  if (m.marked) parts.push(`marked ${p.marked}/${m.marked.count}`);
  if (m.giant) parts.push(p.giant ? 'giant eaten' : 'giant left');
  if (m.chain) parts.push(p.chained ? 'chain done' : 'chain open');
  return parts.join(', ');
}
