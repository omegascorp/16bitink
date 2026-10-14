import Phaser from 'phaser';
import { ART_RES, BOIL, PAPER } from '../art/palette';
import { TEX, generateTextures } from '../art/textures';
import { getProfile, setProfile } from '../host';
import { levelSetup } from '../level/build';
import { levelById, levelOrder, planetOf } from '../level/levels';
import type { LevelDef, PlanetDef } from '../level/types';
import { tooHard } from '../logic/drill';
import { settle, type Ending, type Payout } from '../logic/economy';
import { prospectorLook, type Look } from '../logic/gear';
import { lampFor } from '../logic/marks';
import { Mine, NO_INPUT, type MineEvent } from '../logic/mine';
import { missionDone } from '../logic/mission';
import { oreById } from '../logic/ore';
import { landerLookOf } from '../logic/ship';
import { volatileAt } from '../logic/terrain';
import { volatileKeyOf } from '../logic/volatiles';
import { FxView } from './game/fxView';
import { GroundView } from './game/groundView';
import { GameInput } from './game/input';
import { ItemsView } from './game/itemsView';
import { LampView } from './game/lampView';
import { ProspectorView } from './game/prospectorView';
import { ThingsView } from './game/thingsView';
import { crispText, DPR, screenSize } from './hidpi';
import type { ResultData } from './ResultScene';

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** Tiles of ground the view shows top to bottom on a big screen; small screens show a little less. */
const VIEW_TILES = 14;
const ZOOM = { min: 0.75, max: 2 } as const;
/** A beat to see the suit give out, or the lander go, before the result card. */
const FAILED_MS = 2600;
const LIFTOFF_MS = 1400;
/** Seconds a "press again to leave early" offer stands. */
const LEAVE_WINDOW = 2.5;

export interface GameData {
  readonly levelId?: string;
}

