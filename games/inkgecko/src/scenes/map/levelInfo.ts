import type { LevelDef } from '../../level/types';
import { CHARM_NAMES } from '../../logic/charms';

/** How the gecko plays a level, in a few words for its card. */
export function shooterLine(level: LevelDef): string {
  const tracks = level.tracks.length > 1 ? `${level.tracks.length} lines` : 'one line';
  const how = level.shooter.kind === 'rail' ? 'runs along a branch' : level.shooter.kind === 'hop' ? `hops between ${level.shooter.pads.length} lily pads` : 'turns to aim';
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
  if (!kinds.has(level.shooter.kind)) out.push(level.shooter.kind === 'rail' ? 'A branch to run along' : level.shooter.kind === 'hop' ? 'Lily pads to hop between' : 'Standing still to aim');
  if (level.tracks.length > 1 && !earlier.some((l) => l.tracks.length > 1)) out.push('Two lines at once');
  if (level.tracks.some((t) => t.tunnels?.length) && !earlier.some((l) => l.tracks.some((t) => t.tunnels?.length))) out.push('Tunnels');
  const most = Math.max(...earlier.map((l) => l.colours));
  if (level.colours > most) out.push(`${level.colours} colours`);
  const seen = new Set(earlier.flatMap((l) => l.charms));
  for (const c of level.charms) if (!seen.has(c)) out.push(`${CHARM_NAMES[c]} charm`);
  return out;
}
