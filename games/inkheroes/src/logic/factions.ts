import { BUILDINGS, BUILDING_IDS, type BuildingDef, type BuildingId } from './buildings';
import { creature, type CreatureId, type TownFaction } from './creatures';
import type { ItemId } from './items';
import type { SpellSchool } from './spells';

/**
 * The peoples who hold towns (chapter 1 the Greeks, `crown`; chapter 2
 * Egypt, `kemet`). Every town builds from the one BUILDINGS tree under the
 * same ids, so saves and maps keep them; a people names the buildings its
 * own way and hires its own unit in each dwelling. Numbers in
 * docs/inkheroes-design.md.
 */
export interface FactionDef {
  readonly name: string;
  /** The unit each of its dwellings hires (the Greeks' are BUILDINGS' own). */
  readonly units: Readonly<Partial<Record<BuildingId, CreatureId>>>;
  /** What it calls a building, where that isn't BUILDINGS' name. */
  readonly names: Readonly<Partial<Record<BuildingId, string>>>;
  /** What a building needs, where that isn't BUILDINGS' (each people's dwellings stand in their own order). */
  readonly needs: Readonly<Partial<Record<BuildingId, readonly BuildingId[]>>>;
  /** What a building does in its words, where that isn't BUILDINGS' (a dwelling says whom it hires). */
  readonly says: Readonly<Partial<Record<BuildingId, string>>>;
  /** Its divine powers: the spellbook's tab of its own. */
  readonly school: SpellSchool;
  /** The spellbook its guild sells. */
  readonly book: ItemId;
}

export const TOWN_FACTIONS = ['crown', 'kemet'] as const satisfies readonly TownFaction[];
export const isTownFaction = (v: unknown): v is TownFaction => typeof v === 'string' && (TOWN_FACTIONS as readonly string[]).includes(v);

const GREEK_UNITS = Object.fromEntries(BUILDING_IDS.flatMap((b) => (BUILDINGS[b].dwelling ? [[b, BUILDINGS[b].dwelling!]] : [])));

export const FACTIONS: Readonly<Record<TownFaction, FactionDef>> = {
  crown: { name: 'the Olympian League', units: GREEK_UNITS, names: {}, needs: {}, says: {}, school: 'olympian', book: 'noviceSpellbook' },
  kemet: {
    name: 'the Two Lands',
    units: {
      guardhouse: 'levy', guardhouse2: 'levy2', guardhouse3: 'levy3',
      archeryRange: 'nubian', archeryRange2: 'nubian2', archeryRange3: 'nubian3',
      griffinTower: 'jackal', griffinTower2: 'jackal2', griffinTower3: 'jackal3',
      barracks: 'chariot', barracks2: 'chariot2', barracks3: 'chariot3',
      monastery: 'mummy', monastery2: 'mummy2', monastery3: 'mummy3',
      tiltyard: 'sphinx', tiltyard2: 'sphinx2', tiltyard3: 'sphinx3',
      seraphSpire: 'bennu', seraphSpire2: 'bennu2', seraphSpire3: 'bennu3',
    },
    names: {
      mageGuild1: 'House of Life', mageGuild2: 'House of Life, 2nd floor', blacksmith: 'Workshop', stables: 'Chariot Road',
      guardhouse: 'Levy Camp', guardhouse2: 'Khopesh Hall', guardhouse3: 'Shardana Barracks',
      archeryRange: 'Archers’ Yard', archeryRange2: 'Medjay Post', archeryRange3: 'Range of Ta-Seti',
      griffinTower: 'Jackal Shrine', griffinTower2: 'Temple of Anubis', griffinTower3: 'Hall of Two Truths',
      barracks: 'Chariot Yard', barracks2: 'Royal Chariot House', barracks3: 'House of Horus',
      monastery: 'House of Embalming', monastery2: 'Per-Nefer', monastery3: 'Valley Tomb',
      tiltyard: 'Sphinx Terrace', tiltyard2: 'Avenue of Sphinxes', tiltyard3: 'Great Sphinx Court',
      seraphSpire: 'Benben Stone', seraphSpire2: 'Obelisk of Heliopolis', seraphSpire3: 'Temple of Ra',
    },
    // Egypt's own order: the jackals guard the levies' camp, the chariots come after them, the embalmers serve Anubis, and the Bennu needs Osiris's temple.
    needs: {
      archeryRange: ['guardhouse'],
      griffinTower: ['guardhouse'],
      barracks: ['griffinTower'],
      stables: ['barracks'],
      monastery: ['mageGuild1', 'griffinTower'],
      tiltyard: ['monastery'],
      seraphSpire: ['tiltyard', 'templeOsiris'],
    },
    says: {
      mageGuild1: 'Teaches 3 level-1 spells; sells a papyrus of spells',
      blacksmith: 'Sells siege engines, which break town walls',
    },
    school: 'rites',
    book: 'novicePapyrus',
  },
};

/** The people a town or hero belongs to: one saved before there were two is Greek. */
export const factionOf = (x: { readonly faction?: TownFaction } | undefined): TownFaction => x?.faction ?? 'crown';

/** Building `b` as people `f` has it: its name, what it says and whom it hires. */
function asBuiltBy(f: TownFaction, b: BuildingId): BuildingDef {
  const base = BUILDINGS[b];
  const fd = FACTIONS[f];
  const dwelling = base.dwelling ? fd.units[b] : undefined;
  const says = dwelling ? `Hires ${creature(dwelling).plural}` : fd.says[b] ?? base.says;
  const { dwelling: _greek, ...rest } = base;
  return { ...rest, name: fd.names[b] ?? base.name, needs: fd.needs[b] ?? base.needs, says, ...(dwelling ? { dwelling } : {}) };
}

const TREES: Readonly<Record<TownFaction, Readonly<Record<BuildingId, BuildingDef>>>> = Object.fromEntries(
  TOWN_FACTIONS.map((f) => [f, Object.fromEntries(BUILDING_IDS.map((b) => [b, asBuiltBy(f, b)]))]),
) as Record<TownFaction, Record<BuildingId, BuildingDef>>;

/** Building `b` in a town of people `f`. */
export const buildingOf = (f: TownFaction, b: BuildingId): BuildingDef => TREES[f][b];
/** The unit `b` hires in a town of people `f`, if it is a dwelling. */
export const dwellingOf = (f: TownFaction, b: BuildingId): CreatureId | undefined => TREES[f][b].dwelling;
/** Whether people `f` builds `b` at all (another people's own building it doesn't). */
export const buildsAt = (f: TownFaction, b: BuildingId): boolean => !BUILDINGS[b].only || BUILDINGS[b].only === f;
/** Every building people `f` builds, in BUILDING_IDS' order. */
export const buildingIdsOf = (f: TownFaction): BuildingId[] => BUILDING_IDS.filter((b) => buildsAt(f, b));
