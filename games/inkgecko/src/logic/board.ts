import { BOARD, type LevelDef, type ShooterDef } from '../level/types';
import { BURST_REACH, CHARM_SECONDS, HEDGEHOG_EATS, HEDGEHOG_SPEED, RAIN_HALF, SLOW_FACTOR, type CharmId } from './charms';
import { dealColour, paletteOf, type ColourId } from './colours';
import { FRUIT_EVERY, FRUIT_HIT, FRUIT_POINTS, rollFruit, spawnFruit, type Fruit, type FruitKind } from './fruit';
import { D, Line, SETTLE, type LineEvent, type Marble, type Spawned } from './line';
import { angleAt, buildPath, crossings, pointAt, type Pt } from './path';
import { createRng, type Rng } from './rng';

/** How far ahead of its centre the gecko holds the marble it spits, board px (the drawing's GECKO_MOUTH; the view scales it to match). */
export const MOUTH = 62;
/** Shot speed, board px/s; the Aim charm makes shots this much faster. */
export const SHOT_SPEED = 1150;
export const AIM_SHOT_FACTOR = 1.5;
/** Shortest time between two spits, s. */
export const RELOAD = 0.16;
/** How fast the gecko runs along its branch, board px/s. */
export const RAIL_SPEED = 1100;
/** How fast keys turn a pivot gecko, radians/s. */
export const PIVOT_TURN = 2.8;
/** Reverse rolls the line back at this speed. */
export const REVERSE_SPEED = 150;
/** On rail levels every this many pops drops a charm. */
export const DROP_EVERY = 3;
/** A falling charm's gravity and top speed. */
const DROP_GRAVITY = 520;
const DROP_MAX = 300;
/** Half the width the gecko catches a falling charm across. */
export const CATCH_HALF = 46;
/** On pivot levels a charm turns up on a marble about this often, s. */
const CHARM_EVERY = 9;
/** Lives a level. */
export const LIVES = 3;
/** After a marble falls in, the lines roll back this share of their track. */
export const REWIND_SHARE = 0.25;
/** A hop from one lily pad to another takes this long, s. */
export const HOP_TIME = 0.32;
/** A marble that touches a shot within this distance (centre to centre) is hit. */
const HIT_DIST = D * 0.86;
/** Chance a new marble from the burrow is the colour of the one ahead of it (clumps make matches). */
const SAME_CHANCE = 0.38;
/** Chameleon marbles all take the next colour this often, s. */
export const SHIFT_EVERY = 4;
/** Barn levels: shots bounce off timber walls this far inside the board's left, right and top edges. */
export const WALL_INSET = 14;
/** A shot bounces this many times at most, then flies out. */
export const MAX_BOUNCES = 3;
/** A shot glances off a pillar this many times at most (on top of any wall bounces). */
export const MAX_GLANCES = 4;
/** A shot marble's radius, for glancing off pillars. */
const SHOT_R = D / 2;
/** On a loss, what's left of the lines pours into the wells this fast, board px/s (Zuma's ending). */
export const DRAIN_SPEED = 700;

export const POINTS = { marble: 10, gap: 50, streak: 20 } as const;

export interface Shot {
  readonly id: number;
  readonly colour: ColourId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Gaps in the line it has flown through. */
  gaps: number;
  /** Walls it has bounced off (barn levels). */
  bounces: number;
  /** Pillars it has glanced off (the ruins). */
  glances: number;
  /** A Burst charm caught on a rail level: pops what it lands among instead of joining the line. */
  readonly burst: boolean;
  /** A Dragonfly: flies on through the whole board, popping every marble it touches. */
  readonly pierce: boolean;
  /** A Geode crystal: joins the line as the colour of the marble it hits. */
  readonly wild: boolean;
}

export interface Drop {
  readonly id: number;
  readonly charm: CharmId;
  readonly x: number;
  y: number;
  vy: number;
}

export interface BoardInput {
  /** Where the player points, board px (pivot: aim at it; rail: run under it). */
  readonly aim: Pt | null;
  readonly fire: boolean;
  readonly swap: boolean;
  /** Rail levels: run left (−1) or right (1) by keys. Pivot and hop levels: turn. */
  readonly move: number;
  /** Hop levels: the pad to hop to. */
  readonly hop: number | null;
}

export const NO_INPUT: BoardInput = { aim: null, fire: false, swap: false, move: 0, hop: null };

