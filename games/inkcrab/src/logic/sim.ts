import { AIR, boxHitsSolid, climbBody, jump, moveBody, PHYS, WATER, type Body, type Box, type Ledge } from './body';
import { makeBird, patrolY, pullUp, stepBird, underSky, type Bird, type BirdSpecies } from './birds';
import { armTip, CRITTER, critterPoints, stepCritter, stranded, type Critter, type Surroundings } from './critters';
import { placeCritter, SPAWN_AWAY } from './spawn';
import { columnsAround, pourStep } from './dunes';
import { movementOf, SPECIES, type SpeciesId } from './species';
import { Shore, type TideBrings } from './shore';
import { isLowWater, type TideSpec } from './tide';
import { isWet, type Water } from './water';
import { settleColumn } from './sandfall';
import { digColumns, diggableOf, digTargets, inReach, placeTarget, tileSpan, type TilePos } from './dig';
import { feed, initialGrowth, isCapped, settle, type Growth } from './growth';
import { buriedFood, centre, food, makeItem, overlaps, shell, type Item } from './items';
import { createRng, type Rng } from './rng';
import { inRoots, isLedge, isRoot, perchRow, type Roots } from './roots';
import { canWear, crabBox, MOUTH_OFFSET, sandCapacity, shellPx, SHELLS, speedFactor, type ShellKind } from './shells';
import { startSwap, tickSwap, type Swap } from './swap';
import { blasts, throwSpeed, type Vent } from './vents';
import { FOG, fogAt, type FogSpec } from './fog';
import { KELP, underKelp, wrackColumn, type WrackSpec } from './kelp';
import { canRap, inShell, isRival, makeRival, RIVAL, stepRival, type RivalSpec } from './rivals';
import { dig, isDiggable, isSolid, place, surfaceRow, tileAt, TILE, type Terrain } from './terrain';

export interface Input {
  /** -1..1 */
  readonly moveX: number;
  readonly aimY: -1 | 0 | 1;
  /** Pressed this frame: leap. */
  readonly jump: boolean;
  /** Held: dig where aimed, repeating as fast as the shell allows. */
  readonly dig: boolean;
  /** Held: put down carried sand where aimed, one clump per repeat. */
  readonly place: boolean;
  /** Pressed this frame: move into the shell underfoot. */
  readonly interact: boolean;
  /** A tapped tile (touch): dig it, or fill it with carried sand. */
  readonly tapTile: TilePos | null;
  /** Held: pull into the shell. Safe from anything, but it can't move. */
  readonly hide: boolean;
}

export const IDLE: Input = { moveX: 0, aimY: 0, jump: false, dig: false, place: false, interact: false, tapTile: null, hide: false };

export type SimEvent =
  | { readonly type: 'ate'; readonly id: number; readonly points: number; readonly banked: number; readonly x: number; readonly y: number }
  | { readonly type: 'grew'; readonly size: number }
  /** Tiles that changed. `poured`: dune sand running, as from/to pairs. */
  | { readonly type: 'tiles'; readonly tiles: readonly TilePos[]; readonly dug: boolean; readonly poured?: boolean }
  | { readonly type: 'revealed'; readonly id: number }
  | { readonly type: 'spawned'; readonly id: number }
  | { readonly type: 'swapStart'; readonly id: number }
  | { readonly type: 'caught'; readonly x: number; readonly y: number; readonly lives: number; readonly by: HunterId }
  /** A bird's stoop glanced off the shell of a hiding crab. */
  | { readonly type: 'struck'; readonly x: number; readonly y: number }
  /** A steam vent threw the crab into the air. */
  | { readonly type: 'thrown'; readonly x: number; readonly y: number }
  /** The crab rapped on a rival's shell and it let go: `item` is the shell, now loose. */
  | { readonly type: 'rapped'; readonly x: number; readonly y: number; readonly item: number }
  | { readonly type: 'won' }
  | { readonly type: 'lost' }
  | { readonly type: 'swapDone'; readonly from: ShellKind | null; readonly to: ShellKind; readonly grew: number; readonly dropped: number | null };

export interface CrabState {
  readonly body: Body;
  readonly facing: 1 | -1;
  readonly growth: Growth;
  readonly shell: ShellKind | null;
  /** Clumps of sand carried: up to the shell's sandCapacity, or past it after moving into a smaller one. */
  readonly sand: number;
  readonly swap: Swap | null;
  readonly digCooldown: number;
  /** Pulled into its shell this frame. */
  readonly hidden: boolean;
  /** Seconds left of the grace after being caught, when nothing can catch it again. */
  readonly safe: number;
  /** Holding on in the mangrove roots: no gravity, it climbs whichever way it's steered. */
  readonly climbing: boolean;
}

export interface BeachSetup {
  readonly terrain: Terrain;
  readonly items: readonly Item[];
  /** Bottom-centre of the crab at the start. */
  readonly start: { readonly x: number; readonly y: number };
  readonly tileSize: number;
  readonly startShell: ShellKind | null;
  readonly seed: number;
  /** How many loose food items the surface is kept stocked with. */
  readonly surfaceFood: number;
  /** How many things to eat are kept buried a dig or two under the surface (default none). */
  readonly shallowFood?: number;
  /** Ghost crabs that roam the beach, kept stocked group by group (default none). */
  readonly critters?: readonly CritterGroup[];
  /** The crab's growth at the start (default size 1, empty). */
  readonly startGrowth?: Growth;
  /** Size that wins the level; without one the beach is a sandbox. */
  readonly goal?: number;
  /** Lives for the level (default 3). */
  readonly lives?: number;
  /** Antlion pits: column of the bottom and reach in tiles. A crab on the slope slides in. */
  readonly pits?: readonly (readonly [number, number])[];
  /** Birds hunting from the sky (default none). */
  readonly birds?: readonly BirdGroup[];
  /** The tide (default none: a dry beach). */
  readonly tide?: TideSpec;
  /** Rock pools, as carved (first column, width, depth): they start full. */
  readonly pools?: readonly (readonly [number, number, number])[];
  /** Octopus dens: open tiles in the rock. */
  readonly dens?: readonly (readonly [number, number])[];
  /** What each high water washes in. */
  readonly tideBrings?: TideBrings;
  /** Mangrove roots to climb (default none). */
  readonly roots?: Roots;
  /** Steam vents (default none). */
  readonly vents?: readonly Vent[];
  /** Sea fog (default none). */
  readonly fog?: FogSpec;
  /** Kelp wrack on the sand (default none). */
  readonly wrack?: readonly WrackSpec[];
  /** Rival hermit crabs, each in its shell (default none). Never restocked. */
  readonly rivals?: readonly RivalSpec[];
}

