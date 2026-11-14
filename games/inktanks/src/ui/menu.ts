import { CHAPTERS, medalCount, TOTAL_LEVELS } from '../logic/campaign';
import { rankOf } from '../logic/rank';
import type { Progress } from '../logic/workshop';
import { esc, render } from './dom';
import { tankCanvas } from './tankArt';

export interface MenuData {
  readonly progress: Progress;
  readonly sound: boolean;
  /** True once any level was played: the button says Continue. */
  readonly started: boolean;
  /** Shown under the card when the full game didn't load, or a save was reset. */
  readonly note: string | null;
}

export interface MenuActions {
  readonly play: () => void;
  readonly toggleSound: () => void;
  readonly exit: () => void;
}

/** The title screen over the chapter map: wordmark, the chapter card, Play or Continue, sound. */
export function showMenu(root: HTMLElement, d: MenuData, a: MenuActions): void {
  const ch = CHAPTERS[0]!;
  let medals = 0;
  for (let n = ch.first; n <= ch.last; n++) medals += medalCount(d.progress.medals, n);
  const rank = rankOf(d.progress.xp);
  render(root, 'menu dim', `
    <div class="corner left"><button class="btn small" data-act="exit">Exit</button></div>
    <div class="corner right"><button class="btn small" data-act="sound">Sound: ${d.sound ? 'on' : 'off'}</button></div>
    <div class="wordmark rise">InkTanks</div>
    <div class="panel chaptercard rise">
      <div class="pic"></div>
      <div class="col">
        <div class="dimt t12">Chapter 1 of ${CHAPTERS.length} · free</div>
        <div class="t36 gold">${esc(ch.name)}</div>
        <div>Rival: ${esc(ch.rival)}</div>
        <div class="row"><span class="medal on"></span>${medals} / ${(ch.last - ch.first + 1) * 3}</div>
        <div class="rank"><i></i>${esc(rank.name)}</div>
      </div>
    </div>
    <button class="btn go rise" data-act="play">${d.started ? 'Continue' : 'Play'}</button>
    ${d.note ? `<div class="t12 dimt">${esc(d.note)}</div>` : ''}
    <div class="t12 dimt hide-short">${TOTAL_LEVELS} missions · ${CHAPTERS.length} chapters · Private to General</div>`, {
    play: a.play,
    sound: a.toggleSound,
    exit: a.exit,
  });
  root.querySelector('.pic')!.appendChild(tankCanvas(d.progress.loadout, 1));
}
