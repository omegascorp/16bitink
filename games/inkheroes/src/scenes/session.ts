import type { GameEvent, GameHost } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { trackGame } from '../host';
import { chapterOf, CHAPTERS, nextMap, partsOf, type ChapterDef } from '../level/maps';
import type { MapDef } from '../level/types';
import { commitProgress } from '../logic/accountSave';
import { progressNote } from '../logic/runNote';
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
  /**
   * When this Session began. A resumed game (Continue) builds a fresh Session,
   * so `seconds` is the time spent in this sitting, not since the part opened:
   * the site sums a player's sittings per level.
   */
  private startedAt = Date.now();
  /** The scene that opened this session, so events go through trackGame. */
  private scene: Phaser.Scene | null = null;
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

  /** Chapter `chapter`'s saved game, read but not taken up: the part in play and its day (a part left won shows the next), or null with none to continue. */
  static look(host: GameHost, chapter: ChapterDef = CHAPTERS[0]!): { def: MapDef; day: number } | null {
    const saved = loadAdventure(host.storage, inChapter(chapter), chapter.slot);
    if (!saved) return null;
    const def = inChapter(chapter)(saved.current.mapId)!;
    if (saved.current.status === 'won') {
      const next = nextMap(def);
      return next ? { def: next, day: saved.current.day } : null;
    }
    const current = saved.current.status === 'lost' ? saved.dayStart : saved.current;
    return current.status === 'playing' ? { def, day: current.day } : null;
  }

  /** Throws chapter `chapter`'s saved game away (the menu's "start over"). */
  static discard(host: GameHost, chapter: ChapterDef): void {
    saveAdventure(host.storage, null, chapter.slot);
  }

  /** The saved map in play in chapter `chapter`, if any (a part left on its victory card rides on into the next). */
  static resume(scene: Phaser.Scene, host: GameHost, chapter: ChapterDef = CHAPTERS[0]!): Session | null {
    const saved = loadAdventure(host.storage, inChapter(chapter), chapter.slot);
    if (!saved) return null;
    const def = inChapter(chapter)(saved.current.mapId)!;
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
    s.scene = scene;
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
    s.scene = scene;
    s.save();
    scene.registry.set(KEY, s);
    trackGame(scene, { type: 'level_start', level: def.id, n: def.n, name: def.name });
    return s;
  }

  /** The chapter this map is part of (its game is saved in the chapter's own slot). */
  get chapter(): ChapterDef {
    const c = chapterOf(this.def);
    if (!c) throw new Error(`map ${this.def.id} is in no chapter`);
    return c;
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
    const r = rivalTurn(endDay(this.current, this.def), this.def);
    this.dayStart = r.adv;
    this.set(r.adv);
    this.send({ type: 'level_progress', level: this.def.id, n: this.def.n, name: this.def.name, seconds: this.seconds(), progress: progressNote(r.adv) });
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
    saveAdventure(this.host.storage, null, this.chapter.slot);
    scene.registry.remove(KEY);
  }

  /** Leaves a lost day for the menu: the game is kept, and Continue comes back to this morning. */
  leaveLost(scene: Phaser.Scene): void {
    this.track(scene, 'lose');
    scene.registry.remove(KEY);
  }

  private track(scene: Phaser.Scene, result: 'lose' | 'quit'): void {
    this.send({ type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result, seconds: this.seconds(), cause: result === 'lose' ? 'beaten' : undefined, progress: progressNote(this.current) });
  }

  private win(): void {
    const days = partDays(this.current);
    const blots = blotsFor(days, this.def.parDays, this.current.lostStacks);
    commitProgress(this.host, recordWin(loadProgress(this.host.storage), this.def.id, blots, days));
    this.send({ type: 'level_end', level: this.def.id, n: this.def.n, name: this.def.name, result: 'win', seconds: this.seconds(), score: blots, progress: progressNote(this.current) });
  }

  /** Through trackGame, so a stat can never break the game. */
  private send(event: GameEvent): void {
    if (this.scene) trackGame(this.scene, event);
  }

  private seconds(): number {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  private save(): void {
    saveAdventure(this.host.storage, { current: this.current, dayStart: this.dayStart, partStart: this.partStart }, this.chapter.slot);
  }
}

/** Finds a map among chapter `c`'s loaded parts only, so one chapter's save never opens another's map. */
const inChapter = (c: ChapterDef) => (id: string): MapDef | undefined => partsOf(c).find((m) => m.id === id);
