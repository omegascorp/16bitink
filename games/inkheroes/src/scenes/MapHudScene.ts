import Phaser from 'phaser';
import { CREATURE_RES, FRAME_H, GROUND_Y } from '../art/creatures/types';
import { UI, UI_HEX } from '../art/palette';
import { TEX } from '../art/textures';
import { getHost, getSound } from '../host';
import { calendar, type Adventure } from '../logic/adventure';
import { dailyMp, maxMana } from '../logic/hero';
import { CLASSES } from '../logic/hero';
import { RESOURCES } from '../logic/resources';
import { openCard } from './CardScene';
import { toMenu } from './cards';
import { screenScene, viewSize } from './hidpi';
import type { MapScene } from './MapScene';
import { Session } from './session';
import { body, countBadge, paintedButton, panelCard, roundButton, title } from './uiPaint';

const BAR_H = 40;
const PANEL = { w: 400, h: 132 } as const;

/**
 * The map's interface: the purse and calendar along the top, a status line,
 * and the hero's card (army, movement, mana) with End Day, Town and the menu.
 */
export class MapHudScene extends Phaser.Scene {
  private session!: Session;
  private purse: Phaser.GameObjects.Text[] = [];
  private date!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private heroLine!: Phaser.GameObjects.Text;
  private moveLine!: Phaser.GameObjects.Text;
  private slots: { img: Phaser.GameObjects.Image; count: Phaser.GameObjects.Text }[] = [];
  private top!: Phaser.GameObjects.Container;
  private panel!: Phaser.GameObjects.Container;

  constructor() {
    super('MapHud');
  }

