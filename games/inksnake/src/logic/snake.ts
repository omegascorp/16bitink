import { bodyWidth, coilMaxOf, gapeOf, SNAKE_SPECS, STRIKE, type SnakeId, type SnakeSpec } from './species';
import { SPACING, Trail } from './trail';
import { clamp, dist, pt, pushOut, type Pt, type Shape, turnTowards, wrapAngle } from './vec';

/** What the player asks of the snake this frame. */
export interface SnakeInput {
  /** A board point to head for (the pointer or a finger), if any. */
  readonly toward: Pt | null;
  /** A direction to face (the keys), radians, if any. */
  readonly face: number | null;
  /** A strike was asked for this frame. */
  readonly strike: boolean;
  /** The snake's own ability (E, or its button): held now, and pressed this frame. */
  readonly ability?: boolean;
  readonly abilityPressed?: boolean;
  /** The pointer moved (or a finger dragged) this frame: the player is steering. */
  readonly moved?: boolean;
}

export const NO_INPUT: SnakeInput = { toward: null, face: null, strike: false };

/**
 * Why hunters can't see the snake, besides cover: playing dead, buried in
 * sand, under the water, or up in the air on a glide.
 */
export type Cloak = 'none' | 'dead' | 'buried' | 'submerged' | 'air';

/** A meter a snake's ability keeps (breath, warmth), for the HUD: 0 empty .. 1 full. */
export interface SnakeMeter {
  readonly label: string;
  readonly value: number;
  /** Running low: the HUD warns. */
  readonly low: boolean;
}

/** Growth goes on this fast once a meal is down, px/s, so the tail visibly lengthens. */
const GROW_RATE = 140;
/** A lump travels down the body this fast, px/s. */
const LUMP_SPEED = 95;
/** After a hit nothing can hurt the snake for this long, s. */
export const SAFE_TIME = 2;
/** A knot or a hit holds the snake still for this long, s. */
const STUN_TIME = 0.55;
/** The head ignores a pointer this close, px: it keeps going straight rather than spin on the spot. */
const DEAD_ZONE = 18;

/** A meal on its way down. `s` is how far back along the body it is, px. */
export interface Lump {
  s: number;
  readonly size: number;
}

/** Moving, held still by a squeeze or a swallow, or stunned by a knot or a hit. */
export type SnakeMode = 'move' | 'squeeze' | 'swallow' | 'stun';

export class Snake {
  readonly id: SnakeId;
  readonly spec: SnakeSpec;
  readonly trail: Trail;
  heading: number;
  mode: SnakeMode = 'move';
  /** Seconds left in a squeeze, swallow or stun. */
  modeTime = 0;
  /** Seconds left in a strike, and before the next one is allowed. */
  strikeTime = 0;
  strikeRest = 0;
  /** Seconds of safety left after a hit. */
  safe = 0;
  /** Seconds it may still cross its own body: sliding out of a coil. */
  uncoil = 0;
  readonly lumps: Lump[] = [];
  /** Growth still to come from meals already eaten, px. */
  pending = 0;
  /** It grows no longer than this (a level's target): past it a meal only scores, and the body stays one the board can hold. */
  maxLength = Infinity;
  /** The length the level started at: nips never take it shorter. */
  readonly startLength: number;
  /** The head is under cover this frame, or cloaked (set by the world). */
  hidden = false;
  /** What its ability hides it with, if anything (set by the ability each step). */
  cloak: Cloak = 'none';
  /** The ability's effect on speed and turning this step (the forest floor, the cold…). */
  speedScale = 1;
  turnScale = 1;
  /** Held still by its ability (playing dead, buried, luring): it doesn't move, but may still strike. */
  hold = false;
  /** Its ability's meter, if it keeps one. */
  meter: SnakeMeter | null = null;
  /** Height off the ground, 0..1, while gliding (the view lifts it off its shadow). */
  alt = 0;
  /** How far the head moved this frame, px (the slither sound follows it). */
  moved = 0;
  /** The head pushed against something solid this frame. */
  bumped = false;

  /** Which drawings it wears: its species, or a rival's own (a kingsnake, a rat snake). */
  readonly art: string;

  /** `spec` and `art` give a rival snake its own numbers and drawings. */
  constructor(id: SnakeId, head: Pt, heading: number, length: number, spec?: SnakeSpec, art?: string) {
    this.id = id;
    this.spec = spec ?? SNAKE_SPECS[id];
    this.art = art ?? id;
    this.heading = heading;
    this.startLength = length;
    this.trail = new Trail(head, heading, length);
  }

  get head(): Pt {
    return this.trail.head;
  }

  get length(): number {
    return this.trail.length;
  }

  get width(): number {
    return bodyWidth(this.spec, this.trail.length - this.startLength);
  }

  get gape(): number {
    return gapeOf(this.width, this.spec);
  }

  get coilMax(): number {
    return coilMaxOf(this.width);
  }

  get striking(): boolean {
    return this.strikeTime > 0;
  }

  /** Samples behind the head that the head can't bite: its neck. */
  get neck(): number {
    return Math.ceil((this.width * 4) / SPACING) + 1;
  }

  /** Current speed, px/s. */
  get speed(): number {
    if (this.mode !== 'move' || (this.hold && !this.striking)) return 0;
    return this.spec.speed * this.speedScale * (this.striking ? STRIKE.boost : 1);
  }

