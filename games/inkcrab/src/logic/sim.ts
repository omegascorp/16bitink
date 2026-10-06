import { boxHitsSolid, jump, moveBody, type Body, type Box } from './body';
import { settleColumn } from './sandfall';
import { diggableOf, digTargets, inReach, placeTarget, tileSpan, type TilePos } from './dig';
import { feed, initialGrowth, isCapped, settle, type Growth } from './growth';
import { centre, food, makeItem, overlaps, type Item } from './items';
import { createRng, type Rng } from './rng';
import { canWear, MOUTH_OFFSET, sandCapacity, shellPx, SHELLS, speedFactor, type ShellKind } from './shells';
import { startSwap, tickSwap, type Swap } from './swap';
import { dig, isSolid, place, surfaceRow, type Terrain } from './terrain';

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
}

export const IDLE: Input = { moveX: 0, aimY: 0, jump: false, dig: false, place: false, interact: false, tapTile: null };

export type SimEvent =
  | { readonly type: 'ate'; readonly id: number; readonly points: number; readonly banked: number; readonly x: number; readonly y: number }
  | { readonly type: 'grew'; readonly size: number }
  | { readonly type: 'tiles'; readonly tiles: readonly TilePos[]; readonly dug: boolean }
  | { readonly type: 'revealed'; readonly id: number }
  | { readonly type: 'spawned'; readonly id: number }
  | { readonly type: 'swapStart'; readonly id: number }
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
}

const DIG_SECONDS = 0.22;
/** Take-off speed of a jump in a light shell, px/s: a hop of about 2.5 tiles (1.75 in the heaviest). */
const JUMP_SPEED = 270;
const WALKING = 0.1;
const FOOD_EVERY = 2.5;
const REACH_PAD = 6;

function crabBox(size: number, shell: ShellKind | null): { w: number; h: number } {
  const px = shellPx(shell ? SHELLS[shell].maxSize : size);
  return { w: px * 0.85, h: px * 0.7 };
}

/**
 * The test beach's rules, independent of Phaser: walking, eating, the
 * growth cap and bank, digging and placing sand, and moving house.
 * Scenes read the state and react to the events `step` returns.
 */
export class Beach {
  readonly terrain: Terrain;
  readonly tileSize: number;
  readonly items = new Map<number, Item>();
  crab: CrabState;
  nearbyShell: Item | null = null;
  nearbyFits = false;
  private readonly rng: Rng;
  private readonly surfaceFood: number;
  private nextId: number;
  private foodTimer = 0;

  constructor(setup: BeachSetup) {
    this.terrain = setup.terrain;
    this.tileSize = setup.tileSize;
    this.rng = createRng(setup.seed);
    this.surfaceFood = setup.surfaceFood;
    for (const item of setup.items) this.items.set(item.id, item);
    this.nextId = Math.max(0, ...setup.items.map((i) => i.id)) + 1;
    const growth = initialGrowth();
    const { w, h } = crabBox(growth.size, setup.startShell);
    this.crab = {
      body: { x: setup.start.x - w / 2, y: setup.start.y - h, w, h, vx: 0, vy: 0, onGround: false },
      facing: 1, growth, shell: setup.startShell, sand: 0, swap: null, digCooldown: 0,
    };
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
    if (this.crab.swap) this.tickSwap(dt, events);
    else this.act(input, dt, events);
    this.settleSand(events);
    this.settleItems(dt, events);
    this.restock(dt, events);
    this.findNearbyShell();
    return events;
  }

  private act(input: Input, dt: number, events: SimEvent[]): void {
    const c = this.crab;
    const shellSpec = c.shell ? SHELLS[c.shell] : null;
    const speed = (60 + 5 * c.growth.size) * speedFactor(shellSpec);
    const facing = input.moveX > WALKING ? 1 : input.moveX < -WALKING ? -1 : c.facing;
    // Heavier shells don't leap as high.
    const launched = input.jump ? jump(c.body, JUMP_SPEED * Math.sqrt(speedFactor(shellSpec))) : c.body;
    const body = moveBody(this.terrain, launched, input.moveX, speed, dt, this.tileSize);
    this.crab = { ...c, body, facing, digCooldown: Math.max(0, c.digCooldown - dt) };
    if (this.crab.digCooldown === 0) {
      if (input.tapTile) this.tapTile(input.tapTile, events);
      else if (input.dig) this.dig(input, events);
      else if (input.place) this.place(input, events);
    }
    if (input.interact && this.nearbyShell && this.nearbyFits) {
      this.crab = { ...this.crab, swap: startSwap(this.nearbyShell.id) };
      events.push({ type: 'swapStart', id: this.nearbyShell.id });
    }
    this.eat(events);
  }

  private get cooldown(): number {
    return DIG_SECONDS / speedFactor(this.crab.shell ? SHELLS[this.crab.shell] : null);
  }

  private dig(input: Input, events: SimEvent[]): void {
    const c = this.crab;
    const walking = Math.abs(input.moveX) > WALKING;
    this.removeTiles(diggableOf(this.terrain, digTargets(c.body, c.facing, input.aimY, walking, this.tileSize)), events);
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
  private removeTiles(tiles: readonly TilePos[], events: SimEvent[]): void {
    const taken = tiles.slice(0, Math.max(0, this.sandCapacity - this.crab.sand));
    if (!taken.length) return;
    for (const [x, y] of taken) dig(this.terrain, x, y);
    events.push({ type: 'tiles', tiles: taken, dug: true });
    this.crab = { ...this.crab, sand: this.crab.sand + taken.length, digCooldown: this.cooldown };
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
    // Gravity still applies to a crab caught mid-swap.
    const body = moveBody(this.terrain, c.body, 0, 0, dt, this.tileSize);
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
  private refit(body: Body, size: number, shellKind: ShellKind, events: SimEvent[]): { body: Body; shoved: number } {
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
      const moved = moveBody(this.terrain, item, 0, 0, dt, T);
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
    const tx = 2 + Math.floor(this.rng() * (this.terrain.width - 4));
    const kind = food(this.rng() < 0.7 ? 'crumb' : 'hopper');
    const id = this.nextId++;
    const proto = makeItem(id, kind, 0, 0, false);
    const ground = surfaceRow(this.terrain, tx) * T;
    this.items.set(id, { ...proto, x: tx * T + T / 2 - proto.w / 2, y: ground - proto.h });
    events.push({ type: 'spawned', id });
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
  }
}

export type { Box };
