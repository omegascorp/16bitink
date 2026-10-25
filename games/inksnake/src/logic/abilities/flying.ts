import type { LevelDef } from '../../level/types';
import type { Prompt } from '../enemyTypes';
import type { Fence } from '../snake';
import { dist, pt, type Pt } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** A glide goes this many times cruising speed, and turns this share of its usual rate: it can only steer a little. */
export const GLIDE_SPEED = 2.1;
export const GLIDE_TURN = 0.35;
/** The longest glide (held all the way), and the shortest (a tap), board px. */
export const MAX_GLIDE = 240;
export const MIN_GLIDE = 100;
/** It rises off the crown over the first this-many px, and comes down over the last this-many, board px. */
const RISE = 50;
export const LAND = 50;
/** How long it needs between glides, s. */
const REST = 1;
/** Off the trees, on the forest floor, it slithers this share of its speed. */
export const FLOOR_SPEED = 0.55;
/** A press this long before the head reaches a crown still launches it there, s. */
const BUFFER = 0.25;
/** After landing it may lie across its own body this long, s, as it gathers itself up. */
const LANDED_GRACE = 0.25;
/** "Climb a tree first" is said at most this often, s. */
const NAG_EVERY = 3;
/** Climbing a trunk back up to the crown takes this long (it holds still), s. */
const CLIMB_TIME = 0.4;
/** The crown's edge stays told this long after the head last pressed on it, s. */
const EDGE_TOLD = 1.6;

/** A round tree crown: the canopy is their union. */
interface Crown {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

const crownsOf = (level: LevelDef): readonly Crown[] =>
  (level.zones ?? []).flatMap((z) => (z.kind === 'tree' && z.shape === 'circle' ? [{ x: z.x, y: z.y, r: z.r }] : []));

/** What to tell the player, up and down. */
const PROMPTS = {
  floor: {
    mouse: 'Down on the forest floor: slow, and hunted. Slither to a tree to climb back up',
    touch: 'Down on the forest floor: slow, and hunted. Slither to a tree to climb back up',
  },
  edge: { mouse: 'The end of the branches: press E to glide to the next tree', touch: 'The end of the branches: tap Glide to sail to the next tree' },
} as const satisfies Record<string, Prompt>;

/**
 * Up in the canopy the crowns are the snake's whole world: the head keeps
 * to them (the end of the branches stops it), and only a glide crosses to
 * the next tree. A glide that comes down short drops it on the forest
 * floor, where it's slow and the monitor hunts, until it slithers to a
 * tree and climbs back up.
 *
 * The paradise flying snake glides: press the ability on a tree crown and
 * it launches off, flattens its body and sails through the air, fast but
 * barely able to steer. Hold it to glide further (up to MAX_GLIDE), let go
 * to come down sooner. In the air ground hunters can't reach it, and it
 * passes over its own coils; it lands wherever the glide ends: in a tree
 * it's at home, on the forest floor it's slow and has to slither back to a
 * trunk to climb again. Real glides average about 10 m (33 ft), up to
 * 21 m (69 ft). Only bats can be caught in the air (see the chapter's prey).
 */
export class Glide implements Ability {
  readonly id = 'glide';
  readonly label = 'Glide';
  readonly button = true;
  /** Px glided so far, or -1 on the ground. */
  private travel = -1;
  /** Where along the glide the landing began, px, or -1 while it's still sailing. */
  private landFrom = -1;
  private altAtLand = 0;
  private rest = 0;
  private asked = 0;
  private nag = 0;
  /** Up in the canopy (null until the first step finds where it starts). */
  private up: boolean | null = null;
  /** Seconds left of a climb back up a trunk. */
  private climbing = 0;
  /** Seconds the crown's edge stays told. */
  private edge = 0;
  private crowns: readonly Crown[] = [];
  private readonly fence: Fence = (p, r) => this.keepToCanopy(p, r);

  /** Down on the forest floor (the view shades the floor; the monitor can reach it). */
  get down(): boolean {
    return this.up === false && this.travel < 0;
  }

  prompt(): Prompt | null {
    if (this.travel >= 0 || this.climbing > 0) return null;
    if (this.up === false) return PROMPTS.floor;
    return this.edge > 0 ? PROMPTS.edge : null;
  }

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / REST : 1;
  }

  get active(): boolean {
    return this.travel >= 0;
  }

  /** Coming down: the glide can't be stretched any more. */
  get landing(): boolean {
    return this.landFrom >= 0;
  }

  /** Px left to glide if let go now (the view's landing marker, the bot). */
  get leftIfReleased(): number {
    if (this.travel < 0) return 0;
    if (this.landFrom >= 0) return Math.max(0, this.landFrom + LAND - this.travel);
    return Math.max(this.travel, MIN_GLIDE - LAND) + LAND - this.travel;
  }

