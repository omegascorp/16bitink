import { BONUSES } from '../../logic/mission/bonus';
import type { Outcome } from '../../logic/mission/outcome';
import type { MissionDef } from '../../logic/mission/types';
import type { MatchReport } from '../../logic/match/report';
import { sumIntel } from '../../logic/intel';
import { mainObjectiveText } from '../../logic/mission/text';

/** The results screen, minimal for now: medals, intel gained, XP. Phase 3 dresses it. */
export function showResults(root: HTMLElement, def: MissionDef, r: MatchReport, o: Outcome, onRetry: () => void, nextUrl: string | null): void {
  const main = mainObjectiveText(def);
  const rows: [string, boolean, boolean][] = [
    [main, o.done[0], o.fresh[0]],
    [BONUSES[def.bonus[0]].text, o.done[1], o.fresh[1]],
    [BONUSES[def.bonus[1]].text, o.done[2], o.fresh[2]],
  ];
  const intel = Object.entries(r.intel).map(([k, v]) => `<li>${k} <b>+${v}</b></li>`).join('') || '<li>none this time</li>';
  root.innerHTML = `<div class="results">
    <h1>${o.passed ? 'Mission passed' : 'Mission failed'}</h1>
    <p class="sub">Level ${def.level}: ${def.name}. ${r.reason === 'destroyed' ? `Destroyed, place ${r.placement} of ${r.tanks}` : `Place ${r.placement} of ${r.tanks}`}. ${r.kills} kills. ${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</p>
    <ul class="medals">${rows.map(([t, d, f]) => `<li class="${d ? 'on' : ''}"><span class="medal"></span>${t}${f ? ' <em>new</em>' : ''}</li>`).join('')}</ul>
    <h2>Intel kept: ${sumIntel(r.intel)}</h2><ul class="intel">${intel}</ul>
    <h2>+${o.xp} XP</h2>
    <div class="buttons"><button class="retry">${o.passed ? 'Play again' : 'Retry'}</button>${nextUrl && o.passed ? `<a class="next" href="${nextUrl}">Next mission</a>` : ''}</div>
  </div>`;
  root.querySelector('.retry')!.addEventListener('click', onRetry);
}
