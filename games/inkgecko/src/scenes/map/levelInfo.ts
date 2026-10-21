import type { Place } from '../../level/levels';
import type { LevelDef } from '../../level/types';
import { CHARM_NAMES } from '../../logic/charms';

/** What the gecko hops between in each place. */
const PADS: Readonly<Record<Place, string>> = {
  garden: 'stepping stones', pond: 'lily pads', greenhouse: 'upturned saucers', orchard: 'tree stumps', rockery: 'stepping stones',
  allotment: 'upturned buckets', meadow: 'millstones', barn: 'hay bales', ruins: 'fallen column drums', night: 'moonlit stones',
};

/** How the gecko plays a level, in a few words for its card. */
export function shooterLine(level: LevelDef, place: Place): string {
  const tracks = level.tracks.length > 1 ? `${level.tracks.length} lines` : 'one line';
  const how = level.shooter.kind === 'rail' ? 'runs along a branch' : level.shooter.kind === 'hop' ? `hops between ${level.shooter.pads.length} ${PADS[place]}` : 'turns to aim';
  return `The gecko ${how} · ${tracks} · ${level.colours} colours`;
}

/**
 * What a level brings that no level before it did: a way of standing, a
 * second line, tunnels, another colour, a charm. Empty for more of the same.
 */
export function whatsNew(level: LevelDef, earlier: readonly LevelDef[]): string[] {
  if (earlier.length === 0) return ['Your first level'];
  const out: string[] = [];
  const kinds = new Set(earlier.map((l) => l.shooter.kind));
  if (!kinds.has(level.shooter.kind)) out.push(level.shooter.kind === 'rail' ? 'A branch to run along' : level.shooter.kind === 'hop' ? 'Pads to hop between' : 'Standing still to aim');
  if (level.tracks.length > 1 && !earlier.some((l) => l.tracks.length > 1)) out.push('Two lines at once');
  const first = (has: (l: LevelDef) => boolean, label: string): void => {
    if (has(level) && !earlier.some(has)) out.push(label);
  };
  first((l) => l.tracks.some((t) => t.tunnels?.length), 'Tunnels');
  first((l) => l.tracks.some((t) => t.raised?.length), 'Crossing lines');
  first((l) => l.fruit === true, 'Windfalls to spit');
  first((l) => (l.buds ?? 0) > 0, 'Buds');
  first((l) => (l.stones ?? 0) > 0, 'Stones');
  first((l) => (l.twine ?? 0) > 0, 'Marbles tied with twine');
  first((l) => (l.chameleons ?? 0) > 0, 'Chameleon marbles');
  first((l) => l.walls === true, 'Walls to bank shots off');
  first((l) => (l.pillars?.length ?? 0) > 0, 'Columns to glance shots off');
  first((l) => l.dark === true, 'Night');
  const most = Math.max(...earlier.map((l) => l.colours));
  if (level.colours > most) out.push(`${level.colours} colours`);
  const seen = new Set(earlier.flatMap((l) => l.charms));
  for (const c of level.charms) if (!seen.has(c)) out.push(`${CHARM_NAMES[c]} charm`);
  return out;
}
