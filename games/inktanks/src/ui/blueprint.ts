import { affordableUpgrades } from '../logic/blueprints';
import type { Progress } from '../logic/workshop';
import type { Family } from '../logic/parts';
import { bpUrl, pickupUrl } from '../render/pickupArt';

/**
 * The blueprint icon (the blue sheet the enemies drop) as HTML, and the
 * pieces built on it: an amount, and the Workshop button with its badge of
 * upgrades you can afford. Every amount and cost the player sees uses these,
 * never a bare number. (Code calls them intel; the player calls them blueprints.)
 */
export function bpIcon(family?: Family): string {
  const url = family ? bpUrl(family) : pickupUrl('intel');
  return url ? `<img class="bp" src="${url}" alt="blueprints">` : '<i class="bp txt">BP</i>';
}

/** "[icon] 5" with that family's own icon when given (generic for totals), or "+5 [icon]" with `plus`. */
export const bpAmount = (n: number, plus = false, family?: Family): string => `<span class="bpn">${plus ? `+${n} ` : ''}${bpIcon(family)}${plus ? '' : ` ${n}`}</span>`;

/** The Workshop button; with a badge when upgrades are affordable, and a pulse when `pulse`. */
export function workshopButton(p: Progress, extra = ''): string {
  const n = affordableUpgrades(p).length;
  const badge = n > 0 ? `<b class="badge" title="${n} upgrade${n === 1 ? '' : 's'} you can afford">${n}</b>` : '';
  return `<button class="btn ${n > 0 ? 'gold' : ''} ${extra}${n > 0 ? ' ready' : ''} wsbtn" data-act="workshop">Workshop${badge}</button>`;
}