export type BoardEvent =
  | { readonly type: 'spit'; readonly x: number; readonly y: number; readonly colour: ColourId; readonly dragonfly: boolean; readonly geode: boolean }
  | { readonly type: 'hop'; readonly pad: number }
  | { readonly type: 'landed'; readonly pad: number }
  | { readonly type: 'swap' }
  | { readonly type: 'stuck'; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'miss' }
  | {
    readonly type: 'pop'; readonly x: number; readonly y: number; readonly colour: ColourId; readonly count: number;
    readonly combo: number; readonly points: number; readonly line: number; readonly marbles: readonly { x: number; y: number; colour: ColourId; stone?: boolean }[];
  }
  | { readonly type: 'pull'; readonly x: number; readonly y: number }
  | { readonly type: 'join'; readonly x: number; readonly y: number }
  | { readonly type: 'gap'; readonly x: number; readonly y: number; readonly gaps: number; readonly points: number }
  | { readonly type: 'streak'; readonly x: number; readonly y: number; readonly streak: number; readonly points: number }
  | { readonly type: 'charm'; readonly charm: CharmId; readonly x: number; readonly y: number }
  | { readonly type: 'drop'; readonly drop: Drop }
  | { readonly type: 'caught'; readonly charm: CharmId; readonly x: number; readonly y: number }
  | { readonly type: 'blossom'; readonly x: number; readonly y: number; readonly count: number }
  | { readonly type: 'windfall'; readonly fruit: Fruit }
  | { readonly type: 'bounce'; readonly x: number; readonly y: number }
  | { readonly type: 'shift'; readonly count: number }
  | { readonly type: 'rain'; readonly x: number }
  | { readonly type: 'hedgehog'; readonly line: number }
  | { readonly type: 'munch'; readonly x: number; readonly y: number }
  | { readonly type: 'hedgehogGone' }
  | { readonly type: 'sink'; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'fruit'; readonly x: number; readonly y: number; readonly kind: FruitKind; readonly points: number }
  | { readonly type: 'well'; readonly lives: number; readonly x: number; readonly y: number; readonly colour: ColourId }
  | { readonly type: 'filled' }
  | { readonly type: 'won' }
  | { readonly type: 'lost' };

export type BoardState = 'play' | 'won' | 'lost';

/** One level being played: the lines, the gecko and its marbles, shots in flight, charms, score and lives. */
export class Board {
  readonly lines: Line[];
  readonly palette: readonly ColourId[];
  readonly rail: boolean;
  readonly kind: ShooterDef['kind'];
  /** Hop levels: the pad the gecko is on (or hopping to). */
  pad = 0;
  /** A hop in the air: from where, and how far through (0..1). */
  hopping: { readonly from: Pt; readonly to: Pt; t: number } | null = null;
  /** The gecko: where it stands and which way it faces (radians, 0 = right). */
  readonly gecko: { x: number; y: number; angle: number };
  loaded: ColourId;
  next: ColourId;
  shots: Shot[] = [];
  drops: Drop[] = [];
  score = 0;
  lives = LIVES;
  elapsed = 0;
  streak = 0;
  filled = false;
  state: BoardState = 'play';
  /** Seconds left on each lasting charm. */
  readonly timers: Record<'slow' | 'reverse' | 'aim' | 'lantern', number> = { slow: 0, reverse: 0, aim: 0, lantern: 0 };
  /** A Burst charm caught on a rail level, for the next spit. */
  burstArmed = false;
  /** A Dragonfly charm, for the next spit. */
  dragonfly = false;
  /** A Geode charm, for the next spit. */
  geode = false;
  /** Windfalls rolling across the board (orchard levels). */
  fruits: Fruit[] = [];
  /** The Hedgehog trundling up a line from its well, and how many more marbles it will eat. */
  hedgehog: { readonly line: number; s: number; left: number } | null = null;
  /** Seconds until the chameleon marbles next change colour. */
  shiftIn = SHIFT_EVERY;
  /** Best combo and longest streak this level, for the result card. */
  best = { combo: 0, streak: 0 };
  private readonly rng: Rng;
  private ids = 1;
  private reload = 0;
  private railTarget: number | null = null;
  private queuedFire = false;
  private popsSinceDrop = 0;
  private charmClock = 0;
  /** Shots that joined the line, waiting to see if they pop (for the streak). */
  private waiting = new Map<number, number>();
  /** Gaps each waiting shot flew through: paid out if it pops. */
  private readonly gapsFor = new Map<number, number>();
  /** Each line's covered stretches (tunnels), in distance along its track. */
  private readonly covers: readonly (readonly [number, number])[][];
  /** Each line's stretches carried over a crossing, in distance along its track. */
  private readonly lifts: readonly (readonly [number, number])[][];
  private fruitClock = 0;
  private drained = 0;

