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

/**
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
    this.rest = Math.max(0, this.rest - dt);
    this.asked = input.pressed ? BUFFER : Math.max(0, this.asked - dt);
    this.nag = Math.max(0, this.nag - dt);
    if (this.travel < 0) {
      const onTree = ctx.inZone(s.head, 'tree');
      if (this.asked > 0 && this.rest <= 0 && s.mode === 'move' && onTree) this.launch(ctx);
      else if (input.pressed && !onTree && this.nag <= 0) {
        this.nag = NAG_EVERY;
        ctx.emit({ type: 'say', text: 'Climb a tree first!', x: s.head.x, y: s.head.y - 30 });
      }
    } else if (s.mode !== 'move') this.land(ctx);
    else this.sail(ctx, input, dt);
    if (this.travel < 0) {
      s.alt = 0;
      if (!ctx.inZone(s.head, 'tree')) s.speedScale = FLOOR_SPEED;
    }
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
    const onTree = ctx.inZone(s.head, 'tree');
    ctx.emit({ type: 'land', kind: 'glide', x: s.head.x, y: s.head.y });
    if (!onTree) ctx.emit({ type: 'say', text: 'Down on the floor!', x: s.head.x, y: s.head.y - 30, sound: 'bump' });
  }
}

export const FLYING: AbilityMaker = () => new Glide();
