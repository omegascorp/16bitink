import Phaser from 'phaser';
import { chapterOf } from '../../levels/chapters';
import { SPECIES_INFO } from '../../levels/species';
import type { LevelDef } from '../../levels/types';
import { BIRD_INFO, ZONE_BIRDS } from '../../logic/birds';
import { rangeOf, type Rng } from '../../logic/rng';
import {
  eventGap, eventsFor, eventStatus, pickEvent, PROWLER_SCALE, PROWLER_SPEED, prowlerSpecies, SEA_EVENTS, type SeaEventId,
} from '../../logic/seaEvents';
import { keepInWater } from '../../logic/water';
import { makeFish, steerTo, type Fish } from './fish';
import { spawnJellies, type Jelly } from './hazards';
import type { Flock, Swarm } from './flock';
import { schoolAround, type ItemHost } from './itemEffects';
import type { Player } from './player';
import type { TwistRunner } from './twistRunner';

/** What a sea event may reach into in the game scene. */
export interface SeaEventHost {
  readonly scene: Phaser.Scene;
  readonly level: LevelDef;
  readonly rng: Rng;
  readonly flock: Flock;
  readonly twist: TwistRunner;
  readonly items: ItemHost;
  readonly floorAt: (x: number) => number;
  player(): Player;
  fish(): readonly Fish[];
  addFish(fish: readonly Fish[]): void;
  /** A boat drops a hook near the player (sky chapters). */
  dropHook(): void;
  /** One of the level's items starts sinking within sight. */
  dropItem(): void;
  addJellies(jellies: readonly Jelly[]): void;
  /** Jellies drifting off at the end of a jelly drift: they fade and are gone. */
  removeJellies(jellies: readonly Jelly[]): void;
  /** Shows the event's banner. */
  announce(title: string, line: string, danger: boolean): void;
}

/** Dragonflies hatching out of the water around you, dawdling low enough to leap for. */
const HATCH: Omit<Swarm, 'kind'> = { max: 12, everyMs: [450, 900], height: [40, 250], pace: [0.3, 0.6], spread: 700, from: 'water' };
/** Seabirds circling in from the sky, diving at anything near the surface. */
const SEABIRDS: Omit<Swarm, 'kind' | 'height'> = { max: 5, everyMs: [700, 1400], pace: [0.5, 0.8], spread: 600, from: 'sky' };
/** Fish in a bait ball: a big school, three chums' worth. */
const BAIT_BALL = 22;
/** How fast a riptide runs, world units per second, plus a little per chapter. */
const RIPTIDE = { base: 110, perChapter: 8 } as const;
/** A fishing fleet drops a hook this often, s. */
const FLEET_EVERY = 3;
/** A spill: this many items, one every so often, s. */
const SPILL = { count: 6, every: 0.8 } as const;
/** Jellyfish in a drift. */
const DRIFT_JELLIES = 9;

interface Active {
  readonly id: SeaEventId;
  readonly endsAt: number;
  /** The hunter a prowler event sent, while it's still about. */
  prowler: Fish | null;
  /** The jellyfish a drift brought in. */
  jellies: readonly Jelly[];
  /** Repeating events (hooks, a spill): when the next one drops, s, and how many are left. */
  tickAt: number;
  ticksLeft: number;
}

/**
 * Runs a level's sea events (see logic/seaEvents.ts): waits, picks one,
 * plays it out for its time, then waits again. Clocked in seconds of play.
 */
export class SeaEvents {
  private readonly options: readonly SeaEventId[];
  private nextAt: number;
  private active: Active | null = null;
  private last: SeaEventId | null = null;

  constructor(private readonly host: SeaEventHost, sky: boolean) {
    this.options = eventsFor(host.level, chapterOf(host.level).zone, sky);
    this.nextAt = eventGap(host.rng, true);
  }

  /** `seconds` of play so far; `now` is scene time, for the birds. */
  update(seconds: number, now: number, dt: number): void {
    const a = this.active;
    if (a) {
      if (a.prowler) this.prowl(a, now, dt);
      if (a.ticksLeft > 0 && seconds >= a.tickAt) this.tick(a, seconds);
      if (seconds >= a.endsAt) this.end(a, seconds);
      return;
    }
    if (seconds < this.nextAt) return;
    const id = pickEvent(this.options, this.last, this.host.rng);
    if (id) this.start(id, seconds, now);
  }

  /** The HUD line while an event lasts, or '' between events. */
  status(seconds: number): string {
    return this.active ? eventStatus(this.active.id, this.active.endsAt - seconds) : '';
  }