/** One landing: drill, haul ore back, bank it, do the mission, lift off. */
export class GameScene extends Phaser.Scene {
  mine!: Mine;
  level!: LevelDef;
  planet!: PlanetDef;
  /** The intro card is up: the site waits until it's dismissed. */
  briefing = true;
  private ground!: GroundView;
  private prospector!: ProspectorView;
  private things!: ThingsView;
  private items!: ItemsView;
  private lamp!: LampView;
  private fx!: FxView;
  private keys!: GameInput;
  private lander!: Phaser.GameObjects.Image;
  private ship: Look = 0;
  private iy = 0;
  /** Sim time until which a second lift-off press leaves before the mission is done. */
  private leaveUntil = -1;
  private ended = false;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.level = levelById(data.levelId ?? '') ?? levelById(levelOrder()[0]!)!;
    this.planet = planetOf(this.level.id);
    this.briefing = true;
    this.ended = false;
    this.leaveUntil = -1;
    const profile = getProfile(this);
    const setup = levelSetup(this.level, this.planet, profile);
    this.mine = new Mine(setup);
    const T = setup.tileSize;
    const worldW = setup.terrain.width * T;
    const worldH = setup.terrain.height * T;
    const skyH = setup.lander.row * T;
    const style = this.planet.style;
    crispText(this);
    const look = prospectorLook(setup.loadout);
    this.ship = landerLookOf(profile.ship);
    generateTextures(this, style, skyH, look, this.ship);
    this.cameras.main.setBackgroundColor(PAPER);
    // Far sky and crater rims scroll slower than the ground, so they read as far off.
    this.add.image(0, 0, TEX.sky(skyH)).setOrigin(0).setScrollFactor(0.15, 1).setDepth(0);
    this.add.image(0, skyH * 0.5 + T * 0.5, TEX.ridges(skyH)).setOrigin(0).setScrollFactor(0.45, 1).setDepth(0.5);
    this.ground = new GroundView(this, setup.terrain, T, style, (g) => tooHard(setup.drill, g));
    this.lander = this.add.image((setup.lander.col + 0.5) * T, setup.lander.row * T, TEX.lander(this.ship, 0)).setOrigin(0.5, 1).setScale(1 / ART_RES).setDepth(2);
    this.things = new ThingsView(this, T);
    this.items = new ItemsView(this, T);
    this.prospector = new ProspectorView(this, look);
    this.fx = new FxView(this, T, look.jetpack);
    this.lamp = new LampView(this, lampFor(profile.gear.helmet), T);
    this.keys = new GameInput(this);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.prospector.object, true, 0.14, 0.14);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fitZoom, this);
      this.ground.destroy();
      this.scene.stop('Hud');
    });
    if (this.scene.isActive('Hud')) this.scene.stop('Hud');
    this.scene.launch('Hud');
  }

  /** Closes the intro card and starts the landing. */
  dismissBriefing(): void {
    this.briefing = false;
    this.keys.flush();
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const input = this.briefing || this.ended ? NO_INPUT : this.keys.read();
    this.iy = input.iy;
    if (input.liftoff && this.mine.atLander && !this.readyToLeave()) {
      this.react({ kind: 'liftoff' }, true);
    } else {
      for (const e of this.mine.step(this.briefing ? 0 : dt, input)) this.react(e);
    }
    this.ground.update(this.cameras.main.worldView);
    this.prospector.update(this.mine, this.iy, time);
    this.things.update(this.mine, time);
    this.items.update(this.mine, time);
    this.fx.update(this.mine);
    this.fx.jet(this.mine);
    this.lamp.update(this.mine, this.cameras.main.worldView);
    this.lander.setTexture(TEX.lander(this.ship, Math.floor(time / 125) % BOIL));
  }

  /** Whether a lift-off press should go: the mission's done, or it's the second press of a "leave early?". */
  private readyToLeave(): boolean {
    return missionDone(this.level.mission, this.mine.tally()) || this.mine.time < this.leaveUntil;
  }

  private react(e: MineEvent, held = false): void {
    const p = this.mine.player;
    const over = (text: string, danger = false): void => this.fx.note(p.x + p.w / 2, p.y - 10, text, danger);
    switch (e.kind) {
      case 'tiles':
        this.ground.invalidate(e.tiles);
        break;
      case 'blast':
        this.fx.blast(e.blast);
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
        break;
      case 'item':
        over(e.item.kind === 'blueprint' ? 'a blueprint!' : `+ the ${e.item.kind === 'core' ? 'core sample' : e.item.kind}`);
        break;
      case 'bankItem':
        this.fx.note(p.x + p.w / 2, p.y - 32, e.item.kind === 'blueprint' ? 'blueprint stowed' : `${e.item.kind === 'core' ? 'core sample' : e.item.kind} stowed`);
        break;
      case 'bank':
        over(`${e.pieces} into the cargo`);
        break;
      case 'cargoFull':
        this.fx.note(p.x + p.w / 2, p.y - 32, 'cargo hold full!', true);
        break;
      case 'recharge':
        over('cell charged');
        break;
      case 'refuel':
        this.fx.note(p.x + p.w / 2, p.y - 32, 'tank full');
        break;
      case 'noFuel':
        over('out of fuel', true);
        break;
      case 'noLadders':
        over('no ladders left', true);
        break;
      case 'recall':
        if (e.lost) over(`winched up; lost ${e.lost} in the bag`, true);
        break;
      case 'hurt':
        this.cameras.main.flash(160, 179, 50, 43);
        break;
      case 'liftoff':
        if (held) {
          this.leaveUntil = this.mine.time + LEAVE_WINDOW;
          over('mission not done: lift off again to leave early', true);
          break;
        }
        this.finish(missionDone(this.level.mission, this.mine.tally()) ? 'won' : 'left');
        break;
      case 'failed':
        this.finish('failed');
        break;
      case 'lit': {
        const kind = volatileKeyOf(volatileAt(this.mine.terrain, e.tile[0], e.tile[1]));
        this.fx.note((e.tile[0] + 0.5) * this.mine.tile, e.tile[1] * this.mine.tile - 6, kind === 'firedamp' ? 'firedamp! get clear' : 'charge armed! get clear', true);
        break;
      }
      case 'drilled':
      case 'ladder':
        break;
    }
  }

  /** Settles the landing, saves, and goes to the result card after a beat. */
  private finish(ending: Ending): void {
    if (this.ended) return;
    this.ended = true;
    const payout: Payout = settle(getProfile(this), {
      levelId: this.level.id,
      ending,
      tally: this.mine.tally(),
      mission: this.level.mission,
      contracts: this.level.contracts,
      blueprints: this.mine.bankedBlueprints(),
      cargo: this.mine.cargo,
      bag: this.mine.suit.bag,
    });
    setProfile(this, payout.profile);
    const wait = ending === 'failed' ? FAILED_MS : LIFTOFF_MS;
    if (ending === 'failed') this.cameras.main.fade(FAILED_MS, 245, 240, 225);
    else this.liftLander(wait);
    const result: ResultData = { levelId: this.level.id, payout };
    this.time.delayedCall(wait, () => {
      this.scene.stop('Hud');
      this.scene.start('Result', result);
    });
  }

  /** The lander lifts away with the prospector aboard. */
  private liftLander(ms: number): void {
    this.prospector.object.setVisible(false);
    this.cameras.main.stopFollow();
    this.tweens.add({ targets: this.lander, y: this.lander.y - this.mine.tile * 14, duration: ms, ease: 'Cubic.In' });
    this.cameras.main.fade(ms, 245, 240, 225);
  }

  /** Zoom so the view shows about VIEW_TILES of ground top to bottom. */
  private fitZoom(): void {
    const { height } = screenSize(this);
    const css = Phaser.Math.Clamp(height / (VIEW_TILES * this.mine.tile), ZOOM.min, ZOOM.max);
    this.cameras.main.setZoom(css * DPR);
  }
}
