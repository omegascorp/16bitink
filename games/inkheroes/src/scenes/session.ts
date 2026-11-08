import type { GameHost } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { trackGame } from '../host';
import { mapById, nextMap } from '../level/maps';
import type { MapDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { endDay, startAdventure, type Adventure } from '../logic/adventure';
import { openLand, partDays, rideOn } from '../logic/chapter';
import { rivalTurn, type RivalReport } from '../logic/rival';
import { blotsFor, loadAdventure, loadProgress, recordWin, saveAdventure } from '../logic/save';

const KEY = 'session';

/**
 * The map in play, shared by the map, its HUD, the town, battles and cards.
 * Every change is saved at once (and today's start is kept, so a lost battle
 * can replay the day); listeners hear 'change'.
 */
export class Session extends Phaser.Events.EventEmitter {
  private startedAt = Date.now();
  /** A part just opened: the map has its way to show. */
  private wayToShow = false;

  private constructor(private readonly host: GameHost, readonly def: MapDef, private current: Adventure, private dayStart: Adventure, private readonly partStart: Adventure) {
    super();
  }

  static get(scene: Phaser.Scene): Session {
    const s = scene.registry.get(KEY) as Session | undefined;
    if (!s) throw new Error('no map in play');
    return s;
  }

  /** The map in play, or null with none (on the menu). */
  static peek(scene: Phaser.Scene): Session | null {
    return (scene.registry.get(KEY) as Session | undefined) ?? null;
  }

  /** The saved map in play, if any (a part left on its victory card rides on into the next). */
  static resume(scene: Phaser.Scene, host: GameHost): Session | null {
    const saved = loadAdventure(host.storage, mapById);
    if (!saved) return null;
    const def = mapById(saved.current.mapId)!;
    if (saved.current.status === 'won') {
      const next = nextMap(def);
      return next ? Session.open(scene, host, next, rideOn(saved.current, def, next), true) : null;
    }
    // Closed on the defeat card: come back to this morning, as "Replay the day" would.
    const current = saved.current.status === 'lost' ? saved.dayStart : saved.current;
    if (current.status !== 'playing') return null;
    // A game saved before its part's way was shown sees it now.
    const lit = openLand(current, def);
    const s = new Session(host, def, lit, openLand(saved.dayStart, def), openLand(saved.partStart ?? saved.dayStart, def));
    s.wayToShow = lit.explored !== current.explored;
    scene.registry.set(KEY, s);
    return s;
  }

  static begin(scene: Phaser.Scene, host: GameHost, def: MapDef): Session {
    return Session.open(scene, host, def, startAdventure(def));
  }

  /** The chapter rides on from this part, won, into the next: the same land, opened further, with all that was won. */
  rideOn(scene: Phaser.Scene): Session | null {
    const next = nextMap(this.def);
    return next && this.current.status === 'won' ? Session.open(scene, this.host, next, rideOn(this.current, this.def, next), true) : null;
  }

  private static open(scene: Phaser.Scene, host: GameHost, def: MapDef, adv: Adventure, opened = false): Session {
    const s = new Session(host, def, adv, adv, adv);
    s.wayToShow = opened;
    s.save();
    scene.registry.set(KEY, s);
    trackGame(scene, { type: 'level_start', level: def.id, n: def.n, name: def.name });
    return s;
  }

  get adv(): Adventure {
    return this.current;
  }

  /** The way the part just opened, for the map to show once. */
  takeOpening(): MapDef['opening'] {
    const show = this.wayToShow;
    this.wayToShow = false;
    return show ? this.def.opening : undefined;
  }

  set(adv: Adventure): void {
    const before = this.current.status;
    this.current = adv;
    this.save();
    this.emit('change', adv);
    if (before === 'playing' && adv.status === 'won') this.win();
  }

  /** The night: the day ends, then the rival lord rides (his news and any fight he starts wait on the cards). */
  endDay(): RivalReport {
    const r = rivalTurn(endDay(this.current), this.def);
    this.dayStart = r.adv;
    this.set(r.adv);
    return r.report;
  }

  /** Back to the day this part of the chapter began. */
  restartPart(): void {
    this.dayStart = this.partStart;
    this.set(this.partStart);
  }

  /** Back to this morning (after a lost battle). */
  replayDay(): void {
    this.set(this.dayStart);
  }

  /** Leaves the chapter for good (the menu's "start over"). */
  abandon(scene: Phaser.Scene): void {
    this.track(scene, 'quit');
    saveAdventure(this.host.storage, null);
    scene.registry.remove(KEY);
  }

  /** Leaves a lost day for the menu: the game is kept, and Continue comes back to this morning. */
  leaveLost(scene: Phaser.Scene): void {
    this.track(scene, 'lose');
    scene.registry.remove(KEY);
  }

  private track(scene: Phaser.Scene, result: 'lose' | 'quit'): void {
    trackGame(scene, { type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result, seconds: this.seconds(), cause: result === 'lose' ? 'beaten' : undefined, progress: `day ${this.current.day}` });
  }

  private win(): void {
    const days = partDays(this.current);
    const blots = blotsFor(days, this.def.parDays, this.current.lostStacks);
    commitProgress(this.host, recordWin(loadProgress(this.host.storage), this.def.id, blots, days));
    this.host.track?.({ type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result: 'win', seconds: this.seconds(), score: blots, progress: `day ${this.current.day}` });
  }

  private seconds(): number {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  private save(): void {
    saveAdventure(this.host.storage, { current: this.current, dayStart: this.dayStart, partStart: this.partStart });
  }
}