  constructor(readonly level: LevelDef, seed = Date.now()) {
    this.rng = createRng(seed);
    this.palette = paletteOf(level.colours);
    this.lines = level.tracks.map((t) => new Line(buildPath(t.points), (behind) => this.spawnNext(behind), () => this.ids++));
    const stretches = (list: readonly { from: number; to: number }[] | undefined, i: number): (readonly [number, number])[] =>
      (list ?? []).map((c) => [c.from * this.lines[i]!.path.length, c.to * this.lines[i]!.path.length] as const);
    this.covers = level.tracks.map((t, i) => stretches(t.tunnels, i));
    this.lifts = level.tracks.map((t, i) => stretches(t.raised, i));
    const s = level.shooter;
    this.rail = s.kind === 'rail';
    this.kind = s.kind;
    const start = s.kind === 'pivot' ? s : s.kind === 'hop' ? s.pads[0]! : { x: (s.x0 + s.x1) / 2, y: s.y };
    this.gecko = { x: start.x, y: start.y, angle: -Math.PI / 2 };
    this.loaded = this.palette[Math.floor(this.rng() * this.palette.length)]!;
    this.next = this.palette[Math.floor(this.rng() * this.palette.length)]!;
  }

  /** How full the bar is, 0..1. */
  get progress(): number {
    return Math.min(1, this.score / this.level.goal);
  }

  /** How close the nearest line is to its well, 0..1. */
  get danger(): number {
    return Math.max(0, ...this.lines.map((l) => (l.marbles.length ? l.front() / l.path.length : 0)));
  }

  /** Where marble `m` of `line` is on the board. */
  marbleAt(line: Line, m: Marble): Pt {
    return pointAt(line.path, m.s);
  }

  /** Whether distance `s` along line `li` is under a tunnel. */
  covered(li: number, s: number): boolean {
    return this.covers[li]?.some(([a, b]) => s >= a && s <= b) ?? false;
  }

  /** Whether distance `s` along line `li` is carried over a crossing (drawn above the tunnel below). */
  raised(li: number, s: number): boolean {
    return this.lifts[li]?.some(([a, b]) => s >= a && s <= b) ?? false;
  }

  /**
   * After a loss, the rest of every line rushes on into its well, a marble
   * at a time down the hole; true once all of it has gone.
   */
  drain(dt: number, events: BoardEvent[]): boolean {
    if (this.state !== 'lost') return true;
    // Faster and faster, so a long line is gone in a couple of seconds.
    this.drained += dt;
    const speed = DRAIN_SPEED * (1 + this.drained * 2.5);
    for (const line of this.lines) {
      for (const m of line.drain(dt, speed)) events.push({ type: 'sink', ...pointAt(line.path, line.path.length), colour: m.colour });
    }
    return this.lines.every((l) => !l.marbles.length);
  }

  /** Where a spit leaves the gecko's mouth. */
  mouth(): Pt {
    return { x: this.gecko.x + Math.cos(this.gecko.angle) * MOUTH, y: this.gecko.y + Math.sin(this.gecko.angle) * MOUTH };
  }

  step(input: BoardInput, dt: number): BoardEvent[] {
    const events: BoardEvent[] = [];
    if (this.state !== 'play') return events;
    this.elapsed += dt;
    this.reload = Math.max(0, this.reload - dt);
    for (const k of Object.keys(this.timers) as (keyof Board['timers'])[]) this.timers[k] = Math.max(0, this.timers[k] - dt);
    this.aimAndMove(input, dt);
    if (input.swap) this.swap(events);
    if (input.fire) this.queuedFire = true;
    if (input.hop !== null) this.hop(input.hop, events);
    this.stepHop(dt, events);
    if (this.queuedFire && this.reload <= 0 && this.atRailTarget() && !this.hopping) this.spit(events);
    this.stepShots(dt, events);
    this.stepLines(dt, events);
    this.stepDrops(dt, events);
    this.stepFruit(dt, events);
    this.stepHedgehog(dt, events);
    this.stepShift(dt, events);
    this.placeCharms(dt);
    this.refreshColours();
    this.expireWaiting();
    this.checkEnd(events);
    return events;
  }

  private aimAndMove(input: BoardInput, dt: number): void {
    const g = this.gecko;
    const s = this.level.shooter;
    if (s.kind !== 'rail') {
      if (input.move !== 0) g.angle += input.move * PIVOT_TURN * dt;
      else if (input.aim) g.angle = Math.atan2(input.aim.y - g.y, input.aim.x - g.x);
      return;
    }
    if (input.move !== 0) this.railTarget = g.x + input.move * RAIL_SPEED * dt;
    else if (input.aim) this.railTarget = input.aim.x;
    if (this.railTarget === null) return;
    const target = Math.max(s.x0, Math.min(s.x1, this.railTarget));
    const step = RAIL_SPEED * dt;
    g.x = Math.abs(target - g.x) <= step ? target : g.x + Math.sign(target - g.x) * step;
  }

