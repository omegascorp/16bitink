import type { BossDef, EnemyDef, LevelDef, ZoneKind } from '../level/types';
import type { Prey, PreySpec } from './preyTypes';
import type { Rng } from './rng';
import type { Snake } from './snake';
import type { Pt, Shape } from './vec';

/**
 * Why a life was lost: the farm's ways, and any a chapter adds (bitten,
 * stomped, trampled, drowned…). The result card titles each one.
 */
export type HurtCause = string;

/** What an enemy can see of the level and do to the snake. */
export interface EnemyCtx {
  readonly snake: Snake;
  readonly w: number;
  readonly h: number;
  readonly solids: readonly Shape[];
  readonly rng: Rng;
  readonly level: LevelDef;
  /** Seconds since the level started. */
  readonly elapsed: number;
  /** The prey on the board (some enemies hunt it too). */
  readonly prey: readonly Prey[];
  /** Whether a point lies in a zone of this kind. */
  inZone(p: Pt, kind: ZoneKind): boolean;
  /** A kind of prey's size and growth (from the prey registry, which enemies can't import: it imports the chapters). */
  preySpec(kind: string): { readonly size: number; readonly growth: number };
  /** The snake eats something that isn't prey (a smaller rival snake): points, a lump and growth. */
  feed(at: Pt, size: number, growth: number, points: number): void;
  /** Takes prey off the board (an enemy ate it). */
  takePrey(p: Prey): void;
  /** Costs the snake a life (unless it's safe); returns true if it did. */
  hurt(cause: HurtCause, at: Pt): boolean;
  /** Takes up to `amount` px off the tail; returns how much went. */
  nip(amount: number, at: Pt): number;
  /** Something for the view and the sound. */
  emit(e: EnemyEvent): void;
}

export type EnemyEvent =
  | { readonly type: 'arrive'; readonly kind: string; readonly x: number; readonly y: number }
  /** A word over the board for something a chapter's enemy does ("Stomp!", "Rumble…"), with a sound from audio/recipes.ts. */
  | { readonly type: 'say'; readonly text: string; readonly x: number; readonly y: number; readonly sound?: string; readonly danger?: boolean }
  | { readonly type: 'scared'; readonly kind: string; readonly x: number; readonly y: number }
  | { readonly type: 'caw' | 'cry' | 'cluck'; readonly x: number; readonly y: number }
  | { readonly type: 'lock' | 'dive' | 'miss' | 'land'; readonly kind: string; readonly x: number; readonly y: number }
  | { readonly type: 'crouch' | 'pounce' | 'dazed' | 'startle' | 'bossHit' | 'bossBeaten' | 'growl'; readonly x: number; readonly y: number };

/** Every enemy, whatever kind: it lives on the board and steps itself. */
export interface Enemy {
  readonly id: number;
  readonly kind: string;
  x: number;
  y: number;
  heading: number;
  /** Height above the board, 0 on the ground .. 1 high in the sky (birds; the view scales the shadow). */
  alt: number;
  /** What it's doing, for the view (each kind has its own). */
  readonly mode: string;
  /** Seconds into the current mode (the view times poses on it). */
  readonly modeAge: number;
  /** Off the board (arriving later, or gone): not drawn. */
  readonly away: boolean;
  /**
   * It passes over (or under) the snake's body instead of being stopped by
   * it, as everything else on the ground is: birds, a shark below, a fire,
   * a rockfall, a herd, a dust devil, an eel in its hole, other snakes.
   */
  readonly overBody?: boolean;
  step(ctx: EnemyCtx, dt: number): void;
  /**
   * Scared off by the snake's bluff (a hiss, a rasp, a hood) from `from`:
   * returns true if it ran. Optional: enemies without it can't be scared.
   */
  frighten?(ctx: EnemyCtx, from: Pt): boolean;
  /** Frozen still for `seconds` (a king cobra's hood). Optional. */
  freeze?(seconds: number): void;
}

/** A point just off a random edge of the board, where fliers come and go. */
export function edgePoint(rng: Rng, w: number, h: number, pad = 80): Pt {
  const side = Math.floor(rng() * 4);
  const t = rng();
  if (side === 0) return { x: -pad, y: t * h };
  if (side === 1) return { x: w + pad, y: t * h };
  if (side === 2) return { x: t * w, y: -pad };
  return { x: t * w, y: h + pad };
}

/**
 * An enemy that aims at a spot first (a diver's dive, a stomp, a leap):
 * the board shows a red dotted ring there, tightening as `ringT` goes 0..1.
 */
export interface Ringed {
  readonly ring: Pt | null;
  readonly ringR: number;
  readonly ringT: number;
}

/** Whether an enemy aims with a ring. */
export function isRinged(e: object): e is Ringed {
  return 'ring' in e && 'ringR' in e && 'ringT' in e;
}

/** A boss: an enemy with hit points, driven off when they run out. */
/** What to do right now, worded for mouse and keys, and for touch. */
export interface Prompt {
  readonly mouse: string;
  readonly touch: string;
}

export interface Boss extends Enemy {
  hp: number;
  readonly maxHp: number;
  readonly beaten: boolean;
  /**
   * What the player should do this moment of the fight ("It's sniffing:
   * strike now!"), shown over the board ahead of first-time hints; null
   * when there's nothing to say. Optional.
   */
  prompt?(snake: Snake): Prompt | null;
}

/** How a kind of enemy is told: its name, a few words for a level's card, a hint as it arrives, and a tip after a loss. */
export interface EnemyText {
  readonly name: string;
  readonly card: string;
  readonly hint: string;
  readonly tip: string;
  /** A first-time hint the first time it's met, worded for mouse and touch. */
  readonly coach?: { readonly mouse: string; readonly touch: string };
}

/** A kind of enemy: how to make one (the `index`-th of its kind in the level) and how it's told. */
export interface EnemyEntry {
  readonly make: (id: number, def: EnemyDef, level: LevelDef, index: number) => Enemy;
  readonly text: EnemyText;
}

/** A boss kind: how to make it and how it's told. */
export interface BossEntry {
  readonly make: (id: number, def: BossDef, level: LevelDef) => Boss;
  readonly text: EnemyText;
}

/** A chapter's first-time hint. */
export interface ChapterHint {
  readonly mouse: string;
  readonly touch: string;
  readonly after?: string;
  readonly until?: string;
  readonly max?: number;
}

/** What a chapter adds to the game's rules: its prey, enemies and boss (see logic/chapters/). */
export interface ChapterRules {
  readonly prey?: Readonly<Record<string, PreySpec>>;
  readonly enemies?: Readonly<Record<string, EnemyEntry>>;
  readonly bosses?: Readonly<Record<string, BossEntry>>;
  /**
   * First-time hints it adds, by id, for its levels' `teach` lists: shown
   * once `after` happens (an event type; at once if absent), gone once
   * `until` happens or after `max` s.
   */
  readonly hints?: Readonly<Record<string, ChapterHint>>;
  /** How each way of losing a life it adds is titled on the result card ("Stomped on…"), and called as it happens ("Stomp!"). */
  readonly hurts?: Readonly<Record<string, { readonly title: string; readonly word: string }>>;
}
