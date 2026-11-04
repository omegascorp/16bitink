import type Phaser from 'phaser';
import type { SlotIcon } from '../../art/pixel/ui';
import type { Hero } from '../../logic/hero';
import { BAG_SIZE, ITEMS, itemSays, SET_NAMES, takeOff, wear, type ItemId, type Slot } from '../../logic/items';
import { drawSocket } from '../battle/pixelFrames';
import { INK, PixelButton, putBuffer, TextLabel, UI_TEX } from '../battle/pixelUi';
import type { GearCell, GearLayout } from './gearLayout';

const BTN = { w: 92, h: 28 } as const;

/** A slot's full name, for the line under the panel. */
const FULL: Readonly<Record<Slot, string>> = {
  helm: 'Helm', cuirass: 'Cuirass', bracers: 'Bracers', belt: 'Belt', greaves: 'Greaves', boots: 'Boots', weapon: 'Weapon', shield: 'Shield', amulet: 'Amulet', ring1: 'Ring', ring2: 'Ring',
};

/** What's picked on the panel: a slot on the body, or a place in the bag. */
export type GearPick = { readonly slot: Slot } | { readonly bag: number };

/** What the panel draws with: the sheet's own parts, so they go when it does. */
export interface GearHost {
  readonly scene: Phaser.Scene;
  readonly body: Phaser.GameObjects.Container;
  readonly owned: { destroy(): void }[];
  readonly keys: string[];
}

/** The piece a pick points at, if any. */
export function pickedItem(hero: Hero, pick: GearPick | null): ItemId | undefined {
  if (!pick) return undefined;
  return 'slot' in pick ? hero.gear?.[pick.slot] : hero.bag?.[pick.bag];
}

function cell(host: GearHost, at: GearCell, layout: GearLayout, item: ItemId | undefined, picked: boolean, onTap: () => void, ghost?: SlotIcon): void {
  const key = putBuffer(host.scene, drawSocket(layout.cell, picked ? 'gold' : 'bronze'));
  host.keys.push(key);
  const frame = host.scene.add.image(at.x, at.y, key).setOrigin(0).setInteractive();
  frame.on('pointerup', onTap);
  host.body.add(frame);
  const mid = { x: at.x + Math.floor(layout.cell / 2), y: at.y + Math.floor(layout.cell / 2) };
  const texture = item ? UI_TEX.item(item) : ghost ? UI_TEX.slot(ghost) : null;
  if (texture) host.body.add(host.scene.add.image(mid.x, mid.y, texture).setScale(layout.scale / 2));
}

function line(host: GearHost, text: string, x: number, y: number, ink: typeof INK[keyof typeof INK]): void {
  const l = new TextLabel(host.scene, { align: 'left', anchor: { x: 0, y: 0 }, ink }).setText(text).setPosition(x, y);
  host.owned.push(l);
  host.body.add(l.img);
}

/**
 * The gear: the slots round the body, the bag beside them, and the picked
 * piece with what it gives and the button that moves it.
 */
export function drawGear(host: GearHost, x: number, y: number, layout: GearLayout, hero: Hero, pick: GearPick | null, on: { pick(p: GearPick): void; change(h: Hero): void }): void {
  const moved = (c: GearCell): GearCell => ({ x: x + c.x, y: y + c.y });
  for (const { slot, ...at } of layout.slots) {
    const picked = !!pick && 'slot' in pick && pick.slot === slot;
    cell(host, moved(at), layout, hero.gear?.[slot], picked, () => on.pick({ slot }), slot === 'ring1' || slot === 'ring2' ? 'ring' : slot);
  }
  const bag = hero.bag ?? [];
  const label = moved(layout.bagLabel);
  line(host, `Bag: ${bag.length} / ${BAG_SIZE}`, label.x, label.y, INK.dim);
  layout.bag.forEach((at, i) => cell(host, moved(at), layout, bag[i], !!pick && 'bag' in pick && pick.bag === i, () => on.pick({ bag: i })));
  detail(host, moved(layout.detail), layout.detail.w, hero, pick, on);
}

function detail(host: GearHost, at: GearCell, w: number, hero: Hero, pick: GearPick | null, on: { change(h: Hero): void }): void {
  const { x, y } = at;
  const item = pickedItem(hero, pick);
  if (!item) {
    line(host, pick && 'slot' in pick ? `${FULL[pick.slot]}: nothing worn` : 'Tap a piece to see what it gives', x, y + 6, INK.dim);
    return;
  }
  const def = ITEMS[item];
  line(host, def.name, x, y, INK.title);
  line(host, `${itemSays(item)}${def.set ? ` · ${SET_NAMES[def.set]}` : ''}`, x, y + 15, INK.dim);
  const next = pick && 'slot' in pick ? takeOff(hero, pick.slot) : wear(hero, (pick as { bag: number }).bag);
  const btn = new PixelButton(host.scene, { w: BTN.w, h: BTN.h, label: pick && 'slot' in pick ? 'Take off' : 'Wear', onClick: () => on.change(next) });
  btn.setPosition(x + w - BTN.w, y);
  btn.setEnabled(next !== hero);
  host.owned.push(btn);
  host.body.add(btn.root);
}
