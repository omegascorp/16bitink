import type { GameHost } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { trackGame } from '../host';
import { mapById } from '../level/maps';
import type { MapDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { endDay, startAdventure, type Adventure } from '../logic/adventure';
import { blotsFor, loadAdventure, loadProgress, recordWin, saveAdventure } from '../logic/save';

const KEY = 'session';

/**
 * The map in play, shared by the map, its HUD, the town, battles and cards.
 * Every change is saved at once (and today's start is kept, so a lost battle
 * can replay the day); listeners hear 'change'.
 */
export class Session extends Phaser.Events.EventEmitter {
  private startedAt = Date.now();

  private constructor(private readonly host: GameHost, readonly def: MapDef, private current: Adventure, private dayStart: Adventure) {
    super();
  }

  static get(scene: Phaser.Scene): Session {
    const s = scene.registry.get(KEY) as Session | undefined;
    if (!s) throw new Error('no map in play');
    return s;
  }

  /** The saved map in play, if any. */
  static resume(scene: Phaser.Scene, host: GameHost): Session | null {
    const saved = loadAdventure(host.storage, mapById);
    if (!saved || saved.current.status === 'won') return null;
    const def = mapById(saved.current.mapId)!;
    // Closed on the defeat card: come back to this morning, as "Replay the day" would.
    const current = saved.current.status === 'lost' ? saved.dayStart : saved.current;
    if (current.status !== 'playing') return null;
    const s = new Session(host, def, current, saved.dayStart);
    scene.registry.set(KEY, s);
    return s;
  }

  static begin(scene: Phaser.Scene, host: GameHost, def: MapDef): Session {
    const adv = startAdventure(def);
    const s = new Session(host, def, adv, adv);
    s.save();
    scene.registry.set(KEY, s);
    trackGame(scene, { type: 'level_start', level: def.id, n: def.n, name: def.name });
    return s;
  }

  get adv(): Adventure {
    return this.current;
  }

  set(adv: Adventure): void {
    const before = this.current.status;
    this.current = adv;
    this.save();
    this.emit('change', adv);
    if (before === 'playing' && adv.status === 'won') this.win();
  }

  endDay(): void {
    const next = endDay(this.current);
    this.dayStart = next;
    this.set(next);
  }

  /** Back to this morning (after a lost battle). */
  replayDay(): void {
    this.set(this.dayStart);
  }

  /** Leaves the map for good (the menu's "new map", or a loss accepted). */
  abandon(scene: Phaser.Scene, result: 'lose' | 'quit'): void {
    trackGame(scene, { type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result, seconds: this.seconds(), cause: result === 'lose' ? 'beaten' : undefined, progress: `day ${this.current.day}` });
    saveAdventure(this.host.storage, null);
    scene.registry.remove(KEY);
  }

  private win(): void {
    const blots = blotsFor(this.current.day, this.def.parDays, this.current.lostStacks);
    commitProgress(this.host, recordWin(loadProgress(this.host.storage), this.def.id, blots, this.current.day));
    this.host.track?.({ type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result: 'win', seconds: this.seconds(), score: blots, progress: `day ${this.current.day}` });
  }

  private seconds(): number {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  private save(): void {
    saveAdventure(this.host.storage, { current: this.current, dayStart: this.dayStart });
  }
}
