import Phaser from 'phaser';
import { MARBLE_RES } from '../../art/marbleArt';
import { BOIL } from '../../art/palette';
import { HEDGEHOG_RES, TWINE_CORD_W } from '../../art/propsFarm';
import { DRAGONFLY_RES, FRUIT_RES, TEX } from '../../art/textures';
import { SHIFT_EVERY, type Board } from '../../logic/board';
import { CHARM_FADES_AFTER } from '../../logic/charms';
import { D } from '../../logic/line';
import { pointAt } from '../../logic/path';

/** How fast a drawn marble catches up with where the line says it is (per second): a pushed marble glides rather than jumps. */
const CATCH_UP = 16;
/** A charm blinks for this long before it fades. */
const BLINK_FOR = 3;
const TOKEN_RES = 3;

/** Marbles are drawn under the tunnel covers (5.5), except where carried over a crossing. */
const DEPTH = { marble: 4, cord: 4.1, bud: 4.2, mark: 5, raised: 5.7, raisedCord: 5.72, raisedBud: 5.75, raisedMark: 5.8, hedgehog: 6.4 } as const;
/** The chameleons' ring shows over this last part of the wait before they turn, s. */
const SHIFT_WARN = 1.2;
/** The Hedgehog's two steps alternate this often, ms. */
const STEP_MS = 130;

interface Shown {
  readonly img: Phaser.GameObjects.Image;
  mark: Phaser.GameObjects.Image | null;
  bud: Phaser.GameObjects.Image | null;
  /** Twine knotted round it, and (on the one nearer the burrow) the cord to its partner. */
  knot: Phaser.GameObjects.Image | null;
  cord: Phaser.GameObjects.Image | null;
  /** A chameleon's sheen and the ring that shimmers before it turns. */
  sheen: Phaser.GameObjects.Image | null;
  ring: Phaser.GameObjects.Image | null;
  s: number;
  seen: boolean;
}

/** The marbles in the lines, the shots in flight and the charms falling, drawn each frame from the board. */
export class MarblesView {
  private readonly marbles = new Map<number, Shown>();
  private readonly shots = new Map<number, Phaser.GameObjects.Image>();
  private readonly drops = new Map<number, Phaser.GameObjects.Image>();
  private readonly fruits = new Map<number, Phaser.GameObjects.Image>();
  private hedgehog: Phaser.GameObjects.Image | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Where a marble is drawn right now (it may lag the line a little). */
  shownAt(id: number): number | undefined {
    return this.marbles.get(id)?.s;
  }

