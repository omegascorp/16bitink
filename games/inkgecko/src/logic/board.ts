import { BOARD, type LevelDef, type ShooterDef } from '../level/types';
import { Boss, swat, swatted, type Arena } from './boss';
import { CHARM_SECONDS, HEDGEHOG_EATS, pickCharm, SLOW_FACTOR, type CharmId } from './charms';
import { dealColour, paletteOf, type ColourId } from './colours';
import { bounce, glance, HIT_DIST, inGap, SHOT_R, wildColour } from './flight';
import { FRUIT_EVERY, FRUIT_HIT, FRUIT_POINTS, rollFruit, spawnFruit, type Fruit } from './fruit';
import { goalProgress, GOLD_SHARE, GOLD_SPARE, timeLeft } from './goal';
import { D, Line, SETTLE, type LineEvent, type Marble, type Spawned } from './line';
import { angleAt, buildPath, crossings, pointAt, type Pt } from './path';
import { createRng, type Rng } from './rng';
import { dropNear, hedgehogDone, hedgehogLine, inColumn, nearPoint, ofColour, sendHedgehog, stepHedgehog, type Hedgehog, type Pick } from './sweeps';
import { Twists, wanderAt } from './twists';
import type { BoardEvent, BoardInput, BoardState, Drop, LossCause, Shot } from './boardTypes';

export { NO_INPUT, type BoardEvent, type BoardInput, type BoardState, type Drop, type LossCause, type Shot } from './boardTypes';
export { MAX_BOUNCES, MAX_GLANCES, WALL_INSET } from './flight';

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
export const DROP_EVERY = 4;
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
/** Chance a new marble from the burrow is the colour of the one ahead of it (clumps make matches). */
const SAME_CHANCE = 0.38;
/** Chameleon marbles all take the next colour this often, s. */
export const SHIFT_EVERY = 4;
/** On a loss, what's left of the lines pours into the wells this fast, board px/s (Zuma's ending). */
export const DRAIN_SPEED = 700;

