import Phaser from 'phaser';
import { getSound } from '../../host';
import { SCHOOLS, SPELLS, type SpellId, type SpellSchool } from '../../logic/spells';
import { bookSize, drawBook, drawRibbon, drawRule, FILLS, pageOrigin, RIBBONS } from './pixelFrames';
import { PixelBuffer, type Rgba } from './pixelRaster';
import { LINE_H } from './pixelFont';
import { PixelFrame, PixelImage, putBuffer, TextLabel, UI_TEX } from './pixelUi';

/** What the spellbook shows: the hero's mana, the spells it knows, why one can't be cast now, and what picking one does. */
export interface BookSpec {
  readonly mana: number;
  readonly spells: readonly SpellId[];
  readonly why: (id: SpellId) => string | null;
  readonly onPick: (id: SpellId) => void;
  /** The line under the book when no spell is hovered. */
  readonly note: string;
}

/** A page, the spells on it (two across, three down), and the ribbons, UI pixels. */
const PAGE = { w: 180, minW: 140, pad: 8 } as const;
/** A spell's slot: its icon, up to two lines of name, and its cost; the page is three of them tall. */
const SLOT_H = 4 + 24 + 2 + LINE_H * 3 + 4;
const ROWS = 3;
const PAGE_H = PAGE.pad * 2 + SLOT_H * ROWS;
const COLS = 2;
const PER_PAGE = COLS * ROWS;
const TAB = { w: 12, h: 32, gap: 4, out: 34 } as const;
const MARKER = { w: 28, h: 30 } as const;
const FOOT_H = LINE_H * 2 + 6;
/** Roman numerals for spell levels. */
const LEVELS = ['I', 'II', 'III', 'IV', 'V'] as const;
/** Ink on parchment: names, and the dimmer level and cost line. */
const INK_DARK: Rgba = [70, 38, 18, 255];
const INK_SOFT: Rgba = [128, 88, 54, 255];
const INK_OFF: Rgba = [150, 128, 100, 255];
/** A school's name on its page, in red ink. */
const INK_RED: Rgba = [130, 34, 22, 255];
/** Each tab's emblem: a spell of its school. */
const TAB_ICON: Readonly<Record<SpellSchool, SpellId>> = { common: 'magicArrow', olympian: 'lightningBolt' };

/**
 * The hero's spellbook, as Heroes 3's: an open book with a ribbon tab per
 * school on its edge (common magic, and the divine powers of the hero's
 * gods), six spells to a page (icon, name, level and mana), the hovered
 * spell's effect under it, and ribbons for the mana left and for closing.
 * A spell that can't be cast now is faded and says why. Picking one closes
 * the book and hands the spell back.
 */
