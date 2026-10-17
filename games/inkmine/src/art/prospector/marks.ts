import { MAX_MK } from '../../logic/gear';

/**
 * What each mark of gear is made of (spec, "The prospector's look"). Every
 * set is printed from the planet it's found on, so each mark wears that
 * planet's materials: Graphite's carbon and copper, Mycel's malachite,
 * amber, calcite and pyrite, and so on out to Cardia's heartstone. The
 * family (`lookOf`) gives a piece its silhouette; the mark gives it these
 * colours and its own touches (drawn by each piece), so no two marks look
 * alike. Mk 0 is the starter set, in the colours the prospector was first
 * drawn in.
 */
export interface MarkPaint {
  /** Whose set it is. */
  readonly planet: string;
  /** The suit's cloth. */
  readonly cloth: string;
  /** Leather's place: boots, gloves, belt, straps, the pack's bag. */
  readonly trim: string;
  /** Hard shells: plates, the drill's housing, the fuel tank. */
  readonly shell: string;
  /** The energy cell's case. */
  readonly case: string;
  /** Fittings: buckles, collars, bands, joints, rivets. */
  readonly fitting: string;
  /** The jetpack's nozzle. */
  readonly nozzle: string;
  /** The helmet's glass, or its visor. */
  readonly glass: string;
  /** The mark's own colour: a gem, a filter, a glowing seam. */
  readonly accent: string;
  /** The cell's charge and the lamps, lit. */
  readonly charge: string;
}

export const MARKS: readonly MarkPaint[] = [
  // Mk 0, the starter set: patched cobalt cloth, ochre leather, a dented ochre can.
  { planet: 'starter', cloth: '#6f8dc6', trim: '#a4744a', shell: '#c69a4c', case: '#bcc6d4', fitting: '#a9b2be', nozzle: '#6c7482', glass: '#a9c4da', accent: '#9db0d6', charge: '#e8b33c' },
  // Mk 1, Graphite: carbon-black parts, copper trim and windings, silver joints, quartz glass.
  { planet: 'Graphite', cloth: '#4f586e', trim: '#36383f', shell: '#3d4049', case: '#41444d', fitting: '#c4773f', nozzle: '#2c2e35', glass: '#d3e3ee', accent: '#c9ccd3', charge: '#f2a35a' },
  // Mk 2, Mycel: calcite wool bound in amber, malachite green, pyrite brass, lignite carbon,
  // built to the Aster's designs, so their power glows teal-green in it (asterMotifs.ts).
  { planet: 'Mycel', cloth: '#e2d9c4', trim: '#4b3a2e', shell: '#3f8c69', case: '#c8a446', fitting: '#c09c3c', nozzle: '#3b2f28', glass: '#e7dcc0', accent: '#e38f2a', charge: '#5fe0b8' },
  // Mk 3, Brine: teal oilskin and brine pearl.
  { planet: 'Brine', cloth: '#3f8e92', trim: '#2c565a', shell: '#5aa6a2', case: '#ddd7cb', fitting: '#e6e0d4', nozzle: '#36504f', glass: '#b9e2dc', accent: '#f2ebe2', charge: '#7fe0d4' },
  // Mk 4, Talus: hematite red-brown over desert khaki.
  { planet: 'Talus', cloth: '#b59670', trim: '#73402f', shell: '#8b3d2d', case: '#6e3a2f', fitting: '#9d9088', nozzle: '#4f3a34', glass: '#cdb7a0', accent: '#c75b3b', charge: '#ff9a4a' },
  // Mk 5, Prism: singing quartz, clear and violet.
  { planet: 'Prism', cloth: '#7b69b0', trim: '#493e70', shell: '#dcd5ef', case: '#cbc1e6', fitting: '#c8ccd8', nozzle: '#5a5470', glass: '#e8e2f8', accent: '#a77ff0', charge: '#d7b6ff' },
  // Mk 6, Ember: obsidian, diamond and orange heat.
  { planet: 'Ember', cloth: '#6c6462', trim: '#2c2729', shell: '#27242b', case: '#2e2a31', fitting: '#8e8891', nozzle: '#1f1c22', glass: '#e9a874', accent: '#ff7a2e', charge: '#ff8c3a' },
  // Mk 7, Pumice: pale porous grey, helium-3 in rose-tinted tanks.
  { planet: 'Pumice', cloth: '#99949f', trim: '#6c6870', shell: '#d6d2ca', case: '#cbc6bd', fitting: '#a8abb4', nozzle: '#77737c', glass: '#e0e5eb', accent: '#e4a2c2', charge: '#f4c8e0' },
  // Mk 8, Rime: ice-blue armour, fire-ice light.
  { planet: 'Rime', cloth: '#3e5d8e', trim: '#5b7590', shell: '#dde9f3', case: '#c6dbea', fitting: '#9fb2c3', nozzle: '#56708a', glass: '#9fd0ee', accent: '#8fe3ff', charge: '#a8ecff' },
  // Mk 9, Umbra: deep navy with willemite glowing green.
  { planet: 'Umbra', cloth: '#29314f', trim: '#1f2438', shell: '#3b4361', case: '#31384f', fitting: '#6c7691', nozzle: '#232838', glass: '#2f403b', accent: '#62f09a', charge: '#7dffa8' },
  // Mk 10, Cardia: heartstone gold and deep red.
  { planet: 'Cardia', cloth: '#7a2433', trim: '#4f1b25', shell: '#d6b05a', case: '#c99c45', fitting: '#e2c37b', nozzle: '#5a2a2e', glass: '#f0c870', accent: '#d8364a', charge: '#ff6b7d' },
];

/** A mark's paint (marks past the last fall back to it). */
export function markOf(mk: number): MarkPaint {
  return MARKS[Math.max(0, Math.min(MAX_MK, Math.floor(mk)))]!;
}
