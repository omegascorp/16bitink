import type Phaser from 'phaser';
import { getSound } from '../../host';
import type { Hero } from '../../logic/hero';
import { changeWords, setInfo, wearPreview } from '../../logic/itemCompare';
import { bagRoom, itemDef, itemSays, QUALITY_NAMES, takeOff, wear, type ItemId, type Slot } from '../../logic/items';
import { drawRule, drawSocket } from '../battle/pixelFrames';
import type { Rgba } from '../battle/pixelRaster';
import { QUALITY_RIM, qualityInk } from '../battle/rankLook';
import { INK, PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, UI_TEX } from '../battle/pixelUi';

/** The card's width at its widest, padding, gaps, the icon's socket and a button, UI pixels. */
const MAX_W = 300;
const PAD = 9;
const GAP = 6;
const SOCKET = 68;
const BTN_H = 30;
const BTN_NOTE_H = 42;
/** Space above a block's heading. */
const BLOCK_GAP = 8;

/** A slot's full name, for the grade line. */
const SLOT_NAME: Readonly<Record<Slot, string>> = {
  helm: 'Helm', cuirass: 'Cuirass', bracers: 'Bracers', belt: 'Belt', greaves: 'Greaves', boots: 'Boots', weapon: 'Weapon', shield: 'Shield', amulet: 'Amulet', ring1: 'Ring', ring2: 'Ring', book: 'Spellbook', machine: 'War Machine',
};

/** Where the piece is: worn in a slot, or in the bag. */
export type ItemPlace = { readonly slot: Slot } | { readonly bag: number };

/**
 * A piece of gear's card on the hero's Gear tab: its icon in its grade's
 * frame, grade and what it gives; its set, how many of the set are worn and
 * each bonus (lit once on); for a piece in the bag, what wearing it would
 * change against the piece it replaces; and Wear or Take off.
 */
export class ItemCard {
  private readonly root: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];
  private closed = false;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, hero: Hero, place: ItemPlace, screen: { w: number; h: number }, onChange: (h: Hero) => void, private readonly onClose: () => void) {
    getSound(scene)?.play('card');
    const id = ('slot' in place ? hero.gear?.[place.slot] : hero.bag?.[place.bag]) as ItemId;
    const def = itemDef(id);
    const w = Math.min(MAX_W, screen.w - 8);
    const inner = w - PAD * 2;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    parts.push(shade);
    // Laid out from 0, then the whole card is moved to the middle of the screen.
    const body = scene.add.container(0, 0);
    let y = PAD;
    const text = (s: string, ink: Rgba, x = 0, wrap = inner, kind?: 'title'): TextLabel => {
      const l = new TextLabel(scene, { align: kind ? 'center' : 'left', anchor: kind ? { x: 0.5, y: 0 } : { x: 0, y: 0 }, ink, wrap, ...(kind ? { kind } : {}) }).setText(s).setPosition(kind ? Math.floor(w / 2) : PAD + x, y);
      this.owned.push(l);
      body.add(l.img);
      return l;
    };
    y += text(def.name, qualityInk(id), 0, inner, 'title').height + 3;
    const rule = new PixelImage(scene, drawRule(Math.min(inner, 160)), { x: 0.5, y: 0 }).setPosition(Math.floor(w / 2), y);
    this.owned.push(rule);
    body.add(rule.img);
    y += 5 + GAP;
    // The icon in its grade's frame, the grade and what it gives beside it.
    const socket = putBuffer(scene, drawSocket(SOCKET, QUALITY_RIM[def.quality]));
    this.keys.push(socket);
    body.add(scene.add.image(PAD, y, socket).setOrigin(0));
    body.add(scene.add.image(PAD + SOCKET / 2, y + SOCKET / 2, UI_TEX.item(id)).setScale(1));
    const top = y;
    const besideX = SOCKET + GAP;
    y += text(`${QUALITY_NAMES[def.quality]} · ${SLOT_NAME[def.slot]}`, INK.dim, besideX, inner - besideX).height + 2;
    y += text(itemSays(id) || 'No stats', INK.text, besideX, inner - besideX).height;
    y = Math.max(y, top + SOCKET) + GAP;
    // Its set and the set's bonuses.
    const set = setInfo(hero, id);
    if (set) {
      y += BLOCK_GAP - GAP;
      y += text(`${set.name}: ${set.worn} of ${set.size} worn`, INK.title).height + 2;
      if (!set.tiers.length) y += text('A common set gives no set bonus', INK.dim).height + 2;
      for (const t of set.tiers) y += text(`${t.at} pieces: ${t.says}${t.lit ? ' (on)' : ''}`, t.lit ? INK.good : INK.dim).height + 2;
    }
    // A piece in the bag: what wearing it changes.
    const preview = 'bag' in place ? wearPreview(hero, place.bag) : null;
    if (preview) {
      y += BLOCK_GAP;
      y += text(preview.replaces ? `Wearing it instead of ${itemDef(preview.replaces).name}:` : 'Wearing it:', INK.title).height + 2;
      if (preview.replaces) y += text(`${itemDef(preview.replaces).name} gives ${itemSays(preview.replaces) || 'no stats'}`, INK.dim).height + 2;
      for (const c of preview.changes) y += text(changeWords(c), c.by > 0 ? INK.good : INK.damage).height + 2;
      for (const s of preview.setsOn) y += text(`Turns on ${s}`, INK.good).height + 2;
      for (const s of preview.setsOff) y += text(`Turns off ${s}`, INK.damage).height + 2;
      if (!preview.changes.length && !preview.setsOn.length && !preview.setsOff.length) y += text('No change to your stats', INK.dim).height + 2;
    }
    y += GAP;
    // Wear or Take off, then Close.
    const worn = 'slot' in place;
    const next = worn ? takeOff(hero, place.slot) : wear(hero, place.bag);
    const blocked = worn && !bagRoom(hero) ? 'The bag is full' : undefined;
    const actH = blocked ? BTN_NOTE_H : BTN_H;
    const act = new PixelButton(scene, { w: inner, h: actH, label: worn ? 'Take off' : 'Wear', ...(blocked ? { note: blocked } : {}), primary: !blocked, onClick: () => { this.close(); onChange(next); } });
    act.setPosition(PAD, y);
    act.setEnabled(next !== hero);
    this.owned.push(act);
    body.add(act.root);
    y += actH + GAP;
    const close = new PixelButton(scene, { w: inner, h: BTN_H, label: 'Close', rim: 'gold', onClick: () => this.close() });
    close.setPosition(PAD, y);
    this.owned.push(close);
    body.add(close.root);
    y += BTN_H + PAD;
    const panel = new PixelFrame(scene, w, y, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true });
    panel.img.setInteractive();
    this.owned.push(panel);
    body.addAt(panel.img, 0);
    body.setPosition(Math.floor((screen.w - w) / 2), Math.max(2, Math.floor((screen.h - y) / 2)));
    parts.push(body);
    this.root = scene.add.container(0, 0, parts);
    parent.add(this.root);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const o of this.owned) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.onClose();
  }
}
