import { boxHitsSolid, climbBody, jump, moveBody, type Body, type Box } from './body';
import { CrateSim, type Blast } from './crateSim';
import { DRILL_SECONDS_PER_ENERGY, tileCost, type DrillSpec } from './drill';
import { ladderRungs, Ladders } from './ladders';
import { caught, newPiece, PIECE, stepPiece, type Piece } from './pieces';
import { bagFull, bagValue, burn, emptyBag, hurt, newSuit, recharge, refuel, spend, stow, type Suit, type SuitSpec } from './suit';
import { bodyCell, centredX, drillTarget } from './target';
import { contentAt, setTile, TILE, tileAt, type Terrain, type TilePos } from './terrain';

/** Everything a dig site starts from. */
export interface MineSetup {
  readonly terrain: Terrain;
  readonly tileSize: number;
  readonly drill: DrillSpec;
  readonly suit: SuitSpec;
  /** Ladder gadgets carried. */
  readonly ladders: number;
  /** The lander's middle column and the surface row it stands on. */
  readonly lander: { readonly col: number; readonly row: number };
}

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
  | { readonly kind: 'bank'; readonly credits: number; readonly pieces: number }
  | { readonly kind: 'recharge' }
  | { readonly kind: 'refuel' }
  | { readonly kind: 'noFuel' }
  | { readonly kind: 'lit'; readonly tile: TilePos }
  | { readonly kind: 'blast'; readonly blast: Blast }
  | { readonly kind: 'hurt'; readonly hearts: number }
  | { readonly kind: 'ladder'; readonly rungs: readonly TilePos[] }
  | { readonly kind: 'noLadders' }
  | { readonly kind: 'recall'; readonly lost: number }
  | { readonly kind: 'failed' };

export const PROSPECTOR = { w: 20, h: 28, walk: 125, climb: 105, jump: 330 } as const;
/**
 * The jetpack: hold jump in the air to fly. `thrust` (px/s²) beats gravity
 * (900), the climb tops out at `maxRise` px/s, and it burns `burn` fuel a
 * second from a tank of its own, refilled at the lander.
 */
export const JET = { thrust: 1650, maxRise: 240, burn: 10 } as const;
/** Px/s the prospector drops into a block they just drilled out from under themselves, so going down doesn't wait on gravity. */
const DROP_KICK = 260;
/** Seconds to set off a crate with the drill. */
const CRATE_TAP = 0.08;
/** The same notice ("too hard", "cell flat", "bag full") is said at most this often. */
const NOTICE_GAP = 1.2;
/** The lander's footprint in tiles either side of its middle, and its height. */
export const LANDER = { half: 1, rows: 3 } as const;

interface Drilling {
  readonly tile: TilePos;
  readonly progress: number;
}

/**
 * One dig site in play: the prospector, their suit, the ground they drill,
 * crates, loose ore and the lander they bank at. Pure simulation (no
 * Phaser); `step` returns what happened so the scene can draw and play it.
 */
