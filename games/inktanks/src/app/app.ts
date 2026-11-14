import type { GameEvent, GameHost, OfferPlace } from '@16bitink/game-sdk';
import { hasLevel, installPaidLevels, levelFor } from '../content/levels';
import { chapterOf, CHAPTERS, FREE_LEVELS, gate, type GateContext } from '../logic/campaign';
import { Match } from '../logic/match/match';
import { matchReport, type MatchReport } from '../logic/match/report';
import { applyOutcome } from '../logic/mission/outcome';
import { perksOf } from '../logic/rank';
import { parseSave, SAVE_KEY, serializeSave, type SaveData } from '../logic/save';
import type { Progress } from '../logic/workshop';
import { showBriefing } from '../ui/briefing';
import { showBoot, showCard } from '../ui/cards';
import { clear } from '../ui/dom';
import { showMap } from '../ui/mapScreen';
import { showMenu } from '../ui/menu';
import { showResults, type ResultsData } from '../ui/results';
import { showWorkshop } from '../ui/workshop';
import { MissionRun } from './missionRun';
import { Stage } from './stage';

/**
 * The whole game: boot → menu → chapter map → briefing → mission →
 * results → map, with the workshop between missions. Progress is saved
 * through host.storage after every change; paid levels come from the host.
 */
export class App {
  private readonly root: HTMLElement;
  private readonly screen: HTMLElement;
  private readonly card: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly surface: HTMLElement;
  private readonly stage: Stage;
  private save: SaveData;
  private note: string | null;
  private paidError: string | null = null;
  private run: MissionRun | null = null;
  private leaveScreen: (() => void) | null = null;
  private seq = 0;
  private bootDone!: () => void;
  /** Resolves once the menu is drawn over the loaded map. */
  readonly ready = new Promise<void>((resolve) => {
    this.bootDone = resolve;
  });

  constructor(parent: HTMLElement, private readonly host: GameHost) {
    this.root = document.createElement('div');
    this.root.className = 'ikt';
    this.root.innerHTML = '<div class="stage"></div><div class="ikt-hud" hidden></div><div class="screen"></div><div class="screen" hidden></div>';
    parent.appendChild(this.root);
    [this.surface, this.hud, this.screen, this.card] = Array.from(this.root.children) as HTMLElement[] as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    const loaded = parseSave(this.read());
    this.save = loaded.save;
    this.note = loaded.problem ? 'Your saved game could not be read, so it starts fresh.' : null;
    if (loaded.problem) console.warn(`[inktanks] ${loaded.problem}`);
    const bar = showBoot(this.screen);
    this.host.loading?.progress(0, 'rolling out the tanks…');
    this.stage = new Stage(this.surface, {
      onProgress: (f) => {
        bar(f);
        this.host.loading?.progress(f * 0.9, 'rolling out the tanks…');
      },
      onLoadError: (what) => console.error(`[inktanks] could not load ${what}`),
      onReady: () => void this.booted(),
    });
  }

  private async booted(): Promise<void> {
    await this.loadPaid();
    this.menu();
    requestAnimationFrame(() => {
      this.host.loading?.ready();
      this.bootDone();
    });
  }

  /** Fetches levels 11+ for owners. Never rejects: a failure is shown on the map's cards. */
  private async loadPaid(): Promise<void> {
    if (!this.host.unlocked) return;
    try {
      installPaidLevels(await this.host.loadContent());
      this.paidError = null;
    } catch (e) {
      console.error('[inktanks] failed to load the full game', e);
      this.paidError = 'Could not load the full game. Check your connection and try again.';
    }
  }

  // Saving -------------------------------------------------------------

