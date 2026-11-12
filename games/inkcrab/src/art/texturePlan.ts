import type { BirdSpecies } from '../logic/birds';
import { BEACH_FINDS, type FindId } from '../logic/finds';
import { FOOD_KINDS } from '../logic/items';
import { SHELL_KINDS, type ShellKind } from '../logic/shells';
import type { BeachSetup } from '../logic/sim';
import { SPECIES, type SpeciesId } from '../logic/species';
import { THEME_BOATS, THEME_MOVERS, THEMES, type ThemeId } from './backdrop';
import { BUTTON_ICONS } from './buttonArt';
import { BOIL } from './palette';

/**
 * Every texture key the game draws, and which of them a screen needs. Pure:
 * textures.ts bakes what these name, so the boot draws only what its first
 * screen shows and each level draws its own beach when it starts.
 */
export const TEX = {
  crabBack: (f: number) => `crab-back-${f}`,
  crabFront: (f: number) => `crab-front-${f}`,
  nakedBack: (f: number) => `naked-back-${f}`,
  nakedFront: (f: number) => `naked-front-${f}`,
  /** `danger`: inked red, for one that can eat you. */
  critter: (species: string, danger: boolean, f: number) => `critter-${species}-${danger ? 'red' : 'blue'}-${f}`,
  /** A heron with no neck or head, for the strike (the view draws the neck stretched out). */
  heronStrike: (danger: boolean, f: number) => `critter-heron-strike-${danger ? 'red' : 'blue'}-${f}`,
  /** A bird hovering (wings by frame) or stooping. */
  bird: (species: string, dive: boolean, danger: boolean, f: number) => `bird-${species}-${dive ? 'dive' : 'hover'}-${danger ? 'red' : 'blue'}-${f}`,
  shell: (kind: string, f: number) => `shell-${kind}-${f}`,
  food: (kind: string, f: number) => `food-${kind}-${f}`,
  /** A beach's find, for a dig-up mission. */
  find: (find: FindId, f: number) => `find-${find}-${f}`,
  highlight: (f: number) => `hl-${f}`,
  puff: (f: number) => `puff-${f}`,
  /** A touch button's sign (see buttonArt.ts). */
  button: (icon: string) => `button-${icon}`,
  /** Plain paper: no ruled lines anywhere in the game. */
  paper: 'paper',
  backdrop: (theme: string, layer: string) => `backdrop-${theme}-${layer}`,
  boat: (theme: string, i: number) => `boat-${theme}-${i}`,
  /** A frame of something moving in a backdrop: a flock, the seaplane, the fisherman. */
  mover: (theme: string, i: number, f: number) => `mover-${theme}-${i}-${f}`,
} as const;

/** Birds that hover and stoop; the gull only flies over (drawn as a critter that takes off). */
export const HUNTING_BIRDS: readonly BirdSpecies[] = ['kestrel', 'hawk', 'kingfisher', 'osprey', 'brahminy', 'snowyowl'];

const frames = (key: (f: number) => string): string[] => Array.from({ length: BOIL }, (_, f) => key(f));

/** The player's crab, the paper, the HUD's signs, food, finds and puffs: small, and on nearly every screen. */
export function coreKeys(): string[] {
  return [
    TEX.paper,
    ...BUTTON_ICONS.map((icon) => TEX.button(icon)),
    ...frames(TEX.crabBack), ...frames(TEX.crabFront), ...frames(TEX.nakedBack), ...frames(TEX.nakedFront),
    ...frames(TEX.puff), ...frames(TEX.highlight),
    ...FOOD_KINDS.flatMap((kind) => frames((f) => TEX.food(kind, f))),
    ...BEACH_FINDS.flatMap((find) => frames((f) => TEX.find(find, f))),
    // The periwinkle every crab starts in, shown on the map and the HUD too.
    ...shellKeys('periwinkle'),
  ];
}

/** A beach theme's backdrop: its parallax layers, boats and the frames of what moves in it. */
export function themeKeys(theme: ThemeId): string[] {
  return [
    ...THEMES[theme].map((layer) => TEX.backdrop(theme, layer.id)),
    ...THEME_BOATS[theme].map((_, i) => TEX.boat(theme, i)),
    ...THEME_MOVERS[theme].flatMap((m, i) => Array.from({ length: m.frames }, (_, f) => TEX.mover(theme, i, f))),
  ];
}

/** A creature's frames, blue and red; a heron's strike, and a gull's flight, with it. */
export function speciesKeys(species: SpeciesId): string[] {
  const keys = [false, true].flatMap((danger) => frames((f) => TEX.critter(species, danger, f)));
  if (species === 'heron') keys.push(...[false, true].flatMap((danger) => frames((f) => TEX.heronStrike(danger, f))));
  if (species === 'gull') keys.push(...[false, true].flatMap((danger) => frames((f) => TEX.bird('gull', false, danger, f))));
  return keys;
}

/** A hunting bird's frames: hovering and stooping, blue and red. */
export function birdKeys(species: BirdSpecies): string[] {
  return [false, true].flatMap((dive) => [false, true].flatMap((danger) => frames((f) => TEX.bird(species, dive, danger, f))));
}

export function shellKeys(kind: ShellKind): string[] {
  return frames((f) => TEX.shell(kind, f));
}

/** Every shell kind a beach can show: lying about, washed in by the tide, worn by a rival or a recruit, or on its ladder. */
export function setupShellKinds(setup: BeachSetup): Set<ShellKind> {
  const kinds = new Set<ShellKind>();
  if (setup.startShell) kinds.add(setup.startShell.kind);
  for (const item of setup.items) if (item.kind.type === 'shell') kinds.add(item.kind.shell.kind);
  for (const [kind] of setup.tideBrings?.shells ?? []) kinds.add(kind);
  for (const [kind] of setup.rivals ?? []) kinds.add(kind);
  for (const [kind] of setup.recruits ?? []) kinds.add(kind);
  for (const shell of setup.ladder ?? []) kinds.add(shell.kind);
  return kinds;
}

/** Every creature a beach keeps about or marks for a mission. */
export function setupSpecies(setup: BeachSetup): Set<SpeciesId> {
  const species = new Set<SpeciesId>();
  for (const g of setup.critters ?? []) species.add(g.species ?? 'ghostcrab');
  for (const m of setup.marked ?? []) species.add(m.species);
  return species;
}

/** Everything a level draws beyond the core: its theme's backdrop, its creatures, birds and shells. */
export function levelKeys(setup: BeachSetup, theme: ThemeId): string[] {
  const birds = new Set<BirdSpecies>((setup.birds ?? []).map((g) => g.species ?? 'kestrel'));
  return [...new Set([
    ...themeKeys(theme),
    ...[...setupSpecies(setup)].flatMap(speciesKeys),
    ...[...birds].flatMap(birdKeys),
    ...[...setupShellKinds(setup)].flatMap(shellKeys),
  ])];
}

/** Every key there is, for the catalog's tests. */
export function allKeys(): string[] {
  return [...new Set([
    ...coreKeys(),
    ...(Object.keys(THEMES) as ThemeId[]).flatMap(themeKeys),
    ...SHELL_KINDS.flatMap(shellKeys),
    ...(Object.keys(SPECIES) as SpeciesId[]).flatMap(speciesKeys),
    ...HUNTING_BIRDS.flatMap(birdKeys),
  ])];
}
