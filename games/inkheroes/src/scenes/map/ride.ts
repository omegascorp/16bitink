/** A rider's pace, map pixels a millisecond: about seven tiles a second, whatever the ground. */
export const RIDE_SPEED = 0.36;
/** The gallop's frames a second: at this pace a stride covers about a length and a half of the horse. */
export const RIDE_FPS = 17;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Leg {
  readonly from: Point;
  readonly to: Point;
  readonly ms: number;
  readonly arrive: () => void;
  t: number;
}

/**
 * Carries a figure from tile to tile at one steady pace. Each leg ends inside
 * `update`, and the time left over goes straight into the leg its `arrive`
 * starts, so a long ride never pauses at a tile. Call `update` every frame.
 */
export class Ride {
  private leg: Leg | null = null;

  constructor(private readonly place: (x: number, y: number) => void) {}

  get moving(): boolean {
    return this.leg !== null;
  }

  /** Rides from `from` to `to`, then calls `arrive`. */
  go(from: Point, to: Point, arrive: () => void): void {
    this.leg = { from, to, ms: Math.hypot(to.x - from.x, to.y - from.y) / RIDE_SPEED, arrive, t: 0 };
  }

  update(delta: number): void {
    let left = delta;
    while (this.leg) {
      const leg = this.leg;
      const need = leg.ms - leg.t;
      if (left < need) {
        leg.t += left;
        const at = leg.t / leg.ms;
        this.place(leg.from.x + (leg.to.x - leg.from.x) * at, leg.from.y + (leg.to.y - leg.from.y) * at);
        return;
      }
      left -= need;
      this.leg = null;
      this.place(leg.to.x, leg.to.y);
      leg.arrive();
    }
  }
}
