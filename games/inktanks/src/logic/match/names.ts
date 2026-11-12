import type { Rng } from '../rng';
import type { Taste } from '../loot';
import type { Clan } from './types';

/** Crews are animals; names use plain A–Z letters. */
export const CLAN_CREW: Readonly<Record<Clan, string>> = { boars: 'Boar', weasels: 'Weasel', crows: 'Crow', ink: 'Badger' };

const NAMES: Readonly<Record<Clan, readonly string[]>> = {
  boars: ['Bruno', 'Grunt', 'Tusk', 'Brisket', 'Hogan', 'Moss', 'Bramble', 'Rook', 'Barley', 'Clod'],
  weasels: ['Sly', 'Whisk', 'Nip', 'Dart', 'Flick', 'Pip', 'Zest', 'Twitch', 'Vex', 'Snip'],
  crows: ['Caw', 'Ash', 'Jet', 'Magpie', 'Soot', 'Pick', 'Inky', 'Scrap', 'Glint', 'Rattle'],
  ink: ['Bramwell', 'Otto', 'Hazel', 'Nettle', 'Quill'],
};

export const CLAN_TASTE: Readonly<Record<Clan, Taste>> = {
  boars: { heavy: 3, medium: 1.5, light: 0.4, tracks: 3, halftracks: 1.5, wheels: 0.4, cannon: 2, rockets: 2, machinegun: 0.6 },
  weasels: { light: 3, medium: 1, heavy: 0.3, wheels: 3, halftracks: 1, tracks: 0.3, machinegun: 3, cannon: 1, rockets: 0.6 },
  crows: {},
  ink: {},
};

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
