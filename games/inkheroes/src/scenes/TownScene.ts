import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getSound } from '../host';
import { enterTown, heroInTown } from '../logic/adventure';
import { moveSlot, type Army } from '../logic/army';
import { BUILDINGS, type BuildingId } from '../logic/buildings';
import { creature, type CreatureId } from '../logic/creatures';
import { canAfford, describeAmount, pay } from '../logic/resources';
import { build, cantBuild, growthOf, hire, hireable, SPELLBOOK_COST } from '../logic/town';
import { FILLS } from './battle/pixelFrames';
import { PixelFrame, TextLabel } from './battle/pixelUi';
import { openCard, type CardButton } from './CardScene';
import type { MapScene } from './MapScene';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';
import { loadTownArt, PixelTownView } from './town/pixelTownView';
import { TownBar, type SlotRef, type TownScreen } from './town/townBar';
import { fortScreen, guildScreen, hallScreen, type ScreenActions } from './town/townScreens';
import { STAGE } from './town/townStage';
import { TownWindow } from './town/townWindow';

/** A press that moves further than this (UI px) is a drag, not a tap. */
const DRAG = 6;
/** Depths: the townscape, a screen over it, the strip, messages. */
const DEPTH = { window: 30, bar: 50, toast: 70 } as const;
/** How long a message stays, and how long it takes to fade, ms. */
const TOAST = { ms: 2600, fade: 500, pad: { x: 8, y: 3 } } as const;

/** What tapping a building in the townscape opens. */
const OPENS: Partial<Record<BuildingId, TownScreen>> = {
  villageHall: 'hall', townHall: 'hall', cityHall: 'hall', capitol: 'hall',
  fort: 'fort', citadel: 'fort', castle: 'fort',
  guardhouse: 'fort', archeryRange: 'fort', griffinTower: 'fort', barracks: 'fort', monastery: 'fort', tiltyard: 'fort', seraphSpire: 'fort',
  mageGuild1: 'guild', mageGuild2: 'guild',
};

/** What a building does, in words (a dwelling names the creature it hires by its name in this game). */
function saysOf(id: BuildingId): string {
  const d = BUILDINGS[id].dwelling;
  return d ? `Hires ${creature(d).plural}` : BUILDINGS[id].says;
}

/**
 * A town, as Heroes III shows it, in the battle's pixel art: the townscape,
 * where each building stands once built and opens what it does when tapped
 * (the hall its ledger, the walls and dwellings the fort's muster, the
 * guild its spells), over the strip with the town's lines, the garrison
 * and the visiting hero, the buttons and the purse. One building a day;
 * troops move between garrison and hero slot by slot.
 */
export class TownScene extends Phaser.Scene {
  private session!: Session;
  private size = { w: 0, h: 0, k: 1 };
  private view: PixelTownView | null = null;
  private bar: TownBar | null = null;
  private window: TownWindow | null = null;
  private screen: TownScreen | null = null;
  private picked: SlotRef | null = null;
  private fresh: BuildingId | undefined;
  /** How far the stage is panned from centre (a screen narrower than the town). */
  private panX = 0;
  private press: { x: number; panX: number } | null = null;
  private dragged = false;
  private toastParts: { destroy(): void }[] = [];
  private ready = false;

  constructor() {
    super('Town');
  }

