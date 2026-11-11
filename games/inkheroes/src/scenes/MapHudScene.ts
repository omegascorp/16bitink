import Phaser from 'phaser';
import { getHost, getSound } from '../host';
import { calendar, ourHeroes, playerTowns, unfinished, type Adventure } from '../logic/adventure';
import { CLASSES, dailyMp, maxMana, withinMana } from '../logic/hero';
import { hasSpellbook } from '../logic/items';
import { tilesOf } from '../logic/map';
import { faceOf, heroArt, PX_TEX } from './battle/pixelAssets';
import { drawPortrait, FILLS } from './battle/pixelFrames';
import { PixelButton, PixelFrame, putBuffer, TextLabel, UI_TEX } from './battle/pixelUi';
import { openCard } from './CardScene';
import { soundCard } from './soundCard';
import { chapterDoneCard, toMenu } from './cards';
import { HERO_SLOT } from './hud/armySlots';
import { HERO_LIST_H, HeroList } from './hud/heroList';
import { heroListOrder } from './hud/heroListData';
import { freeSlot, releaseSlot, takeSlot } from './hud/noteStack';
import { PurseRow, PURSE_BAR_H } from './hud/purseRow';
import { TownList } from './hud/townList';
import { MAP_TEX, townTexOf } from './map/pixelMapArt';
import type { MapScene } from './MapScene';
import { mapRoom, type Box, type StripRoom } from './narrator/stripLayout';
import { narrator, STRIP_EVENT } from './NarratorScene';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';

