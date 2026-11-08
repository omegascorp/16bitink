import type Phaser from 'phaser';
import type { IconName } from '../../art/pixel/ui';
import { calendar, heroInGarrison, heroVisiting, type Adventure } from '../../logic/adventure';
import type { Town } from '../../logic/town';
import { MAX_TOWERS } from '../../logic/siege';
import { income, towerPlaces, towersOf } from '../../logic/town';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawPortrait, drawSocket } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import { ArmyDrag } from '../hud/armyDrag';
import { ArmyRow } from '../hud/armyRow';
import { armyRowW, armyRowOf } from '../hud/armySlots';
import { PurseRow, PURSE_BAR_H, PURSE_ROW_W } from '../hud/purseRow';
import { armiesW, armyH, BTN, buttonGrid, buttonsGridW, cellsW, GAP, HEAD_GAP, LINE, NARROW_ROUND, narrowButtonW, PAD, ROW_GAP, stripLayout, townButtons, type TownButton } from './stripLayout';

export type TownScreen = 'hall' | 'fort' | 'guild' | 'smith' | 'tavern';
/** A slot of a row; `i` HEAD is the row's head (the crest or the hero's face): picking the hero there moves them with every company. */
export type SlotRef = { readonly army: 'hero' | 'garrison' | 'tower'; readonly i: number };
export const HEAD = -1;

/** The parts of the strip drawn at the slot's size. */
interface StripFaces {
  readonly crest: Phaser.GameObjects.Container;
  readonly heroFace: Phaser.GameObjects.Image;
  /** The hero's face lit (picked). */
  readonly heroLit: Phaser.GameObjects.Image;
  readonly emptyFace: PixelImage;
  readonly garrison: ArmyRow;
  readonly visitor: ArmyRow;
  /** The tower places, on a tab over the strip. */
  readonly towers: ArmyRow;
  /** The tower's icon at the head of the tower places, in the crest's column. */
  readonly towerHead: Phaser.GameObjects.Container;
  readonly towersFrame: PixelFrame;
  readonly owned: { destroy(): void }[];
}

export interface TownBarActions {
  open(screen: TownScreen): void;
  leave(): void;
  pickSlot(ref: SlotRef): void;
  /** Whether the company at `ref` can be dragged. */
  canCarry(ref: SlotRef): boolean;
  /** A company was dragged from one slot onto another. */
  dropSlot(from: SlotRef, to: SlotRef): void;
  /** Split the picked company. */
  split(): void;
}

const SPLIT = { w: 100, h: 30 } as const;
/** The tab holding the tower places: its padding round the tower's icon and the places, which stand in the army rows' columns. */
const TAB = { pad: 4 } as const;
const PANEL_FILL = [34, 24, 17, 246] as const;

/**
 * The strip along the town screen's bottom, after Heroes III's: the town's
 * name, income and building for the day; the garrison over the visiting
 * hero, slot by slot (tap one, then another, to move troops; tap the
 * hero's face, then the other row, to move the hero with every company,
 * or drag a company there; a picked company can be split); Hall, Fort,
 * the Guild, the Blacksmith and the Tavern once built, and Leave, in two rows; under it
 * all the purse and the date. On a narrow screen the buttons and the town's
 * lines stack above the armies.
 */
