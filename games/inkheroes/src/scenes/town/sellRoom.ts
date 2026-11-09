import type Phaser from 'phaser';
import { itemLine, type Adventure } from '../../logic/adventure';
import { itemDef } from '../../logic/items';
import { cantSell, forSale, type SellRef } from '../../logic/sell';
import { INK, PixelButton } from '../battle/pixelUi';
import { ItemCells } from '../hud/itemCells';
import { itemCellsSize, itemCols } from '../hud/itemGrid';
import { roomIn, TownRoom } from './townRoom';

export interface SellActions {
  close(): void;
  /** Back to the Marketplace's trades. */
  back(): void;
  pick(i: number): void;
  sell(ref: SellRef): void;
}

const PAD = 8;
const TOP = 34;
const LINE = 14;
const FOOT = 52;
const BTN = { w: 120, h: 28 } as const;
const MAX_W = 470;

/**
 * The Marketplace buying gear (docs/inkheroes-design.md, Loot): every
 * piece it would buy, from the town's store and the bags of our heroes in
 * the town, framed in its grade; a tap picks one, Sell takes its price.
 */
export class SellRoom extends TownRoom {
  constructor(scene: Phaser.Scene, adv: Adventure, townId: string, picked: number | null, area: { w: number; h: number }, act: SellActions, depth: number) {
    const lots = forSale(adv, townId);
    const room = roomIn(area);
    const w = Math.min(MAX_W, room.w);
    const cols = itemCols(w - PAD * 2);
    const grid = itemCellsSize(Math.max(1, lots.length), cols);
    super(scene, area, { w, h: TOP + LINE + grid.h + 8 + FOOT + PAD }, { title: 'Sell gear' }, () => act.close(), depth);
    this.label(lots.length ? 'From the store and the bags of your heroes here' : 'Nothing here to sell: spare pieces in a bag or the store sell here', PAD, TOP, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim, wrap: w - PAD * 2 });
    const cells = new ItemCells(scene, { items: lots.map((l) => l.id), count: lots.length, cols, picked, onTap: (i) => act.pick(i) });
    cells.setPosition(PAD, TOP + LINE);
    this.root.add(cells.root);
    this.owned.push(cells);
    const footY = TOP + LINE + grid.h + 8;
    this.plate(PAD, footY, w - PAD * 2, FOOT);
    const lot = picked === null ? undefined : lots[picked];
    const back = new PixelButton(scene, { w: 80, h: BTN.h, label: 'Trades', onClick: () => act.back() });
    back.setPosition(PAD + 4, footY + FOOT - BTN.h - 4);
    this.root.add(back.root);
    this.owned.push(back);
    if (!lot) {
      this.label('Tap a piece to see what it fetches', PAD + 6, footY + 6, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
      return;
    }
    this.label(itemDef(lot.id).name, PAD + 6, footY + 4, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(itemLine(lot.id), PAD + 6, footY + 4 + LINE, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim, wrap: w - PAD * 2 - BTN.w - 16 });
    const sell = new PixelButton(scene, { w: BTN.w, h: BTN.h, label: `Sell: ${lot.price} gold`, rim: 'gold', primary: true, onClick: () => act.sell(lot.ref) });
    sell.setPosition(w - PAD - BTN.w - 4, footY + FOOT - BTN.h - 4);
    sell.setEnabled(!cantSell(adv, townId, lot.ref));
    this.root.add(sell.root);
    this.owned.push(sell);
  }
}