/** Birds a level keeps overhead: how many, and how big (they hunt crabs smaller than that). */
export interface BirdGroup {
  readonly count: number;
  readonly size: number;
  /** Default: kestrels. */
  readonly species?: BirdSpecies;
}

/** A kind of ghost crab a level keeps around: how many at once, and their sizes. */
export interface CritterGroup {
  readonly count: number;
  readonly sizes: readonly [number, number];
  /** Default: ghost crabs. */
  readonly species?: SpeciesId;
  /** Columns, first and last, walkers and burrowers of this group appear between (default anywhere). */
  readonly cols?: readonly [number, number];
}

export type Outcome = 'playing' | 'won' | 'lost';

/** Whatever catches the crab: a creature, or a bird. */
export type HunterId = SpeciesId | BirdSpecies;

const DIG_SECONDS = 0.22;
/** Jump height in a light shell, tiles: 2.5 at size 1, growing with the crab (about 5.3 at size 8). */
const JUMP_TILES = { base: 2.1, perSize: 0.4 } as const;
const WALKING = 0.1;
const FOOD_EVERY = 2.5;
const SHALLOW_EVERY = 4;
/** Shallow food goes in the top row of sand or the one under it: one dig or two. */
const SHALLOW_ROWS = 2;
/** Tiles either side of the crab where shallow food is never planted, so it doesn't appear under its feet. */
const SHALLOW_CLEAR = 3;
const REACH_PAD = 6;
/** Seconds nothing can catch the crab again after it's been caught. */
const SAFE_SECONDS = 2.5;
const CRITTER_EVERY = 3;
/** Seconds between pours of dune sand: one row a tick, so a slope visibly runs. */
const POUR_EVERY = 0.05;
/** px/s a pit's slope slides a crab towards the antlion at the bottom: less than it walks, so it can climb out. */
export const PIT_PULL = 34;
/**
 * Under water the crab walks at `speed` of its pace. Each press of jump is a
 * swim stroke, standing or not: a kick rising `kick` tiles, so it can paddle
 * up out of any pool; at the surface the stroke carries it out (`out`, a
 * share of its jump on land), onto the rim.
 */
const SWIM = { speed: 0.6, kick: 1.3, out: 0.8 } as const;
/**
 * In the roots the crab climbs at `speed` of its walking pace (a heavy
 * shell slows it as on the ground); jumping lets go with a hop, `hop` of a
 * jump from the ground.
 */
const CLIMB = { speed: 0.85, hop: 0.75 } as const;
/** Mud: slow going on top (`speed` of its pace, `jump` of its leap), but quick to dig (`dig` of the time). */
const MUD = { speed: 0.75, jump: 0.85, dig: 0.5 } as const;
/** Share of surface food that turns up on a root top, where a column has roots. */
const PERCHED_FOOD = 0.45;
export const LIVES = 3;

/**
 * The test beach's rules, independent of Phaser: walking, eating, the
 * growth cap and bank, digging and placing sand, and moving house.
 * Scenes read the state and react to the events `step` returns.
 */
export class Beach {
  readonly terrain: Terrain;
  readonly tileSize: number;
  readonly items = new Map<number, Item>();
  readonly critters = new Map<number, Critter>();
  readonly birds = new Map<number, Bird>();
  readonly pits: readonly (readonly [number, number])[];
  readonly dens: readonly (readonly [number, number])[];
  /** The sea, on a tidal beach. */
  readonly shore: Shore | null;
  /** Mangrove roots, on the mangrove beach. */
  readonly roots: Roots | null;
  /** Steam vents, on the volcanic beach. */
  readonly vents: readonly Vent[];
  /** Sea fog and kelp wrack, on the cold kelp coast. */
  readonly fog: FogSpec | undefined;
  readonly wrack: readonly WrackSpec[];
  readonly goal: number | null;
  crab: CrabState;
  lives: number;
  outcome: Outcome = 'playing';
  /** What caught the crab last, for the result card. */
  caughtBy: HunterId | null = null;
  /** Seconds played. */
  elapsed = 0;
  nearbyShell: Item | null = null;
  nearbyFits = false;
  /** The nearest rival close enough, and small enough, to rap on its shell. E moves into a fitting shell first. */
  nearbyRival: Critter | null = null;
  private readonly hasRivals: boolean;
  private readonly rng: Rng;
  private readonly surfaceFood: number;
  private readonly shallowFood: number;
  /** Shallow food planted by restockShallow, counted until it's dug up or eaten. */
  private readonly shallow = new Set<number>();
  private nextId: number;
  private foodTimer = 0;
  private shallowTimer = 0;
  private critterTimer = 0;
  private readonly groups: readonly CritterGroup[];
  /** Which group each ghost crab belongs to, so an eaten one is replaced in kind. */
  private readonly groupOf = new Map<number, number>();
  /** Columns where dune sand may pour next tick; empty when it all rests. */
  private readonly pouring = new Set<number>();
  private readonly hasDunes: boolean;
  private pourTimer = 0;
  private pourFlip = false;
  /** Root tops as ledges to stand on; undefined without roots. */
  private readonly ledge: Ledge | undefined;
  /** The last blow of each vent that threw each body ("vent:id", the crab being -1): once a blow. */
  private readonly thrown = new Map<string, number>();

  constructor(setup: BeachSetup) {
    this.terrain = setup.terrain;
    this.tileSize = setup.tileSize;
    this.rng = createRng(setup.seed);
    this.surfaceFood = setup.surfaceFood;
    this.shallowFood = setup.shallowFood ?? 0;
    this.groups = setup.critters ?? [];
    this.goal = setup.goal ?? null;
    this.lives = setup.lives ?? LIVES;
    this.pits = setup.pits ?? [];
    this.dens = setup.dens ?? [];
    this.hasDunes = setup.terrain.tiles.includes(TILE.loose);
    this.shore = setup.tide ? new Shore(this.terrain, this.tileSize, setup.tide, setup.tideBrings, setup.pools ?? []) : null;
    const roots = setup.roots ?? null;
    this.roots = roots;
    this.ledge = roots ? (x, y) => isLedge(roots, x, y) : undefined;
    this.vents = setup.vents ?? [];
    this.fog = setup.fog;
    this.wrack = setup.wrack ?? [];
    for (const item of setup.items) this.items.set(item.id, item);
    this.nextId = Math.max(0, ...setup.items.map((i) => i.id)) + 1;
    const growth = setup.startGrowth ?? initialGrowth();
    const { w, h } = crabBox(growth.size, setup.startShell);
    this.crab = {
      body: { x: setup.start.x - w / 2, y: setup.start.y - h, w, h, vx: 0, vy: 0, onGround: false },
      facing: 1, growth, shell: setup.startShell, sand: 0, swap: null, digCooldown: 0, hidden: false, safe: 0, climbing: false,
    };
    this.groups.forEach((g, i) => {
      for (let n = 0; n < g.count; n++) this.spawnCritter(i, true);
    });
    for (const g of setup.birds ?? []) for (let n = 0; n < g.count; n++) this.spawnBird(g);
    this.hasRivals = (setup.rivals?.length ?? 0) > 0;
    for (const spec of setup.rivals ?? []) {
      const k = makeRival(this.terrain, this.nextId++, spec, this.tileSize);
      this.critters.set(k.id, k);
    }
    for (let tries = 0; this.shallow.size < this.shallowFood && tries < this.shallowFood * 8; tries++) this.plantShallow();
  }

