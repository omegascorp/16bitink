import { SHIP_MODULES, SHIP_SYSTEMS, STARSHIP_TECH, SUIT_TECH, techKey, type Tab, type Tech } from '../../logic/tech';
import { aside, label, INK_TEXT, SEPIA } from '../kit/type';
import { NO_FOCUS, PAD, section, SECTION_BODY, type ShipPage } from './panel';
import { drawTechGrid, techGridFit } from './techGrid';

/** A group of slots on a tab, with its heading and a note on what it is. */
interface Group {
  readonly name: string;
  readonly note: string;
  readonly list: readonly Tech[];
}

const GROUPS: Readonly<Record<Tab, readonly Group[]>> = {
  suit: [{ name: 'Gear', note: 'printed from blueprints', list: SUIT_TECH }],
  ship: [
    { name: 'Systems', note: 'what the crash broke', list: SHIP_SYSTEMS },
    { name: 'Modules', note: 'printed upgrades', list: SHIP_MODULES },
  ],
  starship: [{ name: 'Systems', note: 'what the wormhole broke', list: STARSHIP_TECH }],
};

/**
 * A tab's technology slots, grouped, with the slot in focus (if any) ringed.
 * A tap focuses a slot, putting down any stack held so its card shows; a tap
 * on the slot already in focus lets it go. Returns the height.
 */
export function techPanel(page: ShipPage, tab: Tab, focus: Tech | null, x: number, y: number, w: number): number {
  const { scene, profile: p } = page;
  const inner = w - PAD * 2;
  const most = Math.max(...GROUPS[tab].map((g) => g.list.length));
  const fit = techGridFit(most, inner);
  let ry = y + SECTION_BODY;
  for (const g of GROUPS[tab]) {
    label(scene, x + PAD, ry + 10, g.name, 18, INK_TEXT, '600').setOrigin(0, 0.5);
    aside(scene, x + w - PAD, ry + 10, g.note, 15, 300, SEPIA).setOrigin(1, 0.5);
    ry += 28;
    const onTap = (t: Tech): void => page.setUi({ focus: focus && techKey(focus) === techKey(t) ? NO_FOCUS : techKey(t) });
    ry += drawTechGrid(scene, p, x + PAD, ry, g.list, { ...fit, focus: focus ? techKey(focus) : undefined, onTap }) + 4;
  }
  const h = ry - y + 6;
  section(scene, x, y, w, h, 'Technology', 31);
  return h;
}