export class SpellBook {
  private readonly root: Phaser.GameObjects.Container;
  private readonly pageLayer: Phaser.GameObjects.Container;
  private readonly owned: { destroy(): void }[] = [];
  private readonly pageOwned: { destroy(): void }[] = [];
  private readonly keys: string[] = [];
  private readonly foot: TextLabel;
  private readonly tabs = new Map<SpellSchool, Phaser.GameObjects.Image>();
  private readonly tabIcons = new Map<SpellSchool, Phaser.GameObjects.Image>();
  private school: SpellSchool;
  private closed = false;
  /** On touch, the spell a first tap read out (and lit); a second tap on it casts. */
  private armed: { readonly id: SpellId; readonly glow: Phaser.GameObjects.Rectangle } | null = null;
  private readonly origin: { x: number; y: number };
  private readonly pageW: number;

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private readonly spec: BookSpec, screen: { w: number; h: number }, private readonly onClose: () => void) {
    getSound(scene)?.play('card');
    // Pages as wide as the screen allows, up to PAGE.w.
    this.pageW = Math.max(PAGE.minW, Math.min(PAGE.w, Math.floor((screen.w - 8 - TAB.out - bookSize(0, 0).w) / 2)));
    const size = bookSize(this.pageW, PAGE_H);
    const total = { w: size.w + TAB.out, h: size.h + MARKER.h - 6 + FOOT_H + 4 };
    this.origin = { x: Math.floor((screen.w - total.w) / 2), y: Math.max(2, Math.floor((screen.h - total.h) / 2)) };
    const { x: bx, y: by } = this.origin;
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.6).setOrigin(0).setInteractive();
    // The tabs go behind the book, so only their ends show past its edge.
    const tabParts: Phaser.GameObjects.GameObject[] = [];
    SCHOOLS.forEach((sch, i) => {
      const key = this.own(drawRibbon(TAB.w + TAB.out, TAB.h, RIBBONS[sch.id], 'right'));
      const img = scene.add.image(bx + size.w - TAB.w, by + 18 + i * (TAB.h + TAB.gap), key).setOrigin(0).setInteractive();
      const icon = scene.add.image(img.x + TAB.w + 3, img.y + Math.floor((TAB.h - 24) / 2), UI_TEX.spell(TAB_ICON[sch.id])).setOrigin(0);
      this.tabIcons.set(sch.id, icon);
      img.on('pointerup', () => this.open(sch.id));
      img.on('pointerover', () => this.foot.setText(sch.name));
      img.on('pointerout', () => this.foot.setText(this.idle()));
      this.tabs.set(sch.id, img);
      tabParts.push(img, icon);
    });
    const book = new PixelImage(scene, drawBook(this.pageW, PAGE_H)).setPosition(bx, by);
    // Markers hanging under the book: the mana left, and close.
    const markerY = by + size.h - 6;
    const manaKey = this.own(drawRibbon(MARKER.w + 8, MARKER.h, RIBBONS.red, 'down'));
    const mana = scene.add.image(bx + Math.floor(size.w / 2) - MARKER.w - 12, markerY, manaKey).setOrigin(0);
    const manaText = new TextLabel(scene, { outline: true, anchor: { x: 0.5, y: 0 } }).setText(`${spec.mana}`).setPosition(mana.x + Math.floor(mana.width / 2), markerY + 6);
    const closeKey = this.own(drawRibbon(MARKER.w + 8, MARKER.h, RIBBONS.red, 'down'));
    const close = scene.add.image(bx + Math.floor(size.w / 2) + 12, markerY, closeKey).setOrigin(0).setInteractive();
    const closeX = new TextLabel(scene, { outline: true, anchor: { x: 0.5, y: 0 } }).setText('Close').setPosition(close.x + Math.floor(close.width / 2), markerY + 6);
    close.on('pointerup', () => this.close());
    const manaTip = 'Mana: each spell costs some; it comes back day by day.';
    mana.setInteractive().on('pointerover', () => this.foot.setText(manaTip)).on('pointerout', () => this.foot.setText(this.idle()));
    // The line under it all: what the hovered spell does.
    const footPlate = new PixelFrame(scene, size.w - 16, FOOT_H, { rim: 'bronze', fill: FILLS.plate }).setPosition(bx + 8, markerY + MARKER.h + 2);
    this.foot = new TextLabel(scene, { wrap: size.w - 26, anchor: { x: 0.5, y: 0.5 } }).setPosition(bx + Math.floor(size.w / 2), markerY + MARKER.h + 2 + Math.floor(FOOT_H / 2));
    this.pageLayer = scene.add.container(0, 0);
    this.owned.push(book, manaText, closeX, footPlate, this.foot);
    this.root = scene.add.container(0, 0, [shade, ...tabParts, mana, close, book.img, this.pageLayer, manaText.img, closeX.img, footPlate.img, this.foot.img]);
    parent.add(this.root);
    // Open on the first school the hero knows a spell of.
    this.school = SCHOOLS.find((sch) => spec.spells.some((id) => SPELLS[id].school === sch.id))?.id ?? 'common';
    this.open(this.school);
  }

  /** The line under the book with nothing hovered: the open school, and the book's note. */
  private idle(): string {
    return `${SCHOOLS.find((s) => s.id === this.school)!.name} · ${this.spec.note}`;
  }

  private own(b: PixelBuffer): string {
    const key = putBuffer(this.scene, b);
    this.keys.push(key);
    return key;
  }

  /** Turns to a school: its tab stands out, its known spells fill the pages. */
  private open(school: SpellSchool): void {
    this.school = school;
    this.armed = null;
    this.foot.setText(this.idle());
    const size = bookSize(this.pageW, PAGE_H);
    SCHOOLS.forEach((sch) => {
      const tab = this.tabs.get(sch.id)!;
      const out = sch.id === school ? 4 : 0;
      tab.setX(this.origin.x + size.w - TAB.w + out).setAlpha(sch.id === school ? 1 : 0.7);
      this.tabIcons.get(sch.id)!.setX(tab.x + TAB.w + 3).setAlpha(sch.id === school ? 1 : 0.7);
    });
    for (const o of this.pageOwned.splice(0)) o.destroy();
    this.pageLayer.removeAll(true);
    const spells = schoolSpells(this.spec.spells, school);
    if (!spells.length) {
      const name = SCHOOLS.find((s) => s.id === school)!.name;
      const p = pageOrigin(this.pageW, 0);
      const empty = new TextLabel(this.scene, { ink: INK_SOFT, wrap: this.pageW - 24, anchor: { x: 0.5, y: 0.5 } })
        .setText(`Your hero knows no ${name} yet.`)
        .setPosition(this.origin.x + p.x + Math.floor(this.pageW / 2), this.origin.y + p.y + Math.floor(PAGE_H / 2));
      this.pageOwned.push(empty);
      this.pageLayer.add(empty.img);
      return;
    }
    spells.slice(0, PER_PAGE * 2).forEach((id, i) => this.slot(id, i));
    if (spells.length <= PER_PAGE) this.loreSide(school);
  }

  /** With the spells all on the left page, the right one names the school and tells its lore. */
  private loreSide(school: SpellSchool): void {
    const sch = SCHOOLS.find((s) => s.id === school)!;
    const p = pageOrigin(this.pageW, 1);
    const cx = this.origin.x + p.x + Math.floor(this.pageW / 2);
    const title = new TextLabel(this.scene, { ink: INK_RED, anchor: { x: 0.5, y: 0 } }).setText(sch.name).setPosition(cx, this.origin.y + p.y + 26);
    const rule = new PixelImage(this.scene, drawRule(Math.min(this.pageW - 30, title.width + 30)), { x: 0.5, y: 0 }).setPosition(cx, this.origin.y + p.y + 26 + title.height + 3);
    const lore = new TextLabel(this.scene, { ink: INK_SOFT, wrap: this.pageW - 26, anchor: { x: 0.5, y: 0 } }).setText(sch.lore).setPosition(cx, this.origin.y + p.y + 26 + title.height + 14);
    this.pageOwned.push(title, rule, lore);
    this.pageLayer.add([title.img, rule.img, lore.img]);
  }

  /** One spell on the page: its icon, name, and level and cost; hover (or a first tap) tells what it does, a click picks it. */
  private slot(id: SpellId, i: number): void {
    const def = SPELLS[id];
    const why = this.spec.why(id);
    const page = i < PER_PAGE ? 0 : 1;
    const k = i % PER_PAGE;
    const p = pageOrigin(this.pageW, page);
    const cw = Math.floor((this.pageW - PAGE.pad * 2) / COLS);
    const ch = SLOT_H;
    const x = this.origin.x + p.x + PAGE.pad + (k % COLS) * cw;
    const y = this.origin.y + p.y + PAGE.pad + Math.floor(k / COLS) * ch;
    const cx = x + Math.floor(cw / 2);
    const glow = this.scene.add.rectangle(x + 1, y + 1, cw - 2, ch - 2, 0xfff4d6, 0.0).setOrigin(0).setInteractive();
    const icon = this.scene.add.image(cx - 12, y + 4, UI_TEX.spell(id)).setOrigin(0).setAlpha(why ? 0.45 : 1);
    const level = new TextLabel(this.scene, { ink: why ? INK_OFF : INK_SOFT, anchor: { x: 0, y: 0 } }).setText(LEVELS[def.level - 1] ?? `${def.level}`).setPosition(cx + 14, y + 4);
    const name = new TextLabel(this.scene, { ink: why ? INK_OFF : INK_DARK, wrap: cw - 4, anchor: { x: 0.5, y: 0 } }).setText(def.name).setPosition(cx, y + 30);
    const cost = new TextLabel(this.scene, { ink: why ? INK_OFF : INK_SOFT, anchor: { x: 0.5, y: 0 } }).setText(`${def.mana} mana`).setPosition(cx, y + 30 + name.height);
    glow.on('pointerover', () => {
      glow.setFillStyle(0xfff4d6, 0.35);
      this.foot.setText(why ? `${def.name}: ${why}` : `${def.name}: ${def.says}`);
    });
    glow.on('pointerout', () => {
      // A finger lifting leaves the spell it read out lit.
      if (this.armed?.id === id) return;
      glow.setFillStyle(0xfff4d6, 0);
      this.foot.setText(this.idle());
    });
    glow.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      // There's no hover on a phone: the first tap reads the spell out (or why it can't be cast), a second casts it.
      if (ptr.wasTouch && this.armed?.id !== id) {
        this.armed?.glow.setFillStyle(0xfff4d6, 0);
        this.armed = { id, glow };
        glow.setFillStyle(0xfff4d6, 0.35);
        this.foot.setText(why ? `${def.name}: ${why}` : `${def.name}: ${def.says} · tap again to cast`);
        return;
      }
      if (why) return;
      this.close();
      this.spec.onPick(id);
    });
    this.pageOwned.push(level, name, cost);
    this.pageLayer.add([glow, icon, level.img, name.img, cost.img]);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const o of [...this.pageOwned, ...this.owned]) o.destroy();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.onClose();
  }
}

/** The spells a school's pages show: the known ones of that school, by level then cost. */
export function schoolSpells(spells: readonly SpellId[], school: SpellSchool): SpellId[] {
  return spells.filter((id) => SPELLS[id].school === school).sort((a, b) => SPELLS[a].level - SPELLS[b].level || SPELLS[a].mana - SPELLS[b].mana);
}