  sync(board: Board, dt: number, time: number): void {
    for (const m of this.marbles.values()) m.seen = false;
    const k = Math.min(1, dt * CATCH_UP);
    board.lines.forEach((line, li) => {
      const L = line.path.length;
      for (const m of line.marbles) {
        let v = this.marbles.get(m.id);
        if (!v) {
          v = { img: this.scene.add.image(0, 0, TEX.marble(m.colour, 0)).setScale(1 / MARBLE_RES), mark: null, bud: null, knot: null, cord: null, sheen: null, ring: null, s: m.s, seen: true };
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
        const up = board.raised(li, v.s);
        v.img.setTexture(m.stone ? TEX.stone(f) : TEX.marble(m.colour, f)).setPosition(p.x, p.y).setRotation(v.s / (D * 0.9))
          .setScale(size / MARBLE_RES).setVisible(size > 0.05).setAlpha(Math.min(1, size * 1.5)).setDepth(up ? DEPTH.raised : DEPTH.marble);
        this.syncBud(v, m.bud === true, f, size, up);
        this.syncSheen(v, m.chameleon === true, f, size, up, board.shiftIn, time);
        this.syncMark(v, m.charm, m.charmAge, p, size, time);
        v.mark?.setDepth(up ? DEPTH.raisedMark : DEPTH.mark);
      }
    });
    for (const [id, v] of this.marbles) {
      if (v.seen) continue;
      for (const o of [v.img, v.mark, v.bud, v.knot, v.cord, v.sheen, v.ring]) o?.destroy();
      this.marbles.delete(id);
    }
    this.syncTwine(board, time);
    this.syncHedgehog(board, time);
    this.syncShots(board, time);
    this.syncDrops(board, time);
    this.syncFruit(board, time);
  }

  /** A bud closed over the marble, turning with it. */
  private syncBud(v: Shown, bud: boolean, f: number, size: number, up: boolean): void {
    if (!bud) {
      v.bud?.destroy();
      v.bud = null;
      return;
    }
    v.bud ??= this.scene.add.image(0, 0, TEX.bud(0));
    v.bud.setTexture(TEX.bud(f)).setPosition(v.img.x, v.img.y).setRotation(v.img.rotation).setScale(size / MARBLE_RES)
      .setVisible(v.img.visible).setAlpha(v.img.alpha).setDepth(up ? DEPTH.raisedBud : DEPTH.bud);
  }

  /** A chameleon's sheen, and a ring that shimmers in as its turn comes. */
  private syncSheen(v: Shown, on: boolean, f: number, size: number, up: boolean, shiftIn: number, time: number): void {
    if (!on) {
      v.sheen?.destroy();
      v.ring?.destroy();
      v.sheen = null;
      v.ring = null;
      return;
    }
    v.sheen ??= this.scene.add.image(0, 0, TEX.sheen(0));
    v.ring ??= this.scene.add.image(0, 0, TEX.sheenRing(0));
    const depth = up ? DEPTH.raisedBud : DEPTH.bud;
    v.sheen.setTexture(TEX.sheen(f)).setPosition(v.img.x, v.img.y).setScale(size / MARBLE_RES).setVisible(v.img.visible).setAlpha(v.img.alpha).setDepth(depth);
    const warn = Phaser.Math.Clamp(1 - shiftIn / SHIFT_WARN, 0, 1);
    // Just after a turn the ring flares, then fades; it grows back in as the next turn nears.
    const flare = Phaser.Math.Clamp(1 - (SHIFT_EVERY - shiftIn) / 0.35, 0, 1);
    v.ring.setTexture(TEX.sheenRing(f)).setPosition(v.img.x, v.img.y).setRotation(time / 500).setScale((size * (1 + flare * 0.25)) / MARBLE_RES)
      .setVisible(v.img.visible && warn + flare > 0.02).setAlpha(Math.max(warn, flare) * v.img.alpha).setDepth(depth);
  }

  /** Twine round each tied marble, and a cord stretched from the one nearer the burrow to its partner. */
  private syncTwine(board: Board, time: number): void {
    board.lines.forEach((line, li) => {
      for (const m of line.marbles) {
        const v = this.marbles.get(m.id);
        if (!v) continue;
        const partner = m.tie === undefined ? undefined : this.marbles.get(m.tie);
        if (!partner) {
          v.knot?.destroy();
          v.cord?.destroy();
          v.knot = null;
          v.cord = null;
          continue;
        }
        const f = (Math.floor(time / 140) + m.id) % BOIL;
        const ang = Math.atan2(partner.img.y - v.img.y, partner.img.x - v.img.x);
        const up = board.raised(li, v.s);
        v.knot ??= this.scene.add.image(0, 0, TEX.twineKnot(0));
        v.knot.setTexture(TEX.twineKnot(f)).setPosition(v.img.x, v.img.y).setRotation(ang).setScale(v.img.scaleX)
          .setVisible(v.img.visible).setAlpha(v.img.alpha).setDepth((up ? DEPTH.raisedBud : DEPTH.bud) + 0.01);
        // One cord per pair, drawn from the marble with the lower id.
        if (m.id > m.tie!) {
          v.cord?.destroy();
          v.cord = null;
          continue;
        }
        const dist = Math.hypot(partner.img.x - v.img.x, partner.img.y - v.img.y);
        v.cord ??= this.scene.add.image(0, 0, TEX.twineCord(0));
        v.cord.setTexture(TEX.twineCord(f)).setPosition((v.img.x + partner.img.x) / 2, (v.img.y + partner.img.y) / 2).setRotation(ang)
          .setScale(dist / TWINE_CORD_W / MARBLE_RES, 1 / MARBLE_RES).setVisible(v.img.visible && partner.img.visible && dist < D * 6)
          .setAlpha(Math.min(v.img.alpha, partner.img.alpha)).setDepth(up ? DEPTH.raisedCord : DEPTH.cord);
      }
    });
  }

  /** The Hedgehog trundling up its line, nose towards the burrow, feet stepping. */
  private syncHedgehog(board: Board, time: number): void {
    const h = board.hedgehog;
    if (!h) {
      this.hedgehog?.destroy();
      this.hedgehog = null;
      return;
    }
    const path = board.lines[h.line]!.path;
    const s = Phaser.Math.Clamp(h.s, 0, path.length);
    const p = pointAt(path, s);
    const back = pointAt(path, Math.min(path.length, s + 8));
    this.hedgehog ??= this.scene.add.image(p.x, p.y, TEX.hedgehog(0, 0)).setScale(1 / HEDGEHOG_RES).setDepth(DEPTH.hedgehog);
    const step = Math.floor(time / STEP_MS) % 2;
    this.hedgehog.setTexture(TEX.hedgehog(step, Math.floor(time / 140) % BOIL)).setPosition(p.x, p.y).setRotation(Math.atan2(p.y - back.y, p.x - back.x));
  }

  /** Windfalls rolling across the board, rocking a little as they go (their shadow is painted on, so they don't spin). */
  private syncFruit(board: Board, time: number): void {
    const live = new Set<number>();
    for (const fr of board.fruits) {
      live.add(fr.id);
      let img = this.fruits.get(fr.id);
      if (!img) {
        img = this.scene.add.image(fr.x, fr.y, TEX.fruit(fr.kind, 0)).setScale(1 / FRUIT_RES).setDepth(6.5);
        this.fruits.set(fr.id, img);
      }
      img.setTexture(TEX.fruit(fr.kind, Math.floor(time / 150) % BOIL)).setPosition(fr.x, fr.y).setRotation(Math.sin(fr.x / 22) * 0.25);
    }
    for (const [id, img] of this.fruits) {
      if (live.has(id)) continue;
      img.destroy();
      this.fruits.delete(id);
    }
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
      else img.setTexture(s.wild ? TEX.geode(f) : TEX.marble(s.colour, f)).setPosition(s.x, s.y).setRotation(time / 60);
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