export class TownBar {
  private readonly owned: { destroy(): void }[] = [];
  private frame: PixelFrame | null = null;
  private purseFrame: PixelFrame | null = null;
  private readonly purse: PurseRow;
  private readonly date: TextLabel;
  private readonly name: TextLabel;
  private readonly incomeLine: TextLabel;
  private readonly status: TextLabel;
  private readonly goldIcon: Phaser.GameObjects.Image;
  /** What's drawn at the slot's size: remade when it changes. */
  private faces: StripFaces | null = null;
  private readonly drag: ArmyDrag<SlotRef>;
  private readonly splitBtn: PixelButton;
  private slot = 0;
  /** The hero whose face heads their row (the picked one). */
  private faceFor = '';
  /** The row the hero heads: the visitor's, or the garrison's. */
  private heroRow: SlotRef['army'] = 'hero';
  private readonly away: TextLabel;
  /** Whether the town has any tower places, and nothing's open over the strip. */
  private towersShown = false;
  private towersHidden = false;
  private readonly buttons: PixelButton[];
  private narrow = false;
  /** A button's width on the stacked strip. */
  private narrowW: number = BTN.w;
  /** What the buttons were last made for. */
  private buttonsKey = '';
  private armiesAt = { x: 0, y: 0 };
  /** Where the strip begins on screen. */
  top = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly actions: TownBarActions, private readonly depth: number) {
    this.purse = new PurseRow(scene, depth + 1);
    this.date = this.text({ kind: 'title', align: 'right', anchor: { x: 1, y: 0 } });
    this.name = this.text({ kind: 'title', align: 'left', anchor: { x: 0, y: 0 } });
    this.incomeLine = this.text({ align: 'left', anchor: { x: 0, y: 0 } });
    this.status = this.text({ align: 'left', anchor: { x: 0, y: 0 }, ink: INK.dim });
    this.away = this.text({ align: 'center', anchor: { x: 0.5, y: 0.5 }, ink: INK.dim });
    this.goldIcon = scene.add.image(0, 0, UI_TEX.res('gold')).setOrigin(0).setDepth(depth + 1);
    this.drag = new ArmyDrag<SlotRef>(scene, {
      depth: depth + 40,
      canCarry: (r) => actions.canCarry(r),
      tap: (r) => actions.pickSlot(r),
      drop: (from, to) => actions.dropSlot(from, to),
    });
    this.splitBtn = new PixelButton(scene, { w: SPLIT.w, h: SPLIT.h, label: 'Split', rim: 'gold', onClick: () => actions.split() });
    this.splitBtn.root.setDepth(depth + 1).setVisible(false);
    this.buttons = [];
  }

  private text(opts: ConstructorParameters<typeof TextLabel>[1]): TextLabel {
    const t = new TextLabel(this.scene, opts);
    t.img.setDepth(this.depth + 1);
    this.owned.push(t);
    return t;
  }

  private makeButtons(names: readonly TownButton[], h: number, narrow: boolean): void {
    const actions = this.actions;
    for (const b of this.buttons) b.destroy();
    this.buttons.length = 0;
    const specs: Readonly<Record<TownButton, { label: string; icon: IconName; rim?: 'gold'; onClick(): void }>> = {
      hall: { label: 'Hall', icon: 'hall', onClick: () => actions.open('hall') },
      fort: { label: 'Fort', icon: 'recruit', onClick: () => actions.open('fort') },
      guild: { label: 'Guild', icon: 'spell', onClick: () => actions.open('guild') },
      smith: { label: 'Smith', icon: 'smith', onClick: () => actions.open('smith') },
      tavern: { label: 'Tavern', icon: 'tavern', onClick: () => actions.open('tavern') },
      leave: { label: 'Leave', icon: 'leave', rim: 'gold', onClick: () => actions.leave() },
    };
    const grid = buttonGrid(names.length);
    names.forEach((name, i) => {
      const s = specs[name];
      const btn = new PixelButton(this.scene, { w: narrow ? this.narrowW : cellsW(grid[i]!.span), h, label: s.label, icon: s.icon, stacked: true, rim: s.rim, onClick: s.onClick });
      btn.root.setDepth(this.depth + 1);
      this.buttons.push(btn);
    });
  }

  /** The crest, the hero's face and both rows, `slot` pixels across. */
  private makeFaces(slot: number): void {
    const { scene, depth, actions } = this;
    this.dropFaces();
    const owned: { destroy(): void }[] = [];
    // The town's crest heads the garrison, or the hero's face when the hero is in it; the hero's face heads the visitor's row (an empty frame while away).
    const tapHead = (img: Phaser.GameObjects.Image, row: () => SlotRef['army']): void => {
      img.setInteractive().on('pointerup', () => actions.pickSlot({ army: row(), i: HEAD }));
    };
    const crestFrame = new PixelImage(scene, drawSocket(slot, 'gold'));
    const crestIcon = scene.add.image(slot / 2, slot / 2, UI_TEX.icon('town'));
    tapHead(crestFrame.img, () => 'garrison');
    const crest = scene.add.container(0, 0, [crestFrame.img, crestIcon]).setDepth(depth + 1);
    const hero = heroArt('player', this.faceFor);
    const cut = faceOf(scene, PX_TEX.hero(hero.id, 'idle'), hero.art, slot - 4);
    const face = new PixelImage(scene, drawPortrait(cut, 'bronze', false, false, slot));
    const lit = new PixelImage(scene, drawPortrait(cut, 'gold', false, false, slot));
    face.img.setDepth(depth + 1);
    lit.img.setDepth(depth + 1);
    tapHead(face.img, () => this.heroRow);
    tapHead(lit.img, () => this.heroRow);
    const emptyFace = new PixelImage(scene, drawSocket(slot, 'bronze'));
    emptyFace.img.setDepth(depth + 1);
    tapHead(emptyFace.img, () => 'hero');
    const garrison = new ArmyRow(scene, slot);
    const visitor = new ArmyRow(scene, slot);
    garrison.root.setDepth(depth + 1);
    visitor.root.setDepth(depth + 1);
    this.drag.watch(garrison, (i) => ({ army: 'garrison', i }));
    this.drag.watch(visitor, (i) => ({ army: 'hero', i }));
    const towers = new ArmyRow(scene, slot, MAX_TOWERS);
    towers.root.setDepth(depth + 1);
    this.drag.watch(towers, (i) => ({ army: 'tower', i }));
    const towersFrame = new PixelFrame(scene, TAB.pad * 2 + slot + HEAD_GAP + armyRowOf(slot), slot + TAB.pad * 2, { rim: 'bronze', fill: PANEL_FILL });
    towersFrame.img.setDepth(depth);
    const towerFrame = new PixelImage(scene, drawSocket(slot, 'gold'));
    const towerHead = scene.add.container(0, 0, [towerFrame.img, scene.add.image(slot / 2, slot / 2, UI_TEX.icon('tower'))]).setDepth(depth + 1);
    owned.push(crestFrame, towerFrame, face, lit, emptyFace, garrison, visitor, towers, towersFrame);
    this.faces = { crest, heroFace: face.img, heroLit: lit.img, emptyFace, garrison, visitor, towers, towerHead, towersFrame, owned };
    this.slot = slot;
  }

  private dropFaces(): void {
    if (!this.faces) return;
    this.drag.forget(this.faces.garrison);
    this.drag.forget(this.faces.visitor);
    this.drag.forget(this.faces.towers);
    for (const o of this.faces.owned) o.destroy();
    this.faces.crest.destroy(true);
    this.faces.towerHead.destroy(true);
    this.faces = null;
  }

  /** Lays the strip out for town `t` on a `w` × `h` screen, with the Tavern's button when it `hires`; where its top lands. */
  layout(w: number, h: number, t: Town, hires = false): number {
    const names = townButtons(t.built, hires);
    const { narrow, slot, townW } = stripLayout(w, h, PURSE_BAR_H, names.length);
    if (slot !== this.slot) this.makeFaces(slot);
    const buttonsH = narrow ? BTN.narrowH : slot;
    this.narrowW = narrowButtonW(names.length, w);
    const key = `${names.join()}:${buttonsH}:${narrow}:${this.narrowW}`;
    if (key !== this.buttonsKey) this.makeButtons(names, buttonsH, narrow);
    this.buttonsKey = key;
    this.narrow = narrow;
    const barH = narrow ? NARROW_ROUND + armyH(slot) : PAD + armyH(slot) + PAD;
    const purseTop = h - PURSE_BAR_H + 2;
    this.top = purseTop - barH;
    this.frame?.destroy();
    this.frame = new PixelFrame(this.scene, w + 4, barH, { rim: 'bronze', thick: 2, fill: PANEL_FILL, studs: true }).setPosition(-2, this.top);
    this.frame.img.setDepth(this.depth);
    this.purseFrame?.destroy();
    this.purseFrame = new PixelFrame(this.scene, w + 4, PURSE_BAR_H, { rim: 'bronze', fill: [28, 20, 14, 246] }).setPosition(-2, purseTop);
    this.purseFrame.img.setDepth(this.depth);
    const purseX = Math.max(6, Math.floor((w - PURSE_ROW_W - 160) / 2));
    const end = this.purse.place(purseX, purseTop);
    this.date.setPosition(w - 6, purseTop + Math.floor((PURSE_BAR_H - 2 - LINE) / 2));
    this.date.img.setVisible(w - end > 150);
    if (narrow) this.layoutNarrow(w);
    else this.layoutWide(w, townW);
    return this.top;
  }

  private layoutWide(w: number, townW: number): void {
    const armies = armiesW(this.slot);
    const count = this.buttons.length;
    const left = Math.floor((w - (townW + GAP + armies + GAP + buttonsGridW(count))) / 2);
    const y = this.top + PAD;
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left, y + LINE + 4);
    this.incomeLine.setPosition(left + 19, y + LINE + 5);
    this.status.setWrap(townW).setPosition(left, y + LINE * 2 + 9);
    this.splitBtn.setPosition(left, y + armyH(this.slot) - SPLIT.h);
    this.placeArmies(left + townW + GAP, y);
    // In line with the armies' rows.
    const bx = left + townW + GAP + armies + GAP;
    const grid = buttonGrid(count);
    this.buttons.forEach((b, i) => b.setPosition(bx + grid[i]!.col * (BTN.w + BTN.gap), y + grid[i]!.row * (this.slot + ROW_GAP)));
  }

  private layoutNarrow(w: number): void {
    const armies = armiesW(this.slot);
    let y = this.top + PAD;
    const n = this.buttons.length;
    const bx = Math.floor((w - (n * this.narrowW + (n - 1) * BTN.gap)) / 2);
    this.buttons.forEach((b, i) => b.setPosition(bx + i * (this.narrowW + BTN.gap), y));
    y += BTN.narrowH + ROW_GAP;
    const left = Math.floor((w - armies) / 2);
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left + armies - 96, y - 1);
    this.incomeLine.setPosition(left + armies - 77, y);
    this.status.setWrap(armies - SPLIT.w - 4).setPosition(left, y + LINE);
    this.splitBtn.setPosition(left + armies - SPLIT.w, y + LINE * 2 - SPLIT.h);
    this.placeArmies(left, y + LINE * 2 + ROW_GAP);
  }

  private placeArmies(x: number, y: number): void {
    const f = this.faces!;
    const vy = y + this.slot + ROW_GAP;
    this.armiesAt = { x, y };
    f.crest.setPosition(x, y);
    f.garrison.setPosition(x + this.slot + HEAD_GAP, y);
    this.placeHero();
    f.emptyFace.setPosition(x, vy);
    f.visitor.setPosition(x + this.slot + HEAD_GAP, vy);
    this.away.setPosition(x + this.slot + HEAD_GAP + Math.floor(armyRowW(this.slot) / 2), vy + Math.floor(this.slot / 2));
    // The tab stands on the strip's top edge, over the left of the armies (the list of towns has the right): its icon over the crest, its places over the armies' first columns.
    const tabY = this.top - this.slot - TAB.pad * 2 + 2;
    f.towersFrame.setPosition(x - TAB.pad, tabY);
    f.towerHead.setPosition(x, tabY + TAB.pad);
    f.towers.setPosition(x + this.slot + HEAD_GAP, tabY + TAB.pad);
  }

  /** Hides the tower tab while a window is open over the town. */
  setTowersHidden(hidden: boolean): void {
    this.towersHidden = hidden;
    this.showTowers();
  }

  private showTowers(): void {
    const on = this.towersShown && !this.towersHidden;
    this.faces?.towers.root.setVisible(on);
    this.faces?.towersFrame.img.setVisible(on);
    this.faces?.towerHead.setVisible(on);
  }

  /** The hero's face at the head of the row the hero is in. */
  private placeHero(): void {
    const { x, y } = this.armiesAt;
    const f = this.faces!;
    const hy = this.heroRow === 'garrison' ? y : y + this.slot + ROW_GAP;
    f.heroFace.setPosition(x, hy);
    f.heroLit.setPosition(x, hy);
  }

  /** Shows town `t`'s lines and armies (the hero's row only when the hero is in it); `picked` lit, with Split when it can be split. */
  refresh(adv: Adventure, t: Town, picked: SlotRef | null): void {
    if (adv.hero.id !== this.faceFor) {
      // Another hero picked (one just hired): their face heads the row.
      this.faceFor = adv.hero.id;
      this.makeFaces(this.slot);
      this.placeArmies(this.armiesAt.x, this.armiesAt.y);
    }
    const f = this.faces!;
    this.purse.set(adv.purse);
    this.date.setText(calendar(adv.day));
    this.name.setText(t.name);
    this.incomeLine.setText(`+${income(t)} a day`);
    const here = heroVisiting(adv, t);
    const held = heroInGarrison(adv, t);
    this.heroRow = held ? 'garrison' : 'hero';
    this.placeHero();
    const heroPicked = picked?.i === HEAD;
    const army = picked?.army === 'garrison' ? t.garrison : picked?.army === 'tower' ? towersOf(t) : adv.hero.army;
    const company = picked && !heroPicked ? army[picked.i] ?? null : null;
    this.status.setText(company ? 'Tap a slot to move them' : t.builtToday ? 'Built today: more tomorrow' : 'One building a day');
    this.splitBtn.root.setVisible(!!company && company.count > 1 && picked?.army !== 'tower');
    this.splitBtn.setEnabled(army.includes(null));
    f.garrison.set(t.garrison, picked?.army === 'garrison' ? picked.i : null);
    f.visitor.set(here ? adv.hero.army : null, here && picked?.army === 'hero' ? picked.i : null);
    f.visitor.root.setAlpha(here ? 1 : 0.5);
    const places = towerPlaces(t);
    f.towers.set(towersOf(t), picked?.army === 'tower' ? picked.i : null, places);
    this.towersShown = places > 0;
    this.showTowers();
    f.crest.setVisible(!held);
    f.heroFace.setVisible((here || held) && !heroPicked);
    f.heroLit.setVisible((here || held) && heroPicked);
    f.emptyFace.img.setVisible(!here);
    this.away.setText(held ? `${adv.hero.name} is in the garrison` : `${adv.hero.name} is away`).img.setVisible(!here);
  }

  destroy(): void {
    this.dropFaces();
    for (const o of this.owned) o.destroy();
    for (const b of this.buttons) b.destroy();
    this.splitBtn.destroy();
    this.purse.destroy();
    this.goldIcon.destroy();
    this.frame?.destroy();
    this.purseFrame?.destroy();
  }
}
