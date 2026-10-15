import { boxHitsSolid, climbBody, jump, moveBody, type Body, type Box } from './body';
import { BlastSim, type Blast } from './blastSim';
import type { Loadout } from './gear';
import { DRILL_SECONDS_PER_ENERGY, tileCost, VOLATILE_COST, type DrillSpec } from './drill';
import { holdSize, type Hold } from './hold';
import { contents as contentsOf, emptyInventory, isEmpty, keepShare, transferAll, type Inventory } from './inventory';
import { bankItems, freeItems, inPouch, placeItems, stepItems, type ItemDef, type MineItem } from './items';
import { ladderRungs, Ladders } from './ladders';
import { jetFor, type JetSpec } from './marks';
import { between, caught, newPiece, PIECE, stepPiece, type Piece } from './pieces';
import { burn, fits, hurt, newSuit, recharge, refuel, spend, stow, withBag, type Suit, type SuitSpec } from './suit';
import { bodyCell, centredX, drillTarget } from './target';
import { contentAt, foldX, ringDelta, setTile, TILE, tileAt, volatileAt, wrapX, type Terrain, type TilePos } from './terrain';

/** Everything a dig site starts from. */
export interface MineSetup {
  readonly terrain: Terrain;
  readonly tileSize: number;
  readonly drill: DrillSpec;
  /** The marks of every gear piece, for how the prospector looks. */
  readonly loadout: Loadout;
  readonly suit: SuitSpec;
  /** Ladder gadgets carried. */
  readonly ladders: number;
  /** Ladders already hanging in the world (from a save), over `terrain` (default none). */
  readonly placedLadders?: Ladders;
  /** The lander's middle column and the surface row it stands on. */
  readonly lander: { readonly col: number; readonly row: number };
  /** The jetpack's mark (default the starter's). */
  readonly jet?: JetSpec;
  /** Things to find: blueprints, and later what people ask for (default none). */
  readonly items?: readonly ItemDef[];
  /** Share of the bag a recall keeps: the ship's winch (default none). */
  readonly winchKeeps?: number;
  /** The ship's cargo, which the bag empties into at the lander (default an empty starter hold). */
  readonly cargo?: Inventory;
  /** What the suit's bag still holds from the last landing (default empty). */
  readonly bag?: Inventory;
}

/** The starter ship's cargo: slots, and pieces a slot stacks. */
export const CARGO = { slots: 16, stack: 50 } as const;

/** One step's controls: held directions (-1..1), the jump button held (thrust), and buttons pressed this step. */
export interface MineInput {
  readonly ix: number;
  readonly iy: number;
  readonly jump: boolean;
  /** Jump held: in the air, the jetpack fires. */
  readonly thrust: boolean;
  readonly ladder: boolean;
  readonly recall: boolean;
}

export const NO_INPUT: MineInput = { ix: 0, iy: 0, jump: false, thrust: false, ladder: false, recall: false };

export type MineEvent =
  | { readonly kind: 'tiles'; readonly tiles: readonly TilePos[] }
  | { readonly kind: 'drilled'; readonly tile: TilePos; readonly cost: number; readonly ore: number }
  | { readonly kind: 'tooHard'; readonly tile: TilePos }
  | { readonly kind: 'flat' }
  | { readonly kind: 'ore'; readonly ore: number }
  | { readonly kind: 'bagFull' }
  | { readonly kind: 'bank'; readonly moved: Hold; readonly pieces: number }
  | { readonly kind: 'cargoFull' }
  | { readonly kind: 'recharge' }
  | { readonly kind: 'refuel' }
  | { readonly kind: 'noFuel' }
  | { readonly kind: 'lit'; readonly tile: TilePos }
  | { readonly kind: 'blast'; readonly blast: Blast }
  | { readonly kind: 'hurt'; readonly hearts: number }
  | { readonly kind: 'ladder'; readonly rungs: readonly TilePos[] }
  | { readonly kind: 'noLadders' }
  | { readonly kind: 'recall'; readonly lost: number }
  | { readonly kind: 'item'; readonly item: MineItem }
  | { readonly kind: 'bankItem'; readonly item: MineItem }
  | { readonly kind: 'failed' };

