import Phaser from 'phaser';
import type { IconName } from '../../art/pixel/ui';
import type { Stack } from '../../logic/battleTypes';
import type { CardSpec } from '../CardScene';
import type { BattleCameras } from './battleCameras';
import { FIELD_RECT, HERO_FEET, WORLD } from './pixelLayout';
import { PixelCard } from './pixelCard';
import type { Rgba } from './pixelRaster';
import { PixelButton, PixelFrame, TextLabel } from './pixelUi';
import { LINE_H } from './pixelFont';
import { FILLS, SLOT, SLOT_GAP } from './pixelFrames';
import { TurnOrder } from './turnOrder';
import type { UnitInfo } from './unitCard';
import { UnitInfoCard, type PictureScenery } from './unitInfoCard';
import { SpellBook, type BookSpec } from './spellBook';

/** The action buttons, UI pixels. */
const BTN = { w: 56, h: 54, gap: 3 } as const;
/** Room the bar under the field needs (turn order over a row of buttons), UI pixels. */
const BAR_H = 4 + TurnOrder.height + 4 + BTN.h + 4;
/** The bar's buttons stand in one row: the UI is zoomed so that row fits. */
const BAR_W = 4 * BTN.w + 3 * BTN.gap + 8;
/** The testing cheat's button, in the top right corner. */
const WIN_BTN = { w: 44, h: 22, margin: 4 } as const;
/** Turn-order portraits shown at most. */
const ORDER_MAX = 10;
/** The status line's plate: padding round the text, and the plate's height. */
const PLATE_PAD = { x: 6, y: 2 } as const;
const STATUS_H = LINE_H + 2 + PLATE_PAD.y * 2;
/** How far a float rises and how long it takes, UI pixels and ms. */
const FLOAT_RISE = 14;
const FLOAT_MS = 1300;

export interface HudActions {
  readonly wait: () => void;
  readonly defend: () => void;
  readonly spell: () => void;
  /** Testing cheats only: wins the battle. */
  readonly win?: () => void;
  readonly auto: () => void;
}

/**
 * The battle's interface in pixel art, on the UI camera's grid: the status
 * line on a dark plate over the field, the turn order's faces under it, the
 * four action buttons, rising messages, and the card.
 *
 * Beside the field (the usual, wide screens) the UI shares the world's zoom,
 * so its pixels are the art's, and it is placed in world terms: the status
 * and the faces in the band over the field, Wait and Defend under the left
 * hero, Spell and Auto under the right one, as in Heroes 3. With room under
 * the field instead (a phone held upright) the faces and a row of buttons go
 * in a bar there, zoomed up until the row fills the width.
 */
export class BattleHud {
  private readonly status: TextLabel;
  private plate: PixelFrame | null = null;
  private readonly order: TurnOrder;
  private winBtn: PixelButton | null = null;
  private readonly buttons: PixelButton[];
  private readonly autoBtn: PixelButton;
  private shown: readonly Stack[] = [];
  private card: PixelCard | UnitInfoCard | SpellBook | null = null;
  /** The battle's terrain parts, for the unit card's picture. */
  private scenery: PictureScenery | null = null;
  private orderMax = ORDER_MAX;
  /** The status line's centre and top, and the turn order's top. */
  private statusAt = { x: 0, y: 0 };
  private orderAt = { x: 0, y: 0 };
  private statusWrap: number = WORLD.w;

  constructor(private readonly scene: Phaser.Scene, private readonly cams: BattleCameras, actions: HudActions, canCast: boolean) {
    this.status = new TextLabel(scene, { anchor: { x: 0.5, y: 0 } });
    this.order = new TurnOrder(scene);
    const btn = (label: string, icon: IconName, onClick: () => void): PixelButton => new PixelButton(scene, { w: BTN.w, h: BTN.h, label, icon, stacked: true, onClick });
    this.autoBtn = btn('Auto', 'auto', actions.auto);
    this.buttons = [btn('Wait', 'wait', actions.wait), btn('Defend', 'defend', actions.defend), ...(canCast ? [btn('Spell', 'spell', actions.spell)] : []), this.autoBtn];
    cams.ui.add([this.order.root, this.status.img, ...this.buttons.map((b) => b.root)]);
    if (actions.win) {
      this.winBtn = new PixelButton(scene, { w: WIN_BTN.w, h: WIN_BTN.h, label: 'Win', rim: 'gold', onClick: actions.win });
      cams.ui.add(this.winBtn.root);
    }
    this.layout();
  }

  /** Whether a card is open (the field takes no taps then). */
  get modal(): boolean {
    return this.card !== null;
  }

  /** Lays the interface out for the canvas as it is now (call after the cameras refit). */
  layout(): void {
    // Room under the world, device pixels, for the bar at a zoom that fits its row of buttons.
    const below = this.scene.scale.height - this.worldBottomDevice();
    const barK = Math.max(1, Math.floor(this.scene.scale.width / BAR_W));
    if (below >= BAR_H * barK) this.layoutBar(barK);
    else this.layoutSides();
    this.winBtn?.setPosition(this.cams.uiSize().w - WIN_BTN.w - WIN_BTN.margin, WIN_BTN.margin);
    this.redraw();
    if (this.card) this.card.close();
  }

  /** The world's bottom edge on the canvas, device pixels. */
  private worldBottomDevice(): number {
    const o = this.cams.worldToUi(0, WORLD.h);
    return o.y * this.cams.uiSize().k;
  }

