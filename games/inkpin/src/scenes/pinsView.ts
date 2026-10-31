import Phaser from 'phaser';
import { ART_RES } from '../art/palette';
import { PIN_RING } from '../art/props';
import { segDistance } from '../logic/geom';
import type { PinDef } from '../logic/level';
import { STEPS_PER_SECOND } from '../logic/particles';
import type { World } from '../logic/world';
import { DPR } from './hidpi';
import { hintsNow, planSteps, stepsDone, type Act, type Done, type PlanStep } from './hintPlan';
import { pinKey } from './textures';

const S = 1 / ART_RES;
/** A tap this close to a pin (in board px) pulls it: generous, for fingers. */
const PIN_REACH = 34;
/** How far past its own length a gate slides out to park: its ring clear, as World.blockedBy measures. */
const GATE_PARK = 28;
/** How long a gate takes to slide out or back in (ms). */
const GATE_MS = 260;

/**
 * The pins on the board: pulled, they fly out and fade; a gate pin slides
 * out to its parked spot and waits there, and a tap pushes it back in. Also
 * the hint's numbers over the pins, which follow the player through the
 * solution and keep a timed step back until its moment.
 */
export class PinsView {
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private hints: Phaser.GameObjects.Text[] = [];
  private hover: string | null = null;
  private readonly plan: readonly PlanStep[];
  /** What the player has done so far, wound back with the level. */
  private done: Done[] = [];
  private hinted = false;
  /** The marks shown last, so the numbers are only redrawn when they change. */
  private shown = '';

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Layer, private readonly world: World) {
    for (const pin of world.level.pins) this.add(pin);
    const gates = new Set(world.level.pins.filter((p) => p.gate).map((p) => p.id));
    this.plan = planSteps(world.level.solution, gates);
  }

  private add(pin: PinDef): void {
    const len = Math.hypot(pin.bx - pin.ax, pin.by - pin.ay);
    const w = len + PIN_RING * 2 + 4;
    const img = this.scene.add.image(pin.ax, pin.ay, pinKey(pin, false)).setScale(S).setOrigin((PIN_RING + 2) / w, 0.5);
    img.setRotation(Math.atan2(pin.by - pin.ay, pin.bx - pin.ax));
    this.images.set(pin.id, img);
    this.layer.add(img);
  }

  /** How many acts the player has made, to wind back to with the level. */
  get mark(): number {
    return this.done.length;
  }

  /** The pin under a screen point: one still in, or a gate parked out. */
  pinAt(wp: { x: number; y: number }): string | null {
    let best: string | null = null;
    let bestD = PIN_REACH;
    for (const p of this.world.pins) {
      if (p.pulledAt !== null && !p.def.gate) continue;
      const seg = p.pulledAt === null ? p.def : parked(p.def);
      const d = Math.min(segDistance(seg, wp.x, wp.y), Math.hypot(wp.x - seg.ax, wp.y - seg.ay) - 4);
      if (d < bestD) {
        bestD = d;
        best = p.def.id;
      }
    }
    return best;
  }

  /** Lights the pin the pointer is over. */
  setHover(id: string | null): boolean {
    if (id === this.hover) return false;
    if (this.hover) this.images.get(this.hover)?.setTexture(this.texture(this.hover, false));
    if (id) this.images.get(id)?.setTexture(this.texture(id, true));
    this.hover = id;
    return true;
  }

  /** A pin came out: a plain one flies off and fades, a gate slides out to its parked spot. */
  pulled(id: string): void {
    this.note(id, 'pull');
    const img = this.images.get(id);
    const def = this.def(id);
    if (!img || !def) return;
    const u = ringward(def);
    this.scene.tweens.killTweensOf(img);
    if (def.gate) {
      const to = parked(def);
      this.scene.tweens.add({ targets: img, x: to.ax, y: to.ay, duration: GATE_MS, ease: 'Cubic.out' });
      return;
    }
    const reach = u.len + 30;
    this.scene.tweens.add({ targets: img, x: img.x + u.x * reach, y: img.y + u.y * reach, alpha: 0, duration: 380, ease: 'Cubic.in' });
  }

  /** A gate pushed back in: it slides home and settles with a little knock. */
  pushed(id: string): void {
    this.note(id, 'push');
    const img = this.images.get(id);
    const def = this.def(id);
    if (!img || !def) return;
    this.scene.tweens.killTweensOf(img);
    this.scene.tweens.add({
      targets: img, x: def.ax, y: def.ay, duration: GATE_MS * 0.8, ease: 'Cubic.in',
      onComplete: () => this.scene.tweens.add({ targets: img, scale: S * 1.06, duration: 60, yoyo: true }),
    });
  }

  /** A pin that can't move: it jolts the way it wanted to go and back, and the pin in its way (if any) lights up. */
  blocked(id: string, by: string | null): void {
    const img = this.images.get(id);
    const def = this.def(id);
    if (!img || !def) return;
    const out = this.world.pins.find((p) => p.def.id === id)?.pulledAt !== null;
    // In, it wants out (towards its ring); parked out, it wants back in.
    const u = ringward(def);
    const sign = out ? -1 : 1;
    const home = out ? parked(def) : def;
    this.scene.tweens.killTweensOf(img);
    img.setPosition(home.ax, home.ay);
    this.scene.tweens.add({ targets: img, x: home.ax + u.x * 7 * sign, y: home.ay + u.y * 7 * sign, duration: 70, yoyo: true, repeat: 1, ease: 'Quad.out', onComplete: () => img.setPosition(home.ax, home.ay) });
    const blocker = by ? this.images.get(by) : undefined;
    if (!blocker || !by) return;
    blocker.setTexture(this.texture(by, true));
    this.scene.tweens.add({ targets: blocker, scale: S * 1.06, duration: 120, yoyo: true, repeat: 1, onComplete: () => {
      blocker.setScale(S);
      if (this.hover !== by) blocker.setTexture(this.texture(by, false));
    } });
  }

  /** Puts every pin back as the world is now, and the player's acts back to `mark` (after a rewind). */
  resync(mark: number): void {
    this.done = this.done.slice(0, mark);
    this.scene.tweens.killTweensOf([...this.images.values()]);
    for (const p of this.world.pins) {
      const img = this.images.get(p.def.id);
      if (!img) continue;
      const at = p.pulledAt === null ? p.def : parked(p.def);
      const shown = p.pulledAt === null || p.def.gate === true;
      img.setPosition(at.ax, at.ay).setScale(S).setAlpha(shown ? 1 : 0).setTexture(pinKey(p.def, this.hover === p.def.id));
    }
    this.shown = '';
  }

  /** Turns the hint on: the steps left get numbers over their pins. */
  showHint(): void {
    this.hinted = true;
    this.shown = '';
    this.updateHints();
  }

  /** Each frame while hinted: renumbers when a step is done or a timed step's moment comes. */
  updateHints(): void {
    if (!this.hinted) return;
    const k = stepsDone(this.plan, this.done);
    const last = this.done.length ? this.done[this.done.length - 1]!.step : 0;
    const marks = hintsNow(this.plan, k, (this.world.steps - last) / STEPS_PER_SECOND);
    const key = `${k}:${marks.length}`;
    if (key === this.shown) return;
    this.shown = key;
    for (const h of this.hints) h.destroy();
    this.hints = [];
    for (const m of marks) {
      const def = this.def(m.id);
      if (!def) continue;
      // A push is marked on the gate where it's parked, with a little "back in" arrow.
      const at = m.act === 'push' ? parked(def) : def;
      const t = this.scene.add.text(at.ax, at.ay, m.act === 'push' ? `${m.n}↩` : String(m.n), { fontFamily: 'Caveat', fontSize: '34px', fontStyle: '700', color: '#ffffff', backgroundColor: '#b3322b', padding: { x: 7, y: 0 } });
      t.setOrigin(0.5).setResolution(DPR * 2);
      if (m.wait !== null) this.scene.tweens.add({ targets: t, scale: 1.25, duration: 160, yoyo: true, repeat: 2 });
      this.layer.add(t);
      this.hints.push(t);
    }
  }

  /** Records what the player did, as the world reported it. */
  private note(id: string, act: Act): void {
    this.done.push({ id, act, step: this.world.steps });
    this.shown = '';
  }

  private def(id: string): PinDef | undefined {
    return this.world.level.pins.find((p) => p.id === id);
  }

  private texture(id: string, lit: boolean): string {
    const def = this.def(id);
    return def ? pinKey(def, lit) : '__MISSING';
  }
}

/** The unit vector from a pin's tip towards its ring (the way it slides out), and its length. */
function ringward(def: PinDef): { x: number; y: number; len: number } {
  const len = Math.hypot(def.bx - def.ax, def.by - def.ay) || 1;
  return { x: (def.ax - def.bx) / len, y: (def.ay - def.by) / len, len };
}

/** Where a gate pin waits once pulled: slid out by its own length plus its ring. */
export function parked(def: PinDef): PinDef {
  const u = ringward(def);
  const d = u.len + GATE_PARK;
  return { ...def, ax: def.ax + u.x * d, ay: def.ay + u.y * d, bx: def.bx + u.x * d, by: def.by + u.y * d };
}
