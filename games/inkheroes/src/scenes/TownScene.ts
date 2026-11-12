import Phaser from 'phaser';
import { BACKDROP } from '../art/palette';
import { getHost, getSound } from '../host';
import { buyMachine, cantBuyMachine, enterTown, garrisonHero, heroTown, leadOut, ourHeroes, playerTowns, PORTAL, townById, withTown, type Adventure } from '../logic/adventure';
import { cantStepThrough, portalLevel, stepThrough } from '../logic/portal';
import { cantFightMob } from '../logic/portalMob';
import { cantHireHero, hireHero, selectHero, swapTownHeroes, tavernsHire, townHeroes, withHero, type TownHeroes } from '../logic/heroes';
import { gainItem } from '../logic/items';
import type { SpellId } from '../logic/spells';
import type { Town } from '../logic/town';
import { moveSlot, splitSlot, type Army } from '../logic/army';
import type { BuildingId } from '../logic/buildings';
import { canManTower, creature, type CreatureId } from '../logic/creatures';
import { itemDef, type SoldMachine } from '../logic/items';
import { canAfford, describeAmount, pay } from '../logic/resources';
import { lineOf } from '../logic/creatures';
import { tilesOf } from '../logic/map';
import { build, buildAll, cantBuild, growthOf, hire, hireable, hireAll, SPELLBOOK_COST, spellbookSold, stockOf, buildingIn, suggestBuilding, towerPlaces, towersOf, upgradeAll, upgradeCost, upgradeSlot, upgradeTo } from '../logic/town';
import { withinMana, type Hero } from '../logic/hero';
import { faceOf, heroArt, PX_TEX } from './battle/pixelAssets';
import { drawPortrait, FILLS } from './battle/pixelFrames';
import { PixelButton, PixelFrame, putBuffer, TextLabel, texturePixels, UI_TEX } from './battle/pixelUi';
import { HERO_SLOT } from './hud/armySlots';
import { armyUnitInfo, dwellingPreview } from './battle/unitCard';
import { factionOf } from '../logic/factions';
import { UnitInfoCard, type InfoButton } from './battle/unitInfoCard';
import { canCompare } from './battle/unitCompare';
import { UnitCompareView } from './battle/unitCompareView';
import { openCard, type CardButton } from './CardScene';
import type { MapScene } from './MapScene';
import { pixelUiCamera } from './pixelScreen';
import { SplitPicker } from './hud/splitPicker';
import { TOWN_ROW_H, TownList } from './hud/townList';
import { MAP_TEX, townTexOf } from './map/pixelMapArt';
import { Session } from './session';
import { soldOn } from '../level/unlocks';
import { SOUND_BTN, soundCard } from './soundCard';
import { defaultRoom, type StripRoom } from './narrator/stripLayout';
import { BuildPlate } from './town/buildPlate';
import { loadTownArt, PixelTownView, townScenery } from './town/pixelTownView';
import { HEAD, TownBar, type SlotRef, type TownScreen } from './town/townBar';
import { fortScreen, hallScreen, platePicture, upgradableArmies, type ScreenActions } from './town/townScreens';
import { STAGE } from './town/townStage';
import { GuildRoom } from './town/guildRoom';
import { SmithRoom } from './town/smithRoom';
import { firstPick, MarketRoom, type MarketPick } from './town/marketRoom';
import { marketTrade } from '../logic/market';
import { TavernRoom } from './town/tavernRoom';
import { StoreRoom } from './town/storeRoom';
import { SellRoom } from './town/sellRoom';
import { forSale, sellPiece } from '../logic/sell';
import { storeTap, type StoreRef } from './town/storeData';
import { buyBag, cantBuyBag } from '../logic/storage';
import { TownWindow } from './town/townWindow';
import { PortalRoom } from './town/portalRoom';

/** A press that moves further than this (UI px) is a drag, not a tap. */
const DRAG = 6;
/** Depths: the townscape, the suggestion on it, a screen over them, the strip, messages. */
const DEPTH = { plate: 20, window: 30, bar: 50, coveringWindow: 60, toast: 70, info: 90 } as const;
/** Below this much town over the strip, a building's room covers the strip: its Buy and words wouldn't fit above it. */
const ROOM_MIN_H = 173;
/** On a phone, a building's room stands left of the rail while the town there is this wide (held sideways); narrower, it covers the screen. */
const ROOM_MIN_W = 480;
/** On a phone, the top row over the town: the Sound button, the button naming the town (it opens the list of towns), then the build plate where it fits. */
const TOP_ROW = { y: 6, h: 22, gap: 4, plateMinW: 260 } as const;
/** The list of towns on the right of the town, above the strip: as wide as the map's, and how far it keeps from the edge and the strip. */
const TOWNS = { w: 120, gap: 4 } as const;
/** The testing cheat's button, on the right just under the build plate, which takes the whole top of a phone. */
const CHEAT_BTN = { w: 64, h: 22, top: 78, margin: 4 } as const;
/** The texture of the hero's face on their sheet (one at a time, redrawn each time the sheet opens). */
const SHEET_FACE = 'town-sheet-face';
/** How long a message stays, and how long it takes to fade, ms. */
const TOAST = { ms: 2600, fade: 500, pad: { x: 8, y: 3 } } as const;

