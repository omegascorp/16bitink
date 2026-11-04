import Phaser from 'phaser';
import { getHost, getSound } from '../host';
import { calendar, unfinished, type Adventure } from '../logic/adventure';
import { CLASSES, dailyMp, maxMana } from '../logic/hero';
import { tilesOf } from '../logic/map';
import { faceOf, heroArt, PX_TEX } from './battle/pixelAssets';
import { drawPortrait, FILLS, SLOT } from './battle/pixelFrames';
import { PixelButton, PixelFrame, putBuffer, TextLabel, UI_TEX } from './battle/pixelUi';
import { openCard } from './CardScene';
import { toMenu } from './cards';
import { ArmyRow, ARMY_ROW_W } from './hud/armyRow';
import { freeSlot, releaseSlot, takeSlot } from './hud/noteStack';
import { PurseRow, PURSE_BAR_H } from './hud/purseRow';
import type { MapScene } from './MapScene';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

const BAR_H = PURSE_BAR_H;
/** The hero panel: padding, the army's seven slots, the buttons beside it. */
const PAD = 6;
const BTN = { w: 56, gap: 3 } as const;
const LINE = 15;
const PANEL_H = PAD + LINE + 2 + LINE + 3 + SLOT + PAD;
const PANEL_W = PAD + SLOT + 6 + ARMY_ROW_W + PAD;
/** The status plate's padding. */
const PLATE_PAD = { x: 6, y: 2 } as const;
/** How far a note rises and how long it stays, UI pixels and ms. */
const NOTE_RISE = 24;
const NOTE_MS = 1500;
/** The gap between two notes on screen at once, UI pixels. */
const NOTE_GAP = 2;

/**
 * The map's interface, as pixel art on the art's grid (the battle's kit):
 * the purse and the date along the top, a status line for what's under the
 * pointer, and the hero's panel (face, level, moves and mana, the army's
 * faces with their counts) with End day, Town and the menu beside it.
 */
export class MapHudScene extends Phaser.Scene {
  private session!: Session;
  private size = { w: 0, h: 0, k: 1 };
  private bar: PixelFrame | null = null;
  private purse!: PurseRow;
  private date!: TextLabel;
  private status!: TextLabel;
  private plate: PixelFrame | null = null;
  private heroLine!: TextLabel;
  private moveLine!: TextLabel;
  private manaLine!: TextLabel;
  private panel!: Phaser.GameObjects.Container;
  private panelFrame!: PixelFrame;
  private portrait!: Phaser.GameObjects.Image;
  private army!: ArmyRow;
  private buttons: PixelButton[] = [];
  private heroKey = '';
  private owned: { destroy(): void }[] = [];
  private narrow = false;
  /** Lines of the note stack in use. */
  private noteSlots: number[] = [];

  constructor() {
    super('MapHud');
  }