const BAR_H = PURSE_BAR_H;
/** The hero panel: padding, the words beside the face, the buttons beside it. */
const PAD = 6;
const BTN = { w: 60, gap: 3 } as const;
const BUTTONS = 2;
/** The buttons' width, and the town list's above them. */
const BUTTONS_W = BUTTONS * (BTN.w + BTN.gap);
const LINE = 15;
const TEXT_W = 190;
const PANEL_H = PAD + HERO_SLOT + PAD;
const PANEL_W = PAD + HERO_SLOT + 6 + TEXT_W + PAD;
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
 * pointer, and the hero's panel (face, level, moves and mana) with End day
 * and the menu beside it, and the player's towns listed above those two;
 * with more than one hero, their faces in a row on the panel, to pick one.
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
  private manaIcon!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Container;
  private panelFrame!: PixelFrame;
  private portrait!: Phaser.GameObjects.Image;
  private buttons: PixelButton[] = [];
  private towns!: TownList;
  private heroes!: HeroList;
  private heroKey = '';
  /** The hero whose face the panel shows. */
  private faceFor = '';
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
    // The status line keeps clear of the narrator's strip, which shares the bottom left.
    const onStrip = (): void => this.setStatus(this.status?.text ?? '');
    this.game.events.on(STRIP_EVENT, onStrip);
    map.events.on('status', onStatus);
    map.events.on('note', onNote);
    map.events.on('end-day', onEnd);
    // Over the HUD the map no longer hears the pointer: its cursor must not stay behind.
    this.input.on('pointermove', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => over.length && map.clearCursor());
    const onChange = (adv: Adventure): void => this.refresh(adv);
    this.session.on('change', onChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      map.events.off('status', onStatus);
      map.events.off('note', onNote);
      map.events.off('end-day', onEnd);
      this.game.events.off(STRIP_EVENT, onStrip);
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
    // The panel opens the hero's sheet.
    this.panelFrame.img.setInteractive();
    this.panelFrame.img.on('pointerup', () => this.openHero());
    this.faceFor = this.session.adv.hero.id;
    this.heroKey = this.heroFace();
    this.portrait = this.add.image(PAD, PAD, this.heroKey).setOrigin(0).setInteractive();
    this.portrait.on('pointerup', () => this.openHero());
    parts.push(this.portrait);
    const textX = PAD + HERO_SLOT + 6;
    // The two lines centred beside the face.
    const textY = Math.floor((PANEL_H - LINE * 2 - 2) / 2);
    this.heroLine = new TextLabel(this, { kind: 'title', align: 'left', anchor: { x: 0, y: 0 } }).setPosition(textX, textY);
    const statY = textY + LINE + 2;
    const moveIcon = this.add.image(textX, statY - 1, UI_TEX.stat('speed')).setOrigin(0);
    this.moveLine = new TextLabel(this, { align: 'left', anchor: { x: 0, y: 0 } }).setPosition(textX + 19, statY);
    const manaX = textX + 96;
    this.manaIcon = this.add.image(manaX, statY - 1, UI_TEX.stat('mana')).setOrigin(0);
    this.manaLine = new TextLabel(this, { align: 'left', anchor: { x: 0, y: 0 } }).setPosition(manaX + 19, statY);
    this.owned.push(this.heroLine, this.moveLine, this.manaLine);
    parts.push(this.heroLine.img, moveIcon, this.moveLine.img, this.manaIcon, this.manaLine.img);
    this.towns = new TownList(this, BUTTONS_W - BTN.gap, {
      textureOf: (t) => townTexOf(this.session.def, t),
      onOpen: (id) => (this.scene.get('Map') as MapScene).openTown(id),
    });
    this.owned.push(this.towns);
    parts.push(this.towns.root);
    // The heroes stand on the panel's top left edge (the towns have the right).
    this.heroes = new HeroList(this, (id) => (this.scene.get('Map') as MapScene).pickHero(id));
    this.heroes.root.setPosition(0, -BTN.gap);
    this.owned.push(this.heroes);
    parts.push(this.heroes.root);
    const specs = [
      { label: 'End day', icon: 'endDay' as const, rim: 'gold' as const, onClick: () => this.endDay() },
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

  /** The picked hero's face, cut 1:1 from the battle figure's idle frame. */
  private heroFace(): string {
    const h = heroArt('player', this.faceFor);
    return putBuffer(this, drawPortrait(faceOf(this, PX_TEX.hero(h.id, 'idle'), h.art, HERO_SLOT - 4), 'bronze', false, false, HERO_SLOT));
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
    const total = PANEL_W + BUTTONS_W;
    this.narrow = w < total + 4;
    this.buttons.forEach((b, i) => {
      if (this.narrow) b.setPosition(PANEL_W - (BUTTONS - i) * (BTN.w + BTN.gap) + BTN.gap, -PANEL_H - BTN.gap);
      else b.setPosition(PANEL_W + BTN.gap + i * (BTN.w + BTN.gap), 0);
    });
    // The towns stand on the buttons, growing upwards.
    const [first] = this.buttons;
    this.towns.root.setPosition(first!.root.x, first!.root.y - BTN.gap);
    this.panel.setPosition(this.narrow ? Math.floor((w - PANEL_W) / 2) : w - total - 2, h - PANEL_H - 2);
    this.setStatus(this.status?.text ?? '');
  }

  /** Where the narrator's strip goes on the map: at the bottom left beside the hero's panel when there's room, else under the top bar (and the date). */
  narratorRoom(): StripRoom {
    const { w, h } = this.size;
    const dateBelow = this.date.img.y > BAR_H - 2;
    return mapRoom({ w, h }, this.narrow ? 0 : this.panel.x, dateBelow ? this.date.img.y + this.date.height + 4 : BAR_H + 4);
  }

  /** The narrator's strip, when it's at the bottom (the status line goes above it). */
  private stripBelow(): Box | null {
    const box = narrator(this)?.stripBounds ?? null;
    return box && box.y > this.size.h / 2 ? box : null;
  }

  /** What's under the pointer, on a dark plate at the bottom left (or above the panel on a narrow screen). */
  private setStatus(text: string): void {
    if (!this.status) return;
    const { w, h } = this.size;
    const room = w - PANEL_W - BUTTONS_W - 12;
    const narrow = this.narrow || room < 160;
    // Clear of the buttons' row on a phone, and of the heroes' faces on the panel.
    const lift = Math.max(this.narrow ? PANEL_H + BTN.gap : 0, this.heroes.visible ? HERO_LIST_H + BTN.gap : 0);
    const above = h - 2 - PANEL_H - lift - 4;
    // Above the panel it stays clear of the towns, which rise on that side.
    const clear = this.panel.x + this.towns.root.x - 8;
    this.status.setWrap((narrow ? clear : room) - PLATE_PAD.x * 2).setText(text);
    this.status.img.setVisible(!!text).setDepth(2);
    this.plate?.img.setVisible(!!text);
    if (!text) return;
    const pw = this.status.width + PLATE_PAD.x * 2;
    const ph = this.status.height + PLATE_PAD.y * 2 + 2;
    const x = 4;
    const strip = narrow ? null : this.stripBelow();
    const y = (narrow ? above : strip ? strip.y - 2 : h - 2) - ph;
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
    this.manaLine.setText(`${h.mana}/${maxMana(h)}`).img.setVisible(hasSpellbook(h));
    this.manaIcon.setVisible(hasSpellbook(h));
    this.towns.set(playerTowns(adv));
    const shown = this.heroes.visible;
    const { def } = this.session;
    this.heroes.set(heroListOrder(ourHeroes(adv), [def.hero.id, ...(def.recruits ?? []).map((r) => r.id)]), h.id);
    if (h.id !== this.faceFor) this.swapFace(h.id);
    // The status plate may sit over the panel: it moves when the faces come or go.
    if (shown !== this.heroes.visible) this.setStatus(this.status?.text ?? '');
  }

  /** The panel shows hero `id`'s face now (another was picked). */
  private swapFace(id: string): void {
    const old = this.heroKey;
    this.faceFor = id;
    this.heroKey = this.heroFace();
    this.portrait.setTexture(this.heroKey);
    if (this.textures.exists(old)) this.textures.remove(old);
  }

  /** The hero's sheet, as Heroes 3's hero screen. */
  private openHero(): void {
    const map = this.scene.get('Map') as MapScene;
    if (map.blocked()) return;
    openCard(this, {
      title: this.session.adv.hero.name,
      body: '',
      sheet: {
        face: this.heroKey,
        hero: () => this.session.adv.hero,
        change: (next) => this.session.set({ ...this.session.adv, hero: withinMana(next) }),
      },
      buttons: [
        { label: 'Show on map', kind: 'plain', onClick: () => map.centreOnHero() },
        { label: 'Close', kind: 'plain', onClick: () => undefined },
      ],
    });
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
    const free = this.session.freePlay;
    openCard(this, {
      title: this.session.def.name,
      // In free play the goal is met for good: the land is the player's to roam, and the chapter's ending can be seen again.
      body: `${free ? 'Chapter complete: the land is yours to explore.' : `Goal: ${this.session.def.goal.text}.`}\n${calendar(this.session.adv.day)}. The game saves as you play.`,
      buttons: [
        { label: 'Back to the map', onClick: () => undefined },
        ...(free ? [{ label: 'The chapter’s ending', kind: 'plain' as const, onClick: () => openCard(this, chapterDoneCard(this, this.session, undefined, true)) }] : []),
        ...(sound ? [{ label: 'Sound', kind: 'plain' as const, onClick: () => soundCard(sound, (spec) => openCard(this, spec)) }] : []),
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

