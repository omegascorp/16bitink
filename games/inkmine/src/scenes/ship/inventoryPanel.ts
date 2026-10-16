import { holdSize } from '../../logic/hold';
import { jettison, moveStack, splitStack, transferAll, usedSlots, type Inventory, type SlotRef } from '../../logic/inventory';
import { ORES } from '../../logic/ore';
import { drawSlotGrid, gridHeight } from '../slots';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, SEPIA } from '../kit/type';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';

const CELL = 46;
const NAMES = ['Suit bag', 'Cargo'] as const;

/**
 * The two inventories, No Man's Sky style: the suit's bag and the ship's
 * cargo as slot grids. Tap a stack to pick it up, then tap any slot (either
 * grid) to move it there: into an empty slot, onto the same ore, or swapping
 * with a different one. A picked-up stack can be split in half or
 * jettisoned (tap twice). Returns the panel's height.
 */
export function inventoryPanel(page: ShipPage, x: number, y: number, w: number): number {
  const { scene, profile: p, ui } = page;
  const cols = Math.max(4, Math.floor((w - PAD * 2 + 5) / (CELL + 5)));
  const pair: [Inventory, Inventory] = [p.suit, p.cargo];
  let ry = y + SECTION_BODY;
  const sel = ui.selected;
  pair.forEach((inv, bag) => {
    label(scene, x + PAD, ry + 10, NAMES[bag]!, 18, INK_TEXT, '600').setOrigin(0, 0.5);
    aside(scene, x + w - PAD, ry + 10, `${usedSlots(inv)} of ${inv.slots.length} slots · stacks of ${inv.stack}`, 15, 300, SEPIA).setOrigin(1, 0.5);
    ry += 26;
    const opts = { cell: CELL, cols, seed: 70 + bag * 50, selected: sel?.bag === bag ? sel.slot : undefined, onTap: (slot: number) => tap(page, { bag: bag as 0 | 1, slot }) };
    drawSlotGrid(scene, x + PAD, ry, inv, opts);
    ry += gridHeight(inv.slots.length, opts) + 14;
  });
  const picked = sel ? pair[sel.bag].slots[sel.slot] : null;
  if (picked && sel) {
    const t = aside(scene, x + PAD, ry, `Picked up: ${picked.n} ${ORES[picked.ore].name} from the ${NAMES[sel.bag].toLowerCase()}. Tap a slot to put it there.`, 16, w - PAD * 2, INK_TEXT);
    ry += t.height + 12;
    const bw = (w - PAD * 2 - 16) / 3;
    const canSplit = picked.n >= 2 && pair[sel.bag].slots.includes(null);
    plaque(scene, x + PAD + bw / 2, ry + 20, 'Split', () => page.commit(withInv(p, sel.bag, splitStack(pair[sel.bag], sel.slot))), { width: bw, height: 40, size: 14, kind: canSplit ? 'secondary' : 'off' });
    plaque(scene, x + PAD + 8 + bw * 1.5, ry + 20, ui.confirm ? 'Sure?' : 'Jettison', () => (ui.confirm ? page.commit(withInv(p, sel.bag, jettison(pair[sel.bag], sel.slot))) : page.setUi({ selected: sel, confirm: true })), { width: bw, height: 40, size: 14, kind: ui.confirm ? 'danger' : 'secondary' });
    plaque(scene, x + PAD + 16 + bw * 2.5, ry + 20, 'Put down', () => page.setUi({}), { width: bw, height: 40, size: 14 });
    ry += 54;
  } else {
    aside(scene, x + PAD, ry, 'Tap a stack to pick it up and move it.', 16, w - PAD * 2, FADED);
    ry += 30;
    const stow = transferAll(p.suit, p.cargo);
    plaque(scene, x + w / 2, ry + 20, 'Stow the bag in the cargo', () => page.commit({ ...p, suit: stow.from, cargo: stow.to }), { width: Math.min(300, w - PAD * 2), height: 40, size: 14, kind: holdSize(stow.moved) ? 'secondary' : 'off' });
    ry += 54;
  }
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Inventory', 41);
  return h;
}

function withInv(p: ShipPage['profile'], bag: 0 | 1, inv: Inventory): ShipPage['profile'] {
  return bag === 0 ? { ...p, suit: inv } : { ...p, cargo: inv };
}

/** A tap on a slot: pick a stack up, put it down where tapped, or put it back. */
function tap(page: ShipPage, at: SlotRef): void {
  const { profile: p, ui } = page;
  const sel = ui.selected;
  if (!sel) {
    if ((at.bag === 0 ? p.suit : p.cargo).slots[at.slot]) page.setUi({ selected: at });
    return;
  }
  if (sel.bag === at.bag && sel.slot === at.slot) {
    page.setUi({});
    return;
  }
  const [suit, cargo] = moveStack([p.suit, p.cargo], sel, at);
  page.commit({ ...p, suit, cargo });
}

