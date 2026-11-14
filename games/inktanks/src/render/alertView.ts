import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';

/**
 * "?" and "!" over enemies (Tactics §1): suspicious and alert, so the player
 * reads every enemy at a glance. The UI art (alert-q.png, alert-x.png) when
 * it exists, a bold text mark otherwise. Calm enemies show nothing; the "!" only pops when an
 * enemy spots you. Reload rings over every tank show when a gun is reloading.
 */
const pngs = import.meta.glob<string>('../art/pixel/ui/alert-*.png', { eager: true, query: '?url', import: 'default' });
const urlOf = (name: string): string | null => Object.entries(pngs).find(([p]) => p.endsWith(`/${name}.png`))?.[1] ?? null;
const KEYS = { suspicious: 'ui:alert-q', alert: 'ui:alert-x' } as const;
const URLS = { suspicious: urlOf('alert-q'), alert: urlOf('alert-x') } as const;
/** The "?" art is drawn a little smaller than the "!": scale it up to match. */
const SCALE = { suspicious: 1.15, alert: 1 } as const;
const DEPTH = 8600;
/** Above the turret, native px. */
const LIFT = 46;
/** The "!" pops this long when an enemy spots you, then hides: a fight shouldn't wear a permanent mark (owner, Nov 14). */
const ALERT_POP = 1.2;
/** Reload rings show for reloads at least this long, while more than this is left (the Machinegun's 0.1 s between rounds never shows). */
const RING_MIN_RELOAD = 0.5;
const RING_MIN_LEFT = 0.12;
const RING = { r: 9, width: 3, track: 0x14110c, fill: 0xf0c040, belt: 0xff9a3a } as const;

type Shown = 'suspicious' | 'alert';

export function preloadAlerts(scene: Phaser.Scene): void {
  for (const s of ['suspicious', 'alert'] as const) {
    const url = URLS[s];
    if (url) scene.load.image(KEYS[s], url);
  }
}

export class AlertLayer {
  private readonly marks = new Map<number, { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text; state: Shown }>();
  private rings: Phaser.GameObjects.Graphics | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  private make(state: Shown, x: number, y: number): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
    if (this.scene.textures.exists(KEYS[state])) return this.scene.add.image(x, y, KEYS[state]).setScale(SCALE[state]).setDepth(DEPTH);
    const text = state === 'alert' ? '!' : '?';
    const colour = state === 'alert' ? '#ff5a3a' : '#f0c040';
    return this.scene.add.text(x, y, text, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '26px', fontStyle: 'bold', color: colour, stroke: '#14110c', strokeThickness: 5 }).setOrigin(0.5).setDepth(DEPTH);
  }

  update(m: Match, view: Phaser.Geom.Rectangle): void {
    const seen = new Set<number>();
    for (const [id, b] of m.brains) {
      if (b.role === 'player' || b.aware === 'calm') continue;
      const t = m.tank(id);
      if (!t?.alive || t.team === 0 || t.role === 'bossTurret') continue;
      if (t.x < view.x - 60 || t.x > view.right + 60 || t.y < view.y - 80 || t.y > view.bottom + 60) continue;
      // Waves and hunters are always alert: only mark them while they're fighting, so the "!" still means something.
      if (b.role === 'wave' || b.role === 'hunter') continue;
      if (b.aware === 'alert' && m.t - b.awareSince > ALERT_POP) continue;
      const state: Shown = b.aware;
      seen.add(id);
      let mk = this.marks.get(id);
      if (mk && mk.state !== state) {
        mk.obj.destroy();
        mk = undefined;
      }
      if (!mk) {
        mk = { obj: this.make(state, t.x, t.y - LIFT), state };
        this.marks.set(id, mk);
      }
      // A small bob, faster when alert.
      const bob = Math.sin(m.t * (state === 'alert' ? 9 : 5) + id) * 2;
      mk.obj.setPosition(Math.round(t.x), Math.round(t.y - LIFT + bob));
    }
    for (const [id, mk] of this.marks) {
      if (seen.has(id)) continue;
      mk.obj.destroy();
      this.marks.delete(id);
    }
    this.drawRings(m, view);
  }

  /**
   * A ring over every tank in view that fills while its gun reloads: a Cannon's 1.1 s, a Rockets pair's
   * 2.4 s, a Machinegun belt's 1.5 s. Reading it is the plan: push while they reload. Sits to the right
   * of a "?" or "!" when one shows.
   */
  private drawRings(m: Match, view: Phaser.Geom.Rectangle): void {
    const g = (this.rings ??= this.scene.add.graphics().setDepth(DEPTH));
    g.clear();
    for (const t of m.tanks) {
      if (!t.alive || t.role === 'truck' || t.role === 'crew' || t.role === 'boss') continue;
      if (t.x < view.x - 40 || t.x > view.right + 40 || t.y < view.y - 80 || t.y > view.bottom + 40) continue;
      const gun = t.stats.gun;
      let left = 0;
      let total = 0;
      if (t.beltT > 0) [left, total] = [t.beltT, gun.beltReload];
      else if (gun.reload >= RING_MIN_RELOAD && t.reload > RING_MIN_LEFT) [left, total] = [t.reload, gun.reload];
      if (total <= 0) continue;
      const done = Math.min(1, Math.max(0, 1 - left / total));
      const x = Math.round(t.x) + (this.marks.has(t.id) ? 24 : 0);
      const y = Math.round(t.y) - LIFT + 4;
      g.fillStyle(RING.track, 0.55).fillCircle(x, y, RING.r + 2);
      g.lineStyle(RING.width, RING.track, 0.9).strokeCircle(x, y, RING.r);
      g.lineStyle(RING.width, t.beltT > 0 ? RING.belt : RING.fill, 1).beginPath().arc(x, y, RING.r, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2, false).strokePath();
    }
  }

  destroy(): void {
    for (const mk of this.marks.values()) mk.obj.destroy();
    this.marks.clear();
    this.rings?.destroy();
    this.rings = null;
  }
}
