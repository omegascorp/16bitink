import type Phaser from 'phaser';
import { calendar, heroInTown, type Adventure } from '../../logic/adventure';
import { has, income } from '../../logic/town';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawFrame, drawPortrait, FILLS, SLOT } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import { ArmyRow, ARMY_ROW_W } from '../hud/armyRow';
import { PurseRow, PURSE_BAR_H, PURSE_ROW_W } from '../hud/purseRow';

export type TownScreen = 'hall' | 'fort' | 'guild';
export type SlotRef = { readonly army: 'hero' | 'garrison'; readonly i: number };

export interface TownBarActions {
  open(screen: TownScreen): void;
  leave(): void;
  pickSlot(ref: SlotRef): void;
}

const PAD = 6;
const GAP = 8;
const LINE = 15;
const ROW_GAP = 4;
const ARMY_H = SLOT * 2 + ROW_GAP;
/** The armies: a face (the town's crest, the hero) then the seven slots. */
const ARMIES_W = SLOT + 6 + ARMY_ROW_W;
const TOWN_W = 150;
const BTN = { w: 56, gap: 3, narrowH: 48 } as const;
const BUTTONS_W = 4 * (BTN.w + BTN.gap) - BTN.gap;
const WIDE_W = TOWN_W + GAP + ARMIES_W + GAP + BUTTONS_W;
const PANEL_FILL = [34, 24, 17, 246] as const;

/**
 * The strip along the town screen's bottom, after Heroes III's: the town's
 * name, income and building for the day; the garrison over the visiting
 * hero, slot by slot (tap one, then another, to move troops); Hall, Fort,
 * Guild and Leave; under it all the purse and the date. On a narrow screen
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
  private readonly crest: Phaser.GameObjects.Container;
  private readonly heroFace: Phaser.GameObjects.Image;
  private readonly emptyFace: PixelImage;
  private readonly away: TextLabel;
  private readonly garrison: ArmyRow;
  private readonly visitor: ArmyRow;
  private readonly buttons: PixelButton[];
  private narrow = false;
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
    // The town's crest heads the garrison; the hero's face heads the visitor's row (an empty frame while away).
    const crestFrame = new PixelImage(scene, drawFrame(SLOT, SLOT, { rim: 'gold', fill: FILLS.portrait }));
    const crestIcon = scene.add.image(SLOT / 2, SLOT / 2, UI_TEX.icon('town'));
    this.owned.push(crestFrame);
    this.crest = scene.add.container(0, 0, [crestFrame.img, crestIcon]).setDepth(depth + 1);
    const hero = heroArt();
    const face = new PixelImage(scene, drawPortrait(faceOf(scene, PX_TEX.hero(hero.id, 'idle'), hero.art), 'player', false, false));
    this.owned.push(face);
    this.heroFace = face.img.setDepth(depth + 1);
    this.emptyFace = new PixelImage(scene, drawFrame(SLOT, SLOT, { rim: 'dim', fill: FILLS.portrait }));
    this.emptyFace.img.setDepth(depth + 1);
    this.owned.push(this.emptyFace);
    this.garrison = new ArmyRow(scene, (i) => actions.pickSlot({ army: 'garrison', i }));
    this.visitor = new ArmyRow(scene, (i) => actions.pickSlot({ army: 'hero', i }));
    this.garrison.root.setDepth(depth + 1);
    this.visitor.root.setDepth(depth + 1);
    this.owned.push(this.garrison, this.visitor);
    this.buttons = [];
    this.makeButtons(ARMY_H);
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

  /** Lays the strip out for a `w` × `h` screen; where its top lands. */
  layout(w: number, h: number): number {
    const narrow = w < WIDE_W + PAD * 2 + 8;
    if (narrow !== this.narrow) this.makeButtons(narrow ? BTN.narrowH : ARMY_H);
    this.narrow = narrow;
    const barH = narrow ? PAD + BTN.narrowH + ROW_GAP + LINE * 2 + ROW_GAP + ARMY_H + PAD : PAD + ARMY_H + PAD;
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
    else this.layoutWide(w);
    return this.top;
  }

  private layoutWide(w: number): void {
    const left = Math.floor((w - WIDE_W) / 2);
    const y = this.top + PAD;
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left, y + LINE + 4);
    this.incomeLine.setPosition(left + 19, y + LINE + 5);
    this.status.setWrap(TOWN_W).setPosition(left, y + LINE * 2 + 9);
    this.placeArmies(left + TOWN_W + GAP, y);
    const bx = left + TOWN_W + GAP + ARMIES_W + GAP;
    this.buttons.forEach((b, i) => b.setPosition(bx + i * (BTN.w + BTN.gap), y));
  }

  private layoutNarrow(w: number): void {
    let y = this.top + PAD;
    const bx = Math.floor((w - BUTTONS_W) / 2);
    this.buttons.forEach((b, i) => b.setPosition(bx + i * (BTN.w + BTN.gap), y));
    y += BTN.narrowH + ROW_GAP;
    const left = Math.floor((w - ARMIES_W) / 2);
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left + ARMIES_W - 96, y - 1);
    this.incomeLine.setPosition(left + ARMIES_W - 77, y);
    this.status.setWrap(ARMIES_W).setPosition(left, y + LINE);
    this.placeArmies(left, y + LINE * 2 + ROW_GAP);
  }

  private placeArmies(x: number, y: number): void {
    this.crest.setPosition(x, y);
    this.garrison.setPosition(x + SLOT + 6, y);
    const vy = y + SLOT + ROW_GAP;
    this.heroFace.setPosition(x, vy);
    this.emptyFace.setPosition(x, vy);
    this.visitor.setPosition(x + SLOT + 6, vy);
    this.away.setPosition(x + SLOT + 6 + Math.floor(ARMY_ROW_W / 2), vy + Math.floor(SLOT / 2));
  }

  refresh(adv: Adventure, picked: SlotRef | null): void {
    const t = adv.town;
    this.purse.set(adv.purse);
    this.date.setText(calendar(adv.day));
    this.name.setText(t.name);
    this.incomeLine.setText(`+${income(t)} a day`);
    this.status.setText(t.builtToday ? 'Built today: more tomorrow' : 'One building a day');
    const here = heroInTown(adv);
    this.garrison.set(t.garrison, picked?.army === 'garrison' ? picked.i : null);
    this.visitor.set(here ? adv.hero.army : null, here && picked?.army === 'hero' ? picked.i : null);
    this.visitor.root.setAlpha(here ? 1 : 0.5);
    this.heroFace.setVisible(here);
    this.emptyFace.img.setVisible(!here);
    this.away.setText(`${adv.hero.name} is away`).img.setVisible(!here);
    this.buttons[2]?.setEnabled(has(t, 'mageGuild1'));
  }

  destroy(): void {
    for (const o of this.owned) o.destroy();
    for (const b of this.buttons) b.destroy();
    this.purse.destroy();
    this.goldIcon.destroy();
    this.crest.destroy();
    this.frame?.destroy();
    this.purseFrame?.destroy();
  }
}
