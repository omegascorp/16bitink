import Phaser from 'phaser';
import { spatial, type SfxId } from '../../audio/recipes';
import { ClipRecorder } from '../../clips/recorder';
import type { ClipFile, ClipJob } from '../../clips/types';
import { clipCard, type CardInput } from '../../logic/clips/card';
import { initialCloseCall, trackCloseCall, type CloseCallState } from '../../logic/clips/closeCalls';
import type { MomentKind } from '../../logic/clips/moments';
import { relationTo } from '../../logic/sizing';
import type { Fish } from './fish';
import type { Player } from './player';

/**
 * Everything the level does for its shareable clip, behind a few calls from
 * GameScene: the recording (see clips/recorder), noting moments and sounds,
 * spotting close calls, and, once the level ends, making the clip.
 */
export class ClipDirector {
  private readonly recorder: ClipRecorder;
  private close: CloseCallState = initialCloseCall;
  private lives: number | null = null;
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene, focus: () => { readonly x: number; readonly y: number }) {
    this.recorder = new ClipRecorder(scene, focus);
  }

  mark(kind: MomentKind, weight?: number): void {
    this.recorder.mark(kind, weight);
  }

  /** A sound effect played, placed the way the player heard it. */
  sound(id: SfxId, at: { readonly x: number; readonly y: number } | undefined, pitch: number, gain: number): void {
    const place = at ? spatial(at, this.scene.cameras.main.worldView) : { pan: 0, gain: 1 };
    if (place.gain * gain > 0.02) this.recorder.sound(id, pitch, place.gain * gain, place.pan);
  }

  /** Once a frame while the level is on: hunters closing in, and getting away from them. */
  watch(player: Player, fish: readonly Fish[], lives: number): void {
    const hurt = this.lives !== null && lives < this.lives;
    this.lives = lives;
    const p = player.sprite;
    let gap: number | null = null;
    for (const f of fish) {
      if ((f.state !== 'chase' && f.state !== 'lunge') || relationTo(player.size, f.size) !== 'predator') continue;
      const g = Phaser.Math.Distance.Between(p.x, p.y, f.sprite.x, f.sprite.y) - (player.size + f.size);
      if (gap === null || g < gap) gap = g;
    }
    const step = trackCloseCall(this.close, this.recorder.clock(), gap, hurt);
    this.close = step.state;
    if (step.escapedAt !== null) this.recorder.mark('escape', undefined, step.escapedAt);
  }

  /** The level was just decided. */
  end(): void {
    this.recorder.end();
  }

  /** Stops recording and makes the clip in the background; the result screen shows it when ready. */
  finish(input: CardInput, name: string): ClipJob {
    const controller = new AbortController();
    const make = async (): Promise<ClipFile | null> => {
      const run = await this.recorder.finish();
      if (!run || controller.signal.aborted) return null;
      try {
        // Loaded on first use: the video muxer isn't needed to play.
        const { composeClip } = await import('../../clips/compose');
        return await composeClip(run, clipCard(input), input.kind === 'win', name, controller.signal);
      } finally {
        run.chunks.clear();
      }
    };
    const result = make().catch((err: unknown) => {
      // Leaving the level while the clip is made stops it on purpose.
      const quit = controller.signal.aborted || this.destroyed;
      if (!quit) console.warn('[inkfish] could not make the clip', err);
      return null;
    });
    return { result, cancel: () => controller.abort() };
  }

  destroy(): void {
    this.destroyed = true;
    this.recorder.destroy();
  }
}
