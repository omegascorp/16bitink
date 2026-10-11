import type Phaser from 'phaser';
import type { KeyValueStore } from '@16bitink/game-sdk';
import { shellSeenId } from '../../guide/catalog';
import type { Beach } from '../../logic/sim';
import { loadProgress, markSeen, saveProgress } from '../../logic/save';

/** How often to look around for new creatures and shells, ms. */
const LOOK_EVERY_MS = 300;

/**
 * What you've met this level, for the field guide: any creature or bird in
 * view, and any shell you can see (lying uncovered, worn by a rival, or your
 * own). Written to the save when the level ends or you leave it.
 */
export class Sightings {
  private readonly fresh = new Set<string>();
  private nextLook = 0;

  constructor(private readonly store: KeyValueStore | undefined, first: readonly string[]) {
    for (const id of first) this.fresh.add(id);
  }

  look(now: number, view: Phaser.Geom.Rectangle, beach: Beach): void {
    if (now < this.nextLook) return;
    this.nextLook = now + LOOK_EVERY_MS;
    const inView = (b: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }): boolean =>
      view.contains(b.x + b.w / 2, b.y + b.h / 2);
    for (const k of beach.critters.values()) {
      if (!inView(k)) continue;
      this.fresh.add(k.species);
      if (k.shell) this.fresh.add(shellSeenId(k.shell.kind));
    }
    for (const b of beach.birds.values()) if (inView(b)) this.fresh.add(b.species);
    for (const item of beach.items.values()) {
      if (item.kind.type === 'shell' && !item.buried && inView(item)) this.fresh.add(shellSeenId(item.kind.shell.kind));
    }
    if (beach.crab.shell) this.fresh.add(shellSeenId(beach.crab.shell.kind));
  }

  save(): void {
    if (this.fresh.size === 0) return;
    const progress = loadProgress(this.store);
    const next = markSeen(progress, this.fresh);
    if (next !== progress) saveProgress(this.store, next);
    this.fresh.clear();
  }
}