export const PROSPECTOR = { w: 20, h: 28, walk: 125, climb: 105, jump: 330 } as const;
/**
 * The starter jetpack: hold jump in the air to fly. `thrust` (px/s²) beats
 * gravity (900), the climb tops out at `maxRise` px/s, and it burns `burn`
 * fuel a second from a tank of its own, refilled at the lander. Better
 * marks climb faster (marks.ts).
 */
export const JET: JetSpec = jetFor(0);
/** Px/s the prospector drops into a block they just drilled out from under themselves (or steps off a stair onto), so going down doesn't wait on gravity. */
const DROP_KICK = 260;
/** Seconds for the drill to open a firedamp pocket or knock an old charge's detonator. */
const VOLATILE_TAP = 0.08;
/** The same notice ("too hard", "cell flat", "bag full") is said at most this often. */
const NOTICE_GAP = 1.2;
/** The lander's footprint in tiles either side of its middle, and its height. */
export const LANDER = { half: 1, rows: 3 } as const;

interface Drilling {
  readonly tile: TilePos;
  readonly progress: number;
  /** Seconds the whole dig takes (both blocks of a diagonal). */
  readonly need: number;
}

/**
 * One dig site in play: the prospector, their suit, the ground they drill,
 * what can blow in it, loose ore and the lander they bank at. Pure simulation (no
 * Phaser); `step` returns what happened so the scene can draw and play it.
 *
 * On a wrapping world everything is kept folded into the grid (x from 0 to
 * its width), and anything that compares two places measures the short way
 * round, so the join is never felt. Drawing them near the camera is the
 * scene's job.
 */
export class Mine {
  readonly terrain: Terrain;
  readonly tile: number;
  readonly drill: DrillSpec;
  readonly ladders: Ladders;
  readonly blasts: BlastSim;
  readonly landerBox: Box;
  readonly jet: JetSpec;
  player: Body;
  facing: 1 | -1 = 1;
  suit: Suit;
  /** The ship's cargo, filled at the lander. */
  cargo: Inventory;
  items: MineItem[];
  laddersLeft: number;
  pieces: Piece[] = [];
  drilling: Drilling | null = null;
  climbing = false;
  /** The jetpack fired this step. */
  jetting = false;
  time = 0;
  state: 'playing' | 'failed' = 'playing';
  private readonly said = new Map<string, number>();

  constructor(private readonly setup: MineSetup) {
    this.terrain = setup.terrain;
    this.tile = setup.tileSize;
    this.drill = setup.drill;
    this.ladders = setup.placedLadders ?? new Ladders(setup.terrain);
    this.blasts = new BlastSim(setup.terrain);
    this.suit = setup.bag ? newSuit(setup.suit, setup.bag) : newSuit(setup.suit);
    this.cargo = setup.cargo ?? emptyInventory(CARGO.slots, CARGO.stack);
    this.laddersLeft = setup.ladders;
    this.jet = setup.jet ?? JET;
    const T = this.tile;
    const { col, row } = setup.lander;
    this.landerBox = { x: (col - LANDER.half) * T, y: (row - LANDER.rows) * T, w: (LANDER.half * 2 + 1) * T, h: LANDER.rows * T };
    this.items = placeItems(setup.terrain, setup.items ?? [], row, T);
    this.player = this.startBody();
  }

  /** Metres below the lander's ground. */
  get depth(): number {
    return Math.max(0, Math.floor((this.player.y + this.player.h) / this.tile) - this.setup.lander.row);
  }