  private atRailTarget(): boolean {
    if (!this.rail || this.railTarget === null || this.level.shooter.kind !== 'rail') return true;
    const s = this.level.shooter;
    return Math.abs(Math.max(s.x0, Math.min(s.x1, this.railTarget)) - this.gecko.x) < 4;
  }

  /** Hop levels: jump to another pad (not mid-hop). */
  private hop(pad: number, events: BoardEvent[]): void {
    const s = this.level.shooter;
    if (s.kind !== 'hop' || this.hopping || pad === this.pad || !s.pads[pad]) return;
    this.hopping = { from: { x: this.gecko.x, y: this.gecko.y }, to: s.pads[pad]!, t: 0 };
    this.pad = pad;
    events.push({ type: 'hop', pad });
  }

  private stepHop(dt: number, events: BoardEvent[]): void {
    const h = this.hopping;
    if (!h) return;
    h.t = Math.min(1, h.t + dt / HOP_TIME);
    const k = h.t * h.t * (3 - 2 * h.t);
    this.gecko.x = h.from.x + (h.to.x - h.from.x) * k;
    this.gecko.y = h.from.y + (h.to.y - h.from.y) * k;
    if (h.t < 1) return;
    this.hopping = null;
    events.push({ type: 'landed', pad: this.pad });
  }

  private swap(events: BoardEvent[]): void {
    [this.loaded, this.next] = [this.next, this.loaded];
    events.push({ type: 'swap' });
  }

  private spit(events: BoardEvent[]): void {
    this.queuedFire = false;
    this.reload = RELOAD;
    const from = this.mouth();
    const speed = SHOT_SPEED * (this.timers.aim > 0 ? AIM_SHOT_FACTOR : 1);
    const a = this.gecko.angle;
    const pierce = this.dragonfly;
    const wild = !pierce && this.geode;
    this.shots.push({
      id: this.ids++, colour: this.loaded, x: from.x, y: from.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, gaps: 0, bounces: 0, glances: 0,
      burst: this.burstArmed && !pierce && !wild, pierce, wild,
    });
    events.push({ type: 'spit', x: from.x, y: from.y, colour: this.loaded, dragonfly: pierce, geode: wild });
    // A Dragonfly or a Geode goes instead of a marble: the gecko keeps the one in its mouth.
    if (pierce || wild) {
      if (pierce) this.dragonfly = false;
      else this.geode = false;
      return;
    }
    this.burstArmed = false;
    this.loaded = this.next;
    this.next = dealColour(this.rng, this.coloursInPlay(), this.palette);
  }

  private stepShots(dt: number, events: BoardEvent[]): void {
    const kept: Shot[] = [];
    for (const shot of this.shots) {
      if (this.flyShot(shot, dt, events)) kept.push(shot);
    }
    this.shots = kept;
  }

