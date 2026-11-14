import { bonusText } from '../../logic/mission/bonus';
import type { Outcome } from '../../logic/mission/outcome';
import type { LevelDef } from '../../logic/level/types';
import type { MatchReport } from '../../logic/match/report';
import { sumIntel } from '../../logic/intel';

/** The win/fail panel, minimal for now: medals, blueprints kept, XP, retry. Phase 3 dresses it. */
export function showResults(root: HTMLElement, def: LevelDef, title: string, r: MatchReport, o: Outcome, onRetry: () => void, nextUrl: string | null): void {
  const main = title;
  const rows: [string, boolean, boolean][] = [
    [main, o.done[0], o.fresh[0]],
    [bonusText(def.bonus[0]), o.done[1], o.fresh[1]],
    [bonusText(def.bonus[1]), o.done[2], o.fresh[2]],
  ];
  const intel = Object.entries(r.intel).map(([k, v]) => `<li>${k} <b>+${v}</b></li>`).join('') || '<li>none this time</li>';
  root.innerHTML = `<div class="results">
    <h1>${o.passed ? 'Mission passed' : `Mission failed: ${r.reason === 'destroyed' ? 'your tank was destroyed' : r.reason === 'time' ? 'out of time' : r.reason}`}</h1>
    <p class="sub">Level ${def.number}: ${def.name}. ${r.kills} kills. ${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</p>
    <ul class="medals">${rows.map(([t, d, f]) => `<li class="${d ? 'on' : ''}"><span class="medal"></span>${t}${f ? ' <em>new</em>' : ''}</li>`).join('')}</ul>
    <h2>Blueprints kept: ${sumIntel(r.intel)}</h2><ul class="intel">${intel}</ul>
    <h2>+${o.xp} XP</h2>
    <div class="buttons"><button class="retry">${o.passed ? 'Play again' : 'Retry'}</button>${nextUrl && o.passed ? `<a class="next" href="${nextUrl}">Next level</a>` : ''}</div>
  </div>`;
  root.querySelector('.retry')!.addEventListener('click', onRetry);
}
