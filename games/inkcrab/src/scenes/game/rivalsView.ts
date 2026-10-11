import { shellFit } from '../../art/shellFit';
import Phaser from 'phaser';
import { drawCrabBack, drawCrabFront, RIVAL_COLORS } from '../../art/crabArt';
import { FOOT, FRAME, GROUND, SHELL_MID, SHELL_UNITS } from '../../art/frame';
import { makeDraw } from '../../art/kit';
import { crabShift } from '../../art/mouth';
import { BLUE_HEX, BOIL } from '../../art/palette';
import { makeCanvas } from '../../art/pen';
import { PUFF, TEX } from '../../art/textures';
import type { Critter } from '../../logic/critters';
import { centre, type Item } from '../../logic/items';
import { isRival, RIVAL } from '../../logic/rivals';
import { bodyFill, shellPx, type Shell } from '../../logic/shells';
import { swapProgress } from '../../logic/swap';
import type { ChainStep } from '../../logic/vacancy';

/** Just behind the player, in front of the other creatures. */
const DEPTH = 4.2;
/** Moving house, in front of the player: the shell it takes is often the one the player has just left at its feet. */
const MOVING_DEPTH = 5.5;
const FOOT_FROM_MIDDLE = FOOT.x - SHELL_MID;
const NAKED_SCALE = 0.95;
const WALK_FPS = 9;
const BOIL_MS = 260;
/**
 * Moving house, as shares of the move: backing out of the old shell until
 * OUT, scuttling across bare until IN, then a puff of sand as it backs into
 * the new one, settling in after.
 */
const MOVE = { out: 0.25, in: 0.72, puff: 0.08 } as const;
/** The hand-down arrow: dash and gap (px), and how high its arc rises for each px across. */
const ARROW = { dash: 4, gap: 3, rise: 0.25, head: 5 } as const;

const KEY = {
  back: (naked: boolean, f: number) => `rival-${naked ? 'naked-tail-' : ''}back-${f}`,
  front: (naked: boolean, f: number) => `rival-${naked ? 'naked-' : ''}front-${f}`,
} as const;

/** A crab drawn in three layers (legs and claw behind its shell, head and big claw in front), standing on its root's origin. */
interface Rig {
  readonly root: Phaser.GameObjects.Container;
  readonly back: Phaser.GameObjects.Image;
  readonly shell: Phaser.GameObjects.Image;
  readonly front: Phaser.GameObjects.Image;
}

interface RivalSprites extends Rig {
  /** Moving house: the crab out of its shell and on its way, then in the new one. */
  readonly mover: Rig;
  readonly puff: Phaser.GameObjects.Image;
}