  /** Whether the prospector is at the lander (where they bank, and can step aboard). */
  get atLander(): boolean {
    const p = this.player;
    const l = this.landerBox;
    const lx = p.x + ringDelta(this.terrain, p.x, l.x, this.tile);
    return !(p.x + p.w < lx || p.x > lx + l.w || p.y + p.h < l.y || p.y > l.y + l.h);
  }

  /** How far through the current block the drill is, 0..1. */
  get drillProgress(): number {
    if (!this.drilling) return 0;
    return this.drilling.need ? Math.min(1, this.drilling.progress / this.drilling.need) : 0;
  }

  step(dt: number, input: MineInput): MineEvent[] {
    if (this.state !== 'playing') return [];
    this.time += dt;
    const events: MineEvent[] = [];
    if (input.recall) this.recall(events);
    if (input.ladder) this.placeLadder(events);
    const blocked = this.move(dt, input, events);
    this.drillStep(dt, input, blocked, events);
    this.blastStep(dt, events);
    this.pieceStep(dt, events);
    this.itemStep(dt, events);
    this.landerStep(events);
    if (this.suit.hearts <= 0) {
      this.state = 'failed';
      events.push({ kind: 'failed' });
    }
    return events;
  }

  /** Whether the prospector's box covers tile (x, y). */
  occupies(x: number, y: number): boolean {
    const T = this.tile;
    const p = this.player;
    const left = p.x + ringDelta(this.terrain, p.x, x * T, T);
    return p.x < left + T && p.x + p.w > left && p.y < (y + 1) * T && p.y + p.h > y * T;
  }

  private startBody(): Body {
    const { col, row } = this.setup.lander;
    const x = foldX(this.terrain, centredX(col + LANDER.half + 1, PROSPECTOR.w, this.tile), this.tile);
    return { x, y: row * this.tile - PROSPECTOR.h, w: PROSPECTOR.w, h: PROSPECTOR.h, vx: 0, vy: 0, onGround: true };
  }

  /** Walks, jumps, flies or climbs a ladder; returns whether a sideways push was stopped by a wall. */
  private move(dt: number, input: MineInput, events: MineEvent[]): boolean {
    const T = this.tile;
    const before = this.player;
    const { col, row } = bodyCell(before, T);
    const onLadder = this.ladders.has(col, row);
    if (input.ix !== 0) this.facing = input.ix > 0 ? 1 : -1;
    this.jetting = false;
    if (onLadder && !input.jump) {
      this.climbing = true;
      this.player = climbBody(this.terrain, before, input.ix, input.iy, PROSPECTOR.climb, dt, T);
    } else {
      this.climbing = false;
      let launched = input.jump ? (onLadder ? { ...before, vy: -PROSPECTOR.jump, onGround: false } : jump(before, PROSPECTOR.jump)) : before;
      if (input.thrust && !launched.onGround) {
        if (this.suit.fuel > 0) {
          this.jetting = true;
          this.suit = burn(this.suit, this.jet.burn * dt);
          launched = { ...launched, vy: Math.max(-this.jet.maxRise, launched.vy - this.jet.thrust * dt) };
        } else this.notice('noFuel', events, { kind: 'noFuel' });
      }
      this.player = moveBody(this.terrain, launched, input.ix, PROSPECTOR.walk, dt, T, input.iy <= 0);
      // Stepping off a ledge while heading down drops straight onto the next stair.
      if (input.iy > 0 && before.onGround && !this.player.onGround && this.player.vy >= 0) this.player = { ...this.player, vy: Math.max(this.player.vy, DROP_KICK) };
    }
    this.player = { ...this.player, x: foldX(this.terrain, this.player.x, T) };
    const footing = this.player.onGround || this.climbing || this.jetting;
    return input.ix !== 0 && footing && Math.abs(this.player.x - before.x) < 0.01;
  }

