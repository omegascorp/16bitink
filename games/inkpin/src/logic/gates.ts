import { bodyContact, type Boulder } from './boulders';
import { capsuleContact, segSegDistance, type Contact, type Seg } from './geom';
import { ledgeSeg, type Ledge } from './ledges';
import { COIN, GRAIN_R, STONE, type Grains } from './particles';
import { inPlay, RUBY_R, type Ruby } from './rubies';

/**
 * Gate pins (chapter 2 on): tap one again and it slides back into its slot,
 * so a pour can be cut mid-flow. It never closes on something solid: a
 * creature, a body, a ruby or a slab in the slot jams it. Grains make way:
 * each is pushed out of the slot to whichever side it's nearer.
 */

/** Spacing of the circles along a pin that test a body against its slot (px). */
const PROBE = 4;

/** What could be in a gate's way. */
export interface Slot {
  readonly creatures: readonly { readonly x: number; readonly y: number; readonly r: number }[];
  readonly bodies: readonly Boulder[];
  readonly rubies: readonly Ruby[];
  readonly ledges: readonly Ledge[];
}

/** True when something solid is in the pin's slot, so it can't go back in. */
export function jammed(pin: Seg, s: Slot, k: Contact): boolean {
  if (s.creatures.some((c) => capsuleContact(pin, c.x, c.y, c.r, k))) return true;
  if (s.rubies.some((r) => inPlay(r) && capsuleContact(pin, r.x, r.y, RUBY_R, k))) return true;
  if (s.ledges.some((l) => segSegDistance(pin, ledgeSeg(l)) < pin.t + ledgeSeg(l).t)) return true;
  const len = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay);
  const n = Math.max(1, Math.ceil(len / PROBE));
  return s.bodies.some((b) => {
    if (b.gone) return false;
    for (let p = 0; p <= n; p++) {
      if (bodyContact(b, pin.ax + ((pin.bx - pin.ax) * p) / n, pin.ay + ((pin.by - pin.ay) * p) / n, pin.t, k)) return true;
    }
    return false;
  });
}

/** Pushes every grain out of the pin's slot, to the nearer side; set stone comes loose, sleeping gold wakes. */
export function clearSlot(pin: Seg, g: Grains, k: Contact): void {
  const cx = (pin.ax + pin.bx) / 2;
  const cy = (pin.ay + pin.by) / 2;
  const reach = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay) / 2 + pin.t + GRAIN_R;
  g.near(cx, cy, reach, (i) => {
    if (!capsuleContact(pin, g.x[i]!, g.y[i]!, GRAIN_R, k)) return;
    if (g.kind[i] === STONE) g.loosen(i);
    if (g.kind[i] === COIN) g.wake(i);
    g.x[i] = g.x[i]! + k.nx * (k.depth + 0.5);
    g.y[i] = g.y[i]! + k.ny * (k.depth + 0.5);
    g.vx[i] = 0;
    g.vy[i] = 0;
  });
}
