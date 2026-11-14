import type { Rng } from '../rng';
import type { Clan } from './types';

/** Crews are animals; names use plain A–Z letters. */
export const CLAN_CREW: Readonly<Record<Clan, string>> = { boars: 'Boar', weasels: 'Weasel', crows: 'Crow', ink: 'Badger' };

const NAMES: Readonly<Record<Clan, readonly string[]>> = {
  boars: ['Bruno', 'Grunt', 'Tusk', 'Brisket', 'Hogan', 'Moss', 'Bramble', 'Rook', 'Barley', 'Clod'],
  weasels: ['Sly', 'Whisk', 'Nip', 'Dart', 'Flick', 'Pip', 'Zest', 'Twitch', 'Vex', 'Snip'],
  crows: ['Caw', 'Ash', 'Jet', 'Magpie', 'Soot', 'Pick', 'Inky', 'Scrap', 'Glint', 'Rattle'],
  ink: ['Bramwell', 'Otto', 'Hazel', 'Nettle', 'Quill'],
};

/** How the briefing names a faction and says who they are. */
export const CLAN_INFO: Readonly<Record<Clan, { readonly name: string; readonly blurb: string }>> = {
  boars: { name: 'Boars', blurb: 'heavy, slow tanks with big guns' },
  weasels: { name: 'Weasels', blurb: 'fast scouts on wheels' },
  crows: { name: 'Crows', blurb: 'scavengers who loot everything' },
  ink: { name: 'Ink Brigade', blurb: 'your own side' },
};

/** The one faction a level is against: every enemy in a level shares a clan (checked when it loads). */
export function rivalOf(enemies: readonly { readonly clan: Clan }[]): Clan {
  return enemies[0]?.clan ?? 'boars';
}

/** Team stripe colours (the player is ink blue). */
export const CLAN_COLOUR: Readonly<Record<Clan, number>> = { boars: 0xa8442c, weasels: 0xc9a23a, crows: 0x4a4458, ink: 0x3c6cc8 };

export function crewName(rng: Rng, clan: Clan, used: Set<string>): string {
  const list = NAMES[clan];
  for (let i = 0; i < 20; i++) {
    const n = rng.pick(list);
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  const n = `${rng.pick(list)} ${used.size}`;
  used.add(n);
  return n;
}
