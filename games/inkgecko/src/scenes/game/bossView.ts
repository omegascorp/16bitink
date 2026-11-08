import Phaser from 'phaser';
import { BOSS_ART } from '../../art/bosses';
import { BOIL } from '../../art/palette';
import { bakeBoss, TEX } from '../../art/textures';
import type { Board } from '../../logic/board';
import { bossPose, type Boss } from '../../logic/boss';
import { colourHex } from '../../logic/colours';

/** Bosses on the ground are drawn over the marbles; birds in flight over everything but the night; the owl's eyes over the night too. */
const DEPTH = { ground: 6.3, sleeve: 6.25, flying: 7.2, eyes: 7.6 } as const;
/** How long a hit flashes, and the beaten boss takes to flee, ms. */
const FLEE_MS = 900;
/** A hit tints the boss this warm red for a blink. */
const HURT_TINT = 0xffb0a0;

/**
 * The chapter's boss on the board: its painted pose turned the way it
 * faces, a flash when hit, the scarecrow's sleeves, the chameleon's
 * colour, the owl's eyes shining through the dark, and its flight once
 * beaten.
 */
export class BossView {
  private readonly body: Phaser.GameObjects.Image;
  /** The chameleon's ink over its tinted skin. */
  private readonly lines: Phaser.GameObjects.Image | null;
  private readonly sleeves: Phaser.GameObjects.Image[];
  private readonly eyes: Phaser.GameObjects.Image | null;
  private readonly scale: number;
  private fled = false;

  constructor(private readonly scene: Phaser.Scene, private readonly boss: Boss) {
    bakeBoss(scene, boss.kind);
    const art = BOSS_ART[boss.kind];
    this.scale = 1 / art.res;
    const first = art.poses[0]!;
    this.body = scene.add.image(boss.x, boss.y, TEX.boss(boss.kind, first, 0)).setScale(this.scale).setDepth(DEPTH.ground);
    this.lines = boss.kind === 'chameleon' ? scene.add.image(boss.x, boss.y, TEX.boss(boss.kind, 'walk0-lines', 0)).setScale(this.scale).setDepth(DEPTH.ground + 0.01) : null;
    this.sleeves = boss.kind === 'scarecrow' ? [0, 1].map(() => scene.add.image(boss.x, boss.y, TEX.boss(boss.kind, 'sleeve', 0)).setScale(this.scale).setDepth(DEPTH.sleeve)) : [];
    this.eyes = boss.kind === 'owl' ? scene.add.image(boss.x, boss.y, TEX.boss(boss.kind, 'eyes', 0)).setScale(this.scale).setDepth(DEPTH.eyes) : null;
  }

  update(board: Board, time: number): void {
    const b = this.boss;
    if (this.fled) return;
    if (b.beaten) {
      this.flee();
      return;
    }
    const f = Math.floor(time / 150) % BOIL;
    const pose = bossPose(b, time);
    const hidden = b.kind === 'mole' && b.phase === 'down';
    const flying = (b.kind === 'magpie' || b.kind === 'owl') && b.phase === 'fly';
    // The scarecrow's hat and shoulders turn with its sleeves; the rest face their way.
    const rot = b.kind === 'scarecrow' ? b.sleeves : b.angle;
    const punch = b.hurt > 0 ? 1 + Math.sin((b.hurt / 0.45) * Math.PI) * 0.12 : 1;
    const key = b.kind === 'chameleon' ? `${pose}-skin` : pose;
    this.body.setTexture(TEX.boss(b.kind, key, f)).setPosition(b.x, b.y).setRotation(rot).setScale(this.scale * punch)
      .setVisible(!hidden).setDepth(flying ? DEPTH.flying : DEPTH.ground);
    if (b.kind === 'chameleon') this.body.setTint(colourHex(b.colour));
    else if (b.hurt > 0) this.body.setTint(HURT_TINT);
    else this.body.clearTint();
    this.lines?.setTexture(TEX.boss(b.kind, `${pose}-lines`, f)).setPosition(b.x, b.y).setRotation(rot).setScale(this.scale * punch);
    this.sleeves.forEach((s, i) => s.setTexture(TEX.boss(b.kind, 'sleeve', f)).setPosition(b.x, b.y).setRotation(b.sleeves + i * Math.PI));
    // The owl's eyes shine through the night wherever it is (shut while it's hurt).
    this.eyes?.setTexture(TEX.boss(b.kind, 'eyes', f)).setPosition(b.x, b.y).setRotation(rot).setVisible(b.hurt <= 0 && board.level.dark === true);
  }

  /** Beaten: it rears up and makes off, fading as it goes. */
  private flee(): void {
    this.fled = true;
    const b = this.boss;
    const parts = [this.body, this.lines, ...this.sleeves, this.eyes].filter((o): o is Phaser.GameObjects.Image => o !== null);
    for (const p of parts) {
      p.setVisible(true);
      this.scene.tweens.add({
        targets: p, scale: this.scale * 1.35, alpha: 0, angle: p.angle + (b.kind === 'scarecrow' ? 200 : 25),
        x: b.x + Math.cos(b.angle) * 60, y: b.y + Math.sin(b.angle) * 60 - 30, duration: FLEE_MS, ease: 'Quad.In',
        onComplete: () => p.destroy(),
      });
    }
  }
}