  /** Moves a shot in small steps, noting gaps flown through; false once it has landed or left the board. */
  private flyShot(shot: Shot, dt: number, events: BoardEvent[]): boolean {
    const dist = Math.hypot(shot.vx, shot.vy) * dt;
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 0; i < steps; i++) {
      const from = { x: shot.x, y: shot.y };
      shot.x += (shot.vx * dt) / steps;
      shot.y += (shot.vy * dt) / steps;
      if (this.level.walls) this.bounce(shot, events);
      if (this.level.pillars) this.glance(shot, events);
      if (!shot.pierce && this.hitFruit(shot, events)) return false;
      const hit = this.hitAt(shot);
      if (hit && shot.pierce) {
        this.pierce(hit.line, hit.index, events);
        continue;
      }
      if (hit) {
        this.land(shot, hit.line, hit.index, events);
        return false;
      }
      // Only a shot that flies on past the track has gone through a gap (not one that clips a marble at its edge).
      this.lines.forEach((line, li) => {
        for (const s of crossings(line.path, from, shot)) if (inGap(line, s) && !this.covered(li, s)) shot.gaps++;
      });
    }
    const out = shot.x < -D || shot.x > BOARD.w + D || shot.y < -D || shot.y > BOARD.h + D;
    if (out && !shot.pierce) {
      this.streak = 0;
      events.push({ type: 'miss' });
    }
    return !out;
  }

  /** Barn levels: a shot that reaches a wall comes off it like a ball off a cushion. */
  private bounce(shot: Shot, events: BoardEvent[]): void {
    if (shot.bounces >= MAX_BOUNCES) return;
    const lo = WALL_INSET;
    const hi = BOARD.w - WALL_INSET;
    let hit = false;
    if (shot.x < lo && shot.vx < 0) {
      shot.x = 2 * lo - shot.x;
      shot.vx = -shot.vx;
      hit = true;
    } else if (shot.x > hi && shot.vx > 0) {
      shot.x = 2 * hi - shot.x;
      shot.vx = -shot.vx;
      hit = true;
    }
    if (shot.y < lo && shot.vy < 0) {
      shot.y = 2 * lo - shot.y;
      shot.vy = -shot.vy;
      hit = true;
    }
    if (!hit) return;
    shot.bounces++;
    events.push({ type: 'bounce', x: shot.x, y: shot.y });
  }

  /** The ruins: a shot that meets a pillar glances off it, mirrored about the pillar's surface. */
  private glance(shot: Shot, events: BoardEvent[]): void {
    if (shot.glances >= MAX_GLANCES) return;
    for (const p of this.level.pillars ?? []) {
      const dx = shot.x - p.x;
      const dy = shot.y - p.y;
      const d = Math.hypot(dx, dy);
      const reach = p.r + SHOT_R;
      if (d >= reach || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const along = shot.vx * nx + shot.vy * ny;
      // Only a shot still heading in is turned (one already leaving it just flies on).
      if (along >= 0) continue;
      shot.vx -= 2 * along * nx;
      shot.vy -= 2 * along * ny;
      shot.x = p.x + nx * reach;
      shot.y = p.y + ny * reach;
      shot.glances++;
      events.push({ type: 'bounce', x: shot.x - nx * SHOT_R, y: shot.y - ny * SHOT_R });
      return;
    }
  }

  /** The nearest marble a shot touches. */
  private hitAt(p: Pt): { line: number; index: number } | null {
    let best: { line: number; index: number; d: number } | null = null;
    this.lines.forEach((line, li) => {
      line.marbles.forEach((m, index) => {
        if (m.s < 0 || m.s > line.path.length || this.covered(li, m.s)) return;
        const at = pointAt(line.path, m.s);
        const d = Math.hypot(at.x - p.x, at.y - p.y);
        if (d < HIT_DIST && (!best || d < best.d)) best = { line: li, index, d };
      });
    });
    return best;
  }

  /** A shot joins the line next to the marble it hit, on the side it hit (or bursts there). */
  private land(shot: Shot, li: number, index: number, events: BoardEvent[]): void {
    const line = this.lines[li]!;
    const m = line.marbles[index]!;
    const at = pointAt(line.path, m.s);
    if (shot.burst) {
      this.burstAt(at, events);
      return;
    }
    const a = angleAt(line.path, m.s);
    const ahead = (shot.x - at.x) * Math.cos(a) + (shot.y - at.y) * Math.sin(a) > 0;
    const lineEvents: LineEvent[] = [];
    const colour = shot.wild ? wildColour(line, index, shot.colour) : shot.colour;
    const placed = line.insert(index, ahead ? 'front' : 'back', colour, shot.id, lineEvents);
    const p = pointAt(line.path, placed.s);
    events.push({ type: 'stuck', x: p.x, y: p.y, colour });
    for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    this.waiting.set(shot.id, this.elapsed + SETTLE + 0.1);
    if (shot.gaps > 0) this.gapsFor.set(shot.id, shot.gaps);
  }

  /** A Dragonfly flying through: the marble it touched pops on its own. */
  private pierce(li: number, index: number, events: BoardEvent[]): void {
    const line = this.lines[li]!;
    const lineEvents: LineEvent[] = [];
    line.popIds(new Set([line.marbles[index]!.id]), 0, null, lineEvents);
    for (const e of lineEvents) this.onLineEvent(line, li, e, events);
  }

  private stepLines(dt: number, events: BoardEvent[]): void {
    const speed = this.timers.reverse > 0 ? -REVERSE_SPEED : this.level.speed * (this.timers.slow > 0 ? SLOW_FACTOR : 1);
    this.lines.forEach((line, li) => {
      const lineEvents: LineEvent[] = [];
      line.step(dt, speed, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    });
  }

  private onLineEvent(line: Line, li: number, e: LineEvent, events: BoardEvent[]): void {
    if (e.type === 'pop') this.scorePop(line, li, e, events);
    else if (e.type === 'pull') events.push({ type: 'pull', ...pointAt(line.path, e.s) });
    else if (e.type === 'join') events.push({ type: 'join', ...pointAt(line.path, e.s) });
    else if (e.type === 'fell') this.fell(line, e.marble, events);
    else if (e.type === 'blossom') events.push({ type: 'blossom', ...pointAt(line.path, e.marbles[0]!.s), count: e.marbles.length });
  }

  private scorePop(line: Line, li: number, e: Extract<LineEvent, { type: 'pop' }>, events: BoardEvent[]): void {
    const spots = e.marbles.map((m) => ({ ...pointAt(line.path, m.s), colour: m.colour, ...(m.stone ? { stone: true } : {}) }));
    const mid = spots[Math.floor(spots.length / 2)]!;
    const points = e.marbles.length * POINTS.marble * (1 + e.combo);
    this.addScore(points, events);
    this.best.combo = Math.max(this.best.combo, e.combo);
    events.push({ type: 'pop', x: mid.x, y: mid.y, colour: (e.marbles.find((m) => !m.stone) ?? e.marbles[0]!).colour, count: e.marbles.length, combo: e.combo, points, line: li, marbles: spots });
    if (e.shot !== null && this.waiting.delete(e.shot)) {
      this.streak++;
      this.best.streak = Math.max(this.best.streak, this.streak);
      if (this.streak >= 3) {
        const bonus = POINTS.streak * (this.streak - 2);
        this.addScore(bonus, events);
        events.push({ type: 'streak', x: mid.x, y: mid.y, streak: this.streak, points: bonus });
      }
      const gaps = this.gapsFor.get(e.shot) ?? 0;
      this.gapsFor.delete(e.shot);
      if (gaps > 0) {
        const bonus = POINTS.gap * gaps;
        this.addScore(bonus, events);
        events.push({ type: 'gap', x: mid.x, y: mid.y, gaps, points: bonus });
      }
    }
    for (const m of e.marbles) {
      if (m.charm) this.useCharm(m.charm, pointAt(line.path, m.s), m.stone ? this.loaded : m.colour, events);
    }
    if (this.rail) this.maybeDrop(mid, events);
  }

  private addScore(points: number, events: BoardEvent[]): void {
    this.score += points;
    if (!this.filled && this.score >= this.level.goal) {
      this.filled = true;
      for (const line of this.lines) line.spawning = false;
      events.push({ type: 'filled' });
    }
  }

  private useCharm(charm: CharmId, at: Pt, colour: ColourId, events: BoardEvent[]): void {
    events.push({ type: 'charm', charm, x: at.x, y: at.y });
    this.arm(charm, at, colour, events);
  }

  /**
   * A charm takes effect: Burst pops round `at`, the Ink Pot pops every
   * marble of `colour`, Dragonfly and Geode wait for the next spit, the
   * rest run for a while.
   */
  private arm(charm: CharmId, at: Pt, colour: ColourId, events: BoardEvent[]): void {
    if (charm === 'burst') this.burstAt(at, events);
    else if (charm === 'inkpot') this.popColour(colour, events);
    else if (charm === 'dragonfly') this.dragonfly = true;
    else if (charm === 'geode') this.geode = true;
    else if (charm === 'rain') this.rainAt(at.x, events);
    else if (charm === 'hedgehog') this.sendHedgehog(events);
    else this.timers[charm] = CHARM_SECONDS[charm];
    // Reverse ends a Slow, however it came (a marble, a windfall or a catch).
    if (charm === 'reverse') this.timers.slow = 0;
  }

  /** The Ink Pot: every marble of one colour, on every line, pops. */
  private popColour(colour: ColourId, events: BoardEvent[]): void {
    this.lines.forEach((line, li) => {
      const ids = new Set(line.marbles.filter((m) => m.s >= 0 && !m.stone && m.colour === colour).map((m) => m.id));
      const lineEvents: LineEvent[] = [];
      line.popIds(ids, 0, null, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    });
  }

  /** Rain: every open marble in a column down the whole board pops (tunnels keep theirs dry). */
  private rainAt(x: number, events: BoardEvent[]): void {
    events.push({ type: 'rain', x });
    this.lines.forEach((line, li) => {
      const ids = new Set(line.marbles.filter((m) => m.s >= 0 && !this.covered(li, m.s) && Math.abs(pointAt(line.path, m.s).x - x) <= RAIN_HALF).map((m) => m.id));
      const lineEvents: LineEvent[] = [];
      line.popIds(ids, 0, null, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    });
  }

  /** The Hedgehog sets off up the line nearest its well (one already out just gets hungrier). */
  private sendHedgehog(events: BoardEvent[]): void {
    if (this.hedgehog) {
      this.hedgehog.left += HEDGEHOG_EATS;
      return;
    }
    const li = this.lines.reduce((best, l, i) => (l.marbles.length && l.front() / l.path.length > (this.lines[best]!.marbles.length ? this.lines[best]!.front() / this.lines[best]!.path.length : -1) ? i : best), 0);
    const line = this.lines[li]!;
    if (!line.marbles.length) return;
    this.hedgehog = { line: li, s: line.path.length, left: HEDGEHOG_EATS };
    events.push({ type: 'hedgehog', line: li });
  }

  /** The Hedgehog trundles up its line from the well, eating the front marble each time it reaches one. */
  private stepHedgehog(dt: number, events: BoardEvent[]): void {
    const h = this.hedgehog;
    if (!h) return;
    const line = this.lines[h.line]!;
    const front = line.marbles[line.marbles.length - 1];
    // It scurries along empty track, and slows to nibble once it reaches the line.
    const far = !front || h.s - front.s > D * 3;
    h.s -= HEDGEHOG_SPEED * (far ? 3.5 : 1) * dt;
    if (front && front.s >= 0 && front.s + D * 0.5 >= h.s) {
      h.s = Math.min(h.s, front.s + D * 0.5);
      const lineEvents: LineEvent[] = [];
      line.popIds(new Set([front.id]), 0, null, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, h.line, e, events);
      events.push({ type: 'munch', ...pointAt(line.path, Math.max(0, h.s)) });
      h.left--;
    }
    if (h.left > 0 && h.s > 0 && line.marbles.some((m) => m.s >= 0)) return;
    this.hedgehog = null;
    events.push({ type: 'hedgehogGone' });
  }

  /** Chameleon marbles all take the next of the level's colours, together, every few seconds. */
  private stepShift(dt: number, events: BoardEvent[]): void {
    if (!this.level.chameleons) return;
    this.shiftIn -= dt;
    if (this.shiftIn > 0) return;
    this.shiftIn = SHIFT_EVERY;
    let count = 0;
    for (const line of this.lines) {
      for (const m of line.marbles.filter((q) => q.chameleon)) {
        const i = this.palette.indexOf(m.colour);
        line.recolour(m.id, this.palette[(i + 1) % this.palette.length]!);
        count++;
      }
    }
    if (count) events.push({ type: 'shift', count });
  }

  /** Orchard levels: now and then a windfall rolls across, clear of the gecko's branch. */
  private stepFruit(dt: number, events: BoardEvent[]): void {
    this.fruits = this.fruits.filter((f) => rollFruit(f, dt));
    if (!this.level.fruit || this.filled) return;
    this.fruitClock += dt;
    if (this.fruitClock < FRUIT_EVERY) return;
    this.fruitClock = 0;
    const bottom = this.rail ? this.gecko.y - 140 : BOARD.h - 110;
    const fruit = spawnFruit(this.rng, this.ids++, 110, bottom);
    this.fruits.push(fruit);
    events.push({ type: 'windfall', fruit });
  }

  /** A shot that hits a windfall: points, and one of the level's charms. */
  private hitFruit(shot: Shot, events: BoardEvent[]): boolean {
    const f = this.fruits.find((q) => Math.hypot(q.x - shot.x, q.y - shot.y) < FRUIT_HIT);
    if (!f) return false;
    this.fruits = this.fruits.filter((q) => q !== f);
    this.addScore(FRUIT_POINTS, events);
    events.push({ type: 'fruit', x: f.x, y: f.y, kind: f.kind, points: FRUIT_POINTS });
    const charms = this.level.charms;
    if (charms.length) {
      const charm = charms[Math.floor(this.rng() * charms.length)]!;
      events.push({ type: 'charm', charm, x: f.x, y: f.y });
      if (charm === 'burst') this.burstArmed = true;
      else this.arm(charm, f, shot.colour, events);
    }
    return true;
  }

  /** Pops every marble within Burst's reach of `at`, on every line. */
  private burstAt(at: Pt, events: BoardEvent[]): void {
    this.lines.forEach((line) => {
      const ids = new Set(line.marbles.filter((m) => {
        if (m.s < 0) return false;
        const p = pointAt(line.path, m.s);
        return Math.hypot(p.x - at.x, p.y - at.y) <= BURST_REACH * D;
      }).map((m) => m.id));
      const lineEvents: LineEvent[] = [];
      line.popIds(ids, 0, null, lineEvents);
      const li = this.lines.indexOf(line);
      for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    });
  }

  private maybeDrop(at: Pt, events: BoardEvent[]): void {
    if (!this.level.charms.length) return;
    this.popsSinceDrop++;
    if (this.popsSinceDrop < DROP_EVERY) return;
    this.popsSinceDrop = 0;
    const charm = this.level.charms[Math.floor(this.rng() * this.level.charms.length)]!;
    const drop: Drop = { id: this.ids++, charm, x: at.x, y: at.y, vy: 0 };
    this.drops.push(drop);
    events.push({ type: 'drop', drop });
  }

  private stepDrops(dt: number, events: BoardEvent[]): void {
    const g = this.gecko;
    this.drops = this.drops.filter((d) => {
      d.vy = Math.min(DROP_MAX, d.vy + DROP_GRAVITY * dt);
      d.y += d.vy * dt;
      if (Math.abs(d.y - g.y) < 26 && Math.abs(d.x - g.x) < CATCH_HALF) {
        events.push({ type: 'caught', charm: d.charm, x: d.x, y: d.y });
        if (d.charm === 'burst') this.burstArmed = true;
        else this.arm(d.charm, d, this.loaded, events);
        return false;
      }
      return d.y < BOARD.h + 40;
    });
  }

  /** On pivot levels, now and then a charm turns up on a marble in the open part of a line. */
  private placeCharms(dt: number): void {
    if (this.rail || !this.level.charms.length) return;
    this.charmClock += dt;
    if (this.charmClock < CHARM_EVERY) return;
    const open = this.lines.flatMap((line, li) => line.marbles.filter((m) => !m.charm && !m.stone && m.s > line.path.length * 0.08 && m.s < line.path.length * 0.8 && !this.covered(li, m.s)));
    if (!open.length) return;
    this.charmClock = 0;
    const m = open[Math.floor(this.rng() * open.length)]!;
    m.charm = this.level.charms[Math.floor(this.rng() * this.level.charms.length)]!;
    m.charmAge = 0;
  }

  /** A marble in the well costs a life and rolls every line back. */
  private fell(line: Line, m: Marble, events: BoardEvent[]): void {
    this.lives = Math.max(0, this.lives - 1);
    const at = pointAt(line.path, line.path.length);
    events.push({ type: 'well', lives: this.lives, x: at.x, y: at.y, colour: m.colour });
    for (const l of this.lines) l.rewind = l.path.length * REWIND_SHARE;
  }

  /** The gecko is only given colours still in play. */
  private refreshColours(): void {
    const inPlay = this.coloursInPlay();
    if (!inPlay.size) return;
    if (!inPlay.has(this.loaded)) this.loaded = dealColour(this.rng, inPlay, this.palette);
    if (!inPlay.has(this.next)) this.next = dealColour(this.rng, inPlay, this.palette);
  }

  private coloursInPlay(): Set<ColourId> {
    const all = new Set<ColourId>();
    for (const line of this.lines) for (const c of line.colours()) all.add(c);
    return all;
  }

  /** Shots that joined the line but didn't pop in time break the streak. */
  private expireWaiting(): void {
    for (const [id, until] of this.waiting) {
      if (until > this.elapsed) continue;
      this.waiting.delete(id);
      this.gapsFor.delete(id);
      this.streak = 0;
    }
  }

  private checkEnd(events: BoardEvent[]): void {
    if (this.lives <= 0) {
      this.state = 'lost';
      events.push({ type: 'lost' });
    } else if (this.filled && this.lines.every((l) => l.marbles.length === 0)) {
      this.state = 'won';
      events.push({ type: 'won' });
    }
  }

  /** The next marble out of a burrow: now and then a stone, a bud, a chameleon or one tied on (if the level has them), else a colour. */
  private spawnNext(behind: readonly ColourId[]): Spawned {
    const colour = this.spawnColour(behind);
    const l = this.level;
    if (l.stones && this.rng() < l.stones) return { colour, stone: true };
    if (l.buds && this.rng() < l.buds) return { colour, bud: true };
    if (l.chameleons && this.rng() < l.chameleons) return { colour, chameleon: true };
    if (l.twine && this.rng() < l.twine) return { colour, tie: true };
    return { colour };
  }

  /** A colour for the next marble out of a burrow: often the same as the one ahead, never a third alike. */
  private spawnColour(behind: readonly ColourId[]): ColourId {
    const [a, b] = behind;
    if (a && a === b) {
      const others = this.palette.filter((c) => c !== a);
      return others[Math.floor(this.rng() * others.length)] ?? a;
    }
    if (a && this.rng() < SAME_CHANCE) return a;
    return this.palette[Math.floor(this.rng() * this.palette.length)]!;
  }
}

/** The colour a Geode takes: the marble it hit, or its nearest neighbour that isn't a stone. */
function wildColour(line: Line, index: number, fallback: ColourId): ColourId {
  const ms = line.marbles;
  for (let d = 0; d < ms.length; d++) {
    for (const i of [index - d, index + d]) {
      const m = ms[i];
      if (m && !m.stone) return m.colour;
    }
  }
  return fallback;
}

/** Whether distance `s` along a line's track lies in a gap between two of its marbles. */
function inGap(line: Line, s: number): boolean {
  const ms = line.marbles;
  for (let i = 1; i < ms.length; i++) {
    const a = ms[i - 1]!;
    const b = ms[i]!;
    if (s > a.s + HIT_DIST && s < b.s - HIT_DIST) return true;
  }
  return false;
}
