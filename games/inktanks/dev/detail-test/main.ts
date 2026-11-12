import Phaser from 'phaser';
import mA from './assets/A/manifest.json';
import mB from './assets/B/manifest.json';
import mC from './assets/C/manifest.json';
import { buildDensity, preloadDensity, stepOf, type Manifest } from './textures';

/**
 * The InkTanks detail test: the same four tanks, the same size on screen, at three pixel densities.
 *   A  480 x 270 native, 4 device px per pixel (the art test's)
 *   B  640 x 360 native, 3 device px per pixel
 *   C  960 x 540 native, 2 device px per pixel
 * D (or the button) cycles: all three side by side, then A, B and C alone. RotSprite (32 steps) throughout.
 * Query: view=all|A|B|C.
 */
const MANIFESTS = { A: mA, B: mB, C: mC } as unknown as Record<'A' | 'B' | 'C', Manifest>;
type Density = keyof typeof MANIFESTS;
type ViewName = 'all' | Density;
const VIEWS: readonly ViewName[] = ['all', 'A', 'B', 'C'];
const NATIVE: Record<Density, string> = { A: '480×270 ×4', B: '640×360 ×3', C: '960×540 ×2' };

const BUILDS = [
  { id: 'scout', name: 'Scout', drive: 'driveWheels', hull: 'hullLight', turret: 'turretMG' },
  { id: 'brawler', name: 'Brawler', drive: 'driveHalftrack', hull: 'hullMedium', turret: 'turretCannon' },
  { id: 'siege', name: 'Siege', drive: 'driveTracks', hull: 'hullHeavy', turret: 'turretRocket' },
  { id: 'brawler3', name: 'Mk III', drive: 'driveHalftrack', hull: 'hullMedium', turret: 'turretCannon3' },
] as const;

/** The fixed sun, as the art test's: a part's shadow falls right and up. */
const SHADOW = { x: 0.78, y: -0.58 };
const phone = Math.min(innerWidth, innerHeight) < 500;

interface Shown {
  b: (typeof BUILDS)[number];
  x: number;
  y: number;
  hull: number;
  turret: number;
  spin: number;
  rolled: number;
  imgs: Phaser.GameObjects.Image[];
}

class DensityScene extends Phaser.Scene {
  private tanks: Shown[] = [];
  private clock = 0;

  constructor(private readonly m: Manifest) {
    super('Density');
  }

  preload(): void {
    preloadDensity(this, this.m);
  }

  create(): void {
    buildDensity(this, this.m, BUILDS);
      const { width: w, height: h } = this.scale;
    const g = this.add.image(Math.round(w / 2), Math.round(h / 2), 'ground');
    // The tanks stand in a 2 x 2 grid on the ground patch, which is painted at this density.
    const gw = g.width;
    const spots = BUILDS.map((_, i) => [w / 2 + ((i % 2) - 0.5) * gw * 0.5, h / 2 + (Math.floor(i / 2) - 0.5) * gw * 0.5] as const);
    this.tanks = BUILDS.map((b, i) => {
      const imgs = [0, 1, 2, 3, 4].map(() => this.add.image(0, 0, '__DEFAULT'));
      imgs[0]!.setTint(0x000000).setAlpha(0.34);
      imgs[3]!.setTint(0x000000).setAlpha(0.18);
      const [x, y] = spots[i]!;
      return { b, x, y, hull: -Math.PI / 2 + i * 0.9, turret: i * 1.7, spin: i % 2 ? -0.32 : 0.32, rolled: 0, imgs };
    });
    this.draw();
    ready.done++;
    (window as unknown as { __ready: boolean }).__ready = ready.done >= ready.want;
  }

  update(_t: number, ms: number): void {
    const dt = Math.min(0.05, ms / 1000);
    this.clock += dt;
    for (const t of this.tanks) {
      t.hull += t.spin * dt;
      // The turret sweeps on its own, ahead of and behind the hull.
      t.turret = t.hull + Math.sin(this.clock * 0.7 + t.spin * 9) * 1.4;
      // Tracks roll as if creeping forward, at about 8 model units a second.
      t.rolled += dt * 8 * this.m.unit;
    }
    this.draw();
  }

