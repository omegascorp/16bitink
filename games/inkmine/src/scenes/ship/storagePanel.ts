import { holdSize } from '../../logic/hold';
import { isLocked, jettison, moveStack, sendStack, splitStack, toggleLock, transferAll, usedSlots, type Inventory, type SlotRef, type Stack } from '../../logic/inventory';
import { ORES } from '../../logic/ore';
import type { Profile } from '../../logic/economy';
import { keptOres } from '../../logic/story';
import type { Tab } from '../../logic/tech';
import { drawSlotGrid, gridHeight } from '../slots';
import { plaque } from '../kit/plaque';
import { aside, FADED, INK_TEXT, label, SEPIA } from '../kit/type';
import { NO_FOCUS, PAD, section, SECTION_BODY, type ShipPage } from './panel';

const CELL = 52;
/** The stores by index (SlotRef.bag): the suit's bag, the lander's cargo, the starship's hold. */
const NAMES = ['suit bag', 'cargo', "starship's hold"] as const;
const TITLES = ['Suit bag', 'Hold', "Starship's hold"] as const;
const BTN_H = 40;
const BAG_OF: Readonly<Record<Tab, number>> = { suit: 0, ship: 1, starship: 2 };

/** Every store, by index. */
const storesOf = (p: Profile): Inventory[] => [p.suit, p.cargo, p.hold];

/** Where "To …" sends a stack from `bag`: the suit and cargo trade, and docked the cargo and the starship's hold do. */
const partnerOf = (p: Profile, bag: number): number => (bag === 2 ? 1 : bag === 0 ? 1 : p.docked ? 2 : 0);

/** Whether a store can be touched now: the cargo only at the lander, the starship's hold only aboard her. */
function reachable(page: ShipPage, bag: number): boolean {
  if (bag === 1) return !page.remote;
  if (bag === 2) return !page.remote && page.profile.docked;
  return true;
}

/**
 * A tab's storage, No Man's Sky style: the suit's bag on the Suit tab, the
 * lander's cargo on the Lander tab, the starship's hold on the Starship
 * tab, as a slot grid. Tap a stack to pick it up, then tap a slot to move
 * it there (into an empty slot, onto the same ore, or swapping); a stack
 * picked up on one tab can be put down on another. A picked-up stack can
 * be sent across (suit and cargo; docked, cargo and the starship's hold),
 * split in half or dropped (tap twice); a slot in the suit bag can be
 * locked, so the lander never takes what's in it. Far from the lander
 * (`page.remote`) the suit bag still sorts, splits, locks and drops, but
 * the cargo can only be looked at; the starship's hold can only be touched
 * aboard her. Returns the panel's height.
 */
