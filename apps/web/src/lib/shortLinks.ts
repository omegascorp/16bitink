/**
 * Short paths to type from a video, where links can't go: 16bit.ink/fish
 * opens InkFish's page. The visit is tagged `?via=fish`, so the stats can
 * tell typed-in viewers from a video apart from every other direct visit.
 */

import { GAMES } from '../data/games';

const VIA = /^[a-z0-9-]{1,20}$/;

/** Where a short path leads ("/fish" → "/games/inkfish?via=fish"), or null when it isn't one. */
export function shortLinkTarget(pathname: string): string | null {
  const short = pathname.toLowerCase().replace(/^\/|\/$/g, '');
  if (!short || short.includes('/')) return null;
  const game = GAMES.find((g) => g.status === 'playable' && g.short === short);
  return game ? `/games/${game.slug}?via=${short}` : null;
}

export interface PageviewContext {
  readonly referrer: string;
  readonly hostname: string;
  readonly search: string;
}

/**
 * Where a page view came from: the short link typed ("16bit.ink/fish"),
 * else the other site's host only, else nothing (typed in, an app or a bookmark).
 */
export function pageviewRef({ referrer, hostname, search }: PageviewContext): string | undefined {
  const via = new URLSearchParams(search).get('via');
  if (via && VIA.test(via)) return `16bit.ink/${via}`;
  try {
    const host = referrer ? new URL(referrer).hostname : '';
    return host && host !== hostname ? host.slice(0, 100) : undefined;
  } catch {
    return undefined;
  }
}
