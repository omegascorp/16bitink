import Phaser from 'phaser';
import { farSound, landGain, LAND_MIN_VY } from '../../audio/hearing';
import { orePitch } from '../../audio/recipes';
import type { SoundBoard } from '../../audio/sound';
import type { Mine, MineEvent } from '../../logic/mine';
import { gradeOf, ringDelta, tileAt, type Grade } from '../../logic/terrain';

/** Seconds after a block gives during which landing on the next is part of digging, not a fall. */
const DIG_DROP_S = 0.6;

/**
 * The planet's sound: the ambience set to the planet and darkened by depth,
 * the sim's events (ore picked up, the bag full, the suit fed, hurt…) and
 * the changes that aren't events (the drill working, the jetpack's breath,
 * a landing). Quiets the jetpack whenever the world pauses or ends.
 */
export class MineSounds {
  private wasOnGround = true;
  private lastVy = 0;
  private wasJetting = false;
  /** The grade of the block the drill is in, for the crumble when it gives. */
  private grade: Grade | null = null;
  /** When (sim seconds) a block last gave: the short drop onto the next one after digging down isn't a landing worth a thud. */
  private drilledAt = -Infinity;

  constructor(scene: Phaser.Scene, private readonly sound: SoundBoard | undefined, mine: Mine) {
    this.wasOnGround = mine.player.onGround;
    sound?.setMood('planet');
    sound?.setDepth(mine.depth);
    const quiet = (): void => {
      this.wasJetting = false;
      sound?.hold('jet', false);
    };
    scene.events.on(Phaser.Scenes.Events.PAUSE, quiet);
    scene.events.on(Phaser.Scenes.Events.SLEEP, quiet);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      quiet();
      scene.events.off(Phaser.Scenes.Events.PAUSE, quiet);
      scene.events.off(Phaser.Scenes.Events.SLEEP, quiet);
    });
  }

  /** A sound for one of the sim's events (most have one; drawing the ground doesn't). */
  react(e: MineEvent, mine: Mine): void {
    const s = this.sound;
    if (!s) return;
    switch (e.kind) {
      case 'drilled':
        this.drilledAt = mine.time;
        return s.play((this.grade ?? 0) >= 1 ? 'crumbleHard' : 'crumbleSoft', { pitch: 0.9 + Math.random() * 0.2 });
      case 'ore': return s.play('ore', { pitch: orePitch(e.ore) });
      case 'tooHard':
      case 'flat':
      case 'noFuel':
      case 'cantFeed': return s.play('dull');
      case 'bagFull':
      case 'cargoFull': return s.play('full');
      case 'bank':
      case 'bankItem':
      case 'bagBack': return s.play('bank');
      case 'restock':
      case 'fed': return s.play('fed');
      case 'airLow': return s.play('airLow');
      case 'airOut': return s.play('airOut');
      case 'shielded': return s.play('shield');
      case 'hurt': return s.play('hurt');
      case 'lit': return s.play('fizz');
      case 'blast': return this.blast(e.blast.at, mine);
      case 'item':
      case 'salvage': return s.play('find');
      case 'recall': return s.play('winch');
      case 'failed': return s.play('failed');
      default: return;
    }
  }

  /** Sounds for what changed since last frame, and the depth for the ambience. Call once a frame, after the sim's events. */
  listen(mine: Mine, still: boolean): void {
    const s = this.sound;
    if (!s) return;
    const p = mine.player;
    s.setDepth(mine.depth);
    const jetting = !still && mine.jetting;
    if (jetting && !this.wasJetting) s.play('jetStart');
    s.hold('jet', jetting);
    this.wasJetting = jetting;
    if (!this.wasOnGround && p.onGround && this.lastVy >= LAND_MIN_VY && mine.time - this.drilledAt > DIG_DROP_S) s.play('land', { gain: landGain(this.lastVy) });
    this.wasOnGround = p.onGround;
    this.lastVy = p.vy;
    const d = still ? null : mine.drilling;
    if (!d) return;
    this.grade = gradeOf(tileAt(mine.terrain, d.tile[0], d.tile[1]));
    s.play((this.grade ?? 0) >= 1 ? 'grindHard' : 'grindSoft', { pitch: 0.9 + Math.random() * 0.2, gain: 0.75 + Math.random() * 0.25 });
  }

  /** A blast, fainter the further off it went, panned to its side. */
  private blast(at: readonly [number, number], mine: Mine): void {
    const p = mine.player;
    const T = mine.tile;
    const dx = ringDelta(mine.terrain, p.x + p.w / 2, (at[0] + 0.5) * T, T) / T;
    const dy = (at[1] + 0.5) - (p.y + p.h / 2) / T;
    const { gain, pan } = farSound(dx, dy);
    this.sound?.play('blast', { gain, pan });
  }
}
