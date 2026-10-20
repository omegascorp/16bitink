import Phaser from 'phaser';
import { MARBLE_RES } from '../../art/marbleArt';
import { BOIL } from '../../art/palette';
import { DRAGONFLY_RES, TEX } from '../../art/textures';
import type { Board } from '../../logic/board';
import { CHARM_FADES_AFTER } from '../../logic/charms';
import { D } from '../../logic/line';
import { pointAt } from '../../logic/path';

/** How fast a drawn marble catches up with where the line says it is (per second): a pushed marble glides rather than jumps. */
const CATCH_UP = 16;
/** A charm blinks for this long before it fades. */
const BLINK_FOR = 3;
const TOKEN_RES = 3;

interface Shown {
  readonly img: Phaser.GameObjects.Image;
  mark: Phaser.GameObjects.Image | null;
  s: number;
  seen: boolean;
}

/** The marbles in the lines, the shots in flight and the charms falling, drawn each frame from the board. */
export class MarblesView {
  private readonly marbles = new Map<number, Shown>();
  private readonly shots = new Map<number, Phaser.GameObjects.Image>();
  private readonly drops = new Map<number, Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** Where a marble is drawn right now (it may lag the line a little). */
  shownAt(id: number): number | undefined {
    return this.marbles.get(id)?.s;
  }

  sync(board: Board, dt: number, time: number): void {
    for (const m of this.marbles.values()) m.seen = false;
    const k = Math.min(1, dt * CATCH_UP);
    for (const line of board.lines) {
      const L = line.path.length;
      for (const m of line.marbles) {
        let v = this.marbles.get(m.id);
        if (!v) {
          v = { img: this.scene.add.image(0, 0, TEX.marble(m.colour, 0)).setScale(1 / MARBLE_RES).setDepth(4), mark: null, s: m.s, seen: true };
          this.marbles.set(m.id, v);
        }
        v.seen = true;
        v.s += (m.s - v.s) * k;
        const p = pointAt(line.path, Math.max(0, Math.min(L, v.s)));
        // Coming out of the burrow and dropping into the well, a marble is drawn smaller.
        const out = Phaser.Math.Clamp((v.s + D * 0.6) / D, 0, 1);
        const into = Phaser.Math.Clamp((L - v.s) / D + 0.35, 0, 1);
        const size = Math.min(out, into);
        const f = (Math.floor(time / 140) + m.id) % BOIL;
        v.img.setTexture(TEX.marble(m.colour, f)).setPosition(p.x, p.y).setRotation(v.s / (D * 0.9))
          .setScale(size / MARBLE_RES).setVisible(size > 0.05).setAlpha(Math.min(1, size * 1.5));
        this.syncMark(v, m.charm, m.charmAge, p, size, time);
      }
    }
    for (const [id, v] of this.marbles) {
      if (v.seen) continue;
      v.img.destroy();
      v.mark?.destroy();
      this.marbles.delete(id);
    }
    this.syncShots(board, time);
    this.syncDrops(board, time);
  }

  private syncMark(v: Shown, charm: string | null, age: number, p: { x: number; y: number }, size: number, time: number): void {
    if (!charm) {
      v.mark?.destroy();
      v.mark = null;
      return;
    }
    if (!v.mark || v.mark.texture.key !== TEX.mark(charm)) {
      v.mark?.destroy();
      v.mark = this.scene.add.image(0, 0, TEX.mark(charm)).setDepth(5);
    }
    const fading = age > CHARM_FADES_AFTER - BLINK_FOR;
    const pulse = 1 + Math.sin(time / 160) * 0.08;
    v.mark.setPosition(p.x, p.y).setScale((size * pulse) / MARBLE_RES).setVisible(size > 0.3).setAlpha(fading && Math.floor(time / 120) % 2 === 0 ? 0.25 : 1);
  }

  private syncShots(board: Board, time: number): void {
    const live = new Set<number>();
    for (const s of board.shots) {
      live.add(s.id);
      let img = this.shots.get(s.id);
      if (!img) {
        img = this.scene.add.image(s.x, s.y, TEX.marble(s.colour, 0)).setScale(s.pierce ? 1.15 / DRAGONFLY_RES : 1 / MARBLE_RES).setDepth(6);
        this.shots.set(s.id, img);
      }
      const f = Math.floor(time / (s.pierce ? 50 : 140)) % BOIL;
      // A Dragonfly flies nose first; a marble spins.
      if (s.pierce) img.setTexture(TEX.dragonfly(Math.floor(time / 35) % 2, f)).setPosition(s.x, s.y).setRotation(Math.atan2(s.vy, s.vx) + Math.PI / 2);
      else img.setTexture(TEX.marble(s.colour, f)).setPosition(s.x, s.y).setRotation(time / 60);
      if (s.burst) img.setTint(0xffd9a0);
    }
    for (const [id, img] of this.shots) {
      if (live.has(id)) continue;
      img.destroy();
      this.shots.delete(id);
    }
  }

  private syncDrops(board: Board, time: number): void {
    const live = new Set<number>();
    for (const d of board.drops) {
      live.add(d.id);
      let img = this.drops.get(d.id);
      if (!img) {
        img = this.scene.add.image(d.x, d.y, TEX.token(d.charm, 0)).setScale(1 / TOKEN_RES).setDepth(7);
        this.drops.set(d.id, img);
      }
      const sway = Math.sin(time / 220 + d.id) * 6;
      img.setTexture(TEX.token(d.charm, Math.floor(time / 140) % BOIL)).setPosition(d.x + sway, d.y).setRotation(sway / 40);
    }
    for (const [id, img] of this.drops) {
      if (live.has(id)) continue;
      img.destroy();
      this.drops.delete(id);
    }
  }
}