  create(): void {
    this.session = Session.get(this);
    this.buttons = [];
    this.owned = [];
    this.bar = null;
    this.plate = null;
    this.noteSlots = [];
    const fit = pixelUiCamera(this, (size) => {
      this.size = size;
      this.layout();
    });
    this.size = fit();
    this.buildTop();
    this.buildPanel();
    this.status = new TextLabel(this, { align: 'left', anchor: { x: 0, y: 0 } });
    this.owned.push(this.status);
    const map = this.scene.get('Map') as MapScene;
    const onStatus = (s: string): void => this.setStatus(s);
    const onNote = (text: string): void => this.note(text);
    const onEnd = (): void => this.endDay();
    map.events.on('status', onStatus);
    map.events.on('note', onNote);
    map.events.on('end-day', onEnd);
    const onChange = (adv: Adventure): void => this.refresh(adv);
    this.session.on('change', onChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      map.events.off('status', onStatus);
      map.events.off('note', onNote);
      map.events.off('end-day', onEnd);
      this.session.off('change', onChange);
      for (const o of this.owned) o.destroy();
      this.bar?.destroy();
      this.plate?.destroy();
      if (this.textures.exists(this.heroKey)) this.textures.remove(this.heroKey);
    });
    this.layout();
    this.refresh(this.session.adv);
  }

  private buildTop(): void {
    this.purse = new PurseRow(this, 1);
    this.owned.push(this.purse);
    this.date = new TextLabel(this, { kind: 'title', align: 'right', anchor: { x: 1, y: 0 } });
    this.date.img.setDepth(1);
    this.owned.push(this.date);
  }

  private buildPanel(): void {
    this.panelFrame = new PixelFrame(this, PANEL_W, PANEL_H, { rim: 'bronze', thick: 2, fill: [34, 24, 17, 246], studs: true });
    this.owned.push(this.panelFrame);
    const parts: Phaser.GameObjects.GameObject[] = [this.panelFrame.img];
    // The hero's face; a tap brings the view back to the hero.
    this.heroKey = this.heroFace();
    this.portrait = this.add.image(PAD, PAD, this.heroKey).setOrigin(0).setInteractive();
    this.portrait.on('pointerup', () => (this.scene.get('Map') as MapScene).centreOnHero());
    parts.push(this.portrait);
    const textX = PAD + SLOT + 6;
    this.heroLine = new TextLabel(this, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } }).setPosition(textX, PAD);
    const statY = PAD + LINE + 2;
    const moveIcon = this.add.image(textX, statY - 1, UI_TEX.stat('speed')).setOrigin(0);
    this.moveLine = new TextLabel(this, { align: 'left', anchor: { x: 0, y: 0 } }).setPosition(textX + 19, statY);
    const manaX = textX + 96;
    const manaIcon = this.add.image(manaX, statY - 1, UI_TEX.stat('mana')).setOrigin(0);
    this.manaLine = new TextLabel(this, { align: 'left', anchor: { x: 0, y: 0 } }).setPosition(manaX + 19, statY);
    this.owned.push(this.heroLine, this.moveLine, this.manaLine);
    parts.push(this.heroLine.img, moveIcon, this.moveLine.img, manaIcon, this.manaLine.img);
    const slotY = PANEL_H - PAD - SLOT;
    this.army = new ArmyRow(this).setPosition(textX, slotY);
    this.owned.push(this.army);
    parts.push(this.army.root);
    const map = (): MapScene => this.scene.get('Map') as MapScene;
    const specs = [
      { label: 'End day', icon: 'endDay' as const, rim: 'gold' as const, onClick: () => this.endDay() },
      { label: 'Town', icon: 'town' as const, onClick: () => map().openTown() },
      { label: 'Menu', icon: 'menu' as const, onClick: () => this.menu() },
    ];
    specs.forEach((b, i) => {
      const btn = new PixelButton(this, { w: BTN.w, h: PANEL_H, label: b.label, icon: b.icon, stacked: true, rim: b.rim, onClick: b.onClick });
      btn.setPosition(PANEL_W + BTN.gap + i * (BTN.w + BTN.gap), 0);
      this.buttons.push(btn);
      this.owned.push(btn);
      parts.push(btn.root);
    });
    this.panel = this.add.container(0, 0, parts).setDepth(1);
  }

  /** The hero's face, cut 1:1 from the battle figure's idle frame. */
  private heroFace(): string {
    const h = heroArt();
    return putBuffer(this, drawPortrait(faceOf(this, PX_TEX.hero(h.id, 'idle'), h.art), 'player', false, false));
  }

  private layout(): void {
    const { w, h } = this.size;
    this.bar?.destroy();
    this.bar = new PixelFrame(this, w + 4, BAR_H, { rim: 'bronze', fill: [28, 20, 14, 240] }).setPosition(-2, -2);
    this.bar.img.setDepth(0);
    const x = this.purse.place(6, 0);
    // A narrow screen moves the date under the bar.
    const below = w < x + 150;
    this.date.setPosition(w - 6, below ? BAR_H + 2 : Math.floor((BAR_H - 2 - LINE) / 2));
    // Wide: the buttons beside the panel. Narrow (a phone): the buttons in a row above it.
    const total = PANEL_W + 3 * (BTN.w + BTN.gap);
    this.narrow = w < total + 4;
    this.buttons.forEach((b, i) => {
      if (this.narrow) b.setPosition(PANEL_W - (3 - i) * (BTN.w + BTN.gap) + BTN.gap, -PANEL_H - BTN.gap);
      else b.setPosition(PANEL_W + BTN.gap + i * (BTN.w + BTN.gap), 0);
    });
    this.panel.setPosition(this.narrow ? Math.floor((w - PANEL_W) / 2) : w - total - 2, h - PANEL_H - 2);
    this.setStatus(this.status?.text ?? '');
  }

  /** What's under the pointer, on a dark plate at the bottom left (or above the panel on a narrow screen). */
  private setStatus(text: string): void {
    if (!this.status) return;
    const { w, h } = this.size;
    const total = PANEL_W + 3 * (BTN.w + BTN.gap);
    const room = w - total - 12;
    const narrow = this.narrow || room < 160;
    const above = h - 2 - PANEL_H - (this.narrow ? PANEL_H + BTN.gap : 0) - 4;
    this.status.setWrap(narrow ? w - 24 : room - PLATE_PAD.x * 2).setText(text);
    this.status.img.setVisible(!!text).setDepth(2);
    this.plate?.img.setVisible(!!text);
    if (!text) return;
    const pw = this.status.width + PLATE_PAD.x * 2;
    const ph = this.status.height + PLATE_PAD.y * 2 + 2;
    const x = 4;
    const y = (narrow ? above : h - 2) - ph;
    if (!this.plate || this.plate.width !== pw || this.plate.height !== ph) {
      this.plate?.destroy();
      this.plate = new PixelFrame(this, pw, ph, { rim: 'bronze', fill: FILLS.plate });
      this.plate.img.setDepth(1);
    }
    this.plate.setPosition(x, y);
    this.status.setPosition(x + PLATE_PAD.x, y + PLATE_PAD.y + 1);
  }

  private refresh(adv: Adventure): void {
    this.purse.set(adv.purse);
    this.date.setText(calendar(adv.day));
    const h = adv.hero;
    this.heroLine.setText(`${h.name}, ${CLASSES[h.heroClass].name} · level ${h.level}`);
    this.moveLine.setText(`${tilesOf(h.mp)}/${tilesOf(dailyMp(h))}`);
    this.manaLine.setText(`${h.mana}/${maxMana(h)}`);
    this.army.set(h.army);
  }

  /** Ends the day, asking first when the hero could still move or a town could still build. */
  private endDay(): void {
    const map = this.scene.get('Map') as MapScene;
    if (map.blocked()) return;
    const left = unfinished(this.session.adv, this.session.def);
    if (!left.length) {
      this.closeDay(map);
      return;
    }
    openCard(this, {
      title: 'End the day?',
      body: left.join('\n'),
      buttons: [
        { label: 'End the day', onClick: () => this.closeDay(map) },
        { label: 'Not yet', kind: 'plain', onClick: () => undefined },
      ],
    });
  }

  private closeDay(map: MapScene): void {
    getSound(this)?.play('day');
    map.clearPath();
    const before = this.session.adv;
    const report = this.session.endDay();
    map.centreOnHero();
    // The rival's ride is shown where the player can see it, then the night's cards.
    void map.showRival(before, report).then(() => map.showPrompts());
  }

  /** A note rising from the middle of the screen ("+5 wood"), in gold, below any still showing. */
  private note(text: string): void {
    const label = new TextLabel(this, { kind: 'title', anchor: { x: 0.5, y: 0.5 } }).setText(text);
    const slot = freeSlot(this.noteSlots);
    this.noteSlots = takeSlot(this.noteSlots, slot);
    const at = { x: Math.floor(this.size.w / 2), y: Math.floor(this.size.h * 0.4) + slot * (label.height + NOTE_GAP) };
    label.setPosition(at.x, at.y);
    label.img.setDepth(3);
    this.tweens.addCounter({
      from: 0, to: 1, duration: NOTE_MS, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        label.setPosition(at.x, Math.round(at.y - NOTE_RISE * u));
        label.img.setAlpha(u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5);
      },
      onComplete: () => {
        this.noteSlots = releaseSlot(this.noteSlots, slot);
        label.destroy();
      },
    });
  }

  private menu(): void {
    const map = this.scene.get('Map') as MapScene;
    if (map.blocked()) return;
    const sound = getSound(this);
    openCard(this, {
      title: this.session.def.name,
      body: `Goal: ${this.session.def.goal.text}.\n${calendar(this.session.adv.day)}. The game saves as you play.`,
      buttons: [
        { label: 'Back to the map', onClick: () => undefined },
        { label: sound?.muted ? 'Sound: off' : 'Sound: on', kind: 'plain', onClick: () => sound?.setMuted(!sound.muted) },
        { label: `Start ${this.session.def.name} again`, kind: 'plain', onClick: () => {
          this.session.restartPart();
          this.scene.stop();
          this.scene.get('Map').scene.restart();
        } },
        { label: 'Campaign menu', kind: 'plain', onClick: () => toMenu(this, this.session, null) },
      ],
    });
  }
}

