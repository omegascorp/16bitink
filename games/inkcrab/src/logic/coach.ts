import { underSky } from './birds';
import { FOG } from './fog';
import { tileSpan } from './dig';
import { centre, type Item } from './items';
import { canWear, SHELLS } from './shells';
import { movementOf, SPECIES } from './species';
import type { Beach, SimEvent } from './sim';
import { isSolid, surfaceRow } from './terrain';


/** Something a level teaches, step by step, with a hint shown only while it's relevant. */
export type Lesson = 'move' | 'swap' | 'dig' | 'drop' | 'hide' | 'buried' | 'sky' | 'pit' | 'sandfish' | 'tide' | 'octopus' | 'climb' | 'heron' | 'vent'
  | 'kelp' | 'fog' | 'raccoon';

/** What a hint is about: a lesson, or the way out of a hole, offered on every level. */
export type HintKind = Lesson | 'stuck';

export type Controls = 'keys' | 'touch';

export interface Hint {
  readonly lesson: HintKind;
  readonly text: string;
  /** A world point to draw an arrow over, when there's somewhere to go. */
  readonly target?: { readonly x: number; readonly y: number };
}

/** How close (tiles) a bigger ghost crab gets before the hide lesson speaks up. */
const DANGER_TILES = 7;
/** How far (tiles) a buried shell can be and still be pointed out. */
const BURIED_TILES = 14;
/** Walls this many tiles high on both sides mean the crab can't jump out. */
const STUCK_TILES = 3;
/** How close (tiles) the roots are before the climb lesson speaks up, and how high (tiles) it must climb to learn it. */
const ROOTS_NEAR = 3;
const CLIMBED = 2;
/** How close (tiles) a steam vent is before the vent lesson speaks up. */
const VENT_NEAR = 6;
/** How close (tiles) kelp wrack is before the kelp lesson speaks up. */
const KELP_NEAR = 6;

const TEXT: Readonly<Record<Controls, Readonly<Record<string, string>>>> = {
  keys: {
    move: 'Walk with ← →, jump with Space. Eat food to grow.',
    swap: 'Your shell is full! Walk to the bigger shell and press E to move in.',
    dig: 'Dig a slope: hold → (or ←) and ↓, then press X. Digging straight down can trap you.',
    drop: 'You\'re carrying sand. Press C to drop it; jump, then ↓ + C to build up under you.',
    full: 'You\'re full of sand. Drop some with C before you dig more.',
    hide: 'Red ink means it can catch you! Hold Z to hide in your shell.',
    buried: 'Highlighted sand hides something buried. Dig a slope down to it: hold → and ↓ with X.',
    stuck: 'Stuck in a hole? Dig your way out at an angle: hold → (or ←) and ↑, then press X.',
    sky: 'A bird of prey is hovering over you! Get under the sand, or hold Z to hide: it strikes your shell and flies off.',
    pit: 'An antlion pit! Its sand slides you down to the jaws: walk out, or jump.',
    sandfish: 'A red ripple in the sand is a sandfish hunting you. Get back up into the open!',
    tide: 'The tide is coming in! Water is safe, just slow: press Space to swim up. Fish swim in with it; the tide clock shows when it turns.',
    octopus: 'An octopus is reaching out of its crevice! Get out of reach of its arm, or hold Z to hide.',
    climb: 'Mangrove roots! Hold ↑ among them to climb, ← → to clamber across, ↓ to climb down. Space lets go; ↓ drops you off a branch.',
    heron: 'The heron is taking aim at you! Get in among the roots, or hold Z to hide: its bill can\'t reach you there.',
    vent: 'A steam vent! Stand over it when it hisses and it throws you high: steer with ← → in the air. Drop sand in it to plug it.',
    kelp: 'Washed-up kelp! Down among it nothing can see or smell you, and sand hoppers live in it.',
    fog: 'Sea fog! You see only what\'s close, but hunters can\'t see you far either. Watch for red ink coming out of it.',
    raccoon: 'A raccoon hunts by smell: the fog won\'t hide you from it. Get under the kelp, or hold Z to hide.',
  },
  touch: {
    move: 'Steer with the stick, jump with the button. Eat food to grow.',
    swap: 'Your shell is full! Walk to the bigger shell and tap it to move in.',
    dig: 'Tap the sand diagonally below the crab to dig a slope. Digging straight down can trap you.',
    drop: 'You\'re carrying sand. Tap open space next to the crab to drop it.',
    full: 'You\'re full of sand. Tap open space to drop some before you dig more.',
    hide: 'Red ink means it can catch you! Hold the shell button to hide.',
    buried: 'Highlighted sand hides something buried. Tap the sand diagonally below you to dig a slope down to it.',
    stuck: 'Stuck in a hole? Tap the sand diagonally above the crab to dig steps out.',
    sky: 'A bird of prey is hovering over you! Get under the sand, or hold the shell button: it strikes your shell and flies off.',
    pit: 'An antlion pit! Its sand slides you down to the jaws: walk out, or jump.',
    sandfish: 'A red ripple in the sand is a sandfish hunting you. Get back up into the open!',
    tide: 'The tide is coming in! Water is safe, just slow: tap jump to swim up. Fish swim in with it; the tide clock shows when it turns.',
    octopus: 'An octopus is reaching out of its crevice! Get out of reach of its arm, or hold the shell button to hide.',
    climb: 'Mangrove roots! Push the stick up among them to climb, sideways to clamber across, down to climb down. Jump lets go.',
    heron: 'The heron is taking aim at you! Get in among the roots, or hold the shell button to hide: its bill can\'t reach you there.',
    vent: 'A steam vent! Stand over it when it hisses and it throws you high: steer with the stick in the air. Drop sand in it to plug it.',
    kelp: 'Washed-up kelp! Down among it nothing can see or smell you, and sand hoppers live in it.',
    fog: 'Sea fog! You see only what\'s close, but hunters can\'t see you far either. Watch for red ink coming out of it.',
    raccoon: 'A raccoon hunts by smell: the fog won\'t hide you from it. Get under the kelp, or hold the shell button to hide.',
  },
};