  private read(): string | null {
    try {
      return this.host.storage?.getItem(SAVE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private setProgress(p: Progress): void {
    this.save = { ...this.save, progress: p };
    this.persist();
  }

  private persist(): void {
    try {
      this.host.storage?.setItem(SAVE_KEY, serializeSave(this.save));
    } catch (e) {
      console.warn('[inktanks] could not save', e);
    }
  }

  private track(e: GameEvent): void {
    try {
      this.host.track?.(e);
    } catch {
      // A stat must never break the game.
    }
  }

  private offer(where: OfferPlace): void {
    this.track({ type: 'offer_view', where });
  }

  private get gateCtx(): GateContext {
    return { medals: this.save.progress.medals, owned: this.host.unlocked, available: hasLevel, allOpen: this.host.allLevelsOpen === true };
  }

  private show(draw: () => (() => void) | void): void {
    this.leaveScreen?.();
    this.leaveScreen = null;
    clear(this.card);
    this.leaveScreen = draw() ?? null;
  }

  // Screens ------------------------------------------------------------

  menu(): void {
    const p = this.save.progress;
    this.show(() => showMenu(this.screen, { progress: p, sound: this.save.sound, started: Object.keys(p.medals).length > 0 || p.xp > 0, note: this.note }, {
      play: () => {
        this.note = null;
        this.map();
      },
      toggleSound: () => {
        this.save = { ...this.save, sound: !this.save.sound };
        this.persist();
        this.menu();
      },
      exit: () => this.host.onExit(),
    }));
  }

  map(): void {
    this.endRun();
    this.show(() => showMap(this.screen, {
      progress: this.save.progress, gate: this.gateCtx,
      names: (n) => levelFor(n)?.def.name ?? null,
      project: (x, y) => this.stage.map.toScreen(x, y),
    }, {
      level: (n) => this.open(n),
      chapter: (i) => this.open(CHAPTERS[i]!.first),
      workshop: () => this.workshop(() => this.map(), 'Map'),
      menu: () => this.menu(),
    }));
  }

  /** Opens a level through the gate: the briefing, the paywall, or a card saying why not. */
  open(n: number): void {
    const g = gate(n, this.gateCtx);
    const ch = chapterOf(n);
    const close = (): void => clear(this.card);
    if (g === 'play') return this.briefing(n);
    if (g === 'locked') return showCard(this.card, `Level ${n}`, [`Pass Level ${n - 1} first.`], [{ label: 'OK', run: close }], close);
    if (g === 'paywall') {
      this.offer('locked');
      return showCard(this.card, ch.name, [`Levels ${FREE_LEVELS + 1}–50 are the full game.`, 'One-time purchase, no ads.'], [
        { label: 'Not now', run: close },
        { label: `Unlock${this.host.price ? ` · ${this.host.price}` : ''}`, run: () => this.host.onBuy('locked'), kind: 'gold' },
      ], close);
    }
    if (this.host.unlocked && this.paidError && ch.index > 0) {
      return showCard(this.card, ch.name, [this.paidError], [{ label: 'Try again', run: () => void this.loadPaid().then(() => this.map()), kind: 'go' }], close);
    }
    showCard(this.card, `Chapter ${ch.index + 1}: ${ch.name}`, [`Levels ${ch.first}–${ch.last}, against ${ch.rival}.`, 'Still being made. New chapters arrive as free updates.'], [{ label: 'OK', run: close }], close);
  }

  private newMatch(n: number, playerBot = false): Match {
    const level = levelFor(n)!;
    const p = this.save.progress;
    return new Match({ level, seed: (Date.now() + ++this.seq * 7919) % 1_000_000, player: { loadout: p.loadout, research: p.research, kits: perksOf(p.xp).repairKits }, playerBot });
  }

  briefing(n: number): void {
    this.endRun();
    // The briefing's match is the one Start plays: its objective gives the title and the map's marks.
    const m = this.newMatch(n);
    this.show(() => showBriefing(this.screen, m, this.save.progress, {
      start: () => this.play(m),
      workshop: () => this.workshop(() => this.briefing(n), 'Briefing'),
      back: () => this.map(),
    }));
  }

  private play(m: Match): void {
    this.endRun();
    this.show(() => clear(this.screen));
    const def = m.level.def;
    const ref = { level: def.id, n: def.number, name: def.name };
    this.track({ ...ref, type: 'level_start' });
    this.run = new MissionRun(this.stage, this.hud, this.card, this.surface, m, {
      over: (r) => this.results(m, r),
      retry: () => {
        this.track({ ...ref, type: 'level_end', result: 'quit', seconds: Math.round(m.t), progress: 'retried' });
        this.play(this.newMatch(def.number));
      },
      map: () => {
        this.track({ ...ref, type: 'level_end', result: 'quit', seconds: Math.round(m.t) });
        this.map();
      },
    }, { seen: this.save.seenBlueprints, mark: () => this.markBlueprintsSeen() });
  }

  /** The first-blueprints tip was shown: never again for this player. */
  private markBlueprintsSeen(): void {
    if (this.save.seenBlueprints) return;
    this.save = { ...this.save, seenBlueprints: true };
    this.persist();
  }

  private endRun(): void {
    this.run?.destroy();
    this.run = null;
  }

  private results(m: Match, r: MatchReport): void {
    const def = m.level.def;
    const before = this.save.progress;
    const { progress, outcome } = applyOutcome(before, def, r);
    this.setProgress(progress);
    this.track({ level: def.id, n: def.number, name: def.name, type: 'level_end', result: outcome.passed ? 'win' : 'lose', seconds: Math.round(r.time), score: r.kills, cause: outcome.passed ? undefined : r.reason, progress: `${r.intelCount} blueprints, ${r.kills} kills` });
    const n = def.number + 1;
    const g = gate(n, { ...this.gateCtx, medals: progress.medals });
    let next: ResultsData['next'] = { kind: 'none', note: null };
    if (g === 'play') next = { kind: 'level', n };
    else if (g === 'paywall' && this.host.price) {
      next = { kind: 'offer', label: `Full game · ${this.host.price}` };
      this.offer('free_end');
    } else if (g === 'coming' && outcome.passed) next = { kind: 'none', note: `Chapter ${chapterOf(n).index + 1}, ${chapterOf(n).name}, is on its way as a free update.` };
    this.endRun();
    this.show(() => showResults(this.screen, { def, title: m.objective.title, report: r, outcome, xpBefore: before.xp, xpAfter: progress.xp, before, after: progress, next }, {
      retry: () => this.play(this.newMatch(def.number)),
      map: () => this.map(),
      next: () => (next.kind === 'level' ? this.briefing(next.n) : this.host.onBuy('free_end')),
      workshop: () => this.workshop(() => this.map(), 'Map'),
    }));
  }

  workshop(back: () => void, backLabel: string): void {
    this.endRun();
    this.show(() => showWorkshop(this.screen, this.save.progress, { change: (p) => this.setProgress(p), back, backLabel }));
  }

  /** Dev pages and snapshots: plays level `n` to the end with the bot driving, headless, then shows the results. */
  devResults(n: number): void {
    const m = this.newMatch(n, true);
    while (!m.over) {
      m.step(1 / 30);
      m.drainEvents();
    }
    this.results(m, matchReport(m));
  }

  /** Dev pages and snapshots: straight into level `n`. */
  devPlay(n: number): void {
    this.play(this.newMatch(n));
  }

  destroy(): void {
    this.leaveScreen?.();
    this.endRun();
    this.stage.destroy();
    this.root.remove();
  }
}
