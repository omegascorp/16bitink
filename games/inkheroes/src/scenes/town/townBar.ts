import type Phaser from 'phaser';
import { calendar, heroInGarrison, heroVisiting, type Adventure } from '../../logic/adventure';
import type { Town } from '../../logic/town';
import { has, income } from '../../logic/town';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawPortrait, drawSocket } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import { ArmyDrag } from '../hud/armyDrag';
import { ArmyRow } from '../hud/armyRow';
import { armyRowW } from '../hud/armySlots';
import { PurseRow, PURSE_BAR_H, PURSE_ROW_W } from '../hud/purseRow';
import { armiesW, armyH, BTN, BUTTONS_GRID_W, BUTTONS_W, GAP, HEAD_GAP, LINE, NARROW_ROUND, PAD, ROW_GAP, stripLayout } from './stripLayout';

export type TownScreen = 'hall' | 'fort' | 'guild';
/** A slot of a row; `i` HEAD is the row's head (the crest or the hero's face): picking the hero there moves them with every company. */
export type SlotRef = { readonly army: 'hero' | 'garrison'; readonly i: number };
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
const PANEL_FILL = [34, 24, 17, 246] as const;

/**
 * The strip along the town screen's bottom, after Heroes III's: the town's
 * name, income and building for the day; the garrison over the visiting
 * hero, slot by slot (tap one, then another, to move troops; tap the
 * hero's face, then the other row, to move the hero with every company,
 * or drag a company there; a picked company can be split); Hall, Fort,
 * Guild and Leave, two by two; under it all the purse and the date. On a narrow screen
 * the buttons and the town's lines stack above the armies.
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
  /** The row the hero heads: the visitor's, or the garrison's. */
  private heroRow: SlotRef['army'] = 'hero';
  private readonly away: TextLabel;
  private readonly buttons: PixelButton[];
  private narrow = false;
  private buttonsH = 0;
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
    this.makeButtons(BTN.narrowH);
  }

  private text(opts: ConstructorParameters<typeof TextLabel>[1]): TextLabel {
    const t = new TextLabel(this.scene, opts);
    t.img.setDepth(this.depth + 1);
    this.owned.push(t);
    return t;
  }

  private makeButtons(h: number): void {
    const actions = this.actions;
    for (const b of this.buttons) b.destroy();
    this.buttons.length = 0;
    const specs = [
      { label: 'Hall', icon: 'hall' as const, onClick: () => actions.open('hall') },
      { label: 'Fort', icon: 'recruit' as const, onClick: () => actions.open('fort') },
      { label: 'Guild', icon: 'spell' as const, onClick: () => actions.open('guild') },
      { label: 'Leave', icon: 'leave' as const, rim: 'gold' as const, onClick: () => actions.leave() },
    ];
    for (const s of specs) {
      const btn = new PixelButton(this.scene, { w: BTN.w, h, label: s.label, icon: s.icon, stacked: true, rim: s.rim, onClick: s.onClick });
      btn.root.setDepth(this.depth + 1);
      this.buttons.push(btn);
    }
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
    const hero = heroArt();
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
    owned.push(crestFrame, face, lit, emptyFace, garrison, visitor);
    this.faces = { crest, heroFace: face.img, heroLit: lit.img, emptyFace, garrison, visitor, owned };
    this.slot = slot;
  }

  private dropFaces(): void {
    if (!this.faces) return;
    this.drag.forget(this.faces.garrison);
    this.drag.forget(this.faces.visitor);
    for (const o of this.faces.owned) o.destroy();
    this.faces.crest.destroy(true);
    this.faces = null;
  }

  /** Lays the strip out for a `w` × `h` screen; where its top lands. */
  layout(w: number, h: number): number {
    const { narrow, slot, townW } = stripLayout(w, h, PURSE_BAR_H);
    if (slot !== this.slot) this.makeFaces(slot);
    const buttonsH = narrow ? BTN.narrowH : slot;
    if (narrow !== this.narrow || buttonsH !== this.buttonsH) this.makeButtons(buttonsH);
    this.narrow = narrow;
    this.buttonsH = buttonsH;
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
    const left = Math.floor((w - (townW + GAP + armies + GAP + BUTTONS_GRID_W)) / 2);
    const y = this.top + PAD;
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left, y + LINE + 4);
    this.incomeLine.setPosition(left + 19, y + LINE + 5);
    this.status.setWrap(townW).setPosition(left, y + LINE * 2 + 9);
    this.splitBtn.setPosition(left, y + armyH(this.slot) - SPLIT.h);
    this.placeArmies(left + townW + GAP, y);
    // Two by two, in line with the armies' rows.
    const bx = left + townW + GAP + armies + GAP;
    this.buttons.forEach((b, i) => b.setPosition(bx + (i % 2) * (BTN.w + BTN.gap), y + Math.floor(i / 2) * (this.slot + ROW_GAP)));
  }

  private layoutNarrow(w: number): void {
    const armies = armiesW(this.slot);
    let y = this.top + PAD;
    const bx = Math.floor((w - BUTTONS_W) / 2);
    this.buttons.forEach((b, i) => b.setPosition(bx + i * (BTN.w + BTN.gap), y));
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
    const army = picked?.army === 'garrison' ? t.garrison : adv.hero.army;
    const company = picked && !heroPicked ? army[picked.i] ?? null : null;
    this.status.setText(company ? 'Tap a slot to move them' : t.builtToday ? 'Built today: more tomorrow' : 'One building a day');
    this.splitBtn.root.setVisible(!!company && company.count > 1);
    this.splitBtn.setEnabled(army.includes(null));
    f.garrison.set(t.garrison, picked?.army === 'garrison' ? picked.i : null);
    f.visitor.set(here ? adv.hero.army : null, here && picked?.army === 'hero' ? picked.i : null);
    f.visitor.root.setAlpha(here ? 1 : 0.5);
    f.crest.setVisible(!held);
    f.heroFace.setVisible((here || held) && !heroPicked);
    f.heroLit.setVisible((here || held) && heroPicked);
    f.emptyFace.img.setVisible(!here);
    this.away.setText(held ? `${adv.hero.name} is in the garrison` : `${adv.hero.name} is away`).img.setVisible(!here);
    this.buttons[2]?.setEnabled(has(t, 'mageGuild1'));
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