  /** Px left to glide if held to the end. */
  get leftIfHeld(): number {
    if (this.travel < 0) return 0;
    return this.landFrom >= 0 ? this.leftIfReleased : MAX_GLIDE - this.travel;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    if (this.up === null) {
      this.crowns = crownsOf(ctx.level);
      this.up = ctx.inZone(s.head, 'tree');
    }
    this.rest = Math.max(0, this.rest - dt);
    this.asked = input.pressed ? BUFFER : Math.max(0, this.asked - dt);
    this.nag = Math.max(0, this.nag - dt);
    this.edge = Math.max(0, this.edge - dt);
    if (this.travel < 0) {
      if (this.asked > 0 && this.rest <= 0 && s.mode === 'move' && this.up && this.climbing <= 0) this.launch(ctx);
      else if (input.pressed && !this.up && this.nag <= 0) {
        this.nag = NAG_EVERY;
        ctx.emit({ type: 'say', text: 'Climb a tree first!', x: s.head.x, y: s.head.y - 30 });
      }
    } else if (s.mode !== 'move') this.land(ctx);
    else this.sail(ctx, input, dt);
    if (this.travel < 0) this.onFoot(ctx, dt);
  }

  /** Not gliding: kept to the crowns up in the canopy; slow on the floor, climbing the first tree it reaches. */
  private onFoot(ctx: AbilityCtx, dt: number): void {
    const s = ctx.snake;
    s.alt = 0;
    if (this.climbing > 0) {
      this.climbing = Math.max(0, this.climbing - dt);
      s.hold = true;
      s.fence = this.fence;
      return;
    }
    if (this.up) {
      // Last step's press on the edge of the branches (the board's edge says the same).
      if (s.bumped) this.edge = EDGE_TOLD;
      s.fence = this.fence;
      return;
    }
    s.speedScale = FLOOR_SPEED;
    if (ctx.inZone(s.head, 'tree') && s.mode === 'move') {
      this.up = true;
      this.climbing = CLIMB_TIME;
      ctx.emit({ type: 'say', text: 'Up the tree!', x: s.head.x, y: s.head.y - 30 });
    }
  }

  /** Keeps a head of radius r inside the canopy (the crowns' union): off it, back to the nearest crown's edge. */
  private keepToCanopy(p: Pt, _r: number): { readonly p: Pt; readonly n: Pt } | null {
    let best: Crown | null = null;
    let over = Infinity;
    for (const c of this.crowns) {
      const o = dist(p, c) - c.r;
      if (o <= 0) return null;
      if (o < over) {
        over = o;
        best = c;
      }
    }
    if (!best) return null;
    const d = dist(p, best) || 1;
    const ux = (p.x - best.x) / d;
    const uy = (p.y - best.y) / d;
    return { p: pt(best.x + ux * (best.r - 0.5), best.y + uy * (best.r - 0.5)), n: pt(-ux, -uy) };
  }

  private launch(ctx: AbilityCtx): void {
    const s = ctx.snake;
    this.travel = 0;
    this.landFrom = -1;
    this.asked = 0;
    ctx.emit({ type: 'say', text: 'Whoosh!', x: s.head.x, y: s.head.y - 30, sound: 'dive' });
    this.lift(ctx);
  }

  /** One step in the air: it rises, sails, and comes down once let go (or at the longest glide). */
  private sail(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    this.travel += s.spec.speed * GLIDE_SPEED * dt;
    const done = (!input.held && this.travel >= MIN_GLIDE - LAND) || this.travel >= MAX_GLIDE - LAND;
    if (this.landFrom < 0 && done) {
      this.landFrom = this.travel;
      this.altAtLand = s.alt;
    }
    if (this.landFrom >= 0 && this.travel >= this.landFrom + LAND) {
      this.land(ctx);
      return;
    }
    this.lift(ctx);
  }

  /** Cloaked in the air, fast and stiff, at its height on the glide. */
  private lift(ctx: AbilityCtx): void {
    const s = ctx.snake;
    s.cloak = 'air';
    s.speedScale = GLIDE_SPEED;
    s.turnScale = GLIDE_TURN;
    // Sailing over its own coils: the head can cross the body in the air.
    s.uncoil = Math.max(s.uncoil, 0.1);
    s.alt = this.landFrom >= 0
      ? this.altAtLand * Math.max(0, 1 - (this.travel - this.landFrom) / LAND)
      : Math.min(1, this.travel / RISE) * (1 - 0.25 * (this.travel / MAX_GLIDE));
  }

  private land(ctx: AbilityCtx): void {
    const s = ctx.snake;
    this.travel = -1;
    this.landFrom = -1;
    this.rest = REST;
    s.alt = 0;
    s.uncoil = Math.max(s.uncoil, LANDED_GRACE);
    this.up = ctx.inZone(s.head, 'tree');
    ctx.emit({ type: 'land', kind: 'glide', x: s.head.x, y: s.head.y });
    if (!this.up) ctx.emit({ type: 'say', text: 'Down on the floor!', x: s.head.x, y: s.head.y - 30, sound: 'bump' });
  }
}

export const FLYING: AbilityMaker = () => new Glide();
