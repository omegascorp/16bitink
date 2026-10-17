import Phaser from 'phaser';
import { ART_RES, BOIL, PAPER, RED } from '../art/palette';
import { roofRows } from '../art/ground';
import { RIDGE_W } from '../art/ridgeArt';
import { SKY_W } from '../art/skyArt';
import { LAMPLIGHTER, OUTPOST_ART } from '../art/lamplighterArt';
import { ridgeRoom, TEX, generateTextures } from '../art/textures';
import { getHost, getProfile, getSound, heldWorld, holdWorld, setProfile } from '../host';
import { buildWorld } from '../level/build';
import { currentPlanet } from '../level/planets';
import type { Arrival, PlanetDef } from '../level/types';
import { designName, findBlueprint, isDesign, learnTaken } from '../logic/designs';
import { tooHard } from '../logic/drill';
import { printerWorks, type Profile } from '../logic/economy';
import { prospectorLook, type Look } from '../logic/gear';
import type { MineItem } from '../logic/items';
import { lampFor } from '../logic/marks';
import { Mine, NO_INPUT, SPORE_AIR, type MineEvent, type MineInput } from '../logic/mine';
import { oreById, ORES } from '../logic/ore';
import { ARRIVAL_BEAT, campVisit, craftVisit, HEART, hasBeat, keptOres, OUTPOST, RAISE, REEF_TRADE, reefVisit, signalBars, visit, withBeat, type CampSays, type CraftSays, type ReefSays, type Says } from '../logic/story';
import { holds } from '../logic/hold';
import { contents } from '../logic/inventory';
import { feed, fuelIn, withBag, type FeedResult, type Fuels, type Gauge, type Suit } from '../logic/suit';
import { BRINE_SET, brineSetFound, currentGoal, MYCEL_SET, wreckOf, type Goal, type Wreck } from '../logic/repairs';
import { landerLookOf } from '../logic/ship';
import { ringDelta, volatileAt } from '../logic/terrain';
import { volatileKeyOf } from '../logic/volatiles';
import { captureWorld, loadWorld, savePieces, saveWorld } from '../logic/worldSave';
import { BeaconView } from './game/beaconView';
import { CampSite } from './game/campSite';
import { CraftSite, ReefSite } from './game/brineSites';
import { BRINE_WATER, WaterView } from './game/waterView';
import { surfaceAt } from '../level/carve';
import { CrashView } from './game/crashView';
import { FaunaView } from './game/faunaView';
import { FlagView } from './game/flagView';
import { FxView } from './game/fxView';
import { GroundView } from './game/groundView';
import { GameInput } from './game/input';
import type { HudScene } from './HudScene';
import { ItemsView } from './game/itemsView';
import { JetGaugeView } from './game/jetGaugeView';
import { LampView } from './game/lampView';
import { MineSounds } from './game/mineSounds';
import { ProspectorView } from './game/prospectorView';
import { Ring } from './game/ring';
import { ThingsView } from './game/thingsView';
import { crispText, DPR, screenSize } from './hidpi';

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** Tiles of ground the view shows top to bottom on a big screen; small screens show a little less. */
const VIEW_TILES = 14;
const ZOOM = { min: 0.75, max: 2 } as const;
/** A beat to see the suit give out before waking at the lander. */
const FAILED_MS = 2600;
/** Seconds of play between saves while anything has changed (banking and finding things save at once). */
const AUTOSAVE_S = 30;
/** How far the camera may roam either way round a wrapping world, px (hours of walking one way). */
const RING_REACH = 1e7;
/** How fast the far sky and the crater ridges scroll against the ground. */
const PARALLAX = { sky: 0.15, ridges: 0.45 } as const;
/** Ms between puffs of smoke from a broken engine. */
const SMOKE_MS = 380;
/** Where the engine bell sits on the lander's drawing, px up from its feet. */
const BELL_Y = 22;
/** Tiles either side of a lost lander that count as reaching it by its beacon. */
const WRECK_REACH = 4;

/** How you came back after the suit gave out, for the note on waking (spec, "Why you wake at the lander"). */
export interface Woke {
  /** Reprinted from the last scan, or (with the printer still broken) dragged back by the suit. */
  readonly how: 'printed' | 'dragged';
  /** A bag was left where you fell. */
  readonly bag: boolean;
}

/**
 * Play on a planet: its whole world, carved from its seed with the save's
 * changes laid back on (spec, "Saving and loading"). Drill, haul ore back,
 * bank it at the lander, go aboard to print. Saves as you go: on banking,
 * on finding something, every so often while anything changed, and when
 * the tab is hidden or closed.
 */
