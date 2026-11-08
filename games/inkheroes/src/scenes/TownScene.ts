import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getHost, getSound } from '../host';
import { buyMachine, cantBuyMachine, enterTown, garrisonHero, heroInGarrison, heroTown, heroVisiting, leadOut, otherHeroAt, playerTowns, townById, withTown, type Adventure } from '../logic/adventure';
import { cantHireHero, hireHero, selectHero } from '../logic/heroes';
import { gainItem } from '../logic/items';
import type { SpellId } from '../logic/spells';
import type { Town } from '../logic/town';
import { moveSlot, splitSlot, type Army } from '../logic/army';
import { BUILDINGS, type BuildingId } from '../logic/buildings';
import { canManTower, creature, type CreatureId } from '../logic/creatures';
import { itemDef, type SoldMachine } from '../logic/items';
import { canAfford, describeAmount, pay } from '../logic/resources';
import { lineOf } from '../logic/creatures';
import { tilesOf } from '../logic/map';
import { build, buildAll, cantBuild, growthOf, hire, hireable, hireAll, SPELLBOOK_COST, SPELLBOOK_SOLD, stockOf, suggestBuilding, towerPlaces, towersOf, upgradeAll, upgradeCost, upgradeSlot, upgradeTo } from '../logic/town';
import { PX_TEX } from './battle/pixelAssets';
import { FILLS } from './battle/pixelFrames';
import { PixelButton, PixelFrame, TextLabel, texturePixels, UI_TEX } from './battle/pixelUi';
import { armyUnitInfo, dwellingPreview } from './battle/unitCard';
import { UnitInfoCard, type InfoButton } from './battle/unitInfoCard';
import { openCard, type CardButton } from './CardScene';
import type { MapScene } from './MapScene';
import { pixelUiCamera } from './pixelScreen';
import { SplitPicker } from './hud/splitPicker';
import { TownList } from './hud/townList';
import { MAP_TEX } from './map/pixelMapArt';
import { Session } from './session';
import { SOUND_BTN, soundCard } from './soundCard';
import { defaultRoom, type StripRoom } from './narrator/stripLayout';
import { BuildPlate } from './town/buildPlate';
import { loadTownArt, PixelTownView, townScenery } from './town/pixelTownView';
import { HEAD, TownBar, type SlotRef, type TownScreen } from './town/townBar';
import { fortScreen, hallScreen, platePicture, upgradableArmies, type ScreenActions } from './town/townScreens';
import { STAGE } from './town/townStage';
import { GuildRoom } from './town/guildRoom';
import { SmithRoom } from './town/smithRoom';
import { TavernRoom } from './town/tavernRoom';
import { TownWindow } from './town/townWindow';

/** A press that moves further than this (UI px) is a drag, not a tap. */
const DRAG = 6;
/** Depths: the townscape, the suggestion on it, a screen over them, the strip, messages. */
const DEPTH = { plate: 20, window: 30, bar: 50, coveringWindow: 60, toast: 70, info: 90 } as const;
/** Below this much town over the strip, a building's room covers the strip: its Buy and words wouldn't fit above it. */
const ROOM_MIN_H = 173;
/** The list of towns on the right of the town, above the strip: as wide as the map's, and how far it keeps from the edge and the strip. */
const TOWNS = { w: 120, gap: 4 } as const;
/** The testing cheat's button, on the right just under the build plate, which takes the whole top of a phone. */
const CHEAT_BTN = { w: 64, h: 22, top: 78, margin: 4 } as const;
/** How long a message stays, and how long it takes to fade, ms. */
const TOAST = { ms: 2600, fade: 500, pad: { x: 8, y: 3 } } as const;

