import type Phaser from 'phaser';
import { loadSave, markSeen, persistSave, type KeyValueStore } from '../../logic/save';

/** How often to look around for new creatures, ms. */
const LOOK_EVERY_MS = 300;

/**
 * Creatures you've met this level: anything that swims or flies into view
 * unlocks its page in the fish guide. Written to the save when the level ends
 * or you leave it.
 */
export class Sightings {
  private readonly fresh = new Set<string>();
  private nextLook = 0;

  constructor(private readonly store: KeyValueStore | undefined, first: readonly string[]) {
    for (const id of first) this.fresh.add(id);
  }

  look(now: number, view: Phaser.Geom.Rectangle, things: Iterable<{ readonly x: number; readonly y: number; readonly id: string }>): void {
    if (now < this.nextLook) return;
    this.nextLook = now + LOOK_EVERY_MS;
    for (const t of things) if (view.contains(t.x, t.y)) this.fresh.add(t.id);
  }

  save(): void {
    if (this.fresh.size === 0) return;
    persistSave(this.store, markSeen(loadSave(this.store), this.fresh));
    this.fresh.clear();
  }
}
