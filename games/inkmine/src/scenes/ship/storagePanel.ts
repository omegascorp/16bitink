import { holdSize } from '../../logic/hold';
import { isLocked, jettison, moveStack, sendStack, splitStack, toggleLock, transferAll, usedSlots, type Inventory, type SlotRef, type Stack } from '../../logic/inventory';
import { ORES } from '../../logic/ore';
import { keptOres } from '../../logic/story';
import type { Tab } from '../../logic/tech';
import { drawSlotGrid, gridHeight } from '../slots';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, SEPIA } from '../kit/type';
import { NO_FOCUS, PAD, section, SECTION_BODY, type ShipPage } from './panel';

const CELL = 52;
const NAMES = ['suit bag', 'cargo'] as const;
const BTN_H = 40;

/**
 * A tab's storage, No Man's Sky style: the suit's bag on the suit tab, the
 * cargo on the ship's, as a slot grid. Tap a stack to pick it up, then tap
 * a slot to move it there (into an empty slot, onto the same ore, or
 * swapping); a stack picked up on one tab can be put down on the other.
 * A picked-up stack can be sent to the other store, split in half or
 * dropped (tap twice); a slot in the suit bag can be locked, so the
 * lander never takes what's in it. Far from the lander (`page.remote`) the
 * suit bag still sorts, splits, locks and drops, but the cargo can only
 * be looked at: nothing moves into or out of it. Returns the panel's height.
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
  const kept = keeps(p);
  const locked = bag === 0 ? (slot: number): boolean => { const s = inv.slots[slot]; return s ? kept(s, slot) : isLocked(inv, slot); } : undefined;
  const opts = { cell: CELL, cols, seed: 70 + bag * 50, selected: sel?.bag === bag ? sel.slot : undefined, locked, onTap: (slot: number) => tap(page, { bag, slot }) };
  drawSlotGrid(scene, x + PAD, ry, inv, opts);
  ry += gridHeight(inv.slots.length, opts) + 10;
  const picked = sel ? pair[sel.bag].slots[sel.slot] : null;
  const inner = w - PAD * 2;
  if (picked && sel && page.remote && sel.bag === 1) {
    const t = aside(scene, x + PAD, ry, `${picked.n} ${ORES[picked.ore].name} in the cargo. The cargo stays aboard: it can be moved only at the lander.`, 16, inner, INK_TEXT);
    ry += t.height + 10;
  } else if (picked && sel) {
    const here = sel.bag === bag;
    const where = here ? '' : ` from the ${NAMES[sel.bag]}`;
    const t = aside(scene, x + PAD, ry, `Holding ${picked.n} ${ORES[picked.ore].name}${where}. Tap a slot to put it there, or tap it again to put it back.`, 16, inner, INK_TEXT);
    ry += t.height + 10;
    const other = NAMES[sel.bag === 0 ? 1 : 0];
    // Nothing moves when the other store has no room for it: the button is off rather than silently putting the stack down.
    const sent = sendStack(pair, sel);
    const canSend = sent[0] !== pair[0] || sent[1] !== pair[1];
    const canSplit = picked.n >= 2 && pair[sel.bag].slots.includes(null);
    const buttons: { text: string; kind: 'secondary' | 'danger' | 'off'; press: () => void }[] = [
      ...(page.remote ? [] : [{ text: `To ${other}`, kind: canSend ? 'secondary' as const : 'off' as const, press: () => commitPair(page, sent) }]),
      { text: 'Split', kind: canSplit ? 'secondary' : 'off', press: () => commitPair(page, withInv(pair, sel.bag, splitStack(pair[sel.bag], sel.slot))) },
      {
        text: ui.confirm ? 'Sure?' : 'Drop', kind: ui.confirm ? 'danger' : 'secondary',
        press: () => (ui.confirm ? commitPair(page, withInv(pair, sel.bag, jettison(pair[sel.bag], sel.slot))) : page.setUi({ selected: sel, confirm: true })),
      },
      ...(sel.bag === 0 ? [{ text: isLocked(p.suit, sel.slot) ? 'Unlock' : 'Lock', kind: 'secondary' as const, press: () => page.commit({ ...p, suit: toggleLock(p.suit, sel.slot) }, { selected: sel }) }] : []),
    ];
    // All in a row when there's room, else rows of two.
    const across = inner >= buttons.length * 120 ? buttons.length : 2;
    const bw = (inner - 8 * (across - 1)) / across;
    buttons.forEach((b, i) => {
      const bx = x + PAD + (i % across) * (bw + 8) + bw / 2;
      const by = ry + Math.floor(i / across) * (BTN_H + 8) + BTN_H / 2;
      plaque(scene, bx, by, b.text, b.press, { width: bw, height: BTN_H, size: 14, kind: b.kind });
    });
    ry += Math.ceil(buttons.length / across) * (BTN_H + 8) + 6;
  } else if (page.remote) {
    const tip = bag === 0 ? 'Tap a stack to pick it up and move it. Locked slots stay in the bag at the lander.' : 'The cargo is aboard the lander: you can look here, and move it there.';
    const t = aside(scene, x + PAD, ry, tip, 16, inner, FADED);
    ry += t.height + 10;
  } else {
    const tip = bag === 0 ? 'Tap a stack to pick it up and move it. Locked slots stay in the bag at the lander.' : 'Tap a stack to pick it up and move it.';
    const t = aside(scene, x + PAD, ry, tip, 16, inner, FADED);
    ry += t.height + 10;
    const stow = transferAll(p.suit, p.cargo, kept);
    plaque(scene, x + w / 2, ry + BTN_H / 2, 'Stow the bag in the cargo', () => page.commit({ ...p, suit: stow.from, cargo: stow.to }), { width: Math.min(300, inner), height: BTN_H, size: 14, kind: holdSize(stow.moved) ? 'secondary' : 'off' });
    ry += BTN_H + 14;
  }
  const h = ry - y + 8;
  section(scene, x, y, w, h, 'Storage', 41 + bag);
  return h;
}

/** What stays in the bag at the lander: locked slots, and the ore the Lamplighters are waiting for. */
function keeps(p: ShipPage['profile']): (s: Stack, slot: number) => boolean {
  const ores = keptOres(p);
  return (s, slot) => isLocked(p.suit, slot) || ores.includes(s.ore);
}

