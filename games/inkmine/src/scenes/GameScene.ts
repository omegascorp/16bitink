import Phaser from 'phaser';
import { ART_RES, BOIL, PAPER } from '../art/palette';
import { roofRows } from '../art/ground';
import { RIDGE_W, SKY_W } from '../art/skyArt';
import { TEX, generateTextures } from '../art/textures';
import { getHost, getProfile, heldWorld, holdWorld, setProfile } from '../host';
import { buildWorld } from '../level/build';
import { currentPlanet } from '../level/planets';
import type { PlanetDef } from '../level/types';
import { tooHard } from '../logic/drill';
import { findBlueprint } from '../logic/economy';
import { prospectorLook, type Look } from '../logic/gear';
import { emptyInventory } from '../logic/inventory';
import { lampFor } from '../logic/marks';
import { Mine, NO_INPUT, type MineEvent } from '../logic/mine';
import { oreById } from '../logic/ore';
import { landerLookOf } from '../logic/ship';
import { volatileAt } from '../logic/terrain';
import { volatileKeyOf } from '../logic/volatiles';
import { captureWorld, loadWorld, saveWorld } from '../logic/worldSave';
import { FxView } from './game/fxView';
import { GroundView } from './game/groundView';
import { GameInput } from './game/input';
import { ItemsView } from './game/itemsView';
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
  private ship: Look = 0;
  private iy = 0;
  private ended = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.planet = currentPlanet();
    this.ended = false;
    this.changed = false;
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
    generateTextures(this, style, skyH, look, this.ship);
    this.cameras.main.setBackgroundColor(PAPER);
    // Far sky and crater rims scroll slower than the ground, so they read as far off; both tile round the world.
    this.sky = this.add.tileSprite(0, 0, SKY_W, this.textures.get(TEX.sky(skyH)).getSourceImage().height, TEX.sky(skyH)).setOrigin(0).setScrollFactor(PARALLAX.sky, 1).setDepth(0);
    this.ridges = this.add.tileSprite(0, skyH * 0.5 + T * 0.5, RIDGE_W, this.textures.get(TEX.ridges(skyH)).getSourceImage().height, TEX.ridges(skyH)).setOrigin(0).setScrollFactor(PARALLAX.ridges, 1).setDepth(0.5);
    // The ground's roof is taken from the carved ground, so a shaft dug in an earlier session still reads as inside the planet.
    const roof = roofRows({ ...t, tiles: built.base });
    this.ground = new GroundView(this, t, T, style, (g) => tooHard(setup.drill, g), roof);
    this.lander = this.add.image((setup.lander.col + 0.5) * T, setup.lander.row * T, TEX.lander(this.ship, 0)).setOrigin(0.5, 1).setScale(1 / ART_RES).setDepth(2);
    this.things = new ThingsView(this, T);
    this.items = new ItemsView(this, T);
    this.prospector = new ProspectorView(this, look);
    this.fx = new FxView(this, T, look.jetpack);
    this.lamp = new LampView(this, lampFor(profile.gear.helmet), T);
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
    const input = this.ended ? NO_INPUT : this.keys.read();
    this.iy = input.iy;
    if (!this.ended && this.keys.aboard() && this.mine.atLander) {
      this.goAboard();
      return;
    }
    for (const e of this.mine.step(this.ended ? 0 : dt, input)) this.react(e);
    const cam = this.cameras.main;
    this.ring.centre = cam.midPoint.x;
    this.ground.update(cam.worldView);
    this.prospector.update(this.mine, this.iy, time, this.ring);
    this.things.update(this.mine, time, this.ring);
    this.items.update(this.mine, time, this.ring);
    this.fx.update(this.mine, this.ring);
    this.fx.jet(this.mine, this.ring);
    this.lamp.update(this.mine, cam.worldView, this.ring);
    this.lander.setTexture(TEX.lander(this.ship, Math.floor(time / 125) % BOIL)).setX(this.ring.near((this.mine.landerBox.x + this.mine.landerBox.w / 2)));
    this.followSky();
    if (this.changed && this.mine.time - this.savedAt > AUTOSAVE_S) this.save();
  }

  /**
   * Saves the profile (the cargo and the bag as they are) and the world's
   * changes. The world is held in memory too, so it survives going aboard
   * even when storage won't take it; a failed write is tried again later.
   */
  save(): void {
    if (!this.mine) return;
    const world = this.planet.world;
    setProfile(this, { ...getProfile(this), cargo: this.mine.cargo, suit: this.mine.suit.bag });
    const changes = captureWorld(this.base, this.mine.terrain, this.mine.ladders, world.version, this.taken);
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
        over('cell flat: back to the lander', true);
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
      case 'recharge':
        over('cell charged');
        break;
      case 'refuel':
        this.fx.note(px, p.y - 32, 'tank full');
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
        if (e.lost) over(`winched up; lost ${e.lost} in the bag`, true);
        this.changed = true;
        break;
      case 'hurt':
        this.cameras.main.flash(160, 179, 50, 43);
        break;
      case 'failed':
        this.giveOut();
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
   * The suit gave out: the bag is lost, the cargo and the world's changes
   * are kept, and the prospector wakes at the lander. (The bag left where
   * you fell, and the printer's story, come with the life system.)
   */
  private giveOut(): void {
    if (this.ended) return;
    this.ended = true;
    const bag = this.mine.suit.bag;
    this.mine.suit = { ...this.mine.suit, bag: emptyInventory(bag.slots.length, bag.stack) };
    this.save();
    this.cameras.main.fade(FAILED_MS, 245, 240, 225);
    this.time.delayedCall(FAILED_MS, () => this.scene.restart());
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