/** The rival's own drawings: the player's crab in purple-pincher colours, in blue ink (it's never a danger); out of a shell, with its soft tail. */
function bakeRivals(scene: Phaser.Scene): void {
  for (let f = 0; f < BOIL; f++) {
    for (const naked of [false, true]) {
      const bake = (key: string, seed: number, draw: (d: ReturnType<typeof makeDraw>) => void): void => {
        if (scene.textures.exists(key)) return;
        const { canvas, ctx } = makeCanvas(FRAME, FRAME);
        ctx.translate(FRAME / 2, FRAME / 2);
        draw(makeDraw(ctx, seed, f, GROUND));
        scene.textures.addCanvas(key, canvas);
      };
      bake(KEY.back(naked, f), 140 + f, (d) => drawCrabBack(d, naked, RIVAL_COLORS, naked));
      bake(KEY.front(naked, f), 150 + f, (d) => drawCrabFront(d, naked, RIVAL_COLORS));
    }
  }
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/**
 * Rival hermit crabs, drawn as the player is (legs and claw behind the
 * shell, head and big claw in front) but purple. Tucked in, only the shell
 * shows; out of a shell, its soft body does.
 *
 * Moving house is played out so a vacancy chain reads link by link: the
 * crab backs out of its shell, scuttles across bare, soft tail and all, and
 * backs into the new one under a puff of sand, leaving its old shell lying
 * empty for the next in line. A dashed pencil arrow runs from each crab in
 * a chain to the shell it's going for.
 */
export class RivalsView {
  private readonly sprites = new Map<number, RivalSprites>();
  private readonly arrows: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    bakeRivals(scene);
    this.arrows = scene.add.graphics().setDepth(DEPTH + 0.1);
  }

  /** `items`: the loose shells they move into; `plans`: where each rival in a chain or line is going (see vacancy.ts). */
  sync(critters: ReadonlyMap<number, Critter>, items: ReadonlyMap<number, Item>, plans: Iterable<readonly [number, ChainStep]>, time: number): void {
    for (const [id, s] of this.sprites) {
      if (critters.has(id)) continue;
      for (const o of [s.root, s.mover.root, s.puff]) o.destroy();
      this.sprites.delete(id);
    }
    for (const k of critters.values()) {
      if (!isRival(k)) continue;
      const s = this.sprites.get(k.id) ?? this.create(k.id);
      const walking = Math.abs(k.vx) > 1 && k.onGround;
      const f = Math.floor(time / (walking ? 1000 / WALK_FPS : BOIL_MS) + k.id) % BOIL;
      const target = k.swap ? items.get(k.swap.itemId) : undefined;
      if (k.swap && target?.kind.type === 'shell') {
        this.drawMove(s, k, target, target.kind.shell, swapProgress(k.swap, RIVAL.swap), time);
        continue;
      }
      s.mover.root.setVisible(false);
      s.puff.setVisible(false);
      s.root.setDepth(DEPTH);
      this.drawCrab(s, k.x + k.w / 2, k.y + k.h, k.dir, k.shell ?? null, k.size, f, !k.tucked);
    }
    this.drawArrows(critters, plans);
  }

  /** A crab in `shell` (or out of one), its shell's middle at x, standing on `bottom`, facing `dir`. */
  private drawCrab(rig: Rig, x: number, bottom: number, dir: 1 | -1, shell: Shell | null, size: number, f: number, showBody: boolean, settle = 1): void {
    const unit = shellPx(shell ? shell.size : size) / SHELL_UNITS;
    const body = (shell ? unit * bodyFill(shell, size) : (shellPx(size) / SHELL_UNITS) * NAKED_SCALE) * settle;
    // The shell's drawing, scaled to look its size whatever its kind (see shellFit.ts).
    const drawn = shell ? unit * shellFit(shell.kind) : unit;
    rig.root.setVisible(true).setPosition(x + dir * FOOT_FROM_MIDDLE * drawn, bottom).setScale(dir, 1);
    const naked = !shell;
    const shift = shell ? crabShift(shell.kind, drawn, body) : 0;
    rig.shell.setVisible(!naked).setOrigin(FOOT.x / FRAME, FOOT.y / FRAME).setPosition(0, 0);
    if (shell) rig.shell.setTexture(TEX.shell(shell.kind, f)).setScale(drawn);
    for (const [img, key] of [[rig.back, KEY.back(naked, f)], [rig.front, KEY.front(naked, f)]] as const) {
      img.setTexture(key).setScale(body).setX(shift).setVisible(showBody);
    }
  }

  /**
   * One moment of moving house, `p` of the way: the old shell stays where
   * the crab stood (empty once it's out); the crab comes out of its mouth,
   * crosses to the new shell and backs in under a puff; the new shell lies
   * where it is until then (the items view leaves it to this).
   */
  private drawMove(s: RivalSprites, k: Critter, target: Item, to: Shell, p: number, time: number): void {
    const f = Math.floor(time / BOIL_MS + k.id) % BOIL;
    const from = k.shell ?? null;
    const x0 = k.x + k.w / 2;
    const x1 = centre(target).x;
    const dir: 1 | -1 = x1 >= x0 ? 1 : -1;
    const bottom0 = k.y + k.h;
    const bottom1 = target.y + target.h;
    // The old shell, its crab coming out of it, then lying empty.
    if (from) this.drawCrab(s, x0, bottom0, k.dir, from, k.size, f, false);
    else s.root.setVisible(false);
    const unit0 = (shellPx(from ? from.size : k.size) / SHELL_UNITS) * (from ? shellFit(from.kind) : 1);
    const toUnit = (shellPx(to.size) / SHELL_UNITS) * shellFit(to.kind);
    const m = s.mover;
    m.root.setDepth(MOVING_DEPTH);
    s.root.setDepth(MOVING_DEPTH - 0.01);
    if (p < MOVE.in) {
      // Bare, out of the old mouth and across; the new shell still lies on the sand.
      const u = Math.max(0, (p - MOVE.out) / (MOVE.in - MOVE.out));
      const emerging = Math.min(1, p / MOVE.out);
      // From its old mouth to the new one: drawCrab sets the crab at x plus its mouth offset.
      const start = x0 + k.dir * FOOT_FROM_MIDDLE * unit0;
      const end = x1 - 2 * dir * FOOT_FROM_MIDDLE * toUnit;
      const stepF = u > 0 ? Math.floor(time / (1000 / WALK_FPS) + k.id) % BOIL : f;
      this.drawCrab(m, lerp(start, end, u), lerp(bottom0, bottom1, u), u > 0 ? dir : k.dir, null, k.size, stepF, true, 0.55 + 0.45 * emerging);
      m.shell.setVisible(true);
      // The new shell is drawn where it lies, as the items view draws it.
      this.lying(m, x1, bottom1, to, f);
    } else {
      const settle = Math.min(1, (p - MOVE.in) / (1 - MOVE.in));
      this.drawCrab(m, x1, bottom1, dir, to, k.size, f, Math.abs(p - MOVE.in) > MOVE.puff / 2, 0.6 + 0.4 * settle);
    }
    const puff = Math.max(0, 1 - Math.abs(p - MOVE.in) / MOVE.puff);
    const size = (Math.max(unit0, toUnit) * SHELL_UNITS * 0.75) / PUFF;
    s.puff.setVisible(puff > 0).setTexture(TEX.puff(f)).setPosition(x1, bottom1 - size * PUFF * 0.3).setScale(size * (0.6 + 0.4 * puff)).setAlpha(puff);
  }

  /** The mover's shell image as a loose shell lying on the sand: unflipped, its middle at x (the mover's crab is drawn apart from it). */
  private lying(m: Rig, x: number, bottom: number, shell: Shell, f: number): void {
    const unit = (shellPx(shell.size) / SHELL_UNITS) * shellFit(shell.kind);
    // Undo the rig's own placement so the shell sits where the item lies.
    const rx = m.root.x;
    const flip = m.root.scaleX;
    m.shell.setTexture(TEX.shell(shell.kind, f)).setScale(unit * flip, unit).setOrigin(SHELL_MID / FRAME, FOOT.y / FRAME).setPosition((x - rx) * flip, bottom - m.root.y);
  }

  /** A dashed pencil arc from each crab in a chain to the shell it's on its way to take. */
  private drawArrows(critters: ReadonlyMap<number, Critter>, plans: Iterable<readonly [number, ChainStep]>): void {
    const g = this.arrows.clear();
    g.lineStyle(1.3, BLUE_HEX, 0.7);
    for (const [id, step] of plans) {
      const k = critters.get(id);
      if (!k || !step.take || k.swap) continue;
      const a = { x: k.x + k.w / 2, y: k.y - 2 };
      const b = centre(step.take);
      const across = Math.abs(b.x - a.x);
      if (across < 6) continue;
      const top = Math.min(a.y, b.y - step.take.h) - across * ARROW.rise;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2((a.x + b.x) / 2, top), new Phaser.Math.Vector2(b.x, b.y - step.take.h));
      const length = curve.getLength();
      for (let d = 0; d < length - ARROW.head; d += ARROW.dash + ARROW.gap) {
        const p = curve.getPointAt(d / length);
        const q = curve.getPointAt(Math.min(1, (d + ARROW.dash) / length));
        g.lineBetween(p.x, p.y, q.x, q.y);
      }
      const tip = curve.getPointAt(1);
      const back = curve.getPointAt(Math.max(0, 1 - ARROW.head * 1.5 / length));
      const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
      for (const side of [0.5, -0.5]) g.lineBetween(tip.x, tip.y, tip.x - Math.cos(ang + side) * ARROW.head, tip.y - Math.sin(ang + side) * ARROW.head);
    }
  }

  private rig(): Rig {
    const ox = FOOT.x / FRAME;
    const oy = FOOT.y / FRAME;
    const back = this.scene.add.image(0, 0, KEY.back(false, 0)).setOrigin(ox, oy);
    const shell = this.scene.add.image(0, 0, TEX.shell('periwinkle', 0)).setOrigin(ox, oy);
    const front = this.scene.add.image(0, 0, KEY.front(false, 0)).setOrigin(ox, oy);
    const root = this.scene.add.container(0, 0, [back, shell, front]).setDepth(DEPTH);
    return { root, back, shell, front };
  }

  private create(id: number): RivalSprites {
    const own = this.rig();
    const mover = this.rig();
    mover.root.setVisible(false);
    const puff = this.scene.add.image(0, 0, TEX.puff(0)).setVisible(false).setDepth(MOVING_DEPTH + 0.05);
    const s = { ...own, mover, puff };
    this.sprites.set(id, s);
    return s;
  }
}