/**
 * The tutorial: watches play and offers one hint at a time for the lessons
 * a level teaches. Each lesson ends once the player has done it (eaten,
 * moved house, dug, dropped sand, hidden from a hunter, uncovered a shell),
 * so it never nags about something already learnt.
 */
export class Coach {
  private readonly done = new Set<Lesson>();
  private lastSand = 0;
  /** Lessons whose danger the crab is in now: each is learnt when it gets out of it. */
  private readonly facing = new Set<Lesson>();
  /** Where (world y of its feet) the crab took hold of the roots, while it's climbing. */
  private climbFrom: number | null = null;

  constructor(private readonly lessons: readonly Lesson[]) {}

  /** Marks lessons learnt from what just happened. Call after each step. */
  observe(beach: Beach, events: readonly SimEvent[]): void {
    const c = beach.crab;
    for (const e of events) {
      if (e.type === 'ate') this.done.add('move');
      else if (e.type === 'swapDone') this.done.add('swap');
      else if (e.type === 'tiles' && e.dug) this.done.add('dig');
      else if (e.type === 'revealed' && beach.items.get(e.id)?.kind.type === 'shell') this.done.add('buried');
      else if (e.type === 'thrown') this.done.add('vent');
    }
    if (c.sand < this.lastSand) this.done.add('drop');
    this.lastSand = c.sand;
    if (c.hidden && this.hunterNear(beach)) this.done.add('hide');
    this.escape('sky', this.hovered(beach) && underSky(beach.terrain, c.body, beach.tileSize));
    this.escape('pit', beach.pitPull(c.body) !== 0);
    this.escape('sandfish', this.sandfishNear(beach) && !underSky(beach.terrain, c.body, beach.tileSize));
    this.escape('octopus', [...beach.critters.values()].some((k) => k.arm > 0.15 && k.size > c.growth.size));
    // The tide lesson speaks while the first tide comes in, and is learnt once the crab has been in the water.
    if (beach.submerged(c.body)) this.done.add('tide');
    this.escape('heron', [...beach.critters.values()].some((k) => k.strike !== undefined && k.arm === 0 && k.size > c.growth.size));
    // Climbing is learnt by climbing a little way up.
    const feet = c.body.y + c.body.h;
    this.climbFrom = c.climbing ? Math.max(this.climbFrom ?? feet, feet) : null;
    if (this.climbFrom !== null && this.climbFrom - feet >= CLIMBED * beach.tileSize) this.done.add('climb');
    // Kelp is learnt by getting down among it; fog by coming out the other side of a bank.
    if (beach.underKelp(c.body)) this.done.add('kelp');
    this.escape('fog', beach.fogOver(c.body) >= FOG.thick);
    this.escape('raccoon', this.raccoonNear(beach) && !c.hidden && !beach.underKelp(c.body));
  }