export class GameScene extends Phaser.Scene {
  mine!: Mine;
  planet!: PlanetDef;
  /** The ground as carved, which the save is measured against. */
  private base!: Uint8Array;
  /** Ids of the world's items banked for good. */
  private taken: string[] = [];
  /** Something changed since the last save. */
  private changed = false;
  private savedAt = 0;
  private ring!: Ring;
  private ground!: GroundView;
  private prospector!: ProspectorView;
  private things!: ThingsView;
  private items!: ItemsView;
  private lamp!: LampView;
  private fx!: FxView;
  private keys!: GameInput;
  private lander!: Phaser.GameObjects.Image;
  private sky!: Phaser.GameObjects.TileSprite;
  private ridges!: Phaser.GameObjects.TileSprite;
  private beacon!: BeaconView;
  private bagBeacon!: BeaconView;
  private flag!: FlagView;
  private jetGauge!: JetGaugeView;
  private ship: Look = 0;
  private wreck!: Wreck;
  private iy = 0;
  private ended = false;
  /** The opening card is up: the world waits until it's read. */
  intro = false;
  /** How you came back, if the suit gave out just before this session (the HUD says so once). */
  woke: Woke | null = null;
  /** A Lamplighter is talking (a card is up): the world waits until it's read. */
  talk: Says | null = null;
  /** The Aster lander's card is up (you followed its beacon to it): the world waits until it's read. */
  found = false;
  /** Something's happening at the Aster's camp (a card is up): the world waits until it's read. */
  camp: CampSays | null = null;
  /** The prospector was at the outpost last step: a visit starts on walking up, not every step there. */
  private wasAtOutpost = false;
  /** The receiver's last reading, in bars, for saying stronger or weaker. */
  private lastBars: number | null = null;
  private outpost: Phaser.GameObjects.Image | null = null;
  private lamplighter: Phaser.GameObjects.Image | null = null;
  /** Where a lost lander lies on this world, and its picture (Mycel's Aster lander). */
  private crashAt: { readonly col: number; readonly row: number } | null = null;
  private crash: CrashView | null = null;
  /** Where a lost crew made camp on this world, and its picture (Mycel's Aster camp). */
  private campSite: CampSite | null = null;
  /** The prospector was at the camp last step: a visit starts on walking in, not every step there. */
  private wasAtCamp = false;
  /** Where the local people live under the water, and their picture (Brine's Tidesingers, with the Aster crew in their air bell). */
  private reefSite: ReefSite | null = null;
  /** A lost crew's craft, sunk, raised or mended (Brine's Aster craft). */
  private craftSite: CraftSite | null = null;
  private wasAtReef = false;
  private wasAtCraft = false;
  /** Something's happening at the Tidesingers' reef, or at the Aster craft (a card is up): the world waits until it's read. */
  reef: ReefSays | null = null;
  craft: CraftSays | null = null;
  /** The world's water, painted; none on a dry world. */
  private waterView: WaterView | null = null;
  /** The creatures and the pulse's shots; none on a world with neither (Graphite, unarmed). */
  private fauna: FaunaView | null = null;
  /** Asked for from outside the world (a tapped gauge on the HUD, recall in the inventory), done on the next step. */
  private asked: Partial<Pick<MineInput, 'feed' | 'recall'>> = {};
  private smokeAt = 0;
  private sounds!: MineSounds;

  constructor() {
    super('Game');
  }

