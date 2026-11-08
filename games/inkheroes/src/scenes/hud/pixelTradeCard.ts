import type Phaser from 'phaser';
import { getSound } from '../../host';
import { CLASSES, type Hero } from '../../logic/hero';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { cardButtonLook, drawPortrait, drawRule, drawSocket } from '../battle/pixelFrames';
import type { CardView } from '../battle/pixelBuildCard';
import { INK, PixelButton, PixelFrame, PixelImage, putBuffer, TextLabel, UI_TEX } from '../battle/pixelUi';
import { itemLine } from '../../logic/adventure';
import { bagOf, bagSize, itemDef } from '../../logic/items';
import { ITEM_CELL, ItemCells, itemCols } from './itemCells';
import type { CardSpec } from '../CardScene';
import { ArmyDrag } from './armyDrag';
import { ArmyRow } from './armyRow';
import { armyRowW, SLOT_MAX } from './armySlots';
import { SplitPicker } from './splitPicker';
import { canSendAll, tradeAll, tradeMove, tradeSlot, tradeSplit, type TradeArmies, type TradeRef } from './tradeData';

const PAD = 9;
const GAP = 8;
const LINE = 15;
const RULE_H = 5;
/** Between a hero's army and their bag. */
const BAG_GAP = 4;
/** Between a hero's face and their army. */
const HEAD_GAP = 6;
const BTN_H = 30;
/** The line under the armies: a hint, or Split beside it. */
const FOOT = { h: 24, split: 70 } as const;
/** The card's inside at its widest: a face and a row of the biggest slots. */
const MAX_INNER = SLOT_MAX + HEAD_GAP + armyRowW(SLOT_MAX);
/** A company carried over the card stays above it. */
const CARRIED_DEPTH = 100;

/** The two heroes who met, and how a trade is put into the game. */
export interface TradeSource {
  /** The picked hero and the one met, as they are now. */
  heroes(): readonly [Hero, Hero];
  /** Puts the trade in; false when the game refuses it. */
  change(a: TradeArmies[0], b: TradeArmies[1]): boolean;
  /** Hero `side` hands the other the piece in their bag's place `i`; why not, or null when it's done. */
  give(side: 0 | 1, i: number): string | null;
}

/** A piece picked in one hero's bag. */
interface ItemRef {
  readonly side: 0 | 1;
  readonly i: number;
}

/**
 * Two of the player's heroes side by side, after Heroes III's meeting
 * screen: each one's face, name and class over their army. Companies move
 * as on the hero sheet and in a town: drag one, or tap it and then a slot
 * (like ones merge, others swap), across the two armies or within one;
 * Split parts a picked company. Each hero keeps at least one company.
 * Under each army is the hero's bag: a tap picks a piece and a tap on the
 * other bag hands it over (worn at once in an empty slot).
 */