  create(): void {
    screenScene(this, true);
    this.session = Session.get(this);
    this.purse = [];
    this.slots = [];
    this.buildTop();
    this.buildPanel();
    this.status = title(this, 12, 0, '', 18, { color: UI.text }).setOrigin(0, 1);
    const map = this.scene.get('Map') as MapScene;
    const onStatus = (s: string): void => void this.status.setText(s);
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
      this.scale.off('resize', this.layout, this);
    });
    this.scale.on('resize', this.layout, this);
    this.layout();
    this.refresh(this.session.adv);
  }

  private buildTop(): void {
    const items: Phaser.GameObjects.GameObject[] = [];
    RESOURCES.forEach((r, i) => {
      // Gold runs to five figures; the rest rarely past two.
      const x = 14 + (i === 0 ? 0 : 40 + i * 74);
      items.push(this.add.image(x + 11, BAR_H / 2, TEX.icon(r)).setDisplaySize(24, 24));
      const t = body(this, x + 28, BAR_H / 2, '0', 19, { color: UI.text }).setFontStyle('600').setOrigin(0, 0.5);
      this.purse.push(t);
      items.push(t);
    });
    this.date = title(this, 0, BAR_H / 2, '', 17).setOrigin(1, 0.5);
    const bg = this.add.rectangle(0, 0, 4000, BAR_H, UI_HEX.leafDeep, 0.94).setOrigin(0);
    const rule = this.add.rectangle(0, BAR_H, 4000, 2, UI_HEX.gilt, 0.85).setOrigin(0);
    const fillet = this.add.rectangle(0, BAR_H + 2, 4000, 1, 0x000000, 0.6).setOrigin(0);
    this.top = this.add.container(0, 0, [bg, rule, fillet, ...items, this.date]);
  }

  private buildPanel(): void {
    const card = panelCard(this, 0, 0, PANEL.w, PANEL.h, 77, { shadow: 0.8 });
    const portrait = this.add.image(-PANEL.w / 2 + 50, PANEL.h / 2 - 22, TEX.hero('player', 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.62 / CREATURE_RES);
    this.heroLine = title(this, -PANEL.w / 2 + 96, -PANEL.h / 2 + 14, '', 17);
    this.moveLine = body(this, -PANEL.w / 2 + 100, -PANEL.h / 2 + 42, '', 15);
    const items: Phaser.GameObjects.GameObject[] = [card, portrait, this.heroLine, this.moveLine];
    for (let i = 0; i < 7; i++) {
      const x = -PANEL.w / 2 + 112 + i * 40;
      const y = PANEL.h / 2 - 16;
      const slot = this.add.rectangle(x, y - 20, 36, 46, UI_HEX.well, 0.75).setStrokeStyle(1, UI_HEX.giltDeep, 0.9);
      const img = this.add.image(x, y - 4, TEX.creature('spearman', 0)).setOrigin(0.5, GROUND_Y / FRAME_H).setScale(0.36 / CREATURE_RES);
      const count = countBadge(this, x + 17, y + 2, '', 13).setOrigin(1, 1);
      this.slots.push({ img, count });
      items.push(slot, img, count);
    }
    const endDay = paintedButton(this, PANEL.w / 2 + 70, -PANEL.h / 2 + 26, 'End day', () => this.endDay(), { width: 120, height: 48, size: 17, kind: 'primary' });
    const town = paintedButton(this, PANEL.w / 2 + 70, 8, 'Town', () => (this.scene.get('Map') as MapScene).openTown(), { width: 120, height: 44, size: 17 });
    const menu = roundButton(this, PANEL.w / 2 + 70, PANEL.h / 2 - 16, 'pause', () => this.menu(), 44);
    items.push(endDay, town, menu.root);
    this.panel = this.add.container(0, 0, items);
  }

  private layout(): void {
    const v = viewSize(this);
    this.date.setPosition(v.width - 14, v.width < 900 ? BAR_H + 16 : BAR_H / 2);
    const narrow = v.width < PANEL.w + 180;
    // On a short screen (a phone held sideways) the card keeps to about a third of the height.
    const s = Math.min(1, v.width / (PANEL.w + 170), (v.height * 0.36) / PANEL.h);
    this.panel.setScale(s).setPosition(v.width - (PANEL.w / 2 + 150) * s, v.height - (PANEL.h / 2 + 12) * s);
    this.status.setPosition(14, v.height - (narrow ? PANEL.h * s + 24 : 14));
  }

  private refresh(adv: Adventure): void {
    RESOURCES.forEach((r, i) => this.purse[i]!.setText(String(adv.purse[r])));
    this.date.setText(calendar(adv.day));
    const h = adv.hero;
    this.heroLine.setText(`${h.name}, ${CLASSES[h.heroClass].name} · level ${h.level}`);
    this.moveLine.setText(`Moves ${Math.floor(h.mp / 100)}/${Math.floor(dailyMp(h) / 100)}   Mana ${h.mana}/${maxMana(h)}   XP ${h.xp}`);
    h.army.forEach((slot, i) => {
      const s = this.slots[i]!;
      s.img.setVisible(!!slot);
      s.count.setVisible(!!slot);
      if (slot) {
        s.img.setTexture(TEX.creature(slot.creature, 0));
        s.count.setText(String(slot.count));
      }
    });
  }

  private endDay(): void {
    const map = this.scene.get('Map') as MapScene;
    if (map.blocked()) return;
    getSound(this)?.play('day');
    map.clearPath();
    this.session.endDay();
    map.centreOnHero();
    map.showPrompts();
  }

  /** A note floating up from the purse ("+5 wood"). */
  private note(text: string): void {
    const v = viewSize(this);
    const t = title(this, v.width / 2, v.height * 0.4, text, 26, { color: UI.giltLight }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1400, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
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
        { label: 'Start this map again', kind: 'plain', onClick: () => {
          const def = this.session.def;
          this.session.abandon(this, 'quit');
          Session.begin(this, getHost(this), def);
          this.scene.stop();
          this.scene.get('Map').scene.restart();
        } },
        { label: 'Campaign menu', kind: 'plain', onClick: () => toMenu(this, this.session, null) },
      ],
    });
  }
}
