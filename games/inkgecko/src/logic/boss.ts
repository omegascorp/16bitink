import type { BossDef, BossKind } from '../level/types';
import type { ColourId } from './colours';
import { D, type Line, type Marble } from './line';
import { angleAt, pointAt, type Pt } from './path';
import type { Sink } from './twists';

/** Where a shot can hit each boss: a circle round its centre, board px. */
export const BOSS_R: Readonly<Record<BossKind, number>> = {
  mole: 38, frog: 42, snail: 44, magpie: 36, tortoise: 20, scarecrow: 28, chameleon: 40, cat: 38, lion: 44, owl: 36,
};
/** Each boss's name, as the game says it. */
export const BOSS_NAMES: Readonly<Record<BossKind, string>> = {
  mole: 'The Mole', frog: 'The Bullfrog', snail: 'The Great Snail', magpie: 'The Magpie', tortoise: 'The Old Tortoise',
  scarecrow: 'The Scarecrow', chameleon: 'The Great Chameleon', cat: 'The Barn Cat', lion: 'The Stone Lion', owl: 'The Owl',
};

/** The scarecrow's sleeves: from this far out to this far, this wide each side of their middle. */
export const SLEEVE = { from: 18, to: 88, half: 13 } as const;
/** How fast the scarecrow turns, radians/s, and how much faster for a while after a hit. */
const SCARECROW_TURN = 0.55;
const SCARECROW_RILED = { factor: 2.3, for: 3 } as const;

/** The mole: under the ground, coming up, up (it can be hit), going down, s. */
const MOLE = { down: [1.6, 2.6], rise: 0.35, up: 2.6, dive: 0.35, shove: D * 1.5 } as const;
/** The frog: sits this long, croaking (swallowing shots) through the middle of it, then leaps. */
const FROG = { sit: 4.6, croakFrom: 1.4, croakTo: 2.9, leap: 0.7 } as const;
/** The snail crawls this fast, and hides in its shell this long after each hit. */
const SNAIL = { speed: 22, shell: 2.4 } as const;
/** The magpie perches this long, then flies (out of reach) for this long. */
const MAGPIE = { perch: 3.2, fly: 1.3 } as const;
/** The tortoise walks this far ahead of the line's front (plodding back to it this fast); every so often it kicks this many marbles behind it to stone. */
const TORTOISE = { lead: D * 1.25, reach: D * 3.3, every: 9, stones: 2, back: 150 } as const;
/** The chameleon walks this fast and takes the next colour this often. */
const CHAMELEON = { speed: 26, shift: 4 } as const;
/** The cat prowls its beam this fast, and holds a swat this long. */
const CAT = { speed: 70, swat: 0.45 } as const;
/** The lion roars this often, shoving every line this far. */
const LION = { every: 10, roar: 1.2, shove: D * 1.2 } as const;
/** The owl perches this long, then flies for this long; landing, it hoots and the night closes in for a while. */
const OWL = { perch: 4, fly: 1.4, hoot: 4 } as const;
/** A hit shows the hurt pose this long, s. */
const HURT_FOR = 0.45;

/** What became of a shot that reached the boss. */
export type BossHit =
  /** It hurt the boss. */
  | 'hurt'
  /** Stopped dead: a sleeve, a shell, the wrong colour, stone. */
  | 'blocked'
  /** The frog swallowed it (and will spit it into a line). */
  | 'swallowed'
  /** The cat batted it back the way it came. */
  | 'swatted'
  /** Nothing there to hit (under the ground, in the air). */
  | 'pass';

