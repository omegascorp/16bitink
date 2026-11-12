import type Phaser from 'phaser';
import type { IconName } from '../../art/pixel/ui';
import { calendar, type Adventure } from '../../logic/adventure';
import type { TownHeroes } from '../../logic/heroes';
import type { Town } from '../../logic/town';
import { MAX_TOWERS } from '../../logic/siege';
import type { TownFaction } from '../../logic/creatures';
import { factionOf } from '../../logic/factions';
import { income, towerPlaces, towersOf } from '../../logic/town';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawPortrait, drawSocket } from '../battle/pixelFrames';
import { INK, PixelButton, PixelFrame, PixelImage, TextLabel, UI_TEX } from '../battle/pixelUi';
import { ArmyDrag } from '../hud/armyDrag';
import { ArmyRow } from '../hud/armyRow';
import { armyRowW, armyRowOf } from '../hud/armySlots';
import { PurseRow, PURSE_BAR_H, PURSE_ROW_W } from '../hud/purseRow';
import { armiesW, armyH, BTN, buttonGrid, buttonsGridW, cellsW, drawerH, GAP, HEAD_GAP, LINE, PAD, RAIL, railButtons, ROW_GAP, townButtons, townLayout, type TownButton } from './stripLayout';

/** The strip's icons a people draws for itself (the Greeks' are the plain ones): the Hall, the Fort and the town's crest (also the Portal's). */
const PEOPLE_ICONS: Readonly<Partial<Record<TownFaction, Readonly<Partial<Record<'hall' | 'recruit' | 'town', IconName>>>>>> = {
  norse: { hall: 'hallNorse', recruit: 'recruitNorse', town: 'townNorse' },
  kemet: { hall: 'hallKemet', recruit: 'recruitKemet', town: 'townKemet' },
};
const iconOf = (base: 'hall' | 'recruit' | 'town', f: TownFaction): IconName => PEOPLE_ICONS[f]?.[base] ?? base;

export type TownScreen = 'hall' | 'fort' | 'guild' | 'smith' | 'tavern' | 'store' | 'market' | 'sell' | 'portal';
/** A slot of a row; `i` HEAD is the row's head (the crest or the hero's face): picking the hero there moves them with every company. */
export type SlotRef = { readonly army: 'hero' | 'garrison' | 'tower'; readonly i: number };
export const HEAD = -1;

/** The parts of the strip drawn at the slot's size. */
interface StripFaces {
  readonly crest: Phaser.GameObjects.Container;
  /** The garrison's hero's face, plain and lit (picked), over the crest. */
  readonly keepFace: Phaser.GameObjects.Image | null;
  readonly keepLit: Phaser.GameObjects.Image | null;
  /** The visiting hero's face, plain and lit. */
  readonly gateFace: Phaser.GameObjects.Image | null;
  readonly gateLit: Phaser.GameObjects.Image | null;
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
  /** The Army button on a phone's rail: the drawer with the armies opens or closes. */
  army(): void;
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
 * the Guild, the Blacksmith, the Tavern, the Store and the Portal once
 * built, and Leave, in two rows; under it all the purse and the date. On a
 * phone the town takes the screen: the buttons go down a rail on the right,
 * and the town's lines and armies into a drawer over the town's foot that
 * the rail's Army button opens.
 */
export class TownBar {
  private readonly owned: { destroy(): void }[] = [];
  /** The strip, or on a phone the army drawer. */
  private frame: PixelFrame | null = null;
  private railFrame: PixelFrame | null = null;
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
  /** The people whose icons the strip wears (the first layout sets it). */
  private faction: TownFaction | null = null;
  /** The heroes whose faces head the rows (garrison | gate), to redraw them when they change. */
  private faceFor = '|';
  private heroes: TownHeroes = {};
  private readonly away: TextLabel;
  /** Whether the town has any tower places, and nothing's open over the strip. */
  private towersShown = false;
  private towersHidden = false;
  private readonly buttons: PixelButton[];
  /** The buttons are down a rail on the right and the armies in a drawer (a phone). */
  private railed = false;
  /** The drawer with the armies is open (on a phone; the strip always shows them). */
  armyOpen = false;
  /** What the buttons were last made for. */
  private buttonsKey = '';
  private armiesAt = { x: 0, y: 0 };
  /** Where the strip (or the open drawer) begins on screen: the town above it takes taps. */
  top = 0;
  /** The strip's or the drawer's frame top, whether or not the drawer is open. */
  private stripTop = 0;
  /** The townscape's room: the screen above the strip, or left of the rail and above the purse. */
  viewW = 0;
  viewH = 0;

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

