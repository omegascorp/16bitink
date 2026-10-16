import Phaser from 'phaser';
import { ART_RES, BOIL, PAPER, RED } from '../art/palette';
import { roofRows } from '../art/ground';
import { RIDGE_W } from '../art/ridgeArt';
import { SKY_W } from '../art/skyArt';
import { TEX, generateTextures } from '../art/textures';
import { getHost, getProfile, heldWorld, holdWorld, setProfile } from '../host';
import { buildWorld } from '../level/build';
import { currentPlanet } from '../level/planets';
import type { PlanetDef } from '../level/types';
import { tooHard } from '../logic/drill';
import { findBlueprint, printerWorks, type Profile } from '../logic/economy';
import { prospectorLook, type Look } from '../logic/gear';
import { lampFor } from '../logic/marks';
import { Mine, NO_INPUT, type MineEvent, type MineInput } from '../logic/mine';
import { oreById, ORES } from '../logic/ore';
import type { Gauge } from '../logic/suit';
import { currentGoal, wreckOf, type Goal, type Wreck } from '../logic/repairs';
import { landerLookOf } from '../logic/ship';
import { volatileAt } from '../logic/terrain';
import { volatileKeyOf } from '../logic/volatiles';
import { captureWorld, loadWorld, saveWorld } from '../logic/worldSave';
import { BeaconView } from './game/beaconView';
import { FlagView } from './game/flagView';
import { FxView } from './game/fxView';
import { GroundView } from './game/groundView';
import { GameInput } from './game/input';
import { ItemsView } from './game/itemsView';
import { JetGaugeView } from './game/jetGaugeView';
import { LampView } from './game/lampView';
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
  /** The pause card is up: the world waits. */
  paused = false;
  /** How you came back, if the suit gave out just before this session (the HUD says so once). */
  woke: Woke | null = null;
  /** Asked for from the HUD (a tapped gauge, recall on the pause card), done on the next step. */
  private asked: Partial<Pick<MineInput, 'feed' | 'recall'>> = {};
  private smokeAt = 0;

  constructor() {
    super('Game');
  }

  create(data?: { woke?: Woke }): void {
    this.planet = currentPlanet();
    this.ended = false;
    this.paused = false;
    this.asked = {};
    this.woke = data?.woke ?? null;
    this.changed = false;
    this.smokeAt = 0;
    const world = this.planet.world;
    const profile = getProfile(this);
    const save = heldWorld(this, world.id) ?? loadWorld(getHost(this).storage, world.id, world.site.width * world.site.height, new Set(world.items.map((it) => it.id)));
    this.taken = [...(save?.taken ?? [])];
    const built = buildWorld(this.planet, profile, save);
    const setup = built.setup;
    this.base = built.base;
    this.mine = new Mine(setup);
    this.savedAt = 0;
    const T = setup.tileSize;
    const t = setup.terrain;
    this.ring = new Ring(t.wrap ? t.width * T : Infinity);
    const worldH = t.height * T;
    const skyH = setup.lander.row * T;
    const style = this.planet.style;
    crispText(this);
    const look = prospectorLook(setup.loadout);
    this.ship = landerLookOf(profile.ship);
    this.wreck = wreckOf(profile);
    this.intro = !profile.started;
    generateTextures(this, style, skyH, look, this.ship, this.wreck);
    this.cameras.main.setBackgroundColor(PAPER);
    // Far sky and crater rims scroll slower than the ground, so they read as far off; both tile round the world.
    this.sky = this.add.tileSprite(0, 0, SKY_W, this.textures.get(TEX.sky(skyH)).getSourceImage().height, TEX.sky(skyH)).setOrigin(0).setScrollFactor(PARALLAX.sky, 1).setDepth(0);
    this.ridges = this.add.tileSprite(0, skyH * 0.5 + T * 0.5, RIDGE_W, this.textures.get(TEX.ridges(skyH)).getSourceImage().height, TEX.ridges(skyH)).setOrigin(0).setScrollFactor(PARALLAX.ridges, 1).setDepth(0.5);
    // The ground's roof is taken from the carved ground, so a shaft dug in an earlier session still reads as inside the planet.
    const roof = roofRows({ ...t, tiles: built.base });
    this.ground = new GroundView(this, t, T, style, (g) => tooHard(setup.drill, g), roof);
    this.lander = this.add.image((setup.lander.col + 0.5) * T, setup.lander.row * T, TEX.lander(this.ship, 0, this.wreck)).setOrigin(0.5, 1).setScale(1 / ART_RES).setDepth(2);
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
    const cam = this.cameras.main;
    if (t.wrap) cam.setBounds(-RING_REACH, 0, RING_REACH * 2, worldH);
    else cam.setBounds(0, 0, t.width * T, worldH);
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unhook();
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
    if (!this.ended && !this.intro && this.keys.pause()) {
      this.paused = !this.paused;
      // A gauge tapped just before pausing isn't fed after it.
      this.asked = {};
    }
    const still = this.ended || this.intro || this.paused;
    // Keys are read every frame, so one pressed while the world waits doesn't fire when it starts again.
    const keys = this.keys.read();
    const aboard = this.keys.aboard();
    const input = still ? NO_INPUT : { ...keys, ...this.asked };
    if (!still) this.asked = {};
    this.iy = input.iy;
    if (!still && aboard && this.mine.atLander) {
      this.goAboard();
      return;
    }
    for (const e of this.mine.step(still ? 0 : dt, input)) this.react(e);
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
    return { ...getProfile(this), cargo: this.mine.cargo, suit: this.mine.suit.bag };
  }

  /** The one thing to do next, for the HUD. */
  goal(): Goal {
    return currentGoal(this.liveProfile());
  }

  /** A gauge tapped on the HUD: feed it from the bag on the next step. */
  feedGauge(g: Gauge): void {
    if (!this.ended && !this.intro && !this.paused) this.asked = { ...this.asked, feed: g };
  }

  /** Recall, from the pause card: the winch hauls you up on the next step. */
  recall(): void {
    if (this.ended || this.intro) return;
    this.paused = false;
    this.asked = { ...this.asked, recall: true };
  }

  /** Back from the pause card. */
  resume(): void {
    this.paused = false;
  }

  /** Closes the opening card: the world starts, and it's never shown again. */
  closeIntro(): void {
    if (!this.intro) return;
    this.intro = false;
    setProfile(this, { ...this.liveProfile(), started: true });
  }

  /** Where the beacon points: the blueprint a 'find' goal is after, while it's still lying in the world. */
  private beaconTarget(): { x: number; y: number } | null {
    const g = this.goal();
    if (g.kind !== 'find') return null;
    const it = this.mine.items.find((i) => i.blueprint === g.blueprint && (i.state === 'rock' || i.state === 'loose'));
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
    const changes = captureWorld(this.base, this.mine.terrain, this.mine.ladders, world.version, this.taken, this.mine.dropped);
    holdWorld(this, world.id, changes);
    this.changed = !saveWorld(getHost(this).storage, world.id, changes);
    this.savedAt = this.mine.time;
  }

  private react(e: MineEvent): void {
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
        over(`cell flat: R feeds it ${ORES[this.mine.fuels.cell].name}`, true);
        break;
      case 'bagFull':
        over('bag full', true);
        break;
      case 'ore':
        over(`+ ${oreById(e.ore)?.name ?? 'ore'}`);
        this.changed = true;
        break;
      case 'item':
        over(e.item.kind === 'blueprint' ? 'a blueprint!' : `+ the ${e.item.kind === 'core' ? 'core sample' : e.item.kind}`);
        break;
      case 'bankItem':
        this.fx.note(px, p.y - 32, e.item.kind === 'blueprint' ? 'blueprint stowed' : `${e.item.kind === 'core' ? 'core sample' : e.item.kind} stowed`);
        if (e.item.blueprint) setProfile(this, findBlueprint(getProfile(this), e.item.blueprint));
        this.taken = [...this.taken, e.item.id];
        this.save();
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
      case 'fed':
        over(`${e.gauge === 'air' ? 'air' : 'cell'} + ${ORES[e.ore].name}`);
        this.changed = true;
        break;
      case 'cantFeed':
        over(e.why === 'full' ? `${e.gauge === 'air' ? 'life support' : 'the cell'} is full` : `no ${ORES[e.ore].name} in the bag`, true);
        break;
      case 'airLow':
        this.fx.note(px, p.y - 32, `air low: R feeds it ${ORES[this.mine.fuels.air].name}`, true);
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
      case 'noLadders':
        over('no ladders left', true);
        break;
      case 'ladder':
        this.changed = true;
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
      case 'drilled':
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

  /** Into the lander: save, and open the ship's page (printing, the cargo). Back down starts from the lander. */
  private goAboard(): void {
    this.ended = true;
    this.save();
    this.scene.stop('Hud');
    this.scene.start('Ship');
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