  private drillStep(dt: number, input: MineInput, blocked: boolean, events: MineEvent[]): void {
    // Hovering on the jetpack counts as footing: you can drill up through a roof or into a wall mid-air.
    const footing = this.player.onGround || this.climbing || this.jetting;
    const aimed = drillTarget(this.terrain, this.player, this.tile, input, footing, blocked);
    // Something volatile in a two-block dig is set off on its own first.
    const target = aimed?.with && (volatileAt(this.terrain, ...aimed.with) || volatileAt(this.terrain, ...aimed.tile))
      ? { tile: volatileAt(this.terrain, ...aimed.with) ? aimed.with : aimed.tile, centre: false }
      : aimed;
    if (!target || this.blasts.isLit(target.tile[0], target.tile[1])) {
      this.drilling = null;
      return;
    }
    const tiles: TilePos[] = target.with ? [target.tile, target.with] : [target.tile];
    const costs = tiles.map(([x, y]) => this.costOf(x, y));
    if (costs.some((c) => c === null)) {
      this.drilling = null;
      this.notice('tooHard', events, { kind: 'tooHard', tile: tiles[costs.indexOf(null)]! });
      return;
    }
    const cost = (costs as number[]).reduce((a, b) => a + b, 0);
    if (this.suit.energy < cost) {
      this.drilling = null;
      this.notice('flat', events, { kind: 'flat' });
      return;
    }
    const [x, y] = target.tile;
    const same = this.drilling && this.drilling.tile[0] === x && this.drilling.tile[1] === y;
    if (!same && target.centre) this.centreOver(x);
    const progress = (same ? this.drilling!.progress : 0) + dt;
    const need = tiles.reduce((sum, t) => sum + this.drillSeconds(t), 0);
    if (progress < need) {
      this.drilling = { tile: target.tile, progress, need };
      return;
    }
    this.drilling = null;
    this.suit = spend(this.suit, cost) ?? this.suit;
    if (volatileAt(this.terrain, x, y)) {
      this.blasts.light(x, y);
      events.push({ kind: 'lit', tile: target.tile });
      return;
    }
    tiles.forEach(([tx, ty], i) => {
      const ore = contentAt(this.terrain, tx, ty);
      setTile(this.terrain, tx, ty, TILE.air);
      if (ore) this.pieces.push(newPiece(ore, (tx + 0.5) * this.tile, (ty + 0.5) * this.tile));
      events.push({ kind: 'drilled', tile: [tx, ty], cost: costs[i]!, ore });
    });
    if (target.centre && y > bodyCell(this.player, this.tile).row) this.player = { ...this.player, vy: DROP_KICK, onGround: false };
    this.items = freeItems(this.items, tiles);
    events.push({ kind: 'tiles', tiles });
  }

  /** Energy to drill (x, y): a tap for something volatile, otherwise by grade; null when too hard. */
  private costOf(x: number, y: number): number | null {
    return volatileAt(this.terrain, x, y) ? VOLATILE_COST : tileCost(this.drill, tileAt(this.terrain, x, y));
  }

  private drillSeconds(tile: TilePos): number {
    const t = tileAt(this.terrain, tile[0], tile[1]);
    if (volatileAt(this.terrain, tile[0], tile[1])) return VOLATILE_TAP;
    return (tileCost(this.drill, t) ?? 0) * DRILL_SECONDS_PER_ENERGY;
  }

  /** Lines the prospector up over (or under) a column before a vertical dig, if there's room. */
  private centreOver(col: number): void {
    const moved = { ...this.player, x: centredX(col, this.player.w, this.tile) };
    if (!boxHitsSolid(this.terrain, moved, this.tile)) this.player = moved;
  }

  private blastStep(dt: number, events: MineEvent[]): void {
    const { changed, blasts } = this.blasts.step(dt);
    if (changed.length) {
      this.items = freeItems(this.items, changed);
      events.push({ kind: 'tiles', tiles: changed });
    }
    for (const blast of blasts) {
      events.push({ kind: 'blast', blast });
      for (const { ore, tile } of blast.ores) this.pieces.push(newPiece(ore, (tile[0] + 0.5) * this.tile, (tile[1] + 0.5) * this.tile));
      if (blast.area.some(([x, y]) => this.occupies(x, y))) this.hurt(events);
    }
  }