  /** World y of the sea's surface now (below the world on a dry beach). */
  get seaY(): number {
    return this.shore ? this.shore.seaY(this.elapsed) : Infinity;
  }

  get tide(): TideSpec | null {
    return this.shore?.tide ?? null;
  }

  /** Where the water is; null on a dry beach. */
  get water(): Water | null {
    return this.shore?.water ?? null;
  }

  /** Whether a box's middle is under water. */
  submerged(b: Box): boolean {
    if (!this.water) return false;
    const m = centre(b);
    return isWet(this.water, Math.floor(m.x / this.tileSize), Math.floor(m.y / this.tileSize));
  }

  private get surroundings(): Surroundings {
    const w = this.water;
    const r = this.roots;
    return { wet: w ? (x, y) => isWet(w, x, y) : () => false, root: r ? (x, y) => isRoot(r, x, y) : undefined };
  }

  /** Whether the crab (or any box) is among the mangrove roots, where it can climb and a heron can't stab it. */
  inRoots(b: Box): boolean {
    return inRoots(this.roots, b, this.tileSize);
  }

  /** How thick the fog is over a body now, 0..1. */
  fogOver(b: Box): number {
    return fogAt(this.fog, this.terrain.width, (b.x + b.w / 2) / this.tileSize, this.elapsed);
  }

  /** Whether a body is down among the kelp wrack. */
  underKelp(b: Box): boolean {
    return underKelp(this.terrain, this.wrack, b, this.tileSize);
  }

  /** Standing on mud (not climbing beside it). */
  onMud(b: Body): boolean {
    const T = this.tileSize;
    return b.onGround && !this.crab.climbing && tileAt(this.terrain, Math.floor((b.x + b.w / 2) / T), Math.floor((b.y + b.h + 1) / T)) === TILE.mud;
  }

  /** Body size the current shell allows; naked crabs don't grow. */
  get cap(): number {
    return this.crab.shell ? SHELLS[this.crab.shell].maxSize : this.crab.growth.size;
  }

  /** Clumps of sand the current shell holds. */
  get sandCapacity(): number {
    return sandCapacity(this.crab.shell ? SHELLS[this.crab.shell] : null);
  }

  get capped(): boolean {
    return isCapped(this.crab.growth, this.cap);
  }

  /** Out of a shell: mid-swap (and, once predators land, after losing one). */
  get exposed(): boolean {
    return this.crab.shell === null || this.crab.swap !== null;
  }

