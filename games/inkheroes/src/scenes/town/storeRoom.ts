import type Phaser from 'phaser';
import type { Adventure } from '../../logic/adventure';
import { itemLine } from '../../logic/adventure';
import { bagOf, bagSize, itemDef } from '../../logic/items';
import { nextBag } from '../../logic/storage';
import { INK, PixelButton, UI_TEX } from '../battle/pixelUi';
import { ItemCells } from '../hud/itemCells';
import { ITEM_CELL } from '../hud/itemGrid';
import { STORE, storeLayout, type StoreLayout } from './storeLayout';
import { itemAt, storeView, type StoreHero, type StoreRef } from './storeData';
import { roomIn, TownRoom } from './townRoom';

export interface StoreActions {
  close(): void;
  tap(ref: StoreRef): void;
  buyBag(heroId: string): void;
}

/**
 * The Storehouse (or Treasury) as a room, like the Blacksmith's: the
 * pieces it keeps, and under them each hero of ours in the town with their
 * bag and the bigger bag it sells. A tap picks a piece, the next sends it:
 * into the store, into a bag, or from one hero to the other.
 */
export class StoreRoom extends TownRoom {
  constructor(scene: Phaser.Scene, adv: Adventure, townId: string, private readonly picked: StoreRef | null, note: string, area: { w: number; h: number }, private readonly act: StoreActions, depth: number) {
    const view = storeView(adv, townId);
    const l = storeLayout(roomIn(area), view.room, view.heroes.map((h) => bagSize(h.hero)));
    super(scene, area, l, { title: view.title, art: UI_TEX.storeRoom }, () => act.close(), depth);
    const { pad, inset, line } = STORE;
    const x = pad + inset;
    this.plate(pad, l.store.y, l.w - pad * 2, l.store.h);
    this.label(view.kept, x, l.store.y + inset, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    const town = adv.towns.find((t) => t.id === townId)!;
    this.cells(town.store ?? [], view.room, l.store.cols, x, l.store.y + inset + line + 3, (i) => ({ kind: 'store', i }));
    view.heroes.forEach((h, n) => this.hero(h, l, l.heroes[n]!));
    this.foot(adv, townId, note, l);
  }

  private cells(items: readonly Parameters<typeof itemDef>[0][], count: number, cols: number, x: number, y: number, ref: (i: number) => StoreRef): void {
    const picked = this.picked;
    const at = (i: number): boolean => !!picked && JSON.stringify(picked) === JSON.stringify(ref(i));
    const cells = new ItemCells(this.scene, { items, count, cols, picked: Array.from({ length: count }, (_, i) => i).find(at) ?? null, onTap: (i) => this.act.tap(ref(i)) });
    cells.setPosition(x, y);
    this.root.add(cells.root);
    this.owned.push(cells);
  }

  /** A hero's name and bag, its places, and the next bag up. */
  private hero(s: StoreHero, l: StoreLayout, row: StoreLayout['heroes'][number]): void {
    const { pad, inset, line, buy, gap } = STORE;
    const x = pad + inset;
    this.plate(pad, row.y, l.w - pad * 2, row.h);
    const name = this.label(s.hero.name, x, row.y + inset, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(s.bag, x + name.width + 8, row.y + inset + 1, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    const top = row.y + inset + line + 3;
    this.socket(x, top, STORE.bag, 'bronze', UI_TEX.bag(bagOf(s.hero).id), 0.5);
    this.cells(s.hero.bag ?? [], bagSize(s.hero), row.cols, x + STORE.bag + 4, top, (i) => ({ kind: 'bag', heroId: s.hero.id, i }));
    if (!s.upgrade) return;
    const next = nextBag(s.hero)!;
    const btn = new PixelButton(this.scene, {
      w: buy.w, h: buy.h, label: s.upgrade.label, note: s.upgrade.price, picture: { key: UI_TEX.bag(next.id), scale: 0.5 }, onClick: () => this.act.buyBag(s.hero.id),
    });
    btn.setEnabled(s.upgrade.enabled);
    const bx = l.w - pad - inset - buy.w;
    btn.setPosition(bx, row.buyBelow ? row.y + row.h - inset - buy.h : top + Math.max(0, Math.floor((ITEM_CELL - buy.h) / 2)) + (row.buyBelow ? gap : 0));
    this.root.add(btn.root);
    this.owned.push(btn);
  }

  /** The picked piece and what it gives, else what to do, or why the last move was refused. */
  private foot(adv: Adventure, townId: string, note: string, l: StoreLayout): void {
    const { pad, inset, foot } = STORE;
    this.plate(pad, l.foot.y, l.w - pad * 2, foot);
    const wrap = l.w - pad * 2 - inset * 2;
    const item = this.picked && itemAt(adv, townId, this.picked);
    if (note && !item) {
      this.label(note, pad + inset, l.foot.y + 13, { wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.title });
      return;
    }
    if (!item) {
      this.label('Tap a piece, then where it goes: the store or a hero\'s bag', pad + inset, l.foot.y + 13, { wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
      return;
    }
    const name = this.label(itemDef(item).name, pad + inset, l.foot.y + 5, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(itemLine(item), pad + inset, l.foot.y + 5 + name.height + 2, { wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
  }
}
