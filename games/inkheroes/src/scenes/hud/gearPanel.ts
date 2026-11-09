import { FACTIONS, factionOf } from '../../logic/factions';
import type Phaser from 'phaser';
import type { SlotIcon } from '../../art/pixel/ui';
import type { Hero } from '../../logic/hero';
import { BAGS, bagOf, bagSize, itemDef, itemQuality, itemSays, QUALITY_NAMES, SET_NAMES, takeOff, wear, type ItemId, type Quality, type Slot } from '../../logic/items';
import { drawSocket, type RimName } from '../battle/pixelFrames';
import { INK, PixelButton, putBuffer, TextLabel, UI_TEX } from '../battle/pixelUi';
import type { GearCell, GearLayout } from './gearLayout';

const BTN = { w: 92, h: 28 } as const;
const BTN_GAP = 6;
/** How faint a place the bag doesn't have yet is drawn. */
const LOCKED_ALPHA = 0.35;

/** A piece's grade shows in its frame. */
export const QUALITY_RIM: Readonly<Record<Quality, RimName>> = { gray: 'bronze', green: 'green', blue: 'player', purple: 'purple', gold: 'gold' };

/** A slot's full name, for the line under the panel. */
const FULL: Readonly<Record<Slot, string>> = {
  helm: 'Helm', cuirass: 'Cuirass', bracers: 'Bracers', belt: 'Belt', greaves: 'Greaves', boots: 'Boots', weapon: 'Weapon', shield: 'Shield', amulet: 'Amulet', ring1: 'Ring', ring2: 'Ring', book: 'Spellbook', machine: 'War Machine',
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

/** A slot or a place in the bag; a `locked` place is one the hero's bag doesn't have yet, drawn faint. */
function cell(host: GearHost, at: GearCell, layout: GearLayout, item: ItemId | undefined, picked: boolean, onTap: () => void, ghost?: SlotIcon, locked = false): void {
  const key = putBuffer(host.scene, drawSocket(layout.cell, picked ? 'gold' : item ? QUALITY_RIM[itemQuality(item)] : locked ? 'dim' : 'bronze'));
  host.keys.push(key);
  const frame = host.scene.add.image(at.x, at.y, key).setOrigin(0).setInteractive().setAlpha(locked && !picked ? LOCKED_ALPHA : 1);
  frame.on('pointerup', onTap);
  host.body.add(frame);
  const mid = { x: at.x + Math.floor(layout.cell / 2), y: at.y + Math.floor(layout.cell / 2) };
  const texture = item ? UI_TEX.item(item) : ghost ? UI_TEX.slot(ghost) : null;
  if (texture) host.body.add(host.scene.add.image(mid.x, mid.y, texture).setScale(layout.scale / 2));
}

function line(host: GearHost, text: string, x: number, y: number, ink: typeof INK[keyof typeof INK], wrap?: number): void {
  const l = new TextLabel(host.scene, { align: 'left', anchor: { x: 0, y: 0 }, ink, ...(wrap ? { wrap } : {}) }).setText(text).setPosition(x, y);
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
  line(host, `${bagOf(hero).name}: ${bag.length} / ${bagSize(hero)}`, label.x, label.y, INK.dim);
  layout.bag.forEach((at, i) => cell(host, moved(at), layout, bag[i], !!pick && 'bag' in pick && pick.bag === i, () => on.pick({ bag: i }), undefined, i >= bagSize(hero)));
  detail(host, moved(layout.detail), layout.detail.w, hero, pick, on);
}

/** What an empty slot says; the war machine's is where a hero learns what it's for. */
const emptySlot = (slot: Slot, hero: Hero): string => (slot === 'machine' ? FACTIONS[factionOf(hero)].siege.slot : `${FULL[slot]}: nothing worn`);

/** What an empty place in the bag says: room, or (past the bag's size) the bag that would give it. */
function emptyBag(hero: Hero, i: number): string {
  if (i < bagSize(hero)) return 'Room in the bag';
  const next = BAGS.find((b) => b.size > i)!;
  return `Needs a bigger bag: ${next.name} (${next.size}), sold at a town's Storehouse`;
}

function detail(host: GearHost, at: GearCell, w: number, hero: Hero, pick: GearPick | null, on: { change(h: Hero): void }): void {
  const { x, y } = at;
  const item = pickedItem(hero, pick);
  if (!item) {
    line(host, !pick ? 'Tap a piece to see what it gives' : 'slot' in pick ? emptySlot(pick.slot, hero) : emptyBag(hero, pick.bag), x, y + 6, INK.dim, w);
    return;
  }
  const def = itemDef(item);
  line(host, def.name, x, y, INK.title);
  line(host, `${QUALITY_NAMES[def.quality]}: ${itemSays(item)}${def.set ? ` · ${SET_NAMES[def.set]}` : ''}`, x, y + 15, INK.dim, w - BTN.w - BTN_GAP);
  const next = pick && 'slot' in pick ? takeOff(hero, pick.slot) : wear(hero, (pick as { bag: number }).bag);
  const btn = new PixelButton(host.scene, { w: BTN.w, h: BTN.h, label: pick && 'slot' in pick ? 'Take off' : 'Wear', onClick: () => on.change(next) });
  btn.setPosition(x + w - BTN.w, y);
  btn.setEnabled(next !== hero);
  host.owned.push(btn);
  host.body.add(btn.root);
}