  step(input: Input, dt: number): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.outcome !== 'playing') return events;
    this.elapsed += dt;
    const c = this.crab;
    const hidden = input.hide && c.shell !== null && c.swap === null;
    // Pulling into the shell (or moving house) lets go of the roots.
    this.crab = { ...c, safe: Math.max(0, c.safe - dt), hidden, climbing: c.climbing && !hidden && c.swap === null };
    if (this.crab.swap) this.tickSwap(dt, events);
    else if (this.crab.hidden) this.crab = { ...this.crab, body: this.slide(this.crab.body, 0, 0, dt) };
    else this.act(input, dt, events);
    this.blow(events);
    this.settleSand(events);
    this.pour(dt, events);
    this.flow(dt, events);
    this.settleItems(dt, events);
    this.moveCritters(dt);
    this.meetCritters(events);
    this.moveBirds(dt, events);
    this.restock(dt, events);
    this.restockShallow(dt, events);
    this.restockCritters(dt);
    this.findNearbyShell();
    this.checkOutcome(events);
    return events;
  }

  private act(input: Input, dt: number, events: SimEvent[]): void {
    const c = this.crab;
    const shellSpec = c.shell ? SHELLS[c.shell] : null;
    const swimming = this.submerged(c.body);
    const mud = this.onMud(c.body);
    const speed = (60 + 5 * c.growth.size) * speedFactor(shellSpec) * (swimming ? SWIM.speed : 1) * (mud ? MUD.speed : 1);
    const facing = input.moveX > WALKING ? 1 : input.moveX < -WALKING ? -1 : c.facing;
    const moved = this.move(input, speed, swimming, mud, dt);
    this.crab = { ...c, body: moved.body, climbing: moved.climbing, facing, digCooldown: Math.max(0, c.digCooldown - dt) };
    if (this.crab.digCooldown === 0) {
      if (input.tapTile) this.tapTile(input.tapTile, events);
      else if (input.dig) this.dig(input, events);
      else if (input.place) this.place(input, events);
    }
    if (input.interact && this.nearbyShell && this.nearbyFits) {
      this.crab = { ...this.crab, swap: startSwap(this.nearbyShell.id) };
      events.push({ type: 'swapStart', id: this.nearbyShell.id });
    } else if (input.interact && this.nearbyRival) this.rap(this.nearbyRival, events);
    this.eat(events);
  }

  /**
   * The crab's own movement. In the mangrove roots, holding up takes hold:
   * then it climbs whichever way it's steered and hangs there when let be,
   * until it jumps off, pulls into its shell or climbs out of the tangle.
   * Otherwise it walks, jumps and swims, standing on root tops as ledges
   * unless it's holding down (dropping through).
   */
  private move(input: Input, speed: number, swimming: boolean, mud: boolean, dt: number): { body: Body; climbing: boolean } {
    const b = this.crab.body;
    const grip = this.inRoots(b);
    // A fresh hold needs up without dig (that's digging up) and not on the way up from a jump or a hop off the roots.
    const grab = input.aimY === -1 && !input.jump && !input.dig && b.vy >= 0;
    const climbing = grip && (this.crab.climbing || grab);
    if (climbing && input.jump) {
      return { body: this.slide({ ...b, vy: -this.jumpSpeed * CLIMB.hop, onGround: false }, input.moveX, speed, dt), climbing: false };
    }
    if (climbing) return this.climb(b, input, speed * CLIMB.speed, dt);
    const launched = !input.jump ? b : swimming ? this.stroke(b) : jump(b, this.jumpSpeed * (mud ? Math.sqrt(MUD.jump) : 1));
    return { body: this.slide(launched, input.moveX, speed, dt, input.aimY === 1), climbing: false };
  }

  /**
   * One step of climbing. Climbing out of the tangle lets go: off the top
   * it lands on the root it climbed, out of the side or bottom it drops.
   * Climbing down onto the ground, it stands.
   */
  private climb(b: Body, input: Input, speed: number, dt: number): { body: Body; climbing: boolean } {
    const ix = Math.abs(input.moveX) > WALKING ? Math.sign(input.moveX) : 0;
    const next = climbBody(this.terrain, b, ix, input.aimY, speed, dt, this.tileSize);
    if (!this.inRoots(next)) return { body: { ...next, vy: 0, onGround: false }, climbing: false };
    // Moving keeps the legs going (see the crab view); hanging still, it's off the ground.
    return { body: { ...next, onGround: next.onGround || ix !== 0 || input.aimY !== 0 }, climbing: !next.onGround || input.aimY !== 1 };
  }

  /**
   * Walks the crab, adding the pull of any pit slope it stands on; under
   * water it sinks gently. It stands on root tops unless `drop` (holding down).
   */
  private slide(b: Body, intent: number, speed: number, dt: number, drop = false): Body {
    const vx = intent * speed + this.pitPull(b);
    return moveBody(this.terrain, b, vx === 0 ? 0 : Math.sign(vx), Math.abs(vx), dt, this.tileSize, this.submerged(b) ? WATER : AIR, drop ? undefined : this.ledge);
  }

  /**
   * On the slope of an antlion pit, sand runs out from under the crab
   * towards the bottom: the antlion flicks it from under. A pit with no
   * antlion in it, one filled level, or a crab below its bottom pulls no more.
   */
  pitPull(b: Body): number {
    if (!b.onGround || !this.pits.length) return 0;
    const T = this.tileSize;
    const cx = (b.x + b.w / 2) / T;
    const col = Math.floor(cx);
    const feet = Math.round((b.y + b.h) / T);
    for (const [pitCol, reach] of this.pits) {
      if (!this.antlionIn(pitCol)) continue;
      const off = pitCol + 0.5 - cx;
      if (Math.abs(off) > reach + 0.5 || Math.abs(off) < 0.25) continue;
      if (Math.abs(feet - surfaceRow(this.terrain, col)) > 1 || surfaceRow(this.terrain, pitCol) <= feet) continue;
      return Math.sign(off) * PIT_PULL;
    }
    return 0;
  }

  /** Whether an antlion sits at the bottom of the pit at `pitCol`. */
  antlionIn(pitCol: number): boolean {
    for (const k of this.critters.values()) {
      if (movementOf(k.species) === 'lurk' && Math.floor(centre(k).x / this.tileSize) === pitCol) return true;
    }
    return false;
  }

  /** Take-off speed (px/s) for the current height: bigger crabs leap higher, heavier shells hold them down. */
  private get jumpSpeed(): number {
    const c = this.crab;
    const tiles = (JUMP_TILES.base + JUMP_TILES.perSize * c.growth.size) * speedFactor(c.shell ? SHELLS[c.shell] : null);
    return Math.sqrt(2 * PHYS.gravity * tiles * this.tileSize);
  }

  /** A swim stroke: a kick up through the water, or, at the surface, up and out. */
  private stroke(b: Body): Body {
    const T = this.tileSize;
    const above = Math.floor(b.y / T) - 1;
    const atSurface = !this.water || !isWet(this.water, Math.floor((b.x + b.w / 2) / T), above);
    const speed = atSurface ? this.jumpSpeed * SWIM.out : Math.sqrt(2 * WATER.gravity * SWIM.kick * T);
    return { ...b, vy: Math.min(b.vy, -speed), onGround: false };
  }

  private get cooldown(): number {
    return DIG_SECONDS / speedFactor(this.crab.shell ? SHELLS[this.crab.shell] : null);
  }

  private dig(input: Input, events: SimEvent[]): void {
    const c = this.crab;
    const walking = Math.abs(input.moveX) > WALKING;
    const dug = this.removeTiles(diggableOf(this.terrain, digTargets(c.body, c.facing, input.aimY, walking, this.tileSize)), events);
    if (dug && input.aimY !== 0 && !walking) this.centreOverDig();
  }

  private place(input: Input, events: SimEvent[]): void {
    const c = this.crab;
    const at = placeTarget(this.terrain, c.body, c.facing, input.aimY, this.tileSize);
    if (at) this.addTile(at, events);
  }

  /** Touch: a tapped tile next to the crab is dug if it's sand, filled if it's open. */
  private tapTile(tap: TilePos, events: SimEvent[]): void {
    const T = this.tileSize;
    if (!inReach(this.crab.body, tap, T)) return;
    if (diggableOf(this.terrain, [tap]).length) this.removeTiles([tap], events);
    else if (!overlaps(this.crab.body, { x: tap[0] * T, y: tap[1] * T, w: T, h: T })) this.addTile(tap, events);
  }

  /**
   * Each dug tile is a clump, kept in the shell. Sand is never lost: once
   * the shell is full the crab digs nothing more until it puts some down.
   */
  private removeTiles(tiles: readonly TilePos[], events: SimEvent[]): boolean {
    const taken = tiles.slice(0, Math.max(0, this.sandCapacity - this.crab.sand));
    if (!taken.length) return false;
    // Soft mud digs quicker than sand.
    const soft = taken.every(([x, y]) => tileAt(this.terrain, x, y) === TILE.mud);
    for (const [x, y] of taken) dig(this.terrain, x, y);
    events.push({ type: 'tiles', tiles: taken, dug: true });
    this.crab = { ...this.crab, sand: this.crab.sand + taken.length, digCooldown: this.cooldown * (soft ? MUD.dig : 1) };
    return true;
  }

  /**
   * After digging straight down or up, lines the crab up with the hole: a
   * hole is only as wide as the crab, so without this it would straddle it.
   */
  private centreOverDig(): void {
    const b = this.crab.body;
    const T = this.tileSize;
    const c = digColumns(b, T);
    const x = ((c.x0 + c.x1 + 1) / 2) * T - b.w / 2;
    if (!boxHitsSolid(this.terrain, { ...b, x }, T)) this.crab = { ...this.crab, body: { ...b, x } };
  }

  private addTile(at: TilePos, events: SimEvent[]): void {
    if (this.crab.sand <= 0 || !place(this.terrain, at[0], at[1])) return;
    this.crab = { ...this.crab, sand: this.crab.sand - 1, digCooldown: this.cooldown };
    events.push({ type: 'tiles', tiles: [at], dug: false });
  }

  /**
   * Loose sand around the crab falls. Sand only changes within the crab's
   * reach, and a clump resting on its head drops once
   * it walks away, so the columns near it are all that need checking.
   */
  private settleSand(events: SimEvent[]): void {
    const T = this.tileSize;
    const s = tileSpan(this.crab.body, T);
    const onCrab = (x: number, y: number): boolean => overlaps(this.crab.body, { x: x * T, y: y * T, w: T, h: T });
    const changed: TilePos[] = [];
    for (let x = s.x0 - 2; x <= s.x1 + 2; x++) changed.push(...settleColumn(this.terrain, x, onCrab));
    if (changed.length) events.push({ type: 'tiles', tiles: changed, dug: false });
  }

  /**
   * Dune sand near anything that changed pours, a row a tick, around the
   * crab, the creatures and anything dug up (it rests on them rather than
   * burying them, so food just uncovered can still be eaten).
   */
  private pour(dt: number, events: SimEvent[]): void {
    if (!this.hasDunes) return;
    for (const e of events) if (e.type === 'tiles') for (const x of columnsAround(e.tiles)) this.pouring.add(x);
    this.pourTimer += dt;
    if (this.pourTimer < POUR_EVERY || !this.pouring.size) return;
    this.pourTimer = 0;
    const T = this.tileSize;
    const cell = (x: number, y: number): Box => ({ x: x * T, y: y * T, w: T, h: T });
    const walkers = [...this.critters.values()].filter((k) => movementOf(k.species) === 'walk');
    const uncovered = [...this.items.values()].filter((i) => !i.buried);
    const blocked = (x: number, y: number): boolean => {
      const c = cell(x, y);
      return overlaps(this.crab.body, c) || walkers.some((k) => overlaps(k, c)) || uncovered.some((i) => overlaps(i, c));
    };
    const cols = [...this.pouring];
    this.pouring.clear();
    this.pourFlip = !this.pourFlip;
    const changed = pourStep(this.terrain, cols, blocked, this.pourFlip);
    if (!changed.length) return;
    events.push({ type: 'tiles', tiles: changed, dug: false, poured: true });
    for (const x of columnsAround(changed)) this.pouring.add(x);
  }

  private eat(events: SimEvent[]): void {
    for (const item of this.items.values()) {
      if (item.buried || item.kind.type !== 'food' || !overlaps(this.crab.body, item, 2)) continue;
      const r = feed(this.crab.growth, item.kind.points, this.cap);
      this.crab = { ...this.crab, growth: r.growth };
      this.items.delete(item.id);
      const at = centre(item);
      events.push({ type: 'ate', id: item.id, points: item.kind.points, banked: r.banked, x: at.x, y: at.y });
      if (r.grew) events.push({ type: 'grew', size: r.growth.size });
    }
  }

  private tickSwap(dt: number, events: SimEvent[]): void {
    const c = this.crab;
    const r = tickSwap(c.swap!, dt);
    // Gravity (and a pit's slope) still apply to a crab caught mid-swap.
    const body = this.slide(c.body, 0, 0, dt);
    if (!r.done) {
      this.crab = { ...c, body, swap: r.swap };
      return;
    }
    const target = this.items.get(r.swap.itemId);
    if (!target || target.kind.type !== 'shell') {
      this.crab = { ...c, body, swap: null };
      return;
    }
    this.items.delete(target.id);
    const to = target.kind.shell;
    let dropped: number | null = null;
    if (c.shell) {
      dropped = this.nextId++;
      const old = makeItem(dropped, { type: 'shell', shell: c.shell }, 0, 0, false);
      const at = centre(body);
      this.items.set(dropped, { ...old, x: at.x - old.w / 2, y: body.y + body.h - old.h });
    }
    const burst = settle(c.growth, SHELLS[to].maxSize);
    const moved = this.intoNewShell(body, c, to, burst.growth.size);
    const fitted = this.refit(moved, burst.growth.size, to, events);
    // It crawled in through the mouth, so it now faces back towards the old shell.
    this.crab = {
      ...c, body: fitted.body, facing: moved === body ? c.facing : c.facing === 1 ? -1 : 1,
      growth: burst.growth, shell: to, swap: null,
    };
    // Sand it shoved aside is carried too, even past what the shell holds: it
    // digs nothing more until it unloads (see removeTiles).
    this.crab = { ...this.crab, sand: this.crab.sand + fitted.shoved };
    events.push({ type: 'swapDone', from: c.shell, to, grew: burst.grew, dropped });
    if (burst.grew) events.push({ type: 'grew', size: burst.growth.size });
  }

  /**
   * The new shell lies mouth to mouth with the old one, ahead of the crab;
   * moving in carries the body over to it. Against a wall, it stays put.
   */
  private intoNewShell(body: Body, c: CrabState, to: ShellKind, size: number): Body {
    const from = shellPx(c.shell ? SHELLS[c.shell].maxSize : c.growth.size);
    const shift = c.facing * MOUTH_OFFSET * (from + shellPx(SHELLS[to].maxSize));
    // Test the new shell's footprint there, not the old body's.
    const { w, h } = crabBox(size, to);
    const cx = body.x + body.w / 2 + shift;
    const fits = !boxHitsSolid(this.terrain, { x: cx - w / 2, y: body.y + body.h - h, w, h }, this.tileSize);
    return fits ? { ...body, x: body.x + shift } : body;
  }

  /** Resizes the crab around its feet; a bigger shell shoves aside any sand it now overlaps. */
  private refit(body: Body, size: number, shellKind: ShellKind | null, events: SimEvent[]): { body: Body; shoved: number } {
    const { w, h } = crabBox(size, shellKind);
    const next: Body = { ...body, x: body.x + body.w / 2 - w / 2, y: body.y + body.h - h, w, h };
    if (!boxHitsSolid(this.terrain, next, this.tileSize)) return { body: next, shoved: 0 };
    const s = tileSpan(next, this.tileSize);
    const cleared: TilePos[] = [];
    for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) if (dig(this.terrain, x, y)) cleared.push([x, y]);
    if (cleared.length) events.push({ type: 'tiles', tiles: cleared, dug: true });
    return { body: next, shoved: cleared.length };
  }

  private settleItems(dt: number, events: SimEvent[]): void {
    const T = this.tileSize;
    for (const item of this.items.values()) {
      if (item.buried) {
        const at = centre(item);
        if (isSolid(this.terrain, Math.floor(at.x / T), Math.floor(at.y / T))) continue;
        this.items.set(item.id, { ...item, buried: false });
        events.push({ type: 'revealed', id: item.id });
        continue;
      }
      // A freshly uncovered item may still be wedged in sand; it drops once there's room.
      if (boxHitsSolid(this.terrain, item, T)) continue;
      const moved = moveBody(this.terrain, item, 0, 0, dt, T, AIR, this.ledge);
      this.items.set(item.id, { ...item, ...moved });
    }
  }

  private restock(dt: number, events: SimEvent[]): void {
    if (this.surfaceFood <= 0) return;
    this.foodTimer += dt;
    if (this.foodTimer < FOOD_EVERY) return;
    this.foodTimer = 0;
    let loose = 0;
    for (const i of this.items.values()) if (i.kind.type === 'food' && !i.buried) loose++;
    if (loose >= this.surfaceFood) return;
    const T = this.tileSize;
    // Beach hoppers live in the kelp wrack: some of it turns up there.
    const inKelp = this.wrack.length > 0 && this.rng() < KELP.food ? wrackColumn(this.wrack, this.rng()) : null;
    const tx = inKelp ?? 2 + Math.floor(this.rng() * (this.terrain.width - 4));
    const kind = food(inKelp !== null || this.rng() >= 0.7 ? 'hopper' : 'crumb');
    const id = this.nextId++;
    const proto = makeItem(id, kind, 0, 0, false);
    // Where mangroves grow, some of it turns up on the roots: worth the climb.
    const perch = perchRow(this.roots, tx);
    const surface = surfaceRow(this.terrain, tx);
    const ground = (perch !== null && perch < surface - 1 && this.rng() < PERCHED_FOOD ? perch : surface) * T;
    this.items.set(id, { ...proto, x: tx * T + T / 2 - proto.w / 2, y: ground - proto.h });
    events.push({ type: 'spawned', id });
  }

  /** Tops the shallow food back up now and then, at random, like the surface food. */
  private restockShallow(dt: number, events: SimEvent[]): void {
    if (this.shallowFood <= 0) return;
    this.shallowTimer += dt;
    if (this.shallowTimer < SHALLOW_EVERY) return;
    this.shallowTimer = 0;
    for (const id of this.shallow) if (!this.items.get(id)?.buried) this.shallow.delete(id);
    if (this.shallow.size >= this.shallowFood) return;
    const id = this.plantShallow();
    if (id !== null) events.push({ type: 'spawned', id });
  }

  /** Buries one thing to eat in solid sand a dig or two down, away from the crab; null if the spot it picked won't do. */
  private plantShallow(): number | null {
    const T = this.tileSize;
    const tx = 2 + Math.floor(this.rng() * (this.terrain.width - 4));
    const crab = Math.floor(centre(this.crab.body).x / T);
    if (Math.abs(tx - crab) <= SHALLOW_CLEAR) return null;
    const depth = Math.floor(this.rng() * SHALLOW_ROWS);
    const ty = surfaceRow(this.terrain, tx) + depth;
    if (!isDiggable(this.terrain, tx, ty)) return null;
    for (const i of this.items.values()) {
      const at = centre(i);
      if (i.buried && Math.floor(at.x / T) === tx && Math.floor(at.y / T) === ty) return null;
    }
    const id = this.nextId++;
    const proto = makeItem(id, food(buriedFood(depth, this.rng())), 0, 0, true);
    this.items.set(id, { ...proto, x: tx * T + T / 2 - proto.w / 2, y: ty * T + T / 2 - proto.h / 2 });
    this.shallow.add(id);
    return id;
  }

  /** Won on growing to the goal size; lost with the last life (see caught). */
  private checkOutcome(events: SimEvent[]): void {
    if (this.outcome !== 'playing') return;
    if (this.lives <= 0) {
      this.outcome = 'lost';
      events.push({ type: 'lost' });
    } else if (this.goal !== null && this.crab.growth.size >= this.goal) {
      this.outcome = 'won';
      events.push({ type: 'won' });
    }
  }

  private moveCritters(dt: number): void {
    const c = this.crab;
    const quarry = {
      box: c.body, size: c.growth.size, hidden: c.hidden, buried: !underSky(this.terrain, c.body, this.tileSize),
      inWater: this.submerged(c.body), inRoots: this.inRoots(c.body), veil: this.fogOver(c.body), covered: this.underKelp(c.body),
    };
    const env = this.surroundings;
    const rapper = { box: c.body, size: c.growth.size };
    for (const k of this.critters.values()) {
      if (!isRival(k)) {
        this.critters.set(k.id, stepCritter(this.terrain, k, quarry, dt, this.tileSize, this.rng, env));
        continue;
      }
      const { rival, took } = stepRival(this.terrain, k, rapper, this.items.values(), dt, this.tileSize, this.rng, env, c.swap?.itemId ?? null);
      this.critters.set(k.id, rival);
      if (took) this.items.delete(took.id);
    }
    for (const k of this.critters.values()) if (stranded(this.terrain, k, this.tileSize)) this.fishDies(k);
  }

  /**
   * Rapping on a rival's shell: it lets go of it, the shell drops loose on
   * the sand where it stood, and the rival scuttles away from the crab.
   */
  private rap(k: Critter, events: SimEvent[]): void {
    if (!k.shell) return;
    const id = this.nextId++;
    const proto = makeItem(id, shell(k.shell), 0, 0, false);
    const at = centre(k);
    this.items.set(id, { ...proto, ...this.clearSpot(at.x - proto.w / 2, k.y + k.h - proto.h, proto.w, proto.h) });
    const away: 1 | -1 = at.x >= centre(this.crab.body).x ? 1 : -1;
    this.critters.set(k.id, { ...inShell(k, null), tucked: false, dir: away, turnIn: RIVAL.fleeFor, bored: RIVAL.fleeFor });
    events.push({ type: 'rapped', x: at.x, y: k.y, item: id });
  }

  /** The nearest rival close enough, and small enough, for the crab to rap on its shell. */
  private rivalToRap(): Critter | null {
    const c = this.crab;
    const rapper = { box: c.body, size: c.growth.size };
    const at = centre(c.body).x;
    let best: Critter | null = null;
    for (const k of this.critters.values()) {
      if (canRap(k, rapper) && (!best || Math.abs(centre(k).x - at) < Math.abs(centre(best).x - at))) best = k;
    }
    return best;
  }

  /**
   * The nearest place to put a box (a dropped shell) at or around x, y that
   * isn't in the sand: a little to either side, or up a little, so it's never
   * left wedged where nothing can reach it.
   */
  private clearSpot(x: number, y: number, w: number, h: number): { x: number; y: number } {
    const T = this.tileSize;
    for (let up = 0; up <= T * 2; up += T / 4) {
      for (const side of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
        const at = { x: x + side * (T / 4), y: y - up };
        if (!boxHitsSolid(this.terrain, { ...at, w, h }, T)) return at;
      }
    }
    return { x, y: y - T * 2 };
  }

  /**
   * A fish left out of the water dies where it lies and is food, worth as
   * much as catching it. In sand, it's buried food: dig it up.
   */
  private fishDies(k: Critter): void {
    const T = this.tileSize;
    const at = centre(k);
    const tx = Math.floor(at.x / T);
    const ty = Math.floor(at.y / T);
    const buried = isSolid(this.terrain, tx, ty);
    const id = this.nextId++;
    const proto = makeItem(id, { type: 'food', food: 'fish', points: critterPoints(k.size) }, 0, 0, buried);
    // Buried, it sits in the middle of its tile (as buried food does); on open ground, where the fish lay.
    const y = buried ? ty * T + T / 2 - proto.h / 2 : k.y + k.h - proto.h;
    this.items.set(id, { ...proto, x: at.x - proto.w / 2, y });
    this.critters.delete(k.id);
  }

  /**
   * Touching a ghost crab: a smaller one is eaten, a bigger one catches the
   * crab (as does one its own size while it's out of a shell). Hidden in its
   * shell it's safe: the ghost crab walks on past and loses interest.
   */
  private meetCritters(events: SimEvent[]): void {
    for (const k of this.critters.values()) {
      const c = this.crab;
      // A gull in the air can't catch the crab (or be eaten); a rival hermit crab is neither hunter nor food.
      if (k.flight || isRival(k)) continue;
      if (this.armReaches(k)) {
        if (movementOf(k.species) === 'wade') {
          this.stabbed(k, events);
          continue;
        }
        // An octopus's arm caught it.
        if (!c.hidden && c.safe === 0 && k.size > c.growth.size) {
          this.caught(events, k.species);
          this.critters.set(k.id, { ...k, bored: CRITTER.boredFor });
        }
        continue;
      }
      if (!overlaps(c.body, k, this.reach(k))) continue;
      // A heron catches only with its bill: walking under it, among its legs, is safe (a smaller one is still food).
      if (movementOf(k.species) === 'wade' && k.size > c.growth.size) continue;
      if (c.hidden) {
        // It walks on past the shell, and doesn't turn back to hunt for a while.
        if (k.size > c.growth.size) this.critters.set(k.id, { ...k, bored: CRITTER.boredFor });
        continue;
      }
      const size = c.growth.size;
      if (k.size < size && !c.swap) this.eatCritter(k, events);
      else if ((k.size > size || (k.size === size && this.exposed)) && c.safe === 0) {
        this.caught(events, k.species);
        // It lets go: time to get away (out of a pit, say) before it strikes again.
        this.critters.set(k.id, { ...k, bored: CRITTER.boredFor });
      }
    }
  }

  /**
   * A heron's bill reached the crab. In among the roots the tangle turns it
   * aside; on a crab hidden in its shell it glances off ("tok!"). Either way
   * the stab stops there, held out a moment before it draws back.
   */
  private stabbed(k: Critter, events: SimEvent[]): void {
    const c = this.crab;
    if (this.inRoots(c.body) || k.size <= c.growth.size) return;
    const at = centre(c.body);
    if (c.hidden) events.push({ type: 'struck', x: at.x, y: at.y });
    else if (c.safe === 0) this.caught(events, k.species);
    else return;
    this.critters.set(k.id, { ...k, strike: CRITTER.aimFor + CRITTER.stabFor, reach: k.arm });
  }

  /** Whether an octopus's arm (or a heron's bill), stretched out, has its tip on the crab. */
  private armReaches(k: Critter): boolean {
    const move = movementOf(k.species);
    if ((move !== 'den' && move !== 'wade') || k.arm < 0.2) return false;
    // A heron's bill only strikes on the way out: held out, or drawing back, it's done.
    if (move === 'wade' && (k.strike ?? 0) >= CRITTER.aimFor + CRITTER.stabFor) return false;
    const tip = armTip(k, this.tileSize);
    const r = this.tileSize * 0.4;
    return overlaps(this.crab.body, { x: tip.x - r, y: tip.y - r, w: r * 2, h: r * 2 });
  }

  /**
   * How far past its box a creature meets the crab. An antlion sits at the
   * one-tile bottom of its funnel, where a crab wider than a tile can't get
   * down to it; its jaws reach up to wherever the crab comes to rest.
   */
  private reach(k: Critter): number {
    if (movementOf(k.species) !== 'lurk') return 0;
    return Math.max(this.tileSize / 2, this.crab.body.w / 2);
  }

  private eatCritter(k: Critter, events: SimEvent[]): void {
    const points = critterPoints(k.size);
    const r = feed(this.crab.growth, points, this.cap);
    this.crab = { ...this.crab, growth: r.growth };
    this.critters.delete(k.id);
    const at = centre(k);
    events.push({ type: 'ate', id: k.id, points, banked: r.banked, x: at.x, y: at.y });
    if (r.grew) events.push({ type: 'grew', size: r.growth.size });
  }

  /**
   * Caught: a life lost, nothing else. It keeps its size and shell and has
   * a moment's grace; caught moving house, it stays where it was.
   */
  private caught(events: SimEvent[], by: HunterId): void {
    this.caughtBy = by;
    const c = this.crab;
    this.lives -= 1;
    this.crab = { ...c, swap: null, hidden: false, safe: SAFE_SECONDS };
    const at = centre(c.body);
    events.push({ type: 'caught', x: at.x, y: at.y, lives: this.lives, by });
  }

  private restockCritters(dt: number): void {
    const low = this.tide === null || isLowWater(this.tide, this.elapsed);
    // Gulls take off as the tide comes in (away from the crab), and are gone once they're out of sight above.
    for (const k of this.critters.values()) {
      if (!SPECIES[k.species].lowTide) continue;
      if (!low && k.flight !== 'off') this.critters.set(k.id, { ...k, flight: 'off', dir: centre(k).x < centre(this.crab.body).x ? -1 : 1 });
      else if (k.flight === 'off' && k.y + k.h < -this.tileSize * 2) this.critters.delete(k.id);
    }
    const short = this.groups.findIndex((g, i) => (low || !SPECIES[g.species ?? 'ghostcrab'].lowTide)
      && [...this.critters.keys()].filter((id) => this.groupOf.get(id) === i).length < g.count);
    if (short < 0) return;
    this.critterTimer += dt;
    if (this.critterTimer < CRITTER_EVERY) return;
    this.critterTimer = 0;
    this.spawnCritter(short);
  }

  /** A new creature of group `group`, placed for how it lives (see spawn.ts). Gulls only come at low water. */
  private spawnCritter(group: number, start = false): void {
    const { sizes, species = 'ghostcrab', cols } = this.groups[group]!;
    if (SPECIES[species].lowTide && this.tide && !isLowWater(this.tide, this.elapsed)) return;
    const k = placeCritter({
      terrain: this.terrain, tile: this.tileSize, rng: this.rng, crabCol: Math.floor(centre(this.crab.body).x / this.tileSize),
      pits: this.pits, dens: this.dens, critters: [...this.critters.values()], surroundings: this.surroundings, start,
      perch: (x) => perchRow(this.roots, x),
    }, this.nextId, species, sizes, cols);
    if (!k) return;
    // A gull comes in from the sky to land on dry ground; over water it waits for another time.
    const landing = SPECIES[species].lowTide && !start;
    if (landing && this.surroundings.wet(Math.floor(centre(k).x / this.tileSize), surfaceRow(this.terrain, Math.floor(centre(k).x / this.tileSize)) - 1)) return;
    this.critters.set(k.id, landing ? { ...k, y: -k.h - this.tileSize, flight: 'in' } : k);
    this.groupOf.set(k.id, group);
    this.nextId++;
  }

  /**
   * Steam vents blowing now throw what's over them up into the air, once a
   * blow each: the crab (hidden in its shell or not), walking creatures,
   * and loose food. Steam never harms.
   */
  private blow(events: SimEvent[]): void {
    if (!this.vents.length) return;
    const fresh = (vent: number, id: number, puff: number): boolean => {
      const key = `${vent}:${id}`;
      if (this.thrown.get(key) === puff) return false;
      this.thrown.set(key, puff);
      return true;
    };
    for (const { vent, puff, plume, apex } of blasts(this.vents, this.terrain, this.elapsed, this.tileSize)) {
      const up = <B extends Body>(b: B): B => ({ ...b, vy: -throwSpeed(b.y + b.h, apex), onGround: false });
      const c = this.crab;
      if (overlaps(c.body, plume) && fresh(vent, -1, puff)) {
        this.crab = { ...c, climbing: false, body: up(c.body) };
        const at = centre(c.body);
        events.push({ type: 'thrown', x: at.x, y: at.y });
      }
      for (const k of this.critters.values()) {
        const move = movementOf(k.species);
        if (k.flight || (move !== 'walk' && move !== 'wade' && move !== 'climb')) continue;
        if (overlaps(k, plume) && fresh(vent, k.id, puff)) this.critters.set(k.id, up(k));
      }
      for (const i of this.items.values()) if (!i.buried && overlaps(i, plume) && fresh(vent, i.id, puff)) this.items.set(i.id, up(i));
    }
  }

  /** The tide: water follows the sea up and down, sand put down in the sea washes flat, and each high water brings things in. */
  private flow(dt: number, events: SimEvent[]): void {
    if (!this.shore) return;
    const washed = this.shore.step(dt, this.elapsed, this.rng, (kind, col) => this.dropItem(kind, col, events));
    if (washed.length) events.push({ type: 'tiles', tiles: washed, dug: false, poured: true });
  }

  private dropItem(kind: Item['kind'], col: number, events: SimEvent[]): void {
    const T = this.tileSize;
    const id = this.nextId++;
    const proto = makeItem(id, kind, 0, 0, false);
    this.items.set(id, { ...proto, x: col * T + T / 2 - proto.w / 2, y: surfaceRow(this.terrain, col) * T - proto.h });
    events.push({ type: 'spawned', id });
  }

  /** A bird coming in at patrol height from somewhere away from the crab. */
  private spawnBird(g: BirdGroup): void {
    const T = this.tileSize;
    const W = this.terrain.width * T;
    const crabX = centre(this.crab.body).x;
    let x = this.rng() * W;
    for (let tries = 0; tries < 8 && Math.abs(x - crabX) < SPAWN_AWAY * T; tries++) x = this.rng() * W;
    const id = this.nextId++;
    // Heading the crab's way, so it shows up early.
    const b = makeBird(id, g.size, x, 0, crabX > x ? 1 : -1, g.species);
    this.birds.set(id, { ...b, y: patrolY(this.terrain, T, b.h) });
  }

  /**
   * Birds fly, and a stoop that lands on the crab catches it, unless it's
   * pulled into its shell: then the bird strikes the shell, harmlessly,
   * and flies off.
   */
  private moveBirds(dt: number, events: SimEvent[]): void {
    if (!this.birds.size) return;
    const c = this.crab;
    const T = this.tileSize;
    // Under kelp, or lost in thick fog, it's as good as under cover.
    const open = underSky(this.terrain, c.body, T) && !this.underKelp(c.body) && this.fogOver(c.body) < FOG.thick;
    const quarry = { box: c.body, size: c.growth.size, hidden: c.hidden, open };
    for (const b of this.birds.values()) {
      const next = stepBird(this.terrain, b, quarry, dt, T);
      if (next.phase !== 'dive' || !overlaps(next, this.crab.body) || this.crab.growth.size >= next.size) {
        this.birds.set(b.id, next);
        continue;
      }
      this.birds.set(b.id, pullUp(next));
      const at = centre(this.crab.body);
      if (this.crab.hidden) events.push({ type: 'struck', x: at.x, y: at.y });
      else if (this.crab.safe === 0) this.caught(events, b.species);
    }
  }

  private findNearbyShell(): void {
    const c = this.crab;
    let best: Item | null = null;
    let bestFits = false;
    if (!c.swap) {
      for (const item of this.items.values()) {
        if (item.buried || item.kind.type !== 'shell' || !overlaps(c.body, item, REACH_PAD)) continue;
        const fits = canWear(SHELLS[item.kind.shell], c.growth.size);
        const better = !best || (fits && !bestFits)
          || (fits === bestFits && best.kind.type === 'shell' && SHELLS[item.kind.shell].maxSize > SHELLS[best.kind.shell].maxSize);
        if (better) {
          best = item;
          bestFits = fits;
        }
      }
    }
    this.nearbyShell = best;
    this.nearbyFits = bestFits;
    this.nearbyRival = this.hasRivals && !c.swap && !c.hidden ? this.rivalToRap() : null;
  }
}

export type { Box };