  /**
   * One step of movement: turn towards what the player asks, lunge if a
   * strike was asked, slide along anything solid, and lay the body down
   * behind. Returns true if a strike started.
   */
  steer(input: SnakeInput, dt: number, bounds: { readonly w: number; readonly h: number }, solids: readonly Shape[]): boolean {
    this.strikeRest = Math.max(0, this.strikeRest - dt);
    this.strikeTime = Math.max(0, this.strikeTime - dt);
    this.safe = Math.max(0, this.safe - dt);
    if (this.mode === 'move') this.uncoil = Math.max(0, this.uncoil - dt);
    this.moved = 0;
    this.bumped = false;
    if (this.mode !== 'move') return false;
    let struck = false;
    if (input.strike && this.strikeRest <= 0) {
      this.strikeTime = STRIKE.time;
      this.strikeRest = STRIKE.time + STRIKE.rest;
      struck = true;
    }
    const want = this.wanted(input);
    // A strike holds its line: it's a lunge, not a turn.
    if (want !== null && !this.striking && !this.hold) this.heading = turnTowards(this.heading, want, this.spec.turn * this.turnScale * dt);
    const d = this.speed * dt;
    const h = this.head;
    let next = pt(h.x + Math.cos(this.heading) * d, h.y + Math.sin(this.heading) * d);
    const r = this.width / 2;
    const slid = this.slide(next, r, bounds, solids);
    next = slid.p;
    if (slid.normal) {
      this.bumped = true;
      const along = Math.atan2(slid.normal.x, -slid.normal.y);
      this.heading = Math.cos(wrapAngle(this.heading - along)) >= 0 ? along : wrapAngle(along + Math.PI);
    }
    this.moved = dist(h, next);
    this.trail.moveHead(next);
    return struck;
  }

  /** The heading the player wants, or null to go straight on. */
  private wanted(input: SnakeInput): number | null {
    if (input.face !== null) return input.face;
    if (!input.toward) return null;
    const h = this.head;
    if (dist(h, input.toward) < DEAD_ZONE) return null;
    return Math.atan2(input.toward.y - h.y, input.toward.x - h.x);
  }

  /** Keeps a head of radius r on the board and out of solid things; the last surface met gives the normal. */
  private slide(p: Pt, r: number, bounds: { readonly w: number; readonly h: number }, solids: readonly Shape[]): { p: Pt; normal: Pt | null } {
    let q = p;
    let normal: Pt | null = null;
    const m = r + 2;
    const cx = clamp(q.x, m, bounds.w - m);
    const cy = clamp(q.y, m, bounds.h - m);
    if (cx !== q.x) normal = pt(q.x < m ? 1 : -1, 0);
    if (cy !== q.y) normal = pt(0, q.y < m ? 1 : -1);
    q = pt(cx, cy);
    for (const s of solids) {
      const out = pushOut(q, r, s);
      if (!out) continue;
      q = out.p;
      normal = out.n;
    }
    return { p: q, normal };
  }

  /** Lumps slide down and growth comes in. */
  digest(dt: number): void {
    for (const l of this.lumps) l.s += LUMP_SPEED * dt;
    for (let i = this.lumps.length - 1; i >= 0; i--) if (this.lumps[i]!.s > this.trail.length) this.lumps.splice(i, 1);
    if (this.pending > 0) {
      const g = Math.min(this.pending, GROW_RATE * dt);
      this.pending -= g;
      this.trail.length += g;
    }
  }

  /** A meal is down: a lump at the head, and `growth` px to come. */
  swallowed(size: number, growth: number): void {
    this.lumps.push({ s: this.width * 0.8, size });
    // A px over, so rounding never leaves it a hair short of the target.
    this.pending = Math.min(this.pending + growth, Math.max(0, this.maxLength + 1 - this.trail.length));
  }

  /** Loses up to `amount` px off the tail (never below the start length); returns how much went. */
  nip(amount: number): number {
    const room = Math.max(0, this.trail.length + this.pending - this.startLength);
    const lost = Math.min(amount, room);
    const fromPending = Math.min(this.pending, lost);
    this.pending -= fromPending;
    this.trail.length -= lost - fromPending;
    this.trail.trim();
    return lost;
  }

  /** A knot or a hit: held still a moment, then safe for a while. */
  hurt(): void {
    this.mode = 'stun';
    this.modeTime = STUN_TIME;
    this.strikeTime = 0;
    this.safe = SAFE_TIME;
  }

  /** Counts down a squeeze, swallow or stun; returns true when it just ended. */
  tickMode(dt: number): boolean {
    if (this.mode === 'move') return false;
    this.modeTime -= dt;
    if (this.modeTime > 0) return false;
    this.modeTime = 0;
    return true;
  }

  /**
   * The body sample the head is biting, past its neck, or -1. The head bites
   * when it crosses the body's middle line, not when it merely brushes it.
   */
  bitten(): number {
    if (this.safe > 0 || this.uncoil > 0 || this.mode !== 'move') return -1;
    const pts = this.trail.pts;
    const h = this.head;
    const reach = this.width * 0.5;
    const end = this.trail.count;
    for (let i = this.neck; i < end; i++) {
      if (dist(h, pts[i]!) < reach) return i;
    }
    return -1;
  }
}