  private pieceStep(dt: number, events: MineEvent[]): void {
    const kept: Piece[] = [];
    for (const piece of this.pieces) {
      // A piece flies to the bag only if there's a stack of its ore with room, or an empty slot.
      const room = fits(this.suit, piece.ore);
      const next = stepPiece(this.terrain, piece, room ? this.player : null, dt, this.tile);
      if (room && caught(this.terrain, next, this.player, this.tile)) {
        this.suit = stow(this.suit, next.ore) ?? this.suit;
        events.push({ kind: 'ore', ore: next.ore });
        continue;
      }
      if (!room && this.near(next)) this.notice('bagFull', events, { kind: 'bagFull' });
      kept.push(next);
    }
    this.pieces = kept;
  }

  private itemStep(dt: number, events: MineEvent[]): void {
    const { items, caught } = stepItems(this.terrain, this.items, this.player, dt, this.tile);
    this.items = items;
    for (const item of caught) events.push({ kind: 'item', item });
  }

  private near(p: Box): boolean {
    return between(this.terrain, this.player, p, this.tile).d < PIECE.magnet;
  }

  private landerStep(events: MineEvent[]): void {
    if (!this.atLander) return;
    if (!isEmpty(this.suit.bag)) {
      const r = transferAll(this.suit.bag, this.cargo);
      const pieces = holdSize(r.moved);
      if (pieces) {
        events.push({ kind: 'bank', moved: r.moved, pieces });
        this.cargo = r.to;
        this.suit = withBag(this.suit, r.from);
      }
      if (!isEmpty(r.from)) this.notice('cargoFull', events, { kind: 'cargoFull' });
    }
    if (inPouch(this.items).length) {
      const { items, banked } = bankItems(this.items);
      this.items = items;
      for (const item of banked) events.push({ kind: 'bankItem', item });
    }
    if (this.suit.energy < this.suit.maxEnergy) {
      this.suit = recharge(this.suit);
      events.push({ kind: 'recharge' });
    }
    if (this.suit.fuel < this.suit.maxFuel) {
      this.suit = refuel(this.suit);
      events.push({ kind: 'refuel' });
    }
  }

  private placeLadder(events: MineEvent[]): void {
    if (this.laddersLeft <= 0) {
      events.push({ kind: 'noLadders' });
      return;
    }
    const cell = bodyCell(this.player, this.tile);
    const [col, row] = [wrapX(this.terrain, cell.col), cell.row];
    const rungs = ladderRungs(this.terrain, col, row);
    if (rungs.length < 2) return;
    this.ladders.add(rungs);
    this.laddersLeft--;
    this.centreOver(col);
    events.push({ kind: 'ladder', rungs });
  }

  /**
   * The lander winches the prospector up. Whatever's in the bag is dropped
   * and lost, except the share of each stack the ship's winch keeps. The
   * pouch comes up with them.
   */
  private recall(events: MineEvent[]): void {
    const before = holdSize(contentsOf(this.suit.bag));
    const kept = keepShare(this.suit.bag, this.setup.winchKeeps ?? 0);
    const lost = before - holdSize(contentsOf(kept));
    this.suit = withBag(this.suit, kept);
    this.player = this.startBody();
    this.drilling = null;
    events.push({ kind: 'recall', lost });
  }

  private hurt(events: MineEvent[]): void {
    const r = hurt(this.suit, this.time);
    this.suit = r.suit;
    if (!r.hit) return;
    events.push({ kind: 'hurt', hearts: this.suit.hearts });
  }

  private notice(key: string, events: MineEvent[], event: MineEvent): void {
    const last = this.said.get(key) ?? -Infinity;
    if (this.time - last < NOTICE_GAP) return;
    this.said.set(key, this.time);
    events.push(event);
  }
}
