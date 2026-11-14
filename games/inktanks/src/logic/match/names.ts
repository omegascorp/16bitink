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