export type BossEvent =
  | { readonly type: 'bossHit'; readonly x: number; readonly y: number; readonly hp: number }
  | { readonly type: 'bossBlock'; readonly x: number; readonly y: number; readonly how: Exclude<BossHit, 'hurt' | 'pass'> }
  | { readonly type: 'bossUp'; readonly x: number; readonly y: number }
  | { readonly type: 'bossShove'; readonly x: number; readonly y: number }
  | { readonly type: 'bossDrop'; readonly x: number; readonly y: number }
  | { readonly type: 'bossStones'; readonly x: number; readonly y: number }
  | { readonly type: 'bossHoot'; readonly x: number; readonly y: number }
  | { readonly type: 'bossLand'; readonly x: number; readonly y: number }
  | { readonly type: 'bossCroak'; readonly x: number; readonly y: number }
  | { readonly type: 'bossBeaten'; readonly x: number; readonly y: number };

/** What a boss can do to the board (the board implements it). */
export interface Arena {
  readonly lines: readonly Line[];
  readonly palette: readonly ColourId[];
  readonly gecko: Pt;
  random(): number;
  /** Shoves line `li` forward by `d`. */
  shove(li: number, d: number): void;
  /** Puts a marble of `colour` (a bud if `bud`) into line `li` next to its marble nearest `near`; false if the line has nothing to join. */
  dropInto(li: number, near: Pt, colour: ColourId, bud: boolean): boolean;
  /** Turns these marbles of line `li` to stone; how many it could. */
  petrify(li: number, ids: readonly number[]): number;
  /** Breaks these marbles of line `li`, as a pop. */
  crumble(li: number, ids: readonly number[]): void;
}

/** A shot as the boss sees it. */
export interface ShotLike {
  readonly x: number;
  readonly y: number;
  readonly colour: ColourId;
  readonly bounces: number;
  readonly glances: number;
  readonly wild: boolean;
  readonly pierce: boolean;
}

/**
 * The chapter's boss: where it is and what it's doing, its hits left, and
 * what it does to the board as it goes. Each kind keeps to its own habits
 * (see the step functions); a hit either hurts it or doesn't, by its rule.
 */
export class Boss {
  readonly kind: BossKind;
  readonly maxHp: number;
  hp: number;
  x: number;
  y: number;
  /** Which way it faces, radians. */
  angle = 0;
  /** What it's doing now (names the art's pose, mostly). */
  phase: string;
  /** Seconds into the phase. */
  t = 0;
  /** Seconds left showing a hit. */
  hurt = 0;
  /** The spot it's at or going to, and the one it left. */
  spot = 0;
  private from: Pt;
  /** The tortoise: how far along its line it walks. */
  s = 0;
  /** The scarecrow's sleeves' angle, and its spin-up after a hit. */
  sleeves = 0;
  private riled = 0;
  /** The chameleon's colour. */
  colour: ColourId;
  /** The owl: seconds left of the night closing in after a hoot. */
  hoot = 0;
  private clock = 0;
  private downFor = 0;
  /** The snail's and chameleon's way round their walk: how far along the leg from `spot`. */
  private leg = 0;