  create(data?: { woke?: Woke }): void {
    this.planet = currentPlanet(getProfile(this));
    this.ended = false;
    this.asked = {};
    this.woke = data?.woke ?? null;
    this.talk = null;
    this.found = false;
    this.camp = null;
    this.reef = null;
    this.craft = null;
    this.lastBars = null;
    this.changed = false;
    this.smokeAt = 0;
    const world = this.planet.world;
    const profile = getProfile(this);
    const save = heldWorld(this, world.id) ?? loadWorld(getHost(this).storage, world.id, world.site.width * world.site.height, new Set(world.items.map((it) => it.id)));
    this.taken = [...(save?.taken ?? [])];
    // A part already taken apart has taught its design, whatever an older build failed to record.
    const learnt = learnTaken(getProfile(this), world.items, this.taken);
    if (learnt !== getProfile(this)) setProfile(this, learnt);
    const built = buildWorld(this.planet, profile, save);
    const setup = built.setup;
    this.base = built.base;
    this.mine = new Mine(setup);
    // The Lamplighters' silver stays in the bag at the lander while they wait for it.
    this.mine.keep = keptOres(profile);
    this.savedAt = 0;
    const T = setup.tileSize;
    const t = setup.terrain;
    this.ring = new Ring(t.wrap ? t.width * T : Infinity);
    const worldH = t.height * T;
    const skyH = setup.lander.row * T;
    const style = this.planet.style;
    crispText(this);
    const look = prospectorLook(setup.loadout, setup.armed);
    this.ship = landerLookOf(profile.ship);
    this.wreck = wreckOf(profile);
    this.intro = this.introDue(profile);
    const id = this.planet.world.id;
    generateTextures(this, id, style, skyH, look, this.ship, this.wreck);
    this.cameras.main.setBackgroundColor(PAPER);
    // Far sky and crater rims scroll slower than the ground, so they read as far off; both tile round the world.
    this.sky = this.add.tileSprite(0, 0, SKY_W, this.textures.get(TEX.sky(id, skyH)).getSourceImage().height, TEX.sky(id, skyH)).setOrigin(0).setScrollFactor(PARALLAX.sky, 1).setDepth(0);
    this.ridges = this.add.tileSprite(0, skyH * 0.5 + T * 0.5 - ridgeRoom(skyH), RIDGE_W, this.textures.get(TEX.ridges(id, skyH)).getSourceImage().height, TEX.ridges(id, skyH)).setOrigin(0).setScrollFactor(PARALLAX.ridges, 1).setDepth(0.5);
    // The ground's roof is taken from the carved ground, so a shaft dug in an earlier session still reads as inside the planet.
    const roof = roofRows({ ...t, tiles: built.base });
    this.ground = new GroundView(this, t, T, style, (g) => tooHard(setup.drill, g), roof);
    this.lander = this.add.image((setup.lander.col + 0.5) * T, setup.lander.row * T, TEX.lander(this.ship, 0, this.wreck)).setOrigin(0.5, 1).setScale(1 / ART_RES).setDepth(2);
    this.placeOutpost(setup.outpost, T);
    this.crashAt = world.crash === undefined ? null : { col: world.crash, row: world.site.surface };
    this.crash = this.crashAt ? new CrashView(this, this.crashAt, T) : null;
    this.campSite = world.camp ? new CampSite(this, { col: world.camp.at[0], row: world.site.surface + world.camp.at[1] }, T) : null;
    const bell = world.site.bells?.[0];
    const bellAt = bell ? { col: bell.at[0], row: world.site.surface + bell.at[1] + Math.ceil(bell.h / 2) - 1 } : null;
    this.reefSite = world.reef ? new ReefSite(this, { col: world.reef.at[0], row: world.site.surface + world.reef.at[1] }, T, bellAt) : null;
    const seaRow = world.site.surface + (world.site.sea?.level ?? 0);
    this.craftSite = world.craft === undefined ? null : new CraftSite(this, { col: world.craft, row: surfaceAt(world.site, world.craft) }, T, seaRow);
    this.waterView = this.mine.water ? new WaterView(this, this.mine.water, t, T, BRINE_WATER) : null;
    this.fauna = this.mine.fauna.creatures.length || this.mine.fauna.armed ? new FaunaView(this, T) : null;
    this.things = new ThingsView(this, T);
    this.items = new ItemsView(this, T);
    this.prospector = new ProspectorView(this, look);
    this.fx = new FxView(this, T, look.jetpack);
    this.lamp = new LampView(this, lampFor(profile.gear.helmet), T);
    this.flag = new FlagView(this, T);
    this.jetGauge = new JetGaugeView(this);
    this.beacon = new BeaconView(this);
    this.bagBeacon = new BeaconView(this, RED);
    this.keys = new GameInput(this);
    this.sounds = new MineSounds(this, getSound(this), this.mine);
    const cam = this.cameras.main;
    if (t.wrap) cam.setBounds(-RING_REACH, 0, RING_REACH * 2, worldH);
    else cam.setBounds(0, 0, t.width * T, worldH);
    this.wasAtOutpost = this.mine.atOutpost;
    this.wasAtCamp = this.atCamp();
    this.wasAtReef = !!this.reefSite?.holds(this.mine);
    this.wasAtCraft = !!this.craftSite?.near(this.mine);
    const p = this.mine.player;
    this.ring.centre = p.x + p.w / 2;
    this.prospector.update(this.mine, 0, 0, this.ring);
    cam.startFollow(this.prospector.object, true, 0.14, 0.14);
    cam.centerOn(this.prospector.object.x, this.prospector.object.y);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    // Leaving the page (or hiding it, which on a phone may be the last chance) saves.
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') this.save();
    };
    const onLeave = (): void => this.save();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onLeave);
    const unhook = (): void => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onLeave);
    };
    // The host exiting destroys the game without shutting scenes down: unhook, and a last save while the scene still has its registry.
    // Only while it's in play: a scene already shut down (the player aboard) holds a stale cargo that mustn't overwrite the printer's.
    const onDestroy = (): void => {
      unhook();
      try {
        this.save();
      } catch (err) {
        console.warn('[inkmine] could not save on exit', err);
      }
    };
    this.events.once(Phaser.Scenes.Events.DESTROY, onDestroy);
    this.events.on(Phaser.Scenes.Events.RESUME, this.fromSuit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unhook();
      this.events.off(Phaser.Scenes.Events.RESUME, this.fromSuit, this);
      this.events.off(Phaser.Scenes.Events.DESTROY, onDestroy);
      this.scale.off('resize', this.fitZoom, this);
      this.ground.destroy();
      this.scene.stop('Hud');
    });
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');
    this.scene.launch('Hud');
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const still = this.ended || this.intro || this.talk !== null || this.found || this.camp !== null || this.reef !== null || this.craft !== null;
    // Keys are read every frame, so one pressed while the world waits doesn't fire when it starts again.
    const hud = this.scene.get('Hud') as HudScene | null;
    const touch = hud?.touch && this.scene.isActive('Hud') ? hud.touch.read() : undefined;
    const keys = this.keys.read(touch);
    const menu = this.keys.menu(touch);
    const input = still ? NO_INPUT : { ...keys, ...this.asked };
    if (!still) this.asked = {};
    this.iy = input.iy;
    if (!still && menu) {
      if (this.mine.atLander) this.goAboard();
      else this.openSuit();
      return;
    }
    for (const e of this.mine.step(still ? 0 : dt, input)) this.react(e);
    const atOutpost = this.mine.atOutpost;
    if (atOutpost && !this.wasAtOutpost && !still) this.converse();
    this.wasAtOutpost = atOutpost;
    if (!still) this.reachWreck();
    const atCamp = this.atCamp();
    if (atCamp && !this.wasAtCamp && !still) this.visitCamp();
    this.wasAtCamp = atCamp;
    const atReef = !!this.reefSite?.holds(this.mine);
    if (atReef && !this.wasAtReef && !still) this.visitReef();
    this.wasAtReef = atReef;
    const atCraft = !!this.craftSite?.near(this.mine);
    if (atCraft && !this.wasAtCraft && !still) this.visitCraft();
    this.wasAtCraft = atCraft;
    if (!still) this.listen();
    this.sounds.listen(this.mine, still);
    const cam = this.cameras.main;
    this.ring.centre = cam.midPoint.x;
    this.ground.update(cam.worldView);
    this.prospector.update(this.mine, this.iy, time, this.ring);
    this.things.update(this.mine, time, this.ring);
    this.items.update(this.mine, time, this.ring);
    this.fx.update(this.mine, this.ring);
    this.fx.jet(this.mine, this.ring);
    this.lamp.update(this.mine, cam.worldView, this.ring);
    this.lander.setTexture(TEX.lander(this.ship, Math.floor(time / 125) % BOIL, this.wreck)).setX(this.ring.near((this.mine.landerBox.x + this.mine.landerBox.w / 2)));
    this.drawOutpost(time);
    this.crash?.update(this.ring, time);
    this.campSite?.update(this.ring, time, hasBeat(getProfile(this), 'asterWoken'));
    const prof = getProfile(this);
    this.reefSite?.update(this.ring, time, hasBeat(prof, 'crewMet'));
    this.craftSite?.update(this.ring, time, hasBeat(prof, 'craftMended') ? 'mended' : hasBeat(prof, 'craftRaised') ? 'raised' : 'sunk');
    this.waterView?.update(cam.worldView, this.ring, time);
    this.fauna?.update(this.mine, time, this.ring);
    this.beacon.update(this.mine, this.ring, this.beaconTarget(), 'beacon', time);
    const d = this.mine.dropped;
    this.bagBeacon.update(this.mine, this.ring, d ? { x: (d.col + 0.5) * this.mine.tile, y: (d.row + 0.5) * this.mine.tile } : null, 'your bag', time);
    this.flag.update(this.mine, time, this.ring);
    this.jetGauge.update(this.mine, this.ring);
    if (this.wreck.thrusters && time > this.smokeAt) this.smoke(time);
    this.followSky();
    if (this.changed && this.mine.time - this.savedAt > AUTOSAVE_S) this.save();
  }

  /** The profile with the cargo and the bag as they are this moment (they live in the sim while playing). */
  liveProfile(): Profile {
    return { ...getProfile(this), cargo: this.mine.cargo, suit: this.mine.suit.bag, stores: this.mine.stores };
  }

  /** The one thing to do next, for the HUD. */
  goal(): Goal {
    return currentGoal(this.liveProfile());
  }

  /** A gauge tapped on the HUD: feed it from the bag on the next step. */
  feedGauge(g: Gauge): void {
    if (!this.ended && !this.intro) this.asked = { ...this.asked, feed: g };
  }

  /** The suit as it stands, with the bag as the inventory has it, and what feeds its gauges: for the inventory's life-support panel. */
  suitState(): { suit: Suit; fuels: Fuels } {
    return { suit: withBag(this.mine.suit, getProfile(this).suit), fuels: this.mine.fuels };
  }

  /** A Feed button in the inventory (the world waits behind it): one piece from the bag into the gauge, now, and the bag saved as it's left. */
  feedNow(g: Gauge): FeedResult {
    const suit = withBag(this.mine.suit, getProfile(this).suit);
    const r = feed(suit, g, fuelIn(suit.bag, this.mine.fuels, g) ?? this.mine.fuels[g][0]!);
    if (r.ok) {
      this.mine.suit = r.suit;
      setProfile(this, { ...getProfile(this), suit: r.suit.bag });
    }
    return r;
  }

  /** Recall, from the inventory: the winch hauls you up on the next step. */
  recall(): void {
    if (this.ended || this.intro) return;
    this.asked = { ...this.asked, recall: true };
  }

  /** Whether the opening card (Graphite) or a world's first-landing card is still to be read. */
  private introDue(p: Profile): boolean {
    if (p.at === 'graphite') return !p.started;
    const beat = ARRIVAL_BEAT[p.at];
    return !!beat && !!this.planet.arrival && !hasBeat(p, beat);
  }

  /** The card to open on: Graphite's opening (null: the HUD's own), or this world's first landing. */
  introCard(): { readonly title: string; readonly arrival: Arrival } | null {
    const a = this.planet.arrival;
    return this.planet.world.id === 'graphite' || !a ? null : { title: this.planet.name, arrival: a };
  }

  /** Closes the opening card: the world starts, and it's never shown again. */
  closeIntro(): void {
    if (!this.intro) return;
    this.intro = false;
    this.keys.forget();
    const p = this.liveProfile();
    const beat = ARRIVAL_BEAT[p.at];
    setProfile(this, p.at === 'graphite' || !beat ? { ...p, started: true } : withBeat(p, beat));
  }

  /** The receiver's reading in bars while following a call (null otherwise), for the HUD. */
  signal(): number | null {
    const from = this.callFrom();
    if (from === null) return null;
    // The Tidesingers' song is sound, not radio: the suit hears it only with the helmet under water.
    if (this.listeningFor() === 'song' && this.mine.headDepth === 0) return 0;
    const p = this.mine.player;
    const tiles = Math.abs(ringDelta(this.mine.terrain, p.x + p.w / 2, from, this.mine.tile)) / this.mine.tile;
    return signalBars(tiles);
  }

  /** Where the call being followed comes from, px along the ground: the Lamplighters' outpost, or a lost lander's beacon. Null while none is. */
  private callFrom(): number | null {
    const g = this.goal().kind;
    const o = this.mine.outpostBox;
    if (g === 'signal' && o) return o.x + o.w / 2;
    if (g === 'distress' && this.crashAt) return (this.crashAt.col + 0.5) * this.mine.tile;
    if (g === 'trail' && this.campSite) return this.campSite.x;
    if (g === 'song' && this.reefSite) return this.reefSite.x;
    return null;
  }

  /** What the signal plate is reading: the receiver (radio), or the suit hearing a song through the water. */
  listeningFor(): 'receiver' | 'song' {
    return this.goal().kind === 'song' ? 'song' : 'receiver';
  }

  /** Walking up to the Aster lander by its beacon, on the ground beside it: its card shows what's left, and its log. */
  private reachWreck(): void {
    const c = this.crashAt;
    if (!c || this.goal().kind !== 'distress') return;
    const p = this.mine.player;
    const T = this.mine.tile;
    const near = Math.abs(ringDelta(this.mine.terrain, p.x + p.w / 2, (c.col + 0.5) * T, T)) / T <= WRECK_REACH;
    if (near && p.y + p.h <= (c.row + 2) * T) this.found = true;
  }

  /** The Aster lander's card was read: saved as found, and the search for its crew's gear begins. */
  closeFound(): void {
    if (!this.found) return;
    this.found = false;
    this.keys.forget();
    setProfile(this, withBeat(this.liveProfile(), 'asterFound'));
    this.save();
  }

  /** In at the Aster's camp, once their trail is what you're following (it's dug into, so it's found by walking in). */
  private atCamp(): boolean {
    const g = this.goal().kind;
    return !!this.campSite && (g === 'trail' || g === 'wake' || g === 'brine') && this.campSite.holds(this.mine);
  }

  /**
   * Walking into the Aster's camp: found the first time, the pod taking its
   * charge from the bag once it's all there, the sleeper awake after (story.ts).
   * A card shows it; the world waits until it's read. Saved at once.
   */
  private visitCamp(): void {
    const v = campVisit(this.liveProfile(), this.mine.suit.bag);
    this.mine.suit = withBag(this.mine.suit, v.bag);
    setProfile(this, { ...v.profile, suit: v.bag, cargo: this.mine.cargo });
    this.mine.keep = keptOres(v.profile);
    this.save();
    if (v.says === 'awake') {
      const p = this.mine.player;
      this.fx.note(this.ring.near(p.x + p.w / 2), p.y - 32, 'its crown flashes at you');
      return;
    }
    this.camp = v.says;
  }

  /** A camp card was read. Finding it, with the charge already in the bag, the pod takes it at once. */
  closeCamp(): void {
    const was = this.camp;
    this.camp = null;
    this.keys.forget();
    if (was === 'camp' && this.goal().kind === 'wake' && campVisit(this.liveProfile(), this.mine.suit.bag).says === 'woken') this.visitCamp();
  }

  /**
   * Swimming in to the Tidesingers' reef: they meet you the first time,
   * wait for their copper, take it and let you in to the Aster crew, and
   * later take the crew's hull patch and float the craft up (story.ts).
   * A card shows it; the world waits until it's read. Saved at once.
   */
  private visitReef(): void {
    const v = reefVisit(this.liveProfile(), this.mine.suit.bag, brineSetFound);
    this.mine.suit = withBag(this.mine.suit, v.bag);
    setProfile(this, { ...v.profile, suit: v.bag, cargo: this.mine.cargo });
    this.mine.keep = keptOres(v.profile);
    this.save();
    if (v.says === 'wait') {
      const p = this.mine.player;
      this.fx.note(this.ring.near(p.x + p.w / 2), p.y - 32, hasBeat(v.profile, 'crewMet') ? 'the crew flash their crowns at you' : 'they sing, low and long');
      return;
    }
    this.reef = v.says;
  }

  /** A reef card was read. Paying shows the crew next; meeting them with the copper already in the bag, they take it at once. */
  closeReef(): void {
    const was = this.reef;
    this.reef = null;
    this.keys.forget();
    if (was === 'paid') {
      this.reef = 'crew';
      return;
    }
    if (was === 'meet' && this.goal().kind === 'reefTrade' && reefVisit(this.liveProfile(), this.mine.suit.bag, brineSetFound).says === 'paid') this.visitReef();
  }

  /** Swimming up to the Aster craft: found the first time; once it's up, it takes its new heart from the bag. */
  private visitCraft(): void {
    const v = craftVisit(this.liveProfile(), this.mine.suit.bag);
    if (!v.says) return;
    this.mine.suit = withBag(this.mine.suit, v.bag);
    setProfile(this, { ...v.profile, suit: v.bag, cargo: this.mine.cargo });
    this.mine.keep = keptOres(v.profile);
    this.save();
    this.craft = v.says;
  }

  closeCraft(): void {
    this.craft = null;
    this.keys.forget();
  }

  /** The receiver crackling stronger or weaker as you walk: hot and cold, never a direction. */
  private listen(): void {
    const bars = this.signal();
    if (bars !== null && this.lastBars !== null && bars !== this.lastBars) {
      const p = this.mine.player;
      this.fx.note(this.ring.near(p.x + p.w / 2), p.y - 32, bars > this.lastBars ? 'signal stronger' : 'signal weaker', bars < this.lastBars);
    }
    this.lastBars = bars;
  }

  /**
   * Walking up to the Lamplighters: they meet you, wait for their silver,
   * take it from the bag, or hand over the core (story.ts). A card shows
   * what they say; the world waits until it's read. Saved at once.
   */
  private converse(): void {
    const v = visit(this.liveProfile(), this.mine.suit.bag);
    if (!v.says) return;
    this.mine.suit = withBag(this.mine.suit, v.bag);
    setProfile(this, { ...v.profile, suit: v.bag, cargo: this.mine.cargo });
    this.mine.keep = keptOres(v.profile);
    this.save();
    if (v.says === 'thanks') {
      const p = this.mine.player;
      this.fx.note(this.ring.near(p.x + p.w / 2), p.y - 32, 'they raise their lanterns');
      return;
    }
    this.talk = v.says;
  }

  /** The talk card was read: the world goes on (the key that closed it isn't a press here). */
  closeTalk(): void {
    this.talk = null;
    this.keys.forget();
  }

  /** The outpost's domes east of where a Lamplighter stands to meet you, on the far rim. */
  private placeOutpost(at: { col: number; row: number } | undefined, T: number): void {
    this.outpost = null;
    this.lamplighter = null;
    if (!at) return;
    const O = OUTPOST_ART;
    const L = LAMPLIGHTER;
    this.outpost = this.add.image(0, at.row * T, TEX.outpost(0)).setOrigin(0.5, (O.h - 2) / O.h).setScale(1 / ART_RES).setDepth(1.8);
    this.lamplighter = this.add.image(0, at.row * T, TEX.lamplighter(0)).setOrigin(0.62, (L.h - 2) / L.h).setScale(1 / (ART_RES * 1.5)).setDepth(2.1);
  }

  /** The outpost and the Lamplighter drawn near the camera, their lines boiling. */
  private drawOutpost(time: number): void {
    const o = this.mine.outpostBox;
    if (!o || !this.outpost || !this.lamplighter) return;
    const f = Math.floor(time / 160) % BOIL;
    const x = o.x + o.w / 2;
    this.lamplighter.setTexture(TEX.lamplighter(f)).setX(this.ring.near(x));
    this.outpost.setTexture(TEX.outpost(f)).setX(this.ring.near(x + OUTPOST.domes * this.mine.tile));
  }

  /**
   * An old part studied and taken apart: a design you didn't have is learnt
   * on the spot (no need to carry it home: the suit records it), a known one
   * teaches nothing; either way its materials spill out. It's gone for good.
   */
  private salvaged(item: MineItem, px: number, py: number): void {
    const id = item.blueprint ?? '';
    const p = getProfile(this);
    const name = designName(id) ?? 'part';
    const learnt = isDesign(id) && !p.found.includes(id);
    if (learnt) setProfile(this, findBlueprint(p, id));
    // Above the "+ ore" notes its salvage brings, which rise from just over the prospector.
    this.fx.note(px, py - 62, learnt ? `${name} design learnt!` : `${name}: nothing new`);
    this.fx.note(px, py - 40, 'taken apart for parts');
    this.taken = [...this.taken, item.id];
    this.save();
  }

  /**
   * Where the beacon points: the nearest broken part with the design a
   * 'find' goal is after, or (studying Mycel's set) the nearest whose design
   * isn't learnt yet, while it's still in the world; the outpost once they
   * have your silver and the core is waiting.
   */
  private beaconTarget(): { x: number; y: number } | null {
    const g = this.goal();
    const o = this.mine.outpostBox;
    // Not while you're after their silver: it's deep down, not at the outpost. Once it's paid, it points the way back for the core.
    if (o && g.kind === 'collect') return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
    if (g.kind === 'find') return this.nearestPart((bp) => bp === g.blueprint);
    // The camp once found; while following the trail, only when the receiver says it's right here (it's underground).
    if (this.campSite && (g.kind === 'wake' || (g.kind === 'trail' && this.signal() === 5))) return this.campSite.point;
    if (g.kind === 'explore') {
      const found = getProfile(this).found;
      const set = g.mk === 3 ? BRINE_SET : MYCEL_SET;
      return this.nearestPart((bp) => set.includes(bp) && !found.includes(bp));
    }
    // On Brine: the craft the telescope saw, and back to the reef or the craft once the bag holds what they wait for.
    const bag = contents(this.mine.suit.bag);
    if (this.craftSite && (g.kind === 'craft' || (g.kind === 'heart' && holds(bag, HEART)))) return this.craftSite.point;
    if (this.reefSite && ((g.kind === 'reefTrade' && holds(bag, REEF_TRADE)) || (g.kind === 'raise' && holds(bag, RAISE)))) return this.reefSite.point;
    return null;
  }

  /** The nearest broken part still in the world whose blueprint `wanted` picks, the short way round. */
  private nearestPart(wanted: (blueprint: string) => boolean): { x: number; y: number } | null {
    const p = this.mine.player;
    const T = this.mine.tile;
    const away = (i: MineItem): number => Math.hypot(ringDelta(this.mine.terrain, p.x + p.w / 2, i.x + i.w / 2, T), i.y - p.y);
    const parts = this.mine.items.filter((i) => (i.state === 'rock' || i.state === 'loose') && wanted(i.blueprint ?? ''));
    const it = parts.sort((a, b) => away(a) - away(b))[0];
    return it ? { x: it.x + it.w / 2, y: it.y + it.h / 2 } : null;
  }

  /** A puff of smoke from the broken engine, inked, rising and fading. */
  private smoke(now: number): void {
    this.smokeAt = now + SMOKE_MS * (0.7 + Math.random() * 0.6);
    const x = this.lander.x + (Math.random() - 0.5) * 10;
    const y = this.lander.y - BELL_Y;
    const puff = this.add.circle(x, y, 3 + Math.random() * 2, 0x8a8790, 0.18).setStrokeStyle(0.9, 0x2b2f45, 0.5).setDepth(1.9);
    this.tweens.add({ targets: puff, y: y - 40 - Math.random() * 20, x: x + (Math.random() - 0.3) * 14, scale: 2.6, alpha: 0, duration: 1800, ease: 'Sine.easeOut', onComplete: () => puff.destroy() });
  }

  /**
   * Saves the profile (the cargo and the bag as they are) and the world's
   * changes. The world is held in memory too, so it survives going aboard
   * even when storage won't take it; a failed write is tried again later.
   */
  save(): void {
    if (!this.mine) return;
    const world = this.planet.world;
    setProfile(this, this.liveProfile());
    const changes = captureWorld(this.base, this.mine.terrain, this.mine.ladders, world.version, this.taken, this.mine.dropped, savePieces(this.mine.terrain, this.mine.pieces, this.mine.tile), this.mine.water?.settledWet());
    holdWorld(this, world.id, changes);
    this.changed = !saveWorld(getHost(this).storage, world.id, changes);
    this.savedAt = this.mine.time;
  }

  private react(e: MineEvent): void {
    this.sounds.react(e, this.mine);
    const p = this.mine.player;
    const px = this.ring.near(p.x + p.w / 2);
    const over = (text: string, danger = false): void => this.fx.note(px, p.y - 10, text, danger);
    switch (e.kind) {
      case 'tiles':
        this.ground.invalidate(e.tiles);
        this.changed = true;
        break;
      case 'blast':
        this.fx.blast(e.blast, this.ring);
        break;
      case 'tooHard':
        over('too hard!', true);
        break;
      case 'flat':
        over(`cell flat: feed it ${ORES[this.mine.fuels.cell[0]!].name} in the inventory (L)`, true);
        break;
      case 'bagFull':
        over('bag full', true);
        break;
      case 'ore':
        over(`+ ${oreById(e.ore)?.name ?? 'ore'}`);
        this.changed = true;
        break;
      case 'item':
        over(`+ the ${e.item.kind === 'core' ? 'core sample' : e.item.kind}`);
        break;
      case 'bankItem':
        this.fx.note(px, p.y - 32, `${e.item.kind === 'core' ? 'core sample' : e.item.kind} stowed`);
        this.taken = [...this.taken, e.item.id];
        this.save();
        break;
      case 'salvage':
        this.salvaged(e.item, px, p.y);
        break;
      case 'bank':
        over(`${e.pieces} into the cargo`);
        this.save();
        break;
      case 'cargoFull':
        this.fx.note(px, p.y - 32, 'cargo hold full!', true);
        break;
      case 'restock':
        over('suit topped up');
        break;
      case 'storesShort':
        this.fx.note(px, p.y - 32, `the lander's ${e.short.map((k) => (k === 'air' ? 'air tank' : 'battery')).join(' and ')} ran short: refill aboard`, true);
        break;
      case 'fed':
        over(`${e.gauge === 'air' ? 'air' : 'cell'} + ${ORES[e.ore].name}`);
        this.changed = true;
        break;
      case 'cantFeed':
        over(e.why === 'full' ? `${e.gauge === 'air' ? 'life support' : 'the cell'} is full` : `no ${ORES[e.ore].name} in the bag`, true);
        break;
      case 'airLow':
        this.fx.note(px, p.y - 32, `air low: feed it ${ORES[this.mine.fuels.air[0]!].name} in the inventory (L)`, true);
        break;
      case 'airOut':
        this.fx.note(px, p.y - 32, 'out of air!', true);
        break;
      case 'shielded':
        this.cameras.main.flash(140, 120, 150, 215);
        over('shield!');
        break;
      case 'bagBack':
        over(`bag back: ${e.pieces}`);
        this.changed = true;
        break;
      case 'noFuel':
        over('out of fuel', true);
        break;
      case 'recall':
        over(e.left ? `winched up; ${e.left} left under the flag` : 'winched up');
        this.changed = true;
        break;
      case 'hurt':
        this.cameras.main.flash(160, 179, 50, 43);
        if (e.cause === 'air') over("can't breathe!", true);
        break;
      case 'failed':
        this.giveOut(e.dropped > 0);
        break;
      case 'lit': {
        const kind = volatileKeyOf(volatileAt(this.mine.terrain, e.tile[0], e.tile[1]));
        this.fx.note(this.ring.near((e.tile[0] + 0.5) * this.mine.tile), e.tile[1] * this.mine.tile - 6, kind === 'firedamp' ? 'firedamp! get clear' : 'charge armed! get clear', true);
        break;
      }
      case 'spores':
        this.fx.note(this.ring.near((e.tile[0] + 0.5) * this.mine.tile), e.tile[1] * this.mine.tile - 6, `spores! air − ${SPORE_AIR}`, true);
        break;
      case 'flood':
        if (e.near) {
          this.cameras.main.shake(260, 0.0025);
          this.fx.note(px, p.y - 32, e.sea ? 'the sea is coming in!' : 'water! it’s pouring in', true);
        }
        break;
      case 'deep':
        this.fx.note(px, p.y - 32, `deep water: air ×${e.rate.toFixed(1)}`, true);
        break;
      case 'water':
        this.changed = true;
        break;
      case 'splash':
      case 'drilled':
      case 'bounce':
        break;
    }
  }

  /**
   * The suit gave out: the bag stays where you fell under its flag (the
   * sim has put it there), the cargo and the world's changes are kept, and
   * the prospector wakes at the lander: reprinted from the printer's last
   * scan, or, before the printer is mended, dragged back by the suit.
   */
  private giveOut(bag: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.save();
    const woke: Woke = { how: printerWorks(getProfile(this)) ? 'printed' : 'dragged', bag };
    this.cameras.main.fade(FAILED_MS, 245, 240, 225);
    this.time.delayedCall(FAILED_MS, () => this.scene.restart({ woke }));
  }

  /**
   * Far from the lander: the same page, opened over the paused world (it's
   * the pause menu too, with recall on it). The suit bag can be sorted and
   * locked there; the cargo and the lander can only be looked at, and
   * nothing prints without the lander's printer.
   * The page closes back into the world just where it was (see `fromSuit`).
   */
  private openSuit(): void {
    this.save();
    this.scene.sleep('Hud');
    this.scene.launch('Ship', { remote: true });
    this.scene.pause();
  }

  /** Back from the suit page: take the bag as it was left there, and drop any key pressed meanwhile. */
  private fromSuit(): void {
    this.mine.suit = withBag(this.mine.suit, getProfile(this).suit);
    this.keys.forget();
    this.scene.wake('Hud');
  }

  /** Into the lander: save, and open the ship's page (printing, the cargo). Back down starts from the lander. */
  private goAboard(): void {
    this.ended = true;
    this.save();
    this.scene.stop('Hud');
    // Data passed every time: a scene started without any keeps its last (here, the far-away inventory's `remote`).
    this.scene.start('Ship', { remote: false });
  }

  /**
   * Keeps the sky layers over the view: each is a strip as wide as the view,
   * moved along with the camera, its texture slid so it stays anchored to
   * where it would be as one endless picture.
   */
  private followSky(): void {
    const cam = this.cameras.main;
    const view = cam.worldView;
    for (const [layer, k] of [[this.sky, PARALLAX.sky], [this.ridges, PARALLAX.ridges]] as const) {
      // A layer scrolling at k sits, in its own coordinates, at the view's left edge less what it hasn't scrolled.
      const x = view.x - cam.scrollX * (1 - k) - 8;
      layer.setX(x);
      layer.tilePositionX = x;
    }
  }

  /** Zoom so the view shows about VIEW_TILES of ground top to bottom; the sky strips are sized to cover it. */
  private fitZoom(): void {
    const { height } = screenSize(this);
    const cam = this.cameras.main;
    const css = Phaser.Math.Clamp(height / (VIEW_TILES * this.mine.tile), ZOOM.min, ZOOM.max);
    cam.setZoom(css * DPR);
    const w = cam.width / cam.zoom + 16;
    this.sky.setSize(w, this.sky.height);
    this.ridges.setSize(w, this.ridges.height);
  }
}