export function storagePanel(page: ShipPage, tab: Tab, x: number, y: number, w: number): number {
  const { scene, profile: p, ui } = page;
  const bag = BAG_OF[tab];
  const stores = storesOf(p);
  const inv = stores[bag]!;
  const cols = Math.max(4, Math.floor((w - PAD * 2 + 5) / (CELL + 5)));
  const sel = ui.selected;
  let ry = y + SECTION_BODY;
  label(scene, x + PAD, ry + 10, TITLES[bag]!, 18, INK_TEXT, '600').setOrigin(0, 0.5);
  aside(scene, x + w - PAD, ry + 10, `${usedSlots(inv)} of ${inv.slots.length} slots · stacks of ${inv.stack}`, 15, 300, SEPIA).setOrigin(1, 0.5);
  ry += 28;
  const kept = keeps(p);
  const locked = bag === 0 ? (slot: number): boolean => { const s = inv.slots[slot]; return s ? kept(s, slot) : isLocked(inv, slot); } : undefined;
  const opts = { cell: CELL, cols, seed: 70 + bag * 50, selected: sel?.bag === bag ? sel.slot : undefined, locked, onTap: (slot: number) => tap(page, { bag, slot }) };
  drawSlotGrid(scene, x + PAD, ry, inv, opts);
  ry += gridHeight(inv.slots.length, opts) + 10;
  const picked = sel ? stores[sel.bag]?.slots[sel.slot] : null;
  const inner = w - PAD * 2;
  if (picked && sel && !reachable(page, sel.bag)) {
    const why = sel.bag === 1 ? 'The cargo stays aboard: it can be moved only at the lander.' : 'It stays aboard the starship: it can be moved only there.';
    const t = aside(scene, x + PAD, ry, `${picked.n} ${ORES[picked.ore].name} in the ${NAMES[sel.bag]}. ${why}`, 16, inner, INK_TEXT);
    ry += t.height + 10;
  } else if (picked && sel) {
    const here = sel.bag === bag;
    const where = here ? '' : ` from the ${NAMES[sel.bag]}`;
    const t = aside(scene, x + PAD, ry, `Holding ${picked.n} ${ORES[picked.ore].name}${where}. Tap a slot to put it there, or tap it again to put it back.`, 16, inner, INK_TEXT);
    ry += t.height + 10;
    // Sent to this tab's store when it was picked up elsewhere, else across to its partner.
    const to = here ? partnerOf(p, sel.bag) : bag;
    // Nothing moves when the other store has no room for it: the button is off rather than silently putting the stack down.
    const sent = sendStack(stores, sel, to);
    const canSend = reachable(page, to) && sent.some((inv2, i) => inv2 !== stores[i]);
    const canSplit = picked.n >= 2 && stores[sel.bag]!.slots.includes(null);
    const buttons: { text: string; kind: 'secondary' | 'danger' | 'off'; press: () => void }[] = [
      ...(reachable(page, to) ? [{ text: `To ${NAMES[to]}`, kind: canSend ? 'secondary' as const : 'off' as const, press: () => commitStores(page, sent) }] : []),
      { text: 'Split', kind: canSplit ? 'secondary' : 'off', press: () => commitStores(page, withInv(stores, sel.bag, splitStack(stores[sel.bag]!, sel.slot))) },
      {
        text: ui.confirm ? 'Sure?' : 'Drop', kind: ui.confirm ? 'danger' : 'secondary',
        press: () => (ui.confirm ? commitStores(page, withInv(stores, sel.bag, jettison(stores[sel.bag]!, sel.slot))) : page.setUi({ selected: sel, confirm: true })),
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
  } else if (!reachable(page, bag)) {
    const tip = bag === 1 ? 'The cargo is aboard the lander: you can look here, and move it there.' : 'Her hold is aboard her: you can look here, and move it there. Carry ore up in the lander and stow it here.';
    const t = aside(scene, x + PAD, ry, tip, 16, inner, FADED);
    ry += t.height + 10;
  } else if (bag === 0 && page.remote) {
    const t = aside(scene, x + PAD, ry, 'Tap a stack to pick it up and move it. Locked slots stay in the bag at the lander.', 16, inner, FADED);
    ry += t.height + 10;
  } else {
    const tip = bag === 0 ? 'Tap a stack to pick it up and move it. Locked slots stay in the bag at the lander.' : bag === 2 ? 'Tap a stack to pick it up and move it. What is stowed here stays aboard her, and repairs aboard can use it.' : 'Tap a stack to pick it up and move it.';
    const t = aside(scene, x + PAD, ry, tip, 16, inner, FADED);
    ry += t.height + 10;
    if (bag !== 1) {
      // The suit bag stows into the cargo; the cargo unloads into her hold.
      const from = bag === 0 ? p.suit : p.cargo;
      const into = bag === 0 ? p.cargo : p.hold;
      const stow = transferAll(from, into, bag === 0 ? kept : () => false);
      const text = bag === 0 ? 'Stow the bag in the cargo' : "Unload the lander's cargo here";
      const press = (): void => page.commit(bag === 0 ? { ...p, suit: stow.from, cargo: stow.to } : { ...p, cargo: stow.from, hold: stow.to });
      plaque(scene, x + w / 2, ry + BTN_H / 2, text, press, { width: Math.min(360, inner), height: BTN_H, size: 14, kind: holdSize(stow.moved) ? 'secondary' : 'off' });
      ry += BTN_H + 14;
    }
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

function withInv(stores: readonly Inventory[], bag: number, inv: Inventory): Inventory[] {
  return stores.map((x, i) => (i === bag ? inv : x));
}

function commitStores(page: ShipPage, [suit, cargo, hold]: Inventory[]): void {
  page.commit({ ...page.profile, suit: suit!, cargo: cargo!, hold: hold! });
}

/**
 * A tap on a slot: pick a stack up, put it down where tapped, or put it
 * back. Holding one clears the technology focus, so its card shows alone.
 * A store that can't be touched now (the cargo far from the lander, the
 * starship's hold away from her) takes nothing and gives nothing: a tap
 * that would picks up what's tapped instead (or puts the stack back).
 */
function tap(page: ShipPage, at: SlotRef): void {
  const { profile: p, ui } = page;
  const sel = ui.selected;
  const stores = storesOf(p);
  const filled = stores[at.bag]!.slots[at.slot] !== null;
  if (!sel) {
    if (filled) page.setUi({ selected: at, focus: NO_FOCUS });
    return;
  }
  if (sel.bag === at.bag && sel.slot === at.slot) {
    page.setUi({ focus: NO_FOCUS });
    return;
  }
  if (!reachable(page, sel.bag) || !reachable(page, at.bag)) {
    page.setUi(filled ? { selected: at, focus: NO_FOCUS } : { focus: NO_FOCUS });
    return;
  }
  commitStores(page, moveStack(stores, sel, at));
}