export class Mine {
  readonly terrain: Terrain;
  readonly tile: number;
  readonly drill: DrillSpec;
  readonly ladders: Ladders;
  readonly crates: CrateSim;
  readonly landerBox: Box;
  player: Body;
  facing: 1 | -1 = 1;
  suit: Suit;
  credits = 0;
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
    this.ladders = new Ladders(setup.terrain);
    this.crates = new CrateSim(setup.terrain);
    this.suit = newSuit(setup.suit);
    this.laddersLeft = setup.ladders;
    const T = this.tile;
    const { col, row } = setup.lander;
    this.landerBox = { x: (col - LANDER.half) * T, y: (row - LANDER.rows) * T, w: (LANDER.half * 2 + 1) * T, h: LANDER.rows * T };
    this.player = this.startBody();
  }

  /** Metres below the lander's ground. */
  get depth(): number {
    return Math.max(0, Math.floor((this.player.y + this.player.h) / this.tile) - this.setup.lander.row);
  }

  /** How far through the current block the drill is, 0..1. */
  get drillProgress(): number {
    if (!this.drilling) return 0;
    const need = this.drillSeconds(this.drilling.tile);
    return need ? Math.min(1, this.drilling.progress / need) : 0;
  }

  step(dt: number, input: MineInput): MineEvent[] {
    if (this.state !== 'playing') return [];
    this.time += dt;
    const events: MineEvent[] = [];
    if (input.recall) this.recall(events);
    if (input.ladder) this.placeLadder(events);
    const blocked = this.move(dt, input, events);
    this.drillStep(dt, input, blocked, events);
    this.crateStep(dt, events);
    this.pieceStep(dt, events);
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
    return p.x < (x + 1) * T && p.x + p.w > x * T && p.y < (y + 1) * T && p.y + p.h > y * T;
  }

  private startBody(): Body {
    const { col, row } = this.setup.lander;
    const x = centredX(col + LANDER.half + 1, PROSPECTOR.w, this.tile);
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
          this.suit = burn(this.suit, JET.burn * dt);
          launched = { ...launched, vy: Math.max(-JET.maxRise, launched.vy - JET.thrust * dt) };
        } else this.notice('noFuel', events, { kind: 'noFuel' });
      }
      this.player = moveBody(this.terrain, launched, input.ix, PROSPECTOR.walk, dt, T);
    }
    const footing = this.player.onGround || this.climbing || this.jetting;
    return input.ix !== 0 && footing && Math.abs(this.player.x - before.x) < 0.01;
  }

  private drillStep(dt: number, input: MineInput, blocked: boolean, events: MineEvent[]): void {
    // Hovering on the jetpack counts as footing: you can drill up through a roof or into a wall mid-air.
    const footing = this.player.onGround || this.climbing || this.jetting;
    const target = drillTarget(this.terrain, this.player, this.tile, input, footing, blocked);
    if (!target || this.crates.isLit(target.tile[0], target.tile[1])) {
      this.drilling = null;
      return;
    }
    const [x, y] = target.tile;
    const cost = tileCost(this.drill, tileAt(this.terrain, x, y));
    if (cost === null) {
      this.drilling = null;
      this.notice('tooHard', events, { kind: 'tooHard', tile: target.tile });
      return;
    }
    if (this.suit.energy < cost) {
      this.drilling = null;
      this.notice('flat', events, { kind: 'flat' });
      return;
    }
    const same = this.drilling && this.drilling.tile[0] === x && this.drilling.tile[1] === y;
    if (!same && target.centre) this.centreOver(x);
    const progress = (same ? this.drilling!.progress : 0) + dt;
    if (progress < this.drillSeconds(target.tile)) {
      this.drilling = { tile: target.tile, progress };
      return;
    }
    this.drilling = null;
    this.suit = spend(this.suit, cost) ?? this.suit;
    if (tileAt(this.terrain, x, y) === TILE.crate) {
      this.crates.light(x, y);
      events.push({ kind: 'lit', tile: target.tile });
      return;
    }
    const ore = contentAt(this.terrain, x, y);
    setTile(this.terrain, x, y, TILE.air);
    if (target.centre && y > bodyCell(this.player, this.tile).row) this.player = { ...this.player, vy: DROP_KICK, onGround: false };
    if (ore) this.pieces.push(newPiece(ore, (x + 0.5) * this.tile, (y + 0.5) * this.tile));
    events.push({ kind: 'drilled', tile: target.tile, cost, ore }, { kind: 'tiles', tiles: [target.tile] });
  }

  private drillSeconds(tile: TilePos): number {
    const t = tileAt(this.terrain, tile[0], tile[1]);
    if (t === TILE.crate) return CRATE_TAP;
    return (tileCost(this.drill, t) ?? 0) * DRILL_SECONDS_PER_ENERGY;
  }

  /** Lines the prospector up over (or under) a column before a vertical dig, if there's room. */
  private centreOver(col: number): void {
    const moved = { ...this.player, x: centredX(col, this.player.w, this.tile) };
    if (!boxHitsSolid(this.terrain, moved, this.tile)) this.player = moved;
  }

  private crateStep(dt: number, events: MineEvent[]): void {
    const { changed, blasts } = this.crates.step(dt, (x, y) => this.occupies(x, y));
    if (changed.length) events.push({ kind: 'tiles', tiles: changed });
    for (const blast of blasts) {
      events.push({ kind: 'blast', blast });
      for (const { ore, tile } of blast.ores) this.pieces.push(newPiece(ore, (tile[0] + 0.5) * this.tile, (tile[1] + 0.5) * this.tile));
      if (blast.area.some(([x, y]) => this.occupies(x, y))) this.hurt(events);
    }
  }

  private pieceStep(dt: number, events: MineEvent[]): void {
    const full = bagFull(this.suit);
    const kept: Piece[] = [];
    for (const piece of this.pieces) {
      const next = stepPiece(this.terrain, piece, full ? null : this.player, dt, this.tile);
      if (!full && caught(next, this.player)) {
        this.suit = stow(this.suit, next.ore) ?? this.suit;
        events.push({ kind: 'ore', ore: next.ore });
        continue;
      }
      if (full && this.near(next)) this.notice('bagFull', events, { kind: 'bagFull' });
      kept.push(next);
    }
    this.pieces = kept;
  }

  private near(p: Box): boolean {
    const a = this.player;
    return Math.hypot(a.x + a.w / 2 - (p.x + p.w / 2), a.y + a.h / 2 - (p.y + p.h / 2)) < PIECE.magnet;
  }

  private landerStep(events: MineEvent[]): void {
    const p = this.player;
    const l = this.landerBox;
    if (p.x + p.w < l.x || p.x > l.x + l.w || p.y + p.h < l.y || p.y > l.y + l.h) return;
    if (this.suit.bag.length) {
      const credits = bagValue(this.suit.bag);
      events.push({ kind: 'bank', credits, pieces: this.suit.bag.length });
      this.credits += credits;
      this.suit = emptyBag(this.suit);
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
    const { col, row } = bodyCell(this.player, this.tile);
    const rungs = ladderRungs(this.terrain, col, row);
    if (rungs.length < 2) return;
    this.ladders.add(rungs);
    this.laddersLeft--;
    this.centreOver(col);
    events.push({ kind: 'ladder', rungs });
  }

  /** The lander winches the prospector up; whatever's in the bag is dropped and lost. */
  private recall(events: MineEvent[]): void {
    const lost = this.suit.bag.length;
    this.suit = emptyBag(this.suit);
    this.player = this.startBody();
    this.drilling = null;
    events.push({ kind: 'recall', lost });
  }

  private hurt(events: MineEvent[]): void {
    const r = hurt(this.suit, this.time);
    this.suit = r.suit;
    if (r.hit) events.push({ kind: 'hurt', hearts: this.suit.hearts });
  }

  private notice(key: string, events: MineEvent[], event: MineEvent): void {
    const last = this.said.get(key) ?? -Infinity;
    if (this.time - last < NOTICE_GAP) return;
    this.said.set(key, this.time);
    events.push(event);
  }
}