  /** The UI at the world's zoom (the cameras' refit sets it). */
  private layoutSides(): void {
    const at = (x: number, y: number): { x: number; y: number } => this.cams.worldToUi(x, y);
    const top = at(WORLD.w / 2, 2);
    this.statusAt = { x: Math.round(top.x), y: Math.round(top.y) };
    this.orderAt = { x: Math.round(top.x), y: Math.round(top.y) + STATUS_H + 1 };
    this.statusWrap = FIELD_RECT.w;
    // Each pair side by side under its hero, standing on the field's bottom edge.
    const bottom = at(0, FIELD_RECT.y + FIELD_RECT.h).y;
    [this.buttons.slice(0, 2), this.buttons.slice(2)].forEach((row, side) => {
      const rowW = row.length * BTN.w + (row.length - 1) * BTN.gap;
      const col = at(HERO_FEET[side as 0 | 1].x, 0).x - Math.floor(rowW / 2);
      row.forEach((b, i) => b.setPosition(col + i * (BTN.w + BTN.gap), bottom - BTN.h));
    });
    this.orderMax = Math.min(ORDER_MAX, Math.floor((FIELD_RECT.w + SLOT_GAP) / (SLOT + SLOT_GAP)));
  }

  private layoutBar(k: number): void {
    this.cams.setUiZoom(k);
    const ui = this.cams.uiSize();
    const fieldBottom = Math.ceil(this.worldBottomDevice() / k);
    const worldTop = Math.floor(this.cams.worldToUi(0, 0).y);
    const statusAbove = worldTop >= STATUS_H + 1;
    this.statusWrap = ui.w - 8;
    const barTop = Math.min(fieldBottom + 4, ui.h - BAR_H);
    this.statusAt = { x: Math.floor(ui.w / 2), y: statusAbove ? worldTop - STATUS_H : barTop };
    this.orderAt = { x: Math.floor(ui.w / 2), y: barTop + (statusAbove ? 0 : STATUS_H) };
    const rowW = this.buttons.length * BTN.w + (this.buttons.length - 1) * BTN.gap;
    const left = Math.floor((ui.w - rowW) / 2);
    const y = this.orderAt.y + TurnOrder.height + 4;
    this.buttons.forEach((b, i) => b.setPosition(left + i * (BTN.w + BTN.gap), y));
    this.orderMax = Math.min(ORDER_MAX, Math.floor((ui.w - 8 + SLOT_GAP) / (SLOT + SLOT_GAP)));
  }

  /** The status line's text. */
  setStatus(text: string): void {
    this.status.setWrap(this.statusWrap).setText(text);
    this.status.setPosition(this.statusAt.x, this.statusAt.y + PLATE_PAD.y);
    this.plateFor(this.status.width, this.status.height);
  }

  /** A dark plate behind the status text (redrawn only when its size changes). */
  private plateFor(w: number, h: number): void {
    const pw = w + PLATE_PAD.x * 2;
    const ph = h + PLATE_PAD.y * 2;
    if (!this.plate || this.plate.width !== pw || this.plate.height !== ph) {
      this.plate?.destroy();
      this.plate = new PixelFrame(this.scene, pw, ph, { rim: 'bronze', fill: FILLS.plate });
      this.cams.ui.addAt(this.plate.img, 0);
    }
    this.plate.setPosition(this.statusAt.x - Math.floor(pw / 2), this.statusAt.y);
  }

  /** The turn order (the active unit first). */
  setOrder(stacks: readonly Stack[]): void {
    this.shown = stacks;
    this.order.show(stacks.slice(0, this.orderMax), this.orderAt.x, this.orderAt.y);
  }

  setAuto(on: boolean): void {
    this.autoBtn.setLabel(on ? 'Stop' : 'Auto');
  }

  private redraw(): void {
    this.setOrder(this.shown);
    this.setStatus(this.status.text);
  }

  /** Opens a card over everything (closing any open one). */
  openCard(spec: CardSpec): void {
    this.card?.close();
    const card = new PixelCard(this.scene, this.cams.ui, spec, this.cams.uiSize(), () => this.closed(card));
    this.card = card;
  }

  /** Opens a unit's info card. */
  openUnit(info: UnitInfo): void {
    this.card?.close();
    const card = new UnitInfoCard(this.scene, this.cams.ui, info, this.scenery, this.cams.uiSize(), () => this.closed(card));
    this.card = card;
  }

  /** Opens the hero's spellbook. */
  openBook(spec: BookSpec): void {
    this.card?.close();
    const card = new SpellBook(this.scene, this.cams.ui, spec, this.cams.uiSize(), () => this.closed(card));
    this.card = card;
  }

  /** The terrain the unit card's picture stands in. */
  setScenery(s: PictureScenery | null): void {
    this.scenery = s;
  }

  private closed(card: PixelCard | UnitInfoCard | SpellBook): void {
    if (this.card === card) this.card = null;
  }

  /**
   * A message rising from a world point and fading: whole UI pixels each
   * frame. `big` uses the title font (round changes).
   */
  float(wx: number, wy: number, text: string, ink: Rgba, big = false): void {
    const label = new TextLabel(this.scene, { kind: big ? 'title' : 'body', ink, outline: true, anchor: { x: 0.5, y: 1 } }).setText(text);
    const at = this.cams.worldToUi(wx, wy);
    label.setPosition(Math.round(at.x), Math.round(at.y));
    this.cams.ui.add(label.img);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: FLOAT_MS, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        label.setPosition(Math.round(at.x), Math.round(at.y - FLOAT_RISE * u));
        label.img.setAlpha(u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55);
      },
      onComplete: () => label.destroy(),
    });
  }

  destroy(): void {
    this.card?.close();
    this.status.destroy();
    this.plate?.destroy();
    this.order.destroy();
    for (const b of this.buttons) b.destroy();
    this.winBtn?.destroy();
  }
}
