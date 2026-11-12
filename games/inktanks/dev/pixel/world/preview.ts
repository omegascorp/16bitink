/**
 * The world preview: a 2 x 2-screen farm patch (1920 x 1080 native, density C) laid from the Meadowlands set, for judging
 * the ground and structures by eye. Plain canvas, no engine: it shows the art, not the game.
 *
 * Query: zoom=1|2 (2 is the game's scale: one screen fills a 1920 x 1080 window), x, y (native px of the view's top-left
 * at zoom 2), state=2|1|0 (every structure in that state or the nearest it has), roofs=0 (faded), feet=1 (footprints),
 * view=farm|boss.
 * Keys: S cycles the states, R fades the roofs, F shows the footprints.
 */
import { composeGround, type GroundTexture } from '../../../src/art/pixel/world/ground';
import { WORLD, piecesOf } from '../../../src/art/pixel/world/world';

const urls = import.meta.glob('../../../src/art/pixel/world/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const tankUrls = import.meta.glob('../../detail-test/assets/C/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const W = 1920;
const H = 1080;
const CELL = 32;
const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'farm';
const zoom = Number(q.get('zoom') ?? 1);
let state = Number(q.get('state') ?? 2);
let roofs = q.get('roofs') !== '0';
let feet = q.get('feet') === '1';

const images = new Map<string, HTMLImageElement>();
function load(file: string): Promise<HTMLImageElement> {
  const url = urls[`../../../src/art/pixel/world/${file}`];
  if (!url) return Promise.reject(new Error(`preview: no file ${file}`));
  return loadUrl(file, url);
}
function loadUrl(key: string, url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => {
    images.set(key, img);
    return img;
  });
}
const img = (file: string): HTMLImageElement => {
  const i = images.get(file);
  if (!i) throw new Error(`preview: not loaded ${file}`);
  return i;
};

function pixelsOf(i: HTMLImageElement): ImageData {
  const c = document.createElement('canvas');
  c.width = i.width;
  c.height = i.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(i, 0, 0);
  return ctx.getImageData(0, 0, i.width, i.height);
}

// --- the farm patch's layout -------------------------------------------------------------------------------------------

type Ground = 'grass' | 'grassDry' | 'dirt' | 'sand' | 'mud' | 'water' | 'concrete';

