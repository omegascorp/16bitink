import { BASS, BASS_START, bassTucked, stepBass, type BassMode, type BassState } from '../../../logic/bosses/bass';
import { insidePatch, type CoverPatch } from '../../../levels/cover';
import { nearestOnRing } from '../../../logic/ring';
import { relationTo } from '../../../logic/sizing';
import type { Fish, PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** How far the strike leads you, s: it aims where you're going, not where you were. */
const LEAD = 0.18;
/** While tucked away from a bigger you, a few bubbles give it away every so often, ms. */
const TELL_EVERY_MS = 1600;

/** The striped bass in play: see logic/bosses/bass.ts for its rules. */
export class BassBoss implements Boss {
  private state: BassState = BASS_START;
  private strike: Pt = { x: 0, y: 0 };
  private readonly marks: Marks;
  private nextTell = 0;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    this.marks.clear();
    if (dazed(f, now, dt)) {
      f.tucked = false;
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepBass(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(f.sprite.x - p.x, f.sprite.y - p.y),
      seen: !p.hidden,
      inPatch: this.patchHolding(f.sprite),
      playerPatch: this.patchAround(p),
      goal: rel === 'prey' ? this.hideout(p) : this.lair(p),
    });
    if (this.state.mode !== before) this.enter(this.state.mode, p, now);
    f.tucked = bassTucked(this.state.mode);
    f.state = this.state.mode === 'burst' || this.state.mode === 'flushed' ? 'chase' : 'cruise';
    this.steer(p, now, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    this.warn(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private get patches(): readonly CoverPatch[] {
    return this.host.covers.map((c) => c.patch);
  }

  /** Where it sits in patch i: in the thick of it, nearest copy round the ring to `near`. */
  private seat(i: number, near: number): Pt {
    const c = this.patches[i]!;
    const x = nearestOnRing(c.x, near, this.host.world.width);
    return { x, y: this.host.floorAt(c.x) - c.height * 0.42 };
  }

  /** The patch whose thick it's sitting in, if any. */
  private patchHolding(at: Pt): number | null {
    const i = this.patches.findIndex((c, k) => {
      const s = this.seat(k, at.x);
      return Math.abs(at.x - s.x) < c.half * 0.5 && Math.abs(at.y - s.y) < c.height * 0.3;
    });
    return i < 0 ? null : i;
  }

  /** The patch you're inside, if any. */
  private patchAround(p: PlayerView): number | null {
    const w = this.host.world.width;
    const i = this.patches.findIndex((c) => insidePatch(c, nearestOnRing(p.x, c.x, w), p.y, p.size, this.host.floorAt(c.x)));
    return i < 0 ? null : i;
  }

  /** Hunting: the weed nearest you (not one you're in: it wants to see you coming). */
  private lair(p: PlayerView): number | null {
    return this.best((i) => {
      const s = this.seat(i, p.x);
      return Math.hypot(s.x - p.x, s.y - p.y) + (this.patchAround(p) === i ? 1e6 : 0);
    });
  }

  /** Hiding: weed near itself and far from you, never one it was just flushed from. */
  private hideout(p: PlayerView): number | null {
    const f = this.fish.sprite;
    return this.best((i) => {
      if (i === this.state.shunned) return Infinity;
      const s = this.seat(i, f.x);
      const toward = Math.hypot(s.x - f.x, s.y - f.y);
      const fromYou = Math.hypot(s.x - p.x, s.y - p.y);
      return toward - fromYou * 0.7;
    });
  }

  private best(score: (i: number) => number): number | null {
    let pick: number | null = null;
    let low = Infinity;
    for (let i = 0; i < this.patches.length; i++) {
      const v = score(i);
      if (v < low) [pick, low] = [i, v];
    }
    return pick;
  }

  private enter(mode: BassMode, p: PlayerView, now: number): void {
    const f = this.fish.sprite;
    const h = this.host;
    if (mode === 'tense') h.sfx('rustle', f, 0.8);
    if (mode === 'burst') {
      const you = h.player();
      this.strike = { x: p.x + you.vx * LEAD, y: p.y + you.vy * LEAD };
      h.sfx('lunge', f);
      h.burst(f.x, f.y, 10);
      h.shake(140, 0.004);
    }
    if (mode === 'flushed') {
      h.sfx('splash', f, 0.7);
      h.burst(f.x, f.y, 12);
    }
    if (mode === 'tucked') this.nextTell = now + TELL_EVERY_MS;
  }

  private steer(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const at = f.sprite;
    const { mode, patch } = this.state;
    const toward = (t: Pt, speed: number, rate: number): void => {
      const dx = t.x - at.x;
      const dy = t.y - at.y;
      const d = Math.hypot(dx, dy);
      // Slow into the spot instead of overshooting it.
      const s = Math.min(speed, d * 3);
      easeVelocity(f, d ? (dx / d) * s : 0, d ? (dy / d) * s : 0, rate, dt);
    };
    if (mode === 'burst') return toward(this.strike, BASS.burstSpeed, 8);
    if (mode === 'recover') return easeVelocity(f, Math.sign(f.vx) * 40, 0, 2, dt);
    if (mode === 'flushed') {
      const dx = at.x - p.x || 1;
      const dy = at.y - p.y;
      const d = Math.hypot(dx, dy);
      return easeVelocity(f, (dx / d) * BASS.flushSpeed, (dy / d) * BASS.flushSpeed, 6, dt);
    }
    if (patch === null) {
      // No weed: cruise near you (hunting) or keep away (hiding).
      const away = mode === 'flee' ? -1 : 1;
      const dx = (p.x - at.x) * away;
      const d = Math.abs(dx) || 1;
      return easeVelocity(f, (dx / d) * (mode === 'flee' ? BASS.fleeSpeed : 70), (p.y - at.y) * 0.3 * away, 2, dt);
    }
    const seat = this.seat(patch, at.x);
    if (mode === 'lurk' || mode === 'tense' || mode === 'tucked') {
      // Holding still in the weed, just breathing.
      toward({ x: seat.x, y: seat.y + Math.sin(now / 700) * 4 }, 60, 3);
      // Face out, towards you, ready to go.
      if (Math.abs(f.vx) < 8) f.vx = Math.sign(p.x - at.x) * 8;
      return;
    }
    // Far from its weed it hurries; it only slows to sneak in.
    const far = Math.hypot(seat.x - at.x, seat.y - at.y) > BASS.hurryRange;
    toward(seat, mode === 'flee' ? BASS.fleeSpeed : far ? BASS.hurrySpeed : BASS.roamSpeed, 2.5);
  }

  /** The tells: shivering weed and a red "!" before the strike; a few bubbles from its hiding place. */
  private warn(now: number): void {
    const { mode, patch } = this.state;
    const f = this.fish;
    if (mode === 'tense') {
      const view = patch === null ? null : this.host.covers[patch];
      if (view && view.patch.kind !== 'coral') {
        // Weed sway is set fresh every frame, so this jolt adds to it for this frame only.
        for (const [k, w] of view.front.entries()) w.rotation += Math.sin(now / 28 + k * 1.7) * 0.14;
      }
      this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.5, Math.max(26, f.size * 0.8), now / 1000);
    }
    if (mode === 'tucked' && now >= this.nextTell) {
      this.nextTell = now + TELL_EVERY_MS;
      this.host.burst(f.sprite.x, f.sprite.y - f.size * 0.6, 2);
    }
  }
}