/** What tapping a building in the townscape opens. */
const OPENS: Partial<Record<BuildingId, TownScreen>> = {
  villageHall: 'hall', townHall: 'hall', cityHall: 'hall', capitol: 'hall',
  fort: 'fort', citadel: 'fort', castle: 'fort',
  guardhouse: 'fort', archeryRange: 'fort', griffinTower: 'fort', barracks: 'fort', monastery: 'fort', tiltyard: 'fort', seraphSpire: 'fort',
  guardhouse2: 'fort', archeryRange2: 'fort', griffinTower2: 'fort', barracks2: 'fort', monastery2: 'fort', tiltyard2: 'fort', seraphSpire2: 'fort',
  guardhouse3: 'fort', archeryRange3: 'fort', griffinTower3: 'fort', barracks3: 'fort', monastery3: 'fort', tiltyard3: 'fort', seraphSpire3: 'fort',
  mageGuild1: 'guild', mageGuild2: 'guild', blacksmith: 'smith', tavern: 'tavern',
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
  private window: TownWindow | GuildRoom | SmithRoom | TavernRoom | null = null;
  /** The spell being read in the guild. */
  private guildPick: SpellId | null = null;
  /** The machine being looked at in the Blacksmith. */
  private smithPick: SoldMachine | null = null;
  private plate: BuildPlate | null = null;
  /** The player's towns, a tap away from each other. */
  private towns: TownList | null = null;
  /** Testing cheats only: puts up everything this map allows. */
  private cheatBtn: PixelButton | null = null;
  private soundBtn: PixelButton | null = null;
  private screen: TownScreen | null = null;
  private picked: SlotRef | null = null;
  /** A company's info card, while it's open. */
  private info: { card: UnitInfoCard; layer: Phaser.GameObjects.Container } | null = null;
  /** The company being split, while its picker is open. */
  private splitter: SplitPicker | null = null;
  /** Whether this visit has said how to see a company's card. */
  private toldInfo = false;
  private fresh: BuildingId | undefined;
  /** How far the stage is panned from centre (a screen narrower than the town). */
  private panX = 0;
  private press: { x: number; panX: number } | null = null;
  private dragged = false;
  private toastParts: { destroy(): void }[] = [];
  private ready = false;
  /** A hero hired here while another stood in the gate: picked once the town is left. */
  private pickOnLeave: string | null = null;
  /** The town shown: the one the hero stands in, else the player's first. */
  private townId = '';

  constructor() {
    super('Town');
  }

  create(data?: { townId?: string }): void {
    getSound(this)?.music('townGreek');
    this.session = Session.get(this);
    const adv = this.session.adv;
    this.townId = data?.townId ?? heroTown(adv)?.id ?? playerTowns(adv)[0]!.id;
    this.pickOnLeave = null;
    this.pickHeroHere();
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.picked = null;
    this.screen = null;
    this.fresh = undefined;
    this.ready = false;
    this.panX = 0;
    this.view = null;
    this.bar = null;
    this.window = null;
    this.plate = null;
    this.towns = null;
    this.cheatBtn = null;
    this.soundBtn = null;
    this.toastParts = [];
    const fit = pixelUiCamera(this, (size) => {
      this.size = size;
      if (this.ready) this.drawAll();
    });
    this.size = fit();
    this.info = null;
    this.splitter = null;
    this.toldInfo = false;
    this.input.keyboard?.on('keydown-ESC', () => (this.splitter ? this.closeSplit() : this.info ? this.info.card.close() : this.screen ? this.openScreen(null) : this.leave()));
    this.wirePan();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.view?.destroy();
      this.window?.destroy();
      this.plate?.destroy();
      this.towns?.destroy();
      this.cheatBtn?.destroy();
      this.soundBtn?.destroy();
      this.bar?.destroy();
      this.info?.card.close();
      this.closeSplit();
      for (const t of this.toastParts) t.destroy();
    });
    void loadTownArt(this).then(() => {
      if (!this.sys.isActive()) return;
      this.ready = true;
      this.bar = new TownBar(this, { open: (s) => this.openScreen(s), leave: () => this.leave(), pickSlot: (r) => this.pickSlot(r), canCarry: (r) => this.canPick(r), dropSlot: (from, to) => this.moveCompany(from, to), split: () => this.openSplit() }, DEPTH.bar);
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

  /** The town serves the picked hero: opened with another of ours in its gate and the picked one elsewhere, that one is picked. */
  private pickHeroHere(): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    const waiting = otherHeroAt(adv, town.x, town.y);
    if (waiting && heroTown(adv)?.id !== town.id) this.session.set(selectHero(adv, waiting.id));
  }

  /** Whether this map's Taverns have heroes to hire (map 1's don't, so it shows no Tavern button). */
  private hires(): boolean {
    return (this.session.def.recruits ?? []).length > 0;
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
    this.bar.layout(this.size.w, this.size.h, this.town(), this.hires());
    this.bar.refresh(this.session.adv, this.town(), this.picked);
    this.drawView();
    this.drawPlate();
    this.drawTowns();
    this.drawCheat();
    this.drawSound();
    this.drawWindow();
  }

  /** The cheat's button, while there's something left to build and no window in the way. */
  private drawCheat(): void {
    if (!getHost(this)?.cheats) return;
    this.cheatBtn ??= new PixelButton(this, { w: CHEAT_BTN.w, h: CHEAT_BTN.h, label: 'Build all', rim: 'gold', onClick: () => this.cheatBuildAll() });
    const left = buildAll(this.town(), this.session.def.off) !== this.town();
    this.cheatBtn.root.setDepth(DEPTH.plate).setVisible(left && !this.screen);
    this.cheatBtn.setPosition(this.size.w - CHEAT_BTN.w - CHEAT_BTN.margin, CHEAT_BTN.top);
  }

  /** Where the narrator's strip goes in town: under the Sound button, clear of the town strip at the foot. */
  narratorRoom(): StripRoom {
    return defaultRoom(this.size, CHEAT_BTN.top + CHEAT_BTN.h + 4);
  }

  /** The sound switches' button, level with the cheat's on the other side, while no window is in the way. */
  private drawSound(): void {
    const sound = getSound(this);
    if (!sound) return;
    this.soundBtn ??= new PixelButton(this, { w: SOUND_BTN.w, h: SOUND_BTN.h, label: 'Sound', onClick: () => soundCard(sound, (spec) => openCard(this, spec)) });
    this.soundBtn.root.setDepth(DEPTH.plate).setVisible(!this.screen);
    this.soundBtn.setPosition(SOUND_BTN.margin, CHEAT_BTN.top);
  }

  /** The other towns to go to, with no window in the way; with one town there is nowhere to go. */
  private drawTowns(): void {
    const { adv, def } = this.session;
    const towns = playerTowns(adv);
    this.towns ??= new TownList(this, TOWNS.w, {
      textureOf: (t) => MAP_TEX.town(`${def.id}-${t.id}`),
      onOpen: (townId) => this.scene.restart({ townId }),
    });
    this.towns.set(towns.length > 1 ? towns : [], this.townId);
    this.towns.root.setDepth(DEPTH.plate).setPosition(this.size.w - TOWNS.w - TOWNS.gap, this.bar!.top - TOWNS.gap).setVisible(!this.screen);
    this.bar!.setTowersHidden(!!this.screen);
  }

  /** The suggestion at the top of the town, as things stand; none once the town is finished. */
  private drawPlate(): void {
    this.plate?.destroy();
    this.plate = null;
    const { adv, def } = this.session;
    const town = this.town();
    const id = suggestBuilding(town, adv.purse, def.off);
    // A screen open over the town has its own say (the hall leads with the same building).
    if (!id || this.screen) return;
    this.plate = new BuildPlate(this, {
      town, id, purse: adv.purse, picture: platePicture(this, id), area: this.size, depth: DEPTH.plate,
      onBuild: () => {
        if (!this.dragged) this.tryBuild(id);
      },
      onInfo: () => {
        if (!this.dragged) this.buildingCard(id);
      },
    });
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
      build: (id) => this.tryBuild(id),
      pickDwelling: (id) => this.recruitCard(id),
      hireAll: (id) => this.hire(id, hireable(this.town(), id, this.session.adv.purse)),
      hireEverything: () => this.hireEverything(),
      upgradeEverything: () => this.upgradeEverything(),
    };
  }

  private drawWindow(): void {
    this.window?.destroy();
    this.window = null;
    if (!this.screen || !this.bar) return;
    const adv = this.session.adv;
    const act = this.screenActions();
    const area = { w: this.size.w, h: this.bar.top };
    const covers = area.h < ROOM_MIN_H;
    const room = covers ? this.size : area;
    const depth = covers ? DEPTH.coveringWindow : DEPTH.window;
    if (this.screen === 'guild') {
      this.window = new GuildRoom(this, adv, this.town(), this.guildPick, room, { close: () => this.openScreen(null), buy: () => this.buyBook(), pick: (id) => this.pickSpell(id) }, depth);
      return;
    }
    if (this.screen === 'tavern') {
      this.window = new TavernRoom(this, adv, this.session.def, this.town(), room, { close: () => this.openScreen(null), hire: () => this.hireHero() }, depth);
      return;
    }
    if (this.screen === 'smith') {
      this.window = new SmithRoom(this, adv, this.town(), this.smithPick, room, { close: () => this.openScreen(null), buy: (m) => this.buyMachine(m), pick: (m) => this.pickWare(m) }, depth);
      return;
    }
    const spec = this.screen === 'hall' ? hallScreen(this, adv, this.town(), this.session.def.off, act) : fortScreen(this, adv, this.town(), act);
    this.window = new TownWindow(this, spec, area, () => this.openScreen(null), DEPTH.window);
  }

  private pickSpell(id: SpellId): void {
    if (id === this.guildPick) return;
    this.guildPick = id;
    this.drawWindow();
  }

  private pickWare(m: SoldMachine): void {
    if (m === this.smithPick) return;
    this.smithPick = m;
    this.drawWindow();
  }

  private openScreen(s: TownScreen | null): void {
    if (s && s !== this.screen) getSound(this)?.play('card');
    this.screen = s;
    this.drawPlate();
    this.drawTowns();
    this.drawWindow();
  }

  /** The purse, armies and any open screen show the session's latest state. */
  private refresh(): void {
    this.bar?.refresh(this.session.adv, this.town(), this.picked);
    this.drawPlate();
    this.drawTowns();
    this.drawWindow();
  }

  private leave(): void {
    if (this.pickOnLeave) this.session.set(selectHero(this.session.adv, this.pickOnLeave));
    this.pickOnLeave = null;
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
    if (opens && (opens !== 'tavern' || this.hires())) this.openScreen(opens);
    else this.toast(`${BUILDINGS[id].name}: ${saysOf(id).toLowerCase()}`);
  }

  private buyMachine(m: SoldMachine): void {
    const adv = this.session.adv;
    const why = cantBuyMachine(adv, m);
    if (why) {
      this.toast(why);
      return;
    }
    this.session.set(buyMachine(adv, m));
    getSound(this)?.play('hire');
    this.toast(`${adv.hero.name} has a ${itemDef(m).name} now`);
    this.refresh();
  }

  /** The Tavern's hero joins: paid for, at the gate (or beside it), and picked, so the town now serves them. */
  private hireHero(): void {
    const { adv, def } = this.session;
    const next = hireHero(adv, def, this.townId);
    if (!next) {
      this.toast(cantHireHero(adv, def, this.town(adv)) ?? 'No hero can be hired here');
      return;
    }
    const atGate = heroTown(next)?.id === this.townId;
    // A hero already in the gate keeps the town while it's open; the new one is picked on leaving.
    const keep = !atGate && heroTown(adv)?.id === this.townId;
    this.pickOnLeave = keep ? next.hero.id : null;
    this.session.set(keep ? selectHero(next, adv.hero.id) : next);
    getSound(this)?.play('hire');
    this.screen = null;
    this.picked = null;
    this.drawAll();
    this.toast(atGate ? `${next.hero.name} joins you at the gate` : `${next.hero.name} joins you and waits outside the gate, ready to ride`);
  }

  /** A building's card from the hall: what it does and costs, and Build when it can be built today. */
  private buildingCard(id: BuildingId): void {
    const adv = this.session.adv;
    const def = BUILDINGS[id];
    const why = cantBuild(this.town(), id, adv.purse, this.session.def.off);
    if (id === 'blacksmith' && why === 'Built') {
      this.openScreen('smith');
      return;
    }
    const cost = Object.keys(def.cost).length ? `Costs ${describeAmount(def.cost)}.` : 'Costs nothing.';
    const state = !why ? 'The masons are ready.' : why === 'Built' ? 'Built.' : why === 'Not enough resources' ? 'Not enough resources yet.' : why === 'Not on this map' ? 'It opens on a later map of the campaign.' : `${why}.`;
    const buttons: CardButton[] = why ? [{ label: 'Close', kind: 'plain', onClick: () => undefined }] : [{ label: 'Build', onClick: () => this.tryBuild(id) }, { label: 'Not now', kind: 'plain', onClick: () => undefined }];
    const preview = dwellingPreview(id) ?? undefined;
    // With a picture of what it hires, the card needn't say "Hires ..." as well.
    const perk = def.travel ? { icon: 'speed' as const, text: `+${tilesOf(def.travel)} tiles` } : undefined;
    openCard(this, { title: def.name, body: preview ? `${cost}\n${state}` : `${saysOf(id)}.\n${cost}\n${state}`, buttons, preview, perk });
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

  /** The testing cheat: the whole town goes up, free. */
  private cheatBuildAll(): void {
    const { adv, def } = this.session;
    const town = buildAll(this.town(), def.off);
    const built = town.built.length - this.town().built.length;
    const next = withTown(adv, town);
    getSound(this)?.play('build');
    this.session.set(heroTown(next)?.id === this.townId ? enterTown(next) : next);
    this.drawAll();
    this.toast(`${built} buildings up, free`);
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
    const s = this.armyAt(ref.army, adv)[ref.i];
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
    const army = this.armyAt(ref.army, adv);
    const from = army[ref.i];
    const r = upgradeSlot(town, army, ref.i, adv.purse);
    if (!from || !r) {
      this.toast('Not enough resources to upgrade them');
      return;
    }
    this.session.set(this.withRows({ ...adv, purse: r.purse }, { [ref.army]: r.army }));
    getSound(this)?.play('hire');
    this.toast(`${from.count} upgraded to ${creature(r.army[ref.i]!.creature).plural}`);
    this.refresh();
  }

  /** Every company here the purse affords, the strongest first, up to its line's best level built. */
  private upgradeEverything(): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    const toHero = this.visiting(adv);
    const r = upgradeAll(town, upgradableArmies(adv, town), adv.purse);
    if (!r.upgraded) {
      this.toast('Not enough resources to upgrade them');
      return;
    }
    const hero = toHero ? { ...adv.hero, army: r.armies[0]! } : adv.hero;
    const [garrison, towers] = r.armies.slice(-2);
    this.session.set(withTown({ ...adv, purse: r.purse, hero }, { ...town, garrison: garrison!, towers: towers! }));
    getSound(this)?.play('hire');
    this.toast(`${r.upgraded} ${r.upgraded === 1 ? 'unit' : 'units'} upgraded`);
    this.refresh();
  }

  private buyBook(): void {
    const adv = this.session.adv;
    if (!canAfford(adv.purse, { gold: SPELLBOOK_COST })) {
      this.toast(`A spellbook costs ${SPELLBOOK_COST} gold`);
      return;
    }
    this.session.set(enterTown({ ...adv, purse: pay(adv.purse, { gold: SPELLBOOK_COST }), hero: gainItem(adv.hero, SPELLBOOK_SOLD).hero }));
    this.refresh();
  }

  /** The row the hero is in, if they're here. */
  private heroRow(adv: Adventure = this.session.adv): SlotRef['army'] | null {
    return this.visiting(adv) ? 'hero' : this.held(adv) ? 'garrison' : null;
  }

  private armyAt(a: SlotRef['army'], adv: Adventure = this.session.adv): Army {
    return a === 'hero' ? adv.hero.army : a === 'tower' ? towersOf(this.town(adv)) : this.town(adv).garrison;
  }

  /** `adv` with some of the town's rows replaced. */
  private withRows(adv: Adventure, rows: Partial<Record<SlotRef['army'], Army>>): Adventure {
    const town = this.town(adv);
    const { hero, garrison, tower } = rows;
    return withTown(hero ? { ...adv, hero: { ...adv.hero, army: hero } } : adv, { ...town, ...(garrison ? { garrison } : {}), ...(tower ? { towers: tower } : {}) });
  }

  /** Whether there's a company at `ref` the player can take. */
  private canPick(ref: SlotRef): boolean {
    return ref.i !== HEAD && (ref.army !== 'hero' || this.heroRow() === 'hero') && !!this.armyAt(ref.army)[ref.i];
  }

  /**
   * First tap picks a company, or the hero by their face; the second moves
   * it there (merging like units, swapping others). The hero moves to the
   * other row with every company, if they all fit there.
   */
  private pickSlot(ref: SlotRef): void {
    if (ref.army === 'tower' && ref.i >= towerPlaces(this.town())) {
      this.picked = null;
      this.toast(`Build a ${ref.i === 1 ? 'Citadel' : 'Castle'} to raise this tower`);
      this.refresh();
      return;
    }
    if (!this.picked) {
      const isHero = ref.i === HEAD && ref.army === this.heroRow();
      if (isHero || this.canPick(ref)) this.picked = ref;
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
    this.moveCompany(from, ref);
  }

  /** The company at `from` onto the slot at `to`: merged with its like, swapped with another. */
  private moveCompany(from: SlotRef, to: SlotRef): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    this.picked = null;
    // A company dropped on a face, or on the visitor's row with no hero there, stays put.
    if (to.i === HEAD || (to.army === 'hero' && this.heroRow(adv) !== 'hero')) {
      this.refresh();
      return;
    }
    const same = from.army === to.army;
    const going = this.armyAt(from.army, adv)[from.i];
    const coming = this.armyAt(to.army, adv)[to.i];
    const up = [...(to.army === 'tower' ? [going] : []), ...(from.army === 'tower' && coming?.creature !== going?.creature ? [coming] : [])];
    if (to.army === 'tower' && to.i >= towerPlaces(town)) {
      this.refresh();
      return;
    }
    if (up.some((s) => s && !canManTower(s.creature))) {
      this.toast('Only shooters that take one tile can stand on a tower');
      this.refresh();
      return;
    }
    const r = moveSlot(this.armyAt(from.army, adv), from.i, this.armyAt(to.army, adv), to.i, same, from.army === 'hero');
    if (!r) {
      if (from.army === 'hero' && !same) this.toast('A hero must keep at least one company');
      this.refresh();
      return;
    }
    this.session.set(this.withRows(adv, { [from.army]: r.src, [to.army]: r.dst }));
    getSound(this)?.play('card');
    this.refresh();
  }

  /** The picker for the company picked. */
  private openSplit(): void {
    const ref = this.picked;
    const company = ref ? this.armyAt(ref.army)[ref.i] : null;
    if (!ref || !company || this.splitter) return;
    getSound(this)?.play('card');
    this.splitter = new SplitPicker(this, {
      id: company.creature, count: company.count, screen: this.size, depth: DEPTH.info,
      onSplit: (n) => this.splitCompany(ref, n),
      onClose: () => this.closeSplit(),
    });
  }

  private closeSplit(): void {
    this.splitter?.destroy();
    this.splitter = null;
  }

  /** `n` of the company at `ref` become a new one, picked so a tap sends it where it's wanted. */
  private splitCompany(ref: SlotRef, n: number): void {
    this.closeSplit();
    const adv = this.session.adv;
    const town = this.town(adv);
    const r = splitSlot(this.armyAt(ref.army, adv), ref.i, n);
    if (!r) {
      this.toast('No free slot to split into');
      return;
    }
    this.session.set(this.withRows(adv, { [ref.army]: r.army }));
    this.picked = { army: ref.army, i: r.at };
    getSound(this)?.play('card');
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