export class PixelTradeCard implements CardView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Container;
  private owned: { destroy(): void }[] = [];
  private keys: string[] = [];
  private closed = false;
  private picked: TradeRef | null = null;
  private itemPicked: ItemRef | null = null;
  private splitter: SplitPicker | null = null;
  /** A word under the armies after a move that wasn't allowed. */
  private warning = '';

  constructor(private readonly scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private readonly spec: CardSpec, private readonly source: TradeSource, private readonly screen: { w: number; h: number }, private readonly onClose: () => void, quiet = false) {
    if (!quiet) getSound(scene)?.play('card');
    const shade = scene.add.rectangle(0, 0, screen.w, screen.h, 0x0a0604, 0.55).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    this.body = scene.add.container(0, 0);
    this.root = scene.add.container(0, 0, [shade, this.body]);
    parent.add(this.root);
    this.draw();
  }

  private armies(): TradeArmies {
    const [a, b] = this.source.heroes();
    return [a.army, b.army];
  }

  private clear(): void {
    for (const o of this.owned) o.destroy();
    this.body.removeAll(true);
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.owned = [];
    this.keys = [];
  }

  private draw(): void {
    this.clear();
    const { scene, screen } = this;
    const inner = Math.min(MAX_INNER, screen.w - 8 - PAD * 2);
    const slot = tradeSlot(inner, HEAD_GAP);
    const rowW = slot + HEAD_GAP + armyRowW(slot);
    const x = PAD + Math.floor((inner - rowW) / 2);
    let y = this.title(inner);
    const heroes = this.source.heroes();
    const drag = new ArmyDrag<TradeRef>(scene, {
      depth: CARRIED_DEPTH,
      canCarry: (r) => !!this.armies()[r.side][r.i],
      tap: (r) => this.tap(r),
      drop: (from, to) => this.move(from, to),
    });
    heroes.forEach((h, side) => {
      y = this.heroRow(h, side as 0 | 1, slot, x, y, drag) + GAP;
    });
    y = this.foot(x, y - GAP + 4, rowW);
    y = this.buttons(heroes, inner, y + GAP);
    const w = inner + PAD * 2;
    const h = y + PAD;
    const panel = new PixelFrame(scene, w, h, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true });
    panel.img.setInteractive();
    this.owned.push(panel);
    this.body.addAt(panel.img, 0);
    this.body.setPosition(Math.floor((screen.w - w) / 2), Math.max(2, Math.floor((screen.h - h) / 2)));
  }

  /** The title over a rule. Returns the y below. */
  private title(inner: number): number {
    const cx = PAD + Math.floor(inner / 2);
    const t = this.label({ kind: 'title', wrap: inner, anchor: { x: 0.5, y: 0 } }, this.spec.title, cx, PAD);
    const rule = new PixelImage(this.scene, drawRule(Math.min(inner, t.width + 40)), { x: 0.5, y: 0 }).setPosition(cx, PAD + t.height + 2);
    this.owned.push(rule);
    this.body.add(rule.img);
    return PAD + t.height + 2 + RULE_H + GAP;
  }

  /** A hero's name and class, then their face and army. Returns the y below. */
  private heroRow(h: Hero, side: 0 | 1, slot: number, x: number, y: number, drag: ArmyDrag<TradeRef>): number {
    const name = this.label({ kind: 'title', align: 'left', anchor: { x: 0, y: 0 } }, h.name, x, y);
    this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim }, `${CLASSES[h.heroClass].name} · level ${h.level}`, x + name.width + 8, y + 1);
    const top = y + LINE + 3;
    const art = heroArt('player', h.id);
    // The face is as big as the slots (more of the art, never enlarged), heading the row as in a town.
    const key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.hero(art.id, 'idle'), art.art, slot - 4), 'bronze', false, false, slot));
    this.keys.push(key);
    this.body.add(this.scene.add.image(x, top, key).setOrigin(0));
    const row = new ArmyRow(this.scene, slot);
    row.set(h.army, this.picked?.side === side ? this.picked.i : null);
    row.setPosition(x + slot + HEAD_GAP, top);
    this.owned.push(row);
    this.body.add(row.root);
    drag.watch(row, (i) => ({ side, i }));
    return this.bagRow(h, side, x, top + slot + BAG_GAP, slot);
  }

  /** The hero's bag under their army: its picture in the face's column, then its places. Returns the y below. */
  private bagRow(h: Hero, side: 0 | 1, x: number, y: number, slot: number): number {
    const bagX = x + slot + HEAD_GAP;
    if (slot >= ITEM_CELL) {
      const key = putBuffer(this.scene, drawSocket(ITEM_CELL, 'bronze'));
      this.keys.push(key);
      const left = x + slot - ITEM_CELL;
      this.body.add([this.scene.add.image(left, y, key).setOrigin(0), this.scene.add.image(left + ITEM_CELL / 2, y + ITEM_CELL / 2, UI_TEX.bag(bagOf(h).id)).setScale(0.5)]);
    }
    const cells = new ItemCells(this.scene, {
      items: h.bag ?? [], count: bagSize(h), cols: itemCols(armyRowW(slot)),
      picked: this.itemPicked?.side === side ? this.itemPicked.i : null,
      onTap: (i) => this.tapItem({ side, i }),
    }).setPosition(bagX, y);
    this.owned.push(cells);
    this.body.add(cells.root);
    return y + cells.h;
  }

  /** The first tap picks a piece, a tap on the other hero's bag hands it over; on the same bag it picks another, or lets go. */
  private tapItem(r: ItemRef): void {
    const from = this.itemPicked;
    const heroes = this.source.heroes();
    this.warning = '';
    this.picked = null;
    if (from && from.side !== r.side) {
      this.itemPicked = null;
      const why = this.source.give(from.side, from.i);
      if (why) this.warning = why;
      else getSound(this.scene)?.play('card');
    } else {
      const here = heroes[r.side].bag?.[r.i];
      this.itemPicked = from && from.i === r.i ? null : here ? r : null;
    }
    this.draw();
  }

  /** What to do next (or why a move was refused), and Split for a picked company of more than one. Returns the y below. */
  private foot(x: number, y: number, w: number): number {
    const armies = this.armies();
    const picked = this.picked && armies[this.picked.side][this.picked.i];
    const canSplit = !!picked && picked.count > 1;
    if (canSplit) {
      const btn = new PixelButton(this.scene, { w: FOOT.split, h: FOOT.h, label: 'Split', rim: 'gold', onClick: () => this.openSplit() });
      btn.setEnabled(armies[this.picked!.side].includes(null));
      btn.setPosition(x + w - FOOT.split, y);
      this.owned.push(btn);
      this.body.add(btn.root);
    }
    const item = this.itemPicked && this.source.heroes()[this.itemPicked.side].bag?.[this.itemPicked.i];
    const other = this.itemPicked && this.source.heroes()[this.itemPicked.side === 0 ? 1 : 0].name;
    const hint = this.warning || (item ? `${itemDef(item).name}: ${itemLine(item)}. Tap ${other}'s bag to hand it over` : picked ? 'Tap a slot to move them' : 'Drag a company, or tap it or a piece of gear, to move it');
    this.label({ align: 'left', anchor: { x: 0, y: 0 }, ink: this.warning ? INK.title : INK.dim, wrap: w - (canSplit ? FOOT.split + 4 : 0) }, hint, x, y + 4);
    return y + FOOT.h;
  }

  /** "All to <the other>" for each hero with companies to spare, and the card's own buttons. Returns the y below. */
  private buttons(heroes: readonly [Hero, Hero], inner: number, y: number): number {
    const armies = this.armies();
    const all = ([0, 1] as const).map((side) => ({ label: `All to ${heroes[side === 0 ? 1 : 0].name}`, side }));
    const specs = [
      ...all.map((b) => ({ label: b.label, rim: 'bronze' as const, primary: false, enabled: canSendAll(armies, b.side), onClick: () => this.sendAll(b.side) })),
      ...this.spec.buttons.map((b, i) => ({ label: b.label, ...cardButtonLook(b.kind, i + 1), enabled: true, onClick: () => {
        if (this.closed) return;
        this.close();
        b.onClick();
      } })),
    ];
    const bw = Math.floor((inner - GAP * (specs.length - 1)) / specs.length);
    specs.forEach((s, i) => {
      const btn = new PixelButton(this.scene, { w: bw, h: BTN_H, label: s.label, rim: s.rim, primary: s.primary, onClick: s.onClick });
      btn.setEnabled(s.enabled);
      btn.setPosition(PAD + i * (bw + GAP), y);
      this.owned.push(btn);
      this.body.add(btn.root);
    });
    return y + BTN_H;
  }

  /** The first tap picks a company, the second moves it there; a tap on the same one lets go. */
  private tap(r: TradeRef): void {
    const from = this.picked;
    this.warning = '';
    this.itemPicked = null;
    if (!from) this.picked = this.armies()[r.side][r.i] ? r : null;
    else if (from.side === r.side && from.i === r.i) this.picked = null;
    else {
      this.move(from, r);
      return;
    }
    this.draw();
  }

  private move(from: TradeRef, to: TradeRef): void {
    this.picked = null;
    this.warning = '';
    const next = tradeMove(this.armies(), from, to);
    if (next) this.apply(next);
    // The only refusal worth a word: a hero would be left with nobody.
    else if (from.side !== to.side && this.armies()[from.side][from.i]) this.warning = `${this.source.heroes()[from.side].name} must keep at least one company`;
    this.draw();
  }

  private sendAll(side: 0 | 1): void {
    this.picked = null;
    this.warning = '';
    const next = tradeAll(this.armies(), side);
    if (next) this.apply(next);
    else this.warning = `${this.source.heroes()[side === 0 ? 1 : 0].name} has no room for them all`;
    this.draw();
  }

  private apply(next: TradeArmies): void {
    if (!this.source.change(next[0], next[1])) return;
    getSound(this.scene)?.play('card');
  }

  private openSplit(): void {
    const at = this.picked;
    const company = at && this.armies()[at.side][at.i];
    if (!at || !company || this.splitter) return;
    this.splitter = new SplitPicker(this.scene, {
      id: company.creature, count: company.count, screen: this.screen, depth: CARRIED_DEPTH, parent: this.root,
      onSplit: (n) => {
        this.closeSplit();
        const r = tradeSplit(this.armies(), at, n);
        if (!r) return;
        this.apply(r.armies);
        // The new company stays picked, so a tap sends it where it's wanted.
        this.picked = r.at;
        this.draw();
      },
      onClose: () => this.closeSplit(),
    });
  }

  private closeSplit(): void {
    this.splitter?.destroy();
    this.splitter = null;
  }

  private label(opts: ConstructorParameters<typeof TextLabel>[1], text: string, x: number, y: number): TextLabel {
    const l = new TextLabel(this.scene, opts).setText(text).setPosition(x, y);
    this.owned.push(l);
    this.body.add(l.img);
    return l;
  }

  close(): void {
    if (this.closed) return;
    this.dispose();
    this.onClose();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.closeSplit();
    this.clear();
    this.root.destroy();
  }
}
