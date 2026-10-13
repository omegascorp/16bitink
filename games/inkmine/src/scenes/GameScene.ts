import Phaser from 'phaser';
import { ART_RES, BOIL, GRAPHITE, PAPER } from '../art/palette';
import { TEX, generateTextures } from '../art/textures';
import { testMineSetup } from '../level/testMine';
import { tooHard } from '../logic/drill';
import { Mine, type MineEvent } from '../logic/mine';
import { oreById } from '../logic/ore';
import { FxView } from './game/fxView';
import { GroundView } from './game/groundView';
import { GameInput } from './game/input';
import { ProspectorView } from './game/prospectorView';
import { ThingsView } from './game/thingsView';
import { crispText, DPR, screenSize } from './hidpi';

/** Longest frame the simulation takes in one step (tab switches, hitches). */
const MAX_DT = 1 / 20;
/** Tiles of ground the view shows top to bottom on a big screen; small screens show a little less. */
const VIEW_TILES = 14;
const ZOOM = { min: 0.75, max: 2 } as const;
/** A beat to see the suit give out before the site resets. */
const FAILED_RESTART_MS = 2600;

/** The test mine (build order steps 1–2): drill, haul ore back, bank it, mind the crates. */
export class GameScene extends Phaser.Scene {
  mine!: Mine;
  private ground!: GroundView;
  private prospector!: ProspectorView;
  private things!: ThingsView;
  private fx!: FxView;
  private keys!: GameInput;
  private lander!: Phaser.GameObjects.Image;
  private iy = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    const setup = testMineSetup();
    this.mine = new Mine(setup);
    const T = setup.tileSize;
    const worldW = setup.terrain.width * T;
    const worldH = setup.terrain.height * T;
    const skyH = setup.lander.row * T;
    crispText(this);
    generateTextures(this, GRAPHITE, skyH);
    this.cameras.main.setBackgroundColor(PAPER);
    // Far sky and crater rims scroll slower than the ground, so they read as far off.
    this.add.image(0, 0, TEX.sky).setOrigin(0).setScrollFactor(0.15, 1).setDepth(0);
    this.add.image(0, skyH * 0.5 + T * 0.5, TEX.ridges).setOrigin(0).setScrollFactor(0.45, 1).setDepth(0.5);
    this.ground = new GroundView(this, setup.terrain, T, GRAPHITE, (g) => tooHard(setup.drill, g));
    this.lander = this.add.image((setup.lander.col + 0.5) * T, setup.lander.row * T, TEX.lander(0)).setOrigin(0.5, 1).setScale(1 / ART_RES).setDepth(2);
    this.things = new ThingsView(this, T);
    this.prospector = new ProspectorView(this);
    this.fx = new FxView(this, T);
    this.keys = new GameInput(this);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.prospector.object, true, 0.14, 0.14);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fitZoom, this);
      this.ground.destroy();
    });
    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DT);
    const input = this.keys.read();
    this.iy = input.iy;
    for (const e of this.mine.step(dt, input)) this.react(e);
    this.ground.update(this.cameras.main.worldView);
    this.prospector.update(this.mine, this.iy, time);
    this.things.update(this.mine, time);
    this.fx.update(this.mine);
    this.fx.jet(this.mine);
    this.lander.setTexture(TEX.lander(Math.floor(time / 125) % BOIL));
  }

  private react(e: MineEvent): void {
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
      case 'bank':
        over(`sold ${e.pieces} for ${e.credits} credits`);
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
      case 'failed':
        this.cameras.main.fade(FAILED_RESTART_MS, 245, 240, 225);
        this.time.delayedCall(FAILED_RESTART_MS, () => this.scene.restart());
        break;
      case 'drilled':
      case 'lit':
      case 'ladder':
        break;
    }
  }

  /** Zoom so the view shows about VIEW_TILES of ground top to bottom. */
  private fitZoom(): void {
    const { height } = screenSize(this);
    const css = Phaser.Math.Clamp(height / (VIEW_TILES * this.mine.tile), ZOOM.min, ZOOM.max);
    this.cameras.main.setZoom(css * DPR);
  }
}