  /** Learns a lesson once its danger, having come up, has passed (got under cover, out of the pit, up out of the sand). */
  private escape(lesson: Lesson, inDanger: boolean): void {
    if (inDanger) this.facing.add(lesson);
    else if (this.facing.delete(lesson)) this.done.add(lesson);
  }

  learnt(lesson: Lesson): boolean {
    return this.done.has(lesson);
  }

  /** The hint to show now, most urgent first, or null. */
  hint(beach: Beach, controls: Controls): Hint | null {
    const t = TEXT[controls];
    const open = (l: Lesson): boolean => this.lessons.includes(l) && !this.done.has(l);
    const c = beach.crab;
    if (open('hide') && this.hunterNear(beach) && !c.hidden) return { lesson: 'hide', text: t.hide! };
    if (open('sky') && this.facing.has('sky')) return { lesson: 'sky', text: t.sky! };
    if (open('pit') && this.facing.has('pit')) return { lesson: 'pit', text: t.pit! };
    if (open('sandfish') && this.facing.has('sandfish')) return { lesson: 'sandfish', text: t.sandfish! };
    if (open('octopus') && this.facing.has('octopus')) return { lesson: 'octopus', text: t.octopus! };
    if (open('heron') && this.facing.has('heron')) return { lesson: 'heron', text: t.heron! };
    if (open('raccoon') && this.facing.has('raccoon')) return { lesson: 'raccoon', text: t.raccoon!, target: this.kelpNear(beach) ?? undefined };
    if (open('fog') && this.facing.has('fog')) return { lesson: 'fog', text: t.fog! };
    if (open('tide') && beach.tide && beach.elapsed > 4) return { lesson: 'tide', text: t.tide! };
    if (this.stuck(beach)) return { lesson: 'stuck', text: t.stuck! };
    if (open('swap') && beach.capped) {
      const shell = this.biggerShell(beach);
      if (shell) return { lesson: 'swap', text: t.swap!, target: centre(shell) };
    }
    if (this.lessons.includes('drop') && c.sand >= beach.sandCapacity) return { lesson: 'drop', text: t.full! };
    if (open('buried')) {
      const shell = this.buriedShell(beach);
      if (shell) return { lesson: 'buried', text: t.buried!, target: centre(shell) };
    }
    if (open('vent')) {
      const vent = this.ventNear(beach);
      if (vent) return { lesson: 'vent', text: t.vent!, target: vent };
    }
    if (open('kelp')) {
      const kelp = this.kelpNear(beach);
      if (kelp) return { lesson: 'kelp', text: t.kelp!, target: kelp };
    }
    if (open('climb') && this.rootsNear(beach)) return { lesson: 'climb', text: t.climb!, target: this.perchedShell(beach) ?? undefined };
    if (open('move')) return { lesson: 'move', text: t.move! };
    if (open('dig')) return { lesson: 'dig', text: t.dig! };
    if (open('drop') && c.sand > 0) return { lesson: 'drop', text: t.drop! };
    return null;
  }

  /** Down a hole with walls on both sides taller than it can jump. */
  private stuck(beach: Beach): boolean {
    const c = beach.crab;
    if (!c.body.onGround || c.swap) return false;
    const s = tileSpan(c.body, beach.tileSize);
    const wall = (x: number): boolean => {
      for (let y = s.y1; y > s.y1 - STUCK_TILES; y--) if (!isSolid(beach.terrain, x, y)) return false;
      return true;
    };
    return wall(s.x0 - 1) && wall(s.x1 + 1);
  }

  /** The mouth of the nearest steam vent within a few tiles, or null. */
  private ventNear(beach: Beach): { x: number; y: number } | null {
    const T = beach.tileSize;
    const at = centre(beach.crab.body);
    let best: { x: number; y: number } | null = null;
    for (const v of beach.vents) {
      const p = { x: (v.col + 0.5) * T, y: v.top * T };
      if (Math.abs(p.x - at.x) < VENT_NEAR * T && (!best || Math.abs(p.x - at.x) < Math.abs(best.x - at.x))) best = p;
    }
    return best;
  }

