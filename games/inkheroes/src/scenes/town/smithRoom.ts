import type Phaser from 'phaser';
import type { Adventure } from '../../logic/adventure';
import { itemQuality, SOLD_MACHINES, type SoldMachine } from '../../logic/items';
import type { Town } from '../../logic/town';
import { INK, PixelButton, UI_TEX } from '../battle/pixelUi';
import { QUALITY_RIM } from '../hud/gearPanel';
import { wareLayout, type GuildCell, type GuildLayout } from './guildLayout';
import { firstWare, heroMachine, wareOf, type Ware } from './smithData';
import { roomIn, TownRoom } from './townRoom';

const LINE = 15;
const BUY = { w: 110, h: 42 } as const;
const STAND_ICON = 64;
const STAND_SOCKET = STAND_ICON + 4;
/** A stand too short for the machine at full size. */
const SMALL_STAND = { h: 150, socket: 36 } as const;
const ROOMY_STAND = 190;

export interface SmithActions {
  close(): void;
  buy(m: SoldMachine): void;
  /** A ware was picked to look at. */
  pick(m: SoldMachine): void;
}

/**
 * The Blacksmith as a room, like the guild: the forge painted behind, each
 * machine for sale on a tile, the picked one read out under them, and on a
 * stand the machine the hero brings now, with Buy for the picked one.
 */
export class SmithRoom extends TownRoom {
  constructor(scene: Phaser.Scene, adv: Adventure, town: Town, picked: SoldMachine | null, area: { w: number; h: number }, private readonly act: SmithActions, depth: number) {
    const l = wareLayout(roomIn(area), SOLD_MACHINES.length);
    super(scene, area, l, { title: 'Blacksmith', art: UI_TEX.smithRoom }, () => act.close(), depth);
    const wares = SOLD_MACHINES.map((m) => wareOf(adv, town, m));
    const pick = wares.find((w) => w.item === picked) ?? firstWare(wares)!;
    wares.forEach((w, i) => this.tile(l, l.tiles[i]!, w, w === pick));
    this.detail(l, pick);
    this.stand(l, adv, pick);
  }

  private tile(l: GuildLayout, at: GuildCell, w: Ware, picked: boolean): void {
    const { tile, icon } = l;
    const plate = this.plate(at.x, at.y, tile.w, tile.h, picked ? 'gold' : 'bronze');
    const size = icon + 4;
    this.socket(at.x + Math.floor((tile.w - size) / 2), at.y + 3, size, QUALITY_RIM[itemQuality(w.item)], UI_TEX.item(w.item), icon / 64);
    const mid = at.x + Math.floor(tile.w / 2);
    this.label(w.name, mid, at.y + size + 4, { anchor: { x: 0.5, y: 0 } });
    this.label(w.owned ? 'Owned' : w.price, mid, at.y + size + 4 + LINE, { anchor: { x: 0.5, y: 0 }, ink: w.owned ? INK.good : INK.title });
    plate.img.setInteractive();
    plate.img.on('pointerup', () => this.act.pick(w.item));
    plate.img.on('pointerover', () => !picked && this.act.pick(w.item));
  }

  private detail(l: GuildLayout, w: Ware): void {
    const { x, y, w: width, h } = l.detail;
    this.plate(x, y, width, h);
    const name = this.label(w.name, x + 6, y + 4, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.label(w.grade, x + 6 + name.width + 10, y + 4, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    this.label(w.says, x + 6, y + 4 + LINE, { wrap: width - 12, align: 'left', anchor: { x: 0, y: 0 } });
    this.label(w.note, x + 6, y + 4 + LINE * 2, { wrap: width - 12, align: 'left', anchor: { x: 0, y: 0 }, ink: w.owned ? INK.good : INK.dim });
  }

  /** The hero's machine and the Buy button: beside the wares, or a row under them on a narrow screen. */
  private stand(l: GuildLayout, adv: Adventure, w: Ware): void {
    const { x, y, w: width, h, side } = l.stand;
    this.plate(x, y, width, h);
    const has = heroMachine(adv);
    const small = h < SMALL_STAND.h || (!side && l.icon === 32);
    const size = small ? SMALL_STAND.socket : STAND_SOCKET;
    const texture = has.item ? UI_TEX.item(has.item) : UI_TEX.slot('machine');
    const rim = has.item ? QUALITY_RIM[itemQuality(has.item)] : 'bronze';
    const scale = small ? 0.5 : 1;
    const buy = w.buy && new PixelButton(this.scene, { w: side ? width - 16 : BUY.w, h: BUY.h, label: 'Buy', note: w.price, rim: 'gold', primary: true, onClick: () => this.act.buy(w.item) });
    const heading = `${adv.hero.name} brings`;
    if (side) {
      const mid = x + Math.floor(width / 2);
      const roomy = h >= ROOMY_STAND;
      if (roomy) this.label(heading, mid, y + 6, { kind: 'title', anchor: { x: 0.5, y: 0 } });
      const top = y + (roomy ? 24 : 5);
      this.socket(mid - Math.floor(size / 2), top, size, rim, texture, scale);
      this.label(has.name, mid, top + size + 2, { wrap: width - 12, anchor: { x: 0.5, y: 0 } });
      buy?.setPosition(x + 8, y + h - BUY.h - 8);
    } else {
      this.socket(x + 6, y + Math.floor((h - size) / 2), size, rim, texture, scale);
      const tx = x + 6 + size + 8;
      const wrap = width - (tx - x) - (buy ? BUY.w + 12 : 8);
      this.label(heading, tx, y + 6, { kind: 'title', wrap, align: 'left', anchor: { x: 0, y: 0 } });
      this.label(has.name, tx, y + 6 + LINE + 2, { wrap, align: 'left', anchor: { x: 0, y: 0 } });
      buy?.setPosition(x + width - BUY.w - 6, y + Math.floor((h - BUY.h) / 2));
    }
    if (buy) {
      buy.setEnabled(w.buy!.enabled);
      this.root.add(buy.root);
      this.owned.push(buy);
    }
  }
}
