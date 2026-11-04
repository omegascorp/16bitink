import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getSound } from '../host';
import { buyMachine, cantBuyMachine, enterTown, garrisonHero, heroInGarrison, heroTown, heroVisiting, leadOut, playerTowns, townById, withTown, type Adventure } from '../logic/adventure';
import type { Town } from '../logic/town';
import { moveSlot, type Army } from '../logic/army';
import { BUILDINGS, type BuildingId } from '../logic/buildings';
import { creature, MACHINES, type CreatureId, type MachineId } from '../logic/creatures';
import { canAfford, describeAmount, pay } from '../logic/resources';
import { lineOf } from '../logic/creatures';
import { advisedNext, build, cantBuild, growthOf, hire, hireable, hireAll, SPELLBOOK_COST, stockOf, upgradeCost, upgradeSlot, upgradeTo } from '../logic/town';
import { PX_TEX } from './battle/pixelAssets';
import { FILLS } from './battle/pixelFrames';
import { PixelFrame, TextLabel, texturePixels } from './battle/pixelUi';
import { armyUnitInfo } from './battle/unitCard';
import { UnitInfoCard, type InfoButton } from './battle/unitInfoCard';
import { openCard, type CardButton } from './CardScene';
import type { MapScene } from './MapScene';
import { pixelUiCamera } from './pixelScreen';
import { Session } from './session';
import { loadTownArt, PixelTownView, townScenery } from './town/pixelTownView';
import { HEAD, TownBar, type SlotRef, type TownScreen } from './town/townBar';
import { fortScreen, guildScreen, hallScreen, type ScreenActions } from './town/townScreens';
import { STAGE } from './town/townStage';
import { TownWindow } from './town/townWindow';

/** A press that moves further than this (UI px) is a drag, not a tap. */
const DRAG = 6;
/** Depths: the townscape, a screen over it, the strip, messages. */
const DEPTH = { window: 30, bar: 50, toast: 70, info: 90 } as const;
/** How long a message stays, and how long it takes to fade, ms. */
const TOAST = { ms: 2600, fade: 500, pad: { x: 8, y: 3 } } as const;