  /** The middle of the nearest kelp wrack within a few tiles, on the sand, or null. */
  private kelpNear(beach: Beach): { x: number; y: number } | null {
    const T = beach.tileSize;
    const at = centre(beach.crab.body);
    let best: { x: number; y: number } | null = null;
    for (const [col, width] of beach.wrack) {
      const mid = col + width / 2;
      const p = { x: mid * T, y: surfaceRow(beach.terrain, Math.floor(mid)) * T };
      const d = Math.max(0, Math.abs(p.x - at.x) - (width / 2) * T);
      if (d < KELP_NEAR * T && (!best || Math.abs(p.x - at.x) < Math.abs(best.x - at.x))) best = p;
    }
    return best;
  }

  /** A raccoon bigger than the crab, close by. */
  private raccoonNear(beach: Beach): boolean {
    const c = beach.crab;
    const at = centre(c.body);
    const reach = DANGER_TILES * beach.tileSize;
    for (const k of beach.critters.values()) {
      if (k.size <= c.growth.size || !SPECIES[k.species].nose) continue;
      const p = centre(k);
      if (Math.abs(p.x - at.x) < reach && Math.abs(p.y - at.y) < reach) return true;
    }
    return false;
  }

  /** Mangrove roots within a few tiles of the crab. */
  private rootsNear(beach: Beach): boolean {
    const b = beach.crab.body;
    const pad = ROOTS_NEAR * beach.tileSize;
    return beach.inRoots({ x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 });
  }

  /** The nearest shell up in the roots, off the ground. */
  private perchedShell(beach: Beach): { x: number; y: number } | null {
    const shell = this.nearest(beach, (i) => i.kind.type === 'shell' && !i.buried && beach.inRoots({ ...i, y: i.y + i.h, h: 2 }));
    return shell ? centre(shell) : null;
  }

  private hunterNear(beach: Beach): boolean {
    const c = beach.crab;
    const at = centre(c.body);
    const reach = DANGER_TILES * beach.tileSize;
    for (const k of beach.critters.values()) {
      if (k.size <= c.growth.size) continue;
      const p = centre(k);
      if (Math.abs(p.x - at.x) < reach && Math.abs(p.y - at.y) < reach) return true;
    }
    return false;
  }

  /** A bird hovering over the crab, about to stoop. */
  private hovered(beach: Beach): boolean {
    for (const b of beach.birds.values()) if (b.phase === 'hover' || b.phase === 'dive') return true;
    return false;
  }

  private sandfishNear(beach: Beach): boolean {
    const c = beach.crab;
    const at = centre(c.body);
    const reach = DANGER_TILES * beach.tileSize;
    for (const k of beach.critters.values()) {
      if (k.size <= c.growth.size || movementOf(k.species) !== 'burrow') continue;
      const p = centre(k);
      if (Math.abs(p.x - at.x) < reach && Math.abs(p.y - at.y) < reach) return true;
    }
    return false;
  }

  /** The nearest loose shell that fits and lets the crab grow past its current cap. */
  private biggerShell(beach: Beach): Item | null {
    const c = beach.crab;
    return this.nearest(beach, (i) => i.kind.type === 'shell' && !i.buried && canWear(SHELLS[i.kind.shell], c.growth.size) && SHELLS[i.kind.shell].maxSize > beach.cap);
  }

  /** A buried shell worth pointing out: close by, or the next one needed once the shell is full and nothing bigger lies in the open. */
  private buriedShell(beach: Beach): Item | null {
    const reach = BURIED_TILES * beach.tileSize;
    const at = centre(beach.crab.body);
    const shell = this.nearest(beach, (i) => i.kind.type === 'shell' && i.buried);
    if (!shell) return null;
    const needed = beach.capped && this.biggerShell(beach) === null;
    return needed || Math.abs(centre(shell).x - at.x) < reach ? shell : null;
  }

  private nearest(beach: Beach, ok: (i: Item) => boolean): Item | null {
    const at = centre(beach.crab.body);
    let best: Item | null = null;
    let bestD = Infinity;
    for (const i of beach.items.values()) {
      if (!ok(i)) continue;
      const p = centre(i);
      const d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    }
    return best;
  }
}