  private makeButtons(names: readonly TownButton[], h: number, cols?: number): void {
    const actions = this.actions;
    for (const b of this.buttons) b.destroy();
    this.buttons.length = 0;
    const specs: Readonly<Record<TownButton, { label: string; icon: IconName; rim?: 'gold'; onClick(): void }>> = {
      hall: { label: 'Hall', icon: iconOf('hall', this.faction ?? 'crown'), onClick: () => actions.open('hall') },
      fort: { label: 'Fort', icon: iconOf('recruit', this.faction ?? 'crown'), onClick: () => actions.open('fort') },
      guild: { label: 'Guild', icon: 'spell', onClick: () => actions.open('guild') },
      smith: { label: 'Smith', icon: 'smith', onClick: () => actions.open('smith') },
      tavern: { label: 'Tavern', icon: 'tavern', onClick: () => actions.open('tavern') },
      store: { label: 'Store', icon: 'store', onClick: () => actions.open('store') },
      portal: { label: 'Portal', icon: iconOf('town', this.faction ?? 'crown'), onClick: () => actions.open('portal') },
      army: { label: 'Army', icon: 'defend', ...(this.armyOpen ? { rim: 'gold' as const } : {}), onClick: () => actions.army() },
      leave: { label: 'Leave', icon: 'leave', rim: 'gold', onClick: () => actions.leave() },
    };
    const grid = buttonGrid(names.length, cols);
    names.forEach((name, i) => {
      const s = specs[name];
      const btn = new PixelButton(this.scene, { w: cellsW(grid[i]!.span), h, label: s.label, icon: s.icon, stacked: true, rim: s.rim, primary: name === 'army' && this.armyOpen, onClick: s.onClick });
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
    const crestIcon = scene.add.image(slot / 2, slot / 2, UI_TEX.icon(iconOf('town', this.faction ?? 'crown')));
    tapHead(crestFrame.img, () => 'garrison');
    const crest = scene.add.container(0, 0, [crestFrame.img, crestIcon]).setDepth(depth + 1);
    // Each hero in the town heads their row: a plain face, and a lit one for when they're picked.
    const faceOf2 = (id: string | undefined, row: SlotRef['army']): [PixelImage, PixelImage] | null => {
      if (!id) return null;
      const hero = heroArt('player', id);
      const cut = faceOf(scene, PX_TEX.hero(hero.id, 'idle'), hero.art, slot - 4);
      const pair = [new PixelImage(scene, drawPortrait(cut, 'bronze', false, false, slot)), new PixelImage(scene, drawPortrait(cut, 'gold', false, false, slot))] as [PixelImage, PixelImage];
      for (const p of pair) {
        p.img.setDepth(depth + 1);
        tapHead(p.img, () => row);
        owned.push(p);
      }
      return pair;
    };
    const keep = faceOf2(this.heroes.garrison?.id, 'garrison');
    const gate = faceOf2(this.heroes.visitor?.id, 'hero');
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
    owned.push(crestFrame, towerFrame, emptyFace, garrison, visitor, towers, towersFrame);
    this.faces = {
      crest, keepFace: keep?.[0].img ?? null, keepLit: keep?.[1].img ?? null, gateFace: gate?.[0].img ?? null, gateLit: gate?.[1].img ?? null,
      emptyFace, garrison, visitor, towers, towerHead, towersFrame, owned,
    };
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

  /** Lays the strip out for town `t` on a `w` × `h` screen, with the Tavern's button when it `hires`, the Portal's with a hero `inside`; where its top lands. */
  layout(w: number, h: number, t: Town, hires = false, inside = false): number {
    const faction = factionOf(t);
    if (faction !== this.faction) {
      // A town of another people: its icons, so the faces and buttons are made again.
      this.faction = faction;
      this.slot = 0;
      this.buttonsKey = '';
    }
    const names = townButtons(t.built, hires, inside);
    const plan = townLayout(w, h, PURSE_BAR_H, names.length);
    this.railed = plan.kind === 'rail';
    const shown = plan.kind === 'rail' ? railButtons(names) : names;
    const slot = plan.kind === 'rail' ? plan.drawer.slot : plan.slot;
    if (slot !== this.slot) this.makeFaces(slot);
    const buttonsH = plan.kind === 'rail' ? plan.rail.btnH : slot;
    const cols = plan.kind === 'rail' ? plan.rail.cols : undefined;
    const key = `${shown.join()}:${buttonsH}:${cols ?? 'grid'}:${this.armyOpen}`;
    if (key !== this.buttonsKey) this.makeButtons(shown, buttonsH, cols);
    this.buttonsKey = key;
    const purseTop = h - PURSE_BAR_H + 2;
    this.purseFrame?.destroy();
    this.purseFrame = new PixelFrame(this.scene, w + 4, PURSE_BAR_H, { rim: 'bronze', fill: [28, 20, 14, 246] }).setPosition(-2, purseTop);
    this.purseFrame.img.setDepth(this.depth);
    const purseX = Math.max(6, Math.floor((w - PURSE_ROW_W - 160) / 2));
    const end = this.purse.place(purseX, purseTop);
    this.date.setPosition(w - 6, purseTop + Math.floor((PURSE_BAR_H - 2 - LINE) / 2));
    this.date.img.setVisible(w - end > 150);
    this.railFrame?.destroy();
    this.railFrame = null;
    if (plan.kind === 'rail') {
      const railX = w - plan.rail.w;
      this.viewW = railX;
      this.viewH = purseTop;
      this.railFrame = new PixelFrame(this.scene, plan.rail.w + 2, purseTop + 4, { rim: 'bronze', thick: 2, fill: PANEL_FILL }).setPosition(railX, -2);
      this.railFrame.img.setDepth(this.depth);
      const grid = buttonGrid(shown.length, plan.rail.cols);
      this.buttons.forEach((b, i) => b.setPosition(railX + RAIL.pad + grid[i]!.col * (BTN.w + BTN.gap), RAIL.pad + grid[i]!.row * (buttonsH + BTN.gap)));
      const { drawer } = plan;
      this.stripTop = purseTop - drawerH(drawer);
      this.top = this.armyOpen ? this.stripTop : purseTop;
      this.drawFrame(drawer.w, purseTop - this.stripTop);
      if (drawer.stacked) this.layoutStacked(drawer.w);
      else this.layoutWide(drawer.w, drawer.townW, false);
    } else {
      const barH = PAD + armyH(slot) + PAD;
      this.stripTop = this.top = purseTop - barH;
      this.viewW = w;
      this.viewH = this.top;
      this.drawFrame(w, barH);
      this.layoutWide(w, plan.townW, true);
    }
    return this.top;
  }

  /** The strip's (or the drawer's) frame, `w` across and `barH` high over the purse. */
  private drawFrame(w: number, barH: number): void {
    this.frame?.destroy();
    this.frame = new PixelFrame(this.scene, w + 4, barH, { rim: 'bronze', thick: 2, fill: PANEL_FILL, studs: true }).setPosition(-2, this.stripTop);
    this.frame.img.setDepth(this.depth);
  }

  /** The town's lines, the armies and (on the strip) the buttons in a row across `w`. */
  private layoutWide(w: number, townW: number, withButtons: boolean): void {
    const armies = armiesW(this.slot);
    const count = this.buttons.length;
    const left = Math.floor((w - (townW + GAP + armies + (withButtons ? GAP + buttonsGridW(count) : 0))) / 2);
    const y = this.stripTop + PAD;
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left, y + LINE + 4);
    this.incomeLine.setPosition(left + 19, y + LINE + 5);
    this.status.setWrap(townW).setPosition(left, y + LINE * 2 + 9);
    this.splitBtn.setPosition(left, y + armyH(this.slot) - SPLIT.h);
    this.placeArmies(left + townW + GAP, y);
    if (!withButtons) return;
    // In line with the armies' rows.
    const bx = left + townW + GAP + armies + GAP;
    const grid = buttonGrid(count);
    this.buttons.forEach((b, i) => b.setPosition(bx + grid[i]!.col * (BTN.w + BTN.gap), y + grid[i]!.row * (this.slot + ROW_GAP)));
  }

  /** The drawer `w` across with the town's lines over the armies (a phone held upright). */
  private layoutStacked(w: number): void {
    const armies = armiesW(this.slot);
    const y = this.stripTop + PAD;
    const left = Math.floor((w - armies) / 2);
    this.name.setPosition(left, y);
    this.goldIcon.setPosition(left + armies - 96, y - 1);
    this.incomeLine.setPosition(left + armies - 77, y);
    this.status.setWrap(armies - SPLIT.w - 4).setPosition(left, y + LINE);
    this.splitBtn.setPosition(left + armies - SPLIT.w, y + LINE * 2 - SPLIT.h);
    this.placeArmies(left, y + LINE * 2 + ROW_GAP);
  }

  /** The buttons are down the rail and the armies in the drawer (a phone). */
  get onRail(): boolean {
    return this.railed;
  }

  /** The drawer's parts show: always on the strip, on a phone while it's open. */
  private get drawerOn(): boolean {
    return !this.railed || this.armyOpen;
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
    const tabY = this.stripTop - this.slot - TAB.pad * 2 + 2;
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
    const on = this.towersShown && !this.towersHidden && this.drawerOn;
    this.faces?.towers.root.setVisible(on);
    this.faces?.towersFrame.img.setVisible(on);
    this.faces?.towerHead.setVisible(on);
  }

  /** Each hero's face at the head of their row. */
  private placeHero(): void {
    const { x, y } = this.armiesAt;
    const f = this.faces!;
    for (const img of [f.keepFace, f.keepLit]) img?.setPosition(x, y);
    for (const img of [f.gateFace, f.gateLit]) img?.setPosition(x, y + this.slot + ROW_GAP);
  }

  /** Shows town `t`'s lines and armies, with `heroes` (the town's garrison and gate) heading their rows; `picked` lit, with Split when it can be split. */
  refresh(adv: Adventure, t: Town, picked: SlotRef | null, heroes: TownHeroes): void {
    const key = `${heroes.garrison?.id ?? ''}|${heroes.visitor?.id ?? ''}`;
    this.heroes = heroes;
    if (key !== this.faceFor) {
      // Another hero came or went: the faces heading the rows change.
      this.faceFor = key;
      this.makeFaces(this.slot);
      this.placeArmies(this.armiesAt.x, this.armiesAt.y);
    }
    const f = this.faces!;
    const { garrison: keeper, visitor } = heroes;
    this.purse.set(adv.purse);
    this.date.setText(calendar(adv.day));
    this.name.setText(t.name);
    this.incomeLine.setText(`+${income(t)} a day`);
    this.placeHero();
    const headPicked = (row: SlotRef['army']): boolean => picked?.i === HEAD && picked.army === row;
    const army = picked?.army === 'garrison' ? t.garrison : picked?.army === 'tower' ? towersOf(t) : visitor?.army ?? [];
    const company = picked && picked.i !== HEAD ? army[picked.i] ?? null : null;
    this.status.setText(company ? 'Tap a slot to move them' : t.builtToday ? 'Built today: more tomorrow' : 'One building a day');
    const on = this.drawerOn;
    this.frame?.img.setVisible(on);
    for (const label of [this.name, this.incomeLine, this.status]) label.img.setVisible(on);
    this.goldIcon.setVisible(on);
    for (const row of [f.garrison, f.visitor]) row.root.setVisible(on);
    this.splitBtn.root.setVisible(on && !!company && company.count > 1 && picked?.army !== 'tower');
    this.splitBtn.setEnabled(army.includes(null));
    f.garrison.set(t.garrison, picked?.army === 'garrison' ? picked.i : null);
    f.visitor.set(visitor ? visitor.army : null, visitor && picked?.army === 'hero' ? picked.i : null);
    f.visitor.root.setAlpha(visitor ? 1 : 0.5);
    const places = towerPlaces(t);
    f.towers.set(towersOf(t), picked?.army === 'tower' ? picked.i : null, places);
    this.towersShown = places > 0;
    this.showTowers();
    f.crest.setVisible(on && !keeper);
    f.keepFace?.setVisible(on && !headPicked('garrison'));
    f.keepLit?.setVisible(on && headPicked('garrison'));
    f.gateFace?.setVisible(on && !headPicked('hero'));
    f.gateLit?.setVisible(on && headPicked('hero'));
    f.emptyFace.img.setVisible(on && !visitor);
    this.away.setText(keeper ? `${keeper.name} is in the garrison` : `${adv.hero.name} is away`).img.setVisible(on && !visitor);
  }

  destroy(): void {
    this.dropFaces();
    for (const o of this.owned) o.destroy();
    for (const b of this.buttons) b.destroy();
    this.splitBtn.destroy();
    this.purse.destroy();
    this.goldIcon.destroy();
    this.frame?.destroy();
    this.railFrame?.destroy();
    this.purseFrame?.destroy();
  }
}
