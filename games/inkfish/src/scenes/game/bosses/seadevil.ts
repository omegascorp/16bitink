import { C } from '../../../art/fish/kit';
import { SEADEVIL_ESCA } from '../../../art/fish/species/seadevil';
import { inLight } from '../../../logic/bosses/light';
import { ambushSpot, lureBrightness, lureTug, SEADEVIL, SEADEVIL_START, stepSeadevil, type SeadevilMode, type SeadevilState } from '../../../logic/bosses/seadevil';
import { relationTo } from '../../../logic/sizing';
import { isCrawler } from '../crawlers';
import type { Fish, PlayerView } from '../fish';
import { artPoint } from '../swim';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

interface Pt {
  readonly x: number;
  readonly y: number;
}

interface Decoy {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly born: number;
}

/** The middle of its mouth on the drawing (fish-texture px): just behind the nose, low. */
const MOUTH: Pt = { x: C + 58, y: C + 12 };
const LURE_COLOR = 0xd8f4ff;
/** The darkness of a deep level sits at depth 36 (twistRunner.ts); what the lure lights is drawn just over it. */
const LIT_DEPTH = 36.3;
const FISH_DEPTH = 10;
const BOSS_DEPTH = 11;
/** Lured fish circle the bulb this far out, px... */
const ORBIT = 46;
/** ...swimming in at this speed. */
const LURED_SPEED = 130;
/** In a gulp they're sucked into the mouth this fast. */
const SUCKED_SPEED = 360;