const ROAD: [number, number][] = [[-40, 340], [520, 340], [700, 300], [1240, 300], [1460, 330], [1960, 330]];
function distRoad(x: number, y: number): number {
  let best = 1e9;
  for (let k = 0; k < ROAD.length - 1; k++) {
    const [ax, ay] = ROAD[k]!;
    const [bx, by] = ROAD[k + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return best;
}

function farmGround(cx: number, cy: number): Ground {
  const x = (cx + 0.5) * CELL;
  const y = (cy + 0.5) * CELL;
  const river = Math.abs(x - 1060 - 30 * Math.sin(y / 140));
  if (river < 50 && !(Math.abs(y - 302) < 30)) return 'water';
  if (river < 86) return 'sand';
  const pond = Math.hypot((x - 300) / 150, (y - 820) / 90);
  if (pond < 1) return 'water';
  if (pond < 1.35) return 'sand';
  if (distRoad(x, y) < 38) return 'dirt';
  // The farmyard between the house and the barn, and mud by the barn door.
  if (x > 170 && x < 840 && y > 225 && y < 320) return Math.hypot(x - 640, y - 300) < 70 ? 'mud' : 'dirt';
  if (Math.hypot(x - 1290, y - 690) < 60) return 'mud';
  if (Math.hypot((x - 690) / 230, (y - 820) / 190) < 1 || Math.hypot((x - 1700) / 220, (y - 860) / 150) < 1) return 'grassDry';
  return 'grass';
}

interface Placed {
  name: string;
  x: number;
  y: number;
  /** Shown in this state whatever the page's state (the props view lays out every state). */
  state?: number;
}

const FARM: Placed[] = [
  { name: 'farmhouse', x: 290, y: 170 }, { name: 'barn', x: 650, y: 160 }, { name: 'shed', x: 1290, y: 620 },
  { name: 'houseStone', x: 1620, y: 220 }, { name: 'houseTimber', x: 1800, y: 210 },
  { name: 'crops', x: 1170, y: 140 }, { name: 'crops', x: 1270, y: 140 }, { name: 'crops', x: 1170, y: 206 }, { name: 'crops', x: 1270, y: 206 },
  { name: 'bridgeRailN', x: 1062, y: 302 }, { name: 'bridgeRailS', x: 1062, y: 302 },
  { name: 'fuelBarrels', x: 860, y: 250 }, { name: 'crate', x: 900, y: 236 }, { name: 'crate', x: 914, y: 256 }, { name: 'supplyDrop', x: 1420, y: 470 },
  { name: 'oak', x: 120, y: 470 }, { name: 'oak', x: 470, y: 620 }, { name: 'oak', x: 1880, y: 520 }, { name: 'pine', x: 60, y: 120 },
  { name: 'pine', x: 920, y: 110 }, { name: 'pine', x: 1500, y: 90 }, { name: 'pine', x: 1180, y: 980 }, { name: 'oak', x: 960, y: 760 },
  { name: 'bush', x: 200, y: 400 }, { name: 'bush', x: 560, y: 470 }, { name: 'bush', x: 1360, y: 400 }, { name: 'bush', x: 1700, y: 470 },
  { name: 'bush', x: 760, y: 1010 }, { name: 'bush', x: 1560, y: 1030 },
  { name: 'rockA', x: 470, y: 900 }, { name: 'rockB', x: 160, y: 1000 }, { name: 'rockC', x: 1380, y: 900 }, { name: 'rockA', x: 1735, y: 640 },
  { name: 'radarMast', x: 1730, y: 830 },
];
// Fences round the crops, brick walls and posts round the farmyard's east side, stone walls along the fields.
for (let k = 0; k < 4; k++) FARM.push({ name: 'fenceH', x: 1140 + k * 64, y: 96 }, { name: 'fenceH', x: 1140 + k * 64, y: 252 });
for (let k = 0; k < 2; k++) FARM.push({ name: 'fenceV', x: 1106, y: 142 + k * 64 }, { name: 'fenceV', x: 1366, y: 142 + k * 64 });
for (let k = 0; k < 4; k++) FARM.push({ name: 'stoneWallH', x: 520 + k * 64, y: 620 });
for (let k = 0; k < 3; k++) FARM.push({ name: 'stoneWallV', x: 488, y: 666 + k * 64 });
for (let k = 0; k < 3; k++) FARM.push({ name: 'brickWallH', x: 1480 + k * 68, y: 570 });
for (const x of [1444, 1514, 1582, 1652]) FARM.push({ name: 'brickPost', x, y: 570 });
FARM.push({ name: 'brickWallV', x: 1444, y: 614 }, { name: 'brickPost', x: 1444, y: 650 });

// The mission props view: every state side by side, an apron of concrete before the hangar, a rail line, the fort.
const PROPS: Placed[] = [
  ...[2, 1, 0].map((st, i) => ({ name: 'hangar', x: 180 + i * 250, y: 190, state: st })),
  ...[2, 1, 0].map((st, i) => ({ name: 'radarMast', x: 1000 + i * 170, y: 170, state: st })),
  { name: 'fuelBarrels', x: 1560, y: 120, state: 1 }, { name: 'fuelBarrels', x: 1660, y: 120, state: 0 },
  { name: 'crate', x: 1560, y: 220, state: 1 }, { name: 'crate', x: 1610, y: 220, state: 0 }, { name: 'supplyDrop', x: 1720, y: 220, state: 1 },
  { name: 'wagon', x: 300, y: 560, state: 1 }, { name: 'wagon', x: 1300, y: 560, state: 0 },
  ...[2, 1, 0].map((st, i) => ({ name: 'fortWallH', x: 200 + i * 64, y: 850, state: st })),
  { name: 'fortGate', x: 459, y: 850, state: 1 }, { name: 'fortWallH', x: 586, y: 850, state: 2 }, { name: 'fortTower', x: 660, y: 850, state: 1 },
  ...[2, 1, 0].map((st, i) => ({ name: 'fortWallV', x: 660, y: 915 + i * 64, state: st })),
  { name: 'fortTower', x: 860, y: 850, state: 0 }, { name: 'fortGate', x: 1000, y: 850, state: 0 },
  ...[1, 0].map((st, i) => ({ name: 'barn', x: 1350 + i * 0, y: 820, state: st })).slice(0, 1),
  { name: 'barn', x: 1700, y: 820, state: 0 },
];
for (let x = -32; x < W + 64; x += 64) PROPS.push({ name: 'railH', x, y: 560, state: 1 });

function propsGround(cx: number, cy: number): Ground {
  const x = (cx + 0.5) * CELL;
  const y = (cy + 0.5) * CELL;
  if (x < 800 && y > 60 && y < 400) return 'concrete';
  if (Math.abs(y - 560) < 30) return 'dirt';
  if (y > 700 && x < 1150) return 'dirt';
  return 'grass';
}

function stateOf(name: string): number {
  const s = WORLD.structures[name]!.states;
  return s.includes(state) ? state : s.reduce((a, b) => (Math.abs(b - state) < Math.abs(a - state) ? b : a));
}

// --- drawing -------------------------------------------------------------------------------------------------------------

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function main(): Promise<void> {
  const files = new Set<string>();
  for (const g of Object.values(WORLD.ground)) files.add(g.file).add(g.edge);
  for (const list of Object.values(WORLD.decals)) for (const d of list) files.add(d.file);
  for (const s of Object.values(WORLD.structures)) {
    for (const p of Object.values(s.pieces)) files.add(p.file);
    for (const f of Object.values(s.shadows)) files.add(f);
  }
  for (const f of Object.values(WORLD.vehicles.truck.files)) files.add(f);
  for (const f of Object.values(WORLD.vehicles.fortress.files)) files.add(f);
  await Promise.all([...files].map(load));
  await Promise.all(['hullHeavy', 'driveTracks', 'turretCannon'].map((k) => loadUrl(`tank:${k}`, tankUrls[`../../detail-test/assets/C/${k}.png`]!)));

  const textures = new Map<string, GroundTexture>();
  for (const [name, g] of Object.entries(WORLD.ground)) {
    const px = pixelsOf(img(g.file));
    const edge = pixelsOf(img(g.edge));
    const e = new Uint8Array(g.size * g.size);
    for (let i = 0; i < e.length; i++) e[i] = edge.data[i * 4]!;
    textures.set(name, { name, order: g.order, size: g.size, pixels: px.data, edge: e });
  }
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  canvas.width = W;
  canvas.height = H;
  canvas.style.width = `${W * zoom}px`;
  canvas.style.height = `${H * zoom}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const ground = ctx.createImageData(W, H);
  const terrain = view === 'boss' ? (cx: number, cy: number): Ground => (Math.hypot(cx - 30, cy - 17) < 13 ? 'dirt' : 'grass') : view === 'props' ? propsGround : farmGround;
  const t0 = performance.now();
  composeGround(ground.data, 0, 0, W, H, terrain, textures);
  const ms = Math.round(performance.now() - t0);
  const draw = (): void => {
    ctx.putImageData(ground, 0, 0);
    decals(ctx, terrain);
    if (view === 'boss') boss(ctx);
    else farm(ctx, view === 'props' ? PROPS : FARM);
    (document.getElementById('info') as HTMLElement).textContent =
      `${view} · state ${state} · roofs ${roofs ? 'on' : 'faded'} · ground ${ms} ms · S states, R roofs, F footprints`;
    (window as unknown as { __ready: boolean }).__ready = true;
  };
  draw();
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 's') state = state === 0 ? 2 : state - 1;
    else if (k === 'r') roofs = !roofs;
    else if (k === 'f') feet = !feet;
    else return;
    draw();
  });
  if (zoom > 1) scrollTo(Number(q.get('x') ?? 0) * zoom, Number(q.get('y') ?? 0) * zoom);
}

function decals(ctx: CanvasRenderingContext2D, terrain: (cx: number, cy: number) => Ground): void {
  const r = rng(7);
  const at = (x: number, y: number): Ground => terrain(Math.floor(x / CELL), Math.floor(y / CELL));
  const put = (kind: string, x: number, y: number): void => {
    const list = WORLD.decals[kind]!;
    const d = list[Math.floor(r() * list.length)]!;
    ctx.drawImage(img(d.file), Math.round(x - d.size[0] / 2), Math.round(y - d.size[1] / 2));
  };
  for (let i = 0; i < 700; i++) {
    const x = r() * W;
    const y = r() * H;
    const g = at(x, y);
    if (g === 'grass') put(r() < 0.25 ? 'flowers' : 'tuft', x, y);
    else if (g === 'grassDry') put('tuftDry', x, y);
  }
  // Tufts along the edges of the road, where the grass gives way.
  for (let x = 0; x < W; x += 9) {
    for (const side of [-1, 1]) {
      const y0 = 340 + side * 44;
      for (let y = y0 - 30; y < y0 + 30; y += 6) {
        if (at(x, y) === 'grass' && at(x, y - side * 10) === 'dirt' && r() < 0.6) {
          put('tuft', x + r() * 6, y);
          break;
        }
      }
    }
  }
  if (view !== 'farm') return;
  {
    for (const [x, y] of [[640, 300], [1300, 700]] as const) put('puddle', x, y);
    put('crater', 1600, 760);
    put('scorch', 760, 840);
  }
}

interface Item {
  y: number;
  draw: () => void;
}

function farm(ctx: CanvasRenderingContext2D, list: readonly Placed[]): void {
  const items: Item[] = [];
  const isFarm = list === FARM;
  // Ground-layer pieces (the bridge deck, rail track) are drawn first.
  const deck = WORLD.structures.bridgeDeck!;
  if (isFarm) ctx.drawImage(img(deck.pieces['bridgeDeck-1']!.file), 1062 - deck.anchor[0], 302 - deck.anchor[1]);
  for (const p of list.filter((q) => WORLD.structures[q.name]!.layer === 'ground')) {
    const s = WORLD.structures[p.name]!;
    ctx.drawImage(img(s.pieces[`${p.name}-1`]!.file), p.x - s.anchor[0], p.y - s.anchor[1]);
  }
  for (const p of list) {
    const s = WORLD.structures[p.name]!;
    if (s.layer === 'ground') continue;
    const st = p.state ?? stateOf(p.name);
    const ox = p.x - s.anchor[0];
    const oy = p.y - s.anchor[1];
    ctx.globalAlpha = 1;
    ctx.drawImage(img(s.shadows[String(st)]!), ox, oy);
    for (const key of piecesOf(p.name, st)) {
      const piece = s.pieces[key]!;
      const roof = piece.sortY >= 999;
      items.push({
        y: roof ? 1e6 + p.y : p.y + piece.sortY,
        draw: () => {
          ctx.globalAlpha = roof && !roofs ? 0.3 : 1;
          ctx.drawImage(img(piece.file), ox, oy);
          ctx.globalAlpha = 1;
        },
      });
    }
    if (feet) {
      items.push({
        y: 2e6,
        draw: () => {
          ctx.strokeStyle = '#ff3df0';
          ctx.lineWidth = 1;
          for (const poly of s.footprint[String(st)] ?? []) {
            ctx.beginPath();
            poly.forEach(([x, y], i) => (i ? ctx.lineTo(p.x + x, p.y + y) : ctx.moveTo(p.x + x, p.y + y)));
            ctx.closePath();
            ctx.stroke();
          }
        },
      });
    }
  }
  // A heavy tank from the density test, for scale, and the supply truck on the road.
  if (!isFarm) {
    items.push({ y: 300, draw: () => tank(ctx, 420, 330, 0.2) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    return;
  }
  items.push({ y: 470, draw: () => tank(ctx, 880, 470, 0.5) });
  items.push({ y: 300, draw: () => sprite(ctx, img(WORLD.vehicles.truck.files[state ? 'truck-1' : 'truck-0']!), 1240, 300, Math.PI / 2) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
}

function sprite(ctx: CanvasRenderingContext2D, i: HTMLImageElement, x: number, y: number, a: number, shadow = true): void {
  if (shadow) {
    ctx.save();
    ctx.translate(x + WORLD.sun.shadow[0] * 6, y + WORLD.sun.shadow[1] * 6);
    ctx.rotate(a);
    ctx.globalAlpha = 0.34;
    ctx.filter = 'brightness(0)';
    ctx.drawImage(i, -i.width / 2, -i.height / 2);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.drawImage(i, -i.width / 2, -i.height / 2);
  ctx.restore();
}

function tank(ctx: CanvasRenderingContext2D, x: number, y: number, a: number): void {
  sprite(ctx, img('tank:driveTracks'), x, y, a);
  sprite(ctx, img('tank:hullHeavy'), x, y, a, false);
  sprite(ctx, img('tank:turretCannon'), x + Math.sin(a) * -4, y + Math.cos(a) * 4, a - 0.4, false);
}

function boss(ctx: CanvasRenderingContext2D): void {
  const f = WORLD.vehicles.fortress;
  const cx = 960;
  const cy = 540;
  const a = -0.35;
  sprite(ctx, img(f.files['fortress-treads']!), cx, cy, a);
  sprite(ctx, img(f.files['fortress-body']!), cx, cy, a, false);
  const dead = state === 0 ? ['cannon', 'mgLeft', 'mgRight', 'rockets'] : state === 1 ? ['mgLeft', 'rockets'] : [];
  for (const [mount, m] of Object.entries(f.mounts)) {
    const [mx, my] = m.at;
    const x = cx + mx * Math.cos(a) - my * Math.sin(a);
    const y = cy + mx * Math.sin(a) + my * Math.cos(a);
    const key = `${m.turret}-${dead.includes(mount) ? 0 : 1}`;
    sprite(ctx, img(f.files[key]!), x, y, a + (mount === 'cannon' ? 0.5 : 0), false);
  }
  tank(ctx, 1460, 760, -2.4);
  sprite(ctx, img(WORLD.vehicles.truck.files['truck-1']!), 520, 300, 2.2);
  sprite(ctx, img(WORLD.vehicles.truck.files['truck-0']!), 420, 820, 0.7);
}

main().catch((e: unknown) => {
  (document.getElementById('info') as HTMLElement).textContent = String(e);
  throw e;
});
