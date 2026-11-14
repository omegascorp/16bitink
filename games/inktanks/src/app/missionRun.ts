import type { Match } from '../logic/match/match';
import { matchReport, type MatchReport } from '../logic/match/report';
import { Controls } from '../scenes/mission/controls';
import { Hud } from '../scenes/mission/hud';
import { paintLandMap } from '../scenes/mission/landMap';
import { MissionScene } from '../scenes/mission/MissionScene';
import { showCard } from '../ui/cards';
import { clear } from '../ui/dom';
import type { Stage } from './stage';

/** Seconds of the last moment (the wreck burning, the truck arriving) before the results. */
const OUTRO_MS = 1200;

export interface MissionExits {
  readonly over: (report: MatchReport) => void;
  readonly retry: () => void;
  readonly map: () => void;
}

/**
 * One mission in the game: the scene on the stage, the HUD and controls
 * in the DOM, and the pause menu (button, Esc) with resume, retry and back
 * to the map. `destroy` hands everything back.
 */
export class MissionRun {
  private readonly controls: Controls;
  private readonly hud: Hud;
  private readonly scene: MissionScene;
  private readonly off = new AbortController();
  private paused = false;
  private ended = false;
  private outro: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly stage: Stage, private readonly hudRoot: HTMLElement, private readonly cardRoot: HTMLElement, surface: HTMLElement, readonly match: Match, private readonly exits: MissionExits, firstBlueprints?: { seen: boolean; mark: () => void }) {
    const map = paintLandMap(match.land, Math.min(0.25, 200 / match.land.width));
    hudRoot.hidden = false;
    hudRoot.style.display = '';
    this.hud = new Hud(hudRoot, map, firstBlueprints);
    const pause = document.createElement('button');
    pause.className = 'pausebtn';
    pause.textContent = 'Pause';
    pause.addEventListener('click', () => this.pause());
    hudRoot.appendChild(pause);
    this.controls = new Controls(surface, (x, y) => this.scene.toWorld(x, y), surface.parentElement ?? document.body);
    this.controls.bindButtons(this.hud.swapBtn, this.hud.repairBtn);
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (this.paused) this.resume();
        else this.pause();
      }
    }, { signal: this.off.signal });
    // Leaving the tab pauses, so a phone call doesn't lose the mission.
    document.addEventListener('visibilitychange', () => document.hidden && this.pause(), { signal: this.off.signal });
    this.scene = stage.startMission((key) => new MissionScene(match, {
      input: (p) => this.controls.read(p),
      onEvents: (events) => {
        for (const e of events) this.hud.event(match, e);
      },
      onFrame: () => match.player && this.hud.update(match, match.player, this.controls.touchUsed, (x, y) => this.scene.toScreen(x, y)),
      onOver: () => this.finish(),
    }, 'free', key));
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.outro = setTimeout(() => {
      this.controls.release();
      this.controls.enabled = false;
      this.hud.hide();
      this.exits.over(matchReport(this.match));
    }, OUTRO_MS);
  }

  pause(): void {
    if (this.paused || this.ended) return;
    this.paused = true;
    this.scene.paused = true;
    this.controls.release();
    this.controls.enabled = false;
    showCard(this.cardRoot, 'Paused', [this.match.objective.title], [
      { label: 'Map', run: () => this.exits.map() },
      { label: 'Retry', run: () => this.exits.retry() },
      { label: 'Resume', run: () => this.resume(), kind: 'go' },
    ], () => this.resume());
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.scene.paused = false;
    this.controls.enabled = true;
    clear(this.cardRoot);
  }

  destroy(): void {
    if (this.outro) clearTimeout(this.outro);
    this.off.abort();
    this.controls.destroy();
    this.hudRoot.innerHTML = '';
    this.hudRoot.hidden = true;
    clear(this.cardRoot);
    this.stage.endMission();
  }
}