/** The giant black seadevil in play: see logic/bosses/seadevil.ts for its rules. */
export class SeadevilBoss implements Boss {
  private state: SeadevilState = SEADEVIL_START;
  private readonly marks: Marks;
  /** The lure's brightness as drawn, easing towards what the mode wants. */
  private lit = 1;
  /** It doused its lure to cut you off, and lights up again when it's there. */
  private crept = false;
  private decoys: readonly Decoy[] = [];
  private lured: readonly Fish[] = [];

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    this.marks.clear();
    const mouth = artPoint(f.sprite, MOUTH.x, MOUTH.y);
    const dist = Math.hypot(p.x - mouth.x, p.y - mouth.y);
    if (dazed(f, now, dt)) {
      this.release();
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      this.show(p, false, dt);
      this.draw(now, dt, 0);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepSeadevil(this.state, { now, rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even', dist, seen: !p.hidden });
    const { mode } = this.state;
    if (mode !== before) this.enter(mode, p, now);
    f.state = mode === 'gulp' || mode === 'bolt' ? 'chase' : 'cruise';
    this.steer(p, now, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    this.show(p, mode === 'gape' || mode === 'gulp', dt);
    // Baring its teeth, it lights up its own face.
    f.sprite.setDepth(mode === 'gape' || mode === 'gulp' ? LIT_DEPTH : BOSS_DEPTH);
    const esca = artPoint(f.sprite, SEADEVIL_ESCA.x, SEADEVIL_ESCA.y);
    if (mode === 'lure' || mode === 'gape' || mode === 'gulp') this.gather(mode === 'gulp' ? mouth : esca, mode === 'gulp', now, dt);
    else this.release();
    if (mode === 'lure' && !p.hidden) this.tug(esca, dt);
    if (mode === 'gulp') this.gulp(mouth, now, dt);
    if (mode === 'gape') this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.5, Math.max(26, f.size * 0.6), now / 1000);
    this.draw(now, dt, lureBrightness(mode));
  }

  destroy(): void {
    this.release();
    this.marks.destroy();
  }

  private facing(): 1 | -1 {
    return this.fish.turn < 0 ? -1 : 1;
  }

  private enter(mode: SeadevilMode, p: PlayerView, now: number): void {
    const f = this.fish;
    const s = f.sprite;
    if (mode === 'gape') this.host.sfx('rustle', s, 0.6, 0.6);
    if (mode === 'gulp') this.host.sfx('suck', s, 0.8, 0.9);
    if (mode === 'creep') this.crept = true;
    if (mode === 'lure' && this.crept) {
      // Lit up again, right in your way.
      this.crept = false;
      this.host.sfx('rustle', s, 1.6, 0.4);
    }
    if (mode === 'flash') {
      // A glowing puff left behind, drifting the other way from where it's going.
      const esca = artPoint(s, SEADEVIL_ESCA.x, SEADEVIL_ESCA.y);
      const away = Math.hypot(f.vx, f.vy) || 1;
      const drift = { x: (-f.vx / away) * SEADEVIL.decoySpeed, y: (-f.vy / away) * SEADEVIL.decoySpeed * 0.5 - 15 };
      this.decoys = [...this.decoys, { x: esca.x, y: esca.y, vx: drift.x, vy: drift.y, born: now }];
    }
    if (mode === 'bolt') this.host.burst(s.x, s.y + f.size * 0.4, 10);
  }

  private steer(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'gape':
        // Stopped dead, facing you.
        return easeVelocity(f, Math.sign(dx) * 8, 0, 6, dt);
      case 'gulp':
        return easeVelocity(f, (dx / d) * SEADEVIL.gulpSpeed, (dy / d) * SEADEVIL.gulpSpeed, 7, dt);
      case 'rest':
        return easeVelocity(f, 0, 0, 2, dt);
      case 'creep': {
        const to = this.ambush(p);
        const tx = to.x - s.x;
        const ty = to.y - s.y;
        const td = Math.hypot(tx, ty) || 1;
        const v = Math.min(SEADEVIL.creepSpeed, td * 2);
        return easeVelocity(f, (tx / td) * v, (ty / td) * v, 3, dt);
      }
      case 'dark':
      case 'flash':
        return easeVelocity(f, (-dx / d) * SEADEVIL.darkSpeed, (-dy / d) * SEADEVIL.darkSpeed * 0.4, 1.5, dt);
      case 'bolt':
        return easeVelocity(f, (-dx / d) * SEADEVIL.boltSpeed, (-dy / d) * SEADEVIL.boltSpeed * 0.5, 4, dt);
      default: {
        // Hanging in the dark, edging towards you, bobbing a little; always facing you.
        const v = Math.min(SEADEVIL.driftSpeed, d * 0.1);
        easeVelocity(f, (dx / d) * v, (dy / d) * v + Math.sin(now / 900) * 12, 1, dt);
        if (Math.abs(f.vx) < 6) f.vx = Math.sign(dx || 1) * 6;
      }
    }
  }

  /** Where it means to wait: ahead of you the way you're swimming, kept in the water. */
  private ambush(p: PlayerView): Pt {
    const you = this.host.player();
    const spot = ambushSpot(p.x, p.y, you.vx, you.vy, you.turn < 0 ? -1 : 1);
    const margin = this.fish.size * 1.5;
    return { x: spot.x, y: Math.max(margin + 120, Math.min(this.host.world.height - margin, spot.y)) };
  }

  /** Black on black: you see the body only in your light, or when it opens up to show its teeth. */
  private show(p: PlayerView, bared: boolean, dt: number): void {
    const f = this.fish;
    const d = Math.hypot(f.sprite.x - p.x, f.sprite.y - p.y);
    const target = bared ? 1 : inLight(d, this.host.lightRadius());
    f.sprite.alpha += (target - f.sprite.alpha) * Math.min(1, dt * (bared ? 10 : 4));
    f.veiled = f.sprite.alpha < 0.5;
  }

  /** Small fish nearby can't resist the light: they swim in and circle the bulb (or, in a gulp, are sucked into the mouth at `to`). */
  private gather(to: Pt, sucked: boolean, now: number, dt: number): void {
    const f = this.fish;
    const kept = this.lured.filter((o) => o.sprite.active && o.state !== 'dead' && o.state !== 'hooked');
    for (const o of this.lured) {
      if (kept.includes(o) || !o.sprite.active) continue;
      // Stunned, hooked or killed: no longer under the spell.
      o.led = false;
      o.sprite.setDepth(FISH_DEPTH);
    }
    const room = SEADEVIL.lureMax - kept.length;
    const fresh = room <= 0 ? [] : this.host.fish().filter((o) =>
      o !== f && !o.led && o.role === 'normal' && o.state === 'cruise' && !isCrawler(o.species) &&
      o.size <= f.size * SEADEVIL.lureShare && Math.hypot(o.sprite.x - to.x, o.sprite.y - to.y) < SEADEVIL.lureRange,
    ).slice(0, room);
    for (const o of fresh) {
      o.led = true;
      o.sprite.setDepth(LIT_DEPTH);
    }
    this.lured = [...kept, ...fresh];
    this.lured.forEach((o, i) => {
      const a = now / 700 + (i * Math.PI * 2) / SEADEVIL.lureMax;
      const orbit = sucked ? 0 : ORBIT;
      const tx = to.x + Math.cos(a) * orbit;
      const ty = to.y + Math.sin(a) * orbit * 0.6;
      const dx = tx - o.sprite.x;
      const dy = ty - o.sprite.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = Math.min(sucked ? SUCKED_SPEED : LURED_SPEED, d * 3);
      easeVelocity(o, (dx / d) * v, (dy / d) * v, sucked ? 8 : 3, dt);
      swimBoss(o, this.host.world, this.host.floorAt, dt);
    });
  }

  /** Lets the lured fish go about their business again. */
  private release(): void {
    for (const o of this.lured) {
      o.led = false;
      if (o.sprite.active) o.sprite.setDepth(FISH_DEPTH);
    }
    this.lured = [];
  }

  /** The light draws you in, gently: you can swim against it. */
  private tug(esca: Pt, dt: number): void {
    const you = this.host.player().sprite;
    const dx = esca.x - you.x;
    const dy = esca.y - you.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = lureTug(d);
    if (pull > 0 && d > 20) this.host.drag((dx / d) * pull * dt, (dy / d) * pull * dt);
  }

  /** The gulp: water rushes into the mouth, and any fish right at it are swallowed. */
  private gulp(mouth: Pt, now: number, dt: number): void {
    const f = this.fish;
    const facing = this.facing();
    this.marks.swirl(mouth.x, mouth.y, facing, SEADEVIL.suckRange, 0.6, now / 1000, 0.7, 0.35 * facing);
    const you = this.host.player().sprite;
    const dx = mouth.x - you.x;
    const dy = mouth.y - you.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < SEADEVIL.suckRange) this.host.drag((dx / d) * SEADEVIL.pull * dt, (dy / d) * SEADEVIL.pull * dt);
    const reach = f.size * 0.9;
    const caught = this.lured.filter((o) => Math.hypot(o.sprite.x - mouth.x, o.sprite.y - mouth.y) < reach);
    for (const o of caught) {
      o.led = false;
      this.host.devour(o, mouth);
    }
    if (caught.length) this.lured = this.lured.filter((o) => !caught.includes(o));
  }