  private start(id: SeaEventId, seconds: number, now: number): void {
    const h = this.host;
    const info = SEA_EVENTS[id];
    const p = h.player().sprite;
    this.active = { id, endsAt: seconds + info.seconds, prowler: null, jellies: [], tickAt: seconds, ticksLeft: 0 };
    this.last = id;
    let title = info.title;
    switch (id) {
      case 'hatch':
        h.flock.startSwarm({ kind: 'dragonfly', ...HATCH }, p.x, now);
        break;
      case 'seabirds': {
        const kinds = (ZONE_BIRDS[chapterOf(h.level).zone]?.kinds ?? ['gull']).filter((k) => k !== 'dragonfly');
        const kind = kinds[Math.floor(h.rng() * kinds.length)] ?? 'gull';
        h.flock.startSwarm({ kind, height: BIRD_INFO[kind].height, ...SEABIRDS }, p.x, now);
        break;
      }
      case 'baitball':
        h.addFish(schoolAround(h.items, BAIT_BALL));
        break;
      case 'riptide': {
        const dir = h.rng() < 0.5 ? -1 : 1;
        h.twist.setSurge(dir * (RIPTIDE.base + h.level.chapter * RIPTIDE.perChapter));
        break;
      }
      case 'fleet':
        this.active.ticksLeft = Math.floor(info.seconds / FLEET_EVERY);
        break;
      case 'spill':
        this.active.ticksLeft = SPILL.count;
        break;
      case 'jellies':
        this.active.jellies = this.driftIn();
        break;
      case 'bloom':
        h.player().glowUntil = now + info.seconds * 1000;
        break;
      case 'prowler': {
        const fish = this.sendProwler();
        this.active.prowler = fish;
        if (fish) title = `A ${SPECIES_INFO[fish.species].name} is hunting you!`;
        break;
      }
    }
    h.announce(title, info.line, info.danger);
  }

  private end(a: Active, seconds: number): void {
    const h = this.host;
    if (a.id === 'hatch' || a.id === 'seabirds') h.flock.endSwarm();
    if (a.id === 'riptide') h.twist.setSurge(0);
    if (a.prowler) this.release(a.prowler);
    if (a.jellies.length) h.removeJellies(a.jellies);
    this.active = null;
    this.nextAt = seconds + eventGap(h.rng, false);
  }

  /** One hook or one item, then wait for the next. */
  private tick(a: Active, seconds: number): void {
    a.ticksLeft -= 1;
    if (a.id === 'fleet') {
      this.host.dropHook();
      a.tickAt = seconds + FLEET_EVERY;
    } else {
      this.host.dropItem();
      a.tickAt = seconds + SPILL.every;
    }
  }

  /** Jellyfish drifting in across the water around you, from both sides. */
  private driftIn(): Jelly[] {
    const h = this.host;
    const view = h.scene.cameras.main.worldView;
    const p = h.player().sprite;
    const jellies = spawnJellies(h.scene, { ...h.level, hazards: { ...h.level.hazards, jellyfish: DRIFT_JELLIES } }, chapterOf(h.level).zone, h.rng);
    for (const j of jellies) {
      const side = h.rng() < 0.5 ? -1 : 1;
      j.sprite.setPosition(p.x + side * rangeOf(h.rng, view.width * 0.4, view.width * 1.2), Phaser.Math.Clamp(p.y + rangeOf(h.rng, -300, 300), 160, h.level.world.height - 220));
      // Drifting in towards where you are.
      j.vx = -side * rangeOf(h.rng, 25, 45);
    }
    h.addJellies(jellies);
    return jellies;
  }

  /** A hunter well bigger than you, coming in from just off screen. */
  private sendProwler(): Fish | null {
    const h = this.host;
    const species = prowlerSpecies(h.level);
    if (!species) return null;
    const p = h.player();
    const view = h.scene.cameras.main.worldView;
    const size = Math.round(p.size * PROWLER_SCALE);
    const side = h.rng() < 0.5 ? -1 : 1;
    const x = p.sprite.x + side * (view.width / 2 + size * 2);
    const y = Phaser.Math.Clamp(p.sprite.y + rangeOf(h.rng, -120, 120), 200, h.level.world.height - 200);
    const fish = makeFish(h.scene, species, size, 'normal', x, y, -side * PROWLER_SPEED, h.rng);
    // Steered here, not by its species' habits, until the event ends.
    fish.led = true;
    h.addFish([fish]);
    return fish;
  }

  /** The hunter homes in on you; hiding or leaping makes it lose you, a jellyfish sting stops it cold. */
  private prowl(a: Active, now: number, dt: number): void {
    const f = a.prowler!;
    if (!f.sprite.active || !this.host.fish().includes(f) || f.state === 'hooked' || f.state === 'dead') {
      // Eaten, hooked or knocked out: the hunt is over.
      a.prowler = null;
      return;
    }
    const p = this.host.player();
    if (f.state === 'stunned' && now < f.stateUntil) {
      f.vx -= f.vx * Math.min(1, dt * 4);
      f.vy = 22;
    } else if (p.hidden || p.airborne) {
      // Lost you: it slows and mills about.
      f.state = 'tired';
      f.vx += (Math.sign(f.vx || 1) * 80 - f.vx) * Math.min(1, dt * 2);
      f.vy -= f.vy * Math.min(1, dt * 2);
    } else {
      f.state = 'chase';
      f.stateUntil = now + 500;
      steerTo(f, p.sprite.x, p.sprite.y, PROWLER_SPEED, dt, 2);
    }
    f.phase += dt;
    f.sprite.x += f.vx * dt;
    const water = keepInWater(f.sprite.y + f.vy * dt, f.vy, f.size, this.host.level.world.height, this.host.floorAt(f.sprite.x));
    f.sprite.y = water.y;
    f.vy = water.vy;
  }

  /** The hunt is over: the hunter goes back to its own ways and swims off. */
  private release(f: Fish): void {
    if (!f.sprite.active) return;
    const p = this.host.player().sprite;
    Object.assign(f, { led: false, state: 'cruise', vx: Math.sign(f.sprite.x - p.x || 1) * PROWLER_SPEED });
  }
}