/** What tapping a building in the townscape opens. */
const OPENS: Partial<Record<BuildingId, TownScreen>> = {
  villageHall: 'hall', townHall: 'hall', cityHall: 'hall', capitol: 'hall',
  fort: 'fort', citadel: 'fort', castle: 'fort',
  guardhouse: 'fort', archeryRange: 'fort', griffinTower: 'fort', barracks: 'fort', monastery: 'fort', tiltyard: 'fort', seraphSpire: 'fort',
  guardhouse2: 'fort', archeryRange2: 'fort', griffinTower2: 'fort', barracks2: 'fort', monastery2: 'fort', tiltyard2: 'fort', seraphSpire2: 'fort',
  guardhouse3: 'fort', archeryRange3: 'fort', griffinTower3: 'fort', barracks3: 'fort', monastery3: 'fort', tiltyard3: 'fort', seraphSpire3: 'fort',
  mageGuild1: 'guild', mageGuild2: 'guild', blacksmith: 'smith', tavern: 'tavern', storehouse: 'store', treasury: 'store', marketplace: 'market',
  // The Portal's first level is its shared store; from the second it has a room of its own.
  portal: 'store', portal2: 'portal', portal3: 'portal',
};

/** What a building does, in words (a dwelling names the creature it hires, the town's people's own). */
function saysOf(town: Town, id: BuildingId): string {
  const def = buildingIn(town, id);
  return def.dwelling ? `Hires ${creature(def.dwelling).plural}` : def.says;
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
  private window: TownWindow | GuildRoom | SmithRoom | TavernRoom | StoreRoom | MarketRoom | SellRoom | PortalRoom | null = null;
  /** The piece picked to sell at the Marketplace (its place in forSale). */
  private sellPick: number | null = null;
  /** What the Marketplace has picked to trade (none: its first pick). */
  private marketPick: MarketPick | null = null;
  /** The spell being read in the guild. */
  private guildPick: SpellId | null = null;
  /** The machine being looked at in the Blacksmith. */
  private smithPick: SoldMachine | null = null;
  /** The piece picked in the Storehouse, and a word on a move it refused. */
  private storePick: { ref: StoreRef | null; note: string } = { ref: null, note: '' };
  private plate: BuildPlate | null = null;
  /** The player's towns, a tap away from each other. */
  private towns: TownList | null = null;
  /** On a phone: the button naming the town, which drops the list of towns, and whether it's dropped. */
  private townBtn: PixelButton | null = null;
  private townsOpen = false;
  /** Where the plate (or the top row) ends: the cheat and the narrator go under it. */
  private chromeBottom: number = CHEAT_BTN.top;
  /** Testing cheats only: puts up everything this map allows. */
  private cheatBtn: PixelButton | null = null;
  private soundBtn: PixelButton | null = null;
  private screen: TownScreen | null = null;
  private picked: SlotRef | null = null;
  /** A company's info card, while it's open. */
  private info: { card: { close(): void }; layer: Phaser.GameObjects.Container } | null = null;
  /** The company being split, while its picker is open. */
  private splitter: SplitPicker | null = null;
  /** Whether this visit has said how to see a company's card. */
  private toldInfo = false;
  private fresh: BuildingId | undefined;
  /** How far the stage is panned from centre (a screen narrower than the town), and down from showing its foot (a screen shorter than it). */
  private panX = 0;
  private panY = 0;
  private press: { x: number; y: number; panX: number; panY: number } | null = null;
  private dragged = false;
  private toastParts: { destroy(): void }[] = [];
  private ready = false;
  /** A hero hired here while another stood in the gate: picked once the town is left. */
  /** The town shown: the one the hero stands in, else the player's first. */
  private townId = '';
  /** A hero stepped through a Great Portal to this town: the map centres on them once it's left. */
  private travelled = false;

  constructor() {
    super('Town');
  }

  create(data?: { townId?: string; travelled?: boolean; note?: string }): void {
    getSound(this)?.music('townGreek');
    this.session = Session.get(this);
    const adv = this.session.adv;
    this.townId = data?.townId ?? heroTown(adv)?.id ?? playerTowns(adv)[0]!.id;
    this.travelled = !!data?.travelled;
    this.pickHeroHere();
    this.cameras.main.setBackgroundColor(BACKDROP);
    this.picked = null;
    this.screen = null;
    this.fresh = undefined;
    this.ready = false;
    this.panX = 0;
    this.panY = 0;
    this.view = null;
    this.bar = null;
    this.window = null;
    this.plate = null;
    this.towns = null;
    this.townBtn = null;
    this.townsOpen = false;
    this.chromeBottom = CHEAT_BTN.top;
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
      this.townBtn?.destroy();
      this.cheatBtn?.destroy();
      this.soundBtn?.destroy();
      this.bar?.destroy();
      this.info?.card.close();
      this.closeSplit();
      for (const t of this.toastParts) t.destroy();
    });
    void loadTownArt(this, factionOf(this.town())).then(() => {
      if (!this.sys.isActive()) return;
      this.ready = true;
      this.bar = new TownBar(this, { open: (s) => this.openScreen(s), leave: () => this.leave(), pickSlot: (r) => this.pickSlot(r), canCarry: (r) => this.canPick(r), dropSlot: (from, to) => this.moveCompany(from, to), split: () => this.openSplit(), army: () => this.toggleArmy() }, DEPTH.bar);
      this.drawAll();
      if (data?.note) this.toast(data.note);
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
  /** The heroes in this town's garrison and gate (none in a town not ours). */
  private heroesHere(adv: Adventure = this.session.adv): TownHeroes {
    const town = this.town(adv);
    return town.owner === 'player' ? townHeroes(adv, town) : {};
  }

  private visiting(adv: Adventure = this.session.adv): boolean {
    return !!this.heroesHere(adv).visitor;
  }

  /**
   * The town serves the hero in its gate, else the one in its garrison: that
   * one is picked (hiring, buying and the guild all go to the picked hero).
   */
  private pickHeroHere(): void {
    const adv = this.session.adv;
    const { garrison, visitor } = this.heroesHere(adv);
    const here = visitor ?? (heroTown(adv)?.id === this.townId ? undefined : garrison);
    if (here && here.id !== adv.hero.id) this.session.set(selectHero(adv, here.id));
  }

  /** Whether this map's Taverns have heroes to hire (map 1's don't, so it shows no Tavern button). */
  private hires(): boolean {
    return tavernsHire(this.session.def, this.town());
  }

  /** Whether screen point (`x`, `y`), UI pixels, is on the open townscape (not the strip, the rail or a room). */
  private onTown(x: number, y: number): boolean {
    return !!this.bar && x < this.bar.viewW && y < this.bar.top && !this.screen;
  }

  /**
   * Dragging the townscape pans it when it's wider than the screen, and up or
   * down when it's taller (a phone); so does the mouse wheel or a trackpad.
   */
  private wirePan(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const x = p.x / this.size.k;
      const y = p.y / this.size.k;
      this.press = this.onTown(x, y) ? { x, y, panX: this.panX, panY: this.panY } : null;
      this.dragged = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.press || !p.isDown) return;
      const dx = p.x / this.size.k - this.press.x;
      const dy = p.y / this.size.k - this.press.y;
      if (!this.dragged && Math.hypot(dx, dy) < DRAG) return;
      this.dragged = true;
      this.panX = this.clampPan(this.press.panX + dx);
      this.panY = this.clampPanY(this.press.panY + dy);
      this.placeView();
    });
    this.input.on('pointerup', () => {
      this.press = null;
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _over: unknown, dx: number, dy: number) => {
      if (this.press || !this.onTown(p.x / this.size.k, p.y / this.size.k)) return;
      this.panX = this.clampPan(this.panX - dx / this.size.k);
      this.panY = this.clampPanY(this.panY - dy / this.size.k);
      this.placeView();
    });
  }

  private clampPan(x: number): number {
    const room = Math.max(0, STAGE.w - this.viewW());
    return Math.round(Phaser.Math.Clamp(x, -room / 2, room / 2));
  }

  /** From the stage's foot (0) up to its top, as far as the townscape is shorter than it. */
  private clampPanY(y: number): number {
    const tops = this.view?.tops;
    return tops ? Math.round(Phaser.Math.Clamp(y, 0, tops.max - tops.min)) : 0;
  }

  private placeView(): void {
    if (!this.view) return;
    this.view.setLeft(Math.floor((this.viewW() - STAGE.w) / 2) + this.panX);
    this.view.setTop(this.view.tops.min + this.panY);
  }

  /** The townscape's width: the screen's, or left of the rail on a phone. */
  private viewW(): number {
    return this.bar?.viewW || this.size.w;
  }

  /** The town's layout follows the screen; the townscape is drawn anew unless only the strip's parts changed (`view` false). */
  private drawAll(view = true): void {
    if (!this.bar) return;
    this.bar.layout(this.size.w, this.size.h, this.town(), this.hires(), portalLevel(this.town()) >= 2 && !!(this.heroesHere().visitor ?? this.heroesHere().garrison));
    this.pickHeroHere();
    this.bar.refresh(this.session.adv, this.town(), this.picked, this.heroesHere());
    if (view) this.drawView();
    this.drawSound();
    this.drawTowns();
    this.drawPlate();
    this.drawWindow();
  }

  /** The Army button on a phone's rail: the drawer with the armies opens (over any room, which closes) or closes (letting go of the picked company). */
  private toggleArmy(): void {
    if (!this.bar) return;
    getSound(this)?.play('card');
    this.bar.armyOpen = !this.bar.armyOpen;
    if (this.bar.armyOpen) {
      this.screen = null;
      this.townsOpen = false;
    } else this.picked = null;
    this.drawAll(false);
  }

  /** The cheat's button, while there's something left to build and no window in the way. */
  private drawCheat(): void {
    if (!getHost(this)?.cheats) return;
    this.cheatBtn ??= new PixelButton(this, { w: CHEAT_BTN.w, h: CHEAT_BTN.h, label: 'Build all', rim: 'gold', onClick: () => this.cheatBuildAll() });
    const left = buildAll(this.town(), this.session.def.off) !== this.town();
    this.cheatBtn.root.setDepth(DEPTH.plate).setVisible(left && !this.screen);
    this.cheatBtn.setPosition(this.viewW() - CHEAT_BTN.w - CHEAT_BTN.margin, this.bar?.onRail ? this.chromeBottom + 4 : CHEAT_BTN.top);
  }

  /** Where the narrator's strip goes in town: under the Sound button (on a phone, under the plate and the cheat), clear of the town strip at the foot. */
  narratorRoom(): StripRoom {
    const top = this.bar?.onRail ? this.chromeBottom + 4 : CHEAT_BTN.top;
    return defaultRoom({ w: this.viewW() }, top + CHEAT_BTN.h + 4);
  }

  /** The sound switches' button, level with the cheat's on the other side, while no window is in the way. */
  private drawSound(): void {
    const sound = getSound(this);
    if (!sound) return;
    this.soundBtn ??= new PixelButton(this, { w: SOUND_BTN.w, h: SOUND_BTN.h, label: 'Sound', onClick: () => soundCard(sound, (spec) => openCard(this, spec)) });
    this.soundBtn.root.setDepth(DEPTH.plate).setVisible(!this.screen);
    this.soundBtn.setPosition(SOUND_BTN.margin, this.bar?.onRail ? TOP_ROW.y : CHEAT_BTN.top);
  }

  /**
   * The other towns to go to, with no window in the way; with one town there
   * is nowhere to go. Over the strip's right end, or on a phone dropped from
   * the button naming the town.
   */
  private drawTowns(): void {
    const { adv, def } = this.session;
    const towns = playerTowns(adv);
    const rail = this.bar!.onRail;
    const from = rail ? 'top' : 'bottom';
    if (this.towns && this.towns.from !== from) {
      this.towns.destroy();
      this.towns = null;
    }
    this.towns ??= new TownList(this, TOWNS.w, {
      textureOf: (t) => townTexOf(def, t),
      onOpen: (townId) => this.scene.restart({ townId, travelled: this.travelled }),
    }, from);
    this.bar!.setTowersHidden(!!this.screen);
    this.townBtn?.destroy();
    this.townBtn = null;
    if (!rail) {
      this.towns.set(towns.length > 1 ? towns : [], this.townId);
      this.towns.root.setDepth(DEPTH.plate).setPosition(this.size.w - TOWNS.w - TOWNS.gap, this.bar!.top - TOWNS.gap).setVisible(!this.screen);
      return;
    }
    const x = SOUND_BTN.margin + SOUND_BTN.w + TOP_ROW.gap;
    const many = towns.length > 1;
    // With one town it only names it: there is nowhere else to go.
    this.townBtn = new PixelButton(this, { w: TOWNS.w, h: TOP_ROW.h, label: this.town().name, ...(this.townsOpen ? { rim: 'gold' as const } : {}), onClick: () => many && this.toggleTowns() });
    this.townBtn.root.setDepth(DEPTH.plate).setVisible(!this.screen);
    this.townBtn.setPosition(x, TOP_ROW.y);
    const top = TOP_ROW.y + TOP_ROW.h + TOP_ROW.gap;
    this.towns.set(many ? towns : [], this.townId, Math.floor((this.bar!.viewH - top + 2) / (TOWN_ROW_H + 2)));
    // Over the drawer, should it be open.
    this.towns.root.setDepth(DEPTH.bar + 5).setPosition(x, top).setVisible(this.townsOpen && !this.screen);
  }

  /** On a phone: the list of towns drops from the button naming this one, or folds away. */
  private toggleTowns(): void {
    getSound(this)?.play('card');
    this.townsOpen = !this.townsOpen;
    this.drawTowns();
  }

  /** The suggestion at the top of the town, as things stand; none once the town is finished. */
  private drawPlate(): void {
    this.plate?.destroy();
    this.plate = null;
    const { adv, def } = this.session;
    const town = this.town();
    const id = suggestBuilding(town, adv.purse, def.off);
    const rail = !!this.bar?.onRail;
    // On a phone, the plate takes what's left of the top row (or a row of its own under it).
    const rowX = SOUND_BTN.margin + SOUND_BTN.w + TOP_ROW.gap + TOWNS.w + TOP_ROW.gap;
    const beside = this.viewW() - rowX - TOP_ROW.gap >= TOP_ROW.plateMinW;
    const area = !rail ? this.size : beside ? { x: rowX, y: TOP_ROW.y, w: this.viewW() - rowX - TOP_ROW.gap } : { x: TOP_ROW.gap, y: TOP_ROW.y + TOP_ROW.h + TOP_ROW.gap, w: this.viewW() - TOP_ROW.gap * 2 };
    this.chromeBottom = TOP_ROW.y + TOP_ROW.h;
    // A screen open over the town has its own say (the hall leads with the same building).
    if (!id || this.screen) {
      this.drawCheat();
      return;
    }
    this.plate = new BuildPlate(this, {
      town, id, purse: adv.purse, picture: platePicture(this, id, factionOf(town)), area, slim: rail, depth: DEPTH.plate,
      onBuild: () => {
        if (!this.dragged) this.tryBuild(id);
      },
      onInfo: () => {
        if (!this.dragged) this.buildingCard(id);
      },
    });
    if (rail) this.chromeBottom = this.plate.bottom;
    this.drawCheat();
  }

  private drawView(): void {
    if (!this.bar) return;
    const drift = this.view?.drift;
    this.view?.destroy();
    this.view = new PixelTownView(this, this.town().built, { w: this.bar.viewW, h: this.bar.viewH + 2 }, { faction: factionOf(this.town()), onPick: (id, built) => this.pickBuilding(id, built), fresh: this.fresh, drift, nameOf: (b) => buildingIn(this.town(), b).name });
    this.fresh = undefined;
    this.panX = this.clampPan(this.panX);
    this.panY = this.clampPanY(this.panY);
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
    // Over the town, clear of the strip (or left of a phone's rail), unless that leaves a room too little: then over everything.
    const area = { w: this.bar.viewW, h: this.bar.viewH };
    const covers = area.h < ROOM_MIN_H || (this.bar.onRail && area.w < ROOM_MIN_W);
    const room = covers ? this.size : area;
    const depth = covers ? DEPTH.coveringWindow : DEPTH.window;
    if (this.screen === 'guild') {
      this.window = new GuildRoom(this, adv, this.town(), this.guildPick, room, { close: () => this.openScreen(null), buy: () => this.buyBook(), pick: (id) => this.pickSpell(id) }, depth);
      return;
    }
    if (this.screen === 'tavern') {
      this.window = new TavernRoom(this, adv, this.session.def, this.town(), room, { close: () => this.openScreen(null), hire: (id) => this.hireHero(id) }, depth);
      return;
    }
    if (this.screen === 'store') {
      this.window = new StoreRoom(this, adv, this.townId, this.storePick.ref, this.storePick.note, room, { close: () => this.openScreen(null), tap: (r) => this.tapStore(r), buyBag: (id) => this.buyBag(id) }, depth);
      return;
    }
    if (this.screen === 'market') {
      const pick = this.marketPick ?? firstPick(adv);
      this.window = new MarketRoom(this, adv, this.town(), pick, room, { close: () => this.openScreen(null), pick: (p) => this.pickTrade(p), trade: (p) => this.makeTrade(p), sellGear: () => this.openScreen('sell') }, depth);
      return;
    }
    if (this.screen === 'sell') {
      const act = { close: () => this.openScreen(null), back: () => this.openScreen('market'), pick: (i: number) => this.pickSale(i), sell: (r: Parameters<typeof sellPiece>[2]) => this.sell(r) };
      this.window = new SellRoom(this, adv, this.townId, this.sellPick, room, act, depth);
      return;
    }
    if (this.screen === 'portal') {
      this.window = new PortalRoom(this, adv, this.session.def, this.townId, room, { close: () => this.openScreen(null), fight: () => this.fightMob(), step: (id) => this.stepThrough(id) }, depth);
      return;
    }
    if (this.screen === 'smith') {
      this.window = new SmithRoom(this, adv, this.town(), this.smithPick, soldOn(this.session.def.n), room, { close: () => this.openScreen(null), buy: (m) => this.buyMachine(m), pick: (m) => this.pickWare(m) }, depth);
      return;
    }
    const spec = this.screen === 'hall' ? hallScreen(this, adv, this.town(), this.session.def.off, act) : fortScreen(this, adv, this.town(), act);
    this.window = new TownWindow(this, spec, area, () => this.openScreen(null), DEPTH.window, { area: this.size, depth: DEPTH.coveringWindow });
  }

  private pickSpell(id: SpellId): void {
    if (id === this.guildPick) return;
    this.guildPick = id;
    this.drawWindow();
  }

  /** A tap in the Storehouse: picks a piece, or sends the picked one (see storeTap). */
  private tapStore(r: StoreRef): void {
    const t = storeTap(this.session.adv, this.townId, this.storePick.ref, r);
    this.storePick = { ref: t.picked, note: t.note };
    if (t.moved) this.changed(t.adv, 'card');
    else this.drawWindow();
  }

  private buyBag(heroId: string): void {
    const next = buyBag(this.session.adv, this.townId, heroId);
    if (next) this.changed(next, 'hire');
    else this.toast(cantBuyBag(this.session.adv, this.townId, heroId) ?? 'No bag to buy here');
  }

  /** The game moved on in town: kept, heard, said (`toast`) and shown. */
  private changed(adv: Adventure, sound: 'card' | 'hire', toast?: string): void {
    this.session.set(adv);
    getSound(this)?.play(sound);
    if (toast) this.toast(toast);
    this.refresh();
  }

  private pickSale(i: number): void {
    this.sellPick = i < forSale(this.session.adv, this.townId).length ? i : null;
    this.drawWindow();
  }

  /** A piece sold at the Marketplace: its price in the purse, the next piece picked in its place. */
  private sell(ref: Parameters<typeof sellPiece>[2]): void {
    const next = sellPiece(this.session.adv, this.townId, ref);
    if (!next) {
      this.toast('That piece can’t be sold here');
      return;
    }
    const gold = next.purse.gold - this.session.adv.purse.gold;
    if (this.sellPick !== null && this.sellPick >= forSale(next, this.townId).length) this.sellPick = null;
    this.changed(next, 'card', `+${gold} gold`);
  }

  private pickTrade(p: MarketPick): void {
    this.marketPick = p;
    this.drawWindow();
  }

  /** A trade at the Marketplace: the purse changes, the pick stays for another. */
  private makeTrade(p: MarketPick): void {
    const next = marketTrade(this.session.adv, p.give, p.get, p.lots);
    if (!next) {
      this.toast('That trade can’t be made');
      return;
    }
    this.marketPick = { ...p, lots: 1 };
    this.changed(next, 'card', `+${next.purse[p.get] - this.session.adv.purse[p.get]} ${p.get}`);
  }

  private pickWare(m: SoldMachine): void {
    if (m === this.smithPick) return;
    this.smithPick = m;
    this.drawWindow();
  }

  private openScreen(s: TownScreen | null): void {
    if (s && s !== this.screen) getSound(this)?.play('card');
    if (s !== this.screen) this.storePick = { ref: null, note: '' };
    if (s !== this.screen) this.sellPick = null;
    this.screen = s;
    if (s) this.townsOpen = false;
    // A room opened on a phone closes the army drawer under it.
    if (s && this.bar?.armyOpen) {
      this.bar.armyOpen = false;
      this.picked = null;
      this.drawAll(false);
      return;
    }
    this.drawSound();
    this.drawPlate();
    this.drawTowns();
    this.drawWindow();
  }

  /** The purse, armies and any open screen show the session's latest state. */
  private refresh(): void {
    this.pickHeroHere();
    this.bar?.refresh(this.session.adv, this.town(), this.picked, this.heroesHere());
    this.drawPlate();
    this.drawTowns();
    this.drawWindow();
  }

  private leave(): void {
    this.scene.stop();
    const map = this.scene.get('Map') as MapScene;
    map.back();
    if (this.travelled) map.centreOnHero();
  }

  /** The picked hero fights the Portal's band: the town closes for the battle, and the map follows it. */
  private fightMob(): void {
    const why = cantFightMob(this.session.adv, this.session.def);
    if (why) {
      this.toast(why);
      return;
    }
    this.scene.stop();
    (this.scene.get('Map') as MapScene).startBattle(PORTAL + this.townId);
  }

  /** The picked hero steps through the Great Portal: the other town's screen opens, the hero in its gate (or garrison). */
  private stepThrough(id: string): void {
    const { adv, def } = this.session;
    const next = stepThrough(adv, def, adv.hero.id, id);
    if (!next) {
      this.toast(cantStepThrough(adv, adv.hero.id, id) ?? 'The Portal is closed');
      return;
    }
    this.session.set(next);
    getSound(this)?.play('spell');
    this.scene.restart({ townId: id, travelled: true, note: `${next.hero.name} steps through to ${townById(next, id)!.name}` });
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
    else this.toast(`${buildingIn(this.town(), id).name}: ${saysOf(this.town(), id).toLowerCase()}`);
  }

  private buyMachine(m: SoldMachine): void {
    const adv = this.session.adv;
    const why = cantBuyMachine(adv, m);
    if (why) {
      this.toast(why);
      return;
    }
    this.changed(buyMachine(adv, m), 'hire', `${adv.hero.name} has a ${itemDef(m).name} now`);
  }

  /** The Tavern's hero joins: paid for, in the town's gate, and picked, so the town now serves them. */
  private hireHero(id?: string): void {
    const { adv, def } = this.session;
    const next = hireHero(adv, def, this.townId, id);
    if (!next) {
      this.toast(cantHireHero(adv, def, this.town(adv)) ?? 'No hero can be hired here');
      return;
    }
    this.session.set(next);
    getSound(this)?.play('hire');
    this.screen = null;
    this.picked = null;
    this.drawAll();
    this.toast(`${next.hero.name} joins you in ${this.town(next).name}`);
  }

  /** A building's card from the hall: what it does and costs, and Build when it can be built today. */
  private buildingCard(id: BuildingId): void {
    const adv = this.session.adv;
    const def = buildingIn(this.town(), id);
    const why = cantBuild(this.town(), id, adv.purse, this.session.def.off);
    if (id === 'blacksmith' && why === 'Built') {
      this.openScreen('smith');
      return;
    }
    if (id === 'marketplace' && why === 'Built') {
      this.openScreen('market');
      return;
    }
    const cost = Object.keys(def.cost).length ? `Costs ${describeAmount(def.cost)}.` : 'Costs nothing.';
    const state = !why ? 'The masons are ready.' : why === 'Built' ? 'Built.' : why === 'Not enough resources' ? 'Not enough resources yet.' : why === 'Not on this map' ? 'It opens on a later map of the campaign.' : `${why}.`;
    const buttons: CardButton[] = why ? [{ label: 'Close', kind: 'plain', onClick: () => undefined }] : [{ label: 'Build', onClick: () => this.tryBuild(id) }, { label: 'Not now', kind: 'plain', onClick: () => undefined }];
    const preview = dwellingPreview(id, factionOf(this.town())) ?? undefined;
    // With a picture of what it hires, the card needn't say "Hires ..." as well.
    const perk = def.travel ? { icon: 'speed' as const, text: `+${tilesOf(def.travel)} tiles` } : undefined;
    openCard(this, { title: def.name, body: preview ? `${cost}\n${state}` : `${saysOf(this.town(), id)}.\n${cost}\n${state}`, buttons, preview, perk });
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
    const def = buildingIn(this.town(), id);
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
    this.toast(`${def.name} built: ${saysOf(r.town, id).toLowerCase()}`);
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
    this.changed(withTown({ ...adv, purse: r.purse, hero: toHero ? { ...adv.hero, army: r.army } : adv.hero }, town), 'hire', `Hired ${r.hired.map((h) => `${h.count} ${creature(h.id).plural}`).join(', ')}`);
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
    if (canCompare(s.creature)) buttons.push({ label: 'Compare', note: 'with its earlier levels', onClick: () => this.compareCard(ref, s.creature) });
    const layer = this.add.container(0, 0).setDepth(DEPTH.info);
    const scenery = { atlas: texturePixels(this, PX_TEX.scenery('grass')), art: townScenery(), seed: ref.i + 3 };
    const card = new UnitInfoCard(this, layer, armyUnitInfo(s.creature, s.count), scenery, this.size, () => {
      layer.destroy();
      this.info = null;
    }, buttons);
    this.info = { card, layer };
  }

  /** The unit's levels side by side; closing it returns to the card. */
  private compareCard(ref: SlotRef, id: CreatureId): void {
    const layer = this.add.container(0, 0).setDepth(DEPTH.info);
    const scenery = { atlas: texturePixels(this, PX_TEX.scenery('grass')), art: townScenery(), seed: ref.i + 3 };
    const view = new UnitCompareView(this, layer, id, scenery, this.size, () => {
      layer.destroy();
      this.info = null;
      this.unitCard(ref);
    });
    this.info = { card: view, layer };
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
    this.changed(this.withRows({ ...adv, purse: r.purse }, { [ref.army]: r.army }), 'hire', `${from.count} upgraded to ${creature(r.army[ref.i]!.creature).plural}`);
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
    this.changed(withTown({ ...adv, purse: r.purse, hero }, { ...town, garrison: garrison!, towers: towers! }), 'hire', `${r.upgraded} ${r.upgraded === 1 ? 'unit' : 'units'} upgraded`);
  }

  private buyBook(): void {
    const adv = this.session.adv;
    if (!canAfford(adv.purse, { gold: SPELLBOOK_COST })) {
      this.toast(`A spellbook costs ${SPELLBOOK_COST} gold`);
      return;
    }
    this.session.set(enterTown({ ...adv, purse: pay(adv.purse, { gold: SPELLBOOK_COST }), hero: gainItem(adv.hero, spellbookSold(this.town())).hero }));
    this.refresh();
  }

  /** The hero heading row `row`, if one is here. */
  private heroIn(row: SlotRef['army'], adv: Adventure = this.session.adv): string | undefined {
    const { garrison, visitor } = this.heroesHere(adv);
    return row === 'hero' ? visitor?.id : row === 'garrison' ? garrison?.id : undefined;
  }

  private armyAt(a: SlotRef['army'], adv: Adventure = this.session.adv): Army {
    return a === 'hero' ? this.heroesHere(adv).visitor?.army ?? adv.hero.army : a === 'tower' ? towersOf(this.town(adv)) : this.town(adv).garrison;
  }

  /** `adv` with some of the town's rows replaced. */
  private withRows(adv: Adventure, rows: Partial<Record<SlotRef['army'], Army>>): Adventure {
    const town = this.town(adv);
    const { hero, garrison, tower } = rows;
    const visitor = this.heroesHere(adv).visitor ?? adv.hero;
    return withTown(hero ? withHero(adv, { ...visitor, army: hero }) : adv, { ...town, ...(garrison ? { garrison } : {}), ...(tower ? { towers: tower } : {}) });
  }

  /** Whether there's a company at `ref` the player can take. */
  private canPick(ref: SlotRef): boolean {
    return ref.i !== HEAD && (ref.army !== 'hero' || this.visiting()) && !!this.armyAt(ref.army)[ref.i];
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
      const isHero = ref.i === HEAD && !!this.heroIn(ref.army);
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
      else if (ref.i === HEAD) this.openHeroSheet(this.heroIn(ref.army) ?? this.session.adv.hero.id);
      else this.refresh();
      return;
    }
    this.moveCompany(from, ref);
  }

  /** The hero's sheet (Hero and Gear tabs), as on the map: the second tap on the hero's face opens it. */
  private openHeroSheet(id: string): void {
    const shown = (): Hero => ourHeroes(this.session.adv).find((h) => h.id === id) ?? this.session.adv.hero;
    const art = heroArt('player', id);
    const face = putBuffer(this, drawPortrait(faceOf(this, PX_TEX.hero(art.id, 'idle'), art.art, HERO_SLOT - 4), 'bronze', false, false, HERO_SLOT), SHEET_FACE);
    this.refresh();
    openCard(this, {
      title: shown().name,
      body: '',
      sheet: {
        face,
        hero: shown,
        change: (next) => this.session.set(withHero(this.session.adv, withinMana(next))),
      },
      buttons: [{ label: 'Close', kind: 'plain', onClick: () => this.refresh() }],
    });
  }

  /** The company at `from` onto the slot at `to`: merged with its like, swapped with another. */
  private moveCompany(from: SlotRef, to: SlotRef): void {
    const adv = this.session.adv;
    const town = this.town(adv);
    this.picked = null;
    // A company dropped on a face, or on the visitor's row with no hero there, stays put.
    if (to.i === HEAD || (to.army === 'hero' && !this.visiting(adv))) {
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

  /**
   * The hero heading row `from` moves to the other one, every company with
   * them; with a hero in both places, the two change places.
   */
  private moveHero(from: SlotRef['army']): void {
    const adv = this.session.adv;
    const { garrison, visitor } = this.heroesHere(adv);
    const moving = from === 'hero' ? visitor : garrison;
    if (!moving) {
      this.refresh();
      return;
    }
    const picked = selectHero(adv, moving.id);
    const next = garrison && visitor ? swapTownHeroes(adv, this.townId) : from === 'hero' ? garrisonHero(picked) : leadOut(picked);
    if (!next) this.toast(`No room in the garrison for all of ${moving.name}'s companies`);
    else {
      this.session.set(next);
      getSound(this)?.play('card');
    }
    this.refresh();
  }

  /** A message on a dark plate just above the strip, fading after a while. */
  private toast(text: string): void {
    for (const t of this.toastParts) t.destroy();
    const label = new TextLabel(this, { wrap: Math.min(420, this.viewW() - 40), anchor: { x: 0.5, y: 0 } }).setText(text);
    const pw = label.width + TOAST.pad.x * 2;
    const ph = label.height + TOAST.pad.y * 2 + 2;
    const x = Math.floor((this.viewW() - pw) / 2);
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
