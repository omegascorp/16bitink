import { GROUPER, GROUPER_START, stepGrouper, type GrouperMode, type GrouperState } from '../../../logic/bosses/grouper';
import { relationTo } from '../../../logic/sizing';
import { stunFish, type Fish, type PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

/** How much it swells before it booms. */
const SWELL = 0.16;
/** The moray it calls: a little smaller than itself, never so small it's just a snack, px radius. */
const MORAY = { share: 0.75, min: 34, speed: 300, arrive: 60, from: 700 } as const;
/** A small fish caught by the boom stays dazed this long, ms. */
const FISH_STUN_MS = 2000;
const BOOM_BLUE = 0x1f3f8a;

interface Partner {
  readonly fish: Fish;
  /** Gives up and swims off on its own after this, ms. */
  readonly until: number;
}

/** The grouper in play: see logic/bosses/grouper.ts for its rules. */
export class GrouperBoss implements Boss {
  private state: GrouperState = GROUPER_START;
  private readonly marks: Marks;
  /** When the last boom went off (its ring spreads from here), ms. */
  private boomedAt = -1e9;
  private boomX = 0;
  private boomY = 0;
  private partner: Partner | null = null;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    this.lead(p, now, dt);
    if (dazed(f, now, dt)) {
      f.size = f.baseSize;
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      this.drawWave(now);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state;
    this.state = stepGrouper(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      seen: !p.hidden,
      hidden: p.hidden ?? false,
    });
    if (this.state.mode !== before.mode) this.enter(this.state.mode, before.mode, now);
    if (this.state.called !== before.called) this.call(p, now);
    // Swelling up for the boom: it grows, wobbling.
    const swell = this.state.mode === 'swell' ? 1 - (this.state.until - now) / (rel === 'prey' ? GROUPER.defendSwellMs : GROUPER.swellMs) : 0;
    f.size = f.baseSize * (1 + SWELL * Math.max(0, Math.min(1, swell)) * (1 + Math.sin(now / 45) * 0.15));
    f.state = this.state.mode === 'lunge' || this.state.mode === 'flee' ? 'chase' : 'cruise';
    this.steer(p, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'swell') this.marks.exclaim(s.x, s.y - f.size * 1.5, Math.max(26, f.size * 0.7), now / 1000);
    this.drawWave(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private enter(mode: GrouperMode, from: GrouperMode, now: number): void {
    if (from === 'swell') this.boom(now);
    if (mode === 'swell') this.host.sfx('rustle', this.fish.sprite, 0.45, 0.6);
  }

  /** The boom: a deep thump and a ring of sound that stuns whatever it reaches. */
  private boom(now: number): void {
    const f = this.fish;
    const h = this.host;
    const defending = this.state.mode === 'flee';
    this.boomedAt = now;
    this.boomX = f.sprite.x;
    this.boomY = f.sprite.y;
    h.sfx('boom', f.sprite, 0.7);
    h.shake(200, 0.006);
    const r = GROUPER.boomRadius;
    const you = h.player().sprite;
    if (Math.hypot(you.x - this.boomX, you.y - this.boomY) < r) h.stunPlayer(defending ? GROUPER.defendStunMs : GROUPER.stunMs, 'BOOM!');
    for (const other of h.fish()) {
      if (other !== f && other.role === 'normal' && Math.hypot(other.sprite.x - this.boomX, other.sprite.y - this.boomY) < r) stunFish(other, now, FISH_STUN_MS);
    }
  }

  /** You hid nearby: a moray comes in from off to the side to flush you out. */
  private call(p: PlayerView, now: number): void {
    const f = this.fish;
    if (this.partner?.fish.sprite.active) return;
    const side = f.sprite.x <= p.x ? -1 : 1;
    const size = Math.max(MORAY.min, f.baseSize * MORAY.share);
    const moray = this.host.summon('moray', size, p.x + side * MORAY.from, p.y + 40, -side * MORAY.speed);
    moray.led = true;
    this.partner = { fish: moray, until: now + 8000 };
    this.host.sfx('boom', f.sprite, 1.3, 0.5);
    this.host.floatText(f.sprite.x, f.sprite.y - f.size * 1.6, 'Boom… boom…', '#1f3f8a', 26);
  }

  /** The moray swims straight to your hiding place and flushes you out, then goes its own way. */
  private lead(p: PlayerView, now: number, dt: number): void {
    const partner = this.partner;
    if (!partner) return;
    const m = partner.fish;
    if (!m.sprite.active) {
      this.partner = null;
      return;
    }
    const dx = p.x - m.sprite.x;
    const dy = p.y - m.sprite.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < MORAY.arrive || now >= partner.until || !p.hidden) {
      if (d < MORAY.arrive && this.host.flushPlayer()) {
        this.host.sfx('spotted', m.sprite);
        this.host.floatText(m.sprite.x, m.sprite.y - 30, 'Flushed out!', '#a3342b', 30);
      }
      m.led = false;
      this.partner = null;
      return;
    }
    easeVelocity(m, (dx / d) * MORAY.speed, (dy / d) * MORAY.speed, 4, dt);
    swimBoss(m, this.host.world, this.host.floorAt, dt);
  }

  private steer(p: PlayerView, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'swell':
        // Holding its ground, facing you.
        easeVelocity(f, Math.sign(dx) * 8, 0, 5, dt);
        return;
      case 'lunge':
        return easeVelocity(f, (dx / d) * GROUPER.lungeSpeed, (dy / d) * GROUPER.lungeSpeed, 6, dt);
      case 'rest':
        return easeVelocity(f, Math.sign(f.vx || 1) * 40, 0, 2, dt);
      case 'flee':
        return easeVelocity(f, (-dx / d) * GROUPER.fleeSpeed, (-dy / d) * GROUPER.fleeSpeed, 4, dt);
      case 'wary': {
        const near = d < GROUPER.waryDistance;
        return easeVelocity(f, near ? (-dx / d) * 200 : Math.sign(f.vx || 1) * 60, near ? (-dy / d) * 120 : 0, 2, dt);
      }
      default: {
        // Closing in, but heavily: it waits for you to come to it.
        const v = Math.min(GROUPER.roamSpeed, d * 0.8);
        easeVelocity(f, (dx / d) * v, (dy / d) * v * 0.6, 2, dt);
      }
    }
  }

  /** The ring of sound, spreading out from where it boomed. */
  private drawWave(now: number): void {
    const k = (now - this.boomedAt) / GROUPER.waveMs;
    if (k < 0 || k > 1) return;
    this.marks.wave(this.boomX, this.boomY, GROUPER.boomRadius * (0.15 + 0.85 * k), (1 - k) * 0.8, BOOM_BLUE);
  }
}
