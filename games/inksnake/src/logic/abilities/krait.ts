import { tendHoles } from '../chapters/reefPrey';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** A full breath lasts this long with the head underwater, s (real dives run 15–30 min). */
const DIVE = 22;
/** On land an empty breath fills up again in this long, s. */
const REFILL = 2.6;
/** Below this share of a breath the meter warns, and the krait says so once. */
export const BREATH_LOW = 0.28;
/** Speed in the water (it swims with a paddle-flat tail) and on land, as shares of its cruising speed. */
const SPEED = { water: 1.15, land: 0.7 } as const;

/**
 * The banded sea krait's breath (passive, no button): it hunts underwater
 * but has to come up to breathe. With its head in the water it swims fast
 * and the breath meter runs down; on land (a sand cay, a rock) it's slow,
 * but breathes the meter full again in a moment. When the breath runs out
 * it gasps its way up: a life lost, and a full breath.
 */
class Breath implements Ability {
  readonly id = 'breath';
  readonly label = 'Breath';
  readonly button = false;
  private value = 1;
  private warned = false;
  private wet = false;

  get charge(): number {
    return this.value;
  }

  /** Underwater, holding its breath. */
  get active(): boolean {
    return this.wet;
  }

  step(ctx: AbilityCtx, _input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    tendHoles(ctx);
    this.wet = ctx.inZone(s.head, 'water');
    s.speedScale = this.wet ? SPEED.water : SPEED.land;
    this.value = this.wet ? Math.max(0, this.value - dt / DIVE) : Math.min(1, this.value + dt / REFILL);
    if (this.wet && this.value < BREATH_LOW && !this.warned) {
      this.warned = true;
      ctx.emit({ type: 'say', text: 'Need air!', x: s.head.x, y: s.head.y - 30, danger: true });
    }
    if (this.value > BREATH_LOW + 0.15) this.warned = false;
    // Out of breath: it gasps up (a life), and comes back down with a full one. While it's safe after a hit, it waits.
    if (this.wet && this.value <= 0 && ctx.hurt('drowned', s.head)) this.value = 1;
    s.meter = { label: 'breath', value: this.value, low: this.value < BREATH_LOW };
  }
}

export const KRAIT: AbilityMaker | null = () => new Breath();