  /** The lure, and any decoys still glowing: the only lights it shows. */
  private draw(now: number, dt: number, want: number): void {
    const f = this.fish;
    this.lit += (want - this.lit) * Math.min(1, dt * (want > this.lit ? 3 : 8));
    const esca = artPoint(f.sprite, SEADEVIL_ESCA.x, SEADEVIL_ESCA.y);
    const r = Math.max(10, f.size * 0.16);
    // A slow pulse, with the odd twitch, like something small and alive.
    const twitch = Math.sin(now / 160) > 0.93 ? 0.25 : 0;
    const gape = this.state.mode === 'gape' ? 0.3 * Math.sin(now / 40) : 0;
    if (this.lit > 0.02) this.marks.lure(esca.x, esca.y, r, this.lit * (0.8 + 0.15 * Math.sin(now / 500) + twitch + gape), LURE_COLOR);
    this.decoys = this.decoys
      .map((d) => ({ ...d, x: d.x + d.vx * dt, y: d.y + d.vy * dt }))
      .filter((d) => now - d.born < SEADEVIL.decoyMs);
    for (const d of this.decoys) {
      const age = (now - d.born) / SEADEVIL.decoyMs;
      this.marks.lure(d.x, d.y, r, (1 - age) * (0.75 + 0.2 * Math.sin(now / 300 + d.born)), LURE_COLOR);
    }
  }
}