export const POINTS = { marble: 10, gap: 50, streak: 20 } as const;

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
  hedgehog: Hedgehog | null = null;
  /** Seconds until the chameleon marbles next change colour. */
  shiftIn = SHIFT_EVERY;
  /** Best combo and longest streak this level, for the result card. */
  best = { combo: 0, streak: 0 };
  /** The level's lives (three, unless it says otherwise). */
  readonly maxLives: number;
  /** The level's twist as it plays out: wind, surges, tides, leaves, a restless pad. */
  readonly twists: Twists;
  /** The chapter's boss, on its last level. */
  readonly boss: Boss | null;
  /** Gold levels: golden marbles popped so far. */
  goldPopped = 0;
  /** Why the level was lost. */
  lostBy: LossCause = 'well';
  /** Late burrows: which lines are still shut, waiting for the bar. */
  private readonly shut: boolean[];
  /** The level's last colour, held back until the bar is full enough (colourAt). */
  private heldColour: ColourId | null;
  private readonly rng: Rng;
  private ids = 1;
  private reload = 0;
  private railTarget: number | null = null;
  private queuedFire = false;
  private popsSinceDrop = 0;
  private charmClock = 0;
  /** The charm given last, so the next one is a different one when it can be. */
  private lastCharm: CharmId | null = null;
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
  /** The step's events, for line events that happen outside a line's own step (a boss's drop). */
  private pending: BoardEvent[] = [];

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
    this.maxLives = level.lives ?? LIVES;
    this.lives = this.maxLives;
    this.heldColour = level.colourAt ? this.palette[this.palette.length - 1]! : null;
    this.shut = level.tracks.map((t) => (t.opensAt ?? 0) > 0);
    this.shut.forEach((closed, i) => {
      if (closed) this.lines[i]!.spawning = false;
    });
    this.twists = new Twists(level, this.rng, () => this.ids++);
    this.boss = level.boss ? new Boss(level.boss, this.arena()) : null;
    const deal = this.spawnPalette();
    this.loaded = deal[Math.floor(this.rng() * deal.length)]!;
    this.next = deal[Math.floor(this.rng() * deal.length)]!;
  }

  /** How full the bar is, 0..1 (see goal.ts for what fills it). */
  get progress(): number {
    return goalProgress(this);
  }

  /** Seconds left on a hold-out's or a blitz's clock, else null. */
  get timeLeft(): number | null {
    return timeLeft(this.level, this.elapsed);
  }

  /** How close the nearest line is to its well, 0..1. */
  get danger(): number {
    return Math.max(0, ...this.lines.map((l) => (l.marbles.length ? l.front() / l.path.length : 0)));
  }

  /** Where marble `m` of `line` is on the board. */
  marbleAt(line: Line, m: Marble): Pt {
    return pointAt(line.path, m.s);
  }

  /** Whether line `li`'s burrow is still shut, waiting for the bar (a late burrow). */
  isShut(li: number): boolean {
    return this.shut[li] === true;
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
    this.pending = events;
    this.elapsed += dt;
    this.reload = Math.max(0, this.reload - dt);
    for (const k of Object.keys(this.timers) as (keyof Board['timers'])[]) this.timers[k] = Math.max(0, this.timers[k] - dt);
    this.twists.step(dt, this.filled, events);
    this.aimAndMove(input, dt);
    if (input.swap) this.swap(events);
    if (input.fire) this.queuedFire = true;
    if (input.hop !== null) this.hop(input.hop, events);
    if (this.twists.stepPad(dt, !this.hopping, this.pad, events) && this.level.shooter.kind === 'hop') {
      const pad = (this.pad + 1) % this.level.shooter.pads.length;
      events.push({ type: 'tipped', pad });
      this.hop(pad, events);
    }
    this.stepHop(dt, events);
    if (this.queuedFire && this.reload <= 0 && this.atRailTarget() && !this.hopping) this.spit(events);
    this.stepShots(dt, events);
    this.stepLines(dt, events);
    this.stepDrops(dt, events);
    this.stepFruit(dt, events);
    this.stepHedgehog(dt, events);
    this.stepShift(dt, events);
    this.placeCharms(dt);
    this.boss?.step(dt, events);
    this.stepGoal(events);
    this.refreshColours();
    this.expireWaiting();
    this.checkEnd(events);
    return events;
  }

  /** What the bar asks for, as time goes: late burrows open, a held colour joins, a hold-out's clock fills it, a boss beaten fills it. */
  private stepGoal(events: BoardEvent[]): void {
    const p = this.progress;
    const mode = this.level.mode?.kind;
    const done = this.boss ? this.boss.beaten : mode === 'holdout' || mode === 'gold' ? p >= 1 : false;
    if (done) {
      this.fill(events);
      return;
    }
    this.shut.forEach((closed, i) => {
      if (!closed || this.filled || p < (this.level.tracks[i]!.opensAt ?? 0)) return;
      this.shut[i] = false;
      this.lines[i]!.spawning = true;
      events.push({ type: 'burrowOpen', line: i, ...pointAt(this.lines[i]!.path, 0) });
    });
    if (this.heldColour && p >= (this.level.colourAt ?? 0)) {
      events.push({ type: 'newColour', colour: this.heldColour });
      this.heldColour = null;
    }
  }

  /** The bar is full: the burrows shut, and what's left is to be popped. */
  private fill(events: BoardEvent[]): void {
    if (this.filled) return;
    this.filled = true;
    for (const line of this.lines) line.spawning = false;
    events.push({ type: 'filled' });
  }

  /** What the boss may do to the board. */
  private arena(): Arena {
    return {
      lines: this.lines,
      palette: this.palette,
      gecko: this.gecko,
      random: () => this.rng(),
      shove: (li, d) => {
        const line = this.lines[li];
        if (line?.marbles.length) line.nudge += d;
      },
      dropInto: (li, near, colour, bud) => this.dropInto(li, near, colour, bud),
      petrify: (li, ids) => ids.filter((id) => this.lines[li]?.petrify(id)).length,
      crumble: (li, ids) => this.sweep((_, i) => (i === li ? this.lines[li]!.marbles.filter((m) => ids.includes(m.id)) : []), this.pending),
    };
  }

  /** A marble put into line `li` beside its open marble nearest `near` (a boss's doing); false if none is open. */
  private dropInto(li: number, near: Pt, colour: ColourId, bud: boolean): boolean {
    const line = this.lines[li];
    const lineEvents = line ? dropNear(line, near, colour, bud, (s) => this.covered(li, s)) : null;
    if (!line || !lineEvents) return false;
    for (const e of lineEvents) this.onLineEvent(line, li, e, this.pending);
    return true;
  }

  private aimAndMove(input: BoardInput, dt: number): void {
    const g = this.gecko;
    const s = this.level.shooter;
    if (s.kind === 'pivot' && this.level.wander) {
      const at = wanderAt(this.level, s, this.elapsed);
      g.x = at.x;
      g.y = at.y;
    }
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
    if (this.level.noSwap) return;
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
      shot.vx += (this.twists.push * dt) / steps;
      shot.x += (shot.vx * dt) / steps;
      shot.y += (shot.vy * dt) / steps;
      const knock = (this.level.walls ? bounce(shot) : null) ?? (this.level.pillars ? glance(shot, this.level.pillars) : null);
      if (knock) events.push({ type: 'bounce', ...knock });
      if (!shot.pierce && this.hitFruit(shot, events)) return false;
      if (!shot.pierce && this.twists.leafAt(shot, SHOT_R, { x: shot.vx, y: shot.vy })) {
        events.push({ type: 'leafHit', x: shot.x, y: shot.y });
        this.streak = 0;
        return false;
      }
      const met = this.meetBoss(shot, events);
      if (met === 'gone') return false;
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

  /** A shot reaching the boss: it hurts it, is stopped, swallowed (the frog spits it into a line), or batted back. */
  private meetBoss(shot: Shot, events: BoardEvent[]): 'gone' | 'on' {
    const b = this.boss;
    if (!b || shot.bossed || !b.touches(shot, SHOT_R)) return 'on';
    const how = b.hit(shot, events);
    if (how === 'pass') return 'on';
    shot.bossed = true;
    if (how === 'swatted') {
      swat(shot);
      swatted(b);
      return 'on';
    }
    if (how === 'swallowed') {
      const li = b.nearestLine();
      if (li !== null) this.dropInto(li, b, shot.colour, false);
    }
    if (how !== 'hurt') this.streak = 0;
    if (how === 'hurt' && shot.pierce) return 'on';
    if (how === 'hurt' && shot.burst) this.burstAt(shot, events);
    return 'gone';
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
    const base = this.twists.speed(this.level.speed * (this.timers.slow > 0 ? SLOW_FACTOR : 1));
    const speed = this.timers.reverse > 0 ? -REVERSE_SPEED : base;
    this.lines.forEach((line, li) => {
      const lineEvents: LineEvent[] = [];
      line.step(dt, speed > 0 ? speed * (this.level.tracks[li]!.pace ?? 1) : speed, lineEvents);
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
    const gold = e.marbles.filter((m) => m.gold).length;
    if (gold && this.level.mode?.kind === 'gold') {
      this.goldPopped += gold;
      events.push({ type: 'gold', x: mid.x, y: mid.y, count: gold, left: Math.max(0, this.level.mode.count - this.goldPopped) });
    }
    this.boss?.popped(li, e.marbles, e.combo, events);
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
    // Points fill the bar only when nothing else does.
    const byPoints = !this.boss && (!this.level.mode || this.level.mode.kind === 'blitz');
    if (byPoints && this.score >= this.level.goal) this.fill(events);
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
    else if (charm === 'inkpot') this.sweep(ofColour(colour), events);
    else if (charm === 'dragonfly') this.dragonfly = true;
    else if (charm === 'geode') this.geode = true;
    else if (charm === 'rain') {
      events.push({ type: 'rain', x: at.x });
      this.sweep(inColumn(at.x, (li, s) => this.covered(li, s)), events);
    }
    else if (charm === 'hedgehog') this.sendHedgehog(events);
    else this.timers[charm] = CHARM_SECONDS[charm];
    // Reverse ends a Slow, however it came (a marble, a windfall or a catch).
    if (charm === 'reverse') this.timers.slow = 0;
  }

  /** Pops the marbles `pick` chooses on every line, each line's as one pop. */
  private sweep(pick: Pick, events: BoardEvent[]): void {
    this.lines.forEach((line, li) => {
      const lineEvents: LineEvent[] = [];
      line.popIds(new Set(pick(line, li).map((m) => m.id)), 0, null, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, li, e, events);
    });
  }

  /** The Hedgehog sets off up the line nearest its well (one already out just gets hungrier). */
  private sendHedgehog(events: BoardEvent[]): void {
    if (this.hedgehog) {
      this.hedgehog.left += HEDGEHOG_EATS;
      return;
    }
    const li = hedgehogLine(this.lines);
    if (li === null) return;
    this.hedgehog = sendHedgehog(li, this.lines[li]!.path.length);
    events.push({ type: 'hedgehog', line: li });
  }

  /** The Hedgehog trundles up its line from the well, eating the front marble each time it reaches one. */
  private stepHedgehog(dt: number, events: BoardEvent[]): void {
    const h = this.hedgehog;
    if (!h) return;
    const line = this.lines[h.line]!;
    const eaten = stepHedgehog(h, line, dt);
    if (eaten) {
      const lineEvents: LineEvent[] = [];
      line.popIds(new Set([eaten.id]), 0, null, lineEvents);
      for (const e of lineEvents) this.onLineEvent(line, h.line, e, events);
      events.push({ type: 'munch', ...pointAt(line.path, Math.max(0, h.s)) });
    }
    if (!hedgehogDone(h, line)) return;
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
    this.sweep(nearPoint(at), events);
  }

  private maybeDrop(at: Pt, events: BoardEvent[]): void {
    if (!this.level.charms.length) return;
    this.popsSinceDrop++;
    if (this.popsSinceDrop < (this.level.charmy ? DROP_EVERY / 2 : DROP_EVERY)) return;
    // None fits yet (only stalling charms, the line far from its well): the next pop tries again.
    const charm = pickCharm(this.level.charms, this.danger, this.lastCharm, this.rng());
    if (!charm) return;
    this.popsSinceDrop = 0;
    this.lastCharm = charm;
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
    if (this.charmClock < (this.level.charmy ? CHARM_EVERY / 2 : CHARM_EVERY)) return;
    const open = this.lines.flatMap((line, li) => line.marbles.filter((m) => !m.charm && !m.stone && m.s > line.path.length * 0.08 && m.s < line.path.length * 0.8 && !this.covered(li, m.s)));
    const charm = pickCharm(this.level.charms, this.danger, this.lastCharm, this.rng());
    if (!open.length || !charm) return;
    this.charmClock = 0;
    this.lastCharm = charm;
    const m = open[Math.floor(this.rng() * open.length)]!;
    m.charm = charm;
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
    const outOfTime = this.level.mode?.kind === 'blitz' && !this.filled && (this.timeLeft ?? 1) <= 0;
    if (this.lives <= 0 || outOfTime) {
      this.state = 'lost';
      this.lostBy = this.lives <= 0 ? 'well' : 'time';
      events.push({ type: 'lost', cause: this.lostBy });
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
    if (this.wantsGold() && this.rng() < GOLD_SHARE) return { colour, gold: true };
    if (l.buds && this.rng() < l.buds) return { colour, bud: true };
    if (l.chameleons && this.rng() < l.chameleons) return { colour, chameleon: true };
    if (l.twine && this.rng() < l.twine) return { colour, tie: true };
    return { colour };
  }

  /** Gold levels: more golden marbles are needed out (a couple spare, in case some go down the well). */
  private wantsGold(): boolean {
    const mode = this.level.mode;
    if (mode?.kind !== 'gold' || this.filled) return false;
    const out = this.lines.reduce((n, l) => n + l.marbles.filter((m) => m.gold).length, 0);
    return this.goldPopped + out < mode.count + GOLD_SPARE;
  }

  /** The colours the burrows send now: all the level's, but a held-back last one. */
  private spawnPalette(): readonly ColourId[] {
    return this.heldColour ? this.palette.filter((c) => c !== this.heldColour) : this.palette;
  }

  /** A colour for the next marble out of a burrow: often the same as the one ahead, never a third alike. */
  private spawnColour(behind: readonly ColourId[]): ColourId {
    const palette = this.spawnPalette();
    const [a, b] = behind;
    if (a && a === b) {
      const others = palette.filter((c) => c !== a);
      return others[Math.floor(this.rng() * others.length)] ?? a;
    }
    if (a && palette.includes(a) && this.rng() < SAME_CHANCE) return a;
    return palette[Math.floor(this.rng() * palette.length)]!;
  }
}