function withInv(pair: readonly [Inventory, Inventory], bag: 0 | 1, inv: Inventory): [Inventory, Inventory] {
  return bag === 0 ? [inv, pair[1]] : [pair[0], inv];
}

function commitPair(page: ShipPage, [suit, cargo]: [Inventory, Inventory]): void {
  page.commit({ ...page.profile, suit, cargo });
}

/**
 * A tap on a slot: pick a stack up, put it down where tapped, or put it
 * back. Holding one clears the technology focus, so its card shows alone.
 * Far from the lander nothing moves into or out of the cargo: a tap that
 * would picks up what's tapped instead (or puts the stack back).
 */
function tap(page: ShipPage, at: SlotRef): void {
  const { profile: p, ui } = page;
  const sel = ui.selected;
  const filled = (at.bag === 0 ? p.suit : p.cargo).slots[at.slot] !== null;
  if (!sel) {
    if (filled) page.setUi({ selected: at, focus: NO_FOCUS });
    return;
  }
  if (sel.bag === at.bag && sel.slot === at.slot) {
    page.setUi({ focus: NO_FOCUS });
    return;
  }
  if (page.remote && (sel.bag === 1 || at.bag === 1)) {
    page.setUi(filled ? { selected: at, focus: NO_FOCUS } : { focus: NO_FOCUS });
    return;
  }
  commitPair(page, moveStack([p.suit, p.cargo], sel, at));
}
