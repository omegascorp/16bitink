import type Phaser from 'phaser';
import type { Adventure } from '../../logic/adventure';
import { itemQuality } from '../../logic/items';
import { guildSpells, type Town } from '../../logic/town';
import { SPELLS, type SpellId } from '../../logic/spells';
import { drawRule, drawSocket } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, UI_TEX } from '../battle/pixelUi';
import { QUALITY_RIM } from '../hud/gearPanel';
import { bookStand, spellFacts, spellNote } from './guildData';
import { guildLayout, ROOM, type GuildCell, type GuildLayout } from './guildLayout';

const CLOSE = { w: 50, h: 18 } as const;
const LINE = 15;
const BUY_H = 42;
const BUY_W = 110;
const PLATE = [34, 24, 17, 226] as const;
const FILL = [34, 24, 17, 255] as const;
const ROOM_SHADE = 0.28;
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
export class GuildRoom {
  private readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];

  constructor(private readonly scene: Phaser.Scene, adv: Adventure, private readonly town: Town, picked: SpellId | null, area: { w: number; h: number }, private readonly act: GuildActions, depth: number) {
    const spells = guildSpells(town);
    const room = { w: area.w - 8, h: area.h - 8 };
    const l = guildLayout(room, spells.length);
    const x = Math.floor((area.w - l.w) / 2);
    const y = Math.max(4, Math.floor((area.h - l.h) / 2));
    const shade = scene.add.rectangle(0, 0, area.w, area.h, 0x0a0604, 0.5).setOrigin(0).setDepth(depth).setInteractive();
    shade.on('pointerup', () => act.close());
    this.owned.push(shade);
    this.root = scene.add.container(x, y).setDepth(depth + 1);
    this.drawRoom(l);
    const pick = picked && spells.includes(picked) ? picked : spells[0] ?? null;
    spells.forEach((id, i) => this.tile(l, l.tiles[i]!, id, id === pick, adv));
    for (const f of l.floors) this.label(f.text, f.x, f.y, { align: 'left', anchor: { x: 0, y: 0 }, ink: INK.title });
    if (pick) this.detail(l, adv, pick);
    this.stand(l, adv);
  }

  /** The window, the library behind everything (as much of it as fits, the shelves' middle first), and the title. */
  private drawRoom(l: GuildLayout): void {
    const { scene } = this;
    const panel = new PixelFrame(scene, l.w, l.h, { rim: 'bronze', thick: 2, fill: FILL, studs: true });
    panel.img.setInteractive();
    const inner = { w: l.w - 4, h: Math.min(l.h - 4, ROOM.h) };
    const crop = { x: Math.floor((ROOM.w - inner.w) / 2), y: Math.floor((ROOM.h - inner.h) / 2) };
    const art = scene.add.image(2 - crop.x, 2 - crop.y, UI_TEX.guildRoom).setOrigin(0).setCrop(crop.x, crop.y, inner.w, inner.h);
    const dim = scene.add.rectangle(2, 2, inner.w, inner.h, 0x0a0604, ROOM_SHADE).setOrigin(0);
    this.root.add([panel.img, art, dim]);
    this.owned.push(panel);
    const title = this.label('Mage Guild', Math.floor(l.w / 2), 7, { kind: 'title', outline: true, anchor: { x: 0.5, y: 0 } });
    const rule = new PixelImage(scene, drawRule(title.width + 40), { x: 0.5, y: 0 }).setPosition(Math.floor(l.w / 2), 8 + title.height);
    this.root.add(rule.img);
    this.owned.push(rule);
    const close = new PixelButton(scene, { w: CLOSE.w, h: CLOSE.h, label: 'Close', onClick: () => this.act.close() });
    close.setPosition(l.w - CLOSE.w - 6, 6);
    this.root.add(close.root);
    this.owned.push(close);
  }

  private label(text: string, x: number, y: number, opts: ConstructorParameters<typeof TextLabel>[1]): TextLabel {
    const t = new TextLabel(this.scene, opts).setText(text).setPosition(x, y);
    this.root.add(t.img);
    this.owned.push(t);
    return t;
  }

  private plate(x: number, y: number, w: number, h: number, rim: 'bronze' | 'gold' = 'bronze'): PixelFrame {
    const p = new PixelFrame(this.scene, w, h, { rim, fill: PLATE }).setPosition(x, y);
    this.root.add(p.img);
    this.owned.push(p);
    return p;
  }

  /** `texture` in a frame `size` across, shown at `scale` of its 64 pixels. */
  private socket(x: number, y: number, size: number, rim: Parameters<typeof drawSocket>[1], texture: string, scale: number): Phaser.GameObjects.Image {
    const key = putBuffer(this.scene, drawSocket(size, rim));
    this.keys.push(key);
    const frame = this.scene.add.image(x, y, key).setOrigin(0);
    const icon = this.scene.add.image(x + Math.floor(size / 2), y + Math.floor(size / 2), texture).setScale(scale);
    this.root.add([frame, icon]);
    return frame;
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
      at += this.label(stand.name, mid, at, { kind: 'title', wrap: w - 12, anchor: { x: 0.5, y: 0 } }).height;
      at += this.label(stand.says, mid, at + 1, { wrap: w - 12, anchor: { x: 0.5, y: 0 }, ink: INK.dim }).height + 1;
      for (const line of lines) at += this.label(line.text, mid, at + 1, { wrap: w - 12, anchor: { x: 0.5, y: 0 }, ink: line.ink }).height + 1;
      buy?.setPosition(x + 8, y + h - BUY_H - 8);
    } else {
      this.socket(x + 6, y + Math.floor((h - size) / 2), size, rim, UI_TEX.item(stand.item), size === BOOK_SOCKET ? 1 : 0.5);
      const tx = x + 6 + size + 8;
      const wrap = w - (tx - x) - (buy ? BUY_W + 12 : 8);
      let at = y + 6;
      at += this.label(stand.name, tx, at, { kind: 'title', wrap, align: 'left', anchor: { x: 0, y: 0 } }).height;
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

  destroy(): void {
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
