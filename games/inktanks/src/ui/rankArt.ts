import type { RankDef, RankId } from '../logic/rank';
import { esc } from './dom';

/**
 * Shoulder boards, one per rank (owner, Nov 14: "proper shoulder straps for
 * each military rank"), built by dev/pixel/straps.py from generated pieces:
 * enlisted ranks wear gold bars across a plain olive board, officers a
 * lengthwise stripe with small stars (one stripe) or big stars (two), and
 * the two top ranks a gold-braided board with big stars. `<id>.png` stands
 * up as worn; `<id>-h.png` lies flat for a line of text.
 */
const urls = import.meta.glob<string>('../art/pixel/ui/straps/*.png', { eager: true, query: '?url', import: 'default' });
const byName = new Map(Object.entries(urls).map(([p, u]) => [p.slice(p.lastIndexOf('/') + 1, -4), u]));

/** The board's image URL: lying flat (for text lines) or standing (the promotion). */
export function strapUrl(id: RankId, standing = false): string | null {
  return byName.get(standing ? id : `${id}-h`) ?? null;
}

/** "[board] Lieutenant": the rank line used across the screens. */
export function rankLine(rank: RankDef, extra = ''): string {
  const url = strapUrl(rank.id);
  const badge = url ? `<img class="strap" src="${url}" alt="">` : '<i></i>';
  return `<span class="rank">${badge}${esc(rank.name)}${extra}</span>`;
}

/** The standing board, big, for the promotion moment. */
export function strapBig(rank: RankDef): string {
  const url = strapUrl(rank.id, true);
  return url ? `<img class="strap big hide-short" src="${url}" alt="${esc(rank.name)} shoulder board">` : '';
}