  private draw(): void {
    const u = this.m.unit;
    for (const t of this.tanks) {
      const [sBody, drive, hull, sTurret, turret] = t.imgs as [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image];
      const hs = stepOf(t.hull + Math.PI / 2);
      const ts = stepOf(t.turret + Math.PI / 2);
      const frame = Math.floor(t.rolled) % 3;
      const [rx, ry] = this.m.ring[t.b.hull]!;
      const a = (hs / 32) * Math.PI * 2;
      const ringX = t.x + rx * Math.cos(a) - ry * Math.sin(a);
      const ringY = t.y + rx * Math.sin(a) + ry * Math.cos(a);
      const put = (img: Phaser.GameObjects.Image, key: string, step: number, x: number, y: number): void => {
        img.setTexture(`rot:${key}`, String(step)).setPosition(Math.round(x), Math.round(y));
      };
      put(sBody, `body:${t.b.id}`, hs, t.x + SHADOW.x * 3 * u, t.y + SHADOW.y * 3 * u);
      put(drive, frame ? `${t.b.drive}-f${frame}` : t.b.drive, hs, t.x, t.y);
      put(hull, t.b.hull, hs, t.x, t.y);
      // A light turret shadow on the deck, between hull and turret.
      put(sTurret, t.b.turret, ts, ringX + SHADOW.x * 2 * u, ringY + SHADOW.y * 2 * u);
      put(turret, t.b.turret, ts, ringX, ringY);
    }
  }
}

const root = document.getElementById('columns')!;
/** The page is ready for a screenshot once every column's scene has built its textures. */
const ready = { want: 0, done: 0 };
let games: Phaser.Game[] = [];
let view: ViewName = (new URLSearchParams(location.search).get('view') as ViewName) ?? 'all';
if (!VIEWS.includes(view)) view = 'all';

/** Device px per density-A pixel: 4 on a desktop (the art test's); on a phone 8 when one density fills the screen. */
function unitPx(single: boolean): number {
  return phone && single ? 8 : 4;
}

function mount(): void {
  for (const g of games) g.destroy(true);
  games = [];
  root.innerHTML = '';
  const list: Density[] = view === 'all' ? ['A', 'B', 'C'] : [view];
  ready.want = list.length;
  ready.done = 0;
  (window as unknown as { __ready: boolean }).__ready = false;
  const dpr = devicePixelRatio || 1;
  // Every column first, then measure: a column measured alone would take the whole width.
  const cols = list.map(() => {
    const col = document.createElement('div');
    col.className = 'col';
    root.appendChild(col);
    return col;
  });
  list.forEach((d, i) => {
    const m = MANIFESTS[d];
    const col = cols[i]!;
    const label = document.createElement('div');
    label.className = 'tag';
    const scale = Math.round(unitPx(list.length === 1) / m.unit);
    label.textContent = `${d} · ${NATIVE[d]} · heavy hull ${Math.round(38 * m.unit)} px`;
    col.appendChild(label);
    const w = Math.ceil((col.clientWidth * dpr) / scale);
    const h = Math.ceil((col.clientHeight * dpr) / scale);
    games.push(new Phaser.Game({
      type: Phaser.WEBGL, parent: col, width: w, height: h, backgroundColor: '#1b1a16', pixelArt: true, roundPixels: true, antialias: false,
      scale: { mode: Phaser.Scale.NONE, zoom: scale / dpr }, audio: { noAudio: true }, banner: false, scene: [new DensityScene(m)],
    }));
  });
  document.getElementById('which')!.textContent = view === 'all' ? 'all three' : `${view} alone`;
}

const cycle = (): void => {
  view = VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]!;
  mount();
};
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'd') cycle();
});
document.getElementById('cycle')!.addEventListener('click', cycle);
let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(mount, 200);
});
mount();
