import { holdSize } from '../../logic/hold';
import { jettison, moveStack, sendStack, splitStack, transferAll, usedSlots, type Inventory, type SlotRef } from '../../logic/inventory';
import { ORES } from '../../logic/ore';
import type { Tab } from '../../logic/tech';
import { drawSlotGrid, gridHeight } from '../slots';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, SEPIA } from '../kit/type';
import { PAD, section, SECTION_BODY, type ShipPage } from './panel';

const CELL = 52;
const NAMES = ['suit bag', 'cargo'] as const;
const BTN_H = 40;

/**
 * A tab's storage, No Man's Sky style: the suit's bag on the suit tab, the
 * cargo on the ship's, as a slot grid. Tap a stack to pick it up, then tap
 * a slot to move it there (into an empty slot, onto the same ore, or
 * swapping); a stack picked up on one tab can be put down on the other.
 * A picked-up stack can be sent to the other store, split in half or
 * jettisoned (tap twice). Returns the panel's height.
 */
export function storagePanel(page: ShipPage, tab: Tab, x: number, y: number, w: number): number {
  const { scene, profile: p, ui } = page;
  const bag: 0 | 1 = tab === 'suit' ? 0 : 1;
  const pair: [Inventory, Inventory] = [p.suit, p.cargo];
  const inv = pair[bag];
  const cols = Math.max(4, Math.floor((w - PAD * 2 + 5) / (CELL + 5)));
  const sel = ui.selected;
  let ry = y + SECTION_BODY;
  label(scene, x + PAD, ry + 10, tab === 'suit' ? 'Suit bag' : 'Hold', 18, INK_TEXT, '600').setOrigin(0, 0.5);
  aside(scene, x + w - PAD, ry + 10, `${usedSlots(inv)} of ${inv.slots.length} slots · stacks of ${inv.stack}`, 15, 300, SEPIA).setOrigin(1, 0.5);
  ry += 28;
  const opts = { cell: CELL, cols, seed: 70 + bag * 50, selected: sel?.bag === bag ? sel.slot : undefined, onTap: (slot: number) => tap(page, { bag, slot }) };
  drawSlotGrid(scene, x + PAD, ry, inv, opts);
  ry += gridHeight(inv.slots.length, opts) + 10;
  const picked = sel ? pair[sel.bag].slots[sel.slot] : null;
  const inner = w - PAD * 2;
  if (picked && sel) {
    const here = sel.bag === bag;
    const where = here ? '' : ` from the ${NAMES[sel.bag]}`;
    const t = aside(scene, x + PAD, ry, `Holding ${picked.n} ${ORES[picked.ore].name}${where}. Tap a slot to put it there.`, 16, inner, INK_TEXT);
    ry += t.height + 10;
    const other = NAMES[sel.bag === 0 ? 1 : 0];
    // Nothing moves when the other store has no room for it: the button is off rather than silently putting the stack down.
    const sent = sendStack(pair, sel);
    const canSend = sent[0] !== pair[0] || sent[1] !== pair[1];
    const canSplit = picked.n >= 2 && pair[sel.bag].slots.includes(null);
    const buttons: { text: string; kind: 'secondary' | 'danger' | 'off'; press: () => void }[] = [
      { text: `To ${other}`, kind: canSend ? 'secondary' : 'off', press: () => commitPair(page, sent) },
      { text: 'Split', kind: canSplit ? 'secondary' : 'off', press: () => commitPair(page, withInv(pair, sel.bag, splitStack(pair[sel.bag], sel.slot))) },
      {
        text: ui.confirm ? 'Sure?' : 'Jettison', kind: ui.confirm ? 'danger' : 'secondary',
        press: () => (ui.confirm ? commitPair(page, withInv(pair, sel.bag, jettison(pair[sel.bag], sel.slot))) : page.setUi({ selected: sel, confirm: true })),
      },
      { text: 'Put down', kind: 'secondary', press: () => page.setUi({}) },
    ];
    // Four across when there's room, else two rows of two.
    const across = inner >= 520 ? 4 : 2;
    const bw = (inner - 8 * (across - 1)) / across;
    buttons.forEach((b, i) => {
      const bx = x + PAD + (i % across) * (bw + 8) + bw / 2;
      const by = ry + Math.floor(i / across) * (BTN_H + 8) + BTN_H / 2;
      plaque(scene, bx, by, b.text, b.press, { width: bw, height: BTN_H, size: 14, kind: b.kind });
    });
    ry += Math.ceil(buttons.length / across) * (BTN_H + 8) + 6;
  } else {
    aside(scene, x + PAD, ry, 'Tap a stack to pick it up and move it.', 16, inner, FADED);
    ry += 30;
    const stow = transferAll(p.suit, p.cargo);
    plaque(scene, x + w / 2, ry + BTN_H / 2, 'Stow the bag in the cargo', () => page.commit({ ...p, suit: stow.from, cargo: stow.to }), { width: Math.min(300, inner), height: BTN_H, size: 14, kind: holdSize(stow.moved) ? 'secondary' : 'off' });
    ry += BTN_H + 14;
  }
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Storage', 41 + bag);
  return h;
}

function withInv(pair: readonly [Inventory, Inventory], bag: 0 | 1, inv: Inventory): [Inventory, Inventory] {
  return bag === 0 ? [inv, pair[1]] : [pair[0], inv];
}

function commitPair(page: ShipPage, [suit, cargo]: [Inventory, Inventory]): void {
  page.commit({ ...page.profile, suit, cargo });
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
  commitPair(page, moveStack([p.suit, p.cargo], sel, at));
}
