import { BLUE, RED } from '../../art/palette';
import { holdSize } from '../../logic/hold';
import { jettison, moveStack, splitStack, transferAll, usedSlots, type Inventory, type SlotRef } from '../../logic/inventory';
import { ORES } from '../../logic/ore';
import { drawSlotGrid, gridHeight } from '../slots';
import { inkButton, inkText, noteText, PENCIL } from '../ui';
import { section, SOFT_INK, type ShipPage } from './panel';

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
  const cols = Math.max(4, Math.floor((w - 32 + 4) / (CELL + 4)));
  const pair: [Inventory, Inventory] = [p.suit, p.cargo];
  let ry = y + 52;
  const sel = ui.selected;
  pair.forEach((inv, bag) => {
    inkText(scene, x + 16, ry + 10, `${NAMES[bag]} · ${usedSlots(inv)}/${inv.slots.length} slots, stacks of ${inv.stack}`, 22).setOrigin(0, 0.5);
    ry += 26;
    const opts = { cell: CELL, cols, seed: 70 + bag * 50, selected: sel?.bag === bag ? sel.slot : undefined, onTap: (slot: number) => tap(page, { bag: bag as 0 | 1, slot }) };
    drawSlotGrid(scene, x + 16, ry, inv, opts);
    ry += gridHeight(inv.slots.length, opts) + 14;
  });
  const picked = sel ? pair[sel.bag].slots[sel.slot] : null;
  if (picked && sel) {
    noteText(scene, x + 16, ry, `Picked up: ${picked.n} ${ORES[picked.ore].name} from the ${NAMES[sel.bag].toLowerCase()}. Tap a slot to put it there.`, 19, w - 32, BLUE);
    ry += 50;
    const bw = (w - 48) / 3;
    inkButton(scene, x + 16 + bw / 2, ry + 20, 'Split', () => page.commit(withInv(p, sel.bag, splitStack(pair[sel.bag], sel.slot))), { width: bw, height: 40, size: 20, disabled: picked.n < 2 || !pair[sel.bag].slots.includes(null) });
    inkButton(scene, x + 24 + bw * 1.5, ry + 20, ui.confirm ? 'Sure? tap again' : 'Jettison', () => (ui.confirm ? page.commit(withInv(p, sel.bag, jettison(pair[sel.bag], sel.slot))) : page.setUi({ selected: sel, confirm: true })), { width: bw, height: 40, size: 20, color: ui.confirm ? RED : undefined });
    inkButton(scene, x + 32 + bw * 2.5, ry + 20, 'Put down', () => page.setUi({}), { width: bw, height: 40, size: 20 });
    ry += 52;
  } else {
    noteText(scene, x + 16, ry, 'Tap a stack to pick it up and move it.', 19, w - 32, PENCIL);
    ry += 30;
    const stow = transferAll(p.suit, p.cargo);
    inkButton(scene, x + w / 2, ry + 20, 'Stow the bag in the cargo', () => page.commit({ ...p, suit: stow.from, cargo: stow.to }), { width: Math.min(300, w - 32), height: 40, size: 20, disabled: !holdSize(stow.moved) });
    ry += 52;
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

