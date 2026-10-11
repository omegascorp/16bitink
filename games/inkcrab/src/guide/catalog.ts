import type { BirdSpecies } from '../logic/birds';
import { SHELLS, type ShellKind } from '../logic/shells';
import { SPECIES, type SpeciesId } from '../logic/species';
import { START_SHELL } from '../level/goal';
import type { LevelDef } from '../level/types';
import type { CreatureId } from './types';

/** Birds have no species card in the sim, so their names live here. */
const BIRD_NAMES: Readonly<Record<BirdSpecies, string>> = {
  kestrel: 'kestrel', hawk: 'hawk', kingfisher: 'kingfisher', osprey: 'osprey', brahminy: 'Brahminy kite', snowyowl: 'snowy owl',
};

/** Defaults the sim fills in when a level leaves them out (see sim.ts). */
const DEFAULT_FRY: SpeciesId = 'slater';
const DEFAULT_CRITTER: SpeciesId = 'ghostcrab';
const DEFAULT_BIRD: BirdSpecies = 'kestrel';
/** The hermit crab you play, listed first. */
const PLAYER: SpeciesId = 'hermit';

/** Shells share the save's met list with creatures, so they carry a prefix there. */
export const SHELL_SEEN = 'shell:';
export const shellSeenId = (kind: ShellKind): string => `${SHELL_SEEN}${kind}`;

/** One page of the field guide: a beach's creatures (in the order they turn up, birds last) and its shells. */
export interface GuidePage {
  /** 1-based, as on the map. */
  readonly beach: number;
  readonly creatures: readonly CreatureId[];
  readonly shells: readonly ShellKind[];
}

export const isBird = (id: CreatureId): id is BirdSpecies => Object.hasOwn(BIRD_NAMES, id);

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const creatureName = (id: CreatureId): string => capital(isBird(id) ? BIRD_NAMES[id] : SPECIES[id].name);
export const shellName = (kind: ShellKind): string => capital(SHELLS[kind].name);

function levelCreatures(def: LevelDef): CreatureId[] {
  const ground: CreatureId[] = [def.fry ?? DEFAULT_FRY, ...(def.critters ?? []).map((g) => g.species ?? DEFAULT_CRITTER)];
  if (def.rivals?.length) ground.push(PLAYER);
  return [...ground, ...(def.birds ?? []).map((g) => g.species ?? DEFAULT_BIRD)];
}

function levelShells(def: LevelDef): ShellKind[] {
  return [
    ...def.shells.map(([kind]) => kind),
    ...(def.tideBrings?.shells ?? []).map(([kind]) => kind),
    ...(def.rivals ?? []).map(([kind]) => kind),
  ];
}

/** Keeps the first time each id turns up, dropping any already listed on an earlier page. */
function firstSeen<T>(ids: readonly T[], listed: Set<T>): T[] {
  return ids.filter((id) => !listed.has(id) && Boolean(listed.add(id)));
}

/** The field guide's pages, one per beach the player has: each creature and shell under the first beach it lives on. */
export function guidePages(beaches: readonly (readonly LevelDef[])[]): GuidePage[] {
  const creatures = new Set<CreatureId>();
  const shells = new Set<ShellKind>();
  return beaches.map((levels, i) => {
    const found = levels.flatMap(levelCreatures);
    // Ground creatures first, then the birds, each in the order they turn up.
    const ordered = [...found.filter((id) => !isBird(id)), ...found.filter(isBird)];
    const first = i === 0 ? [PLAYER, ...ordered] : ordered;
    const shellList = i === 0 ? [START_SHELL.kind, ...levels.flatMap(levelShells)] : levels.flatMap(levelShells);
    return { beach: i + 1, creatures: firstSeen(first, creatures), shells: firstSeen(shellList, shells) };
  });
}

export interface GuideProgress {
  readonly met: number;
  readonly total: number;
  /** Rounded down, so 100 means everything on the page is met. */
  readonly percent: number;
}

/** How much of a list you've met, given the met ids in the same form (creature ids, or shellSeenId). */
export function guideProgress(ids: readonly string[], seen: ReadonlySet<string>): GuideProgress {
  const met = ids.filter((id) => seen.has(id)).length;
  return { met, total: ids.length, percent: ids.length ? Math.floor((met / ids.length) * 100) : 0 };
}
