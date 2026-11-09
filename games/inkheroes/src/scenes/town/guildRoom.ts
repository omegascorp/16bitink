import type Phaser from 'phaser';
import type { Adventure } from '../../logic/adventure';
import { itemQuality } from '../../logic/items';
import { guildSpells, type Town } from '../../logic/town';
import { SPELLS, type SpellId } from '../../logic/spells';
import { INK, PixelButton, UI_TEX } from '../battle/pixelUi';
import { QUALITY_RIM, qualityInk } from '../battle/rankLook';
import { bookStand, spellFacts, spellNote } from './guildData';
import { guildLayout, type GuildCell, type GuildLayout } from './guildLayout';
import { roomIn, TownRoom } from './townRoom';

const LINE = 15;
const BUY_H = 42;
const BUY_W = 110;
const BOOK = 64;
const BOOK_SOCKET = BOOK + 4;
const ROOMY_STAND = 190;

export interface GuildActions {
  close(): void;
  buy(): void;
  /** A spell was picked to read. */
  pick(id: SpellId): void;
}

/**
 * The mage guild as a room, after Heroes III's: its library painted behind,
 * each floor's spells as large tiles, the picked one read out under them,
 * and on a stand the spellbook itself, the guild's for sale or the hero's.
 * Tapping outside closes it.
 */
export class GuildRoom extends TownRoom {
  constructor(scene: Phaser.Scene, adv: Adventure, private readonly town: Town, picked: SpellId | null, area: { w: number; h: number }, private readonly act: GuildActions, depth: number) {
    const spells = guildSpells(town);
    const l = guildLayout(roomIn(area), spells.length);
    super(scene, area, l, { title: 'Mage Guild', art: UI_TEX.guildRoom }, () => act.close(), depth);
    const pick = picked && spells.includes(picked) ? picked : spells[0] ?? null;
    spells.forEach((id, i) => this.tile(l, l.tiles[i]!, id, id === pick, adv));
    for (const f of l.floors) this.label(f.text, f.x, f.y, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.title });
    if (pick) this.detail(l, adv, pick);
    this.stand(l, adv);
  }

  private tile(l: GuildLayout, at: GuildCell, id: SpellId, picked: boolean, adv: Adventure): void {
    const { tile, icon } = l;
    const plate = this.plate(at.x, at.y, tile.w, tile.h, picked ? 'gold' : 'bronze');
    const size = icon + 4;
    this.socket(at.x + Math.floor((tile.w - size) / 2), at.y + 3, size, picked ? 'gold' : 'bronze', UI_TEX.spellArt(id), icon / 64);
    this.label(SPELLS[id].name, at.x + Math.floor(tile.w / 2), at.y + size + 4, { wrap: tile.w - 6, anchor: { x: 0.5, y: 0 }, ink: spellNote(adv, this.town, id).known ? INK.good : INK.text });
    plate.img.setInteractive();
    plate.img.on('pointerup', () => this.act.pick(id));
    plate.img.on('pointerover', () => !picked && this.act.pick(id));
  }

  private detail(l: GuildLayout, adv: Adventure, id: SpellId): void {
    const { x, y, w, h } = l.detail;
    const s = SPELLS[id];
    this.plate(x, y, w, h);
    const name = this.label(s.name, x + 6, y + 4, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    const note = spellNote(adv, this.town, id);
    this.label(spellFacts(id), x + 6 + name.width + 10, y + 4, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    this.label(s.says, x + 6, y + 4 + LINE, { wrap: w - 12, align: 'left', anchor: { x: 0, y: 0 } });
    this.label(note.text, x + 6, y + 4 + LINE * 2, { align: 'left', anchor: { x: 0, y: 0 }, ink: note.known ? INK.good : INK.dim });
  }

  /** The book the guild sells: stood upright beside the spells, or as a row under them on a narrow screen. */
  private stand(l: GuildLayout, adv: Adventure): void {
    const { x, y, w, h, side } = l.stand;
    const stand = bookStand(adv, this.town);
    const rim = QUALITY_RIM[itemQuality(stand.item)];
    this.plate(x, y, w, h);
    const small = !side && l.icon === 32;
    const size = small ? 36 : BOOK_SOCKET;
    const buy = stand.buy && new PixelButton(this.scene, { w: side ? w - 16 : BUY_W, h: BUY_H, label: 'Buy', note: stand.price, rim: 'gold', primary: true, onClick: () => this.act.buy() });
    // The button carries the price; without one it's a line of its own.
    const lines = [...(buy ? [] : [{ text: stand.price, ink: INK.title }]), ...(stand.note ? [{ text: stand.note, ink: INK.dim }] : [])];
    if (side) {
      const mid = x + Math.floor(w / 2);
      // A short stand drops its heading, so the Buy button clears what the book gives.
      const roomy = h >= ROOMY_STAND;
      if (roomy) this.label('For sale', mid, y + 6, { kind: 'title', anchor: { x: 0.5, y: 0 } });
      const top = y + (roomy ? 24 : 5);
      this.socket(mid - Math.floor(size / 2), top, size, rim, UI_TEX.item(stand.item), 1);
      let at = top + size + 2;
      at += this.label(stand.name, mid, at, { kind: 'title', wrap: w - 12, anchor: { x: 0.5, y: 0 }, ink: qualityInk(stand.item) }).height;
      at += this.label(stand.says, mid, at + 1, { wrap: w - 12, anchor: { x: 0.5, y: 0 }, ink: INK.dim }).height + 1;
      for (const line of lines) at += this.label(line.text, mid, at + 1, { wrap: w - 12, anchor: { x: 0.5, y: 0 }, ink: line.ink }).height + 1;
      buy?.setPosition(x + 8, y + h - BUY_H - 8);
    } else {
      this.socket(x + 6, y + Math.floor((h - size) / 2), size, rim, UI_TEX.item(stand.item), size === BOOK_SOCKET ? 1 : 0.5);
      const tx = x + 6 + size + 8;
      const wrap = w - (tx - x) - (buy ? BUY_W + 12 : 8);
      let at = y + 6;
      at += this.label(stand.name, tx, at, { kind: 'title', wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: qualityInk(stand.item) }).height;
      at += this.label(stand.says, tx, at + 1, { wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }).height + 1;
      for (const line of lines) at += this.label(line.text, tx, at + 1, { wrap, align: 'left', anchor: { x: 0, y: 0 }, ink: line.ink }).height + 1;
      buy?.setPosition(x + w - BUY_W - 6, y + Math.floor((h - BUY_H) / 2));
    }
    if (buy) {
      buy.setEnabled(stand.buy!.enabled);
      this.root.add(buy.root);
      this.owned.push(buy);
    }
  }
}