/** What tapping a building in the townscape opens. */
const OPENS: Partial<Record<BuildingId, TownScreen>> = {
  villageHall: 'hall', townHall: 'hall', cityHall: 'hall', capitol: 'hall',
  fort: 'fort', citadel: 'fort', castle: 'fort',
  guardhouse: 'fort', archeryRange: 'fort', griffinTower: 'fort', barracks: 'fort', monastery: 'fort', tiltyard: 'fort', seraphSpire: 'fort',
  guardhouse2: 'fort', archeryRange2: 'fort', griffinTower2: 'fort', barracks2: 'fort', monastery2: 'fort', tiltyard2: 'fort', seraphSpire2: 'fort',
  guardhouse3: 'fort', archeryRange3: 'fort', griffinTower3: 'fort', barracks3: 'fort', monastery3: 'fort', tiltyard3: 'fort', seraphSpire3: 'fort',
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
 * troops move between garrison and hero slot by slot, or the hero moves
 * into the garrison (or out of it) with every company.
 */
export class TownScene extends Phaser.Scene {
  private session!: Session;
  private size = { w: 0, h: 0, k: 1 };
  private view: PixelTownView | null = null;
  private bar: TownBar | null = null;
  private window: TownWindow | null = null;
  private screen: TownScreen | null = null;
  /** Whether the hall's been opened this visit (the guide stops pointing at it). */
  private hallSeen = false;
  private picked: SlotRef | null = null;
  /** A company's info card, while it's open. */
  private info: { card: UnitInfoCard; layer: Phaser.GameObjects.Container } | null = null;
  /** Whether this visit has said how to see a company's card. */
  private toldInfo = false;
  private fresh: BuildingId | undefined;
  /** How far the stage is panned from centre (a screen narrower than the town). */
  private panX = 0;
  private press: { x: number; panX: number } | null = null;
  private dragged = false;
  private toastParts: { destroy(): void }[] = [];
  private ready = false;
  /** The town shown: the one the hero stands in, else the player's first. */
  private townId = '';

  constructor() {
    super('Town');
  }

  create(data?: { townId?: string }): void {
    this.session = Session.get(this);
    const adv = this.session.adv;
    this.townId = data?.townId ?? heroTown(adv)?.id ?? playerTowns(adv)[0]!.id;
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.picked = null;
    this.screen = null;
    this.hallSeen = false;
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
    this.info = null;
    this.toldInfo = false;
    this.input.keyboard?.on('keydown-ESC', () => (this.info ? this.info.card.close() : this.screen ? this.openScreen(null) : this.leave()));
    this.wirePan();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.view?.destroy();
      this.window?.destroy();
      this.bar?.destroy();
      this.info?.card.close();
      for (const t of this.toastParts) t.destroy();
    });
    void loadTownArt(this).then(() => {
      if (!this.sys.isActive()) return;
      this.ready = true;
      this.bar = new TownBar(this, { open: (s) => this.openScreen(s), leave: () => this.leave(), pickSlot: (r) => this.pickSlot(r) }, DEPTH.bar);
      this.drawAll();
    });
  }

  update(_t: number, delta: number): void {
    this.view?.update(delta);
  }

    /** The town shown, as it is now. */
  private town(adv: Adventure = this.session.adv): Town {
    return townById(adv, this.townId)!;
  }

  /** The hero is in this town (not another), leading their army (visiting) or in its garrison. */
  private visiting(adv: Adventure = this.session.adv): boolean {
    return heroVisiting(adv, this.town(adv));
  }

  private held(adv: Adventure = this.session.adv): boolean {
    return heroInGarrison(adv, this.town(adv));
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
    this.bar.refresh(this.session.adv, this.town(), this.picked);
    this.beckon();
    this.drawView();
    this.drawWindow();
  }

  private drawView(): void {
    if (!this.bar) return;
    const drift = this.view?.drift;
    this.view?.destroy();
    this.view = new PixelTownView(this, this.town().built, { w: this.size.w, h: this.bar.top + 2 }, { onPick: (id, built) => this.pickBuilding(id, built), fresh: this.fresh, drift });
    this.fresh = undefined;
    this.panX = this.clampPan(this.panX);
    this.placeView();
  }

  private screenActions(): ScreenActions {
    return {
      pickBuilding: (id) => this.buildingCard(id),
      pickDwelling: (id) => this.recruitCard(id),
      hireAll: (id) => this.hire(id, hireable(this.town(), id, this.session.adv.purse)),
      hireEverything: () => this.hireEverything(),
      buyBook: () => this.buyBook(),
    };
  }

  private drawWindow(): void {
    this.window?.destroy();
    this.window = null;
    if (!this.screen || !this.bar) return;
    const adv = this.session.adv;
    const act = this.screenActions();
    const spec = this.screen === 'hall' ? hallScreen(this, adv, this.town(), this.session.def.off, act, this.session.def.advice) : this.screen === 'fort' ? fortScreen(this, adv, this.town(), act) : guildScreen(this, adv, this.town(), act);
    this.window = new TownWindow(this, spec, { w: this.size.w, h: this.bar.top }, () => this.openScreen(null), DEPTH.window);
  }

  private openScreen(s: TownScreen | null): void {
    if (s && s !== this.screen) getSound(this)?.play('card');
    this.screen = s;
    if (s === 'hall') this.hallSeen = true;
    this.beckon();
    this.drawWindow();
  }

  /** The purse, armies and any open screen show the session's latest state. */
  private refresh(): void {
    this.bar?.refresh(this.session.adv, this.town(), this.picked);
    this.beckon();
    this.drawWindow();
  }

  /** On a map that teaches the town, ring the Hall button until it's opened, while the advised building can go up today. */
  private beckon(): void {
    const { adv, def } = this.session;
    const next = advisedNext(this.town(), def.advice ?? [], def.off);
    this.bar?.beckonHall(!this.hallSeen && next !== null && !cantBuild(this.town(), next, adv.purse, def.off));
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
    if (id === 'blacksmith') {
      this.smithyCard();
      return;
    }
    const opens = OPENS[id];
    if (opens) this.openScreen(opens);
    else this.toast(`${BUILDINGS[id].name}: ${saysOf(id).toLowerCase()}`);
  }

  /** The Blacksmith's wares: a Ballista and a First Aid Tent for the visiting hero, one of each. */
  private smithyCard(): void {
    const adv = this.session.adv;
    const lines = MACHINES.map((m) => {
      const c = creature(m);
      const why = cantBuyMachine(adv, m);
      return `${c.name}, ${c.cost.gold} gold: ${m === 'ballista' ? 'shoots the enemy every round' : `heals up to ${c.heals} a round`}${why ? ` (${why})` : ''}.`;
    });
    const buttons: CardButton[] = MACHINES.filter((m) => !cantBuyMachine(adv, m)).map((m) => ({
      label: `Buy a ${creature(m).name}`, note: `${creature(m).cost.gold} gold`, onClick: () => this.buyMachine(m),
    }));
    buttons.push({ label: 'Close', kind: 'plain', onClick: () => undefined });
    openCard(this, { title: 'Blacksmith', body: `War machines ride with the hero and act by themselves in battle.\n${lines.join('\n')}`, buttons });
  }

  private buyMachine(m: MachineId): void {
    const adv = this.session.adv;
    if (cantBuyMachine(adv, m)) return;
    this.session.set(buyMachine(adv, m));
    getSound(this)?.play('hire');
    this.toast(`${adv.hero.name} has a ${creature(m).name} now`);
    this.refresh();
  }

  /** A building's card from the hall: what it does and costs, and Build when it can be built today. */
  private buildingCard(id: BuildingId): void {
    const adv = this.session.adv;
    const def = BUILDINGS[id];
    const why = cantBuild(this.town(), id, adv.purse, this.session.def.off);
    if (id === 'blacksmith' && why === 'Built') {
      this.smithyCard();
      return;
    }
    const cost = Object.keys(def.cost).length ? `Costs ${describeAmount(def.cost)}.` : 'Costs nothing.';
    const state = !why ? 'The masons are ready.' : why === 'Built' ? 'Built.' : why === 'Not enough resources' ? 'Not enough resources yet.' : why === 'Not on this map' ? 'It opens on a later map of the campaign.' : `${why}.`;
    const buttons: CardButton[] = why ? [{ label: 'Close', kind: 'plain', onClick: () => undefined }] : [{ label: 'Build', onClick: () => this.tryBuild(id) }, { label: 'Not now', kind: 'plain', onClick: () => undefined }];
    openCard(this, { title: def.name, body: `${saysOf(id)}.\n${cost}\n${state}`, buttons });
  }

  /** A dwelling's card from the fort: how many wait and what they cost, and the hire buttons. */
  private recruitCard(id: CreatureId): void {
    const adv = this.session.adv;
    const cr = creature(id);
    const town = this.town();
    const stock = stockOf(town, id);
    const can = hireable(town, id, adv.purse);
    const buttons: CardButton[] = [];
    if (can > 0) buttons.push({ label: `Hire ${can}`, note: describeAmount(Object.fromEntries(Object.entries(cr.cost).map(([r, n]) => [r, (n ?? 0) * can]))), onClick: () => this.hire(id, can) });
    if (can > 1) buttons.push({ label: 'Hire 1', kind: 'plain', onClick: () => this.hire(id, 1) });
    buttons.push({ label: 'Close', kind: 'plain', onClick: () => undefined });
    const why = stock === 0 ? 'None left this week.' : can === 0 ? 'Not enough gold to hire one.' : '';
    openCard(this, { title: cr.plural, body: `${stock} to hire, ${describeAmount(cr.cost)} each, +${growthOf(town, id)} a week.${why ? `\n${why}` : ''}`, buttons });
  }

  private tryBuild(id: BuildingId): void {
    const adv = this.session.adv;
    const def = BUILDINGS[id];
    if (cantBuild(this.town(), id, adv.purse, this.session.def.off)) return;
    const r = build(this.town(), id, adv.purse, this.session.def.off);
    let next = withTown({ ...adv, purse: r.purse }, r.town);
    if (heroTown(next)?.id === this.townId) next = enterTown(next);
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
    const toHero = this.visiting(adv);
    const here = this.town(adv);
    try {
      const r = hire(here, id, n, adv.purse, toHero ? adv.hero.army : here.garrison);
      const town = toHero ? r.town : { ...r.town, garrison: r.army };
      this.session.set(withTown({ ...adv, purse: r.purse, hero: toHero ? { ...adv.hero, army: r.army } : adv.hero }, town));
      getSound(this)?.play('hire');
      this.refresh();
    } catch (err) {
      this.toast(err instanceof Error && err.message === 'No room in the army' ? 'No room: the army has seven companies already' : 'Cannot hire that many');
    }
  }

  /** Every dwelling's troops the purse affords, strongest first, into the visiting hero's army (else the garrison). */
  private hireEverything(): void {
    const adv = this.session.adv;
    const toHero = this.visiting(adv);
    const here = this.town(adv);
    const r = hireAll(here, toHero ? adv.hero.army : here.garrison, adv.purse);
    if (!r.hired.length) {
      this.toast('Nothing to hire that you can afford');
      return;
    }
    const town = toHero ? r.town : { ...r.town, garrison: r.army };
    this.session.set(withTown({ ...adv, purse: r.purse, hero: toHero ? { ...adv.hero, army: r.army } : adv.hero }, town));
    getSound(this)?.play('hire');
    this.toast(`Hired ${r.hired.map((h) => `${h.count} ${creature(h.id).plural}`).join(', ')}`);
    this.refresh();
  }

  /** A company's card, as in battle: its stats and abilities, and Upgrade when this town has built a higher level of its line. */
  private unitCard(ref: SlotRef): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    const army = ref.army === 'hero' ? adv.hero.army : town.garrison;
    const s = army[ref.i];
    if (!s) return;
    const to = upgradeTo(town, s.creature);
    const buttons: InfoButton[] = [];
    if (to) {
      const cost = upgradeCost(s.creature, to, s.count);
      const can = canAfford(adv.purse, cost);
      buttons.push({ label: `Upgrade to ${creature(to).plural}`, note: can ? describeAmount(cost) : `Needs ${describeAmount(cost)}`, enabled: can, onClick: () => this.upgrade(ref) });
    }
    const layer = this.add.container(0, 0).setDepth(DEPTH.info);
    const scenery = { atlas: texturePixels(this, PX_TEX.scenery('grass')), art: townScenery(), seed: ref.i + 3 };
    const card = new UnitInfoCard(this, layer, armyUnitInfo(s.creature, s.count), scenery, this.size, () => {
      layer.destroy();
      this.info = null;
    }, buttons);
    this.info = { card, layer };
  }

  /** Raises the company at `ref` to its line's best level built here, for the difference in price. */
  private upgrade(ref: SlotRef): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    const army = ref.army === 'hero' ? adv.hero.army : town.garrison;
    const from = army[ref.i];
    const r = upgradeSlot(town, army, ref.i, adv.purse);
    if (!from || !r) {
      this.toast('Not enough resources to upgrade them');
      return;
    }
    const hero = ref.army === 'hero' ? { ...adv.hero, army: r.army } : adv.hero;
    const garrison = ref.army === 'garrison' ? r.army : town.garrison;
    this.session.set(withTown({ ...adv, purse: r.purse, hero }, { ...town, garrison }));
    getSound(this)?.play('hire');
    this.toast(`${from.count} upgraded to ${creature(r.army[ref.i]!.creature).plural}`);
    this.refresh();
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

  /**
   * First tap picks a company, or the hero by their face; the second moves
   * it there (merging like units, swapping others). The hero moves to the
   * other row with every company, if they all fit there.
   */
  private pickSlot(ref: SlotRef): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    const heroRow: SlotRef['army'] | null = this.visiting(adv) ? 'hero' : this.held(adv) ? 'garrison' : null;
    const armyOf = (a: SlotRef['army']): Army => (a === 'hero' ? adv.hero.army : town.garrison);
    if (!this.picked) {
      const isHero = ref.i === HEAD && ref.army === heroRow;
      if (isHero || (ref.i !== HEAD && (ref.army === 'garrison' || heroRow === 'hero') && armyOf(ref.army)[ref.i])) this.picked = ref;
      this.refresh();
      if (this.picked && this.picked.i !== HEAD && !this.toldInfo) {
        this.toldInfo = true;
        this.toast('Tap it again to see its card and upgrade it, or tap a slot to move it there');
      }
      return;
    }
    const from = this.picked;
    this.picked = null;
    if (from.i !== HEAD && from.army === ref.army && from.i === ref.i) {
      this.refresh();
      this.unitCard(ref);
      return;
    }
    if (from.i === HEAD) {
      if (ref.army !== from.army) this.moveHero(from.army);
      else this.refresh();
      return;
    }
    // A company dropped on a face, or on the visitor's row with no hero there, stays put.
    if (ref.i === HEAD || (ref.army === 'hero' && heroRow !== 'hero')) {
      this.refresh();
      return;
    }
    const same = from.army === ref.army;
    const r = moveSlot(armyOf(from.army), from.i, armyOf(ref.army), ref.i, same, from.army === 'hero');
    if (!r) {
      if (from.army === 'hero' && !same) this.toast('A hero must keep at least one company');
      this.refresh();
      return;
    }
    const hero = from.army === 'hero' ? r.src : ref.army === 'hero' ? r.dst : adv.hero.army;
    const garrison = from.army === 'garrison' ? r.src : ref.army === 'garrison' ? r.dst : town.garrison;
    this.session.set(withTown({ ...adv, hero: { ...adv.hero, army: hero } }, { ...town, garrison }));
    this.refresh();
  }

  /** The hero in row `from` moves to the other one, every company with them. */
  private moveHero(from: SlotRef['army']): void {
    const adv = this.session.adv;
    const next = from === 'hero' ? garrisonHero(adv) : leadOut(adv);
    if (!next) this.toast(`No room in the garrison for all of ${adv.hero.name}'s companies`);
    else {
      this.session.set(next);
      getSound(this)?.play('card');
    }
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
