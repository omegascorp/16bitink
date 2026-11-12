import Phaser from 'phaser';
import { buildPartTextures, preloadArt } from './art';
import { Fx } from './fx';
import { Input } from './input';
import { BUILDS, Tank, type Controls, type RotationMode } from './tank';
import { viewFor, type View } from './view';
import { World, WORLD } from './world';

/**
 * The InkTanks art test: one tank on a two-by-two-screen patch of map, to judge the top-down look.
 *   1-4 builds, R rotation mode, WASD/arrows drive, mouse aims, click fires; two thumbsticks on touch.
 * Query (for screenshots): build=scout|brawler|siege|brawler3, rot=free|rotsprite, at=x,y, hull=deg, aim=deg,
 * wall=0|1|2, touch=1, demo=<seconds of driving and firing before the page reports ready>.
 */
const q = new URLSearchParams(location.search);
const num = (k: string): number | null => (q.has(k) ? Number(q.get(k)) : null);
const pair = (k: string): [number, number] | null => (q.has(k) ? (q.get(k)!.split(',').map(Number) as [number, number]) : null);
const touchUi = q.get('touch') === '1' || matchMedia('(pointer: coarse)').matches;
const MODE_LABEL: Record<RotationMode, string> = { free: 'free rotation (nearest)', rotsprite: 'RotSprite, 32 steps' };
const deg = Math.PI / 180;

class ArtTest extends Phaser.Scene {
  private world!: World;
  private fx!: Fx;
  private tank!: Tank;
  private input2!: Input;
  private label = document.getElementById('label')!;
  private crateBack = 0;
  private demo = num('demo') ?? 0;
  private clock = 0;

  constructor() {
    super('ArtTest');
  }

  preload(): void {
    preloadArt(this);
  }

  create(): void {
    buildPartTextures(this, BUILDS);
    this.world = new World(this);
    this.world.build(num('wall') ?? 2);
    this.fx = new Fx(this);
    const mode = (q.get('rot') === 'free' ? 'free' : 'rotsprite') as RotationMode;
    this.tank = new Tank(this, this.world, this.fx, mode);
    this.tank.setBuild(BUILDS.find((b) => b.id === q.get('build')) ?? BUILDS[1]!);
    const at = pair('at');
    if (at) [this.tank.x, this.tank.y] = at;
    if (q.has('hull')) this.tank.angle = num('hull')! * deg;
    this.tank.turretAngle = q.has('aim') ? num('aim')! * deg : this.tank.angle;
    this.input2 = new Input((key) => this.onKey(key));
    const buttons = document.getElementById('buttons')!;
    buttons.classList.toggle('on', touchUi);
    buttons.addEventListener('click', (e) => {
      const key = (e.target as HTMLElement).closest('button')?.dataset.key;
      if (key) this.onKey(key);
    });
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.tank.update(0, this.idle());
    this.follow();
    if (!this.demo) (window as unknown as { __ready: boolean }).__ready = true;
  }

  private onKey(key: string): void {
    const i = ['1', '2', '3', '4'].indexOf(key);
    if (i >= 0) this.tank.setBuild(BUILDS[i]!);
    if (key === 'r') this.tank.mode = this.tank.mode === 'free' ? 'rotsprite' : 'free';
  }

  /** No input: the turret holds its aim. */
  private idle(): Controls {
    const a = this.tank.turretAngle;
    return { move: null, aim: { x: this.tank.x + Math.cos(a) * 100, y: this.tank.y + Math.sin(a) * 100 }, fire: false };
  }

  private controls(): Controls {
    const inp = this.input2;
    const t = this.tank;
    if (this.demo > 0) {
      // Screenshot demo: drive a gentle curve and fire ahead of the turret.
      const a = t.angle + 0.5;
      const aim = t.turretAngle + 0.4;
      return { move: { x: Math.cos(a), y: Math.sin(a) }, aim: { x: t.x + Math.cos(aim) * 120, y: t.y + Math.sin(aim) * 120 }, fire: true };
    }
    const stick = inp.aimStick();
    if (stick) return { move: inp.move(), aim: { x: t.x + stick.x * 120, y: t.y + stick.y * 120 }, fire: true };
    if (inp.mouse) {
      const rect = this.game.canvas.getBoundingClientRect();
      const cam = this.cameras.main;
      const x = cam.scrollX + ((inp.mouse.x - rect.left) / rect.width) * this.scale.width;
      const y = cam.scrollY + ((inp.mouse.y - rect.top) / rect.height) * this.scale.height;
      return { move: inp.move(), aim: { x, y }, fire: inp.mouseDown };
    }
    return { ...this.idle(), move: inp.move() };
  }

  private follow(): void {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    cam.setScroll(Math.round(Phaser.Math.Clamp(this.tank.x - w / 2, 0, Math.max(0, WORLD.w - w))), Math.round(Phaser.Math.Clamp(this.tank.y - h / 2, 0, Math.max(0, WORLD.h - h))));
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.clock += dt;
    this.tank.update(dt, this.controls());
    if (this.demo > 0 && this.clock >= this.demo) {
      this.demo = 0;
      (window as unknown as { __ready: boolean }).__ready = true;
    }
    this.pickCrate(dt);
    this.world.updateFades(this.tank.x, this.tank.y, this.tank.current.radius + 4, dt);
    this.fx.update(dt);
    this.follow();
    const b = this.tank.current;
    this.label.textContent = `${b.name}  ·  ${MODE_LABEL[this.tank.mode]}\n1-4 build · R rotation${touchUi ? '' : ' · WASD drive · mouse aim/fire'}`;
    const { width, height } = this.game.canvas.getBoundingClientRect();
    this.input2.restStick('left', 96, height - 96, touchUi);
    this.input2.restStick('right', width - 96, height - 96, touchUi);
  }

  /** The loot crate: driving over it opens it (a burst), and it comes back a few seconds later. */
  private pickCrate(dt: number): void {
    const c = this.world.crate;
    const p = this.world.cratePos;
    if (c.visible && Math.hypot(this.tank.x - p.x, this.tank.y - p.y) < this.tank.current.radius + 6) {
      c.setVisible(false);
      this.fx.spark(p.x, p.y, false);
      this.crateBack = 4;
    } else if (!c.visible && (this.crateBack -= dt) <= 0) c.setVisible(true);
  }
}

const parent = document.getElementById('game')!;
let view: View = viewFor(innerWidth, innerHeight, devicePixelRatio || 1);
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent,
  backgroundColor: '#1b1a16',
  width: view.nativeW,
  height: view.nativeH,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.NONE, zoom: view.scale / view.dpr },
  input: { activePointers: 3 },
  audio: { noAudio: true },
  scene: [ArtTest],
});
addEventListener('resize', () => {
  view = viewFor(innerWidth, innerHeight, devicePixelRatio || 1);
  game.scale.resize(view.nativeW, view.nativeH);
  game.scale.setZoom(view.scale / view.dpr);
});
(window as unknown as { __game: unknown }).__game = game;