  constructor(readonly def: BossDef, private readonly arena: Arena) {
    this.kind = def.kind;
    this.maxHp = def.hp;
    this.hp = def.hp;
    const first = def.spots[0] ?? { x: 640, y: 360 };
    this.x = first.x;
    this.y = first.y;
    this.from = first;
    this.colour = arena.palette[0]!;
    this.phase = START_PHASE[def.kind];
    this.downFor = MOLE.down[0];
    this.angle = Math.atan2(arena.gecko.y - this.y, arena.gecko.x - this.x);
    if (def.kind === 'tortoise') this.s = TORTOISE.lead;
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  /** Can a shot hurt it at all right now (for the HUD and the bot)? */
  get open(): boolean {
    if (this.beaten) return false;
    switch (this.kind) {
      case 'mole': return this.phase === 'up';
      case 'frog': return this.phase === 'sit' || this.phase === 'settle';
      case 'snail': return this.phase !== 'shell';
      case 'magpie':
      case 'owl': return this.phase === 'perch';
      default: return true;
    }
  }

  /** Where it can be hit, board px. */
  get r(): number {
    return BOSS_R[this.kind];
  }

  step(dt: number, events: Sink<BossEvent>): void {
    if (this.beaten) return;
    this.t += dt;
    this.clock += dt;
    this.hurt = Math.max(0, this.hurt - dt);
    this.hoot = Math.max(0, this.hoot - dt);
    STEPS[this.kind](this, dt, events);
  }

  /** A shot reached it (see `touches`): what happens, and the board's events for it. */
  hit(shot: ShotLike, events: Sink<BossEvent>): BossHit {
    const how = this.verdict(shot);
    if (how === 'hurt') {
      this.hp = Math.max(0, this.hp - 1);
      this.hurt = HURT_FOR;
      events.push({ type: 'bossHit', x: this.x, y: this.y, hp: this.hp });
      this.afterHit();
      if (this.beaten) events.push({ type: 'bossBeaten', x: this.x, y: this.y });
    } else if (how !== 'pass') events.push({ type: 'bossBlock', x: shot.x, y: shot.y, how });
    return how;
  }

  /** Whether a shot at p touches the boss (its body, or a scarecrow's sleeve). */
  touches(p: Pt, shotR: number): boolean {
    if (this.beaten) return false;
    if (Math.hypot(p.x - this.x, p.y - this.y) < this.r + shotR * 0.5) return true;
    return this.kind === 'scarecrow' && this.onSleeve(p, shotR);
  }

  private onSleeve(p: Pt, shotR: number): boolean {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    for (const a of [this.sleeves, this.sleeves + Math.PI]) {
      const along = dx * Math.cos(a) + dy * Math.sin(a);
      const across = -dx * Math.sin(a) + dy * Math.cos(a);
      if (along > SLEEVE.from && along < SLEEVE.to + shotR * 0.5 && Math.abs(across) < SLEEVE.half + shotR * 0.5) return true;
    }
    return false;
  }

  private verdict(shot: ShotLike): BossHit {
    switch (this.kind) {
      case 'mole': return this.phase === 'up' ? 'hurt' : 'pass';
      case 'magpie':
      case 'owl': return this.phase === 'perch' ? 'hurt' : 'pass';
      case 'frog': return this.phase === 'croak' ? 'swallowed' : this.phase === 'leap' ? 'pass' : 'hurt';
      case 'snail': return this.phase === 'shell' ? 'blocked' : 'hurt';
      case 'tortoise': return 'blocked';
      case 'scarecrow': return Math.hypot(shot.x - this.x, shot.y - this.y) < this.r + D * 0.25 ? 'hurt' : 'blocked';
      case 'chameleon': return shot.wild || shot.pierce || shot.colour === this.colour ? 'hurt' : 'blocked';
      case 'cat': return shot.bounces > 0 || shot.pierce ? 'hurt' : 'swatted';
      case 'lion': return shot.glances > 0 || shot.pierce ? 'hurt' : 'blocked';
      default: return 'hurt';
    }
  }

  private afterHit(): void {
    if (this.kind === 'mole') this.go('dive');
    else if (this.kind === 'snail') this.go('shell');
    else if (this.kind === 'scarecrow') this.riled = SCARECROW_RILED.for;
    else if (this.kind === 'cat') this.go('prowl');
  }

  /** The tortoise: a pop among the marbles touching it hurts it (a combo pop, twice). */
  popped(li: number, marbles: readonly Marble[], combo: number, events: Sink<BossEvent>): void {
    if (this.kind !== 'tortoise' || this.beaten || li !== (this.def.line ?? 0)) return;
    if (!marbles.some((m) => m.s >= this.s - TORTOISE.reach)) return;
    this.hp = Math.max(0, this.hp - (combo > 0 ? 2 : 1));
    this.hurt = HURT_FOR;
    events.push({ type: 'bossHit', x: this.x, y: this.y, hp: this.hp });
    if (this.beaten) events.push({ type: 'bossBeaten', x: this.x, y: this.y });
  }

  /** Into a new phase, from the start. */
  go(phase: string): void {
    this.phase = phase;
    this.t = 0;
  }

  /** Off to another of its spots (not the one it's at). */
  pickSpot(): void {
    const n = this.def.spots.length;
    if (n < 2) return;
    this.from = { x: this.x, y: this.y };
    const step = 1 + Math.floor(this.arena.random() * (n - 1));
    this.spot = (this.spot + step) % n;
  }

  /** Along the way from where it left to its spot, 0..1 eased. */
  travel(k: number, hop = 0): void {
    const to = this.def.spots[this.spot]!;
    const e = k * k * (3 - 2 * k);
    this.x = this.from.x + (to.x - this.from.x) * e;
    this.y = this.from.y + (to.y - this.from.y) * e - Math.sin(k * Math.PI) * hop;
    if (Math.hypot(to.x - this.from.x, to.y - this.from.y) > 1) this.angle = Math.atan2(to.y - this.from.y, to.x - this.from.x);
  }

  /** Walks round its spots in a loop at `speed`. */
  walk(dt: number, speed: number): void {
    const spots = this.def.spots;
    if (spots.length < 2) return;
    let left = speed * dt;
    for (let guard = 0; guard < spots.length + 1 && left > 0; guard++) {
      const a = spots[this.spot]!;
      const b = spots[(this.spot + 1) % spots.length]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const take = Math.min(left, len - this.leg);
      this.leg += take;
      left -= take;
      if (this.leg < len) break;
      this.leg = 0;
      this.spot = (this.spot + 1) % spots.length;
    }
    const a = spots[this.spot]!;
    const b = spots[(this.spot + 1) % spots.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    this.x = a.x + ((b.x - a.x) * this.leg) / len;
    this.y = a.y + ((b.y - a.y) * this.leg) / len;
    this.angle = Math.atan2(b.y - a.y, b.x - a.x);
  }

  /** Faces the gecko. */
  faceGecko(): void {
    this.angle = Math.atan2(this.arena.gecko.y - this.y, this.arena.gecko.x - this.x);
  }

  /** The line with a marble nearest the boss, if any. */
  nearestLine(): number | null {
    let best: number | null = null;
    let bestD = Infinity;
    this.arena.lines.forEach((line, li) => {
      for (const m of line.marbles) {
        if (m.s < 0 || m.s > line.path.length) continue;
        const p = pointAt(line.path, m.s);
        const d = Math.hypot(p.x - this.x, p.y - this.y);
        if (d < bestD) {
          bestD = d;
          best = li;
        }
      }
    });
    return best;
  }

  get world(): Arena {
    return this.arena;
  }

  /** How long the mole stays down this time. */
  rollDown(): void {
    const [lo, hi] = MOLE.down;
    this.downFor = lo + this.arena.random() * (hi - lo);
  }

  get downTime(): number {
    return this.downFor;
  }

  /** The scarecrow turns, faster while riled. */
  turn(dt: number): void {
    this.riled = Math.max(0, this.riled - dt);
    this.sleeves += SCARECROW_TURN * (this.riled > 0 ? SCARECROW_RILED.factor : 1) * dt;
  }

  /** True (and starts again) when the boss's own timer has run `every` seconds: the lion's roars, the tortoise's stones, the chameleon's turns. */
  ring(every: number): boolean {
    if (this.clock < every) return false;
    this.clock = 0;
    return true;
  }
}

const START_PHASE: Readonly<Record<BossKind, string>> = {
  mole: 'down', frog: 'sit', snail: 'crawl', magpie: 'perch', tortoise: 'walk', scarecrow: 'stand', chameleon: 'walk', cat: 'prowl', lion: 'idle', owl: 'perch',
};

type Step = (b: Boss, dt: number, events: Sink<BossEvent>) => void;

/** Each kind's habits, a step at a time. */
const STEPS: Readonly<Record<BossKind, Step>> = {
  mole: (b, _dt, events) => {
    if (b.phase === 'down' && b.t >= b.downTime) {
      b.pickSpot();
      const to = b.def.spots[b.spot]!;
      b.x = to.x;
      b.y = to.y;
      b.go('rise');
    } else if (b.phase === 'rise' && b.t >= MOLE.rise) {
      b.go('up');
      b.faceGecko();
      events.push({ type: 'bossUp', x: b.x, y: b.y });
      // Coming up, it heaves the soil: the nearest line is shoved on.
      const li = b.nearestLine();
      if (li !== null) {
        b.world.shove(li, MOLE.shove);
        events.push({ type: 'bossShove', x: b.x, y: b.y });
      }
    } else if (b.phase === 'up' && b.t >= MOLE.up) b.go('dive');
    else if (b.phase === 'dive' && b.t >= MOLE.dive + (b.hurt > 0 ? 0.3 : 0)) {
      b.rollDown();
      b.go('down');
    }
  },
  frog: (b, _dt, events) => {
    if (b.phase === 'sit' && b.t >= FROG.croakFrom) events.push({ type: 'bossCroak', x: b.x, y: b.y });
    if (b.phase === 'leap') {
      const k = Math.min(1, b.t / FROG.leap);
      b.travel(k, 46);
      if (k >= 1) {
        b.go('sit');
        b.faceGecko();
        events.push({ type: 'bossLand', x: b.x, y: b.y });
      }
      return;
    }
    // Sitting, it croaks through the middle of the sit (swallowing what comes), settles, then leaps.
    if (b.phase === 'sit' && b.t >= FROG.croakFrom) b.go('croak');
    else if (b.phase === 'croak' && b.t >= FROG.croakTo - FROG.croakFrom) b.go('settle');
    else if (b.phase === 'settle' && b.t >= FROG.sit - FROG.croakTo) {
      b.pickSpot();
      b.go('leap');
    }
  },
  snail: (b, dt) => {
    if (b.phase === 'shell') {
      if (b.t >= SNAIL.shell) b.go('crawl');
      return;
    }
    b.walk(dt, SNAIL.speed);
  },
  magpie: (b, _dt, events) => {
    if (b.phase === 'perch' && b.t >= MAGPIE.perch) {
      b.pickSpot();
      b.go('fly');
    } else if (b.phase === 'fly') {
      const k = Math.min(1, b.t / MAGPIE.fly);
      b.travel(k);
      if (k < 1) return;
      b.go('perch');
      b.faceGecko();
      // Landing, it drops what it carried: a bud, into the line nearest it.
      const li = b.nearestLine();
      const w = b.world;
      if (li !== null && w.dropInto(li, b, w.palette[Math.floor(w.random() * w.palette.length)]!, true)) events.push({ type: 'bossDrop', x: b.x, y: b.y });
    }
  },
  tortoise: (b, dt, events) => {
    const line = b.world.lines[b.def.line ?? 0];
    if (!line) return;
    const L = line.path.length;
    const front = line.marbles.length ? line.front() : null;
    // It leads the line: pushed on by its front, and plodding back to it when the front pops away or rolls back.
    if (front !== null) {
      const want = front + TORTOISE.lead;
      b.s = want >= b.s || line.rewind > 0 ? want : Math.max(want, b.s - TORTOISE.back * dt);
    }
    b.s = Math.min(b.s, L - D * 0.2);
    const p = pointAt(line.path, b.s);
    const moved = Math.hypot(p.x - b.x, p.y - b.y) > dt * 4;
    b.x = p.x;
    b.y = p.y;
    b.angle = angleAt(line.path, b.s);
    b.phase = moved ? 'walk' : 'stand';
    // Stones it stamped, left standing on their own at the head, crumble under its feet (and that hurts it).
    const stranded = line.strandedHead();
    if (stranded) b.world.crumble(b.def.line ?? 0, stranded.map((m) => m.id));
    if (!b.ring(TORTOISE.every)) return;
    // Its stamp: the marbles just behind it turn to stone.
    const near = line.marbles.filter((m) => m.s >= 0 && m.s >= b.s - TORTOISE.reach - D * TORTOISE.stones && !m.stone).slice(-TORTOISE.stones);
    if (!near.length) return;
    if (b.world.petrify(b.def.line ?? 0, near.map((m) => m.id)) > 0) events.push({ type: 'bossStones', x: b.x, y: b.y });
  },
  scarecrow: (b, dt) => {
    b.turn(dt);
  },
  chameleon: (b, dt) => {
    b.walk(dt, CHAMELEON.speed);
    if (!b.ring(CHAMELEON.shift)) return;
    const pal = b.world.palette;
    b.colour = pal[(pal.indexOf(b.colour) + 1) % pal.length]!;
  },
  cat: (b, dt) => {
    if (b.phase === 'swat' && b.t < CAT.swat) return;
    if (b.phase === 'swat') b.go('prowl');
    // It paces its beam, turning at the ends and now and then on a whim.
    const [a, z] = [b.def.spots[0]!, b.def.spots[1] ?? b.def.spots[0]!];
    const dir = b.spot === 1 ? 1 : -1;
    const to = dir === 1 ? z : a;
    const dx = to.x - b.x;
    const dy = to.y - b.y;
    const d = Math.hypot(dx, dy);
    const stepLen = CAT.speed * dt;
    if (d <= stepLen || b.world.random() < dt * 0.12) {
      b.spot = b.spot === 1 ? 0 : 1;
      return;
    }
    b.x += (dx / d) * stepLen;
    b.y += (dy / d) * stepLen;
    b.angle = Math.atan2(dy, dx);
  },
  lion: (b, _dt, events) => {
    b.faceGecko();
    if (b.phase === 'roar' && b.t >= LION.roar) b.go('idle');
    if (!b.ring(LION.every)) return;
    b.go('roar');
    b.world.lines.forEach((_, li) => b.world.shove(li, LION.shove));
    events.push({ type: 'bossShove', x: b.x, y: b.y });
  },
  owl: (b, _dt, events) => {
    if (b.phase === 'perch' && b.t >= OWL.perch) {
      b.pickSpot();
      b.go('fly');
    } else if (b.phase === 'fly') {
      const k = Math.min(1, b.t / OWL.fly);
      b.travel(k);
      if (k < 1) return;
      b.go('perch');
      b.faceGecko();
      b.hoot = OWL.hoot;
      events.push({ type: 'bossHoot', x: b.x, y: b.y });
    }
  },
};

/** The cat batted a shot back: it flies off the way it came, a little aside. */
export function swat(shot: { vx: number; vy: number }): void {
  shot.vx = -shot.vx * 0.6 + (shot.vx === 0 ? 120 : 0);
  shot.vy = Math.abs(shot.vy);
}

/** After a swat the cat holds its paw up for a moment. */
export function swatted(b: Boss): void {
  if (b.kind === 'cat') b.go('swat');
}

/** The pose for the boss's art now. */
export function bossPose(b: Boss, time: number): string {
  const step = Math.floor(time / 240) % 2;
  if (b.hurt > 0 && b.kind !== 'scarecrow') return 'hurt';
  switch (b.kind) {
    case 'mole': return b.phase === 'up' ? 'up' : 'peek';
    case 'frog': return b.phase === 'leap' ? 'leap' : b.phase === 'croak' ? 'croak' : 'sit';
    case 'snail': return b.phase === 'shell' ? 'shell' : `crawl${step}`;
    case 'magpie':
    case 'owl': return b.phase === 'fly' ? `fly${Math.floor(time / 110) % 2}` : 'perch';
    case 'tortoise': return b.phase === 'walk' ? `walk${step}` : 'walk0';
    case 'scarecrow': return b.hurt > 0 ? 'hurt' : 'body';
    case 'chameleon': return `walk${step}`;
    case 'cat': return b.phase === 'swat' ? 'swat' : `prowl${step}`;
    case 'lion': return b.phase === 'roar' ? 'roar' : 'idle';
  }
}