  create(): void {
    this.session = Session.get(this);
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.picked = null;
    this.screen = null;
    this.fresh = undefined;
    this.ready = false;
    this.panX = 0;
    this.view = null;
    this.bar = null;
    this.window = null;
    this.toastParts = [];
    const fit = pixelUiCamera(this, (size) => {
      this.size = size;
      if (this.ready) this.drawAll();
    });
    this.size = fit();
    this.input.keyboard?.on('keydown-ESC', () => (this.screen ? this.openScreen(null) : this.leave()));
    this.wirePan();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.view?.destroy();
      this.window?.destroy();
      this.bar?.destroy();
      for (const t of this.toastParts) t.destroy();
    });
    void loadTownArt(this).then(() => {
      if (!this.sys.isActive()) return;
      this.ready = true;
      this.bar = new TownBar(this, { open: (s) => this.openScreen(s), leave: () => this.leave(), pickSlot: (r) => this.pickSlot(r) }, DEPTH.bar);
      this.drawAll();
    });
  }

  /** Dragging the townscape sideways pans it when it's wider than the screen. */
  private wirePan(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = p.x / this.size.k;
      const y = p.y / this.size.k;
      this.press = this.bar && y < this.bar.top && !this.screen ? { x, panX: this.panX } : null;
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.press || !p.isDown) return;
      const dx = p.x / this.size.k - this.press.x;
      if (!this.dragged && Math.abs(dx) < DRAG) return;
      this.dragged = true;
      this.panX = this.clampPan(this.press.panX + dx);
      this.placeView();
    });
    this.input.on('pointerup', () => {
      this.press = null;
    });
  }

  private clampPan(x: number): number {
    const room = Math.max(0, STAGE.w - this.size.w);
    return Math.round(Phaser.Math.Clamp(x, -room / 2, room / 2));
  }

  private placeView(): void {
    this.view?.setLeft(Math.floor((this.size.w - STAGE.w) / 2) + this.panX);
  }

  private drawAll(): void {
    if (!this.bar) return;
    this.bar.layout(this.size.w, this.size.h);
    this.bar.refresh(this.session.adv, this.picked);
    this.drawView();
    this.drawWindow();
  }

  private drawView(): void {
    if (!this.bar) return;
    this.view?.destroy();
    this.view = new PixelTownView(this, this.session.adv.town.built, { w: this.size.w, h: this.bar.top + 2 }, { onPick: (id, built) => this.pickBuilding(id, built), fresh: this.fresh });
    this.fresh = undefined;
    this.panX = this.clampPan(this.panX);
    this.placeView();
  }

  private screenActions(): ScreenActions {
    return { pickBuilding: (id) => this.buildingCard(id), pickDwelling: (id) => this.recruitCard(id), buyBook: () => this.buyBook() };
  }

  private drawWindow(): void {
    this.window?.destroy();
    this.window = null;
    if (!this.screen || !this.bar) return;
    const adv = this.session.adv;
    const act = this.screenActions();
    const spec = this.screen === 'hall' ? hallScreen(this, adv, this.session.def.off, act) : this.screen === 'fort' ? fortScreen(this, adv, act) : guildScreen(this, adv, act);
    this.window = new TownWindow(this, spec, { w: this.size.w, h: this.bar.top }, () => this.openScreen(null), DEPTH.window);
  }

  private openScreen(s: TownScreen | null): void {
    if (s && s !== this.screen) getSound(this)?.play('card');
    this.screen = s;
    this.drawWindow();
  }

  /** The purse, armies and any open screen show the session's latest state. */
  private refresh(): void {
    this.bar?.refresh(this.session.adv, this.picked);
    this.drawWindow();
  }

  private leave(): void {
    this.scene.stop();
    (this.scene.get('Map') as MapScene).back();
  }

  /** A building in the townscape opens what it does; a bare plot offers the building that would stand there. */
  private pickBuilding(id: BuildingId, built: boolean): void {
    if (this.screen || this.dragged) return;
    if (!built) {
      this.buildingCard(id);
      return;
    }
    const opens = OPENS[id];
    if (opens) this.openScreen(opens);
    else this.toast(`${BUILDINGS[id].name}: ${saysOf(id).toLowerCase()}`);
  }

  /** A building's card from the hall: what it does and costs, and Build when it can be built today. */
  private buildingCard(id: BuildingId): void {
    const adv = this.session.adv;
    const def = BUILDINGS[id];
    const why = cantBuild(adv.town, id, adv.purse, this.session.def.off);
    const cost = Object.keys(def.cost).length ? `Costs ${describeAmount(def.cost)}.` : 'Costs nothing.';
    const state = !why ? 'The masons are ready.' : why === 'Built' ? 'Built.' : why === 'Not enough resources' ? 'Not enough resources yet.' : `${why}.`;
    const buttons: CardButton[] = why ? [{ label: 'Close', kind: 'plain', onClick: () => undefined }] : [{ label: 'Build', onClick: () => this.tryBuild(id) }, { label: 'Not now', kind: 'plain', onClick: () => undefined }];
    openCard(this, { title: def.name, body: `${saysOf(id)}.\n${cost}\n${state}`, buttons });
  }

  /** A dwelling's card from the fort: how many wait and what they cost, and the hire buttons. */
  private recruitCard(id: CreatureId): void {
    const adv = this.session.adv;
    const cr = creature(id);
    const stock = adv.town.stock[id] ?? 0;
    const can = hireable(adv.town, id, adv.purse);
    const buttons: CardButton[] = [];
    if (can > 0) buttons.push({ label: `Hire ${can}`, note: describeAmount(Object.fromEntries(Object.entries(cr.cost).map(([r, n]) => [r, (n ?? 0) * can]))), onClick: () => this.hire(id, can) });
    if (can > 1) buttons.push({ label: 'Hire 1', kind: 'plain', onClick: () => this.hire(id, 1) });
    buttons.push({ label: 'Close', kind: 'plain', onClick: () => undefined });
    const why = stock === 0 ? 'None left this week.' : can === 0 ? 'Not enough gold to hire one.' : '';
    openCard(this, { title: cr.plural, body: `${stock} to hire, ${describeAmount(cr.cost)} each, +${growthOf(adv.town, id)} a week.${why ? `\n${why}` : ''}`, buttons });
  }

  private tryBuild(id: BuildingId): void {
    const adv = this.session.adv;
    const def = BUILDINGS[id];
    if (cantBuild(adv.town, id, adv.purse, this.session.def.off)) return;
    const r = build(adv.town, id, adv.purse, this.session.def.off);
    let next = { ...adv, town: r.town, purse: r.purse };
    if (heroInTown(next)) next = enterTown(next);
    getSound(this)?.play('build');
    this.session.set(next);
    // Close the ledger so the new building can be seen rising.
    this.screen = null;
    this.fresh = id;
    this.drawAll();
    this.toast(`${def.name} built: ${saysOf(id).toLowerCase()}`);
  }

  private hire(id: CreatureId, n: number): void {
    const adv = this.session.adv;
    const toHero = heroInTown(adv);
    try {
      const r = hire(adv.town, id, n, adv.purse, toHero ? adv.hero.army : adv.town.garrison);
      const town = toHero ? r.town : { ...r.town, garrison: r.army };
      this.session.set({ ...adv, town, purse: r.purse, hero: toHero ? { ...adv.hero, army: r.army } : adv.hero });
      getSound(this)?.play('hire');
      this.refresh();
    } catch (err) {
      this.toast(err instanceof Error && err.message === 'No room in the army' ? 'No room: the army has seven companies already' : 'Cannot hire that many');
    }
  }

  private buyBook(): void {
    const adv = this.session.adv;
    if (!canAfford(adv.purse, { gold: SPELLBOOK_COST })) {
      this.toast(`A spellbook costs ${SPELLBOOK_COST} gold`);
      return;
    }
    this.session.set(enterTown({ ...adv, purse: pay(adv.purse, { gold: SPELLBOOK_COST }), hero: { ...adv.hero, hasBook: true } }));
    this.refresh();
  }

  /** First tap picks a company; the second moves it there (merging like units, swapping others). */
  private pickSlot(ref: SlotRef): void {
    const adv = this.session.adv;
    if (ref.army === 'hero' && !heroInTown(adv)) return;
    const armyOf = (a: SlotRef['army']): Army => (a === 'hero' ? adv.hero.army : adv.town.garrison);
    if (!this.picked) {
      if (armyOf(ref.army)[ref.i]) this.picked = ref;
      this.refresh();
      return;
    }
    const from = this.picked;
    this.picked = null;
    const same = from.army === ref.army;
    const r = moveSlot(armyOf(from.army), from.i, armyOf(ref.army), ref.i, same, from.army === 'hero');
    if (!r) {
      if (from.army === 'hero' && !same) this.toast('A hero must keep at least one company');
      this.refresh();
      return;
    }
    const hero = from.army === 'hero' ? r.src : ref.army === 'hero' ? r.dst : adv.hero.army;
    const garrison = from.army === 'garrison' ? r.src : ref.army === 'garrison' ? r.dst : adv.town.garrison;
    this.session.set({ ...adv, hero: { ...adv.hero, army: hero }, town: { ...adv.town, garrison } });
    this.refresh();
  }

  /** A message on a dark plate just above the strip, fading after a while. */
  private toast(text: string): void {
    for (const t of this.toastParts) t.destroy();
    const label = new TextLabel(this, { wrap: Math.min(420, this.size.w - 40), anchor: { x: 0.5, y: 0 } }).setText(text);
    const pw = label.width + TOAST.pad.x * 2;
    const ph = label.height + TOAST.pad.y * 2 + 2;
    const x = Math.floor((this.size.w - pw) / 2);
    const y = (this.bar?.top ?? this.size.h) - ph - 6;
    const plate = new PixelFrame(this, pw, ph, { rim: 'bronze', fill: FILLS.plate }).setPosition(x, y);
    label.setPosition(x + Math.floor(pw / 2), y + TOAST.pad.y + 1);
    plate.img.setDepth(DEPTH.toast);
    label.img.setDepth(DEPTH.toast + 1);
    this.toastParts = [plate, label];
    this.tweens.add({ targets: [plate.img, label.img], alpha: 0, delay: TOAST.ms, duration: TOAST.fade, onComplete: () => {
      plate.destroy();
      label.destroy();
    } });
  }
}
